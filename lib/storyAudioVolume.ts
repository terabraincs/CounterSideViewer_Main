/**
 * STV-AUD-001: NKCGameOptionDataSt.Init의 기본 스토리 오디오 그룹 gain.
 * 컷신 명령이 전달하는 local volume과 전역 그룹 값을 분리해서 계산한다.
 * 기본 그룹 값에서는 Unity AudioMixer가 0 dB이므로 source gain만 적용한다.
 */
export const STORY_CLIENT_AUDIO_DEFAULTS = Object.freeze({
    master: 1,
    music: 0.7,
    effect: 0.6,
    musicFactor: 1,
});
export function getStoryClientAudioVolume(kind: "bgm" | "sfx", localVolume = 1) {
    const categoryVolume = kind === "bgm"
        ? STORY_CLIENT_AUDIO_DEFAULTS.music
        : STORY_CLIENT_AUDIO_DEFAULTS.effect;
    let volume = Math.fround(Math.fround(categoryVolume) * Math.fround(localVolume));
    if (kind === "bgm") {
        volume = Math.fround(volume * Math.fround(STORY_CLIENT_AUDIO_DEFAULTS.musicFactor));
    }
    return Math.fround(volume * Math.fround(STORY_CLIENT_AUDIO_DEFAULTS.master));
}
