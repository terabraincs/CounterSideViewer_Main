export function matchesSelectedFilter<T>(selectedValues: T[], value: T) {
    return selectedValues.length === 0 || selectedValues.includes(value);
}
export function matchesOptionalSelectedFilter(selectedValues: string[], value?: string) {
    return selectedValues.length === 0 || Boolean(value && selectedValues.includes(value));
}
export function toggleSelectedValue<T>(selectedValues: T[], value: T): T[] {
    return selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value];
}
