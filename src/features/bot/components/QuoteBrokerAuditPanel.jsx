import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  workflowDownloadUrl = './CheckOil_Workflow_Intermediario_v2.2.json',
  lastSync = '',
  isSyncing = false
}) {
  // 6 vistas exclusivas de presupuestos y auditoría (Piloto Sucursal Centro)
  // 'overview' | 'models_matrix' | 'dispersion' | 'delays_schedule' | 'simulator' | 'config'
  const [subView, setSubView] = useState('overview');
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');
  const [dispersionFilter, setDispersionFilter] = useState('all'); // 'all' | 'filtro' | 'aceite'
  const [modelSearch, setModelSearch] = useState('');
  const [isScanningChats, setIsScanningChats] = useState(false);
  const [localBalloon, setLocalBalloon] = useState(null);

  useEffect(() => {
    if (!isMirrorSandbox) return;
    const handleMouseOver = (e) => {
      const target = e.target?.closest?.('[data-globo], [title]');
      if (!target) {
        setLocalBalloon(null);
        return;
      }
      const rawTitle = target.getAttribute('title');
      if (rawTitle) {
        target.setAttribute('data-globo', rawTitle);
        target.removeAttribute('title');
      }
      const text = target.getAttribute('data-globo');
      if (!text || text.trim().length < 2) {
        setLocalBalloon(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      const balloonWidth = 290;
      const left = Math.max(12, Math.min(window.innerWidth - balloonWidth - 12, rect.left + rect.width / 2 - balloonWidth / 2));
      const placeAbove = rect.bottom + 110 > window.innerHeight && rect.top > 110;
      const top = placeAbove ? Math.max(12, rect.top - 10) : Math.min(window.innerHeight - 80, rect.bottom + 8);
      setLocalBalloon({ text: text.trim(), top, left, placeAbove });
    };
    const handleClear = () => setLocalBalloon(null);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mousedown', handleClear, true);
    document.addEventListener('scroll', handleClear, true);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mousedown', handleClear, true);
      document.removeEventListener('scroll', handleClear, true);
    };
  }, [isMirrorSandbox]);

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
    () => extractAllQuotesFromSessions(sessions, sandboxSavedQuotes, activeBranches),
    [sessions, sandboxSavedQuotes, activeBranches]
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
    <div className="space-y-4 text-white">
      {localBalloon && (
        <div
          style={{
            top: `${localBalloon.top}px`,
            left: `${localBalloon.left}px`,
            transform: localBalloon.placeAbove ? 'translateY(-100%)' : 'none'
          }}
          className="fixed z-[160] w-[290px] pointer-events-none bg-zinc-950/95 backdrop-blur-md border border-orange-500/60 rounded-2xl p-3 shadow-[0_15px_40px_rgba(0,0,0,0.9)] animate-in fade-in duration-100"
        >
          <div className="flex items-start gap-2">
            <span className="text-orange-400 text-xs font-black shrink-0 mt-0.5">💬</span>
            <p className="text-[11px] text-zinc-200 leading-relaxed font-sans">{localBalloon.text}</p>
          </div>
        </div>
      )}
      {bannerMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button type="button" onClick={() => setBannerMsg('')} className="underline ml-3">Cerrar</button>
        </div>
      )}

      {/* =======================================================================
          BARRA DE HERRAMIENTAS Y NAVEGACIÓN EXCLUSIVA DE PRESUPUESTOS
      ======================================================================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5 shadow-sm">
        {/* Fila 1: Título compacto con globo explicativo + botones de acción sin desborde */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Scale className="w-5 h-5 text-orange-500 shrink-0" />
            <h2 className="text-base lg:text-lg font-black text-white truncate">
              Presupuestos y Auditoría — Sucursal Centro
            </h2>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-black bg-zinc-800 text-orange-300 border border-orange-500/30 cursor-help whitespace-nowrap"
              title="Observación exclusiva de Sucursal Centro (las demás sucursales continúan derivando directo por ahora). Analiza cada charla y PDF enviado por Centro y compara entre sus pedidos: qué filtros y aceite cotiza para cada modelo, si hay diferencias de precios entre pedidos y qué demoras tiene según la franja horaria."
            >
              ⓘ Qué hace este módulo
            </span>
            {lastSync && (
              <span
                className="text-[10px] text-zinc-500 font-bold whitespace-nowrap"
                title={`Última sincronización con n8n / Firestore: ${lastSync}`}
              >
                • Sinc: {lastSync}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeepScanConversations}
              disabled={isScanningChats}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
              title="Escanea las conversaciones y presupuestos de Sucursal Centro para extraer códigos de filtros, aceites, precios y tiempos de respuesta"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isScanningChats ? 'animate-spin' : ''}`} />
              <span>{isScanningChats ? 'Analizando...' : '🔍 Analizar Pedidos'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQuickLoader((v) => !v)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 flex items-center gap-1.5 transition-all whitespace-nowrap"
              title="Subir un PDF o pegar un presupuesto de Sucursal Centro para incorporarlo a la comparativa entre pedidos"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>➕ Cargar PDF / Pedido</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDemoPreview((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                showDemoPreview
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
              title="Muestra u oculta 2 pedidos de ejemplo adicionales de Sucursal Centro para ensayar la comparación entre pedidos"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>{showDemoPreview ? 'Ocultar Ejemplos' : 'Ver +2 Ejemplos'}</span>
            </button>

            {onRefreshSessions && (
              <button
                type="button"
                onClick={onRefreshSessions}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-black flex items-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                title="Actualizar las conversaciones y cotizaciones en vivo desde Firestore / n8n"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Píldoras de estado en una sola línea (whitespace-nowrap) con globos explicativos */}
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide border flex items-center gap-1.5 whitespace-nowrap ${
              activation.statusTone === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : activation.statusTone === 'amber'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            title="Estado actual del modo intermediario de presupuestos en Sucursal Centro"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{activation.statusBadge}</span>
          </span>

          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/50 text-zinc-300 border border-zinc-800 whitespace-nowrap"
            title={
              activation.inBizHours
                ? 'Dentro del horario comercial configurado: el reloj de demora SLA y los recordatorios a Sucursal Centro están activos.'
                : 'Fuera del horario comercial: el reloj de demora SLA se pausa automáticamente hasta la próxima apertura.'
            }
          >
            {activation.inBizHours ? '🟢 Horario Comercial' : '🌙 Fuera de Horario (SLA en pausa)'}
          </span>

          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 whitespace-nowrap"
            title={`Pedidos reales registrados en Sucursal ${activeBranches.join(', ')}: ${realAndSandboxQuotes.length}${showDemoPreview ? ` (más ${DEMO_PREVIEW_QUOTES.length} pedidos de ejemplo activados)` : ''}`}
          >
            📋 Pedidos Centro: {realAndSandboxQuotes.length}
            {showDemoPreview ? ` (+${DEMO_PREVIEW_QUOTES.length} ej.)` : ''}
          </span>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950 border border-orange-500/40 text-[11px] whitespace-nowrap"
            title="Configurar cada cuántos minutos hábiles el Bot le envía recordatorio por WhatsApp a Sucursal Centro si no contestó el presupuesto"
          >
            <span className="font-black text-orange-400">⏰ Recordatorio:</span>
            <select
              value={String(mergedCfg.sla_recordatorio_minutos || '15')}
              disabled={savingCfg}
              onChange={(e) => handleSaveConfigPatch({ sla_recordatorio_minutos: String(e.target.value) })}
              className="bg-orange-500/20 text-orange-300 font-black px-1.5 py-0.5 rounded-md border border-orange-500/40 outline-none cursor-pointer"
            >
              {['10', '15', '20', '25', '30', '45', '60'].map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-white">
                  cada {m} min
                </option>
              ))}
              {!['10', '15', '20', '25', '30', '45', '60'].includes(String(mergedCfg.sla_recordatorio_minutos || '15')) && (
                <option value={String(mergedCfg.sla_recordatorio_minutos)} className="bg-zinc-900 text-white">
                  cada {mergedCfg.sla_recordatorio_minutos} min
                </option>
              )}
            </select>
            <button
              type="button"
              onClick={() => setSubView('config')}
              className="text-[10px] text-zinc-400 hover:text-white underline ml-0.5"
              title="Abrir configuración avanzada de minutos y horarios"
            >
              ⚙️
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
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Sucursal en piloto</label>
                <select
                  value={quickBranch}
                  onChange={(e) => setQuickBranch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-black text-white"
                >
                  {BROKER_BRANCHES.filter((b) => activeBranches.includes(b.key)).map((b) => (
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

        {/* PESTAÑAS INTERNAS DEL MÓDULO DE PRESUPUESTOS (SUCURSAL CENTRO) */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3.5 pt-3.5 border-t border-zinc-800">
          {[
            {
              id: 'overview',
              label: `📋 1. Pedidos (${auditReport.totalQuotes})`,
              tooltip: 'Listado de todos los pedidos de presupuesto en Sucursal Centro, valores enviados y desglose de PDF o charla',
              icon: FileText
            },
            {
              id: 'models_matrix',
              label: `🚗 2. Filtros por Modelo (${auditReport.vehicleModelsComparison.length})`,
              tooltip: 'Qué códigos de filtros (aceite, aire, combustible, habitáculo) y qué aceite cotiza Sucursal Centro en cada pedido según el modelo de auto',
              icon: Car
            },
            {
              id: 'dispersion',
              label: `💲 3. Precios (${auditReport.priceDispersionRows.length})`,
              tooltip: 'Comparativa de precios unitarios de cada filtro y aceite por litro entre los distintos pedidos cotizados por Sucursal Centro',
              icon: Scale
            },
            {
              id: 'delays_schedule',
              label: '⏱️ 4. Demoras y Horarios',
              tooltip: 'Estadística de tiempo de respuesta de Sucursal Centro y en qué horarios del día tiene mayor o menor demora',
              icon: Clock
            },
            {
              id: 'simulator',
              label: '🧪 5. Simulador PDF',
              tooltip: 'Entorno de prueba Cliente ↔ Bot ↔ Sucursal Centro para ensayar cotizaciones y lectura de PDFs',
              icon: Sparkles
            },
            {
              id: 'config',
              label: '⚙️ 6. Config y SLA',
              tooltip: 'Configurar el recordatorio en minutos (15 min por defecto), horarios hábiles y estado del piloto en Sucursal Centro',
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
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap ${
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setSubView('overview')}
          className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-2xl cursor-pointer transition-all min-w-0"
          title="Total de pedidos de cotización registrados en Sucursal Centro y cuántos están esperando respuesta"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500 truncate">Pedidos Centro</p>
          <p className="text-2xl font-black text-white mt-0.5">{auditReport.totalQuotes}</p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            Cotizados: <b className="text-emerald-400">{auditReport.respondedCount}</b> • Espera: <b className="text-amber-400">{auditReport.waitingCount}</b>
          </p>
        </div>

        <div
          onClick={() => setSubView('models_matrix')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-3.5 rounded-2xl cursor-pointer transition-all min-w-0"
          title="Haz clic para ver qué filtros y aceites cotizó Sucursal Centro en cada pedido según el modelo de vehículo"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500 truncate">Modelos Cotizados</p>
          <p className="text-2xl font-black text-cyan-400 mt-0.5">{auditReport.vehicleModelsComparison.length}</p>
          <p className="text-[11px] text-orange-400 font-bold mt-1 flex items-center gap-1 truncate">
            <span className="truncate">{auditReport.modelsWithDifferenceCount > 0 ? `${auditReport.modelsWithDifferenceCount} con variación` : 'Ver filtros por modelo'}</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
          </p>
        </div>

        <div
          onClick={() => setSubView('dispersion')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-3.5 rounded-2xl cursor-pointer transition-all min-w-0"
          title="Haz clic para comparar los valores de filtros y aceite por litro entre los pedidos cotizados por Sucursal Centro"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500 truncate">Filtros y Aceite</p>
          <p className="text-2xl font-black mt-0.5 text-emerald-400">
            {auditReport.priceDispersionRows.length} ítems
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            {auditReport.discrepanciesCount > 0 ? `${auditReport.discrepanciesCount} con dif. entre pedidos` : 'Comparativa en Centro'}
          </p>
        </div>

        <div
          onClick={() => setSubView('delays_schedule')}
          className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 p-3.5 rounded-2xl cursor-pointer transition-all min-w-0"
          title="Haz clic para ver las demoras de Sucursal Centro en cada pedido y en qué horario del día tarda más o menos"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500 truncate">Demora Hábil Centro</p>
          <p className="text-2xl font-black text-orange-400 mt-0.5">
            {auditReport.globalAvgDelayMin != null ? `${auditReport.globalAvgDelayMin} min` : '—'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            {auditReport.slowestSlot ? `Mayor demora: ${auditReport.slowestSlot.shortLabel}` : `Recordatorio ${activation.slaMinutes}m`}
          </p>
        </div>

        <div
          onClick={() => setSubView('overview')}
          className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl min-w-0"
          title="Porcentaje de presupuestos enviados por Sucursal Centro que fueron aceptados/confirmados por el cliente"
        >
          <p className="text-[10px] font-black uppercase text-zinc-500 truncate">Confirmados Centro</p>
          <p className="text-2xl font-black text-emerald-400 mt-0.5">
            {auditReport.confirmedCount}{' '}
            <span className="text-sm text-zinc-500">({auditReport.globalAcceptancePct}%)</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            Derivados al aceptar
          </p>
        </div>
      </div>

      {/* =======================================================================
          VISTA 1: PEDIDOS DE COTIZACIÓN, VALORES ENVIADOS Y CHARLAS ANALIZADAS
      ======================================================================= */}
      {subView === 'overview' && (
        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-black text-white uppercase tracking-wide">
                  Pedidos de Cotización en Sucursal Centro ({auditReport.enrichedQuotes.length})
                </h4>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 cursor-help whitespace-nowrap"
                  title="Haz clic en cualquier pedido para desplegar qué filtros y aceite cotizó Sucursal Centro, cuánto tardó, en qué franja horaria entró y los mensajes de la charla con el cliente."
                >
                  ⓘ Clic en un pedido para ver detalle
                </span>
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
          VISTA 2: QUÉ FILTROS Y ACEITE COTIZA SUCURSAL CENTRO POR MODELO (ENTRE PEDIDOS)
      ======================================================================= */}
      {subView === 'models_matrix' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Car className="w-5 h-5 text-orange-500 shrink-0" />
              <h4 className="text-sm lg:text-base font-black text-white">
                Matriz por Modelo en Sucursal Centro (Filtros y Aceite por Pedido)
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 cursor-help whitespace-nowrap"
                title="Observa exclusivamente los pedidos de Sucursal Centro y compara entre pedidos de un mismo modelo qué códigos de filtro (Aceite, Aire, Combustible, Habitáculo), qué lubricante y qué valor total se presupuestó."
              >
                ⓘ Cómo se compara
              </span>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Buscar modelo, filtro (WO-121) o pedido..."
                className="w-full bg-black border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {filteredVehicleModels.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
              No se encontraron modelos con ese filtro en Sucursal Centro.
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
                        {modelGroup.quotesCount} {modelGroup.quotesCount === 1 ? 'pedido en Suc. Centro' : 'pedidos en Suc. Centro'}
                      </span>

                      {modelGroup.hasCodeMismatch && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Distinto código de filtro entre pedidos ({modelGroup.filterCodeMismatch.join(' • ')})
                        </span>
                      )}

                      {modelGroup.hasPriceSpread && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          ⚠️ Diferencia entre pedidos: +${modelGroup.diffTotalAbs.toLocaleString('es-AR')} (+{modelGroup.diffTotalPct}%)
                        </span>
                      )}
                    </div>

                    {modelGroup.minTotal > 0 && (
                      <div className="text-xs font-mono text-zinc-300">
                        Total Cotizado:{' '}
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
                          <th className="p-3">Pedido (Suc. Centro)</th>
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
                              <span className="px-2 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30 mr-1.5 font-mono">
                                #{c.ticket_id}
                              </span>
                              <span className="text-[11px] text-zinc-300">{c.cliente_nombre || 'Cliente'}</span>
                              {c.hourFormatted && (
                                <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">
                                  Hora pedido: {c.hourFormatted}
                                </span>
                              )}
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
                              {c.total_con_descuento > 0 && (
                                <span className="block text-[10px] text-emerald-400 font-bold">
                                  Efvo/Transf: ${c.total_con_descuento.toLocaleString('es-AR')}
                                </span>
                              )}
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
          VISTA 3: COMPARATIVA DE PRECIOS DE FILTROS Y ACEITES ENTRE PEDIDOS DE CENTRO
      ======================================================================= */}
      {subView === 'dispersion' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Scale className="w-5 h-5 text-orange-500 shrink-0" />
              <h4 className="text-sm lg:text-base font-black text-white">
                Valores de Filtros y Aceite por Litro en Sucursal Centro (Entre Pedidos)
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 cursor-help whitespace-nowrap"
                title="Registra cada código de filtro (ej. WO-121, FAP-2835, FCI-1660, AKX-35323) y cada aceite por litro cotizado por Sucursal Centro, comparando su valor entre los distintos pedidos."
              >
                ⓘ Detalle de comparación
              </span>
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
              Aún no hay productos registrados en este filtro para Sucursal Centro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Código / Producto</th>
                    <th className="p-3.5">Modelo donde se cotizó</th>
                    <th className="p-3.5">Valor Cotizado en Cada Pedido (Suc. Centro)</th>
                    <th className="p-3.5 text-right">Mínimo vs Máximo</th>
                    <th className="p-3.5 text-center">Comparación entre Pedidos</th>
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
                          {row.entries.map((e, idx) => {
                            const isMax = row.ordersCount > 1 && e.lastPrice === row.maxPrice && row.hasDiscrepancy;
                            const isMin = row.ordersCount > 1 && e.lastPrice === row.minPrice && row.hasDiscrepancy;
                            return (
                              <span
                                key={`${e.ticket}-${idx}`}
                                className={`px-2.5 py-1 rounded-lg border font-bold ${
                                  isMax
                                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                                    : isMin
                                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                      : 'bg-black/50 border-zinc-800 text-zinc-200'
                                }`}
                              >
                                <b className="text-orange-300">#{e.ticket}:</b>{' '}
                                <span className="font-mono font-black">${e.lastPrice.toLocaleString('es-AR')}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-zinc-200 whitespace-nowrap">
                        <span className="text-emerald-400">${row.minPrice.toLocaleString('es-AR')}</span>
                        {row.maxPrice > row.minPrice && (
                          <>
                            {' → '}
                            <span className="text-rose-400">${row.maxPrice.toLocaleString('es-AR')}</span>
                          </>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {row.ordersCount < 2 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] bg-zinc-800 text-zinc-300 font-bold">
                            1 pedido registrado (#{row.entries[0]?.ticket})
                          </span>
                        ) : row.hasDiscrepancy ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ⚠️ +{row.diffPct}% (+${row.diffAbs.toLocaleString('es-AR')} entre #{row.priciestBranch} y #{row.cheapestBranch})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✅ Mismo valor entre {row.ordersCount} pedidos ($0 dif.)
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
          VISTA 4: ESTADÍSTICAS DE DEMORA DE SUCURSAL CENTRO Y POR FRANJA HORARIA
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
                  Horario con Mayor Demora en Sucursal Centro
                </p>
                <p className="text-base font-black text-white mt-0.5">
                  {auditReport.slowestSlot ? auditReport.slowestSlot.label : 'Sin datos suficientes'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {auditReport.slowestSlot
                    ? `Promedio de ${auditReport.slowestSlot.avgDelayMin} min hábiles (máx. ${auditReport.slowestSlot.maxDelayMin} min) en ${auditReport.slowestSlot.totalPedidos} ${auditReport.slowestSlot.totalPedidos === 1 ? 'pedido' : 'pedidos'}.`
                    : 'A medida que entren cotizaciones en Centro se identificará la franja con mayor demora.'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-emerald-400">
                  Horario más Rápido en Sucursal Centro
                </p>
                <p className="text-base font-black text-white mt-0.5">
                  {auditReport.fastestSlot ? auditReport.fastestSlot.label : 'Sin datos suficientes'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {auditReport.fastestSlot
                    ? `Promedio de ${auditReport.fastestSlot.avgDelayMin} min hábiles (${auditReport.fastestSlot.totalPedidos} ${auditReport.fastestSlot.totalPedidos === 1 ? 'pedido' : 'pedidos'} en esa franja).`
                    : 'Se calculará automáticamente con los pedidos respondidos por Centro.'}
                </p>
              </div>
            </div>
          </div>

          {/* MAPA DE DEMORAS SEGÚN FRANJA HORARIA DEL DÍA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500 shrink-0" />
              <h4 className="text-sm font-black text-white uppercase tracking-wide">
                Demoras en Sucursal Centro Según la Franja Horaria del Día
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 cursor-help whitespace-nowrap"
                title="Mide cuánto tarda Sucursal Centro en responder un presupuesto según la franja horaria en que entra la consulta del cliente."
              >
                ⓘ Cómo se mide
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {auditReport.hourlySlotStats.map((slot) => {
                const pctBar = slot.avgDelayMin ? Math.min(100, Math.round((slot.avgDelayMin / 65) * 100)) : 0;
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

          {/* RESUMEN EXCLUSIVO DE LA SUCURSAL ACTIVA EN PILOTO (CENTRO) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-4 px-5 border-b border-zinc-800">
              <h4 className="text-sm font-black text-white uppercase tracking-wide">
                Resumen de Rendimiento de Sucursal en Piloto ({activeBranches.join(', ')}) — Las demás sucursales continúan derivando directo
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Sucursal Observada</th>
                    <th className="p-3.5 text-center">Estado Piloto</th>
                    <th className="p-3.5 text-center">Pedidos</th>
                    <th className="p-3.5 text-center">Demora Promedio (Mín / Máx)</th>
                    <th className="p-3.5 text-center">% Rápidos (≤15m)</th>
                    <th className="p-3.5 text-center">Superó {activation.slaMinutes}m</th>
                    <th className="p-3.5 text-center">% en PDF</th>
                    <th className="p-3.5 text-right">Ticket Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {auditReport.branchStats.map((b) => (
                    <tr key={b.key} className="hover:bg-zinc-800/40">
                      <td className="p-3.5 font-black text-white">{b.name}</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          PILOTO INTERMEDIARIO ACTIVO
                        </span>
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
                            {b.slaBreaches} pedido{b.slaBreaches > 1 ? 's' : ''}
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
                  ))}
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
