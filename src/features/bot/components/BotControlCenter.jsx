import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  MessageSquare,
  Brain,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Send,
  Search,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Phone,
  Car,
  MapPin,
  Clock,
  Eye,
  Download,
  Copy,
  Calendar,
  BellRing,
  MessageCircleWarning,
  HelpCircle,
  Filter
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  fetchBotDashboardFromN8n,
  upsertBotDocumentInN8n
} from '../services/botService';
import { useAuthStore } from '../../../store/useAuthStore';
import HelpTooltip from '../../../components/ui/HelpTooltip';

const SUCURSALES_LIST = [
  { name: 'Centro (Bariloche)', key: 'Centro', phone: '5492944579792' },
  { name: 'Estadio (Bariloche)', key: 'Estadio', phone: '5492944638500' },
  { name: 'Ñireco (Bariloche)', key: 'Ñireco', phone: '5492944907667' },
  { name: 'Km13 (Bariloche)', key: 'Km13', phone: '5492944615570' },
  { name: 'Bolsón (El Bolsón)', key: 'Bolsón', phone: '5492944631155' },
  { name: 'Dominico (Avellaneda)', key: 'Dominico', phone: '5491161217529' }
];

const NON_DERIVED_REASONS = {
  no_respondio: {
    id: 'no_respondio',
    label: 'Nunca respondió tras consultar',
    shortBadge: 'No respondió más',
    color: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
    barColor: 'bg-amber-500',
    description: 'El cliente envió un saludo o primera pregunta, el bot le pidió datos del vehículo y el cliente no volvió a contestar.'
  },
  faltaron_datos: {
    id: 'faltaron_datos',
    label: 'Dejó a mitad de camino (Faltó sucursal/datos)',
    shortBadge: 'Faltó confirmar sucursal/datos',
    color: 'text-orange-300 bg-orange-500/20 border-orange-500/40',
    barColor: 'bg-orange-500',
    description: 'Conversó con el bot pero abandonó antes de elegir la sucursal específica o dejar su teléfono de contacto.'
  },
  buscaba_otra_cosa: {
    id: 'buscaba_otra_cosa',
    label: 'Buscaba otra cosa (Repuestos / Mecánica / Lámparas)',
    shortBadge: 'Buscaba otra cosa / Fuera de tema',
    color: 'text-rose-300 bg-rose-500/20 border-rose-500/40',
    barColor: 'bg-rose-500',
    description: 'Consultó por repuestos mecánicos, colocación de focos o servicios que no se realizan en esa sucursal.'
  },
  audio_imagen: {
    id: 'audio_imagen',
    label: 'Envió Audio o Foto sin pasar a texto',
    shortBadge: 'Envió Audio/Foto sin texto',
    color: 'text-purple-300 bg-purple-500/20 border-purple-500/40',
    barColor: 'bg-purple-500',
    description: 'El cliente envió un audio o imagen y no continuó escribiendo por texto o quedó esperando.'
  },
  sin_historial_antiguo: {
    id: 'sin_historial_antiguo',
    label: 'Registro antiguo (Pre-actualización sin detalle)',
    shortBadge: 'Antiguo sin detalle (Pre 15/10)',
    color: 'text-zinc-400 bg-zinc-800 border-zinc-700',
    barColor: 'bg-zinc-600',
    description: 'Contacto de semanas anteriores (antes de activar el nuevo guardado completo de charlas en n8n).'
  }
};

const SYSTEM_PROMPT_PREVIEW = `Eres el Asistente Virtual de Recepción y Derivación de Check-Oil, un centro especializado en lubricación y mantenimiento automotriz.

Tu tono debe ser amable, servicial y EXTREMADAMENTE DIRECTO. Mantén la interacción lo más corta posible. Agrupa las preguntas necesarias en un solo mensaje.
REGLA DE ORO DE COMPORTAMIENTO: IGNORA por completo emojis, stickers o mensajes de cortesía finales (como "ok", "gracias"). Si el cliente solo manda un sticker o un saludo de cierre, NO RESPONDAS.

DATOS AUTOMÁTICOS DEL CLIENTE (YA DETECTADOS POR WHATSAPP):
Teléfono de WhatsApp del cliente (YA DETECTADO): {{ $json.telefonoCliente }}
Nombre de perfil de WhatsApp del cliente (YA DETECTADO): {{ $json.pushName }}
REGLA CRÍTICA DE CERO FRICCIÓN: ESTÁ ESTRICTAMENTE PROHIBIDO pedirle al cliente su número de teléfono o su nombre para derivarlo. Usa directamente los datos detectados por WhatsApp.

SUCURSALES DISPONIBLES Y TELÉFONOS INTERNOS (NO LOS PREGUNTES):
Check Oil Suc. Centro (Bariloche): 5492944579792
Check Oil Suc. Estadio (Bariloche): 5492944638500
Check Oil Suc. Ñireco (Bariloche): 5492944907667
Check Oil Suc. Km13 (Bariloche): 5492944615570
Check Oil Suc. Bolsón (El Bolsón): 5492944631155
Check Oil Suc. Dominico (Avellaneda): 5491161217529

FLUJO DE CONVERSACIÓN:
PASO 1: SALUDO Y DESCUBRIMIENTO (según hora local AR).
PASO 2: EXTRACCIÓN DE DATOS DEL VEHÍCULO (Marca, Modelo, Año y Motor en una sola pregunta; inferir Marca si el modelo es inconfundible).
PASO 3: OFRECER ZONAS Y SUCURSAL.
PASO 4: DERIVACIÓN AUTOMÁTICA INMEDIATA (SIN PEDIR TELÉFONO NI NOMBRE) ejecutando Enviar_Derivacion_Sucursal con {{ $json.telefonoCliente }} y link https://wa.me/{{ $json.telefonoCliente }}.`;

/**
 * Clasifica por qué una sesión NO fue derivada a sucursal
 */
function classifyNonDerivedSession(session, historial = [], isDerived = false) {
  if (isDerived) {
    return null;
  }

  const allText = `${session.incompleta_motivo || ''} ${session.pregunta_detectada || ''} ${session.resumen_charla || ''} ${session.resumen_historico || ''} ${historial.map(m => m.texto || '').join(' ')}`.toLowerCase();
  const clientMsgs = historial.filter(m => m && m.rol === 'cliente');

  // 1. Si no tiene historial ni resumen (registros viejos previos al 15/10)
  if (historial.length === 0 && (!session.resumen_historico || session.resumen_historico === 'Sin datos previos disponibles')) {
    return {
      ...NON_DERIVED_REASONS.sin_historial_antiguo,
      detail: 'Sesión registrada en la versión anterior del bot (sin mensajes guardados en Firestore).'
    };
  }

  // 2. Si envió audio o imagen
  if (allText.includes('[audio') || allText.includes('[imagen') || allText.includes('audio inicial')) {
    return {
      ...NON_DERIVED_REASONS.audio_imagen,
      detail: session.incompleta_motivo || 'El cliente envió un audio o imagen y faltó completar los datos por escrito.'
    };
  }

  // 3. Si buscaba otra cosa (repuestos mecánicos, colocación de focos, fuera de contexto)
  if (
    session.estado_charla === 'fuera_de_contexto' ||
    session.fuera_de_contexto === 'si' ||
    /foco|lámpara|lampara|colocaci|freno|embrague|correa|distribuci|tren delantero|repuesto|bater[ií]a|cubierta|neum[aá]tico|mec[aá]nic/.test(allText)
  ) {
    return {
      ...NON_DERIVED_REASONS.buscaba_otra_cosa,
      detail: session.incompleta_motivo || session.pregunta_detectada || 'Consultó por un repuesto o servicio fuera de lubricentro estándar.'
    };
  }

  // 4. Si solo mandó 1 mensaje (saludo o pregunta suelta) y nunca más respondió
  if (clientMsgs.length <= 1) {
    const firstMsg = clientMsgs[0]?.texto ? `"${clientMsgs[0].texto.slice(0, 50)}"` : 'su saludo inicial';
    return {
      ...NON_DERIVED_REASONS.no_respondio,
      detail: `Escribió ${firstMsg} y no volvió a responder cuando el bot le consultó.`
    };
  }

  // 5. Si intercambió varios mensajes pero no llegó al Paso 5 (elegir sucursal / dar contacto)
  return {
    ...NON_DERIVED_REASONS.faltaron_datos,
    detail: session.incompleta_motivo || 'Avanzó en la conversación pero dejó de responder antes de confirmar sucursal o teléfono.'
  };
}

