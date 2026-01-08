/* Family Board - schedule view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { addDays, startOfDay, pad2, clamp, minutesSinceMidnight, debugLog } from '../family-board.util.js';
import { getReadableTextColour } from '../util/colour.util.js';
import { layoutDayEvents } from './schedule.layout.js';

export class FbScheduleView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    updated(changedProps) {
        if (changedProps.has('renderKey')) {
            this._didInitialScroll = false;
        }
        this._scrollToNow();
    }

    _scrollToNow() {
        if (this._didInitialScroll) return;
        if (!this._autoScrollEnabled) return;
        const scroller = this.renderRoot.querySelector('.gridScroll');
        if (!scroller) return;
        const now = new Date();
        const nowMin = minutesSinceMidnight(now);
        const slotMinutes = this._slotMinutes ?? 30;
        const slotPx = this._slotPx ?? 0;
        const startMin = this._startMin ?? 0;
        const nowTop = ((nowMin - startMin) / slotMinutes) * slotPx;
        scroller.scrollTop = Math.max(0, nowTop - slotPx * 2);
        this._didInitialScroll = true;
    }

    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }
        .wrap {
            height: 100%;
            overflow: hidden;
            padding: 16px;
            background: var(--fb-bg);
            display: flex;
            flex-direction: column;
        }
        .card {
            background: var(--fb-surface);
            border-radius: var(--fb-radius);
            border: 1px solid var(--fb-border);
            box-shadow: var(--fb-shadow);
            padding: 14px;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
        }
        .board {
            min-width: 0;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .linkBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            font-weight: 700;
            color: var(--fb-text);
        }
        .gridScroll {
            overflow-y: auto;
            min-height: 0;
            padding-bottom: 6px;
            flex: 1;
        }
        .row {
            display: grid;
            grid-template-columns: var(--fb-time-width, 80px) repeat(var(--fb-days), minmax(0, 1fr));
            gap: 8px;
            align-items: stretch;
        }
        .gutterHead,
        .gutterAllDay,
        .gutterTimes {
            border-radius: 10px;
            background: var(--fb-surface);
            border: 1px solid var(--fb-border);
        }
        .gutterHead {
            height: 56px;
            background: transparent;
            border: 0;
        }
        .gutterAllDay {
            min-height: 52px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 8px;
            font-size: 12px;
            color: var(--fb-muted);
        }
        .gutterTimes {
            position: relative;
        }
        .timeRow {
            height: var(--fb-slot-px);
            border-top: 1px solid var(--fb-grid);
            position: relative;
            padding-left: 10px;
        }
        .timeRow.hour {
            border-top-color: color-mix(in srgb, var(--fb-grid) 70%, transparent);
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
        .timeLabel.half {
            opacity: 0.7;
        }
        .dayHead {
            height: 56px;
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            padding: 8px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
        }
        .dayName {
            font-weight: 800;
            font-size: 14px;
        }
        .dayDate {
            font-size: 13px;
            color: var(--fb-muted);
        }
        .allDay {
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            padding: 6px;
            min-height: 52px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-content: flex-start;
        }
        .chip {
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, var(--event-color) 60%, var(--fb-border));
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            background: var(--event-color);
            color: var(--event-text);
            display: inline-flex;
            align-items: center;
            gap: 6px;
            max-width: 220px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .chipDot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: var(--event-text);
            flex: 0 0 auto;
        }
        .dayCol {
            position: relative;
            border-radius: 10px;
            border: 1px solid var(--fb-border);
            background: color-mix(in srgb, var(--fb-surface) 92%, var(--palette-lilac));
            overflow: hidden;
        }
        .slotBg {
            position: relative;
            background: linear-gradient(
                    to bottom,
                    color-mix(in srgb, var(--fb-grid) 30%, transparent) 1px,
                    transparent 1px
                )
                top / 100% var(--fb-slot-px);
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
            border-radius: 10px;
            border: 1px solid color-mix(in srgb, var(--event-color) 70%, var(--fb-border));
            background: var(--event-color);
            color: var(--event-text);
            padding: 8px 10px;
            text-align: left;
            overflow: hidden;
            box-shadow: 0 6px 14px color-mix(in srgb, #000 10%, transparent);
        }
        .eventTime {
            font-size: 12px;
            color: var(--event-text);
            margin-bottom: 4px;
            font-variant-numeric: tabular-nums;
            opacity: 0.9;
        }
        .eventTitle {
            font-size: 13px;
            font-weight: 800;
            line-height: 1.15;
        }
        .overflow {
            position: absolute;
            right: 8px;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface-2);
            font-size: 12px;
            color: var(--fb-muted);
        }
        .nowLine {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(236, 64, 122, 0.7);
            z-index: 2;
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const daysToShow = card._scheduleDays || 5;
        const dayStartHour = card._dayStartHour ?? 6;
        const dayEndHour = card._dayEndHour ?? 22;
        const slotMinutes = card._slotMinutes ?? 30;
        const pxPerHour = card._pxPerHour ?? 120;
        const pxPerMin = pxPerHour / 60;

        const startMin = dayStartHour * 60;
        const endMin = dayEndHour * 60;
        const totalMinutes = endMin - startMin;
        const slots = Math.ceil(totalMinutes / slotMinutes);
        const slotPx = (pxPerHour / 60) * slotMinutes;
        this.style.setProperty('--fb-slot-px', `${slotPx}px`);
        this.style.setProperty('--fb-days', String(daysToShow));
        this.style.setProperty('--fb-time-width', '80px');

        const base = startOfDay(card._selectedDay());
        const days = Array.from({ length: daysToShow }).map((_, i) => addDays(base, i));

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
        this._slotMinutes = slotMinutes;
        this._slotPx = slotPx;
        this._startMin = startMin;
        this._autoScrollEnabled = showNow;

        const calendarList = Array.isArray(cfg.calendars) ? cfg.calendars : [];
        const visibleSet =
            card._calendarVisibleSet || new Set(calendarList.map((c) => c.entity));
        const calendars = calendarList.filter(
            (c) => visibleSet.has(c.entity) && card._isPersonAllowed(c.person_id || c.personId || c.person || c.entity)
        );

        const maxAllDay = 6;
        const dayData = days.map((day) => {
            const allDay = [];
            const timedRaw = [];

            for (const c of calendars) {
                const events = card._eventsForEntityOnDay(c.entity, day);
                        const person = card._personForEntity(c.entity);
                const colour = person?.color || card._neutralColor();
                const personName = person?.name || c.name || c.entity;

                for (const e of events) {
                    if (e.all_day) {
                        allDay.push({
                            ...e,
                            _fbColour: colour,
                            _fbName: personName,
                            _fbEntityId: c.entity,
                        });
                        continue;
                    }

                    const s = e._start;
                    const en = e._end;
                    if (!s || !en) continue;
                    const startMinEv = s.getHours() * 60 + s.getMinutes();
                    const endMinEv = en.getHours() * 60 + en.getMinutes();
                    const clampedStart = Math.max(startMin, startMinEv);
                    const clampedEnd = Math.min(endMin, endMinEv);

                    timedRaw.push({
                        ...e,
                        start: s,
                        end: en,
                        startMin: clampedStart,
                        endMin: Math.max(clampedStart + 1, clampedEnd),
                        _fbColour: colour,
                        _fbName: personName,
                        _fbEntityId: c.entity,
                    });
                }
            }

            const layout = layoutDayEvents(timedRaw, { maxColumns: 3 });
            const visibleAllDay = allDay.slice(0, maxAllDay);
            const hiddenAllDay = Math.max(allDay.length - visibleAllDay.length, 0);
            return {
                day,
                allDay: visibleAllDay,
                allDayHidden: hiddenAllDay,
                timed: layout.items,
                overflows: layout.overflows,
            };
        });

        const totalEvents = dayData.reduce(
            (sum, row) => sum + row.allDay.length + row.timed.length,
            0
        );

        debugLog(card._debug, 'ScheduleView event counts', {
            days: dayData.map((x) => ({
                day: x.day.toDateString(),
                allDay: x.allDay.length,
                timed: x.timed.length,
                overflow: x.overflows.reduce((sum, o) => sum + o.count, 0),
            })),
        });

        return html`
            <div class="wrap">
                <div class="card">
                    <div class="board">
                    <div class="row">
                        <div class="gutterHead"></div>
                        ${days.map((d) => {
                            const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
                            const dayDate = d.toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: 'short',
                            });
                            return html`
                                <div class="dayHead">
                                    <div class="dayName">${dayName}</div>
                                    <div class="dayDate">${dayDate}</div>
                                </div>
                            `;
                        })}
                    </div>

                    <div class="row">
                        <div class="gutterAllDay">All day</div>
                        ${dayData.map((row) => {
                            const allDay = row.allDay;
                            return html`
                                <div class="allDay">
                                    ${allDay.length
                                        ? allDay.map(
                                              (e) => html`
                                                  <button
                                                      class="chip"
                                                      style="
                                                          --event-color:${e._fbColour};
                                                          --event-text:${getReadableTextColour(e._fbColour)};
                                                      "
                                                      @click=${() =>
                                                          card._openEventDialog(e._fbEntityId, e)}
                                                      title=${e.summary}
                                                  >
                                                      <span class="chipDot"></span>
                                                      <span>${e.summary}</span>
                                                  </button>
                                              `
                                          )
                                        : html`<span style="color:var(--fb-muted);font-size:12px"
                                              >-</span
                                          >`}
                                    ${row.allDayHidden
                                        ? html`<span
                                              class="chip"
                                              style="--event-color:var(--fb-surface-2);--event-text:var(--fb-muted)"
                                          >
                                              <span class="chipDot"></span>
                                              <span>+${row.allDayHidden} more</span>
                                          </span>`
                                        : html``}
                                </div>
                            `;
                        })}
                    </div>

                    <div class="gridScroll">
                        <div class="row">
                            <div class="gutterTimes">
                                ${timeRows.map(
                                    (r) => html`
                                        <div class="timeRow ${r.isHour ? 'hour' : ''}">
                                            <span class="timeLabel ${r.isHour ? '' : 'half'}"
                                                >${r.label}</span
                                            >
                                        </div>
                                    `
                                )}
                            </div>

                            ${dayData.map((row) => {
                                return html`
                                    <div class="dayCol">
                                        <div class="slotBg">
                                            ${Array.from({ length: slots + 1 }).map(
                                                () => html`<div class="slotRow"></div>`
                                            )}
                                        </div>

                                        <div class="eventsLayer">
                                            ${showNow && card._isSameDay(row.day, now)
                                                ? html`<div class="nowLine" style="top:${nowTop}px"></div>`
                                                : html``}
                                            ${row.timed.map((ev) => {
                                                const startSlots =
                                                    (ev.startMin - startMin) / slotMinutes;
                                                const endSlots =
                                                    (ev.endMin - startMin) / slotMinutes;
                                                const top = startSlots * slotPx;
                                                const height = Math.max(
                                                    36,
                                                    (endSlots - startSlots) * slotPx
                                                );

                                                const widthPct = 100 / ev.lanesTotal;
                                                const leftPct = ev.lane * widthPct;
                                                const timeText = `${pad2(ev.start.getHours())}:${pad2(
                                                    ev.start.getMinutes()
                                                )}\u2013${pad2(ev.end.getHours())}:${pad2(
                                                    ev.end.getMinutes()
                                                )}`;

                                                return html`
                                                    <button
                                                        class="event"
                                                        style="
                                                            --event-color:${ev._fbColour};
                                                            --event-text:${getReadableTextColour(
                                                                ev._fbColour
                                                            )};
                                                            top:${top}px;
                                                            height:${height}px;
                                                            left:calc(${leftPct}% + 4px);
                                                            width:calc(${widthPct}% - 8px);
                                                        "
                                                        @click=${() =>
                                                            card._openEventDialog(
                                                                ev._fbEntityId,
                                                                ev
                                                            )}
                                                        title=${ev.summary}
                                                    >
                                                        <div class="eventTime">${timeText}</div>
                                                        <div class="eventTitle">${ev.summary}</div>
                                                    </button>
                                                `;
                                            })}
                                            ${row.overflows.map(
                                                (o) =>
                                                    html`<div
                                                        class="overflow"
                                                        style="top:${(o.startMin - startMin) * pxPerMin}px"
                                                    >
                                                        +${o.count}
                                                    </div>`
                                            )}
                                        </div>
                                    </div>
                                `;
                            })}
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-schedule-view', FbScheduleView);
