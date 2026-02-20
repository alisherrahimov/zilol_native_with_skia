import { describe, it, expect } from 'vitest';
import { signal } from '../src/reactive/signal';
import { Show } from '../src/primitives/show';

describe('Show', () => {
    it('should render children when condition is truthy', () => {
        const visible = signal(true);
        const result = Show({
            when: () => visible.value,
            children: () => 'visible-content',
        });

        expect(result.current()).toBe('visible-content');
        result.dispose();
    });

    it('should render fallback when condition is falsy', () => {
        const visible = signal(false);
        const result = Show({
            when: () => visible.value,
            fallback: () => 'fallback-content',
            children: () => 'visible-content',
        });

        expect(result.current()).toBe('fallback-content');
        result.dispose();
    });

    it('should render null when falsy and no fallback', () => {
        const visible = signal(false);
        const result = Show({
            when: () => visible.value,
            children: () => 'visible-content',
        });

        expect(result.current()).toBeNull();
        result.dispose();
    });

    it('should switch between children and fallback', () => {
        const visible = signal(false);
        const result = Show({
            when: () => visible.value,
            fallback: () => 'loading',
            children: () => 'content',
        });

        expect(result.current()).toBe('loading');

        visible.value = true;
        expect(result.current()).toBe('content');

        visible.value = false;
        expect(result.current()).toBe('loading');

        result.dispose();
    });

    it('should pass truthy value to children factory', () => {
        const user = signal<{ name: string } | null>(null);
        const result = Show({
            when: () => user.value,
            children: (u) => `Hello ${u.name}`,
        });

        expect(result.current()).toBeNull();

        user.value = { name: 'Alisher' };
        expect(result.current()).toBe('Hello Alisher');

        result.dispose();
    });

    it('should clean up child scope on switch', () => {
        const visible = signal(true);
        let cleanupRan = false;

        const result = Show({
            when: () => visible.value,
            children: () => {
                // This scope gets disposed when visible turns false
                return 'content';
            },
        });

        visible.value = false;
        visible.value = true;
        // Multiple switches should not leak

        result.dispose();
    });
});
