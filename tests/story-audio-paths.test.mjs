import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypeScript} from './load-typescript.mjs';

const createdSources=[];
class RecordingAudio {
  constructor(){createdSources.push(this);}
  src='';
  readyState=4;
  currentTime=0;
  volume=1;
  paused=true;
  ended=false;
  addEventListener(){}
  load(){}
  removeAttribute(name){if(name==='src')this.src='';}
  cloneNode(){const clone=new RecordingAudio();clone.src=this.src;return clone;}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
}

globalThis.Audio=RecordingAudio;
globalThis.HTMLMediaElement={HAVE_ENOUGH_DATA:4};
globalThis.window={location:{href:'https://example.test/CounterSideViewer_Main/story/'}};
globalThis.document={documentElement:{dataset:{}}};
const {createStoryAudio,preloadStoryAudioUrls}=loadTypeScript('lib/storyAudioCache.ts');
const {playStoryTheme,hasActiveStoryTheme,getActiveStoryThemeState,stopStoryTheme}=loadTypeScript('lib/storyThemeAudio.ts');
const intro='/story/seasonal-ui/FX_UI_SUBSTREAM_INTRO.wav';
const remoteIntro='https://raw.githubusercontent.com/terabraincs/Asset_main/main/story/seasonal-ui/FX_UI_SUBSTREAM_INTRO.wav';

test('seasonal intro playback and preload use the remote clip without a same-site request',async()=>{
  const offset=createdSources.length;
  const report=await preloadStoryAudioUrls([intro,remoteIntro]);
  assert.deepEqual(report,{failed:0,total:1},'Local and Raw aliases must share one cached source');
  assert.equal(createStoryAudio(intro).src,remoteIntro);
  assert.equal(createStoryAudio(remoteIntro).src,remoteIntro);
  assert.ok(createdSources.slice(offset).every(audio=>audio.src===remoteIntro),'Audio.src received a stale same-site media URL');
});

test('story theme identity is normalized after asset routing',()=>{
  stopStoryTheme();
  const audio=playStoryTheme(intro,0.8,12);
  assert.equal(audio.src,remoteIntro);
  assert.equal(audio.currentTime,12);
  assert.equal(audio.loop,true);
  assert.equal(getActiveStoryThemeState().url,remoteIntro);
  assert.equal(hasActiveStoryTheme(intro),true);
  assert.equal(hasActiveStoryTheme(remoteIntro),true);
  assert.equal(playStoryTheme(remoteIntro),audio,'Equivalent local and remote paths must not restart the theme');
  stopStoryTheme();
});

test('story audio preserves relative, absolute, data and blob URL behavior',()=>{
  const cases=[
    ['../relative-tone.ogg','https://example.test/CounterSideViewer_Main/relative-tone.ogg'],
    ['/unindexed-tone.ogg','https://example.test/unindexed-tone.ogg'],
    ['https://media.example.test/tone.ogg?x=1#clip','https://media.example.test/tone.ogg?x=1#clip'],
    ['https://example.test/story/same-origin.ogg','https://example.test/story/same-origin.ogg'],
    ['//media.example.test/tone.ogg','https://media.example.test/tone.ogg'],
    ['blob:https://example.test/retained-audio','blob:https://example.test/retained-audio'],
    ['data:audio/ogg;base64,T2dnUw==','data:audio/ogg;base64,T2dnUw=='],
  ];
  for(const [input,expected] of cases){
    assert.equal(createStoryAudio(input).src,expected,input);
    assert.equal(playStoryTheme(input).src,expected,input);
    assert.equal(getActiveStoryThemeState().url,expected,input);
    stopStoryTheme();
  }
  assert.equal(createStoryAudio('').src,'');
  assert.equal(playStoryTheme(''),null);
});
