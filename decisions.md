# Fleet manager decisions

Updated: 2026-11-15

This records the working direction from our discussion. Proposals and open questions are called out below; they are not implementation commitments.

## Product scope

### Implemented first slice

The dashboard uses a real Next.js API and a SQLite database created from one schema file. Drizzle is the query layer. The standard MUI table shows Robot (name with manufacturer beneath), Type, Registered, Location, Connection, Activity, Battery, and Integration, followed by Actions. Charging is an activity; there is no separate charging flag. Missing telemetry is unknown. Connection freshness is derived from server receipt time; attention rules are implemented below.

Pagination defaults to 20 rows per page, with 10, 20, and 100 available through MUI TablePagination. Changing page size resets to page one. Results are ordered server-side by creation time descending, then ID descending. Count and rows share a database snapshot. Automatic refresh after addition or deletion preserves the page; out-of-range pages are corrected without showing the empty-fleet state. There is no manual Refresh button. Runtime fixtures, demo controls, and artificial delays have been removed.

Robot details read the same persisted records and retain breadcrumbs and not-found handling. Create and permanent delete endpoints exist. The fleet table offers deletion through a stacked-lines Actions menu and confirmation dialog; creation uses an outlined Add robot split button with a plain plus icon: the main action adds one, while the dropdown immediately adds 10 or 100. The empty-state text button adds one. Bulk additions use a single API request and transaction, with one notification and reload; a failed batch writes nothing. A creation form is deferred. Addition and deletion notifications report only mutation outcomes, while refresh failures use the existing table error state. New robots receive metadata only. A new database starts empty and is populated through the Add robot actions. Runtime seed/reset scripts have been removed; telemetry fixtures remain local to tests.

Thin routes remain in `src/app`, UI under `features/fleet-dashboard`, shared robot contracts under `modules/robots`, and backend operations under `server/robots`. Operations accept a connection and remain independent of Next rendering APIs. The database connection is lazy; synchronous reads are excluded from prerendering in the Next adapters. See README for setup and API usage.

This slice targets local development or one Node server with persistent disk. There is no authentication. Dashboard and detail views poll in the background. Metadata and latest telemetry are separate tables; Telemetry ingestion and a separate simulator are implemented; history remains future work. The simulator runs through its own command, outside HTTP request lifetimes. Controls store latest intent and a revision; the simulator acknowledges through telemetry without a command-progress interface.

Build a focused fleet operations interface for robots deployed across sites. The operator should be able to answer:

- Which robots need attention, and why?
- Where are they?
- What are they doing?
- How current is the information?

Start with a fleet table, summary filters above it, and a detail view for one robot. Stable metadata and live telemetry belong together in the same robot row. We do not currently need separate tables for each.

The assignment allows a frontend implementation with a mocked backend. A server is now implemented; a separate HTTP simulator is implemented.

## Fleet table fields

These are the starting fields, not a final data schema.

| Field      | Contents                                                                             | Expected changes                                                             |
| ---------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Robot      | Recognizable name, with manufacturer as secondary information                        | Rarely                                                                       |
| Type       | Cleaning robot, Security robot, Delivery robot, or Inspection robot                  | Rarely                                                                       |
| Location   | Assigned site, plus observed floor or area when available                            | Site changes rarely; observed area changes when the robot crosses a boundary |
| Activity   | Working, idle, returning, charging, needs attention, or unknown                      | On a state transition                                                        |
| Battery    | Whole percentage and charging indication                                             | Reports may arrive every second; the displayed percentage changes less often |
| Connection | Connected, delayed, or no contact; last-seen information when relevant               | When freshness crosses a threshold or contact resumes                        |
| Attention  | A concrete reason such as path blocked, low battery, or contact lost; otherwise none | When an issue appears, changes, or resolves                                  |

Robot type is required stable metadata: Cleaning robot, Security robot, Delivery robot, or Inspection robot. It appears in its own table column and in details. Generated additions select compatible manufacturer/type pairs: Samsung or iRobot for cleaning, LG for delivery, Ascento for security, and Boston Dynamics for inspection; all types currently share the same simulation behaviour. Unknown is reserved for missing telemetry, not robot type. During development, schema changes replace `schema.sql` and reset the local database; preserving existing data is not required.

