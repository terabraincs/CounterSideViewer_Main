import { deploymentUrl } from "@/lib/deployment";
import VoiceLanguageControls from "@/components/VoiceLanguageControls";
import VoicePlayButton from "@/components/VoicePlayButton";
import type { VoiceGroup } from "@/lib/voiceGroups";
export default function GroupedVoiceList({ groups, title, description, kind, }: {
    groups: VoiceGroup[];
    title: string;
    description?: string;
    kind: "battle" | "unused";
}) {
    if (groups.length === 0)
        return null;
    return (<VoiceLanguageControls variant="compact" panelTitle={title} hasKoreanVoice={groups.some((group) => group.clips.some((clip) => Boolean(clip.audioPath)))} hasJapaneseVoice={groups.some((group) => group.clips.some((clip) => Boolean(clip.japaneseAudioPath)))}>
      {description ? (<p className="border-b border-[#343844] py-3 text-sm leading-6 text-[#9ca3af]">
          {description}
        </p>) : null}
      <div className="grid grid-cols-1 divide-y divide-[#343844] min-[551px]:grid-cols-[max-content_minmax(0,1fr)]">
        {groups.map((group) => (<div key={group.id} data-battle-voice-group={kind === "battle" ? group.id : undefined} data-unused-voice-group={kind === "unused" ? group.id : undefined} className="grid grid-cols-1 items-start gap-x-5 gap-y-2 py-4 min-[551px]:col-span-2 min-[551px]:grid-cols-subgrid">
            <h4 className="min-w-[88px] max-w-44 text-base leading-7 font-black text-[#bf9000] min-[551px]:leading-12">
              {group.label}
            </h4>
            <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label={`${group.label} 음성`}>
              {group.clips.map((clip, index) => (<VoicePlayButton key={`${clip.bundle}:${clip.id}`} src={deploymentUrl(clip.audioPath)} japaneseSrc={clip.japaneseAudioPath} label={`${group.label} ${index + 1} ${title}`} number={index + 1}/>))}
            </div>
          </div>))}
      </div>
    </VoiceLanguageControls>);
}
