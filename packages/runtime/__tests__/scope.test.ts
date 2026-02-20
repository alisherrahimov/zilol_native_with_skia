import { describe, it, expect } from 'vitest';
import { signal } from '../src/reactive/signal';
import { effect } from '../src/reactive/effect';
import { scope } from '../src/reactive/scope';

describe('scope', () => {
    it('should dispose all effects created within scope', () => {
        const count = signal(0);
        const values: number[] = [];

        const dispose = scope(() => {
            effect(() => {
                values.push(count.value);
            });
        });

        expect(values).toEqual([0]);

        count.value = 1;
        expect(values).toEqual([0, 1]);

        dispose();

        count.value = 2;
        expect(values).toEqual([0, 1]); // effect disposed, no more runs
    });

    it('should dispose nested scopes', () => {
        const a = signal(0);
        const b = signal(0);
        const aLog: number[] = [];
        const bLog: number[] = [];

        const dispose = scope(() => {
            effect(() => aLog.push(a.value));

            scope(() => {
                effect(() => bLog.push(b.value));
            });
        });

        expect(aLog).toEqual([0]);
        expect(bLog).toEqual([0]);

        a.value = 1;
        b.value = 1;
        expect(aLog).toEqual([0, 1]);
        expect(bLog).toEqual([0, 1]);

        dispose(); // should dispose both outer and inner effects

        a.value = 2;
        b.value = 2;
        expect(aLog).toEqual([0, 1]);
        expect(bLog).toEqual([0, 1]);
    });

    it('should return value from scope with value overload', () => {
        const result = scope(() => {
            return 42;
        });

        expect(result).toHaveProperty('value', 42);
        expect(result).toHaveProperty('dispose');
    });

    it('should clean up on error during scope execution', () => {
        const s = signal(0);
        const values: number[] = [];

        expect(() => {
            scope(() => {
                effect(() => values.push(s.value));
                throw new Error('scope error');
            });
        }).toThrow('scope error');

        // Despite the error, the effect created before the throw should be cleaned up
        s.value = 1;
        expect(values).toEqual([0]); // effect was disposed
    });

    it('should dispose in reverse order', () => {
        const log: string[] = [];

        const dispose = scope(() => {
            effect(() => {
                return () => log.push('cleanup-1');
            });
            effect(() => {
                return () => log.push('cleanup-2');
            });
            effect(() => {
                return () => log.push('cleanup-3');
            });
        });

        dispose();
        expect(log).toEqual(['cleanup-3', 'cleanup-2', 'cleanup-1']);
    });

    it('should handle double dispose gracefully', () => {
        const dispose = scope(() => {
            const s = signal(0);
            effect(() => void s.value);
        });

        dispose();
        dispose(); // should not throw
    });
});
