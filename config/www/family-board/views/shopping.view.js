/* Family Board - shopping view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbShoppingView extends LitElement {
    static properties = {
        card: { type: Object },
        _commonExpanded: { state: true },
    };

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
        .layout {
            display: grid;
            gap: 14px;
            grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
        }
        .card {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
        }
        .h {
            padding: 10px 12px;
            font-weight: 700;
            border-bottom: 1px solid var(--fb-grid);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }
        .h.commonHeader {
            cursor: pointer;
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
            color: var(--fb-text);
        }
        .iconBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 10px;
            padding: 4px;
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
        }
        .iconBtn.active {
            color: var(--fb-accent);
            border-color: var(--fb-accent);
        }
        .commonList {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .commonItem {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 8px 10px;
            cursor: pointer;
            text-align: left;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            color: var(--fb-text);
        }
        .commonActions {
            display: inline-flex;
            gap: 6px;
        }
        .removeBtn {
            border: 0;
            background: transparent;
            color: var(--fb-muted);
            cursor: pointer;
            font-size: 12px;
        }
        @media (max-width: 900px) {
            .layout {
                grid-template-columns: 1fr;
            }
        }
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const items = card._shoppingItems || [];
        const name = card._config?.shopping?.name || 'Shopping';
        const favourites = Array.isArray(card._shoppingFavourites)
            ? card._shoppingFavourites
            : [];
        const common = Array.isArray(card._shoppingCommon) ? card._shoppingCommon : [];
        const commonList = Array.from(
            new Map(
                [...favourites, ...common].map((item) => [String(item).toLowerCase(), String(item)])
            ).values()
        );
        const visibleCommon = this._commonExpanded ? commonList : commonList.slice(0, 10);

        return html`
            <div class="wrap">
                <div class="layout">
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
                                ? items.map((it) => {
                                      const itemName =
                                          it.name ?? it.summary ?? it.item ?? '(Item)';
                                      const fav = favourites.some(
                                          (f) =>
                                              String(f).toLowerCase() ===
                                              String(itemName).toLowerCase()
                                      );
                                      return html`
                                          <div class="item">
                                              <label style="display:flex;align-items:center;gap:10px">
                                                  <input
                                                      type="checkbox"
                                                      .checked=${['completed', 'done'].includes(
                                                          String(it.status || '').toLowerCase()
                                                      )}
                                                      @change=${(e) =>
                                                          card._toggleShoppingItem(
                                                              it,
                                                              e.target.checked
                                                          )}
                                                  />
                                                  <div style="font-weight:700">${itemName}</div>
                                              </label>
                                              <div class="actions">
                                                  <button
                                                      class="iconBtn ${fav ? 'active' : ''}"
                                                      title=${fav ? 'Unfavourite' : 'Favourite'}
                                                      @click=${() =>
                                                          card._toggleShoppingFavourite(itemName)}
                                                  >
                                                      <ha-icon
                                                          icon=${fav ? 'mdi:star' : 'mdi:star-outline'}
                                                      ></ha-icon>
                                                  </button>
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
                                      `;
                                  })
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

                    <div class="card">
                        <div
                            class="h commonHeader"
                            @click=${() => (this._commonExpanded = !this._commonExpanded)}
                        >
                            <span>Common items</span>
                            <span class="muted">${commonList.length}</span>
                        </div>
                        <div class="commonList">
                                    ${visibleCommon.length
                                        ? visibleCommon.map(
                                              (item) => html`
                                          <button
                                              class="commonItem"
                                              @click=${() => card._addShoppingItem(item)}
                                          >
                                              <span>${item}</span>
                                              <span class="commonActions">
                                                  <span class="muted">Add</span>
                                                  <button
                                                      class="removeBtn"
                                                      @click=${(e) => {
                                                          e.stopPropagation();
                                                          card._removeShoppingCommon(item);
                                                      }}
                                                      title="Remove"
                                                  >
                                                      Remove
                                                  </button>
                                              </span>
                                          </button>
                                      `
                                          )
                                        : html`<div class="muted">No common items yet.</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-shopping-view', FbShoppingView);
