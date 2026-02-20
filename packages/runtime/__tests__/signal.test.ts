import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/reactive/signal';
import { effect } from '../src/reactive/effect';

describe('signal', () => {
    it('should return initial value on first read', () => {
        const s = signal(42);
        expect(s.value).toBe(42);
    });

    it('should update value when written', () => {
        const s = signal(0);
        s.value = 10;
        expect(s.value).toBe(10);
    });

    it('should return current value with peek() without tracking', () => {
        const s = signal('hello');
        expect(s.peek()).toBe('hello');
        s.value = 'world';
        expect(s.peek()).toBe('world');
    });

    it('should notify subscribers when value changes', () => {
        const s = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(s.value);
        });

        expect(values).toEqual([0]);

        s.value = 1;
        expect(values).toEqual([0, 1]);

        s.value = 2;
        expect(values).toEqual([0, 1, 2]);
    });

    it('should NOT notify when set to same value (Object.is)', () => {
        const s = signal(5);
        const calls: number[] = [];

        effect(() => {
            calls.push(s.value);
        });

        expect(calls).toEqual([5]);

        s.value = 5; // same value
        expect(calls).toEqual([5]); // no re-run
    });

    it('should use custom equality function', () => {
        const s = signal(
            { x: 1, y: 2 },
            { equals: (a, b) => a.x === b.x && a.y === b.y },
        );
        const calls: Array<{ x: number; y: number }> = [];

        effect(() => {
            calls.push(s.value);
        });

        expect(calls.length).toBe(1);

        s.value = { x: 1, y: 2 }; // equal by custom fn
        expect(calls.length).toBe(1); // no re-run

        s.value = { x: 3, y: 4 }; // different
        expect(calls.length).toBe(2);
    });

    it('should support manual subscribe/unsubscribe', () => {
        const s = signal(0);
        const values: number[] = [];

        const unsub = s.subscribe((v) => values.push(v));

        s.value = 1;
        s.value = 2;
        expect(values).toEqual([1, 2]);

        unsub();
        s.value = 3;
        expect(values).toEqual([1, 2]); // no more notifications
    });

    it('should handle NaN correctly with Object.is', () => {
        const s = signal(NaN);
        const calls: number[] = [];

        effect(() => {
            calls.push(s.value);
        });

        expect(calls.length).toBe(1);

        s.value = NaN; // Object.is(NaN, NaN) is true
        expect(calls.length).toBe(1); // no re-run
    });

    it('should handle rapid sequential writes', () => {
        const s = signal(0);
        const values: number[] = [];

        effect(() => {
            values.push(s.value);
        });

        for (let i = 1; i <= 100; i++) {
            s.value = i;
        }

        expect(values.length).toBe(101); // initial + 100 writes
        expect(values[100]).toBe(100);
    });

    it('should handle undefined and null values', () => {
        const s = signal<string | null | undefined>('hello');

        s.value = null;
        expect(s.value).toBeNull();

        s.value = undefined;
        expect(s.value).toBeUndefined();

        s.value = 'back';
        expect(s.value).toBe('back');
    });
});
