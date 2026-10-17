"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode, } from "react";
export type CharacterSkillPlaybackRequest = {
    actionId: string;
    revision: number;
};
type CharacterSkillPlaybackContextValue = {
    request: CharacterSkillPlaybackRequest | null;
    playSkill: (actionId: string) => void;
};
const CharacterSkillPlaybackContext = createContext<CharacterSkillPlaybackContextValue | null>(null);
export function CharacterSkillPlaybackProvider({ children, }: {
    children: ReactNode;
}) {
    const [request, setRequest] = useState<CharacterSkillPlaybackRequest | null>(null);
    const playSkill = useCallback((actionId: string) => {
        setRequest((previous) => ({
            actionId,
            revision: (previous?.revision ?? 0) + 1,
        }));
    }, []);
    const value = useMemo(() => ({ request, playSkill }), [request, playSkill]);
    return (<CharacterSkillPlaybackContext.Provider value={value}>
      {children}
    </CharacterSkillPlaybackContext.Provider>);
}
export function useCharacterSkillPlayback() {
    return useContext(CharacterSkillPlaybackContext);
}
export function CharacterSkillMotionButton({ actionId, skillName, children, }: {
    actionId?: string;
    skillName: string;
    children: ReactNode;
}) {
    const playback = useCharacterSkillPlayback();
    const disabled = !actionId || !playback;
    const label = `${skillName} 스파인 모션 재생`;
    function playSkill() {
        if (!actionId || !playback)
            return;
        playback.playSkill(actionId);
        document.getElementById("spine")?.scrollIntoView({
            block: "start",
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
        });
    }
    return (<button type="button" disabled={disabled} aria-label={label} aria-controls="spine" title={disabled ? `${skillName}: 재생할 전투동작이 없습니다` : label} data-testid="skill-spine-play" data-skill-action-id={actionId} onClick={playSkill} className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden border border-[#343844] bg-[#0b0d12] transition enabled:cursor-pointer enabled:hover:border-white enabled:hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed">
      {children}
    </button>);
}
