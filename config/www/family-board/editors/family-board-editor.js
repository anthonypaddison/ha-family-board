/* Family Board - Lovelace card editor
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { fireEvent } from '../family-board.util.js';

export class FamilyBoardEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
    };

    static styles = css`
        :host {
            display: block;
            padding: 12px;
        }
        .section {
            border: 1px solid var(--fb-grid, #e5e7eb);
            border-radius: 10px;
            padding: 10px;
            margin-bottom: 12px;
        }
        .row {
            display: grid;
            gap: 8px;
            grid-template-columns: 1fr 1fr 1fr auto;
            margin-top: 8px;
            align-items: center;
        }
        .row.people {
            grid-template-columns: 1fr 1fr 1fr 110px auto;
        }
        .row.calendars {
            grid-template-columns: 1fr 1fr 1fr 1fr auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        label {
            font-size: 13px;
            color: var(--fb-muted);
        }
        input,
        select {
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid var(--fb-grid);
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            background: var(--fb-surface-2);
            padding: 6px 10px;
            cursor: pointer;
            font-size: 13px;
            color: var(--fb-text);
        }
        .note {
            color: var(--fb-muted);
            font-size: 13px;
            margin-top: 6px;
        }
    `;

    setConfig(config) {
        this._config = { ...config };
    }

    _updateConfig(patch) {
        const next = { ...this._config, ...patch };
        this._config = next;
        fireEvent(this, 'config-changed', { config: next });
    }

    _ensureList(key) {
        if (!Array.isArray(this._config[key])) this._config[key] = [];
    }

    _entityExists(entityId) {
        return Boolean(this.hass?.states?.[entityId]);
    }

    render() {
        const cfg = this._config || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];

        return html`
            <div class="section">
                <div style="font-weight:700">Basics</div>
                <div class="row small">
                    <input
                        placeholder="Title"
                        .value=${cfg.title || ''}
                        @input=${(e) => this._updateConfig({ title: e.target.value })}
                    />
                    <label>
                        <input
                            type="checkbox"
                            .checked=${Boolean(cfg.debug)}
                            @change=${(e) => this._updateConfig({ debug: e.target.checked })}
                        />
                        Debug
                    </label>
                </div>
                <div class="row">
                    <input
                        type="number"
                        placeholder="Days to show (fixed to 5)"
                        .value=${5}
                        disabled
                        @input=${(e) =>
                            this._updateConfig({ days_to_show: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Day start hour"
                        .value=${cfg.day_start_hour ?? 6}
                        @input=${(e) =>
                            this._updateConfig({ day_start_hour: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Day end hour"
                        .value=${cfg.day_end_hour ?? 22}
                        @input=${(e) =>
                            this._updateConfig({ day_end_hour: Number(e.target.value) })}
                    />
                    <input
                        type="number"
                        placeholder="Refresh ms"
                        .value=${cfg.refresh_interval_ms ?? 300000}
                        @input=${(e) =>
                            this._updateConfig({ refresh_interval_ms: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">People</div>
                ${people.map(
                    (p, idx) => html`
                        <div class="row people">
                            <input
                                placeholder="id"
                                .value=${p.id || ''}
                                @input=${(e) => {
                                    p.id = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <input
                                placeholder="name"
                                .value=${p.name || ''}
                                @input=${(e) => {
                                    p.name = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <input
                                placeholder="colour"
                                .value=${p.color || ''}
                                @input=${(e) => {
                                    p.color = e.target.value;
                                    this._updateConfig({ people: [...people] });
                                }}
                            />
                            <select
                                .value=${p.header_row || 1}
                                @change=${(e) => {
                                    p.header_row = Number(e.target.value);
                                    this._updateConfig({ people: [...people] });
                                }}
                            >
                                <option value="1">Row 1</option>
                                <option value="2">Row 2</option>
                            </select>
                            <button
                                class="btn"
                                @click=${() => {
                                    people.splice(idx, 1);
                                    this._updateConfig({ people: [...people] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('people');
                            people.push({ id: '', name: '', color: '' });
                            this._updateConfig({ people: [...people] });
                        }}
                    >
                        Add person
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Calendars</div>
                ${calendars.map(
                    (c, idx) => html`
                        <div class="row calendars">
                            <input
                                placeholder="calendar.entity"
                                .value=${c.entity || ''}
                                @input=${(e) => {
                                    c.entity = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            />
                            <input
                                placeholder="person_id"
                                .value=${c.person_id || ''}
                                @input=${(e) => {
                                    c.person_id = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            />
                            <select
                                .value=${c.role || ''}
                                @change=${(e) => {
                                    c.role = e.target.value;
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                <option value="">Role</option>
                                <option value="family">Family</option>
                                <option value="routine">Routine</option>
                            </select>
                            <div class="note">
                                ${c.entity && !this._entityExists(c.entity)
                                    ? 'Entity not found'
                                    : ''}
                            </div>
                            <button
                                class="btn"
                                @click=${() => {
                                    calendars.splice(idx, 1);
                                    this._updateConfig({ calendars: [...calendars] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('calendars');
                            calendars.push({ entity: '', person_id: '' });
                            this._updateConfig({ calendars: [...calendars] });
                        }}
                    >
                        Add calendar
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Todo lists</div>
                ${todos.map(
                    (t, idx) => html`
                        <div class="row">
                            <input
                                placeholder="todo.entity"
                                .value=${t.entity || ''}
                                @input=${(e) => {
                                    t.entity = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            />
                            <input
                                placeholder="name"
                                .value=${t.name || ''}
                                @input=${(e) => {
                                    t.name = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            />
                            <input
                                placeholder="person_id"
                                .value=${t.person_id || ''}
                                @input=${(e) => {
                                    t.person_id = e.target.value;
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            />
                            <div class="note">
                                ${t.entity && !this._entityExists(t.entity)
                                    ? 'Entity not found'
                                    : ''}
                            </div>
                            <button
                                class="btn"
                                @click=${() => {
                                    todos.splice(idx, 1);
                                    this._updateConfig({ todos: [...todos] });
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    `
                )}
                <div class="row small">
                    <button
                        class="btn"
                        @click=${() => {
                            this._ensureList('todos');
                            todos.push({ entity: '', name: '', person_id: '' });
                            this._updateConfig({ todos: [...todos] });
                        }}
                    >
                        Add todo list
                    </button>
                </div>
            </div>

            <div class="section">
                <div style="font-weight:700">Shopping</div>
                <div class="row small">
                    <input
                        placeholder="todo.shopping_list_2"
                        .value=${cfg.shopping?.entity || ''}
                        @input=${(e) =>
                            this._updateConfig({
                                shopping: { ...(cfg.shopping || {}), entity: e.target.value },
                            })}
                    />
                </div>
                ${cfg.shopping?.entity && !this._entityExists(cfg.shopping.entity)
                    ? html`<div class="note">Entity not found</div>`
                    : html``}
            </div>
        `;
    }
}

customElements.define('family-board-editor', FamilyBoardEditor);
