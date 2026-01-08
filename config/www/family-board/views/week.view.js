/* Family Board - week view (single timeline per day)
 * - Days as columns
 * - Events colour-coded by calendar/person (no per-person columns)
 * - Sticky day headers
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import {
    addDays,
    startOfDay,
    formatDayTitle,
    pad2,
    clamp,
    assignOverlapLanes,
    minutesSinceMidnight,
    debugLog,
} from '../family-board.util.js';

export class FbWeekView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
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
            padding: 12px;
        }
        .board {
            min-width: 1220px;
        }
        .grid {
            display: grid;
            grid-template-columns: 90px repeat(7, minmax(220px, 1fr));
            gap: 10px;
            align-items: start;
        }
        .col {
            position: relative;
            border-radius: 14px;
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            overflow: hidden;
        }
        .stickyTop {
            position: sticky;
            top: 0;
            z-index: 4;
        }
        .topBlank {
            height: 52px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
        }
        .dayHead {
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            font-weight: 800;
        }
        .alldayLabel {
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            padding: 8px 10px;
            min-height: 46px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            color: var(--fb-muted);
            font-size: 12px;
        }
        .alldayRow {
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            padding: 8px 10px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            min-height: 46px;
        }
        .chip {
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-left: 5px solid transparent;
            border-radius: 999px;
            padding: 6px 10px;
            background: var(--fb-surface);
            cursor: pointer;
            font-size: 12px;
            max-width: 260px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .timeInner {
            position: relative;
        }
        .timeRow {
            height: var(--fb-slot-px);
            border-top: 1px solid var(--fb-grid);
            position: relative;
            padding-left: 10px;
        }
        .timeRow.hour {
            border-top-color: rgba(15, 23, 42, 0.22);
        }
        .timeLabel {
            position: absolute;
            top: -9px;
            left: 10px;
            font-size: 12px;
            background: var(--fb-surface);
            padding-right: 6px;
            color: var(--fb-muted);
            font-variant-numeric: tabular-nums;
        }
        .lane {
            position: relative;
        }
        .slotBg {
            position: relative;
        }
        .slotRow {
            height: var(--fb-slot-px);
            border-top: 1px solid var(--fb-grid);
        }
        .eventsLayer {
            position: absolute;
            inset: 0;
            pointer-events: none;
        }
        .event {
            position: absolute;
            pointer-events: auto;
            left: 0;
            right: 0;
            border-radius: 12px;
            border-left: 5px solid transparent;
            border: 1px solid rgba(15, 23, 42, 0.12);
            background: var(--fb-surface);
            padding: 8px 8px 6px;
            overflow: hidden;
            text-align: left;
        }
        .eventTime {
            font-size: 12px;
            color: var(--fb-muted);
            margin-bottom: 2px;
            font-variant-numeric: tabular-nums;
        }
        .eventTitle {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.15;
        }
        .nowLine {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(236, 64, 122, 0.7);
            z-index: 3;
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const calendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];

        const base = startOfDay(card._selectedDay());
        const days = Array.from({ length: 7 }).map((_, i) => addDays(base, i));

        const dayStartHour = card._dayStartHour ?? 6;
        const dayEndHour = card._dayEndHour ?? 22;
        const slotMinutes = card._slotMinutes ?? 30;
        const pxPerHour = card._pxPerHour ?? 120;

        const startMin = dayStartHour * 60;
        const endMin = dayEndHour * 60;
        const totalMinutes = endMin - startMin;
        const slots = Math.ceil(totalMinutes / slotMinutes);
        const slotPx = (pxPerHour / 60) * slotMinutes;
        this.style.setProperty('--fb-slot-px', `${slotPx}px`);

        const timeRows = [];
        for (let i = 0; i <= slots; i++) {
            const minute = startMin + i * slotMinutes;
            const h = Math.floor(minute / 60);
            const mm = minute % 60;
            timeRows.push({ label: `${pad2(h)}:${pad2(mm)}`, isHour: mm === 0 });
        }

        const now = new Date();
        const showNow = card._dayOffset === 0;
        const nowMin = minutesSinceMidnight(now);
        const nowTopSlots = (nowMin - startMin) / slotMinutes;
        const nowTop = clamp(nowTopSlots * slotPx, 0, slots * slotPx);

        const dayData = days.map((d) => {
            const allDay = this._allDayEventsForDay(card, calendars, d);
            const timed = this._timedEventsForDay(card, calendars, d, { startMin, endMin });
            return { d, allDay, timed };
        });

        debugLog(card._debug, 'WeekView event counts', {
            days: dayData.map((x) => ({
                day: x.d.toDateString(),
                allDay: x.allDay.length,
                timed: x.timed.length,
            })),
        });

        return html`
            <div class="wrap">
                <div class="board">
                    <div class="grid stickyTop">
                        <div class="col topBlank"></div>
                        ${days.map(
                            (d) => html`
                                <div class="col dayHead">
                                    <span>${formatDayTitle(d)}</span>
                                </div>
                            `
                        )}
                    </div>

                    <div class="grid">
                        <div class="col alldayLabel">All day</div>
                        ${dayData.map((row) => {
                            const allDay = row.allDay;
                            return html`
                                <div class="col alldayRow">
                                    ${allDay.length
                                        ? allDay
                                              .slice(0, 10)
                                              .map(
                                                  (e) => html`
                                                      <button
                                                          class="chip"
                                                          style="border-left-color:${e._fbColour}"
                                                          @click=${() =>
                                                              card._openMoreInfo(e._fbEntityId)}
                                                          title=${e.summary}
                                                      >
                                                          ${e.summary}
                                                      </button>
                                                  `
                                              )
                                        : html`<span style="color:var(--fb-muted);font-size:12px"
                                              >-</span
                                          >`}
                                </div>
                            `;
                        })}
                    </div>

                    <div class="grid">
                        <div class="col">
                            <div class="timeInner">
                                ${timeRows.map(
                                    (r) => html`
                                        <div class="timeRow ${r.isHour ? 'hour' : ''}">
                                            ${r.isHour
                                                ? html`<span class="timeLabel">${r.label}</span>`
                                                : html``}
                                        </div>
                                    `
                                )}
                            </div>
                        </div>

                        ${dayData.map((row) => {
                            const timed = row.timed;
                            const d = row.d;
                            return html`
                                <div class="col">
                                    <div class="lane">
                                        <div class="slotBg">
                                            ${Array.from({ length: slots + 1 }).map(
                                                () => html`<div class="slotRow"></div>`
                                            )}
                                        </div>

                                        <div class="eventsLayer">
                                            ${showNow && this._isSameDay(d, now)
                                                ? html`<div
                                                      class="nowLine"
                                                      style="top:${nowTop}px"
                                                  ></div>`
                                                : html``}
                                            ${timed.map((ev) => {
                                                const startSlots =
                                                    (ev.startMin - startMin) / slotMinutes;
                                                const endSlots =
                                                    (ev.endMin - startMin) / slotMinutes;
                                                const top = startSlots * slotPx;
                                                const height = Math.max(
                                                    18,
                                                    (endSlots - startSlots) * slotPx
                                                );

                                                const widthPct = 100 / ev.lanesTotal;
                                                const leftPct = ev.lane * widthPct;
                                                const timeText = `${pad2(
                                                    ev.start.getHours()
                                                )}:${pad2(ev.start.getMinutes())}`;

                                                return html`
                                                    <button
                                                        class="event"
                                                        style="
                              top:${top}px;
                              height:${height}px;
                              left:${leftPct}%;
                              width:${widthPct}%;
                              border-left-color:${ev._fbColour};
                            "
                                                        @click=${() =>
                                                            card._openMoreInfo(ev._fbEntityId)}
                                                        title=${ev.summary}
                                                    >
                                                        <div class="eventTime">${timeText}</div>
                                                        <div class="eventTitle">${ev.summary}</div>
                                                    </button>
                                                `;
                                            })}
                                        </div>
                                    </div>
                                </div>
                            `;
                        })}
                    </div>
                </div>
            </div>
        `;
    }

    _isSameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    _allDayEventsForDay(card, calendars, day) {
        const out = [];
        for (const c of calendars) {
            const entityId = c.entity;
            const colour = c.color || '#a3c4f3';
            const name = c.name || entityId;
            const evs = card._eventsForEntityOnDay(entityId, day);
            for (const e of evs) {
                if (!e.all_day) continue;
                out.push({ ...e, _fbEntityId: entityId, _fbColour: colour, _fbName: name });
            }
        }
        return out;
    }

    _timedEventsForDay(card, calendars, day, { startMin, endMin }) {
        const raw = [];
        for (const c of calendars) {
            const entityId = c.entity;
            const colour = c.color || '#a3c4f3';
            const name = c.name || entityId;
            const evs = card._eventsForEntityOnDay(entityId, day);
            for (const e of evs) {
                if (e.all_day) continue;
                const s = e._start;
                const en = e._end;
                const startMinEv = s.getHours() * 60 + s.getMinutes();
                const endMinEv = en.getHours() * 60 + en.getMinutes();

                const clampedStart = Math.max(startMin, startMinEv);
                const clampedEnd = Math.min(endMin, endMinEv);

                raw.push({
                    ...e,
                    start: s,
                    end: en,
                    startMin: clampedStart,
                    endMin: Math.max(clampedStart + 1, clampedEnd),
                    _fbEntityId: entityId,
                    _fbColour: colour,
                    _fbName: name,
                });
            }
        }
        return assignOverlapLanes(raw);
    }
}

customElements.define('fb-week-view', FbWeekView);
