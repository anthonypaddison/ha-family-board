/* Family Board - Home Assistant Lit helper (no bundler)
 * SPDX-License-Identifier: MIT
 *
 * Home Assistant already ships Lit. Custom cards should not import "lit" directly
 * unless they are bundled. We access HA's LitElement/html/css via ha-panel-lovelace.
 */

export function getHaLit() {
    const LovelacePanel = customElements.get('ha-panel-lovelace');
    if (!LovelacePanel) {
        throw new Error('Family Board: ha-panel-lovelace not found. (Lovelace not ready yet)');
    }

    const LitElement = Object.getPrototypeOf(LovelacePanel);
    const html = LitElement?.prototype?.html;
    const css = LitElement?.prototype?.css;

    if (!LitElement || !html || !css) {
        throw new Error('Family Board: could not access LitElement/html/css from HA.');
    }

    return { LitElement, html, css };
}
