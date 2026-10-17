/** NKMTrackingFloat from the preserved client DLL; not a CSS easing approximation. */
const f = Math.fround;
export const nativeTrackingTypes: Readonly<Record<string, number>> = {
    TDT_INVALID: 0, TDT_NORMAL: 1, TDT_FASTER: 2, TDT_SLOWER: 3, TDT_SIN: 4,
    TDT_SIN_PLUS: 5, TDT_SIN_PLUS_FAST: 6, TDT_SIN_PLUS_FAST2: 7,
    TDT_SIN_PLUS_FAST4: 8, TDT_BACK_OUT: 9, TDT_BOUNCE_OUT: 10,
};
export function nativeTrackingType(value: unknown): number {
    const type = typeof value === "string" ? nativeTrackingTypes[value] : value;
    if (typeof type !== "number" || !Number.isInteger(type) || type < 0 || type > 10)
        throw new Error(`Unknown source tracking type ${String(value)}`);
    return type;
}
export function nativeTrackRatio(type: number, elapsed: number, duration: number, intensity = 3): number {
    let t = f(elapsed / duration);
    if (type === 2)
        return f(Math.pow(t, intensity));
    if (type === 3)
        return f(1 - f(Math.pow(1 - t, 3)));
    if (type >= 4 && type <= 8) {
        const degrees = f(elapsed * (type === 4 ? 50 : type <= 6 ? 100 : type === 7 ? 200 : 400));
        const sine = f(Math.sin(f(degrees * f(0.017453292))));
        return type === 4 ? sine : type === 5 ? f(Math.abs(sine) * .5) : Math.abs(sine);
    }
    if (type === 9) {
        // The client's Mono JIT keeps the duplicated IL stack value in float64,
        // but narrows the assigned local to float32. Verified in original JIT code.
        const stackValue = t - 1;
        t = f(stackValue);
        return f(stackValue * t * (f(2.70158) * t + f(1.70158)) + 1);
    }
    if (type === 10) {
        if (t < 0.36363636363636365)
            return f(7.5625 * t * t);
        let offset: number, add: number;
        if (t < 0.7272727272727273) {
            offset = f(0.54545456);
            add = .75;
        }
        else if (t < 0.9090909090909091) {
            offset = f(0.8181818);
            add = .9375;
        }
        else {
            offset = f(0.95454544);
            add = .984375;
        }
        const stackValue = t - offset;
        t = f(stackValue);
        return f(7.5625 * stackValue * t + add);
    }
    return t;
}
export class CharacterSpineTrackingFloat {
    private now = 0;
    private before = 0;
    private start = 0;
    private target = 0;
    private time = 0;
    private elapsed = 0;
    private lastFrame = false;
    private type = 1;
    private intensity = 3;
    get nowValue(): number { return this.now; }
    get beforeValue(): number { return this.before; }
    get targetValue(): number { return this.target; }
    get delta(): number { return f(this.now - this.before); }
    get tracking(): boolean { return this.elapsed < this.time || this.lastFrame; }
    get snapshot() { return { now: this.now, before: this.before, target: this.target, time: this.time, elapsed: this.elapsed, type: this.type, tracking: this.tracking, delta: this.delta }; }
    setNowValue(value: number): void { this.now = this.target = f(value); this.elapsed = this.time; }
    setIntensity(value: number): void { this.intensity = f(value); }
    setTracking(target: number, time: number, type: number): void {
        this.start = this.now;
        this.target = f(target);
        this.time = f(time);
        this.elapsed = 0;
        this.type = nativeTrackingType(type);
    }
    stopTracking(): void { this.elapsed = this.time; }
    update(delta: number): void {
        if (this.elapsed < this.time) {
            this.elapsed = f(this.elapsed + f(delta));
            const ratio = nativeTrackRatio(this.type, this.elapsed, this.time, this.intensity);
            this.before = this.now;
            // Original Mono uses subsd/mulsd/addsd and narrows only at stfld.
            this.now = f(this.start + (this.target - this.start) * ratio);
            if (this.elapsed >= this.time) {
                this.elapsed = this.time;
                this.now = this.before = this.target;
                this.lastFrame = true;
            }
        }
        else
            this.lastFrame = false;
    }
}
