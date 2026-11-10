import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Clock,
  Send,
  Upload,
  Sparkles,
  Building2,
  Scale,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowRight,
  ShieldCheck,
  Car,
  Filter,
  Droplets,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Search
} from 'lucide-react';
import {
  BROKER_BRANCHES,
  DEFAULT_BROKER_CONFIG,
  DEMO_PREVIEW_QUOTES,
  evaluateBrokerActivationStatus,
  getParsedActiveBrokerBranches,
  getParsedBusinessHours,
  extractRawTextFromPdfFile,
  parseQuoteFromTextOrPdf,
  extractAllQuotesFromSessions,
  buildBranchQuotesAuditReport
} from '../services/quoteBrokerEngine';

const SIM_STORAGE_KEY = 'remex_broker_sandbox_sim_v1';

const INITIAL_SIM_STATE = {
  ticketId: 'COT-1042',
  sucursalKey: 'Centro',
  vehiculo: 'Fiat Pulse Audace 2025 1.0 Turbo',
  clienteNombre: 'Matías (Prueba)',
  clienteTelefono: '5492944912803',
  estado: 'sin_iniciar',
  fechaPedido: null,
  fechaRespuesta: null,
  demoraSimuladaMin: 0,
  clientThread: [],
  branchThread: [],
  parsedQuote: null
};

