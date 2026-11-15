import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  BookOpen,
  Trash2,
  ExternalLink,
  Bot
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { fetchBotDashboardFromN8n } from '../../bot/services/botService';
import {
  evaluateEffectiveDerivation,
  isGhostEmptySession
} from '../../bot/services/botNonDerivedAnalyzer';
import { processRemexCopilotTurn } from '../services/remexKnowledgeAndCopilotEngine';

const STORAGE_KEY = 'remex_system_copilot_history_v1';

const INITIAL_MESSAGES = [
  {
    id: 'welcome-remex',
    role: 'assistant',
    text:
      '👋 ¡Hola! Soy el **Ayudante Inteligente de Remex Work-OS**.\n\nConozco cada sección, cada colección de Firestore, las vinculaciones automáticas entre módulos (Tareas, Viajes, Flota, Finanzas, Socios 3/3 y Bot WhatsApp) y **puedo ejecutar acciones reales en el sistema por vos**.',
    suggestedActions: [
      { label: '📊 Resumen en Vivo de Remex', action: { type: 'ASK_PROMPT', prompt: 'Resumen operativo de Remex' } },
      { label: '📖 Manual con Fotos Rotuladas', action: { type: 'NAVIGATE', view: 'manual' } },
      { label: '🗺️ Mapa de Datos y Vínculos', action: { type: 'ASK_PROMPT', prompt: '¿De dónde sale la información y cómo se vincula todo?' } },
      { label: '🤖 Informe Sin Derivación Bot', action: { type: 'NAVIGATE', view: 'bot' } }
    ]
  }
];

function renderFormattedText(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <div key={i} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-black text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code
                key={j}
                className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 font-mono text-[11px] font-bold"
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </div>
    );
  });
}

