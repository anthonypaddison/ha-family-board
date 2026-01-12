# ha-family-board

Family Board is a custom Lovelace card for Home Assistant that combines a multi-day calendar, chores, shopping, and home controls into one dashboard.

## What this is
- Schedule view (day/week/month) built from `calendar.*` entities.
- Chores and shopping built from `todo.*` entities.
- Admin-first setup helpers and an in-card editor guide.
- Per-user/device preferences (filters, sidebar collapse, time slots).

## Installation

### HACS (recommended)
1) Add this repository as a custom repository in HACS (type: Lovelace).
2) Install the “Family Board” card.
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
day_end_hour: 22
slot_minutes: 30
px_per_hour: 120
refresh_interval_ms: 300000

people:
  - id: person_one
    name: Person One
    color: '#36B37E'
    header_row: 1
  - id: person_two
    name: Person Two
    color: '#7E57C2'
    header_row: 1
  - id: person_three
    name: Person Three
    color: '#F4B400'
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

accent_teal: '#00CED1'
accent_lilac: '#CFBAF0'
background_theme: 'mint'
```

## Configuration reference

- `people`: List of people shown in the header tiles.
  - `id` (string): Unique person key.
  - `name` (string): Display name.
  - `color` (string): CSS color for this person.
  - `header_row` (1 or 2): Which header row the tile appears in.
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
- `px_per_hour`: Height scaling for the schedule grid.
- `refresh_interval_ms`: Polling interval for refreshes.

Header row behavior:
- Row 1 renders first, then row 2.
- Max 10 tiles are visible (5 per row); extra tiles are omitted in config order.

Mobile layout:
- Toggle "Mobile layout (this device)" in Settings -> Preferences.
- When enabled on a mobile device, the schedule renders with the mobile layout.

## Persistence modes

This card supports multiple persistence modes for config:
- WebSocket storage (if `family_board` integration is installed):
  - `family_board/config/get`
  - `family_board/config/set`
- Local storage fallback per user/device when WS storage is unavailable.

YAML is only the base config. Stored config overrides YAML once available.

## Integrations

- Google Calendar: use `calendar.*` entities from the Google Calendar integration.
- Todoist: use `todo.*` entities from the Todoist integration.

## Troubleshooting

- Config keeps reverting: storage is unavailable. Install the integration or rely on localStorage.
- `todo/remove_item` expects a string: update Home Assistant and this card to latest; older HA versions may require item IDs only.
- FAB not working: clear cache and bump the resource query string.
- Module 404 / resource not loading: check the `/local/family-board/` path and resource URL.

## Screenshots

Add screenshots here (no personal data).

## Development notes

- Edit ES modules under `config/www/family-board/`.
- After JS edits, update the resource version in `configuration.yaml` (or via the UI).
