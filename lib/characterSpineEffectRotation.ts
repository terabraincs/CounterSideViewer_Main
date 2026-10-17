type Vector3 = [
    number,
    number,
    number
];
type Quaternion = [
    number,
    number,
    number,
    number
];
const f = Math.fround;
/** Quaternion.Euler: original degree conversion and native ZXY branch,
 * UnityPlayer 0x598C40 / 0x59902D. Transform storage normalizes separately.
 */
export function characterEffectEulerQuaternion(degrees: readonly number[]): Quaternion {
    if (degrees.length !== 3 || degrees.some(value => !Number.isFinite(f(value))))
        throw new Error('Invalid original Euler input');
    const half = degrees.map(value => f(f(f(value) * f(Math.PI / 180)) * .5));
    const [sx, sy, sz] = half.map(value => f(Math.sin(value)));
    const [cx, cy, cz] = half.map(value => f(Math.cos(value)));
    const a = f(sx * cy), b = f(cx * sy), c = f(cx * cy), d = f(-f(sx * sy));
    return [f(f(cz * a) + f(sz * b)), f(f(cz * b) - f(sz * a)),
        f(f(cz * d) + f(sz * c)), f(f(cz * c) - f(sz * d))];
}
/** Transform's SIMD quaternion store, 0x4CE96..0x4CECD. */
export function characterEffectStoredQuaternion(input: readonly number[]): Quaternion {
    if (input.length !== 4 || input.some(value => !Number.isFinite(f(value))))
        throw new Error('Invalid original quaternion');
    const q = input.map(f), s = q.map(value => f(value * value));
    const pairs = s.map((value, i) => f(value + s[(i + 1) % 4]));
    return q.map((value, i) => {
        const length = f(pairs[i] + pairs[(i + 2) % 4]);
        return length > f(1e-30) ? f(value / f(Math.sqrt(length))) : (i === 3 ? 1 : 0);
    }) as Quaternion;
}
/** Original Quaternion.eulerAngles: sequential normalization 0x462D0,
 * native ZXY extraction 0x599480, then managed Internal_MakePositive.
 */
export function characterEffectQuaternionEuler(input: readonly number[]): Vector3 {
    if (input.length !== 4 || input.some(value => !Number.isFinite(f(value))))
        throw new Error('Invalid original quaternion');
    const q = input.map(f), square = q.map(value => f(value * value));
    const length = f(Math.sqrt(f(f(f(square[0] + square[1]) + square[2]) + square[3])));
    const [x, y, z, w] = length < f(1e-5) ? [0, 0, 0, 1] : q.map(value => f(value / length));
    const xx = f(x * x), yy = f(y * y), zz = f(z * z), ww = f(w * w);
    const xy = f(x * y), xz = f(x * z), xw = f(x * w), yz = f(y * z), yw = f(y * w), zw = f(z * w);
    const difference = f(yz - xw), sum = f(zw + xy);
    let eulerZ = 0, yNumerator: number, yDenominator: number;
    if (Math.abs(difference) < 0.4999989867210388) {
        eulerZ = f(Math.atan2(f(sum + sum), f(f(f(yy - zz) - xx) + ww)));
        yNumerator = f(f(yw + xz) * 2);
        yDenominator = f(f(f(zz - xx) - yy) + ww);
    }
    else {
        const a = f(yz + xw), b = f(xy - zw), c = f(xw - yz);
        yNumerator = f(f(b * c) + f(a * sum));
        yDenominator = f(f(a * c) - f(b * sum));
    }
    const radians = [f(-f(Math.asin(Math.max(-1, Math.min(1, f(difference + difference)))))), f(Math.atan2(yNumerator, yDenominator)), eulerZ];
    const negative = f(-.005729578), positive = f(360 + negative); // Original IL constant.
    return radians.map(value => {
        const degrees = f(value * f(180 / Math.PI));
        return degrees < negative ? f(degrees + 360) : degrees > positive ? f(degrees - 360) : degrees;
    }) as Vector3;
}
