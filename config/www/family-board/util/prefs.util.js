/* Family Board - preference storage
 * SPDX-License-Identifier: MIT
 */

const KEY_PREFIX = 'family-board:prefs';

export function getDeviceKind() {
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) return 'mobile';
    return 'desktop';
}

export function loadPrefs(userId) {
    if (!userId) return {};
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function savePrefs(userId, prefs) {
    if (!userId) return;
    const key = `${KEY_PREFIX}:${userId}:${getDeviceKind()}`;
    localStorage.setItem(key, JSON.stringify(prefs || {}));
}

export function updatePrefs(userId, patch) {
    const current = loadPrefs(userId);
    const next = { ...current, ...patch };
    savePrefs(userId, next);
    return next;
}
