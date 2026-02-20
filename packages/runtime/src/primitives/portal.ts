/**
 * Portal() — Render children at a different position in the node tree.
 *
 * Used for modals, toasts, overlays that need to escape their parent's
 * clipping/overflow context.
 *
 * In Phase 1 (no SkiaNode tree), this records the portal target and
 * child factory. The node layer in Phase 2+ will wire the actual
 * re-parenting logic.
 *
 * @example
 * ```ts
 * Portal({
 *   children: () => View({
 *     position: "absolute",
 *     backgroundColor: "rgba(0,0,0,0.5)",
 *     children: [Text({ text: "Modal content" })],
 *   }),
 * });
 * ```
 */

import { scope } from '../reactive/scope';
import type { Disposer } from '../reactive/graph';
import type { AnyNode } from './show';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortalProps {
    /** Named portal target. Defaults to root overlay layer. */
    target?: string;
    /** Children factory to render at the portal target. */
    children: () => AnyNode;
}

export interface PortalResult {
    readonly type: 'portal';
    /** The target name. */
    readonly target: string;
    /** The rendered child node. */
    readonly node: () => AnyNode;
    /** Dispose this Portal and its child scope. */
    readonly dispose: Disposer;
}

// ---------------------------------------------------------------------------
// Portal registry (used by renderer in Phase 3+)
// ---------------------------------------------------------------------------

const _portalTargets = new Map<string, Set<PortalResult>>();

/** Get all portals registered to a given target. @internal */
export function _getPortals(target: string): ReadonlySet<PortalResult> {
    return _portalTargets.get(target) ?? new Set();
}

function registerPortal(portal: PortalResult): void {
    let set = _portalTargets.get(portal.target);
    if (!set) {
        set = new Set();
        _portalTargets.set(portal.target, set);
    }
    set.add(portal);
}

function unregisterPortal(portal: PortalResult): void {
    const set = _portalTargets.get(portal.target);
    if (set) {
        set.delete(portal);
        if (set.size === 0) {
            _portalTargets.delete(portal.target);
        }
    }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Render children outside the normal tree hierarchy.
 *
 * @param props - Portal configuration.
 * @returns A PortalResult describing the portal.
 */
export function Portal(props: PortalProps): PortalResult {
    const targetName = props.target ?? '__root_overlay__';

    const result = scope<AnyNode>(() => {
        return props.children();
    });

    const portal: PortalResult = {
        type: 'portal',
        target: targetName,
        node: () => result.value,
        dispose: () => {
            unregisterPortal(portal);
            result.dispose();
        },
    };

    registerPortal(portal);

    return portal;
}
