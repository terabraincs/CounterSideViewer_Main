import { StoryOmenUnityRandom, type StoryOmenUnityRandomState } from "./storyOmenUnityRandom";
/** Unity 2022.3.62f2 FXM random stream, separate from NKMRandom hit placement.
 * InitState/Range(float) share the previously verified native Unity generator.
 * value/Range(int) are checked against CharacterEffectRandomProbe's 1,000 states.
 */
export class CharacterSpineEffectRandom {
    private readonly source: StoryOmenUnityRandom;
    constructor(seedOrState: number | StoryOmenUnityRandomState) {
        if (typeof seedOrState === "number") {
            if (!Number.isInteger(seedOrState) || seedOrState < -2147483648 || seedOrState > 4294967295) {
                throw new RangeError("Native Unity random seed must fit 32 bits");
            }
            this.source = StoryOmenUnityRandom.fromSeed(seedOrState >>> 0);
        }
        else
            this.source = new StoryOmenUnityRandom(seedOrState);
    }
    snapshot(): StoryOmenUnityRandomState { return this.source.snapshot(); }
    value(): number {
        return Math.fround((this.source.nextUInt() & 0x7fffff) * Math.fround(1 / 0x7fffff));
    }
    range(minimum: number, maximum: number): number { return this.source.range(minimum, maximum); }
    rangeInt(minimum: number, maximum: number): number {
        if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < -2147483648 || maximum > 2147483647
            || minimum > maximum) {
            throw new RangeError("Unsupported native Unity integer random bounds");
        }
        // Equal bounds do not advance UnityEngine.Random.state.
        // The uint32 remainder also covers the particle controller's full signed
        // interval (-2147483647,2147483647); 6,000 native range/state samples verify it.
        if (minimum === maximum)
            return minimum;
        return minimum + this.source.nextUInt() % (maximum - minimum);
    }
}
/** The original Mono mscorlib System.Random used by NKM.PerThreadRandom.
 * This stream is deliberately independent from the Unity FXM stream above.
 * Constructor/InternalSample/Sample follow the preserved IL, including int32
 * overflow and the source double-to-float conversion before Range arithmetic.
 */
export class CharacterSpineHitRandom {
    private readonly seedArray = new Int32Array(56);
    private next = 0;
    private nextPrime = 21;
    constructor(seed: number) {
        if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647)
            throw new RangeError("System.Random seed must be Int32");
        const subtraction = seed === -2147483648 ? 2147483647 : Math.abs(seed);
        let previous = (161803398 - subtraction) | 0;
        let current = 1;
        let index = 0;
        this.seedArray[55] = previous;
        for (let i = 1; i < 55; i++) {
            index += 21;
            if (index >= 55)
                index -= 55;
            this.seedArray[index] = current;
            current = (previous - current) | 0;
            if (current < 0)
                current = (current + 2147483647) | 0;
            previous = this.seedArray[index];
        }
        for (let pass = 1; pass < 5; pass++) {
            for (let i = 1; i < 56; i++) {
                let target = i + 30;
                if (target >= 55)
                    target -= 55;
                this.seedArray[i] = (this.seedArray[i] - this.seedArray[1 + target]) | 0;
                if (this.seedArray[i] < 0)
                    this.seedArray[i] = (this.seedArray[i] + 2147483647) | 0;
            }
        }
    }
    sample(): number {
        if (++this.next >= 56)
            this.next = 1;
        if (++this.nextPrime >= 56)
            this.nextPrime = 1;
        let value = (this.seedArray[this.next] - this.seedArray[this.nextPrime]) | 0;
        if (value === 2147483647)
            value--;
        if (value < 0)
            value = (value + 2147483647) | 0;
        this.seedArray[this.next] = value;
        return value * 4.656612875245797e-10;
    }
    range(minimum: number, maximum: number): number {
        const low = Math.fround(minimum), high = Math.fround(maximum);
        if (!Number.isFinite(low) || !Number.isFinite(high) || low > high)
            throw new RangeError("Invalid original NKMRandom range");
        // The original Mono evaluation stack retains precision across sub/mul/add;
        // only NextDouble's explicit conv.r4 and the returned float round here.
        // Calling the actual NKMRandom.Range in the isolated Player verifies this,
        // including non-integer bounds where rounding each arithmetic op differs.
        return Math.fround(Math.fround(this.sample()) * (high - low) + low);
    }
    /** NKMRandom.Range(int,int) -> Mono Random.Next, for non-large intervals.
     * Even equal bounds and a one-element sound list consume Sample(). */
    rangeInt(minimum: number, maximum: number): number {
        if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < -2147483648 || maximum > 2147483647
            || minimum > maximum || maximum - minimum > 2147483647)
            throw new RangeError("Unsupported original System.Random integer interval");
        return minimum + Math.trunc(this.sample() * (maximum - minimum));
    }
}
