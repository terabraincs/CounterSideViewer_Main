export function clampInteger(value: number, minimum: number, maximum: number) {
    return Math.min(Math.max(Math.round(value), minimum), maximum);
}
export function parseIntegerInput(value: string, minimum: number, maximum: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clampInteger(parsed, minimum, maximum) : null;
}
export function getSliderMarkerPosition(value: number, minimum: number, maximum: number) {
    const ratio = (value - minimum) / (maximum - minimum);
    const pixelOffset = 10 - ratio * 20;
    return `calc(${ratio * 100}% ${pixelOffset >= 0 ? "+" : "-"} ${Math.abs(pixelOffset)}px)`;
}
