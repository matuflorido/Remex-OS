import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { DEFAULT_BROKER_CONFIG } from './quoteBrokerEngine';

const N8N_BOT_API_URL = 'https://n8n.check-oil.tech/webhook/remex-bot-api';

/**
 * Obtiene todas las sesiones, configuración y estadísticas directamente desde el webhook API de n8n
 * (conectado a PostgreSQL checkoil_bot sin límites de cuota).
 */
const LOCAL_BOT_CACHE_KEY = 'remex_bot_dashboard_cache_v23';

// Guardia temporal de guardado para evitar que un poll en vuelo pise cambios recién hechos en bot_config_global
let lastConfigSaveMs = 0;
let lastConfigPatch = null;

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
    let localSyncCfg = {};
    try {
      const snap = await getDoc(doc(db, 'bot_sync_cache', 'bot_config_global'));
      if (snap.exists()) {
        localSyncCfg = snap.data() || {};
      }
    } catch (e) {}

    const recentOptimisticPatch =
      lastConfigPatch && Date.now() - lastConfigSaveMs < 20000 ? lastConfigPatch : {};

    const remoteConfig = {
      ...(data?.config || {}),
      ...recentOptimisticPatch,
    };

    const enrichedConfig = {
      ...DEFAULT_BROKER_CONFIG,
      ...localSyncCfg,
      ...remoteConfig,
      modo_presupuesto_intermediario:
        remoteConfig?.modo_presupuesto_intermediario ??
        localSyncCfg?.modo_presupuesto_intermediario ??
        DEFAULT_BROKER_CONFIG.modo_presupuesto_intermediario,
      fecha_inicio_intermediario:
        remoteConfig?.fecha_inicio_intermediario ??
        localSyncCfg?.fecha_inicio_intermediario ??
        DEFAULT_BROKER_CONFIG.fecha_inicio_intermediario,
      sucursales_intermediario_json:
        remoteConfig?.sucursales_intermediario_json ??
        localSyncCfg?.sucursales_intermediario_json ??
        DEFAULT_BROKER_CONFIG.sucursales_intermediario_json,
      sla_recordatorio_minutos:
        remoteConfig?.sla_recordatorio_minutos ??
        localSyncCfg?.sla_recordatorio_minutos ??
        DEFAULT_BROKER_CONFIG.sla_recordatorio_minutos,
      max_recordatorios_sla:
        remoteConfig?.max_recordatorios_sla ??
        localSyncCfg?.max_recordatorios_sla ??
        DEFAULT_BROKER_CONFIG.max_recordatorios_sla,
      horario_comercial_json:
        remoteConfig?.horario_comercial_json ??
        localSyncCfg?.horario_comercial_json ??
        DEFAULT_BROKER_CONFIG.horario_comercial_json
    };

    const finalPayload = {
      ...data,
      config: enrichedConfig
    };

    if (Array.isArray(finalPayload?.sessions) && finalPayload.sessions.length > 0) {
      try {
        localStorage.setItem(LOCAL_BOT_CACHE_KEY, JSON.stringify(finalPayload));
      } catch (e) {}
      return finalPayload;
    }

    // Si por algún motivo remoto vino vacío pero tenemos caché local previa, conservar caché
    const cachedRaw = localStorage.getItem(LOCAL_BOT_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (Array.isArray(cached?.sessions) && cached.sessions.length > 0) {
        return {
          ...cached,
          config: enrichedConfig,
          timestamp: data?.timestamp || cached.timestamp,
        };
      }
    }
    return finalPayload;
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
 * Actualiza una sesión de cliente o la configuración global (bot_config_global) en n8n / PostgreSQL,
 * y opcionalmente envía un mensaje directo de WhatsApp vía Evolution API.
 */
export const upsertBotDocumentInN8n = async (documentId, data, sendWhatsappText = '') => {
  if (documentId === 'bot_config_global' && data && typeof data === 'object') {
    lastConfigSaveMs = Date.now();
    lastConfigPatch = { ...(lastConfigPatch || {}), ...data };
  }

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
