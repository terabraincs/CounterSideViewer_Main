// UTF-8. Verify the published route, asset, and JSON closure.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadTypeScript} from '../tests/load-typescript.mjs';
const out=path.resolve('out');
const base=(process.env.NEXT_PUBLIC_BASE_PATH??'').replace(/\/$/,'');
const {deploymentData,deploymentUrl}=loadTypeScript('lib/deployment.ts');
const {getCollectionTrophyData}=loadTypeScript('lib/collectionTrophies.ts');
const {getWebtoons}=loadTypeScript('lib/webtoons.ts');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const imageCatalog=readJson('data/main-image-assets.json');
const minigameCatalog=readJson('data/minigame-assets.json');
const operatorCatalog=readJson('data/operator-voice-assets.json');
const musicCatalog=readJson('data/music-tracks.json');
const spineCatalog=readJson('data/spine-assets.json');
const storyDataCatalog=readJson('data/story-data-assets.json');
const voiceCatalog=readJson('data/voice-assets.json');
const webtoonRemote=readJson('data/webtoon-remote-assets.json');
const webtoonEntries=getWebtoons();
const webtoonUrls=new Set(webtoonEntries.flatMap(entry=>entry.pages.map(page=>page.imagePath)));
assert.equal(webtoonRemote.commit,'110179af577c86cd0d28b6122ac51a23ed037808','Webtoon storage commit changed without source verification');
assert.equal(webtoonRemote.baseUrl,`https://raw.githubusercontent.com/terabraincs/CounterSide_Comics/${webtoonRemote.commit}`,'Webtoon images must use the verified fixed commit');
assert.equal(webtoonEntries.length,398,'Official, guide and client webtoon entries are incomplete');
assert.equal(webtoonUrls.size,742,'Expected 622 archive pages and 120 client comic images');
for(const url of webtoonUrls)assert.ok(url.startsWith(webtoonRemote.baseUrl+'/'),'Unpinned or local webtoon image: '+url);
const spinePaths=new Set(spineCatalog.paths);
const storyDataPaths=new Set(storyDataCatalog.paths);
const voicePaths=new Set(voiceCatalog.paths);
const assetPaths=new Set([...imageCatalog.paths,...minigameCatalog.paths]);
const operatorPaths=new Set(operatorCatalog.paths);
const musicPaths=new Set(musicCatalog.tracks.map(track=>track.audioPath));
const all=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else all.push(f);}}
walk(out);
const bytes=all.reduce((total,file)=>total+fs.statSync(file).size,0);
assert.ok(bytes<1_000_000_000,'GitHub Pages output exceeds 1 GB');
assert.ok(fs.existsSync(path.join(out,'.nojekyll')),'Static export preparation did not complete');
const requiredRoutes=['','characters','story','story/reader','music','equipment','ships','operators','collection','collection/titles','collection/frames','collection/emblems','collection/trophies','minigames','minigames/match-ten','minigames/cafe-strega','minigames/cafe-strega/rebuild-v2','minigames/sword-training','minigames/sword-training/rebuild','illustrations','guide','webtoons'];
for(const route of requiredRoutes)assert.ok(fs.existsSync(path.join(out,route,'index.html')),'Missing route '+route);
assert.ok(fs.existsSync(path.join(out,'404.html')),'The unpublished routes need the static 404 page');
for(const route of ['spine-viewer','api','actor-buffer-compare-test','_actor-buffer-compare']){
  assert.ok(!fs.existsSync(path.join(out,route)),'Excluded route or development runtime exported: '+route);
  assert.ok(!fs.existsSync(path.join('app',route)),'Excluded source route copied: '+route);
}
assert.ok(!all.some(file=>/\.(?:wasm|unityweb|dll|exe|pdb)$/i.test(file)),'Development Unity runtime files remain in Pages output');
const retainedMinigameSpines=all.filter(file=>{
  const relative=path.relative(out,file).split(path.sep).join('/');
  return relative.startsWith('game-assets/')&&/\.(?:skel|atlas)$/i.test(relative)&&fs.existsSync(path.join('public',relative))&&!assetPaths.has('/'+relative);
});
const retainedMinigameSpineSet=new Set(retainedMinigameSpines);
assert.equal(retainedMinigameSpines.length,16,'The preserved minigame Spine file set changed');
assert.ok(!all.some(file=>/\.(?:png|webp|jpe?g|gif|svg|ico|avif|ogg|wav|mp3|m4a|mp4|webm|skel|atlas)$/i.test(file)&&!retainedMinigameSpineSet.has(file)),'Migrated image/audio/video/Spine files remain in Pages output');
for(const asset of assetPaths)assert.ok(!fs.existsSync(path.join(out,asset.replace(/^\//,''))),'Externally indexed asset duplicated in Pages: '+asset);
for(const asset of [...spinePaths,...storyDataPaths])assert.ok(!fs.existsSync(path.join(out,asset.replace(/^\//,''))),'Raw-served Spine or Story data duplicated in Pages: '+asset);
const missing=new Map();
let checkedAssetURLs=0,externalAssets=0,externalSpine=0,externalStoryData=0,externalOperatorVoices=0,externalOtherVoices=0,externalMusic=0,externalWebtoons=0,runtimeAssetKeys=0,inactiveStandaloneSpineKeys=0;
// The shared trophy renderer receives an embedded model and no employee ID.
// Its standalone model-list/effect loaders return before issuing these requests.
const inactiveStandaloneSpinePaths=new Set(['/spine/manifest.json']);
const localExtensions=/\.(?:js|mjs|css|json|png|webp|jpe?g|gif|svg|ico|avif|ogg|wav|mp3|m4a|mp4|webm|skel|atlas|ttf|otf|woff2?|html)$/i;
function clean(url){return url.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('\\/','/').replaceAll('\\u0026','&');}
function check(value,ref){
  const url=clean(value);
  if(!url||/^(?:data:|blob:|#|mailto:|tel:)/i.test(url)||url.includes('${'))return;
  assert.ok(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/(?:assets|character|spine)\//i.test(url),'Local development asset URL in '+ref+': '+url);
  if(url.startsWith('https://raw.githubusercontent.com/terabraincs/CounterSide_Comics/')){
    assert.ok(url.startsWith(webtoonRemote.baseUrl+'/'),'Webtoon URL uses an unverified branch or commit in '+ref+': '+url);
    assert.ok(webtoonUrls.has(url.split(/[?#]/,1)[0]),'Unknown webtoon image in '+ref+': '+url);
    externalWebtoons++;return;
  }
  if(url.startsWith(imageCatalog.baseUrl+'/')){
    const rel=decodeURI(url.slice(imageCatalog.baseUrl.length).split(/[?#]/,1)[0]);
    assert.ok(assetPaths.has(rel),'Missing Asset_main indexed asset in '+ref+': '+url);
    externalAssets++;return;
  }
  if(url.startsWith(spineCatalog.baseUrl+'/')){
    const rel=decodeURI(url.slice(spineCatalog.baseUrl.length).split(/[?#]/,1)[0]);
    assert.ok(spinePaths.has(rel),'Missing Asset_spine indexed asset in '+ref+': '+url);
    externalSpine++;return;
  }
  if(url.startsWith(storyDataCatalog.baseUrl+'/')){
    const rel=decodeURI(url.slice(storyDataCatalog.baseUrl.length).split(/[?#]/,1)[0]);
    assert.ok(storyDataPaths.has(rel),'Missing Raw Story JSON in '+ref+': '+url);
    externalStoryData++;return;
  }
  if(url.startsWith(operatorCatalog.baseUrl+'/operator_voice/')){
    const rel=decodeURI(url.slice(operatorCatalog.baseUrl.length+1).split(/[?#]/,1)[0]);
    assert.ok(operatorPaths.has(rel),'Missing CS_Voice operator audio in '+ref+': '+url);
    externalOperatorVoices++;return;
  }
  if(url.startsWith(operatorCatalog.baseUrl+'/')){
    const rel=decodeURI(url.slice(operatorCatalog.baseUrl.length+1).split(/[?#]/,1)[0]);
    assert.ok(voicePaths.has(rel),'Missing CS_Voice indexed audio in '+ref+': '+url);
    externalOtherVoices++;return;
  }
  if(url.startsWith('https://raw.githubusercontent.com/terabraincs/CS_Music/main/audio/')){
    assert.ok(musicPaths.has(url.split(/[?#]/,1)[0]),'Missing CS_Music catalog entry in '+ref+': '+url);
    externalMusic++;return;
  }
  if(/^(?:https?:)?\/\//i.test(url))return;
  let requested;
  try{requested=decodeURIComponent(url.split(/[?#]/,1)[0]);}catch{assert.fail('Malformed URL in '+ref+': '+url);}
  if(!localExtensions.test(requested))return;
  let file;
  if(requested.startsWith('/')){
    if(base){assert.ok(requested.startsWith(base+'/'),'Asset escapes Pages base path in '+ref+': '+url);requested=requested.slice(base.length);}
    file=path.resolve(out,requested.replace(/^\//,''));
  }else file=path.resolve(path.dirname(ref),requested);
  assert.ok(file.startsWith(out+path.sep),'Asset escapes export directory in '+ref+': '+url);
  checkedAssetURLs++;
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())missing.set(url,path.relative(out,ref));
}
function inspectCss(text,ref){for(const m of text.matchAll(/url\((?:["']?)([^)'"\s]+)/g))check(m[1],ref);}
// JS chunks and inline Flight payloads expose model URLs absent from DOM attributes.
function inspectSerialized(text,ref){
  const decoded=text.replaceAll('\\"','"').replaceAll('\\/','/');
  const literal=/(?:["'`])((?:https?:\/\/[^"'`<>\s\\]+|\/(?:_next|game-assets|minigames|equipment|operators?|ships?|collection|unit|ui|story|music|spine|assets|guide|cutscenes|character|voice|webtoons)\/[^"'`<>\s\\]+))(?:["'`])/g;
  for(const m of decoded.matchAll(literal))if(localExtensions.test(m[1].split(/[?#]/,1)[0])){
    if(ref.endsWith('.js')&&inactiveStandaloneSpinePaths.has(m[1])){inactiveStandaloneSpineKeys++;continue;}
    // Compiled asset catalogs contain lookup keys as well as network requests.
    // Validate their mapped destination; DOM, CSS and public JSON remain strict.
    const mapped=deploymentUrl(m[1]);
    if(mapped!==m[1])runtimeAssetKeys++;
    check(mapped,ref);
  }
}
let verifiedPublicJson=0;
for(const file of all){
  const relative=path.relative(out,file).split(path.sep).join('/');
  if(file.endsWith('.html')){
    const text=fs.readFileSync(file,'utf8');
    for(const m of text.matchAll(/(?:src|href|poster)="([^"]+)"/g))check(m[1],file);
    inspectCss(text.replaceAll('&quot;','"'),file);inspectSerialized(text,file);
  }else if(file.endsWith('.css'))inspectCss(fs.readFileSync(file,'utf8'),file);
  else if(file.endsWith('.js'))inspectSerialized(fs.readFileSync(file,'utf8'),file);
  else if(file.endsWith('.json')&&!relative.startsWith('_next/')){
    const parsed=readJson(file);
    // Bare file names in client metadata are identities, not standalone requests.
    function visit(v){if(typeof v==='string'){if(v.startsWith('/')||/^https?:\/\//i.test(v))check(v,file);}else if(v&&typeof v==='object')for(const child of Object.values(v))visit(child);}
    visit(parsed);
    const source=path.join('public',relative);
    if(fs.existsSync(source)){
      // JSON serialization normalizes IEEE -0 to 0; compare the serialized values.
      assert.ok(JSON.stringify(parsed)===JSON.stringify(deploymentData(readJson(source))),'Public JSON rewrite changed source data or left stale paths: '+relative);
      verifiedPublicJson++;
    }
  }
}
if(process.env.EXPORT_VERIFY_REPORT){
  const reportFile=path.resolve(process.env.EXPORT_VERIFY_REPORT);
  fs.mkdirSync(path.dirname(reportFile),{recursive:true});
  fs.writeFileSync(reportFile,JSON.stringify({missing:[...missing],runtimeAssetKeys,inactiveStandaloneSpineKeys,verifiedPublicJson,checkedAssetURLs,externalAssets,externalOperatorVoices,externalOtherVoices,externalMusic,externalWebtoons,webtoonImages:webtoonUrls.size,files:all.length,bytes},null,2),'utf8');
}
assert.deepEqual([...missing].slice(0,30),[],'Missing exported asset references');
assert.ok(verifiedPublicJson>0,'No published JSON rewrite was verified');
let verifiedRawStoryJson=0;
for(const asset of storyDataPaths){
  const source=path.join('public',asset.slice(1));
  assert.ok(fs.existsSync(source),'Story JSON absent from source upload: '+asset);
  const data=readJson(source);
  assert.equal(JSON.stringify(deploymentData(data)),JSON.stringify(data),'Raw Story JSON still contains unmapped indexed URLs: '+asset);
  assert.equal(deploymentUrl(asset),storyDataCatalog.baseUrl+asset.split('/').map(encodeURIComponent).join('/'));
  verifiedRawStoryJson++;
}
assert.equal(verifiedRawStoryJson,3036,'Unexpected Story runtime data closure');
assert.ok(all.some(file=>path.relative(out,file).startsWith('guide'+path.sep)&&file.endsWith('.json')),'Missing published guide data');
for(const manifest of ['spine/manifest.json','story/reader/manifest.json','story/reader/manifest.v1.json'])assert.ok(!fs.existsSync(path.join(out,manifest)),'Build-only manifest was published: '+manifest);
assert.ok(!all.some(file=>path.relative(out,file).startsWith('spine'+path.sep)),'Standalone Spine runtime data was published');
const home=fs.readFileSync(path.join(out,'index.html'),'utf8');
const expectedHubCards=[['characters','사원'],['equipment','장비'],['ships','함선'],['operators','오퍼레이터'],['collection','수집 요소'],['music','주크박스'],['webtoons','공식 웹툰'],['illustrations','일러스트'],['guide','인게임 가이드'],['story','스토리 뷰어'],['minigames','미니게임']];
const actualHubCards=[...home.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].flatMap(([,href,body])=>{const title=/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(body);return title?[[href,title[1].replace(/<[^>]+>/g,'').trim()]]:[];});
assert.deepEqual(actualHubCards.map(([href,label])=>[href.replace(/\/$/,''),label]),expectedHubCards.map(([route,label])=>[deploymentUrl('/'+route),label]),'Home hub card order, title or destination changed');
for(const label of ['공식 홈페이지 백업','라운지 백업'])assert.ok(home.includes(label),'Missing backup button: '+label);
assert.ok(!new RegExp('href="'+deploymentUrl('/spine-viewer')+'/?(?:[?#][^"]*)?"').test(home),'Removed standalone Spine hub card returned');
assert.ok(home.includes('https://counterside.kro.kr/website/'),'Website backup link');
const guide=fs.readFileSync(path.join(out,'guide/index.html'),'utf8');
assert.match(guide,/<h1\b[^>]*>인게임 가이드<\/h1>/,'Guide heading does not use the current name');
assert.match(guide,/<title>인게임 가이드 \| 카운터사이드 웹뷰어<\/title>/,'Guide metadata title does not use the current name');
const webtoons=fs.readFileSync(path.join(out,'webtoons/index.html'),'utf8');
assert.match(webtoons,/<h1\b[^>]*>공식 웹툰<\/h1>/,'Webtoon gallery heading missing');
const serializedWebtoons=clean(webtoons.replaceAll('\\"','"'));
for(const url of webtoonUrls)assert.ok(serializedWebtoons.includes(url),'Webtoon page missing from gallery payload: '+url);
assert.ok(externalWebtoons>0,'Webtoon gallery does not reference its external image repository');
const minigames=fs.readFileSync(path.join(out,'minigames','index.html'),'utf8');
for(const route of ['cafe-strega','match-ten','sword-training'])assert.ok(minigames.includes('href="'+deploymentUrl('/minigames/'+route)),'Missing integrated game link');
const fonts=all.filter(file=>file.endsWith('.ttf')&&fs.statSync(file).size>0);
assert.equal(fonts.length,2,'Duplicate font copies remain');
assert.ok(externalAssets>0&&externalOperatorVoices>0,'External asset references are absent');
const ship=fs.readFileSync(path.join(out,'ships/NKM_SHIP_A_COFFIN/index.html'),'utf8');
assert.ok(ship.includes('현재 함선 능력치 조건')&&ship.includes('조건 설정'),'Latest ship stats controls are absent');
const trophy=fs.readFileSync(path.join(out,'collection/trophies/index.html'),'utf8');
assert.ok(trophy.includes('spine')||trophy.includes('스파인'),'Trophy model data is absent');
const trophyModels=getCollectionTrophyData().trophies.filter(item=>item.spine).map(item=>item.spine.model);
assert.ok(trophyModels.length>0,'No embedded trophy models were built');
for(const model of trophyModels)for(const key of ['jsonUrl','atlasUrl','textureUrl']){
  const url=model[key],mapped=deploymentUrl(url);
  const local=url.startsWith(imageCatalog.baseUrl+'/')?decodeURI(url.slice(imageCatalog.baseUrl.length)):url;
  assert.ok(assetPaths.has(local)&&mapped.startsWith(imageCatalog.baseUrl+'/'),'Trophy model does not resolve to Raw: '+url);
  assert.ok(trophy.includes(url)||trophy.includes(mapped),'Trophy model data missing from the page: '+url);
}
const music=fs.readFileSync(path.join(out,'music/index.html'),'utf8');
for(const track of musicCatalog.tracks){
  assert.ok(music.includes(track.audioPath),'Missing deployed track '+track.id);
  assert.ok(assetPaths.has(track.coverPath),'Missing external album cover');
}
console.log(JSON.stringify({files:all.length,bytes,MiB:+(bytes/1048576).toFixed(2),checkedAssetURLs,verifiedPublicJson,verifiedRawStoryJson,runtimeAssetKeys,inactiveStandaloneSpineKeys,embeddedTrophyModels:trophyModels.length,retainedMinigameSpineFiles:retainedMinigameSpines.length,externalImageReferences:externalAssets,externalSpineReferences:externalSpine,externalStoryDataReferences:externalStoryData,externalOperatorVoiceReferences:externalOperatorVoices,externalOtherVoiceReferences:externalOtherVoices,externalMusicReferences:externalMusic,externalWebtoonReferences:externalWebtoons,webtoonEntries:webtoonEntries.length,webtoonImages:webtoonUrls.size,jukeboxTracks:musicCatalog.tracks.length,missingAssets:missing.size,scopeVerified:true}));
