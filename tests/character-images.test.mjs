import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ImageConfigContext} from 'next/dist/shared/lib/image-config-context.shared-runtime.js';
import {imageConfigDefault} from 'next/dist/shared/lib/image-config.js';
import {loadTypeScript} from './load-typescript.mjs';
import {expectedCharacters,assertCharacterTiles,assertCharacterDetailImages,assertKnownFaceImage} from './character-image-assertions.mjs';

const {default:CharactersPage}=loadTypeScript('app/characters/page.tsx');
const {default:config}=loadTypeScript('next.config.ts');
const {publicFileExists}=loadTypeScript('lib/publicAssets.ts');
const {deploymentUrl}=loadTypeScript('lib/deployment.ts');
const listHtml=renderToStaticMarkup(React.createElement(ImageConfigContext.Provider,
  {value:{...imageConfigDefault,...config.images}},React.createElement(CharactersPage)));

// Execute the original declarations, including their filesystem checks and aliases.
// This avoids importing unrelated detail-page runtimes or duplicating the path algorithm.
function loadFaceResolver(relative){
  const file=new URL('../'+relative,import.meta.url);
  const source=fs.readFileSync(file,'utf8');
  const ast=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const names=['getUnitFaceUnitStrId','getUnitFaceImagePath'];
  const declarations=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text));
  assert.equal(declarations.length,names.length,'Could not load production image resolver from '+relative);
  const js=ts.transpileModule(declarations.map(node=>node.getText(ast)).join('\n'),
    {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  return new Function('fs','path','publicFileExists',js+'\nreturn getUnitFaceImagePath;')(fs,path,publicFileExists);
}

test('the actual employee list renders all 311 portrait images from remote storage',()=>{
  assert.equal(assertCharacterTiles(listHtml),311);
});

test('list and detail image resolvers work without local employee card copies',()=>{
  const list=loadFaceResolver('app/characters/page.tsx');
  const detail=loadFaceResolver('app/characters/[id]/page.tsx');
  for(const unit of expectedCharacters){
    const imagePath=list(unit.id);
    assert.ok(imagePath,unit.id+': list resolver dropped the remote card');
    assert.equal(detail(unit.id),imagePath,unit.id+': detail and persona image resolver differs');
    assert.ok(!fs.existsSync(path.join(process.cwd(),'public',imagePath)),unit.id+': regression fixture unexpectedly has a local card');
    assertKnownFaceImage(deploymentUrl(imagePath),unit.id);
  }
  assert.equal(list('NKM_UNIT_MISSING_CARD'),'');
  assert.equal(detail(undefined),'');
});

test('the list audit rejects missing portraits, wrong alt text and unindexed URLs',()=>{
  const face=/<img\b[^>]*alt="[^"]* 이미지"[^>]*>/;
  assert.match(listHtml,face);
  assert.throws(()=>assertCharacterTiles(listHtml.replace(face,'<span>NO IMAGE</span>')),/missing or duplicate portrait/);
  assert.throws(()=>assertCharacterTiles(listHtml.replace(face,tag=>tag.replace(/alt="[^"]*"/,'alt=""'))),/missing or duplicate portrait/);
  assert.throws(()=>assertCharacterTiles(listHtml.replace(face,tag=>tag.replace(/src="[^"]*"/,'src="/unit/unit_face/MISSING.png"'))),/local or unindexed/);
});

test('the detail audit rejects a missing SVG profile portrait',()=>{
  const unit=expectedCharacters.find(item=>expectedCharacters.filter(other=>other.name===item.name).length===1);
  const imagePath=loadFaceResolver('app/characters/[id]/page.tsx')(unit.id);
  const fixture='<div data-collection-summary="character"><svg><image href="'+deploymentUrl(imagePath)+'"/></svg></div>';
  assert.deepEqual(assertCharacterDetailImages(fixture,unit),{profileImages:1,personaImages:0});
  assert.throws(()=>assertCharacterDetailImages(fixture.replace(/<image[^>]*\/>/,'<text>NO IMAGE</text>'),unit),/profile card image is absent/);
});
