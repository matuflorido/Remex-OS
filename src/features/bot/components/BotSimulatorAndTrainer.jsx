import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  Rocket,
  FlaskConical,
  ShieldAlert,
  ShieldCheck,
  Car,
  UserPlus,
  Building2,
  Edit3,
  Check,
  X,
  Trash2,
  Sliders,
  Brain,
  Play,
  VolumeX,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Eye
} from 'lucide-react';
import {
  simulateBotTurnInN8n,
  synthesizeBotRuleInN8n,
  resetSimulatedSessionInN8n
} from '../services/botService';

const SUCURSALES_SIM = [
  { key: 'Centro', label: 'Suc. Centro (Bariloche - Intermediario #COT)' },
  { key: 'Ñireco', label: 'Suc. Ñireco (Bariloche - Derivación Directa)' },
  { key: 'Estadio', label: 'Suc. Estadio (Bariloche - Derivación Directa)' },
  { key: 'Km13', label: 'Suc. Km13 (Bariloche - Derivación Directa)' },
  { key: 'Bolsón', label: 'Suc. El Bolsón (Derivación Directa)' },
  { key: 'Dominico', label: 'Suc. Dominico (Avellaneda - Derivación Directa)' }
];

const CATEGORY_LABELS = {
  tono_saludo: '💬 Tono y Saludo',
  consulta_info: '📋 Consulta / Historial',
  ubicacion_sucursal: '📍 Sucursales y Zonas',
  derivacion: '🚗 Derivación y Vehículos',
  fuera_contexto: '🙋 Equivocación / Fuera de tema',
  general: '⚙️ Regla General'
};

const QUICK_PROMPTS_BY_MODE = {
  cliente_cochecita: [
    { label: '👋 Saludo inicial', text: 'Hola, buenas tardes' },
    { label: '🛢️ Cotizar sin decir auto', text: 'Quiero cotizar un cambio de aceite y filtros' },
    { label: '🔎 Consultar último filtro', text: 'Antes me podés decir qué filtros usaron en el último cambio?' },
    { label: '✅ Confirmar en Centro', text: 'Dale, quiero hacer el servicio en sucursal Centro' },
    { label: '😅 Chat equivocado', text: 'Perdón me confundí de chat' }
  ],
  cliente_nuevo: [
    { label: '👋 Saludo', text: 'Hola buen día' },
    { label: '📍 Zona inexistente (Quilmes)', text: 'Tengo una Hilux 2018 motor 2.8, quiero ir a la sucursal de Quilmes Oeste' },
    { label: '🧴 Producto suelto', text: 'Hola, venden bidón de agua destilada o refrigerante suelto?' },
    { label: '🚗 Pedido completo Ñireco', text: 'Quiero hacer cambio de aceite y filtros a un Gol Trend 1.6 nafta en sucursal Ñireco' }
  ],
  sucursal: [
    { label: '🪪 Consultar patente', text: 'Hola bot, qué aceite y filtros se le pusieron a la patente AG995ZY?' },
    { label: '📋 Historial otro dominio', text: 'Pasame el último servicio registrado de la patente AE450CD' },
    { label: '❓ Repregunta #COT', text: 'Qué motor tiene y qué año es para armar la cotización?' }
  ]
};

function createSimId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Modal / Panel reutilizable para corregir una respuesta del Bot y convertirla en Regla Estructurada (Borrador o En Vivo)
 * Se usa tanto desde el Monitor de Charlas reales como desde el Simulador.
 */
