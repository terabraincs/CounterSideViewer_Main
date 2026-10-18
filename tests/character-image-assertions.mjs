import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadTypeScript} from './load-typescript.mjs';

const readJson=relative=>JSON.parse(fs.readFileSync(new URL('../'+relative,import.meta.url),'utf8'));
const units=readJson('json/character/merged_units.json');
const names=new Map(readJson('json/KR/002_LUA_SI_UNIT_KOREA_l.json').data);
const catalog=readJson('data/main-image-assets.json');
const faceImages=new Set(catalog.paths.filter(asset=>asset.startsWith('/unit/unit_face/AB_UNIT_FACE_CARD_'))
  .map(asset=>catalog.baseUrl+asset.split('/').map(encodeURIComponent).join('/')));
const {deploymentUrl}=loadTypeScript('lib/deployment.ts');

export const expectedCharacters=units.map(unit=>({id:unit.unitStrId,name:names.get(unit.nameKey)??unit.nameKey}));
assert.equal(expectedCharacters.length,311,'The expected employee roster changed');
assert.equal(new Set(expectedCharacters.map(unit=>unit.id)).size,311,'Duplicate employee IDs');

function decodeHtml(value){
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,entity=>{
    const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    if(named[entity])return named[entity];
    return String.fromCodePoint(entity.startsWith('&#x')?parseInt(entity.slice(3,-1),16):parseInt(entity.slice(2,-1),10));
  });
}
function attributes(tag){
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,key,value])=>[key,decodeHtml(value)]));
}
function anchors(html){
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([,attrs,body])=>({href:attributes(attrs).href,body}));
}
function characterHref(id){return deploymentUrl('/characters/'+encodeURIComponent(id)).replace(/\/$/,'');}

export function assertKnownFaceImage(url,context){
  assert.ok(faceImages.has(url),context+': missing, local or unindexed employee card image '+JSON.stringify(url));
}

// Require an image for every expected card. A URL-only audit silently passes NO IMAGE placeholders.
export function assertCharacterTiles(html,characters=expectedCharacters,context='Employee list'){
  const links=anchors(html);
  const expectedHrefs=new Set(characters.map(unit=>characterHref(unit.id)));
  const cards=links.filter(link=>expectedHrefs.has(link.href?.replace(/\/$/,'')));
  assert.equal(cards.length,characters.length,context+': missing or duplicate employee tiles');
  for(const unit of characters){
    const matches=cards.filter(card=>card.href.replace(/\/$/,'')===characterHref(unit.id));
    assert.equal(matches.length,1,context+': missing or duplicate tile '+unit.id);
    const card=matches[0].body;
    const images=[...card.matchAll(/<img\b[^>]*>/g)].map(match=>attributes(match[0]));
    const portrait=images.filter(image=>image.alt===unit.name+' 이미지');
    assert.equal(portrait.length,1,context+': missing or duplicate portrait for '+unit.id);
    assertKnownFaceImage(portrait[0].src,context+' '+unit.id);
    assert.ok(!card.includes('NO IMAGE'),context+': placeholder remains for '+unit.id);
  }
  return cards.length;
}

export function assertCharacterDetailImages(html,unit){
  const summaries=[...html.matchAll(/<div\b[^>]*data-collection-summary="character"[^>]*>[\s\S]*?<svg\b[^>]*>([\s\S]*?)<\/svg>/g)];
  assert.equal(summaries.length,1,unit.id+': missing or duplicate profile summary');
  const summary=summaries[0][1];
  const cardImages=[...summary.matchAll(/<image\b[^>]*>/g)].map(match=>attributes(match[0]).href)
    .filter(url=>url?.includes('/unit/unit_face/'));
  assert.equal(cardImages.length,1,unit.id+': profile card image is absent');
  assertKnownFaceImage(cardImages[0],unit.id+' profile');
  assert.ok(!summary.includes('NO IMAGE'),unit.id+': profile card is a placeholder');

  // Profiles can use a fuller client name (e.g. FWL - 31X 타이탄) than list tiles.
  // Persona links are based on that displayed profile name, not the list label.
  const heading=/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  const profileName=heading?decodeHtml(heading[1].replace(/<[^>]*>/g,'')).trim():unit.name.trim();
  const personas=expectedCharacters.filter(other=>other.id!==unit.id&&other.name.trim()===profileName);
  if(personas.length===0)return {profileImages:1,personaImages:0};
  const section=/<section\b[^>]*id="persona"[^>]*>([\s\S]*?)<\/section>/.exec(html);
  assert.ok(section,unit.id+': expected persona section is absent');
  return {profileImages:1,personaImages:assertCharacterTiles(section[1],personas,unit.id+' personas')};
}
