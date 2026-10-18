import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadTypeScript} from './load-typescript.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const remote=read('data/webtoon-remote-assets.json');
const client=read('data/webtoon-catalog.json');
const archive=read('data/webtoon-archive-catalog.json');
const {getWebtoons,getWebtoonCoverImagePath}=loadTypeScript('lib/webtoons.ts');
const {webtoonRepositoryImageUrl}=loadTypeScript('lib/webtoonAssets.ts');
const entries=getWebtoons();
const pinnedBase='https://raw.githubusercontent.com/terabraincs/CounterSide_Comics/110179af577c86cd0d28b6122ac51a23ed037808';

test('all official, guide and six-language client webtoons use the verified storage commit',()=>{
  assert.equal(remote.baseUrl,pinnedBase);
  assert.equal(remote.commit,pinnedBase.split('/').at(-1));
  assert.equal(entries.length,398);
  assert.equal(new Set(entries.map(entry=>entry.id)).size,398);
  const counts={};
  for(const entry of entries)counts[entry.collection]=(counts[entry.collection]??0)+1;
  assert.deepEqual(counts,{official:236,guide:42,client:120});
  const pages=entries.flatMap(entry=>entry.pages);
  assert.equal(pages.length,742);
  assert.equal(new Set(pages.map(page=>page.imagePath)).size,742);
  for(const page of pages){
    assert.ok(page.imagePath.startsWith(pinnedBase+'/'),page.imagePath);
    assert.ok(page.width>0&&page.height>0,'Missing original image dimensions');
  }
});

test('archive page order and encoded paths match the original catalog without shared headers',()=>{
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const excluded=new Set(archive.excludedImages.map(page=>webtoonRepositoryImageUrl(page.repositoryPath)));
  assert.equal(archive.pageCount,622);
  for(const source of archive.entries){
    const entry=byId.get(source.id);
    assert.equal(entry.title,source.title);
    assert.equal(entry.collection,source.collection);
    assert.deepEqual(entry.pages.map(page=>page.imagePath),source.pages.map(page=>
      pinnedBase+'/'+page.repositoryPath.split('/').map(encodeURIComponent).join('/')));
    assert.equal(entry.imagePath,entry.pages[0].imagePath,'Gallery cover must be the first content page');
    for(const page of entry.pages)assert.ok(!excluded.has(page.imagePath),'A shared post header became episode content');
  }
});

test('client comic titles show the original language caption and preserve language-specific clipping',()=>{
  const byId=new Map(entries.map(entry=>[entry.id,entry]));
  const counts={};
  for(const source of client.entries){
    const entry=byId.get(source.id);
    counts[entry.language]=(counts[entry.language]??0)+1;
    assert.ok(source.description.trim());
    assert.equal(entry.title,source.description.trim());
    assert.equal(entry.description,source.description);
    assert.deepEqual(entry.pages[0].clipInsets,source.clipInsets);
    const expected=['클라이언트',remote.languageFolders[source.language],source.imagePath.split('/').at(-1)];
    assert.equal(entry.imagePath,pinnedBase+'/'+expected.map(encodeURIComponent).join('/'));
  }
  assert.deepEqual(counts,{ko:20,en:20,ja:20,'zh-TW':20,de:20,fr:20});
  assert.equal(getWebtoonCoverImagePath(),byId.get('Loading_Guide_img_01').imagePath);
});

test('webtoon paths reject traversal and the standalone Spine route remains excluded',()=>{
  for(const invalid of ['', '/KOR/image.png', '../image.png', 'KOR/../image.png', 'KOR/./image.png', 'KOR//image.png', 'KOR\\image.png']){
    assert.throws(()=>webtoonRepositoryImageUrl(invalid));
  }
  assert.ok(fs.existsSync(new URL('../app/webtoons/page.tsx',import.meta.url)),'Webtoon route was not copied into Main');
  assert.ok(!fs.existsSync(new URL('../app/spine-viewer',import.meta.url)),'Standalone Spine source route must not be copied');
});
