import { deploymentUrl } from "@/lib/deployment";
type StoryAudioCacheEntry = {
    source: HTMLAudioElement;
    loaded: Promise<boolean>;
};
const storyAudioCache = new Map<string, StoryAudioCacheEntry>();
// STV-AUD-003: these sources are deliberately kept across scene-cache
// replacement after the chronicle root has prepared them. The set is scoped to
// the current document and stays empty on a direct Reader entry.
const retainedStoryAudioUrls = new Set<string>();
let storyAudioSourceSequence = 0;
let storyAudioPlaySequence = 0;
function syncStoryAudioCacheDiagnostics() {
    if (typeof document === "undefined") {
        return;
    }
    document.documentElement.dataset.storyAudioCacheSize = String(storyAudioCache.size);
    document.documentElement.dataset.storyAudioCacheRetainedCount = String(retainedStoryAudioUrls.size);
    document.documentElement.dataset.storyAudioCacheSourceSequence = String(storyAudioSourceSequence);
}
function attachStoryAudioPlayDiagnostics(audio: HTMLAudioElement) {
    audio.addEventListener("play", () => {
        // STV-AUD-001 browser parity probe: record the value actually accepted by
        // HTMLMediaElement, including float32 client-style source gains.
        storyAudioPlaySequence += 1;
        document.documentElement.dataset.storyAudioPlaySequence = String(storyAudioPlaySequence);
        document.documentElement.dataset.storyLastAudioSrc =
            audio.currentSrc || audio.src;
        document.documentElement.dataset.storyLastAudioVolume =
            audio.volume.toFixed(9);
        document.documentElement.dataset.storyLastAudioLoop = String(audio.loop);
    });
    return audio;
}
function normalizeAudioUrl(path: string) {
    if (!path || typeof window === "undefined") {
        return "";
    }
    return new URL(deploymentUrl(path), window.location.href).href;
}
function getStoryAudioCacheEntry(path: string) {
    const url = normalizeAudioUrl(path);
    if (!url) {
        return null;
    }
    const cached = storyAudioCache.get(url);
    if (cached) {
        return cached;
    }
    const source = new Audio();
    source.preload = "auto";
    const loaded = new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ready: boolean) => {
            if (settled) {
                return;
            }
            settled = true;
            resolve(ready);
        };
        const handleReady = () => finish(true);
        const handleError = () => finish(false);
        source.addEventListener("canplaythrough", handleReady, { once: true });
        source.addEventListener("error", handleError, { once: true });
        source.src = deploymentUrl(url);
        source.load();
        if (source.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
            queueMicrotask(handleReady);
        }
    });
    const entry = { source, loaded };
    storyAudioCache.set(url, entry);
    storyAudioSourceSequence += 1;
    syncStoryAudioCacheDiagnostics();
    return entry;
}
function normalizeStoryAudioUrls(paths: Iterable<string>) {
    return new Set([...paths]
        .map(normalizeAudioUrl)
        .filter((url): url is string => Boolean(url)));
}
async function loadStoryAudioUrls(urls: ReadonlySet<string>) {
    const entries = [...urls]
        .map(getStoryAudioCacheEntry)
        .filter((entry): entry is StoryAudioCacheEntry => Boolean(entry));
    const results = await Promise.all(entries.map((entry) => entry.loaded));
    return {
        failed: results.filter((ready) => !ready).length,
        total: entries.length,
    };
}
export function preloadRetainedStoryAudioUrls(paths: Iterable<string>) {
    const urls = normalizeStoryAudioUrls(paths);
    for (const url of urls) {
        retainedStoryAudioUrls.add(url);
    }
    syncStoryAudioCacheDiagnostics();
    return loadStoryAudioUrls(urls);
}
export async function preloadStoryAudioUrls(paths: Iterable<string>) {
    const urls = normalizeStoryAudioUrls(paths);
    for (const [url, entry] of storyAudioCache) {
        if (urls.has(url) || retainedStoryAudioUrls.has(url)) {
            continue;
        }
        entry.source.removeAttribute("src");
        entry.source.load();
        storyAudioCache.delete(url);
    }
    syncStoryAudioCacheDiagnostics();
    return loadStoryAudioUrls(urls);
}
export function createStoryAudio(path: string) {
    const entry = getStoryAudioCacheEntry(path);
    if (!entry) {
        return attachStoryAudioPlayDiagnostics(new Audio());
    }
    const audio = entry.source.cloneNode(true) as HTMLAudioElement;
    audio.preload = "auto";
    return attachStoryAudioPlayDiagnostics(audio);
}
