/* Family Board - settings view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbSettingsView extends LitElement {
    static properties = { card: { type: Object } };

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 14px;
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
        }
        .row:last-child {
            border-bottom: 0;
        }
        .title {
            font-weight: 700;
            margin-bottom: 6px;
            color: var(--fb-text);
            font-size: 18px;
        }
        .muted {
            color: var(--fb-muted);
            font-size: 15px;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            background: var(--palette-lilac, #cfbaf0);
            padding: 8px 10px;
            cursor: pointer;
            color: var(--fb-text);
        }
        .input {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 15px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        ul {
            margin: 6px 0 0;
            padding-left: 18px;
            color: var(--fb-muted);
            font-size: 15px;
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

        return html`
            <div class="wrap">
                <div class="layout">
                <div class="section">
                    <div class="title">Sources</div>
                    <div class="panelBody">
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
                    <div class="title">Preferences</div>
                    <div class="panelBody">
                        <div class="row">
                            <div>Refresh interval</div>
                            <input
                                class="input"
                                type="number"
                                .value=${Math.round(card._refreshIntervalMs / 60000)}
                                @change=${(e) =>
                                    card._updateConfigPartial({
                                        refresh_interval_ms: Number(e.target.value) * 60000,
                                    })}
                            />
                        </div>
                        <div class="row">
                            <div>Debug</div>
                            <label>
                                <input
                                    type="checkbox"
                                    .checked=${card._debug}
                                    @change=${(e) =>
                                        card._updateConfigPartial({ debug: e.target.checked })}
                                />
                                <span class="muted">${card._debug ? 'On' : 'Off'}</span>
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
                        <div class="row">
                            <div>Default event duration (minutes)</div>
                            <input
                                class="input"
                                type="number"
                                min="5"
                                .value=${card._defaultEventMinutes || 30}
                                @change=${(e) => card._setDefaultEventMinutesPref(e.target.value)}
                            />
                        </div>
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
                        <div class="muted">Mobile layout is stored per user and device.</div>
                        <div class="muted">Use the card editor for schedule layout changes.</div>
                    </div>
                </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-settings-view', FbSettingsView);
