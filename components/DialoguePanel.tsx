import { deploymentUrl } from "@/lib/deployment";
import type { ComponentType } from "react";
import VoiceLanguageControls from "@/components/VoiceLanguageControls";
import VoicePlayButton from "@/components/VoicePlayButton";
export type DialogueEntry = {
    id: string;
    label: string;
    text: string;
    audioPath: string;
    japaneseAudioPath?: string;
    playbackLabel?: string;
};
type DialoguePanelProps = {
    dialogues: DialogueEntry[];
    extraDialogues?: DialogueEntry[];
    extraTitle?: string;
    extraBadge?: string;
    languageControls?: boolean;
    panelTitle?: string;
    className?: string;
    textComponent?: ComponentType<DialogueTextProps>;
    preserveLineBreaks?: boolean;
};
type DialogueTextProps = {
    text: string;
    className: string;
};
function DialogueText({ text, className }: DialogueTextProps) {
    return <p className={className}>{text}</p>;
}
function DialogueCard({ dialogue, badge, playbackSuffix = "대사", textComponent: TextComponent, preserveLineBreaks, }: {
    dialogue: DialogueEntry;
    badge?: string;
    playbackSuffix?: string;
    textComponent: ComponentType<DialogueTextProps>;
    preserveLineBreaks: boolean;
}) {
    return (<div className="voice-dialogue-card border border-[#343844] bg-[#0b0d12] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <p className="text-sm font-black text-[#bf9000]">{dialogue.label}</p>
          {badge ? (<span className="border border-[#4b5160] bg-[#222631] px-1.5 py-0.5 text-[10px] font-black text-[#cfd4dc]">
              {badge}
            </span>) : null}
        </div>
        {dialogue.audioPath || dialogue.japaneseAudioPath ? (<VoicePlayButton src={deploymentUrl(dialogue.audioPath)} japaneseSrc={dialogue.japaneseAudioPath} label={dialogue.playbackLabel ?? `${dialogue.label} ${playbackSuffix}`}/>) : null}
      </div>
      <TextComponent text={dialogue.text} className={`mt-2 text-base leading-7 text-[#d1d5db]${preserveLineBreaks ? " whitespace-pre-line" : ""}`}/>
    </div>);
}
export default function DialoguePanel({ dialogues, extraDialogues = [], extraTitle = "추가 대사", extraBadge, languageControls = true, panelTitle = "대사", className = "mt-5", textComponent = DialogueText, preserveLineBreaks = false, }: DialoguePanelProps) {
    const contents = (<>
      <div className="grid gap-3">
        {dialogues.map((dialogue) => (<DialogueCard key={dialogue.id} dialogue={dialogue} textComponent={textComponent} preserveLineBreaks={preserveLineBreaks}/>))}
      </div>
      {extraDialogues.length > 0 ? (<details className="mt-4">
          <summary className="cursor-pointer border border-[#343844] bg-[#222631] px-4 py-3 text-sm font-black text-[#e5e7eb] transition hover:bg-[#2a2f3c]">
            {extraTitle}
            <span className="ml-2 text-xs text-[#9ca3af]">{extraDialogues.length}개</span>
          </summary>
          <div className="mt-3 grid gap-3">
            {extraDialogues.map((dialogue) => (<DialogueCard key={dialogue.id} dialogue={dialogue} badge={extraBadge} playbackSuffix={extraTitle} textComponent={textComponent} preserveLineBreaks={preserveLineBreaks}/>))}
          </div>
        </details>) : null}
    </>);
    return (<div className={`rounded-md border border-[#343844] bg-[#171a21] p-5 ${className}`}>
      {languageControls ? (<VoiceLanguageControls panelTitle={panelTitle} hasKoreanVoice={[...dialogues, ...extraDialogues].some((dialogue) => Boolean(dialogue.audioPath))} hasJapaneseVoice={[...dialogues, ...extraDialogues].some((dialogue) => Boolean(dialogue.japaneseAudioPath))}>
          {contents}
        </VoiceLanguageControls>) : contents}
    </div>);
}
