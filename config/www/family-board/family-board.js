/* Family Board - custom card (split modules)
 * Entry resource: /local/family-board/family-board.js
 * Folder: /config/www/family-board/
 */

import {
    fireEvent,
    pad2,
    startOfDay,
    endOfDay,
    addDays,
    formatDayTitle,
    formatTimeLabel,
    minutesSinceDayStart,
    assignOverlapLanes,
} from './family-board.util.js';

import { normaliseHaCalendarEvents } from './family-board.calendar.js';

const LitElement =
    window.LitElement || Object.getPrototypeOf(customElements.get('ha-panel-lovelace'));
const html = window.html || LitElement.prototype.html;
const css = window.css || LitElement.prototype.css;

class FamilyBoardCard extends LitElement {
    static get properties() {
        return {
            hass: {
                type: Object,
            },
            _config: {
                type: Object,
            },
            _tab: {
                type: String,
            },
            _eventsByEntity: {
                type: Object,
            },
            _eventsLoading: {
                type: Object,
            },
            _refreshEveryMs: {
                type: Number,
            },
            _dayOffset: {
                type: Number,
            },
        };
    }

    setConfig(config) {
        this._config = config;

        // Tabs
        this._tabs = [
            { key: 'now', label: 'Now' },
            { key: 'day', label: 'Day' },
            { key: 'home', label: 'Home' },
        ];

        this._tab = this._tab || 'now';

        // Calendar refresh and view settings
        this._eventsByEntity = this._eventsByEntity || {};
        this._eventsLoading = this._eventsLoading || {};
        this._refreshEveryMs = 60_000;
        this._dayOffset = this._dayOffset || 0;

        // Day timeline config (hours / slots / sizing)
        this._dayStartHour = 6;
        this._dayEndHour = 22;
        this._slotMinutes = 30; // 30 min grid
        this._pxPerHour = 96; // visual scale
        this._timelineTopPadPx = 16;
    }

