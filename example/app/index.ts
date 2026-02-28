/**
 * Navigation Demo — Stack navigation with animated transitions.
 */

import { View, Text, Pressable } from "@zilol-native/components";
import { runApp } from "@zilol-native/platform";
import { signal } from "@zilol-native/runtime";
import { createRouter } from "@zilol-native/navigation";

// ── Screens ─────────────────────────────────────────

function HomeScreen() {
  return View(
    Text("🏠").fontSize(48),
    View().height(16),
    Text("Home").fontSize(28).bold().color("#F8FAFC"),
    Text("Welcome to Zilol Navigation")
      .fontSize(14)
      .color("#94A3B8")
      .marginBottom(32),

    Pressable(Text("Go to Details →").fontSize(16).bold().color("#FFF"))
      .onPress(() => router.push("Details", { id: 1, title: "First Item" }))
      .backgroundColor("#6366F1")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),

    View().height(12),

    Pressable(Text("Go to Settings →").fontSize(16).bold().color("#FFF"))
      .onPress(() => router.push("Settings"))
      .backgroundColor("#3B82F6")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),
  )
    .flex(1)
    .alignItems("center")
    .justifyContent("center")
    .backgroundColor("#0F172A");
}

function DetailsScreen(params: { id: number; title: string }) {
  return View(
    Text("📄").fontSize(48),
    View().height(16),
    Text("Details").fontSize(28).bold().color("#F8FAFC"),
    Text(`Item #${params.id}: ${params.title}`)
      .fontSize(14)
      .color("#94A3B8")
      .marginBottom(32),

    Pressable(Text("Push Another →").fontSize(16).bold().color("#FFF"))
      .onPress(() =>
        router.push("Details", {
          id: params.id + 1,
          title: `Item ${params.id + 1}`,
        }),
      )
      .backgroundColor("#8B5CF6")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),

    View().height(12),

    Pressable(Text("← Pop Back").fontSize(16).bold().color("#FFF"))
      .onPress(() => router.pop())
      .backgroundColor("#64748B")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),

    View().height(12),

    Pressable(Text("⏮ Pop to Root").fontSize(16).bold().color("#FFF"))
      .onPress(() => router.popToRoot())
      .backgroundColor("#EF4444")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),
  )
    .flex(1)
    .alignItems("center")
    .justifyContent("center")
    .backgroundColor("#0F172A");
}

function SettingsScreen() {
  return View(
    Text("⚙️").fontSize(48),
    View().height(16),
    Text("Settings").fontSize(28).bold().color("#F8FAFC"),
    Text("Configure your app").fontSize(14).color("#94A3B8").marginBottom(32),

    Pressable(Text("← Go Back").fontSize(16).bold().color("#FFF"))
      .onPress(() => router.pop())
      .backgroundColor("#64748B")
      .borderRadius(14)
      .paddingVertical(14)
      .paddingHorizontal(28)
      .alignItems("center"),
  )
    .flex(1)
    .alignItems("center")
    .justifyContent("center")
    .backgroundColor("#0F172A");
}

// ── Router ──────────────────────────────────────────

const router = createRouter(
  {
    Home: { component: HomeScreen, options: { title: "Home" } },
    Details: { component: DetailsScreen, options: { title: "Details" } },
    Settings: { component: SettingsScreen, options: { title: "Settings" } },
  },
  {
    transition: "slide",
    transitionDuration: 300,
    gestureBack: true,
  },
);

// ── Run ─────────────────────────────────────────────

runApp(() => router.Navigator({ initialRoute: "Home" }).node);
