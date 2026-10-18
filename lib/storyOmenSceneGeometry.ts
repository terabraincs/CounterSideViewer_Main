/**
 * Synchronous hit geometry extracted from the client RectTransforms. Visible
 * scene evidence is fetched separately; pointer/ARIA targets therefore keep
 * their exact placement while the WebGL surface remains transparent/loading.
 */
export const STORY_OMEN_POPUP_REFERENCE = { width: 1920, height: 1080 } as const;
export const STORY_OMEN_POPUP_ROOT = "UI_EC_SIDESTORY_OMEN";
export type StoryOmenRootTransform = {
    anchoredPosition: readonly [
        number,
        number
    ];
    localRotation: readonly [
        number,
        number,
        number,
        number
    ];
    localScale: readonly [
        number,
        number,
        number
    ];
    pivot: readonly [
        number,
        number
    ];
};
export type StoryOmenHitTargetDescriptor = {
    path: string;
    rootPath: string;
    /** Untransformed root RectTransform in the 1920x1080, Y-down surface. */
    left: number;
    top: number;
    width: number;
    height: number;
    rootTransform: StoryOmenRootTransform;
    /** StateButton/RaycastArea rectangle before the root transform. */
    targetRectWithinRoot: Readonly<{
        left: number;
        top: number;
        width: number;
        height: number;
    }>;
    pressScale: number;
    trackingSeconds: number;
};
const SLOT_WIDTH = 207.22999572753906;
const SLOT_HEIGHT = 200;
const SLOT_BUTTON_WIDTH = 210;
const SLOT_BUTTON_HEIGHT = 210;
const SLOT_BUTTON_Y = 15;
const SLOT_ROTATION = [0.1736481636762619, 0, 0, 0.9848077893257141] as const;
const SLOT_PIVOT = [0.5, 0.5] as const;
function popupSlot(slotName: string, x: number, y: number, scaleY: number): StoryOmenHitTargetDescriptor {
    const rootPath = `${STORY_OMEN_POPUP_ROOT}/Contents/BTN/${slotName}`;
    return {
        path: `${rootPath}/BTN`,
        rootPath,
        left: STORY_OMEN_POPUP_REFERENCE.width / 2 + x - SLOT_WIDTH / 2,
        top: STORY_OMEN_POPUP_REFERENCE.height / 2 - y - SLOT_HEIGHT / 2,
        width: SLOT_WIDTH,
        height: SLOT_HEIGHT,
        rootTransform: {
            anchoredPosition: [x, y],
            localRotation: SLOT_ROTATION,
            localScale: [1.2000000476837158, scaleY, 1],
            pivot: SLOT_PIVOT,
        },
        targetRectWithinRoot: {
            left: (SLOT_WIDTH - SLOT_BUTTON_WIDTH) / 2,
            top: (SLOT_HEIGHT - SLOT_BUTTON_HEIGHT) / 2 - SLOT_BUTTON_Y,
            width: SLOT_BUTTON_WIDTH,
            height: SLOT_BUTTON_HEIGHT,
        },
        pressScale: 0.8999999761581421,
        trackingSeconds: 0.10000000149011612,
    };
}
export const STORY_OMEN_POPUP_SLOT_HIT_TARGETS = {
    "01_CAMPAMENTO": popupSlot("01_CAMPAMENTO", 704, -128.5999755859375, 1.200000524520874),
    "02_LOTUS": popupSlot("02_LOTUS", -655.5, -32.199974060058594, 1.200000286102295),
    "03_CHAMBER": popupSlot("03_CHAMBER", 475, 172.1000213623047, 1.200000286102295),
    "04_FRONTBAY": popupSlot("04_FRONTBAY", -26.799999237060547, -264.0999755859375, 1.200000286102295),
    "05_CHARADE": popupSlot("05_CHARADE", -445.20001220703125, 224.9000244140625, 1.200000286102295),
    "06_ADC_G1": popupSlot("06_ADC_G1", -84, 152, 1.200000286102295),
} as const satisfies Record<string, StoryOmenHitTargetDescriptor>;
const EPISODE_15_SIZE = 159.86740112304688;
export const STORY_OMEN_EPISODE_15_HIT_TARGET: StoryOmenHitTargetDescriptor = {
    path: `${STORY_OMEN_POPUP_ROOT}/Contents/EP15`,
    rootPath: `${STORY_OMEN_POPUP_ROOT}/Contents/EP15`,
    left: 1094.0662994384766,
    top: 460.06629943847656,
    width: EPISODE_15_SIZE,
    height: EPISODE_15_SIZE,
    rootTransform: {
        anchoredPosition: [214, 0],
        localRotation: [0, 0, 0, 1],
        localScale: [1, 1, 1],
        pivot: [0.5, 0.5],
    },
    targetRectWithinRoot: { left: 0, top: 0, width: EPISODE_15_SIZE, height: EPISODE_15_SIZE },
    pressScale: 0.8999999761581421,
    trackingSeconds: 0.10000000149011612,
};
export const STORY_OMEN_NODE_ROOT = "AB_UI_OPERATION_UI_SUB/SUB_NODE_ScrollRect/Viewport/Content/UI_SUB_LIST/LayoutElement/SLOT_AREA/NodeRoot/전조";
export const STORY_OMEN_NODE_HIT_TARGET = {
    path: STORY_OMEN_NODE_ROOT,
    left: 0,
    top: 0,
    width: 510,
    height: 125,
    pressScale: 0.949999988079071,
    trackingSeconds: 0.10000000149011612,
} as const;
/**
 * Actual GraphicRaycaster union below the node StateButton. The transparent
 * raycast component covers the 510x125 NodeRoot, while THUMB is also an active
 * raycast Image at (0,-10), 554x166 and fully contains that root rectangle.
 * StateButton scale is applied around the NodeRoot pivot, not THUMB's center.
 */
export const STORY_OMEN_NODE_RAYCAST_UNION_WITHIN_ROOT = {
    left: -22,
    top: -10.5,
    width: 554,
    height: 166,
    transformOrigin: { x: 277, y: 73 },
} as const;
/**
 * The node probe's real ScreenSpaceCamera canvas is 1920x1080 with the selected
 * 510x125 node centered. It contains the complete 1713.300049x1024 glitch
 * RectTransform and its scaled tight mesh, so screen-space Grab UVs remain in
 * the same reference frame instead of being renormalized to the button.
 */
export const STORY_OMEN_NODE_CANVAS_WITHIN_BUTTON = {
    left: -705,
    top: -477.5,
    width: 1920,
    height: 1080,
    selectedOrigin: [960, 540] as const,
    glitchSourceRect: { width: 1713.300048828125, height: 1024, localScale: 2 } as const,
} as const;
export const STORY_OMEN_POPUP_INTERACTIVE_TARGETS = [
    ...Object.values(STORY_OMEN_POPUP_SLOT_HIT_TARGETS).map((target) => target.path),
    STORY_OMEN_EPISODE_15_HIT_TARGET.path,
] as const;
