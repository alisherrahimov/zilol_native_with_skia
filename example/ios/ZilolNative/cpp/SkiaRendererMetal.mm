/**
 * SkiaRendererMetal.mm — Metal implementation of SkiaRenderer.
 *
 * iOS-specific: manages CAMetalLayer, GrDirectContext, and the
 * acquire → draw → present frame lifecycle via Metal.
 *
 * .mm extension for Objective-C++ (Metal framework uses ObjC APIs).
 */

#include "SkiaRendererMetal.h"

#include "include/gpu/ganesh/mtl/GrMtlBackendContext.h"
#include "include/gpu/ganesh/mtl/GrMtlDirectContext.h"
#include "include/gpu/ganesh/mtl/GrMtlBackendSurface.h"
#include "include/gpu/ganesh/GrBackendSurface.h"
#include "include/gpu/ganesh/GrContextOptions.h"
#include "include/gpu/ganesh/mtl/GrMtlTypes.h"
#include "include/gpu/ganesh/SkSurfaceGanesh.h"
#include "include/core/SkColorSpace.h"

namespace zilol {
namespace skia {

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

bool SkiaRendererMetal::initialize(void *metalLayerPtr) {
    metalLayer_ = (__bridge CAMetalLayer *)metalLayerPtr;
    if (!metalLayer_) return false;

    device_ = metalLayer_.device;
    if (!device_) {
        device_ = MTLCreateSystemDefaultDevice();
        metalLayer_.device = device_;
    }
    if (!device_) {
        NSLog(@"[SkiaRendererMetal] ERROR: No Metal device available");
        return false;
    }

    commandQueue_ = [device_ newCommandQueue];
    if (!commandQueue_) {
        NSLog(@"[SkiaRendererMetal] ERROR: Failed to create command queue");
        return false;
    }

    // Configure the Metal layer
    metalLayer_.pixelFormat = MTLPixelFormatBGRA8Unorm;
    metalLayer_.framebufferOnly = NO;

    // Create Skia GPU context backed by Metal
    GrMtlBackendContext backendContext = {};
    backendContext.fDevice.retain((__bridge void *)device_);
    backendContext.fQueue.retain((__bridge void *)commandQueue_);

    GrContextOptions options;
    options.fReduceOpsTaskSplitting = GrContextOptions::Enable::kNo;

    grContext_ = GrDirectContexts::MakeMetal(backendContext, options);

    if (!grContext_) {
        NSLog(@"[SkiaRendererMetal] ERROR: Failed to create GrDirectContext");
        return false;
    }

    NSLog(@"[SkiaRendererMetal] Initialized — device: %s, drawable: %dx%d",
          device_.name.UTF8String,
          (int)metalLayer_.drawableSize.width,
          (int)metalLayer_.drawableSize.height);

    return true;
}

// ---------------------------------------------------------------------------
// beginFrame
// ---------------------------------------------------------------------------

bool SkiaRendererMetal::beginFrame() {
    if (inFrame_) {
        endFrame(); // Finish dangling frame
    }

    if (!grContext_ || !metalLayer_) return false;

    // 1. Acquire the next drawable (blocks if triple-buffer full)
    @autoreleasepool {
        currentDrawable_ = [metalLayer_ nextDrawable];
    }
    if (!currentDrawable_) return false;

    // 2. Create command buffer for this frame
    currentCommandBuffer_ = [commandQueue_ commandBuffer];
    if (!currentCommandBuffer_) {
        currentDrawable_ = nil;
        return false;
    }

    // 3. Wrap drawable's texture as Skia render target
    id<MTLTexture> texture = currentDrawable_.texture;
    int width = static_cast<int>(texture.width);
    int height = static_cast<int>(texture.height);

    GrMtlTextureInfo textureInfo;
    textureInfo.fTexture.retain((__bridge void *)texture);

    GrBackendRenderTarget backendRT =
        GrBackendRenderTargets::MakeMtl(width, height, textureInfo);

    // 4. Create SkSurface wrapping this render target
    surface_ = SkSurfaces::WrapBackendRenderTarget(
        grContext_.get(),
        backendRT,
        kTopLeft_GrSurfaceOrigin,
        kBGRA_8888_SkColorType,
        SkColorSpace::MakeSRGB(),
        nullptr);

    if (!surface_) {
        currentDrawable_ = nil;
        currentCommandBuffer_ = nil;
        return false;
    }

    inFrame_ = true;
    return true;
}

// ---------------------------------------------------------------------------
// getCanvas
// ---------------------------------------------------------------------------

SkCanvas *SkiaRendererMetal::getCanvas() {
    if (!inFrame_ || !surface_) return nullptr;
    return surface_->getCanvas();
}

// ---------------------------------------------------------------------------
// endFrame
// ---------------------------------------------------------------------------

void SkiaRendererMetal::endFrame() {
    if (!inFrame_) return;

    if (surface_ && grContext_) {
        // 1. Flush Skia draw commands → Metal render commands
        grContext_->flushAndSubmit(surface_.get(), GrSyncCpu::kNo);
    }

    if (currentCommandBuffer_ && currentDrawable_) {
        // 2. Schedule present when GPU finishes
        [currentCommandBuffer_ presentDrawable:currentDrawable_];

        // 3. Submit to GPU
        [currentCommandBuffer_ commit];
    }

    // 4. Clean up frame state
    surface_ = nullptr;
    currentDrawable_ = nil;
    currentCommandBuffer_ = nil;
    inFrame_ = false;
}

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

int SkiaRendererMetal::surfaceWidth() const {
    if (!metalLayer_) return 0;
    return static_cast<int>(metalLayer_.drawableSize.width);
}

int SkiaRendererMetal::surfaceHeight() const {
    if (!metalLayer_) return 0;
    return static_cast<int>(metalLayer_.drawableSize.height);
}

} // namespace skia
} // namespace zilol
