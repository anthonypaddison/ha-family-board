/* Family Board - shopping list service
 * SPDX-License-Identifier: MIT
 */

import { debugLog } from '../family-board.util.js';

export class ShoppingService {
    constructor({ debug = false } = {}) {
        this.debug = debug;
    }

    async fetchItems(hass, shoppingConfig) {
        if (!hass) throw new Error('Missing hass');

        // shoppingConfig might be:
        // - { entity: "todo.shopping_list_2" } (preferred)
        // - "todo.shopping_list_2" (legacy string)
        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');

        // Newer HA requires return_response for get_items
        const msg = {
            type: 'call_service',
            domain: 'todo',
            service: 'get_items',
            service_data: { entity_id: entityId },
            return_response: true,
        };

        debugLog(this.debug, 'Shopping get_items', msg);

        const res = await hass.connection.sendMessagePromise(msg);

        const payload = res?.response ?? res;
        if (!payload) return [];

        if (Array.isArray(payload)) return payload;

        if (payload.items && Array.isArray(payload.items)) return payload.items;

        if (typeof payload === 'object') {
            const first = Object.values(payload)[0];
            if (first?.items && Array.isArray(first.items)) return first.items;
        }

        return [];
    }

    async addItem(hass, shoppingConfig, text) {
        if (!hass) throw new Error('Missing hass');
        if (!text) throw new Error('Missing shopping text');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');

        await hass.callService('todo', 'add_item', { entity_id: entityId, item: text });
    }

    async updateItem(hass, shoppingConfig, item) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');

        await hass.callService('todo', 'update_item', { entity_id: entityId, item });
    }

    async removeItem(hass, shoppingConfig, item) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');

        await hass.callService('todo', 'remove_item', { entity_id: entityId, item });
    }

    async setStatus(hass, shoppingConfig, item, completed) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');

        const next = { ...item, status: completed ? 'completed' : 'needs_action' };
        await hass.callService('todo', 'update_item', { entity_id: entityId, item: next });
    }

    async renameItem(hass, shoppingConfig, item, text) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');
        if (!text) throw new Error('Missing text');

        const next = { ...item, summary: text, name: text, item: text };
        await hass.callService('todo', 'update_item', { entity_id: entityId, item: next });
    }
}
