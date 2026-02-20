/**
 * Dependency graph internals for the reactive system.
 *
 * Manages the global tracking context and subscriber notification.
 * This module is the foundation that signal, computed, and effect build upon.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A reactive node that can be tracked as a dependency. */
export interface ReactiveNode {
    /** Unique id for debugging / HMR. */
    readonly id: number;
    /** Nodes that depend on this node. */
    readonly subscribers: Set<Subscriber>;
}

/** A subscriber that reacts when its dependencies change. */
export interface Subscriber {
    /** Called when a dependency has changed. */
    notify(): void;
    /** Remove all dependency edges FROM this subscriber. */
    clearDependencies(): void;
    /** All nodes this subscriber currently depends on. */
    readonly dependencies: Set<ReactiveNode>;
}

/** Disposer function returned by effect / scope. */
export type Disposer = () => void;

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

let _nextId = 0;

/** Generate a monotonically increasing id for reactive nodes. */
export function nextReactiveId(): number {
    return _nextId++;
}

/**
 * The subscriber currently being tracked.
 * When a signal/computed is read while this is set, the read node is
 * added to the current subscriber's dependency set.
 */
let _currentSubscriber: Subscriber | null = null;

/** Get the subscriber currently being tracked (if any). */
export function getCurrentSubscriber(): Subscriber | null {
    return _currentSubscriber;
}

/**
 * Set the current tracking subscriber. Returns the previous one so it can
 * be restored (supports nesting — computed inside effect, etc.).
 */
export function setCurrentSubscriber(sub: Subscriber | null): Subscriber | null {
    const prev = _currentSubscriber;
    _currentSubscriber = sub;
    return prev;
}

// ---------------------------------------------------------------------------
// Batching
// ---------------------------------------------------------------------------

let _batchDepth = 0;
let _pendingNotifications: Subscriber[] = [];

/** Whether we are currently inside a batch(). */
export function isBatching(): boolean {
    return _batchDepth > 0;
}

/** Increment batch depth. */
export function startBatch(): void {
    _batchDepth++;
}

/** Decrement batch depth; flush pending notifications when depth reaches 0. */
export function endBatch(): void {
    _batchDepth--;
    if (_batchDepth === 0) {
        flushBatch();
    }
}

/**
 * Queue a subscriber for notification. If not batching, notifies immediately.
 * If batching, defers until the batch ends.
 */
export function queueNotification(subscriber: Subscriber): void {
    if (_batchDepth > 0) {
        _pendingNotifications.push(subscriber);
    } else {
        subscriber.notify();
    }
}

/**
 * Flush all pending subscriber notifications accumulated during a batch.
 * Uses a Set to deduplicate subscribers that were queued multiple times.
 */
function flushBatch(): void {
    // Snapshot and clear — effects triggered during flush can batch again
    while (_pendingNotifications.length > 0) {
        const pending = _pendingNotifications;
        _pendingNotifications = [];

        // Deduplicate: a subscriber may have been queued multiple times
        const seen = new Set<Subscriber>();
        for (let i = 0; i < pending.length; i++) {
            const sub = pending[i];
            if (!seen.has(sub)) {
                seen.add(sub);
                sub.notify();
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Dependency tracking helpers
// ---------------------------------------------------------------------------

/**
 * Track a read: add `node` as a dependency of the current subscriber,
 * and add the current subscriber to `node`'s subscriber set.
 */
export function trackDependency(node: ReactiveNode): void {
    if (_currentSubscriber !== null) {
        _currentSubscriber.dependencies.add(node);
        node.subscribers.add(_currentSubscriber);
    }
}

/**
 * Notify all subscribers of a reactive node that it has changed.
 */
export function notifySubscribers(node: ReactiveNode): void {
    // Iterate over a snapshot to avoid mutation during iteration
    const subs = Array.from(node.subscribers);
    for (let i = 0; i < subs.length; i++) {
        queueNotification(subs[i]);
    }
}

/**
 * Remove a subscriber from all of its dependencies' subscriber sets,
 * then clear the subscriber's dependency set.
 */
export function unlinkSubscriber(subscriber: Subscriber): void {
    for (const dep of subscriber.dependencies) {
        dep.subscribers.delete(subscriber);
    }
    subscriber.dependencies.clear();
}
