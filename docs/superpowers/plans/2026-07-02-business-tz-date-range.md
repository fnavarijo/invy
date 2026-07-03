# Business-Timezone Date Range Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all dashboard date-range boundaries resolve to `America/Guatemala` days regardless of server timezone, fixing the one-day window shift reported in GitHub issue #5.

**Architecture:** All timezone logic is concentrated in `apps/web/lib/date-range.ts`, which converts `YYYY-MM-DD` wall dates to UTC instants via `date-fns-tz` (`fromZonedTime`/`formatInTimeZone`). Preset calendar arithmetic is UTC-anchored (`Date.UTC` + `getUTC*`/`setUTC*` only) so the server zone never leaks in. The module's public API and the `DateRange` shape (`{ issuedFrom, issuedTo }`, full ISO instants) are unchanged; the API server is untouched. One consumer (`batch-header.tsx`) is deduplicated onto the shared `formatDate`.

**Tech Stack:** Next.js 16 web app, TypeScript, vitest 4 (jsdom, project `app-web`), `date-fns-tz@^3` + `date-fns@^4` (new, web-only), pnpm 10 workspaces.

**Spec:** `docs/superpowers/specs/2026-07-02-business-tz-date-range-design.md` (Status: Reviewed). Read it before starting.

## Global Constraints

