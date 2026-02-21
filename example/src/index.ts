/**
 * index.ts — Zilol Native example app.
 *
 * Uses the full TypeScript framework:
 *   @zilol-native/nodes    — SkiaNode tree
 *   @zilol-native/layout   — YogaBridge (Yoga via JSI)
 *   @zilol-native/renderer — RenderLoop + DrawCommands
 *   @zilol-native/runtime  — Reactive signals
 *
 * No JSX. Pure Zilol style.
 */

import {
  SkiaNode,
  createViewNode,
  createTextNode,
  dirtyTracker,
} from "@zilol-native/nodes";
import { YogaBridge, syncLayoutResults } from "@zilol-native/layout";
import { RenderLoop } from "@zilol-native/renderer";
import {
  createCommandExecutor,
  createSurface,
  requestFrame,
  getScreenInfo,
  getPerformanceMetrics,
} from "./adapter";

// ---------------------------------------------------------------------------
// Platform info
// ---------------------------------------------------------------------------

const screen = getScreenInfo();
const px = screen.pixelRatio;

console.log(
  "[ZilolApp] Screen: " + screen.width + "x" + screen.height + " @" + px + "x",
);

// ---------------------------------------------------------------------------
// Build SkiaNode tree
// ---------------------------------------------------------------------------

// Root container — full screen, dark background
const root = createViewNode();
root.setProp("backgroundColor", "#1A1A2E");
root.setProp("width", screen.width * px);
root.setProp("height", screen.height * px);
root.setProp("flexDirection", "column");
root.setProp("paddingTop", screen.safeArea.top * px);
root.setProp("paddingBottom", screen.safeArea.bottom * px);
root.setProp("paddingLeft", 20 * px);
root.setProp("paddingRight", 20 * px);

// ── Header ────────────────────────────────────────────────────

const header = createViewNode();
header.setProp("height", 56 * px);
header.setProp("justifyContent", "center");
header.setProp("alignItems", "center");
root.appendChild(header);

const headerText = createTextNode();
headerText.setProp("text", "Zilol Native");
headerText.setProp("color", "#E94560");
headerText.setProp("fontSize", 20 * px);
header.appendChild(headerText);

// ── Card 1: Skia Canvas ───────────────────────────────────────

const card1 = createViewNode();
card1.setProp("backgroundColor", "#0F3460");
card1.setProp("borderRadius", 16 * px);
card1.setProp("padding", 16 * px);
card1.setProp("marginTop", 24 * px);
card1.setProp("height", 120 * px);
root.appendChild(card1);

const card1Title = createTextNode();
card1Title.setProp("text", "Skia Canvas Rendering");
card1Title.setProp("color", "#FFFFFF");
card1Title.setProp("fontSize", 18 * px);
card1.appendChild(card1Title);

const card1Sub = createTextNode();
card1Sub.setProp("text", "Hardware-accelerated via Metal + SkParagraph");
card1Sub.setProp("color", "#94A3B8");
card1Sub.setProp("fontSize", 13 * px);
card1Sub.setProp("marginTop", 10 * px);
card1.appendChild(card1Sub);

// ── Card 2: Platform Info ─────────────────────────────────────

const card2 = createViewNode();
card2.setProp("backgroundColor", "#533483");
card2.setProp("borderRadius", 16 * px);
card2.setProp("padding", 16 * px);
card2.setProp("marginTop", 16 * px);
card2.setProp("height", 120 * px);
root.appendChild(card2);

const card2Title = createTextNode();
card2Title.setProp("text", "Platform Info");
card2Title.setProp("color", "#FFFFFF");
card2Title.setProp("fontSize", 18 * px);
card2.appendChild(card2Title);

const card2Sub = createTextNode();
card2Sub.setProp(
  "text",
  screen.width +
    "x" +
    screen.height +
    " @" +
    px +
    "x  |  Hermes JSI  |  Yoga Layout",
);
card2Sub.setProp("color", "#94A3B8");
card2Sub.setProp("fontSize", 13 * px);
card2Sub.setProp("marginTop", 10 * px);
card2.appendChild(card2Sub);

// FPS display text — updated every frame
const fpsText = createTextNode();
fpsText.setProp("text", "Frame: 0  |  FPS: 0  |  Vsync: 0 Hz");
fpsText.setProp("color", "#CCCCCC");
fpsText.setProp("fontSize", 11 * px);
fpsText.setProp("marginTop", 10 * px);
card2.appendChild(fpsText);

// ── Card 3: Animated indicator ────────────────────────────────

const card3 = createViewNode();
card3.setProp("backgroundColor", "#1B1B2F");
card3.setProp("borderRadius", 16 * px);
card3.setProp("padding", 16 * px);
card3.setProp("marginTop", 16 * px);
card3.setProp("height", 80 * px);
card3.setProp("flexDirection", "row");
card3.setProp("alignItems", "center");
card3.setProp("justifyContent", "space-between");
root.appendChild(card3);