/**
 * Calcula etiquetas de fecha claras (Hoy, Ayer, Hace X días, +1 semana) y tiempo sin respuesta
 */
function analyzeSessionTiming(rawDateStr, historial = [], isDerived = false, isPaused = false) {
  const lastMsg = historial.length > 0 ? historial[historial.length - 1] : null;
  const effectiveDateStr = (lastMsg && lastMsg.fecha) || rawDateStr || '';
  const dateObj = effectiveDateStr ? new Date(effectiveDateStr) : null;

  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      effectiveDateStr: '',
      dateCategory: 'older',
      badgeLabel: 'Sin fecha',
      fullDateLabel: 'Fecha no registrada',
      elapsedText: '',
      minutesElapsed: 999999,
      needsFollowUp: false,
      followUpUrgent: false,
      followUpReason: ''
    };
  }

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - dateObj.getTime());
  const minutesElapsed = Math.floor(diffMs / (1000 * 60));
  const hoursElapsed = Math.floor(minutesElapsed / 60);

  const fmtDay = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayParts = fmtDay.format(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayParts = fmtDay.format(yesterdayDate);
  const itemDayParts = fmtDay.format(dateObj);

  const timeStr = dateObj.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const shortDateStr = dateObj.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit'
  });
  const fullDateStr = dateObj.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const calendarDaysDiff = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));

  let dateCategory = 'older'; // 'today' | 'yesterday' | 'week' | 'older'
  let badgeLabel = '';
  let fullDateLabel = `${fullDateStr} • ${timeStr} hs`;

  if (itemDayParts === todayParts) {
    dateCategory = 'today';
    badgeLabel = `Hoy • ${timeStr} hs`;
    fullDateLabel = `Hoy (${shortDateStr}) a las ${timeStr} hs`;
  } else if (itemDayParts === yesterdayParts) {
    dateCategory = 'yesterday';
    badgeLabel = `Ayer • ${timeStr} hs`;
    fullDateLabel = `Ayer (${shortDateStr}) a las ${timeStr} hs`;
  } else if (calendarDaysDiff < 7) {
    dateCategory = 'week';
    const d = Math.max(2, calendarDaysDiff);
    badgeLabel = `Hace ${d} días (${shortDateStr})`;
    fullDateLabel = `Hace ${d} días (${fullDateStr} • ${timeStr} hs)`;
  } else {
    dateCategory = 'older';
    const weeks = Math.floor(calendarDaysDiff / 7);
    badgeLabel = weeks === 1 ? `Hace 1 sem. (${shortDateStr})` : `Hace ${calendarDaysDiff} días (${shortDateStr})`;
    fullDateLabel = `${fullDateStr} a las ${timeStr} hs (Hace ${calendarDaysDiff} días)`;
  }

  let elapsedText = '';
  if (minutesElapsed < 60) {
    elapsedText = `hace ${Math.max(1, minutesElapsed)} min`;
  } else if (hoursElapsed < 24) {
    elapsedText = `hace ${hoursElapsed} h`;
  } else {
    const d = Math.max(1, calendarDaysDiff);
    elapsedText = d === 1 ? 'hace 1 día' : `hace ${d} días`;
  }

  const hasClientMsg = historial.some(m => m && m.rol === 'cliente');
  const lastRole = lastMsg?.rol || '';

  const needsFollowUp = !isDerived && hasClientMsg && minutesElapsed >= 25;
  const followUpUrgent = needsFollowUp && (dateCategory === 'today' || dateCategory === 'yesterday');

  let followUpReason = '';
  if (needsFollowUp) {
    if (lastRole === 'cliente') {
      followUpReason = `El cliente escribió por última vez ${elapsedText} ("${(lastMsg?.texto || '').slice(0, 60)}") y quedó esperando respuesta o derivación.`;
    } else {
      followUpReason = `El cliente dejó de responder ${elapsedText} sin completar los datos o la elección de sucursal.`;
    }
  }

  return {
    effectiveDateStr,
    dateCategory,
    badgeLabel,
    fullDateLabel,
    elapsedText,
    minutesElapsed,
    needsFollowUp,
    followUpUrgent,
    followUpReason,
    lastRole
  };
}

function formatMessageTimestamp(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return '';
  const fmtDay = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const now = new Date();
  const isToday = fmtDay.format(now) === fmtDay.format(d);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const isYesterday = fmtDay.format(yesterday) === fmtDay.format(d);

  const time = d.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  if (isToday) return `Hoy ${time} hs`;
  if (isYesterday) return `Ayer ${time} hs`;
  const dayMonth = d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
  return `${dayMonth} • ${time} hs`;
}

