import catalog from "@/data/music-tracks.json";
import { deploymentData } from "@/lib/deployment";
import storyMusic from "@/data/story-music-titles.json";

export type MusicTrack = {
  id: string;
  order: number;
  title: string;
  audioPath: string;
  coverPath: string;
  duration: number;
  volume: number;
  unlockText: string;
  isLocked: boolean;
  isRegistered: boolean;
};

// Precomputed from the converted Ogg files; Pages builds need no local audio.
export function loadMusicTracks(): MusicTrack[] {
  return deploymentData(catalog.tracks);
}

export function getMusicAssetAudioPath(assetId: string) {
  const normalized = assetId.trim();
  if (!/^[A-Za-z0-9_]+$/.test(normalized)) return "";
  for (const candidate of [normalized, normalized.replace(/^BGM_/i, "")]) {
    const file = candidate.toLowerCase() + ".ogg";
    const track = catalog.tracks.find(track => decodeURIComponent(track.audioPath.split("/").at(-1) ?? "").toLowerCase() === file);
    if (track?.audioPath) return track.audioPath;
  }
  return "";
}

export function getMusicTitle(assetId: string) {
  return (storyMusic.titles as Record<string, string>)[assetId.trim().toLowerCase()] ?? "";
}
