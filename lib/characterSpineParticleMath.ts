import { SwordTrainingParticleRandom, swordParticleMinMaxCurve, swordParticleGradient } from './swordTrainingClientParticles';
import { CHARACTER_PARTICLE_RCPPS, CHARACTER_PARTICLE_RSQRTPS } from './characterSpineParticleReciprocalTable';
type MinMaxCurve = Parameters<typeof swordParticleMinMaxCurve>[0];
type Gradient = Parameters<typeof swordParticleGradient>[0];
type Color = ReturnType<typeof swordParticleGradient>;
const f = Math.fround;
const reciprocalBits = new Uint32Array(1);
const reciprocalFloat = new Float32Array(reciprocalBits.buffer);
const renderGradientCache = new WeakMap<Gradient, {
    times: number[];
    colors: Color[];
    inverse: number[];
}>();
/** ColorModule's render path builds a merged Color32 key cache (0x180596620)
 * and interpolates bytes with an 8-bit fraction (0x180596F50). This is distinct
 * from Particle.GetCurrentColor's floating gradient query. */
export function characterParticleRenderGradient(source: Gradient, time: number): Color {
    if (source.m_Mode !== 0)
        throw new Error('Unverified particle render gradient mode');
    let cache = renderGradientCache.get(source);
    if (!cache) {
        const times = [
            ...Array.from({ length: source.m_NumColorKeys }, (_, i) => f(Number(source[`ctime${i}`]) * f(1 / 65535))),
            ...Array.from({ length: source.m_NumAlphaKeys }, (_, i) => f(Number(source[`atime${i}`]) / 65535)),
        ].filter((time, index, all) => all.indexOf(time) === index).sort((a, b) => a - b);
        if (times.length < 16)
            times.push(1);
        else
            times[15] = 1;
        const colors = times.map(time => {
            const color = characterParticleGradient(source, time);
            for (const channel of ['r', 'g', 'b', 'a'] as const)
                color[channel] = Math.trunc(f(f(Math.max(0, Math.min(1, color[channel])) * 255) + .5));
            return color;
        });
        cache = { times, colors, inverse: times.map((time, i) => i ? characterParticleReciprocal(Math.max(f(1e-6), f(time - times[i - 1]))) : 0) };
        renderGradientCache.set(source, cache);
    }
    const { times, colors, inverse } = cache;
    let right = 1;
    while (right < times.length - 1 && time >= times[right])
        right++;
    const fraction = Math.trunc(f(f(Math.max(0, Math.min(1, f(time - times[right - 1]))) * inverse[right]) * 255)) & 255;
    const result = { ...colors[right - 1] };
    for (const channel of ['r', 'g', 'b', 'a'] as const) {
        // PMULLW/PADDW then PSRAW retain signed 16-bit wraparound.
        const product = ((colors[right][channel] - result[channel]) * fraction + 128) << 16 >> 16;
        result[channel] = ((product >> 8) + result[channel]) & 255;
    }
    return result;
}
/** Native AnimationCurve cache/Horner path 0x18058B310 / 0x18058A9D0,
 * called by the general particle curve job at 0x180D4004D. */
export function characterParticleCurve(source: MinMaxCurve['maxCurve'], time: number): number {
    const keys = source.m_Curve;
    if (!keys.length || source.m_PreInfinity !== 2 || source.m_PostInfinity !== 2
        || keys.some(key => key.weightedMode))
        throw new Error('Unverified character particle curve branch');
    time = f(time);
    if (time <= keys[0].time)
        return keys[0].value;
    if (time >= keys[keys.length - 1].time)
        return keys[keys.length - 1].value;
    let index = 1;
    while (keys[index].time <= time)
        index++;
    const a = keys[index - 1], b = keys[index];
    const outSlope = Number(a.outSlope), inSlope = Number(b.inSlope);
    if (outSlope === Infinity || inSlope === Infinity)
        return a.value;
    if (outSlope === -Infinity || inSlope === -Infinity)
        return b.value;
    if (!Number.isFinite(outSlope) || !Number.isFinite(inSlope))
        throw new Error('Invalid native particle curve tangent');
    const duration = f(b.time - a.time), valueDelta = f(b.value - a.value);
    const inverse = f(1 / duration), inverseSquared = f(inverse * inverse);
    const tangentA = f(outSlope * duration), tangentB = f(duration * inSlope);
    let cubic = f(tangentB + tangentA);
    cubic = f(cubic - valueDelta);
    cubic = f(cubic - valueDelta);
    cubic = f(cubic * inverseSquared);
    cubic = f(cubic * inverse);
    let quadratic = f(valueDelta + valueDelta);
    quadratic = f(quadratic + valueDelta);
    quadratic = f(quadratic - tangentA);
    quadratic = f(quadratic - tangentA);
    quadratic = f(quadratic - tangentB);
    quadratic = f(quadratic * inverseSquared);
    const delta = f(time - a.time);
    let value = f(cubic * delta);
    value = f(value + quadratic);
    value = f(value * delta);
    value = f(value + outSlope);
    value = f(value * delta);
    return f(value + a.value);
}
export function characterParticleMinMaxCurve(source: MinMaxCurve, time: number, random = 0): number {
    if (source.minMaxState === 0 || source.minMaxState === 3)
        return swordParticleMinMaxCurve(source, time, random);
    const maximum = f(characterParticleCurve(source.maxCurve, time) * source.scalar);
    if (source.minMaxState === 1)
        return maximum;
    if (source.minMaxState !== 2)
        throw new Error('Unverified character particle MinMaxCurve mode');
    const minimum = f(characterParticleCurve(source.minCurve, time) * source.scalar);
    return f(minimum + f(f(maximum - minimum) * random));
}
/** Original Shape normalization, 0x18113B49E..0x18113B4DE. */
export function characterParticleNormalize(v: {
    x: number;
    y: number;
    z: number;
}): typeof v {
    const squared = f(f(v.x * v.x) + f(f(v.y * v.y) + f(v.z * v.z)));
    if (squared <= 1.0000000031710769e-30)
        return { x: 0, y: 0, z: 1 };
    reciprocalFloat[0] = squared;
    const bits = reciprocalBits[0], exponent = (bits >>> 23) & 255;
    if (exponent === 255)
        throw new Error('Unverified particle direction magnitude');
    const parity = (exponent - 127) & 1;
    reciprocalBits[0] = CHARACTER_PARTICLE_RSQRTPS[(parity << 12) + ((bits & 0x7fffff) >>> 11)];
    const estimate = f(f(reciprocalFloat[0] * 2 ** (-(exponent - 127 - parity) / 2)) * .9999998211860657);
    const factor = f(f(3.000000238418579 - f(f(estimate * squared) * estimate)) * f(.5 * estimate));
    return { x: f(factor * v.x), y: f(factor * v.y), z: f(factor * v.z) };
}
/** Original Circle SIMD polynomial, UnityPlayer 0x18114ABC2..0x18114AD07.
 * Coefficients and reduction constants are read from the original image.
 * CVTPS2DQ uses round-to-nearest-even, including negative quarter turns. */
