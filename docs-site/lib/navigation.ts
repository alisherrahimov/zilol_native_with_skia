export interface NavItem {
  title: string;
  slug: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", slug: "getting-started" },
      { title: "Architecture", slug: "architecture" },
      { title: "Project Structure", slug: "guides/project-structure" },
    ],
  },
  {
    title: "Reactive Primitives",
    items: [
      { title: "signal()", slug: "api/signals" },
      { title: "computed()", slug: "api/computed" },
      { title: "effect()", slug: "api/effect" },
      { title: "batch()", slug: "api/batch" },
      { title: "Control Flow", slug: "api/control-flow" },
      { title: "Lifecycle", slug: "api/lifecycle" },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "View", slug: "api/view" },
      { title: "Text", slug: "api/text" },
      { title: "Image", slug: "api/image" },
      { title: "Pressable", slug: "api/pressable" },
      { title: "ScrollView", slug: "api/scrollview" },
      { title: "Styling", slug: "api/styling" },
    ],
  },
  {
    title: "Advanced",
    items: [
      { title: "Animations", slug: "api/animations" },
      { title: "Navigation", slug: "api/navigation" },
    ],
  },
  {
    title: "Native Layer",
    items: [
      { title: "Bridge Overview", slug: "native/bridge-overview" },
      { title: "Skia JSI API", slug: "native/skia-jsi" },
      { title: "C++ Layer", slug: "native/cpp-layer" },
    ],
  },
  {
    title: "Guides",
    items: [{ title: "Hot Reload", slug: "guides/hot-reload" }],
  },
];

export function getDocNavigation(currentSlug: string): {
  prev: NavItem | null;
  next: NavItem | null;
} {
  const allItems = navigation.flatMap((section) => section.items);
  const currentIndex = allItems.findIndex((item) => item.slug === currentSlug);

  return {
    prev: currentIndex > 0 ? allItems[currentIndex - 1] : null,
    next:
      currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null,
  };
}
