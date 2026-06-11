import { create } from "zustand";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from "date-fns";

export type CalendarView = "year" | "month" | "week" | "day" | "agenda";

interface CalendarState {
  // Date and View
  currentDate: Date;
  currentView: CalendarView;
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: CalendarView) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
  navigateToday: () => void;

  // Calendars
  visibleCalendarIds: Set<string>;
  toggleCalendarVisibility: (id: string) => void;
  setAllCalendarsVisible: (ids: string[]) => void;

  // Modals
  isEventModalOpen: boolean;
  isCalendarModalOpen: boolean;
  selectedEventId: string | null;
  selectedCalendarId: string | null;
  selectedDate: Date | null;

  openEventModal: (eventId?: string, date?: Date) => void;
  closeEventModal: () => void;

  openCalendarModal: (calendarId?: string) => void;
  closeCalendarModal: () => void;

  isShareModalOpen: boolean;
  openShareModal: (calendarId: string) => void;
  closeShareModal: () => void;

  isImportModalOpen: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;

  isCalendarSidebarOpen: boolean;
  toggleCalendarSidebar: () => void;
  setCalendarSidebarOpen: (isOpen: boolean) => void;

  // Details Drawer
  isEventDrawerOpen: boolean;
  openEventDrawer: (eventId: string) => void;
  closeEventDrawer: () => void;

  // Search & Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  currentView: "month",

  setCurrentDate: (date) => set({ currentDate: date }),
  setCurrentView: (view) => set({ currentView: view }),

  navigateNext: () => {
    const { currentDate, currentView } = get();
    if (currentView === "year")
      set({ currentDate: addMonths(currentDate, 12) });
    else if (currentView === "month")
      set({ currentDate: addMonths(currentDate, 1) });
    else if (currentView === "week")
      set({ currentDate: addWeeks(currentDate, 1) });
    else if (currentView === "day" || currentView === "agenda")
      set({ currentDate: addDays(currentDate, 1) });
  },

  navigatePrev: () => {
    const { currentDate, currentView } = get();
    if (currentView === "year")
      set({ currentDate: subMonths(currentDate, 12) });
    else if (currentView === "month")
      set({ currentDate: subMonths(currentDate, 1) });
    else if (currentView === "week")
      set({ currentDate: subWeeks(currentDate, 1) });
    else if (currentView === "day" || currentView === "agenda")
      set({ currentDate: subDays(currentDate, 1) });
  },

  navigateToday: () => set({ currentDate: new Date() }),

  visibleCalendarIds: new Set<string>(),

  toggleCalendarVisibility: (id) =>
    set((state) => {
      const newVisible = new Set(state.visibleCalendarIds);
      if (newVisible.has(id)) {
        newVisible.delete(id);
      } else {
        newVisible.add(id);
      }
      return { visibleCalendarIds: newVisible };
    }),

  setAllCalendarsVisible: (ids) => set({ visibleCalendarIds: new Set(ids) }),

  isEventModalOpen: false,
  isCalendarModalOpen: false,
  selectedEventId: null,
  selectedCalendarId: null,
  selectedDate: null,

  openEventModal: (eventId, date) =>
    set({
      isEventModalOpen: true,
      selectedEventId: eventId || null,
      selectedDate: date || null,
    }),

  closeEventModal: () =>
    set({
      isEventModalOpen: false,
      selectedEventId: null,
      selectedDate: null,
    }),

  openCalendarModal: (calendarId) =>
    set({
      isCalendarModalOpen: true,
      selectedCalendarId: calendarId || null,
    }),

  closeCalendarModal: () =>
    set({
      isCalendarModalOpen: false,
      selectedCalendarId: null,
    }),

  isShareModalOpen: false,
  openShareModal: (calendarId) =>
    set({
      isShareModalOpen: true,
      selectedCalendarId: calendarId,
    }),

  closeShareModal: () =>
    set({
      isShareModalOpen: false,
      selectedCalendarId: null,
    }),

  isImportModalOpen: false,
  openImportModal: () => set({ isImportModalOpen: true }),
  closeImportModal: () => set({ isImportModalOpen: false }),

  isCalendarSidebarOpen: false,
  toggleCalendarSidebar: () =>
    set((state) => ({ isCalendarSidebarOpen: !state.isCalendarSidebarOpen })),
  setCalendarSidebarOpen: (isOpen) => set({ isCalendarSidebarOpen: isOpen }),

  isEventDrawerOpen: false,
  openEventDrawer: (eventId) =>
    set({
      isEventDrawerOpen: true,
      selectedEventId: eventId,
    }),
  closeEventDrawer: () =>
    set({
      isEventDrawerOpen: false,
      // We intentionally don't clear selectedEventId here so the drawer can animate out with data
    }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
