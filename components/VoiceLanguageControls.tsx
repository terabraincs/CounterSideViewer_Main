"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
type VoiceLanguage = "ko" | "ja";
const VoiceLanguageContext = createContext<VoiceLanguage | null>(null);
export function useVoiceLanguage() {
    return useContext(VoiceLanguageContext);
}
export default function VoiceLanguageControls({ children, className, hasKoreanVoice = true, hasJapaneseVoice, panelTitle, variant = "default", }: {
    children: ReactNode;
    className?: string;
    hasKoreanVoice?: boolean;
    hasJapaneseVoice: boolean;
    panelTitle?: string;
    variant?: "default" | "compact";
}) {
    const [language, setLanguage] = useState<VoiceLanguage>("ko");
    const selectedLanguage = !hasKoreanVoice && hasJapaneseVoice
        ? "ja"
        : hasJapaneseVoice ? language : "ko";
    const compact = variant === "compact";
    const controls = (<div role="group" aria-label="대사 음성 언어" className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
      {([
            ["ko", "한국어", hasKoreanVoice],
            ["ja", "일본어", hasJapaneseVoice],
        ] as const).map(([value, label, available]) => (<button key={value} type="button" aria-pressed={available && selectedLanguage === value} disabled={!available} title={!available ? `${label} 음성이 없습니다` : undefined} onClick={() => setLanguage(value)} className={`cursor-pointer rounded-md border px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${available && selectedLanguage === value
                ? "border-[#bf9000] bg-[#bf9000] text-[#0b0d12]"
                : "border-[#4b5160] bg-[#222631] text-[#cfd4dc] enabled:hover:border-[#bf9000] enabled:hover:text-white"}`}>
          {label}
        </button>))}
    </div>);
    const header = (<div className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#343844] ${compact ? "py-4" : "mb-4 pb-4"}`}>
      {panelTitle ? <h3 className="text-lg font-bold text-[#cfd4dc]">{panelTitle}</h3> : null}
      {controls}
    </div>);
    return (<VoiceLanguageContext.Provider value={selectedLanguage}>
      <div className={className} data-voice-language={selectedLanguage}>
        {compact ? (<div className="rounded-md border border-[#343844] bg-[#171a21] px-5 min-[551px]:px-6">
            {header}
            {children}
          </div>) : (<>
            {header}
            {children}
          </>)}
      </div>
    </VoiceLanguageContext.Provider>);
}
