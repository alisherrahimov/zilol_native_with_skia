import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="hero">
      <div className="hero-badge">🌊 Open Source Framework</div>
      <h1>Zilol Native</h1>
      <p>
        Next-generation rendering framework. Fine-grained reactivity with signals,
        Skia GPU rendering, and zero VDOM overhead. Write TypeScript, render at 120fps.
      </p>
      <div className="hero-buttons">
        <Link href="/docs/getting-started" className="btn-primary">
          Get Started →
        </Link>
        <Link href="/docs/architecture" className="btn-secondary">
          Architecture
        </Link>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-card-icon">⚡</div>
          <h3>Signal-Based Reactivity</h3>
          <p>
            Fine-grained signals propagate changes directly to GPU draw commands.
            No VDOM diffing, no reconciliation overhead.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🎨</div>
          <h3>Skia GPU Rendering</h3>
          <p>
            Single SkSurface per window. Metal on iOS, Vulkan on Android.
            Every pixel is GPU-accelerated.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🔗</div>
          <h3>Synchronous JSI Bridge</h3>
          <p>
            C++ core shared across platforms. Zero-copy JSI calls between
            JavaScript and native Skia/Yoga.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">📐</div>
          <h3>Yoga Layout Engine</h3>
          <p>
            Familiar flexbox layout via Yoga C++. Only dirty subtrees are
            recalculated — incremental by default.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🔥</div>
          <h3>Instant Hot Reload</h3>
          <p>
            Signal-aware hot reload preserves state. File save to pixels
            updated in ~30-80ms.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-card-icon">🪶</div>
          <h3>Lightweight Nodes</h3>
          <p>
            ~100-200 bytes per SkiaNode vs ~1-2KB per native view.
            With node recycling pools for zero GC pressure.
          </p>
        </div>
      </div>

      <div className="hero-code">
        <div className="code-block-wrapper">
          <div className="code-block-header">
            <span className="code-block-lang">typescript</span>
          </div>
          <pre><code>{`function Counter() {
  const count = signal(0);

  return View()
    .padding(16)
    .backgroundColor(() =>
      count.value > 10 ? '#FF6B6B' : '#2196F3'
    )
    .children([
      Text(\`Count: \${count.value}\`)
        .fontSize(24)
        .color('#FFFFFF'),
      Pressable(() => count.value++)
        .child(Text('Increment').fontSize(18)),
    ]);
}`}</code></pre>
        </div>
      </div>

      <div className="wave-container">
        <div className="wave" />
        <div className="wave" />
        <div className="wave" />
      </div>
    </div>
  );
}
