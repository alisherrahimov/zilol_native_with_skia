#pragma once

/**
 * YogaHostFunctions.h — Yoga C++ JSI bindings.
 *
 * Registers all __yoga* global functions on the JSI runtime.
 * Manages a handle map from opaque int IDs to YGNodeRef pointers.
 */

#include <jsi/jsi.h>

namespace zilol {
namespace yoga {

/// Register all __yoga* host functions on the given JSI runtime.
void registerHostFunctions(facebook::jsi::Runtime &rt);

/// Set the Yoga point scale factor.
void setPointScaleFactor(facebook::jsi::Runtime &rt, float scale);

} // namespace yoga
} // namespace zilol
