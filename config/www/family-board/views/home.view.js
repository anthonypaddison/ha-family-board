/* Family Board - home controls view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbHomeView extends LitElement {
    static properties = { card: { type: Object } };

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 10px;
        }
        .grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .tile {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .name {
            font-weight: 700;
        }
        button {
            border: 0;
            cursor: pointer;
        }
        .toggle {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 26px;
        }
        .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: var(--fb-surface-2);
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            transition: 0.2s;
        }
        .slider::before {
            position: absolute;
            content: '';
            height: 20px;
            width: 20px;
            left: 3px;
            top: 2px;
            background-color: var(--fb-surface);
            border: 1px solid var(--fb-border);
            border-radius: 50%;
            transition: 0.2s;
        }
        .toggle input:checked + .slider {
            background-color: var(--fb-accent);
            border-color: var(--fb-accent);
        }
        .toggle input:checked + .slider::before {
            transform: translateX(20px);
            border-color: var(--fb-accent);
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const hass = card.hass;
        const controls = Array.isArray(card._config?.home_controls)
            ? card._config.home_controls
            : [];

        return html`
            <div class="wrap">
                <div class="grid">
                    ${controls.map((eid) => {
                        const st = hass?.states?.[eid];
                        const label = st?.attributes?.friendly_name || eid;
                        const state = st?.state ?? 'unknown';
                        const isOn = state === 'on';
                        return html`
                            <div class="tile">
                                <div>
                                    <div class="name">${label}</div>
                                </div>
                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        .checked=${isOn}
                                        @change=${(e) =>
                                            card._setHomeEntityState(eid, e.target.checked)}
                                    />
                                    <span class="slider"></span>
                                </label>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-home-view', FbHomeView);