export function characterParticleCircleDirection(random: number, arcDegrees: number): {
    x: number;
    y: number;
} {
    const turns = f(f(f(random) * f(arcDegrees * 0.01745329238474369)) * 0.15915493667125702);
    const roundEven = (n: number) => {
        const low = Math.floor(n), fraction = n - low;
        return fraction < .5 ? low : fraction > .5 ? low + 1 : low % 2 === 0 ? low : low + 1;
    };
    const evaluate = (phase: number) => {
        const t = f(.25 - Math.abs(f(phase - roundEven(phase))));
        const square = f(t * t), fourth = f(square * square);
        const first = f(f(-41.34165954589844 * square) + 6.283185005187988);
        const second = f(f(f(-76.56861877441406 * square) + 81.60182189941406) * fourth);
        return f(f(f(second + first) + f(f(fourth * fourth) * 39.65703201293945)) * t);
    };
    return { x: evaluate(turns), y: evaluate(f(turns - .25)) };
}
/** Original InitialModule lifespan inverse: RCPPS followed by two Newton
 * refinements, UnityPlayer 0x180D4DE9F..0x180D4DEEF. A plain JS division
 * has different float32 rounding and changes the percent-age trajectory. */
export function characterParticleReciprocal(value: number): number {
    reciprocalFloat[0] = f(value);
    const bits = reciprocalBits[0], exponent = (bits >>> 23) & 255;
    if (!(value > 0) || exponent === 0 || exponent === 255)
        throw new Error('Unverified particle reciprocal range');
    reciprocalBits[0] = CHARACTER_PARTICLE_RCPPS[(bits & 0x7fffff) >>> 11];
    const estimate = f(reciprocalFloat[0] * 2 ** (127 - exponent));
    // First refinement uses the original biased constant at RVA 0x1AD8EA0.
    const first = f(f(2.000000476837158 - f(f(value) * estimate)) * estimate);
    return f(first * f(2 - f(f(value) * first)));
}
/** Native Gradient.Evaluate on the original END prefabs. Fixed selects the
 * next key strictly after the current key's float32 time (including a key
 * away from zero). Colour and alpha have independent key times. */
export function characterParticleGradient(gradient: Gradient, time: number): Color {
    if (gradient.m_Mode !== 0 && gradient.m_Mode !== 1)
        throw new Error('Unverified character particle gradient mode');
    // Original SIMD evaluator scales into serialized UInt16 time coordinates
    // with mulps before subtracting keys (UnityPlayer 0x1805825EA).
    const t = f(f(Math.max(0, Math.min(1, time))) * 65535);
    const sample = (channel: keyof Color, prefix: 'ctime' | 'atime', count: number) => {
        if (!count)
            throw new Error('Original particle gradient requires keys');
        const keyTime = (index: number) => Number(gradient[`${prefix}${index}`]);
        const value = (index: number) => f((gradient[`key${index}`] as Color)[channel]);
        let right = 0;
        while (right < count - 1 && keyTime(right) < t)
            right++;
        if (!right || gradient.m_Mode === 1 || t >= keyTime(count - 1))
            return value(right);
        const fraction = f(f(t - keyTime(right - 1)) / f(keyTime(right) - keyTime(right - 1)));
        return f(value(right - 1) + f(f(value(right) - value(right - 1)) * fraction));
    };
    return { r: sample('r', 'ctime', gradient.m_NumColorKeys), g: sample('g', 'ctime', gradient.m_NumColorKeys),
        b: sample('b', 'ctime', gradient.m_NumColorKeys), a: sample('a', 'atime', gradient.m_NumAlphaKeys) };
}
/** Original UnityPlayer speedModifier job: salt at RVA 0x1AD9440,
 * native seed addition/PRNG at 0x181184480..0x181184512. This is a fresh
 * per-particle stream, separate from the velocity XYZ salt 0xE0FBD834.
 */
export function characterParticleSpeedModifier(curve: MinMaxCurve, age: number, particleSeed: number): number {
    if (!Number.isInteger(particleSeed) || particleSeed < 0 || particleSeed > 0xffffffff)
        throw new RangeError('Original particle seed must fit UInt32');
    const random = new SwordTrainingParticleRandom((particleSeed + 0xba821f34) >>> 0).nextFloat();
    return swordParticleMinMaxCurve(curve, age, random);
}
