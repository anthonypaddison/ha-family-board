/* Family Board - single file custom card
 * Resource: /local/family-board/family-board.js
 */

const LitElement =
    window.LitElement || Object.getPrototypeOf(customElements.get('ha-panel-lovelace'));
const html = window.html || LitElement.prototype.html;
const css = window.css || LitElement.prototype.css;

class FamilyBoardCard extends LitElement {
    static get properties() {
        return {
            hass: {},
            _config: {},
            _tab: { state: true },
        };
    }

    setConfig(config) {
        this._config = config || {};
        this._tab = 'now';
    }

    getCardSize() {
        return 10;
    }

    _setTab(tab) {
        this._tab = tab;
        this.requestUpdate();
    }

    _toggleEntity(entityId) {
        if (!entityId || !this.hass) return;
        this.hass.callService('homeassistant', 'toggle', { entity_id: entityId });
    }

    _state(entityId) {
        const st = this.hass?.states?.[entityId];
        return st ? st.state : 'unknown';
    }

    _friendly(entityId) {
        const st = this.hass?.states?.[entityId];
        return st?.attributes?.friendly_name || entityId;
    }

    _renderTopBar() {
        const title = this._config?.title || 'Family Board';
        return html`
            <div class="top">
                <div class="top-title">
                    <div class="h1">${title}</div>
                    <div class="h2">Skylight-style board (MVP)</div>
                </div>
            </div>
        `;
    }

    _renderMenu() {
        const items = [
            { key: 'now', label: 'NOW' },
            { key: 'chores', label: 'CHORES' },
            { key: 'shopping', label: 'SHOPPING' },
            { key: 'home', label: 'HOME' },
        ];

        return html`
            <div class="menu">
                ${items.map((it) => {
                    const active = this._tab === it.key;
                    return html`
                        <button
                            class="menu-btn ${active ? 'active' : ''}"
                            @click=${() => this._setTab(it.key)}
                        >
                            ${it.label}
                        </button>
                    `;
                })}
            </div>
        `;
    }

