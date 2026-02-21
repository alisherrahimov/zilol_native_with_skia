// index.js — Minimal Zilol Native demo app
// Draws directly using JSI globals registered by C++

// Platform info
const screenWidth = __getScreenWidth();
const screenHeight = __getScreenHeight();
const pixelRatio = __getPixelRatio();
const safeArea = __getSafeAreaInsets();

console.log("[ZilolDemo] Screen: " + screenWidth + "x" + screenHeight + " @" + pixelRatio + "x");
console.log("[ZilolDemo] Safe area: top=" + safeArea.top + " bottom=" + safeArea.bottom);

// Animation state
let frame = 0;
const startTime = Date.now();

function render(timestamp) {
  frame++;
  const elapsed = (Date.now() - startTime) / 1000;

  // Get the current surface and canvas
  const surface = __skiaGetSurface();
  if (!surface) {
    __skiaRequestFrame(render);
    return;
  }

  const canvas = surface.getCanvas();
  const w = __skiaGetSurfaceWidth();
  const h = __skiaGetSurfaceHeight();

  // Clear to a dark background
  canvas.clear("#1A1A2E");

  // ── Header bar ──────────────────────────────────────────────
  const headerHeight = safeArea.top + 56;
  // drawRect(x, y, w, h, color)
  canvas.drawRect(0, 0, w, headerHeight * pixelRatio, "#16213E");

  // Header text — drawText(text, x, y, color, fontSize)
  canvas.drawText(
    "Zilol Native",
    (w / 2 - 80),
    (safeArea.top + 36) * pixelRatio,
    "#E94560",
    20 * pixelRatio
  );

  // ── Animated cards ──────────────────────────────────────────
  const cardY = headerHeight + 24;
  const cardPadding = 20;
  const cardWidth = screenWidth - cardPadding * 2;
  const cardHeight = 120;

  // Card 1: Colored rounded rect
  const card1Y = cardY;
  canvas.save();
  canvas.translate(cardPadding * pixelRatio, card1Y * pixelRatio);

  // drawRRect(x, y, w, h, rx, ry, color)
  canvas.drawRRect(
    0, 0,
    cardWidth * pixelRatio,
    cardHeight * pixelRatio,
    16 * pixelRatio, 16 * pixelRatio,
    "#0F3460"
  );

  // Card title
  canvas.drawText(
    "Skia Canvas Rendering",
    16 * pixelRatio,
    36 * pixelRatio,
    "#FFFFFF",
    18 * pixelRatio
  );

  // Card subtitle
  canvas.drawText(
    "Hardware-accelerated via Metal + SkParagraph",
    16 * pixelRatio,
    64 * pixelRatio,
    "#94A3B8",
    13 * pixelRatio
  );

  // Animated indicator
  var pulseAlpha = Math.floor((Math.sin(elapsed * 3) * 0.3 + 0.7) * 255);
  var hexAlpha = pulseAlpha.toString(16);
  if (hexAlpha.length < 2) hexAlpha = "0" + hexAlpha;
  var indicatorColor = "#E94560" + hexAlpha;
  var indicatorX = (cardWidth - 50) * pixelRatio;
  canvas.drawRRect(
    indicatorX, 85 * pixelRatio,
    40 * pixelRatio, 20 * pixelRatio,
    10 * pixelRatio, 10 * pixelRatio,
    indicatorColor
  );
  canvas.drawText("LIVE", indicatorX + 6 * pixelRatio, 99 * pixelRatio, "#FFFFFF", 10 * pixelRatio);

  canvas.restore();

  // Card 2: Platform info
  var card2Y = card1Y + cardHeight + 16;
  canvas.save();
  canvas.translate(cardPadding * pixelRatio, card2Y * pixelRatio);

  canvas.drawRRect(
    0, 0,
    cardWidth * pixelRatio,
    cardHeight * pixelRatio,
    16 * pixelRatio, 16 * pixelRatio,
    "#533483"
  );

  canvas.drawText(
    "Platform Info",
    16 * pixelRatio, 36 * pixelRatio,
    "#FFFFFF",
    18 * pixelRatio
  );

  canvas.drawText(
    screenWidth + "x" + screenHeight + " @" + pixelRatio + "x  |  Hermes JSI  |  Yoga Layout",
    16 * pixelRatio, 64 * pixelRatio,
    "#94A3B8",
    13 * pixelRatio
  );

  // Frame counter — use native FPS measurement
  var renderFps = Math.round(__getNativeFPS());
  var vsyncRate = Math.round(__getVsyncRate());
  canvas.drawText(
    "Frame: " + frame + "  |  Render: " + renderFps + " FPS  |  Vsync: " + vsyncRate + " Hz",
    16 * pixelRatio, 96 * pixelRatio,
    "#CCCCCC",
    11 * pixelRatio
  );

  canvas.restore();

  // Card 3: Bouncing ball animation
  var card3Y = card2Y + cardHeight + 16;
  canvas.save();
  canvas.translate(cardPadding * pixelRatio, card3Y * pixelRatio);

  var ballCardHeight = 160;
  canvas.drawRRect(
    0, 0,
    cardWidth * pixelRatio,
    ballCardHeight * pixelRatio,
    16 * pixelRatio, 16 * pixelRatio,
    "#1B1B2F"
  );

  canvas.drawText(
    "Animation",
    16 * pixelRatio, 30 * pixelRatio,
    "#FFFFFF",
    16 * pixelRatio
  );

  // Bouncing balls (drawn as circles via drawRRect with equal radius)
  var colors = ["#E94560", "#0F3460", "#533483", "#16213E", "#E94560"];
  for (var i = 0; i < 5; i++) {
    var phase = elapsed * (1.5 + i * 0.3) + i * 1.2;
    var ballX = ((Math.sin(phase * 0.7) * 0.5 + 0.5) * (cardWidth - 60) + 30) * pixelRatio;
    var ballY = (Math.abs(Math.sin(phase * 1.3)) * (ballCardHeight - 80) + 50) * pixelRatio;
    var radius = (12 + i * 3) * pixelRatio;

    canvas.drawRRect(
      ballX - radius, ballY - radius,
      radius * 2, radius * 2,
      radius, radius,
      colors[i]
    );
  }

  canvas.restore();

  // ── Footer ──────────────────────────────────────────────────
  var footerY = screenHeight - safeArea.bottom - 30;
  canvas.drawText(
    "Built with C++ + Skia + Hermes + Metal",
    (w / 2 - 140),
    footerY * pixelRatio,
    "#666666",
    12 * pixelRatio
  );

  // Flush and request next frame
  __skiaFlushSurface();
  __skiaRequestFrame(render);
}

// Start the render loop
__skiaRequestFrame(render);
