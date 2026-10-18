import { deploymentUrl } from "@/lib/deployment";
import type { StoryOmenContinuousSceneSource } from "./storyOmenNativeRuntime.ts";
import { buildStoryOmenChronicleNodeExactSource } from "./storyOmenNodeScene.ts";
import { buildStoryOmenPopupExactSource } from "./storyOmenPopupScene.ts";
export const STORY_OMEN_POPUP_RUNTIME_URL = "/story/map-ui/omen-native/popup-runtime.json";
export const STORY_OMEN_NODE_RUNTIME_URL = "/story/map-ui/omen-native/node-runtime.json";
type JsonObject = Record<string, unknown>;
function object(value: unknown, label: string): JsonObject {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(`Missing ${label}`);
    return value as JsonObject;
}
function text(value: unknown, label: string): string {
    if (typeof value !== "string" || !value)
        throw new Error(`Missing ${label}`);
    return value;
}
async function fetchRuntime(url: string): Promise<JsonObject> {
    const response = await fetch(deploymentUrl(url), { cache: "force-cache" });
    if (!response.ok)
        throw new Error(`Unable to load exact Omen runtime (${response.status}): ${url}`);
    return object(await response.json(), `Omen runtime ${url}`);
}
function validateCommonRuntime(value: JsonObject, surface: "popup" | "chronicle-node"): void {
    const schema = text(value.schema, `${surface} runtime schema`);
    if (schema !== "counterside-omen-native-surface-runtime-v1")
        throw new Error(`Unsupported ${surface} Omen runtime schema: ${schema}`);
    if (value.schemaVersion !== 1)
        throw new Error(`Unsupported ${surface} Omen runtime schema version`);
    if (value.surface !== surface)
        throw new Error(`Wrong ${surface} Omen runtime surface: ${String(value.surface)}`);
    const provenance = object(value.provenance, `${surface} runtime provenance`);
    text(provenance.digestSha256, `${surface} runtime provenance digest`);
    const policy = object(value.evidencePolicy, `${surface} runtime evidence policy`);
    if (policy.noGuessedRuntimeValues !== true)
        throw new Error(`Unsupported ${surface} Omen guessed-value policy`);
    object(policy.sourceStaticEvidence, `${surface} static evidence reference`);
    if (!Array.isArray(value.assets))
        throw new Error(`Missing ${surface} exact asset inventory`);
}
export function buildStoryOmenPopupSceneSource(value: unknown): StoryOmenContinuousSceneSource {
    const runtime = object(value, "popup Omen runtime");
    validateCommonRuntime(runtime, "popup");
    if (!runtime.popupImages || !runtime.popupParticles || !runtime.popupFxm || !object(runtime.nativeText, "popup native text").popup)
        throw new Error("Incomplete exact Omen popup runtime evidence");
    return buildStoryOmenPopupExactSource(runtime);
}
export function buildStoryOmenChronicleNodeSceneSource(value: unknown): StoryOmenContinuousSceneSource {
    const runtime = object(value, "chronicle-node Omen runtime");
    validateCommonRuntime(runtime, "chronicle-node");
    if (!runtime.nodeImages || !runtime.chronicleNode || !object(runtime.nativeText, "node native text").chronicleNode)
        throw new Error("Incomplete exact Omen chronicle-node runtime evidence");
    return buildStoryOmenChronicleNodeExactSource(runtime);
}
let popupSourcePromise: Promise<StoryOmenContinuousSceneSource> | undefined;
let nodeSourcePromise: Promise<StoryOmenContinuousSceneSource> | undefined;
/** One navigation-lifetime request; no static JSON import and no visual fallback. */
export function loadStoryOmenPopupSceneSource(): Promise<StoryOmenContinuousSceneSource> {
    popupSourcePromise ??= fetchRuntime(STORY_OMEN_POPUP_RUNTIME_URL).then(buildStoryOmenPopupSceneSource);
    return popupSourcePromise;
}
/** The small-node payload is cached independently from the popup payload. */
export function loadStoryOmenChronicleNodeSceneSource(): Promise<StoryOmenContinuousSceneSource> {
    nodeSourcePromise ??= fetchRuntime(STORY_OMEN_NODE_RUNTIME_URL).then(buildStoryOmenChronicleNodeSceneSource);
    return nodeSourcePromise;
}