    _renderNow() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-title">Now / Calendar (next)</div>
                    <div class="panel-sub">We’ll improve this into the proper week view next.</div>
                    <div class="cal-list">
                        ${calendars.length === 0
                            ? html`<div class="muted">No calendars configured.</div>`
                            : calendars.map((c) => {
                                  const entity = c.entity;
                                  const name = c.name || entity;
                                  const colour = c.color || '#a3c4f3';
                                  const st = this.hass?.states?.[entity];
                                  const message =
                                      st?.attributes?.message ||
                                      st?.attributes?.friendly_name ||
                                      '';
                                  const start =
                                      st?.attributes?.start_time ||
                                      st?.attributes?.start_time_local ||
                                      '';
                                  const state = st?.state || 'unknown';
                                  return html`
                                      <div class="cal-row">
                                          <div class="dot" style="background:${colour}"></div>
                                          <div class="cal-main">
                                              <div class="cal-name">${name}</div>
                                              <div class="cal-meta">
                                                  <span class="pill">${state}</span>
                                                  <span class="muted">${start}</span>
                                              </div>
                                              <div class="cal-msg">${message}</div>
                                          </div>
                                      </div>
                                  `;
                              })}
                    </div>
                </div>
            </div>
        `;
    }

    _renderChores() {
        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-title">Chores</div>
                    <div class="panel-sub">
                        Next: wire this to a to-do entity + per-person columns.
                    </div>
                    <div class="muted">Placeholder (layout locked in; behaviour comes next).</div>
                </div>
            </div>
        `;
    }

    _renderShopping() {
        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-title">Shopping</div>
                    <div class="panel-sub">
                        Next: shopping list + “ate it” buttons + likes/dislikes.
                    </div>
                    <div class="muted">Placeholder (layout locked in; behaviour comes next).</div>
                </div>
            </div>
        `;
    }

    _renderHome() {
        const controls = Array.isArray(this._config?.home_controls)
            ? this._config.home_controls
            : [];
        return html`
            <div class="panel">
                <div class="panel-card">
                    <div class="panel-title">Home</div>
                    <div class="panel-sub">
                        Simple grid. We’ll add the “who are you” gate later.
                    </div>

                    ${controls.length === 0
                        ? html`<div class="muted">No home controls configured.</div>`
                        : html`
                              <div class="grid">
                                  ${controls.slice(0, 12).map((c) => {
                                      const entityId = c.entity;
                                      const name = c.name || this._friendly(entityId);
                                      const state = this._state(entityId);
                                      const unavailable = [
                                          'unknown',
                                          'unavailable',
                                          'none',
                                      ].includes(state);

                                      return html`
                                          <button
                                              class="tile ${state === 'on'
                                                  ? 'on'
                                                  : ''} ${unavailable ? 'bad' : ''}"
                                              @click=${() => this._toggleEntity(entityId)}
                                          >
                                              <div class="tile-name">${name}</div>
                                              <div class="tile-meta">${entityId}</div>
                                              <div class="tile-state">${state}</div>
                                          </button>
                                      `;
                                  })}
                              </div>
                          `}
                </div>
            </div>
        `;
    }

    render() {
        if (!this.hass) return html`<div class="wrap">Loading…</div>`;

        let body;
        switch (this._tab) {
            case 'chores':
                body = this._renderChores();
                break;
            case 'shopping':
                body = this._renderShopping();
                break;
            case 'home':
                body = this._renderHome();
                break;
            default:
                body = this._renderNow();
                break;
        }

        return html`
            <div class="wrap">
                ${this._renderTopBar()}
                <div class="main">${this._renderMenu()} ${body}</div>
            </div>
        `;
    }

    static get styles() {
        return css`
            :host {
                --palette-mint: #b9fbc0;
                --palette-aqua: #98f5e1;
                --palette-cyan: #8eecf5;
                --palette-sky: #90dbf4;
                --palette-bluegrey: #a3c4f3;
                --palette-lilac: #cfbaf0;
                --palette-rose: #ffcfd2;
                --palette-vanilla: #fbf8cc;

                --fb-bg: #ffffff;
                --fb-text: #0f172a;
                --fb-muted: #475569;
                --fb-grid: #e5e7eb;
                --fb-radius: 14px;
            }

            .wrap {
                background: var(--fb-bg);
                color: var(--fb-text);
                border-radius: var(--fb-radius);
                padding: 14px;
            }

            .top {
                border: 1px solid var(--fb-grid);
                border-radius: var(--fb-radius);
                padding: 14px;
                margin-bottom: 12px;
            }

            .h1 {
                font-size: 20px;
                font-weight: 700;
                line-height: 1.2;
            }
            .h2 {
                font-size: 12px;
                color: var(--fb-muted);
                margin-top: 4px;
            }

            .main {
                display: grid;
                grid-template-columns: 96px 1fr;
                gap: 12px;
                min-height: 420px;
            }

            .menu {
                display: flex;
                flex-direction: column;
                gap: 10px;
                padding-top: 4px;
            }

            .menu-btn {
                border: 1px solid var(--fb-grid);
                border-radius: 16px;
                background: #fff;
                padding: 18px 10px;
                font-weight: 700;
                letter-spacing: 0.6px;
                cursor: pointer;
            }

            .menu-btn.active {
                outline: 3px solid rgba(207, 186, 240, 0.6);
            }

            .panel {
                border: 1px solid var(--fb-grid);
                border-radius: var(--fb-radius);
                padding: 12px;
                background: #fff;
            }

            .panel-card {
                border: 1px solid var(--fb-grid);
                border-radius: var(--fb-radius);
                padding: 14px;
            }

            .panel-title {
                font-size: 16px;
                font-weight: 800;
            }

            .panel-sub {
                margin-top: 6px;
                font-size: 12px;
                color: var(--fb-muted);
            }

            .muted {
                margin-top: 12px;
                color: var(--fb-muted);
                font-size: 13px;
            }

            .cal-list {
                margin-top: 12px;
                display: grid;
                gap: 10px;
            }

            .cal-row {
                display: grid;
                grid-template-columns: 12px 1fr;
                gap: 10px;
                align-items: start;
                padding: 10px;
                border-radius: 12px;
                border: 1px solid var(--fb-grid);
            }

            .dot {
                width: 12px;
                height: 12px;
                border-radius: 999px;
                margin-top: 4px;
            }

            .cal-name {
                font-weight: 800;
            }

            .cal-meta {
                margin-top: 2px;
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .pill {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 999px;
                border: 1px solid var(--fb-grid);
            }

            .cal-msg {
                margin-top: 6px;
                font-size: 13px;
            }

            .grid {
                margin-top: 12px;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
            }

            .tile {
                border: 1px solid var(--fb-grid);
                border-radius: 14px;
                padding: 12px;
                background: #fff;
                cursor: pointer;
                text-align: left;
            }

            .tile.on {
                outline: 3px solid rgba(185, 251, 192, 0.7);
            }

            .tile.bad {
                outline: 3px solid rgba(255, 207, 210, 0.75);
            }

            .tile-name {
                font-weight: 800;
                font-size: 14px;
            }

            .tile-meta {
                margin-top: 4px;
                font-size: 11px;
                color: var(--fb-muted);
                word-break: break-all;
            }

            .tile-state {
                margin-top: 10px;
                font-size: 12px;
                font-weight: 700;
            }

            @media (max-width: 700px) {
                .main {
                    grid-template-columns: 80px 1fr;
                }
                .grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
        `;
    }
}

customElements.define('family-board', FamilyBoardCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'family-board',
    name: 'Family Board',
    description: 'Family board (tabs + home controls MVP)',
});
