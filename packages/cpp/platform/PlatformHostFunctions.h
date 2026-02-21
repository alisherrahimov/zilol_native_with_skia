#pragma once

/**
 * PlatformHostFunctions.h — Platform info JSI bindings.
 *
 * Registers __getScreenWidth, __getScreenHeight, __getPixelRatio,
 * __getSafeAreaInsets, __getStatusBarHeight.
 */

#include <jsi/jsi.h>

namespace zilol {
namespace platform {

/// Register platform info host functions.
void registerHostFunctions(facebook::jsi::Runtime &rt);

} // namespace platform
} // namespace zilol