export default function BotControlCenter() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'chats' | 'learning' | 'config'
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastSync, setLastSync] = useState(null);

  // Datos desde n8n / Firestore
  const [sessions, setSessions] = useState([]);
  const [botConfig, setBotConfig] = useState({
    documentId: 'bot_config_global',
    bot_activo: 'true',
    auto_pausa_humana: 'true',
    delay_respuesta_ms: '20000',
    prompt_extra: '',
    reglas_aprendidas_json: '[]'
  });

  // Filtros en pestaña Charlas
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'nonderived' | 'followup' | 'paused' | 'derived'
  const [nonDerivedSubFilter, setNonDerivedSubFilter] = useState('all'); // 'all' | 'no_respondio' | 'faltaron_datos' | 'buscaba_otra_cosa' | 'audio_imagen' | 'sin_historial_antiguo'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'week' | 'older'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Envío manual de WhatsApp y edición de resumen
  const [manualMessage, setManualMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [editingSummary, setEditingSummary] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Nueva regla aprendida manual / edición
  const [newRuleQuestion, setNewRuleQuestion] = useState('');
  const [newRuleAnswer, setNewRuleAnswer] = useState('');
  const [editingLearningSessionId, setEditingLearningSessionId] = useState(null);
  const [editingLearningRuleText, setEditingLearningRuleText] = useState('');

  const loadDashboard = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const data = await fetchBotDashboardFromN8n();
      if (data?.config) {
        setBotConfig(data.config);
      }
      if (Array.isArray(data?.sessions)) {
        const sucursalJids = SUCURSALES_LIST.map(s => `${s.phone}@s.whatsapp.net`);
        const cleanSessions = data.sessions
          .filter(s => s.documentId && !s.documentId.endsWith('@g.us') && !sucursalJids.includes(s.documentId))
          .map(s => {
            let historial = [];
            try {
              historial = typeof s.historial_json === 'string' ? JSON.parse(s.historial_json) : (s.historial_json || []);
              if (!Array.isArray(historial)) historial = [];
            } catch (e) {
              historial = [];
            }
            const rawDate = s.ultima_interaccion || s._createTime || s._updateTime || '';
            const isPaused = s.bot_pausado === 'true' || s.bot_pausado === true;
            const isDerived =
              s.estado_charla === 'derivada' ||
              Boolean(s.resumen_historico && s.resumen_historico.toLowerCase().includes('check oil'));

            const timing = analyzeSessionTiming(rawDate, historial, isDerived, isPaused);
            const nonDerivedInfo = classifyNonDerivedSession(s, historial, isDerived);

            return {
              ...s,
              historial,
              updatedTime: timing.effectiveDateStr || rawDate,
              isPaused,
              isDerived,
              timing,
              nonDerivedInfo
            };
          })
          .sort((a, b) => new Date(b.updatedTime || 0).getTime() - new Date(a.updatedTime || 0).getTime());

        setSessions(cleanSessions);
        if (!selectedSessionId && cleanSessions.length > 0) {
          setSelectedSessionId(cleanSessions[0].documentId);
          setEditingSummary(cleanSessions[0].resumen_historico || '');
        }
      }
      setLastSync(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error cargando dashboard del bot:', err);
      setErrorMsg('No se pudo conectar con el servidor n8n. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedSession = useMemo(
    () => sessions.find(s => s.documentId === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  useEffect(() => {
    if (selectedSession) {
      setEditingSummary(selectedSession.resumen_historico || '');
    }
  }, [selectedSessionId]);

  const learnedRules = useMemo(() => {
    try {
      const parsed = typeof botConfig.reglas_aprendidas_json === 'string'
        ? JSON.parse(botConfig.reglas_aprendidas_json || '[]')
        : (botConfig.reglas_aprendidas_json || []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [botConfig.reglas_aprendidas_json]);

  const isGlobalBotActive = botConfig.bot_activo !== 'false' && botConfig.bot_activo !== false;
  const isAutoPauseActive = botConfig.auto_pausa_humana !== 'false' && botConfig.auto_pausa_humana !== false;

  // ==========================================
  // MÉTRICAS, FECHAS Y DESGLOSE DE NO DERIVADOS
  // ==========================================
  const stats = useMemo(() => {
    const total = sessions.length;
    const derived = sessions.filter(s => s.isDerived).length;
    const nonDerived = sessions.filter(s => !s.isDerived).length;
    const paused = sessions.filter(s => s.isPaused).length;
    const incomplete = sessions.filter(s =>
      s.estado_charla === 'incompleta' ||
      s.estado_charla === 'fuera_de_contexto' ||
      s.fuera_de_contexto === 'si' ||
      Boolean(s.incompleta_motivo)
    ).length;
    const needsFollowUp = sessions.filter(s => s.timing?.needsFollowUp).length;
    const urgentFollowUp = sessions.filter(s => s.timing?.followUpUrgent).length;

    const todayCount = sessions.filter(s => s.timing?.dateCategory === 'today').length;
    const yesterdayCount = sessions.filter(s => s.timing?.dateCategory === 'yesterday').length;
    const weekCount = sessions.filter(s => ['today', 'yesterday', 'week'].includes(s.timing?.dateCategory)).length;
    const olderCount = sessions.filter(s => s.timing?.dateCategory === 'older').length;

    const nonDerivedBreakdown = Object.values(NON_DERIVED_REASONS).map(r => {
      const items = sessions.filter(s => !s.isDerived && s.nonDerivedInfo?.id === r.id);
      return {
        ...r,
        count: items.length,
        pct: nonDerived > 0 ? Math.round((items.length / nonDerived) * 100) : 0
      };
    });

    const pendingLearnings = sessions.filter(s =>
      s.aprendizaje_sugerido && s.estado_aprendizaje !== 'aprobado' && s.estado_aprendizaje !== 'descartado'
    ).length;
    const totalMessages = sessions.reduce((acc, s) => acc + Number(s.total_mensajes || s.historial?.length || 1), 0);

    const byBranch = SUCURSALES_LIST.map(branch => {
      const count = sessions.filter(s => {
        const text = `${s.sucursal_elegida || ''} ${s.resumen_historico || ''} ${s.resumen_charla || ''}`.toLowerCase();
        return text.includes(branch.key.toLowerCase());
      }).length;
      return { ...branch, count };
    });

    const conversionRate = total > 0 ? Math.round((derived / total) * 100) : 0;

    return {
      total,
      derived,
      nonDerived,
      nonDerivedBreakdown,
      paused,
      incomplete,
      needsFollowUp,
      urgentFollowUp,
      todayCount,
      yesterdayCount,
      weekCount,
      olderCount,
      pendingLearnings,
      totalMessages,
      conversionRate,
      byBranch
    };
  }, [sessions]);

  // ==========================================
  // ACCIONES DE CONTROL Y SEGUIMIENTO
  // ==========================================
  const handleToggleGlobalBot = async () => {
    const nextState = isGlobalBotActive ? 'false' : 'true';
    const updated = { ...botConfig, bot_activo: nextState };
    setBotConfig(updated);
    try {
      await upsertBotDocumentInN8n('bot_config_global', updated);
    } catch (e) {
      alert('Error al cambiar estado global del bot');
    }
  };

  const handleToggleAutoPause = async () => {
    const nextState = isAutoPauseActive ? 'false' : 'true';
    const updated = { ...botConfig, auto_pausa_humana: nextState };
    setBotConfig(updated);
    try {
      await upsertBotDocumentInN8n('bot_config_global', updated);
    } catch (e) {
      alert('Error al actualizar auto-pausa');
    }
  };

  const handleToggleClientPause = async (session) => {
    const nextPaused = !session.isPaused;
    const nextEstado = nextPaused
      ? 'atendida_humano'
      : (session.estado_charla === 'atendida_humano' ? 'en_curso' : session.estado_charla);
    const updatedSession = {
      ...session,
      bot_pausado: nextPaused ? 'true' : 'false',
      motivo_pausa: nextPaused ? `Pausado manualmente por ${user?.name || 'Operador'} en Remex OS` : '',
      pausado_en: nextPaused ? new Date().toISOString() : '',
      estado_charla: nextEstado,
      ultima_interaccion: session.updatedTime || session.ultima_interaccion
    };

    const nextTiming = analyzeSessionTiming(updatedSession.ultima_interaccion, session.historial || [], session.isDerived, nextPaused);
    setSessions(prev =>
      prev.map(s =>
        s.documentId === session.documentId
          ? { ...updatedSession, isPaused: nextPaused, timing: nextTiming }
          : s
      )
    );
    try {
      await upsertBotDocumentInN8n(session.documentId, updatedSession);
    } catch (e) {
      alert('Error actualizando pausa del cliente');
    }
  };

  const handleMarkSessionClosed = async (session) => {
    const updatedSession = {
      ...session,
      estado_charla: 'derivada',
      bot_pausado: 'false',
      motivo_pausa: '',
      pausado_en: '',
      incompleta_motivo: '',
      ultima_interaccion: session.updatedTime || session.ultima_interaccion
    };
    const nextTiming = analyzeSessionTiming(updatedSession.ultima_interaccion, session.historial || [], true, false);
    setSessions(prev =>
      prev.map(s =>
        s.documentId === session.documentId
          ? { ...updatedSession, isPaused: false, isDerived: true, nonDerivedInfo: null, timing: nextTiming }
          : s
      )
    );
    try {
      await upsertBotDocumentInN8n(session.documentId, updatedSession);
    } catch (e) {
      alert('Error al marcar charla como resuelta');
    }
  };

  const handleResumeAllPaused = async () => {
    const pausedList = sessions.filter(s => s.isPaused);
    if (pausedList.length === 0) return;
    setIsSyncing(true);
    try {
      for (const s of pausedList) {
        const updated = {
          ...s,
          bot_pausado: 'false',
          motivo_pausa: '',
          pausado_en: '',
          ultima_interaccion: s.updatedTime || s.ultima_interaccion
        };
        await upsertBotDocumentInN8n(s.documentId, updated);
      }
      await loadDashboard(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveClientSummary = async () => {
    if (!selectedSession) return;
    setIsSavingSummary(true);
    try {
      const updated = {
        ...selectedSession,
        resumen_historico: editingSummary,
        ultima_interaccion: selectedSession.updatedTime || selectedSession.ultima_interaccion
      };
      await upsertBotDocumentInN8n(selectedSession.documentId, updated);
      setSessions(prev => prev.map(s => s.documentId === selectedSession.documentId ? updated : s));
    } finally {
      setIsSavingSummary(false);
    }
  };

  const sendWhatsappMessageToSession = async (session, textToSend) => {
    if (!session || !textToSend.trim()) return;
    setIsSendingMsg(true);
    try {
      const now = new Date().toISOString();
      const newHist = [
        ...(session.historial || []),
        {
          rol: 'operador',
          nombre: user?.name || 'Operador Remex OS',
          texto: textToSend.trim(),
          fecha: now
        }
      ];
      const updated = {
        ...session,
        bot_pausado: 'true',
        isPaused: true,
        motivo_pausa: `Intervención de seguimiento por ${user?.name || 'Operador'} desde Remex OS`,
        pausado_en: now,
        estado_charla: 'atendida_humano',
        historial: newHist,
        historial_json: JSON.stringify(newHist),
        total_mensajes: String(newHist.length),
        ultima_interaccion: now,
        updatedTime: now
      };
      const nextTiming = analyzeSessionTiming(now, newHist, session.isDerived, true);
      updated.timing = nextTiming;

      await upsertBotDocumentInN8n(session.documentId, updated, textToSend.trim());
      setSessions(prev => prev.map(s => s.documentId === session.documentId ? updated : s));
      setManualMessage('');
    } catch (err) {
      alert('No se pudo enviar el mensaje por WhatsApp: ' + err.message);
    } finally {
      setIsSendingMsg(false);
    }
  };

  const handleSendManualWhatsapp = async (e) => {
    e.preventDefault();
    if (!selectedSession || !manualMessage.trim()) return;
    await sendWhatsappMessageToSession(selectedSession, manualMessage);
  };

  // ==========================================
  // ACCIONES DE APRENDIZAJE IA
  // ==========================================
  const handleApproveLearning = async (session, customRuleText) => {
    const ruleText = (customRuleText ?? session.aprendizaje_sugerido ?? '').trim();
    if (!ruleText) return;

    const newRule = {
      id: `learn-${Date.now()}`,
      pregunta: session.pregunta_detectada || session.incompleta_motivo || `Caso cliente ${session.cliente_nombre || session.cliente_telefono}`,
      respuesta: ruleText,
      origen: `Aprendido de charla con ${session.cliente_nombre || session.cliente_telefono}`,
      activa: true,
      fecha: new Date().toISOString().split('T')[0]
    };

    const nextRules = [newRule, ...learnedRules];
    const updatedConfig = {
      ...botConfig,
      reglas_aprendidas_json: JSON.stringify(nextRules)
    };
    const updatedSession = {
      ...session,
      aprendizaje_sugerido: ruleText,
      estado_aprendizaje: 'aprobado',
      ultima_interaccion: session.updatedTime || session.ultima_interaccion
    };

    setBotConfig(updatedConfig);
    setSessions(prev => prev.map(s => s.documentId === session.documentId ? updatedSession : s));
    setEditingLearningSessionId(null);

    await upsertBotDocumentInN8n('bot_config_global', updatedConfig);
    await upsertBotDocumentInN8n(session.documentId, updatedSession);
  };

  const handleDiscardLearning = async (session) => {
    const updatedSession = {
      ...session,
      estado_aprendizaje: 'descartado',
      ultima_interaccion: session.updatedTime || session.ultima_interaccion
    };
    setSessions(prev => prev.map(s => s.documentId === session.documentId ? updatedSession : s));
    await upsertBotDocumentInN8n(session.documentId, updatedSession);
  };

  const handleAddManualRule = async (e) => {
    e.preventDefault();
    if (!newRuleQuestion.trim() || !newRuleAnswer.trim()) return;

    const newRule = {
      id: `manual-${Date.now()}`,
      pregunta: newRuleQuestion.trim(),
      respuesta: newRuleAnswer.trim(),
      origen: `Creada por ${user?.name || 'Admin'} en Remex OS`,
      activa: true,
      fecha: new Date().toISOString().split('T')[0]
    };

    const nextRules = [newRule, ...learnedRules];
    const updatedConfig = {
      ...botConfig,
      reglas_aprendidas_json: JSON.stringify(nextRules)
    };
    setBotConfig(updatedConfig);
    setNewRuleQuestion('');
    setNewRuleAnswer('');
    await upsertBotDocumentInN8n('bot_config_global', updatedConfig);
  };

  const handleToggleRuleActive = async (ruleId) => {
    const nextRules = learnedRules.map(r => r.id === ruleId ? { ...r, activa: !r.activa } : r);
    const updatedConfig = {
      ...botConfig,
      reglas_aprendidas_json: JSON.stringify(nextRules)
    };
    setBotConfig(updatedConfig);
    await upsertBotDocumentInN8n('bot_config_global', updatedConfig);
  };

  const handleDeleteRule = async (ruleId) => {
    const nextRules = learnedRules.filter(r => r.id !== ruleId);
    const updatedConfig = {
      ...botConfig,
      reglas_aprendidas_json: JSON.stringify(nextRules)
    };
    setBotConfig(updatedConfig);
    await upsertBotDocumentInN8n('bot_config_global', updatedConfig);
  };

  const handleSaveConfigSettings = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      await upsertBotDocumentInN8n('bot_config_global', botConfig);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha_Hora', 'Antiguedad', 'Telefono', 'Nombre', 'Fue_Derivado', 'Motivo_No_Derivacion', 'Alerta_Seguimiento', 'Bot_Pausado', 'Vehiculo', 'Sucursal', 'Resumen_Charla'];
    const rows = sessions.map(s => [
      `"${s.timing?.fullDateLabel || s.updatedTime || ''}"`,
      `"${s.timing?.badgeLabel || ''}"`,
      s.cliente_telefono || s.documentId,
      `"${(s.cliente_nombre || '').replace(/"/g, '""')}"`,
      s.isDerived ? 'SI_DERIVADO' : 'NO_DERIVADO',
      `"${(s.nonDerivedInfo?.label || 'Derivado exitosamente').replace(/"/g, '""')}"`,
      s.timing?.needsFollowUp ? 'SIN_RESPUESTA_PENDIENTE' : 'OK',
      s.isPaused ? 'PAUSADO' : 'ACTIVO',
      `"${(s.vehiculo || '').replace(/"/g, '""')}"`,
      `"${(s.sucursal_elegida || '').replace(/"/g, '""')}"`,
      `"${(s.resumen_charla || s.resumen_historico || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Bot_CheckOil_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado de sesiones por estado, sub-motivo de no derivación, fecha y texto
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (chatFilter === 'nonderived') {
        if (s.isDerived) return false;
        if (nonDerivedSubFilter !== 'all' && s.nonDerivedInfo?.id !== nonDerivedSubFilter) return false;
      }
      if (chatFilter === 'followup' && !s.timing?.needsFollowUp) return false;
      if (chatFilter === 'paused' && !s.isPaused) return false;
      if (chatFilter === 'derived' && !s.isDerived) return false;

      if (dateFilter === 'today' && s.timing?.dateCategory !== 'today') return false;
      if (dateFilter === 'yesterday' && s.timing?.dateCategory !== 'yesterday') return false;
      if (dateFilter === 'week' && !['today', 'yesterday', 'week'].includes(s.timing?.dateCategory)) return false;
      if (dateFilter === 'older' && s.timing?.dateCategory !== 'older') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${s.cliente_nombre || ''} ${s.cliente_telefono || ''} ${s.documentId || ''} ${s.vehiculo || ''} ${s.sucursal_elegida || ''} ${s.resumen_historico || ''} ${s.resumen_charla || ''} ${s.timing?.badgeLabel || ''} ${s.nonDerivedInfo?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, chatFilter, nonDerivedSubFilter, dateFilter, searchQuery]);

  // Datos para gráficos Chart.js
  const doughnutData = {
    labels: [
      'Derivadas a Sucursal',
      'No respondieron / Abandonaron',
      'Buscaban otra cosa / Audio',
      'Registros antiguos (pre 15/10)'
    ],
    datasets: [
      {
        data: [
          stats.derived,
          (stats.nonDerivedBreakdown.find(b => b.id === 'no_respondio')?.count || 0) +
            (stats.nonDerivedBreakdown.find(b => b.id === 'faltaron_datos')?.count || 0),
          (stats.nonDerivedBreakdown.find(b => b.id === 'buscaba_otra_cosa')?.count || 0) +
            (stats.nonDerivedBreakdown.find(b => b.id === 'audio_imagen')?.count || 0),
          stats.nonDerivedBreakdown.find(b => b.id === 'sin_historial_antiguo')?.count || 0
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#52525b'],
        borderWidth: 0
      }
    ]
  };

  const branchBarData = {
    labels: stats.byBranch.map(b => b.key),
    datasets: [
      {
        label: 'Consultas / Derivaciones',
        data: stats.byBranch.map(b => b.count),
        backgroundColor: '#f97316',
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full">
      {/* HEADER SUPERIOR Y CONTROL MAESTRO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-5 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Bot className="w-7 h-7 text-orange-500" />
            Centro de Control Bot & IA (Check-Oil)
            <HelpTooltip text="Monitorea charlas de WhatsApp con fecha exacta, audita por qué algunos clientes no llegaron a derivarse, alerta cuando dejan de responder e inyecta aprendizajes en vivo." />
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Supervisión en vivo de recepción, diagnóstico de no derivados, control por fechas y aprendizaje continuo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleToggleGlobalBot}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border transition-all ${
              isGlobalBotActive
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/50'
                : 'bg-red-950/50 text-red-400 border-red-500/50 hover:bg-red-900/50 animate-pulse'
            }`}
          >
            {isGlobalBotActive ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
            {isGlobalBotActive ? 'BOT GLOBAL: ACTIVO' : 'BOT GLOBAL: EN PAUSA'}
          </button>

          <button
            onClick={handleToggleAutoPause}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              isAutoPauseActive
                ? 'bg-orange-950/30 text-orange-400 border-orange-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title="Si un operador humano escribe desde WhatsApp en una charla activa, el bot se pausa automáticamente y solo observa/resume."
          >
            <Eye className="w-4 h-4" />
            Auto-Pausa al Escribir: {isAutoPauseActive ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-orange-500" />
            Exportar CSV
          </button>

          <button
            onClick={() => loadDashboard(false)}
            disabled={isSyncing}
            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* BANNER GLOBAL DE ALERTA DE SEGUIMIENTO (CLIENTES SIN RESPUESTA) */}
      {stats.needsFollowUp > 0 && (
        <div className="mb-5 bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs text-amber-200">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <span className="font-black text-amber-400 uppercase tracking-wide block sm:inline mr-2">
                Alerta de Seguimiento ({stats.needsFollowUp} {stats.needsFollowUp === 1 ? 'charla sin cerrar' : 'charlas sin cerrar'}):
              </span>
              <span>
                Hay {stats.urgentFollowUp > 0 ? <b>{stats.urgentFollowUp} clientes de hoy/ayer</b> : <b>{stats.needsFollowUp} clientes</b>} que dejaron de responder o quedaron esperando confirmación sin llegar a derivarse.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveTab('chats');
              setChatFilter('followup');
              const firstStalled = sessions.find(s => s.timing?.needsFollowUp);
              if (firstStalled) setSelectedSessionId(firstStalled.documentId);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2 rounded-xl shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <MessageCircleWarning className="w-4 h-4" />
            Ver e Intervenir ({stats.needsFollowUp})
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 bg-red-950/30 border border-red-500/40 rounded-2xl p-4 flex items-center justify-between text-red-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => loadDashboard(false)} className="text-xs font-black underline">Reintentar</button>
        </div>
      )}

      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl shrink-0">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'stats'
                ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Estadísticas y No Derivados
          </button>

          <button
            onClick={() => setActiveTab('chats')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'chats'
                ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Monitor de Charlas ({stats.total})
            {stats.paused > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500 text-white font-black">
                {stats.paused} en pausa
              </span>
            )}
            {stats.needsFollowUp > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-400 text-black font-black">
                {stats.needsFollowUp} sin resp.
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'learning'
                ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            Aprendizaje IA e Incompletas
            {stats.pendingLearnings > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-400 text-black font-black">
                {stats.pendingLearnings} nuevos
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'config'
                ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuración y Prompt
          </button>
        </div>

        {lastSync && (
          <span className="text-[11px] text-zinc-500 font-bold px-3">
            Última sincro n8n: {lastSync}
          </span>
        )}
      </div>

      {/* =========================================================
          TAB 1: ESTADÍSTICAS, SUCURSALES Y RADIOGRAFÍA DE NO DERIVADOS
      ========================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Clientes Totales</p>
              <h3 className="text-3xl font-black text-white">{stats.total}</h3>
              <p className="text-xs text-zinc-400 mt-2 font-bold">
                Hoy: <b className="text-emerald-400">{stats.todayCount}</b> • Ayer: <b className="text-zinc-200">{stats.yesterdayCount}</b> • +1 Sem: <b className="text-zinc-400">{stats.olderCount}</b>
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Derivados con Éxito</p>
              <h3 className="text-3xl font-black text-emerald-400">{stats.derived} <span className="text-base text-zinc-500">({stats.conversionRate}%)</span></h3>
              <p className="text-xs text-emerald-500 mt-2 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completaron flujo hasta sucursal
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">No Derivados (Totales)</p>
              <h3 className="text-3xl font-black text-amber-400">{stats.nonDerived}</h3>
              <p className="text-xs text-amber-400/80 mt-2 font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Ver desglose de motivos abajo
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Para Intervenir Ahora</p>
              <h3 className="text-3xl font-black text-orange-400">{stats.needsFollowUp}</h3>
              <p className="text-xs text-orange-400/80 mt-2 font-bold flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5" /> Clientes con charla inconclusa
              </p>
            </div>
          </div>

          {/* NUEVA SECCIÓN: RADIOGRAFÍA DE NO DERIVADOS (POR QUÉ NO LLEGARON A DERIVARSE) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-amber-400" />
                  Radiografía de Clientes No Derivados ({stats.nonDerived} casos): ¿Por qué no llegaron a derivarse?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Clasificación automática de los motivos por los que una conversación no terminó en derivación a sucursal. Haz clic en cualquier motivo para inspeccionar las charlas.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('chats');
                  setChatFilter('nonderived');
                  setNonDerivedSubFilter('all');
                }}
                className="bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-black shrink-0"
              >
                Ver todos los No Derivados ({stats.nonDerived})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {stats.nonDerivedBreakdown.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveTab('chats');
                    setChatFilter('nonderived');
                    setNonDerivedSubFilter(item.id);
                    const firstMatch = sessions.find(s => !s.isDerived && s.nonDerivedInfo?.id === item.id);
                    if (firstMatch) setSelectedSessionId(firstMatch.documentId);
                  }}
                  className="bg-black/50 hover:bg-zinc-800/60 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${item.color}`}>
                        {item.shortBadge}
                      </span>
                      <span className="text-xl font-black text-white">{item.count}</span>
                    </div>
                    <p className="text-xs font-bold text-zinc-200 mb-1">{item.label}</p>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-4">
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full ${item.barColor}`} style={{ width: `${item.pct}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                      <span>{item.pct}% de los no derivados</span>
                      <span className="text-orange-400 underline">Ver charlas →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl lg:col-span-2">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" /> Demanda y Derivaciones por Sucursal
              </h3>
              <div className="h-[260px]">
                <Bar
                  data={branchBarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { grid: { color: '#27272a' }, beginAtZero: true, ticks: { stepSize: 1 } },
                      x: { grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Embudo de Conversaciones
              </h3>
              <div className="h-[260px] flex items-center justify-center">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, color: '#a1a1aa' } }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tabla resumen por sucursal */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Detalle de Sucursales Check-Oil y Números de Derivación
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-xs font-black text-zinc-500 uppercase">
                    <th className="p-4">Sucursal</th>
                    <th className="p-4">WhatsApp Interno</th>
                    <th className="p-4 text-center">Consultas / Derivaciones</th>
                    <th className="p-4">Servicios Especiales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-sm">
                  {stats.byBranch.map((b) => (
                    <tr key={b.key} className="hover:bg-zinc-800/30">
                      <td className="p-4 font-bold text-white">Check Oil Suc. {b.name}</td>
                      <td className="p-4 text-orange-400 font-mono text-xs">{b.phone}</td>
                      <td className="p-4 text-center font-black text-white">{b.count}</td>
                      <td className="p-4 text-xs text-zinc-400">
                        {b.key === 'Dominico'
                          ? 'Lubricentro + Mecánica ligera (frenos, tren delantero, distribución, correas, amortiguadores) + Lavadero'
                          : 'Lubricentro, filtros WEGA, fluidos, aditivos y cadenas de nieve (Patagonia)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: MONITOR DE CHARLAS, FECHAS Y MOTIVOS DE NO DERIVACIÓN
      ========================================================= */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[650px]">
          {/* Columna izquierda: Lista de sesiones con filtro por Fecha, Estado y Motivo de No Derivación */}
          <div className="w-full lg:w-[430px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente, teléfono, vehículo, motivo..."
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                />
              </div>

              {/* FILTRO POR FECHA */}
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-orange-500" /> 1. Filtrar por Fecha
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: `Todas (${stats.total})` },
                    { id: 'today', label: `Hoy (${stats.todayCount})` },
                    { id: 'yesterday', label: `Ayer (${stats.yesterdayCount})` },
                    { id: 'week', label: `Últ. 7 días (${stats.weekCount})` },
                    { id: 'older', label: `+1 Semana (${stats.olderCount})` }
                  ].map(df => (
                    <button
                      key={df.id}
                      onClick={() => setDateFilter(df.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        dateFilter === df.id
                          ? 'bg-emerald-500 text-black font-black'
                          : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FILTRO POR ESTADO (DERIVADAS VS NO DERIVADAS VS SIN RESPUESTA) */}
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> 2. Filtrar por Resultado
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'nonderived', label: `❌ No Derivados (${stats.nonDerived})` },
                    { id: 'followup', label: `⚠️ Alerta Sin Resp. (${stats.needsFollowUp})` },
                    { id: 'derived', label: `✅ Derivados (${stats.derived})` },
                    { id: 'paused', label: `En Pausa (${stats.paused})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setChatFilter(tab.id);
                        if (tab.id !== 'nonderived') setNonDerivedSubFilter('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                        chatFilter === tab.id
                          ? 'bg-orange-500 text-black font-black'
                          : tab.id === 'followup' && stats.needsFollowUp > 0
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-900/50'
                          : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUB-FILTRO ESPECÍFICO CUANDO SE ELIGE "NO DERIVADOS" */}
              {chatFilter === 'nonderived' && (
                <div className="pt-1 border-t border-zinc-800/80">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1.5">
                    Motivo por el que no se derivó:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setNonDerivedSubFilter('all')}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${
                        nonDerivedSubFilter === 'all'
                          ? 'bg-amber-400 text-black font-black'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      Todos ({stats.nonDerived})
                    </button>
                    {stats.nonDerivedBreakdown.map(b => (
                      <button
                        key={b.id}
                        onClick={() => setNonDerivedSubFilter(b.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold ${
                          nonDerivedSubFilter === b.id
                            ? 'bg-amber-400 text-black font-black'
                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                        }`}
                      >
                        {b.shortBadge} ({b.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {stats.paused > 0 && (
                <button
                  onClick={handleResumeAllPaused}
                  className="w-full py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 text-[11px] font-black flex items-center justify-center gap-1.5"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Reactivar todos los bots en pausa ({stats.paused})
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/50">
              {isLoading ? (
                <div className="p-8 text-center text-orange-500 text-xs font-bold">Cargando charlas...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-bold">
                  No hay conversaciones para la combinación de filtros seleccionada.
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isSelected = s.documentId === selectedSessionId;
                  const t = s.timing || {};
                  const isToday = t.dateCategory === 'today';
                  const isYesterday = t.dateCategory === 'yesterday';

                  return (
                    <div
                      key={s.documentId}
                      onClick={() => setSelectedSessionId(s.documentId)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-orange-500/10 border-l-4 border-l-orange-500'
                          : 'hover:bg-zinc-800/40 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Fila 1: Nombre del Cliente + Estado */}
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="font-black text-sm text-white truncate">
                          {s.cliente_nombre && s.cliente_nombre !== 'Cliente'
                            ? s.cliente_nombre
                            : `+${s.cliente_telefono || s.documentId.replace('@s.whatsapp.net', '')}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                            s.isPaused
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : s.isDerived
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {s.isPaused
                            ? 'PAUSADO'
                            : s.isDerived
                            ? 'DERIVADA'
                            : 'NO DERIVADO'}
                        </span>
                      </div>

                      {/* Fila 2: Etiqueta de Fecha + Motivo de No Derivación */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-black flex items-center gap-1 ${
                            isToday
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : isYesterday
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5" />
                          {t.badgeLabel || 'Sin fecha'}
                        </span>

                        {!s.isDerived && s.nonDerivedInfo && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-black border ${s.nonDerivedInfo.color}`}>
                            {s.nonDerivedInfo.shortBadge}
                          </span>
                        )}
                      </div>

                      {/* Fila 3: Teléfono + Sucursal */}
                      <div className="text-[11px] text-zinc-400 font-mono mb-1.5 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {s.cliente_telefono || s.documentId.replace('@s.whatsapp.net', '')}
                        {s.sucursal_elegida && s.sucursal_elegida !== 'Sin definir' && (
                          <span className="text-orange-400 font-bold truncate">• {s.sucursal_elegida}</span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {!s.isDerived && s.nonDerivedInfo
                          ? s.nonDerivedInfo.detail
                          : (s.resumen_charla || s.resumen_historico || 'Sin resumen generado aún.')}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna derecha: Detalle de charla, motivo de no derivación, alerta de intervención, resumen, pausa y chat */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold">Selecciona una conversación para ver su fecha, motivo y mensajes.</p>
              </div>
            ) : (
              <>
                {/* Cabecera del cliente seleccionado con FECHA EXACTA */}
                <div className="p-5 border-b border-zinc-800 bg-zinc-950/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-black text-white">
                        {selectedSession.cliente_nombre || 'Cliente WhatsApp'}
                      </h3>
                      <span className="text-xs font-mono text-orange-400 bg-orange-950/40 border border-orange-500/30 px-2.5 py-0.5 rounded-lg">
                        +{selectedSession.cliente_telefono || selectedSession.documentId.replace('@s.whatsapp.net', '')}
                      </span>
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {selectedSession.timing?.fullDateLabel || 'Sin fecha registrada'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-orange-500" />
                        <b>Vehículo:</b> {selectedSession.vehiculo || 'No especificado'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <b>Sucursal:</b> {selectedSession.sucursal_elegida || 'Sin definir'}
                      </span>
                    </div>
                  </div>

                  {/* Botón Pausa / Reactivar Bot para este cliente */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleClientPause(selectedSession)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border transition-all ${
                        selectedSession.isPaused
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-400'
                          : 'bg-orange-950/60 hover:bg-orange-900/60 text-orange-400 border-orange-500/50'
                      }`}
                    >
                      {selectedSession.isPaused ? (
                        <>
                          <PlayCircle className="w-4 h-4" />
                          REACTIVAR BOT EN ESTE CHAT
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-4 h-4" />
                          PAUSAR BOT (MODO OBSERVADOR)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* DIAGNÓSTICO DE NO DERIVACIÓN + ALERTA DE INTERVENCIÓN RÁPIDA */}
                {!selectedSession.isDerived && selectedSession.nonDerivedInfo && (
                  <div className="bg-amber-950/25 border-b border-amber-500/30 px-5 py-3.5 flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5 text-xs text-amber-100">
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border mr-2 uppercase ${selectedSession.nonDerivedInfo.color}`}>
                            ¿Por qué no fue derivado?: {selectedSession.nonDerivedInfo.shortBadge}
                          </span>
                          <span>{selectedSession.nonDerivedInfo.detail}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleMarkSessionClosed(selectedSession)}
                        className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 border border-zinc-700"
                        title="Marcar como ya derivado o resuelto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Marcar como Derivada/Resuelta
                      </button>
                    </div>

                    {/* Botones de intervención con 1 clic */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-black text-amber-400/90 uppercase mr-1">
                        Intervenir / Consultar al cliente:
                      </span>
                      <button
                        onClick={() => {
                          const nombre = selectedSession.cliente_nombre && selectedSession.cliente_nombre !== 'Cliente'
                            ? ` ${selectedSession.cliente_nombre.split(' ')[0]}`
                            : '';
                          setManualMessage(
                            `¡Hola${nombre}! Te escribimos de Check-Oil para saber si pudiste resolver tu consulta o si necesitas que te ayudemos con la cotización o derivación a alguna sucursal.`
                          );
                        }}
                        className="text-[11px] bg-amber-500 hover:bg-amber-400 text-black font-black px-3 py-1.5 rounded-lg transition-colors"
                      >
                        👋 Preguntar si necesita algo más
                      </button>
                      <button
                        onClick={() => {
                          const nombre = selectedSession.cliente_nombre && selectedSession.cliente_nombre !== 'Cliente'
                            ? ` ${selectedSession.cliente_nombre.split(' ')[0]}`
                            : '';
                          setManualMessage(
                            `¡Hola${nombre}! Quedamos atentos por si querés confirmarnos marca, modelo y motor de tu vehículo y la sucursal de Check-Oil que te quede más cómoda para derivarte.`
                          );
                        }}
                        className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        🚗 Pedir datos faltantes para derivar
                      </button>
                    </div>
                  </div>
                )}

                {/* Alerta si está en pausa por intervención humana */}
                {selectedSession.isPaused && (
                  <div className="bg-orange-950/30 border-b border-orange-500/30 px-5 py-3 flex items-center justify-between text-xs text-orange-300">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>
                        <b>Bot en Pausa y Observando:</b> {selectedSession.motivo_pausa || 'Un operador humano tomó la conversación.'} El bot no responderá pero seguirá actualizando el resumen y aprendiendo de la charla.
                      </span>
                    </div>
                  </div>
                )}

                {/* Cuerpo dividido: Historial de Mensajes y Panel de Resumen */}
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 overflow-hidden">
                  {/* Mensajes del Chat (3 cols) */}
                  <div className="xl:col-span-3 flex flex-col border-b xl:border-b-0 xl:border-r border-zinc-800 overflow-hidden">
                    <div className="p-4 bg-black/30 border-b border-zinc-800 text-xs font-black text-zinc-400 uppercase tracking-widest flex justify-between">
                      <span>Registro de Interacción WhatsApp</span>
                      <span>{(selectedSession.historial || []).length} mensajes</span>
                    </div>

                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-3 bg-zinc-950/40">
                      {(!selectedSession.historial || selectedSession.historial.length === 0) ? (
                        <div className="text-center text-zinc-500 text-xs py-12 px-6">
                          Esta sesión corresponde a un contacto previo a la activación del registro completo de mensajes o solo conserva el resumen histórico a la derecha.
                        </div>
                      ) : (
                        selectedSession.historial.map((m, idx) => {
                          const isClient = m.rol === 'cliente';
                          const isOperator = m.rol === 'operador';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                                  isClient
                                    ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                                    : isOperator
                                    ? 'bg-orange-600/20 border border-orange-500/40 text-orange-100 rounded-tr-sm'
                                    : 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-100 rounded-tr-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-black uppercase opacity-75">
                                  <span>
                                    {isClient
                                      ? `👤 ${m.nombre || selectedSession.cliente_nombre || 'Cliente'}`
                                      : isOperator
                                      ? '🧑‍🔧 Operador Humano (WhatsApp / Remex)'
                                      : '🤖 Bot Check-Oil'}
                                  </span>
                                  {m.fecha && (
                                    <span className="font-mono text-[10px]">
                                      {formatMessageTimestamp(m.fecha)}
                                    </span>
                                  )}
                                </div>
                                <p className="whitespace-pre-wrap">{m.texto}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Enviar mensaje como operador humano desde Remex OS */}
                    <form onSubmit={handleSendManualWhatsapp} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
                      <input
                        type="text"
                        value={manualMessage}
                        onChange={(e) => setManualMessage(e.target.value)}
                        placeholder="Escribir al cliente por WhatsApp para intervenir o consultar si necesita algo más..."
                        className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-orange-500 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isSendingMsg || !manualMessage.trim()}
                        className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isSendingMsg ? 'Enviando...' : 'Intervenir'}
                      </button>
                    </form>
                  </div>

                  {/* Resumen de la charla y Memoria del Cliente (2 cols) */}
                  <div className="xl:col-span-2 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
                      <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-2">
                        Resumen Ejecutivo y Diagnóstico
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {selectedSession.resumen_charla || selectedSession.nonDerivedInfo?.detail || 'El bot generará un resumen ejecutivo en el próximo mensaje.'}
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col bg-black/40 border border-zinc-800 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">
                          Memoria Histórica del Cliente (Usada por el Bot)
                        </h4>
                      </div>
                      <p className="text-[11px] text-zinc-500 mb-2">
                        Estos datos duros (Marca, Modelo, Año, Motor, Sucursal) son leídos por el bot para no volver a preguntar.
                      </p>
                      <textarea
                        value={editingSummary}
                        onChange={(e) => setEditingSummary(e.target.value)}
                        rows={5}
                        className="w-full flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono focus:border-orange-500 outline-none resize-none"
                      />
                      <button
                        onClick={handleSaveClientSummary}
                        disabled={isSavingSummary}
                        className="mt-3 w-full bg-zinc-800 hover:bg-orange-600 hover:text-black text-white font-black py-2 rounded-xl text-xs transition-colors"
                      >
                        {isSavingSummary ? 'Guardando en Firestore...' : 'Guardar Memoria del Cliente'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: CENTRO DE APRENDIZAJE IA (INCOMPLETAS Y FUERA DE TEMA)
      ========================================================= */}
      {activeTab === 'learning' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Detecciones de Charlas Incompletas y Fuera de Contexto
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                El analizador IA revisa cada conversación buscando preguntas sin respuesta, dudas fuera del catálogo o intervenciones humanas para que puedas enseñar al bot con un clic.
              </p>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {sessions.filter(s => s.aprendizaje_sugerido || s.incompleta_motivo || s.pregunta_detectada).length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-bold border border-dashed border-zinc-800 rounded-2xl">
                  Aún no hay charlas incompletas ni preguntas fuera de contexto pendientes.
                </div>
              ) : (
                sessions
                  .filter(s => (s.aprendizaje_sugerido || s.incompleta_motivo || s.pregunta_detectada) && s.estado_aprendizaje !== 'descartado')
                  .map(s => {
                    const isApproved = s.estado_aprendizaje === 'aprobado';
                    const isEditingThis = editingLearningSessionId === s.documentId;
                    return (
                      <div
                        key={s.documentId}
                        className={`p-4 rounded-2xl border ${
                          isApproved
                            ? 'bg-emerald-950/10 border-emerald-500/30'
                            : 'bg-black/50 border-amber-500/30'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <span className="text-xs font-black text-white">
                              {s.cliente_nombre || s.cliente_telefono}
                            </span>
                            <span className="text-[11px] text-zinc-500 ml-2 font-mono">
                              +{s.cliente_telefono}
                            </span>
                            {s.timing?.badgeLabel && (
                              <span className="text-[10px] text-zinc-400 ml-2 bg-zinc-800 px-2 py-0.5 rounded">
                                {s.timing.badgeLabel}
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {isApproved ? 'Aprendido y Activo' : s.nonDerivedInfo?.shortBadge || s.estado_charla || 'Detectado'}
                          </span>
                        </div>

                        {(s.pregunta_detectada || s.incompleta_motivo) && (
                          <div className="text-xs text-zinc-300 mb-2 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                            <b className="text-amber-400">Situación / Motivo detectado:</b>{' '}
                            {s.pregunta_detectada || s.incompleta_motivo}
                          </div>
                        )}

                        {isEditingThis ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              value={editingLearningRuleText}
                              onChange={(e) => setEditingLearningRuleText(e.target.value)}
                              rows={3}
                              className="w-full bg-zinc-950 border border-orange-500 rounded-xl p-2.5 text-xs text-white outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveLearning(s, editingLearningRuleText)}
                                className="bg-emerald-500 text-black font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Guardar y Enseñar al Bot
                              </button>
                              <button
                                onClick={() => setEditingLearningSessionId(null)}
                                className="bg-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/20 mb-3">
                              <b>Regla sugerida por IA:</b> {s.aprendizaje_sugerido || 'Sin regla sugerida automática.'}
                            </div>

                            {!isApproved && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleApproveLearning(s)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-black font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" /> Aprobar e Inyectar al Bot
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingLearningSessionId(s.documentId);
                                    setEditingLearningRuleText(s.aprendizaje_sugerido || '');
                                  }}
                                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                                >
                                  Editar antes de aprobar
                                </button>
                                <button
                                  onClick={() => handleDiscardLearning(s)}
                                  className="bg-red-950/40 hover:bg-red-900/60 text-red-400 font-bold px-3 py-1.5 rounded-xl text-xs ml-auto"
                                >
                                  Descartar
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-orange-500" />
                Memoria de Reglas Aprendidas (Inyectadas en Vivo al Bot)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Todas las reglas activas aquí son consultadas por el Agente IA en n8n antes de responder cualquier WhatsApp.
              </p>
            </div>

            <form onSubmit={handleAddManualRule} className="bg-black/50 border border-zinc-800 rounded-2xl p-4 mb-5 space-y-3">
              <p className="text-xs font-black text-orange-400 uppercase tracking-wider">
                + Enseñar Nueva Regla o Respuesta al Bot
              </p>
              <input
                type="text"
                value={newRuleQuestion}
                onChange={(e) => setNewRuleQuestion(e.target.value)}
                placeholder="Cuando el cliente pregunte o suceda... (ej. ¿Colocan lámparas en Bariloche?)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
              />
              <textarea
                value={newRuleAnswer}
                onChange={(e) => setNewRuleAnswer(e.target.value)}
                rows={2}
                placeholder="Cómo debe actuar o responder el bot..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 outline-none resize-none"
              />
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-black font-black py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Agregar a la Base de Conocimiento del Bot
              </button>
            </form>

            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {learnedRules.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-bold border border-dashed border-zinc-800 rounded-2xl">
                  No hay reglas aprendidas cargadas todavía.
                </div>
              ) : (
                learnedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      rule.activa !== false
                        ? 'bg-zinc-950/70 border-zinc-800'
                        : 'bg-zinc-950/20 border-zinc-900 opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="text-xs font-black text-orange-400">
                        {rule.pregunta}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleRuleActive(rule.id)}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            rule.activa !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {rule.activa !== false ? 'ACTIVA' : 'PAUSADA'}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{rule.respuesta}</p>
                    {rule.origen && (
                      <p className="text-[10px] text-zinc-500 mt-2">
                        {rule.origen} • {rule.fecha || ''}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: CONFIGURACIÓN Y PROMPT DEL SISTEMA
      ========================================================= */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSaveConfigSettings} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              Parámetros Operativos del Bot en Vivo
            </h3>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase mb-2">
                Directiva / Aviso General Extra (Se suma al Prompt del Bot al instante)
              </label>
              <textarea
                value={botConfig.prompt_extra || ''}
                onChange={(e) => setBotConfig({ ...botConfig, prompt_extra: e.target.value })}
                rows={4}
                placeholder="Ej: Hoy sábado la sucursal Centro cierra a las 13:00 hs. Si el cliente ya indicó sucursal en su primer mensaje, no volver a preguntar zona..."
                className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase mb-2">
                Delay de Escritura en WhatsApp (Milisegundos - "Escribiendo...")
              </label>
              <input
                type="number"
                min={1000}
                max={60000}
                step={1000}
                value={botConfig.delay_respuesta_ms || 20000}
                onChange={(e) => setBotConfig({ ...botConfig, delay_respuesta_ms: String(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Actualmente: {(Number(botConfig.delay_respuesta_ms || 20000) / 1000).toFixed(0)} segundos de presencia "composing" antes de enviar.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSyncing}
              className="w-full bg-orange-600 hover:bg-orange-500 text-black font-black py-3 rounded-xl text-sm transition-colors"
            >
              {isSyncing ? 'Guardando en n8n...' : 'Guardar Configuración en Vivo'}
            </button>
          </form>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-black text-white">
                System Prompt Maestro (Sincronizado en n8n)
              </h3>
              <button
                onClick={() => navigator.clipboard.writeText(SYSTEM_PROMPT_PREVIEW)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Prompt
              </button>
            </div>
            <pre className="flex-1 bg-black border border-zinc-800 rounded-2xl p-4 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap overflow-y-auto max-h-[420px]">
              {SYSTEM_PROMPT_PREVIEW}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