export default function RemexSystemCopilot({
  user,
  isOpen,
  onOpen,
  onClose,
  onNavigateView
}) {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {
      // ignore
    }
    return INITIAL_MESSAGES;
  });

  // Telemetría viva de las colecciones de Remex OS para responder con datos reales
  const [liveData, setLiveData] = useState({
    tasks: [],
    contacts: [],
    zones: [],
    events: [],
    trips: [],
    debtSnapshots: [],
    proposals: [],
    botSummary: null
  });

  const endRef = useRef(null);
  const seqRef = useRef(1);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const noop = () => {};
    const unsubs = [
      onSnapshot(collection(db, 'tasks'), (snap) =>
        setLiveData((p) => ({ ...p, tasks: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      ),
      onSnapshot(collection(db, 'contacts'), (snap) =>
        setLiveData((p) => ({ ...p, contacts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      ),
      onSnapshot(collection(db, 'zones'), (snap) =>
        setLiveData((p) => ({ ...p, zones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      ),
      onSnapshot(collection(db, 'events'), (snap) =>
        setLiveData((p) => ({ ...p, events: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      ),
      onSnapshot(collection(db, 'trips'), (snap) =>
        setLiveData((p) => ({ ...p, trips: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      ),
      onSnapshot(collection(db, 'debt_snapshots'), (snap) =>
        setLiveData((p) => ({
          ...p,
          debtSnapshots: snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        })), noop
      ),
      onSnapshot(collection(db, 'partner_proposals'), (snap) =>
        setLiveData((p) => ({ ...p, proposals: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })), noop
      )
    ];

    fetchBotDashboardFromN8n()
      .then((data) => {
        if (Array.isArray(data?.sessions)) {
          const valid = data.sessions.filter(
            (s) => s.documentId && !s.documentId.endsWith('@g.us') && !isGhostEmptySession(s)
          );
          const derived = valid.filter((s) => evaluateEffectiveDerivation(s).isEffectivelyDerived).length;
          setLiveData((p) => ({
            ...p,
            botSummary: {
              realTotal: valid.length,
              derived,
              slaMin: data?.config?.sla_recordatorio_minutos || '30'
            }
          }));
        }
      })
      .catch(() => {});

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendQuery = async (queryText) => {
    const clean = String(queryText || '').trim();
    if (!clean || isProcessing) return;

    seqRef.current += 1;
    const seq = seqRef.current;
    setMessages((prev) => [...prev, { id: `u-${seq}`, role: 'user', text: clean }]);
    setInput('');
    setIsProcessing(true);

    try {
      const reply = await processRemexCopilotTurn(clean, {
        user,
        ...liveData
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${seq}`,
          role: 'assistant',
          text: reply.text,
          chapterRef: reply.chapterRef || null,
          suggestedActions: reply.suggestedActions || []
        }
      ]);
      if (reply.autoAction?.type === 'NAVIGATE' && reply.autoAction.view && onNavigateView) {
        onNavigateView(reply.autoAction.view);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${seq}`,
          role: 'assistant',
          text: `⚠️ Ocurrió un inconveniente al ejecutar la acción: ${err?.message || 'Error de red'}.`
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;
    if (action.type === 'ASK_PROMPT') {
      sendQuery(action.prompt);
      return;
    }
    if (action.type === 'NAVIGATE' && action.view && onNavigateView) {
      onNavigateView(action.view);
    }
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          data-globo="Ayudante Inteligente Remex OS: consultá cómo funciona cualquier parte del sistema o pedile crear tareas, agendar eventos y navegar por vos."
          className="fixed bottom-5 right-5 z-[180] px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-xs sm:text-sm shadow-[0_10px_30px_rgba(249,115,22,0.45)] border border-orange-300 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 font-sans"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>Ayudante Remex OS</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/25 font-sans">
          <div className="w-full max-w-md bg-zinc-950 border-l border-orange-500/30 h-full flex flex-col shadow-2xl">
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-orange-500 text-black flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">
                    Ayudante IA • Remex Work-OS
                  </div>
                  <div className="text-[10px] font-bold text-orange-400 truncate">
                    Conocimiento completo + Ejecución en vivo
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateView && onNavigateView('manual')}
                  data-globo="Abrir Manual Visual con Fotos Rotuladas"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-orange-500 hover:text-black text-zinc-200 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  data-globo="Reiniciar historial del Ayudante"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  data-globo="Cerrar Ayudante"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-[#090b10]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                      m.role === 'user'
                        ? 'bg-orange-500 text-black font-bold rounded-br-sm'
                        : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-sm space-y-2'
                    }`}
                  >
                    <div>{renderFormattedText(m.text)}</div>

                    {m.chapterRef && (
                      <div
                        onClick={() => onNavigateView && onNavigateView('manual')}
                        className="mt-2 rounded-xl overflow-hidden border border-orange-500/30 bg-black cursor-pointer group"
                      >
                        <img
                          src={m.chapterRef.image}
                          alt={m.chapterRef.title}
                          className="w-full h-28 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="px-2.5 py-1.5 bg-zinc-950 text-[10px] font-black text-orange-400 flex items-center justify-between">
                          <span className="truncate">
                            📸 {m.chapterRef.number}. {m.chapterRef.title}
                          </span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </div>
                      </div>
                    )}

                    {Array.isArray(m.suggestedActions) && m.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {m.suggestedActions.map((sa, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleActionClick(sa.action)}
                            className="px-2.5 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500 hover:text-black text-orange-300 border border-orange-500/30 text-[11px] font-black transition-all text-left"
                          >
                            {sa.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {[
                  'Resumen operativo de Remex',
                  '¿De dónde sale la info?',
                  'Abrí Presupuestos Centro',
                  'Abrí Viajes de Reparto'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => sendQuery(chip)}
                    className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-orange-500/20 text-[11px] font-bold text-zinc-300 border border-zinc-800 shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendQuery(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isProcessing}
                  placeholder='Preguntá o pedí hacer algo (ej: "Creá una tarea: Controlar stock")...'
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-white outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !input.trim()}
                  className="p-2.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
