// Find the insertion location for "item" in the array.
export function binarySearch(a: number[], item: number, low: number, high: number): number {
    if (high <= low) {
        return (item > a[low]) ? (low + 1) : low;
    }

    const mid = Math.floor((low + high) / 2);

    if (item == a[mid]) {
        return mid + 1;
    }

    if (item > a[mid]) {
        return binarySearch(a, item, mid + 1, high);
    }
    return binarySearch(a, item, low, mid - 1);
}
