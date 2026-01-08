/* Family Board - setup wizard
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { suggestSetup } from '../util/discovery.util.js';

export class FbSetupView extends LitElement {
    static properties = {
        card: { type: Object },
        _draft: { state: true },
        _ready: { state: true },
    };

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 16px;
        }
        .panel {
            max-width: 900px;
            margin: 0 auto;
            border: 1px solid var(--fb-grid);
            border-radius: 16px;
            background: var(--fb-surface);
            padding: 14px;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 800;
            font-size: 16px;
        }
        .section {
            margin-top: 12px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 10px;
        }
        .row {
            display: grid;
            gap: 8px;
            grid-template-columns: 1fr 1fr 1fr auto;
            margin-top: 8px;
            align-items: center;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        input,
        select,
        textarea {
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px solid var(--fb-grid);
            font-size: 13px;
            background: var(--fb-surface);
        }
        textarea {
            min-height: 120px;
            font-family: monospace;
            font-size: 12px;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            background: var(--fb-surface-2);
            padding: 6px 10px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn.primary {
            background: var(--palette-lilac, #cfbaf0);
            border-color: transparent;
        }
        .note {
            color: var(--fb-muted);
            font-size: 12px;
            margin-top: 8px;
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        this._initDraft();
    }

    _initDraft() {
        if (this._ready) return;
        const suggestion = suggestSetup(this.card?.hass);
        this._draft = {
            ...this.card?._config,
            ...suggestion,
            days_to_show: 5,
            shopping: suggestion.shopping,
        };
        this._ready = true;
    }

    _copyConfig() {
        const yaml = this.card?._buildYamlConfig(this._draft);
        if (!yaml) return;
        navigator.clipboard?.writeText?.(yaml);
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const isAdmin = Boolean(card.hass?.user?.is_admin);
        if (!isAdmin) {
            return html`<div class="wrap">
                <div class="panel">
                    <div class="h">Setup required</div>
                    <div class="note">Ask an admin to finish setup.</div>
                </div>
            </div>`;
        }

        const draft = this._draft;
        if (!draft) return html``;

        const people = Array.isArray(draft.people) ? draft.people : [];
        const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
        const todos = Array.isArray(draft.todos) ? draft.todos : [];

        return html`
            <div class="wrap">
                <div class="panel">
                    <div class="h">
                        <div>First-run setup</div>
                        <button class="btn" @click=${() => card._openHelp()}>Help ⓘ</button>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">People</div>
                        ${people.map(
                            (p, idx) => html`
                                <div class="row">
                                    <input
                                        placeholder="id"
                                        .value=${p.id || ''}
                                        @input=${(e) => (p.id = e.target.value)}
                                    />
                                    <input
                                        placeholder="name"
                                        .value=${p.name || ''}
                                        @input=${(e) => (p.name = e.target.value)}
                                    />
                                    <input
                                        placeholder="colour"
                                        .value=${p.color || ''}
                                        @input=${(e) => (p.color = e.target.value)}
                                    />
                                    <select
                                        .value=${p.header_row || 1}
                                        @change=${(e) => (p.header_row = Number(e.target.value))}
                                    >
                                        <option value="1">Row 1</option>
                                        <option value="2">Row 2</option>
                                    </select>
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            people.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `
                        )}
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Calendars</div>
                        ${calendars.map(
                            (c, idx) => html`
                                <div class="row">
                                    <input
                                        placeholder="calendar.entity"
                                        .value=${c.entity || ''}
                                        @input=${(e) => (c.entity = e.target.value)}
                                    />
                                    <select
                                        .value=${c.person_id || ''}
                                        @change=${(e) => (c.person_id = e.target.value)}
                                    >
                                        <option value="">Unassigned</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option value=${p.id}>${p.name}</option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${c.role || ''}
                                        @change=${(e) => (c.role = e.target.value)}
                                    >
                                        <option value="">Role</option>
                                        <option value="family">Family</option>
                                        <option value="routine">Routine</option>
                                    </select>
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            calendars.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `
                        )}
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Todo lists</div>
                        ${todos.map(
                            (t, idx) => html`
                                <div class="row">
                                    <input
                                        placeholder="todo.entity"
                                        .value=${t.entity || ''}
                                        @input=${(e) => (t.entity = e.target.value)}
                                    />
                                    <select
                                        .value=${t.person_id || ''}
                                        @change=${(e) => (t.person_id = e.target.value)}
                                    >
                                        <option value="">Unassigned</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option value=${p.id}>${p.name}</option>`
                                        )}
                                    </select>
                                    <input
                                        placeholder="name"
                                        .value=${t.name || ''}
                                        @input=${(e) => (t.name = e.target.value)}
                                    />
                                    <button
                                        class="btn"
                                        @click=${() => {
                                            todos.splice(idx, 1);
                                            this.requestUpdate();
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            `
                        )}
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Shopping</div>
                        <div class="row small">
                            <input
                                placeholder="todo.shopping_list_2"
                                .value=${draft.shopping?.entity || ''}
                                @input=${(e) => {
                                    if (!draft.shopping) draft.shopping = {};
                                    draft.shopping.entity = e.target.value;
                                }}
                            />
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Finish</div>
                        <textarea readonly .value=${card._buildYamlConfig(draft)}></textarea>
                        <div class="row small">
                            <button class="btn" @click=${this._copyConfig}>Copy config</button>
                            <button class="btn" @click=${() => card._openEditor()}>
                                Open editor
                            </button>
                            <button
                                class="btn primary"
                                @click=${() => card._applySetupDraft(draft)}
                            >
                                Apply now
                            </button>
                        </div>
                        <div class="note">
                            Apply now updates this session. Copy config to keep it.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-setup-view', FbSetupView);
