/* Family Board - shopping list service
 * SPDX-License-Identifier: MIT
 */

import { debugLog } from '../family-board.util.js';

export class ShoppingService {
    constructor({ debug = false } = {}) {
        this.debug = debug;
    }

    normalizeItemRef(item) {
        if (typeof item === 'string') return item;
        if (typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (item && typeof item === 'object') {
            const ref = item.id || item.uid || item.item || item.summary || item.name;
            if (ref) return String(ref);
        }
        return String(item ?? '');
    }

    _itemKeys(item) {
        if (!item || typeof item !== 'object') return [];
        return Object.keys(item);
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

    async updateItem(hass, shoppingConfig, item, updates = {}) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');

        const ref = this.normalizeItemRef(item);
        const payload = { entity_id: entityId, item: ref };
        const rename = updates?.rename ?? updates?.name ?? updates?.summary;
        if (rename) payload.rename = rename;
        if (updates?.status) payload.status = updates.status;
        debugLog(this.debug, 'Shopping update_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
            payloadKeys: Object.keys(payload),
        });
        await hass.callService('todo', 'update_item', payload);
    }

    async removeItem(hass, shoppingConfig, item) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');

        const ref = this.normalizeItemRef(item);
        debugLog(this.debug, 'Shopping remove_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
        });
        await hass.callService('todo', 'remove_item', { entity_id: entityId, item: ref });
    }

    async setStatus(hass, shoppingConfig, item, completed) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');

        await this.updateItem(hass, shoppingConfig, item, {
            status: completed ? 'completed' : 'needs_action',
        });
    }

    async renameItem(hass, shoppingConfig, item, text) {
        if (!hass) throw new Error('Missing hass');

        const entityId =
            (typeof shoppingConfig === 'object' && shoppingConfig?.entity) ||
            (typeof shoppingConfig === 'string' ? shoppingConfig : null);

        if (!entityId) throw new Error('Missing shopping entityId');
        if (!item) throw new Error('Missing item');
        if (!text) throw new Error('Missing text');

        await this.updateItem(hass, shoppingConfig, item, { rename: text });
    }
}
