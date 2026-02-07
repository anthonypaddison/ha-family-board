/* Family Board - all-day overflow dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { pad2 } from '../family-board.util.js';

export class FbAllDayDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
        day: { type: Object },
        events: { type: Array },
        title: { type: String },
        card: { type: Object },
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
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .row {
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 10px 12px;
            background: var(--fb-surface-2);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .title {
            font-weight: 700;
        }
        .meta {
            font-size: 13px;
            color: var(--fb-muted);
        }
        .btn {
            border: 0;
            border-radius: 10px;
            padding: 8px 12px;
            cursor: pointer;
            background: var(--fb-accent);
            color: var(--fb-text);
        }
        .btn.secondary {
            background: transparent;
            border: 1px solid var(--fb-grid);
            color: var(--fb-text);
        }
    `;

    _close() {
        this.dispatchEvent(new CustomEvent('fb-all-day-close', { bubbles: true, composed: true }));
    }

    _openEvent(e) {
        if (!e) return;
        const entityId = e._fbEntityId;
        if (!entityId) return;
        this.card?._openEventDialog(entityId, e);
        this._close();
    }

    _timeRange(e) {
        if (!e) return '';
        if (e.all_day || e.allDay) return 'All day';
        const start = e._start || e.start;
        const end = e._end || e.end;
        if (!(start instanceof Date) || !(end instanceof Date)) return 'Timed';
        const startLabel = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
        const endLabel = `${pad2(end.getHours())}:${pad2(end.getMinutes())}`;
        return `${startLabel}–${endLabel}`;
    }

    render() {
        if (!this.open) return html``;
        const events = Array.isArray(this.events) ? this.events : [];
        const dayLabel = this.day
            ? this.day.toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
              })
            : 'All day';
        const title = this.title || 'All-day events';

        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>${title} - ${dayLabel}</div>
                        <button class="btn secondary" @click=${this._close}>Close</button>
                    </div>
                    <div class="list">
                        ${events.length
                            ? events.map(
                                  (e) => html`
                                      <div
                                          class="row"
                                          style="border-color:${e._fbColour || 'var(--fb-border)'};border-left-width:6px"
                                          @click=${() => this._openEvent(e)}
                                      >
                                          <div class="title">${e.summary || '(Untitled)'}</div>
                                          <div class="meta">
                                              ${this._timeRange(e)}
                                              ${e.location ? html` - ${e.location}` : ''}
                                          </div>
                                      </div>
                                  `
                              )
                            : html`<div class="meta">No events.</div>`}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-all-day-dialog', FbAllDayDialog);
