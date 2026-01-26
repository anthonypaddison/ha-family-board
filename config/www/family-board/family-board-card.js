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
    pad2,
    formatDayTitle,
} from './family-board.util.js';
import { NEUTRAL_COLOUR, getPersonColour } from './util/colour.util.js';
import { loadPrefs, updatePrefs, savePrefs, getDeviceKind } from './util/prefs.util.js';

import { CalendarService, CALENDAR_FEATURES } from './services/calendar.service.js';
import { TodoService } from './services/todo.service.js';
import { ShoppingService } from './services/shopping.service.js';

import './components/fb-sidebar.js';
import './components/fb-topbar.js';
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
import './views/important.view.js';
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
        _dialogStartValue: { state: true },
        _dialogEndValue: { state: true },
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
        _syncingCalendars: { state: true },
        _calendarStale: { state: true },
        _calendarError: { state: true },
        _calendarFetchInFlight: { state: true },
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
            day_end_hour: 24,
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
                height: var(--fb-viewport-height, 100vh);
                width: 100%;
                max-height: var(--fb-viewport-height, 100vh);
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
                column-gap: var(--fb-gutter);
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
                padding-right: var(--fb-gutter);
                min-width: 0;
                min-height: 0;
                background: var(--fb-bg);
                overflow: hidden;
                position: relative;
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
                right: var(--fb-gutter);
                top: var(--fb-gutter);
                bottom: auto;
                background: var(--fb-surface);
                color: var(--fb-text);
                border: 1px solid var(--fb-border);
                border-radius: 10px;
                padding: 8px 12px;
                box-shadow: var(--fb-shadow);
                font-size: 14px;
                z-index: 20;
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
        this._todoRenderTick = 0;
        this._todoStatusRetryTimers = new Map();
        this._shoppingItems = [];
        this._dialogOpen = false;
        this._dialogMode = '';
        this._dialogTitle = '';
        this._dialogItem = null;
        this._dialogEntity = '';
        this._dialogStartValue = '';
        this._dialogEndValue = '';
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
        this._sharedConfig = null;
        this._yamlConfig = null;
        this._persistMode = 'none';
        this._toastMessage = '';
        this._toastDetail = '';
        this._syncingCalendars = false;
        this._calendarStale = false;
        this._calendarError = false;
        this._calendarFetchInFlight = false;
        this._calendarLastSuccessTs = 0;
        this._calendarRetryTimer = null;
        this._calendarRetryMs = 0;
        this._calendarForceNext = false;
        this._calendarFetchPromise = null;
        this._calendarRequestSeq = 0;
        this._calendarEventsMerged = [];
        this._errorToastTs = new Map();
        this._todoErrorEntities = new Set();
        this._resizeHandler = null;
        this._calendarVisibilityEnabled = false;
        this._deviceDayStartHour = null;
        this._deviceDayEndHour = null;
        this._devicePxPerHour = null;
        this._deviceRefreshMs = null;
        this._deviceAccentTeal = null;
        this._deviceAccentLilac = null;
        this._deviceBackgroundTheme = null;
        this._deviceDebug = null;
        this._devicePeopleDisplay = null;
        this._adminUnlocked = false;
        this._defaultView = 'schedule';
        this._initialViewSet = false;
        this._baselineTopbarHeight = null;
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
        this._updateViewportHeight();
        setTimeout(() => this._updateViewportHeight(), 0);
        if (!this._resizeHandler) {
            this._resizeHandler = () => this._updateViewportHeight();
            window.addEventListener('resize', this._resizeHandler);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    }

    _updateViewportHeight() {
        if (!this.isConnected) return;
        const rect = this.getBoundingClientRect();
        const top = Number.isFinite(rect.top) ? rect.top : 0;
        const height = Math.max(0, window.innerHeight - top);
        this.style.setProperty('--fb-viewport-height', `${height}px`);
        this._updateTopbarHeight();
    }

    _updateTopbarHeight() {
        if (!this.renderRoot) return;
        const topbar = this.renderRoot.querySelector('.topbar');
        if (!topbar) return;
        const height = topbar.getBoundingClientRect().height;
        if (!Number.isFinite(height)) return;
        const screen = this._screen || 'schedule';
        if (this._baselineTopbarHeight === null && screen === 'schedule') {
            this._baselineTopbarHeight = height;
        }
        const applied = this._baselineTopbarHeight ?? height;
        this.style.setProperty('--fb-topbar-height', `${applied}px`);
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

    updated() {
        this._updateTopbarHeight();
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
        this._adminUnlocked = Boolean(prefs.adminUnlocked);
        this._defaultView = prefs.defaultView || 'schedule';
        this._lastView = prefs.lastView || '';
        if (Number.isFinite(prefs.dayStartHour)) this._deviceDayStartHour = prefs.dayStartHour;
        if (Number.isFinite(prefs.dayEndHour)) this._deviceDayEndHour = prefs.dayEndHour;
        if (Number.isFinite(prefs.pxPerHour)) this._devicePxPerHour = prefs.pxPerHour;
        if (Number.isFinite(prefs.refreshIntervalMs))
            this._deviceRefreshMs = prefs.refreshIntervalMs;
        if (typeof prefs.accentTeal === 'string') this._deviceAccentTeal = prefs.accentTeal;
        if (typeof prefs.accentLilac === 'string') this._deviceAccentLilac = prefs.accentLilac;
        if (typeof prefs.backgroundTheme === 'string')
            this._deviceBackgroundTheme = prefs.backgroundTheme;
        if (typeof prefs.debug === 'boolean') this._deviceDebug = prefs.debug;
        if (Array.isArray(prefs.peopleDisplay)) this._devicePeopleDisplay = prefs.peopleDisplay;
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

        if (!this._initialViewSet) {
            const allowedViews = ['schedule', 'important', 'chores', 'shopping', 'home', 'settings'];
            const view = allowedViews.includes(this._lastView)
                ? this._lastView
                : allowedViews.includes(this._defaultView)
                ? this._defaultView
                : 'schedule';
            this._screen = view;
            this._initialViewSet = true;
        }
    }

    render() {
        if (!this._config) return html``;

        const screen = this._screen || 'schedule';
        const mainMode = this._mainMode || 'schedule';
        const isAdmin = this._hasAdminAccess();
        const hasPin = Boolean(this._config?.admin_pin);
        const showSettings = isAdmin || hasPin;
        const needsSetup = !Array.isArray(this._config?.people) || this._config.people.length === 0;
        const personFilterSig = Array.from(this._personFilterSet || []).sort().join(',');
        const shoppingFavSig = Array.isArray(this._shoppingFavourites)
            ? this._shoppingFavourites.join('|')
            : '';
        const shoppingCommonSig = Array.isArray(this._shoppingCommon)
            ? this._shoppingCommon.join('|')
            : '';
        const shoppingItemsSig = Array.isArray(this._shoppingItems)
            ? this._shoppingItems.map((item) => this._shoppingItemText(item)).join('|')
            : '';
        const shoppingCount = this._shoppingQuantityCount(this._shoppingItems || []);
        const binIndicators = this._binIndicators();
        const todoItemsSig = Object.entries(this._todoItems || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([entityId, items]) => {
                if (!Array.isArray(items)) return `${entityId}:`;
                const itemsSig = items
                    .map((it) => {
                        const key =
                            it?.uid || it?.id || it?.summary || it?.name || it?.item || '';
                        const status = String(it?.status || '');
                        const completed = it?.completed ? '1' : '0';
                        return `${key}:${status}:${completed}`;
                    })
                    .join(',');
                return `${entityId}:${itemsSig}`;
            })
            .join('|');

        const sidebarWidth = '76px';

        return html`
            <div class="app" style="grid-template-columns:${sidebarWidth} 1fr;">
                <div class="sidebar">
                    <fb-sidebar
                        .active=${screen}
                        .counts=${this._sidebarCounts()}
                        .isAdmin=${showSettings}
                        .collapsed=${true}
                        @fb-nav=${this._onNav}
                    ></fb-sidebar>
                </div>

                <div class="main">
                    ${this._toastMessage
                        ? html`<div class="toast">
                              <div>${this._toastMessage}</div>
                              ${this._toastDetail
                                  ? html`<div class="toastDetail">${this._toastDetail}</div>`
                                  : html``}
                          </div>`
                        : html``}
                    <div class="topbar">
                        <fb-topbar
                            .title=${this._config.title || 'Family Board'}
                            .screen=${screen}
                            .mainMode=${mainMode}
                            .summary=${this._summaryCounts()}
                            .shoppingCount=${shoppingCount}
                            .binIndicators=${binIndicators}
                            .dateLabel=${this._dateLabel()}
                            .dateValue=${this._selectedDayValue()}
                            .activeFilters=${Array.from(this._personFilterSet || [])}
                            .isAdmin=${isAdmin}
                            .syncing=${this._syncingCalendars || this._calendarFetchInFlight}
                            .calendarStale=${this._calendarStale}
                            .calendarError=${this._calendarError}
                            .calendarInFlight=${this._calendarFetchInFlight}
                            @fb-main-mode=${this._onMainMode}
                            @fb-date-nav=${this._onDateNav}
                            @fb-date-today=${this._onToday}
                            @fb-date-set=${this._onDateSet}
                            @fb-sync-calendars=${this._onSyncCalendars}
                            @fb-calendar-try-again=${this._onCalendarTryAgain}
                            @fb-person-toggle=${this._onPersonToggle}
                            @fb-open-sources=${() => this._openManageSources()}
                            @fb-add=${this._onFab}
                        ></fb-topbar>
                    </div>

                    <div class="content">
                        ${needsSetup
                            ? html`<fb-setup-view .card=${this}></fb-setup-view>`
                            : screen === 'schedule'
                            ? renderMainView(this)
                            : screen === 'important'
                            ? html`<fb-important-view
                                  .card=${this}
                                  .renderKey=${`${personFilterSig}|${this._eventsVersion}|${todoItemsSig}`}
                              ></fb-important-view>`
                            : screen === 'chores'
                            ? html`<fb-chores-view
                                  .card=${this}
                                  .renderKey=${`${personFilterSig}|${todoItemsSig}|${this._todoRenderTick}`}
                              ></fb-chores-view>`
                            : screen === 'shopping'
                            ? html`<fb-shopping-view
                                  .card=${this}
                                  .renderKey=${`${shoppingFavSig}|${shoppingCommonSig}|${shoppingItemsSig}`}
                              ></fb-shopping-view>`
                            : screen === 'settings'
                            ? html`<fb-settings-view .card=${this}></fb-settings-view>`
                            : html`<fb-home-view .card=${this}></fb-home-view>`}

                        <fb-dialogs
                            .card=${this}
                            .open=${this._dialogOpen}
                            .mode=${this._dialogMode}
                            .title=${this._dialogTitle}
                            .entityId=${this._dialogEntity}
                            .item=${this._dialogItem}
                            .startValue=${this._dialogStartValue}
                            .endValue=${this._dialogEndValue}
                            .calendars=${this._config?.calendars || []}
                            .todos=${this._config?.todos || []}
                            .shopping=${this._config?.shopping || {}}
                            .canAddHomeControl=${Boolean(this._hass?.user?.is_admin)}
                            @fb-dialog-mode=${this._onDialogModeChange}
                            @fb-dialog-close=${this._onDialogClose}
                            @fb-add-calendar=${this._onAddCalendar}
                            @fb-add-todo=${this._onAddTodo}
                            @fb-add-shopping=${this._onAddShopping}
                            @fb-add-home-control=${this._onAddHomeControl}
                            @fb-edit-todo=${this._onEditTodo}
                            @fb-edit-shopping=${this._onEditShopping}
                        ></fb-dialogs>

                        <fb-manage-sources
                            .open=${this._sourcesOpen}
                            .config=${this._storedConfig || this._sharedConfig || this._config}
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
                text_color: p.text_color || '',
                role: p.role || '',
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
                text_color: mapped?.text_color || '',
                role: mapped?.role || '',
                header_row: mapped?.header_row || 1,
            });
        }
    }

    _queueRefresh({ forceCalendars = false } = {}) {
        if (this._refreshQueued) return;
        if (forceCalendars) this._calendarForceNext = true;
        this._refreshQueued = true;
        Promise.resolve().then(() => {
            this._refreshQueued = false;
            this._refreshAll();
        });
    }

    _scheduleCalendarRetry() {
        if (this._calendarRetryTimer) return;
        const refreshMs = this._refreshIntervalMs ?? 300_000;
        const base = Math.min(30_000, refreshMs);
        const next = this._calendarRetryMs ? Math.min(this._calendarRetryMs * 2, refreshMs) : base;
        this._calendarRetryMs = next;
        this._calendarRetryTimer = setTimeout(() => {
            this._calendarRetryTimer = null;
            this._queueRefresh({ forceCalendars: true });
        }, next);
    }

    _clearCalendarRetry() {
        if (this._calendarRetryTimer) {
            clearTimeout(this._calendarRetryTimer);
            this._calendarRetryTimer = null;
        }
        this._calendarRetryMs = 0;
    }

    _visibleCalendarEntities() {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        const visibleSet = this._calendarVisibleSet || new Set(calendars.map((c) => c.entity));
        return calendars
            .filter(
                (c) =>
                    visibleSet.has(c.entity) &&
                    this._isPersonAllowed(this._personIdForConfig(c, c.entity))
            )
            .map((c) => c.entity)
            .filter(Boolean);
    }

    _hasCalendarCache(eventsByEntity = this._eventsByEntity) {
        const entityIds = this._visibleCalendarEntities();
        if (!entityIds.length) return false;
        return entityIds.some((entityId) => Array.isArray(eventsByEntity?.[entityId]));
    }

    _hashSummary(value) {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = (hash * 31 + value.charCodeAt(i)) | 0;
        }
        return `h${(hash >>> 0).toString(36)}`;
    }

    _calendarEventKey(entityId, event, idx) {
        // Event ids can collide or be missing across calendars; a per-entity key keeps layout stable.
        const originalId = event?.uid || event?.id || event?.event_id || '';
        const start = event?._start ? event._start.toISOString() : '';
        const summaryHash = event?.summary ? this._hashSummary(event.summary) : '';
        const fallback = originalId || start || summaryHash || String(idx);
        return `${entityId}::${fallback}`;
    }

    _mergeCalendarEvents(eventsByEntity) {
        const merged = [];
        const entries = Object.entries(eventsByEntity || {});
        const seenKeys = new Set();
        for (const [entityId, items] of entries) {
            if (!Array.isArray(items)) continue;
            items.forEach((event, idx) => {
                const key = event?._fbKey || this._calendarEventKey(entityId, event, idx);
                if (seenKeys.has(key)) {
                    this._logCalendarState('key-collision', { entityId, key });
                } else {
                    seenKeys.add(key);
                }
                merged.push({
                    ...event,
                    _fbEntityId: entityId,
                    _fbKey: key,
                });
            });
        }
        return merged;
    }

    _mergedEventsForDay(day, entityIds) {
        const items = Array.isArray(this._calendarEventsMerged) ? this._calendarEventsMerged : [];
        if (!items.length || !entityIds?.size) return [];
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        return items.filter((e) => {
            if (!entityIds.has(e._fbEntityId)) return false;
            if (!e?._start || !e?._end) return false;
            const start = e._start.getTime();
            const end = e._end.getTime();
            return start < dayEnd.getTime() && end > dayStart.getTime();
        });
    }

    _calendarDebugEnabled() {
        return localStorage.getItem('FB_DEBUG_CALENDAR') === '1';
    }

    _logCalendarState(state, detail = {}) {
        debugLog(this._calendarDebugEnabled(), 'calendar state', state, detail);
    }

    _withTimeout(promise, ms = 10_000) {
        let timer = null;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
        });
        return Promise.race([promise, timeout]).finally(() => {
            if (timer) clearTimeout(timer);
        });
    }

    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async _refreshCalendarsWithEntityUpdate() {
        if (!this._hass) return;
        const entityIds = this._visibleCalendarEntities();
        if (entityIds.length) {
            try {
                await this._withTimeout(
                    this._hass.callService('homeassistant', 'update_entity', {
                        entity_id: entityIds,
                    }),
                    10_000
                );
            } catch {
                // Proceed to fetch even if the update times out or fails.
            }
        }
        await this._sleep(750);
        await this._refreshCalendarRange({ force: true });
    }

    async _refreshAll() {
        if (!this._hass || !this._config) return;
        await Promise.all([
            this._refreshCalendarRange({ force: this._calendarForceNext }),
            this._refreshTodos(),
            this._refreshShopping(),
        ]);
    }

    async _refreshCalendarRange({ force = false } = {}) {
        const calendars = Array.isArray(this._config?.calendars) ? this._config.calendars : [];
        if (!calendars.length) {
            this._calendarStale = false;
            this._calendarError = false;
            this.requestUpdate();
            return;
        }
        if (this._calendarFetchInFlight) return this._calendarFetchPromise || undefined;

        const hassStates = this._hass?.states || {};
        const calendarsToFetch = calendars.filter((c) => hassStates?.[c.entity]);
        const missingCalendars = calendars.filter((c) => !hassStates?.[c.entity]);
        if (!calendarsToFetch.length) {
            for (const c of missingCalendars) {
                const key = `calendar-missing:${c.entity}`;
                if (this._shouldNotifyError(key, 120_000)) {
                    this._showErrorToast('Calendar missing', c.entity);
                }
            }
            this._calendarStale = false;
            this._calendarError = false;
            this.requestUpdate();
            return;
        }

        const effectiveForce = Boolean(force || this._calendarForceNext);
        this._calendarForceNext = false;

        const { start, end } = this._currentCalendarRange();
        // Guard against slow responses overwriting merged calendar state.
        const requestId = (this._calendarRequestSeq || 0) + 1;
        this._calendarRequestSeq = requestId;
        // Track loading vs stale/error separately to avoid retry prompts with usable cache.
        this._logCalendarState('loading', {
            hasCache: this._hasCalendarCache(),
            force: effectiveForce,
        });
        this._calendarFetchInFlight = true;
        this._calendarStale = false;
        this._calendarError = false;
        this.requestUpdate();

        const fetchPromise = (async () => {
            let hadFailure = false;
            let hadSuccess = false;
            const previous = this._eventsByEntity || {};
            const next = { ...previous };

            const results = await Promise.allSettled(
                calendarsToFetch.map(async (c) => {
                    const entityId = c.entity;
                    this._logCalendarState('request-start', { entityId, requestId });
                    try {
                        const items = await this._calendarService.fetchEvents(
                            this._hass,
                            entityId,
                            start,
                            end,
                            { force: effectiveForce }
                        );
                        this._logCalendarState('request-end', {
                            entityId,
                            requestId,
                            count: items?.length ?? 0,
                        });
                        return [entityId, items];
                    } catch (error) {
                        this._logCalendarState('request-error', {
                            entityId,
                            requestId,
                            message: error?.message || String(error),
                        });
                        throw error;
                    }
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const [entityId, items] = result.value;
                    next[entityId] = Array.isArray(items)
                        ? items.map((event, idx) => ({
                              ...event,
                              _fbEntityId: entityId,
                              _fbKey: this._calendarEventKey(entityId, event, idx),
                          }))
                        : [];
                    hadSuccess = true;
                } else {
                    hadFailure = true;
                }
            }

            if (hadSuccess) {
                if (requestId !== this._calendarRequestSeq) {
                    this._logCalendarState('request-stale', { requestId });
                    return;
                }
                this._eventsByEntity = next;
                this._calendarEventsMerged = this._mergeCalendarEvents(next);
                this._eventsVersion += 1;
                this._calendarLastSuccessTs = Date.now();
                this._logCalendarState('merged', {
                    requestId,
                    count: this._calendarEventsMerged.length,
                });
            }

            if (hadFailure) {
                const hasCache = this._hasCalendarCache(next);
                this._calendarStale = hasCache;
                this._calendarError = !hasCache;
                if (hasCache) this._logCalendarState('cache-used', { hasCache });
                this._logCalendarState('error', { hasCache });
                this._scheduleCalendarRetry();
            } else {
                this._calendarStale = false;
                this._calendarError = false;
                this._clearCalendarRetry();
                if (hadSuccess) this._logCalendarState('success', { force: effectiveForce });
            }
        })();

        this._calendarFetchPromise = fetchPromise;
        try {
            await fetchPromise;
        } catch {
            const hasCache = this._hasCalendarCache();
            this._calendarStale = hasCache;
            this._calendarError = !hasCache;
            if (hasCache) this._logCalendarState('cache-used', { hasCache });
            this._logCalendarState('error', { hasCache });
            this._scheduleCalendarRetry();
        } finally {
            this._calendarFetchInFlight = false;
            this._calendarFetchPromise = null;
            this.requestUpdate();
        }
    }

    async _refreshTodos() {
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        if (!todos.length) return;
        const next = {};
        for (const t of todos) {
            if (!t?.entity) continue;
            if (!this._hass?.states?.[t.entity]) {
                if (this._todoErrorEntities.has(t.entity)) {
                    this._todoErrorEntities.delete(t.entity);
                }
                continue;
            }
            try {
                const items = await this._todoService.fetchItems(this._hass, t.entity);
                next[t.entity] = items;
                if (this._todoErrorEntities.has(t.entity)) {
                    this._todoErrorEntities.delete(t.entity);
                }
            } catch {
                if (!this._todoErrorEntities.has(t.entity)) {
                    this._showErrorToast('Refresh chores');
                    this._todoErrorEntities.add(t.entity);
                }
            }
        }
        this._todoItems = next;
    }

    async _refreshTodoEntity(entityId) {
        if (!entityId) return;
        if (!this._hass?.states?.[entityId]) return;
        try {
            const items = await this._todoService.fetchItems(this._hass, entityId);
            this._todoItems = { ...(this._todoItems || {}), [entityId]: items };
            if (this._todoErrorEntities.has(entityId)) {
                this._todoErrorEntities.delete(entityId);
            }
        } catch {
            if (!this._todoErrorEntities.has(entityId)) {
                this._showErrorToast('Refresh chores');
                this._todoErrorEntities.add(entityId);
            }
        }
    }

    async _refreshShopping() {
        const shopping = this._config?.shopping;
        if (!shopping) return;
        try {
            this._shoppingItems = await this._shoppingService.fetchItems(this._hass, shopping);
        } catch {
            if (this._shouldNotifyError('shopping-refresh')) {
                this._showErrorToast('Refresh shopping');
            }
        }
    }

    _currentCalendarRange() {
        const today = startOfDay(new Date());
        const screen = this._screen || 'schedule';
        const mainMode = this._mainMode || 'schedule';

        if (screen === 'important') {
            const day = addDays(today, this._dayOffset || 0);
            const tomorrow = addDays(day, 1);
            return { start: startOfDay(day), end: endOfDay(tomorrow) };
        }

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
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        const dayStartMs = dayStart.getTime();
        const dayEndMs = dayEnd.getTime();

        return items.filter((e) => {
            if (!e?._start || !e?._end) return false;
            const start = e._start.getTime();
            const end = e._end.getTime();
            return start < dayEndMs && end > dayStartMs;
        });
    }

    _personForEntity(entityId) {
        return this._personByEntity?.get(entityId) || null;
    }

    _personIdFromName(name) {
        if (!name) return '';
        const target = this._normalisePersonId(name);
        if (!target) return '';
        for (const person of this._peopleById?.values?.() || []) {
            const pid = this._normalisePersonId(person?.id);
            const pname = this._normalisePersonId(person?.name);
            if (pid && pid === target) return person.id;
            if (pname && pname === target) return person.id;
        }
        return '';
    }

    _personIdForConfig(entry, entityId) {
        const person = entityId ? this._personForEntity(entityId) : null;
        const direct =
            person?.id || entry?.person_id || entry?.personId || entry?.person || '';
        if (direct) return direct;
        if (entityId && entityId.startsWith('todo.')) {
            const nameMatch = this._personIdFromName(entry?.name);
            if (nameMatch) return nameMatch;
            const tail = entityId.slice('todo.'.length);
            const tailMatch = this._personIdFromName(tail);
            if (tailMatch) return tailMatch;
        }
        return entityId || '';
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
        const people = Array.isArray(this._config?.people) ? this._config.people : [];

        if (!people.length && this._peopleById?.size) {
            const fallback = Array.from(this._peopleById.values());
            return fallback.map((person) => ({
                id: person.id,
                name: person.name || person.id,
                color: getPersonColour(person),
                text_color: person.text_color || '',
                role: person.role || '',
                header_row: person.header_row || 1,
                eventsLeft: this._countEventsTodayForPerson(person.id),
                todosLeft: this._countTodosTodayForPerson(person.id),
            }));
        }

        const orderedIds = this._peopleDisplayIds(people);
        const summary = orderedIds
            .map((id) => this._peopleById?.get(id) || people.find((p) => p.id === id))
            .filter(Boolean)
            .map((person) => ({
                id: person.id,
                name: person.name || person.id,
                color: getPersonColour(person),
                text_color: person.text_color || '',
                role: person.role || '',
                header_row: person.header_row || 1,
                eventsLeft: this._countEventsTodayForPerson(person.id),
                todosLeft: this._countTodosTodayForPerson(person.id),
            }));

        return summary;
    }

    _peopleDisplayIds(people) {
        const hasDevice = Array.isArray(this._devicePeopleDisplay);
        const hasConfigured = Array.isArray(this._config?.people_display);
        const configured = hasDevice
            ? this._devicePeopleDisplay
            : hasConfigured
            ? this._config.people_display
            : [];
        const validIds = new Set(people.map((p) => p.id).filter(Boolean));
        const ordered = configured.filter((id) => validIds.has(id));
        const fallback = people.map((p) => p.id).filter(Boolean);
        const merged = hasDevice || hasConfigured ? ordered : fallback;
        const unique = [];
        for (const id of merged) {
            if (!unique.includes(id)) unique.push(id);
        }
        if (hasDevice || hasConfigured) {
            for (const id of fallback) {
                if (!unique.includes(id)) unique.push(id);
            }
        }
        return unique.slice(0, 8);
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
        if (screen === 'home') return 'Add home control';
        if (screen === 'settings') return 'No action';
        return 'Add event';
    }

    _toggleCalendarVisible(entityId) {
        if (!this._calendarVisibleSet) this._calendarVisibleSet = new Set();
        if (this._calendarVisibleSet.has(entityId)) this._calendarVisibleSet.delete(entityId);
        else this._calendarVisibleSet.add(entityId);
        this._calendarVisibilityEnabled = true;
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
        this._savePrefs();
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

    _onSyncCalendars = async () => {
        if (this._syncingCalendars || this._calendarFetchInFlight) return;
        this._syncingCalendars = true;
        this.requestUpdate();
        try {
            this._calendarService?.clearCache?.();
            await Promise.all([
                this._refreshCalendarsWithEntityUpdate(),
                this._refreshTodos(),
                this._refreshShopping(),
            ]);
            if (!this._calendarStale) this._showToast('Calendars synced');
        } finally {
            this._syncingCalendars = false;
            this.requestUpdate();
        }
    };

    _onCalendarTryAgain = () => {
        if (this._syncingCalendars || this._calendarFetchInFlight) return;
        this._syncingCalendars = true;
        this.requestUpdate();
        this._calendarService?.clearCache?.();
        Promise.all([
            this._refreshCalendarsWithEntityUpdate(),
            this._refreshTodos(),
            this._refreshShopping(),
        ]).finally(() => {
            this._syncingCalendars = false;
            this.requestUpdate();
        });
    };

    _onDateSet = (ev) => {
        const value = ev?.detail?.value;
        if (!value) return;
        const target = new Date(`${value}T00:00:00`);
        this._setScheduleStart(target);
    };

    _setAddDialogMode(mode) {
        this._dialogMode = mode;
        this._dialogItem = null;
        this._dialogEntity = '';
        this._dialogStartValue = '';
        this._dialogEndValue = '';
        if (mode === 'home-control') {
            this._dialogTitle = 'Add home control';
        } else if (mode === 'todo') {
            this._dialogTitle = 'Add chore';
        } else if (mode === 'shopping') {
            this._dialogTitle = 'Add shopping item';
        } else {
            this._dialogTitle = 'Add event';
            const start = new Date();
            const minutes = Number(this._defaultEventMinutes || 30);
            const end = new Date(start.getTime() + minutes * 60 * 1000);
            this._dialogStartValue = this._toLocalDateTimeValue(start);
            this._dialogEndValue = this._toLocalDateTimeValue(end);
        }
    }

    _openAddDialogForScreen(screen) {
        if (screen === 'home') {
            if (!this._hass?.user?.is_admin) {
                this._showToast('Admin only');
                return;
            }
            this._setAddDialogMode('home-control');
            return;
        }
        if (screen === 'chores') {
            this._setAddDialogMode('todo');
            return;
        }
        if (screen === 'shopping') {
            this._setAddDialogMode('shopping');
            return;
        }
        this._setAddDialogMode('calendar');
    }

    _onDialogModeChange = (ev) => {
        const mode = ev?.detail?.mode;
        if (!mode) return;
        if (mode === 'home-control' && !this._hass?.user?.is_admin) {
            this._showToast('Admin only');
            return;
        }
        this._setAddDialogMode(mode);
    };

    _onFab = () => {
        this._closeAllDialogs();
        this._dialogOpen = true;
        const screen = this._screen || 'schedule';
        this._openAddDialogForScreen(screen === 'settings' ? 'schedule' : screen);
    };

    _toLocalDateTimeValue(date) {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
            d.getHours()
        )}:${pad2(d.getMinutes())}`;
    }

    _openAddEventAt(date) {
        if (!date) return;
        const start = new Date(date);
        if (Number.isNaN(start.getTime())) return;
        const minutes = Number(this._defaultEventMinutes || 30);
        const end = new Date(start.getTime() + minutes * 60 * 1000);
        this._closeAllDialogs();
        this._dialogOpen = true;
        this._dialogMode = 'calendar';
        this._dialogTitle = 'Add event';
        this._dialogItem = null;
        this._dialogEntity = '';
        this._dialogStartValue = this._toLocalDateTimeValue(start);
        this._dialogEndValue = this._toLocalDateTimeValue(end);
    }

    _openTodoAddForEntity(entityId) {
        this._closeAllDialogs();
        this._dialogOpen = true;
        this._dialogMode = 'todo';
        this._dialogTitle = 'Add chore';
        this._dialogItem = null;
        this._dialogEntity = entityId || '';
    }

    _openTodoAddForPerson(personId, fallbackEntityId) {
        const todos = Array.isArray(this._config?.todos) ? this._config.todos : [];
        const target = this._normalisePersonId(personId);
        let entityId = fallbackEntityId || '';
        if (target) {
            const match = todos.find((t) => {
                const mappedId = this._normalisePersonId(this._personIdForConfig(t, t.entity));
                return mappedId && mappedId === target;
            });
            if (match?.entity) entityId = match.entity;
        }
        this._openTodoAddForEntity(entityId);
    }

    _onAddCalendar = async (ev) => {
        const { entityId, summary, start, end } = ev?.detail || {};
        if (!entityId || !summary || !start || !end) return;
        if (!this._calendarSupports(entityId, CALENDAR_FEATURES.CREATE)) return;
        const optimistic = this._optimisticCalendarAdd(entityId, {
            summary,
            start,
            end,
            allDay: false,
        });
        try {
            await this._calendarService.createEvent(this._hass, entityId, { summary, start, end });
        } catch (error) {
            this._optimisticCalendarRemove(entityId, optimistic);
            this._showErrorToast('Add event');
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
            _fbKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
    }

    _buildTodoItemWithDue(text, dueDate) {
        const item = this._buildTodoItem(text);
        if (dueDate) {
            item.due = { date: dueDate };
            item.due_date = dueDate;
        }
        return item;
    }

    _todoRepeatKeyFromText(text) {
        return String(text || '').trim().toLowerCase();
    }

    _todoRepeatsForEntity(entityId) {
        const allRepeats = this._config?.todo_repeats || {};
        return allRepeats?.[entityId] || {};
    }

    _getTodoRepeat(entityId, item) {
        if (!entityId || !item) return '';
        const key = this._todoRepeatKeyFromText(
            item.summary || item.name || item.item || ''
        );
        const repeats = this._todoRepeatsForEntity(entityId);
        return repeats?.[key]?.cadence || '';
    }

    _setTodoRepeat(entityId, text, cadence) {
        if (!entityId || !text) return;
        const key = this._todoRepeatKeyFromText(text);
        const current = this._config?.todo_repeats || {};
        const entityRepeats = { ...(current[entityId] || {}) };
        entityRepeats[key] = { cadence };
        const next = { ...current, [entityId]: entityRepeats };
        this._updateConfigPartial({ todo_repeats: next });
    }

    _clearTodoRepeat(entityId, text) {
        if (!entityId || !text) return;
        const key = this._todoRepeatKeyFromText(text);
        const current = this._config?.todo_repeats || {};
        if (!current[entityId]?.[key]) return;
        const entityRepeats = { ...(current[entityId] || {}) };
        delete entityRepeats[key];
        const next = { ...current, [entityId]: entityRepeats };
        this._updateConfigPartial({ todo_repeats: next });
    }

    _nextRepeatDate(date, cadence) {
        if (!date || Number.isNaN(date.getTime())) return null;
        const next = new Date(date);
        if (cadence === 'daily') return addDays(next, 1);
        if (cadence === 'weekly') return addDays(next, 7);
        if (cadence === 'biweekly') return addDays(next, 14);
        if (cadence === 'monthly') {
            const month = next.getMonth();
            next.setMonth(month + 1);
            return next;
        }
        return null;
    }

    _repeatForTodo(entityId, item) {
        if (!entityId || !item) return null;
        const key = this._todoRepeatKeyFromText(
            item.summary || item.name || item.item || ''
        );
        const repeats = this._todoRepeatsForEntity(entityId);
        return repeats?.[key] || null;
    }

    _todoItemKey(item) {
        if (!item || typeof item !== 'object') return '';
        return (
            item.id ||
            item.uid ||
            item._fbKey ||
            item.item ||
            item.summary ||
            item.name ||
            ''
        );
    }

    _optimisticTodoAdd(entityId, text, dueDate) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const next = dueDate ? this._buildTodoItemWithDue(text, dueDate) : this._buildTodoItem(text);
        list.push(next);
        this._todoItems = { ...(this._todoItems || {}), [entityId]: list };
        this._todoRenderTick += 1;
        this.requestUpdate();
        return next;
    }

    _optimisticTodoUpdate(entityId, item, text, dueDate) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const targetKey = this._todoItemKey(item);
        const nextList = list.map((entry) => {
            if (entry === item) {
                const next = {
                    ...entry,
                    summary: text,
                    name: text,
                    item: text,
                };
                if (dueDate) {
                    next.due = { date: dueDate };
                    next.due_date = dueDate;
                }
                return next;
            }
            if (!targetKey) return entry;
            if (this._todoItemKey(entry) !== targetKey) return entry;
            const next = {
                ...entry,
                summary: text,
                name: text,
                item: text,
            };
            if (dueDate) {
                next.due = { date: dueDate };
                next.due_date = dueDate;
            }
            return next;
        });
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this._todoRenderTick += 1;
        this.requestUpdate();
    }

    _optimisticTodoRemove(entityId, item) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? this._todoItems[entityId]
            : [];
        const targetKey = this._todoItemKey(item);
        const nextList = list.filter((entry) => {
            if (entry === item) return false;
            if (!targetKey) return true;
            return this._todoItemKey(entry) !== targetKey;
        });
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this._todoRenderTick += 1;
        this.requestUpdate();
    }

    _optimisticTodoStatus(entityId, item, completed) {
        const list = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        const targetKey = this._todoItemKey(item);
        const nextList = list.map((entry) => {
            if (entry === item) {
                return { ...entry, status: completed ? 'completed' : 'needs_action' };
            }
            if (!targetKey) return entry;
            if (this._todoItemKey(entry) !== targetKey) return entry;
            return { ...entry, status: completed ? 'completed' : 'needs_action' };
        });
        this._todoItems = { ...(this._todoItems || {}), [entityId]: nextList };
        this._todoRenderTick += 1;
        this.requestUpdate();
    }

    _onAddTodo = async (ev) => {
        const { entityId, text, dueDate, repeat } = ev?.detail || {};
        if (!entityId || !text) return;
        const optimistic = this._optimisticTodoAdd(entityId, text, dueDate);
        try {
            await this._todoService.addItem(this._hass, entityId, text, {
                dueDate: dueDate || '',
            });
            if (repeat) {
                this._setTodoRepeat(entityId, text, repeat);
            } else {
                this._clearTodoRepeat(entityId, text);
            }
        } catch (error) {
            this._optimisticTodoRemove(entityId, optimistic);
            this._showErrorToast('Add chore');
        }
    };

    _onAddShopping = async (ev) => {
        const { text } = ev?.detail || {};
        if (!text) return;
        await this._addShoppingItem(text);
    };

    _onAddHomeControl = async (ev) => {
        const entityId = ev?.detail?.entityId;
        if (!entityId) return;
        if (!this._hasAdminAccess()) return;
        const controls = Array.isArray(this._config?.home_controls)
            ? this._config.home_controls
            : [];
        if (controls.includes(entityId)) {
            this._showToast('Already added');
            return;
        }
        await this._updateConfigPartial({ home_controls: [...controls, entityId] });
    };

    _onEditTodo = async (ev) => {
        const { entityId, item, text, dueDate, repeat } = ev?.detail || {};
        if (!entityId || !item || !text) return;
        const previous = {
            summary: item.summary,
            name: item.name,
            item: item.item,
        };
        const previousText = previous.summary ?? previous.name ?? previous.item ?? '';
        this._optimisticTodoUpdate(entityId, item, text, dueDate);
        try {
            await this._todoService.renameItem(this._hass, entityId, item, text, {
                dueDate: dueDate || '',
            });
            if (previousText && previousText !== text) {
                this._clearTodoRepeat(entityId, previousText);
            }
            if (repeat) this._setTodoRepeat(entityId, text, repeat);
            else this._clearTodoRepeat(entityId, text);
        } catch (error) {
            this._optimisticTodoUpdate(
                entityId,
                item,
                previousText,
                dueDate
            );
            this._showErrorToast('Edit chore');
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

    async _openManageSources() {
        if (!this._hasAdminAccess()) return;
        this._closeAllDialogs();
        await this._refreshStoredConfig();
        this._sourcesOpen = true;
    }

    _onSourcesSave = async (ev) => {
        const next = ev?.detail?.config;
        if (!next) return;
        const sharedBase = this._sharedConfig || this._config || {};
        const nextShared = { ...sharedBase, ...next };
        this._sharedConfig = nextShared;
        this._applyConfigImmediate(nextShared, { useDefaults: false });
        await this._refreshAll();
        const result = await this._persistConfig(nextShared);
        if (result?.mode === 'local') {
            this._showToast('Saved', 'Saved on this device');
        } else {
            this._showToast('Saved');
        }
        this.requestUpdate();
    };

    async _updateConfigPartial(patch) {
        if (!patch) return;
        const deviceKeys = new Set([
            'day_start_hour',
            'day_end_hour',
            'px_per_hour',
            'refresh_interval_ms',
            'accent_teal',
            'accent_lilac',
            'background_theme',
            'debug',
            'people_display',
        ]);
        const devicePatch = {};
        const sharedPatch = {};
        for (const [key, value] of Object.entries(patch)) {
            if (deviceKeys.has(key)) devicePatch[key] = value;
            else sharedPatch[key] = value;
        }

        if (Object.keys(devicePatch).length) {
            if (devicePatch.day_start_hour !== undefined)
                this._deviceDayStartHour = Number(devicePatch.day_start_hour);
            if (devicePatch.day_end_hour !== undefined)
                this._deviceDayEndHour = Number(devicePatch.day_end_hour);
            if (devicePatch.px_per_hour !== undefined)
                this._devicePxPerHour = Number(devicePatch.px_per_hour);
            if (devicePatch.refresh_interval_ms !== undefined)
                this._deviceRefreshMs = Number(devicePatch.refresh_interval_ms);
            if (devicePatch.accent_teal !== undefined)
                this._deviceAccentTeal = devicePatch.accent_teal || '';
            if (devicePatch.accent_lilac !== undefined)
                this._deviceAccentLilac = devicePatch.accent_lilac || '';
            if (devicePatch.background_theme !== undefined)
                this._deviceBackgroundTheme = devicePatch.background_theme || '';
            if (devicePatch.debug !== undefined)
                this._deviceDebug = Boolean(devicePatch.debug);
            if (devicePatch.people_display !== undefined)
                this._devicePeopleDisplay = Array.isArray(devicePatch.people_display)
                    ? devicePatch.people_display
                    : [];
            this._savePrefs();
        }

        const sharedBase = this._sharedConfig || this._config || {};
        const nextShared = { ...sharedBase, ...sharedPatch };
        this._sharedConfig = nextShared;
        this._applyConfigImmediate(nextShared, { useDefaults: false });
        await this._refreshAll();
        if (Object.keys(sharedPatch).length) {
            const result = await this._persistConfig(nextShared);
            if (result?.mode === 'local') {
                this._showToast('Saved', 'Saved on this device');
            } else {
                this._showToast('Saved');
            }
        } else {
            this._showToast('Saved', 'Saved on this device');
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
        this._dialogStartValue = '';
        this._dialogEndValue = '';
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
        if (!this._hasAdminAccess()) return;
        fireEvent(this, 'll-edit-card', { card: this });
    };

    async _toggleTodoItem(entityId, item, completed) {
        if (!entityId || !item) return;
        const previous = item.status;
        const previousDone =
            ['completed', 'done'].includes(String(previous || '').toLowerCase()) ||
            Boolean(item.completed);
        const hasStableId = Boolean(item.id || item.uid);
        let shouldRefresh = false;
        this._optimisticTodoStatus(entityId, item, completed);
        try {
            await this._todoService.setStatus(this._hass, entityId, item, completed);
            if (completed) {
                const repeat = this._repeatForTodo(entityId, item);
                if (repeat?.cadence) {
                    const due = item.due || item.due_date || item.due_datetime;
                    const dueValue = due?.date || due?.dateTime || due;
                    const dueDate = dueValue ? new Date(dueValue) : null;
                    if (dueDate && !Number.isNaN(dueDate.getTime())) {
                        const nextDate = this._nextRepeatDate(dueDate, repeat.cadence);
                        if (nextDate) {
                            const yyyy = nextDate.getFullYear();
                            const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(nextDate.getDate()).padStart(2, '0');
                            const dueDateStr = `${yyyy}-${mm}-${dd}`;
                            const text =
                                item.summary || item.name || item.item || '(Todo)';
                            await this._todoService.addItem(this._hass, entityId, text, {
                                dueDate: dueDateStr,
                            });
                            this._optimisticTodoAdd(entityId, text, dueDateStr);
                        }
                    }
                }
            }
        } catch (error) {
            if (!hasStableId) {
                try {
                    const items = await this._todoService.fetchItems(this._hass, entityId);
                    const targetKey = this._todoItemKey(item);
                    const targetText = String(item.summary || item.name || item.item || '').trim();
                    const match = items.find((entry) => {
                        if (targetKey && this._todoItemKey(entry) === targetKey) return true;
                        if (!targetText) return false;
                        const text = String(
                            entry.summary || entry.name || entry.item || ''
                        ).trim();
                        return text && text.toLowerCase() === targetText.toLowerCase();
                    });
                    if (match) {
                        await this._todoService.setStatus(this._hass, entityId, match, completed);
                        return;
                    }
                } catch {
                    // fall through to revert + error
                }
            }
            const text = String(item.summary || item.name || item.item || '').trim();
            if (this._isMissingTodoItemError(error)) {
                if (!completed && text) {
                    try {
                        await this._todoService.addItem(this._hass, entityId, text);
                        return;
                    } catch {
                        // fall through to revert + error
                    }
                }
                if (completed && !hasStableId) {
                    this._queueTodoStatusRetry(entityId, item, completed, previousDone);
                    return;
                }
            }
            this._optimisticTodoStatus(entityId, item, previousDone);
            this._showErrorToast('Update chore');
            shouldRefresh = true;
        } finally {
            if (shouldRefresh) {
                await this._refreshTodoEntity(entityId);
            }
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
        const previousList = Array.isArray(this._todoItems?.[entityId])
            ? [...this._todoItems[entityId]]
            : [];
        this._optimisticTodoRemove(entityId, item);
        try {
            await this._todoService.removeItem(this._hass, entityId, item);
        } catch (error) {
            this._restoreTodoList(entityId, previousList);
            this._showErrorToast('Delete chore');
        } finally {
            await this._refreshTodoEntity(entityId);
        }
    }

    _queueTodoStatusRetry(entityId, item, completed, previousDone) {
        if (!entityId || !item) return;
        if (!this._todoStatusRetryTimers) this._todoStatusRetryTimers = new Map();
        const key = `${entityId}:${this._todoItemKey(item)}`;
        if (this._todoStatusRetryTimers.has(key)) return;
        const text = String(item.summary || item.name || item.item || '').trim();
        const timer = setTimeout(async () => {
            this._todoStatusRetryTimers.delete(key);
            try {
                const items = await this._todoService.fetchItems(this._hass, entityId);
                const targetKey = this._todoItemKey(item);
                const targetText = text;
                const match = items.find((entry) => {
                    if (targetKey && this._todoItemKey(entry) === targetKey) return true;
                    if (!targetText) return false;
                    const entryText = String(
                        entry.summary || entry.name || entry.item || ''
                    ).trim();
                    return entryText && entryText.toLowerCase() === targetText.toLowerCase();
                });
                if (match) {
                    await this._todoService.setStatus(
                        this._hass,
                        entityId,
                        match,
                        completed
                    );
                    return;
                }
                if (!completed && targetText) {
                    await this._todoService.addItem(this._hass, entityId, targetText);
                    return;
                }
                throw new Error('Unable to find to-do list item');
            } catch {
                this._optimisticTodoStatus(entityId, item, previousDone);
                this._showErrorToast('Update chore');
                await this._refreshTodoEntity(entityId);
            }
        }, 600);
        this._todoStatusRetryTimers.set(key, timer);
    }

    async _clearCompletedTodos(entityId) {
        if (!entityId) return;
        try {
            await this._todoService.clearCompleted(this._hass, entityId);
        } catch (error) {
            this._showErrorToast('Clear completed chores');
        } finally {
            this._queueRefresh();
        }
    }

    async _addShoppingItem(text) {
        const parsed = this._parseShoppingText(text);
        const base = parsed.base;
        if (!base) return;
        const existing = this._findShoppingItemByName(base);
        if (existing) {
            const nextQty = existing.parsed.qty + parsed.qty;
            const nextText = this._formatShoppingText(existing.parsed.base, nextQty);
            await this._updateShoppingItemText(existing.item, nextText);
            return;
        }
        const formatted = this._formatShoppingText(base, parsed.qty);
        const optimistic = this._optimisticShoppingAdd(formatted);
        try {
            await this._shoppingService.addItem(this._hass, this._config?.shopping, formatted);
        } catch (error) {
            this._optimisticShoppingRemove(optimistic);
            this._showErrorToast('Add shopping item');
        } finally {
            await this._refreshShopping();
        }
    }

    async _addShoppingFavourites() {
        const favs = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
        const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
        const items = [];
        const seen = new Set();
        for (const item of [...favs, ...common]) {
            const text = String(item || '').trim();
            if (!text) continue;
            const key = text.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            items.push(text);
        }
        for (const item of items) {
            await this._addShoppingItem(item);
        }
    }

    async _clearShoppingList() {
        const list = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
        if (!list.length) return;
        this._shoppingItems = [];
        this.requestUpdate();
        const results = await Promise.allSettled(
            list.map((item) =>
                this._shoppingService.removeItem(this._hass, this._config?.shopping, item)
            )
        );
        const failed = [];
        results.forEach((result, idx) => {
            if (result.status !== 'rejected') return;
            if (this._isMissingTodoItemError(result.reason)) return;
            failed.push(list[idx]);
        });
        if (failed.length) {
            this._shoppingItems = failed;
            this._showErrorToast('Clear shopping list');
        }
        await this._refreshShopping();
    }

    async _toggleShoppingItem(item, completed) {
        if (!item) return;
        const previousStatus = item.status;
        let ok = false;
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
            ok = true;
        } catch (error) {
            const wasComplete = ['completed', 'done'].includes(
                String(previousStatus || '').toLowerCase()
            );
            this._optimisticShoppingStatus(item, wasComplete);
            this._clearShoppingRemoval(item);
            this._showErrorToast('Update shopping item');
        } finally {
            if (ok && completed) {
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
        const previousList = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
        this._clearShoppingRemoval(item);
        this._optimisticShoppingRemove(item);
        try {
            await this._shoppingService.removeItem(this._hass, this._config?.shopping, item);
        } catch (error) {
            if (!this._isMissingTodoItemError(error)) {
                this._restoreShoppingList(previousList);
                this._showErrorToast('Delete shopping item');
            }
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
            adminUnlocked: Boolean(this._adminUnlocked),
            defaultView: this._defaultView || 'schedule',
            lastView: this._screen || this._defaultView || 'schedule',
            dayStartHour: this._deviceDayStartHour ?? null,
            dayEndHour: this._deviceDayEndHour ?? null,
            pxPerHour: this._devicePxPerHour ?? null,
            refreshIntervalMs: this._deviceRefreshMs ?? null,
            accentTeal: this._deviceAccentTeal ?? null,
            accentLilac: this._deviceAccentLilac ?? null,
            backgroundTheme: this._deviceBackgroundTheme ?? null,
            debug: this._deviceDebug ?? null,
            peopleDisplay: Array.isArray(this._devicePeopleDisplay)
                ? this._devicePeopleDisplay
                : null,
        });
    }

    _resetPrefsToDefaults() {
        const userId = this._hass?.user?.id;
        if (!userId) return;
        savePrefs(userId, {});
        this._prefsLoaded = false;
        this._personFilterSet = new Set();
        this._useMobileView = getDeviceKind() === 'mobile';
        this._sidebarCollapsed = false;
        this._adminUnlocked = false;
        this._defaultView = 'schedule';
        this._deviceDayStartHour = null;
        this._deviceDayEndHour = null;
        this._devicePxPerHour = null;
        this._deviceRefreshMs = null;
        this._deviceAccentTeal = null;
        this._deviceAccentLilac = null;
        this._deviceBackgroundTheme = null;
        this._deviceDebug = null;
        this._devicePeopleDisplay = null;
        this._slotMinutes = 30;
        this._defaultEventMinutes = 30;
        this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
        this._shoppingFavourites = [];
        this._loadPrefs();
        this._applyConfigImmediate(this._config || {}, { useDefaults: true, refresh: true });
        this.requestUpdate();
    }

    _setDefaultViewPref(view) {
        if (!['schedule', 'important', 'chores', 'shopping', 'home', 'settings'].includes(view))
            return;
        this._defaultView = view;
        this._savePrefs();
    }

    _setSidebarCollapsedPref(collapsed) {
        this._sidebarCollapsed = Boolean(collapsed);
        this._savePrefs();
        this.requestUpdate();
    }

    _hasAdminAccess() {
        return Boolean(this._hass?.user?.is_admin || this._adminUnlocked);
    }

    _tryAdminUnlock(pin) {
        const configured = String(this._config?.admin_pin || '');
        if (!configured) {
            this._showToast('No admin PIN set');
            return false;
        }
        if (String(pin || '') === configured) {
            this._adminUnlocked = true;
            this._savePrefs();
            this._showToast('Admin access unlocked');
            this.requestUpdate();
            return true;
        }
        this._showErrorToast('Invalid PIN');
        return false;
    }

    _lockAdminAccess() {
        this._adminUnlocked = false;
        this._savePrefs();
        this._showToast('Admin access locked');
        this.requestUpdate();
    }

    async _setAdminPin(pin) {
        const trimmed = String(pin || '').trim();
        await this._updateConfigPartial({ admin_pin: trimmed || '' });
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

    async _setDayRange({ startHour, endHour }) {
        const slotMinutes = Number(this._slotMinutes || 30);
        const minGapHours = slotMinutes / 60;
        const start = Math.min(24, Math.max(0, Number(startHour)));
        const end = Math.min(24, Math.max(0, Number(endHour)));
        if (!Number.isFinite(start) || !Number.isFinite(end)) return;
        if (end <= start + minGapHours) {
            this._showErrorToast('Invalid time range');
            return;
        }
        await this._updateConfigPartial({
            day_start_hour: start,
            day_end_hour: end,
        });
    }

    _toggleShoppingFavourite(name) {
        const parsed = this._parseShoppingText(name);
        const text = String(parsed.base || '').trim();
        if (!text) return;
        const key = text.toLowerCase();
        const favs = Array.isArray(this._shoppingFavourites) ? this._shoppingFavourites : [];
        const common = Array.isArray(this._shoppingCommon) ? this._shoppingCommon : [];
        const exists =
            favs.some((item) => String(item).toLowerCase() === key) ||
            common.some((item) => String(item).toLowerCase() === key);
        if (exists) {
            this._shoppingFavourites = favs.filter(
                (item) => String(item).toLowerCase() !== key
            );
            this._shoppingCommon = common.filter((item) => String(item).toLowerCase() !== key);
        } else {
            this._shoppingFavourites = [text, ...favs];
            this._trackShoppingCommon(text);
        }
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

    _resetShoppingFavouritesDefaults() {
        this._shoppingFavourites = [];
        this._shoppingCommon = DEFAULT_COMMON_ITEMS.slice();
        this._savePrefs();
        this.requestUpdate();
    }

    _clearShoppingFavourites() {
        this._shoppingFavourites = [];
        this._shoppingCommon = [];
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
        const previousText = this._shoppingItemText(item);
        this._optimisticShoppingUpdate(item, text);
        const supportsUpdate = this._supportsService('todo', 'update_item');
        try {
            if (supportsUpdate) {
                await this._shoppingService.updateItem(
                    this._hass,
                    this._config?.shopping,
                    previousText,
                    {
                        rename: text,
                    }
                );
            } else {
                await this._shoppingService.removeItem(
                    this._hass,
                    this._config?.shopping,
                    previousText
                );
                await this._shoppingService.addItem(this._hass, this._config?.shopping, text);
            }
        } catch (error) {
            if (this._isMissingTodoItemError(error)) {
                await this._refreshShopping();
                return;
            }
            if (previousText) this._optimisticShoppingUpdate(item, previousText);
            this._showErrorToast('Edit shopping item');
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
        const previousList = Array.isArray(this._shoppingItems) ? [...this._shoppingItems] : [];
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
                } catch (error) {
                    if (!this._isMissingTodoItemError(error)) {
                        this._restoreShoppingList(previousList);
                        this._showErrorToast('Remove shopping item');
                    }
                } finally {
                    if (this._shoppingRemoveTimers) this._shoppingRemoveTimers.delete(item);
                    await this._refreshShopping();
                }
            }, 300);
        }, 10_000);
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

    _binIndicators() {
        const today = startOfDay(new Date());
        const tomorrow = addDays(today, 1);
        const todayBins = this._binsDueOn(today);
        const tomorrowBins = this._binsDueOn(tomorrow);
        return { today: todayBins, tomorrow: tomorrowBins };
    }

    _binsDueOn(date) {
        const bins = Array.isArray(this._config?.bins) ? this._config.bins : [];
        const schedule = this._config?.bin_schedule || {};
        const mode = schedule.mode || 'simple';
        const activeBins = bins.filter((b) => b && b.enabled !== false);
        if (!activeBins.length) return [];
        const day = startOfDay(date);

        if (mode === 'rotation') {
            const rotation = schedule.rotation || {};
            const weekday = Number(rotation.weekday);
            if (!Number.isFinite(weekday)) return [];
            const anchor = rotation.anchor_date ? new Date(rotation.anchor_date) : null;
            if (!anchor || Number.isNaN(anchor.getTime())) return [];
            const weeks = Array.isArray(rotation.weeks) ? rotation.weeks : [];
            if (!weeks.length) return [];
            if (day.getDay() !== weekday) return [];
            const anchorStart = startOfDay(anchor);
            const diffMs = day.getTime() - anchorStart.getTime();
            const weeksDiff = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
            if (weeksDiff < 0) return [];
            const index = weeksDiff % weeks.length;
            const binsForWeek = Array.isArray(weeks[index]?.bins)
                ? weeks[index].bins
                : [];
            const allowed = new Set(binsForWeek);
            return activeBins.filter((b) => allowed.has(b.id));
        }

        const simple = schedule.simple || {};
        return activeBins.filter((bin) => {
            const cfg = simple?.[bin.id] || {};
            const weekday = Number(cfg.weekday);
            const every = Number(cfg.every) || 1;
            if (!Number.isFinite(weekday)) return false;
            if (!cfg.anchor_date) return false;
            const anchor = new Date(cfg.anchor_date);
            if (Number.isNaN(anchor.getTime())) return false;
            if (day.getDay() !== weekday) return false;
            const anchorStart = startOfDay(anchor);
            const diffMs = day.getTime() - anchorStart.getTime();
            const weeksDiff = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
            if (weeksDiff < 0) return false;
            return weeksDiff % every === 0;
        });
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
        const previous = {
            summary: event.summary,
            start: event._start,
            end: event._end,
            allDay: event.all_day,
        };
        this._optimisticCalendarUpdate(entityId, event, { summary, start, end, allDay });
        try {
            await this._calendarService.updateEvent(this._hass, entityId, event, {
                summary,
                start,
                end,
                allDay,
            });
        } catch (error) {
            this._optimisticCalendarUpdate(entityId, event, {
                summary: previous.summary,
                start: previous.start,
                end: previous.end,
                allDay: previous.allDay,
            });
            this._showErrorToast('Edit event');
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
        } catch (error) {
            this._restoreCalendarEvent(entityId, event);
            this._showErrorToast('Delete event');
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
                if (p.text_color) push(`    text_color: '${p.text_color}'`);
                if (p.role) push(`    role: ${p.role}`);
                if (p.header_row) push(`    header_row: ${p.header_row}`);
            }
        }
        const peopleDisplay = Array.isArray(draft.people_display) ? draft.people_display : [];
        if (peopleDisplay.length) {
            push(`people_display:`);
            for (const id of peopleDisplay) {
                push(`  - ${id}`);
            }
        }

        if (draft.admin_pin !== undefined) {
            push(`admin_pin: '${draft.admin_pin}'`);
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

        const homeControls = Array.isArray(draft.home_controls) ? draft.home_controls : [];
        if (homeControls.length) {
            push(`home_controls:`);
            for (const eid of homeControls) {
                push(`  - ${eid}`);
            }
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
        this._sharedConfig = resolved;
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

    async _refreshStoredConfig() {
        if (!this._hass) return;
        const ws = await this._callWsGet();
        if (this._configHasData(ws)) {
            this._persistMode = 'ws';
            this._storedConfig = ws;
            this._storageLoaded = true;
            this._resolveConfig({ refresh: true });
            return;
        }
        const local = this._loadLocalConfig();
        if (this._configHasData(local)) {
            this._persistMode = 'local';
            this._storedConfig = local;
            this._storageLoaded = true;
            this._resolveConfig({ refresh: true });
        }
    }

    async _getStoredConfig() {
        const ws = await this._callWsGet();
        const local = this._loadLocalConfig();
        if (this._configHasData(ws)) {
            this._persistMode = 'ws';
            return ws;
        }
        if (this._configHasData(local)) {
            this._persistMode = 'local';
            return local;
        }
        if (ws) {
            this._persistMode = 'ws';
            return ws;
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
        if (override.home_controls) merged.home_controls = override.home_controls;
        if (override.title !== undefined) merged.title = override.title;
        if (override.admin_pin !== undefined) merged.admin_pin = override.admin_pin;
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

    _configHasData(config) {
        if (!config || typeof config !== 'object') return false;
        if (Object.keys(config).length === 0) return false;
        return true;
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
            this._saveLocalConfig(config);
            this._storedConfig = config;
            this._sharedConfig = config;
            this._storageLoaded = true;
            debugLog(this._debug, 'persistConfig', { mode: 'ws' });
            return { ok: true, mode: 'ws' };
        }
        this._persistMode = 'local';
        this._saveLocalConfig(config);
        this._storedConfig = config;
        this._sharedConfig = config;
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

    _showErrorToast(action, detail = '') {
        const message = action ? `${action} failed` : 'Action failed';
        this._showToast(message, detail);
    }

    _isMissingTodoItemError(error) {
        const msg = String(error?.message || error || '').toLowerCase();
        return msg.includes('unable to find to-do list item');
    }

    _shouldNotifyError(key, intervalMs = 30_000) {
        if (!key) return false;
        const now = Date.now();
        const last = this._errorToastTs?.get(key) || 0;
        if (now - last < intervalMs) return false;
        if (this._errorToastTs) this._errorToastTs.set(key, now);
        return true;
    }

    _restoreCalendarEvent(entityId, event) {
        if (!entityId || !event) return;
        const list = Array.isArray(this._eventsByEntity?.[entityId])
            ? [...this._eventsByEntity[entityId]]
            : [];
        if (!list.includes(event)) list.push(event);
        this._eventsByEntity = { ...(this._eventsByEntity || {}), [entityId]: list };
        this._eventsVersion = (this._eventsVersion || 0) + 1;
        this.requestUpdate();
    }

    _restoreTodoList(entityId, list) {
        if (!entityId || !Array.isArray(list)) return;
        this._todoItems = { ...(this._todoItems || {}), [entityId]: list };
        this.requestUpdate();
    }

    _restoreShoppingList(list) {
        if (!Array.isArray(list)) return;
        this._shoppingItems = list;
        this.requestUpdate();
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
        const merged = { ...(config || {}) };
        if (this._deviceDayStartHour !== null) merged.day_start_hour = this._deviceDayStartHour;
        if (this._deviceDayEndHour !== null) merged.day_end_hour = this._deviceDayEndHour;
        if (this._devicePxPerHour !== null) merged.px_per_hour = this._devicePxPerHour;
        if (this._deviceRefreshMs !== null) merged.refresh_interval_ms = this._deviceRefreshMs;
        if (this._deviceAccentTeal !== null) merged.accent_teal = this._deviceAccentTeal;
        if (this._deviceAccentLilac !== null) merged.accent_lilac = this._deviceAccentLilac;
        if (this._deviceBackgroundTheme !== null)
            merged.background_theme = this._deviceBackgroundTheme;
        if (this._deviceDebug !== null) merged.debug = this._deviceDebug;
        if (Array.isArray(this._devicePeopleDisplay))
            merged.people_display = this._devicePeopleDisplay;

        this._config = merged;
        this._debug = Boolean(merged.debug);

        const dayStart = useDefaults ? 6 : this._dayStartHour ?? 6;
        const dayEnd = useDefaults ? 24 : this._dayEndHour ?? 24;
        const slotMinutes = useDefaults ? 30 : this._slotMinutes ?? 30;
        const pxPerHour = useDefaults ? 120 : this._pxPerHour ?? 120;
        const refreshMs = useDefaults ? 300_000 : this._refreshIntervalMs ?? 300_000;

        this._dayStartHour = merged.day_start_hour ?? dayStart;
        this._dayEndHour = merged.day_end_hour ?? dayEnd;
        this._slotMinutes = merged.slot_minutes ?? slotMinutes;
        this._pxPerHour = merged.px_per_hour ?? pxPerHour;
        const daysToShow = merged.days_to_show ?? 5;
        this._daysToShow = daysToShow;
        this._scheduleDays = daysToShow;
        this._refreshIntervalMs = merged.refresh_interval_ms ?? refreshMs;

        const accentTeal =
            typeof merged.accent_teal === 'string' ? merged.accent_teal.trim() : '';
        if (accentTeal) {
            this.style.setProperty('--fb-accent-teal', accentTeal);
        } else {
            this.style.removeProperty('--fb-accent-teal');
        }
        const accentLilac =
            typeof merged.accent_lilac === 'string' ? merged.accent_lilac.trim() : '';
        if (accentLilac) {
            this.style.setProperty('--fb-accent', accentLilac);
        } else {
            this.style.removeProperty('--fb-accent');
        }
        const backgroundTheme =
            typeof merged.background_theme === 'string' ? merged.background_theme.trim() : '';
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
