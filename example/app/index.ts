/**
 * Test app — ScrollView Demo + FPS Counter
 *
 * Demonstrates vertical scrolling with multiple cards,
 * rubber-band overscroll, scroll events, and a live FPS counter.
 */

import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
} from "@zilol-native/components";
import { signal } from "@zilol-native/runtime";
import { runApp, setShowRedraws } from "@zilol-native/platform";

const bg = "#0F172A";
const scrollOffset = signal("Scroll: 0, 0");
const fpsText = signal("FPS: --");
const count = signal(0);

setShowRedraws(false);

// ---------------------------------------------------------------------------
// FPS Counter — tracks frame deltas via __skiaRequestFrame
// ---------------------------------------------------------------------------
let lastFrameTime = 0;
const frameTimes: number[] = [];
const MAX_SAMPLES = 60;

function fpsLoop(timestamp: number) {
  if (lastFrameTime > 0) {
    const dt = timestamp - lastFrameTime;
    frameTimes.push(dt);
    if (frameTimes.length > MAX_SAMPLES) frameTimes.shift();

    // Update display every ~15 frames to avoid excessive signal updates
    if (frameTimes.length % 15 === 0) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = avg > 0 ? 1000 / avg : 0;
      fpsText.value = `FPS: ${fps.toFixed(1)}`;
    }
  }
  lastFrameTime = timestamp;
  (globalThis as any).__skiaRequestFrame(fpsLoop);
}
(globalThis as any).__skiaRequestFrame(fpsLoop);

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------
function Card(title: string, subtitle: string, color: string) {
  return View(
    Text(title).fontSize(18).bold().color("#F8FAFC"),
    Text(subtitle).fontSize(13).color("#94A3B8").marginTop(4),
  )
    .padding(20)
    .backgroundColor(color)
    .borderRadius(12)
    .width(340);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const App = () =>
  View(
    View().height(60),

    // Header row with FPS
    View(
      View(
        Text("Zilol Native").fontSize(24).bold().color("#F8FAFC"),
        Text("ScrollView Demo").fontSize(12).color("#64748B").marginTop(4),
      ).alignItems("center"),
      Text(() => fpsText.value)
        .fontSize(14)
        .bold()
        .color(() => {
          const text = fpsText.value;
          const fps = parseFloat(text.replace("FPS: ", ""));
          if (fps >= 55) return "#22C55E"; // green
          if (fps >= 30) return "#F59E0B"; // yellow
          return "#EF4444"; // red
        }),
    )
      .row()
      .justifyContent("space-between")
      .alignItems("center")
      .width(340),

    // Scroll position display
    Text(() => scrollOffset.value)
      .fontSize(12)
      .color("#22D3EE")
      .marginTop(8),

    // Scrollable list of cards
    ScrollView(
      ...Array.from({ length: 100 }, (_, i) =>
        Card(
          `Item ${i + 1}`,
          "Set up your first Zilol Native project",
          i % 2 === 0 ? "#1E293B" : "#1E3A5F",
        ),
      ),
    )
      .flex(1)
      .width(340)
      .marginTop(16)
      .borderRadius(16)
      .gap(8)
      .padding(8)
      .backgroundColor("#0A1628")
      .onScroll((pos) => {
        scrollOffset.value = `Scroll: ${Math.round(pos.x)}, ${Math.round(pos.y)}`;
      }),

    // Counter section below scroll
    Pressable(
      Text(() => `Tap Count: ${count.value}`)
        .fontSize(16)
        .bold()
        .color("#FFF"),
    )
      .onPress(() => {
        count.value++;
      })
      .backgroundColor("#3B82F6")
      .height(48)
      .width(340)
      .borderRadius(12)
      .justifyContent("center")
      .alignItems("center")
      .marginTop(12)
      .marginBottom(20),
  )
    .flex(1)
    .column()
    .alignItems("center")
    .backgroundColor(bg);

runApp(() => App().node, {
  backgroundColor: bg,
});
