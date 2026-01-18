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
            padding: var(--fb-gutter);
            box-sizing: border-box;
        }
        .grid {
            display: grid;
            gap: 8px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 25%));
            align-items: stretch;
        }
        .banner {
            border: 1px dashed var(--fb-border);
            border-radius: 12px;
            padding: 12px;
            color: var(--fb-muted);
            background: var(--fb-surface-2);
        }
        .tile {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            padding: 8px 10px;
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: space-between;
            width: 100%;
            min-height: var(--fb-touch);
        }
        .name {
            font-weight: 700;
            overflow-wrap: anywhere;
            white-space: normal;
        }
        button {
            border: 0;
            cursor: pointer;
        }
        .toggle {
            position: relative;
            display: inline-block;
            width: var(--fb-touch);
            height: var(--fb-touch);
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
            height: 24px;
            width: 24px;
            left: 6px;
            top: 6px;
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

    _friendlyName(entityId, state) {
        const name = state?.attributes?.friendly_name;
        if (name) return name;
        const raw = String(entityId || '').split('.')[1] || entityId || '';
        return raw
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const hass = card.hass;
        const controls = Array.isArray(card._config?.home_controls)
            ? card._config.home_controls
            : [];
        const validControls = controls.filter((eid) => hass?.states?.[eid]);

        return html`
            <div class="wrap">
                ${validControls.length === 0
                    ? html`<div class="banner">
                          No home controls configured.
                          ${card._hass?.user?.is_admin
                              ? html`Add entities in Settings -> Home controls.`
                              : html`Ask an admin to configure home controls.`}
                      </div>`
                    : html``}
                <div class="grid">
                    ${validControls.map((eid) => {
                        const st = hass?.states?.[eid];
                        const label = this._friendlyName(eid, st);
                        const state = st?.state ?? 'unknown';
                        const isOn = state === 'on';
                        return html`
                            <div class="tile">
                                <div style="flex:1;min-width:0">
                                    <div class="name">${label}</div>
                                </div>
                                <label class="toggle">
                                    <input
                                        type="checkbox"
                                        .checked=${isOn}
                                        ?disabled=${!st}
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
