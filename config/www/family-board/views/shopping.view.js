/* Family Board - shopping view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbShoppingView extends LitElement {
    static properties = {
        card: { type: Object },
        renderKey: { type: String },
    };

    _addCommonItem(item) {
        if (!item) return;
        this.card?._addShoppingItem(item);
    }

    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }
        .wrap {
            height: 100%;
            overflow: hidden;
            padding: var(--fb-gutter);
            min-height: 0;
            box-sizing: border-box;
        }
        .layout {
            display: grid;
            gap: 14px;
            grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.5fr);
            height: 100%;
            min-height: 0;
            align-items: stretch;
        }
        .card {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
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
        .headerMeta {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .headerBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 4px 10px;
            font-size: 12px;
            cursor: pointer;
            color: var(--fb-text);
            min-height: 0;
        }
        .headerBtn:disabled {
            opacity: 0.5;
            cursor: default;
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
            color: var(--fb-text);
        }
        .inputRow button {
            border: 1px solid var(--fb-grid);
            background: var(--fb-accent);
            border-radius: 10px;
            padding: 8px 12px;
            cursor: pointer;
            min-height: var(--fb-touch);
            min-width: var(--fb-touch);
        }
        .items {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            overflow: auto;
            min-height: 0;
            flex: 1 1 auto;
        }
        .item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 2px 6px;
            transition: opacity 0.3s ease;
        }
        .item.pendingRemove {
            opacity: 0.6;
        }
        .item.removing {
            opacity: 0;
        }
        .itemTitle {
            font-weight: 700;
            font-size: 14px;
        }
        .itemTitle.completed {
            text-decoration: line-through;
            color: var(--fb-muted);
        }
        .muted {
            color: var(--fb-muted);
            font-size: 14px;
        }
        .actions {
            display: inline-flex;
            gap: 10px;
            padding-left: 8px;
        }
        .itemMain {
            display: flex;
            align-items: center;
            gap: 4px;
            min-width: 0;
            flex: 1;
        }
        .itemLabel {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            flex: 1;
        }
        .itemName {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .qty {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border: 1px solid var(--fb-grid);
            border-radius: 999px;
            padding: 0 4px;
            background: var(--fb-surface-2);
            flex: 0 0 auto;
        }
        .qtyBtn {
            border: 0;
            background: transparent;
            cursor: pointer;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-weight: 700;
            color: var(--fb-text);
            font-size: 18px;
            line-height: 1;
        }
        .qtyValue {
            min-width: 18px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        .btn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 10px;
            padding: 4px 8px;
            font-size: 14px;
            cursor: pointer;
            color: var(--fb-text);
            min-height: var(--fb-touch);
            min-width: var(--fb-touch);
        }
        .iconBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 10px;
            padding: 4px;
            width: var(--fb-touch);
            height: var(--fb-touch);
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
        }
        .iconBtn ha-icon,
        .starBtn ha-icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            font-size: 16px;
        }
        .itemStar ha-icon {
            width: 24px;
            height: 24px;
            font-size: 24px;
        }
        .starBtn ha-svg-icon,
        .starBtn ha-svg-icon svg {
            width: 16px;
            height: 16px;
            display: block;
            margin: 0 auto;
        }
        .iconBtn.active {
            color: var(--fb-accent);
            border-color: var(--fb-accent);
        }
        .completeBtn {
            color: var(--fb-text);
        }
        .commonList {
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow: auto;
            min-height: 0;
            flex: 1 1 auto;
        }
        .commonRow {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .commonItem {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface-2);
            border-radius: 10px;
            padding: 8px 10px;
            cursor: pointer;
            text-align: left;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--fb-text);
            flex: 1;
            min-width: 0;
        }
        .commonText {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .commonPlus {
            border: 1px solid var(--fb-grid);
            border-radius: 8px;
            padding: 2px 6px;
            font-size: 14px;
            line-height: 1.1;
            background: var(--fb-surface);
            color: var(--fb-text);
            flex: 0 0 auto;
        }
        .commonActions {
            display: inline-flex;
            gap: 4px;
            align-items: center;
        }
        .starBtn {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 10px;
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: var(--fb-muted);
            flex: 0 0 auto;
            padding: 0;
            line-height: 1;
            box-sizing: border-box;
            font-size: 0;
        }
        .starBtn.active {
            color: var(--warning);
            border-color: var(--warning);
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
        const favList = favourites.map((item) => String(item));
        const favKeys = new Set(
            [...favourites, ...common].map((item) => String(item).toLowerCase())
        );
        const commonList = [];
        const seen = new Set();
        for (const item of [...favList, ...common]) {
            const key = String(item).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            commonList.push(String(item));
        }

        return html`
            <div class="wrap">
                <div class="layout">
                    <div class="card">
                        <div class="h">
                            <span>${name}</span>
                            <span class="headerMeta">
                                <span class="muted">${items.length}</span>
                                ${items.length
                                    ? html`<button
                                          class="headerBtn"
                                          @click=${() => card._clearShoppingList?.()}
                                      >
                                          Clear list
                                      </button>`
                                    : html``}
                            </span>
                        </div>
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
                                      const rawName =
                                          it.name ?? it.summary ?? it.item ?? '(Item)';
                                      const parsed = card._parseShoppingText
                                          ? card._parseShoppingText(rawName)
                                          : { base: rawName, qty: 1 };
                                      const itemName = parsed.base || rawName;
                                      const qty = parsed.qty || 1;
                                      const fav = favKeys.has(
                                          String(itemName).toLowerCase()
                                      );
                                      const isDone = ['completed', 'done'].includes(
                                          String(it.status || '').toLowerCase()
                                      );
                                      const pendingRemove = Boolean(it._fbPendingRemove);
                                      const removing = Boolean(it._fbRemoving);
                                      return html`
                                          <div
                                              class="item ${pendingRemove ? 'pendingRemove' : ''} ${removing ? 'removing' : ''}"
                                          >
                                              <div class="itemMain">
                                                  <div class="itemLabel">
                                                      <div
                                                          class="itemTitle ${isDone ? 'completed' : ''} itemName"
                                                      >
                                                          ${itemName}
                                                      </div>
                                                  </div>
                                                  <div class="qty">
                                                      <button
                                                          class="qtyBtn"
                                                          title="Decrease"
                                                          @click=${() =>
                                                              card._adjustShoppingQuantity(it, -1)}
                                                      >
                                                          -
                                                      </button>
                                                      <span class="qtyValue">${qty}</span>
                                                      <button
                                                          class="qtyBtn"
                                                          title="Increase"
                                                          @click=${() =>
                                                              card._adjustShoppingQuantity(it, 1)}
                                                      >
                                                          +
                                                      </button>
                                                  </div>
                                              </div>
                                              <div class="actions">
                                                  <button
                                                      class="iconBtn itemStar ${fav ? 'active' : ''}"
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
                                                      @click=${() => card._deleteShoppingItem(it)}
                                                  >
                                                      Delete
                                                  </button>
                                                  <button
                                                      class="btn"
                                                      @click=${() => card._editShoppingItem(it)}
                                                  >
                                                      Edit
                                                  </button>
                                                  <button
                                                      class="btn icon completeBtn"
                                                      title=${isDone
                                                          ? 'Mark as incomplete'
                                                          : 'Mark as complete'}
                                                      @click=${() =>
                                                          card._toggleShoppingItem(it, !isDone)}
                                                  >
                                                      <ha-icon
                                                          icon=${isDone ? 'mdi:close' : 'mdi:check'}
                                                      ></ha-icon>
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
                        <div class="h commonHeader">
                            <span>Favourites</span>
                            <span class="headerMeta">
                                <span class="muted">${commonList.length}</span>
                                ${commonList.length
                                    ? html`<button
                                              class="headerBtn"
                                              @click=${() => card._addShoppingFavourites?.()}
                                          >
                                              Add all
                                          </button>
                                          <button
                                              class="headerBtn"
                                              @click=${() => card._clearShoppingFavourites?.()}
                                          >
                                              Clear all
                                          </button>`
                                    : html``}
                            </span>
                        </div>
                        <div class="commonList">
                            ${commonList.length
                                ? commonList.map((item) => {
                                      const key = String(item).toLowerCase();
                                      const fav = favKeys.has(key);
                                          return html`
                                          <div class="commonRow">
                                              <button
                                                  class="commonItem"
                                                  @click=${() => this._addCommonItem(item)}
                                              >
                                                  <span class="commonText">${item}</span>
                                                  <span class="commonPlus" aria-hidden="true">+</span>
                                              </button>
                                                  <button
                                                      class="starBtn active"
                                                      title="Unfavourite"
                                                      @click=${() =>
                                                          card._toggleShoppingFavourite(item)}
                                                  >
                                                      <ha-icon icon="mdi:star"></ha-icon>
                                                  </button>
                                          </div>
                                      `;
                                  })
                                : html`<div class="muted">No common items yet.</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('fb-shopping-view', FbShoppingView);