Integration is stable metadata: ROS 2, VDA5050, or Vendor API. The table and details display it separately from connection health. Generated values illustrate possible integrations and do not assert manufacturer compatibility; all simulated robots still use the existing HTTP ingestion API. Real connectors are deferred.

### Meaning and freshness

- Assigned site and observed position are different facts. Exact coordinates and a position/map display belong in robot detail rather than the main table.
- Activity, connectivity, and administrative state are separate. Disabled does not mean offline; no contact does not prove that a robot is powered off.
- After contact is lost, location, activity, and battery are last-known information. Do not present them as confirmed current state.
- Missing battery data is unknown, not zero.
- Losing the dashboard's data connection must be distinguishable from individual robots losing contact.
- Preserve timestamps in the data even if the table uses a compact freshness label.

## Summary filters and controls

The working direction is a small set of counts that also act as quick filters, rather than a separate chart-heavy dashboard.

Implemented tiles: All robots, Needs attention, Offline, and Low battery. Location (assigned site), Manufacturer, Type, and Integration are single-select dropdowns, combined with the tile through AND. Active selections appear as removable chips; removing the operational chip returns to All robots. Clear filters resets all filters. Filter changes return to page one; refresh and mutations preserve filters and correct invalid pages.

Counts refer to robots, not incidents, and categories overlap. They respect dropdown selections but ignore the selected tile. Metadata choices come from the entire fleet, not current matches. Search is deferred; it will narrow the same scope and all tile counts.

### Attention rules

Needs attention matches Offline OR a reported problem OR critical battery (≤10%, excluding Charging). Offline uses the existing >15-second receipt threshold; Unknown and Delayed alone do not qualify. Low battery uses the last-reported battery ≤15%, including Returning but excluding Charging. Missing battery never qualifies. These filters are derived, without a persisted attention flag. Operational tiles have accessible explanations.

## Live updates and ordering

Poll dashboard and details every five seconds while the simulator reports approximately once a second. This is a working target, not a guarantee that every cell or count changes every second.

- Derive table values and summary counts from a consistent state snapshot.
- Only change displayed values when their meaning changes. Receiving another identical report does not need a visual effect.
- Display battery as a whole percentage; avoid unnecessary decimal changes.
- Batch incoming robot updates rather than rendering separately for every message.
- Keep robot identity stable by ID across updates and navigation.
- Keep an opened robot detail attached to its ID if its table position or filter membership changes.

The current order is newest-added first, using the server-created timestamp and ID descending as a deterministic tie-breaker. User-selectable sorting is deferred.

In future, sorting can be limited to stable metadata such as name, assigned site, and type. Sorting by battery, activity, connection, attention, or current area is not currently planned. Filters provide access to these operational subsets, but filtering and prioritizing by sort order are different capabilities.

### Live result membership

Recompute membership on every five-second refresh. Robots can enter or leave a selected filter as their state changes. Rows, counts, and connection classification use one server snapshot and timestamp. Report-age text can keep ticking. Row menus, filter dropdowns, dialogs, and mutations pause polling; closing resumes it. A removed focused row returns focus to the dashboard heading. There is no held result set or Update results banner.

## Navigation and scale

Pagination is implemented with a default page size of 20 and options for 10, 20, and 100. Virtualization remains an option if larger page sizes become necessary.

Pagination controls navigation. Virtualization controls how many rows are rendered. They can coexist, and neither solves changing filter membership or live reordering.

For larger fleets, filtering and sorting must cover the full result set before pagination. Subscribing only to visible robot IDs would miss an off-page robot entering a filter. The POC uses server-side predicates and aggregates before pagination; production subscriptions remain future work.

## Robot detail

Implemented direction: a dedicated page with identity, connection/activity/battery, and visible activity controls before visual context. A larger location panel shows actual same-site peers at illustrative positions, with twelve compact peer markers per area and additional counts. One SVG schematic is shared by sites; chargers are decorative, with no availability tracking. Four generated type illustrations accompany actual manufacturer/integration metadata. Equipment callouts, exact coordinates, map interaction, and telemetry history are deferred. Context reads share one database snapshot and refresh every five seconds; requests reuse existing action rules and require verified connection data.

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

