/* Family Board - todo service
 * SPDX-License-Identifier: MIT
 */

import { debugLog } from '../family-board.util.js';

export class TodoService {
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

    async fetchItems(hass, entityId) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');

        // HA now requires return_response for get_items actions
        const msg = {
            type: 'call_service',
            domain: 'todo',
            service: 'get_items',
            service_data: { entity_id: entityId },
            return_response: true,
        };

        const res = await hass.connection.sendMessagePromise(msg);

        // Defensive parsing across HA versions / response shapes
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

    async addItem(hass, entityId, text, options = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');
        if (!text) throw new Error('Missing todo text');

        // add_item usually does not require return_response
        const payload = { entity_id: entityId, item: text };
        if (options.dueDate) payload.due_date = options.dueDate;
        if (options.dueDateTime) payload.due_datetime = options.dueDateTime;
        if (options.dueString) payload.due_string = options.dueString;
        await hass.callService('todo', 'add_item', payload);
    }

    async updateItem(hass, entityId, item, updates = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');
        if (!item) throw new Error('Missing item');

        const ref = this.normalizeItemRef(item);
        const payload = { entity_id: entityId, item: ref };
        const rename = updates?.rename ?? updates?.name ?? updates?.summary;
        if (rename) payload.rename = rename;
        if (updates?.status) payload.status = updates.status;
        if (updates?.dueDate) payload.due_date = updates.dueDate;
        if (updates?.dueDateTime) payload.due_datetime = updates.dueDateTime;
        if (updates?.dueString) payload.due_string = updates.dueString;
        debugLog(this.debug, 'Todo update_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
            payloadKeys: Object.keys(payload),
        });
        await hass.callService('todo', 'update_item', payload);
    }

    async removeItem(hass, entityId, item) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');
        if (!item) throw new Error('Missing item');

        const ref = this.normalizeItemRef(item);
        debugLog(this.debug, 'Todo remove_item', {
            entityId,
            ref,
            keys: this._itemKeys(item),
        });
        await hass.callService('todo', 'remove_item', { entity_id: entityId, item: ref });
    }

    async setStatus(hass, entityId, item, completed) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');
        if (!item) throw new Error('Missing item');

        await this.updateItem(hass, entityId, item, {
            status: completed ? 'completed' : 'needs_action',
        });
    }

    async renameItem(hass, entityId, item, text, options = {}) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');
        if (!item) throw new Error('Missing item');
        if (!text) throw new Error('Missing text');

        await this.updateItem(hass, entityId, item, { rename: text, ...options });
    }

    async clearCompleted(hass, entityId) {
        if (!hass) throw new Error('Missing hass');
        if (!entityId) throw new Error('Missing todo entityId');

        await hass.callService('todo', 'remove_completed_items', { entity_id: entityId });
    }
}
