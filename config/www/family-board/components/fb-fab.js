/* Family Board - floating action button
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbFab extends LitElement {
    static properties = {
        hidden: { type: Boolean },
        label: { type: String },
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
            width: 56px;
            height: 56px;
            border-radius: 999px;
            border: 0;
            cursor: pointer;
            background: var(--fb-accent);
            color: #ffffff;
            font-size: 26px;
            line-height: 0;
            box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
        }

        button:active {
            transform: translateY(1px);
        }
    `;

    _click() {
        this.dispatchEvent(new CustomEvent('fb-fab', { bubbles: true, composed: true }));
    }

    render() {
        if (this.hidden) return html``;
        return html`<button title=${this.label || 'Add'} @click=${this._click}>+</button>`;
    }
}

customElements.define('fb-fab', FbFab);
