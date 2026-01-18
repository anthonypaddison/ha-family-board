/* Family Board - manage sources dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbManageSources extends LitElement {
    static properties = {
        open: { type: Boolean },
        config: { type: Object },
        hass: { type: Object },
        _draft: { state: true },
        _saveError: { state: true },
    };

    static styles = css`
        :host {
            display: block;
        }
        .backdrop {
            position: fixed;
            inset: 0;
            background: var(--overlay);
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
            border: 1px solid var(--fb-grid);
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
            grid-template-columns: 1fr 1fr 1fr 120px 110px auto;
        }
        .row.calendars {
            grid-template-columns: 1fr 1fr 1fr auto auto;
        }
        .row.small {
            grid-template-columns: 1fr auto;
        }
        label {
            font-size: 14px;
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
            font-size: 14px;
            width: 100%;
            box-sizing: border-box;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            background: var(--fb-surface-2);
            padding: 6px 10px;
            cursor: pointer;
            font-size: 14px;
            color: var(--fb-text);
            min-height: var(--fb-touch);
            min-width: var(--fb-touch);
        }
        .btn.primary {
            background: var(--fb-accent);
            border-color: transparent;
        }
        .note {
            color: var(--fb-muted);
            font-size: 14px;
            margin-top: 8px;
        }
    `;

    static PEOPLE_COLOURS = [
        { name: 'Mint', color: '#36B37E', text: '#FFFFFF' },
        { name: 'Violet', color: '#7E57C2', text: '#FFFFFF' },
        { name: 'Amber', color: '#F4B400', text: '#1A1A1A' },
        { name: 'Rose', color: '#EC407A', text: '#FFFFFF' },
        { name: 'Sky', color: '#42A5F5', text: '#FFFFFF' },
        { name: 'Lime', color: '#B2FD7F', text: '#1A1A1A' },
        { name: 'Teal', color: '#00897B', text: '#FFFFFF' },
        { name: 'Indigo', color: '#5E35B1', text: '#FFFFFF' },
        { name: 'Tangerine', color: '#FB8C00', text: '#1A1A1A' },
        { name: 'Magenta', color: '#D81B60', text: '#FFFFFF' },
        { name: 'Azure', color: '#1E88E5', text: '#FFFFFF' },
        { name: 'Leaf', color: '#8BC34A', text: '#1A1A1A' },
    ];

    willUpdate(changedProps) {
        if (changedProps.has('open') && this.open) {
            this._draft = JSON.parse(JSON.stringify(this.config || {}));
        }
    }

    close() {
        this.open = false;
        this._saveError = '';
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('fb-sources-close', { bubbles: true, composed: true }));
    }

    _emitSave() {
        const cfg = this._draft || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const stateIds = Object.keys(this.hass?.states || {});
        const stateSet = new Set(stateIds);
        for (const c of calendars) {
            if (c?.entity && !stateSet.has(c.entity)) {
                this._saveError = `Calendar entity not found: ${c.entity}`;
                return;
            }
        }
        for (const t of todos) {
            if (t?.entity && !stateSet.has(t.entity)) {
                this._saveError = `Todo entity not found: ${t.entity}`;
                return;
            }
        }
        for (const p of people) {
            if (!p?.id) continue;
            const hasCalendar = calendars.some((c) => c?.person_id === p.id);
            const hasTodo = todos.some((t) => t?.person_id === p.id);
            if (!hasCalendar && !hasTodo) {
                this._saveError = `Person "${p.name || p.id}" needs a calendar or todo list.`;
                return;
            }
        }
        this._saveError = '';
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
                if (p.text_color) push(`    text_color: '${p.text_color}'`);
                if (p.role) push(`    role: ${p.role}`);
                if (p.header_row) push(`    header_row: ${p.header_row}`);
            }
        }
        const peopleDisplay = Array.isArray(cfg.people_display) ? cfg.people_display : [];
        if (peopleDisplay.length) {
            push(`people_display:`);
            for (const id of peopleDisplay) {
                push(`  - ${id}`);
            }
        }

        if (cfg.admin_pin !== undefined) {
            push(`admin_pin: '${cfg.admin_pin}'`);
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

    _entityOptions(list, current) {
        const options = Array.isArray(list) ? [...list] : [];
        const value = String(current || '').trim();
        if (value && !options.includes(value)) {
            options.unshift(value);
        }
        return options;
    }

    render() {
        if (!this.open) return html``;
        const cfg = this._draft || {};
        const people = Array.isArray(cfg.people) ? cfg.people : [];
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const todos = Array.isArray(cfg.todos) ? cfg.todos : [];
        const stateIds = Object.keys(this.hass?.states || {});
        const calendarEntities = stateIds.filter((id) => id.startsWith('calendar.'));
        const todoEntities = stateIds.filter((id) => id.startsWith('todo.'));

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Manage sources</div>
                        <button class="btn" @click=${this.close}>Close</button>
                    </div>
                    ${this._saveError
                        ? html`<div class="note" style="color:var(--urgent)">
                              ${this._saveError}
                          </div>`
                        : html``}

                    <div class="section">
                        <div style="font-weight:700">People</div>
                        <div class="note">
                            Add a person id, display name, colour, and which header row they appear in.
                        </div>
                        ${people.map((p, idx) => {
                            const selected = FbManageSources.PEOPLE_COLOURS.find(
                                (c) => c.color === p.color
                            );
                            return html`
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
                                    <select
                                        .value=${p.color || ''}
                                        @change=${(e) => {
                                            const choice = FbManageSources.PEOPLE_COLOURS.find(
                                                (c) => c.color === e.target.value
                                            );
                                            p.color = choice?.color || '';
                                            p.text_color = choice?.text || '';
                                            this.requestUpdate();
                                        }}
                                    >
                                        <option value="">Select colour</option>
                                        ${FbManageSources.PEOPLE_COLOURS.map(
                                            (c) =>
                                                html`<option value=${c.color}>
                                                    ${c.name}
                                                </option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${p.role || ''}
                                        @change=${(e) => (p.role = e.target.value)}
                                    >
                                        <option value="">Role</option>
                                        <option value="kid">Kid</option>
                                        <option value="grownup">Grownup</option>
                                    </select>
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
                            `;
                        })}
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
                            Select existing calendar entities and map them to people.
                        </div>
                        ${calendars.map(
                            (c, idx) => html`
                                <div class="row calendars">
                                    <select
                                        .value=${c.entity || ''}
                                        @change=${(e) => (c.entity = e.target.value)}
                                    >
                                        <option value="">Select calendar</option>
                                        ${this._entityOptions(calendarEntities, c.entity).map(
                                            (id) =>
                                                html`<option value=${id}>
                                                    ${id}
                                                </option>`
                                        )}
                                    </select>
                                    <select
                                        .value=${c.person_id || ''}
                                        @change=${(e) => (c.person_id = e.target.value)}
                                    >
                                        <option value="">Select person</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option value=${p.id}>${p.name ||
                                                    p.id}</option>`
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
                        <div class="note">
                            Select existing todo lists and map them to people.
                        </div>
                        ${todos.map(
                            (t, idx) => html`
                                <div class="row">
                                    <select
                                        .value=${t.entity || ''}
                                        @change=${(e) => (t.entity = e.target.value)}
                                    >
                                        <option value="">Select todo list</option>
                                        ${this._entityOptions(todoEntities, t.entity).map(
                                            (id) =>
                                                html`<option value=${id}>
                                                    ${id}
                                                </option>`
                                        )}
                                    </select>
                                    <input
                                        placeholder="name"
                                        .value=${t.name || ''}
                                        @input=${(e) => (t.name = e.target.value)}
                                    />
                                    <select
                                        .value=${t.person_id || ''}
                                        @change=${(e) => (t.person_id = e.target.value)}
                                    >
                                        <option value="">Select person</option>
                                        ${people.map(
                                            (p) =>
                                                html`<option value=${p.id}>${p.name ||
                                                    p.id}</option>`
                                        )}
                                    </select>
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
                        <div class="note">Pick the todo list entity used for shopping.</div>
                        <div class="row small">
                            <select
                                .value=${cfg.shopping?.entity || ''}
                                @change=${(e) => {
                                    if (!cfg.shopping) cfg.shopping = {};
                                    cfg.shopping.entity = e.target.value;
                                }}
                            >
                                <option value="">Select shopping list</option>
                                ${this._entityOptions(todoEntities, cfg.shopping?.entity).map(
                                    (id) =>
                                        html`<option value=${id}>
                                            ${id}
                                        </option>`
                                )}
                            </select>
                        </div>
                    </div>

                    <div class="section">
                        <div style="font-weight:700">Copy config</div>
                        <textarea readonly .value=${this._toYaml(cfg)}></textarea>
                        <div class="row small">
                            <button class="btn" @click=${this._copyConfig}>Copy config</button>
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
