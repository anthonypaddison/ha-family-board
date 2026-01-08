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
    };

    static styles = css`
        :host {
            display: block;
        }

        .rail {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .nav {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
        }

        .navbtn {
            width: 100%;
            border: 1px solid var(--fb-border);
            background: var(--fb-surface-2);
            padding: 12px 14px;
            border-radius: 14px;
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
            background: var(--fb-surface);
            border-color: var(--fb-grid);
        }

        .navbtn.active {
            background: var(--fb-surface);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
            font-weight: 700;
            border-color: transparent;
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
            padding: 12px 14px;
            border-radius: 16px;
            background: var(--fb-accent);
            border: 1px solid var(--fb-border);
            width: 100%;
            box-sizing: border-box;
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
            <div class="rail">
                <div class="brand">Family Board</div>
                <div class="nav">
                    ${item('schedule', 'Schedule', 'mdi:calendar-multiselect')}
                    ${item('chores', 'Chores', 'mdi:check-circle-outline')}
                    ${item('shopping', 'Shopping', 'mdi:cart-outline')}
                    ${item('home', 'Home', 'mdi:home-automation')}
                    ${isAdmin ? item('settings', 'Settings', 'mdi:cog-outline') : html``}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-sidebar', FbSidebar);
