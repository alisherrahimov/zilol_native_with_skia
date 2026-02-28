/**
 * Pipeline barrel exports.
 *
 * DisplayList and RenderLoop removed — rendering handled by C++.
 */

export {
  collectDamageRects,
  mergeRects,
  intersects,
  unionRects,
} from "./DamageRect";
export { Compositor } from "./Compositor";
export type { PlatformViewFrame } from "./Compositor";
