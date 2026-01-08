# ha-family-board

Custom Lovelace dashboard and card for a family board in Home Assistant.

## What this provides
- A rolling 5-day schedule view (Google Calendar).
- Chores from Todoist todo lists (`todo.*` entities).
- Shopping list backed by `todo.shopping_list_2`.
- A first-run setup wizard (admin-only) and a full card editor.
- Mobile-friendly layout and per-device preferences (filters, time slots, sidebar collapse).

## Requirements
- Home Assistant with:
  - Google Calendar integration (calendar entities under `calendar.*`).
  - Todoist integration (todo entities under `todo.*`).
- A `todo.shopping_list_2` entity for shopping.

## Install
1) Copy the custom card files into Home Assistant:
   - `config/www/family-board/`
2) Add the resource (configuration.yaml):
```yaml
lovelace:
  resources:
    - url: /local/family-board/family-board.js?v=YYYYMMDD-HHMMSS
      type: module
```
3) Reload Lovelace or restart Home Assistant.
4) Add the dashboard and card in YAML mode (see example below).

## First-run wizard (admin-only)
If no people mappings are configured, admins see a setup wizard that:
- Discovers `calendar.*` and `todo.*` entities.
- Suggests people, colours, and mappings.
- Allows you to set "Family" and "Routine" calendar roles.
- Generates a YAML snippet and can open the card editor.

Non-admins will see a message to ask an admin to finish setup.

## Card editor (UI)
Use the Lovelace card editor to:
- Add/remove calendars and todo lists.
- Map each to a person (name + colour).
- Set day start/end and refresh interval.
- Enable debug logging.

Settings saved per user/device:
- Sidebar collapsed state.
- People filters.
- Time slot granularity.
- Mobile layout toggle.

## Example card YAML (placeholders)
```yaml
type: custom:family-board
title: Family Board
debug: true

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
```

## Troubleshooting
- Hard refresh after JS changes (Cmd/Ctrl-Shift-R).
- If the UI looks stale, bump the resource query string.
- Check entity IDs in the editor (warnings show if missing).
- Enable `debug: true` and check the browser console.

## Development workflow
- Edit JS modules under `config/www/family-board/`.
- Keep ES modules only; no bundler is used.
- After JS edits, update the resource version:
  - `config/configuration.yaml` and
  - the comment in `config/lovelace/family-board.yaml`.
