#pragma once

/**
 * SkiaRendererMetal.h — Metal implementation of SkiaRenderer.
 *
 * iOS-specific: uses CAMetalLayer, MTLDevice, MTLCommandQueue.
 * This file lives in the iOS project, not in the shared packages/cpp.
 */

#include "skia/SkiaRenderer.h"

#include "include/core/SkSurface.h"
#include "include/gpu/ganesh/GrDirectContext.h"

#import <Metal/Metal.h>
#import <QuartzCore/CAMetalLayer.h>

namespace zilol {
namespace skia {

class SkiaRendererMetal : public SkiaRenderer {
public:
    SkiaRendererMetal() = default;
    ~SkiaRendererMetal() override = default;

    /// Initialize with a CAMetalLayer pointer.
    bool initialize(void *metalLayerPtr);

    // ── SkiaRenderer interface ────────────────────────────────

    bool isReady() const override { return grContext_ != nullptr; }
    bool beginFrame() override;
    SkCanvas *getCanvas() override;
    sk_sp<SkSurface> getSurface() override { return surface_; }
    void endFrame() override;
    int surfaceWidth() const override;
    int surfaceHeight() const override;
    GrDirectContext *grContext() override { return grContext_.get(); }

private:
    // Metal objects
    CAMetalLayer *metalLayer_ = nullptr;
    id<MTLDevice> device_ = nil;
    id<MTLCommandQueue> commandQueue_ = nil;

    // Current frame state
    id<CAMetalDrawable> currentDrawable_ = nil;
    id<MTLCommandBuffer> currentCommandBuffer_ = nil;

    // Skia objects
    sk_sp<GrDirectContext> grContext_;
    sk_sp<SkSurface> surface_;

    bool inFrame_ = false;
};

} // namespace skia
} // namespace zilol
