/* Node smoke test for the FSRS-7 port. Run: node test/fsrs7.test.js */
const FSRS7 = require('../js/fsrs7.js');

const fsrs = FSRS7.makeScheduler({ requestRetention: 0.9 });
const DAY = FSRS7.DAY_MS;
let failures = 0;

function check(name, cond, detail) {
  const ok = !!cond;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
}

// 1. Forgetting curve: R(0)=1, strictly decreasing, R(t=S) in a sane band
const r0 = fsrs.retrievability(0, 4.1283);
const rHalf = fsrs.retrievability(2, 4.1283);
const rS = fsrs.retrievability(4.1283, 4.1283);
const r10 = fsrs.retrievability(10, 4.1283);
check('R(0) = 1', r0 === 1, `R=${r0}`);
check('R strictly decreasing', r0 > rHalf && rHalf > rS && rS > r10,
  `2d=${rHalf.toFixed(3)} 4.1d=${rS.toFixed(3)} 10d=${r10.toFixed(3)}`);
check('R(S) between 0.3 and 0.95', rS > 0.3 && rS < 0.95, rS.toFixed(3));

// 2. Interval inversion recovers ~90% retention
const ivl = fsrs.intervalFor(4.1283);
const rAtIvl = fsrs.retrievability(ivl, 4.1283);
check('intervalFor inverts to ~0.9', Math.abs(rAtIvl - 0.9) < 0.01,
  `ivl=${ivl.toFixed(2)}d R=${rAtIvl.toFixed(4)}`);

// 3. New card: initial stabilities ordered Again < Hard < Good < Easy
const t0 = Date.now();
const p = fsrs.previewIntervals({ s: null, d: null, lastReview: null }, t0);
check('new-card intervals ordered', p[1] < p[2] && p[2] < p[3] && p[3] < p[4],
  `A=${p[1].toFixed(3)}d H=${p[2].toFixed(2)}d G=${p[3].toFixed(2)}d E=${p[4].toFixed(2)}d`);
check('new Good interval is days-scale', p[3] > 0.5 && p[3] < 30, p[3].toFixed(2) + 'd');
check('new Again interval is sub-day', p[1] < 1, (p[1] * 1440).toFixed(0) + 'min');

// 4. Simulated learner: always Good at due time → intervals grow, difficulty drifts down
const card = { s: null, d: null, lastReview: null, due: null };
let now = t0;
const ivls = [];
for (let i = 0; i < 6; i++) {
  ivls.push(fsrs.review(card, 3, now, false));
  now = card.due;
}
check('intervals grow across reviews', ivls.every((v, i) => i === 0 || v > ivls[i - 1]),
  ivls.map(v => v.toFixed(1)).join(' → ') + ' d');
check('difficulty decreases with Good', card.d < 5.6385, 'D=' + card.d.toFixed(2));
check('stability clamped and finite', isFinite(card.s) && card.s > 0 && card.s <= 36500);

// 5. Lapse: Again after long delay shrinks stability vs a Good at the same moment
const base = { s: 20, d: 5, lastReview: t0 - 30 * DAY };
const sAgain = fsrs.nextState(base, 1, t0).s;
const sGood = fsrs.nextState(base, 3, t0).s;
check('Again < Good after 30d delay on S=20', sAgain < sGood && sAgain < 20,
  `Again→S=${sAgain.toFixed(2)} Good→S=${sGood.toFixed(2)}`);

// 6. Same-day review uses the short-term branch (coef≈0 path shouldn't blow up)
const sameDay = fsrs.nextState({ s: 2, d: 5, lastReview: t0 - 10 * 60000 }, 3, t0); // 10 min later
check('same-day review sane', isFinite(sameDay.s) && sameDay.s > 0, 'S=' + sameDay.s.toFixed(3));

// 7. Higher retention target → shorter intervals
const strict = FSRS7.makeScheduler({ requestRetention: 0.95 });
check('retention 0.95 < 0.90 interval', strict.intervalFor(10) < fsrs.intervalFor(10),
  `${strict.intervalFor(10).toFixed(1)}d vs ${fsrs.intervalFor(10).toFixed(1)}d`);

console.log(failures ? `\n${failures} FAILURES` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
