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
  X,
  Phone,
  Car,
  MapPin,
  Clock,
  Eye,
  ShieldAlert,
  Download,
  Copy,
  UserCheck,
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

const SYSTEM_PROMPT_PREVIEW = `Eres el Asistente Virtual de Recepción y Derivación de Check-Oil, un centro especializado en lubricación y mantenimiento automotriz.

Tu tono debe ser amable, servicial y EXTREMADAMENTE DIRECTO. Mantén la interacción lo más corta posible. Agrupa las preguntas necesarias en un solo mensaje.
REGLA DE ORO DE COMPORTAMIENTO: IGNORA por completo emojis, stickers o mensajes de cortesía finales (como "ok", "gracias"). No reacciones a ellos ni des respuestas de relleno. Si el cliente solo manda un sticker o un saludo de cierre, NO RESPONDAS.

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
PASO 3: OFRECER ZONAS.
PASO 4: SELECCIÓN DE SUCURSAL ESPECÍFICA Y CONTACTO.
PASO 5: CIERRE Y USO DE HERRAMIENTA (Enviar_Derivacion_Sucursal).`;

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
  const [chatFilter, setChatFilter] = useState('all'); // 'all' | 'paused' | 'incomplete' | 'derived'
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
        // Filtrar grupos o sucursales si quedaron de antes
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
            const updatedTime = s.ultima_interaccion || s._updateTime || s._createTime || '';
            return {
              ...s,
              historial,
              updatedTime,
              isPaused: s.bot_pausado === 'true' || s.bot_pausado === true
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
  // MÉTRICAS Y ESTADÍSTICAS
  // ==========================================
  const stats = useMemo(() => {
    const total = sessions.length;
    const derived = sessions.filter(s =>
      s.estado_charla === 'derivada' ||
      (s.resumen_historico && s.resumen_historico.toLowerCase().includes('check oil'))
    ).length;
    const paused = sessions.filter(s => s.isPaused).length;
    const incomplete = sessions.filter(s =>
      s.estado_charla === 'incompleta' ||
      s.estado_charla === 'fuera_de_contexto' ||
      s.fuera_de_contexto === 'si' ||
      Boolean(s.incompleta_motivo)
    ).length;
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
      paused,
      incomplete,
      pendingLearnings,
      totalMessages,
      conversionRate,
      byBranch
    };
  }, [sessions]);

  // ==========================================
  // ACCIONES DE CONTROL
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
    const updatedSession = {
      ...session,
      bot_pausado: nextPaused ? 'true' : 'false',
      motivo_pausa: nextPaused ? `Pausado manualmente por ${user?.name || 'Operador'} en Remex OS` : '',
      pausado_en: nextPaused ? new Date().toISOString() : '',
      estado_charla: nextPaused ? 'atendida_humano' : (session.estado_charla === 'atendida_humano' ? 'en_curso' : session.estado_charla)
    };

    setSessions(prev => prev.map(s => s.documentId === session.documentId ? { ...updatedSession, isPaused: nextPaused } : s));
    try {
      await upsertBotDocumentInN8n(session.documentId, updatedSession);
    } catch (e) {
      alert('Error actualizando pausa del cliente');
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
          pausado_en: ''
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
        resumen_historico: editingSummary
      };
      await upsertBotDocumentInN8n(selectedSession.documentId, updated);
      setSessions(prev => prev.map(s => s.documentId === selectedSession.documentId ? updated : s));
    } finally {
      setIsSavingSummary(false);
    }
  };

  const handleSendManualWhatsapp = async (e) => {
    e.preventDefault();
    if (!selectedSession || !manualMessage.trim()) return;
    setIsSendingMsg(true);
    try {
      const now = new Date().toISOString();
      const newHist = [
        ...(selectedSession.historial || []),
        {
          rol: 'operador',
          nombre: user?.name || 'Operador Remex OS',
          texto: manualMessage.trim(),
          fecha: now
        }
      ];
      const updated = {
        ...selectedSession,
        bot_pausado: 'true',
        isPaused: true,
        motivo_pausa: `Intervención de ${user?.name || 'Operador'} desde Remex OS`,
        pausado_en: now,
        estado_charla: 'atendida_humano',
        historial: newHist,
        historial_json: JSON.stringify(newHist),
        total_mensajes: String(newHist.length),
        ultima_interaccion: now
      };

      await upsertBotDocumentInN8n(selectedSession.documentId, updated, manualMessage.trim());
      setSessions(prev => prev.map(s => s.documentId === selectedSession.documentId ? updated : s));
      setManualMessage('');
    } catch (err) {
      alert('No se pudo enviar el mensaje por WhatsApp: ' + err.message);
    } finally {
      setIsSendingMsg(false);
    }
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
      estado_aprendizaje: 'aprobado'
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
      estado_aprendizaje: 'descartado'
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
    const headers = ['Telefono', 'Nombre', 'Estado', 'Bot_Pausado', 'Vehiculo', 'Sucursal', 'Resumen_Charla', 'Pregunta_Fuera_Contexto', 'Aprendizaje_Sugerido', 'Ultima_Interaccion'];
    const rows = sessions.map(s => [
      s.cliente_telefono || s.documentId,
      `"${(s.cliente_nombre || '').replace(/"/g, '""')}"`,
      s.estado_charla || 'en_curso',
      s.isPaused ? 'PAUSADO' : 'ACTIVO',
      `"${(s.vehiculo || '').replace(/"/g, '""')}"`,
      `"${(s.sucursal_elegida || '').replace(/"/g, '""')}"`,
      `"${(s.resumen_charla || s.resumen_historico || '').replace(/\n/g, ' ').replace(/"/g, '""')}"`,
      `"${(s.pregunta_detectada || s.incompleta_motivo || '').replace(/"/g, '""')}"`,
      `"${(s.aprendizaje_sugerido || '').replace(/"/g, '""')}"`,
      s.updatedTime || ''
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

  // Filtrado de sesiones para la vista de Charlas
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (chatFilter === 'paused' && !s.isPaused) return false;
      if (chatFilter === 'incomplete' && s.estado_charla !== 'incompleta' && s.estado_charla !== 'fuera_de_contexto' && !s.incompleta_motivo) return false;
      if (chatFilter === 'derived' && s.estado_charla !== 'derivada') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${s.cliente_nombre || ''} ${s.cliente_telefono || ''} ${s.documentId || ''} ${s.vehiculo || ''} ${s.sucursal_elegida || ''} ${s.resumen_historico || ''} ${s.resumen_charla || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, chatFilter, searchQuery]);

  // Datos para gráficos Chart.js
  const doughnutData = {
    labels: ['Derivadas a Sucursal', 'Incompletas / Fuera de Tema', 'En Pausa (Operador Humano)', 'En Curso'],
    datasets: [
      {
        data: [
          stats.derived,
          stats.incomplete,
          stats.paused,
          Math.max(0, stats.total - stats.derived - stats.incomplete - stats.paused)
        ],
        backgroundColor: ['#10b981', '#eab308', '#f97316', '#3b82f6'],
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
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Bot className="w-7 h-7 text-orange-500" />
            Centro de Control Bot & IA (Check-Oil)
            <HelpTooltip text="Monitorea charlas de WhatsApp en tiempo real, pausa el bot cuando un operador escribe, analiza conversaciones incompletas y entrena al asistente con nuevas reglas." />
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Supervisión en vivo de recepción, derivación por sucursales, pausa por intervención humana y aprendizaje continuo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switch Global Bot */}
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

          {/* Switch Auto-Pausa cuando escribe humano */}
          <button
            onClick={handleToggleAutoPause}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              isAutoPauseActive
                ? 'bg-orange-950/30 text-orange-400 border-orange-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title="Si un operador humano escribe desde WhatsApp, el bot se pausa automáticamente en ese chat y solo observa/resume."
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
            Estadísticas y Sucursales
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
            Monitor de Charlas y Pausa ({stats.total})
            {stats.paused > 0 && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500 text-white font-black">
                {stats.paused} en pausa
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
          TAB 1: ESTADÍSTICAS Y DATOS
      ========================================================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Clientes Atendidos</p>
              <h3 className="text-3xl font-black text-white">{stats.total}</h3>
              <p className="text-xs text-zinc-400 mt-2 font-bold">
                {stats.totalMessages} mensajes procesados
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Tasa de Derivación</p>
              <h3 className="text-3xl font-black text-emerald-400">{stats.conversionRate}%</h3>
              <p className="text-xs text-emerald-500 mt-2 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {stats.derived} clientes derivados a sucursal
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Modo Observación (Pausa)</p>
              <h3 className="text-3xl font-black text-orange-400">{stats.paused}</h3>
              <p className="text-xs text-orange-400/80 mt-2 font-bold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Intervención humana activa
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl relative overflow-hidden">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Incompletas / Aprendizajes</p>
              <h3 className="text-3xl font-black text-amber-400">{stats.incomplete}</h3>
              <p className="text-xs text-amber-400/80 mt-2 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {stats.pendingLearnings} reglas sugeridas por revisar
              </p>
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
                <BarChart3 className="w-4 h-4 text-emerald-500" /> Estado de Conversaciones
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
          TAB 2: MONITOR DE CHARLAS Y CONTROL DE PAUSA POR CLIENTE
      ========================================================= */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[620px]">
          {/* Columna izquierda: Lista de sesiones */}
          <div className="w-full lg:w-[400px] shrink-0 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente, teléfono, vehículo..."
                  className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'paused', label: `En Pausa (${stats.paused})` },
                  { id: 'incomplete', label: `Incompletas (${stats.incomplete})` },
                  { id: 'derived', label: `Derivadas (${stats.derived})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setChatFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      chatFilter === tab.id
                        ? 'bg-orange-500 text-black font-black'
                        : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

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
                  No hay conversaciones que coincidan con el filtro.
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isSelected = s.documentId === selectedSessionId;
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
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="font-black text-sm text-white truncate">
                          {s.cliente_nombre && s.cliente_nombre !== 'Cliente'
                            ? s.cliente_nombre
                            : `+${s.cliente_telefono || s.documentId.replace('@s.whatsapp.net', '')}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ${
                            s.isPaused
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : s.estado_charla === 'derivada'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : s.estado_charla === 'incompleta'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {s.isPaused
                            ? 'PAUSADO (OBSERVANDO)'
                            : s.estado_charla === 'derivada'
                            ? 'DERIVADA'
                            : s.estado_charla === 'incompleta'
                            ? 'INCOMPLETA'
                            : 'ACTIVA'}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 font-mono mb-1.5 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {s.cliente_telefono || s.documentId.replace('@s.whatsapp.net', '')}
                        {s.sucursal_elegida && s.sucursal_elegida !== 'Sin definir' && (
                          <span className="text-orange-400 font-bold">• {s.sucursal_elegida}</span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {s.resumen_charla || s.resumen_historico || 'Sin resumen generado aún.'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna derecha: Detalle de charla, resumen, pausa y chat */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold">Selecciona una conversación para ver su resumen y controlar el bot.</p>
              </div>
            ) : (
              <>
                {/* Cabecera del cliente seleccionado */}
                <div className="p-5 border-b border-zinc-800 bg-zinc-950/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-white">
                        {selectedSession.cliente_nombre || 'Cliente WhatsApp'}
                      </h3>
                      <span className="text-xs font-mono text-orange-400 bg-orange-950/40 border border-orange-500/30 px-2.5 py-0.5 rounded-lg">
                        +{selectedSession.cliente_telefono || selectedSession.documentId.replace('@s.whatsapp.net', '')}
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
                  <div className="flex items-center gap-3">
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

                {/* Alerta si quedó incompleta o fuera de contexto */}
                {(selectedSession.incompleta_motivo || selectedSession.pregunta_detectada) && (
                  <div className="bg-amber-950/20 border-b border-amber-500/30 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
                    <div>
                      <span className="font-black text-amber-400 uppercase mr-2">Detección IA:</span>
                      {selectedSession.incompleta_motivo || selectedSession.pregunta_detectada}
                    </div>
                    {selectedSession.aprendizaje_sugerido && selectedSession.estado_aprendizaje !== 'aprobado' && (
                      <button
                        onClick={() => setActiveTab('learning')}
                        className="text-[11px] bg-amber-500 text-black font-black px-3 py-1 rounded-lg shrink-0"
                      >
                        Ver Aprendizaje Sugerido
                      </button>
                    )}
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
                        <div className="text-center text-zinc-500 text-xs py-12">
                          No hay mensajes detallados registrados en esta sesión. Revisa el resumen histórico a la derecha.
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
                                      ? '🧑‍🔧 Operador Humano (Bot en Pausa)'
                                      : '🤖 Bot Check-Oil'}
                                  </span>
                                  {m.fecha && (
                                    <span>{new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
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
                        placeholder="Escribir al cliente por WhatsApp (pausará el bot automáticamente)..."
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
                        Resumen Ejecutivo de la Charla
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {selectedSession.resumen_charla || 'El bot generará un resumen ejecutivo en el próximo mensaje.'}
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
          {/* Columna Izquierda: Detecciones de Charlas Incompletas / Preguntas Fuera de Contexto */}
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
                          </div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {isApproved ? 'Aprendido y Activo' : s.estado_charla || 'Detectado'}
                          </span>
                        </div>

                        {(s.pregunta_detectada || s.incompleta_motivo) && (
                          <div className="text-xs text-zinc-300 mb-2 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                            <b className="text-amber-400">Situación / Pregunta detectada:</b>{' '}
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

          {/* Columna Derecha: Base de Conocimiento Activa (Reglas Aprendidas en n8n) */}
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

            {/* Formulario para agregar nueva regla aprendida manualmente */}
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

            {/* Lista de reglas aprendidas */}
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
