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
        }

        .navbtn {
            width: 100%;
            border: 0;
            border-bottom: 1px solid var(--fb-border);
            background: var(--fb-surface);
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
            background: var(--fb-surface-2);
        }

        .navbtn.active {
            background: var(--fb-bg);
            box-shadow: inset 0 0 0 1px var(--fb-border);
            font-weight: 700;
        }

        .navbtn.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 8px;
            bottom: 8px;
            width: 4px;
            border-radius: 999px;
            background: var(--fb-accent);
        }

        .navicon {
            width: 28px;
            height: 28px;
            border-radius: 10px;
            display: grid;
            place-items: center;
            background: var(--fb-surface-3);
            color: var(--fb-text);
        }

        .navlabel {
            font-size: 15px;
            line-height: 1.2;
        }

        .navmeta {
            font-size: 12px;
            color: var(--fb-muted);
            background: var(--fb-surface-2);
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 2px 8px;
            min-width: 28px;
            text-align: center;
        }

        .brand {
            font-weight: 800;
            font-size: 18px;
            height: 56px;
            padding: 0 14px;
            border-radius: 0;
            background: var(--fb-accent);
            border: 1px solid var(--fb-border);
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
            background: var(--fb-surface);
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
            display: none;
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
