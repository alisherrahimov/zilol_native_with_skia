/**
 * ZilolBridge_iOS.mm — iOS-specific C bridge functions.
 *
 * This is the glue between Swift and the shared C++ runtime.
 * Creates the Metal-specific SkiaRendererMetal and passes it to
 * the shared ZilolRuntime::initialize().
 *
 * .mm for ObjC++ (Metal APIs).
 */

#include "runtime/ZilolRuntime.h"
#include "SkiaRendererMetal.h"

#include <memory>
#include <string>

#import <ImageIO/ImageIO.h>
#import <CoreGraphics/CoreGraphics.h>

extern "C" {

void zilol_runtime_initialize(void *metalLayerPtr) {
    // Create the iOS-specific Metal renderer
    auto renderer = std::make_unique<zilol::skia::SkiaRendererMetal>();

    if (!renderer->initialize(metalLayerPtr)) {
        NSLog(@"[ZilolBridge] ERROR: Failed to initialize Metal renderer");
        return;
    }

    // Pass ownership to the shared runtime
    zilol::initialize(std::move(renderer));
}

void zilol_set_point_scale_factor(float scale) {
    zilol::setPointScaleFactor(scale);
}

void zilol_evaluate_js_file(const char *filePath) {
    zilol::evaluateJSFile(std::string(filePath));
}

void zilol_on_vsync(double timestampMs) {
    zilol::onVsync(timestampMs);
}

void zilol_on_touch(int phase, float x, float y, int pointerId) {
    zilol::onTouch(phase, x, y, pointerId);
}

void zilol_download_image(const char *url,
                          void (*completion)(void *ctx, uint8_t *pixels,
                                            int width, int height),
                          void *ctx) {
    NSString *urlStr = [NSString stringWithUTF8String:url];
    NSURL *nsurl = [NSURL URLWithString:urlStr];
    if (!nsurl) {
        completion(ctx, nullptr, 0, 0);
        return;
    }

    // Use NSURLSession for async download
    NSURLSession *session = [NSURLSession sharedSession];
    NSURLSessionDataTask *task = [session dataTaskWithURL:nsurl
        completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
            if (error || !data || data.length == 0) {
                NSLog(@"[ZilolBridge] Image download failed: %@", error);
                completion(ctx, nullptr, 0, 0);
                return;
            }

            // Decode the image using CoreGraphics (supports JPEG, PNG, WebP, etc.)
            CGImageSourceRef source = CGImageSourceCreateWithData(
                (__bridge CFDataRef)data, NULL);
            if (!source) {
                NSLog(@"[ZilolBridge] Failed to create image source");
                completion(ctx, nullptr, 0, 0);
                return;
            }

            CGImageRef cgImage = CGImageSourceCreateImageAtIndex(source, 0, NULL);
            CFRelease(source);
            if (!cgImage) {
                NSLog(@"[ZilolBridge] Failed to create CGImage");
                completion(ctx, nullptr, 0, 0);
                return;
            }

            // Get dimensions
            int width = (int)CGImageGetWidth(cgImage);
            int height = (int)CGImageGetHeight(cgImage);

            // Allocate RGBA buffer
            size_t dataSize = (size_t)width * height * 4;
            uint8_t *pixels = (uint8_t *)malloc(dataSize);
            if (!pixels) {
                CGImageRelease(cgImage);
                completion(ctx, nullptr, 0, 0);
                return;
            }

            // Render CGImage to RGBA bitmap context
            CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
            CGContextRef bitmapCtx = CGBitmapContextCreate(
                pixels, width, height, 8, width * 4, colorSpace,
                kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
            CGColorSpaceRelease(colorSpace);

            if (!bitmapCtx) {
                free(pixels);
                CGImageRelease(cgImage);
                completion(ctx, nullptr, 0, 0);
                return;
            }

            CGContextDrawImage(bitmapCtx, CGRectMake(0, 0, width, height), cgImage);
            CGContextRelease(bitmapCtx);
            CGImageRelease(cgImage);

            // Pass decoded RGBA pixels to the callback
            // The C++ side is responsible for calling free(pixels)
            completion(ctx, pixels, width, height);
        }];
    [task resume];
}

} // extern "C"

