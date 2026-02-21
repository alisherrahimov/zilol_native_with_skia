/**
 * Test app — Animation Showcase
 *
 * Demonstrates the @zilol-native/animation API with:
 * - Staggered launch animations (fade + slide + spring)
 * - Interactive tap animations (bounce, pulse, color shift)
 * - Pulsing live dot
 * - Activity indicator spinners
 * - ScrollView with numbered list
 *
 * NOTE: Uses callback-based animation chaining (no async/await)
 * to avoid Hermes fiber crashes.
 */

import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from "@zilol-native/components";
import { signal } from "@zilol-native/runtime";
import { runApp, setShowRedraws } from "@zilol-native/platform";
import {
  animate,
  withTiming,
  withSpring,
  sequence,
  parallel,
  delay,
  loop,
  Easing,
} from "@zilol-native/animation";

const bg = "#0F172A";
const fpsText = signal("FPS: --");

setShowRedraws(false);

// ---------------------------------------------------------------------------
// Animation Signals
// ---------------------------------------------------------------------------

// Launch
const titleOpacity = signal(0);
const subtitleOpacity = signal(0);
const fpsOpacity = signal(0);

// Feature cards
const card1Opacity = signal(0);
const card1SlideX = signal(-60);
const card2Opacity = signal(0);
const card2SlideX = signal(60);
const card3Opacity = signal(0);
const card3SlideX = signal(-60);
const card4Opacity = signal(0);
const card4SlideX = signal(60);

// Interactive buttons
const tapCount = signal(0);
const tapBtnOpacity = signal(0);
const springBtnOpacity = signal(0);
const bounceBtnOpacity = signal(0);

// Pulse dot
const pulseOpacity = signal(0.3);

// Bottom
const scrollAreaOpacity = signal(0);
const indicatorOpacity = signal(0);

// ---------------------------------------------------------------------------
// Launch Animation — cinematic staggered entrance (callback-based)
// ---------------------------------------------------------------------------
function playLaunchAnimation() {
  // Phase 1: Title
  animate(
    titleOpacity,
    withTiming(1, { duration: 500, easing: Easing.easeOut }),
    () => {
      // Phase 2: Subtitle + FPS
      parallel([
        () => animate(subtitleOpacity, withTiming(1, { duration: 300 })),
        () =>
          sequence([
            () => delay(100),
            () => animate(fpsOpacity, withTiming(1, { duration: 300 })),
          ]),
      ]).onFinish(() => {
        // Phase 3: Feature cards slide in from alternating sides
        sequence([
          () =>
            parallel([
              () =>
                animate(
                  card1Opacity,
                  withTiming(1, { duration: 250, easing: Easing.easeOut }),
                ),
              () =>
                animate(
                  card1SlideX,
                  withSpring(0, { damping: 16, stiffness: 140 }),
                ),
            ]),
          () =>
            parallel([
              () =>
                animate(
                  card2Opacity,
                  withTiming(1, { duration: 250, easing: Easing.easeOut }),
                ),
              () =>
                animate(
                  card2SlideX,
                  withSpring(0, { damping: 16, stiffness: 140 }),
                ),
            ]),
          () =>
            parallel([
              () =>
                animate(
                  card3Opacity,
                  withTiming(1, { duration: 250, easing: Easing.easeOut }),
                ),
              () =>
                animate(
                  card3SlideX,
                  withSpring(0, { damping: 16, stiffness: 140 }),
                ),
            ]),
          () =>
            parallel([
              () =>
                animate(
                  card4Opacity,
                  withTiming(1, { duration: 250, easing: Easing.easeOut }),
                ),
              () =>
                animate(
                  card4SlideX,
                  withSpring(0, { damping: 16, stiffness: 140 }),
                ),
            ]),
        ]).onFinish(() => {
          // Phase 4: Interactive buttons staggered
          parallel([
            () =>
              animate(
                tapBtnOpacity,
                withTiming(1, { duration: 300, easing: Easing.easeOut }),
              ),
            () =>
              sequence([
                () => delay(80),
                () =>
                  animate(springBtnOpacity, withTiming(1, { duration: 300 })),
              ]),
            () =>
              sequence([
                () => delay(160),
                () =>
                  animate(bounceBtnOpacity, withTiming(1, { duration: 300 })),
              ]),
          ]).onFinish(() => {
            // Phase 5: Bottom section
            parallel([
              () =>
                animate(scrollAreaOpacity, withTiming(1, { duration: 400 })),
              () => animate(indicatorOpacity, withTiming(1, { duration: 400 })),
            ]).onFinish(() => {
              // Phase 6: Infinite pulse
              loop(() =>
                sequence([
                  () =>
                    animate(
                      pulseOpacity,
                      withTiming(1, {
                        duration: 800,
                        easing: Easing.easeInOut,
                      }),
                    ),
                  () =>
                    animate(
                      pulseOpacity,
                      withTiming(0.3, {
                        duration: 800,
                        easing: Easing.easeInOut,
                      }),
                    ),
                ]),
              );
            });
          });
        });
      });
    },
  );
}