    connectedCallback() {
        super.connectedCallback?.();
        this._kickCalendarRefresh(true);
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    _entity(entityId) {
        return this.hass?.states?.[entityId] || null;
    }

    _setTab(key) {
        this._tab = key;
        if (key === 'now') this._kickCalendarRefresh(true);
        this.requestUpdate();
    }

    _setDayOffset(delta) {
        this._dayOffset += delta;
        this._kickCalendarRefresh(true);
        this.requestUpdate();
    }

    _kickCalendarRefresh(force) {
        if (!this.hass) return;

        if (!this._refreshTimer) {
            this._refreshTimer = setInterval(() => {
                if (this._tab === 'now') this._refreshCalendarEvents(false);
            }, this._refreshEveryMs);
        }

        this._refreshCalendarEvents(force);
    }

    _selectedDay() {
        return startOfDay(addDays(new Date(), this._dayOffset));
    }

    async _fetchCalendarEventsViaRest(entityId, startIso, endIso) {
        // This is the same backend endpoint HA’s Calendar UI uses.
        // Returns events where start/end are objects: { dateTime } or { date }
        const start = encodeURIComponent(startIso);
        const end = encodeURIComponent(endIso);
        const path = `calendars/${encodeURIComponent(entityId)}?start=${start}&end=${end}`;

        // callApi expects a path without "/api/"
        return await this.hass.callApi('GET', path);
    }

    async _refreshCalendarEvents(force) {
        if (this._config?.debug) {
            console.debug('[family-board] refresh start', {
                force,
                tab: this._tab,
                dayOffset: this._dayOffset,
            });
        }

        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        if (calendars.length === 0) return;

        const day = this._selectedDay();
        const rangeStart = startOfDay(addDays(day, -1));
        const rangeEnd = endOfDay(addDays(day, 7));

        const startIso = rangeStart.toISOString();
        const endIso = rangeEnd.toISOString();

        const fetches = calendars.map(async (c) => {
            const entityId = c.entity;
            if (!entityId) return;

            const last = this._eventsByEntity?.[entityId]?.fetchedAt || 0;
            const isLoading = Boolean(this._eventsLoading?.[entityId]);

            // Avoid stampeding fetches unless forced
            if (!force && Date.now() - last < this._refreshEveryMs && !isLoading) return;

            this._eventsLoading = { ...this._eventsLoading, [entityId]: true };

            try {
                const events = await this._fetchCalendarEventsViaRest(entityId, startIso, endIso);
                const raw = Array.isArray(events) ? events : [];
                const norm = normaliseHaCalendarEvents(raw);

                // Sort for sanity (normalised start is a string)
                norm.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                if (this._config?.debug) {
                    console.debug('[family-board] fetch ok', {
                        entityId,
                        count: norm.length,
                        sample: norm[0],
                    });
                }

                this._eventsByEntity = {
                    ...this._eventsByEntity,
                    [entityId]: {
                        fetchedAt: Date.now(),
                        events: norm,
                        error: null,
                    },
                };
            } catch (err) {
                if (this._config?.debug) {
                    console.debug('[family-board] fetch error', {
                        entityId,
                        error: String(err?.message || err),
                    });
                }
                this._eventsByEntity = {
                    ...this._eventsByEntity,
                    [entityId]: {
                        fetchedAt: Date.now(),
                        events: [],
                        error: String(err?.message || err),
                    },
                };
            } finally {
                this._eventsLoading = { ...this._eventsLoading, [entityId]: false };
            }
        });

        await Promise.all(fetches);
        this.requestUpdate();
    }

    _eventsForEntityOnDay(entityId, day) {
        const info = this._eventsByEntity?.[entityId];
        const events = Array.isArray(info?.events) ? info.events : [];

        const dayStartMs = startOfDay(day).getTime();
        const dayEndMs = endOfDay(day).getTime();

        const out = events
            .map((e) => {
                // after normalisation: start/end are strings
                const s = new Date(e.start);
                const en = new Date(e.end ?? e.start);
                if (Number.isNaN(s.getTime())) return null;

                // intersects selected day
                if (en.getTime() < dayStartMs || s.getTime() > dayEndMs) return null;

                return { ...e, _start: s, _end: en };
            })
            .filter(Boolean);

        if (this._config?.debug) {
            console.debug('[family-board] eventsForDay', {
                entityId,
                day: day.toISOString().slice(0, 10),
                count: out.length,
            });
        }

        return out;
    }

    _openMoreInfo(entityId) {
        fireEvent(this, 'hass-more-info', { entityId });
    }

    _renderTopBar() {
        const title = this._config?.title || 'Family Board';
        return html`
            <div class="top">
                <div class="top-title">
                    <div class="title">${title}</div>
                </div>

                <nav class="menu" aria-label="Board tabs">
                    ${this._tabs.map((it) => {
                        const active = this._tab === it.key;
                        return html`
                            <button
                                type="button"
                                class="menu-btn ${active ? 'active' : ''}"
                                @click=${() => this._setTab(it.key)}
                            >
                                <span class="menu-label">${it.label}</span>
                            </button>
                        `;
                    })}
                </nav>
            </div>
        `;
    }

    _renderDayTimeline() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const day = this._selectedDay();
        const dayTitle = formatDayTitle(day);

        const startMin = this._dayStartHour * 60;
        const endMin = this._dayEndHour * 60;
        const totalMinutes = Math.max(60, endMin - startMin);

        const pxPerMinute = this._pxPerHour / 60;
        const gridHeight = Math.round(totalMinutes * pxPerMinute);
        const topPad = this._timelineTopPadPx;
        const gridHeightWithPad = gridHeight + topPad;

        const timeLabels = [];
        for (let m = startMin; m <= endMin; m += this._slotMinutes) {
            const h = Math.floor(m / 60);
            const mm = m % 60;
            timeLabels.push({ minute: m, label: formatTimeLabel(h, mm) });
        }

        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-head">
                        <div class="head-left">
                            <div class="panel-title">Calendar</div>
                            <div class="panel-sub">Day view. Tap an event to view details.</div>
                        </div>

                        <div class="day-nav" aria-label="Day navigation">
                            <button
                                type="button"
                                class="nav-btn"
                                title="Previous day"
                                @click=${() => this._setDayOffset(-1)}
                            >
                                ◀
                            </button>

                            <div class="day-title">
                                ${this._dayOffset === 0
                                    ? html`<span class="pill2">Today</span>`
                                    : ''}
                                <span>${dayTitle}</span>
                            </div>

                            <button
                                type="button"
                                class="nav-btn"
                                title="Next day"
                                @click=${() => this._setDayOffset(1)}
                            >
                                ▶
                            </button>
                        </div>
                    </div>

                    ${calendars.length === 0
                        ? html`<div class="muted">No calendars configured.</div>`
                        : html`
                              <div class="timeline-wrap">
                                  <div class="timeline-grid">
                                      <div class="time-col" style="height:${gridHeightWithPad}px">
                                          <div class="top-pad" style="height:${topPad}px"></div>

                                          ${timeLabels.map((t) => {
                                              const top =
                                                  Math.round((t.minute - startMin) * pxPerMinute) +
                                                  topPad;
                                              const isHour = t.minute % 60 === 0;
                                              return html`
                                                  <div
                                                      class="time-row ${isHour ? 'hour' : 'half'}"
                                                      style="top:${top}px"
                                                  >
                                                      <span class="time-label">${t.label}</span>
                                                  </div>
                                              `;
                                          })}
                                      </div>

                                      <div class="people-cols">
                                          ${calendars.map((c) => {
                                              const entityId = c.entity;
                                              const label = c.name || entityId;
                                              const colour = c.color || '#a3c4f3';
                                              const st = this._entity(entityId);
                                              const loading = Boolean(
                                                  this._eventsLoading?.[entityId]
                                              );
                                              const info = this._eventsByEntity?.[entityId];
                                              const err = info?.error;

                                              if (!st) {
                                                  return html`
                                                      <div class="person-col">
                                                          <div class="person-head">
                                                              <span
                                                                  class="person-dot"
                                                                  style="background:${colour}"
                                                              ></span>
                                                              <span class="person-name"
                                                                  >${label}</span
                                                              >
                                                          </div>
                                                          <div class="missing-box">
                                                              Missing entity:
                                                              <code>${entityId}</code>
                                                          </div>
                                                      </div>
                                                  `;
                                              }

                                              const events = this._eventsForEntityOnDay(
                                                  entityId,
                                                  day
                                              );

                                              const allDayEvents = events.filter((e) =>
                                                  Boolean(e.all_day)
                                              );

                                              const timedEventsRaw = events
                                                  .filter((e) => !e.all_day)
                                                  .map((e) => {
                                                      const s = e._start;
                                                      const en = e._end;

                                                      const startMinEv =
                                                          s.getHours() * 60 + s.getMinutes();
                                                      const endMinEv =
                                                          en.getHours() * 60 + en.getMinutes();

                                                      const clampedStart = Math.max(
                                                          startMin,
                                                          startMinEv
                                                      );
                                                      const clampedEnd = Math.min(
                                                          endMin,
                                                          Math.max(clampedStart + 1, endMinEv)
                                                      );

                                                      return {
                                                          ...e,
                                                          start: s,
                                                          end: en,
                                                          startMin: clampedStart,
                                                          endMin: clampedEnd,
                                                      };
                                                  });

                                              const timedEvents =
                                                  assignOverlapLanes(timedEventsRaw);

                                              // "Now" line for today only
                                              const isToday = this._dayOffset === 0;
                                              const nowMin = isToday
                                                  ? minutesSinceDayStart(new Date())
                                                  : null;
                                              const showNowLine =
                                                  isToday &&
                                                  nowMin != null &&
                                                  nowMin >= startMin &&
                                                  nowMin <= endMin;
                                              const nowTop = showNowLine
                                                  ? Math.round((nowMin - startMin) * pxPerMinute) +
                                                    topPad
                                                  : 0;

                                              return html`
                                                  <div class="person-col">
                                                      <div class="person-head">
                                                          <span
                                                              class="person-dot"
                                                              style="background:${colour}"
                                                          ></span>
                                                          <span class="person-name">${label}</span>
                                                          ${loading
                                                              ? html`<span class="mini"
                                                                    >Loading…</span
                                                                >`
                                                              : ''}
                                                      </div>

                                                      ${err
                                                          ? html`<div class="error-box">
                                                                ${err}
                                                            </div>`
                                                          : ''}
                                                      ${allDayEvents.length
                                                          ? html`
                                                                <div class="allday">
                                                                    ${allDayEvents.map((e) => {
                                                                        return html`
                                                                            <button
                                                                                type="button"
                                                                                class="allday-chip"
                                                                                @click=${() =>
                                                                                    this._openMoreInfo(
                                                                                        entityId
                                                                                    )}
                                                                            >
                                                                                ${e.summary}
                                                                            </button>
                                                                        `;
                                                                    })}
                                                                </div>
                                                            `
                                                          : html``}

                                                      <div
                                                          class="grid-col"
                                                          style="height:${gridHeightWithPad}px"
                                                      >
                                                          <div
                                                              class="top-pad"
                                                              style="height:${topPad}px"
                                                          ></div>

                                                          ${showNowLine
                                                              ? html`<div
                                                                    class="now-line"
                                                                    style="top:${nowTop}px"
                                                                ></div>`
                                                              : ''}
                                                          ${timedEvents.map((ev) => {
                                                              const top =
                                                                  Math.round(
                                                                      (ev.startMin - startMin) *
                                                                          pxPerMinute
                                                                  ) + topPad;
                                                              const height = Math.max(
                                                                  18,
                                                                  Math.round(
                                                                      (ev.endMin - ev.startMin) *
                                                                          pxPerMinute
                                                                  )
                                                              );

                                                              const widthPct = 100 / ev.lanesTotal;
                                                              const leftPct = ev.lane * widthPct;

                                                              const timeText = `${pad2(
                                                                  ev.start.getHours()
                                                              )}:${pad2(ev.start.getMinutes())}`;

                                                              return html`
                                                                  <button
                                                                      type="button"
                                                                      class="event"
                                                                      style="
                                                                          top:${top}px;
                                                                          height:${height}px;
                                                                          left:${leftPct}%;
                                                                          width:${widthPct}%;
                                                                          border-left-color:${colour};
                                                                      "
                                                                      title=${ev.summary}
                                                                      @click=${() =>
                                                                          this._openMoreInfo(
                                                                              entityId
                                                                          )}
                                                                  >
                                                                      <div class="event-time">
                                                                          ${timeText}
                                                                      </div>
                                                                      <div class="event-title">
                                                                          ${ev.summary}
                                                                      </div>
                                                                  </button>
                                                              `;
                                                          })}
                                                      </div>
                                                  </div>
                                              `;
                                          })}
                                      </div>
                                  </div>
                              </div>
                          `}
                </div>
            </div>
        `;
    }

    _renderNow() {
        // Keep your existing "Now" tab content (unchanged)
        return this._renderDayTimeline();
    }

    _renderHome() {
        // Keep your existing "Home" tab content (unchanged)
        // If your original file had home controls here, paste that block back in as-is.
        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-head">
                        <div class="head-left">
                            <div class="panel-title">Home</div>
                            <div class="panel-sub">Controls and quick actions.</div>
                        </div>
                    </div>

                    <div class="muted">
                        Home tab content not altered by this split. Paste your existing Home tab UI
                        here if you had one.
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        if (!this._config) return html``;

        return html`
            <div class="wrap">
                ${this._renderTopBar()}

                <div class="content">
                    ${this._tab === 'day' ? this._renderDayTimeline() : ''}
                    ${this._tab === 'now' ? this._renderNow() : ''}
                    ${this._tab === 'home' ? this._renderHome() : ''}
                </div>
            </div>
        `;
    }

    static get styles() {
        return css`
            :host {
                display: block;
                height: 100vh;
                width: 100%;
            }

            .wrap {
                height: 100vh;
                width: 100%;
                display: flex;
                flex-direction: column;
            }

            .top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                gap: 12px;
            }

