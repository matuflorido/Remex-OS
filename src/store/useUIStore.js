import { create } from 'zustand';

const useUIStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Estado para manejar las pantallas
  currentView: 'tasks', // Puede ser: 'tasks', 'crm', 'admin'
  setCurrentView: (view) => set({ currentView: view }),
}));

export default useUIStore;