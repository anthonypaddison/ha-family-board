/* Family Board - sidebar component
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbSidebar extends LitElement {
    static properties = {
        active: { type: String },
        counts: { type: Object }, // { schedule, chores, shopping }
        isAdmin: { type: Boolean },
        collapsed: { type: Boolean },
    };

    static styles = css`
        :host {
            display: block;
            background: var(--fb-surface);
            height: 100%;
        }

        .rail {
            display: flex;
            flex-direction: column;
            gap: 16px;
            height: 100%;
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 100%;
            flex: 1;
            overflow: auto;
        }

        .navbtn {
            width: 100%;
            border: 0;
            background: transparent;
            padding: 12px 14px;
            border-radius: 0;
            cursor: pointer;
            display: grid;
            grid-template-columns: 28px 1fr auto;
            align-items: center;
            gap: 10px;
            color: var(--fb-text);
            text-align: left;
            position: relative;
            min-height: 44px;
            transition: box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .navbtn:hover {
            background: color-mix(in srgb, var(--fb-bg) 60%, transparent);
        }

        .navbtn.active {
            background: #00ced1;
            color: #073c3d;
            font-weight: 700;
        }

        .navbtn.active .navicon {
            color: #073c3d;
        }

        .navicon {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            color: var(--fb-text);
        }

        .navlabel {
            font-size: 15px;
            line-height: 1.2;
        }

        .navmeta {
            font-size: 12px;
            color: var(--fb-muted);
            background: color-mix(in srgb, var(--fb-bg) 50%, transparent);
            border: 0;
            border-radius: 999px;
            padding: 2px 8px;
            min-width: 28px;
            text-align: center;
        }

        .brand {
            font-weight: 800;
            font-size: 18px;
            height: 64px;
            padding: 0 14px;
            border-radius: 0;
            background: var(--fb-surface);
            border: 0;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
        }

        .footer {
            margin-top: auto;
            display: flex;
            gap: 8px;
            justify-content: center;
            padding: 10px 12px 12px;
        }

        .footerBtn {
            border: 0;
            background: transparent;
            padding: 0;
            cursor: pointer;
            color: var(--fb-text);
            display: grid;
            place-items: center;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            transition: box-shadow 0.15s ease, background 0.15s ease;
        }

        .footerBtn:hover {
            background: color-mix(in srgb, #00ced1 15%, transparent);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
        }

        .rail.collapsed .navbtn {
            grid-template-columns: 1fr;
            padding: 12px 0;
            justify-items: center;
        }

        .rail.collapsed .navlabel,
        .rail.collapsed .navmeta {
            display: none;
        }

        .rail.collapsed .brand {
            visibility: hidden;
        }
        .rail.collapsed .footer {
            flex-direction: column;
        }
    `;

    _click(target) {
        this.dispatchEvent(
            new CustomEvent('fb-nav', {
                detail: { target },
                bubbles: true,
                composed: true,
            })
        );
    }

    _toggleCollapse() {
        this.dispatchEvent(
            new CustomEvent('fb-sidebar-toggle', { bubbles: true, composed: true })
        );
    }

    render() {
        const active = this.active || 'schedule';
        const counts = this.counts || {};
        const meta = (k) => (counts?.[k] ? counts[k] : null);
        const isAdmin = Boolean(this.isAdmin);
        const collapsed = Boolean(this.collapsed);

        const item = (key, label, icon) => html`
            <button
                class="navbtn ${active === key ? 'active' : ''}"
                @click=${() => this._click(key)}
            >
                <span class="navicon">
                    <ha-icon icon=${icon}></ha-icon>
                </span>
                <span class="navlabel">${label}</span>
                ${meta(key) ? html`<span class="navmeta">${meta(key)}</span>` : html``}
            </button>
        `;

        return html`
            <div class="rail ${collapsed ? 'collapsed' : ''}">
                <div class="brand">${collapsed ? 'FB' : 'Family Board'}</div>
                <div class="nav">
                    ${item('schedule', 'Schedule', 'mdi:calendar-multiselect')}
                    ${item('chores', 'Chores', 'mdi:check-circle-outline')}
                    ${item('shopping', 'Shopping', 'mdi:cart-outline')}
                    ${item('home', 'Home', 'mdi:home-automation')}
                </div>
                <div class="footer">
                    ${isAdmin
                        ? html`<button
                              class="footerBtn"
                              title="Settings"
                              @click=${() => this._click('settings')}
                          >
                              <ha-icon icon="mdi:cog-outline"></ha-icon>
                          </button>`
                        : html``}
                    <button
                        class="footerBtn"
                        title=${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        @click=${this._toggleCollapse}
                    >
                        <ha-icon
                            icon=${collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'}
                        ></ha-icon>
                    </button>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-sidebar', FbSidebar);
