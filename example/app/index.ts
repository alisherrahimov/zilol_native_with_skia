/**
 * Test app — Image from URL + Pressable + Timers.
 */

import { View, Text, Pressable, Image } from "@zilol-native/components";
import { signal } from "@zilol-native/runtime";
import { runApp, setShowRedraws } from "@zilol-native/platform";

const bg = "#0F172A";
const count = signal(0);
const timerCount = signal(0);
const message = signal("Waiting for setTimeout...");

setShowRedraws(true);

// Test setTimeout
setTimeout(() => {
  message.value = "setTimeout fired! 🎉";
}, 2000);

// Test setInterval
const intervalId = setInterval(() => {
  timerCount.value++;
  if (timerCount.value >= 30) {
    clearInterval(intervalId);
    message.value = "Interval stopped at 30";
  }
}, 1000);

const App = () =>
  View(
    View().height(60),

    Text("Zilol Native").fontSize(24).bold().color("#F8FAFC"),
    Text("Image + Timers Demo").fontSize(12).color("#64748B").marginTop(4),

    // 🖼 Image from URL
    Image("https://picsum.photos/300/200")
      .width(300)
      .height(200)
      .borderRadius(16)
      .marginTop(20),

    // setTimeout result
    Text(() => message.value)
      .fontSize(14)
      .color("#22D3EE")
      .marginTop(16),

    // setInterval counter
    Text(() => `⏱ Interval: ${timerCount.value}`)
      .fontSize(18)
      .bold()
      .color("#A78BFA")
      .marginTop(4),

    // Manual counter
    Text(() => `Count: ${count.value}`)
      .fontSize(36)
      .bold()
      .color("#3B82F6")
      .marginTop(20),

    Pressable(Text("+1").fontSize(18).bold().color("#FFF"))
      .onPress(() => {
        count.value++;
      })
      .backgroundColor((p: boolean) => (p ? "#1D4ED8" : "#3B82F6"))
      .height(52)
      .width(300)
      .borderRadius(14)
      .justifyContent("center")
      .alignItems("center")
      .marginTop(16),

    Pressable(Text("Reset").fontSize(16).bold().color("#94A3B8"))
      .onPress(() => {
        count.value = 0;
      })
      .backgroundColor((p: boolean) => (p ? "#334155" : "#1E293B"))
      .height(44)
      .width(300)
      .borderRadius(10)
      .justifyContent("center")
      .alignItems("center")
      .marginTop(8),
  )
    .flex(1)
    .column()
    .alignItems("center")
    .backgroundColor(bg);

runApp(() => App().node, {
  backgroundColor: bg,
});
