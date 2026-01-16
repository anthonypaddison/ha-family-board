/* Family Board - top bar
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbTopbar extends LitElement {
    static properties = {
        title: { type: String },
        screen: { type: String }, // schedule | chores | shopping | home | settings
        mainMode: { type: String }, // schedule | month
        summary: { type: Array }, // [{name, color, eventsLeft, todosLeft}]
        dateLabel: { type: String },
        dateValue: { type: String },
        activeFilters: { type: Array },
        isAdmin: { type: Boolean },
        syncing: { type: Boolean },
        calendarStale: { type: Boolean },
        calendarError: { type: Boolean },
        calendarInFlight: { type: Boolean },
        _timeLabel: { state: true },
    };

    static styles = css`
        :host {
            display: block;
            padding: 14px 14px 10px;
            background: var(--fb-surface);
            box-shadow: var(--fb-shadow);
            border-radius: 10px;
        }

        .toprow {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .titleWrap {
            display: flex;
            align-items: center;
            gap: 10px;
            justify-self: start;
        }

        .time {
            font-size: 26px;
            font-weight: 800;
            color: var(--fb-text);
            font-variant-numeric: tabular-nums;
        }

        .subtabs {
            display: inline-flex;
            gap: 6px;
            align-items: center;
            padding: 4px;
            border-radius: 999px;
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
            justify-self: center;
        }

        .pill {
            border: 0;
            background: transparent;
            color: var(--fb-text);
            border-radius: 999px;
            padding: 7px 14px;
            cursor: pointer;
            font-size: 14px;
            min-height: 36px;
        }

        .pill.active {
            background: var(--fb-surface);
            border-color: transparent;
            color: var(--fb-text);
            box-shadow: var(--shadow-sm);
        }

        .dateNav {
            display: inline-flex;
            gap: 0;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
            justify-self: end;
        }

        .dateLabel {
            font-weight: 700;
            font-size: 14px;
            color: var(--fb-text);
            white-space: nowrap;
        }

        .navGroup {
            display: inline-flex;
            border: 1px solid var(--fb-border);
            border-radius: 8px;
            overflow: hidden;
            background: var(--fb-surface);
        }
        .navBtn {
            min-width: 40px;
            height: 34px;
            border: 0;
            background: transparent;
            color: var(--fb-text);
            cursor: pointer;
            font-size: 14px;
            padding: 0 12px;
            display: grid;
            place-items: center;
        }
        .navBtn + .navBtn {
            border-left: 1px solid var(--fb-border);
        }
        .navBtn.center {
            background: var(--fb-surface);
            font-weight: 700;
        }

        .settingsBtn {
            border-radius: 999px;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface);
            color: var(--fb-text);
            cursor: pointer;
            height: 36px;
            padding: 0 10px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .syncBtn {
            margin-left: 8px;
            min-width: 86px;
            justify-content: center;
        }
        .syncBtn[disabled] {
            opacity: 0.6;
            cursor: default;
        }
        .statusChip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            padding: 6px 10px;
            background: var(--fb-surface-2);
            color: var(--fb-muted);
            font-size: 12px;
            margin-left: 8px;
            white-space: nowrap;
        }
        .statusBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            font-weight: 700;
            color: var(--fb-text);
            padding: 0;
        }
        .statusBtn[disabled] {
            opacity: 0.6;
            cursor: default;
        }

        .summaryRow {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
            padding: 12px 0 0;
        }

        .summaryBadge {
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid var(--fb-border);
            border-radius: 12px;
            padding: 10px 12px;
            background: var(--fb-surface-3);
            font-size: 14px;
            width: 100%;
            cursor: pointer;
            min-height: 44px;
            color: var(--fb-text);
        }

        .summaryBadge.active {
            border-color: var(--fb-accent-teal);
        }

        .summaryBadge:not(.active) {
            background: var(--fb-surface-3);
            opacity: 1;
        }

        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
            display: inline-block;
        }
        .summaryName {
            font-weight: 600;
        }

        .summaryCounts {
            margin-left: auto;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-variant-numeric: tabular-nums;
        }

        .summaryMetric {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            line-height: 1;
        }

        .summaryMetric ha-icon {
            width: 16px;
            height: 16px;
            color: var(--fb-muted);
        }

        @media (max-width: 900px) {
            .summaryRow {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
            }
        }

        @media (max-width: 600px) {
            .summaryRow {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
    `;

    connectedCallback() {
        super.connectedCallback();
        this._updateTime();
        if (!this._timeTimer) {
            this._timeTimer = setInterval(() => this._updateTime(), 60_000);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._timeTimer) {
            clearInterval(this._timeTimer);
            this._timeTimer = null;
        }
    }

    _updateTime() {
        const now = new Date();
        this._timeLabel = now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    _setMainMode(mode) {
        this.dispatchEvent(
            new CustomEvent('fb-main-mode', {
                detail: { mode },
                bubbles: true,
                composed: true,
            })
        );
    }

    _nav(delta) {
        this.dispatchEvent(
            new CustomEvent('fb-date-nav', {
                detail: { delta },
                bubbles: true,
                composed: true,
            })
        );
    }

    _today() {
        this.dispatchEvent(
            new CustomEvent('fb-date-today', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _syncCalendars() {
        if (this.syncing) return;
        this.dispatchEvent(
            new CustomEvent('fb-sync-calendars', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _tryAgain() {
        this.dispatchEvent(
            new CustomEvent('fb-calendar-try-again', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _openSources() {
        this.dispatchEvent(
            new CustomEvent('fb-open-sources', {
                bubbles: true,
                composed: true,
            })
        );
    }

    _togglePerson(id) {
        this.dispatchEvent(
            new CustomEvent('fb-person-toggle', {
                detail: { id },
                bubbles: true,
                composed: true,
            })
        );
    }

    _setDate(e) {
        const value = e.target.value;
        if (!value) return;
        this.dispatchEvent(
            new CustomEvent('fb-date-set', {
                detail: { value },
                bubbles: true,
                composed: true,
            })
        );
    }

    _openDatePicker(e) {
        const input = e.currentTarget;
        if (input && typeof input.showPicker === 'function') {
            input.showPicker();
        }
    }

    _blockDateInput(e) {
        e.preventDefault();
    }

    render() {
        const screen = this.screen || 'schedule';
        const mainMode = this.mainMode || 'schedule';
        const summary = Array.isArray(this.summary) ? this.summary : [];
        const activeFilters = Array.isArray(this.activeFilters) ? this.activeFilters : [];
        // Retry is only shown for hard failures without usable cached data.
        return html`
            <div class="toprow">
                <div class="titleWrap">
                    <div class="time">${this._timeLabel || ''}</div>
                </div>

                ${screen === 'schedule'
                    ? html`
                          <div class="subtabs" role="tablist" aria-label="Main view modes">
                              <button
                                  class="pill ${mainMode === 'schedule' ? 'active' : ''}"
                                  @click=${() => this._setMainMode('schedule')}
                              >
                                  Schedule
                              </button>
                              <button
                                  class="pill ${mainMode === 'month' ? 'active' : ''}"
                                  @click=${() => this._setMainMode('month')}
                              >
                                  Month
                              </button>
                          </div>
                      `
                    : html``}
                ${screen === 'schedule'
                    ? html`
                          <div class="dateNav" aria-label="Date navigation">
                              <div class="navGroup" role="group" aria-label="Date navigation">
                                  <button
                                      class="navBtn"
                                      title="Previous"
                                      @click=${() => this._nav(-1)}
                                  >
                                      <
                                  </button>
                                  <button class="navBtn center" @click=${this._today}>
                                      Today
                                  </button>
                                  <button
                                      class="navBtn"
                                      title="Next"
                                      @click=${() => this._nav(1)}
                                  >
                                      >
                                  </button>
                              </div>
                              <button
                                  class="settingsBtn syncBtn"
                                  ?disabled=${this.syncing}
                                  @click=${this._syncCalendars}
                              >
                                  ${this.syncing ? 'Syncing…' : 'Sync'}
                              </button>
                              ${this.calendarStale || this.calendarError
                                  ? html`
                                        <div class="statusChip">
                                            <span>
                                                ${this.calendarError
                                                    ? 'Calendar update failed.'
                                                    : 'Calendar updating… showing last saved.'}
                                            </span>
                                            ${this.calendarError
                                                ? html`
                                                      <button
                                                          class="statusBtn"
                                                          ?disabled=${this.calendarInFlight}
                                                          @click=${this._tryAgain}
                                                      >
                                                          Try again
                                                      </button>
                                                  `
                                                : html``}
                                        </div>
                                    `
                                  : html``}
                          </div>
                      `
                    : html``}
            </div>

            ${['schedule', 'chores'].includes(screen) && summary.length
                ? (() => {
                      const row1 = summary.filter((p) => (p.header_row || 1) === 1).slice(0, 5);
                      const row2 = summary.filter((p) => (p.header_row || 1) === 2).slice(0, 5);
                      const rows = [row1, row2].filter((r) => r.length);
                      return html`
                          ${rows.map(
                              (row) => html`
                                  <div class="summaryRow">
                                      ${row.map(
                                          (p) => html`
                                          <button
                                              class="summaryBadge ${activeFilters.includes(p.id)
                                                  ? 'active'
                                                  : ''}"
                                              style="--person-colour:${p.color}"
                                          title="${p.name} - ${p.eventsLeft ?? 0} events today - ${p.todosLeft ?? 0} chores due"
                                          @click=${() => this._togglePerson(p.id)}
                                      >
                                          <span class="dot" style="background:${p.color}"></span>
                                          <span class="summaryName" style="flex:1">${p.name}</span>
                                          <span class="summaryCounts">
                                              <span class="summaryMetric">
                                                  <ha-icon icon="mdi:calendar-month-outline"></ha-icon>
                                                  <span>${p.eventsLeft ?? 0}</span>
                                              </span>
                                              <span class="summaryMetric">
                                                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                                                  <span>${p.todosLeft ?? 0}</span>
                                              </span>
                                          </span>
                                      </button>
                                          `
                                      )}
                                  </div>
                              `
                          )}
                      `;
                  })()
                : html``}
        `;
    }
}

customElements.define('fb-topbar', FbTopbar);
