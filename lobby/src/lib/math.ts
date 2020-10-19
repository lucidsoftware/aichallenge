export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface Point {
    x: number;
    y: number;
}

export function clip(a: Box, b: Box): Box {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const w = Math.min(a.x + a.w, b.x + b.w) - x;
    const h = Math.min(a.y + a.h, b.y + b.h) - y;
    return {x, y, w, h};
}

export function inBox(p: {x: number, y: number}, b: Box) {
    return p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h;
}

export function combinedBoundingBox(boxes: Box[]): Box|null {
    if (boxes.length <= 0) {
        return null;
    }
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    boxes.forEach(box => {
        minX = Math.min(minX, box.x);
        maxX = Math.max(maxX, box.x + box.w);
        minY = Math.min(minY, box.y);
        maxY = Math.max(maxY, box.y + box.h);
    });
    return {x: minX, y: minY, w: maxX - minX, h: maxY - minY};
}
