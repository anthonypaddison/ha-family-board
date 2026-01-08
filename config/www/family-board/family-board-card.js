/* Family Board - custom card
 * SPDX-License-Identifier: MIT
 */
import { getHaLit } from './ha-lit.js';
const { LitElement, html, css } = getHaLit();

import { fbStyles } from './family-board.styles.js';
import {
    fireEvent,
    debugLog,
    startOfDay,
    endOfDay,
    addDays,
    formatDayTitle,
} from './family-board.util.js';
import { NEUTRAL_COLOUR, getPersonColour } from './util/colour.util.js';
import { loadPrefs, updatePrefs, getDeviceKind } from './util/prefs.util.js';

import { CalendarService, CALENDAR_FEATURES } from './services/calendar.service.js';
import { TodoService } from './services/todo.service.js';
import { ShoppingService } from './services/shopping.service.js';

import './components/fb-sidebar.js';
import './components/fb-topbar.js';
import './components/fb-fab.js';
import './components/fb-dialogs.js';
import './components/fb-manage-sources.js';
import './components/fb-event-dialog.js';
import './ui/help.dialog.js';
import './ui/editor-guide.dialog.js';
import './views/home.view.js';
import './views/chores.view.js';
import './views/shopping.view.js';
import './views/settings.view.js';
import './views/setup.view.js';
import { renderMainView } from './views/main.view.js';

class FamilyBoardCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
        _screen: { state: true },
        _mainMode: { state: true },
        _dayOffset: { state: true },
        _monthOffset: { state: true },
        _eventsVersion: { state: true },
        _dialogOpen: { state: true },
        _dialogMode: { state: true },
        _dialogTitle: { state: true },
        _dialogItem: { state: true },
        _dialogEntity: { state: true },
        _sourcesOpen: { state: true },
        _eventDialogOpen: { state: true },
        _eventDialogEntity: { state: true },
        _eventDialogEvent: { state: true },
        _helpOpen: { state: true },
        _editorGuideOpen: { state: true },
        _sidebarCollapsed: { state: true },
    };

    static async getConfigElement() {
        await import('./editors/family-board-editor.js');
        return document.createElement('family-board-editor');
    }

    static getStubConfig() {
        return {
            type: 'custom:family-board',
            title: 'Family Board',
            days_to_show: 5,
            day_start_hour: 6,
            day_end_hour: 22,
            slot_minutes: 30,
            px_per_hour: 120,
            refresh_interval_ms: 300000,
            shopping: { entity: 'todo.shopping_list_2', name: 'Shopping' },
        };
    }

    static styles = [
        fbStyles(),
        css`
            :host {
                display: block;
                height: 100%;
                width: 100%;
            }
            .app {
                height: 100%;
                width: 100%;
                display: grid;
                grid-template-columns: 260px 1fr;
                background: var(--fb-bg);
                color: var(--fb-text);
            }
            .sidebar {
                background: var(--fb-surface);
                padding: 12px 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .main {
                display: grid;
                grid-template-rows: auto 1fr;
                min-width: 0;
                min-height: 0;
                background: var(--fb-bg);
            }
            .content {
                position: relative;
                min-width: 0;
                min-height: 0;
                overflow: hidden;
                background: var(--fb-bg);
            }
            @media (max-width: 900px) {
                .app {
                    grid-template-columns: 1fr;
                }
                .sidebar {
                    display: none;
                }
            }
        `,
    ];

    constructor() {
        super();
        this._screen = 'schedule';
        this._mainMode = 'schedule';
        this._dayOffset = 0;
        this._monthOffset = 0;
        this._eventsVersion = 0;
        this._calendarVisibleSet = new Set();
        this._todoVisibleSet = new Set();
        this._personFilterSet = new Set();
        this._eventsByEntity = {};
        this._todoItems = {};
        this._shoppingItems = [];
        this._dialogOpen = false;
        this._dialogMode = '';
        this._dialogTitle = '';
        this._dialogItem = null;
        this._dialogEntity = '';
        this._sourcesOpen = false;
        this._eventDialogOpen = false;
        this._eventDialogEntity = '';
        this._eventDialogEvent = null;
        this._helpOpen = false;
        this._editorGuideOpen = false;
        this._refreshIntervalMs = 300_000;
        this._prefsLoaded = false;
        this._useMobileView = false;
        this._scheduleDays = 5;
        this._shoppingCommon = [];
        this._shoppingFavourites = [];
    }

    setConfig(config) {
        if (!config) throw new Error('Family Board: missing config');
        this._config = config;
        this._debug = Boolean(config.debug);

        debugLog(this._debug, 'setConfig', config);

        this._dayStartHour = config.day_start_hour ?? 6;
        this._dayEndHour = config.day_end_hour ?? 22;
        this._slotMinutes = config.slot_minutes ?? 30;
        this._pxPerHour = config.px_per_hour ?? 120;
        this._daysToShow = 5;
        this._scheduleDays = 5;
        this._refreshIntervalMs = config.refresh_interval_ms ?? 300_000;

        this._ensureVisibilitySets();
        this._buildPeopleMap();
        this._ensureServices();
        this._resetRefreshTimer();
        this._queueRefresh();
    }

    getCardSize() {
        return 6;
    }

    connectedCallback() {
        super.connectedCallback();
        debugLog(this._debug, 'connectedCallback');
        this._resetRefreshTimer();
        this._queueRefresh();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    _resetRefreshTimer() {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        this._refreshTimer = setInterval(() => this._queueRefresh(), this._refreshIntervalMs);
    }

    set hass(hass) {
        this._hass = hass;
        this._loadPrefs();
        this._queueRefresh();
    }

    get hass() {
        return this._hass;
    }

    _loadPrefs() {
        if (this._prefsLoaded) return;
        const userId = this._hass?.user?.id;
        if (!userId) return;
        const prefs = loadPrefs(userId);
        const filters = Array.isArray(prefs.personFilters) ? prefs.personFilters : [];
        this._personFilterSet = new Set(filters.map((id) => this._normalisePersonId(id)));
        this._useMobileView =
            prefs.useMobileView !== undefined ? prefs.useMobileView : getDeviceKind() === 'mobile';
        this._sidebarCollapsed = Boolean(prefs.sidebarCollapsed);
        if (prefs.slotMinutes === 30 || prefs.slotMinutes === 60) {
            this._slotMinutes = prefs.slotMinutes;
        }
        this._shoppingCommon = Array.isArray(prefs.shoppingCommon) ? prefs.shoppingCommon : [];
        this._shoppingFavourites = Array.isArray(prefs.shoppingFavourites)
            ? prefs.shoppingFavourites
            : [];
        this._prefsLoaded = true;
    }

    render() {
        if (!this._config) return html``;

        const screen = this._screen || 'schedule';
        const mainMode = this._mainMode || 'schedule';
        const isAdmin = Boolean(this._hass?.user?.is_admin);
        const needsSetup = !Array.isArray(this._config?.people) || this._config.people.length === 0;

        const sidebarWidth = this._sidebarCollapsed ? '76px' : '260px';

        return html`
            <div class="app" style="grid-template-columns:${sidebarWidth} 1fr;">
                <div class="sidebar">
                    <fb-sidebar
                        .active=${screen}
                        .counts=${this._sidebarCounts()}
                        .isAdmin=${isAdmin}
                        .collapsed=${this._sidebarCollapsed}
                        @fb-nav=${this._onNav}
                        @fb-sidebar-toggle=${this._toggleSidebarCollapsed}
                    ></fb-sidebar>
                </div>

                <div class="main">
                    <div class="topbar">
                        <fb-topbar
                            .title=${this._config.title || 'Family Board'}
                            .screen=${screen}
                            .mainMode=${mainMode}
                            .summary=${this._summaryCounts()}
                            .dateLabel=${this._dateLabel()}
                            .dateValue=${this._selectedDayValue()}
                            .activeFilters=${Array.from(this._personFilterSet || [])}
                            .isAdmin=${isAdmin}
                            @fb-main-mode=${this._onMainMode}
                            @fb-date-nav=${this._onDateNav}
                            @fb-date-today=${this._onToday}
                            @fb-date-set=${this._onDateSet}
                            @fb-person-toggle=${this._onPersonToggle}
                            @fb-open-sources=${() => this._openManageSources()}
                        ></fb-topbar>
                    </div>

                    <div class="content">
                        ${needsSetup
                            ? html`<fb-setup-view .card=${this}></fb-setup-view>`
                            : screen === 'schedule'
                            ? renderMainView(this)
                            : screen === 'chores'
                            ? html`<fb-chores-view .card=${this}></fb-chores-view>`
                            : screen === 'shopping'
                            ? html`<fb-shopping-view .card=${this}></fb-shopping-view>`
                            : screen === 'settings'
                            ? isAdmin
                                ? html`<fb-settings-view .card=${this}></fb-settings-view>`
                                : html`<div style="padding:16px;color:var(--fb-muted)">
                                      Ask an admin to view settings.
                                  </div>`
                            : html`<fb-home-view .card=${this}></fb-home-view>`}

                        <fb-fab
                            .hidden=${screen === 'home' || screen === 'settings'}
                            .label=${this._fabLabel()}
                            @fb-fab=${this._onFab}
                        ></fb-fab>

                        <fb-dialogs
                            .card=${this}
                            .open=${this._dialogOpen}
                            .mode=${this._dialogMode}
                            .title=${this._dialogTitle}
                            .entityId=${this._dialogEntity}
                            .item=${this._dialogItem}
                            .calendars=${this._config?.calendars || []}
                            .todos=${this._config?.todos || []}
                            .shopping=${this._config?.shopping || {}}
                            @fb-add-calendar=${this._onAddCalendar}
                            @fb-add-todo=${this._onAddTodo}
                            @fb-add-shopping=${this._onAddShopping}
                            @fb-edit-todo=${this._onEditTodo}
                            @fb-edit-shopping=${this._onEditShopping}
                        ></fb-dialogs>

                        <fb-manage-sources
                            .open=${this._sourcesOpen}
                            .config=${this._config}
                            @fb-sources-save=${this._onSourcesSave}
                            @fb-sources-close=${() => (this._sourcesOpen = false)}
                            @fb-open-editor=${this._openEditor}
                        ></fb-manage-sources>

                        <fb-event-dialog
                            .open=${this._eventDialogOpen}
                            .event=${this._eventDialogEvent}
                            .entityId=${this._eventDialogEntity}
                            .supportsUpdate=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.UPDATE
                            )}
                            .supportsDelete=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.DELETE
                            )}
                            .supportsCreate=${this._calendarSupports(
                                this._eventDialogEntity,
                                CALENDAR_FEATURES.CREATE
                            )}
                            @fb-event-close=${this._onEventDialogClose}
                            @fb-event-update=${this._onEventUpdate}
                            @fb-event-delete=${this._onEventDelete}
                        ></fb-event-dialog>

                        <fb-help-dialog
                            .open=${this._helpOpen}
                            @fb-help-close=${() => (this._helpOpen = false)}
                        ></fb-help-dialog>
                        <fb-editor-guide-dialog
                            .open=${this._editorGuideOpen}
                            @fb-editor-guide-close=${() => (this._editorGuideOpen = false)}
                            @fb-editor-guide-open=${this._onOpenEditor}
                        ></fb-editor-guide-dialog>
                    </div>
                </div>
            </div>
        `;
    }

    _ensureServices() {
        if (!this._calendarService) this._calendarService = new CalendarService();
        if (!this._todoService) this._todoService = new TodoService();
        if (!this._shoppingService) this._shoppingService = new ShoppingService();

        this._calendarService.debug = this._debug;
        this._todoService.debug = this._debug;
        this._shoppingService.debug = this._debug;
    }

    _ensureVisibilitySets() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];

        const calendarIds = calendars.map((c) => c.entity);
        const todoIds = todos.map((t) => t.entity);

        if (!this._calendarVisibleSet || this._calendarVisibleSet.size === 0) {
            this._calendarVisibleSet = new Set(calendarIds);
        } else {
            this._calendarVisibleSet = new Set(
                calendarIds.filter((id) => this._calendarVisibleSet.has(id))
            );
        }

        if (!this._todoVisibleSet || this._todoVisibleSet.size === 0) {
            this._todoVisibleSet = new Set(todoIds);
        } else {
            this._todoVisibleSet = new Set(todoIds.filter((id) => this._todoVisibleSet.has(id)));
        }
    }

    _buildPeopleMap() {
        const people = Array.isArray(this._config?.people) ? this._config.people : [];
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];

        this._peopleById = new Map();
        for (const p of people) {
            if (!p?.id) continue;
            this._peopleById.set(p.id, {
                id: p.id,
                name: p.name || p.id,
                color: p.color || NEUTRAL_COLOUR,
                header_row: p.header_row || 1,
            });
        }

        this._personByEntity = new Map();
        for (const c of calendars) {
            const personId = c.person_id || c.personId || c.person || null;
            const personName = c.person_name || c.personName || c.name || c.entity;
            const mapped = personId ? this._peopleById.get(personId) : null;
            const color = getPersonColour(mapped) || c.color || NEUTRAL_COLOUR;
            const name = mapped?.name || personName || c.entity;
            this._personByEntity.set(c.entity, {
                id: personId || c.entity,
                name,
                color,
                header_row: mapped?.header_row || 1,
            });
        }
    }

    _queueRefresh() {
        if (this._refreshQueued) return;
        this._refreshQueued = true;
        Promise.resolve().then(() => {
            this._refreshQueued = false;
            this._refreshAll();
        });
    }

    async _refreshAll() {
        if (!this._hass || !this._config) return;
        await Promise.all([this._refreshCalendarRange(), this._refreshTodos(), this._refreshShopping()]);
    }

    async _refreshCalendarRange() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        if (!calendars.length) return;

        const { start, end } = this._currentCalendarRange();
        const rangeKey = `${start.toISOString()}|${end.toISOString()}`;

        debugLog(this._debug, 'Calendar range', rangeKey);

        try {
            const results = await Promise.all(
                calendars.map(async (c) => {
                    const items = await this._calendarService.fetchEvents(
                        this._hass,
                        c.entity,
                        start,
                        end
                    );
                    return [c.entity, items];
                })
            );

            const next = {};
            for (const [entityId, items] of results) next[entityId] = items;
            this._eventsByEntity = next;
            this._eventsVersion += 1;
        } catch (err) {
            debugLog(this._debug, 'Calendar fetch error', err);
        }
    }

    async _refreshTodos() {
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        if (!todos.length) return;
        try {
            const results = await Promise.all(
                todos.map(async (t) => {
                    const items = await this._todoService.fetchItems(this._hass, t.entity);
                    return [t.entity, items];
                })
            );
            const next = {};
            for (const [entityId, items] of results) next[entityId] = items;
            this._todoItems = next;
        } catch (err) {
            debugLog(this._debug, 'Todo fetch error', err);
        }
    }

    async _refreshShopping() {
        const shopping = this._config?.shopping;
        if (!shopping) return;
        try {
            this._shoppingItems = await this._shoppingService.fetchItems(this._hass, shopping);
        } catch (err) {
            debugLog(this._debug, 'Shopping fetch error', err);
        }
    }

    _currentCalendarRange() {
        const today = startOfDay(new Date());
        const screen = this._screen || 'schedule';
        const mainMode = this._mainMode || 'schedule';

        if (screen !== 'schedule') {
            const day = addDays(today, this._dayOffset || 0);
            return { start: startOfDay(day), end: endOfDay(day) };
        }

        if (mainMode === 'month') {
            const base = this._selectedMonthDay();
            const start = new Date(base.getFullYear(), base.getMonth(), 1);
            const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
            return { start: startOfDay(start), end: endOfDay(end) };
        }

        if (mainMode === 'schedule') {
            const base = startOfDay(this._selectedDay());
            const end = addDays(base, (this._scheduleDays || 5) - 1);
            return { start: startOfDay(base), end: endOfDay(end) };
        }

        const day = this._selectedDay();
        return { start: startOfDay(day), end: endOfDay(day) };
    }

    _selectedDay() {
        const today = startOfDay(new Date());
        return addDays(today, this._dayOffset || 0);
    }

    _selectedMonthDay() {
        const base = startOfDay(new Date());
        const d = new Date(base.getFullYear(), base.getMonth() + (this._monthOffset || 0), 1);
        return d;
    }

    _eventsForEntityOnDay(entityId, day) {
        const items = this._eventsByEntity?.[entityId] || [];
        const dayStart = startOfDay(day).getTime();
        const dayEnd = endOfDay(day).getTime();

        return items.filter((e) => {
            if (!e?._start || !e?._end) return false;
            const start = e._start.getTime();
            const end = e._end.getTime();
            return start <= dayEnd && end >= dayStart;
        });
    }

    _personForEntity(entityId) {
        return this._personByEntity?.get(entityId) || null;
    }

    _isPersonAllowed(personId) {
        if (!this._personFilterSet || this._personFilterSet.size === 0) return true;
        const key = this._normalisePersonId(personId);
        if (!key) return true;
        return this._personFilterSet.has(key);
    }

    _neutralColor() {
        return NEUTRAL_COLOUR;
    }

    _sidebarCounts() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        const shoppingItems = this._shoppingItems || [];

        const { start, end } = this._todayRange();
        const totalEvents = calendars.reduce((sum, c) => {
            const items = this._eventsByEntity?.[c.entity] || [];
            const count = items.filter((e) => {
                if (!e?._start || !e?._end) return false;
                return e._start <= end && e._end >= start;
            }).length;
            return sum + count;
        }, 0);

        const totalTodos = todos.reduce(
            (sum, t) => sum + this._incompleteTodoCount(this._todoItems?.[t.entity] || []),
            0
        );

        const shopping = this._incompleteTodoCount(shoppingItems);

        return {
            schedule: totalEvents ? String(totalEvents) : null,
            chores: totalTodos ? String(totalTodos) : null,
            shopping: shopping ? String(shopping) : null,
        };
    }

    _summaryCounts() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        const day = startOfDay(new Date());

        const todoMap = new Map();
        for (const t of todos) {
            const items = this._todoItems?.[t.entity] || [];
            todoMap.set(t.entity, this._dueTodayOrNoDueCount(items));
        }

        const people = this._peopleById?.size
            ? Array.from(this._peopleById.values())
            : calendars.map((c) => this._personForEntity(c.entity));

        const summaryById = new Map();
        for (const person of people) {
            if (!person) continue;
            summaryById.set(person.id, {
                id: person.id,
                name: person.name || person.id,
                color: getPersonColour(person),
                header_row: person.header_row || 1,
                eventsLeft: 0,
                todosLeft: 0,
            });
        }

        for (const c of calendars) {
            const person = this._personForEntity(c.entity);
            if (!person) continue;
            const summary = summaryById.get(person.id);
            if (!summary) continue;
            summary.eventsLeft += this._eventsForEntityOnDay(c.entity, day).length;
        }

        for (const t of todos) {
            const personId = t.person_id || t.personId || t.person || t.entity;
            const summary = summaryById.get(personId);
            if (!summary) continue;
            summary.todosLeft += todoMap.get(t.entity) ?? 0;
        }

        return Array.from(summaryById.values());
    }

    _dateLabel() {
        const mainMode = this._mainMode || 'schedule';
        if (mainMode === 'month') {
            const d = this._selectedMonthDay();
            return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }
        if (mainMode === 'schedule') {
            const start = startOfDay(this._selectedDay());
            const end = addDays(start, (this._scheduleDays || 5) - 1);
            const startLabel = formatDayTitle(start);
            const endLabel = formatDayTitle(end);
            return `${startLabel} - ${endLabel}`;
        }
        return formatDayTitle(this._selectedDay());
    }

    _selectedDayValue() {
        const d = this._selectedDay();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
        ).padStart(2, '0')}`;
    }

    _fabLabel() {
        const screen = this._screen || 'schedule';
        if (screen === 'chores') return 'Add chore';
        if (screen === 'shopping') return 'Add shopping item';
        if (screen === 'home' || screen === 'settings') return '';
        return 'Add event';
    }

    _toggleCalendarVisible(entityId) {
        if (!this._calendarVisibleSet) this._calendarVisibleSet = new Set();
        if (this._calendarVisibleSet.has(entityId)) this._calendarVisibleSet.delete(entityId);
        else this._calendarVisibleSet.add(entityId);
        this.requestUpdate();
    }

    _toggleTodoVisible(entityId) {
        if (!this._todoVisibleSet) this._todoVisibleSet = new Set();
        if (this._todoVisibleSet.has(entityId)) this._todoVisibleSet.delete(entityId);
        else this._todoVisibleSet.add(entityId);
        this.requestUpdate();
    }

    _openMoreInfo(entityId) {
        if (!entityId) return;
        fireEvent(this, 'hass-more-info', { entityId });
    }

    _calendarSupports(entityId, feature) {
        if (!entityId || !this._hass) return false;
        const st = this._hass.states?.[entityId];
        const supported = st?.attributes?.supported_features ?? 0;
        return (supported & feature) !== 0;
    }

    _supportsService(domain, service) {
        return Boolean(this._hass?.services?.[domain]?.[service]);
    }

    _setMonthOffset(delta) {
        this._monthOffset = (this._monthOffset || 0) + delta;
        this._queueRefresh();
    }

    _onNav = (ev) => {
        const target = ev?.detail?.target;
        if (!target) return;
        this._screen = target;
        this._queueRefresh();
    };

    _onMainMode = (ev) => {
        const mode = ev?.detail?.mode || 'schedule';
        this._mainMode = mode;
        if (mode !== 'month') this._monthOffset = 0;
        this._queueRefresh();
    };

    _onDateNav = (ev) => {
        const delta = Number(ev?.detail?.delta || 0);
        if (!delta) return;

        if (this._mainMode === 'month') {
            this._setMonthOffset(delta);
            return;
        }

        const step = this._mainMode === 'schedule' ? 1 : 1;
        this._dayOffset = (this._dayOffset || 0) + delta * step;
        this._queueRefresh();
    };

    _onToday = () => {
        this._dayOffset = 0;
        this._monthOffset = 0;
        this._queueRefresh();
    };

    _onDateSet = (ev) => {
        const value = ev?.detail?.value;
        if (!value) return;
        const target = new Date(`${value}T00:00:00`);
        this._setScheduleStart(target);
    };

    _onFab = () => {
        const screen = this._screen || 'schedule';
        if (screen === 'home' || screen === 'settings') return;
        this._dialogOpen = true;
        if (screen === 'chores') {
            this._dialogMode = 'todo';
            this._dialogTitle = 'Add chore';
            this._dialogItem = null;
            this._dialogEntity = '';
        } else if (screen === 'shopping') {
            this._dialogMode = 'shopping';
            this._dialogTitle = 'Add shopping item';
            this._dialogItem = null;
            this._dialogEntity = '';
        } else {
            this._dialogMode = 'calendar';
            this._dialogTitle = 'Add event';
            this._dialogItem = null;
            this._dialogEntity = '';
        }
    };

    _openTodoAddForEntity(entityId) {
        if (!entityId) return;
        this._dialogOpen = true;
        this._dialogMode = 'todo';
        this._dialogTitle = 'Add chore';
        this._dialogItem = null;
        this._dialogEntity = entityId;
    }

    _onAddCalendar = async (ev) => {
        const { entityId, summary, start, end } = ev?.detail || {};
        if (!entityId || !summary || !start || !end) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.CREATE)) return;
        await this._calendarService.createEvent(this._hass, entityId, { summary, start, end });
        this._queueRefresh();
    };

    _onAddTodo = async (ev) => {
        const { entityId, text } = ev?.detail || {};
        if (!entityId || !text) return;
        await this._todoService.addItem(this._hass, entityId, text);
        this._queueRefresh();
    };

    _onAddShopping = async (ev) => {
        const { text } = ev?.detail || {};
        if (!text) return;
        await this._shoppingService.addItem(this._hass, this._config?.shopping, text);
        this._trackShoppingCommon(text);
        this._queueRefresh();
    };

    _onEditTodo = async (ev) => {
        const { entityId, item, text } = ev?.detail || {};
        if (!entityId || !item || !text) return;
        await this._todoService.renameItem(this._hass, entityId, item, text);
        this._queueRefresh();
    };

    _onEditShopping = async (ev) => {
        const { item, text } = ev?.detail || {};
        if (!item || !text) return;
        await this._shoppingService.renameItem(this._hass, this._config?.shopping, item, text);
        this._trackShoppingCommon(text);
        this._queueRefresh();
    };

    _openManageSources() {
        if (!this._hass?.user?.is_admin) return;
        this._sourcesOpen = true;
    }

    _onSourcesSave = (ev) => {
        const next = ev?.detail?.config;
        if (!next) return;
        this.setConfig({ ...this._config, ...next });
        this._queueRefresh();
    };

    _updateConfigPartial(patch) {
        if (!patch) return;
        this.setConfig({ ...this._config, ...patch });
        this._queueRefresh();
    }

    _onOpenEditor = () => {
        if (!this._hass?.user?.is_admin) return;
        fireEvent(this, 'll-edit-card', { card: this });
    };

    async _toggleTodoItem(entityId, item, completed) {
        if (!entityId || !item) return;
        await this._todoService.setStatus(this._hass, entityId, item, completed);
        this._queueRefresh();
    }

    async _editTodoItem(entityId, item) {
        if (!entityId || !item) return;
        this._dialogOpen = true;
        this._dialogMode = 'todo-edit';
        this._dialogTitle = 'Edit chore';
        this._dialogItem = item;
        this._dialogEntity = entityId;
    }

    async _deleteTodoItem(entityId, item) {
        if (!entityId || !item) return;
        await this._todoService.removeItem(this._hass, entityId, item);
        this._queueRefresh();
    }

    async _clearCompletedTodos(entityId) {
        if (!entityId) return;
        await this._todoService.clearCompleted(this._hass, entityId);
        this._queueRefresh();
    }

    async _addShoppingItem(text) {
        if (!text) return;
        await this._shoppingService.addItem(this._hass, this._config?.shopping, text);
        this._trackShoppingCommon(text);
        this._queueRefresh();
    }

    async _toggleShoppingItem(item, completed) {
        if (!item) return;
        await this._shoppingService.setStatus(this._hass, this._config?.shopping, item, completed);
        this._queueRefresh();
    }

    async _editShoppingItem(item) {
        if (!item) return;
        this._dialogOpen = true;
        this._dialogMode = 'shopping-edit';
        this._dialogTitle = 'Edit item';
        this._dialogItem = item;
        this._dialogEntity = this._config?.shopping?.entity || '';
    }

    async _deleteShoppingItem(item) {
        if (!item) return;
        await this._shoppingService.removeItem(this._hass, this._config?.shopping, item);
        this._queueRefresh();
    }

    _setScheduleStart(date) {
        if (!date) return;
        const today = startOfDay(new Date());
        const target = startOfDay(date);
        const diffDays = Math.round((target - today) / (24 * 60 * 60 * 1000));
        this._dayOffset = diffDays;
        this._mainMode = 'schedule';
        this._screen = 'schedule';
        this._queueRefresh();
    }

    _onPersonToggle = (ev) => {
        const personId = this._normalisePersonId(ev?.detail?.id);
        if (!personId) return;
        if (this._personFilterSet.has(personId)) this._personFilterSet.delete(personId);
        else this._personFilterSet.add(personId);
        this._savePrefs();
        this._queueRefresh();
    };

    _normalisePersonId(personId) {
        if (personId === null || personId === undefined) return '';
        return String(personId).trim().toLowerCase();
    }

    _savePrefs() {
        const userId = this._hass?.user?.id;
        if (!userId) return;
        updatePrefs(userId, {
            personFilters: Array.from(this._personFilterSet || []),
            useMobileView: Boolean(this._useMobileView),
            sidebarCollapsed: Boolean(this._sidebarCollapsed),
            slotMinutes: this._slotMinutes,
            shoppingCommon: this._shoppingCommon,
            shoppingFavourites: this._shoppingFavourites,
        });
    }

    _setMobileView(enabled) {
        this._useMobileView = Boolean(enabled);
        this._savePrefs();
        this._queueRefresh();
    }

    _setSlotMinutesPref(minutes) {
        const value = Number(minutes);
        if (![30, 60].includes(value)) return;
        this._slotMinutes = value;
        this._savePrefs();
        this._queueRefresh();
    }

    _toggleShoppingFavourite(name) {
        const text = String(name || '').trim();
        if (!text) return;
        const key = text.toLowerCase();
        const list = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
        const exists = list.some((item) => String(item).toLowerCase() === key);
        this._shoppingFavourites = exists
            ? list.filter((item) => String(item).toLowerCase() !== key)
            : [text, ...list];
        if (!exists) this._trackShoppingCommon(text);
        this._savePrefs();
        this.requestUpdate();
    }

    _trackShoppingCommon(text) {
        const name = String(text || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        const list = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
        if (list.some((item) => String(item).toLowerCase() === key)) return;
        this._shoppingCommon = [name, ...list].slice(0, 50);
        this._savePrefs();
    }

    _toggleSidebarCollapsed() {
        this._sidebarCollapsed = !this._sidebarCollapsed;
        this._savePrefs();
        this.requestUpdate();
    }

    _todayRange() {
        const today = startOfDay(new Date());
        return { start: startOfDay(today), end: endOfDay(today) };
    }

    _openEventDialog(entityId, event) {
        if (!entityId || !event) return;
        this._eventDialogEntity = entityId;
        this._eventDialogEvent = event;
        this._eventDialogOpen = true;
    }

    _onEventDialogClose = () => {
        this._eventDialogOpen = false;
        this._eventDialogEntity = '';
        this._eventDialogEvent = null;
    };

    _onEventUpdate = async (ev) => {
        const { entityId, event, summary, start, end, allDay } = ev?.detail || {};
        if (!entityId || !event) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.UPDATE)) return;
        await this._calendarService.updateEvent(this._hass, entityId, event, {
            summary,
            start,
            end,
            allDay,
        });
        this._queueRefresh();
    };

    _onEventDelete = async (ev) => {
        const { entityId, event } = ev?.detail || {};
        if (!entityId || !event) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.DELETE)) return;
        await this._calendarService.deleteEvent(this._hass, entityId, event);
        this._queueRefresh();
    };

    _incompleteTodoCount(items) {
        return items.filter(
            (it) => !['completed', 'done'].includes(String(it.status || '').toLowerCase())
        ).length;
    }

    _dueTodayOrNoDueCount(items) {
        const today = startOfDay(new Date());
        const todayMs = today.getTime();
        const tomorrowMs = addDays(today, 1).getTime();

        return items.filter((it) => {
            const status = String(it.status || '').toLowerCase();
            if (status === 'completed' || status === 'done') return false;
            const due = it.due || it.due_date || it.due_datetime;
            if (!due) return true;
            const dueDate = due.date || due.dateTime || due;
            const parsed = new Date(dueDate);
            if (Number.isNaN(parsed.getTime())) return true;
            return parsed.getTime() >= todayMs && parsed.getTime() < tomorrowMs;
        }).length;
    }

    _buildYamlConfig(cfg) {
        const draft = cfg || {};
        const lines = [];
        const push = (l) => lines.push(l);
        push(`type: custom:family-board`);
        if (draft.title) push(`title: ${draft.title}`);
        if (draft.debug !== undefined) push(`debug: ${draft.debug ? 'true' : 'false'}`);
        push(`days_to_show: 5`);
        if (draft.day_start_hour !== undefined) push(`day_start_hour: ${draft.day_start_hour}`);
        if (draft.day_end_hour !== undefined) push(`day_end_hour: ${draft.day_end_hour}`);
        if (draft.slot_minutes !== undefined) push(`slot_minutes: ${draft.slot_minutes}`);
        if (draft.px_per_hour !== undefined) push(`px_per_hour: ${draft.px_per_hour}`);
        if (draft.refresh_interval_ms !== undefined)
            push(`refresh_interval_ms: ${draft.refresh_interval_ms}`);

        const people = Array.isArray(draft.people) ? draft.people : [];
        if (people.length) {
            push(`people:`);
            for (const p of people) {
                push(`  - id: ${p.id}`);
                if (p.name) push(`    name: ${p.name}`);
                if (p.color) push(`    color: '${p.color}'`);
                if (p.header_row) push(`    header_row: ${p.header_row}`);
            }
        }

        const calendars = Array.isArray(draft.calendars) ? draft.calendars : [];
        if (calendars.length) {
            push(`calendars:`);
            for (const c of calendars) {
                push(`  - entity: ${c.entity}`);
                if (c.person_id) push(`    person_id: ${c.person_id}`);
                if (c.role) push(`    role: ${c.role}`);
            }
        }

        const todos = Array.isArray(draft.todos) ? draft.todos : [];
        if (todos.length) {
            push(`todos:`);
            for (const t of todos) {
                push(`  - entity: ${t.entity}`);
                if (t.name) push(`    name: ${t.name}`);
                if (t.person_id) push(`    person_id: ${t.person_id}`);
            }
        }

        const shopping = draft.shopping?.entity ? draft.shopping : null;
        if (shopping) {
            push(`shopping:`);
            push(`  entity: ${shopping.entity}`);
            if (shopping.name) push(`  name: ${shopping.name}`);
        }

        return lines.join('\n');
    }

    _applySetupDraft(draft) {
        this.setConfig({ ...this._config, ...draft });
        this._queueRefresh();
    }

    _openEditor() {
        this._editorGuideOpen = true;
        this.requestUpdate();
    }

    _openHelp() {
        this._helpOpen = true;
        this.requestUpdate();
    }

    _setHomeEntityState(entityId, on) {
        if (!entityId || !this._hass) return;
        const domain = entityId.split('.')[0];
        const service = on ? 'turn_on' : 'turn_off';
        if (['switch', 'light', 'input_boolean'].includes(domain)) {
            this._hass.callService(domain, service, { entity_id: entityId });
            return;
        }
        if (this._supportsService('homeassistant', service)) {
            this._hass.callService('homeassistant', service, { entity_id: entityId });
            return;
        }
        this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
    }

    _isSameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }
}

customElements.define('family-board', FamilyBoardCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'family-board',
    name: 'Family Board',
    description: 'Family calendar, chores, and shopping dashboard',
});
