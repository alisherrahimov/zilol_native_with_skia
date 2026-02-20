import { describe, it, expect } from 'vitest';
import { signal } from '../src/reactive/signal';
import { computed } from '../src/reactive/computed';
import { effect } from '../src/reactive/effect';

describe('computed', () => {
    it('should derive value from signals', () => {
        const count = signal(2);
        const doubled = computed(() => count.value * 2);
        expect(doubled.value).toBe(4);
    });

    it('should update when dependency changes', () => {
        const count = signal(0);
        const doubled = computed(() => count.value * 2);

        expect(doubled.value).toBe(0);
        count.value = 5;
        expect(doubled.value).toBe(10);
    });

    it('should cache value when dependencies have not changed', () => {
        let computeCount = 0;
        const count = signal(1);
        const doubled = computed(() => {
            computeCount++;
            return count.value * 2;
        });

        doubled.value; // first computation
        doubled.value; // cached — should not recompute
        doubled.value; // cached — should not recompute

        expect(computeCount).toBe(1);
    });

    it('should chain computeds (glitch-free)', () => {
        const a = signal(1);
        const b = computed(() => a.value * 2);
        const c = computed(() => b.value + 1);

        expect(c.value).toBe(3); // (1 * 2) + 1

        a.value = 5;
        expect(c.value).toBe(11); // (5 * 2) + 1
    });

    it('should work with multiple signal dependencies', () => {
        const first = signal('John');
        const last = signal('Doe');
        const full = computed(() => `${first.value} ${last.value}`);

        expect(full.value).toBe('John Doe');

        first.value = 'Jane';
        expect(full.value).toBe('Jane Doe');

        last.value = 'Smith';
        expect(full.value).toBe('Jane Smith');
    });

    it('should peek() without tracking', () => {
        const count = signal(0);
        const doubled = computed(() => count.value * 2);

        // peek should not track
        const runs: number[] = [];
        effect(() => {
            runs.push(doubled.peek());
            // reading signal to create a dependency on something
            void count.value;
        });

        expect(runs).toEqual([0]);
        count.value = 3;
        expect(runs).toEqual([0, 6]); // effect re-ran because of count, peek gave new value
    });

    it('should not propagate if value did not change', () => {
        const n = signal(5);
        const clamped = computed(() => Math.min(n.value, 10));
        const runs: number[] = [];

        effect(() => {
            runs.push(clamped.value);
        });

        expect(runs).toEqual([5]);

        n.value = 7;
        expect(runs).toEqual([5, 7]);

        n.value = 15; // clamped to 10
        expect(runs).toEqual([5, 7, 10]);

        n.value = 20; // still clamped to 10 — no change
        expect(runs).toEqual([5, 7, 10]); // should NOT re-run effect
    });

    it('should support manual subscribe', () => {
        const count = signal(0);
        const doubled = computed(() => count.value * 2);
        const values: number[] = [];

        // force initial computation
        doubled.value;

        const unsub = doubled.subscribe((v) => values.push(v));

        count.value = 3;
        // Need to read to trigger lazy recomputation
        doubled.value;
        expect(values).toEqual([6]);

        unsub();
        count.value = 5;
        doubled.value;
        expect(values).toEqual([6]); // unsubscribed
    });
});
