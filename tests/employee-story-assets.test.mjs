import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadTypeScript} from './load-typescript.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const {deploymentUrl,deploymentData}=loadTypeScript('lib/deployment.ts');
const images=read('data/main-image-assets.json');
const spine=read('data/spine-assets.json');
const story=read('data/story-data-assets.json');
const voices=read('data/voice-assets.json');

test('employee Spine models are available without local payloads and trophy destinations remain preserved',()=>{
  const {getCharacterSpineModels}=loadTypeScript('lib/characterSpine.ts');
  const unit=getCharacterSpineModels('NKM_UNIT_C_YOO_MI_NA');
  assert.ok(unit.combat.length&&unit.sd.length&&unit.illustration.length,'Employee native model choices disappeared');
  const existing=new Set(images.paths);
  let newSpine=0,preserved=0;
  for(const model of [...unit.combat,...unit.sd,...unit.illustration])for(const key of ['jsonUrl','atlasUrl','textureUrl']){
    const local=model[key];
    const resolved=deploymentUrl(local);
    assert.ok(resolved.startsWith(images.baseUrl+'/')||resolved.startsWith(spine.baseUrl+'/'));
    if(local.startsWith('/')&&!existing.has(local))newSpine++;
  }
  for(const url of spine.paths)if(existing.has(url)){assert.ok(deploymentUrl(url).startsWith(images.baseUrl+'/'));preserved++;}
  assert.ok(newSpine>0&&preserved===1413,'New employee models and the existing trophy file set must both remain available');
});

test('employee voice availability comes from the uploaded catalog while missing clips stay unavailable',()=>{
  const {getVoiceFilePath,createVoiceAudioPath,getVoiceSourceLocale}=loadTypeScript('lib/voice.ts');
  const relative=voices.paths.find(url=>{
    if(!url.startsWith('unit_voice/')||!url.includes('.vkor/'))return false;
    const [,bundle]=url.split('/');return getVoiceSourceLocale('unit',bundle,'ko')==='ko';
  });
  assert.ok(relative);const [,bundle,file]=relative.split('/');
  const local=getVoiceFilePath('unit',bundle,file);
  assert.ok(local&&!fs.existsSync(local),'Unit voices must not require a local sound directory');
  assert.equal(createVoiceAudioPath('unit',bundle,file.slice(0,-4),'ko'),voices.baseUrl+'/'+relative);
  assert.equal(createVoiceAudioPath('unit',bundle,'__MISSING_VOICE__','ko'),'');
});

test('Raw-served Story JSON is kept in repository sources and has idempotent media URLs',()=>{
  assert.equal(story.paths.length,3036);
  for(const url of ['/story/reader/data/index.json','/story/reader/data/characters.json']){
    assert.ok(story.paths.includes(url));
    assert.equal(deploymentUrl(url+'?v=test'),story.baseUrl+url+'?v=test');
    const data=JSON.parse(fs.readFileSync(path.join(process.cwd(),'public',url),'utf8'));
    assert.equal(JSON.stringify(deploymentData(data)),JSON.stringify(data));
  }
  const native={position:[-10,23],name:'/Root/Character',data:'/story/reader/data/index.json'};
  const mapped=deploymentData(native);
  assert.deepEqual(mapped.position,native.position);assert.equal(mapped.name,native.name);
  assert.equal(mapped.data,story.baseUrl+native.data);
});
