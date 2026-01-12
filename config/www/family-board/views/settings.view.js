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
    };

    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 14px;
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
        .section {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }
        .panelBody {
            overflow: auto;
            min-height: 0;
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
        }
        .input {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 16px;
            background: var(--fb-surface);
            color: var(--fb-text);
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
        const entityIds = Object.keys(card._hass?.states || {}).sort();
        const addValue = this._homeControlAdd || '';

        return html`
            <div class="wrap">
                <div class="layout">
                <div class="section">
                    <div class="title">Sources</div>
                    <div class="panelBody">
                        <div class="muted">
                            Manage which calendars, todos, and people appear on the board.
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
                                          ${c.entity} -> ${person?.name || c.person_id || 'Unmapped'}
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
                                          ${t.entity} -> ${person?.name || t.person_id || 'Unmapped'}
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
                    </div>
                    <div class="actions">
                        <button class="btn" @click=${() => card._openManageSources()}>
                            Manage sources
                        </button>
                        ${card._hass?.user?.is_admin
                            ? html`<button class="btn" @click=${() => card._openEditor()}>
                                  Open card editor
                              </button>`
                            : html``}
                        <button class="btn" @click=${() => card._openHelp()}>ⓘ</button>
                    </div>
                </div>

                <div class="section">
                    <div class="titleRow">
                        <div class="title">Preferences</div>
                        <button
                            class="infoBtn"
                            title="About preferences"
                            @click=${() => {
                                this._infoTitle = 'Preferences';
                                this._infoText =
                                    'Preferences are stored per user/device. Mobile layout only applies on mobile screens and can be toggled per device.';
                                this._infoOpen = true;
                            }}
                        >
                            ⓘ
                        </button>
                    </div>
                    <div class="panelBody">
                        <div class="muted">Saved per user/device unless stated otherwise.</div>
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
                                            refresh_interval_ms: Number(e.target.value) * 60000,
                                        })}
                                />
                                <span class="unit">minutes</span>
                            </div>
                        </div>
                        <div class="muted">How often the board refreshes data.</div>
                        <div class="row">
                            <div>Debug</div>
                            <label>
                                <input
                                    type="checkbox"
                                    .checked=${card._debug}
                                    @change=${(e) =>
                                        card._updateConfigPartial({ debug: e.target.checked })}
                                />
                                <span
                                    class="status ${card._debug ? 'on' : 'off'}"
                                >${card._debug ? 'On' : 'Off'}</span>
                            </label>
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
                        <div class="muted">Controls schedule zoom on this device only.</div>
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
                            <div>Accent teal</div>
                            <input
                                class="input"
                                placeholder="#00CED1"
                                .value=${card._config?.accent_teal || ''}
                                @change=${(e) =>
                                    card._updateConfigPartial({
                                        accent_teal: e.target.value,
                                    })}
                            />
                        </div>
                        <div class="muted">Applies to sidebar selection and teal accents.</div>
                        <div class="row">
                            <div>Accent lilac</div>
                            <input
                                class="input"
                                placeholder="#CFBAF0"
                                .value=${card._config?.accent_lilac || ''}
                                @change=${(e) =>
                                    card._updateConfigPartial({
                                        accent_lilac: e.target.value,
                                    })}
                            />
                        </div>
                        <div class="muted">Updates lilac highlights across the UI.</div>
                        <div class="row">
                            <div>Background theme</div>
                            <select
                                class="input"
                                .value=${card._config?.background_theme || 'default'}
                                @change=${(e) =>
                                    card._updateConfigPartial({
                                        background_theme:
                                            e.target.value === 'default' ? '' : e.target.value,
                                    })}
                            >
                                <option value="default">Default</option>
                                <option value="mint">Mint</option>
                                <option value="sand">Sand</option>
                                <option value="slate">Slate</option>
                            </select>
                        </div>
                        <div class="muted">Changes the overall page background tint.</div>
                        <div class="row">
                            <div>Mobile layout (this device)</div>
                            <label>
                                <input
                                    type="checkbox"
                                    .checked=${card._useMobileView}
                                    @change=${(e) => card._setMobileView(e.target.checked)}
                                />
                                <span class="muted">${card._useMobileView ? 'On' : 'Off'}</span>
                            </label>
                        </div>
                        <div class="muted">
                            Per user/device and only applies on mobile screens.
                        </div>
                        <div class="muted">Use the card editor for schedule layout changes.</div>
                    </div>
                </div>

                <div class="section">
                    <div class="title">Home controls</div>
                    <div class="panelBody">
                        <div class="muted">Pick entities from your Home Assistant instance.</div>
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
                                    @click=${() => {
                                        if (!addValue) return;
                                        if (!entityIds.includes(addValue)) return;
                                        if (homeControls.includes(addValue)) return;
                                        const next = [...homeControls, addValue];
                                        card._updateConfigPartial({ home_controls: next });
                                        this._homeControlAdd = '';
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
                                              @click=${() => {
                                                  const next = homeControls.filter(
                                                      (item) => item !== eid
                                                  );
                                                  card._updateConfigPartial({
                                                      home_controls: next,
                                                  });
                                              }}
                                          >
                                              Remove
                                          </button>
                                      </div>
                                  `
                              )
                            : html`<div class="muted">No home controls selected.</div>`}
                    </div>
                </div>
                </div>
            </div>
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
