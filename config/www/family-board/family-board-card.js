/* family-board-card.js */

class FamilyBoardCard extends HTMLElement {
    setConfig(config) {
        if (!config) throw new Error('Invalid configuration');

        this.config = {
            title: config.title ?? 'Family Board',
            menu: Array.isArray(config.menu)
                ? config.menu
                : [
                      { id: 'now', label: 'NOW', badge_entity: 'sensor.family_badge_now' },
                      { id: 'chores', label: 'CHORES', badge_entity: 'sensor.family_badge_chores' },
                      {
                          id: 'shopping',
                          label: 'SHOPPING',
                          badge_entity: 'sensor.family_badge_shopping',
                      },
                      { id: 'home', label: 'HOME' },
                  ],
            home_controls: Array.isArray(config.home_controls) ? config.home_controls : [],
        };
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

          --palette-mint: #b9fbc0;
          --palette-aqua: #98f5e1;
          --palette-cyan: #8eecf5;
          --palette-sky: #90dbf4;
          --palette-bluegrey: #a3c4f3;
          --palette-lilac: #cfbaf0;
          --palette-rose: #ffcfd2;
          --palette-vanilla: #fbf8cc;

          --bg: #ffffff;
          --surface: #ffffff;
          --border: #e5e7eb;
          --text: #0f172a;
          --muted: #475569;

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
          width: 72px;
          height: 72px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          cursor: pointer;
          color: var(--text);
          position: relative;
          user-select: none;
        }

        .menu-item:active {
          transform: scale(0.98);
        }

        .menu-item.active {
          background: #f6f7ff;
          outline: 2px solid rgba(207, 186, 240, 0.4);
        }

        .badge {
          position: absolute;
          top: 6px;
          right: 6px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--palette-lilac);
          color: #ffffff;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .content {
          padding: 18px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          margin-bottom: 14px;
        }

        .title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text);
        }

        .subtitle {
          font-size: 12px;
          color: var(--muted);
        }

        .page {
          display: none;
        }
        .page.active {
          display: block;
        }

        .panel {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          padding: 14px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .controls {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .btn {
          border: 1px solid var(--border);
          border-radius: 14px;
          background: #ffffff;
          padding: 12px 10px;
          cursor: pointer;
          text-align: left;
          user-select: none;
        }

        .btn:active {
          transform: scale(0.98);
        }

        .btn-name {
          font-size: 13px;
          font-weight: 800;
          color: var(--text);
        }

        .btn-state {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        @media (max-width: 640px) {
          :host { --menu-width: 86px; }
          .controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      </style>

      <div class="layout">
        <div class="menu" id="menu"></div>

        <div class="content">
          <div class="header">
            <div>
              <div class="title" id="hdrTitle">Family Board</div>
              <div class="subtitle" id="hdrSub">Shell + config wiring</div>
            </div>
          </div>

          <div class="page active" id="page-now">
            <div class="panel">
              Now / Calendar (next)
            </div>
          </div>

          <div class="page" id="page-chores">
            <div class="panel">
              Chores (next)
            </div>
          </div>

          <div class="page" id="page-shopping">
            <div class="panel">
              Shopping (next)
            </div>
          </div>

          <div class="page" id="page-home">
            <div class="panel">
              <div class="controls" id="homeControls"></div>
            </div>
          </div>
        </div>
      </div>
    `;

        this._activePage = 'now';
        this._menuEls = [];
        this._pages = {
            now: this.shadowRoot.getElementById('page-now'),
            chores: this.shadowRoot.getElementById('page-chores'),
            shopping: this.shadowRoot.getElementById('page-shopping'),
            home: this.shadowRoot.getElementById('page-home'),
        };

        this._renderMenu();
        this._renderHomeControls();
        this._applyActivePage();
    }

    set hass(hass) {
        this._hass = hass;
        this._updateBadges();
        this._updateHomeButtonStates();
    }

    _renderMenu() {
        const menuRoot = this.shadowRoot.getElementById('menu');
        menuRoot.innerHTML = '';
        this._menuEls = [];

        for (const item of this.config.menu) {
            const el = document.createElement('div');
            el.className = 'menu-item';
            el.dataset.page = String(item.id);

            const label = document.createElement('div');
            label.textContent = String(item.label ?? item.id).toUpperCase();
            el.appendChild(label);

            // badge placeholder (may be hidden)
            const badge = document.createElement('div');
            badge.className = 'badge';
            badge.style.display = 'none';
            el.appendChild(badge);

            el.addEventListener('click', () => {
                this._activePage = String(item.id);
                this._applyActivePage();
            });

            menuRoot.appendChild(el);
            this._menuEls.push({ cfg: item, el, badge });
        }
    }

    _applyActivePage() {
        // menu
        for (const { el } of this._menuEls) {
            el.classList.toggle('active', el.dataset.page === this._activePage);
        }

        // pages
        for (const [key, pageEl] of Object.entries(this._pages)) {
            pageEl.classList.toggle('active', key === this._activePage);
        }
    }

    _updateBadges() {
        if (!this._hass) return;

        for (const { cfg, badge } of this._menuEls) {
            const ent = cfg.badge_entity;
            if (!ent) {
                badge.style.display = 'none';
                continue;
            }

            const st = this._hass.states[ent];
            const raw = st ? st.state : '0';
            const num = Number(raw);

            // hide when 0 / missing / non-number
            if (!st || !Number.isFinite(num) || num <= 0) {
                badge.style.display = 'none';
                continue;
            }

            badge.textContent = String(num);
            badge.style.display = 'flex';
        }
    }

    _renderHomeControls() {
        const root = this.shadowRoot.getElementById('homeControls');
        root.innerHTML = '';

        const controls = (this.config.home_controls ?? []).slice(0, 12);

        this._homeButtons = controls.map((c) => {
            const btn = document.createElement('div');
            btn.className = 'btn';
            btn.dataset.entity = c.entity ?? '';

            const name = document.createElement('div');
            name.className = 'btn-name';
            name.textContent = c.name ?? c.entity ?? 'Control';
            btn.appendChild(name);

            const state = document.createElement('div');
            state.className = 'btn-state';
            state.textContent = '—';
            btn.appendChild(state);

            btn.addEventListener('click', () => this._toggleEntity(c.entity));
            root.appendChild(btn);

            return { btn, state };
        });
    }

    _updateHomeButtonStates() {
        if (!this._hass || !this._homeButtons) return;

        for (const { btn, state } of this._homeButtons) {
            const entityId = btn.dataset.entity;
            const st = entityId ? this._hass.states[entityId] : null;

            if (!st) {
                state.textContent = 'Unavailable';
                continue;
            }

            // friendly-ish
            const raw = st.state;
            state.textContent = raw === 'on' ? 'On' : raw === 'off' ? 'Off' : String(raw);
        }
    }

    _toggleEntity(entityId) {
        if (!this._hass || !entityId) return;

        const [domain] = entityId.split('.');
        if (!domain) return;

        const service = 'toggle';

        this._hass.callService(domain, service, {
            entity_id: entityId,
        });
    }

    getCardSize() {
        return 10;
    }
}

customElements.define('family-board-card', FamilyBoardCard);