export default function QuoteBrokerAuditPanel({
  sessions = [],
  botConfig = {},
  onUpdateBrokerConfig,
  onRefreshSessions = null,
  onOpenChatSession = null,
  isMirrorSandbox = false,
  workflowDownloadUrl = './CheckOil_Workflow_Intermediario_v2.2.json'
}) {
  // 5 vistas exclusivas de presupuestos y auditoría
  // 'overview' | 'models_matrix' | 'dispersion' | 'delays_schedule' | 'simulator' | 'config'
  const [subView, setSubView] = useState('overview');
  const [showDemoPreview, setShowDemoPreview] = useState(true);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [dispersionFilter, setDispersionFilter] = useState('all'); // 'all' | 'filtro' | 'aceite'
  const [modelSearch, setModelSearch] = useState('');
  const [isScanningChats, setIsScanningChats] = useState(false);

  // Analizador rápido manual de PDF / Texto de cualquier sucursal para cargar a la estadística
  const [quickBranch, setQuickBranch] = useState('Centro');
  const [quickVehicle, setQuickVehicle] = useState('');
  const [quickDelayMin, setQuickDelayMin] = useState(12);
  const [quickText, setQuickText] = useState('');
  const [showQuickLoader, setShowQuickLoader] = useState(false);
  const quickPdfRef = useRef(null);

  // Simulador interactivo 3 vías (Cliente <-> Bot <-> Sucursal Centro + PDF real)
  const [simState, setSimState] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(SIM_STORAGE_KEY) || 'null');
      if (raw && raw.ticketId) return raw;
    } catch {
      // ignore
    }
    return INITIAL_SIM_STATE;
  });
  const [sandboxSavedQuotes, setSandboxSavedQuotes] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`${SIM_STORAGE_KEY}_quotes`) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  const [clientInput, setClientInput] = useState('');
  const [branchInput, setBranchInput] = useState('');
  const [simulatedDelayInput, setSimulatedDelayInput] = useState(11);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  const mergedCfg = useMemo(
    () => ({
      ...DEFAULT_BROKER_CONFIG,
      ...(botConfig || {})
    }),
    [botConfig]
  );

  const activation = useMemo(() => evaluateBrokerActivationStatus(mergedCfg), [mergedCfg]);
  const activeBranches = useMemo(() => getParsedActiveBrokerBranches(mergedCfg), [mergedCfg]);
  const bizHours = useMemo(() => getParsedBusinessHours(mergedCfg), [mergedCfg]);

  const realAndSandboxQuotes = useMemo(
    () => extractAllQuotesFromSessions(sessions, sandboxSavedQuotes),
    [sessions, sandboxSavedQuotes]
  );

  const effectiveQuotesForAudit = useMemo(() => {
    if (showDemoPreview) {
      return [...realAndSandboxQuotes, ...DEMO_PREVIEW_QUOTES];
    }
    return realAndSandboxQuotes;
  }, [realAndSandboxQuotes, showDemoPreview]);

  const auditReport = useMemo(
    () => buildBranchQuotesAuditReport(effectiveQuotesForAudit, mergedCfg),
    [effectiveQuotesForAudit, mergedCfg]
  );

  const filteredDispersionRows = useMemo(() => {
    return auditReport.priceDispersionRows.filter((r) => {
      if (dispersionFilter === 'filtro') return r.tipoItem === 'filtro';
      if (dispersionFilter === 'aceite') return r.tipoItem === 'aceite';
      return true;
    });
  }, [auditReport.priceDispersionRows, dispersionFilter]);

  const filteredVehicleModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return auditReport.vehicleModelsComparison;
    return auditReport.vehicleModelsComparison.filter(
      (m) =>
        m.modelo.toLowerCase().includes(q) ||
        m.cotizaciones.some(
          (c) =>
            c.sucursal.toLowerCase().includes(q) ||
            c.oilLabel.toLowerCase().includes(q) ||
            Object.values(c.filtrosPorTipo).some((f) => f && f.codigo.toLowerCase().includes(q))
        )
    );
  }, [auditReport.vehicleModelsComparison, modelSearch]);

  const persistSim = (nextSim, nextQuotes = sandboxSavedQuotes) => {
    setSimState(nextSim);
    try {
      localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(nextSim));
      localStorage.setItem(`${SIM_STORAGE_KEY}_quotes`, JSON.stringify(nextQuotes));
    } catch {
      // ignore quota
    }
  };

  const notify = (msg) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 5000);
  };

  const handleDeepScanConversations = async () => {
    setIsScanningChats(true);
    try {
      if (onRefreshSessions) {
        await onRefreshSessions();
      }
      const extractedCount = realAndSandboxQuotes.length;
      notify(
        `✅ Escaneo completo: ${sessions.length} charlas revisadas • ${extractedCount} pedidos/cotizaciones reales extraídos con sus filtros, aceites y demoras.`
      );
    } finally {
      setTimeout(() => setIsScanningChats(false), 400);
    }
  };

  const handleQuickAnalyzeQuote = (rawContent, fileName = '') => {
    const txt = String(rawContent ?? quickText ?? '').trim();
    if (!txt) {
      notify('⚠️ Pegá el texto del presupuesto o subí un archivo PDF para analizar.');
      return;
    }
    const ticketId = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;
    const branchObj = BROKER_BRANCHES.find((b) => b.key === quickBranch) || BROKER_BRANCHES[0];
    const vehicleLabel = quickVehicle.trim() || 'Vehículo auditado';
    const parsed = parseQuoteFromTextOrPdf(txt, {
      fileName,
      branchKey: branchObj.key,
      branchName: branchObj.name,
      vehicleHint: vehicleLabel,
      ticketId,
      formatoOrigen: fileName ? 'pdf' : 'texto'
    });

    if (!parsed.quoteRecord) {
      notify('ℹ️ El texto ingresado parece una pregunta al cliente y no contiene valores de presupuesto.');
      return;
    }

    const delayMin = Math.max(1, Number(quickDelayMin || 10));
    const nowIso = new Date().toISOString();
    const reqIso = new Date(Date.now() - delayMin * 60000).toISOString();

    const newRecord = {
      ...parsed.quoteRecord,
      cliente_nombre: 'Auditoría Manual / PDF',
      cliente_telefono: '',
      fecha_pedido: reqIso,
      fecha_respuesta: nowIso,
      demora_total_min: delayMin,
      demora_habil_min: delayMin,
      demora_neta_sucursal_min: delayMin,
      estado: 'presupuesto_enviado',
      esSimulacionSandbox: true
    };

    const nextQuotes = [newRecord, ...sandboxSavedQuotes].slice(0, 50);
    setSandboxSavedQuotes(nextQuotes);
    persistSim(simState, nextQuotes);
    setQuickText('');
    setShowQuickLoader(false);
    notify(
      `✅ Cotización #${ticketId} (${branchObj.key} • ${vehicleLabel}) analizada: ${newRecord.filtros.length} filtros y aceite sumados a las estadísticas.`
    );
  };

  const handleQuickUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingPdf(true);
    try {
      const extracted = await extractRawTextFromPdfFile(file);
      if (extracted && extracted.length >= 10) {
        handleQuickAnalyzeQuote(extracted, file.name);
      } else {
        notify('ℹ️ PDF escaneado como imagen: pegá abajo los ítems o valores para sumarlo a la comparativa.');
      }
    } catch (err) {
      notify('⚠️ No se pudo leer el PDF: ' + (err?.message || ''));
    } finally {
      setIsParsingPdf(false);
      if (quickPdfRef.current) quickPdfRef.current.value = '';
    }
  };

  const handleSaveConfigPatch = async (patch) => {
    if (!onUpdateBrokerConfig) return;
    setSavingCfg(true);
    try {
      const next = {
        ...mergedCfg,
        ...patch
      };
      await onUpdateBrokerConfig(next);
      notify('✅ Configuración del Modo Intermediario sincronizada con n8n / Firestore.');
    } catch (err) {
      notify('⚠️ Error guardando configuración: ' + (err?.message || ''));
    } finally {
      setSavingCfg(false);
    }
  };

  const handleToggleBranch = (branchKey) => {
    const exists = activeBranches.includes(branchKey);
    const nextList = exists
      ? activeBranches.filter((b) => b !== branchKey)
      : [...activeBranches, branchKey];
    handleSaveConfigPatch({
      sucursales_intermediario_json: JSON.stringify(nextList)
    });
  };

  const handleUpdateScheduleField = (field, val) => {
    const nextHours = {
      ...bizHours,
      [field]: val
    };
    handleSaveConfigPatch({
      horario_comercial_json: JSON.stringify(nextHours)
    });
  };

  // ==========================================================================
  // ACCIONES DEL SIMULADOR INTERACTIVO (CLIENTE <-> BOT <-> SUCURSAL CENTRO)
  // ==========================================================================
  const handleClientSendInSim = (presetText) => {
    const txt = String(presetText ?? clientInput ?? '').trim();
    if (!txt) return;
    const now = new Date().toISOString();

    if (simState.estado === 'sin_iniciar' || simState.estado === 'confirmado') {
      const newTicket = `COT-${Math.floor(1000 + Math.random() * 9000)}`;
      const carDetected =
        /pulse/i.test(txt)
          ? 'Fiat Pulse Audace 2025 1.0 Turbo'
          : /hilux/i.test(txt)
            ? 'Toyota Hilux 2019 2.8 TDI'
            : /gol/i.test(txt)
              ? 'VW Gol Trend 2017 1.6 MSI'
              : /amarok/i.test(txt)
                ? 'VW Amarok 2021 3.0 V6'
                : /cronos/i.test(txt)
                  ? 'Fiat Cronos 2022 1.3 GSE'
                  : txt.slice(0, 48);

      const botReplyClient =
        `¡Buen día! Ya solicité tu presupuesto a *Check Oil Suc. ${simState.sucursalKey}* (Ref. *#${newTicket}*) para *${carDetected}*.\n\n` +
        `Apenas la sucursal me confirme los valores te los envío por este mismo chat (sin derivarte hasta que confirmes el presupuesto).`;

      const botMsgToBranch =
        `🧾 *SOLICITUD DE PRESUPUESTO #${newTicket}*\n` +
        `📍 Sucursal: Check Oil Suc. ${simState.sucursalKey}\n` +
        `🚗 Vehículo: ${carDetected}\n` +
        `💬 Pedido del cliente: "${txt}"\n` +
        `🔒 _Contacto reservado por el Bot hasta confirmar presupuesto_\n\n` +
        `👉 Respondé acá con el *PDF del presupuesto* (o texto). Si necesitás consultar un dato al cliente, escribilo y el Bot se lo pregunta.`;

      const next = {
        ...INITIAL_SIM_STATE,
        ticketId: newTicket,
        sucursalKey: simState.sucursalKey || 'Centro',
        vehiculo: carDetected,
        estado: 'esperando_sucursal',
        fechaPedido: now,
        clientThread: [
          { rol: 'cliente', autor: '👤 Cliente', texto: txt, fecha: now },
          { rol: 'bot', autor: '🤖 Bot Check-Oil', texto: botReplyClient, fecha: now }
        ],
        branchThread: [
          { rol: 'bot_a_sucursal', autor: '🤖 Bot → Sucursal Centro', texto: botMsgToBranch, fecha: now }
        ]
      };
      setClientInput('');
      persistSim(next);
      return;
    }

    if (simState.estado === 'esperando_respuesta_cliente') {
      const botAckClient =
        `¡Perfecto, gracias! Ya le pasé ese dato a *Check Oil Suc. ${simState.sucursalKey}* para que terminen de armar tu presupuesto (#${simState.ticketId}).`;
      const botRelayToBranch =
        `💬 *RESPUESTA DEL CLIENTE • #${simState.ticketId}* (${simState.vehiculo}):\n` +
        `"${txt}"\n\n` +
        `👉 Ya podés enviar el PDF o texto del presupuesto.`;

      const next = {
        ...simState,
        estado: 'esperando_sucursal',
        clientThread: [
          ...simState.clientThread,
          { rol: 'cliente', autor: '👤 Cliente', texto: txt, fecha: now },
          { rol: 'bot', autor: '🤖 Bot Check-Oil', texto: botAckClient, fecha: now }
        ],
        branchThread: [
          ...simState.branchThread,
          { rol: 'bot_a_sucursal', autor: '🤖 Bot → Sucursal Centro', texto: botRelayToBranch, fecha: now }
        ]
      };
      setClientInput('');
      persistSim(next);
      return;
    }

    if (simState.estado === 'presupuesto_enviado') {
      const isConfirmation =
        /\b(dale|confirmo|acepto|lo hago|quiero turno|turno|reservo|reservar|voy|si\b|sí\b|perfecto lo hago|genial lo hago)/i.test(txt);

      if (isConfirmation) {
        const botConfirmClient =
          `¡Excelente! ✅ Ya dejamos *confirmado tu presupuesto #${simState.ticketId}* con *Check Oil Suc. ${simState.sucursalKey}* y les pasamos tu contacto directo para coordinar el turno.`;
        const botFinalDerivation =
          `✅ *PRESUPUESTO CONFIRMADO — DERIVACIÓN FINAL #${simState.ticketId}*\n` +
          `📍 Sucursal: Check Oil Suc. ${simState.sucursalKey}\n` +
          `🚗 Vehículo: ${simState.vehiculo}\n` +
          `💰 Presupuesto aceptado: $${(simState.parsedQuote?.total_cotizado || 0).toLocaleString('es-AR')} (${simState.parsedQuote?.resumen_items || ''})\n` +
          `👤 Cliente: ${simState.clienteNombre}\n` +
          `📞 Teléfono liberado: ${simState.clienteTelefono} (https://wa.me/${simState.clienteTelefono})\n` +
          `💬 Mensaje de confirmación: "${txt}"`;

        const nextQuotes = sandboxSavedQuotes.map((q) =>
          q.ticket_id === simState.ticketId ? { ...q, estado: 'confirmado', fecha_confirmacion: now } : q
        );
        setSandboxSavedQuotes(nextQuotes);

        const next = {
          ...simState,
          estado: 'confirmado',
          clientThread: [
            ...simState.clientThread,
            { rol: 'cliente', autor: '👤 Cliente', texto: txt, fecha: now },
            { rol: 'bot', autor: '🤖 Bot Check-Oil (Deriva recién al confirmar)', texto: botConfirmClient, fecha: now }
          ],
          branchThread: [
            ...simState.branchThread,
            { rol: 'derivacion_final', autor: '✅ Derivación Confirmada → Sucursal', texto: botFinalDerivation, fecha: now }
          ]
        };
        setClientInput('');
        persistSim(next, nextQuotes);
        notify(`✅ Presupuesto #${simState.ticketId} confirmado y recién ahora derivado a Suc. ${simState.sucursalKey}.`);
        return;
      }

      const botReaskClient =
        `¡Dale! Ya le consulto eso a *Check Oil Suc. ${simState.sucursalKey}* sobre tu presupuesto #${simState.ticketId} y te aviso enseguida.`;
      const botReaskBranch =
        `🔄 *CONSULTA DEL CLIENTE SOBRE PRESUPUESTO #${simState.ticketId}* (${simState.vehiculo}):\n` +
        `"${txt}"`;

      const next = {
        ...simState,
        estado: 'esperando_sucursal',
        clientThread: [
          ...simState.clientThread,
          { rol: 'cliente', autor: '👤 Cliente', texto: txt, fecha: now },
          { rol: 'bot', autor: '🤖 Bot Check-Oil', texto: botReaskClient, fecha: now }
        ],
        branchThread: [
          ...simState.branchThread,
          { rol: 'bot_a_sucursal', autor: '🤖 Bot → Sucursal Centro', texto: botReaskBranch, fecha: now }
        ]
      };
      setClientInput('');
      persistSim(next);
      return;
    }

    const next = {
      ...simState,
      clientThread: [
        ...simState.clientThread,
        { rol: 'cliente', autor: '👤 Cliente', texto: txt, fecha: now },
        {
          rol: 'bot',
          autor: '🤖 Bot Check-Oil',
          texto: `Sumé tu comentario al pedido *#${simState.ticketId}* que está cotizando *Suc. ${simState.sucursalKey}*. Enseguida te pasamos la respuesta.`,
          fecha: now
        }
      ],
      branchThread: [
        ...simState.branchThread,
        {
          rol: 'bot_a_sucursal',
          autor: '🤖 Bot → Sucursal Centro',
          texto: `➕ Dato adicional del cliente en *#${simState.ticketId}*: "${txt}"`,
          fecha: now
        }
      ]
    };
    setClientInput('');
    persistSim(next);
  };

  const processBranchReplyInSim = (rawText, fileName = '') => {
    const txt = String(rawText || '').trim();
    if (!txt) return;

    let baseSim = simState;
    const now = new Date().toISOString();
    if (baseSim.estado === 'sin_iniciar' || baseSim.estado === 'confirmado') {
      const autoTicket = `COT-${Math.floor(1000 + Math.random() * 9000)}`;
      baseSim = {
        ...INITIAL_SIM_STATE,
        ticketId: autoTicket,
        sucursalKey: simState.sucursalKey || 'Centro',
        vehiculo: 'Fiat Pulse Audace 2025 1.0 Turbo',
        estado: 'esperando_sucursal',
        fechaPedido: new Date(Date.now() - Number(simulatedDelayInput || 11) * 60000).toISOString(),
        clientThread: [
          {
            rol: 'cliente',
            autor: '👤 Cliente',
            texto: 'Hola! Quiero presupuesto de cambio de aceite y filtros en Sucursal Centro',
            fecha: now
          }
        ],
        branchThread: []
      };
    }

    const branchObj = BROKER_BRANCHES.find((b) => b.key === baseSim.sucursalKey) || BROKER_BRANCHES[0];
    const analysis = parseQuoteFromTextOrPdf(txt, {
      fileName,
      branchKey: branchObj.key,
      branchName: branchObj.name.replace(' (Bariloche)', '').replace(' (Avellaneda)', ''),
      vehicleHint: baseSim.vehiculo,
      ticketId: baseSim.ticketId,
      formatoOrigen: fileName ? 'pdf' : 'texto'
    });

    if (analysis.tipo_respuesta_sucursal === 'pregunta_al_cliente') {
      const next = {
        ...baseSim,
        estado: 'esperando_respuesta_cliente',
        branchThread: [
          ...baseSim.branchThread,
          {
            rol: 'sucursal',
            autor: `🏢 Suc. ${branchObj.key}`,
            texto: txt,
            fecha: now
          },
          {
            rol: 'bot_a_sucursal',
            autor: '⏸️ Reloj SLA Pausado',
            texto: 'El Bot pausó el cronómetro de demora de la sucursal mientras espera la respuesta del cliente.',
            fecha: now
          }
        ],
        clientThread: [
          ...baseSim.clientThread,
          {
            rol: 'bot',
            autor: '🤖 Bot Check-Oil (Traslada pregunta de Sucursal)',
            texto: analysis.pregunta_para_cliente,
            fecha: now
          }
        ]
      };
      setBranchInput('');
      persistSim(next);
      return;
    }

    const delayMin = Math.max(1, Number(simulatedDelayInput || 11));
    const pedidoIso = new Date(Date.now() - delayMin * 60000).toISOString();
    const fullQuote = {
      ...analysis.quoteRecord,
      cliente_nombre: baseSim.clienteNombre,
      cliente_telefono: baseSim.clienteTelefono,
      fecha_pedido: pedidoIso,
      fecha_respuesta: now,
      demora_total_min: delayMin,
      demora_habil_min: delayMin,
      demora_neta_sucursal_min: delayMin,
      estado: 'presupuesto_enviado',
      esSimulacionSandbox: true
    };

    const nextQuotes = [
      fullQuote,
      ...sandboxSavedQuotes.filter((q) => q.ticket_id !== fullQuote.ticket_id)
    ].slice(0, 50);
    setSandboxSavedQuotes(nextQuotes);

    const next = {
      ...baseSim,
      estado: 'presupuesto_enviado',
      fechaPedido: pedidoIso,
      fechaRespuesta: now,
      demoraSimuladaMin: delayMin,
      parsedQuote: fullQuote,
      branchThread: [
        ...baseSim.branchThread,
        {
          rol: 'sucursal',
          autor: `🏢 Suc. ${branchObj.key} ${fileName ? '(Envió PDF)' : '(Envió Texto)'}`,
          texto: fileName ? `📄 Archivo PDF: ${fileName}\n${txt.slice(0, 280)}` : txt,
          fecha: now
        },
        {
          rol: 'bot_a_sucursal',
          autor: '⏱️ Auditoría Registrada',
          texto:
            `✅ Demora hábil registrada: ${delayMin} min • Total extraído: $${(fullQuote.total_cotizado || 0).toLocaleString('es-AR')} • ` +
            `Filtros detectados: ${fullQuote.filtros.map((f) => f.codigo).join(', ') || 'Ninguno'}.`,
          fecha: now
        }
      ],
      clientThread: [
        ...baseSim.clientThread,
        {
          rol: 'bot',
          autor: '🤖 Bot Check-Oil (Resumen + PDF Adjunto)',
          texto:
            analysis.resumen_para_cliente +
            (fileName ? `\n\n📄 [PDF Adjunto Reenviado: ${fileName}]` : ''),
          fecha: now
        }
      ]
    };
    setBranchInput('');
    persistSim(next, nextQuotes);
    notify(`📄 Presupuesto #${fullQuote.ticket_id} analizado (${delayMin} min) y sumado a las estadísticas comparativas.`);
  };

  const handleUploadPdfInSimulator = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingPdf(true);
    try {
      const extracted = await extractRawTextFromPdfFile(file);
      if (extracted && extracted.length >= 12) {
        processBranchReplyInSim(extracted, file.name);
      } else {
        notify('ℹ️ PDF escaneado como imagen: en vivo n8n lo lee con IA Vision (GPT-4.1). Podés pegar los valores en texto para ensayar.');
        setBranchInput(`Presupuesto adjunto en ${file.name} — Total $165.000`);
      }
    } catch (err) {
      notify('⚠️ No se pudo leer el archivo PDF local: ' + (err?.message || ''));
    } finally {
      setIsParsingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleResetSim = () => {
    persistSim(INITIAL_SIM_STATE, sandboxSavedQuotes);
    notify('🔄 Hilo del simulador reiniciado.');
  };

  return (
    <div className="space-y-5 text-white">
      {bannerMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button type="button" onClick={() => setBannerMsg('')} className="underline ml-3">Cerrar</button>
        </div>
      )}

      {/* =======================================================================
          BARRA DE HERRAMIENTAS Y NAVEGACIÓN EXCLUSIVA DE PRESUPUESTOS
      ======================================================================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide border flex items-center gap-1.5 ${
                  activation.statusTone === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                    : activation.statusTone === 'amber'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {activation.statusBadge}
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/50 text-zinc-300 border border-zinc-800">
                {activation.inBizHours ? '🟢 En Horario Comercial' : '🌙 Fuera de Horario Comercial (SLA en pausa)'}
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                Pedidos Reales: {realAndSandboxQuotes.length} {showDemoPreview ? `(+${DEMO_PREVIEW_QUOTES.length} comparativos de muestra)` : ''}
              </span>

              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950 border border-orange-500/40 text-[11px]"
                title="Cambiar cada cuántos minutos hábiles el Bot le envía recordatorio por WhatsApp a la sucursal si no contestó el presupuesto"
              >
                <span className="font-black text-orange-400">⏰ Recordatorio: cada</span>
                <select
                  value={String(mergedCfg.sla_recordatorio_minutos || '15')}
                  disabled={savingCfg}
                  onChange={(e) => handleSaveConfigPatch({ sla_recordatorio_minutos: String(e.target.value) })}
                  className="bg-orange-500/20 text-orange-300 font-black px-1.5 py-0.5 rounded-md border border-orange-500/40 outline-none cursor-pointer"
                >
                  {['10', '15', '20', '25', '30', '45', '60'].map((m) => (
                    <option key={m} value={m} className="bg-zinc-900 text-white">
                      {m} min
                    </option>
                  ))}
                  {!['10', '15', '20', '25', '30', '45', '60'].includes(String(mergedCfg.sla_recordatorio_minutos || '15')) && (
                    <option value={String(mergedCfg.sla_recordatorio_minutos)} className="bg-zinc-900 text-white">
                      {mergedCfg.sla_recordatorio_minutos} min
                    </option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setSubView('config')}
                  className="text-[10px] text-zinc-400 hover:text-white underline ml-0.5"
                >
                  Personalizar
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl pt-1">
              Módulo exclusivo de cotizaciones: analiza cada charla y PDF enviado por las sucursales para comparar <b>qué filtros y aceites cotizan según el modelo de vehículo</b>, <b>diferencias de precios entre sucursales</b> y <b>demoras según la franja horaria del día</b>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDeepScanConversations}
              disabled={isScanningChats}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-all shadow-sm"
              title="Escanea todas las conversaciones y presupuestos recibidos para extraer códigos de filtros, aceites, precios y tiempos de respuesta"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningChats ? 'animate-spin' : ''}`} />
              {isScanningChats ? 'Analizando charlas...' : '🔍 Analizar Charlas y Cotizaciones'}
            </button>

            <button
              type="button"
              onClick={() => setShowQuickLoader((v) => !v)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 flex items-center gap-1.5 transition-all"
              title="Subir un PDF o pegar un presupuesto de cualquier sucursal para incorporarlo a la estadística comparativa"
            >
              <Upload className="w-3.5 h-3.5" />
              ➕ Cargar PDF / Cotización
            </button>

            <button
              type="button"
              onClick={() => setShowDemoPreview((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all ${
                showDemoPreview
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
              title="Muestra u oculta las 6 cotizaciones comparativas de referencia (Centro, Ñireco, Km13, Estadio) para visualizar todas las tablas y gráficos"
            >
              <Eye className="w-3.5 h-3.5" />
              {showDemoPreview ? 'Ocultar Muestra Comparativa' : 'Ver Muestra Multi-Sucursal'}
            </button>
          </div>
        </div>

        {/* CARGADOR RÁPIDO DE PRESUPUESTO (PDF O TEXTO) PARA AUDITORÍA */}
        {showQuickLoader && (
          <div className="mt-4 pt-4 border-t border-zinc-800 bg-black/40 p-4 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase text-orange-400 flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                Analizar y Sumar Presupuesto de Sucursal (PDF o Texto)
              </h4>
              <input
                ref={quickPdfRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleQuickUploadPdf}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => quickPdfRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-orange-500 text-black text-xs font-black flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Seleccionar Archivo PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Sucursal que cotizó</label>
                <select
                  value={quickBranch}
                  onChange={(e) => setQuickBranch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black text-white"
                >
                  {BROKER_BRANCHES.map((b) => (
                    <option key={b.key} value={b.key}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Modelo de Vehículo</label>
                <input
                  type="text"
                  value={quickVehicle}
                  onChange={(e) => setQuickVehicle(e.target.value)}
                  placeholder="Ej: Fiat Pulse 2025 1.0 / Toyota Hilux 2.8"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Demora de respuesta (min)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={quickDelayMin}
                  onChange={(e) => setQuickDelayMin(Number(e.target.value || 10))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-orange-400"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                rows={2}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="O pegá acá el texto del presupuesto (Ej: Motul 8100 0W20 4L $90.000, Filtro aceite WO-120 $14.500, Filtro aire FAP-3285 $24.000, Total $149.500)..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => handleQuickAnalyzeQuote()}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs shrink-0"
              >
                Analizar y Guardar →
              </button>
            </div>
          </div>
        )}

        {/* PESTAÑAS INTERNAS DEL MÓDULO DE PRESUPUESTOS */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-800">
          {[
            {
              id: 'overview',
              label: `📋 1. Pedidos y Charlas (${auditReport.totalQuotes})`,
              tooltip: 'Listado de todos los pedidos de presupuesto, estado en vivo, valores enviados y desglose de PDF/charla',
              icon: FileText
            },
            {
              id: 'models_matrix',
              label: `🚗 2. Filtros y Aceite por Modelo (${auditReport.vehicleModelsComparison.length})`,
              tooltip: 'Qué códigos de filtros (aceite, aire, combustible, habitáculo) y qué aceite cotiza cada sucursal para cada modelo de auto',
              icon: Car
            },
            {
              id: 'dispersion',
              label: `💲 3. Diferencias de Precios (${auditReport.discrepanciesCount} dif.)`,
              tooltip: 'Comparativa de precios unitarios del mismo filtro o litro de aceite entre sucursales (mínimo, máximo y % de dispersión)',
              icon: Scale
            },
            {
              id: 'delays_schedule',
              label: '⏱️ 4. Demoras y Franjas Horarias',
              tooltip: 'Estadística de tiempo de respuesta por sucursal y análisis de en qué horarios del día hay mayor o menor demora',
              icon: Clock
            },
            {
              id: 'simulator',
              label: '🧪 5. Simulador + Lector PDF',
              tooltip: 'Entorno de prueba Cliente ↔ Bot ↔ Sucursal Centro para ensayar cotizaciones y lectura de PDFs',
              icon: Sparkles
            },
            {
              id: 'config',
              label: '⚙️ 6. Sucursales y SLA',
              tooltip: 'Configurar qué sucursales operan con el Bot Intermediario, horarios hábiles y alerta de 25 min',
              icon: Building2
            }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id)}
                title={tab.tooltip}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                    : 'bg-black/60 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          KPIs GLOBALES DE COTIZACIÓN (SIEMPRE VISIBLES ARRIBA)
      ======================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setSubView('overview')}
          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl cursor-pointer transition-all"
          title="Total de pedidos de cotización registrados y cuántos están esperando respuesta de sucursal"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500">Pedidos de Cotización</p>
          <p className="text-2xl font-black text-white mt-1">{auditReport.totalQuotes}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Cotizados: <b className="text-emerald-400">{auditReport.respondedCount}</b> • Espera: <b className="text-amber-400">{auditReport.waitingCount}</b>
          </p>
        </div>

        <div
          onClick={() => setSubView('models_matrix')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-4 rounded-2xl cursor-pointer transition-all"
          title="Haz clic para ver qué filtros y aceites cotiza cada sucursal según el modelo de vehículo"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500">Modelos Comparados</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">{auditReport.vehicleModelsComparison.length}</p>
          <p className="text-[11px] text-orange-400 font-bold mt-1 flex items-center gap-1">
            {auditReport.modelsWithDifferenceCount} con dif. entre sucursales <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        <div
          onClick={() => setSubView('dispersion')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-4 rounded-2xl cursor-pointer transition-all"
          title="Haz clic para comparar diferencias de precios en códigos de filtros y litros de aceite entre sucursales"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500">Dispersión Filtros / Aceite</p>
          <p className={`text-2xl font-black mt-1 ${auditReport.discrepanciesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {auditReport.discrepanciesCount} ítems
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            De {auditReport.priceDispersionRows.length} productos auditados
          </p>
        </div>

        <div
          onClick={() => setSubView('delays_schedule')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-4 rounded-2xl cursor-pointer transition-all"
          title="Haz clic para ver las demoras promedio por sucursal y en qué horario del día tardan más o menos"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500">Demora Hábil Promedio</p>
          <p className="text-2xl font-black text-orange-400 mt-1">
            {auditReport.globalAvgDelayMin != null ? `${auditReport.globalAvgDelayMin} min` : '—'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            {auditReport.slowestSlot ? `Pico demora: ${auditReport.slowestSlot.shortLabel}` : `Meta SLA ≤ ${activation.slaMinutes} min`}
          </p>
        </div>

        <div
          onClick={() => setSubView('overview')}
          className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl"
          title="Porcentaje de presupuestos enviados que fueron aceptados/confirmados por el cliente"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500">Aceptación / Confirmados</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {auditReport.confirmedCount}{' '}
            <span className="text-sm text-zinc-500">({auditReport.globalAcceptancePct}%)</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Derivados tras aceptar valor
          </p>
        </div>
      </div>

      {/* =======================================================================
          VISTA 1: PEDIDOS DE COTIZACIÓN, VALORES ENVIADOS Y CHARLAS ANALIZADAS
      ======================================================================= */}
      {subView === 'overview' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide">
                  Pedidos de Cotización, Valores Enviados y Análisis de Filtros / Aceite ({auditReport.enrichedQuotes.length})
                </h4>
                <p className="text-xs text-zinc-400">
                  Haz clic en cualquier pedido para ver qué filtros y aceite cotizó la sucursal, cuánto tardó, en qué franja horaria entró y la charla con el cliente.
                </p>
              </div>
            </div>

            {auditReport.enrichedQuotes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-3">
                <p className="font-black text-sm text-zinc-200">
                  No hay pedidos en este filtro.
                </p>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDemoPreview(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-500 text-white text-xs font-black"
                  >
                    Ver Muestra Comparativa Multi-Sucursal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickLoader(true)}
                    className="px-3.5 py-2 rounded-xl bg-orange-500 text-black text-xs font-black"
                  >
                    ➕ Subir un PDF o Cotización
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {auditReport.enrichedQuotes.map((q) => {
                  const isOpen = expandedTicketId === q.ticket_id;
                  return (
                    <div
                      key={q.ticket_id}
                      className={`border rounded-2xl overflow-hidden transition-all ${
                        q.isDemoPreview
                          ? 'border-purple-500/30 bg-purple-950/10'
                          : 'border-zinc-800 bg-black/30'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedTicketId(isOpen ? null : q.ticket_id)}
                        className="p-4 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-zinc-800/40"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                              #{q.ticket_id}
                            </span>
                            {q.isDemoPreview ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                MUESTRA COMPARATIVA
                              </span>
                            ) : (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                DATO REAL
                              </span>
                            )}
                            <span className="text-xs font-black text-white">
                              Suc. {q.sucursal} — {q.vehiculo}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300">
                              🕒 {q.requestHourFormatted} ({q.shortSlot})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-cyan-300 uppercase">
                              {q.formato_origen}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium">
                            {q.resumen_items || 'Esperando detalle de ítems de la sucursal...'}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {q.effectiveDelay != null && (
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 ${
                                q.exceededSla
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}
                              title={`Pedido: ${q.requestHourFormatted} • Respuesta: ${q.responseHourFormatted}`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {q.effectiveDelay} min
                            </span>
                          )}

                          {q.total_cotizado > 0 && (
                            <span className="text-sm font-black text-white font-mono bg-zinc-800/80 px-2.5 py-1 rounded-xl border border-zinc-700">
                              ${Number(q.total_cotizado).toLocaleString('es-AR')}
                            </span>
                          )}

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              q.estado === 'confirmado'
                                ? 'bg-emerald-500 text-black'
                                : q.estado === 'presupuesto_enviado'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {q.estado === 'confirmado'
                              ? '✅ Confirmado'
                              : q.estado === 'presupuesto_enviado'
                                ? 'Presupuesto Enviado'
                                : q.estado === 'esperando_respuesta_cliente'
                                  ? 'Repregunta al Cliente'
                                  : 'Esperando Sucursal'}
                          </span>

                          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-4 pt-0 border-t border-zinc-800/80 bg-zinc-950/70 text-xs space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">⏱️ Tiempos y Franja Horaria</p>
                              <p><b>Franja:</b> {q.timeSlotLabel}</p>
                              <p><b>Hora Pedido:</b> {q.fecha_pedido ? new Date(q.fecha_pedido).toLocaleString('es-AR') : '—'}</p>
                              <p><b>Hora Respuesta:</b> {q.fecha_respuesta ? new Date(q.fecha_respuesta).toLocaleString('es-AR') : 'Pendiente'}</p>
                              <p><b>Demora Hábil Neta:</b> <span className="text-orange-400 font-black">{q.effectiveDelay ?? '—'} min</span></p>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">🛢️ Aceite Cotizado</p>
                              {q.aceite && q.aceite.marca ? (
                                <>
                                  <p className="font-black text-orange-400 text-sm">
                                    {q.aceite.marca} {q.aceite.linea || ''} {q.aceite.viscosidad || ''}
                                  </p>
                                  <p>Litros cotizados: <b>{q.aceite.litros || '-'} L</b></p>
                                  <p>
                                    Valor por Litro: <b className="font-mono text-emerald-400">${Number(q.aceite.precio_por_litro || 0).toLocaleString('es-AR')}/L</b>
                                  </p>
                                  <p>
                                    Subtotal Aceite: <b className="font-mono">${Number(q.aceite.subtotal || 0).toLocaleString('es-AR')}</b>
                                  </p>
                                </>
                              ) : (
                                <p className="text-zinc-500">Sin aceite detallado aún.</p>
                              )}
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">
                                🔧 Filtros Cotizados ({(q.filtros || []).length})
                              </p>
                              {(q.filtros || []).length > 0 ? (
                                <ul className="space-y-1.5">
                                  {q.filtros.map((f, i) => (
                                    <li key={i} className="flex justify-between items-center bg-black/40 px-2.5 py-1 rounded-lg border border-zinc-800">
                                      <span>
                                        <b className="font-mono text-amber-300">{f.codigo}</b>{' '}
                                        <span className="text-[10px] uppercase text-zinc-400">({f.tipo})</span>
                                      </span>
                                      <span className="font-mono font-black text-white">
                                        ${Number(f.precio_unitario || f.subtotal || 0).toLocaleString('es-AR')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-zinc-500">Sin códigos individuales detallados.</p>
                              )}
                            </div>
                          </div>

                          {/* Si tiene historial de charla de la sesión, mostrarlo aquí mismo sin salir del módulo */}
                          {Array.isArray(q.historial_charla) && q.historial_charla.length > 0 && (
                            <div className="p-3 rounded-xl bg-black/50 border border-zinc-800 space-y-1.5">
                              <p className="text-[10px] font-black uppercase text-zinc-400">
                                💬 Mensajes de la Conversación ({q.historial_charla.length})
                              </p>
                              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                                {q.historial_charla.slice(-8).map((m, idx) => (
                                  <div key={idx} className="text-[11px] flex gap-2">
                                    <span className={`font-black uppercase shrink-0 ${m.rol === 'cliente' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                      {m.rol === 'cliente' ? 'Cliente:' : 'Bot:'}
                                    </span>
                                    <span className="text-zinc-300">{m.texto}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                            <span className="text-zinc-400">
                              <b>Análisis de Auditoría:</b> {q.observaciones_calidad || 'Sin observaciones.'}
                              {q.archivo_nombre ? ` • Archivo: ${q.archivo_nombre}` : ''}
                            </span>
                            {onOpenChatSession && q.cliente_jid && (
                              <button
                                type="button"
                                onClick={() => onOpenChatSession(q.cliente_jid)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-300 border border-orange-500/30 font-black text-xs"
                              >
                                Ver charla completa →
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          VISTA 2: QUÉ FILTROS Y ACEITE COTIZAN PARA CADA MODELO ENTRE SUCURSALES
      ======================================================================= */}
      {subView === 'models_matrix' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-orange-500" />
                Matriz por Modelo: ¿Qué Filtros y Qué Aceite Cotiza Cada Sucursal?
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Compara para un mismo vehículo qué códigos de filtro (Aceite, Aire, Combustible, Habitáculo), qué lubricante y qué valor total pasó cada sucursal. Detecta si una sucursal cotiza un código distinto para el mismo auto.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Buscar modelo, filtro (WO-120) o sucursal..."
                className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {filteredVehicleModels.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
              No se encontraron modelos con ese filtro. Activa <b>“Ver Muestra Multi-Sucursal”</b> arriba o carga un PDF para comparar.
            </div>
          ) : (
            <div className="space-y-5">
              {filteredVehicleModels.map((modelGroup) => (
                <div
                  key={modelGroup.modelo}
                  className="border border-zinc-800 rounded-2xl overflow-hidden bg-black/30"
                >
                  <div className="p-4 bg-zinc-950/90 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        🚗 {modelGroup.modelo}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300">
                        {modelGroup.quotesCount} {modelGroup.quotesCount === 1 ? 'cotización' : 'cotizaciones'} ({modelGroup.branchesList.join(', ')})
                      </span>

                      {modelGroup.hasCodeMismatch && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Distinto código de filtro entre sucursales ({modelGroup.filterCodeMismatch.join(' • ')})
                        </span>
                      )}

                      {modelGroup.hasPriceSpread && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          ⚠️ Diferencia de Total: +${modelGroup.diffTotalAbs.toLocaleString('es-AR')} (+{modelGroup.diffTotalPct}%)
                        </span>
                      )}
                    </div>

                    {modelGroup.minTotal > 0 && (
                      <div className="text-xs font-mono text-zinc-300">
                        Rango Service Completo:{' '}
                        <b className="text-emerald-400">${modelGroup.minTotal.toLocaleString('es-AR')}</b>
                        {modelGroup.maxTotal > modelGroup.minTotal && (
                          <>
                            {' '}a <b className="text-rose-400">${modelGroup.maxTotal.toLocaleString('es-AR')}</b>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-black/50 border-b border-zinc-800 text-[10px] font-black uppercase text-zinc-400">
                          <th className="p-3">Sucursal</th>
                          <th className="p-3">Aceite Cotizado ($/L y Total)</th>
                          <th className="p-3">Filtro Aceite</th>
                          <th className="p-3">Filtro Aire</th>
                          <th className="p-3">Filtro Combustible</th>
                          <th className="p-3">Filtro Habitáculo</th>
                          <th className="p-3 text-right">Total Service</th>
                          <th className="p-3 text-center">Demora</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {modelGroup.cotizaciones.map((c) => (
                          <tr key={c.ticket_id} className="hover:bg-zinc-900/50">
                            <td className="p-3 font-black text-white whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 mr-1.5">
                                {c.sucursal}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">#{c.ticket_id}</span>
                            </td>
                            <td className="p-3">
                              {c.aceite && c.aceite.marca ? (
                                <div>
                                  <p className="font-black text-orange-300">
                                    {c.oilLabel} ({c.aceite.litros}L)
                                  </p>
                                  <p className="text-[11px] font-mono text-zinc-400">
                                    ${Number(c.aceite.precio_por_litro || 0).toLocaleString('es-AR')}/L • Sub: ${Number(c.aceite.subtotal || 0).toLocaleString('es-AR')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            {['aceite', 'aire', 'combustible', 'habitaculo'].map((tKey) => {
                              const fItem = c.filtrosPorTipo[tKey];
                              return (
                                <td key={tKey} className="p-3 font-mono">
                                  {fItem ? (
                                    <div>
                                      <span className="font-black text-amber-300 block">{fItem.codigo}</span>
                                      <span className="text-[11px] text-zinc-300">
                                        ${fItem.precio.toLocaleString('es-AR')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-600">No cotizado</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-3 text-right font-mono font-black text-sm text-white">
                              ${c.total_cotizado.toLocaleString('es-AR')}
                            </td>
                            <td className="p-3 text-center">
                              {c.demora_min != null ? (
                                <span
                                  className={`px-2 py-0.5 rounded-lg font-mono font-black text-[11px] ${
                                    c.demora_min > activation.slaMinutes
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}
                                >
                                  {c.demora_min}m
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VISTA 3: DIFERENCIAS DE PRECIOS ENTRE FILTROS Y ENTRE ACEITES POR SUCURSAL
      ======================================================================= */}
      {subView === 'dispersion' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-orange-500" />
                Comparativa de Precios por Filtro y por Litro de Aceite entre Sucursales
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Compara el valor exacto de cada código de filtro (ej. <code className="text-amber-300">WO-120</code>, <code className="text-amber-300">FAP-3285</code>, <code className="text-amber-300">WO-130</code>) y de cada aceite normalizado por litro entre todas las sucursales.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-black/50 p-1.5 rounded-xl border border-zinc-800">
              {[
                { id: 'all', label: `Todos (${auditReport.priceDispersionRows.length})` },
                { id: 'filtro', label: '🔧 Solo Filtros' },
                { id: 'aceite', label: '🛢️ Solo Aceites ($/L)' }
              ].map((fBtn) => (
                <button
                  key={fBtn.id}
                  type="button"
                  onClick={() => setDispersionFilter(fBtn.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    dispersionFilter === fBtn.id
                      ? 'bg-orange-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {fBtn.label}
                </button>
              ))}
            </div>
          </div>

          {filteredDispersionRows.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
              Aún no hay productos en este filtro. Activa <b>“Ver Muestra Multi-Sucursal”</b> o sube un PDF para comparar valores.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Código / Producto</th>
                    <th className="p-3.5">Tipo y Vehículos</th>
                    <th className="p-3.5">Precio Cotizado en Cada Sucursal</th>
                    <th className="p-3.5 text-right">Mínimo vs Máximo</th>
                    <th className="p-3.5 text-center">Diferencia entre Sucursales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredDispersionRows.map((row) => (
                    <tr key={row.itemKey} className="hover:bg-zinc-800/40">
                      <td className="p-3.5">
                        <span className="font-mono font-black text-white text-sm block">{row.codigo}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">{row.categoria}</span>
                      </td>
                      <td className="p-3.5 text-zinc-300">
                        <div className="flex flex-wrap gap-1">
                          {(row.modelosList || []).map((m, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-bold text-zinc-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {row.entries.map((e) => {
                            const isMax = row.branchesCount > 1 && e.lastPrice === row.maxPrice && row.hasDiscrepancy;
                            const isMin = row.branchesCount > 1 && e.lastPrice === row.minPrice && row.hasDiscrepancy;
                            return (
                              <span
                                key={e.sucursal}
                                className={`px-2.5 py-1 rounded-lg border font-bold ${
                                  isMax
                                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                                    : isMin
                                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                      : 'bg-black/50 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                <b>{e.sucursal}:</b>{' '}
                                <span className="font-mono font-black">${e.lastPrice.toLocaleString('es-AR')}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-zinc-200 whitespace-nowrap">
                        <span className="text-emerald-400">${row.minPrice.toLocaleString('es-AR')}</span>
                        {' → '}
                        <span className="text-rose-400">${row.maxPrice.toLocaleString('es-AR')}</span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {row.branchesCount < 2 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] bg-zinc-800 text-zinc-400 font-bold">
                            1 sucursal registrada ({row.entries[0]?.sucursal})
                          </span>
                        ) : row.hasDiscrepancy ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ⚠️ +{row.diffPct}% (+${row.diffAbs.toLocaleString('es-AR')} en {row.priciestBranch} vs {row.cheapestBranch})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✅ Mismo Precio ($0 dif.)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          VISTA 4: ESTADÍSTICAS DE DEMORA POR SUCURSAL Y POR FRANJA HORARIA
      ======================================================================= */}
      {subView === 'delays_schedule' && (
        <div className="space-y-5">
          {/* CONCLUSIÓN AUTOMÁTICA DE FRANJAS HORARIAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-rose-400">
                  Horario con Mayor Demora Detectada
                </p>
                <p className="text-base font-black text-white mt-0.5">
                  {auditReport.slowestSlot ? auditReport.slowestSlot.label : 'Sin datos suficientes'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {auditReport.slowestSlot
                    ? `Promedio de ${auditReport.slowestSlot.avgDelayMin} min hábiles (máx. ${auditReport.slowestSlot.maxDelayMin} min) en ${auditReport.slowestSlot.totalPedidos} pedidos.`
                    : 'A medida que entren cotizaciones se identificará la franja cuello de botella.'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-emerald-400">
                  Horario más Rápido para Cotizar
                </p>
                <p className="text-base font-black text-white mt-0.5">
                  {auditReport.fastestSlot ? auditReport.fastestSlot.label : 'Sin datos suficientes'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {auditReport.fastestSlot
                    ? `Promedio de solo ${auditReport.fastestSlot.avgDelayMin} min hábiles (${auditReport.fastestSlot.totalPedidos} pedidos en esa franja).`
                    : 'Se calculará automáticamente con los pedidos respondidos.'}
                </p>
              </div>
            </div>
          </div>

          {/* MAPA DE DEMORAS SEGÚN FRANJA HORARIA DEL DÍA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                ¿Hay Más o Menos Demora Según el Horario del Día? (Análisis por Franja Horaria)
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mide cuánto tardan las sucursales en responder un presupuesto según la hora en que entra la consulta del cliente.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {auditReport.hourlySlotStats.map((slot) => {
                const pctBar = slot.avgDelayMin ? Math.min(100, Math.round((slot.avgDelayMin / 35) * 100)) : 0;
                const isSlow = slot.avgDelayMin != null && slot.avgDelayMin > activation.slaMinutes;
                const isMedium = slot.avgDelayMin != null && slot.avgDelayMin > 15 && slot.avgDelayMin <= activation.slaMinutes;
                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-black/40 border border-zinc-800 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <p className="text-xs font-black text-white">{slot.label}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{slot.description}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-zinc-400 font-bold">
                          {slot.totalPedidos} {slot.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                        </span>
                        <span
                          className={`text-lg font-mono font-black ${
                            slot.avgDelayMin == null
                              ? 'text-zinc-600'
                              : isSlow
                                ? 'text-rose-400'
                                : isMedium
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                          }`}
                        >
                          {slot.avgDelayMin != null ? `${slot.avgDelayMin} min` : '—'}
                        </span>
                      </div>

                      <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isSlow ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pctBar}%` }}
                        />
                      </div>

                      {slot.branchBreakdown.length > 0 && (
                        <div className="pt-1 flex flex-wrap gap-1">
                          {slot.branchBreakdown.map((b) => (
                            <span
                              key={b.sucursal}
                              className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                            >
                              {b.sucursal}: <b>{b.avgMin}m</b>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RANKING DE TIEMPOS Y VELOCIDAD POR SUCURSAL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-4 px-5 border-b border-zinc-800">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">
                Comparativa de Tiempos de Respuesta, Modalidad (PDF vs Texto) y Ticket Promedio por Sucursal
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Sucursal</th>
                    <th className="p-3.5 text-center">Estado Piloto</th>
                    <th className="p-3.5 text-center">Pedidos</th>
                    <th className="p-3.5 text-center">Demora Promedio (Mín / Máx)</th>
                    <th className="p-3.5 text-center">% Rápidos (≤15m)</th>
                    <th className="p-3.5 text-center">Excesos &gt;{activation.slaMinutes}m</th>
                    <th className="p-3.5 text-center">% en PDF</th>
                    <th className="p-3.5 text-right">Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {auditReport.branchStats.map((b) => {
                    const isPilot = activeBranches.includes(b.key);
                    return (
                      <tr key={b.key} className="hover:bg-zinc-800/40">
                        <td className="p-3.5 font-black text-white">{b.name}</td>
                        <td className="p-3.5 text-center">
                          {isPilot ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              INTERMEDIARIO ACTIVO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">
                              Derivación Clásica
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-black text-white">{b.total}</td>
                        <td className="p-3.5 text-center font-mono font-black">
                          {b.avgDelayMin != null ? (
                            <span
                              className={`px-2.5 py-1 rounded-lg ${
                                b.avgDelayMin <= 15
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : b.avgDelayMin <= activation.slaMinutes
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {b.avgDelayMin} min (mín {b.minDelayMin}m / máx {b.maxDelayMin}m)
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-400">
                          {b.respondedCount > 0 ? `${b.fastPct}%` : '—'}
                        </td>
                        <td className="p-3.5 text-center">
                          {b.slaBreaches > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black">
                              {b.slaBreaches} alerta{b.slaBreaches > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-zinc-500">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-zinc-300">
                          {b.respondedCount > 0 ? `${b.pdfPct}% PDF` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-white">
                          {b.avgTicketArs > 0 ? `$${b.avgTicketArs.toLocaleString('es-AR')}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          VISTA 5: SIMULADOR EN VIVO 3 VÍAS (CLIENTE <-> BOT <-> SUC. CENTRO + PDF)
      ======================================================================= */}
      {subView === 'simulator' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black uppercase mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Entorno de Ensayo 100% Seguro (No envía WhatsApp real)
              </div>
              <h4 className="text-base font-black text-white">
                🧪 Simulador Completo: Cliente ↔ Bot Intermediario ↔ Sucursal {simState.sucursalKey} + Lector PDF
              </h4>
              <p className="text-xs text-zinc-400">
                Pide un presupuesto como cliente, repregunta o sube un PDF real como Sucursal {simState.sucursalKey}, y observa cómo extrae los filtros, el aceite y la demora.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={simState.sucursalKey}
                onChange={(e) => persistSim({ ...simState, sucursalKey: e.target.value })}
                className="bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black text-white"
              >
                {BROKER_BRANCHES.map((b) => (
                  <option key={b.key} value={b.key}>Suc. {b.key}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleResetSim}
                className="px-3 py-2 rounded-xl bg-black hover:bg-zinc-800 text-xs font-bold flex items-center gap-1 border border-zinc-700 text-zinc-200"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* COLUMNA IZQUIERDA: WHATSAPP DEL CLIENTE */}
            <div className="border border-zinc-800 rounded-2xl flex flex-col overflow-hidden bg-[#0b141a] text-white min-h-[430px]">
              <div className="px-4 py-3 bg-[#202c33] border-b border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-emerald-400">📱 LADO 1: Chat WhatsApp del Cliente</p>
                  <p className="text-[11px] text-zinc-400">Estado actual: <b>{simState.estado.replace(/_/g, ' ').toUpperCase()}</b></p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-orange-300">
                  #{simState.ticketId}
                </span>
              </div>

              <div className="p-2.5 bg-[#111b21] border-b border-white/5 flex flex-wrap gap-1.5">
                {simState.estado === 'sin_iniciar' || simState.estado === 'confirmado' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClientSendInSim('Hola! Quiero presupuesto de cambio de aceite y filtros para mi Fiat Pulse Audace 2025 1.0 en Sucursal Centro')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                    >
                      1️⃣ Pedir presupuesto Pulse 2025 1.0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClientSendInSim('Hola! Quiero presupuesto de cambio de aceite y todos los filtros para una Hilux 2019 2.8 en Sucursal Centro')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                    >
                      1️⃣ Pedir presupuesto Hilux 2019
                    </button>
                  </>
                ) : simState.estado === 'esperando_respuesta_cliente' ? (
                  <button
                    type="button"
                    onClick={() => handleClientSendInSim('Prefiero aceite sintético Motul 8100 y cambiar todos los filtros')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold"
                  >
                    💬 Responder a la pregunta de Centro
                  </button>
                ) : simState.estado === 'presupuesto_enviado' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClientSendInSim('Dale excelente! Confirmo el presupuesto, quiero reservar turno')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-black"
                    >
                      ✅ Confirmar Presupuesto (Dispara Derivación)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClientSendInSim('¿Y con aceite Gulf cuánto me quedaría?')}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] font-bold"
                    >
                      🔄 Pedir recotización con otro aceite
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-300 px-1">
                    ⏳ Esperando respuesta de Suc. {simState.sucursalKey} en el panel derecho →
                  </span>
                )}
              </div>

              <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto max-h-[300px]">
                {simState.clientThread.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10">
                    Haz clic en un botón de arriba o escribe abajo como si fueras un cliente pidiendo presupuesto.
                  </p>
                ) : (
                  simState.clientThread.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.rol === 'cliente' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap ${
                          m.rol === 'cliente'
                            ? 'bg-[#005c4b] text-white rounded-tr-sm'
                            : 'bg-[#202c33] text-zinc-100 rounded-tl-sm border border-white/10'
                        }`}
                      >
                        <p className="text-[10px] font-black text-emerald-300 mb-0.5">{m.autor}</p>
                        {m.texto}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleClientSendInSim();
                }}
                className="p-2.5 bg-[#202c33] flex gap-2"
              >
                <input
                  type="text"
                  value={clientInput}
                  onChange={(e) => setClientInput(e.target.value)}
                  placeholder="Escribir como Cliente..."
                  className="flex-1 bg-[#2a3942] rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#00a884] text-black font-black text-xs flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </form>
            </div>

            {/* COLUMNA DERECHA: WHATSAPP INTERNO DE SUCURSAL CENTRO + SUBIDA PDF */}
            <div className="border border-zinc-800 rounded-2xl flex flex-col overflow-hidden bg-zinc-950 text-white min-h-[430px]">
              <div className="px-4 py-3 bg-black/60 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <p className="text-xs font-black text-orange-400">
                    🏢 LADO 2: WhatsApp de Sucursal {simState.sucursalKey}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    No ve el teléfono del cliente hasta que confirme
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-zinc-400">Demora simulada:</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={simulatedDelayInput}
                    onChange={(e) => setSimulatedDelayInput(Number(e.target.value || 10))}
                    className="w-14 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-orange-400 text-center"
                  />
                  <span className="text-zinc-400">min</span>
                </div>
              </div>

              <div className="p-2.5 bg-zinc-900/80 border-b border-zinc-800 flex flex-wrap gap-1.5">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleUploadPdfInSimulator}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isParsingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-[11px] font-black flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  {isParsingPdf ? 'Leyendo PDF...' : 'Subir PDF de Presupuesto Real'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    processBranchReplyInSim(
                      'Aceite MOTUL 8100 0W20 x 4 Litros $90.000\nFiltro Aceite WEGA WO-120 $14.500\nFiltro Aire WEGA FAP-3285 $24.000\nFiltro Habitáculo AKX-1938 $21.000\nTotal Presupuesto: $149.500 (10% descuento efectivo)',
                      'Presupuesto_Centro_Pulse.pdf'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                >
                  📄 Simular PDF Pulse ($149.500)
                </button>

                <button
                  type="button"
                  onClick={() => processBranchReplyInSim('¿Quiere aceite sintético Motul 0W20 o Gulf? ¿Incluimos filtro de habitáculo?')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold"
                >
                  ❓ Hacerle pregunta al Cliente
                </button>
              </div>

              <div className="flex-1 p-3.5 space-y-2.5 overflow-y-auto max-h-[300px]">
                {simState.branchThread.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10">
                    Aquí aparece el pedido que recibe la sucursal (sin teléfono del cliente) o puedes tocar <b>“Subir PDF de Presupuesto Real”</b> directamente para probar el analizador.
                  </p>
                ) : (
                  simState.branchThread.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.rol === 'sucursal' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs whitespace-pre-wrap ${
                          m.rol === 'derivacion_final'
                            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-100'
                            : m.rol === 'sucursal'
                              ? 'bg-orange-500/20 border border-orange-500/40 text-orange-100'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                        }`}
                      >
                        <p className="text-[10px] font-black text-orange-400 mb-0.5">{m.autor}</p>
                        {m.texto}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processBranchReplyInSim(branchInput, '');
                }}
                className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex gap-2"
              >
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder={`Escribir respuesta o pregunta como Suc. ${simState.sucursalKey}...`}
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-orange-500 text-black font-black text-xs flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Responder al Bot
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          VISTA 6: CONFIGURACIÓN DE SUCURSALES PILOTO Y HORARIO SLA
      ======================================================================= */}
      {subView === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              1. Sucursales en Modo Intermediario (Sin Derivar hasta Confirmar)
            </h4>
            <p className="text-xs text-zinc-400">
              Las sucursales activadas acá reciben solicitudes de cotización <code className="text-orange-300">#COT-XXXX</code> sin teléfono del cliente. Las demás siguen derivando directo.
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'activo', label: '🟢 Activo en Vivo', activeCls: 'bg-emerald-500 text-black border-emerald-400' },
                { id: 'programado', label: `🗓️ Programado (${activation.targetDate})`, activeCls: 'bg-amber-500 text-black border-amber-400' },
                { id: 'false', label: '⚪ Apagado', activeCls: 'bg-zinc-700 text-white border-zinc-500' }
              ].map((m) => {
                const selected = activation.mode === m.id || (m.id === 'activo' && activation.mode === 'true');
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={savingCfg}
                    onClick={() => handleSaveConfigPatch({ modo_presupuesto_intermediario: m.id })}
                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${
                      selected
                        ? `${m.activeCls} shadow-sm`
                        : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BROKER_BRANCHES.map((b) => {
                const checked = activeBranches.includes(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => handleToggleBranch(b.key)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      checked
                        ? 'bg-orange-500/15 border-orange-500 text-white'
                        : 'bg-black/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black">Suc. {b.key}</p>
                      <p className="text-[10px] font-mono opacity-75">+{b.phone}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        checked ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {checked ? 'INTERMEDIARIO ON' : 'DERIVACIÓN CLÁSICA'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              2. Horario Comercial y Alerta de Demora (SLA)
            </h4>
            <p className="text-xs text-zinc-400">
              El reloj de demora de la sucursal cuenta únicamente los minutos dentro de este horario (descontando noches, domingos y el tiempo que tarde el cliente en responder repreguntas).
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Lun a Vie — Apertura</label>
                <input
                  type="time"
                  value={bizHours.lun_vie_apertura}
                  onChange={(e) => handleUpdateScheduleField('lun_vie_apertura', e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Lun a Vie — Cierre</label>
                <input
                  type="time"
                  value={bizHours.lun_vie_cierre}
                  onChange={(e) => handleUpdateScheduleField('lun_vie_cierre', e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Sábados — Apertura</label>
                <input
                  type="time"
                  value={bizHours.sab_apertura}
                  onChange={(e) => handleUpdateScheduleField('sab_apertura', e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Sábados — Cierre</label>
                <input
                  type="time"
                  value={bizHours.sab_cierre}
                  onChange={(e) => handleUpdateScheduleField('sab_cierre', e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <label className="block text-xs font-black uppercase text-orange-400">
                ⏰ Cada cuántos minutos hábiles enviar recordatorio a la sucursal
              </label>
              <p className="text-[11px] text-zinc-400">
                Si la sucursal no responde el presupuesto, el Bot le envía un recordatorio por WhatsApp cada la cantidad de minutos que elijas acá (por defecto <b>15 minutos</b>).
              </p>

              <div className="flex flex-wrap items-center gap-1.5">
                {[10, 15, 20, 25, 30, 45, 60].map((minVal) => {
                  const isCurrent = Number(mergedCfg.sla_recordatorio_minutos || 15) === minVal;
                  return (
                    <button
                      key={minVal}
                      type="button"
                      disabled={savingCfg}
                      onClick={() => handleSaveConfigPatch({ sla_recordatorio_minutos: String(minVal) })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                        isCurrent
                          ? 'bg-orange-500 text-black border-orange-400 shadow-sm'
                          : 'bg-black/60 text-zinc-300 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      Cada {minVal} min {minVal === 15 ? '★' : ''}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">Valor libre (min):</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    step={1}
                    value={mergedCfg.sla_recordatorio_minutos || 15}
                    onChange={(e) => handleSaveConfigPatch({ sla_recordatorio_minutos: String(Math.max(5, Number(e.target.value || 15))) })}
                    className="w-24 bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-sm font-mono font-black text-orange-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">Máx. recordatorios por pedido:</span>
                  <select
                    value={String(mergedCfg.max_recordatorios_sla || '3')}
                    onChange={(e) => handleSaveConfigPatch({ max_recordatorios_sla: String(e.target.value) })}
                    className="bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-black text-white"
                  >
                    <option value="1">1 aviso</option>
                    <option value="2">2 avisos</option>
                    <option value="3">3 avisos (Recomendado)</option>
                    <option value="5">5 avisos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
