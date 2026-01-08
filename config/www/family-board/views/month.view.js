/* Family Board - month view with per-person pips
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { startOfDay, isSameDay, debugLog } from '../family-board.util.js';

export class FbMonthView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 12px;
        }
        .cal {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
            min-width: 980px;
        }
        .head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            border-bottom: 1px solid var(--fb-grid);
            position: sticky;
            top: 0;
            background: var(--fb-surface);
            z-index: 2;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 12px;
            padding: 8px 10px;
            cursor: pointer;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }
        .cell {
            border-right: 1px solid var(--fb-grid);
            border-bottom: 1px solid var(--fb-grid);
            padding: 10px;
            min-height: 110px;
            cursor: pointer;
        }
        .cell:hover {
            background: var(--fb-surface-2);
        }
        .cell.header {
            cursor: default;
            background: var(--fb-surface-2);
            font-weight: 700;
        }
        .cell:nth-child(7n) {
            border-right: 0;
        }
        .num {
            font-weight: 700;
            font-size: 13px;
        }
        .pips {
            margin-top: 8px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }
        .pip {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            display: inline-grid;
            place-items: center;
            font-size: 9px;
            color: var(--fb-text);
        }
        .today {
            background: var(--fb-today);
        }
        .muted {
            color: var(--fb-muted);
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];

        // IMPORTANT: month view must use the month-offset date, not the day view date
        const baseDay = startOfDay(card._selectedMonthDay());
        const monthStart = new Date(baseDay.getFullYear(), baseDay.getMonth(), 1);
        const monthEnd = new Date(baseDay.getFullYear(), baseDay.getMonth() + 1, 0);

        const startDow = (monthStart.getDay() + 6) % 7; // Monday=0
        const totalDays = monthEnd.getDate();

        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= totalDays; d++)
            cells.push(new Date(baseDay.getFullYear(), baseDay.getMonth(), d));

        while (cells.length % 7 !== 0) cells.push(null);

        const today = startOfDay(new Date());

        const dayStats = cells.map((d) => {
            if (!d) return { d: null, isToday: false, pips: [], remaining: 0, dayTotal: 0 };

            const dayTotal = calendars.reduce(
                (sum, c) => sum + card._eventsForEntityOnDay(c.entity, d).length,
                0
            );

            const perPerson = new Map();
            for (const c of calendars) {
                const events = card._eventsForEntityOnDay(c.entity, d);
                if (!events.length) continue;
                const person = card._personForEntity(c.entity);
                const id = person?.id || c.entity;
                const color = person?.color || card._neutralColor();
                const current = perPerson.get(id) || { color, count: 0 };
                current.count += events.length;
                perPerson.set(id, current);
            }

            const pips = Array.from(perPerson.values());
            const visiblePips = pips.slice(0, 3);
            const remaining = Math.max(pips.length - visiblePips.length, 0);

            const isToday = isSameDay(d, today);

            return { d, isToday, pips: visiblePips, remaining, dayTotal };
        });

        const daysWithEvents = dayStats.filter((x) => x.dayTotal > 0).length;
        const totalEvents = dayStats.reduce((sum, x) => sum + x.dayTotal, 0);

        debugLog(card._debug, 'MonthView event counts', { daysWithEvents, totalEvents });

        return html`
            <div class="wrap">
                <div class="cal">
                    <div class="head">
                        <div style="font-weight:700">
                            ${baseDay.toLocaleDateString(undefined, {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </div>
                        <div style="display:flex;gap:8px">
                            <button class="btn" @click=${() => card._setMonthOffset(-1)}><</button>
                            <button class="btn" @click=${() => card._setMonthOffset(1)}>></button>
                        </div>
                    </div>

                    <div class="grid">
                        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                            (x) => html`
                                <div class="cell header" style="min-height:auto">
                                    ${x}
                                </div>
                            `
                        )}
                        ${dayStats.map((stat) => {
                            if (!stat.d) return html`<div class="cell muted"></div>`;
                            return html`
                                <div
                                    class="cell ${stat.isToday ? 'today' : ''}"
                                    @click=${() => card._setScheduleStart(stat.d)}
                                >
                                    <div class="num">${stat.d.getDate()}</div>
                                    <div class="pips">
                                        ${stat.pips.map(
                                            (p) =>
                                                html`<span
                                                    class="pip"
                                                    style="background:${p.color}"
                                                    title="${p.count} events"
                                                    >${p.count}</span
                                                >`
                                        )}
                                        ${stat.remaining
                                            ? html`<span class="pip">+${stat.remaining}</span>`
                                            : html``}
                                    </div>
                                </div>
                            `;
                        })}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-month-view', FbMonthView);
