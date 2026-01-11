/* Family Board - main view (schedule/month)
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from '../ha-lit.js';
const { html } = getHaLit();

import './schedule.view.js';
import './month.view.js';

export function renderMainView(card) {
    const mode = card._mainMode || 'schedule';
    if (card._debug && card._lastMainMode !== mode) {
        card._lastMainMode = mode;
    }

    // This key MUST change when:
    // - mode changes
    // - date offset changes
    // - visible calendars change
    // - events data changes (async fetch completes)
    const renderKey = [
        mode,
        String(card._dayOffset ?? 0),
        String(card._monthOffset ?? 0),
        String(card._scheduleDays ?? 5),
        String(card._calendarVisibleSet?.size ?? 0),
        String(card._eventsVersion ?? 0), // <-- critical
    ].join('|');

    if (mode === 'month')
        return html`<fb-month-view .card=${card} .renderKey=${renderKey}></fb-month-view>`;
    return html`<fb-schedule-view .card=${card} .renderKey=${renderKey}></fb-schedule-view>`;
}
