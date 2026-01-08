/* Family Board - todo view
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { LitElement, html, css } = getHaLit();

export class FbTodoView extends LitElement {
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
        .row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }
        .toggle {
            border: 1px solid var(--fb-grid);
            background: var(--fb-surface);
            border-radius: 999px;
            padding: 8px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .toggle.active {
            background: var(--palette-lilac);
            border-color: transparent;
        }
        .dot {
            width: 10px;
            height: 10px;
            border-radius: 999px;
        }
        .list {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
            gap: 8px;
            align-items: center;
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
    `;

    render() {
        const card = this.card;
        if (!card) return html``;

        const todos = Array.isArray(card._config?.todos) ? card._config.todos : [];
        if (!todos.length) {
            return html`<div class="wrap">
                <div style="color:var(--fb-muted)">No todos configured yet.</div>
            </div>`;
        }

        const activeSet = card._todoVisibleSet || new Set(todos.map((t) => t.entity));

        return html`
            <div class="wrap">
                <div class="row">
                    ${todos.map((t) => {
                        const active = activeSet.has(t.entity);
                        return html`
                            <button
                                class="toggle ${active ? 'active' : ''}"
                                @click=${() => card._toggleTodoVisible(t.entity)}
                            >
                                <span class="dot" style="background:${t.color || '#a3c4f3'}"></span>
                                <span>${t.name || t.entity}</span>
                            </button>
                        `;
                    })}
                </div>

                <div class="list">
                    ${todos
                        .filter((t) => activeSet.has(t.entity))
                        .map((t) => {
                            const items = card._todoItems?.[t.entity] || [];
                            return html`
                                <div class="card">
                                    <div class="h">
                                        <span
                                            class="dot"
                                            style="background:${t.color || '#a3c4f3'}"
                                        ></span>
                                        <span>${t.name || t.entity}</span>
                                        <span style="margin-left:auto" class="muted"
                                            >${items.length}</span
                                        >
                                    </div>
                                    <div class="items">
                                        ${items.length
                                            ? items.map(
                                                  (it) => html`
                                                      <div class="item">
                                                          <div>
                                                              <div style="font-weight:700">
                                                                  ${it.summary ??
                                                                  it.name ??
                                                                  it.item ??
                                                                  '(Todo)'}
                                                              </div>
                                                              <div class="muted">
                                                                  ${it.status ?? ''}
                                                              </div>
                                                          </div>
                                                          <button
                                                              class="toggle"
                                                              @click=${() =>
                                                                  card._openMoreInfo(t.entity)}
                                                          >
                                                              Open
                                                          </button>
                                                      </div>
                                                  `
                                              )
                                            : html`<div class="muted">No items.</div>`}
                                    </div>
                                </div>
                            `;
                        })}
                </div>
            </div>
        `;
    }
}

customElements.define('fb-todo-view', FbTodoView);
