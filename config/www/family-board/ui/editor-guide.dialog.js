/* Family Board - editor guide dialog
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbEditorGuideDialog extends LitElement {
    static properties = {
        open: { type: Boolean },
    };

    static styles = css`
        :host {
            display: block;
        }
        .backdrop {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 14px;
        }
        .dlg {
            width: 100%;
            max-width: 640px;
            background: var(--fb-surface);
            border-radius: 12px;
            border: 1px solid var(--fb-border);
            padding: 14px;
            max-height: 90vh;
            overflow: auto;
        }
        .h {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-weight: 700;
        }
        .note {
            color: var(--fb-muted);
            font-size: 13px;
            margin-top: 6px;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            background: var(--fb-surface-2);
            padding: 6px 10px;
            cursor: pointer;
            font-size: 13px;
            color: var(--fb-text);
        }
        ul {
            margin: 10px 0 0;
            padding-left: 18px;
            color: var(--fb-text);
            font-size: 14px;
        }
        .actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 12px;
        }
    `;

    _close() {
        this.dispatchEvent(new CustomEvent('fb-editor-guide-close', { bubbles: true, composed: true }));
    }

    _openEditor() {
        this.dispatchEvent(new CustomEvent('fb-editor-guide-open', { bubbles: true, composed: true }));
    }

    render() {
        if (!this.open) return html``;
        return html`
            <div class="backdrop" @click=${(e) => e.target === e.currentTarget && this._close()}>
                <div class="dlg">
                    <div class="h">
                        <div>Edit the card</div>
                        <button class="btn" @click=${this._close}>Close</button>
                    </div>
                    <div class="note">
                        If the editor does not open automatically, follow these steps.
                    </div>
                    <ul>
                        <li>Open the Family Board dashboard.</li>
                        <li>Tap the three dots menu and choose Edit dashboard.</li>
                        <li>Select the Family Board card.</li>
                        <li>Use the card editor to update settings.</li>
                        <li>Save the dashboard.</li>
                    </ul>
                    <div class="actions">
                        <button class="btn" @click=${this._openEditor}>Try open editor</button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-editor-guide-dialog', FbEditorGuideDialog);
