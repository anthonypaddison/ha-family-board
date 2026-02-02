/* Family Board - important view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import { addDays, pad2, startOfDay } from '../family-board.util.js';
const { LitElement, html, css } = getHaLit();

export class FbImportantView extends LitElement {
    static properties = { card: { type: Object }, renderKey: { type: String } };

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
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            height: 100%;
            min-height: 0;
        }
        .column {
            border: 1px solid var(--fb-grid);
            border-radius: 14px;
            background: var(--fb-surface);
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow: auto;
            min-height: 0;
        }
        .colTitle {
            font-weight: 800;
            font-size: 18px;
            color: var(--fb-text);
        }
        .section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .sectionTitle {
            font-weight: 700;
            color: var(--fb-text);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .item {
            border: 1px solid var(--fb-grid);
            border-left: 6px solid var(--item-color);
            border-radius: 10px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background: var(--fb-surface-2);
        }
        .itemRow {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .itemTime {
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            color: var(--fb-text);
            min-width: 72px;
        }
        .itemTitle {
            font-weight: 700;
            color: var(--fb-text);
            flex: 1;
        }
        .itemMeta {
            color: var(--fb-muted);
            font-size: 12px;
        }
        .personMeta {
            font-size: 13px;
            font-weight: 700;
            color: var(--fb-text);
        }
        .empty {
            color: var(--fb-muted);
            font-size: 14px;
        }
        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }
        }
    `;

    _timeLabel(start, end, allDay) {
        if (allDay) return 'All day';
        if (!start) return '—';
        const startLabel = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
        if (!end) return startLabel;
        const endLabel = `${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
        return `${startLabel}–${endLabel}`;
    }

    _rangeItems(card, start, end) {
        const events = Array.isArray(card._calendarEventsMerged)
            ? card._calendarEventsMerged
            : [];
        const visible = new Set(card._visibleCalendarEntities?.() || []);
        const eventItems = events
            .filter((e) => e?._start && e?._end)
            .filter((e) => (visible.size ? visible.has(e._fbEntityId) : true))
            .filter((e) => e._start < end && e._end > start)
            .map((e) => {
                const person = card._personForEntity?.(e._fbEntityId);
                const color = person?.color || card._neutralColor?.() || '#999999';
                const title = e.summary || '(Event)';
                const allDay = Boolean(e.all_day || e.allDay);
                return {
                    type: 'event',
                    title,
                    start: e._start,
                    allDay,
                    color,
                    person: person?.name || '',
                    entityId: e._fbEntityId,
                    event: e,
                };
            })
            .sort((a, b) => (a.start?.getTime?.() || 0) - (b.start?.getTime?.() || 0));

        const todos = Array.isArray(card._config?.todos) ? card._config.todos : [];
        const todoItems = [];
        for (const todo of todos) {
            if (!todo?.entity) continue;
            if (!card._isPersonAllowed?.(card._personIdForConfig?.(todo, todo.entity)))
                continue;
            const items = card._todoItems?.[todo.entity] || [];
            const person = card._peopleById?.get(
                todo.person_id || todo.personId || todo.person
            );
            const color = person?.color || todo.color || card._neutralColor?.() || '#999999';
            for (const it of items) {
                const status = String(it?.status || '').toLowerCase();
                if (status === 'completed' || status === 'done') continue;
                const due = it?.due || it?.due_date || it?.due_datetime;
                if (!due) continue;
                const dueValue = due?.date || due?.dateTime || due;
                const dueDate = new Date(dueValue);
                if (Number.isNaN(dueDate.getTime())) continue;
                if (dueDate < start || dueDate >= end) continue;
                todoItems.push({
                    type: 'todo',
                    title: it.summary || it.name || it.item || '(Todo)',
                    start: dueDate,
                    allDay: Boolean(due?.date) || Boolean(due?.all_day),
                    color,
                    person: person?.name || todo.name || '',
                });
            }
        }
        todoItems.sort((a, b) => a.start.getTime() - b.start.getTime());

        return { eventItems, todoItems };
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const todayItems = this._rangeItems(card, today, tomorrow);
        const tomorrowItems = this._rangeItems(card, tomorrow, addDays(tomorrow, 1));

        const column = (label, items) => html`
            <div class="column">
                <div class="colTitle">${label}</div>
                <div class="section">
                    <div class="sectionTitle">Events</div>
                    <div class="list">
                        ${items.eventItems.length
                            ? items.eventItems.map(
                                  (e) => html`
                                      <div
                                          class="item"
                                          style="--item-color:${e.color}"
                                          @click=${() =>
                                              e.entityId &&
                                              card._openEventDialog?.(e.entityId, e.event)}
                                      >
                                          <div class="itemRow">
                                              <div class="itemTime">
                                                  ${this._timeLabel(e.start, e.event?._end, e.allDay)}
                                              </div>
                                              <div class="itemTitle">${e.title}</div>
                                          </div>
                                          ${e.person
                                              ? html`<div class="itemMeta personMeta">${e.person}</div>`
                                              : html``}
                                      </div>
                                  `
                              )
                            : html`<div class="empty">No events.</div>`}
                    </div>
                </div>
                <div class="section">
                    <div class="sectionTitle">Todos due</div>
                    <div class="list">
                        ${items.todoItems.length
                            ? items.todoItems.map(
                                  (t) => html`
                                      <div class="item" style="--item-color:${t.color}">
                                          <div class="itemRow">
                                              <div class="itemTime">
                                                  ${this._timeLabel(t.start, t.start, t.allDay)}
                                              </div>
                                              <div class="itemTitle">${t.title}</div>
                                          </div>
                                          ${t.person
                                              ? html`<div class="itemMeta personMeta">${t.person}</div>`
                                              : html``}
                                      </div>
                                  `
                              )
                            : html`<div class="empty">No todos due.</div>`}
                    </div>
                </div>
            </div>
        `;

        return html`
            <div class="wrap">
                <div class="layout">
                    ${column('Today', todayItems)}
                    ${column('Tomorrow', tomorrowItems)}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-important-view', FbImportantView);
