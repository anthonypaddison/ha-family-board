/* Family Board - calendar normalisation
 * Location: /config/www/family-board/family-board.calendar.js
 */

/**
 * Home Assistant Calendar REST API (GET /api/calendars/<entity>?start=...&end=...)
 * returns events with start/end as objects:
 *   { start: { dateTime } } for timed events
 *   { start: { date } } for all-day events
 *
 * This normalises into:
 *   { summary, description, location, start, end, all_day }
 * where start/end are ISO-like strings that Date() can parse.
 */
export function normaliseHaCalendarEvents(rawEvents) {
    const raw = Array.isArray(rawEvents) ? rawEvents : [];

    return raw
        .map((e) => {
            const startStr = e?.start?.dateTime || e?.start?.date || e?.start;
            const endStr = e?.end?.dateTime || e?.end?.date || e?.end || startStr;

            if (!startStr) return null;

            // HA all-day events have start.date (no start.dateTime)
            const allDay = Boolean(e?.start?.date && !e?.start?.dateTime);

            return {
                summary: e?.summary ?? e?.title ?? '—',
                description: e?.description ?? '',
                location: e?.location ?? '',
                start: startStr,
                end: endStr,
                all_day: allDay,
                _raw: e,
            };
        })
        .filter(Boolean);
}