- Business timezone is the constant `BUSINESS_TIME_ZONE = 'America/Guatemala'`, exported from `apps/web/lib/date-range.ts`. No other module defines timezone logic.
- New dependencies (`date-fns`, `date-fns-tz`) go in `apps/web` ONLY. Nothing is added to `apps/api`, `apps/worker`, or `packages/*`.
- `DateRange` stays `{ issuedFrom: string; issuedTo: string }` with full ISO-8601 UTC instants (`.toISOString()` output). Range semantics stay inclusive on both ends (`from` day 00:00:00.000 GT through `to` day 23:59:59.999 GT).
- URL params contract: `issued_from`/`issued_to` must match `^\d{4}-\d{2}-\d{2}$` AND be a real calendar date; anything else → `defaultRange()`.
- Tests must pass under all three server timezones `UTC`, `America/Guatemala`, `Asia/Tokyo` (parameterized via runtime `process.env.TZ`, verified working on Node 24).
- All work happens on branch `fix/business-tz-date-range` in a git worktree; `main` checkout is never modified.
- Commit messages: short imperative sentence, reference `#5` where relevant, and end the body with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run tests with: `pnpm --filter web test run --project app-web <path>` (the `storybook` vitest project needs a browser; don't run it for these tasks).

---

### Task 1: Worktree, branch, dependencies, docs commit

**Files:**
- Create: git worktree at `<repo>/.claude/worktrees/business-tz-date-range`, branch `fix/business-tz-date-range` off `main`
- Create (copy into worktree): `docs/superpowers/specs/2026-07-02-business-tz-date-range-design.md`, `docs/superpowers/plans/2026-07-02-business-tz-date-range.md`
- Modify: `apps/web/package.json` (via `pnpm add`)

**Interfaces:**
- Consumes: nothing.
- Produces: a ready worktree (all later tasks run inside it) with `date-fns` and `date-fns-tz` importable from `apps/web`.

- [ ] **Step 1: Create the worktree and branch**

Use the `superpowers:using-git-worktrees` skill if executing interactively. Equivalent commands:

```bash
MAIN=/home/fnavarijo/Documents/FreedomProjects/invy
git -C "$MAIN" worktree add "$MAIN/.claude/worktrees/business-tz-date-range" -b fix/business-tz-date-range main
cd "$MAIN/.claude/worktrees/business-tz-date-range"
```

All subsequent task commands run from this worktree root unless stated otherwise.

- [ ] **Step 2: Copy untracked docs and env files from the main checkout**

`docs/superpowers/` and `.env*` files are untracked in `main`, so the worktree lacks them:

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp "$MAIN/docs/superpowers/specs/2026-07-02-business-tz-date-range-design.md" docs/superpowers/specs/
cp "$MAIN/docs/superpowers/plans/2026-07-02-business-tz-date-range.md" docs/superpowers/plans/
find "$MAIN/apps/web" -maxdepth 1 -name ".env*" -exec cp {} apps/web/ \;
```

- [ ] **Step 3: Install workspace deps, then add the date libraries to web only**

```bash
pnpm install
pnpm --filter web add date-fns date-fns-tz
```

Expected: `apps/web/package.json` gains `"date-fns": "^4..."` and `"date-fns-tz": "^3..."`. Verify no other `package.json` changed: `git status --short` shows only `apps/web/package.json`, `pnpm-lock.yaml`, and the docs files.

- [ ] **Step 4: Sanity-check the library resolves the business zone independent of process TZ**

```bash
cd apps/web && TZ=Asia/Tokyo node -e "import('date-fns-tz').then(m => console.log(m.fromZonedTime('2026-07-01T00:00:00.000', 'America/Guatemala').toISOString()))" && cd ../..
```

Expected output: `2026-07-01T06:00:00.000Z` (the Tokyo process TZ must not affect it).

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers apps/web/package.json pnpm-lock.yaml
git commit -m "Add date-fns-tz and business-tz date-range design docs (refs #5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Business-tz helpers + `parseDateRangeParams` (TDD)

**Files:**
- Create: `apps/web/lib/__tests__/date-range.test.ts`
- Modify: `apps/web/lib/date-range.ts` (add imports/constants/helpers; replace `parseDateRangeParams`)

**Interfaces:**
- Consumes: `fromZonedTime` from `date-fns-tz` (Task 1).
- Produces (used by Tasks 3–4):
  - `export const BUSINESS_TIME_ZONE = 'America/Guatemala'`
  - `function startOfDayInBusinessTz(dateStr: string): Date` (module-private)
  - `function endOfDayInBusinessTz(dateStr: string): Date` (module-private)
  - `parseDateRangeParams(from: string | string[] | undefined, to: string | string[] | undefined): DateRange` (unchanged signature)

- [ ] **Step 1: Write the failing tests**

Create `apps/web/lib/__tests__/date-range.test.ts`:

```ts
import { describe, test, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';

import { parseDateRangeParams, defaultRange } from '../date-range';

const ORIGINAL_TZ = process.env.TZ;
const TIMEZONES = ['UTC', 'America/Guatemala', 'Asia/Tokyo'] as const;

afterAll(() => {
  // Later describe blocks in this file must not inherit the last parameterized zone
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe.each(TIMEZONES)('date-range under server TZ %s', (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    // Fixed "now": 2026-07-02 09:00 in Guatemala
    vi.setSystemTime(new Date('2026-07-02T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseDateRangeParams', () => {
    test('maps date-only params to Guatemala day boundaries (regression #5)', () => {
      const range = parseDateRangeParams('2026-07-01', '2026-08-01');
      expect(range.issuedFrom).toBe('2026-07-01T06:00:00.000Z');
      expect(range.issuedTo).toBe('2026-08-02T05:59:59.999Z');
    });

    test('July window excludes the last June instant', () => {
      const range = parseDateRangeParams('2026-07-01', '2026-07-31');
      expect(new Date(range.issuedFrom).getTime()).toBeGreaterThan(
        new Date('2026-06-30T23:29:59Z').getTime(),
      );
    });

    test('uses the first element of array params', () => {
      const range = parseDateRangeParams(['2026-07-01', '2026-01-01'], ['2026-07-31']);
      expect(range.issuedFrom).toBe('2026-07-01T06:00:00.000Z');
      expect(range.issuedTo).toBe('2026-08-01T05:59:59.999Z');
    });

    test.each([
      ['missing from', undefined, '2026-07-31'],
      ['missing to', '2026-07-01', undefined],
      ['non-ISO format', '07/01/2026', '07/31/2026'],
      ['non-padded date', '2026-7-1', '2026-7-31'],
      ['impossible calendar date', '2026-02-30', '2026-03-05'],
      ['reversed order', '2026-08-01', '2026-07-01'],
    ])('falls back to defaultRange when %s', (_label, from, to) => {
      expect(parseDateRangeParams(from, to)).toEqual(defaultRange());
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: FAIL. The regression test fails in all three TZ legs (received `2026-06-30T06:00:00.000Z` under `America/Guatemala`, `2026-07-01T00:00:00.000Z` under `UTC`, `2026-06-30T15:00:00.000Z` under `Asia/Tokyo`). The `non-ISO format` and `impossible calendar date` fallback cases also fail (current code parses them). `missing`/`reversed` cases already pass — that's fine; the suite as a whole must be red.

- [ ] **Step 3: Implement helpers and replace `parseDateRangeParams`**

In `apps/web/lib/date-range.ts`, add at the top of the file (after the existing type/label declarations is fine, but before first use):

```ts
import { fromZonedTime } from 'date-fns-tz';

/** All invoice "days" are SAT (Guatemala) days, independent of server/viewer timezone. */
export const BUSINESS_TIME_ZONE = 'America/Guatemala';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rejects rollover dates like 2026-02-30, which new Date() silently accepts as March 2. */
function isRealCalendarDate(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

function startOfDayInBusinessTz(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00.000`, BUSINESS_TIME_ZONE);
}

function endOfDayInBusinessTz(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, BUSINESS_TIME_ZONE);
}
```

Replace the entire body of `parseDateRangeParams` (keep its JSDoc, update the wording):

```ts
/**
 * Parses `issued_from` / `issued_to` URL search params as YYYY-MM-DD
 * Guatemala calendar dates (inclusive on both ends).
 * Falls back to the default range if params are missing or invalid.
 */
export function parseDateRangeParams(
  from: string | string[] | undefined,
  to: string | string[] | undefined,
): DateRange {
  const fallback = defaultRange();

  const fromStr = Array.isArray(from) ? from[0] : from;
  const toStr = Array.isArray(to) ? to[0] : to;

  if (!fromStr || !toStr) return fallback;
  if (!DATE_ONLY_RE.test(fromStr) || !DATE_ONLY_RE.test(toStr)) return fallback;
  if (!isRealCalendarDate(fromStr) || !isRealCalendarDate(toStr)) return fallback;
  // Lexicographic comparison is chronological for fixed-width ISO dates
  if (toStr < fromStr) return fallback;

  return {
    issuedFrom: startOfDayInBusinessTz(fromStr).toISOString(),
    issuedTo: endOfDayInBusinessTz(toStr).toISOString(),
  };
}
```

Do not touch `getPresetRange`, `toDateInputValue`, or `formatDate` yet (Tasks 3–4).

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: PASS (all three TZ legs).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/date-range.ts apps/web/lib/__tests__/date-range.test.ts
git commit -m "Parse date filters as Guatemala day boundaries, timezone-independent (refs #5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `getPresetRange` on UTC-anchored arithmetic (TDD)

**Files:**
- Modify: `apps/web/lib/date-range.ts` (replace `getPresetRange`; add `todayInBusinessTz`, anchor helpers, `formatInTimeZone` import)
- Modify: `apps/web/lib/__tests__/date-range.test.ts` (add describe block)

**Interfaces:**
- Consumes: `startOfDayInBusinessTz`, `endOfDayInBusinessTz`, `BUSINESS_TIME_ZONE` (Task 2).
- Produces: `getPresetRange(preset: DatePreset): DateRange` (unchanged signature), `function todayInBusinessTz(): string` (module-private). `defaultRange()` is unchanged code but now fully business-tz correct.

- [ ] **Step 1: Write the failing tests**

Add inside the existing `describe.each(TIMEZONES)` block (after the `parseDateRangeParams` describe), and extend the import at the top of the test file to include `getPresetRange`:

```ts
import { parseDateRangeParams, getPresetRange, defaultRange } from '../date-range';
```

```ts
  describe('getPresetRange', () => {
    // Default fake now (from beforeEach): 2026-07-02T15:00:00Z = Jul 2, 09:00 GT

    test('this-month spans the full GT month', () => {
      expect(getPresetRange('this-month')).toEqual({
        issuedFrom: '2026-07-01T06:00:00.000Z',
        issuedTo: '2026-08-01T05:59:59.999Z',
      });
    });

    test('last-month spans the full previous GT month', () => {
      expect(getPresetRange('last-month')).toEqual({
        issuedFrom: '2026-06-01T06:00:00.000Z',
        issuedTo: '2026-07-01T05:59:59.999Z',
      });
    });

    test('last-30-days ends at the end of GT today', () => {
      expect(getPresetRange('last-30-days')).toEqual({
        issuedFrom: '2026-06-02T06:00:00.000Z', // Jul 2 − 30 days = Jun 2
        issuedTo: '2026-07-03T05:59:59.999Z', // end of Jul 2 GT
      });
    });

    test('last-3-months starts three calendar months back', () => {
      expect(getPresetRange('last-3-months')).toEqual({
        issuedFrom: '2026-04-02T06:00:00.000Z',
        issuedTo: '2026-07-03T05:59:59.999Z',
      });
    });

    test('this-year starts at GT Jan 1', () => {
      expect(getPresetRange('this-year')).toEqual({
        issuedFrom: '2026-01-01T06:00:00.000Z',
        issuedTo: '2026-07-03T05:59:59.999Z',
      });
    });

    test('uses the GT calendar day when UTC has already rolled over', () => {
      // 2026-07-01T02:00:00Z is still Jun 30, 20:00 in Guatemala
      vi.setSystemTime(new Date('2026-07-01T02:00:00Z'));

      expect(getPresetRange('this-month')).toEqual({
        issuedFrom: '2026-06-01T06:00:00.000Z', // June, NOT July
        issuedTo: '2026-07-01T05:59:59.999Z',
      });
      expect(getPresetRange('last-30-days')).toEqual({
        issuedFrom: '2026-05-31T06:00:00.000Z', // Jun 30 − 30 days = May 31
        issuedTo: '2026-07-01T05:59:59.999Z', // end of Jun 30 GT
      });
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: FAIL. The `UTC` and `Asia/Tokyo` legs fail every new test (boundaries computed in server-local time). The `America/Guatemala` leg passes them (current code is accidentally correct there) — red overall is what matters. Task 2's tests must still pass.

- [ ] **Step 3: Replace `getPresetRange`**

In `apps/web/lib/date-range.ts`, extend the `date-fns-tz` import:

```ts
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
```

Add next to the other helpers:

```ts
function todayInBusinessTz(): string {
  return formatInTimeZone(new Date(), BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
}

/**
 * Calendar arithmetic on YYYY-MM-DD strings, anchored at UTC midnight so the
 * server timezone can never influence the result.
 */
function toUtcAnchor(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

function toDateStr(anchor: Date): string {
  return anchor.toISOString().slice(0, 10);
}
```

Replace the entire `getPresetRange` function:

```ts
export function getPresetRange(preset: DatePreset): DateRange {
  const today = todayInBusinessTz();
  const anchor = toUtcAnchor(today);

  let fromStr: string;
  let toStr: string;

  switch (preset) {
    case 'last-30-days': {
      const from = new Date(anchor);
      from.setUTCDate(from.getUTCDate() - 30);
      fromStr = toDateStr(from);
      toStr = today;
      break;
    }
    case 'this-month': {
      fromStr = toDateStr(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1)));
      toStr = toDateStr(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)));
      break;
    }
    case 'last-month': {
      fromStr = toDateStr(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1)));
      toStr = toDateStr(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0)));
      break;
    }
    case 'last-3-months': {
      const from = new Date(anchor);
      from.setUTCMonth(from.getUTCMonth() - 3);
      fromStr = toDateStr(from);
      toStr = today;
      break;
    }
    case 'this-year': {
      fromStr = toDateStr(new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1)));
      toStr = today;
      break;
    }
  }

  return {
    issuedFrom: startOfDayInBusinessTz(fromStr).toISOString(),
    issuedTo: endOfDayInBusinessTz(toStr).toISOString(),
  };
}
```

`defaultRange()` needs no change (it delegates to `getPresetRange('last-30-days')`).

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: PASS, all three TZ legs, Tasks 2+3 suites.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/date-range.ts apps/web/lib/__tests__/date-range.test.ts
git commit -m "Compute preset date ranges on Guatemala calendar days (refs #5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `toDateInputValue` + `formatDate` display helpers (TDD)

**Files:**
- Modify: `apps/web/lib/date-range.ts` (replace both functions)
- Modify: `apps/web/lib/__tests__/date-range.test.ts` (add describe blocks)

**Interfaces:**
- Consumes: `BUSINESS_TIME_ZONE`, `formatInTimeZone` (Task 3), `getPresetRange` (Task 3).
- Produces (Task 5 consumes `formatDate`):
  - `toDateInputValue(iso: string): string` (unchanged signature)
  - `formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string` — NEW optional `options` param; existing zero-option callers are unaffected.

- [ ] **Step 1: Write the failing tests**

Extend the test-file import:

```ts
import {
  parseDateRangeParams,
  getPresetRange,
  defaultRange,
  toDateInputValue,
  formatDate,
} from '../date-range';
```

Add inside the `describe.each(TIMEZONES)` block:

```ts
  describe('toDateInputValue', () => {
    test('formats instants as GT calendar dates', () => {
      // Jul 31, 23:59:59.999 GT — the UTC date part would wrongly be Aug 1
      expect(toDateInputValue('2026-08-01T05:59:59.999Z')).toBe('2026-07-31');
      expect(toDateInputValue('2026-07-01T06:00:00.000Z')).toBe('2026-07-01');
    });

    test('round-trips preset boundaries (protects getActivePreset)', () => {
      const range = getPresetRange('this-month');
      expect(toDateInputValue(range.issuedFrom)).toBe('2026-07-01');
      expect(toDateInputValue(range.issuedTo)).toBe('2026-07-31');
    });
  });

  describe('formatDate', () => {
    test('renders the GT wall date in es-GT short format', () => {
      expect(formatDate('2026-08-01T05:59:59.999Z')).toBe('31/07/2026');
    });

    test('accepts Intl option overrides while keeping the business zone', () => {
      expect(
        formatDate('2026-08-01T05:59:59.999Z', { day: 'numeric', month: 'long' }),
      ).toBe('31 de julio de 2026');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: FAIL. Under `UTC`/`Asia/Tokyo`, `toDateInputValue('2026-08-01T05:59:59.999Z')` returns `2026-08-01` and `formatDate` renders the server-local day. The options-override test fails under every TZ (parameter doesn't exist yet — TypeScript error or runtime ignore).

- [ ] **Step 3: Replace both functions**

In `apps/web/lib/date-range.ts`:

```ts
/** Formats a Date for display in es-GT locale, as a Guatemala calendar date */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(date).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
    timeZone: BUSINESS_TIME_ZONE,
  });
}

/** Formats an ISO instant as the GT calendar date for <input type="date"> */
export function toDateInputValue(iso: string): string {
  return formatInTimeZone(iso, BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter web test run --project app-web lib/__tests__/date-range.test.ts
```

Expected: PASS, all three TZ legs, all four describe blocks.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/date-range.ts apps/web/lib/__tests__/date-range.test.ts
git commit -m "Render date values as Guatemala calendar dates (refs #5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Deduplicate `batch-header.tsx` onto shared `formatDate`

**Files:**
- Modify: `apps/web/components/pages/batch-detail/batch-header.tsx:1-18,74`

**Interfaces:**
- Consumes: `formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string` from `@/lib/date-range` (Task 4).
- Produces: no new interfaces; identical rendered output for GT servers, correct output everywhere else.

- [ ] **Step 1: Replace the local formatter**

In `apps/web/components/pages/batch-detail/batch-header.tsx`, delete the local function (lines 11–18):

```tsx
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
```

Add to the imports:

```tsx
import { formatDate } from '@/lib/date-range';
```

Replace the single call site (`Creado el` cell, currently `{formatDate(batch.createdAt)}`):

```tsx
{batch.createdAt ? formatDate(batch.createdAt, { day: 'numeric', month: 'long' }) : '—'}
```

Note the null-check moves inline because the shared helper doesn't accept `null` — this preserves the `'—'` placeholder behavior.

- [ ] **Step 2: Run the full app-web suite and lint**

```bash
pnpm --filter web test run --project app-web
pnpm --filter web lint
```

Expected: all tests PASS, lint clean (in particular no unused-import warnings in `batch-header.tsx`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/pages/batch-detail/batch-header.tsx
git commit -m "Use shared business-tz formatDate in batch header (refs #5)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end verification against the dev database

**Files:** none (verification only). Requires the local API (port 3000) and PostgreSQL from `docker-compose.yml` to be running, and a logged-in Clerk session on `localhost` (cookies are shared across ports, so an existing session from :3001 works).

**Interfaces:**
- Consumes: the running app built from Tasks 2–5.
- Produces: verified behavior; the branch is ready for PR.

- [ ] **Step 1: Start the web app from the worktree on a free port**

```bash
PORT=3002 pnpm --filter web dev
```

Wait for `Ready` in the output.

- [ ] **Step 2: Verify the issue #5 regression is fixed**

Open `http://localhost:3002/?issued_from=2026-07-01&issued_to=2026-08-01`.
Expected: "Facturas en el periodo" shows **0** (the DB has no July invoices). Before the fix this showed 472.

- [ ] **Step 3: Verify June 30 invoices are still counted in June**

Open `http://localhost:3002/?issued_from=2026-06-30&issued_to=2026-06-30`.
Expected: "Facturas en el periodo" shows **472**.

- [ ] **Step 4: Verify the default view and presets are unchanged**

Open `http://localhost:3002/` and compare the three KPI values with `http://localhost:3001/` (main checkout, unfixed) — on this GT-timezone machine they must be identical, since the fix only changes behavior on non-GT servers. Also open the date dropdown and confirm "Últimos 30 días" is highlighted as active (round-trip via `toDateInputValue` intact).

- [ ] **Step 5: Verify a batch detail page renders "Creado el" correctly**

Open `http://localhost:3002/batches`, click any batch, confirm the "Creado el" cell shows a long-form Spanish date (e.g. `15 de junio de 2026`), not `—` or an error.

- [ ] **Step 6: Stop the dev server and record the verification**

Stop the `PORT=3002` process. Then:

```bash
git log --oneline main..HEAD
```

Expected: the five commits from Tasks 1–5. Report verification results to the user and offer to open a PR referencing issue #5 (use the `superpowers:finishing-a-development-branch` skill; do not push or open the PR without the user's go-ahead).