const card3Label = createTextNode();
card3Label.setProp("text", "Reactive Framework");
card3Label.setProp("color", "#FFFFFF");
card3Label.setProp("fontSize", 16 * px);
card3.appendChild(card3Label);

const indicator = createViewNode();
indicator.setProp("backgroundColor", "#E94560");
indicator.setProp("borderRadius", 10 * px);
indicator.setProp("width", 40 * px);
indicator.setProp("height", 20 * px);
card3.appendChild(indicator);

const indicatorLabel = createTextNode();
indicatorLabel.setProp("text", "LIVE");
indicatorLabel.setProp("color", "#FFFFFF");
indicatorLabel.setProp("fontSize", 10 * px);
indicator.appendChild(indicatorLabel);

// ── Footer ────────────────────────────────────────────────────

const footer = createViewNode();
footer.setProp("flex", 1);
footer.setProp("justifyContent", "flex-end");
footer.setProp("alignItems", "center");
footer.setProp("paddingBottom", 16 * px);
root.appendChild(footer);

const footerText = createTextNode();
footerText.setProp("text", "Built with C++ + Skia + Hermes + Metal");
footerText.setProp("color", "#666666");
footerText.setProp("fontSize", 12 * px);
footer.appendChild(footerText);

// ---------------------------------------------------------------------------
// Set up layout engine
// ---------------------------------------------------------------------------

const yoga = new YogaBridge();

function attachTree(node: SkiaNode) {
  yoga.attachNode(node);
  for (let i = 0; i < node.children.length; i++) {
    attachTree(node.children[i]);
  }
}

attachTree(root);

// ---------------------------------------------------------------------------
// Set up render loop
// ---------------------------------------------------------------------------

const renderLoop = new RenderLoop();
let frameCount = 0;
const startTime = Date.now();

function runFrame() {
  frameCount++;

  // Update FPS display
  const perf = getPerformanceMetrics();
  fpsText.setProp(
    "text",
    "Frame: " +
      frameCount +
      "  |  Render: " +
      Math.round(perf.renderFps) +
      " FPS  |  Vsync: " +
      Math.round(perf.vsyncRate) +
      " Hz",
  );

  // Animated indicator pulse
  const elapsed = (Date.now() - startTime) / 1000;
  const pulseAlpha = Math.floor((Math.sin(elapsed * 3) * 0.3 + 0.7) * 255);
  let hexAlpha = pulseAlpha.toString(16);
  if (hexAlpha.length < 2) hexAlpha = "0" + hexAlpha;
  indicator.setProp("backgroundColor", "#E94560" + hexAlpha);

  // Get surface & canvas
  const surface = createSurface();
  const canvas = surface.getCanvas();
  const executor = createCommandExecutor(canvas);

  // Layout
  yoga.calculateLayout(surface.width(), surface.height());
  syncLayoutResults(root, yoga);

  // Clear
  (canvas as any).clear("#1A1A2E");

  // Draw the full tree
  drawNodeTree(root, executor);

  // Flush
  surface.flush();

  // Request next frame
  requestFrame(runFrame);
}

/**
 * Simple recursive draw — walks SkiaNode tree and generates draw commands
 * directly via the executor (bypassing the full DisplayList pipeline for now
 * to keep this initial integration simple).
 */
function drawNodeTree(node: SkiaNode, executor: (cmd: any) => void) {
  const layout = node.layout;
  const props = node.props;
  const x = layout.absoluteX;
  const y = layout.absoluteY;
  const w = layout.width;
  const h = layout.height;

  // Draw view backgrounds (only skip views with zero dimensions)
  if (node.type === "view" && props.backgroundColor && w > 0 && h > 0) {
    const br = typeof props.borderRadius === "number" ? props.borderRadius : 0;
    if (br > 0) {
      executor({
        type: "drawRRect",
        x,
        y,
        width: w,
        height: h,
        rx: br,
        ry: br,
        color: props.backgroundColor as string,
      });
    } else {
      executor({
        type: "drawRect",
        x,
        y,
        width: w,
        height: h,
        color: props.backgroundColor as string,
      });
    }
  }

  // Draw text — always render regardless of layout dimensions
  if (node.type === "text" && props.text) {
    executor({
      type: "drawText",
      text: props.text as string,
      x,
      y,
      color: (props.color as string) || "#FFFFFF",
      fontSize: (props.fontSize as number) || 14,
    });
  }

  // Recurse children
  for (let i = 0; i < node.children.length; i++) {
    drawNodeTree(node.children[i], executor);
  }
}

// ---------------------------------------------------------------------------
// Start!
// ---------------------------------------------------------------------------

console.log("[ZilolApp] Framework initialized, starting render loop");
requestFrame(runFrame);
