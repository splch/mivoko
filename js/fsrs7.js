/* FSRS-7 — Free Spaced Repetition Scheduler (35-parameter version)
 *
 * Scheduling-math port of the reference implementation:
 *   open-spaced-repetition/4-button-benchmark · fsrs_v7.py
 * Only the inference/scheduling equations are ported (no training/optimizer).
 *
 * Card shape expected by review(): { s, d, lastReview, due }
 *   s: stability in days (null = new card)
 *   d: difficulty 1–10
 *   lastReview / due: epoch ms
 * Ratings: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
 */
(function (global) {
  'use strict';

  var DAY_MS = 86400000;
  var S_MIN = 0.001;
  var S_MAX = 36500;

  // Default parameters from multi-user optimisation (fsrs_v7.py init_w)
  var DEFAULT_W = [
    0.041, 2.4175, 4.1283, 11.9709,          // w[0..3]   initial stability, ratings 1–4
    5.6385, 0.4468, 3.262,                   // w[4..6]   difficulty
    2.3054, 0.1688, 1.3325, 0.3524, 0.0049,
    0.7503, 0.0896, 0.6625, 1.3,             // w[7..15]  long-term stability
    0.882, 0.3072, 3.5875, 0.303, 0.0107,
    0.2279, 2.6413, 0.5594, 1.3,             // w[16..24] short-term stability
    2.5, 1.0,                                // w[25..26] long/short transition
    0.0723, 0.1634, 0.5, 0.9555,
    0.2245, 0.6232, 0.1362, 0.3862           // w[27..34] forgetting curve
  ];

  function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

  function makeScheduler(opts) {
    opts = opts || {};
    var w = (opts.w && opts.w.length === 35) ? opts.w.slice() : DEFAULT_W.slice();
    var retention = clamp(opts.requestRetention || 0.9, 0.7, 0.99);
    var maxInterval = opts.maximumInterval || S_MAX;

    // R(t, S): weighted mix of two power-law retentions
    function powerLawRetention(base, decay, tOverS) {
      var factor = Math.pow(base, 1 / decay) - 1;
      return Math.pow(1 + factor * tOverS, decay);
    }

    function retrievability(tDays, s) {
      if (!s || s <= 0) return 0;
      if (tDays <= 0) return 1;
      var tOverS = tDays / s;
      var r1 = powerLawRetention(w[29], -w[27], tOverS);
      var r2 = powerLawRetention(w[30], -w[28], tOverS);
      var w1 = w[31] * Math.pow(s, -w[33]);
      var w2 = w[32] * Math.pow(s, w[34]);
      return (w1 * r1 + w2 * r2) / (w1 + w2);
    }

    // Invert the forgetting curve: largest t (days) with R(t, s) >= target.
    // The FSRS-7 curve has no closed-form inverse, so bisect (R decreases monotonically in t).
    function intervalFor(s, target) {
      target = target || retention;
      var lo = 0, hi = S_MAX, mid;
      for (var i = 0; i < 60; i++) {
        mid = (lo + hi) / 2;
        if (retrievability(mid, s) > target) lo = mid; else hi = mid;
      }
      return lo;
    }

    function initD(rating) {
      return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10);
    }

    function nextD(d, rating) {
      var delta = -w[6] * (rating - 3);
      var damped = d + delta * (10 - d) / 9;        // linear damping
      return clamp(0.01 * initD(4) + 0.99 * damped, 1, 10); // mean reversion to D0(Easy)
    }

    // Returns post-review stability for one parameter bank.
    // base = 7 → long-term (w[7..15]); base = 16 → short-term (w[16..24]).
    function stabilityAfterReview(s, d, r, rating, base) {
      var hardPenalty = rating === 2 ? w[base + 7] : 1;
      var easyBonus = rating === 4 ? w[base + 8] : 1;
      var sFail = w[base + 3] * Math.pow(d, -w[base + 4]) *
        (Math.pow(s + 1, w[base + 5]) - 1) *
        Math.exp((1 - r) * w[base + 6]);
      var pls = Math.min(s, sFail); // post-lapse stability
      var sInc = 1 + Math.exp(w[base] - 1.5) * (11 - d) * Math.pow(s, -w[base + 1]) *
        (Math.exp((1 - r) * w[base + 2]) - 1) * hardPenalty * easyBonus;
      return rating > 1 ? Math.max(pls, s * sInc) : pls;
    }

    // Pure memory-state transition (no scheduling). state: {s, d, lastReview}
    function nextState(state, rating, now) {
      if (state.s == null) return { s: w[rating - 1], d: initD(rating) };
      var t = Math.max(0, (now - state.lastReview) / DAY_MS); // elapsed days
      var r = retrievability(t, state.s);
      var sLong = stabilityAfterReview(state.s, state.d, r, rating, 7);
      var sShort = stabilityAfterReview(state.s, state.d, r, rating, 16);
      var coef = 1 - w[26] * Math.exp(-w[25] * t); // transition: 0 = short-term, →1 = long-term
      return {
        s: clamp(coef * sLong + (1 - coef) * sShort, S_MIN, S_MAX),
        d: nextD(state.d, rating)
      };
    }

    // Full in-place review. Returns scheduled interval in days.
    function review(card, rating, now, fuzz) {
      var ns = nextState(card, rating, now);
      card.s = ns.s;
      card.d = ns.d;
      card.lastReview = now;
      var ivl = Math.min(Math.max(intervalFor(card.s), 1 / 1440), maxInterval); // 1-minute floor
      if (fuzz !== false && ivl >= 1) ivl *= 1 + (Math.random() - 0.5) * 0.05;   // ±2.5% jitter
      card.due = now + ivl * DAY_MS;
      return ivl;
    }

    // Intervals (days) for all four ratings, without mutating the card.
    function previewIntervals(card, now) {
      var out = {};
      for (var g = 1; g <= 4; g++) {
        var ns = nextState(card, g, now);
        out[g] = Math.min(Math.max(intervalFor(ns.s), 1 / 1440), maxInterval);
      }
      return out;
    }

    return {
      w: w,
      retrievability: retrievability,
      intervalFor: intervalFor,
      nextState: nextState,
      review: review,
      previewIntervals: previewIntervals
    };
  }

  var api = { DEFAULT_W: DEFAULT_W, DAY_MS: DAY_MS, makeScheduler: makeScheduler };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.FSRS7 = api;
})(typeof window !== 'undefined' ? window : globalThis);
