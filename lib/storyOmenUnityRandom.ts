export type StoryOmenUnityRandomState = readonly [
    number,
    number,
    number,
    number
];
const UINT32_MAX = 4294967295;
const RANGE_MANTISSA = 8388607;
const f32 = Math.fround;
export function storyOmenUnityRandomFloatRangeFromUInt(value: number, minimum: number, maximum: number): number {
    const bits = uint32(value, "Range source") & RANGE_MANTISSA;
    const amountFromMaximum = f32(bits * f32(1 / RANGE_MANTISSA));
    // Native Range is min*u + max*(1-u), with a float32 rounding point after
    // each multiply. Rewriting this as min+(max-min)*t is not bit equivalent.
    return f32(f32(f32(minimum) * amountFromMaximum) +
        f32(f32(maximum) * f32(1 - amountFromMaximum)));
}
/** Unity 2022.3.62f2 InitState words shared by probe 018 and UiParticles. */
export function storyOmenUnityRandomStateFromSeed(seed: number): StoryOmenUnityRandomState {
    const x = uint32(seed, "seed");
    const y = (Math.imul(1812433253, x) + 1) >>> 0;
    const z = (Math.imul(1812433253, y) + 1) >>> 0;
    const w = (Math.imul(1812433253, z) + 1) >>> 0;
    return [x, y, z, w];
}
function uint32(value: number, label: string): number {
    if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX)
        throw new RangeError(`Invalid UnityEngine.Random ${label}`);
    return value >>> 0;
}
/**
 * Unity 2022.3.62f2 UnityEngine.Random state path captured by Omen probe 018.
 * This is intentionally separate from ParticleSystem's similarly shaped RNG:
 * Random.Range(float,float) uses the complementary low-23-bit interpolation.
 */
export class StoryOmenUnityRandom {
    private state: [
        number,
        number,
        number,
        number
    ];
    constructor(state: StoryOmenUnityRandomState) {
        if (state.length !== 4)
            throw new RangeError("Invalid UnityEngine.Random state length");
        this.state = state.map((value, index) => uint32(value, `s${index}`)) as [
            number,
            number,
            number,
            number
        ];
    }
    static fromSeed(seed: number): StoryOmenUnityRandom {
        return new StoryOmenUnityRandom(storyOmenUnityRandomStateFromSeed(seed));
    }
    snapshot(): StoryOmenUnityRandomState { return [...this.state]; }
    nextUInt(): number {
        const [s0, s1, s2, s3] = this.state;
        const t = (s0 ^ (s0 << 11)) >>> 0;
        const next = (s3 ^ (s3 >>> 19) ^ t ^ (t >>> 8)) >>> 0;
        this.state = [s1, s2, s3, next];
        return next;
    }
    range(minimum: number, maximum: number): number {
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
            throw new RangeError("UnityEngine.Random.Range bounds must be finite");
        return storyOmenUnityRandomFloatRangeFromUInt(this.nextUInt(), minimum, maximum);
    }
}
