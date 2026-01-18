/* Family Board - floating action button
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbFab extends LitElement {
    static properties = {
        hidden: { type: Boolean },
        label: { type: String },
        disabled: { type: Boolean },
    };

    static styles = css`
        :host {
            position: fixed;
            right: calc(18px + env(safe-area-inset-right));
            bottom: calc(18px + env(safe-area-inset-bottom));
            z-index: 1000;
            display: block;
        }

        button {
            width: var(--fb-touch);
            height: var(--fb-touch);
            border-radius: 999px;
            border: 0;
            cursor: pointer;
            background: var(--fb-accent);
            color: var(--text-on-accent);
            font-size: 26px;
            line-height: 0;
            box-shadow: var(--shadow-lg);
        }

        button[disabled] {
            opacity: 0.55;
            cursor: not-allowed;
        }

        button:active {
            transform: translateY(1px);
        }
    `;

    _click() {
        if (this.disabled) return;
        this.dispatchEvent(new CustomEvent('fb-fab', { bubbles: true, composed: true }));
    }

    render() {
        if (this.hidden) return html``;
        return html`
            <button title=${this.label || 'Add'} ?disabled=${this.disabled} @click=${this._click}>
                +
            </button>
        `;
    }
}

customElements.define('fb-fab', FbFab);
