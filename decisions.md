# Fleet manager decisions

Updated: 2026-11-13

This records the working direction from our discussion. Proposals and open questions are called out below; they are not implementation commitments.

## Product scope

Build a focused fleet operations interface for robots deployed across sites. The operator should be able to answer:

- Which robots need attention, and why?
- Where are they?
- What are they doing?
- How current is the information?

Start with a fleet table, summary filters above it, and a detail view for one robot. Stable metadata and live telemetry belong together in the same robot row. We do not currently need separate tables for each.

The assignment allows a frontend implementation with a mocked backend. Whether we also build a server or a separate simulator remains open.

## Fleet table fields

These are the starting fields, not a final data schema.

| Field | Contents | Expected changes |
| --- | --- | --- |
| Robot | Recognizable name, with ID and robot type as secondary information | Rarely |
| Location | Assigned site, plus observed floor or area when available | Site changes rarely; observed area changes when the robot crosses a boundary |
| Activity | Working, idle, charging, blocked, or unknown | On a state transition |
| Battery | Whole percentage and charging indication | Reports may arrive every second; the displayed percentage changes less often |
| Connection | Connected, delayed, or no contact; last-seen information when relevant | When freshness crosses a threshold or contact resumes |
| Attention | A concrete reason such as path blocked, low battery, or contact lost; otherwise none | When an issue appears, changes, or resolves |

### Meaning and freshness

- Assigned site and observed position are different facts. Exact coordinates and a position/map display belong in robot detail rather than the main table.
- Activity, connectivity, and administrative state are separate. Disabled does not mean offline; no contact does not prove that a robot is powered off.
- After contact is lost, location, activity, and battery are last-known information. Do not present them as confirmed current state.
- Missing battery data is unknown, not zero.
- Losing the dashboard's data connection must be distinguishable from individual robots losing contact.
- Preserve timestamps in the data even if the table uses a compact freshness label.

## Summary filters and controls

The working direction is a small set of counts that also act as quick filters, rather than a separate chart-heavy dashboard.

Initial candidates:

- All robots.
- Needs attention.
- No contact.
- Working.

Counts refer to robots, not the number of incidents. Categories can overlap; a robot with no contact may also need attention.

Search and site selection are the primary controls. Additional filters can cover activity, connection, battery, and area. The exact set and layout remain to be chosen.

Counts should have a consistent scope. For example, with Munich selected, all quick-filter counts describe Munich. Selecting Needs attention should not make every other count describe only the already-filtered attention results.

### Proposed attention rules

- A reported fault or blocked operation.
- Low battery while not charging.
- Lost contact when the robot is expected to be connected.

These are proposed demo rules. Battery thresholds, freshness timeouts, expected connectivity, and treatment of robots taken out of service still need definitions. A single missed report should not automatically mean no contact.

## Live updates and ordering

Use roughly one second as the initial display-update target, matching the assignment's approximate telemetry cadence. This is a working target, not a guarantee that every cell or count changes every second.

- Derive table values and summary counts from a consistent state snapshot.
- Only change displayed values when their meaning changes. Receiving another identical report does not need a visual effect.
- Display battery as a whole percentage; avoid unnecessary decimal changes.
- Batch incoming robot updates rather than rendering separately for every message.
- Keep robot identity stable by ID across updates and navigation.
- Keep an opened robot detail attached to its ID if its table position or filter membership changes.

The working sorting proposal is alphabetical robot name, with robot ID breaking ties. An explicit default is more predictable than relying on arrival order or server return order.

Initially, sorting can be limited to stable metadata such as name, assigned site, and type. Sorting by battery, activity, connection, attention, or current area is not currently planned. Filters provide access to these operational subsets, but filtering and prioritizing by sort order are different capabilities.

### Deferred: live result membership

We have not decided what happens when a robot starts or stops matching an active filter.

Disabling dynamic sorting does not solve this: a recovered robot can still leave Needs attention, causing other rows to move or another row to enter the page.

Options discussed include live membership, a paused snapshot, and holding the result set while values continue updating. The last option would need an explicit explanation and a way to apply changed results. None is selected. Pause behaviour is also open.

Do not implement automatic removal, a no-longer-matches row, or an Update results banner as an agreed requirement yet.

## Navigation and scale

Pagination is the current recommendation, not a confirmed choice. A proposed default is 25 rows, with 50 and 100 as options. A finite scrolling table with virtualization remains an alternative. Endless automatic loading is not the preferred starting direction.

Pagination controls navigation. Virtualization controls how many rows are rendered. They can coexist, and neither solves changing filter membership or live reordering.

For larger fleets, filtering and sorting must cover the full result set before pagination. Subscribing only to visible robot IDs would miss an off-page robot entering a filter. The production approach to query membership, subscriptions, and fleet-wide counts remains open.

## Robot detail

Proposed contents:

- Exact position and its timestamp, with spatial context when available.
- Current activity or task context.
- Active attention reasons and recent events.
- Battery history.
- Manufacturer, model, and administrative state.

These are candidates, not a requirement to build all of them. Keep the initial feature set focused.

## Accessibility and usability

- Keep the interface calm: no routine blinking, pulsing, flashing, or row-movement animations.
- Accompany status colors and icons with text.
- Keep row heights stable and reserve space for changing numbers.
- Provide keyboard access to robot details, filters, sorting, and navigation, with visible focus.
- Preserve focus across telemetry updates. Define how to handle a focused row leaving results once membership behaviour is chosen.
- Expose table headers and sort state to assistive technology.
- Announce meaningful status messages without announcing every telemetry tick.
- Make freshness, paused state, and connection problems explicit.
- If using virtualization, verify keyboard and screen-reader navigation rather than assuming the library handles it adequately.

## Technology and personalization

No table library, UI kit, or telemetry transport has been selected. AG Grid Community, TanStack Table with shadcn, and MUI X were discussed. The table engine and the rest of the UI kit are separate choices.

Possible personalization includes visible columns, row density, page size, and saved filters/sorting. This is optional scope. An arbitrary dashboard builder is not part of the current plan.

## Research informing the direction

- [Formant overview configuration](https://docs.formant.io/docs/getting-started-configure-the-overview-page) and [telemetry columns](https://docs.formant.io/docs/add-a-stream-to-the-overview-page): a robot-per-row list, configurable streams, filtering, and an offline timeout.
- [InOrbit documentation](https://www.inorbit.ai/docs): a fleet health matrix and a Summary View that drills from aggregate health counts into matching robots. Borrow the summary-to-detail interaction without committing to the matrix presentation.
- [TanStack pagination guide](https://tanstack.com/table/latest/docs/framework/react/guide/pagination): pagination, virtualization, and server-side processing address different concerns.
- [AG Grid accessibility guidance](https://www.ag-grid.com/react-data-grid/accessibility/) and [W3C table properties](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/): rendering and navigation choices need explicit accessibility consideration.

Public competitor screenshots illustrate product patterns. They do not establish the current implementation or exact live-update behaviour of either product.
