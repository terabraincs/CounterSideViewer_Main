// Keep Raw-served Story data ready for clients before it is committed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadTypeScript} from '../tests/load-typescript.mjs';
const catalog=JSON.parse(fs.readFileSync('data/story-data-assets.json','utf8'));
const {deploymentData}=loadTypeScript('lib/deployment.ts');
const root=path.resolve('public');
let files=0,bytes=0,changed=0;
for(const url of catalog.paths){
  const file=path.resolve(root,url.replace(/^\//,''));
  assert.ok(file.startsWith(root+path.sep),'Story data escapes public');
  const before=fs.readFileSync(file,'utf8');
  const prepared=JSON.stringify(deploymentData(JSON.parse(before)))+'\n';
  assert.equal(JSON.stringify(deploymentData(JSON.parse(prepared))),prepared.trimEnd(),'Story URL mapping must be idempotent');
  if(before!==prepared){
    assert.ok(!process.argv.includes('--check'),'Story source has unresolved asset URLs: '+url);
    fs.writeFileSync(file,prepared,'utf8');changed++;
  }
  files++;bytes+=Buffer.byteLength(prepared);
}
console.log(JSON.stringify({storyRawData:'PASS',files,bytes,changed}));
