"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef, useState } from "react";
import Image from "@/components/DeploymentImage";
import { useVoiceLanguage } from "@/components/VoiceLanguageControls";
type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error";
type VoicePlayButtonProps = {
    src: string;
    japaneseSrc?: string;
    label: string;
    number?: number;
};
let activeAudio: HTMLAudioElement | null = null;
const numberedButtonClassName = "flex h-12 min-w-[72px] shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-md border px-3.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed";
function VoicePlaybackIcon({ isPlaying = false, isLoading = false, compact = false, }: {
    isPlaying?: boolean;
    isLoading?: boolean;
    compact?: boolean;
}) {
    return (<Image src={deploymentUrl(isPlaying
        ? deploymentUrl("/ui/AB_UI_COLLECTION_ICON_PLAY.png") : deploymentUrl("/ui/AB_UI_COLLECTION_ICON_PAUSE.png"))} alt="" width={compact ? 22 : isPlaying ? 31 : 34} height={compact ? 22 : 34} className={`${compact ? "h-[22px] w-[22px] object-contain" : ""} ${isLoading ? "animate-pulse" : ""}`}/>);
}
export default function VoicePlayButton({ src, japaneseSrc, label, number, }: VoicePlayButtonProps) {
    const language = useVoiceLanguage();
    const selectedSrc = language === "ja" ? japaneseSrc ?? "" : src;
    const languageLabel = language === "ja" ? "일본어" : "한국어";
    if (!selectedSrc) {
        const unavailableLabel = `${languageLabel} 음성 없음`;
        if (number !== undefined) {
            return (<button type="button" disabled aria-label={`${label} ${unavailableLabel}`} aria-pressed={false} data-voice-playing="false" title={unavailableLabel} className={`${numberedButtonClassName} border-[#4b5160] bg-[#222631] text-[#cfd4dc] opacity-30`}>
          <span className="min-w-3 text-center text-base tabular-nums">{number}</span>
          <VoicePlaybackIcon compact/>
        </button>);
        }
        return (<span className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-[#9ca3af]">{unavailableLabel}</span>
        <button type="button" disabled aria-label={`${label} ${unavailableLabel}`} data-voice-playing="false" title={unavailableLabel} className="flex h-10 w-10 shrink-0 items-center justify-center opacity-30">
          <VoicePlaybackIcon />
        </button>
      </span>);
    }
    return (<VoicePlayer key={`${language ?? "ko"}:${selectedSrc}`} src={deploymentUrl(selectedSrc)} label={language ? `${label} ${languageLabel}` : label} number={number}/>);
}
function VoicePlayer({ src, label, number, }: {
    src: string;
    label: string;
    number?: number;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const mountedRef = useRef(false);
    const playbackRequestRef = useRef(0);
    const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
    const isPlaying = playbackState === "playing";
    const isPlaybackActive = isPlaying || playbackState === "loading";
    const buttonLabel = isPlaying ? `${label} 일시정지` : `${label} 재생`;
    useEffect(() => {
        mountedRef.current = true;
        const audio = audioRef.current;
        return () => {
            mountedRef.current = false;
            playbackRequestRef.current += 1;
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
            if (activeAudio === audio) {
                activeAudio = null;
            }
        };
    }, []);
    async function togglePlayback() {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }
        const request = ++playbackRequestRef.current;
        if (!audio.paused || (playbackState === "loading" && activeAudio === audio)) {
            audio.pause();
            audio.currentTime = 0;
            if (activeAudio === audio) {
                activeAudio = null;
            }
            setPlaybackState("idle");
            return;
        }
        if (activeAudio && activeAudio !== audio) {
            activeAudio.pause();
            activeAudio.currentTime = 0;
        }
        activeAudio = audio;
        audio.currentTime = 0;
        setPlaybackState("loading");
        try {
            await audio.play();
            if (!mountedRef.current || activeAudio !== audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
        catch {
            if (!mountedRef.current ||
                request !== playbackRequestRef.current ||
                activeAudio !== audio) {
                return;
            }
            activeAudio = null;
            setPlaybackState("error");
        }
    }
    function handlePlaying() {
        const audio = audioRef.current;
        if (!mountedRef.current || !audio) {
            return;
        }
        if (activeAudio !== audio) {
            audio.pause();
            audio.currentTime = 0;
            return;
        }
        setPlaybackState("playing");
    }
    return (<>
      <button type="button" aria-label={buttonLabel} aria-pressed={number !== undefined ? isPlaybackActive : undefined} data-voice-playing={isPlaybackActive ? "true" : "false"} title={playbackState === "error" ? "음원을 재생할 수 없습니다" : buttonLabel} onClick={togglePlayback} className={number !== undefined
            ? `${numberedButtonClassName} ${isPlaybackActive
                ? "border-[#4f8fd6] bg-[#163e68] text-white"
                : "border-[#4b5160] bg-[#222631] text-[#cfd4dc] hover:border-white hover:bg-[#2a2f3c] hover:text-white"}`
            : "flex h-10 w-10 shrink-0 items-center justify-center transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"}>
        {number !== undefined ? (<>
            <span className="min-w-3 text-center text-base tabular-nums">{number}</span>
            <VoicePlaybackIcon isPlaying={isPlaying} isLoading={playbackState === "loading"} compact/>
          </>) : (<VoicePlaybackIcon isPlaying={isPlaying} isLoading={playbackState === "loading"}/>)}
      </button>
      <audio ref={audioRef} src={deploymentUrl(src)} preload="none" onPlay={handlePlaying} onPlaying={handlePlaying} onPause={() => {
            if (mountedRef.current && audioRef.current?.paused) {
                setPlaybackState("paused");
            }
        }} onWaiting={() => {
            if (mountedRef.current && activeAudio === audioRef.current) {
                setPlaybackState("loading");
            }
        }} onEnded={() => {
            if (!mountedRef.current) {
                return;
            }
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
            }
            if (activeAudio === audio) {
                activeAudio = null;
            }
            setPlaybackState("idle");
        }} onError={() => {
            if (!mountedRef.current || activeAudio !== audioRef.current) {
                return;
            }
            activeAudio = null;
            setPlaybackState("error");
        }}/>
    </>);
}
