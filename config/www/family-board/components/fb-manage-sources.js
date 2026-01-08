/* Family Board - manage sources dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbManageSources extends LitElement {
    static properties = {
        open: { type: Boolean },
        config: { type: Object },
        _draft: { state: true },
    };

    static styles = css`
        :host {
            display: block;
        }
        .backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }
        .dlg {
            width: 100%;
            max-width: 760px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            max-height: 90vh;
            overflow: auto;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .section {
            margin-top: 14px;
            border: 1px solid var(--fb-grid, #e5e7eb);
            border-radius: 10px;
            padding: 10px;
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
            grid-template-columns: 1fr 1fr 1fr auto auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        label {
            font-size: 13px;
            color: var(--fb-muted);
        }
        input,
        select,
        textarea {
            padding: 8px 10px;
            border-radius: 8px;
            border: 1px solid var(--fb-grid);
            font-size: 14px;
            background: var(--fb-surface);
            color: var(--fb-text);
        }
        textarea {
            min-height: 120px;
            font-family: monospace;
            font-size: 12px;
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
        .btn.primary {
            background: var(--palette-lilac, #cfbaf0);
            border-color: transparent;
        }
        .note {
            color: var(--fb-muted);
            font-size: 13px;
            margin-top: 8px;
        }
    `;

    willUpdate(changedProps) {
        if (changedProps.has('open') && this.open) {
            this._draft = JSON.parse(JSON.stringify(this.config || {}));
        }
    }

    close() {
        this.open = false;
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('fb-sources-close', { bubbles: true, composed: true }));
    }

    _emitSave() {
        this.dispatchEvent(
            new CustomEvent('fb-sources-save', {
                detail: { config: this._draft },
                bubbles: true,
                composed: true,
            })
        );
        this.close();
    }

    _emitOpenEditor() {
        this.dispatchEvent(new CustomEvent('fb-open-editor', { bubbles: true, composed: true }));
    }

    _copyConfig() {
        const yaml = this._toYaml(this._draft || {});
        navigator.clipboard?.writeText?.(yaml);
    }

    _toYaml(cfg) {
        const lines = [];
        const push = (l) => lines.push(l);
        push(`type: custom:family-board`);
        if (cfg.title) push(`title: ${cfg.title}`);
        if (cfg.debug !== undefined) push(`debug: ${cfg.debug ? 'true' : 'false'}`);
        push(`days_to_show: 5`);
        if (cfg.day_start_hour !== undefined) push(`day_start_hour: ${cfg.day_start_hour}`);
        if (cfg.day_end_hour !== undefined) push(`day_end_hour: ${cfg.day_end_hour}`);
        if (cfg.slot_minutes !== undefined) push(`slot_minutes: ${cfg.slot_minutes}`);
        if (cfg.px_per_hour !== undefined) push(`px_per_hour: ${cfg.px_per_hour}`);
        if (cfg.refresh_interval_ms !== undefined)
            push(`refresh_interval_ms: ${cfg.refresh_interval_ms}`);

        const people = Array.isArray(cfg.people) ? cfg.people : [];
        if (people.length) {
            push(`people:`);
            for (const p of people) {
                push(`  - id: ${p.id}`);
                if (p.name) push(`    name: ${p.name}`);
                if (p.color) push(`    color: '${p.color}'`);
                if (p.header_row) push(`    header_row: ${p.header_row}`);
            }
        }

        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        if (calendars.length) {
            push(`calendars:`);
            for (const c of calendars) {
                push(`  - entity: ${c.entity}`);
                if (c.person_id) push(`    person_id: ${c.person_id}`);
                if (c.role) push(`    role: ${c.role}`);
            }
        }

        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        if (todos.length) {
            push(`todos:`);
            for (const t of todos) {
                push(`  - entity: ${t.entity}`);
                if (t.name) push(`    name: ${t.name}`);
                if (t.person_id) push(`    person_id: ${t.person_id}`);
            }
        }

        if (cfg.shopping?.entity) {
            push(`shopping:`);
            push(`  entity: ${cfg.shopping.entity}`);
            if (cfg.shopping.name) push(`  name: ${cfg.shopping.name}`);
        }

        return lines.join('\n');
    }

    _ensureList(path) {
        if (!this._draft[path]) this._draft[path] = [];
    }

    render() {
        if (!this.open) return html``;
        const cfg = this._draft || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Manage sources</div>
                        <button class="btn" @click=${this.close}>Close</button>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">People</div>
                        <div class="note">
                            Add a person id, display name, colour, and which header row they appear in.
                        </div>
                        ${people.map(
                            (p, idx) => html`
                                <div class="row people">
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
                        <div class="row small">
                            <button
                                class="btn"
                                @click=${() => {
                                    this._ensureList('people');
                                    people.push({ id: '', name: '', color: '' });
                                    this.requestUpdate();
                                }}
                            >
                                Add person
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Calendars</div>
                        <div class="note">
                            Use calendar.entity ids, map to person_id, and set role (family or routine).
                        </div>
                        ${calendars.map(
                            (c, idx) => html`
                                <div class="row calendars">
                                    <input
                                        placeholder="calendar.entity"
                                        .value=${c.entity || ''}
                                        @input=${(e) => (c.entity = e.target.value)}
                                    />
                                    <input
                                        placeholder="person_id"
                                        .value=${c.person_id || ''}
                                        @input=${(e) => (c.person_id = e.target.value)}
                                    />
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
                        <div class="row small">
                            <button
                                class="btn"
                                @click=${() => {
                                    this._ensureList('calendars');
                                    calendars.push({ entity: '', person_id: '' });
                                    this.requestUpdate();
                                }}
                            >
                                Add calendar
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Todo lists</div>
                        <div class="note">Use todo.entity ids and map each list to a person_id.</div>
                        ${todos.map(
                            (t, idx) => html`
                                <div class="row">
                                    <input
                                        placeholder="todo.entity"
                                        .value=${t.entity || ''}
                                        @input=${(e) => (t.entity = e.target.value)}
                                    />
                                    <input
                                        placeholder="name"
                                        .value=${t.name || ''}
                                        @input=${(e) => (t.name = e.target.value)}
                                    />
                                    <input
                                        placeholder="person_id"
                                        .value=${t.person_id || ''}
                                        @input=${(e) => (t.person_id = e.target.value)}
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
                        <div class="row small">
                            <button
                                class="btn"
                                @click=${() => {
                                    this._ensureList('todos');
                                    todos.push({ entity: '', name: '', person_id: '' });
                                    this.requestUpdate();
                                }}
                            >
                                Add todo list
                            </button>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Shopping</div>
                        <div class="note">Set the shopping list todo entity (todo.shopping_list_2).</div>
                        <div class="row small">
                            <input
                                placeholder="todo.shopping_list_2"
                                .value=${cfg.shopping?.entity || ''}
                                @input=${(e) => {
                                    if (!cfg.shopping) cfg.shopping = {};
                                    cfg.shopping.entity = e.target.value;
                                }}
                            />
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Copy config</div>
                        <textarea readonly .value=${this._toYaml(cfg)}></textarea>
                        <div class="row small">
                            <button class="btn" @click=${this._copyConfig}>Copy config</button>
                            <button class="btn" @click=${this._emitOpenEditor}>Open editor</button>
                            <button class="btn primary" @click=${this._emitSave}>Save</button>
                        </div>
                        <div class="note">
                            Changes apply in-memory for this session. Use Copy config to persist.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-manage-sources', FbManageSources);
