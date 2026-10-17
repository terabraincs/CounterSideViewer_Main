import type { CharacterSpineMotionData } from "./characterSpineEffectMotion";
export type CharacterSpineVisualContract = NonNullable<CharacterSpineMotionData["spineContract"]>;
export interface CharacterSpineSkinContractCatalog {
    readonly schemaVersion: 1;
    readonly skins: Readonly<Record<string, {
        readonly skinStrId: string;
        readonly bundleName: string;
        readonly assetName: string;
        readonly contract: CharacterSpineVisualContract | null;
        readonly missingReason?: string;
    }>>;
}
/** Replace only MotionData.spineContract. The unit's original animation bundle
 * and asset keys still govern gameplay state timing for every costume. */
export function resolveCharacterSpineSkinContract(catalog: CharacterSpineSkinContractCatalog, skinId: number, modelBundle?: string): CharacterSpineVisualContract {
    if (catalog.schemaVersion !== 1)
        throw new Error("Unsupported costume Spine contract schema");
    if (!Number.isSafeInteger(skinId) || skinId <= 0) {
        throw new Error("A costume contract requires a positive original skin ID");
    }
    const record = catalog.skins[String(skinId)];
    if (!record)
        throw new Error(`Missing original costume Spine contract: ${skinId}`);
    if (modelBundle !== undefined && record.bundleName.toLowerCase() !== modelBundle.toLowerCase()) {
        throw new Error(`Costume Spine bundle mismatch: ${skinId}/${modelBundle}`);
    }
    const contract = record.contract;
    if (!contract)
        throw new Error(`Unavailable costume Spine contract: ${skinId}/${record.missingReason ?? "unknown"}`);
    if (!contract.sourcePointer)
        throw new Error(`Missing original costume SkeletonDataAsset pointer: ${skinId}`);
    if (contract.fromAnimation.length !== contract.toAnimation.length ||
        contract.fromAnimation.length !== contract.duration.length) {
        throw new Error(`Invalid original costume animation mix arrays: ${skinId}`);
    }
    const values = [contract.defaultMix, contract.skeletonScale, ...contract.duration,
        ...contract.skeletonObjectScale, ...contract.skeletonObjectPosition,
        ...contract.skeletonObjectRotation, ...contract.prefabScale, ...contract.prefabRotation];
    if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(`Non-finite original costume Spine transform/mix: ${skinId}`);
    }
    return contract;
}
