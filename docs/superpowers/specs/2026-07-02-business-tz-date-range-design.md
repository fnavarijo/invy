# Business-timezone date range handling — design

**Date:** 2026-07-02
**Status:** Reviewed — technical claims validated empirically by Node.js expert review (2026-07-02, Node 24.13.1 / date-fns-tz 3.2.0 / vitest 4.1.9)
**Branch:** `fix/business-tz-date-range`

## Problem

Filtering the dashboard by `/?issued_from=2026-07-01&issued_to=2026-08-01` reports 472
invoices even though the database contains **zero** invoices issued in July. The 472 are
exactly the invoices issued on **June 30 (Guatemala time)**.

Root cause, in `apps/web/lib/date-range.ts` (`parseDateRangeParams`):

1. `new Date('2026-07-01')` — the ECMAScript spec parses a *date-only* string as **UTC
   midnight** (`2026-07-01T00:00:00Z`).
2. In Guatemala (UTC-6) that instant is **June 30, 18:00 local**.
3. `parsedFrom.setHours(0, 0, 0, 0)` snaps to local midnight of the local day the instant
   falls on — now June 30. The whole window silently slides one day earlier.

The same *server-timezone dependence* exists in every function of the module, latent today
only because the dev machine runs in Guatemala time:

- `getPresetRange` — builds boundaries with local-time constructors/`setHours`. On a UTC
  server, "Este mes" would start/end at UTC midnight, 6 hours early.
- `toDateInputValue` — `iso.slice(0, 10)` extracts the **UTC** date part; for an instant
  like `2026-08-01T05:59:59.999Z` (= Jul 31, 23:59 GT) it returns `2026-08-01`, the wrong
  day. This also feeds `getActivePreset` in the filter, so preset highlighting breaks.
- `formatDate` — `toLocaleDateString('es-GT', …)` without `timeZone` renders in the
  server/browser zone.

## Decision (confirmed with user)

**Day boundaries are defined by a fixed business timezone: `America/Guatemala`.**
SAT invoices are issued in Guatemala time; totals must be identical for every viewer,
every server, and every shared URL. Per-viewer timezones and UTC-day semantics were
considered and rejected (ambiguous shared URLs / wrong domain semantics respectively).

**Library: `date-fns-tz`** (with its `date-fns` peer dependency), added to `apps/web`
only. It converts wall-clock times in a named IANA zone to UTC instants using the
platform `Intl` data — tiny, tree-shakeable, no bundled tz database. The Temporal API
would be the long-term answer but is not yet unflagged in Node 24; a hard-coded `-06:00`
offset was rejected as a magic constant that breaks if Guatemala ever changes clock rules.

## Design

Nearly all changes live in `apps/web/lib/date-range.ts`, which becomes the single module
that owns business-timezone logic. Its public API and the `DateRange` shape
(`{ issuedFrom, issuedTo }` as full ISO-8601 UTC instants) are unchanged. The only other
edit is deduplicating `batch-header.tsx` (see Display helpers). The API server is
untouched — it already receives full ISO instants.

```
apps/web/lib/date-range.ts
├── BUSINESS_TIME_ZONE = 'America/Guatemala'   (new, exported)
├── startOfDayInBusinessTz(date: 'YYYY-MM-DD') → Date   (internal)
│     fromZonedTime(`${date}T00:00:00.000`, BUSINESS_TIME_ZONE)
├── endOfDayInBusinessTz(date: 'YYYY-MM-DD') → Date     (internal)
│     fromZonedTime(`${date}T23:59:59.999`, BUSINESS_TIME_ZONE)
├── todayInBusinessTz() → 'YYYY-MM-DD'                  (internal)
│     formatInTimeZone(new Date(), BUSINESS_TIME_ZONE, 'yyyy-MM-dd')
├── parseDateRangeParams(from, to)   — rewritten on the helpers
├── getPresetRange(preset)           — rewritten on the helpers
├── toDateInputValue(iso)            — formatInTimeZone(iso, TZ, 'yyyy-MM-dd')
└── formatDate(date)                 — adds timeZone: BUSINESS_TIME_ZONE
```

### `parseDateRangeParams`

- **Tightened contract:** params must match `^\d{4}-\d{2}-\d{2}$` *and* denote a real
  calendar date (reject `2026-02-30`); anything else falls back to `defaultRange()`.
  Note this is a deliberate tightening, not today's behavior: currently
  `new Date('2026-02-30')` silently rolls over to March 2 and non-ISO formats like
  `'07/01/2026'` parse successfully. No real-world regression: the only producer
  (`date-range-filter.tsx`) always emits date-only strings from
  `<input type="date">` / `toDateInputValue`.
- Ordering check compares the date strings lexicographically (valid for ISO dates).
- Boundaries: `from → startOfDayInBusinessTz`, `to → endOfDayInBusinessTz`.
- Semantics stay **inclusive** on both ends (the API filters with `<=`), so
  `issued_to=2026-08-01` means "through the end of Aug 1 GT". A July-only query is
  `issued_from=2026-07-01&issued_to=2026-07-31` — this is what the filter UI produces.

