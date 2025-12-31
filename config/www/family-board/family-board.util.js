/* Family Board - utilities
 * Location: /config/www/family-board/family-board.util.js
 */

// Fire HA-style DOM event
export function fireEvent(node, type, detail = {}, options = {}) {
    const event = new Event(type, {
        bubbles: options.bubbles ?? true,
        cancelable: Boolean(options.cancelable),
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

export function minutesSinceDayStart(d) {
    return d.getHours() * 60 + d.getMinutes();
}

export function formatTimeLabel(h, m) {
    return `${pad2(h)}:${pad2(m)}`;
}

// e.g. "Wed 31 Dec"
export function formatDayTitle(d) {
    try {
        const fmt = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
        });
        return fmt.format(d);
    } catch (e) {
        // Fallback (very old browsers)
        const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        const mo = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ][d.getMonth()];
        return `${wd} ${pad2(d.getDate())} ${mo}`;
    }
}

/**
 * Turns events with { startMin, endMin } into lane-assigned events:
 * Adds { lane, lanesTotal } so the UI can position overlaps.
 */
export function assignOverlapLanes(events) {
    const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const lanes = []; // lane end minute
    const out = [];

    for (const ev of sorted) {
        let laneIndex = -1;
        for (let i = 0; i < lanes.length; i++) {
            if (ev.startMin >= lanes[i]) {
                laneIndex = i;
                break;
            }
        }
        if (laneIndex === -1) {
            lanes.push(ev.endMin);
            laneIndex = lanes.length - 1;
        } else {
            lanes[laneIndex] = ev.endMin;
        }
        out.push({ ...ev, lane: laneIndex });
    }

    const lanesTotal = Math.max(1, lanes.length);
    return out.map((e) => ({ ...e, lanesTotal }));
}
