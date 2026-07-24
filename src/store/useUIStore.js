import { create } from 'zustand';

const useUIStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Estado para manejar las pantallas
  currentView: 'tasks', // Puede ser: 'tasks', 'crm', 'admin', 'inbox', etc.
  setCurrentView: (view) => set({ currentView: view }),

  // NUEVO: Memoria para abrir una tarea directamente desde el Inbox
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),
}));

export default useUIStore;