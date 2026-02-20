import { describe, it, expect } from 'vitest';
import { signal } from '../src/reactive/signal';
import { computed } from '../src/reactive/computed';
import { effect } from '../src/reactive/effect';
import { batch } from '../src/reactive/batch';

describe('batch', () => {
    it('should defer effect execution until batch completes', () => {
        const a = signal(1);
        const b = signal(2);
        const sums: number[] = [];

        effect(() => {
            sums.push(a.value + b.value);
        });

        expect(sums).toEqual([3]);

        batch(() => {
            a.value = 10;
            b.value = 20;
        });

        // Should run once with final values, not intermediate
        expect(sums).toEqual([3, 30]);
    });

    it('should not run effect for intermediate states', () => {
        const first = signal('John');
        const last = signal('Doe');
        const full = computed(() => `${first.value} ${last.value}`);
        const values: string[] = [];

        effect(() => {
            values.push(full.value);
        });

        expect(values).toEqual(['John Doe']);

        batch(() => {
            first.value = 'Jane';
            last.value = 'Smith';
        });

        // Should NOT have 'Jane Doe' intermediate state
        expect(values).toEqual(['John Doe', 'Jane Smith']);
    });

    it('should handle nested batches', () => {
        const s = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(s.value);
        });

        batch(() => {
            s.value = 1;
            batch(() => {
                s.value = 2;
            });
            // inner batch ends but outer batch still active — no flush yet
            s.value = 3;
        });

        // Only final value should trigger effect
        expect(values).toEqual([0, 3]);
    });

    it('should handle batch with no signal writes', () => {
        const s = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(s.value);
        });

        batch(() => {
            // no writes
        });

        expect(values).toEqual([0]); // only initial run
    });

    it('should handle errors in batch and still flush', () => {
        const s = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(s.value);
        });

        expect(() => {
            batch(() => {
                s.value = 1;
                throw new Error('oops');
            });
        }).toThrow('oops');

        // Despite the error, the batch should have ended and flushed
        expect(values).toEqual([0, 1]);
    });

    it('should deduplicate subscriber notifications', () => {
        const a = signal(1);
        const b = signal(2);
        let runCount = 0;

        effect(() => {
            void a.value;
            void b.value;
            runCount++;
        });

        expect(runCount).toBe(1);

        batch(() => {
            a.value = 10;
            b.value = 20;
        });

        // Effect depends on both a and b, but should only run ONCE
        expect(runCount).toBe(2);
    });
});