playLaunchAnimation();

// ---------------------------------------------------------------------------
// FPS Counter
// ---------------------------------------------------------------------------
let lastFrameTime = 0;
const frameTimes: number[] = [];

function fpsLoop(timestamp: number) {
  if (lastFrameTime > 0) {
    frameTimes.push(timestamp - lastFrameTime);
    if (frameTimes.length > 60) frameTimes.shift();
    if (frameTimes.length % 15 === 0) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      fpsText.value = `FPS: ${(1000 / avg).toFixed(0)}`;
    }
  }
  lastFrameTime = timestamp;
  (globalThis as any).__skiaRequestFrame(fpsLoop);
}
(globalThis as any).__skiaRequestFrame(fpsLoop);

// ---------------------------------------------------------------------------
// Feature Card
// ---------------------------------------------------------------------------
function FeatureCard(
  emoji: string,
  title: string,
  desc: string,
  cardBg: string,
  opacitySig: ReturnType<typeof signal>,
) {
  return View(
    Text(emoji).fontSize(24),
    View(
      Text(title).fontSize(15).bold().color("#F1F5F9"),
      Text(desc).fontSize(11).color("#94A3B8").marginTop(2),
    )
      .marginLeft(12)
      .flex(1),
  )
    .row()
    .alignItems("center")
    .padding(14)
    .backgroundColor(cardBg)
    .borderRadius(12)
    .width(340)
    .opacity(() => opacitySig.value);
}

