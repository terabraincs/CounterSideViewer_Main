// UTF-8. Publish code locally while media and Story data are served through Raw.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadTypeScript} from '../tests/load-typescript.mjs';
const {deploymentData,deploymentUrl}=loadTypeScript('lib/deployment.ts');
const story=JSON.parse(fs.readFileSync('data/story-data-assets.json','utf8'));
const out=path.resolve('out');
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())walk(file);
  else if(entry.name.endsWith('.json')&&!file.includes(path.sep+'_next'+path.sep)){
    fs.writeFileSync(file,JSON.stringify(deploymentData(JSON.parse(fs.readFileSync(file,'utf8')))),'utf8');
  }else if(entry.name.endsWith('.css')){
    const text=fs.readFileSync(file,'utf8');
    fs.writeFileSync(file,text.replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g,(_,quote,url)=>'url('+quote+deploymentUrl(url)+quote+')'),'utf8');
  }
}}
walk(out);
const omitted=[...story.paths.map(url=>url.slice(1)),'story/reader/manifest.json','story/reader/manifest.v1.json','spine/manifest.json'];
for(const relative of omitted){
  const file=path.resolve(out,relative);
  assert.ok(file.startsWith(out+path.sep),'Generated export cleanup escapes out');
  if(fs.existsSync(file))fs.unlinkSync(file);
}
function removeEmptyDirectories(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}))if(entry.isDirectory()){
  const child=path.join(dir,entry.name);assert.ok(child.startsWith(out+path.sep));
  removeEmptyDirectories(child);if(fs.readdirSync(child).length===0)fs.rmdirSync(child);
}}
removeEmptyDirectories(out);
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Prepared external media and '+story.paths.length+' Raw-served Story JSON files; build-only manifests omitted');
