"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useRef, useState } from "react";
import Image from "@/components/DeploymentImage";
import SpineNameSelect from "@/components/SpineNameSelect";
import { getSpineAnimationLabel } from "@/lib/spineDisplayNames";
import { mountOriginalCharacterFrame } from "@/lib/originalCharacterFrameMount.mjs";
type Action = {
    id: string;
    category: string;
    index: number;
    animationName: string;
    stateName: string;
    stateAvailable: boolean;
};
type RuntimeState = {
    phase: string;
    catalog: Action[];
    error?: string;
    action?: {
        id: string;
        status: string;
    } | null;
    presentationEnabled?: boolean;
    presentation?: {
        paused: boolean | null;
        pendingPause: boolean | null;
        hudVisible: boolean;
    } | null;
};
type Selection = {
    unitId: number;
    skinId: number;
};
// Development-only integration surface. The original practice presentation still
// needs replacement before this can become the public character viewer.
export default function OriginalCharacterRuntimePreview({ unitId, packageId, onClose }: {
    unitId: number;
    packageId: string;
    onClose: () => void;
}) {
    const host = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const command = useRef<(name: string, payload?: object) => void>(() => { });
    const [state, setState] = useState<RuntimeState>({ phase: "loading", catalog: [] });
    const [selections, setSelections] = useState<Selection[]>([]);
    const [skinId, setSkinId] = useState(0);
    const [selectedAction, setSelectedAction] = useState("");
    const [closing, setClosing] = useState(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        let disposed = false, frame: HTMLIFrameElement | null = null, ready = false, finished = false;
        let mounted: ReturnType<typeof mountOriginalCharacterFrame> | null = null;
        const abort = new AbortController(), token = crypto.randomUUID();
        let serial = 0;
        const root = `/spine/original-runtime/${packageId}/`;
        const send = (name: string, payload: object = {}) => {
            frame?.contentWindow?.postMessage({ source: "original-character-viewer-host", token,
                command: name, payload, requestId: `${token}-${++serial}` }, location.origin);
        };
        const finish = () => {
            finished = true;
            mounted?.remove();
            window.removeEventListener("message", receive);
            if (frameRef.current === frame)
                frameRef.current = null;
            if (!disposed)
                onCloseRef.current();
        };
        function receive(event: MessageEvent) {
            if (event.origin !== location.origin || event.source !== frame?.contentWindow ||
                event.data?.source !== "original-character-viewer" || event.data.token !== token)
                return;
            const { kind, data } = event.data;
            if (kind === "frame-ready") {
                ready = true;
                send(disposed ? "shutdown" : "select", { unitId, skinId: 0 });
            }
            if (kind === "closed") {
                finish();
                return;
            }
            if (disposed)
                return;
            if (kind === "state")
                setState(data);
            if (kind === "failure" || kind === "reply" && !data.accepted)
                setState(prior => ({ ...prior, error: data.message }));
        }
        window.addEventListener("message", receive);
        command.current = send;
        // Avoid creating two multi-gigabyte Unity realms during React Strict Mode's
        // mount/cleanup probe. No runtime is created before this task executes.
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(deploymentUrl(`${root}runtime.json`), { signal: abort.signal });
                if (!response.ok)
                    throw new Error("원본 전투 자료가 준비되지 않았습니다.");
                const manifest = await response.json();
                const prepared: Selection[] = manifest.preparedSelections.filter((row: Selection) => row.unitId === unitId);
                if (!prepared.some(row => row.skinId === 0))
                    throw new Error("이 사원의 원본 전투 자료는 아직 준비되지 않았습니다.");
                if (disposed)
                    return;
                setSelections(prepared);
                setState(prior => ({ ...prior, presentationEnabled: manifest.capabilities?.presentationCommands === true }));
                if (!host.current)
                    return;
                mounted = mountOriginalCharacterFrame(host.current, { src: `${root}frame.html#channel=${token}` });
                frame = mounted.frame;
                frameRef.current = frame;
            }
            catch (error) {
                if (!disposed)
                    setState(prior => ({ ...prior, phase: "failed", error: String(error instanceof Error ? error.message : error) }));
            }
        }, 0);
        return () => {
            disposed = true;
            clearTimeout(timer);
            abort.abort();
            command.current = () => { };
            if (!frame || finished) {
                window.removeEventListener("message", receive);
                return;
            }
            // Keep the isolated runtime alive until the original asynchronous cleanup
            // and Unity.Quit complete, even when the React page is already unmounted.
            mounted?.park();
            if (frameRef.current === frame)
                frameRef.current = null;
            if (ready)
                send("shutdown");
        };
    }, [packageId, unitId]);
    const presentation = state.presentation;
    const pausePending = presentation?.pendingPause !== null && presentation?.pendingPause !== undefined;
    const paused = presentation?.paused === true;
    const presentationReady = !!presentation && presentation.paused !== null && !pausePending;
    const pauseLabel = pausePending ? "전투 상태 변경 중" : paused ? "전투 재생" : "전투 일시정지";
    return (<div className="overflow-hidden rounded-md border border-[#343844] bg-[#10131a]" data-original-character-preview data-runtime-phase={state.phase}>
      <p className="px-4 pt-3 text-xs text-[#9ca3af]">원본 전투 연결 검증 · 연습장 화면과 자동 전투가 포함된 개발용 미리보기입니다.</p>
      <div ref={host} className="aspect-video min-h-64"/>
      <div className="flex flex-wrap items-end gap-3 border-t border-[#343844] p-4">
        {state.presentationEnabled ? <button type="button" aria-label={pauseLabel} title={pauseLabel} data-testid="original-character-pause" aria-pressed={paused} aria-busy={pausePending} disabled={closing || state.phase !== "running" || !!state.error || !presentationReady} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#4b5563] bg-[#171a21] transition hover:border-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40" onClick={() => {
                const value = !paused;
                setState(prior => ({ ...prior, presentation: prior.presentation ? { ...prior.presentation, pendingPause: value } : null }));
                command.current("pause", { value });
            }}>
          <Image src={paused ? "/ui/AB_UI_COLLECTION_ICON_PAUSE.png" : "/ui/AB_UI_COLLECTION_ICON_PLAY.png"} alt="" width={24} height={24} unoptimized draggable={false}/>
        </button> : null}
        <SpineNameSelect label="전투 동작" testId="original-character-action" value={selectedAction} emptyLabel="선택 안 함" disabled={closing || state.phase !== "running" || !!state.error ||
            !!state.presentationEnabled && (!presentationReady || paused)} options={state.catalog.filter(row => row.stateAvailable).map(row => ({ value: row.id,
            label: `${row.category.startsWith("Air") ? "대공 · " : ""}${getSpineAnimationLabel(row.animationName ?? "")}`,
            originalName: row.stateName }))} onChange={value => { setSelectedAction(value); command.current("play", { actionId: value }); }}/>
        <label className="grid gap-1 text-xs text-[#9ca3af]">스킨
          <select aria-label="원본 전투 스킨" value={skinId} disabled={closing || !!state.error} className="h-11 rounded-md border border-[#4b5563] bg-[#171a21] px-3 text-sm text-white" onChange={event => {
            const next = Number(event.target.value);
            setSkinId(next);
            setSelectedAction("");
            setState(prior => ({ ...prior, catalog: [], presentation: null, phase: "loading" }));
            command.current("select", { unitId, skinId: next });
        }}>
            {selections.map(row => <option key={row.skinId} value={row.skinId}>{row.skinId === 0 ? "기본 (default)" : row.skinId}</option>)}
          </select>
        </label>
        <button type="button" className="h-11 rounded-md border border-[#4b5563] px-4 text-sm text-white disabled:opacity-40" disabled={closing} onClick={() => {
            if (!frameRef.current) {
                onClose();
                return;
            }
            setClosing(true);
            command.current("shutdown");
        }}>{closing ? "종료 중…" : "미리보기 닫기"}</button>
        {state.error ? <p role="alert" className="w-full text-sm text-red-300">{state.error}</p> : null}
      </div>
    </div>);
}
