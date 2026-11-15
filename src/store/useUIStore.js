import { create } from 'zustand';

const useUIStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Estado para manejar las pantallas
  currentView: 'tasks', // 'tasks', 'inbox', 'bot', 'bot_quotes', 'partners', 'crm', 'calendar', 'finances', 'reports', 'admin', 'manual'
  setCurrentView: (view) => set({ currentView: view }),

  // Estado global del Ayudante Inteligente Remex OS
  isCopilotOpen: false,
  setCopilotOpen: (open) => set({ isCopilotOpen: Boolean(open) }),
}));

export default useUIStore;
