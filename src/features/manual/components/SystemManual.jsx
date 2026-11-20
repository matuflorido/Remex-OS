import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  ExternalLink,
  Database,
  Link2,
  CheckCircle2,
  ZoomIn,
  X,
  Layers,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Calculator
} from 'lucide-react';
import useUIStore from '../../../store/useUIStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { canAccessCentralBasesSection } from '../../central_bases/services/centralBasesService';
import {
  REMEX_ARCHITECTURE_OVERVIEW,
  REMEX_MANUAL_CHAPTERS
} from '../../copilot/services/remexKnowledgeAndCopilotEngine';

const resolveManualAsset = (rawPath) => {
  const clean = String(rawPath || '').replace(/^\//, '');
  const base = import.meta.env.BASE_URL || './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${clean}?v=2.8.0`;
};

export default function SystemManual() {
  const { user } = useAuthStore();
  const canSeeRestricted = canAccessCentralBasesSection(user);
  const { setCurrentView, setCopilotOpen } = useUIStore();
  const [tabMode, setTabMode] = useState('chapters'); // 'chapters' | 'architecture'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState(
    REMEX_MANUAL_CHAPTERS[1]?.id || REMEX_MANUAL_CHAPTERS[0]?.id
  );
  const [zoomedImage, setZoomedImage] = useState(null);

  const handleDownloadPdf = async (e) => {
    try {
      if (typeof window !== 'undefined' && typeof window.require === 'function') {
        e.preventDefault();
        const { ipcRenderer } = window.require('electron');
        await ipcRenderer.invoke('open-or-save-manual-pdf');
      }
    } catch {
      // Fallback a descarga nativa del navegador
    }
  };

  const visibleBaseChapters = useMemo(() => {
    if (canSeeRestricted) return REMEX_MANUAL_CHAPTERS;
    return REMEX_MANUAL_CHAPTERS.filter(
      (ch) => ch.id !== 'lector_bases_central_remex' && ch.id !== 'directorio_socios_3de3'
    );
  }, [canSeeRestricted]);

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return visibleBaseChapters;
    return visibleBaseChapters.filter((ch) => {
      const calcTxt = Array.isArray(ch.howItCalculates) ? ch.howItCalculates.join(' ') : '';
      const hay = `${ch.number} ${ch.title} ${ch.badge} ${ch.purpose} ${ch.howItWorks} ${ch.dataSource} ${calcTxt} ${ch.crossLinks.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery, visibleBaseChapters]);

  const activeChapter = useMemo(() => {
    const exact = filteredChapters.find((c) => c.id === selectedChapterId);
    return exact || filteredChapters[0] || REMEX_MANUAL_CHAPTERS[0];
  }, [filteredChapters, selectedChapterId]);

  const handleGoToLiveSection = (ch) => {
    if (!ch || !ch.viewTarget) return;
    setCurrentView(ch.viewTarget);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden font-sans">
      {/* CABECERA EJECUTIVA */}
      <div className="p-5 lg:px-7 lg:py-5 shrink-0 border-b border-zinc-800 bg-zinc-900/70 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Documentación Oficial Rotulada • Remex Work-OS
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white flex items-center gap-2.5">
            Manual Visual Detallado, Mapa de Datos y Vinculaciones
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
            Cada sección y pestaña de Remex Work-OS fotografiada con carteles explicativos numerados, origen exacto de la información (Firestore en tiempo real + n8n WhatsApp) y cómo se vincula automáticamente con el resto del sistema.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setTabMode('chapters')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                tabMode === 'chapters'
                  ? 'bg-orange-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📸 Pantallas Rotuladas ({REMEX_MANUAL_CHAPTERS.length})
            </button>
            <button
              type="button"
              onClick={() => setTabMode('architecture')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                tabMode === 'architecture'
                  ? 'bg-orange-500 text-black shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🗺️ Mapa de Datos y Vínculos
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black text-xs font-black flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4" /> Ayudante IA Remex
          </button>

          <a
            href={resolveManualAsset('/manual/Manual_Profesional_Remex_OS.pdf')}
            onClick={handleDownloadPdf}
            target="_blank"
            rel="noopener noreferrer"
            download="Manual_Profesional_Remex_OS.pdf"
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-black flex items-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-orange-400" /> Descargar Manual PDF
          </a>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {tabMode === 'architecture' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-black text-white">
                Arquitectura Maestra: ¿De dónde sale cada dato y cómo se conecta todo en Remex OS?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REMEX_ARCHITECTURE_OVERVIEW.goldenRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/25 flex items-start gap-3"
                >
                  <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-zinc-200 leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="p-3.5">Fuente / Motor de Datos</th>
                    <th className="p-3.5">Modo de Integración</th>
                    <th className="p-3.5">Colecciones / Tablas Exactas</th>
                    <th className="p-3.5">Módulos de Remex OS que Alimenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/40">
                  {REMEX_ARCHITECTURE_OVERVIEW.dataSourcesSummary.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5 font-black text-white">{row.source}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                          {row.mode}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-orange-300">{row.tables}</td>
                      <td className="p-3.5 text-zinc-300 font-medium">{row.feeds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-orange-400">
              🔗 Circuito Completo de Vinculaciones Automáticas entre Módulos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="font-black text-white">1. Finanzas (FIFO) ➔ Tablero de Tareas</div>
                <p className="text-zinc-400 leading-relaxed">
                  Al guardar una Foto de Deuda en <strong>Finanzas</strong>, el motor calcula absorción FIFO contra el límite crediticio. Si queda exceso vencido &gt;30 días, <strong>crea automáticamente una Tarea Urgente de Cobranza</strong> en el KanBan.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="font-black text-white">2. CRM + Zonas ➔ Agenda ➔ Viajes ➔ Flota</div>
                <p className="text-zinc-400 leading-relaxed">
                  Las <strong>Zonas</strong> agrupan clientes del <strong>CRM</strong>, colorean la <strong>Agenda</strong> y abren <strong>Viajes de Reparto</strong> con Rendición Triple, que actualizan el odómetro de <strong>Flota</strong> y detectan solos los km urbanos en Bariloche.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="font-black text-white">3. Bot WhatsApp ➔ Presupuestos ➔ Socios 3/3</div>
                <p className="text-zinc-400 leading-relaxed">
                  <strong>Remex OS</strong> gobierna en vivo la configuración del Bot en n8n, audita por qué quedaron charlas sin derivar, mide las cotizaciones de Centro y resguarda normas firmes votadas 3/3 por los Socios.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* COLUMNA IZQUIERDA: ÍNDICE DE LAS 14 SECCIONES */}
          <div className="w-80 lg:w-96 border-r border-zinc-800 bg-black/30 flex flex-col shrink-0">
            <div className="p-3.5 border-b border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar sección, tabla, vínculo..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-1.5">
              {filteredChapters.map((ch) => {
                const isSelected = activeChapter?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChapterId(ch.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-2.5 border ${
                      isSelected
                        ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 mt-0.5 ${
                        isSelected ? 'bg-orange-500 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {ch.number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black leading-snug line-clamp-2">{ch.title}</div>
                      <div className="text-[10px] font-bold opacity-70 mt-0.5 uppercase tracking-wider">
                        {ch.badge}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 ${
                        isSelected ? 'text-orange-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* PANEL DERECHO: DETALLE + CAPTURA ROTULADA */}
          {activeChapter && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 lg:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-black text-[10px] font-black">
                        SECCIÓN {activeChapter.number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-wider">
                        {activeChapter.badge}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">{activeChapter.title}</h3>
                  </div>

                  {activeChapter.viewTarget && (
                    <button
                      type="button"
                      onClick={() => handleGoToLiveSection(activeChapter)}
                      className="px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-black flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-orange-500/20"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Ir a esta sección en vivo
                    </button>
                  )}
                </div>

                {/* FOTO ROTULADA CON CARTELES EXPLICATIVOS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                      📸 Captura Real con Carteles Explicativos (Clic para ampliar en alta definición)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedImage({ src: resolveManualAsset(activeChapter.image), title: activeChapter.title })
                      }
                      className="text-xs font-bold text-zinc-400 hover:text-orange-400 flex items-center gap-1"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Pantalla completa
                    </button>
                  </div>

                  <div
                    onClick={() =>
                      setZoomedImage({ src: resolveManualAsset(activeChapter.image), title: activeChapter.title })
                    }
                    className="group relative rounded-2xl overflow-hidden border-2 border-zinc-800 hover:border-orange-500/70 cursor-zoom-in bg-zinc-950 transition-all shadow-lg"
                  >
                    <img
                      src={resolveManualAsset(activeChapter.image)}
                      alt={activeChapter.title}
                      className="w-full h-auto object-contain max-h-[540px] mx-auto"
                      loading="lazy"
                    />
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 text-white text-[11px] font-bold flex items-center gap-1.5 opacity-90 group-hover:bg-orange-500 group-hover:text-black transition-all">
                      <ZoomIn className="w-3.5 h-3.5" /> Ampliar foto rotulada
                    </div>
                  </div>

                  {Array.isArray(activeChapter.callouts) && activeChapter.callouts.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {activeChapter.callouts.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-start gap-2.5 text-xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-orange-500 text-black font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-zinc-200 font-medium leading-snug">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* BLOQUES DETALLADOS: PROPÓSITO, FUNCIONAMIENTO, ORIGEN Y VINCULACIONES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-orange-400">
                      🎯 ¿Para qué es y qué resuelve?
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {activeChapter.purpose}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                      ⚙️ ¿Cómo funciona por dentro?
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {activeChapter.howItWorks}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/25 space-y-1.5">
                  <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> ¿De dónde viene exactamente la información?
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed font-semibold">
                    {activeChapter.dataSource}
                  </p>
                </div>

                {Array.isArray(activeChapter.howItCalculates) && activeChapter.howItCalculates.length > 0 && (
                  <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/30 space-y-2.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4" /> ¿Cómo se calcula cada número paso a paso?
                    </div>
                    <ul className="space-y-2">
                      {activeChapter.howItCalculates.map((calcLine, cIdx) => (
                        <li
                          key={cIdx}
                          className="text-xs text-zinc-200 leading-relaxed bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3"
                        >
                          {calcLine}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/25 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Vinculación con otras partes del sistema
                    </div>
                    <ul className="space-y-1.5">
                      {activeChapter.crossLinks.map((lnk, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="text-purple-400 font-black mt-0.5">•</span>
                          <span>{lnk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                    <div className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cómo se usa paso a paso
                    </div>
                    <ol className="space-y-1.5">
                      {activeChapter.howToUse.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-zinc-300 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="font-black text-amber-400 shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX DE ALTA DEFINICIÓN */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[220] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div className="w-full max-w-6xl flex items-center justify-between mb-3 text-white">
            <div className="text-sm font-black truncate pr-4">📸 {zoomedImage.title}</div>
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <X className="w-4 h-4" /> Cerrar Vista Ampliada
            </button>
          </div>
          <img
            src={zoomedImage.src}
            alt={zoomedImage.title}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