### `getPresetRange`

Calendar arithmetic must not touch server-local `Date` methods. Approach:

1. Get today's Guatemala wall date via `todayInBusinessTz()`.
2. Do all calendar math (minus 30 days, first/last day of month, minus 3 months, Jan 1)
   on a **UTC-anchored** date built with `Date.UTC(y, m, d)` using only `getUTC*` /
   `setUTC*` accessors, then format the result back to `'YYYY-MM-DD'` from UTC parts.
   UTC anchoring makes the arithmetic deterministic on any server; the business zone
   enters only at the conversion edges (steps 1 and 3).
3. Convert the resulting date strings with `startOfDayInBusinessTz` /
   `endOfDayInBusinessTz`.

Preset definitions (unchanged in intent, now expressed as GT wall dates):

| Preset | From | To |
|---|---|---|
| `last-30-days` | today − 30 days | today |
| `this-month` | 1st of current month | last day of current month |
| `last-month` | 1st of previous month | last day of previous month |
| `last-3-months` | today − 3 months | today |
| `this-year` | Jan 1 of current year | today |

### Display helpers

- `toDateInputValue(iso)` → `formatInTimeZone(iso, BUSINESS_TIME_ZONE, 'yyyy-MM-dd')`.
  Fixes the wrong-day bug and keeps `getActivePreset` round-tripping correctly.
- `formatDate(date)` → same implementation plus `timeZone: BUSINESS_TIME_ZONE` in the
  `toLocaleDateString` options, so invoice dates render as GT dates everywhere
  (used by `invoice-table/columns.tsx`).
- `components/pages/batch-detail/batch-header.tsx` defines its own local `formatDate`
  duplicate with the same missing-`timeZone` defect. It is folded into this change:
  delete the local copy and import the shared `formatDate` from `lib/date-range.ts`,
  consistent with the single-owner-module goal.

### Dependencies

`pnpm --filter web add date-fns date-fns-tz`. Client bundle impact (tree-shaken to
`fromZonedTime` + `formatInTimeZone`, reached via the `'use client'` filter component):
measured ~28 KB minified / ~8.4 KB gzipped. `date-fns` is required as `date-fns-tz`'s
peer dependency (`^3.0.0 || ^4.0.0`, verified — not bundled).

## Testing (TDD, vitest in `apps/web`)

New `apps/web/lib/__tests__/date-range.test.ts`. Node picks up runtime changes to
`process.env.TZ` (verified on Node 24, including combined with `vi.setSystemTime`), so
the suite is parameterized over server timezones
`['UTC', 'America/Guatemala', 'Asia/Tokyo']` to prove independence — the UTC case fails
against current code (red first), all three must pass after the fix. The suite must
snapshot `process.env.TZ` and restore it in `afterAll` so later `describe` blocks in the
same file don't silently inherit the last parameterized zone (vitest isolates env
mutations per file, not per block).

Key cases:

1. **Regression (the reported bug):** `parseDateRangeParams('2026-07-01', '2026-08-01')`
   returns `issuedFrom === '2026-07-01T06:00:00.000Z'` and
   `issuedTo === '2026-08-02T05:59:59.999Z'` under every TZ. In particular the range
   must exclude `2026-06-30T23:29:59Z` (the latest real invoice).
2. **Fallbacks:** missing params, malformed (`'07/01/2026'`, `'2026-2-3'`), impossible
   (`'2026-02-30'`), reversed order → all return `defaultRange()`.
3. **Presets across day boundaries:** with `vi.setSystemTime('2026-07-01T02:00:00Z')`
   (= Jun 30, 20:00 GT), `this-month` must be **June**, not July; `last-30-days` must
   end `2026-07-01T05:59:59.999Z` (end of Jun 30 GT).
4. **Round-trip:** `toDateInputValue(getPresetRange(p).issuedFrom/issuedTo)` equals the
   expected GT wall dates for each preset (protects `getActivePreset`).
5. **Display:** `toDateInputValue('2026-08-01T05:59:59.999Z') === '2026-07-31'`.

Manual verification (dev DB): July filter → 0 invoices; June filter → includes the 472
of June 30; dashboard default view unchanged.

## Rollout

- Branch `fix/business-tz-date-range` (git worktree; `main` stays untouched).
- Web-only change: no API, worker, DB, or migration impact.

## Out of scope

- Per-user / configurable business timezone (the exported constant leaves the door open).
- API-side validation of date params (it receives full ISO instants and validates them).
- Half-open interval semantics (`<` end bound) — would require API changes for no
  user-visible gain; the 1 ms gap is immaterial at SAT's second-level precision.
- `lib/batch-utils.tsx:34` renders relative "uploaded X ago" freshness with viewer-local
  `toLocaleDateString` — intentionally left as viewer-local (upload freshness, not
  invoice accounting data).
- Month-arithmetic rollover quirk in `last-3-months` (e.g. May 31 − 3 months →
  March 3, not clamped to Feb 28/29). Verified byte-for-byte identical to current
  behavior under the UTC-anchored approach; preserved, not a regression.
