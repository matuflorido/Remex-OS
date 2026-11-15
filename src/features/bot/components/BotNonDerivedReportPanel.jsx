import { useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Clock,
  MessageSquare,
  Copy,
  Check,
  Download,
  Search,
  ExternalLink,
  Car,
  Sparkles,
  Filter,
  HelpCircle
} from 'lucide-react';
import {
  buildNonDerivedExecutiveReport,
  formatExecutiveReportAsText
} from '../services/botNonDerivedAnalyzer';

const PERIOD_OPTIONS = [
  { days: 0, label: 'Todo el historial' },
  { days: 30, label: 'Últimos 30 días' },
  { days: 7, label: 'Últimos 7 días' },
  { days: 1, label: 'Últimas 24 hs' }
];

function formatShortDate(isoStr) {
  if (!isoStr) return 'Sin fecha';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr).slice(0, 16);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function BotNonDerivedReportPanel({
  rawSessions = [],
  onOpenChatSession
}) {
  const [periodDays, setPeriodDays] = useState(0);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState('all_non_derived');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  const report = useMemo(
    () => buildNonDerivedExecutiveReport(rawSessions, periodDays),
    [rawSessions, periodDays]
  );

  const { totals } = report;

  const filteredTableItems = useMemo(() => {
    let base;
    if (selectedAuditFilter === 'all_non_derived') {
      base = report.realNonDerived;
    } else if (selectedAuditFilter === 'quote_broker') {
      base = report.quoteBrokerItems;
    } else if (selectedAuditFilter === 'recovered_courtesy') {
      base = report.derivedRecovered;
    } else {
      base = report.realNonDerived.filter((x) => x.reasonId === selectedAuditFilter);
    }

    const q = searchTerm.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      const hay = `${item.nombre} ${item.phone} ${item.vehiculo} ${item.reasonLabel} ${item.subReasonLabel} ${item.explanation} ${item.lastClientText}`.toLowerCase();
      return hay.includes(q);
    });
  }, [report, selectedAuditFilter, searchTerm]);

  const handleCopyReport = async () => {
    try {
      const text = formatExecutiveReportAsText(report);
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2600);
    } catch {
      // fallback silencioso
    }
  };

  const handleExportAuditCsv = () => {
    const rows = [
      [
        'Fecha',
        'Cliente',
        'Telefono',
        'Vehiculo',
        'Sucursal',
        'Clasificacion Principal',
        'Motivo Detallado',
        'Explicacion IA',
        'Ultimo Mensaje Cliente'
      ]
    ];
    const itemsToExport = [
      ...report.realNonDerived,
      ...report.quoteBrokerItems,
      ...report.derivedRecovered
    ];
    for (const it of itemsToExport) {
      rows.push([
        formatShortDate(it.effectiveDate),
        it.nombre,
        it.phone,
        it.vehiculo,
        it.sucursal,
        it.reasonLabel,
        it.subReasonLabel,
        it.explanation,
        it.lastClientText
      ]);
    }
    const csvContent =
      '\uFEFF' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')
        )
        .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Sin_Derivacion_CheckOil_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxUnsupportedCount = Math.max(
    1,
    ...report.unsupportedServicesRanking.map((s) => s.count)
  );

  return (
    <div className="space-y-5">
      {/* CABECERA DEL INFORME Y CONTROLES DE PERÍODO / EXPORTACIÓN */}
      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-orange-500/30 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <Sparkles className="w-3 h-3" /> Auditoría Forense Automática en Vivo
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500 shrink-0" />
              Informe de Conversaciones Sin Derivación
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Analiza mensaje por mensaje por qué cada charla no terminó en derivación: clientes que dejaron de responder, servicios que no ofrecemos, cotizaciones en curso y falsos no-derivados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setPeriodDays(opt.days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    periodDays === opt.days
                      ? 'bg-orange-500 text-black shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 transition-all"
            >
              {copiedReport ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedReport ? '¡Informe copiado!' : 'Copiar Resumen'}
            </button>

            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-black flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4 text-orange-500" /> CSV Detallado
            </button>
          </div>
        </div>

        {/* HALLAZGO CLAVE DE DEPURACIÓN */}
        {(totals.derivedRecoveredFromCourtesyCount > 0 || totals.ghostEmptyCount > 0) && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-slate-700 dark:text-zinc-200 leading-relaxed">
              <strong className="text-emerald-700 dark:text-emerald-300">
                Depuración de Falsos &ldquo;No Derivados&rdquo;:
              </strong>{' '}
              Antes figuraban infladas las charlas sin derivar por dos motivos técnicos ya corregidos en este informe:{' '}
              {totals.ghostEmptyCount > 0 && (
                <span>
                  <strong>{totals.ghostEmptyCount} registros antiguos vacíos (0 mensajes)</strong> previos al 15/10, y{' '}
                </span>
              )}
              <strong>
                {totals.derivedRecoveredFromCourtesyCount} clientes que SÍ fueron derivados a sucursal
              </strong>{' '}
              pero al responder luego <em>&ldquo;Gracias&rdquo;</em> u <em>&ldquo;Ok&rdquo;</em> su estado había quedado pisado como en curso. La tasa real de derivación sobre charlas reales es del{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {totals.realConversionPct}% ({totals.derivedTotalCount} de {totals.realConversationsCount})
              </strong>.
            </div>
          </div>
        )}

        {/* 4 KPIS DEL EMBUDO REAL */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-zinc-800">
            <p className="text-[11px] font-black uppercase text-slate-400">Charlas Reales</p>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {totals.realConversationsCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              {totals.ghostEmptyCount > 0
                ? `+ ${totals.ghostEmptyCount} fichas vacías excluidas`
                : 'Con mensajes reales en WhatsApp'}
            </p>
          </div>

          <div
            onClick={() => setSelectedAuditFilter('recovered_courtesy')}
            className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 cursor-pointer hover:border-emerald-500 transition-all"
          >
            <p className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
              Derivadas Efectivas
            </p>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totals.derivedTotalCount}{' '}
              <span className="text-sm font-bold opacity-80">({totals.realConversionPct}%)</span>
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
              Incluye {totals.derivedRecoveredFromCourtesyCount} recuperadas post-&ldquo;Gracias&rdquo;
            </p>
          </div>

          <div
            onClick={() => setSelectedAuditFilter('quote_broker')}
            className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/30 cursor-pointer hover:border-cyan-500 transition-all"
          >
            <p className="text-[11px] font-black uppercase text-cyan-600 dark:text-cyan-400">
              Presupuesto Centro (#COT)
            </p>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
              {totals.quoteBrokerCount}
            </div>
            <p className="text-[11px] text-cyan-700/80 dark:text-cyan-300/80 mt-1">
              Cotizadas / esperando confirmación
            </p>
          </div>

          <div
            onClick={() => setSelectedAuditFilter('all_non_derived')}
            className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/30 cursor-pointer hover:border-amber-500 transition-all"
          >
            <p className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400">
              No Quedaron en Nada (Reales)
            </p>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {totals.realNonDerivedCount}
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">
              Desglosadas abajo por causa exacta
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: CAUSAS RAÍZ DE LAS CHARLAS QUE NO QUEDARON EN NADA */}
      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-500" />
              1. ¿Por qué quedaron sin derivación esas {totals.realNonDerivedCount} conversaciones?
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Tocá cualquier tarjeta para filtrar abajo las conversaciones exactas de ese grupo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {report.reasonBreakdown.map((r) => {
            const isSelected = selectedAuditFilter === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  setSelectedAuditFilter((prev) => (prev === r.id ? 'all_non_derived' : r.id))
                }
                className={`text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/30'
                    : 'bg-slate-50 dark:bg-[#07090e] border-slate-200 dark:border-zinc-800 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${r.colorClass}`}>
                    {r.badge}
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {r.count}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 mb-1">
                  {r.title}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                  {r.summaryHint}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-slate-500 dark:text-zinc-400">
                    <span>{r.pctOfNonDerived}% de las no derivadas</span>
                    <span>{r.pctOfRealTotal}% del total</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${r.barClass}`} style={{ width: `${r.pctOfNonDerived}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2 + 3: RANKING DE SERVICIOS NO OFRECIDOS Y ETAPAS DE ABANDONO / RECUPERABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* COLUMNA IZQUIERDA (7 cols): ¿QUÉ SERVICIOS PIDIERON QUE NO OFRECEMOS? */}
        <div className="xl:col-span-7 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
          <div>
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-rose-500" />
              2. ¿Qué servicios o repuestos pidieron que NO ofrecemos?
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Demanda real detectada en los chats (incluye tanto quienes no derivaron como clientes derivados que además consultaron por otro rubro).
            </p>
          </div>

          {report.unsupportedServicesRanking.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No se detectaron consultas de servicios fuera de catálogo en este período.
            </p>
          ) : (
            <div className="space-y-3">
              {report.unsupportedServicesRanking.map((svc) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-zinc-800 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {svc.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {svc.note}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-black shrink-0">
                      {svc.count} {svc.count === 1 ? 'consulta' : 'consultas'}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                      style={{ width: `${Math.max(8, Math.round((svc.count / maxUnsupportedCount) * 100))}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {svc.examples.map((ex) => (
                      <button
                        key={`${svc.id}-${ex.documentId}`}
                        type="button"
                        onClick={() => onOpenChatSession && onOpenChatSession(ex.documentId)}
                        title={`Abrir charla de ${ex.nombre}: "${ex.quote}"`}
                        className="text-left max-w-full px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 hover:border-orange-500 border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="font-bold shrink-0">{ex.nombre}:</span>
                        <span className="truncate italic opacity-85">
                          &ldquo;{String(ex.quote || '').slice(0, 52)}&rdquo;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA (5 cols): ¿EN QUÉ PASO ABANDONARON? + CASOS RECUPERABLES HOY */}
        <div className="xl:col-span-5 space-y-5">
          {/* Etapas donde el cliente dejó de responder */}
          <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-3.5">
            <div>
              <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                3. ¿En qué paso dejó de responder el cliente?
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Momento exacto de la charla en el que el cliente abandonó la consulta.
              </p>
            </div>

            {report.dropOffStages.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Sin abandonos de clientes en este período.
              </p>
            ) : (
              <div className="space-y-2.5">
                {report.dropOffStages.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      <span>{st.label}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black shrink-0">
                        {st.count} ({st.pct}%)
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {st.items.map((it) => (
                        <button
                          key={it.documentId}
                          type="button"
                          onClick={() => onOpenChatSession && onOpenChatSession(it.documentId)}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-orange-500 text-[10px] font-bold text-slate-600 dark:text-zinc-300"
                        >
                          {it.nombre} {it.vehiculo !== 'No especificado' ? `• ${it.vehiculo}` : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clientes / Consultas Recuperables Hoy */}
          <div className="bg-white dark:bg-[#0d1117] border border-orange-500/30 rounded-3xl p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black uppercase text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Atención / Recuperables ({report.actionableLeads.length})
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Consultas reales sin respuesta o clientes que ya dieron su vehículo y pueden retomarse.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {report.actionableLeads.slice(0, 8).map((lead) => (
                <div
                  key={lead.documentId}
                  className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {lead.nombre}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 shrink-0">
                      {formatShortDate(lead.effectiveDate)}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                    {lead.subReasonLabel}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-snug">
                    {lead.explanation}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenChatSession && onOpenChatSession(lead.documentId)}
                      className="text-[11px] font-black text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> Ver charla en Espejo →
                    </button>
                    {lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        WA <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: LISTADO DETALLADO AUDITADO CONVERSACIÓN POR CONVERSACIÓN */}
      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-500" />
              4. Detalle Conversación por Conversación ({filteredTableItems.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Cada fila explica exactamente qué pidió el cliente y por qué no derivó.
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, auto, freno, batería..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all_non_derived', label: `Todas las Sin Derivar (${totals.realNonDerivedCount})` },
            { id: 'servicio_no_ofrecido', label: 'Servicio No Ofrecido' },
            { id: 'cliente_dejo_de_responder', label: 'Dejó de Responder' },
            { id: 'sin_respuesta_bot', label: 'Sin Respuesta Bot' },
            { id: 'cortesia_spam_proveedor', label: 'Saludos Sueltos / Proveedor' },
            { id: 'quote_broker', label: `Presupuestos Centro (${totals.quoteBrokerCount})` },
            { id: 'recovered_courtesy', label: `Derivadas Recuperadas (${totals.derivedRecoveredFromCourtesyCount})` }
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedAuditFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedAuditFilter === pill.id
                  ? 'bg-orange-500 text-black border-orange-500 font-black'
                  : 'bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-orange-500/40'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
          {filteredTableItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No hay conversaciones para este filtro.
            </div>
          ) : (
            filteredTableItems.map((it) => (
              <div
                key={it.documentId}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#07090e] border border-slate-200 dark:border-zinc-800 hover:border-orange-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {it.nombre}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      +{it.phone}
                    </span>
                    {it.vehiculo && it.vehiculo !== 'No especificado' && it.vehiculo !== 'No aplica' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                        <Car className="w-3 h-3 text-orange-500" /> {it.vehiculo}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 text-[10px] font-black">
                      {it.subReasonLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • {formatShortDate(it.effectiveDate)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    {it.explanation}
                  </p>

                  {it.lastClientText && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic truncate">
                      Último msj cliente: &ldquo;{it.lastClientText}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenChatSession && onOpenChatSession(it.documentId)}
                    className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-black flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Abrir Charla
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