Material UI is installed as the UI kit, with its Next.js App Router integration and a shared theme using the existing Geist font. Light/dark mode defaults to the system preference; a top-right button allows switching modes and persists the selection locally. No custom visual theme has been chosen yet. The standard Material UI Table is the current table candidate; no separate table engine has been selected. Live updates use HTTP polling.

Possible personalization includes visible columns, row density, page size, and saved filters/sorting. This is optional scope. An arbitrary dashboard builder is not part of the current plan.

## Research informing the direction

- [Formant overview configuration](https://docs.formant.io/docs/getting-started-configure-the-overview-page) and [telemetry columns](https://docs.formant.io/docs/add-a-stream-to-the-overview-page): a robot-per-row list, configurable streams, filtering, and an offline timeout.
- [InOrbit documentation](https://www.inorbit.ai/docs): a fleet health matrix and a Summary View that drills from aggregate health counts into matching robots. Borrow the summary-to-detail interaction without committing to the matrix presentation.
- [TanStack pagination guide](https://tanstack.com/table/latest/docs/framework/react/guide/pagination): pagination, virtualization, and server-side processing address different concerns.
- [AG Grid accessibility guidance](https://www.ag-grid.com/react-data-grid/accessibility/) and [W3C table properties](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/): rendering and navigation choices need explicit accessibility consideration.

Public competitor screenshots illustrate product patterns. They do not establish the current implementation or exact live-update behaviour of either product.

## Implemented simulation and polling

The separate TypeScript simulator discovers the fleet through a single registry snapshot and sends transactional batches of up to 100 reports. Behaviour is automatic Idle → Working → Returning → Charging, with manual Start/Stop/Return overrides. Roughly 20% of robots encounter a retryable path blockage, lost position, or sensor obstruction after 2–10 working minutes. No history, command queue, or administrative availability is added. A stable 20% subset also has staggered 60-second telemetry outages every three minutes; activity continues locally and reporting recovers automatically. Offline is derived from receipt freshness and counts toward Needs attention. See README for timing and restart rules.

Receipt time determines Online (≤10 seconds), Delayed (>10–15 seconds), Offline (>15 seconds), or Unknown (no report). Observation time determines whether an update is newer; ignored reports do not refresh receipt time. Missing data stays unknown. Connection labels are unverified after interrupted requests or while awaiting refresh after a hidden tab. Intentional interaction pauses freeze the display clock and do not relabel robots. After a dashboard outage, connection states remain last verified rather than implying that individual robots lost contact.

Polling preserves rows, IDs, focus, and scroll during background refresh. Mutations invalidate older requests and refetch the current page and total; page membership may shift. Row menus and dialogs pause polling without inserting a layout-shifting message. Hidden tabs pause, then refresh on return. Background failure preserves last-known values and shows one warning. Operational filter membership is recomputed on each refresh.

Report age is hidden for Online robots and retained for Delayed/Offline robots. The 10-second Online window tolerates the five-second polling cadence.

## Simple robot controls and simulation

Activity and Connection remain separate. Activity labels are Idle, Working, Returning, Charging, Needs attention, and Unknown. Needs attention has a concrete problem code; Simulated problems are Path blocked, Position lost, and Sensor obstructed, all recoverable through Retry. Charging remains an activity without a duplicate charging flag. Base is a location, not an activity.

New simulated robots start Idle at Base with a deterministic 22–100% battery, then automatically work after seven seconds. Low battery returns them to Base before charging. Manual Stop and Return hold until Start activity; they take precedence over automatic rules. Operational notifications confirm requests, not completion. Disabled menu actions retain keyboard-accessible explanations.

Only the latest control target/revision and latest telemetry acknowledgment persist. The existing standalone simulator discovers changed controls each loop, retains local acknowledgments across failed reports, and restores observed phase/problem/manual intent on restart. Countdown and fault timers restart without downtime catch-up. Automatic problem eligibility covers about 20% of robots so an unattended fleet stays active. Full missions, administrative availability, further fault scenarios, and command-progress UI are deferred.
