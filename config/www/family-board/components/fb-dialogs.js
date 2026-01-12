/* Family Board - simple dialogs
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { pad2 } from '../family-board.util.js';
import { CALENDAR_FEATURES } from '../services/calendar.service.js';
import '../ui/icon-picker.js';

export class FbDialogs extends LitElement {
    static properties = {
        card: { type: Object },
        open: { type: Boolean },
        mode: { type: String }, // calendar | todo | shopping
        title: { type: String },
        entityId: { type: String },
        item: { type: Object },
        calendars: { type: Array },
        todos: { type: Array },
        shopping: { type: Object },
        _selectedCalendar: { state: true },
        _emoji: { state: true },
        _emojiOpen: { state: true },
        _textValue: { state: true },
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
            max-width: 520px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
        }
        .row {
            display: grid;
            gap: 8px;
            margin-top: 10px;
        }
        label {
            font-size: 14px;
            color: var(--fb-muted);
        }
        input,
        select {
            padding: 10px 12px;
            border-radius: 10px;
            border: 1px solid var(--fb-grid);
            font-size: 16px;
            background: var(--fb-surface);
            color: var(--fb-text);
            font-family: inherit;
        }
        .actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 14px;
        }
        button {
            border: 0;
            border-radius: 10px;
            padding: 10px 12px;
            cursor: pointer;
            background: var(--fb-accent);
            color: var(--fb-text);
        }
        button.secondary {
            background: transparent;
            border: 1px solid var(--fb-grid);
            color: var(--fb-text);
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
    `;

    close() {
        this.open = false;
        this.mode = '';
        this._emojiOpen = false;
        this._emoji = '';
        this._textValue = '';
        this.requestUpdate();
        this.dispatchEvent(new CustomEvent('fb-dialog-close', { bubbles: true, composed: true }));
    }

    _emit(type, detail) {
        this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
        this.close();
    }

    _todayLocalDateTimeInputValue() {
        const d = new Date();
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
            d.getHours()
        )}:${pad2(d.getMinutes())}`;
    }

    _defaultEndValue(startValue) {
        const minutes = Number(this.card?._defaultEventMinutes || 30);
        const start = startValue ? new Date(startValue) : new Date();
        if (Number.isNaN(start.getTime())) return this._todayLocalDateTimeInputValue();
        start.setMinutes(start.getMinutes() + minutes);
        return `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(
            start.getDate()
        )}T${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
    }

    _syncEndTime(e) {
        const startValue = e?.target?.value;
        const endInput = this.renderRoot.querySelector('#end');
        if (!endInput) return;
        endInput.value = this._defaultEndValue(startValue);
    }

    _extractEmoji(text) {
        const match = String(text || '').match(/^(\p{Extended_Pictographic})\s+/u);
        if (!match) return { emoji: '', text: String(text || '') };
        return { emoji: match[1], text: String(text || '').slice(match[0].length) };
    }

    _composeText(text) {
        const trimmed = String(text || '').trim();
        if (!this._emoji) return trimmed;
        return `${this._emoji} ${trimmed}`.trim();
    }

    render() {
        if (!this.open) return html``;

        const mode = this.mode;
        const calendars = Array.isArray(this.calendars) ? this.calendars : [];
        const todos = Array.isArray(this.todos) ? this.todos : [];
        if (!this._selectedCalendar && calendars.length) {
            this._selectedCalendar = calendars[0].entity;
        }
        const calendarCounts = new Map();
        calendars.forEach((c) => {
            const person =
                this.card?._personForEntity?.(c.entity) ||
                this.card?._peopleById?.get?.(c.person_id || c.personId || c.person) ||
                null;
            const id = person?.id || c.person_id || c.personId || c.person || '';
            if (!id) return;
            calendarCounts.set(id, (calendarCounts.get(id) || 0) + 1);
        });
        const calendarLabel = (c) => {
            const person =
                this.card?._personForEntity?.(c.entity) ||
                this.card?._peopleById?.get?.(c.person_id || c.personId || c.person) ||
                null;
            const personName = person?.name || person?.id || '';
            const id = person?.id || c.person_id || c.personId || c.person || '';
            const calendarName = c.name || c.entity;
            if (!personName) return calendarName;
            if (calendarCounts.get(id) > 1) return `${personName} - ${calendarName}`;
            return personName;
        };
        const canCreate = this.card?._calendarSupports?.(
            this._selectedCalendar,
            CALENDAR_FEATURES.CREATE
        );

        if (mode === 'todo-edit' && this.item) {
            const current = this.item.summary ?? this.item.name ?? this.item.item ?? '';
            const parsed = this._extractEmoji(current);
            if (this._textValue === undefined) this._textValue = parsed.text;
            if (this._emoji === undefined) this._emoji = parsed.emoji;
        }

        if (mode === 'shopping-edit' && this.item) {
            const current = this.item.summary ?? this.item.name ?? this.item.item ?? '';
            const parsed = this._extractEmoji(current);
            if (this._textValue === undefined) this._textValue = parsed.text;
            if (this._emoji === undefined) this._emoji = parsed.emoji;
        }

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this.close()}>
                <div class="dlg">
                    <div class="h">
                        <div>${this.title || 'Add'}</div>
                        <button class="secondary" @click=${this.close}>Close</button>
                    </div>

                    ${mode === 'calendar'
                        ? html`
                              <div class="row">
                                  <label>Calendar</label>
                                  <select
                                      id="cal"
                                      @change=${(e) => (this._selectedCalendar = e.target.value)}
                                  >
                                      ${calendars.map(
                                          (c) =>
                                              html`<option value=${c.entity}>
                                                  ${calendarLabel(c)}
                                              </option>`
                                      )}
                                  </select>
                              </div>

                              <div class="row">
                                  <label>Title</label>
                                  <input id="summary" placeholder="e.g. School run" />
                              </div>

                              <div class="row">
                                  <label>Start</label>
                                  <input
                                      id="start"
                                      type="datetime-local"
                                      .value=${this._todayLocalDateTimeInputValue()}
                                      @change=${this._syncEndTime}
                                  />
                              </div>

                              <div class="row">
                                  <label>End</label>
                                  <input
                                      id="end"
                                      type="datetime-local"
                                      .value=${this._defaultEndValue(
                                          this._todayLocalDateTimeInputValue()
                                      )}
                                  />
                              </div>

                              <div class="actions">
                                  <button class="secondary" @click=${this.close}>Cancel</button>
                                  <button
                                      ?disabled=${!canCreate}
                                      @click=${() => {
                                          const cal = this.renderRoot.querySelector('#cal')?.value;
                                          const summary = this.renderRoot
                                              .querySelector('#summary')
                                              ?.value?.trim();
                                          const start =
                                              this.renderRoot.querySelector('#start')?.value;
                                          const end = this.renderRoot.querySelector('#end')?.value;
                                          this._emit('fb-add-calendar', {
                                              entityId: cal,
                                              summary,
                                              start: start ? new Date(start) : null,
                                              end: end ? new Date(end) : null,
                                          });
                                      }}
                                  >
                                      Add
                                  </button>
                              </div>
                              ${calendars.length && !canCreate
                                  ? html`<div class="row">
                                        <span style="color:var(--fb-muted);font-size:12px"
                                            >This calendar entity does not support creating
                                            events in Home Assistant.</span
                                        >
                                    </div>`
                                  : html``}
                          `
                        : html``}
                    ${mode === 'todo' || mode === 'todo-edit'
                        ? html`
                              <div class="row">
                                  <label>Person</label>
                                  <select id="todoEntity" .value=${this.entityId || ''}>
                                      ${!this.entityId
                                          ? html`<option value="">Select a list</option>`
                                          : html``}
                                      ${todos.map(
                                          (t) =>
                                              html`<option value=${t.entity}>
                                                  ${t.name || t.entity}
                                              </option>`
                                      )}
                                  </select>
                              </div>

                              <div class="row">
                                  <label>Todo</label>
                                  <div style="display:flex;gap:8px;align-items:center">
                                      <button
                                          class="secondary"
                                          @click=${() => (this._emojiOpen = !this._emojiOpen)}
                                          title="Pick icon"
                                      >
                                          ${this._emoji || '😊'}
                                      </button>
                                      <input
                                          id="todoText"
                                          placeholder="e.g. Book dentist"
                                          .value=${this._textValue || ''}
                                          @input=${(e) => (this._textValue = e.target.value)}
                                      />
                                      <fb-icon-picker
                                          .open=${this._emojiOpen}
                                          @fb-emoji=${(e) => {
                                              this._emoji = e.detail.emoji;
                                              this._emojiOpen = false;
                                          }}
                                      ></fb-icon-picker>
                                  </div>
                              </div>

                              <div class="actions">
                                  <button class="secondary" @click=${this.close}>Cancel</button>
                                  <button
                                      @click=${() => {
                                          const entityId =
                                              this.renderRoot.querySelector('#todoEntity')?.value;
                                          const text = this._composeText(this._textValue);
                                          if (!text) return;
                                          if (mode === 'todo-edit') {
                                              this._emit('fb-edit-todo', {
                                                  entityId,
                                                  item: this.item,
                                                  text,
                                              });
                                          } else {
                                              this._emit('fb-add-todo', { entityId, text });
                                          }
                                      }}
                                  >
                                      ${mode === 'todo-edit' ? 'Save' : 'Add'}
                                  </button>
                              </div>
                          `
                        : html``}
                    ${mode === 'shopping' || mode === 'shopping-edit'
                        ? html`
                              <div class="row">
                                  <label>Item</label>
                                  <div style="display:flex;gap:8px;align-items:center">
                                      <button
                                          class="secondary"
                                          @click=${() => (this._emojiOpen = !this._emojiOpen)}
                                          title="Pick icon"
                                      >
                                          ${this._emoji || '🛒'}
                                      </button>
                                      <input
                                          id="shopText"
                                          placeholder="e.g. Milk"
                                          .value=${this._textValue || ''}
                                          @input=${(e) => (this._textValue = e.target.value)}
                                      />
                                      <fb-icon-picker
                                          .open=${this._emojiOpen}
                                          @fb-emoji=${(e) => {
                                              this._emoji = e.detail.emoji;
                                              this._emojiOpen = false;
                                          }}
                                      ></fb-icon-picker>
                                  </div>
                              </div>

                              <div class="actions">
                                  <button class="secondary" @click=${this.close}>Cancel</button>
                                  <button
                                      @click=${() => {
                                          const text = this._composeText(this._textValue);
                                          if (!text) return;
                                          if (mode === 'shopping-edit') {
                                              this._emit('fb-edit-shopping', {
                                                  item: this.item,
                                                  text,
                                              });
                                          } else {
                                              this._emit('fb-add-shopping', { text });
                                          }
                                      }}
                                  >
                                      ${mode === 'shopping-edit' ? 'Save' : 'Add'}
                                  </button>
                              </div>
                          `
                        : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-dialogs', FbDialogs);
