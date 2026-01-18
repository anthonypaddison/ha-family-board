/* Family Board - chores view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbChoresView extends LitElement {
    static properties = { card: { type: Object }, renderKey: { type: String } };

    static styles = css`
        :host {
            display: block;
            height: 100%;
            min-height: 0;
        }
        .wrap {
            height: 100%;
            overflow: auto;
            padding: var(--fb-gutter);
            min-height: 0;
            box-sizing: border-box;
        }
        .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
        .card {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 14px;
            overflow: hidden;
        }
        .h {
            padding: 6px 8px;
            font-weight: 700;
            border-bottom: 1px solid var(--fb-grid);
            display: flex;
            gap: 8px;
            align-items: center;
            font-size: 14px;
        }
        .roleBadge {
            border: 1px solid var(--fb-border);
            border-radius: 999px;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: 700;
            color: var(--fb-muted);
            background: var(--fb-surface);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
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
            gap: 10px;
            border: 1px solid var(--fb-grid);
            border-radius: 12px;
            padding: 8px 10px;
            background: var(--fb-surface-2);
        }
        .itemTitle {
            font-weight: 700;
        }
        .item.completed {
            background: var(--fb-surface);
            opacity: 0.6;
        }
        .item.completed .itemTitle {
            text-decoration: line-through;
        }
        .muted {
            color: var(--fb-muted);
            font-size: 14px;
        }
        .actions {
            margin-left: auto;
            display: inline-flex;
            gap: 12px;
            padding-left: 8px;
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
        .btn.icon {
            width: var(--fb-touch);
            height: var(--fb-touch);
            padding: 0;
            display: grid;
            place-items: center;
            font-size: 16px;
            background: var(--fb-surface-2);
        }
        .h .btn {
            min-height: 32px;
            min-width: 32px;
            padding: 2px 5px;
            font-size: 12px;
        }
        .h .btn.icon {
            width: 32px;
            height: 32px;
            font-size: 14px;
        }
        .completeBtn {
            color: var(--fb-text);
        }
        .empty {
            padding: 12px;
            color: var(--fb-muted);
            font-size: 14px;
        }
    `;

    _itemKey(item, idx) {
        return item?.uid || item?.id || item?.summary || item?.name || String(idx);
    }

    render() {
        const card = this.card;
        if (!card) return html``;

        const todos = Array.isArray(card._config?.todos) ? card._config.todos : [];
        if (!todos.length) {
            return html`<div class="wrap">
                <div class="empty">
                    No chores configured yet.
                    <button
                        class="btn"
                        style="margin-left:8px"
                        @click=${() => card._openHelp()}
                    >
                        ⓘ
                    </button>
                </div>
            </div>`;
        }

        return html`
            <div class="wrap">
                <div class="grid">
                    ${todos
                        .filter((t) =>
                            card._isPersonAllowed(card._personIdForConfig(t, t.entity))
                        )
                        .map((t) => {
                        const person =
                            card._peopleById?.get(t.person_id || t.personId || t.person) || null;
                        const items = card._todoItems?.[t.entity] || [];
                        const label = person?.name || t.name || t.entity;
                        const colour = person?.color || t.color || card._neutralColor();
                        const role = person?.role || '';
                        const canClear = card._supportsService?.('todo', 'remove_completed_items');
                        return html`
                            <div class="card">
                                <div class="h">
                                    <span class="dot" style="background:${colour}"></span>
                                    <span>${label}</span>
                                    ${role ? html`<span class="roleBadge">${role}</span>` : html``}
                                    <span style="margin-left:auto" class="muted"
                                        >${items.length}</span
                                    >
                                    <button
                                        class="btn icon"
                                        title="Add chore"
                                        @click=${() =>
                                            card._openTodoAddForPerson(
                                                card._personIdForConfig(t, t.entity),
                                                t.entity
                                            )}
                                    >
                                        +
                                    </button>
                                    ${canClear
                                        ? html`<button
                                              class="btn"
                                              @click=${() => card._clearCompletedTodos(t.entity)}
                                          >
                                              Clear completed
                                          </button>`
                                        : html``}
                                </div>
                                <div class="items">
                                    ${items.length
                                        ? items.map((it, idx) => {
                                              const isDone =
                                                  ['completed', 'done'].includes(
                                                      String(it.status || '').toLowerCase()
                                                  ) || Boolean(it.completed);
                                              return html`
                                                  <div
                                                      class="item ${isDone ? 'completed' : ''}"
                                                      data-key=${this._itemKey(it, idx)}
                                                  >
                                                      <div>
                                                          <div class="itemTitle">
                                                              ${it.summary ?? it.name ?? it.item ?? '(Todo)'}
                                                          </div>
                                                      </div>
                                                      <div class="actions">
                                                          <button
                                                              class="btn"
                                                              @click=${() =>
                                                                  card._deleteTodoItem(
                                                                      t.entity,
                                                                      it
                                                                  )}
                                                          >
                                                              Delete
                                                          </button>
                                                          <button
                                                              class="btn"
                                                              @click=${() =>
                                                                  card._editTodoItem(
                                                                      t.entity,
                                                                      it
                                                                  )}
                                                          >
                                                              Edit
                                                          </button>
                                                          <button
                                                              class="btn icon completeBtn"
                                                              title=${isDone
                                                                  ? 'Mark as incomplete'
                                                                  : 'Mark as complete'}
                                                              @click=${() =>
                                                                  card._toggleTodoItem(
                                                                      t.entity,
                                                                      it,
                                                                      !isDone
                                                                  )}
                                                          >
                                                              <ha-icon
                                                                  icon=${isDone
                                                                      ? 'mdi:close'
                                                                      : 'mdi:check'}
                                                              ></ha-icon>
                                                          </button>
                                                      </div>
                                                  </div>
                                              `;
                                          })
                                        : html`<div class="empty">No chores.</div>`}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-chores-view', FbChoresView);