// ---------------------------------------------------------------------------
// Interactive Button
// ---------------------------------------------------------------------------
function AnimButton(
  label: string,
  color: string,
  opacitySig: ReturnType<typeof signal>,
  onTap: () => void,
) {
  return Pressable(Text(label).fontSize(14).bold().color("#FFF"))
    .onPress(onTap)
    .backgroundColor(color)
    .height(44)
    .flex(1)
    .borderRadius(10)
    .justifyContent("center")
    .alignItems("center")
    .opacity(() => opacitySig.value);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const App = () =>
  View(
    View().height(56),

    // ── Header ─────────────────────────────────────────────
    View(
      Text("Zilol Native")
        .fontSize(26)
        .bold()
        .color("#F8FAFC")
        .opacity(() => titleOpacity.value),
      View(
        View()
          .width(8)
          .height(8)
          .borderRadius(4)
          .backgroundColor("#22C55E")
          .opacity(() => pulseOpacity.value),
        Text(() => fpsText.value)
          .fontSize(13)
          .bold()
          .color(() => {
            const fps = parseFloat(fpsText.value.replace("FPS: ", ""));
            if (fps >= 55) return "#22C55E";
            if (fps >= 30) return "#F59E0B";
            return "#EF4444";
          })
          .marginLeft(6),
      )
        .row()
        .alignItems("center")
        .opacity(() => fpsOpacity.value),
    )
      .row()
      .justifyContent("space-between")
      .alignItems("center")
      .width(340),

    Text("Animation Showcase")
      .fontSize(13)
      .color("#64748B")
      .marginTop(4)
      .opacity(() => subtitleOpacity.value),

    // ── Feature Cards ──────────────────────────────────────
    View(
      FeatureCard(
        "⚡",
        "withTiming",
        "Duration + easing curves",
        "#1E293B",
        card1Opacity,
      ),
      FeatureCard(
        "🔧",
        "withSpring",
        "Physics spring damping",
        "#1A2744",
        card2Opacity,
      ),
      FeatureCard(
        "🎯",
        "withDecay",
        "Momentum deceleration",
        "#1E293B",
        card3Opacity,
      ),
      FeatureCard(
        "🔗",
        "Composable",
        "sequence · parallel · loop",
        "#1A2744",
        card4Opacity,
      ),
    )
      .width(340)
      .gap(8)
      .marginTop(16),

    // ── Interactive Buttons ────────────────────────────────
    View(Text("Try it").fontSize(12).bold().color("#64748B"))
      .marginTop(16)
      .width(340),

    View(
      AnimButton("Timing", "#6366F1", tapBtnOpacity, () => {
        tapCount.value++;
        animate(tapBtnOpacity, withTiming(0.5, { duration: 80 }), () => {
          animate(
            tapBtnOpacity,
            withTiming(1, { duration: 200, easing: Easing.easeOut }),
          );
        });
      }),
      View().width(8),
      AnimButton("Spring", "#8B5CF6", springBtnOpacity, () => {
        tapCount.value++;
        animate(springBtnOpacity, withTiming(0.6, { duration: 50 }), () => {
          animate(
            springBtnOpacity,
            withSpring(1, { damping: 6, stiffness: 400 }),
          );
        });
      }),
      View().width(8),
      AnimButton("Bounce", "#EC4899", bounceBtnOpacity, () => {
        tapCount.value++;
        animate(bounceBtnOpacity, withTiming(0.4, { duration: 60 }), () => {
          animate(
            bounceBtnOpacity,
            withTiming(1, { duration: 600, easing: Easing.elastic(1.5) }),
          );
        });
      }),
    )
      .row()
      .width(340)
      .marginTop(8),

    Text(() => `${tapCount.value} taps`)
      .fontSize(12)
      .color("#64748B")
      .marginTop(8),

    // ── Activity Indicators ────────────────────────────────
    View(
      View(
        ActivityIndicator().color("#6366F1").indicatorSize("small"),
        Text("Small").fontSize(11).color("#94A3B8").marginTop(4),
      ).alignItems("center"),
      View(
        ActivityIndicator().color("#22C55E").indicatorSize("large"),
        Text("Large").fontSize(11).color("#94A3B8").marginTop(4),
      )
        .alignItems("center")
        .marginLeft(32),
      View(
        ActivityIndicator().color("#F59E0B").indicatorSize(28),
        Text("Custom").fontSize(11).color("#94A3B8").marginTop(4),
      )
        .alignItems("center")
        .marginLeft(32),
    )
      .row()
      .alignItems("center")
      .marginTop(16)
      .opacity(() => indicatorOpacity.value),

    // ── Scroll Area ────────────────────────────────────────
    ScrollView(
      ...Array.from({ length: 50 }, (_, i) => {
        const colors = ["#1E293B", "#1A2744", "#1E2D3D", "#1C2333"];
        const titles = [
          "Getting Started",
          "Core Concepts",
          "Components",
          "Animation API",
          "Layout System",
          "Gestures",
          "Navigation",
          "Performance",
        ];
        return View(
          Text(`${i + 1}`)
            .fontSize(12)
            .color("#475569")
            .width(24),
          View(
            Text(titles[i % titles.length])
              .fontSize(14)
              .bold()
              .color("#E2E8F0"),
            Text("Tap to learn more")
              .fontSize(11)
              .color("#64748B")
              .marginTop(2),
          )
            .marginLeft(12)
            .flex(1),
        )
          .row()
          .alignItems("center")
          .padding(14)
          .backgroundColor(colors[i % colors.length])
          .borderRadius(10)
          .width(324);
      }),
    )
      .flex(1)
      .width(340)
      .marginTop(12)
      .borderRadius(14)
      .gap(6)
      .padding(8)
      .backgroundColor("#0A1628")
      .opacity(() => scrollAreaOpacity.value),

    View().height(20),
  )
    .flex(1)
    .column()
    .alignItems("center")
    .backgroundColor(bg);

runApp(() => App().node, {
  backgroundColor: bg,
});
