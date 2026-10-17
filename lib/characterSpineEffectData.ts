import type { NativeObject } from "./characterSpineEffects";
/** Browser payload slice; server-normalized source objects remain structurally compatible. */
export interface CharacterSpineRuntimeEvent {
    readonly nativeFields: NativeObject;
    readonly sourceLayers: readonly {
        readonly fields: NativeObject;
    }[];
}
export interface CharacterSpineRuntimeState {
    readonly nativeFields: NativeObject;
    readonly events: Readonly<Record<string, readonly CharacterSpineRuntimeEvent[]>>;
}
export interface CharacterSpineRuntimeDamageEffect {
    readonly id: string;
    readonly nativeFields: NativeObject;
    readonly statesByName: Readonly<Record<string, CharacterSpineRuntimeState>>;
    readonly deathEvents?: Readonly<Record<string, readonly CharacterSpineRuntimeEvent[]>>;
    /** Keys must survive serialization so unsupported compound source behavior cannot disappear. */
    readonly objectFieldLayers: Readonly<Record<string, readonly unknown[]>>;
}
