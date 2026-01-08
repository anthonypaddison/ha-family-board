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
            padding: 12px;
        }
        .grid {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }
        .tile {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        .name {
            font-weight: 700;
        }
        .muted {
            color: var(--fb-muted);
            font-size: 13px;
        }
        button {
            border: 0;
            border-radius: 12px;
            padding: 10px 12px;
            cursor: pointer;
            background: var(--palette-lilac);
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
                        return html`
                            <div class="tile">
                                <div>
                                    <div class="name">${label}</div>
                                    <div class="muted">${eid} - ${state}</div>
                                </div>
                                <button @click=${() => card._openMoreInfo(eid)}>Open</button>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-home-view', FbHomeView);
