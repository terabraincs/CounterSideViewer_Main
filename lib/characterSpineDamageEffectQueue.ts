/** NKMDamageEffectManager.Update / UseDamageEffect and the client's Dictionary
 * entry order. Removed slots are reused last-in-first-out; queued effects enter
 * only after the entire update/removal pass, even when queued before Update. */
export class CharacterSpineDamageEffectQueue<T> implements Iterable<T> {
    private readonly slots: (T | undefined)[] = [];
    private readonly free: number[] = [];
    private readonly pending: T[] = [];
    private readonly live = new Set<T>();
    add(value: T, nextFrame = false): void {
        if (nextFrame) {
            this.pending.push(value);
            return;
        }
        const index = this.free.pop();
        if (index === undefined)
            this.slots.push(value);
        else
            this.slots[index] = value;
        this.live.add(value);
    }
    has(value: T): boolean { return this.live.has(value); }
    *[Symbol.iterator](): Iterator<T> {
        for (const value of this.slots)
            if (value !== undefined)
                yield value;
    }
    update(visit: (value: T) => void, isEnded: (value: T) => boolean, canUpdate: (value: T) => boolean = () => true): void {
        const removed: number[] = [];
        for (let index = 0; index < this.slots.length; index++) {
            const value = this.slots[index];
            if (value === undefined || !canUpdate(value))
                continue;
            visit(value);
            if (isEnded(value))
                removed.push(index);
        }
        for (const index of removed) {
            this.live.delete(this.slots[index]!);
            this.slots[index] = undefined;
            this.free.push(index);
        }
        for (const value of this.pending)
            this.add(value);
        this.pending.length = 0;
    }
    clear(): void { this.slots.length = this.free.length = this.pending.length = 0; this.live.clear(); }
}
