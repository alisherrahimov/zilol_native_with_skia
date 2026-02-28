/**
 * @module @zilol-native/navigation
 *
 * Signal-efficient stack navigation.
 * Plain array stack, imperative push/pop, only 4 animation signals.
 *
 * @example
 * ```ts
 * import { createRouter } from '@zilol-native/navigation';
 *
 * const router = createRouter({
 *   Home: HomeScreen,
 *   Details: DetailsScreen,
 * });
 *
 * runApp(() => router.Navigator({ initialRoute: "Home" }).node);
 *
 * router.push("Details", { id: 42 });
 * router.pop();
 * ```
 */

export { createRouter } from "./Router";
export type { Router } from "./Router";
export type {
  ScreenFn,
  StackEntry,
  ScreenOptions,
  RouterConfig,
  TransitionType,
} from "./types";
