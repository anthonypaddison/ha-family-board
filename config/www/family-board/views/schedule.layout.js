/* Family Board - schedule layout helpers
 * SPDX-License-Identifier: MIT
 */

function groupByOverlap(events) {
    const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const groups = [];
    let active = [];
    let groupStart = null;
    let groupEnd = null;

    for (const ev of sorted) {
        if (active.length === 0) {
            active = [ev];
            groupStart = ev.startMin;
            groupEnd = ev.endMin;
            continue;
        }

        if (ev.startMin >= groupEnd) {
            groups.push({ events: active, startMin: groupStart, endMin: groupEnd });
            active = [ev];
            groupStart = ev.startMin;
            groupEnd = ev.endMin;
            continue;
        }

        active.push(ev);
        groupEnd = Math.max(groupEnd, ev.endMin);
    }

    if (active.length) groups.push({ events: active, startMin: groupStart, endMin: groupEnd });
    return groups;
}

function assignLanes(events) {
    const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const active = [];
    const lanes = [];

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
        ev.lanesTotal = Math.max(ev.lanesTotal || 1, lanes.filter(Boolean).length);
        for (const a of active) {
            a.lanesTotal = Math.max(a.lanesTotal || 1, ev.lanesTotal);
        }
    }

    return sorted;
}

export function layoutDayEvents(events, { maxColumns = 3 } = {}) {
    const groups = groupByOverlap(events);
    const items = [];
    const overflows = [];

    for (const group of groups) {
        const laidOut = assignLanes(group.events);
        const total = Math.max(...laidOut.map((e) => e.lanesTotal || 1), 1);
        const overflowCount = total > maxColumns ? total - maxColumns : 0;
        const visible = laidOut.filter((e) => e.lane < maxColumns);

        items.push(...visible.map((e) => ({ ...e, lanesTotal: Math.min(total, maxColumns) })));

        if (overflowCount > 0) {
            overflows.push({ startMin: group.startMin, count: overflowCount });
        }
    }

    return { items, overflows };
}
