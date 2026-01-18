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
            padding-top: 0;
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 100%;
            flex: 1;
            overflow: auto;
            padding-top: max(
                0px,
                calc(var(--fb-topbar-height, 0px) + (var(--fb-gutter) * 2) + 24px - 64px)
            );
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
            min-height: var(--fb-touch);
            transition: box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }

        .navbtn:hover {
            background: color-mix(in srgb, var(--fb-bg) 60%, transparent);
        }

        .navbtn.active {
            background: var(--fb-accent-teal);
            color: #ffffff;
            font-weight: 700;
        }

        .navbtn.active .navicon {
            color: #ffffff;
        }
        .navbtn.active .navmeta {
            color: #ffffff;
            background: color-mix(in srgb, #ffffff 20%, transparent);
        }
        .navbtn.settings {
            margin-top: auto;
        }

        .navicon {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            color: var(--fb-text);
        }

        .navlabel {
            font-size: 16px;
            line-height: 1.2;
        }

        .navmeta {
            font-size: 14px;
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
            font-size: 20px;
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

    render() {
        const active = this.active || 'schedule';
        const counts = this.counts || {};
        const meta = (k) => (counts?.[k] ? counts[k] : null);
        const isAdmin = Boolean(this.isAdmin);
        const collapsed = true;

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
                    ${item('important', 'Important', 'mdi:alert-circle-outline')}
                    ${item('chores', 'Chores', 'mdi:check-circle-outline')}
                    ${item('shopping', 'Shopping', 'mdi:cart-outline')}
                    ${item('home', 'Home', 'mdi:home-automation')}
                    ${isAdmin
                        ? html`<button
                              class="navbtn settings ${active === 'settings' ? 'active' : ''}"
                              @click=${() => this._click('settings')}
                          >
                              <span class="navicon">
                                  <ha-icon icon="mdi:cog-outline"></ha-icon>
                              </span>
                              <span class="navlabel">Settings</span>
                          </button>`
                        : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-sidebar', FbSidebar);
