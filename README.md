# Work Order Schedule Timeline

Angular 17 implementation of the Naologic frontend technical test — a manufacturing work-order scheduling timeline.

---

## How to Run

**Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
# Install dependencies
npm install

# Start dev server
npm start
# → http://localhost:4200
```

```bash
# Production build
npm run build
```

```bash
# Run unit tests (headless)
npm test -- --watch=false --browsers=ChromeHeadless
```

No environment variables or backend services are required. The app is fully self-contained with hardcoded sample data and localStorage persistence.

---

## Approach

### Architecture

The app is structured around three layers:

1. **Core** (`src/app/core/`) — models, sample data, date utilities. No Angular-specific code; pure TypeScript.
2. **Store** (`timeline.store.ts`) — Angular injectable using signals as the reactive state layer. Owns all CRUD operations and overlap validation. Persists to localStorage.
3. **Features** (`src/app/features/`) — two standalone components:
   - `TimelinePageComponent` — the main grid, interactions, tooltip, timescale switching
   - `WorkOrderPanelComponent` — the create/edit slide-out panel with reactive form

### Timeline Positioning

All bar positions are calculated as pixel offsets from the visible range start:

```
left  = diffInDays(startDate, visibleRangeStart) × dayWidth
width = diffInDays(endDate + 1, visibleRangeStart) × dayWidth − left
```

Zoom levels change only `dayWidth` and `bufferDays` — the same date math applies at every scale.

### State Management

Angular signals (`signal`, `computed`) are used throughout — no RxJS, no NgRx. `TimelineStore` is `providedIn: 'root'` and exposes read-only signals; mutations go through typed methods that return `{ ok: true } | { ok: false; error: string }`.

---

## Libraries Used

| Library | Why |
|---------|-----|
| `@ng-select/ng-select` | Spec-required; provides the Status dropdown with custom option templates |
| `@ng-bootstrap/ng-bootstrap` | Spec-required; `NgbDatepicker` with a custom `NgbDateParserFormatter` for MM.DD.YYYY display |
| `bootstrap` | Base CSS reset and utility layer; ng-bootstrap peer dependency |
| Angular Signals | Reactive state without RxJS boilerplate; fine-grained updates without OnPush needed |

---

## Features Implemented

### Core (Required)
- Timeline grid — fixed work-center column, horizontally scrollable timeline
- Current day indicator — indigo vertical line + dark "Current week/month/…" capsule
- Zoom levels: **Hour / Day / Week / Month** — header segments and grid lines adapt per zoom
- Work order bars — date-based positioning, all 4 status colours and badges
- Three-dot menu (hover-only) — Edit / Delete actions
- Create panel — click empty timeline row, start date prefilled from click position, end date = start + 7 days
- Edit panel — opens from three-dot menu, form prepopulated, Save/Create button label changes per mode
- Overlap detection — blocks create/save, surfaces error inline in form
- Reactive form validation — required fields, end-date-after-start-date cross-validator

### Bonus
- **localStorage persistence** — work orders survive page refresh (versioned key `v2` discards stale data)
- **Smooth animations** — panel slides in/out 240 ms cubic-bezier, dropdown fade-in, bar hover lift
- **Keyboard navigation** — Escape closes panel/menu/dropdown
- **Today button** — jumps viewport to center on today
- **Tooltip on bar hover** — shows name, status, date range
- **Click outside closes panel** — clicking the timeline area dismisses the panel; datepicker/ng-select portals excluded
- **Unit tests** — 7 tests covering date math, overlap logic, localStorage, form validation

---

## Sample Data

| # | Work Center | Work Order | Status |
|---|-------------|------------|--------|
| 1 | Genesis Hardware | Centrix Ltd | complete |
| 2 | Genesis Hardware | Genesis Batch B | in-progress |
| 3 | Rodriques Electrics | Rodriques Electrics | in-progress |
| 4 | Konsulting Inc | Konsulting Inc | in-progress |
| 5 | Konsulting Inc | Compleks Systems | in-progress |
| 6 | McMarrow Distribution | McMarrow Distribution | blocked |
| 7 | Spartan Manufacturing | Spartan Distribution | open |
| 8 | Spartan Manufacturing | Spartan Express Run | complete |

All dates are relative to today so bars are always visible on load.

---

## File Map

```
src/app/
├── core/
│   ├── data/sample-data.ts          — hardcoded work centers + work orders
│   ├── models/                       — TypeScript interfaces (WorkCenter, WorkOrder, Timeline)
│   └── utils/date.utils.ts           — addDays, diffInDays, fromIsoDate, rangesOverlap
├── features/
│   ├── timeline/
│   │   ├── timeline.store.ts         — signal-based state, CRUD, overlap validation, localStorage
│   │   ├── timeline-math.ts          — dateToX, xToDate, buildDayColumns, buildHeaderSegments
│   │   ├── timeline-page.component.* — main grid UI, interactions, timescale switching
│   │   └── *.spec.ts                 — unit tests for math and store
│   └── work-order-panel/
│       ├── work-order-panel.component.* — create/edit reactive form panel
│       └── *.spec.ts                    — form validation tests
└── styles.scss                       — design tokens (CSS custom properties), ng-select/datepicker overrides
```

---

## Loom Demo Checklist

- [ ] Show Day / Week / Month switching and grid adapting
- [ ] Create new work order by clicking empty timeline row
- [ ] Edit existing order via three-dot menu
- [ ] Delete existing order via three-dot menu
- [ ] Trigger overlap error scenario
- [ ] Show localStorage persistence (refresh page)
- [ ] Brief walkthrough of `timeline.store.ts` and `timeline-math.ts`

---

## Design Assets

The Sketch file and all exported artboards live in `src/assets/designs/`:

```
src/assets/designs/
├── FE Take-Home Challenge.sketch          ← source design file
├── Work Order Schedule - Default.png
├── Work Order Schedule - View Selection.png
├── Work Order Schedule - Options CTA Controls (shown on hover).png
├── Work Order Schedule - Edit and Delete Controls Expanded.png
├── Work Order Schedule - Create New Event - With Selection.png
├── Work Order Schedule - Create New Event - Placeholder and Defaults.png
├── Work Order Schedule - Create New Event - Active Text Field.png
├── Work Order Schedule - Create New Event - Status Dropdown.png
├── Triangle*.svg                          ← cursor/pointer SVG exports
└── Cursor/Hand/Pointing.svg
```

They are included in the Angular build via the `assets` entry in `angular.json` and are available at `/assets/designs/…` at runtime.

---

## Trade-offs & Notes

- **Hour zoom** is included beyond the spec's Day/Week/Month for completeness; it uses 120 px/day and a ±4-day buffer.
- **Work Center is not shown** in the create/edit panel — it is inferred from the row the user clicked, matching the reference design. For the edit flow the existing `workCenterId` is preserved.
- **No virtual scrolling** — the visible range is bounded by `bufferDays` so the DOM stays manageable. Infinite scroll is tagged `@upgrade` in `timeline.store.ts`.
- **Date format** — MM.DD.YYYY with dot separators via a custom `NgbDateParserFormatter`; matches the Sketch reference placeholder.