            .title {
                font-size: 20px;
                font-weight: 700;
            }

            .menu {
                display: flex;
                gap: 8px;
            }

            .menu-btn {
                border: 0;
                background: var(--secondary-background-color);
                color: var(--primary-text-color);
                padding: 8px 10px;
                border-radius: 10px;
                cursor: pointer;
            }

            .menu-btn.active {
                background: var(--primary-color);
                color: var(--text-primary-color, #fff);
            }

            .menu-label {
                font-size: 13px;
                font-weight: 600;
            }

            .content {
                flex: 1;
                min-height: 0;
                padding: 0 16px 16px;
            }

            .panel {
                height: 100%;
            }

            .panel-card {
                height: 100%;
                border-radius: 16px;
                background: var(--card-background-color);
                box-shadow: var(--ha-card-box-shadow, none);
                border: 1px solid var(--divider-color);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .panel-head {
                padding: 14px 14px 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                border-bottom: 1px solid var(--divider-color);
            }

            .panel-title {
                font-size: 16px;
                font-weight: 700;
            }

            .panel-sub {
                font-size: 12px;
                opacity: 0.8;
            }

            .day-nav {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .nav-btn {
                border: 0;
                background: var(--secondary-background-color);
                padding: 8px 10px;
                border-radius: 10px;
                cursor: pointer;
            }

            .day-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 700;
            }

            .pill2 {
                display: inline-flex;
                align-items: center;
                padding: 3px 8px;
                border-radius: 999px;
                background: var(--secondary-background-color);
                font-size: 12px;
                font-weight: 700;
            }

            .timeline-wrap {
                padding: 12px;
                overflow: auto;
            }

            .timeline-grid {
                display: grid;
                grid-template-columns: 90px 1fr;
                gap: 10px;
                align-items: start;
            }

            .time-col {
                position: relative;
            }

            .top-pad {
                width: 1px;
            }

            .time-row {
                position: absolute;
                left: 0;
                right: 0;
                transform: translateY(-50%);
                height: 1px;
                border-top: 1px solid var(--divider-color);
            }

            .time-row.hour {
                border-top-width: 2px;
            }

            .time-label {
                position: absolute;
                left: 0;
                top: -10px;
                font-size: 12px;
                opacity: 0.85;
                background: var(--card-background-color);
                padding: 0 6px 0 0;
            }

            .people-cols {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: minmax(220px, 1fr);
                gap: 10px;
            }

            .person-col {
                min-width: 220px;
            }

            .person-head {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 4px 8px;
            }

            .person-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                display: inline-block;
            }

            .person-name {
                font-weight: 700;
                font-size: 13px;
            }

            .mini {
                font-size: 11px;
                opacity: 0.8;
                margin-left: auto;
            }

            .error-box {
                padding: 8px 10px;
                border-radius: 12px;
                background: rgba(255, 0, 0, 0.08);
                border: 1px solid rgba(255, 0, 0, 0.18);
                margin: 0 4px 8px;
                font-size: 12px;
            }

            .missing-box {
                padding: 8px 10px;
                border-radius: 12px;
                background: rgba(255, 200, 0, 0.12);
                border: 1px solid rgba(255, 200, 0, 0.22);
                margin: 0 4px 8px;
                font-size: 12px;
            }

            .allday {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 0 4px 10px;
            }

            .allday-chip {
                border: 0;
                background: var(--secondary-background-color);
                padding: 6px 8px;
                border-radius: 999px;
                cursor: pointer;
                font-size: 12px;
                text-align: left;
            }

            .grid-col {
                position: relative;
                border: 1px solid var(--divider-color);
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.02);
                overflow: hidden;
            }

            .now-line {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--primary-color);
                opacity: 0.8;
                z-index: 1;
            }

            .event {
                position: absolute;
                border: 0;
                border-left: 4px solid var(--primary-color);
                background: var(--secondary-background-color);
                border-radius: 12px;
                padding: 6px 8px;
                overflow: hidden;
                cursor: pointer;
                z-index: 2;
                text-align: left;
            }

            .event-time {
                font-size: 11px;
                font-weight: 800;
                opacity: 0.85;
            }

            .event-title {
                font-size: 12px;
                font-weight: 700;
                margin-top: 2px;
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
            }

            .muted {
                padding: 12px 14px;
                opacity: 0.8;
                font-size: 12px;
            }
        `;
    }

    getCardSize() {
        return 6;
    }
}

customElements.define('family-board', FamilyBoardCard);
