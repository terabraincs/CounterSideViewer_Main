export const STORY_EVENT_CLB002_HAND_MARKER = "STV-MAP-080";
export const STORY_EVENT_CLB002_HAND_ASSET_ROOT = "/story/reader/ui/event-clb-002-hand";
export const STORY_EVENT_CLB002_HAND_INTRO_DURATION = 1;
export const STORY_EVENT_CLB002_HAND_IDLE_DURATION = 7.016666889190674;
export const STORY_EVENT_CLB002_HAND_TRANSITION_START = 0.7368420958518982;
export const STORY_EVENT_CLB002_HAND_TRANSITION_DURATION = 0.25;
export const STORY_EVENT_CLB002_HAND_TRANSITION_END = STORY_EVENT_CLB002_HAND_TRANSITION_START +
    STORY_EVENT_CLB002_HAND_TRANSITION_DURATION;
export const STORY_EVENT_CLB002_HAND_HEIGHT_MATCH_ASPECT = Math.fround(1.777);
type StoryEventClb002Episode = {
    id: number;
    category: string;
    stageViewerPrefab?: string;
};
export function isStoryEventClb002HandEpisode(episode: StoryEventClb002Episode | null | undefined) {
    return (episode?.id === 256 &&
        episode.category === "EC_EVENT" &&
        episode.stageViewerPrefab === "UI_EVENT_CLB_002_R");
}
type ScalarKey = {
    time: number;
    value: number;
    inSlope: number;
    outSlope: number;
    coefficients?: readonly [
        number,
        number,
        number,
        number
    ];
};
const key = (time: number, value: number, inSlope = 0, outSlope = 0): ScalarKey => ({ time, value, inSlope, outSlope });
const holdKey = (time: number, value: number): ScalarKey => key(time, value, Number.POSITIVE_INFINITY, 0);
const polynomialKey = (time: number, value: number, coefficients: readonly [
    number,
    number,
    number,
    number
], inSlope = 0, outSlope = 0): ScalarKey => ({ time, value, inSlope, outSlope, coefficients });
function sampleCurve(keys: readonly ScalarKey[], time: number) {
    if (time <= keys[0].time) {
        return keys[0].value;
    }
    const last = keys[keys.length - 1];
    if (time >= last.time) {
        return last.value;
    }
    for (let index = 0; index < keys.length - 1; index += 1) {
        const start = keys[index];
        const end = keys[index + 1];
        if (time > end.time) {
            continue;
        }
        if (time === end.time) {
            return end.value;
        }
        const duration = end.time - start.time;
        if (start.coefficients) {
            const [a, b, c, d] = start.coefficients;
            const delta = time - start.time;
            return ((a * delta + b) * delta + c) * delta + d;
        }
        // Unity's unweighted AnimationCurve uses a cubic Hermite segment. An
        // infinite incoming/outgoing tangent denotes a constant/stepped segment.
        if (!Number.isFinite(start.outSlope) || !Number.isFinite(end.inSlope)) {
            return start.value;
        }
        const progress = duration > 0 ? (time - start.time) / duration : 1;
        const progressSquared = progress * progress;
        const progressCubed = progressSquared * progress;
        const h00 = 2 * progressCubed - 3 * progressSquared + 1;
        const h10 = progressCubed - 2 * progressSquared + progress;
        const h01 = -2 * progressCubed + 3 * progressSquared;
        const h11 = progressCubed - progressSquared;
        return (h00 * start.value +
            h10 * duration * start.outSlope +
            h01 * end.value +
            h11 * duration * end.inSlope);
    }
    return last.value;
}
const INTRO_CURVES = {
    img3Rotation: [key(0, 1.399999976158142)],
    img5Rotation: [key(0, 0)],
    img4Rotation: [key(0, -1.309000015258789)],
    img2Rotation: [key(0, 7.658999919891357)],
    chessRotation: [key(0, 21.172000885009766)],
    img6Rotation: [key(0, 0)],
    img6X: [key(0, -73.9481201171875)],
    img6Width: [key(0, 402.239013671875)],
    imgWidth: [key(0, 818.0592041015625)],
    imgHeight: [key(0, 556.4564819335938)],
    imgAlpha: [
        polynomialKey(0, 0, [0, 0, 0, 0], Number.POSITIVE_INFINITY, 0),
        polynomialKey(0.0833333358, 0, [-46.6472321, 24.4897957, 0, 0], Number.POSITIVE_INFINITY, 0),
        polynomialKey(0.433333337, 1, [0, 0, 0, 1]),
    ],
    shadowAlpha: [
        polynomialKey(0.533333361, 0, [-19.6793041, 13.7755127, 0, 0], Number.POSITIVE_INFINITY, 0),
        polynomialKey(1, 1, [0, 0, 0, 1], -0.00000102179399, 0),
    ],
    constraintOffsetX: [
        polynomialKey(0, 100, [0, 0, -120, 100], Number.POSITIVE_INFINITY, -120),
        polynomialKey(0.833333313, 0, [0, 0, 0, 0], -120, 0),
    ],
} as const;
const IDLE_CURVES = {
    img3Rotation: [
        holdKey(0, 1.399999976158142),
        holdKey(0.4166666567325592, 1.399999976158142),
        key(0.800000011920929, -4.953000068664551),
        key(1.2666666507720947, 1.399999976158142, -0.000004087176, 0),
        holdKey(2.683333396911621, 1.399999976158142),
        key(3.0833332538604736, 9.159000396728516, -0.0000047683734, 0),
        key(3.5, 1.399999976158142, 0.000004577636, 0),
        holdKey(4.349999904632568, 1.399999976158142),
        holdKey(4.449999809265137, 1.399999976158142),
        holdKey(7.016666889190674, 1.399999976158142),
    ],
    img5Rotation: [
        holdKey(0, 0),
        holdKey(0.4166666567325592, 0),
        key(0.800000011920929, 24.735000610351562),
        key(1.2666666507720947, 0, 0.000016348704, 0),
        holdKey(2.683333396911621, 0),
        key(3.0333333015441895, 11.383000373840332, 41.089794, 41.08979),
        key(3.4666666984558105, 32.1870002746582, -0.0000044015733, 0),
        key(4.199999809265137, 0, -0.000010403723, 0),
        holdKey(4.449999809265137, 0),
        holdKey(4.816666603088379, 0),
        key(5.2166666984558105, 14.74899959564209, -0.000009536741, 0),
        key(7.016666889190674, 0, 0.0000021192761, 0),
    ],
    img4Rotation: [
        holdKey(0, -1.309000015258789),
        holdKey(0.4166666567325592, -1.309000015258789),
        key(0.800000011920929, -10.720999717712402, 0.000004975692, 0),
        key(1.2666666507720947, -1.309000015258789, -0.000004087176, 0),
        holdKey(2.683333396911621, -1.309000015258789),
        key(3.316666603088379, 5.502999782562256, 6.2680025, 6.2679996),
        key(3.683333396911621, 7.070000171661377),
        key(4.050000190734863, -1.309000015258789),
        holdKey(4.5, -1.309000015258789),
        key(5.0333333015441895, 6.635000228881836),
        key(5.483333110809326, -1.309000015258789, 0.0000042385545, 0),
        holdKey(7.016666889190674, -1.309000015258789),
    ],
    img2Rotation: [
        holdKey(0, 7.658999919891357),
        holdKey(0.4166666567325592, 7.658999919891357),
        holdKey(0.800000011920929, 7.658999919891357),
        holdKey(1.2666666507720947, 7.658999919891357),
        holdKey(2.683333396911621, 7.658999919891357),
        holdKey(3.066666603088379, 7.658999919891357),
        key(3.5999999046325684, 18.430999755859375, -0.000007152558, 0),
        key(4.266666889190674, 7.658999919891357),
        holdKey(4.599999904632568, 7.658999919891357),
        holdKey(7.016666889190674, 7.658999919891357),
    ],
    chessRotation: [
        holdKey(0, 21.172000885009766),
        holdKey(2.683333396911621, 21.172000885009766),
        key(3.25, 10.793000221252441, 0.0000067318197, 0),
        key(3.683333396911621, 18.051000595092773, 15.568499, 15.5685),
        key(3.9166667461395264, 21.172000885009766, -0.0000010217939, 0),
        holdKey(4.449999809265137, 21.172000885009766),
        holdKey(7.016666889190674, 21.172000885009766),
    ],
    img6Rotation: [
        holdKey(0, 0),
        holdKey(1.3333333730697632, 0),
        key(2.316666603088379, -2.5850000381469727, 0.0000014547576, 0),
        key(2.8333332538604736, 0, -0.00000092291066, 0),
        holdKey(4.400000095367432, 0),
        key(4.916666507720947, -2.5850000381469727, -0.00000092291106, 0),
        key(5.433333396911621, 0),
    ],
    img6X: [
        polynomialKey(0, -73.9481201, [-3.60351229, 6.30614662, 0, -73.9481201], Number.POSITIVE_INFINITY, 0),
        polynomialKey(1.16666663, -71.086998, [847.328674, -176.539932, 0, -71.086998]),
        polynomialKey(1.29999995, -72.2170029, [0.322095692, 0.0135021666, -1.88645399, -72.2170029], -1.88645315, -1.88645399),
        polynomialKey(2.6833334, -73.9481201, [-8.43402863, 9.4882822, 0, -73.9481201]),
        polynomialKey(3.4333334, -72.1690674, [31.512188, -22.8463364, 0, -72.1690674], -0.000000635782897, 0),
        polynomialKey(3.91666675, -73.9481201, [0, 0, 0, -73.9481201]),
        polynomialKey(4.44999981, -73.9481201, [0, 0, 0, -73.9481201], Number.POSITIVE_INFINITY, 0),
        polynomialKey(7.01666689, -73.9481201, [0, 0, 0, -73.9481201], Number.POSITIVE_INFINITY, 0),
    ],
    img6Width: [
        polynomialKey(0, 402.239014, [642.286316, -337.200287, 0, 402.239014], Number.POSITIVE_INFINITY, 0),
        polynomialKey(0.349999994, 388.470001, [-302.2005, 203.985352, 0, 388.470001]),
        polynomialKey(0.800000012, 402.239014, [0, 0, 0, 402.239014]),
        polynomialKey(2.6833334, 402.239014, [64.9908905, -73.1147537, 0, 402.239014], Number.POSITIVE_INFINITY, 0),
        polynomialKey(3.4333334, 388.529999, [-242.826447, 176.049179, 0, 388.529999], 0.00000508626317, 0),
        polynomialKey(3.91666675, 402.239014, [0, 0, 0, 402.239014]),
        polynomialKey(4.44999981, 402.239014, [0, 0, 0, 402.239014], Number.POSITIVE_INFINITY, 0),
        polynomialKey(7.01666689, 402.239014, [0, 0, 0, 402.239014], Number.POSITIVE_INFINITY, 0),
    ],
    imgWidth: [
        polynomialKey(0, 818.059204, [0, 0, 0, 818.059204], Number.POSITIVE_INFINITY, 0),
        polynomialKey(0.233333334, 818.059204, [481.623932, -168.568375, 0, 818.059204], Number.POSITIVE_INFINITY, 0),
        polynomialKey(0.466666669, 815, [-36.7748146, 30.33922, 0, 815], -0.00000408717551, 0),
        polynomialKey(1.01666665, 818.059204, [0, 0, 0, 818.059204]),
        polynomialKey(1.45000005, 818.059204, [0, 0, 0, 818.059204], Number.POSITIVE_INFINITY, 0),
        polynomialKey(2.6833334, 818.059204, [0, 0, 0, 818.059204], Number.POSITIVE_INFINITY, 0),
        polynomialKey(3.20000005, 818.059204, [60.2029915, -42.1420937, 0, 818.059204], Number.POSITIVE_INFINITY, 0),
        polynomialKey(3.66666675, 815, [-16.6221504, 17.8688068, 0, 815], 0.00000204358776, 0),
        polynomialKey(4.38333321, 818.059204, [0, 0, 0, 818.059204]),
    ],
    imgHeight: [key(0, 556.4564819335938)],
    imgAlpha: [key(0, 1)],
    shadowAlpha: [key(0, 1)],
    constraintOffsetX: [key(0, 0)],
} as const;
export type StoryEventClb002HandFrame = {
    state: "INTRO" | "TRANSITION" | "IDLE";
    stateTime: number;
    cycle: number;
    img3Rotation: number;
    img5Rotation: number;
    img4Rotation: number;
    img2Rotation: number;
    chessRotation: number;
    img6Rotation: number;
    img6X: number;
    img6Width: number;
    imgWidth: number;
    imgHeight: number;
    imgAlpha: number;
    shadowAlpha: number;
    constraintOffsetX: number;
};
function sampleClip(curves: typeof INTRO_CURVES | typeof IDLE_CURVES, time: number) {
    return {
        img3Rotation: sampleCurve(curves.img3Rotation, time),
        img5Rotation: sampleCurve(curves.img5Rotation, time),
        img4Rotation: sampleCurve(curves.img4Rotation, time),
        img2Rotation: sampleCurve(curves.img2Rotation, time),
        chessRotation: sampleCurve(curves.chessRotation, time),
        img6Rotation: sampleCurve(curves.img6Rotation, time),
        img6X: sampleCurve(curves.img6X, time),
        img6Width: sampleCurve(curves.img6Width, time),
        imgWidth: sampleCurve(curves.imgWidth, time),
        imgHeight: sampleCurve(curves.imgHeight, time),
        imgAlpha: sampleCurve(curves.imgAlpha, time),
        shadowAlpha: sampleCurve(curves.shadowAlpha, time),
        constraintOffsetX: sampleCurve(curves.constraintOffsetX, time),
    };
}
function mixAngle(from: number, to: number, progress: number) {
    const delta = ((to - from + 540) % 360) - 180;
    return from + delta * progress;
}
export function getStoryEventClb002HandFrame(elapsedSeconds: number): StoryEventClb002HandFrame {
    const elapsed = Math.max(0, elapsedSeconds);
    if (elapsed < STORY_EVENT_CLB002_HAND_TRANSITION_START) {
        return {
            state: "INTRO",
            stateTime: elapsed,
            cycle: 0,
            ...sampleClip(INTRO_CURVES, elapsed),
        };
    }
    const idleElapsed = elapsed - STORY_EVENT_CLB002_HAND_TRANSITION_START;
    if (elapsed < STORY_EVENT_CLB002_HAND_TRANSITION_END) {
        const progress = idleElapsed / STORY_EVENT_CLB002_HAND_TRANSITION_DURATION;
        const intro = sampleClip(INTRO_CURVES, elapsed);
        const idle = sampleClip(IDLE_CURVES, idleElapsed);
        const mixed = Object.fromEntries(Object.keys(intro).map((property) => {
            const name = property as keyof typeof intro;
            const value = name.endsWith("Rotation")
                ? mixAngle(intro[name], idle[name], progress)
                : intro[name] + (idle[name] - intro[name]) * progress;
            return [name, value];
        })) as Omit<StoryEventClb002HandFrame, "state" | "stateTime" | "cycle">;
        return {
            state: "TRANSITION",
            stateTime: idleElapsed,
            cycle: 0,
            ...mixed,
        };
    }
    const cycle = Math.floor(idleElapsed / STORY_EVENT_CLB002_HAND_IDLE_DURATION);
    const stateTime = idleElapsed % STORY_EVENT_CLB002_HAND_IDLE_DURATION;
    return {
        state: "IDLE",
        stateTime,
        cycle,
        ...sampleClip(IDLE_CURVES, stateTime),
    };
}
export const STORY_EVENT_CLB002_HAND_RECTS = {
    shadow: {
        width: 1215.25537109375,
        height: 169.6439971923828,
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: -16.3178792185,
    },
    img: {
        width: 820.57177734375,
        height: 565.826416015625,
        pivotX: 1,
        pivotY: 0.526642918586731,
    },
    img2: {
        anchorX: 0.5,
        anchorY: 0.5,
        x: -407.20367431640625,
        y: 16.47052001953125,
        width: 118.73139953613281,
        height: 98.94300079345703,
        pivotX: 0.5328215956687927,
        pivotY: 0.8809539079666138,
    },
    img3: {
        anchorX: 0.5,
        anchorY: 0.5,
        x: -220.55126953125,
        y: 163.8129425048828,
        width: 238.70840454101562,
        height: 136.59429931640625,
        pivotX: 0.7598876357078552,
        pivotY: 0.8755176067352295,
    },
    img4: {
        anchorX: 0.5,
        anchorY: 0.5,
        x: -103.16131591796875,
        y: 42.81169128417969,
        width: 104.71089935302734,
        height: 108.63760375976562,
        pivotX: 0.8702527284622192,
        pivotY: 0.8113918304443359,
    },
    img5: {
        anchorX: 0.5,
        anchorY: 0.5,
        x: -50.9155158996582,
        y: -9.933177947998047,
        width: 110.53959655761719,
        height: 101.54060363769531,
        pivotX: 0.6257330775260925,
        pivotY: 0.9021722674369812,
    },
    chess: {
        anchorX: 0,
        anchorY: 1,
        x: 53.97060012817383,
        y: -309.9458923339844,
        width: 170.0260009765625,
        height: 377.8357849121094,
        pivotX: 0.5381993651390076,
        pivotY: 0.13422265648841858,
    },
    img6: {
        anchorX: 0.5,
        anchorY: 0.5,
        x: -73.5,
        y: 15.371999740600586,
        width: 398.7856140136719,
        height: 156.38999938964844,
        pivotX: 0.8702527284622192,
        pivotY: 0.8113918304443359,
    },
} as const;
export function getStoryEventClb002HandScreenLayout(viewportWidth: number, viewportHeight: number, frame: Pick<StoryEventClb002HandFrame, "constraintOffsetX" | "imgWidth" | "imgHeight">) {
    const constrain = (dimension: number, relative: number, offset: number) => Math.fround(Math.fround(Math.fround(dimension) * Math.fround(relative)) +
        Math.fround(offset));
    const scale = viewportWidth / viewportHeight >=
        STORY_EVENT_CLB002_HAND_HEIGHT_MATCH_ASPECT
        ? viewportHeight / 1080
        : viewportWidth / 1920;
    return {
        scale,
        imgPivotX: constrain(viewportWidth, 1, frame.constraintOffsetX),
        imgPivotY: viewportHeight -
            constrain(viewportHeight, Math.fround(0.2), -17.3799991607666),
        imgWidth: frame.imgWidth * scale,
        imgHeight: frame.imgHeight * scale,
        shadowPivotX: constrain(viewportWidth, 1, -125.0999984741211),
        shadowPivotY: viewportHeight -
            constrain(viewportHeight, Math.fround(0.2), -221.60000610351562),
        shadowWidth: STORY_EVENT_CLB002_HAND_RECTS.shadow.width * scale,
        shadowHeight: STORY_EVENT_CLB002_HAND_RECTS.shadow.height * scale,
    };
}
