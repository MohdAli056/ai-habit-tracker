/**
 * Deterministic streak engine tests.
 * Run: node scripts/test-streak.js
 *
 * All tests pass a fixed `today` override so results are reproducible
 * regardless of the actual current date.
 */

import { calcStreak } from '../utils/streak.js';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = actual.current === expected.current && actual.longest === expected.longest;
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    console.log(`     Expected: current=${expected.current} longest=${expected.longest}`);
    console.log(`     Actual:   current=${actual.current}   longest=${actual.longest}`);
    failed++;
  }
}

// Fixed reference point
const TODAY = '2026-09-21';
const YDAY  = '2026-09-20'; // yesterday
const D2    = '2026-09-19'; // 2 days ago
const D3    = '2026-09-18';
const D4    = '2026-09-17';
const D5    = '2026-09-16';
const D6    = '2026-09-15';
const D7    = '2026-09-14';
const D10   = '2026-09-11';
const D11   = '2026-09-10';
const D12   = '2026-09-09';

const C = (dates) => calcStreak(dates, TODAY);

console.log('\n── Streak Engine Tests ──\n');

// 1. Empty / null
check('Empty array → {current:0, longest:0}',      C([]),    { current:0, longest:0 });
check('Null input  → {current:0, longest:0}',      C(null),  { current:0, longest:0 });

// 2. Single day
check('Today only  → current=1 longest=1',         C([TODAY]),           { current:1, longest:1 });
check('Yesterday   → current=1 longest=1',         C([YDAY]),            { current:1, longest:1 });
check('Old date    → current=0 longest=1',         C([D10]),             { current:0, longest:1 });

// 3. Two-day runs
check('Today+Yday  → current=2 longest=2',         C([TODAY,YDAY]),      { current:2, longest:2 });
check('Yday+D2     → current=2 longest=2',         C([YDAY,D2]),         { current:2, longest:2 });

// 4. Spec Example 1 — 3-day run ending today
check('Spec Ex1: today+yday+D2 → current=3',       C([TODAY,YDAY,D2]),   { current:3, longest:3 });

// 5. Spec Example 2 — 3-day run ending yesterday
check('Spec Ex2: yday+D2+D3 → current=3',          C([YDAY,D2,D3]),      { current:3, longest:3 });

// 6. Spec Example 3 — old dates, today+yday missing
check('Spec Ex3: D3+D4 → current=0 longest=2',    C([D3,D4]),           { current:0, longest:2 });

// 7. Spec Example 4 — gaps
// today,yday, [skip D2], D3, [skip D4], D5,D6,D7
check('Spec Ex4: gaps → current=2 longest=3',
  C([TODAY,YDAY,D3,D5,D6,D7]),                                            { current:2, longest:3 });

// 8. Duplicates ignored
check('Duplicates → same as deduped',
  C([TODAY,TODAY,YDAY,YDAY]),                                             { current:2, longest:2 });

// 9. Unsorted input
check('Unsorted input → sorted correctly',
  C([YDAY,D2,TODAY,D3]),                                                  { current:4, longest:4 });

// 10. Long streak in past only
check('5-day old streak → current=0 longest=5',
  C([D7,D6,D5,D4,D3]),                                                   { current:0, longest:5 });

// 11. Two separate segments, current shorter
check('Two segments current=2 longest=3',
  C([TODAY,YDAY,D5,D6,D7]),                                              { current:2, longest:3 });

// 12. Longest is same era as current
check('current=3 longest=3 (older 3-streak)',
  C([D12,D11,D10, TODAY,YDAY,D2]),                                       { current:3, longest:3 });

// 13. Single yesterday, today missing
check('Yesterday only → current=1',
  C([YDAY]),                                                              { current:1, longest:1 });

// 14. Yesterday + D2 + D3 (3-day chain ending yesterday)
check('Yday+D2+D3 → current=3 longest=3',
  C([YDAY,D2,D3]),                                                       { current:3, longest:3 });

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
