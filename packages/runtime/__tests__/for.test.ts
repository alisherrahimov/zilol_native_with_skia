import { describe, it, expect } from 'vitest';
import { signal } from '../src/reactive/signal';
import { For } from '../src/primitives/for';

interface Todo {
    id: number;
    title: string;
}

describe('For', () => {
    it('should render items from initial data', () => {
        const todos = signal<Todo[]>([
            { id: 1, title: 'Buy milk' },
            { id: 2, title: 'Walk dog' },
        ]);

        const result = For({
            each: () => todos.value,
            key: (t) => t.id,
            children: (todo) => todo().title,
        });

        expect(result.nodes()).toEqual(['Buy milk', 'Walk dog']);
        result.dispose();
    });

    it('should show fallback when array is empty', () => {
        const items = signal<Todo[]>([]);

        const result = For({
            each: () => items.value,
            key: (t) => t.id,
            fallback: () => 'No items',
            children: (item) => item().title,
        });

        expect(result.nodes()).toEqual(['No items']);
        result.dispose();
    });

    it('should add new items', () => {
        const todos = signal<Todo[]>([{ id: 1, title: 'One' }]);

        const result = For({
            each: () => todos.value,
            key: (t) => t.id,
            children: (todo) => todo().title,
        });

        expect(result.nodes()).toEqual(['One']);

        todos.value = [
            { id: 1, title: 'One' },
            { id: 2, title: 'Two' },
        ];

        expect(result.nodes()).toEqual(['One', 'Two']);
        result.dispose();
    });

    it('should remove items', () => {
        const todos = signal<Todo[]>([
            { id: 1, title: 'One' },
            { id: 2, title: 'Two' },
            { id: 3, title: 'Three' },
        ]);

        const result = For({
            each: () => todos.value,
            key: (t) => t.id,
            children: (todo) => todo().title,
        });

        expect(result.nodes().length).toBe(3);

        todos.value = [{ id: 2, title: 'Two' }];
        expect(result.nodes()).toEqual(['Two']);

        result.dispose();
    });

    it('should reorder items without recreating nodes', () => {
        const todos = signal<Todo[]>([
            { id: 1, title: 'A' },
            { id: 2, title: 'B' },
            { id: 3, title: 'C' },
        ]);

        let createCount = 0;
        const result = For({
            each: () => todos.value,
            key: (t) => t.id,
            children: (todo) => {
                createCount++;
                return todo().title;
            },
        });

        expect(createCount).toBe(3);

        // Reverse order — should reuse existing nodes
        todos.value = [
            { id: 3, title: 'C' },
            { id: 2, title: 'B' },
            { id: 1, title: 'A' },
        ];

        // No new items created, just reordered
        expect(createCount).toBe(3);
        result.dispose();
    });

    it('should switch from items to fallback and back', () => {
        const todos = signal<Todo[]>([{ id: 1, title: 'One' }]);

        const result = For({
            each: () => todos.value,
            key: (t) => t.id,
            fallback: () => 'Empty',
            children: (todo) => todo().title,
        });

        expect(result.nodes()).toEqual(['One']);

        todos.value = [];
        expect(result.nodes()).toEqual(['Empty']);

        todos.value = [{ id: 2, title: 'New' }];
        expect(result.nodes()).toEqual(['New']);

        result.dispose();
    });

    it('should handle empty to populated transition', () => {
        const items = signal<Todo[]>([]);

        const result = For({
            each: () => items.value,
            key: (t) => t.id,
            children: (item) => item().title,
        });

        expect(result.nodes()).toEqual([]);

        items.value = [{ id: 1, title: 'First' }];
        expect(result.nodes()).toEqual(['First']);

        result.dispose();
    });
});
