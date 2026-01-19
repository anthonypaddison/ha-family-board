/* Family Board - settings view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbSettingsView extends LitElement {
    static properties = {
        card: { type: Object },
        _homeControlAdd: { state: true },
        _infoOpen: { state: true },
        _infoTitle: { state: true },
        _infoText: { state: true },
        _pinValue: { state: true },
        _pinSetValue: { state: true },
        _dragPersonId: { state: true },
        _resetStep: { state: true },
    };

    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }
        .wrap {
            height: 100%;
            overflow: hidden;
            padding: var(--fb-gutter);
            min-height: 0;
            box-sizing: border-box;
        }
        .layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            height: 100%;
            min-height: 0;
        }
        .column {
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow: hidden;
            min-height: 0;
        }
        .section {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            flex: 1;
        }
        .panelBody {
            min-height: 0;
            overflow: auto;
            flex: 1;
            padding-right: 8px;
            scrollbar-gutter: stable;
        }
        .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 0;
            border-bottom: 1px dashed var(--fb-grid);
            align-items: center;
        }
        .row label {
            color: var(--fb-text);
        }
        .row:last-child {
            border-bottom: 0;
        }
        .title {
            font-weight: 700;
            margin-bottom: 6px;
            color: var(--fb-text);
            font-size: 20px;
        }
        .titleRow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .infoBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 999px;
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
            font-weight: 700;
        }
        .infoBackdrop {
            position: fixed;
            inset: 0;
            background: var(--overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }
        .infoDlg {
            width: 100%;
            max-width: 520px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            display: grid;
            gap: 10px;
        }
        .infoHead {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .muted {
            color: var(--fb-muted);
            font-size: 16px;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            background: var(--fb-accent);
            padding: 8px 10px;
            cursor: pointer;
            color: var(--fb-text);
            min-height: var(--fb-touch);
            min-width: var(--fb-touch);
        }
        .input {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 16px;
            background: var(--fb-surface);
            color: var(--fb-text);
            min-height: var(--fb-touch);
        }
        .unitRow {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .unit {
            color: var(--fb-muted);
            font-size: 14px;
        }
        .status {
            font-weight: 700;
        }
        .status.on {
            color: var(--warning);
        }
        .status.off {
            color: var(--success);
        }
        ul {
            margin: 6px 0 0;
            padding-left: 18px;
            color: var(--fb-muted);
            font-size: 16px;
        }
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        .subTitle {
            font-weight: 700;
            margin-top: 12px;
            font-size: 16px;
        }
        .subTitle:first-of-type {
            margin-top: 0;
        }
        .toggleGroup {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            padding: 4px;
            border-radius: 999px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
        }
        .toggleBtn {
            border: 0;
            background: transparent;
            color: var(--fb-text);
            border-radius: 999px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 14px;
            min-height: var(--fb-touch);
            min-width: var(--fb-touch);
        }
        .toggleBtn.active {
            background: var(--fb-surface);
            box-shadow: var(--shadow-sm);
            font-weight: 700;
        }
        .dragList {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            margin-top: 8px;
        }
        .dragItem {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 6px 10px;
            background: var(--fb-surface-2);
            cursor: grab;
            text-align: center;
            font-weight: 600;
        }
        .dragItem.dragging {
            opacity: 0.5;
        }
        .panelBody {
            scrollbar-width: thin;
            scrollbar-color: var(--fb-grid) transparent;
        }
        .panelBody::-webkit-scrollbar {
            width: 10px;
        }
        .panelBody::-webkit-scrollbar-track {
            background: transparent;
        }
        .panelBody::-webkit-scrollbar-thumb {
            background: var(--fb-grid);
            border-radius: 999px;
            border: 3px solid transparent;
            background-clip: padding-box;
        }
        .panelBody::-webkit-scrollbar-thumb:hover {
            background: var(--fb-border);
            background-clip: padding-box;
        }
        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const shopping = cfg.shopping?.entity || 'todo.shopping_list_2';
        const homeControls = Array.isArray(cfg.home_controls) ? cfg.home_controls : [];
        const bins = Array.isArray(cfg.bins) ? cfg.bins : [];
        const binSchedule = cfg.bin_schedule || {};
        const binScheduleMode = binSchedule.mode || 'simple';
        const binSimple = binSchedule.simple || {};
        const binRotation = binSchedule.rotation || {};
        const entityIds = Object.keys(card._hass?.states || {}).sort();
        const addValue = this._homeControlAdd || '';
        const hasPeopleDisplay = Array.isArray(cfg.people_display);
        const peopleDisplay = hasPeopleDisplay
            ? cfg.people_display.filter((id) => people.some((p) => p.id === id))
            : people.map((p) => p.id).filter(Boolean);
        const updatePeopleDisplay = (next) => {
            card._updateConfigPartial({ people_display: next });
        };
        const hasAdminAccess = card._hasAdminAccess?.() || false;
        const isHaAdmin = Boolean(card._hass?.user?.is_admin);
        const hasPin = Boolean(cfg.admin_pin);
        const startHour = Number.isFinite(cfg.day_start_hour) ? cfg.day_start_hour : 6;
        const endHour = Number.isFinite(cfg.day_end_hour) ? cfg.day_end_hour : 24;
        const minGapHours = Number(card._slotMinutes || 30) / 60;
        const orderedPeople = peopleDisplay
            .map((id) => people.find((p) => p.id === id))
            .filter(Boolean);
        const theme = cfg.theme || 'bright-light';
        const weekdayOptions = [
            { value: 0, label: 'Sunday' },
            { value: 1, label: 'Monday' },
            { value: 2, label: 'Tuesday' },
            { value: 3, label: 'Wednesday' },
            { value: 4, label: 'Thursday' },
            { value: 5, label: 'Friday' },
            { value: 6, label: 'Saturday' },
        ];
        const updateBinConfig = (nextBins, nextSchedule) => {
            card._updateConfigPartial({
                bins: nextBins,
                bin_schedule: nextSchedule,
            });
            this.requestUpdate();
        };
        const makeBinId = () =>
            `bin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

        if (!hasAdminAccess) {
            return html`
                <div class="wrap">
                    <div class="section">
                        <div class="title">Admin access</div>
                        <div class="panelBody">
                            ${hasPin
                                ? html`
                                      <div class="muted">
                                          Enter the admin PIN to unlock settings on this device.
                                      </div>
                                      <div class="row">
                                          <div>PIN</div>
                                          <div class="unitRow">
                                              <input
                                                  class="input"
                                                  type="password"
                                                  .value=${this._pinValue || ''}
                                                  @input=${(e) =>
                                                      (this._pinValue = e.target.value)}
                                              />
                                              <button
                                                  class="btn"
                                                  @click=${() => {
                                                      const ok = card._tryAdminUnlock?.(
                                                          this._pinValue
                                                      );
                                                      if (ok) this._pinValue = '';
                                                  }}
                                              >
                                                  Unlock
                                              </button>
                                          </div>
                                      </div>
                                  `
                                : html`<div class="muted">
                                      No admin PIN is set. Ask an admin to configure one.
                                  </div>`}
                        </div>
                    </div>
                </div>
            `;
        }

        return html`
            <div class="wrap">
                <div class="layout">
                    <div class="column">
                        <div class="section">
                            <div class="titleRow">
                                <div class="title">Sources & Admin</div>
                                <button
                                    class="infoBtn"
                                    title="About sources"
                                    @click=${() => {
                                        this._infoTitle = 'Sources & Admin';
                                        this._infoText =
                                            'Manage sources, people order, admin access, home controls, and shopping favourites. Each person needs at least one calendar or todo list.';
                                        this._infoOpen = true;
                                    }}
                                >
                                    ⓘ
                                </button>
                            </div>
                            <div class="panelBody">
                                <div class="subTitle">Sources</div>
                                <div class="muted">
                                    Connect calendars, todo lists, people, and the shopping entity.
                                </div>
                                <div class="row">
                                    <div>Calendars</div>
                                    <div class="muted">${calendars.length}</div>
                                </div>
                                ${calendars.length
                                    ? html`<ul>
                                          ${calendars.map((c) => {
                                              const person =
                                                  card._peopleById?.get(
                                                      c.person_id || c.personId || c.person
                                                  ) || null;
                                              return html`<li>
                                                  ${c.entity} ->
                                                  ${person?.name || c.person_id || 'Unmapped'}
                                              </li>`;
                                          })}
                                      </ul>`
                                    : html``}
                                <div class="row">
                                    <div>Todo lists</div>
                                    <div class="muted">${todos.length}</div>
                                </div>
                                ${todos.length
                                    ? html`<ul>
                                          ${todos.map((t) => {
                                              const person =
                                                  card._peopleById?.get(
                                                      t.person_id || t.personId || t.person
                                                  ) || null;
                                              return html`<li>
                                                  ${t.entity} ->
                                                  ${person?.name || t.person_id || 'Unmapped'}
                                              </li>`;
                                          })}
                                      </ul>`
                                    : html``}
                                <div class="row">
                                    <div>People</div>
                                    <div class="muted">${people.length}</div>
                                </div>
                                ${people.length
                                    ? html`<ul>
                                          ${people.map((p) => html`<li>${p.name || p.id}</li>`)}
                                      </ul>`
                                    : html``}
                                <div class="row">
                                    <div>Shopping entity</div>
                                    <div class="muted">${shopping}</div>
                                </div>
                                <div class="actions">
                                    <button class="btn" @click=${() => card._openManageSources()}>
                                        Manage sources
                                    </button>
                                    <button class="btn" @click=${() => card._openHelp()}>ⓘ</button>
                                </div>

                                <div class="subTitle">People order</div>
                                <div class="muted">
                                    Drag names to reorder the header. Two rows mirror the header.
                                </div>
                                ${orderedPeople.length
                                    ? html`<div class="dragList">
                                          ${orderedPeople.map(
                                              (p) => html`
                                                  <div
                                                      class="dragItem ${this._dragPersonId === p.id
                                                          ? 'dragging'
                                                          : ''}"
                                                      draggable="true"
                                                      @dragstart=${(e) => {
                                                          this._dragPersonId = p.id;
                                                          e.dataTransfer.effectAllowed = 'move';
                                                      }}
                                                      @dragover=${(e) => e.preventDefault()}
                                                      @drop=${(e) => {
                                                          e.preventDefault();
                                                          const from = this._dragPersonId;
                                                          if (!from || from === p.id) return;
                                                          const next = [...peopleDisplay];
                                                          const fromIdx = next.indexOf(from);
                                                          const toIdx = next.indexOf(p.id);
                                                          if (fromIdx === -1 || toIdx === -1)
                                                              return;
                                                          next.splice(fromIdx, 1);
                                                          next.splice(toIdx, 0, from);
                                                          updatePeopleDisplay(next);
                                                          this._dragPersonId = '';
                                                      }}
                                                      @dragend=${() => (this._dragPersonId = '')}
                                                  >
                                                      ${p.name || p.id}
                                                  </div>
                                              `
                                          )}
                                      </div>`
                                    : html`<div class="muted">No people configured yet.</div>`}

                                <div class="subTitle">Admin access</div>
                                <div class="muted">
                                    ${isHaAdmin
                                        ? 'You are a Home Assistant admin.'
                                        : 'Admin access is unlocked on this device.'}
                                </div>
                                <div class="row">
                                    <div>Admin PIN</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="password"
                                            placeholder=${hasPin ? '••••' : 'Set PIN'}
                                            .value=${this._pinSetValue || ''}
                                            ?disabled=${!isHaAdmin}
                                            @input=${(e) => (this._pinSetValue = e.target.value)}
                                        />
                                        <button
                                            class="btn"
                                            ?disabled=${!isHaAdmin}
                                            @click=${() => {
                                                card._setAdminPin?.(this._pinSetValue);
                                                this._pinSetValue = '';
                                            }}
                                        >
                                            Save
                                        </button>
                                        <button
                                            class="btn"
                                            ?disabled=${!isHaAdmin}
                                            @click=${() => card._setAdminPin?.('')}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                                ${!isHaAdmin
                                    ? html`
                                          <div class="row">
                                              <div>Device access</div>
                                              <button
                                                  class="btn"
                                                  @click=${() => card._lockAdminAccess?.()}
                                              >
                                                  Lock this device
                                              </button>
                                          </div>
                                      `
                                    : html``}

                                <div class="subTitle">Home controls</div>
                                <div class="muted">Pick entities to show on the Home view.</div>
                                <div class="row">
                                    <div>Add entity</div>
                                    <div class="unitRow">
                                        <select
                                            class="input"
                                            .value=${addValue}
                                            @change=${(e) => (this._homeControlAdd = e.target.value)}
                                        >
                                            <option value="">Select entity</option>
                                            ${entityIds.map(
                                                (eid) =>
                                                    html`<option value=${eid}>${eid}</option>`
                                            )}
                                        </select>
                                        <button
                                            class="btn"
                                            ?disabled=${!addValue}
                                            @click=${async () => {
                                                if (!addValue) return;
                                                if (!entityIds.includes(addValue)) return;
                                                if (homeControls.includes(addValue)) return;
                                                const next = [...homeControls, addValue];
                                                await card._updateConfigPartial({
                                                    home_controls: next,
                                                });
                                                this._homeControlAdd = '';
                                                this.requestUpdate();
                                            }}
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                                ${homeControls.length
                                    ? homeControls.map(
                                          (eid) => html`
                                              <div class="row">
                                                  <div>${eid}</div>
                                                  <button
                                                      class="btn"
                                                      @click=${async () => {
                                                          const next = homeControls.filter(
                                                              (item) => item !== eid
                                                          );
                                                          await card._updateConfigPartial({
                                                              home_controls: next,
                                                          });
                                                          this.requestUpdate();
                                                      }}
                                                  >
                                                      Remove
                                                  </button>
                                              </div>
                                          `
                                      )
                                    : html`<div class="muted">No home controls selected.</div>`}

                                <div class="subTitle">Bin collections</div>
                                <div class="muted">
                                    Configure up to 10 bins and set collection schedules.
                                </div>
                                <div class="actions">
                                    <button
                                        class="btn"
                                        ?disabled=${bins.length >= 10}
                                        @click=${() => {
                                            if (bins.length >= 10) return;
                                            const next = [
                                                ...bins,
                                                {
                                                    id: makeBinId(),
                                                    name: `Bin ${bins.length + 1}`,
                                                    colour: '#7E57C2',
                                                    icon: 'mdi:trash-can',
                                                    enabled: true,
                                                },
                                            ];
                                            updateBinConfig(next, binSchedule);
                                        }}
                                    >
                                        Add bin
                                    </button>
                                </div>
                                ${bins.length
                                    ? bins.map(
                                          (bin, idx) => html`
                                              <div class="row">
                                                  <div class="unitRow">
                                                      <input
                                                          type="checkbox"
                                                          .checked=${bin.enabled !== false}
                                                          @change=${(e) => {
                                                              const next = bins.map((b, i) =>
                                                                  i === idx
                                                                      ? {
                                                                            ...b,
                                                                            enabled:
                                                                                e.target.checked,
                                                                        }
                                                                      : b
                                                              );
                                                              updateBinConfig(next, binSchedule);
                                                          }}
                                                      />
                                                  </div>
                                                  <input
                                                      class="input"
                                                      style="flex:1"
                                                      placeholder="Name"
                                                      .value=${bin.name || ''}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? { ...b, name: e.target.value }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  />
                                                  <input
                                                      class="input"
                                                      style="width:120px"
                                                      placeholder="#RRGGBB"
                                                      .value=${bin.colour || ''}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? {
                                                                        ...b,
                                                                        colour: e.target.value,
                                                                    }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  />
                                                  <input
                                                      class="input"
                                                      style="width:160px"
                                                      placeholder="mdi:trash-can"
                                                      .value=${bin.icon || ''}
                                                      @change=${(e) => {
                                                          const next = bins.map((b, i) =>
                                                              i === idx
                                                                  ? { ...b, icon: e.target.value }
                                                                  : b
                                                          );
                                                          updateBinConfig(next, binSchedule);
                                                      }}
                                                  />
                                                  <button
                                                      class="btn"
                                                      @click=${() => {
                                                          const next = bins.filter(
                                                              (_, i) => i !== idx
                                                          );
                                                          const nextSimple = { ...binSimple };
                                                          delete nextSimple[bin.id];
                                                          const nextRotation = {
                                                              ...binRotation,
                                                              weeks: Array.isArray(
                                                                  binRotation.weeks
                                                              )
                                                                  ? binRotation.weeks.map(
                                                                        (week) => ({
                                                                            ...week,
                                                                            bins: Array.isArray(
                                                                                week.bins
                                                                            )
                                                                                ? week.bins.filter(
                                                                                      (id) =>
                                                                                          id !==
                                                                                          bin.id
                                                                                  )
                                                                                : [],
                                                                        })
                                                                    )
                                                                  : [],
                                                          };
                                                          updateBinConfig(next, {
                                                              ...binSchedule,
                                                              simple: nextSimple,
                                                              rotation: nextRotation,
                                                          });
                                                      }}
                                                  >
                                                      Remove
                                                  </button>
                                              </div>
                                          `
                                      )
                                    : html`<div class="muted">No bins configured yet.</div>`}

                                <div class="subTitle">Bin schedules</div>
                                <div class="muted">
                                    Choose a schedule mode and define collection timing.
                                </div>
                                <div class="row">
                                    <div>Schedule mode</div>
                                    <div class="toggleGroup" role="group" aria-label="Schedule mode">
                                        <button
                                            class="toggleBtn ${binScheduleMode === 'simple'
                                                ? 'active'
                                                : ''}"
                                            @click=${() =>
                                                updateBinConfig(bins, {
                                                    ...binSchedule,
                                                    mode: 'simple',
                                                })}
                                        >
                                            Simple repeat
                                        </button>
                                        <button
                                            class="toggleBtn ${binScheduleMode === 'rotation'
                                                ? 'active'
                                                : ''}"
                                            @click=${() =>
                                                updateBinConfig(bins, {
                                                    ...binSchedule,
                                                    mode: 'rotation',
                                                })}
                                        >
                                            Rotation
                                        </button>
                                    </div>
                                </div>
                                ${binScheduleMode === 'simple'
                                    ? html`
                                          <div class="muted">
                                              Set a weekday, repeat interval, and anchor date for
                                              each bin.
                                          </div>
                                          ${bins.map((bin) => {
                                              const cfg = binSimple?.[bin.id] || {};
                                              return html`
                                                  <div class="row">
                                                      <div style="min-width:120px">
                                                          ${bin.name || 'Bin'}
                                                      </div>
                                                      <select
                                                          class="input"
                                                          .value=${String(
                                                              cfg.weekday ?? ''
                                                          )}
                                                          @change=${(e) => {
                                                              const raw = e.target.value;
                                                              const nextWeekday =
                                                                  raw === '' ? null : Number(raw);
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      weekday: nextWeekday,
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                          @input=${(e) => {
                                                              e.target.dispatchEvent(
                                                                  new Event('change')
                                                              );
                                                          }}
                                                      >
                                                          <option value="">Weekday</option>
                                                          ${weekdayOptions.map(
                                                              (opt) => html`
                                                                  <option
                                                                      value=${opt.value}
                                                                  >
                                                                      ${opt.label}
                                                                  </option>
                                                              `
                                                          )}
                                                      </select>
                                                      <input
                                                          class="input"
                                                          style="width:120px"
                                                          type="number"
                                                          min="1"
                                                          max="8"
                                                          .value=${cfg.every ?? 1}
                                                          @change=${(e) => {
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      every: Number(
                                                                          e.target.value
                                                                      ),
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                      />
                                                      <input
                                                          class="input"
                                                          type="date"
                                                          .value=${cfg.anchor_date || ''}
                                                          @change=${(e) => {
                                                              const nextSimple = {
                                                                  ...binSimple,
                                                                  [bin.id]: {
                                                                      ...cfg,
                                                                      anchor_date: e.target.value,
                                                                  },
                                                              };
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  simple: nextSimple,
                                                              });
                                                          }}
                                                      />
                                                  </div>
                                              `;
                                          })}
                                      `
                                    : html`
                                          <div class="muted">
                                              Pick the collection weekday and define a repeating
                                              sequence of weeks.
                                          </div>
                                          <div class="row">
                                              <div>Weekday</div>
                                              <select
                                                  class="input"
                                                  .value=${String(binRotation.weekday ?? '')}
                                                  @change=${(e) => {
                                                      const raw = e.target.value;
                                                      const nextWeekday =
                                                          raw === '' ? null : Number(raw);
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              weekday: nextWeekday,
                                                          },
                                                      });
                                                  }}
                                                  @input=${(e) => {
                                                      e.target.dispatchEvent(new Event('change'));
                                                  }}
                                              >
                                                  <option value="">Weekday</option>
                                                  ${weekdayOptions.map(
                                                      (opt) => html`
                                                          <option value=${opt.value}>
                                                              ${opt.label}
                                                          </option>
                                                      `
                                                  )}
                                              </select>
                                              <input
                                                  class="input"
                                                  type="date"
                                                  .value=${binRotation.anchor_date || ''}
                                                  @change=${(e) =>
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              anchor_date: e.target.value,
                                                          },
                                                      })}
                                              />
                                          </div>
                                          <div class="actions">
                                              <button
                                                  class="btn"
                                                  @click=${() => {
                                                      const weeks = Array.isArray(
                                                          binRotation.weeks
                                                      )
                                                          ? binRotation.weeks
                                                          : [];
                                                      const nextWeeks = [
                                                          ...weeks,
                                                          { bins: [] },
                                                      ];
                                                      updateBinConfig(bins, {
                                                          ...binSchedule,
                                                          rotation: {
                                                              ...binRotation,
                                                              weeks: nextWeeks,
                                                          },
                                                      });
                                                  }}
                                              >
                                                  Add week
                                              </button>
                                          </div>
                                          ${(Array.isArray(binRotation.weeks)
                                              ? binRotation.weeks
                                              : []
                                          ).map(
                                              (week, weekIdx) => html`
                                                  <div class="row">
                                                      <div style="min-width:80px">
                                                          Week ${weekIdx + 1}
                                                      </div>
                                                      <div class="unitRow" style="flex-wrap:wrap">
                                                          ${bins.map((bin) => {
                                                              const weekBins = Array.isArray(
                                                                  week.bins
                                                              )
                                                                  ? week.bins
                                                                  : [];
                                                              const checked = weekBins.includes(
                                                                  bin.id
                                                              );
                                                              return html`
                                                                  <label
                                                                      style="display:inline-flex;align-items:center;gap:6px;margin-right:8px"
                                                                  >
                                                                      <input
                                                                          type="checkbox"
                                                                          .checked=${checked}
                                                                          @change=${(e) => {
                                                                              const weeks = Array.isArray(
                                                                                  binRotation.weeks
                                                                              )
                                                                                  ? binRotation.weeks
                                                                                  : [];
                                                                              const nextWeeks = weeks.map(
                                                                                  (w, i) => {
                                                                                      if (
                                                                                          i !==
                                                                                          weekIdx
                                                                                      )
                                                                                          return w;
                                                                                      const binsForWeek = Array.isArray(
                                                                                          w.bins
                                                                                      )
                                                                                          ? w.bins
                                                                                          : [];
                                                                                      const nextBins = e
                                                                                          .target
                                                                                          .checked
                                                                                          ? [
                                                                                                ...new Set(
                                                                                                    [
                                                                                                        ...binsForWeek,
                                                                                                        bin.id,
                                                                                                    ]
                                                                                                ),
                                                                                            ]
                                                                                          : binsForWeek.filter(
                                                                                                (
                                                                                                    id
                                                                                                ) =>
                                                                                                    id !==
                                                                                                    bin.id
                                                                                            );
                                                                                      return {
                                                                                          ...w,
                                                                                          bins: nextBins,
                                                                                      };
                                                                                  }
                                                                              );
                                                                              updateBinConfig(
                                                                                  bins,
                                                                                  {
                                                                                      ...binSchedule,
                                                                                      rotation: {
                                                                                          ...binRotation,
                                                                                          weeks: nextWeeks,
                                                                                      },
                                                                                  }
                                                                              );
                                                                          }}
                                                                      />
                                                                      ${bin.name || 'Bin'}
                                                                  </label>
                                                              `;
                                                          })}
                                                      </div>
                                                      <button
                                                          class="btn"
                                                          @click=${() => {
                                                              const weeks = Array.isArray(
                                                                  binRotation.weeks
                                                              )
                                                                  ? binRotation.weeks
                                                                  : [];
                                                              const nextWeeks = weeks.filter(
                                                                  (_, i) => i !== weekIdx
                                                              );
                                                              updateBinConfig(bins, {
                                                                  ...binSchedule,
                                                                  rotation: {
                                                                      ...binRotation,
                                                                      weeks: nextWeeks,
                                                                  },
                                                              });
                                                          }}
                                                      >
                                                          Remove
                                                      </button>
                                                  </div>
                                              `
                                          )}
                                      `}

                                <div class="subTitle">Shopping favourites</div>
                                <div class="muted">
                                    Reset favourites back to the default list or clear them
                                    completely.
                                </div>
                                <div class="actions">
                                    <button
                                        class="btn"
                                        @click=${() => card._resetShoppingFavouritesDefaults?.()}
                                    >
                                        Reset to defaults
                                    </button>
                                    <button
                                        class="btn"
                                        @click=${() => card._clearShoppingFavourites?.()}
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="column">
                        <div class="section">
                            <div class="titleRow">
                                <div class="title">Preferences</div>
                                <button
                                    class="infoBtn"
                                    title="About preferences"
                                    @click=${() => {
                                        this._infoTitle = 'Preferences';
                                        this._infoText =
                                            'Preferences are stored per user/device. Theme controls the overall look. Use Reset all defaults to clear this device back to the base settings.';
                                        this._infoOpen = true;
                                    }}
                                >
                                    ⓘ
                                </button>
                            </div>
                            <div class="panelBody">
                                <div class="muted">
                                    Saved per user/device unless stated otherwise.
                                </div>
                                <div class="row">
                                    <div>Theme</div>
                                    <select
                                        class="input"
                                        .value=${theme}
                                        @change=${(e) =>
                                            card._updateConfigPartial({ theme: e.target.value })}
                                    >
                                        <option value="bright-light">Bright light</option>
                                    </select>
                                </div>
                                <div class="muted">
                                    Controls the overall look of the board.
                                </div>
                                <div class="row">
                                    <div>Refresh interval</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="1"
                                            .value=${Math.round(card._refreshIntervalMs / 60000)}
                                            @change=${(e) =>
                                                card._updateConfigPartial({
                                                    refresh_interval_ms:
                                                        Number(e.target.value) * 60000,
                                                })}
                                        />
                                        <span class="unit">minutes</span>
                                    </div>
                                </div>
                                <div class="muted">How often the board refreshes data.</div>
                                <div class="row">
                                    <div>Debug</div>
                                    <div class="toggleGroup" role="group" aria-label="Debug toggle">
                                        <button
                                            class="toggleBtn ${card._debug ? 'active' : ''}"
                                            @click=${() =>
                                                card._updateConfigPartial({ debug: true })}
                                        >
                                            On
                                        </button>
                                        <button
                                            class="toggleBtn ${card._debug ? '' : 'active'}"
                                            @click=${() =>
                                                card._updateConfigPartial({ debug: false })}
                                        >
                                            Off
                                        </button>
                                    </div>
                                </div>
                                <div class="muted">
                                    Debug adds console logs and persists in the card config.
                                </div>
                                <div class="row">
                                    <div>Time slots (this device)</div>
                                    <select
                                        class="input"
                                        .value=${String(card._slotMinutes || 30)}
                                        @change=${(e) => card._setSlotMinutesPref(e.target.value)}
                                    >
                                        <option value="30">30 minutes</option>
                                        <option value="60">60 minutes</option>
                                    </select>
                                </div>
                                <div class="muted">
                                    Controls schedule zoom on this device only.
                                </div>
                                <div class="row">
                                    <div>Visible hours</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="1"
                                            .value=${startHour}
                                            @change=${(e) =>
                                                card._setDayRange?.({
                                                    startHour: e.target.value,
                                                    endHour,
                                                })}
                                        />
                                        <span class="unit">to</span>
                                        <input
                                            class="input"
                                            type="number"
                                            min="0"
                                            max="24"
                                            step="1"
                                            .value=${endHour}
                                            @change=${(e) =>
                                                card._setDayRange?.({
                                                    startHour,
                                                    endHour: e.target.value,
                                                })}
                                        />
                                        <span class="unit">hours</span>
                                    </div>
                                </div>
                                <div class="muted">
                                    Earliest 00:00, latest 24:00, minimum range ${minGapHours}h.
                                </div>
                                <div class="row">
                                    <div>Default event duration (minutes)</div>
                                    <div class="unitRow">
                                        <input
                                            class="input"
                                            type="number"
                                            min="5"
                                            .value=${card._defaultEventMinutes || 30}
                                            @change=${(e) =>
                                                card._setDefaultEventMinutesPref(e.target.value)}
                                        />
                                        <span class="unit">minutes</span>
                                    </div>
                                </div>
                                <div class="muted">Used when creating new calendar events.</div>
                                <div class="row">
                                    <div>Background theme</div>
                                    <select
                                        class="input"
                                        .value=${card._config?.background_theme || 'default'}
                                        @change=${(e) =>
                                            card._updateConfigPartial({
                                                background_theme:
                                                    e.target.value === 'default'
                                                        ? ''
                                                        : e.target.value,
                                            })}
                                    >
                                        <option value="default">Default</option>
                                        <option value="mint">Mint</option>
                                        <option value="sand">Sand</option>
                                        <option value="slate">Slate</option>
                                    </select>
                                </div>
                                <div class="muted">
                                    Changes the overall page background tint.
                                </div>
                                <div class="row">
                                    <div>Mobile layout (this device)</div>
                                    <label>
                                        <input
                                            type="checkbox"
                                            .checked=${card._useMobileView}
                                            @change=${(e) => card._setMobileView(e.target.checked)}
                                        />
                                        <span class="muted">
                                            ${card._useMobileView ? 'On' : 'Off'}
                                        </span>
                                    </label>
                                </div>
                                <div class="muted">
                                    Per user/device and only applies on mobile screens.
                                </div>
                                <div class="row">
                                <div>Default landing view (this device)</div>
                            <select
                                class="input"
                                .value=${card._defaultView || 'schedule'}
                                @change=${(e) => card._setDefaultViewPref(e.target.value)}
                            >
                                <option value="schedule">Schedule</option>
                                <option value="important">Important</option>
                                <option value="chores">Chores</option>
                                <option value="shopping">Shopping</option>
                                <option value="home">Home</option>
                            </select>
                                </div>
                                <div class="muted">
                                    Used when the board first loads on this device.
                                </div>
                                <div class="actions">
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            this._resetStep = 1;
                                        }}
                                    >
                                        Reset all defaults
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ${this._resetStep
                ? html`<div
                      class="infoBackdrop"
                      @click=${(e) =>
                          e.target === e.currentTarget && (this._resetStep = 0)}
                  >
                      <div class="infoDlg">
                          <div class="infoHead">
                              <div>
                                  ${this._resetStep === 1
                                      ? 'Reset preferences?'
                                      : 'Confirm reset'}
                              </div>
                          </div>
                          <div class="muted">
                              ${this._resetStep === 1
                                  ? 'This will reset all per-device preferences back to defaults.'
                                  : 'Are you 100% sure you want to reset everything on this device?'}
                          </div>
                          <div class="actions">
                              <button
                                  class="btn"
                                  @click=${() => (this._resetStep = 0)}
                              >
                                  Cancel
                              </button>
                              <button
                                  class="btn"
                                  @click=${() => {
                                      if (this._resetStep === 1) {
                                          this._resetStep = 2;
                                          return;
                                      }
                                      card._resetPrefsToDefaults?.();
                                      this._resetStep = 0;
                                  }}
                              >
                                  ${this._resetStep === 1 ? 'Yes' : 'Yes, reset'}
                              </button>
                          </div>
                      </div>
                  </div>`
                : html``}
            ${this._infoOpen
                ? html`<div
                      class="infoBackdrop"
                      @click=${(e) => e.target === e.currentTarget && (this._infoOpen = false)}
                  >
                      <div class="infoDlg">
                          <div class="infoHead">
                              <div>${this._infoTitle || 'Info'}</div>
                              <button class="btn" @click=${() => (this._infoOpen = false)}>
                                  Close
                              </button>
                          </div>
                          <div class="muted">${this._infoText || ''}</div>
                      </div>
                  </div>`
                : html``}
        `;
    }
}

customElements.define('fb-settings-view', FbSettingsView);
