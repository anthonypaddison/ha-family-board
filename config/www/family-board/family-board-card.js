class FamilyBoardCard extends HTMLElement {
    setConfig(config) {
        this.config = config;
    }

    set hass(hass) {
        if (!this.content) {
            this.content = document.createElement('div');
            this.content.style.padding = '24px';
            this.content.style.fontSize = '18px';
            this.content.innerText = 'Family Board loaded (shell)';
            this.appendChild(this.content);
        }
    }

    getCardSize() {
        return 5;
    }
}

customElements.define('family-board-card', FamilyBoardCard);
