export function toggleInArray<T>(
    list: T[],
    item: T,
    equals: (a: T, b: T) => boolean = (a, b) => a === b
): T[] {
    const i = list.findIndex(x => equals(x, item));
    if (i >= 0) {
        return [...list.slice(0, i), ...list.slice(i + 1)];
    }
    return [...list, item];
}
