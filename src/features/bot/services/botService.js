import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const N8N_BOT_API_URL = 'https://n8n.check-oil.tech/webhook/remex-bot-api';

/**
 * Obtiene todas las sesiones, configuración y estadísticas directamente desde el webhook API de n8n
 * (conectado a Firestore check-oil-bot).
 */
const LOCAL_BOT_CACHE_KEY = 'remex_bot_dashboard_cache_v21';

export const fetchBotDashboardFromN8n = async () => {
  try {
    const response = await fetch(N8N_BOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'get_all' }),
    });

    if (!response.ok) {
      throw new Error(`Error comunicando con n8n (${response.status})`);
    }

    const data = await response.json();
    if (Array.isArray(data?.sessions) && data.sessions.length > 0) {
      try {
        localStorage.setItem(LOCAL_BOT_CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
      return data;
    }

    // Si por algún motivo remoto vino vacío pero tenemos caché local previa, conservar caché
    const cachedRaw = localStorage.getItem(LOCAL_BOT_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (Array.isArray(cached?.sessions) && cached.sessions.length > 0) {
        return {
          ...cached,
          config: data?.config || cached.config,
          timestamp: data?.timestamp || cached.timestamp,
        };
      }
    }
    return data;
  } catch (err) {
    const cachedRaw = localStorage.getItem(LOCAL_BOT_CACHE_KEY);
    if (cachedRaw) {
      try {
        return JSON.parse(cachedRaw);
      } catch (e) {}
    }
    throw err;
  }
};

/**
 * Actualiza una sesión de cliente o la configuración global (__bot_config__) en n8n / Firestore,
 * y opcionalmente envía un mensaje directo de WhatsApp vía Evolution API.
 */
export const upsertBotDocumentInN8n = async (documentId, data, sendWhatsappText = '') => {
  const response = await fetch(N8N_BOT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'upsert',
      documentId,
      data: {
        ...data,
        documentId,
      },
      sendWhatsappText,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error guardando en n8n (${response.status})`);
  }

  // También guardamos respaldo en el Firestore local de Remex OS para trazabilidad
  try {
    await setDoc(
      doc(db, 'bot_sync_cache', documentId),
      {
        ...data,
        documentId,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('No se pudo guardar cache local en Firebase Remex OS:', e);
  }

  return await response.json();
};

/**
 * Suscripción opcional a la caché en Firestore de Remex OS
 */
export const subscribeToLocalBotCache = (callback) => {
  try {
    return onSnapshot(collection(db, 'bot_sync_cache'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    });
  } catch (e) {
    return () => {};
  }
};
