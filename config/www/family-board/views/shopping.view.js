/* Family Board - shopping view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbShoppingView extends LitElement {
    static properties = { card: { type: Object } };

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: 14px;
        }
        .card {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
            max-width: 720px;
        }
        .h {
            padding: 10px 12px;
            font-weight: 700;
            border-bottom: 1px solid var(--fb-grid);
        }
        .inputRow {
            display: flex;
            gap: 8px;
            padding: 10px 12px;
            border-bottom: 1px solid var(--fb-grid);
            background: var(--fb-surface);
        }
        .inputRow input {
            flex: 1 1 auto;
            border: 1px solid var(--fb-grid);
            border-radius: 10px;
            padding: 8px 10px;
            font-size: 14px;
            background: var(--fb-surface);
        }
        .inputRow button {
            border: 1px solid var(--fb-grid);
            background: var(--palette-lilac, #cfbaf0);
            border-radius: 10px;
            padding: 8px 12px;
            cursor: pointer;
        }
        .items {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 10px 12px;
        }
        .muted {
            color: var(--fb-muted);
            font-size: 13px;
        }
        .actions {
            display: inline-flex;
            gap: 6px;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 10px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const items = card._shoppingItems || [];
        const name = card._config?.shopping?.name || 'Shopping';

        return html`
            <div class="wrap">
                <div class="card">
                    <div class="h">${name} - <span class="muted">${items.length}</span></div>
                    <div class="inputRow">
                        <input
                            id="shopInput"
                            placeholder="Add item"
                            @keydown=${(e) => {
                                if (e.key !== 'Enter') return;
                                const text = e.target.value?.trim();
                                if (!text) return;
                                card._addShoppingItem(text);
                                e.target.value = '';
                            }}
                        />
                        <button
                            @click=${() => {
                                const input = this.renderRoot.querySelector('#shopInput');
                                const text = input?.value?.trim();
                                if (!text) return;
                                card._addShoppingItem(text);
                                input.value = '';
                            }}
                        >
                            Add
                        </button>
                    </div>
                    <div class="items">
                        ${items.length
                            ? items.map(
                                  (it) => html`
                                      <div class="item">
                                          <label style="display:flex;align-items:center;gap:10px">
                                              <input
                                                  type="checkbox"
                                                  .checked=${['completed', 'done'].includes(
                                                      String(it.status || '').toLowerCase()
                                                  )}
                                                  @change=${(e) =>
                                                      card._toggleShoppingItem(it, e.target.checked)}
                                              />
                                              <div style="font-weight:700">
                                                  ${it.name ?? it.summary ?? it.item ?? '(Item)'}
                                              </div>
                                          </label>
                                          <div class="actions">
                                              <button
                                                  class="btn"
                                                  @click=${() => card._editShoppingItem(it)}
                                              >
                                                  Edit
                                              </button>
                                              <button
                                                  class="btn"
                                                  @click=${() => card._deleteShoppingItem(it)}
                                              >
                                                  Delete
                                              </button>
                                          </div>
                                      </div>
                                  `
                              )
                            : html`<div class="muted">
                                  No items.
                                  <button
                                      class="btn"
                                      style="margin-left:8px"
                                      @click=${() => card._openHelp()}
                                  >
                                      ⓘ
                                  </button>
                              </div>`}
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-shopping-view', FbShoppingView);
