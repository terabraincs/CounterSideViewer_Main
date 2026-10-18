import { createStoryAudio } from "@/lib/storyAudioCache";
import { getStoryClientAudioVolume } from "@/lib/storyAudioVolume";
type ActiveStoryTheme = {
    audio: HTMLAudioElement;
    url: string;
};
let activeStoryTheme: ActiveStoryTheme | null = null;
function normalizeAudioUrl(path: string) {
    if (!path || typeof window === "undefined") {
        return "";
    }
    return new URL(path, window.location.href).href;
}
export function playStoryTheme(path: string, volume = 1, startTime?: number, restart = false) {
    const url = normalizeAudioUrl(path);
    const normalizedLocalVolume = Math.min(Math.max(volume, 0), 1);
    const normalizedVolume = getStoryClientAudioVolume("bgm", normalizedLocalVolume);
    const previousTime = activeStoryTheme?.audio.currentTime ?? 0;
    const requestedTime = startTime === undefined
        ? undefined
        : startTime < 0
            ? previousTime
            : startTime;
    if (!url) {
        stopStoryTheme();
        return null;
    }
    if (activeStoryTheme?.url === url && !restart) {
        activeStoryTheme.audio.volume = normalizedVolume;
        if (activeStoryTheme.audio.paused) {
            void activeStoryTheme.audio.play().catch(() => undefined);
        }
        return activeStoryTheme.audio;
    }
    stopStoryTheme();
    const audio = createStoryAudio(url);
    audio.loop = true;
    audio.volume = normalizedVolume;
    if (requestedTime !== undefined && Number.isFinite(requestedTime)) {
        audio.currentTime = Math.max(requestedTime, 0);
    }
    activeStoryTheme = { audio, url };
    void audio.play().catch(() => {
        if (activeStoryTheme?.audio === audio) {
            activeStoryTheme = null;
        }
    });
    return audio;
}
export function hasActiveStoryTheme(path: string) {
    const url = normalizeAudioUrl(path);
    return Boolean(url &&
        activeStoryTheme?.url === url &&
        !activeStoryTheme.audio.ended);
}
export function getActiveStoryThemeState() {
    if (!activeStoryTheme) {
        return null;
    }
    return {
        currentTime: activeStoryTheme.audio.currentTime,
        paused: activeStoryTheme.audio.paused,
        url: activeStoryTheme.url,
    };
}
export function stopStoryTheme() {
    activeStoryTheme?.audio.pause();
    activeStoryTheme = null;
}
