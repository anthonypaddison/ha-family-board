/* Family Board - utilities
 * SPDX-License-Identifier: MIT
 */

export function fireEvent(node, type, detail = {}, options = {}) {
    const event = new Event(type, {
        bubbles: options.bubbles ?? true,
        cancelable: options.cancelable ?? false,
        composed: options.composed ?? true,
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
}

export function pad2(n) {
    return String(n).padStart(2, '0');
}

export function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}

export function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

export function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function formatDayTitle(d) {
    const today = new Date();
    const dd = d.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' });
    if (isSameDay(d, today)) return `${dd} (Today)`;
    return dd;
}

export function minutesSinceMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
}

export function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

/**
 * Assign lanes for overlapping timed events in a single column.
 * Each event must have startMin/endMin.
 */
export function assignOverlapLanes(events) {
    const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    // Active events by endMin
    const active = [];
    const lanes = []; // lanes[i] = event in lane i

    function releaseEnded(currentStart) {
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].endMin <= currentStart) {
                const lane = active[i].lane;
                lanes[lane] = null;
                active.splice(i, 1);
            }
        }
    }

    for (const ev of sorted) {
        releaseEnded(ev.startMin);

        let laneIndex = lanes.findIndex((x) => x === null);
        if (laneIndex === -1) {
            laneIndex = lanes.length;
            lanes.push(null);
        }
        ev.lane = laneIndex;
        lanes[laneIndex] = ev;
        active.push(ev);

        // Lanes in use right now
        ev.lanesTotal = Math.max(ev.lanesTotal || 1, lanes.filter(Boolean).length);

        // Update lanesTotal for other active events too
        for (const a of active) {
            a.lanesTotal = Math.max(a.lanesTotal || 1, ev.lanesTotal);
        }
    }

    return sorted;
}

/**
 * Safe logger (won't spam unless debug)
 */
export function debugLog(debug, ...args) {
    if (!debug) return;
    // eslint-disable-next-line no-console
    console.log('[family-board]', ...args);
}
