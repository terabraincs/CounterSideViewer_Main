import { deploymentData } from "@/lib/deployment";
import { Fragment } from "react";
import keywordTableRaw from "@/json/character/114_LUA_KEYWORD_TEMPLET_j.json";
const keywordTable = deploymentData(keywordTableRaw);
import keywordStringsRaw from "@/json/KR/character/073_LUA_SI_KEYWORD_KOREA_i.json";
const keywordStrings = deploymentData(keywordStringsRaw);
import { createSkillKeywordMap, splitSkillKeywordText } from "@/lib/skillKeywords";
const keywords = createSkillKeywordMap(keywordTable.data, new Map(keywordStrings.data.map(([key, value]) => [key, value])));
export default function SkillDescription({ id, text, }: {
    id: string;
    text: string;
}) {
    return splitSkillKeywordText(text, keywords).map((part, index) => {
        if (typeof part === "string") {
            return part;
        }
        const popoverId = `${id}-keyword-${index}`;
        // NKCKeywordTemplet uses an underlined name and opens the original Desc on click.
        return (<Fragment key={popoverId}>
        <button type="button" popoverTarget={popoverId} aria-haspopup="dialog" className="cursor-pointer rounded-sm text-[#e5e7eb] underline decoration-[#9ca3af] underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9ca3af]">
          {part.name}
        </button>
        <span id={popoverId} popover="auto" role="dialog" aria-labelledby={`${popoverId}-title`} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto border border-[#4b5160] bg-[#171a21] p-5 text-left text-sm leading-7 text-[#c4c8d0] shadow-xl backdrop:bg-black/30">
          <span className="mb-3 flex items-center justify-between gap-4">
            <strong id={`${popoverId}-title`} className="text-base text-[#e5e7eb]">
              {part.name}
            </strong>
            <button type="button" popoverTarget={popoverId} popoverTargetAction="hide" className="cursor-pointer border border-[#4b5160] px-2 py-0.5 text-xs text-[#cfd4dc] hover:bg-[#222631] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9ca3af]">
              닫기
            </button>
          </span>
          <span className="whitespace-pre-line">{part.description}</span>
        </span>
      </Fragment>);
    });
}
