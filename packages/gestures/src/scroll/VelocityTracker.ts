/**
 * VelocityTracker.ts — Rolling-window velocity estimation.
 *
 * Tracks touch positions over a configurable time window and computes
 * velocity using a weighted average of recent samples. This matches
 * the approach used by UIScrollView (iOS) and VelocityTracker (Android).
 *
 * Usage:
 *   const tracker = new VelocityTracker();
 *   tracker.addPoint(timestamp, position);  // on each touchmove
 *   const velocity = tracker.getVelocity(); // on touchend
 *   tracker.reset();
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum age of samples to consider (ms). */
const HISTORY_WINDOW_MS = 100;

/** Maximum number of samples to keep. */
const MAX_SAMPLES = 20;

/** Minimum samples needed for a valid velocity. */
const MIN_SAMPLES = 2;

// ---------------------------------------------------------------------------
// Sample
// ---------------------------------------------------------------------------

interface Sample {
  /** Timestamp in ms (from performance.now or event.timestamp). */
  timestamp: number;
  /** Position in px along the tracked axis. */
  position: number;
}

// ---------------------------------------------------------------------------
// VelocityTracker
// ---------------------------------------------------------------------------

export class VelocityTracker {
  private readonly _samples: Sample[] = [];
  private _lastTimestamp: number = 0;

  /**
   * Record a position sample.
   *
   * @param timestamp Time in ms.
   * @param position  Position in px on the tracked axis.
   */
  addPoint(timestamp: number, position: number): void {
    // Discard samples with non-advancing timestamps
    if (timestamp <= this._lastTimestamp && this._samples.length > 0) {
      return;
    }
    this._lastTimestamp = timestamp;

    this._samples.push({ timestamp, position });

    // Evict old samples beyond the window
    if (this._samples.length > MAX_SAMPLES) {
      this._samples.shift();
    }
  }

  /**
   * Compute velocity from tracked samples.
   *
   * Uses a time-weighted least-squares fit over the rolling window.
   * Returns velocity in px/ms (positive = increasing position).
   */
  getVelocity(): number {
    this._pruneOldSamples();

    if (this._samples.length < MIN_SAMPLES) {
      return 0;
    }

    // Use weighted linear regression over recent samples.
    // More recent samples get higher weight.
    const n = this._samples.length;
    const newest = this._samples[n - 1];
    const windowStart = newest.timestamp - HISTORY_WINDOW_MS;

    let sumWeight = 0;
    let sumWeightedVelocity = 0;

    for (let i = 1; i < n; i++) {
      const prev = this._samples[i - 1];
      const curr = this._samples[i];
      const dt = curr.timestamp - prev.timestamp;

      if (dt <= 0) continue;

      const velocity = (curr.position - prev.position) / dt;

      // Weight: newer samples are more important
      // Linear weight based on recency within the window
      const age = newest.timestamp - curr.timestamp;
      const weight = Math.max(0, 1 - age / HISTORY_WINDOW_MS);

      sumWeight += weight;
      sumWeightedVelocity += velocity * weight;
    }

    if (sumWeight <= 0) return 0;

    return sumWeightedVelocity / sumWeight;
  }

  /** Reset all tracked samples. */
  reset(): void {
    this._samples.length = 0;
    this._lastTimestamp = 0;
  }

  /** Number of stored samples. */
  get sampleCount(): number {
    return this._samples.length;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /** Remove samples outside the history window. */
  private _pruneOldSamples(): void {
    if (this._samples.length === 0) return;

    const newest = this._samples[this._samples.length - 1];
    const cutoff = newest.timestamp - HISTORY_WINDOW_MS;

    while (this._samples.length > 0 && this._samples[0].timestamp < cutoff) {
      this._samples.shift();
    }
  }
}
