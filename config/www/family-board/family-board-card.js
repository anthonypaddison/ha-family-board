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
import './components/fb-all-day-dialog.js';
import './ui/help.dialog.js';
import './ui/editor-guide.dialog.js';
import './views/home.view.js';
import './views/chores.view.js';
import './views/shopping.view.js';
import './views/settings.view.js';
import './views/setup.view.js';
import { renderMainView } from './views/main.view.js';

const DEFAULT_COMMON_ITEMS = [
    'Milk',
    'Bread',
    'Butter',
    'Eggs',
    'Cheese',
    'Apples',
    'Bananas',
    'Chicken',
    'Rice',
    'Pasta',
    'Cereal',
    'Yogurt',
    'Ham',
    'Carrots',
    'Potatoes',
    'Tomatoes',
    'Cucumbers',
    'Chocolate',
    'Crisps',
    'Toilet roll',
];

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
        _allDayDialogOpen: { state: true },
        _allDayDialogDay: { state: true },
        _allDayDialogEvents: { state: true },
        _helpOpen: { state: true },
        _editorGuideOpen: { state: true },
        _sidebarCollapsed: { state: true },
        _toastMessage: { state: true },
        _toastDetail: { state: true },
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
                max-height: 100%;
                min-height: 0;
                overflow: hidden;
            }
            :host,
            :host * {
                box-sizing: border-box;
            }
            .app {
                height: 100%;
                width: 100%;
                display: grid;
                grid-template-columns: 260px 1fr;
                background: var(--fb-bg);
                color: var(--fb-text);
                overflow: hidden;
                min-height: 0;
            }
            .sidebar {
                background: var(--fb-surface);
                padding: 0;
                display: flex;
                flex-direction: column;
                gap: 10px;
                height: 100%;
                min-height: 0;
            }
            .main {
                display: grid;
                grid-template-rows: auto 1fr;
                min-width: 0;
                min-height: 0;
                background: var(--fb-bg);
                overflow: hidden;
            }
            .content {
                position: relative;
                min-width: 0;
                min-height: 0;
                overflow: hidden;
                background: var(--fb-bg);
            }
            .toast {
                position: absolute;
                right: 16px;
                bottom: 16px;
                background: var(--fb-surface);
                color: var(--fb-text);
                border: 1px solid var(--fb-border);
                border-radius: 10px;
                padding: 8px 12px;
                box-shadow: var(--fb-shadow);
                font-size: 14px;
                z-index: 5;
            }
            .toastDetail {
                color: var(--fb-muted);
                font-size: 14px;
                margin-top: 2px;
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
        this._allDayDialogOpen = false;
        this._allDayDialogDay = null;
        this._allDayDialogEvents = [];
        this._helpOpen = false;
        this._editorGuideOpen = false;
        this._refreshIntervalMs = 300_000;
        this._prefsLoaded = false;
        this._useMobileView = false;
        this._scheduleDays = 5;
        this._shoppingCommon = [];
        this._shoppingFavourites = [];
        this._shoppingRemoveTimers = new Map();
        this._defaultEventMinutes = 30;
        this._storageLoaded = false;
        this._storageLoadPromise = null;
        this._storedConfig = null;
        this._yamlConfig = null;
        this._persistMode = 'none';
        this._toastMessage = '';
        this._toastDetail = '';
    }

    setConfig(config) {
        if (!config) throw new Error('Family Board: missing config');
        this._yamlConfig = config;
        this._debug = Boolean(config.debug);
        debugLog(this._debug, 'setConfig received', config);
        if (!this._hass) {
            this._resolveConfig({ refresh: true });
            return;
        }
        if (this._storageLoaded) {
            this._resolveConfig({ refresh: true });
            return;
        }
        this._loadStoredConfig();
    }

    getCardSize() {
        return 6;
    }

    connectedCallback() {
        super.connectedCallback();
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
        this._loadStoredConfig();
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
        if (Number.isFinite(prefs.defaultEventMinutes)) {
            this._defaultEventMinutes = Math.max(5, Number(prefs.defaultEventMinutes));
        }
        if (Array.isArray(prefs.shoppingCommon) && prefs.shoppingCommon.length) {
            this._shoppingCommon = prefs.shoppingCommon;
        } else {
            this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
        }
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
                            @fb-dialog-close=${this._onDialogClose}
                            @fb-add-calendar=${this._onAddCalendar}
                            @fb-add-todo=${this._onAddTodo}
                            @fb-add-shopping=${this._onAddShopping}
                            @fb-edit-todo=${this._onEditTodo}
                            @fb-edit-shopping=${this._onEditShopping}
                        ></fb-dialogs>

                        <fb-manage-sources
                            .open=${this._sourcesOpen}
                            .config=${this._config}
                            .hass=${this._hass}
                            @fb-sources-save=${this._onSourcesSave}
                            @fb-sources-close=${this._onSourcesClose}
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

                        <fb-all-day-dialog
                            .open=${this._allDayDialogOpen}
                            .day=${this._allDayDialogDay}
                            .events=${this._allDayDialogEvents}
                            .card=${this}
                            @fb-all-day-close=${this._onAllDayDialogClose}
                        ></fb-all-day-dialog>

                        <fb-help-dialog
                            .open=${this._helpOpen}
                            @fb-help-close=${this._onHelpClose}
                        ></fb-help-dialog>
                        <fb-editor-guide-dialog
                            .open=${this._editorGuideOpen}
                            .card=${this}
                            @fb-editor-guide-close=${this._onEditorGuideClose}
                            @fb-editor-guide-open=${this._onOpenEditor}
                        ></fb-editor-guide-dialog>
                        ${this._toastMessage
                            ? html`<div class="toast">
                                  <div>${this._toastMessage}</div>
                                  ${this._toastDetail
                                      ? html`<div class="toastDetail">${this._toastDetail}</div>`
                                      : html``}
                              </div>`
                            : html``}
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
        } catch {
            // Ignore calendar fetch errors in UI.
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
        } catch {
            // Ignore todo fetch errors in UI.
        }
    }

    async _refreshTodoEntity(entityId) {
        if (!entityId) return;
        try {
            const items = await this._todoService.fetchItems(this._hass, entityId);
            this._todoItems = { ...(this._todoItems || {}), [entityId]: items };
        } catch {
            // Ignore todo fetch errors in UI.
        }
    }

    async _refreshShopping() {
        const shopping = this._config?.shopping;
        if (!shopping) return;
        try {
            this._shoppingItems = await this._shoppingService.fetchItems(this._hass, shopping);
        } catch {
            // Ignore shopping fetch errors in UI.
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

    _personIdForConfig(entry, entityId) {
        const person = entityId ? this._personForEntity(entityId) : null;
        return (
            person?.id ||
            entry?.person_id ||
            entry?.personId ||
            entry?.person ||
            entityId ||
            ''
        );
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
            if (!this._isPersonAllowed(this._personIdForConfig(c, c.entity))) return sum;
            const items = this._eventsByEntity?.[c.entity] || [];
            const count = items.filter((e) => {
                if (!e?._start || !e?._end) return false;
                return e._start <= end && e._end >= start;
            }).length;
            return sum + count;
        }, 0);

        const totalTodos = todos.reduce(
            (sum, t) => {
                if (!this._isPersonAllowed(this._personIdForConfig(t, t.entity))) return sum;
                return sum + this._incompleteTodoCount(this._todoItems?.[t.entity] || []);
            },
            0
        );

        const shopping = this._shoppingQuantityCount(shoppingItems);

        return {
            schedule: totalEvents ? String(totalEvents) : null,
            chores: totalTodos ? String(totalTodos) : null,
            shopping: shopping ? String(shopping) : null,
        };
    }

    _summaryCounts() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];

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
                eventsLeft: this._countEventsTodayForPerson(person.id),
                todosLeft: this._countTodosTodayForPerson(person.id),
            });
        }

        return Array.from(summaryById.values());
    }

    _getTodayRange() {
        const today = startOfDay(new Date());
        return { start: today, end: endOfDay(today) };
    }

    _countEventsTodayForPerson(personId) {
        if (!this._isPersonAllowed(personId)) return 0;
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const target = this._normalisePersonId(personId);
        if (!target) return 0;
        const today = startOfDay(new Date());

        return calendars.reduce((sum, c) => {
            const mappedId = this._normalisePersonId(this._personIdForConfig(c, c.entity));
            if (!mappedId || mappedId !== target) return sum;
            return sum + this._eventsForEntityOnDay(c.entity, today).length;
        }, 0);
    }

    _countTodosTodayForPerson(personId) {
        if (!this._isPersonAllowed(personId)) return 0;
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        const target = this._normalisePersonId(personId);
        if (!target) return 0;
        return todos.reduce((sum, t) => {
            const mappedId = this._normalisePersonId(this._personIdForConfig(t, t.entity));
            if (!mappedId || mappedId !== target) return sum;
            const items = this._todoItems?.[t.entity] || [];
            return sum + this._dueTodayOrNoDueCount(items);
        }, 0);
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
        this._closeAllDialogs();
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
        this._closeAllDialogs();
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
        this._optimisticCalendarAdd(entityId, { summary, start, end, allDay: false });
        try {
            await this._calendarService.createEvent(this._hass, entityId, { summary, start, end });
        } finally {
            this._queueRefresh();
        }
    };

    _buildTodoItem(text) {
        return {
            summary: text,
            name: text,
            item: text,
            status: 'needs_action',
        };
    }

    _optimisticTodoAdd(entityId, text) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const next = this._buildTodoItem(text);
        list.push(next);
        this._todoItems = { ...(this._todoItems || {}), [entityId]: list };
        this.requestUpdate();
        return next;
    }

    _optimisticTodoUpdate(entityId, item, text) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const nextList = list.map((entry) => {
            if (entry !== item) return entry;
            return {
                ...entry,
                summary: text,
                name: text,
                item: text,
            };
        });
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this.requestUpdate();
    }

    _optimisticTodoRemove(entityId, item) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? this._todoItems[entityId]
            : [];
        const nextList = list.filter((entry) => entry !== item);
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this.requestUpdate();
    }

    _optimisticTodoStatus(entityId, item, completed) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const nextList = list.map((entry) => {
            if (entry !== item) return entry;
            return { ...entry, status: completed ? 'completed' : 'needs_action' };
        });
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this.requestUpdate();
    }

    _onAddTodo = async (ev) => {
        const { entityId, text } = ev?.detail || {};
        if (!entityId || !text) return;
        this._optimisticTodoAdd(entityId, text);
        try {
            await this._todoService.addItem(this._hass, entityId, text);
        } finally {
            await this._refreshTodoEntity(entityId);
        }
    };

    _onAddShopping = async (ev) => {
        const { text } = ev?.detail || {};
        if (!text) return;
        await this._addShoppingItem(text);
    };

    _onEditTodo = async (ev) => {
        const { entityId, item, text } = ev?.detail || {};
        if (!entityId || !item || !text) return;
        this._optimisticTodoUpdate(entityId, item, text);
        try {
            await this._todoService.renameItem(this._hass, entityId, item, text);
        } finally {
            await this._refreshTodoEntity(entityId);
        }
    };

    _onEditShopping = async (ev) => {
        const { item, text } = ev?.detail || {};
        if (!item || !text) return;
        const parsed = this._parseShoppingText(text);
        const normalised = this._formatShoppingText(parsed.base, parsed.qty);
        this._trackShoppingCommon(parsed.base);
        await this._updateShoppingItemText(item, normalised);
    };

    _openManageSources() {
        if (!this._hass?.user?.is_admin) return;
        this._closeAllDialogs();
        this._sourcesOpen = true;
    }

    _onSourcesSave = async (ev) => {
        const next = ev?.detail?.config;
        if (!next) return;
        this._applyConfigImmediate({ ...this._config, ...next }, { useDefaults: false });
        await this._refreshAll();
        const result = await this._persistConfig({ ...this._config, ...next });
        if (result?.mode === 'local') {
            this._showToast('Saved', 'Saved on this device');
        } else {
            this._showToast('Saved');
        }
        this.requestUpdate();
    };

    async _updateConfigPartial(patch) {
        if (!patch) return;
        const next = { ...this._config, ...patch };
        this._applyConfigImmediate(next, { useDefaults: false });
        await this._refreshAll();
        const result = await this._persistConfig(next);
        if (result?.mode === 'local') {
            this._showToast('Saved', 'Saved on this device');
        } else {
            this._showToast('Saved');
        }
        this.requestUpdate();
    }

    _closeAllDialogs() {
        if (this._dialogOpen) this._clearDialogState();
        if (this._eventDialogOpen) this._onEventDialogClose();
        if (this._allDayDialogOpen) this._onAllDayDialogClose();
        this._sourcesOpen = false;
        this._helpOpen = false;
        this._editorGuideOpen = false;
    }

    _clearDialogState() {
        this._dialogOpen = false;
        this._dialogMode = '';
        this._dialogTitle = '';
        this._dialogItem = null;
        this._dialogEntity = '';
    }

    _onDialogClose = () => {
        if (!this._dialogOpen) return;
        this._clearDialogState();
    };

    _onSourcesClose = () => {
        this._sourcesOpen = false;
    };

    _onHelpClose = () => {
        this._helpOpen = false;
    };

    _onEditorGuideClose = () => {
        this._editorGuideOpen = false;
    };

    _onOpenEditor = () => {
        if (!this._hass?.user?.is_admin) return;
        fireEvent(this, 'll-edit-card', { card: this });
    };

    async _toggleTodoItem(entityId, item, completed) {
        if (!entityId || !item) return;
        this._optimisticTodoStatus(entityId, item, completed);
        try {
            await this._todoService.setStatus(this._hass, entityId, item, completed);
        } finally {
            await this._refreshTodoEntity(entityId);
        }
    }

    async _editTodoItem(entityId, item) {
        if (!entityId || !item) return;
        this._closeAllDialogs();
        this._dialogOpen = true;
        this._dialogMode = 'todo-edit';
        this._dialogTitle = 'Edit chore';
        this._dialogItem = item;
        this._dialogEntity = entityId;
    }

    async _deleteTodoItem(entityId, item) {
        if (!entityId || !item) return;
        this._optimisticTodoRemove(entityId, item);
        try {
            await this._todoService.removeItem(this._hass, entityId, item);
        } finally {
            await this._refreshTodoEntity(entityId);
        }
    }

    async _clearCompletedTodos(entityId) {
        if (!entityId) return;
        await this._todoService.clearCompleted(this._hass, entityId);
        this._queueRefresh();
    }

    async _addShoppingItem(text) {
        const parsed = this._parseShoppingText(text);
        const base = parsed.base;
        if (!base) return;
        const existing = this._findShoppingItemByName(base);
        if (existing) {
            const nextQty = existing.parsed.qty + parsed.qty;
            const nextText = this._formatShoppingText(existing.parsed.base, nextQty);
            this._trackShoppingCommon(existing.parsed.base);
            await this._updateShoppingItemText(existing.item, nextText);
            return;
        }
        const formatted = this._formatShoppingText(base, parsed.qty);
        this._optimisticShoppingAdd(formatted);
        this._trackShoppingCommon(base);
        try {
            await this._shoppingService.addItem(this._hass, this._config?.shopping, formatted);
        } finally {
            await this._refreshShopping();
        }
    }

    async _toggleShoppingItem(item, completed) {
        if (!item) return;
        this._optimisticShoppingStatus(item, completed);
        if (!completed) {
            this._clearShoppingRemoval(item);
        }
        try {
            await this._shoppingService.setStatus(
                this._hass,
                this._config?.shopping,
                item,
                completed
            );
        } finally {
            if (completed) {
                this._scheduleShoppingRemoval(item);
            } else {
                await this._refreshShopping();
            }
        }
    }

    async _editShoppingItem(item) {
        if (!item) return;
        this._closeAllDialogs();
        this._dialogOpen = true;
        this._dialogMode = 'shopping-edit';
        this._dialogTitle = 'Edit item';
        this._dialogItem = item;
        this._dialogEntity = this._config?.shopping?.entity || '';
    }

    async _deleteShoppingItem(item) {
        if (!item) return;
        this._clearShoppingRemoval(item);
        this._optimisticShoppingRemove(item);
        try {
            await this._shoppingService.removeItem(this._hass, this._config?.shopping, item);
        } finally {
            await this._refreshShopping();
        }
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
        this._personFilterSet = new Set(this._personFilterSet);
        this._savePrefs();
        this.requestUpdate();
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
            defaultEventMinutes: this._defaultEventMinutes,
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

    _setDefaultEventMinutesPref(minutes) {
        const value = Number(minutes);
        if (!Number.isFinite(value)) return;
        this._defaultEventMinutes = Math.max(5, value);
        this._savePrefs();
    }

    _toggleShoppingFavourite(name) {
        const parsed = this._parseShoppingText(name);
        const text = String(parsed.base || '').trim();
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

    _removeShoppingCommon(name) {
        const text = String(name || '').trim();
        if (!text) return;
        const key = text.toLowerCase();
        const list = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
        this._shoppingCommon = list.filter((item) => String(item).toLowerCase() !== key);
        this._savePrefs();
        this.requestUpdate();
    }

    _shoppingItemText(item) {
        return item?.summary ?? item?.name ?? item?.item ?? '';
    }

    _parseShoppingText(text) {
        const raw = String(text || '').trim();
        if (!raw) return { base: '', qty: 1 };
        const match = raw.match(/^(.*?)(?:\s+x(\d+))$/i);
        if (!match) return { base: raw, qty: 1 };
        const base = String(match[1] || '').trim();
        const qty = Math.max(1, Number(match[2] || 1));
        if (!base) return { base: raw, qty: 1 };
        return { base, qty };
    }

    _formatShoppingText(base, qty) {
        const name = String(base || '').trim();
        if (!name) return '';
        const count = Number.isFinite(qty) ? Math.max(1, Number(qty)) : 1;
        if (count <= 1) return name;
        return `${name} x${count}`;
    }

    _findShoppingItemByName(baseName) {
        const key = String(baseName || '').trim().toLowerCase();
        if (!key) return null;
        const list = Array.isArray(this._shoppingItems) ? this._shoppingItems : [];
        for (const item of list) {
            const parsed = this._parseShoppingText(this._shoppingItemText(item));
            if (parsed.base.toLowerCase() === key) return { item, parsed };
        }
        return null;
    }

    _buildShoppingItem(text) {
        return {
            summary: text,
            name: text,
            item: text,
            status: 'needs_action',
        };
    }

    _optimisticShoppingAdd(text) {
        const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
        const next = this._buildShoppingItem(text);
        list.push(next);
        this._shoppingItems = list;
        this.requestUpdate();
        return next;
    }

    _optimisticShoppingUpdate(item, text) {
        const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
        const nextList = list.map((entry) => {
            if (entry !== item) return entry;
            return {
                ...entry,
                summary: text,
                name: text,
                item: text,
            };
        });
        this._shoppingItems = nextList;
        this.requestUpdate();
    }

    _optimisticShoppingStatus(item, completed) {
        if (!item) return;
        const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
        const nextList = list.map((entry) => {
            if (entry !== item) return entry;
            entry.status = completed ? 'completed' : 'needs_action';
            return entry;
        });
        this._shoppingItems = nextList;
        this.requestUpdate();
    }

    async _updateShoppingItemText(item, text) {
        if (!item || !text) return;
        this._optimisticShoppingUpdate(item, text);
        const supportsUpdate = this._supportsService('todo', 'update_item');
        try {
            if (supportsUpdate) {
                await this._shoppingService.updateItem(this._hass, this._config?.shopping, item, {
                    rename: text,
                });
            } else {
                await this._shoppingService.removeItem(this._hass, this._config?.shopping, item);
                await this._shoppingService.addItem(this._hass, this._config?.shopping, text);
            }
        } finally {
            await this._refreshShopping();
        }
    }

    _optimisticShoppingRemove(item) {
        const list = Array.isArray(this._shoppingItems) ? this._shoppingItems : [];
        const nextList = list.filter((entry) => entry !== item);
        this._shoppingItems = nextList;
        this.requestUpdate();
    }

    async _adjustShoppingQuantity(item, delta) {
        if (!item || !delta) return;
        const parsed = this._parseShoppingText(this._shoppingItemText(item));
        const nextQty = parsed.qty + Number(delta);
        if (nextQty <= 0) {
            await this._deleteShoppingItem(item);
            return;
        }
        const nextText = this._formatShoppingText(parsed.base, nextQty);
        await this._updateShoppingItemText(item, nextText);
    }

    _clearShoppingRemoval(item) {
        if (!item) return;
        const timer = this._shoppingRemoveTimers?.get(item);
        if (timer) clearTimeout(timer);
        if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.delete(item);
        if (typeof item === 'object') {
            item._fbPendingRemove = false;
            item._fbRemoving = false;
        }
        this.requestUpdate();
    }

    _scheduleShoppingRemoval(item) {
        if (!item) return;
        this._clearShoppingRemoval(item);
        if (typeof item === 'object') {
            item._fbPendingRemove = true;
            item._fbRemoving = false;
        }
        this.requestUpdate();
        const timer = setTimeout(() => {
            if (typeof item === 'object') {
                item._fbRemoving = true;
                this.requestUpdate();
            }
            setTimeout(async () => {
                this._optimisticShoppingRemove(item);
                try {
                    await this._shoppingService.removeItem(
                        this._hass,
                        this._config?.shopping,
                        item
                    );
                } finally {
                    if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.delete(item);
                    await this._refreshShopping();
                }
            }, 300);
        }, 3500);
        if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.set(item, timer);
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
        this._closeAllDialogs();
        this._eventDialogEntity = entityId;
        this._eventDialogEvent = event;
        this._eventDialogOpen = true;
    }

    _onEventDialogClose = () => {
        this._eventDialogOpen = false;
        this._eventDialogEntity = '';
        this._eventDialogEvent = null;
    };

    _openAllDayDialog(day, events) {
        if (!day || !Array.isArray(events)) return;
        this._closeAllDialogs();
        this._allDayDialogDay = day;
        this._allDayDialogEvents = events;
        this._allDayDialogOpen = true;
    }

    _onAllDayDialogClose = () => {
        this._allDayDialogOpen = false;
        this._allDayDialogDay = null;
        this._allDayDialogEvents = [];
    };

    _onEventUpdate = async (ev) => {
        const { entityId, event, summary, start, end, allDay } = ev?.detail || {};
        if (!entityId || !event) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.UPDATE)) return;
        this._optimisticCalendarUpdate(entityId, event, { summary, start, end, allDay });
        try {
            await this._calendarService.updateEvent(this._hass, entityId, event, {
                summary,
                start,
                end,
                allDay,
            });
        } finally {
            this._queueRefresh();
        }
    };

    _onEventDelete = async (ev) => {
        const { entityId, event } = ev?.detail || {};
        if (!entityId || !event) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.DELETE)) return;
        this._optimisticCalendarRemove(entityId, event);
        try {
            await this._calendarService.deleteEvent(this._hass, entityId, event);
        } finally {
            this._queueRefresh();
        }
    };

    _optimisticCalendarAdd(entityId, { summary, start, end, allDay } = {}) {
        const list = Array.isArray(this._eventsByEntity?.[entityId])
            ? [...this._eventsByEntity[entityId]]
            : [];
        const optimistic = {
            summary: summary || '(No title)',
            _start: start,
            _end: end,
            all_day: Boolean(allDay),
            id: `optimistic-${Date.now()}`,
        };
        list.push(optimistic);
        this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: list };
        this._eventsVersion = (this._eventsVersion || 0) + 1;
        this.requestUpdate();
        return optimistic;
    }

    _optimisticCalendarUpdate(entityId, event, { summary, start, end, allDay } = {}) {
        if (!event) return;
        event.summary = summary ?? event.summary;
        event._start = start ?? event._start;
        event._end = end ?? event._end;
        event.all_day = allDay !== undefined ? Boolean(allDay) : event.all_day;
        this._eventsVersion = (this._eventsVersion || 0) + 1;
        this.requestUpdate();
    }

    _optimisticCalendarRemove(entityId, event) {
        if (!event) return;
        const list = Array.isArray(this._eventsByEntity?.[entityId])
            ? this._eventsByEntity[entityId]
            : [];
        const nextList = list.filter((entry) => entry !== event);
        this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: nextList };
        this._eventsVersion = (this._eventsVersion || 0) + 1;
        this.requestUpdate();
    }

    _incompleteTodoCount(items) {
        return items.filter(
            (it) => !['completed', 'done'].includes(String(it.status || '').toLowerCase())
        ).length;
    }

    _shoppingQuantityCount(items) {
        return (items || []).reduce((sum, item) => {
            const status = String(item?.status || '').toLowerCase();
            if (status === 'completed' || status === 'done') return sum;
            const parsed = this._parseShoppingText(this._shoppingItemText(item));
            return sum + (parsed.qty || 1);
        }, 0);
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
        if (draft.accent_teal) push(`accent_teal: '${draft.accent_teal}'`);
        if (draft.accent_lilac) push(`accent_lilac: '${draft.accent_lilac}'`);
        if (draft.background_theme) push(`background_theme: '${draft.background_theme}'`);

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
        this._applyConfigImmediate({ ...this._config, ...draft }, { useDefaults: false });
        this._refreshAll();
    }

    _resolveConfig({ refresh = true } = {}) {
        if (!this._yamlConfig) return;
        const stored = this._storedConfig;
        const resolved = stored ? this._mergeConfig(this._yamlConfig, stored) : this._yamlConfig;
        debugLog(this._debug, 'resolveConfig precedence', {
            hasStored: Boolean(stored),
            persist: this._persistMode || 'none',
        });
        this._applyConfigImmediate(resolved, { useDefaults: true, refresh });
    }

    async _loadStoredConfig() {
        if (this._storageLoaded || !this._hass) return this._storageLoadPromise;
        if (this._storageLoadPromise) return this._storageLoadPromise;
        this._storageLoadPromise = (async () => {
            const stored = await this._getStoredConfig();
            this._storageLoaded = true;
            if (stored) {
                this._storedConfig = stored;
                debugLog(this._debug, 'storedConfig loaded', {
                    mode: this._persistMode || 'none',
                });
            } else {
                this._storedConfig = null;
                debugLog(this._debug, 'storedConfig missing', {
                    mode: this._persistMode || 'none',
                });
            }
            this._resolveConfig({ refresh: true });
            return stored;
        })();
        return this._storageLoadPromise;
    }

    async _getStoredConfig() {
        const ws = await this._callWsGet();
        if (ws) {
            this._persistMode = 'ws';
            return ws;
        }
        const local = this._loadLocalConfig();
        if (local) {
            this._persistMode = 'local';
            return local;
        }
        this._persistMode = 'none';
        return null;
    }

    _mergeConfig(base, override) {
        const merged = { ...base, ...override };
        if (override.people) merged.people = override.people;
        if (override.calendars) merged.calendars = override.calendars;
        if (override.todos) merged.todos = override.todos;
        if (override.shopping) merged.shopping = { ...(base.shopping || {}), ...override.shopping };
        return merged;
    }

    async _callWsGet() {
        try {
            const result = await this._hass.callWS({ type: 'family_board/config/get' });
            return result?.config || null;
        } catch {
            return null;
        }
    }

    _localConfigKey() {
        const userId = this._hass?.user?.id || 'unknown';
        const device = getDeviceKind();
        return `family-board:config:${userId}:${device}`;
    }

    _loadLocalConfig() {
        try {
            const raw = localStorage.getItem(this._localConfigKey());
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    async _persistConfig(config) {
        const ok = await this._callWsSet(config);
        if (ok) {
            this._persistMode = 'ws';
            this._storedConfig = config;
            this._storageLoaded = true;
            debugLog(this._debug, 'persistConfig', { mode: 'ws' });
            return { ok: true, mode: 'ws' };
        }
        this._persistMode = 'local';
        this._saveLocalConfig(config);
        this._storedConfig = config;
        this._storageLoaded = true;
        debugLog(this._debug, 'persistConfig', { mode: 'local' });
        return { ok: true, mode: 'local' };
    }

    async _callWsSet(config) {
        try {
            await this._hass.callWS({ type: 'family_board/config/set', config });
            return true;
        } catch {
            return false;
        }
    }

    _saveLocalConfig(config) {
        try {
            localStorage.setItem(this._localConfigKey(), JSON.stringify(config || {}));
        } catch {
            // Ignore storage errors.
        }
    }

    _showToast(message, detail = '') {
        this._toastMessage = message;
        this._toastDetail = detail;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            this._toastMessage = '';
            this._toastDetail = '';
            this.requestUpdate();
        }, 2000);
    }

    _openEditor() {
        this._closeAllDialogs();
        this._onOpenEditor();
        this._editorGuideOpen = true;
        this.requestUpdate();
    }

    _openHelp() {
        this._closeAllDialogs();
        this._helpOpen = true;
        this.requestUpdate();
    }

    _applyConfigImmediate(config, { useDefaults = false, refresh = false } = {}) {
        this._config = config;
        this._debug = Boolean(config.debug);

        const dayStart = useDefaults ? 6 : this._dayStartHour ?? 6;
        const dayEnd = useDefaults ? 22 : this._dayEndHour ?? 22;
        const slotMinutes = useDefaults ? 30 : this._slotMinutes ?? 30;
        const pxPerHour = useDefaults ? 120 : this._pxPerHour ?? 120;
        const refreshMs = useDefaults ? 300_000 : this._refreshIntervalMs ?? 300_000;

        this._dayStartHour = config.day_start_hour ?? dayStart;
        this._dayEndHour = config.day_end_hour ?? dayEnd;
        this._slotMinutes = config.slot_minutes ?? slotMinutes;
        this._pxPerHour = config.px_per_hour ?? pxPerHour;
        const daysToShow = config.days_to_show ?? 5;
        this._daysToShow = daysToShow;
        this._scheduleDays = daysToShow;
        this._refreshIntervalMs = config.refresh_interval_ms ?? refreshMs;

        const accentTeal =
            typeof config.accent_teal === 'string' ? config.accent_teal.trim() : '';
        if (accentTeal) {
            this.style.setProperty('--fb-accent-teal', accentTeal);
        } else {
            this.style.removeProperty('--fb-accent-teal');
        }
        const accentLilac =
            typeof config.accent_lilac === 'string' ? config.accent_lilac.trim() : '';
        if (accentLilac) {
            this.style.setProperty('--fb-accent', accentLilac);
        } else {
            this.style.removeProperty('--fb-accent');
        }
        const backgroundTheme =
            typeof config.background_theme === 'string' ? config.background_theme.trim() : '';
        const themeMap = {
            mint: '#f2fbf7',
            sand: '#fff5e8',
            slate: '#f3f6fb',
        };
        if (backgroundTheme && themeMap[backgroundTheme]) {
            this.style.setProperty('--fb-bg', themeMap[backgroundTheme]);
        } else {
            this.style.removeProperty('--fb-bg');
        }

        this._ensureVisibilitySets();
        this._buildPeopleMap();
        this._ensureServices();
        this._resetRefreshTimer();
        if (refresh) this._queueRefresh();
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
