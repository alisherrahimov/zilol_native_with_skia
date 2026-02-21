/**
 * Pipeline barrel exports.
 */

export {
  collectDamageRects,
  mergeRects,
  intersects,
  unionRects,
} from "./DamageRect";
export { DisplayList } from "./DisplayList";
export type { CommandExecutor } from "./DisplayList";
export { RenderLoop } from "./RenderLoop";
export { Compositor } from "./Compositor";
export type { PlatformViewFrame } from "./Compositor";
