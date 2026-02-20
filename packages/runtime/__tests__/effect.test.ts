import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/reactive/signal';
import { computed } from '../src/reactive/computed';
import { effect } from '../src/reactive/effect';

describe('effect', () => {
    it('should run immediately on creation', () => {
        const fn = vi.fn();
        effect(fn);
        expect(fn).toHaveBeenCalledOnce();
    });

    it('should re-run when tracked signal changes', () => {
        const count = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(count.value);
        });

        expect(values).toEqual([0]);

        count.value = 1;
        expect(values).toEqual([0, 1]);

        count.value = 2;
        expect(values).toEqual([0, 1, 2]);
    });

    it('should track computed dependencies', () => {
        const count = signal(0);
        const doubled = computed(() => count.value * 2);
        const values: number[] = [];

        effect(() => {
            values.push(doubled.value);
        });

        expect(values).toEqual([0]);

        count.value = 3;
        expect(values).toEqual([0, 6]);
    });

    it('should stop re-running after dispose', () => {
        const count = signal(0);
        const values: number[] = [];

        const dispose = effect(() => {
            values.push(count.value);
        });

        count.value = 1;
        expect(values).toEqual([0, 1]);

        dispose();

        count.value = 2;
        count.value = 3;
        expect(values).toEqual([0, 1]); // no more runs
    });

    it('should run cleanup before re-execution', () => {
        const count = signal(0);
        const log: string[] = [];

        effect(() => {
            const val = count.value;
            log.push(`run:${val}`);
            return () => {
                log.push(`cleanup:${val}`);
            };
        });

        expect(log).toEqual(['run:0']);

        count.value = 1;
        expect(log).toEqual(['run:0', 'cleanup:0', 'run:1']);

        count.value = 2;
        expect(log).toEqual(['run:0', 'cleanup:0', 'run:1', 'cleanup:1', 'run:2']);
    });

    it('should run cleanup on dispose', () => {
        const log: string[] = [];

        const dispose = effect(() => {
            log.push('run');
            return () => {
                log.push('cleanup');
            };
        });

        expect(log).toEqual(['run']);

        dispose();
        expect(log).toEqual(['run', 'cleanup']);
    });

    it('should re-track dependencies on each execution', () => {
        const toggle = signal(true);
        const a = signal('A');
        const b = signal('B');
        const values: string[] = [];

        effect(() => {
            if (toggle.value) {
                values.push(a.value);
            } else {
                values.push(b.value);
            }
        });

        expect(values).toEqual(['A']);

        a.value = 'A2';
        expect(values).toEqual(['A', 'A2']);

        // Switch to tracking b instead of a
        toggle.value = false;
        expect(values).toEqual(['A', 'A2', 'B']);

        // a should no longer trigger this effect
        a.value = 'A3';
        expect(values).toEqual(['A', 'A2', 'B']); // no change

        // b should trigger
        b.value = 'B2';
        expect(values).toEqual(['A', 'A2', 'B', 'B2']);
    });

    it('should handle nested effects correctly', () => {
        const outer = signal(0);
        const inner = signal(0);
        const outerLog: number[] = [];
        const innerLog: number[] = [];

        effect(() => {
            outerLog.push(outer.value);

            // inner effect should not interfere with outer tracking
            effect(() => {
                innerLog.push(inner.value);
            });
        });

        expect(outerLog).toEqual([0]);
        expect(innerLog).toEqual([0]);

        inner.value = 1;
        expect(outerLog).toEqual([0]); // outer should NOT re-run
        expect(innerLog).toEqual([0, 1]);
    });

    it('should handle multiple signal dependencies', () => {
        const a = signal(1);
        const b = signal(2);
        const sums: number[] = [];

        effect(() => {
            sums.push(a.value + b.value);
        });

        expect(sums).toEqual([3]);

        a.value = 10;
        expect(sums).toEqual([3, 12]);

        b.value = 20;
        expect(sums).toEqual([3, 12, 30]);
    });
});