export function BotTeachCorrectionModal({
  isOpen,
  onClose,
  initialClientMessage = '',
  initialBotReply = '',
  sourceLabel = 'Simulador IA',
  clientPhoneHint = '',
  onSaveRule,
  onOpenInSimulator = null
}) {
  const [mensajeCliente, setMensajeCliente] = useState(initialClientMessage);
  const [respuestaBotOriginal, setRespuestaBotOriginal] = useState(initialBotReply);
  const [explicacionUsuario, setExplicacionUsuario] = useState('');
  const [respuestaIdealUsuario, setRespuestaIdealUsuario] = useState('');
  const [permitirDerivarHint, setPermitirDerivarHint] = useState('auto');
  const [categoriaHint, setCategoriaHint] = useState('auto');
  const [targetStatus, setTargetStatus] = useState('borrador'); // 'borrador' | 'publicada'
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedPreview, setSynthesizedPreview] = useState(null);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [errorText, setErrorText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMensajeCliente(initialClientMessage || '');
      setRespuestaBotOriginal(initialBotReply || '');
      setExplicacionUsuario('');
      setRespuestaIdealUsuario('');
      setPermitirDerivarHint('auto');
      setCategoriaHint('auto');
      setTargetStatus('borrador');
      setSynthesizedPreview(null);
      setKeywordsInput('');
      setErrorText('');
      setSavedSuccess(false);
    }
  }, [isOpen, initialClientMessage, initialBotReply]);

  if (!isOpen) return null;

  const handleSynthesize = async (e) => {
    e?.preventDefault();
    if (!explicacionUsuario.trim() && !respuestaIdealUsuario.trim()) {
      setErrorText('Explicá brevemente qué debe corregir el Bot o escribí cómo debería haber respondido.');
      return;
    }
    setErrorText('');
    setIsSynthesizing(true);
    try {
      const res = await synthesizeBotRuleInN8n({
        mensajeCliente: mensajeCliente.trim(),
        respuestaBotOriginal: respuestaBotOriginal.trim(),
        explicacionUsuario: explicacionUsuario.trim() || 'Ajustar la respuesta al texto ideal indicado por el supervisor.',
        respuestaIdealUsuario: respuestaIdealUsuario.trim(),
        permitirDerivarHint,
        categoriaHint
      });
      if (!res?.ok || !res?.rule) {
        throw new Error(res?.error || 'No se pudo sintetizar la regla');
      }
      const ruleObj = {
        ...res.rule,
        origen: `Entrenado desde ${sourceLabel}`,
        estado_publicacion: targetStatus
      };
      setSynthesizedPreview(ruleObj);
      setKeywordsInput(Array.isArray(ruleObj.keywords_disparo) ? ruleObj.keywords_disparo.join(', ') : '');
    } catch (err) {
      setErrorText(err.message || 'Error conectando con el entrenador IA en n8n.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleConfirmSave = async (andRetest = false) => {
    if (!synthesizedPreview) return;
    const cleanKeywords = keywordsInput
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length >= 3);

    const finalRule = {
      ...synthesizedPreview,
      estado_publicacion: targetStatus,
      keywords_disparo: cleanKeywords,
      activa: true
    };

    await onSaveRule(finalRule, {
      andRetest,
      mensajeCliente,
      clientPhoneHint
    });
    setSavedSuccess(true);
    if (andRetest || !onOpenInSimulator) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-orange-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Entrenador IA • {sourceLabel}
            </span>
            <h3 className="text-base font-black text-white mt-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Corregir Respuesta y Enseñar Variables al Bot
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess && onOpenInSimulator ? (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-black text-white">
              ¡Regla guardada como {targetStatus === 'borrador' ? 'Borrador de Prueba' : 'Regla Publicada en Vivo'}!
            </h4>
            <p className="text-xs text-zinc-300">
              Podés abrir este mismo caso en el Simulador para verificar cómo responde ahora el Bot antes de publicarlo a WhatsApp.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  onOpenInSimulator({
                    phone: clientPhoneHint,
                    message: mensajeCliente
                  });
                  onClose();
                }}
                className="bg-orange-500 hover:bg-orange-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              >
                <FlaskConical className="w-4 h-4" />
                Probar este caso en el Simulador
              </button>
              <button
                onClick={onClose}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3">
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Mensaje que envió el Cliente / Sucursal
                </label>
                <textarea
                  value={mensajeCliente}
                  onChange={(e) => setMensajeCliente(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-200 outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3">
                <label className="block text-[10px] font-black uppercase text-rose-400 mb-1">
                  Respuesta del Bot a corregir
                </label>
                <div className="text-xs text-zinc-300 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {respuestaBotOriginal || '(Silencio intencional / sin texto)'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-orange-300 mb-1">
                  1. Explicale al Bot qué hizo mal o qué criterio debe aprender
                </label>
                <textarea
                  value={explicacionUsuario}
                  onChange={(e) => setExplicacionUsuario(e.target.value)}
                  rows={3}
                  placeholder="Ej: Cuando el cliente solo pregunta qué aceite o filtros usó antes, NO derives a la sucursal ni abras cotización. Pasale los datos de Cochecita y preguntale si quiere cotizar."
                  className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-300 mb-1">
                  2. Cómo te gustaría que responda en un caso así (Opcional — si lo dejás vacío la IA lo redacta)
                </label>
                <textarea
                  value={respuestaIdealUsuario}
                  onChange={(e) => setRespuestaIdealUsuario(e.target.value)}
                  rows={2}
                  placeholder="Ej: En el último servicio de tu vehículo usamos aceite 5W30 y filtro WO-121. ¿Querés que armemos una cotización para repetir el servicio? Si es así, decime en qué sucursal."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-emerald-100 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                    Variable de Derivación
                  </label>
                  <select
                    value={permitirDerivarHint}
                    onChange={(e) => setPermitirDerivarHint(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-orange-500"
                  >
                    <option value="auto">✨ Automático (IA decide)</option>
                    <option value="prohibir_derivar">🚫 Prohibir derivar en este turno</option>
                    <option value="normal">✅ Permitir flujo normal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                    Categoría de Variable
                  </label>
                  <select
                    value={categoriaHint}
                    onChange={(e) => setCategoriaHint(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-orange-500"
                  >
                    <option value="auto">✨ Automática</option>
                    <option value="tono_saludo">💬 Tono y Saludo</option>
                    <option value="consulta_info">📋 Consulta Informativa</option>
                    <option value="ubicacion_sucursal">📍 Sucursales y Zonas</option>
                    <option value="derivacion">🚗 Derivación y Vehículos</option>
                    <option value="fuera_contexto">🙋 Equivocación / Fuera tema</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                    Modo de Guardado
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-orange-500"
                  >
                    <option value="borrador">🧪 Borrador (Solo Simulador)</option>
                    <option value="publicada">🟢 Publicar directo en Vivo</option>
                  </select>
                </div>
              </div>

              {errorText && (
                <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-2.5 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {!synthesizedPreview ? (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-black flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isSynthesizing ? 'Analizando y armando regla con IA...' : 'Generar Regla Inteligente'}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <Brain className="w-4 h-4" />
                      Regla Estructurada Lista (Podés retocar cualquier campo antes de guardar)
                    </span>
                    <button
                      type="button"
                      onClick={handleSynthesize}
                      disabled={isSynthesizing}
                      className="text-[11px] font-bold text-orange-300 underline"
                    >
                      {isSynthesizing ? 'Regenerando...' : 'Regenerar con IA'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                      Cuándo aplica (Condición / Situación)
                    </label>
                    <input
                      type="text"
                      value={synthesizedPreview.pregunta || ''}
                      onChange={(e) => setSynthesizedPreview({ ...synthesizedPreview, pregunta: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-orange-300 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                      Instrucción Operativa para el Bot
                    </label>
                    <textarea
                      value={synthesizedPreview.respuesta || ''}
                      onChange={(e) => setSynthesizedPreview({ ...synthesizedPreview, respuesta: e.target.value })}
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                      Ejemplo de Respuesta Ideal (Few-Shot)
                    </label>
                    <textarea
                      value={synthesizedPreview.respuesta_ideal || ''}
                      onChange={(e) => setSynthesizedPreview({ ...synthesizedPreview, respuesta_ideal: e.target.value })}
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-emerald-200 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                        Palabras clave disparadoras (separadas por coma)
                      </label>
                      <input
                        type="text"
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                        placeholder="ej: filtro, último cambio, historial"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                        Bloqueo Determinístico de Derivación
                      </label>
                      <select
                        value={synthesizedPreview.permitir_derivar || 'normal'}
                        onChange={(e) =>
                          setSynthesizedPreview({ ...synthesizedPreview, permitir_derivar: e.target.value })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="normal">✅ Flujo normal permitido</option>
                        <option value="prohibir_derivar">🚫 Prohibir derivación cuando dispare</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    {!onOpenInSimulator && (
                      <button
                        type="button"
                        onClick={() => handleConfirmSave(true)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Guardar y Re-probar Mensaje Ahora
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleConfirmSave(false)}
                      className="bg-orange-500 hover:bg-orange-400 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Guardar {targetStatus === 'borrador' ? 'en Borrador' : 'en Vivo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BotSimulatorAndTrainer({
  learnedRules = [],
  onUpdateRules,
  preloadCase = null,
  onClearPreloadCase = null
}) {
  const [simSessionId, setSimSessionId] = useState(() => createSimId());
  const [mode, setMode] = useState('cliente_cochecita'); // 'cliente_nuevo' | 'cliente_cochecita' | 'sucursal'
  const [cochecitaLookupInput, setCochecitaLookupInput] = useState('5492944912803');
  const [pushName, setPushName] = useState('Cliente Prueba');
  const [sucursalKey, setSucursalKey] = useState('Centro');
  const [quotedText, setQuotedText] = useState('');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [lastVariables, setLastVariables] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPublishingAll, setIsPublishingAll] = useState(false);
  const [simError, setSimError] = useState('');

  // Panel derecho: 'variables' | 'rules'
  const [rightTab, setRightTab] = useState('variables');
  const [rulesFilter, setRulesFilter] = useState('all'); // 'all' | 'borrador' | 'publicada'
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRuleDraft, setEditingRuleDraft] = useState(null);

  // Modal de corrección sobre un turno específico del simulador
  const [teachingTurn, setTeachingTurn] = useState(null);

  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Si venimos derivados desde "Monitor de Charlas -> Probar este caso en Simulador"
  useEffect(() => {
    if (preloadCase) {
      const cleanPhone = String(preloadCase.phone || '').replace(/\D/g, '');
      if (cleanPhone.length >= 8) {
        setMode('cliente_cochecita');
        setCochecitaLookupInput(cleanPhone);
      }
      if (preloadCase.message) {
        setInputText(preloadCase.message);
      }
      if (onClearPreloadCase) onClearPreloadCase();
    }
  }, [preloadCase]);

  const draftRules = useMemo(
    () => learnedRules.filter((r) => r.activa !== false && r.estado_publicacion === 'borrador'),
    [learnedRules]
  );

  const liveRules = useMemo(
    () => learnedRules.filter((r) => r.activa !== false && r.estado_publicacion !== 'borrador'),
    [learnedRules]
  );

  const filteredRulesList = useMemo(() => {
    if (rulesFilter === 'borrador') {
      return learnedRules.filter((r) => r.estado_publicacion === 'borrador');
    }
    if (rulesFilter === 'publicada') {
      return learnedRules.filter((r) => r.estado_publicacion !== 'borrador');
    }
    return learnedRules;
  }, [learnedRules, rulesFilter]);

  // Detecta si el input de Cochecita es patente (tiene letras) o teléfono (solo dígitos)
  const parsedLookup = useMemo(() => {
    const raw = cochecitaLookupInput.trim();
    const hasLetters = /[a-zA-Z]/.test(raw);
    if (hasLetters) {
      return {
        isPlate: true,
        simulatedPlate: raw.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        simulatedPhone: ''
      };
    }
    return {
      isPlate: false,
      simulatedPlate: '',
      simulatedPhone: raw.replace(/\D/g, '')
    };
  }, [cochecitaLookupInput]);

  const handleResetConversation = async () => {
    setIsResetting(true);
    setSimError('');
    try {
      await resetSimulatedSessionInN8n(simSessionId).catch(() => {});
      setSimSessionId(createSimId());
      setMessages([]);
      setLastVariables(null);
    } finally {
      setIsResetting(false);
    }
  };

  const executeSimulationTurn = async (textToRun, customRulesOverride = null, sessionOverride = null) => {
    const cleanText = String(textToRun || '').trim();
    if (!cleanText || isSending) return;

    const activeSimId = sessionOverride || simSessionId;
    const rulesForTurn = customRulesOverride || learnedRules;
    const activeDraftsForTurn = rulesForTurn.filter(
      (r) => r.activa !== false && r.estado_publicacion === 'borrador'
    );

    const userBubble = {
      id: `u-${Date.now()}`,
      sender: mode === 'sucursal' ? 'sucursal_user' : 'cliente',
      label:
        mode === 'sucursal'
          ? `🏢 Suc. ${sucursalKey}`
          : mode === 'cliente_cochecita'
          ? `🚗 Cliente (${parsedLookup.isPlate ? `Patente ${parsedLookup.simulatedPlate}` : `+${parsedLookup.simulatedPhone || 'S/N'}`})`
          : `👤 ${pushName || 'Cliente Nuevo'}`,
      text: cleanText,
      quotedText: mode === 'sucursal' && quotedText.trim() ? quotedText.trim() : '',
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userBubble]);
    setInputText('');
    setSimError('');
    setIsSending(true);

    try {
      const res = await simulateBotTurnInN8n({
        simSessionId: activeSimId,
        mode,
        simulatedPhone: mode === 'cliente_cochecita' ? parsedLookup.simulatedPhone : '',
        simulatedPlate: mode === 'cliente_cochecita' ? parsedLookup.simulatedPlate : '',
        sucursalKey,
        pushName,
        text: cleanText,
        quotedText: mode === 'sucursal' ? quotedText.trim() : '',
        draftRules: activeDraftsForTurn
      });

      if (res?.variables) {
        setLastVariables(res.variables);
      }

      const botBubble = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        clientPrompt: cleanText,
        text: res?.botReply || '',
        silenced: Boolean(res?.silenced),
        silenceReason: res?.reason || '',
        branchPreview: res?.branchPreview || null,
        variablesSnapshot: res?.variables || null,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botBubble]);
    } catch (err) {
      setSimError(err.message || 'No se pudo ejecutar el turno en el simulador de n8n.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSimulationTurn(inputText);
  };

  const handleSaveRuleFromSimulator = async (newRule, { andRetest, mensajeCliente }) => {
    const nextRules = [newRule, ...learnedRules];
    await onUpdateRules(nextRules);

    if (andRetest && mensajeCliente) {
      // Si la conversación tenía varios turnos, reiniciamos si era el primer mensaje o re-enviamos directo con las nuevas reglas en borrador
      if (messages.length <= 2) {
        await resetSimulatedSessionInN8n(simSessionId).catch(() => {});
        const freshId = createSimId();
        setSimSessionId(freshId);
        setMessages([]);
        await executeSimulationTurn(mensajeCliente, nextRules, freshId);
      } else {
        await executeSimulationTurn(mensajeCliente, nextRules, simSessionId);
      }
    }
  };

  const handlePublishAllDrafts = async () => {
    if (draftRules.length === 0) return;
    setIsPublishingAll(true);
    try {
      const nextRules = learnedRules.map((r) =>
        r.estado_publicacion === 'borrador'
          ? { ...r, estado_publicacion: 'publicada', fecha_publicacion: new Date().toISOString().split('T')[0] }
          : r
      );
      await onUpdateRules(nextRules);
    } finally {
      setIsPublishingAll(false);
    }
  };

  const handleToggleRulePublishStatus = async (ruleId) => {
    const nextRules = learnedRules.map((r) => {
      if (r.id !== ruleId) return r;
      const nextStatus = r.estado_publicacion === 'borrador' ? 'publicada' : 'borrador';
      return { ...r, estado_publicacion: nextStatus };
    });
    await onUpdateRules(nextRules);
  };

  const handleToggleRuleActive = async (ruleId) => {
    const nextRules = learnedRules.map((r) =>
      r.id === ruleId ? { ...r, activa: r.activa === false ? true : false } : r
    );
    await onUpdateRules(nextRules);
  };

  const handleDeleteRule = async (ruleId) => {
    const nextRules = learnedRules.filter((r) => r.id !== ruleId);
    await onUpdateRules(nextRules);
  };

  const handleSaveEditedRule = async () => {
    if (!editingRuleDraft) return;
    const cleanKeywords = String(editingRuleDraft.keywordsText || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length >= 3);

    const updatedRule = {
      ...editingRuleDraft,
      keywords_disparo: cleanKeywords
    };
    delete updatedRule.keywordsText;

    const nextRules = learnedRules.map((r) => (r.id === updatedRule.id ? updatedRule : r));
    await onUpdateRules(nextRules);
    setEditingRuleId(null);
    setEditingRuleDraft(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* BANNER SUPERIOR DE CICLO BORRADOR -> PRODUCCIÓN EN VIVO */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-orange-950/30 border border-orange-500/30 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white">
                Simulador Sandbox & Entrenador de Variables IA
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🛡️ CERO envíos reales a WhatsApp
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                🔌 Conectado a Cochecita Read-Only
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Hablale al Bot, inspeccioná qué variables detecta y tocá <b>“Corregir / Enseñar acá”</b> en cualquier respuesta. Tus correcciones se prueban primero en <b>Borrador</b> y solo pasan a WhatsApp cuando tocás <b>Publicar en Vivo</b>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="bg-black/50 border border-zinc-800 rounded-xl px-3 py-2 text-xs flex items-center gap-3">
            <span className="text-amber-300 font-black">
              🧪 {draftRules.length} en Borrador
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400 font-black">
              🟢 {liveRules.length} en Vivo
            </span>
          </div>

          <button
            onClick={handlePublishAllDrafts}
            disabled={draftRules.length === 0 || isPublishingAll}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
              draftRules.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Rocket className="w-4 h-4" />
            {isPublishingAll
              ? 'Publicando...'
              : draftRules.length > 0
              ? `Publicar al Bot en Vivo (${draftRules.length})`
              : 'Todo Publicado al Día'}
          </button>
        </div>
      </div>

      {/* BARRA DE MODO DE SIMULACIÓN (CLIENTE NUEVO / COCHECITA / SUCURSAL) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('cliente_cochecita');
                handleResetConversation();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all ${
                mode === 'cliente_cochecita'
                  ? 'bg-orange-500 text-black border-orange-400'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Car className="w-4 h-4" />
              Cliente Registrado Cochecita
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('cliente_nuevo');
                handleResetConversation();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all ${
                mode === 'cliente_nuevo'
                  ? 'bg-orange-500 text-black border-orange-400'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Cliente Nuevo (No registrado)
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('sucursal');
                handleResetConversation();
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border transition-all ${
                mode === 'sucursal'
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Modo Sucursal (Patentes / #COT)
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetConversation}
            disabled={isResetting}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            Reiniciar Charla Limpia
          </button>
        </div>

        {/* Inputs contextuales del modo elegido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {mode === 'cliente_cochecita' && (
            <>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Teléfono real o Patente en Cochecita (busca automáticamente al cliente y sus vehículos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cochecitaLookupInput}
                    onChange={(e) => setCochecitaLookupInput(e.target.value)}
                    placeholder="Ej: 5492944912803 o patente AG995ZY"
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-orange-500 outline-none"
                  />
                  <span className="px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-bold text-orange-300 whitespace-nowrap">
                    {parsedLookup.isPlate
                      ? `🪪 Patente: ${parsedLookup.simulatedPlate || '-'}`
                      : `📱 Tel: +${parsedLookup.simulatedPhone || '-'}`}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Nombre de Perfil WhatsApp (Respaldo)
                </label>
                <input
                  type="text"
                  value={pushName}
                  onChange={(e) => setPushName(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
                />
              </div>
            </>
          )}

          {mode === 'cliente_nuevo' && (
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                Nombre de Perfil en WhatsApp (Simula un número no registrado en Cochecita)
              </label>
              <input
                type="text"
                value={pushName}
                onChange={(e) => setPushName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-orange-500 outline-none"
              />
            </div>
          )}

          {mode === 'sucursal' && (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase text-cyan-400 mb-1">
                  Sucursal Emisora del Mensaje
                </label>
                <select
                  value={sucursalKey}
                  onChange={(e) => setSucursalKey(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                >
                  {SUCURSALES_SIM.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Mensaje citado opcional (Solo si querés simular respuesta a un #COT-XXXX)
                </label>
                <input
                  type="text"
                  value={quotedText}
                  onChange={(e) => setQuotedText(e.target.value)}
                  placeholder="Dejar vacío para consultar patentes libremente, o pegar ej: SOLICITUD DE PRESUPUESTO #COT-1234"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Chips rápidos de prueba */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-black uppercase text-zinc-500 mr-1">
            Disparos rápidos:
          </span>
          {(QUICK_PROMPTS_BY_MODE[mode] || []).map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => executeSimulationTurn(chip.text)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-orange-300 border border-zinc-800 transition-colors disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* CUERPO PRINCIPAL: CHAT SANDBOX (7 COLS) + INSPECTOR VARIABLES & REGLAS (5 COLS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[600px]">
        {/* COLUMNA IZQUIERDA: CONVERSACIÓN INTERACTIVA */}
        <div className="xl:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="px-5 py-3.5 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-black text-white">
                Conversación de Prueba en Tiempo Real
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Sesión #{simSessionId.slice(-6)}
              </span>
            </div>
            {draftRules.length > 0 && (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🧪 Evaluando {draftRules.length} {draftRules.length === 1 ? 'borrador activo' : 'borradores activos'}
              </span>
            )}
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar max-h-[500px] min-h-[380px]"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <FlaskConical className="w-10 h-10 text-zinc-700 mb-3" />
                <p className="text-sm font-black text-zinc-300">
                  Escribí un mensaje o tocá un disparo rápido arriba para probar al Bot
                </p>
                <p className="text-xs text-zinc-500 max-w-md mt-1">
                  El Bot ejecutará exactamente el flujo real de n8n + Cochecita, pero interceptando cualquier derivación para que veas qué mandaría a la sucursal sin molestar a nadie por WhatsApp.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                if (m.sender !== 'bot') {
                  return (
                    <div key={m.id} className="flex flex-col items-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-800 text-zinc-100 p-3.5 text-xs leading-relaxed">
                        <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-black uppercase text-orange-300">
                          <span>{m.label}</span>
                          <span className="font-mono text-zinc-400">{m.timestamp}</span>
                        </div>
                        {m.quotedText && (
                          <div className="mb-2 p-2 rounded-lg bg-black/40 border-l-2 border-cyan-400 text-[11px] text-zinc-400 font-mono">
                            Citando: {m.quotedText}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  );
                }

                const firedRules = m.variablesSnapshot?.reglasDisparadasEnTurno || [];

                return (
                  <div key={m.id} className="flex flex-col items-end space-y-2">
                    {m.silenced ? (
                      <div className="max-w-[88%] rounded-2xl bg-zinc-950 border border-dashed border-amber-500/40 p-3.5 text-xs text-amber-200">
                        <div className="flex items-center gap-2 font-black uppercase text-[10px] text-amber-400 mb-1">
                          <VolumeX className="w-3.5 h-3.5" />
                          Silencio Intencional del Bot ({m.timestamp})
                        </div>
                        <p className="text-zinc-300">
                          El Bot decidió <b>no enviar mensaje</b> para no generar bucle ({m.silenceReason || 'cortesía / risa / emoji aislado'}).
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-emerald-950/50 border border-emerald-500/30 text-emerald-100 p-3.5 text-xs leading-relaxed">
                        <div className="flex items-center justify-between gap-4 mb-1 text-[10px] font-black uppercase text-emerald-300">
                          <span>🤖 Bot Check-Oil (Sandbox)</span>
                          <span className="font-mono opacity-75">{m.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      </div>
                    )}

                    {/* Badge si disparó una regla entrenada */}
                    {firedRules.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1.5 max-w-[88%]">
                        {firedRules.map((fr, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-400/40 text-purple-200 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-purple-300" />
                            Regla aplicada ({fr.estado === 'borrador' ? '🧪 Borrador' : '🟢 Vivo'}): {fr.pregunta}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tarjeta de intercepción si el Bot intentó mandar #COT o Derivación a una sucursal */}
                    {m.branchPreview?.triggered && (
                      <div className="max-w-[92%] w-full bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-3.5 text-xs text-cyan-100">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1.5">
                            📤 Mensaje a Sucursal Interceptado en Sandbox (No enviado por WhatsApp)
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                            Destino: {m.branchPreview.targetBranch || m.branchPreview.targetNumber || 'Sucursal'}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] bg-black/50 border border-cyan-500/20 rounded-xl p-2.5 text-cyan-50 max-h-48 overflow-y-auto">
                          {m.branchPreview.messageSentToBranch}
                        </pre>
                      </div>
                    )}

                    {/* Botón de Corrección / Entrenamiento Inline */}
                    <button
                      type="button"
                      onClick={() =>
                        setTeachingTurn({
                          clientPrompt: m.clientPrompt,
                          botReply: m.text || (m.silenced ? '[SILENCIO INTENCIONAL]' : '')
                        })
                      }
                      className="text-[11px] font-black px-3 py-1 rounded-xl bg-zinc-800/90 hover:bg-orange-500 text-orange-300 hover:text-black border border-orange-500/30 flex items-center gap-1.5 transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      Corregir / Enseñar acá
                    </button>
                  </div>
                );
              })
            )}

            {isSending && (
              <div className="flex justify-end">
                <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl px-4 py-2.5 text-xs text-emerald-300 font-bold animate-pulse">
                  🤖 Consultando Cochecita + Evaluando variables en n8n...
                </div>
              </div>
            )}
          </div>

          {simError && (
            <div className="mx-4 mb-2 bg-red-950/40 border border-red-500/40 rounded-xl p-2.5 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{simError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-3.5 bg-zinc-950 border-t border-zinc-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending}
              placeholder={
                mode === 'sucursal'
                  ? `Escribir como Sucursal ${sucursalKey} (ej. consulta por patente o respuesta #COT)...`
                  : 'Escribir mensaje al Bot para probar su respuesta...'
              }
              className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-orange-500 outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-orange-500 hover:bg-orange-400 text-black font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              Probar
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: INSPECTOR DE VARIABLES EN VIVO + ESTUDIO DE REGLAS */}
        <div className="xl:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-2 bg-zinc-950/80 border-b border-zinc-800 flex gap-2">
            <button
              type="button"
              onClick={() => setRightTab('variables')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                rightTab === 'variables'
                  ? 'bg-orange-500 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Variables Detectadas
            </button>
            <button
              type="button"
              onClick={() => setRightTab('rules')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                rightTab === 'rules'
                  ? 'bg-orange-500 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Reglas Entrenadas ({learnedRules.length})
            </button>
          </div>

          {rightTab === 'variables' ? (
            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto custom-scrollbar max-h-[540px]">
              {!lastVariables ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
                  Enviá un mensaje en el simulador para inspeccionar en tiempo real qué variables de Cochecita, bloqueo de derivación y estado interno calculó el Bot.
                </div>
              ) : (
                <>
                  {/* Tarjeta 1: Firewall de Derivación */}
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      lastVariables.bloquearDerivacionEnEsteTurno
                        ? 'bg-amber-950/25 border-amber-500/40'
                        : 'bg-emerald-950/20 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-white">
                        {lastVariables.bloquearDerivacionEnEsteTurno ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                            Derivación Bloqueada en este Turno
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Derivación Habilitada (Si datos completos)
                          </>
                        )}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 text-zinc-300">
                        Modo: {lastVariables.modoDetectado}
                      </span>
                    </div>

                    {lastVariables.bloquearDerivacionEnEsteTurno && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {lastVariables.motivosBloqueo?.consultaSoloInfo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                            📋 Consulta informativa / historial
                          </span>
                        )}
                        {lastVariables.motivosBloqueo?.localidadInexistenteDetectada && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-200">
                            📍 Localidad sin sucursal ({lastVariables.motivosBloqueo.localidadInexistenteDetectada})
                          </span>
                        )}
                        {lastVariables.motivosBloqueo?.faltaElegirVehiculoCochecita && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                            🚗 Debe confirmar cuál de sus vehículos
                          </span>
                        )}
                        {lastVariables.motivosBloqueo?.esEquivocacionDeChat && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-700 text-zinc-200">
                            😅 Cliente indicó chat equivocado
                          </span>
                        )}
                        {lastVariables.motivosBloqueo?.reglaEntrenadaProhibeDerivar && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200">
                            🎯 Bloqueado por Regla Entrenada IA
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 2: Datos Cochecita */}
                  <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-400">
                        Cruces con Base Cochecita (SQL Read-Only)
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          lastVariables.registradoEnCochecita
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {lastVariables.registradoEnCochecita ? 'REGISTRADO' : 'NO REGISTRADO'}
                      </span>
                    </div>

                    {lastVariables.registradoEnCochecita && (
                      <>
                        <div className="text-xs text-zinc-200">
                          <span className="text-zinc-500">Nombre saludo:</span>{' '}
                          <b>{lastVariables.nombreSaludo || '-'}</b>{' '}
                          <span className="text-zinc-500 text-[11px]">
                            ({lastVariables.nombreCochecita})
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {(lastVariables.vehiculosCochecita || []).map((v, i) => {
                            const nombreVeh =
                              v.vehiculo ||
                              v.marcaModelo ||
                              [v.marca, v.modelo].filter(Boolean).join(' ') ||
                              'Vehículo';
                            const dom = v.patente || v.dominio || 'S/D';
                            const ultFecha = v.ultimoServicioFecha || v.ultimoServicio?.fecha || '';
                            const ultSuc = v.ultimoServicioSucursal || v.ultimoServicio?.sucursal || '-';
                            return (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/90 text-[11px] flex flex-wrap items-center justify-between gap-2"
                              >
                                <div>
                                  <b className="text-white">{nombreVeh}</b>{' '}
                                  <span className="font-mono text-orange-300 ml-1">
                                    [{dom}]
                                  </span>
                                </div>
                                <span className="text-zinc-400 text-[10px]">
                                  {ultFecha
                                    ? `Últ. serv: ${ultFecha} (${ultSuc})`
                                    : 'Sin servicios detallados'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tarjeta 3: Variables de Sesión Persistidas */}
                  <div className="bg-black/40 border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-cyan-400 block">
                      Estado de Sesión Actual
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Vehículo en sesión</span>
                        <b className="text-zinc-200">{lastVariables.vehiculoEnSesion || 'Sin definir'}</b>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Sucursal elegida</span>
                        <b className="text-zinc-200">{lastVariables.sucursalEnSesion || 'Sin definir'}</b>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Estado charla</span>
                        <b className="text-orange-300">{lastVariables.estadoCharla || 'en_curso'}</b>
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                        <span className="text-zinc-500 block text-[10px]">Ticket #COT</span>
                        <b className="text-cyan-300">{lastVariables.ticketId || 'Ninguno'}</b>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar max-h-[540px]">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: `Todas (${learnedRules.length})` },
                  { id: 'borrador', label: `🧪 Borradores (${draftRules.length})` },
                  { id: 'publicada', label: `🟢 En Vivo (${liveRules.length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRulesFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                      rulesFilter === f.id
                        ? 'bg-zinc-800 text-orange-300 border-orange-500/40'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredRulesList.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
                  No hay reglas en esta vista. Tocá <b>“Corregir / Enseñar acá”</b> debajo de cualquier mensaje del Bot para crear una.
                </div>
              ) : (
                filteredRulesList.map((rule) => {
                  const isDraft = rule.estado_publicacion === 'borrador';
                  const isEditing = editingRuleId === rule.id;

                  if (isEditing && editingRuleDraft) {
                    return (
                      <div
                        key={rule.id}
                        className="p-3.5 rounded-2xl bg-zinc-950 border border-orange-500/50 space-y-2.5 text-xs"
                      >
                        <input
                          type="text"
                          value={editingRuleDraft.pregunta || ''}
                          onChange={(e) =>
                            setEditingRuleDraft({ ...editingRuleDraft, pregunta: e.target.value })
                          }
                          className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-1.5 text-orange-300 font-bold outline-none"
                        />
                        <textarea
                          rows={2}
                          value={editingRuleDraft.respuesta || ''}
                          onChange={(e) =>
                            setEditingRuleDraft({ ...editingRuleDraft, respuesta: e.target.value })
                          }
                          className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-white outline-none resize-none"
                        />
                        <textarea
                          rows={2}
                          placeholder="Respuesta ideal de ejemplo (opcional)"
                          value={editingRuleDraft.respuesta_ideal || ''}
                          onChange={(e) =>
                            setEditingRuleDraft({ ...editingRuleDraft, respuesta_ideal: e.target.value })
                          }
                          className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-emerald-200 outline-none resize-none"
                        />
                        <input
                          type="text"
                          placeholder="Keywords separadas por coma"
                          value={editingRuleDraft.keywordsText || ''}
                          onChange={(e) =>
                            setEditingRuleDraft({ ...editingRuleDraft, keywordsText: e.target.value })
                          }
                          className="w-full bg-black border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-300 outline-none"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={editingRuleDraft.permitir_derivar || 'normal'}
                            onChange={(e) =>
                              setEditingRuleDraft({
                                ...editingRuleDraft,
                                permitir_derivar: e.target.value
                              })
                            }
                            className="bg-black border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="normal">✅ Derivación normal</option>
                            <option value="prohibir_derivar">🚫 Prohibir derivación</option>
                          </select>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={handleSaveEditedRule}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-black text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRuleId(null);
                                setEditingRuleDraft(null);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={rule.id}
                      className={`p-3.5 rounded-2xl border space-y-2 transition-all ${
                        rule.activa === false
                          ? 'bg-zinc-950/30 border-zinc-900 opacity-50'
                          : isDraft
                          ? 'bg-amber-950/10 border-amber-500/30'
                          : 'bg-zinc-950/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isDraft
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isDraft ? '🧪 BORRADOR' : '🟢 EN VIVO'}
                          </span>
                          {rule.permitir_derivar === 'prohibir_derivar' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              🚫 Bloquea derivar
                            </span>
                          )}
                          {rule.categoria && CATEGORY_LABELS[rule.categoria] && (
                            <span className="text-[10px] font-bold text-zinc-400">
                              {CATEGORY_LABELS[rule.categoria]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleRulePublishStatus(rule.id)}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                              isDraft
                                ? 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                            }`}
                            title={
                              isDraft
                                ? 'Publicar esta regla al WhatsApp en vivo'
                                : 'Pasar a borrador (solo afectará al Simulador)'
                            }
                          >
                            {isDraft ? 'Publicar' : 'A Borrador'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRuleId(rule.id);
                              setEditingRuleDraft({
                                ...rule,
                                keywordsText: Array.isArray(rule.keywords_disparo)
                                  ? rule.keywords_disparo.join(', ')
                                  : ''
                              });
                            }}
                            className="p-1 text-zinc-400 hover:text-orange-300"
                            title="Editar variables de la regla"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleRuleActive(rule.id)}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300"
                          >
                            {rule.activa === false ? 'Activar' : 'Pausar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-black text-orange-300">{rule.pregunta}</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{rule.respuesta}</p>

                      {rule.respuesta_ideal && (
                        <div className="text-[11px] text-emerald-200 bg-emerald-950/25 border border-emerald-500/20 rounded-xl p-2">
                          <b>Respuesta ideal:</b> “{rule.respuesta_ideal}”
                        </div>
                      )}

                      {Array.isArray(rule.keywords_disparo) && rule.keywords_disparo.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <Tag className="w-3 h-3 text-zinc-500" />
                          {rule.keywords_disparo.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {rule.ejemplo_cliente && (
                        <button
                          type="button"
                          onClick={() => setInputText(rule.ejemplo_cliente)}
                          className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Cargar frase de prueba: “{rule.ejemplo_cliente.slice(0, 55)}”
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CORRECCIÓN Y SÍNTESIS IA */}
      <BotTeachCorrectionModal
        isOpen={Boolean(teachingTurn)}
        onClose={() => setTeachingTurn(null)}
        initialClientMessage={teachingTurn?.clientPrompt || ''}
        initialBotReply={teachingTurn?.botReply || ''}
        sourceLabel="Simulador de Conversaciones"
        onSaveRule={handleSaveRuleFromSimulator}
      />
    </div>
  );
}
