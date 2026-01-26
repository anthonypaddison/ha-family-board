# ha-family-board

Family Board is a custom Lovelace card for Home Assistant that combines a multi-day calendar, chores, shopping, and home controls into one dashboard.

## What this is
- Schedule view (day/month) built from `calendar.*` entities.
- Chores and shopping built from `todo.*` entities.
- Admin-first setup helpers and an in-card editor guide.
- Per-user/device preferences (filters, time slots, landing view).

## Installation

### HACS (recommended)
1) Add this repository as a custom repository in HACS (type: Lovelace).
2) Install the "Family Board" card.
3) Reload Home Assistant.

### Manual
1) Copy the card files to:
   - `config/www/family-board/`
2) Copy the integration (optional for storage) to:
   - `config/custom_components/family_board/`
3) Add the Lovelace resource:

```yaml
lovelace:
  resources:
    - url: /local/family-board/family-board.js?v=YYYYMMDD-HHMMSS
      type: module
```

4) Restart Home Assistant (required if you install the integration).
5) Add the card to a dashboard (example below).

## Example card YAML

```yaml
type: custom:family-board
title: Family Board
debug: false

day_start_hour: 6
day_end_hour: 24
slot_minutes: 30
px_per_hour: 120
refresh_interval_ms: 300000

people:
  - id: person_one
    name: Person One
    color: '#36B37E'
    text_color: '#FFFFFF'
    role: grownup
    header_row: 1
  - id: person_two
    name: Person Two
    color: '#7E57C2'
    text_color: '#FFFFFF'
    role: grownup
    header_row: 1
  - id: person_three
    name: Person Three
    color: '#F4B400'
    text_color: '#1A1A1A'
    role: kid
    header_row: 2

calendars:
  - entity: calendar.person_one
    person_id: person_one
  - entity: calendar.person_two
    person_id: person_two
  - entity: calendar.family
    person_id: person_one
    role: family
  - entity: calendar.routine
    person_id: person_one
    role: routine

todos:
  - entity: todo.person_one
    name: Person One
    person_id: person_one
  - entity: todo.person_two
    name: Person Two
    person_id: person_two

shopping:
  entity: todo.shopping_list_2
  name: Shopping

people_display:
  - person_one
  - person_two
  - person_three

accent_teal: '#00CED1'
accent_lilac: '#CFBAF0'
background_theme: 'mint'
admin_pin: '1234'
```

## Configuration reference

- `people`: List of people shown in the header tiles.
  - `id` (string): Unique person key.
  - `name` (string): Display name.
  - `color` (string): CSS color for this person.
  - `text_color` (string, optional): Text color used for events and pips.
  - `role` (string, optional): `kid` or `grownup` (shown as a badge in header/chores).
  - `header_row` (1 or 2): Which header row the tile appears in.
- `people_display` (list, optional): Ordered list of up to 8 people ids to show in the header.
- `calendars`: List of calendar entities.
  - `entity` (string): `calendar.*` entity id.
  - `person_id` (string): Links the calendar to a person.
  - `role` (string, optional): `family` or `routine`.
- `todos`: List of todo entities.
  - `entity` (string): `todo.*` entity id.
  - `name` (string, optional): Display label.
  - `person_id` (string): Links the todo list to a person.
- `shopping`:
  - `entity` (string): Shopping list `todo.*` entity id (default `todo.shopping_list_2`).
  - `name` (string, optional): Display label.
- `accent_teal` (string, optional): Hex color for the teal accent used in the sidebar selection and
  background tint.
- `accent_lilac` (string, optional): Hex color for the primary accent used in buttons/highlights.
- `background_theme` (string, optional): `mint` | `sand` | `slate` to tint the board background.
- `home_controls` (list, optional): Entity ids to show on the Home controls view.
- `slot_minutes`: 30 or 60 (per-device preference available in Settings).
- `day_start_hour`: Earliest hour shown in the schedule (0-24).
- `day_end_hour`: Latest hour shown in the schedule (0-24, must be after start).
- `px_per_hour`: Height scaling for the schedule grid.
- `refresh_interval_ms`: Polling interval for refreshes.
- `admin_pin` (string, optional): Admin PIN for unlocking Settings on non-admin devices.

Header row behavior:
- Row 1 renders first, then row 2.
- Max 8 tiles are visible (4 per row); extra tiles are omitted in config order.

Mobile layout:
- Toggle "Mobile layout (this device)" in Settings -> Preferences.
- When enabled on a mobile device, the schedule renders with the mobile layout.

Add button:
- The add button lives in the top header next to Sync and opens the add modal for the current view.
- Use the add modal selector to switch between event, chore, shopping, and home control.

## Settings (per device)

These settings are stored per user/device:
- Visible hours (earliest/latest).
- Default landing view (Schedule, Important, Chores, Shopping, Home).
- Mobile layout toggle.
- Time slot minutes.
- Default event duration.
- Theme selection (currently "Bright light").
- Reset all defaults (double-confirmation).

Sources and admin controls live in the left column. Preferences (including reset defaults) live
in the right column.

Admin access:
- HA admins can always open Settings.
- Non-admins can unlock Settings on a device using `admin_pin`.

Sources rules:
- Calendars and todo lists must be real entities in Home Assistant.
- Each person should be linked to at least one calendar or todo list.

## Bin collections

Configure `bins` (up to 10) and `bin_schedule` in Settings to show upcoming collections:
- Each bin: `name`, `colour` (hex), `icon` (mdi), `enabled`.
- `bin_schedule.mode`: `simple` or `rotation`.
- Simple repeat (per bin):
  - `weekday` (0-6, Sunday-Saturday)
  - `every` (weeks interval)
  - `anchor_date` (YYYY-MM-DD, last collection)
- Rotation (global):
  - `weekday` (0-6)
  - `anchor_date` (week 1)
  - `weeks`: array of `{ bins: [binId, ...] }`

When a bin is due today or tomorrow, its icon appears next to the time in the header.

Chore repeat cadence options: daily, weekly, biweekly, monthly (requires due date).

## Persistence modes

This card supports multiple persistence modes for config:
- WebSocket storage (if `family_board` integration is installed):
  - `family_board/config/get`
  - `family_board/config/set`
- Local storage fallback per user/device when WS storage is unavailable.

YAML is only the base config. Stored config overrides YAML once available.
Per-device settings (visible hours, landing view, sidebar state, accents, and debug) are stored in
localStorage and always override shared config on that device.

## Integrations

- Google Calendar: use `calendar.*` entities from the Google Calendar integration.
- Todoist: use `todo.*` entities from the Todoist integration.

## Troubleshooting

- Config keeps reverting: storage is unavailable. Install the integration or rely on localStorage.
- `todo/remove_item` expects a string: update Home Assistant and this card to latest; older HA versions may require item IDs only.
- Add button missing: clear cache and bump the resource query string.
- Module 404 / resource not loading: check the `/local/family-board/` path and resource URL.

## Screenshots

Add screenshots here (no personal data).

## Development notes

- Edit ES modules under `config/www/family-board/`.
- After JS edits, update the resource version in `configuration.yaml` (or via the UI).
Last view:
- The dashboard restores the last view you were on after refresh (per device).
