/* Family Board - day view (single timeline)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import {
    pad2,
    clamp,
    assignOverlapLanes,
    minutesSinceMidnight,
    startOfDay,
    addDays,
} from '../family-board.util.js';

export class FbDayView extends LitElement {
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
            min-width: 980px;
        }
        .grid {
            display: grid;
            grid-template-columns: 90px 1fr;
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
            z-index: 3;
        }
        .topBlank {
            height: 52px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
        }

        .topBar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            height: 52px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            overflow: hidden;
        }

        .date {
            font-weight: 800;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--fb-text);
        }

        .legend {
            margin-left: auto;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .legendBtn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: var(--fb-muted);
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 999px;
            padding: 4px 8px;
            cursor: pointer;
        }

        .legendBtn.off {
            opacity: 0.35;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
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
            border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
            border-left: 5px solid transparent;
            border-radius: 999px;
            padding: 6px 10px;
            background: var(--fb-surface);
            color: var(--fb-text);
            cursor: pointer;
            font-size: 14px;
            max-width: 320px;
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
            border-top-color: color-mix(in srgb, var(--border) 85%, transparent);
        }
        .timeLabel {
            position: absolute;
            top: -9px;
            left: 10px;
            font-size: 14px;
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
            border-radius: 12px;
            border-left: 5px solid transparent;
            border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
            background: var(--fb-surface);
            color: var(--fb-text);
            padding: 8px 8px 6px;
            overflow: hidden;
            text-align: left;
        }

        .eventTime {
            font-size: 14px;
            color: var(--fb-muted);
            margin-bottom: 2px;
            font-variant-numeric: tabular-nums;
        }
        .eventTitle {
            font-size: 14px;
            font-weight: 700;
            line-height: 1.15;
        }

        .nowLine {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: color-mix(in srgb, var(--urgent) 70%, transparent);
            z-index: 3;
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const cfg = card._config || {};
        const allCalendars = Array.isArray(cfg.calendars) ? cfg.calendars : [];

        const visibleSet = card._calendarVisibleSet || new Set(allCalendars.map((c) => c.entity));
        const calendars = allCalendars.filter((c) => visibleSet.has(c.entity));

        const day = card._selectedDay();

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

        const allDay = [];
        const timedRaw = [];
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);

        for (const c of calendars) {
            const entityId = c.entity;
            const colour = c.color || 'var(--pastel-bluegrey)';
            const name = c.name || entityId;

            const evs = card._eventsForEntityOnDay(entityId, day);
            for (const e of evs) {
                if (e.all_day) {
                    allDay.push({ ...e, _fbEntityId: entityId, _fbColour: colour, _fbName: name });
                    continue;
                }

                const s = e._start;
                const en = e._end;
                if (!s || !en) continue;
                const clampedStartDate = s < dayStart ? dayStart : s;
                const clampedEndDate = en > dayEnd ? dayEnd : en;
                if (clampedEndDate <= clampedStartDate) continue;
                const startMinEv =
                    clampedStartDate.getHours() * 60 + clampedStartDate.getMinutes();
                const endMinEv = clampedEndDate.getHours() * 60 + clampedEndDate.getMinutes();

                const clampedStart = Math.max(startMin, startMinEv);
                const clampedEnd = Math.min(endMin, endMinEv);
                if (clampedEnd <= clampedStart) continue;

                timedRaw.push({
                    ...e,
                    start: clampedStartDate,
                    end: clampedEndDate,
                    startMin: clampedStart,
                    endMin: Math.max(clampedStart + 1, clampedEnd),
                    _fbEntityId: entityId,
                    _fbColour: colour,
                    _fbName: name,
                });
            }
        }

        const timed = assignOverlapLanes(timedRaw);

        const now = new Date();
        const showNow = card._dayOffset === 0;
        const nowMin = minutesSinceMidnight(now);
        const nowTopSlots = (nowMin - startMin) / slotMinutes;
        const nowTop = clamp(nowTopSlots * slotPx, 0, slots * slotPx);

        const dateLabel = day.toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });

        return html`
            <div class="wrap">
                <div class="board">
                    <div class="grid stickyTop">
                        <div class="col topBlank"></div>
                        <div class="col topBar">
                            <div class="date">${dateLabel}</div>
                            <div class="legend" aria-label="People filter">
                                ${allCalendars.map((c) => {
                                    const on = visibleSet.has(c.entity);
                                    return html`
                                        <button
                                            class="legendBtn ${on ? '' : 'off'}"
                                            title=${on ? 'Hide' : 'Show'}
                                            @click=${() => card._toggleCalendarVisible(c.entity)}
                                        >
                                            <span
                                                class="dot"
                                                style="background:${c.color || 'var(--pastel-bluegrey)'}"
                                            ></span>
                                            <span>${c.name || c.entity}</span>
                                        </button>
                                    `;
                                })}
                            </div>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="col">
                            <div
                                class="alldayRow"
                                style="justify-content:flex-end;color:var(--fb-muted);font-size:12px"
                            >
                                All day
                            </div>
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

                        <div class="col">
                            <div class="alldayRow">
                                ${allDay.length
                                    ? allDay.map(
                                          (e) => html`
                                              <button
                                                  class="chip"
                                                  style="border-left-color:${e._fbColour}"
                                                  @click=${() => card._openMoreInfo(e._fbEntityId)}
                                                  title=${e.summary}
                                              >
                                                  ${e.summary}
                                              </button>
                                          `
                                      )
                                    : html`<span style="color:var(--fb-muted);font-size:12px"
                                          >No all-day events</span
                                      >`}
                            </div>

                            <div class="lane">
                                <div class="slotBg">
                                    ${Array.from({ length: slots + 1 }).map(
                                        () => html`<div class="slotRow"></div>`
                                    )}
                                </div>

                                <div class="eventsLayer">
                                    ${showNow
                                        ? html`<div class="nowLine" style="top:${nowTop}px"></div>`
                                        : html``}
                                    ${timed.map((ev) => {
                                        const startSlots = (ev.startMin - startMin) / slotMinutes;
                                        const endSlots = (ev.endMin - startMin) / slotMinutes;
                                        const top = startSlots * slotPx;
                                        const height = Math.max(
                                            18,
                                            (endSlots - startSlots) * slotPx
                                        );

                                        const widthPct = 100 / ev.lanesTotal;
                                        const leftPct = ev.lane * widthPct;

                                        const timeText = `${pad2(ev.start.getHours())}:${pad2(
                                            ev.start.getMinutes()
                                        )}`;

                                        return html`
                                            <button
                                                class="event"
                                                style="top:${top}px;height:${height}px;left:${leftPct}%;width:${widthPct}%;border-left-color:${ev._fbColour};"
                                                @click=${() => card._openMoreInfo(ev._fbEntityId)}
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
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-day-view', FbDayView);
