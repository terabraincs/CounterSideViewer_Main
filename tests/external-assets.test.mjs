import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadTypeScript} from './load-typescript.mjs';
const imageCatalog=JSON.parse(fs.readFileSync(new URL('../data/main-image-assets.json',import.meta.url),'utf8'));
const operatorCatalog=JSON.parse(fs.readFileSync(new URL('../data/operator-voice-assets.json',import.meta.url),'utf8'));
const {deploymentUrl,deploymentData}=loadTypeScript('lib/deployment.ts');
const {publicFileExists}=loadTypeScript('lib/publicAssets.ts');
const {createVoiceAudioPath,getVoiceSourceLocale}=loadTypeScript('lib/voice.ts');
const {getCollectionTrophyData}=loadTypeScript('lib/collectionTrophies.ts');

test('migrated media and Spine files resolve to Raw without local media copies',()=>{
  assert.ok(imageCatalog.paths.length>0,'The published asset index is empty');
  assert.equal(new Set(imageCatalog.paths).size,imageCatalog.paths.length,'Duplicate asset index entries');
  assert.equal(imageCatalog.baseUrl,'https://raw.githubusercontent.com/terabraincs/Asset_main/main');
  assert.ok(!imageCatalog.paths.includes('/spine/manifest.json'),'The standalone Spine manifest is build input only');
  const paths=new Set(imageCatalog.paths);
  const trophyModels=getCollectionTrophyData().trophies.filter(trophy=>trophy.spine).map(trophy=>trophy.spine.model);
  assert.ok(trophyModels.length>0,'Embedded trophy models were lost');
  for(const model of trophyModels)for(const key of ['jsonUrl','atlasUrl','textureUrl']){
    const url=model[key];
    const local=url.startsWith(imageCatalog.baseUrl+'/')?decodeURI(url.slice(imageCatalog.baseUrl.length)):url;
    assert.ok(paths.has(local),'Trophy source model is absent from the asset index: '+url);
    assert.equal(deploymentUrl(url),imageCatalog.baseUrl+local.split('/').map(encodeURIComponent).join('/'),'Trophy '+key+' does not use Raw');
  }
  for(const asset of imageCatalog.paths){
    const expected=imageCatalog.baseUrl+asset.split('/').map(encodeURIComponent).join('/');
    assert.equal(deploymentUrl(asset),expected,asset);
    assert.equal(deploymentUrl(expected),expected);
    if(asset!=='/favicon.ico')assert.ok(publicFileExists(path.join(process.cwd(),'public',asset)));
  }
  assert.ok(!publicFileExists(path.join(process.cwd(),'public/unit/MISSING_IMAGE.png')));
  const input={image:'/counterside_logo.webp',href:'/equipment/ITEM',offset:[-2,4]};
  const output=deploymentData(input);
  assert.equal(output.image,imageCatalog.baseUrl+'/counterside_logo.webp');
  assert.equal(output.href,input.href);
  assert.deepEqual(output.offset,input.offset);
});

test('operator voices use CS_Voice and explicit spoken language mappings while missing or unsafe clips stay unavailable',()=>{
  assert.equal(operatorCatalog.paths.length,3080,'Operator voice index must include the uploaded Japanese clips');
  assert.equal(operatorCatalog.paths.filter(asset=>asset.includes('.vkor/')).length,2084);
  assert.equal(operatorCatalog.paths.filter(asset=>asset.includes('.vjpn/')).length,996);
  const paths=new Set(operatorCatalog.paths);
  assert.equal(paths.size,3080,'Duplicate operator voice paths');
  for(const asset of operatorCatalog.paths){
    const [,bundle,file]=asset.split('/');
    for(const language of ['ko','ja']){
      const sourceLocale=getVoiceSourceLocale('operator',bundle,language);
      const sourceBundle=bundle.replace(/\.(?:vkor|vjpn)$/,'')+(sourceLocale==='ja'?'.vjpn':'.vkor');
      const sourcePath='operator_voice/'+sourceBundle+'/'+file;
      const expected=sourceLocale!==null&&paths.has(sourcePath)?operatorCatalog.baseUrl+'/'+sourcePath:'';
      assert.equal(createVoiceAudioPath('operator',bundle,file.slice(0,-4),language),expected);
    }
  }
  assert.equal(createVoiceAudioPath('operator','ab_ui_unit_voice_opr_lee_suyeon','__MISSING_VOICE__'),'');
  assert.equal(createVoiceAudioPath('operator','../ab_ui_unit_voice_opr_lee_suyeon','VOICE'),'');
  assert.equal(createVoiceAudioPath('unit','ab_ui_unit_voice_opr_lee_suyeon','VOICE'),'');
});
