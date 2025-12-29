class FamilyBoardCard extends HTMLElement {
    setConfig(config) {
        this.config = config;
    }

    connectedCallback() {
        if (this.shadowRoot) return;

        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          --menu-width: 96px;
          --bg: #ffffff;
          --surface: #ffffff;
          --border: #e5e7eb;
          --text: #0f172a;
          font-family: system-ui, -apple-system, BlinkMacSystemFont;
        }

        .layout {
          display: grid;
          grid-template-columns: var(--menu-width) 1fr;
          height: 100%;
          background: var(--bg);
        }

        .menu {
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 0;
          gap: 12px;
        }

        .menu-item {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          cursor: pointer;
          color: var(--text);
          position: relative;
        }

        .menu-item.active {
          background: #f6f7ff;
        }

        .badge {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #cfbaf0;
          color: #fff;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .content {
          padding: 24px;
        }

        .page {
          display: none;
        }

        .page.active {
          display: block;
        }
      </style>

      <div class="layout">
        <div class="menu">
          <div class="menu-item active" data-page="now">
            NOW
            <div class="badge">3</div>
          </div>
          <div class="menu-item" data-page="chores">
            CHORES
            <div class="badge">2</div>
          </div>
          <div class="menu-item" data-page="shopping">
            SHOP
            <div class="badge">5</div>
          </div>
          <div class="menu-item" data-page="home">
            HOME
          </div>
        </div>

        <div class="content">
          <div class="page active" id="now">Now / Calendar (placeholder)</div>
          <div class="page" id="chores">Chores (placeholder)</div>
          <div class="page" id="shopping">Shopping (placeholder)</div>
          <div class="page" id="home">Home controls (placeholder)</div>
        </div>
      </div>
    `;

        this._bindMenu();
    }

    _bindMenu() {
        const items = this.shadowRoot.querySelectorAll('.menu-item');
        const pages = this.shadowRoot.querySelectorAll('.page');

        items.forEach((item) => {
            item.addEventListener('click', () => {
                items.forEach((i) => i.classList.remove('active'));
                pages.forEach((p) => p.classList.remove('active'));

                item.classList.add('active');
                const page = item.dataset.page;
                this.shadowRoot.getElementById(page).classList.add('active');
            });
        });
    }

    set hass(hass) {}
}

customElements.define('family-board-card', FamilyBoardCard);
