import fs from 'node:fs';
import path from 'node:path';
const base=process.env.NEXT_PUBLIC_BASE_PATH??'';
const images=JSON.parse(fs.readFileSync('data/main-image-assets.json','utf8'));
const imagePaths=new Set(images.paths);
const minigames=JSON.parse(fs.readFileSync('data/minigame-assets.json','utf8'));
const mediaPaths=new Set(minigames.paths);
const audio=JSON.parse(fs.readFileSync('data/site-audio-assets.json','utf8')).aliases;
const pattern=/^\/(?:game-assets|equipment|operators?|ships?|collection|unit|ui|story|music|spine|guide|cutscenes|voice|assets)(?:\/|$)/;
function prefix(value) {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//'))return value;
  if(/^\/story\/reader\/fonts\/(?:MainFont|Rajdhani-SemiBold)\.ttf(?:[?#]|$)/.test(value))return prefix(value.replace('/story/reader/fonts/','/game-assets/common/fonts/'));
  const separator=value.search(/[?#]/),pathname=separator<0?value:value.slice(0,separator),suffix=separator<0?'':value.slice(separator);
  const local=decodeURI(pathname).replace(/^\/minigames\/(?=(?:cafe-strega|match-ten|sword-training)\/)/,'/game-assets/');
  if(audio[decodeURI(pathname)])return audio[decodeURI(pathname)]+suffix;
  if(minigames.fontAliases[local])return minigames.fontAliases[local]+suffix;
  if(imagePaths.has(local)||mediaPaths.has(local))return images.baseUrl+local.split('/').map(encodeURIComponent).join('/')+suffix;
  return pattern.test(value)&&base&&!value.startsWith(base+'/')?base+value:value;
}
function rebase(v){if(typeof v==='string')return prefix(v);if(Array.isArray(v))return v.map(rebase);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,rebase(v)]));return v;}
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.json')&&!p.includes(path.sep+'_next'+path.sep)){fs.writeFileSync(p,JSON.stringify(rebase(JSON.parse(fs.readFileSync(p,'utf8')))),'utf8');}else if(e.name.endsWith('.css')){const text=fs.readFileSync(p,'utf8');fs.writeFileSync(p,text.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g,(_,quote,url)=>'url('+quote+prefix(url)+quote+')'),'utf8');}}}
walk('out');
// Legacy build inputs are superseded by reader/data's split runtime data.
for(const relative of ['story/reader/manifest.json','story/reader/manifest.v1.json','spine/manifest.json']){
  const target=path.resolve('out',relative);if(fs.existsSync(target))fs.unlinkSync(target);
}
for(const relative of ['story/reader','story','spine']){
  const target=path.resolve('out',relative);if(fs.existsSync(target)&&fs.readdirSync(target).length===0)fs.rmdirSync(target);
}
fs.writeFileSync('out/.nojekyll','');console.log('Prepared public JSON, external media and shared fonts for '+(base||'/'));
