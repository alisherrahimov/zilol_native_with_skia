/**
 * Paint module barrel exports.
 */

export { PaintCache, paintCache, setPaintFactory } from "./PaintCache";
export type { PaintFactory } from "./PaintCache";
export {
  createShadowFilter,
  setShadowFilterFactory,
  _resetShadowFactory,
} from "./ShadowFactory";
export type { ShadowParams, ShadowFilterFactory } from "./ShadowFactory";
