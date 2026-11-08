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
  ShieldCheck
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
  vehiculo: 'Toyota Hilux 2019 2.8 TDI',
  clienteNombre: 'Martín Prueba (Simulador)',
  clienteTelefono: '5492944551234',
  estado: 'sin_iniciar', // 'sin_iniciar' | 'esperando_sucursal' | 'esperando_respuesta_cliente' | 'presupuesto_enviado' | 'confirmado'
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
  onOpenChatSession = null,
  isMirrorSandbox = false,
  workflowDownloadUrl = './CheckOil_Workflow_Intermediario_v2.2.json'
}) {
  const [subView, setSubView] = useState('overview'); // 'overview' | 'simulator' | 'dispersion' | 'config'
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');

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
    setTimeout(() => setBannerMsg(''), 4500);
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
        /hilux/i.test(txt)
          ? 'Toyota Hilux 2019 2.8 TDI'
          : /gol/i.test(txt)
            ? 'VW Gol Trend 2017 1.6 MSI'
            : /amarok/i.test(txt)
              ? 'VW Amarok 2021 3.0 V6'
              : /cronos/i.test(txt)
                ? 'Fiat Cronos 2022 1.3 GSE'
                : txt.slice(0, 48);

      const botReplyClient =
        `¡Buenas tardes! Ya solicité tu presupuesto a *Check Oil Suc. ${simState.sucursalKey}* (Ref. *#${newTicket}*) para *${carDetected}*.\n\n` +
        `Apenas la sucursal me confirme los valores te los envío por este mismo chat (no hace falta que escribas a otro número).`;

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
        vehiculo: 'Toyota Hilux 2019 2.8 TDI',
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
    ].slice(0, 30);
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
    notify(`📄 Presupuesto #${fullQuote.ticket_id} analizado (${delayMin} min) y enviado al cliente en el simulador.`);
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
        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-between">
          <span>{bannerMsg}</span>
          <button type="button" onClick={() => setBannerMsg('')} className="underline ml-3">Cerrar</button>
        </div>
      )}

      {/* =======================================================================
          CABECERA Y CONTROL DEL PILOTO (MARTES 10/11 - SUCURSAL CENTRO)
      ======================================================================= */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="space-y-1.5">
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

              {isMirrorSandbox && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  🛡️ Sandbox
                </span>
              )}
            </div>

            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-orange-500 shrink-0" />
              Intermediario de Presupuestos, Lectura PDF y Auditoría de Precios
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
              {activation.statusDescription}
            </p>
          </div>

          {/* Selector rápido de Modo: Programado Martes 10 | Activo Ahora | Apagado */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {[
              { id: 'programado', label: `🗓️ Programado (${activation.targetDate})`, activeCls: 'bg-amber-500 text-black border-amber-400' },
              { id: 'true', label: '🟢 Activo Ahora', activeCls: 'bg-emerald-500 text-black border-emerald-400' },
              { id: 'false', label: '⚪ Apagado', activeCls: 'bg-zinc-700 text-white border-zinc-500' }
            ].map((m) => {
              const selected = activation.mode === m.id;
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

            {workflowDownloadUrl && (
              <a
                href={workflowDownloadUrl}
                download="CheckOil_Workflow_Intermediario_v2.2.json"
                className="px-3 py-2 rounded-xl text-xs font-black bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/40 flex items-center gap-1.5"
                title="Descargar Workflow n8n v2.2 listo para importar en n8n.check-oil.tech"
              >
                <Download className="w-3.5 h-3.5" />
                Workflow n8n v2.2
              </a>
            )}
          </div>
        </div>

        {/* Sub-navegación interna */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-zinc-800">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'overview', label: `📊 Tiempos y PDFs (${auditReport.totalQuotes})`, icon: FileText },
              { id: 'dispersion', label: `⚖️ Comparador Precios Sucursales (${auditReport.discrepanciesCount} dif.)`, icon: Scale },
              { id: 'simulator', label: '🧪 Simulador en Vivo + Lector PDF', icon: Sparkles },
              { id: 'config', label: '⚙️ Sucursales Piloto y Horario SLA', icon: Building2 }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = subView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubView(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-orange-500 text-black shadow-sm'
                      : 'bg-black/60 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowDemoPreview((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black border flex items-center gap-1.5 transition-all ${
              showDemoPreview
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-black/60 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
            title="Muestra 3 cotizaciones de ejemplo para visualizar hoy cómo detecta demoras y diferencias de precios entre sucursales"
          >
            <Eye className="w-3.5 h-3.5" />
            {showDemoPreview ? 'Ocultar Ejemplos de Vista Previa' : 'Ver Ejemplo Comparativo Multi-Sucursal'}
          </button>
        </div>
      </div>

      {/* =======================================================================
          SUB-VISTA 1: RESUMEN DE SLA POR SUCURSAL E HISTORIAL DE COTIZACIONES PDF
      ======================================================================= */}
      {subView === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[11px] font-black uppercase text-zinc-500">Presupuestos Pedidos</p>
              <p className="text-2xl font-black text-white mt-1">{auditReport.totalQuotes}</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Respondidos: <b>{auditReport.respondedCount}</b> • En espera: <b className="text-amber-400">{auditReport.waitingCount}</b>
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[11px] font-black uppercase text-zinc-500">Demora Hábil Promedio</p>
              <p className="text-2xl font-black text-orange-500 mt-1">
                {auditReport.globalAvgDelayMin != null ? `${auditReport.globalAvgDelayMin} min` : '—'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Neto dentro de horario comercial (alerta &gt; {activation.slaMinutes}m)
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-[11px] font-black uppercase text-zinc-500">Confirmados / Aceptados</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {auditReport.confirmedCount}{' '}
                <span className="text-sm text-zinc-500">({auditReport.globalAcceptancePct}%)</span>
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Derivados recién tras aceptar cotización
              </p>
            </div>

            <div
              onClick={() => setSubView('dispersion')}
              className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 p-4 rounded-2xl cursor-pointer transition-all"
            >
              <p className="text-[11px] font-black uppercase text-zinc-500">Diferencias de Precios</p>
              <p className={`text-2xl font-black mt-1 ${auditReport.discrepanciesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {auditReport.discrepanciesCount} ítems
              </p>
              <p className="text-[11px] text-orange-400 font-bold mt-1 flex items-center gap-1">
                Comparar filtros y aceites <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </div>

          {/* Tabla de Desempeño de Cotización por Sucursal */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-4 px-5 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-2">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide">
                  Velocidad y Modalidad de Cotización por Sucursal
                </h4>
                <p className="text-xs text-zinc-400">
                  Piloto activo desde el {activation.targetDate} en: <b>{activation.branchLabel}</b>.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Sucursal</th>
                    <th className="p-3.5 text-center">Modo</th>
                    <th className="p-3.5 text-center">Pedidos</th>
                    <th className="p-3.5 text-center">En Espera</th>
                    <th className="p-3.5 text-center">Demora Hábil Neta</th>
                    <th className="p-3.5 text-center">Cotizó con PDF</th>
                    <th className="p-3.5 text-center">Aceptados</th>
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
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500/15 text-orange-300 border border-orange-500/30">
                              {activation.isActiveNow ? 'INTERMEDIARIO ACTIVO' : `PILOTO ${activation.targetDate}`}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400">
                              Derivación Directa
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-black text-white">{b.total}</td>
                        <td className="p-3.5 text-center">
                          {b.waitingCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black">
                              {b.waitingCount} esperando
                            </span>
                          ) : (
                            <span className="text-zinc-500">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-black">
                          {b.avgDelayMin != null ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-lg ${
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
                            <span className="text-zinc-500">Sin registros</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-zinc-300">
                          {b.respondedCount > 0 ? `${b.pdfPct}% PDF` : '—'}
                        </td>
                        <td className="p-3.5 text-center font-black text-emerald-400">
                          {b.respondedCount > 0 ? `${b.confirmedCount}/${b.respondedCount} (${b.acceptancePct}%)` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista detallada de Presupuestos y Desglose de PDFs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wide">
                  Registro Detallado de Presupuestos y Análisis de PDF ({auditReport.enrichedQuotes.length})
                </h4>
                <p className="text-xs text-zinc-400">
                  Haz clic en cualquier presupuesto para ver el desglose de aceite, códigos de filtros y precios unitarios leídos por el Bot.
                </p>
              </div>
              {auditReport.enrichedQuotes.length === 0 && (
                <button
                  type="button"
                  onClick={() => setSubView('simulator')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Probar ahora en el Simulador con un PDF
                </button>
              )}
            </div>

            {auditReport.enrichedQuotes.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-2">
                <p className="font-black text-sm text-zinc-200">
                  Aún no hay presupuestos intermediados reales (el piloto inicia el {activation.targetDate} en Suc. Centro).
                </p>
                <p>
                  Puedes activar arriba <b>“Ver Ejemplo Comparativo Multi-Sucursal”</b> o ir a <b>“🧪 Simulador en Vivo + Lector PDF”</b> para ensayar todo el circuito hoy mismo.
                </p>
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
                          ? 'border-purple-500/30 bg-purple-950/15'
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
                            {q.isDemoPreview && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                EJEMPLO VISTA PREVIA
                              </span>
                            )}
                            {q.esSimulacionSandbox && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                PRUEBA SIMULADOR
                              </span>
                            )}
                            <span className="text-xs font-black text-white">
                              Suc. {q.sucursal} — {q.vehiculo}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-zinc-800 text-zinc-300 uppercase">
                              {q.formato_origen}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">
                            {q.resumen_items || 'Sin desglose cargado'}
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
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {q.effectiveDelay} min hábiles
                            </span>
                          )}

                          {q.total_cotizado > 0 && (
                            <span className="text-sm font-black text-white font-mono">
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
                              ? '✅ Confirmado y Derivado'
                              : q.estado === 'presupuesto_enviado'
                                ? 'Enviado al Cliente'
                                : q.estado === 'esperando_respuesta_cliente'
                                  ? 'Consultó al Cliente'
                                  : 'Esperando Sucursal'}
                          </span>

                          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="p-4 pt-0 border-t border-zinc-800/80 bg-zinc-950/60 text-xs space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Tiempos Registrados</p>
                              <p><b>Pedido:</b> {q.fecha_pedido ? new Date(q.fecha_pedido).toLocaleString('es-AR') : '—'}</p>
                              <p><b>Respuesta:</b> {q.fecha_respuesta ? new Date(q.fecha_respuesta).toLocaleString('es-AR') : 'Pendiente'}</p>
                              <p><b>Demora hábil neta:</b> {q.demora_neta_sucursal_min ?? q.waitingLiveMin ?? '—'} min</p>
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Aceite Cotizado</p>
                              {q.aceite && q.aceite.marca ? (
                                <>
                                  <p className="font-black text-orange-400">
                                    {q.aceite.marca} {q.aceite.linea || ''} {q.aceite.viscosidad || ''}
                                  </p>
                                  <p>Cantidad: <b>{q.aceite.litros || '-'} L</b></p>
                                  <p>
                                    Valor x Litro: <b>${Number(q.aceite.precio_por_litro || 0).toLocaleString('es-AR')}</b> • Subtotal: <b>${Number(q.aceite.subtotal || 0).toLocaleString('es-AR')}</b>
                                  </p>
                                </>
                              ) : (
                                <p className="text-zinc-500">No se especificó aceite en este presupuesto.</p>
                              )}
                            </div>

                            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                              <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">Filtros Detectados ({(q.filtros || []).length})</p>
                              {(q.filtros || []).length > 0 ? (
                                <ul className="space-y-1">
                                  {q.filtros.map((f, i) => (
                                    <li key={i} className="flex justify-between">
                                      <span><b>{f.codigo}</b> ({f.tipo})</span>
                                      <span className="font-mono font-bold">${Number(f.precio_unitario || f.subtotal || 0).toLocaleString('es-AR')}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-zinc-500">Sin códigos individuales detallados.</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                            <span className="text-zinc-400">
                              <b>Observación auditoría:</b> {q.observaciones_calidad || 'Sin observaciones adicionales.'}
                              {q.archivo_nombre ? ` • Archivo: ${q.archivo_nombre}` : ''}
                            </span>
                            {onOpenChatSession && q.cliente_jid && (
                              <button
                                type="button"
                                onClick={() => onOpenChatSession(q.cliente_jid)}
                                className="px-3 py-1.5 rounded-lg bg-orange-500 text-black font-black text-xs"
                              >
                                Abrir Charla del Cliente →
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
          SUB-VISTA 2: COMPARADOR DE PRECIOS ENTRE SUCURSALES (FILTROS Y ACEITES)
      ======================================================================= */}
      {subView === 'dispersion' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-orange-500" />
                Auditoría de Diferencias de Precios en Filtros y Aceites entre Sucursales
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Compara automáticamente el valor unitario cotizado por código exacto de filtro (ej. WO-130, FAP-4033) y aceite normalizado por litro a partir de los PDFs y mensajes de cada sucursal.
              </p>
            </div>
            {!showDemoPreview && auditReport.priceDispersionRows.length === 0 && (
              <button
                type="button"
                onClick={() => setShowDemoPreview(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-500 text-white text-xs font-black"
              >
                👁️ Cargar Ejemplo Centro vs. Estadio
              </button>
            )}
          </div>

          {auditReport.priceDispersionRows.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-xs text-zinc-400">
              Aún no hay ítems cotizados con precio unitario para comparar. Usa el botón <b>“Cargar Ejemplo Centro vs. Estadio”</b> o sube un PDF en el Simulador para probar la detección automática.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/40 border-b border-zinc-800 text-[11px] font-black uppercase text-zinc-400">
                    <th className="p-3.5">Código / Producto</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Valores Cotizados por Sucursal</th>
                    <th className="p-3.5 text-right">Mín / Máx</th>
                    <th className="p-3.5 text-center">Dispersión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {auditReport.priceDispersionRows.map((row) => (
                    <tr key={row.itemKey} className="hover:bg-zinc-800/40">
                      <td className="p-3.5 font-mono font-black text-white">{row.codigo}</td>
                      <td className="p-3.5 text-zinc-400">{row.categoria}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {row.entries.map((e) => (
                            <span
                              key={e.sucursal}
                              className="px-2.5 py-1 rounded-lg bg-black/50 border border-zinc-800 font-bold text-zinc-200"
                            >
                              <b>{e.sucursal}:</b>{' '}
                              <span className="font-mono text-orange-400">${e.lastPrice.toLocaleString('es-AR')}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-zinc-200">
                        ${row.minPrice.toLocaleString('es-AR')} — ${row.maxPrice.toLocaleString('es-AR')}
                      </td>
                      <td className="p-3.5 text-center">
                        {row.branchesCount < 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-400 font-bold">
                            1 sucursal medida
                          </span>
                        ) : row.hasDiscrepancy ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            ⚠️ DIFERENCIA +{row.diffPct}% (+${row.diffAbs.toLocaleString('es-AR')})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ✅ Precio Uniforme
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
          SUB-VISTA 3: SIMULADOR EN VIVO 3 VÍAS (CLIENTE <-> BOT <-> SUC. CENTRO + PDF)
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
                Prueba acá el circuito exacto del martes 10: pide un presupuesto como cliente, repregunta o sube un PDF real como Sucursal Centro, y confírmalo para ver cuándo deriva.
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
                      onClick={() => handleClientSendInSim('Hola! Quiero presupuesto de cambio de aceite y todos los filtros para una Hilux 2019 2.8 en Sucursal Centro')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                    >
                      1️⃣ Pedir presupuesto Hilux 2019
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClientSendInSim('Buenas! Cuánto me sale cambio de aceite y filtros para un Gol Trend 2017 1.6 en Centro?')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                    >
                      1️⃣ Pedir presupuesto Gol Trend
                    </button>
                  </>
                ) : simState.estado === 'esperando_respuesta_cliente' ? (
                  <button
                    type="button"
                    onClick={() => handleClientSendInSim('Prefiero aceite sintético Motul 8100 y cambiar los 4 filtros')}
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
                      'Aceite MOTUL 8100 5W30 x 8 Litros $156.000\nFiltro Aceite WEGA JFO-0211 $16.500\nFiltro Aire WEGA JFA-0295 $26.000\nFiltro Combustible WEGA JFC-209 $19.500\nFiltro Habitáculo AKX-1965 $18.500\nTotal Presupuesto: $236.500 (10% descuento efectivo)',
                      'Presupuesto_Centro_Hilux.pdf'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                >
                  📄 Simular Envío PDF Centro ($236.500)
                </button>

                <button
                  type="button"
                  onClick={() => processBranchReplyInSim('¿Quiere aceite sintético Motul o semisintético Gulf? ¿Cambia los 4 filtros?')}
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
          SUB-VISTA 4: CONFIGURACIÓN DE SUCURSALES PILOTO, FECHA Y HORARIO SLA
      ======================================================================= */}
      {subView === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-500" />
              1. Sucursales en Modo Intermediario (Sin Derivar hasta Confirmar)
            </h4>
            <p className="text-xs text-zinc-400">
              Las sucursales marcadas acá recibirán solicitudes de cotización `#COT-XXXX` sin teléfono del cliente. Las destildadas seguirán derivando de forma directa como hoy.
            </p>

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
                      {checked ? 'PILOTO ON' : 'CLÁSICA'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                Fecha programada de auto-activación (Formato AAAA-MM-DD)
              </label>
              <input
                type="date"
                value={activation.targetDate}
                onChange={(e) => handleSaveConfigPatch({ fecha_inicio_intermediario: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              2. Horario Comercial para Medir Demora y Recordatorio SLA
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

            <div>
              <label className="block text-xs font-black uppercase text-zinc-400 mb-1.5">
                Minutos hábiles para enviar recordatorio automático a la sucursal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={mergedCfg.sla_recordatorio_minutos || 25}
                  onChange={(e) => handleSaveConfigPatch({ sla_recordatorio_minutos: String(e.target.value) })}
                  className="w-28 bg-black border border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono font-black text-orange-400"
                />
                <span className="text-xs text-zinc-400">
                  minutos hábiles sin respuesta → envía aviso `⏰ RECORDATORIO` a la sucursal.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
