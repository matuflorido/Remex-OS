import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSettingsStore = create(
  persist(
    (set) => ({
      notificationLevel: 'all', // Puede ser: 'all', 'important', 'none'
      setNotificationLevel: (level) => set({ notificationLevel: level }),
    }),
    {
      name: 'remex-settings-storage', // Nombre con el que se guarda en el disco local
    }
  )
);

// ¡ESTA ES LA LÍNEA QUE FALTABA O ESTABA CON OTRO NOMBRE!
export default useSettingsStore;