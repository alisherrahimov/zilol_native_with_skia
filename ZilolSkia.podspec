Pod::Spec.new do |s|
  s.name         = 'ZilolSkia'
  s.version      = '0.1.0'
  s.summary      = 'Prebuilt Skia xcframeworks for Zilol Native'
  s.homepage     = 'https://github.com/zilol/zilol-native'
  s.license      = { type: 'MIT' }
  s.author       = 'Zilol'
  s.platform     = :ios, '15.0'
  s.source       = { path: '.' }

  # Skia headers
  s.header_mappings_dir = 'vendor/skia'
  s.preserve_paths = 'vendor/skia/**/*'

  # Header search paths — Skia uses #include "include/core/SkCanvas.h" style
  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => [
      '"$(PODS_ROOT)/../../vendor/skia"',
      '"$(PODS_ROOT)/../../vendor/skia/modules"',
    ].join(' '),
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'GCC_PREPROCESSOR_DEFINITIONS' => 'SK_METAL=1 SK_GANESH=1',
  }

  s.user_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => [
      '"$(PODS_ROOT)/../../vendor/skia"',
      '"$(PODS_ROOT)/../../vendor/skia/modules"',
    ].join(' '),
  }

  # XCFrameworks
  ios_libs = 'vendor/skia/libs/apple/ios'

  s.vendored_frameworks = [
    "#{ios_libs}/libskia.xcframework",
    "#{ios_libs}/libskparagraph.xcframework",
    "#{ios_libs}/libskshaper.xcframework",
    "#{ios_libs}/libskunicode_core.xcframework",
    "#{ios_libs}/libskunicode_libgrapheme.xcframework",
    "#{ios_libs}/libsvg.xcframework",
    "#{ios_libs}/libskottie.xcframework",
    "#{ios_libs}/libsksg.xcframework",
  ]

  s.frameworks = 'Metal', 'MetalKit', 'QuartzCore', 'CoreGraphics', 'CoreText'
end
