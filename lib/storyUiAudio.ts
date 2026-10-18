import { createSoundAssetUrl } from "@/lib/staticAssets";
import { createStoryAudio, preloadRetainedStoryAudioUrls, } from "@/lib/storyAudioCache";
import { getStoryClientAudioVolume } from "@/lib/storyAudioVolume";
import { STORY_TITLE_TYPING_SOUND_PATH, STORY_UI_BACK_SOUND_PATH, STORY_UI_BUTTON_SOUND_PATH, STORY_UI_HOME_SOUND_PATH, } from "@/lib/storyPlayback";
export type StoryUiPointerSound = "select" | "back" | "home";
type StoryUiPointerEvent = {
    detail: number;
};
const STORY_UI_POINTER_SOUND_PATHS: Readonly<Record<StoryUiPointerSound, string>> = Object.freeze({
    select: STORY_UI_BUTTON_SOUND_PATH,
    back: STORY_UI_BACK_SOUND_PATH,
    home: STORY_UI_HOME_SOUND_PATH,
});
export const STORY_COMMON_UI_SOUND_PATHS = Object.freeze([
    STORY_UI_BUTTON_SOUND_PATH,
    STORY_UI_BACK_SOUND_PATH,
    STORY_UI_HOME_SOUND_PATH,
    STORY_TITLE_TYPING_SOUND_PATH,
] as const);
const activeStoryUiPointerAudio = new Set<HTMLAudioElement>();
let storyUiPointerRequestSequence = 0;
/**
 * STV-AUD-003: chronicle-entry performance preload. This only creates retained
 * source elements; playback and client effect gain remain owned by their
 * existing call sites.
 */
export function preloadStoryCommonUiAudio() {
    const urls = STORY_COMMON_UI_SOUND_PATHS.map((relativePath) => createSoundAssetUrl(...relativePath.split("/").filter(Boolean)));
    return preloadRetainedStoryAudioUrls(urls);
}
/**
 * STV-AUD-002: NKCUIComButton/StateButtonBase plays its serialized sound only
 * through OnPointerClick. Unity hotkeys invoke the callback directly, so
 * keyboard and programmatic clicks (MouseEvent.detail === 0) stay silent.
 */
export function playStoryUiPointerSound(event: StoryUiPointerEvent, kind: StoryUiPointerSound = "select") {
    if (!Number.isFinite(event.detail) || event.detail <= 0) {
        return null;
    }
    const relativePath = STORY_UI_POINTER_SOUND_PATHS[kind];
    const audio = createStoryAudio(createSoundAssetUrl(...relativePath.split("/").filter(Boolean)));
    const release = () => activeStoryUiPointerAudio.delete(audio);
    audio.loop = false;
    audio.currentTime = 0;
    audio.volume = getStoryClientAudioVolume("sfx");
    audio.addEventListener("ended", release, { once: true });
    audio.addEventListener("error", release, { once: true });
    activeStoryUiPointerAudio.add(audio);
    storyUiPointerRequestSequence += 1;
    document.documentElement.dataset.storyUiPointerRequestSequence = String(storyUiPointerRequestSequence);
    document.documentElement.dataset.storyUiPointerSound = kind;
    document.documentElement.dataset.storyUiPointerSoundSrc = audio.src;
    document.documentElement.dataset.storyUiPointerSoundVolume =
        audio.volume.toFixed(9);
    void audio.play().catch(release);
    return audio;
}
