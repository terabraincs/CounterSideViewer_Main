"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterSpineModels, CharacterSpineMode } from "@/lib/characterSpine";
import SpineNameSelect from "./SpineNameSelect";
import { useCharacterSkillPlayback, type CharacterSkillPlaybackRequest } from "./CharacterSkillPlayback";
const EmbeddedSpineViewer = dynamic(() => import("@/components/SpineViewer"), {
    ssr: false,
    loading: () => <ViewerPlaceholder loading/>,
});
const OriginalRuntimePreview = dynamic(() => import("@/components/OriginalCharacterRuntimePreview"), { ssr: false });
type CharacterSpineViewerProps = {
    unitId?: number;
    unitStrId: string;
    models: CharacterSpineModels;
};
function ViewerPlaceholder({ loading = false }: {
    loading?: boolean;
}) {
    return (<div className="flex min-h-[560px] items-center justify-center rounded-md border border-[#343844] bg-[#10131a] px-4 text-center text-sm text-[#9ca3af]" role={loading ? "status" : undefined}>
      {loading ? "스파인 뷰어를 불러오는 중입니다." : "스파인 뷰어"}
    </div>);
}
export default function CharacterSpineViewer({ models, unitStrId, unitId }: CharacterSpineViewerProps) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [activated, setActivated] = useState(false);
    const [mode, setMode] = useState<CharacterSpineMode>(models.combat.length ? "combat" : models.sd.length ? "sd" : models.illustration.length ? "illustration" : "cutin");
    const [variantIndex, setVariantIndex] = useState(0);
    const [costumeId, setCostumeId] = useState(0);
    const [originalPreview, setOriginalPreview] = useState<string | null>(null);
    const skillRequest = useCharacterSkillPlayback()?.request ?? null;
    const [lastSkillRequest, setLastSkillRequest] = useState<CharacterSkillPlaybackRequest | null>(null);
    const [pendingAction, setPendingAction] = useState<CharacterSkillPlaybackRequest | null>(null);
    const selectedCostume = models.costumes.find((costume) => costume.id === costumeId);
    const costumeModels = selectedCostume ?? models;
    const activeModels = costumeModels[mode];
    const selectedModel = activeModels[variantIndex] ?? activeModels[0];
    // Consume a new icon click before rendering the selected model. This keeps
    // the queued action and its combat model in the same render, even on cold load.
    if (skillRequest && skillRequest !== lastSkillRequest) {
        setLastSkillRequest(skillRequest);
        setActivated(true);
        setOriginalPreview(null);
        setMode("combat");
        setVariantIndex(0);
        if (!costumeModels.combat.length)
            setCostumeId(0);
        setPendingAction(skillRequest);
    }
    const finishSkillRequest = useCallback((revision: number) => {
        setPendingAction(current => current?.revision === revision ? null : current);
    }, []);
    useEffect(() => {
        let previewFrame = 0;
        if (process.env.NODE_ENV !== "production") {
            const preview = new URLSearchParams(window.location.search).get("originalRuntimePreview");
            if (preview && /^[a-f0-9]{20}$/.test(preview))
                previewFrame = requestAnimationFrame(() => setOriginalPreview(preview));
        }
        const host = hostRef.current;
        if (!host)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setActivated(true);
                observer.disconnect();
            }
        }, { rootMargin: "160px" });
        observer.observe(host);
        return () => { observer.disconnect(); cancelAnimationFrame(previewFrame); };
    }, []);
    const modelControls = (<div className="flex max-w-full flex-wrap items-end gap-4">
      <div role="group" aria-label="스파인 종류" className="flex flex-wrap gap-2">
        {([
            ["combat", "인게임"],
            ["sd", "SD"],
            ["illustration", "스탠딩"],
            ["cutin", "컷인"],
        ] as const).map(([value, label]) => (<button key={value} type="button" aria-pressed={mode === value} disabled={costumeModels[value].length === 0} onClick={() => {
                setPendingAction(null);
                setMode(value);
                setVariantIndex(0);
            }} className={`rounded-md border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-40 ${mode === value
                ? "border-white bg-white text-[#111318] shadow-[0_0_14px_rgba(255,255,255,0.22)]"
                : "border-[#4b5563] bg-black/35 text-[#9ca3af] enabled:hover:border-white enabled:hover:text-white"}`}>
            {label}
          </button>))}
      </div>
    </div>);
    const modelSelector = activeModels.length > 1 ? (<SpineNameSelect label="모델" fitContent value={String(variantIndex)} onChange={(value) => { setPendingAction(null); setVariantIndex(Number(value)); }} testId="spine-model-select" options={activeModels.map((model, index) => {
            const name = model.displayName ?? model.variant ?? model.name;
            const parts = /^(.*) \(([^()]*)\)$/.exec(name);
            return { value: String(index), label: parts?.[1] ?? name, originalName: parts?.[2] ?? null };
        })}/>) : null;
    return (<div ref={hostRef} className="mt-5 min-w-0" data-character-spine-mode={mode} data-character-spine-model-id={selectedModel?.id ?? ""} data-character-spine-costume-id={costumeId}>
      {originalPreview && unitId ? (<OriginalRuntimePreview unitId={unitId} packageId={originalPreview} onClose={() => setOriginalPreview(null)}/>) : selectedModel ? (activated ? (<EmbeddedSpineViewer embeddedModel={selectedModel} initialState={selectedModel.initialState} backgroundLayers={mode === "illustration" ? selectedModel.backgroundLayers : undefined} modelControls={modelControls} modelSelector={modelSelector} characterUnitStrId={mode === "combat" ? unitStrId : undefined} characterSkinId={costumeId} actionRequest={pendingAction} onActionRequestHandled={finishSkillRequest} costumeSelection={{
                value: String(costumeId),
                options: [
                    { value: "0", label: "기본", originalName: "default", disabled: models[mode].length === 0 },
                    ...models.costumes.map((costume) => ({
                        value: String(costume.id),
                        label: costume.label,
                        originalName: null,
                        disabled: costume[mode].length === 0,
                    })),
                ],
                onChange: (value) => {
                    setPendingAction(null);
                    setCostumeId(Number(value));
                    setVariantIndex(0);
                },
            }}/>) : <ViewerPlaceholder />) : (<p className="rounded-md border border-[#343844] bg-[#10131a] px-4 py-8 text-center text-sm text-[#9ca3af]">
          이 사원의 스파인 자료가 없습니다.
        </p>)}
    </div>);
}
