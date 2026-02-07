/* Family Board - mobile schedule view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
import { loadingStyles } from './loading.styles.js';
const { LitElement, html, css } = getHaLit();

import { addDays, startOfDay, pad2 } from '../family-board.util.js';
import { getReadableTextColour } from '../util/colour.util.js';

export class FbMobileView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    static styles = [
        loadingStyles,
        css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: var(--fb-gutter);
        }
        .day {
            border: 1px solid var(--fb-grid);
            border-radius: 14px;
            background: var(--fb-surface);
            padding: 10px;
            margin-bottom: 12px;
        }
        .head {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
        }
        .name {
            font-weight: 800;
        }
        .date {
            font-size: 14px;
            color: var(--fb-muted);
        }
        .chip {
            border-radius: 12px;
            border: 1px solid color-mix(in srgb, var(--event-color) 70%, transparent);
            padding: 8px 10px;
            background: color-mix(in srgb, var(--event-color) 18%, var(--fb-surface));
            margin-bottom: 8px;
            color: var(--event-text, var(--fb-text));
        }
        .title {
            font-weight: 700;
        }
        .time {
            font-size: 14px;
            color: var(--fb-muted);
        }
        .sectionTitle {
            font-size: 14px;
            color: var(--fb-muted);
            margin: 6px 0;
        }
        .linkBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            font-weight: 700;
            color: var(--fb-text);
        }
    `,
    ];

    render() {
        const card = this.card;
        if (!card) return html``;

        const daysToShow = card._scheduleDays || 5;
        const base = startOfDay(card._selectedDay());
        const days = Array.from({ length: daysToShow }).map((_, i) => addDays(base, i));
        const calendars = Array.isArray(card._config?.calendars) ? card._config.calendars : [];
        const visibleSet = card._calendarVisibilityEnabled
            ? card._calendarVisibleSet || new Set(calendars.map((c) => c.entity))
            : new Set(calendars.map((c) => c.entity));
        const isCalendarLoading = calendars.length && !card._calendarLastSuccessTs;
        const activeCalendars = calendars.filter(
            (c) =>
                visibleSet.has(c.entity) &&
                card._isPersonAllowed(card._personIdForConfig(c, c.entity))
        );

        const totalEvents = days.reduce((sum, d) => {
            return (
                sum +
                activeCalendars.reduce(
                    (count, c) => count + card._eventsForEntityOnDay(c.entity, d).length,
                    0
                )
            );
        }, 0);

        return html`
            <div class="wrap">
                ${isCalendarLoading
                    ? html`<div class="loadingState">
                          <span class="spinner" aria-hidden="true"></span>
                          <span>Loading schedule...</span>
                      </div>`
                    : totalEvents === 0
                    ? html`<div style="margin-bottom:10px;color:var(--fb-muted);font-size:13px">
                          No events found.
                          <button class="linkBtn" @click=${() => card._openHelp()}>ⓘ</button>
                      </div>`
                    : html``}
                ${isCalendarLoading
                    ? html``
                    : days.map((d) => {
                    const allDay = [];
                    const timed = [];

                    for (const c of activeCalendars) {
                        const events = card._eventsForEntityOnDay(c.entity, d);
                        const person = card._personForEntity(c.entity);
                        const colour = person?.color || card._neutralColor();
                        const textColor =
                            person?.text_color || getReadableTextColour(colour);

                        for (const e of events) {
                            if (e.all_day)
                                allDay.push({
                                    ...e,
                                    _fbColour: colour,
                                    _fbText: textColor,
                                    _fbEntityId: c.entity,
                                });
                            else
                                timed.push({
                                    ...e,
                                    _fbColour: colour,
                                    _fbText: textColor,
                                    _fbEntityId: c.entity,
                                });
                        }
                    }

                    const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
                    const dayDate = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

                    return html`
                        <div class="day">
                            <div class="head">
                                <div class="name">${dayName}</div>
                                <div class="date">${dayDate}</div>
                            </div>

                            ${allDay.length
                                ? html`
                                      <div class="sectionTitle">All day</div>
                                      ${allDay.map(
                                          (e) => html`
                                              <div
                                                  class="chip"
                                                  data-key=${e._fbKey || ''}
                                                  style="
                                                      --event-color:${e._fbColour};
                                                      --event-text:${e._fbText || ''};
                                                  "
                                                  @click=${() => card._openEventDialog(e._fbEntityId, e)}
                                              >
                                                  <div class="title">${e.summary}</div>
                                              </div>
                                          `
                                      )}
                                  `
                                : html``}

                            ${timed.length
                                ? html`
                                      <div class="sectionTitle">Timed</div>
                                      ${timed.map((e) => {
                                          const timeText = `${pad2(
                                              e._start?.getHours?.() ?? 0
                                          )}:${pad2(e._start?.getMinutes?.() ?? 0)}`;
                                          return html`
                                              <div
                                                  class="chip"
                                                  data-key=${e._fbKey || ''}
                                                  style="
                                                      --event-color:${e._fbColour};
                                                      --event-text:${e._fbText || ''};
                                                  "
                                                  @click=${() => card._openEventDialog(e._fbEntityId, e)}
                                              >
                                                  <div class="time">${timeText}</div>
                                                  <div class="title">${e.summary}</div>
                                              </div>
                                          `;
                                      })}
                                  `
                                : html``}
                        </div>
                    `;
                })}
            </div>
        `;
    }
}

customElements.define('fb-mobile-view', FbMobileView);
