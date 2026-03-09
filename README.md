# Work Order Schedule — Naologic

An Angular 17 work order scheduling timeline. Displays work orders across work centers on an interactive Gantt-style grid with create, edit, and delete capabilities.

---

## Setup

**Prerequisites:** Node.js ≥ 18, npm ≥ 9

```bash
npm install
npm start
# → http://localhost:4200
```

No environment variables or backend services required. The app is fully self-contained with hardcoded sample data and `localStorage` persistence.

---

## Tests

**Unit tests** (Karma + Jasmine — 43 tests):
```bash
ng test
# or headless:
npm test -- --watch=false --browsers=ChromeHeadless
```

**E2E tests** (Cypress — 19 scenarios, requires dev server running):
```bash
npm run e2e          # headless
npm run e2e:open     # interactive UI
```

---

## Features Implemented

### Timeline Grid
- Fixed left column listing work centers; horizontally scrollable right panel for the timeline
- Three zoom levels — **Day**, **Week**, **Month** — via a timescale split-pill button; header segments and grid-line spacing adapt per zoom
- Vertical grid lines are rendered from the same segment-boundary data as the header cells, so lines align exactly at week/month boundaries regardless of variable month lengths
- **Today indicator** — indigo vertical line positioned at the current date; in Day view it tracks the current hour
- **Current period capsule** — a floating label ("Current day / week / month") above the today line
- **Today button** — scrolls the viewport to center on today

### Work Order Bars
- Each bar is positioned and sized by date math: `left = diffInDays(start, rangeStart) × dayWidth`, width derived similarly
- Color-coded and labeled by status: Open, In Progress, Complete, Blocked
- Status badge shown inside the bar; hidden in compact mode (bar too narrow)
- **Tooltip** follows the cursor showing work order name, status, and date range
- **Three-dot menu** (⋯) appears on bar hover — exposes **Edit** and **Delete**

### Create / Edit Panel
- Click any empty area on a timeline row to open the create panel
- Click position is snapped to the active zoom unit: exact day in Day view, Monday of the week in Week view, 1st of the month in Month view
- A **ghost bar** highlights the snapped slot before clicking; the label re-centers to stay within the bar bounds
- Panel fields: **Name**, **Status**, **End Date**, **Start Date** — all required
- Dates displayed and entered as `MM.DD.YYYY` via a custom `NgbDateParserFormatter`
- Cross-field validation: end date must be after start date
- Overlap detection: blocked when a work order for the same work center overlaps an existing date range; error shown inline
- Edit pre-fills all fields from the selected work order
- Panel closes on Escape, on clicking outside, or on successful submit

### Infinite Scroll
- Visible date range expands automatically when scrolling within 400 px of either edge
- Each expansion adds 180 days on the respective side
- Prepending compensates the scroll offset via `requestAnimationFrame` so the viewport does not jump
- Scroll listener runs outside Angular's zone to avoid unnecessary change-detection cycles

### State & Persistence
- Signal-based in-memory store (`TimelineStore`) using Angular `signal` and `computed` — no RxJS, no NgRx
- Work orders persist to `localStorage` and survive page refresh
- CRUD mutations return `{ ok: true } | { ok: false; error: string }`

### UX
- Row hover highlight synced between the work-center column and the timeline row
- Keyboard: Escape closes open panel, menu, and dropdown
- Click outside dismisses the panel (datepicker and ng-select portals excluded from this check)

---

## Sample Data

6 work centers, 3 work orders each (18 total), covering all four status types with a spread of past, current, and future dates:

| Work Center | Work Orders |
|---|---|
| Genesis Hardware | Sheet Metal Press Run A · CNC Machining Batch B · Hardware Assembly Run C |
| Rodriques Electrics | Transformer Overhaul · Panel Wiring Phase 1 · Circuit Board Assembly |
| Konsulting Inc | Process Audit Sprint A · ERP Integration Sprint B · Systems Audit Q3 |
| McMarrow Distribution | East Coast Delivery Run · Cross-Dock Freight Batch · Warehouse Restock B |
| Spartan Manufacturing | Steel Press Production Q1 · Stamping Run Batch 7 · Finishing Line Q2 |
| Frontier Logistics | North Region Haul Q4 · South Region Delivery · Cross-Country Freight Q1 |

---

## Libraries Used

| Library | Version | Purpose |
|---|---|---|
| Angular | 17.3 | Framework — standalone components, signals, reactive forms |
| @ng-select/ng-select | 12 | Status dropdown in the work order panel |
| @ng-bootstrap/ng-bootstrap | 16 | Date-picker calendar widget |
| Bootstrap | 5.3 | Peer dependency required by ng-bootstrap |
| Karma + Jasmine | 6.4 / 5.1 | Unit and component tests |
| Cypress | 15 | End-to-end browser tests |

---

## Project Structure

```
src/
  app/
    core/
      data/sample-data.ts            seed work centers and work orders
      models/                        TypeScript interfaces (WorkCenter, WorkOrder, Timeline)
      utils/date.utils.ts            addDays, diffInDays, fromIsoDate, rangesOverlap
    features/
      timeline/
        timeline.store.ts            signal-based state, CRUD, overlap validation, localStorage
        timeline-math.ts             dateToX, xToDate, buildDayColumns, buildHeaderSegments
        timeline-page.component.*    main grid, interactions, timescale switching
        *.spec.ts                    unit tests for math and store
      work-order-panel/
        work-order-panel.component.* create/edit reactive form panel
        *.spec.ts                    form and validation tests
  styles.scss                        design tokens (CSS custom properties), global overrides
cypress/
  e2e/timeline.cy.ts                 E2E test suite
```
