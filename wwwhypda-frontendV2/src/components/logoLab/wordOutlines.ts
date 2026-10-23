import snapshot from './wordOutlines.snapshot.json';
interface Outline { name: string; path: string; bounds: number[] }
export const outlineUnits = snapshot.unitsPerEm;
const words: Record<string, Outline> = snapshot.words;
const byName = new Map(Object.values(words).map(word => [word.name, word]));
export function wordOutline(id: number): Outline {
    const word = words[String(id)];
    if (!word) throw new Error('Missing frozen word outline');
    return word;
}
export function outlineMetrics(name: string, size: number) {
    const word = byName.get(name);
    if (!word) throw new Error('Missing frozen word outline');
    const [left, top, right, bottom] = word.bounds;
    const scale = size / outlineUnits;
    return { left: -left * scale, right: right * scale, ascent: -top * scale, descent: bottom * scale };
}