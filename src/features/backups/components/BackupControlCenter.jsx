import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  WifiOff,
  Activity,
  FileWarning,
  Play,
  Pause,
  Zap,
  Radio,
  DownloadCloud
} from 'lucide-react';

function formatDuration(sec) {
  const s = Math.max(0, Number(sec || 0));
  if (s === 0) return '—';
  if (s < 60) return `${s} seg`;
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  if (mins < 60) return remSec > 0 ? `${mins} min ${remSec} s` : `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  return `${hrs} h ${remMin} min`;
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n <= 0) return '0 MB';
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTimeAR(iso) {
  if (!iso) return 'Todavía sin registro';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}

function formatAgo(sec) {
  const s = Math.max(0, Number(sec || 0));
  if (s < 15) return 'ahora mismo';
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const COMMAND_LABELS = {
  start_backup: 'Iniciar Backup Rápido',
  start_full_backup: 'Forzar Backup Completo',
  pause_backup: 'Pausar Subida',
  resume_backup: 'Reanudar Cola',
  check_update: 'Actualizar Programa'
};

function getStatusUi(status) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completo 100%',
        badgeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        cardBorder: 'border-emerald-500/30 bg-emerald-950/10',
        barCls: 'bg-emerald-500',
        icon: CheckCircle2
      };
    case 'running':
      return {
        label: 'Subiendo en Vivo...',
        badgeCls: 'bg-sky-500/20 text-sky-300 border-sky-500/40 animate-pulse',
        cardBorder: 'border-sky-500/50 bg-sky-950/20',
        barCls: 'bg-sky-500',
        icon: Activity
      };
    case 'waiting_network':
      return {
        label: 'Espera de Internet',
        badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        cardBorder: 'border-amber-500/40 bg-amber-950/15',
        barCls: 'bg-amber-500',
        icon: WifiOff
      };
    case 'paused':
      return {
        label: 'En Pausa',
        badgeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        cardBorder: 'border-amber-500/35 bg-zinc-900/80',
        barCls: 'bg-amber-500',
        icon: Pause
      };
    case 'incomplete':
      return {
        label: '⚠️ Inconcluso / Interrumpido',
        badgeCls: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
        cardBorder: 'border-rose-500/45 bg-rose-950/20',
        barCls: 'bg-rose-500',
        icon: AlertTriangle
      };
    case 'error':
      return {
        label: 'Error Reportado',
        badgeCls: 'bg-rose-500/25 text-rose-200 border-rose-500/50',
        cardBorder: 'border-rose-500/45 bg-rose-950/20',
        barCls: 'bg-rose-500',
        icon: AlertTriangle
      };
    default:
      return {
        label: 'En Guardia Silenciosa',
        badgeCls: 'bg-zinc-800 text-zinc-200 border-zinc-700',
        cardBorder: 'border-zinc-800 bg-zinc-900/75',
        barCls: 'bg-emerald-500',
        icon: Clock
      };
  }
}

export default function BackupMonitorModal({
  open = true,
  inlinePage = false,
  onClose,
  apiBaseUrl = 'https://franquicias.check-oil.com/api/index.php',
  focusBranchId = null
}) {
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState([]);
  const [history, setHistory] = useState([]);
  const [commandsLog, setCommandsLog] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [branchFilter, setBranchFilter] = useState(focusBranchId || 'ALL');
  const [sendingCmdKey, setSendingCmdKey] = useState(null);
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  useEffect(() => {
    if (open || inlinePage) {
      setBranchFilter(focusBranchId || 'ALL');
    }
  }, [open, inlinePage, focusBranchId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}?action=backup_logs&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          setMachines(Array.isArray(data.machines) ? data.machines : []);
          setHistory(Array.isArray(data.history) ? data.history : []);
          setCommandsLog(Array.isArray(data.commandsLog) ? data.commandsLog : []);
          setLastRefresh(new Date());
        }
      }
    } catch {
      // ignore transient network glitches
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!open && !inlinePage) return;
    fetchLogs();
    // Refresco cada 5 segundos para ver la barra de progreso moverse en tiempo real
    const timer = setInterval(fetchLogs, 5000);
    return () => clearInterval(timer);
  }, [open, inlinePage, fetchLogs]);

  const handleSendRemoteCommand = async (machine, command) => {
    const busyId = `${machine.machineKey}_${command}`;
    setSendingCmdKey(busyId);
    try {
      const res = await fetch(`${apiBaseUrl}?action=backup_command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          branchId: machine.branchId,
          machineKey: machine.machineKey,
          command,
          requestedBy: 'Control Remoto Web Remex'
        })
      });
      const out = await res.json();
      if (out?.ok) {
        const msg = machine.agentOnline
          ? `✓ Orden "${COMMAND_LABELS[command] || command}" enviada a ${machine.branchName}. Arranca en < 8 segundos.`
          : `⏳ Orden "${COMMAND_LABELS[command] || command}" guardada en cola para ${machine.branchName}: se ejecutará apenas esa PC abra Remex Backup v1.6+.`;
        setFeedbackBanner({ tone: 'ok', text: msg });
        await fetchLogs();
      } else {
        setFeedbackBanner({ tone: 'err', text: out?.error || 'No se pudo enviar la orden remota.' });
      }
    } catch (err) {
      setFeedbackBanner({ tone: 'err', text: `Error de red enviando orden: ${err.message}` });
    } finally {
      setSendingCmdKey(null);
      setTimeout(() => setFeedbackBanner(null), 9000);
    }
  };

  if (!open && !inlinePage) return null;

  const filteredMachines =
    branchFilter === 'ALL'
      ? machines
      : machines.filter((m) => m.branchId === branchFilter);

  const filteredHistory =
    branchFilter === 'ALL'
      ? history
      : history.filter((h) => h.branchId === branchFilter);

  const onlineAgentsCount = machines.filter((m) => m.agentOnline).length;
  const installedAppsCount = machines.filter((m) => !/^drive/i.test(String(m.appVersion || ''))).length;
  const completedCount = machines.filter((m) => m.status === 'completed' || (m.status === 'idle' && m.coreDbfPresent >= m.coreDbfTotal)).length;
  const runningCount = machines.filter((m) => m.status === 'running').length;
  const incompleteCount = machines.filter(
    (m) => m.status === 'incomplete' || m.status === 'waiting_network' || m.status === 'error'
  ).length;

  const contentBody = (
    <div className={inlinePage ? 'space-y-6' : 'flex-1 overflow-y-auto p-5 space-y-5'}>
      {/* Encabezado cuando se muestra como Sección Dedicada en página completa */}
      {inlinePage && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/35 flex items-center justify-center text-orange-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  Centro de Control Remoto y Estado de Backups en Vivo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                  Tiempo Real (cada 5s)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Supervisá la barra de progreso de cada PC instalada, cuándo respaldó por última vez, qué tablas faltan e iniciá backups de forma remota con 1 clic.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono"
            >
              <option value="ALL">Todas las sucursales</option>
              <option value="00">00 · Casa Central REMEX</option>
              <option value="01">01 · Ñireco</option>
              <option value="02">02 · El Bolsón</option>
              <option value="03">03 · Estadio</option>
              <option value="04">04 · Centro</option>
              <option value="05">05 · Villa Domínico</option>
              <option value="06">06 · Km 13</option>
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar Ahora</span>
            </button>
          </div>
        </div>
      )}

      {feedbackBanner && (
        <div
          className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            feedbackBanner.tone === 'ok'
              ? 'bg-emerald-950/50 border-emerald-500/45 text-emerald-200'
              : 'bg-rose-950/50 border-rose-500/45 text-rose-200'
          }`}
        >
          {feedbackBanner.text}
        </div>
      )}

      {/* KPIs Superiores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-emerald-300/80">PCs Conectadas en Vivo</div>
            <div className="text-2xl font-bold text-emerald-300 mt-0.5">
              {onlineAgentsCount}{' '}
              <span className="text-xs font-normal text-zinc-400">({installedAppsCount} instaladas)</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Con Remex Backup activo</div>
          </div>
          <Radio className="w-7 h-7 text-emerald-400/70" />
        </div>

        <div className="rounded-xl border border-sky-500/30 bg-sky-950/15 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-sky-300/80">Subiendo Ahora</div>
            <div className="text-2xl font-bold text-sky-300 mt-0.5">{runningCount}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Barra activa en vivo</div>
          </div>
          <Activity className="w-7 h-7 text-sky-400/70" />
        </div>

        <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400">Bases Completas (100%)</div>
            <div className="text-2xl font-bold text-zinc-100 mt-0.5">{completedCount}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">32/32 tablas principales</div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400/70" />
        </div>

        <div className="rounded-xl border border-rose-500/35 bg-rose-950/20 p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-rose-300/80">Inconclusos / Faltantes</div>
            <div className="text-2xl font-bold text-rose-300 mt-0.5">{incompleteCount}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Con tablas pendientes</div>
          </div>
          <AlertTriangle className="w-7 h-7 text-rose-400/70" />
        </div>
      </div>

      {/* Tarjetas de Control Remoto y Barra de Progreso por Sucursal */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
            Equipos y Sucursales Monitoreados ({filteredMachines.length})
          </h3>
          {lastRefresh && (
            <span className="text-[11px] font-mono text-zinc-500">
              Sincronizado con servidor: {lastRefresh.toLocaleTimeString('es-AR')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMachines.map((m) => {
            const isHistoricalDriveOnly = /^drive/i.test(String(m.appVersion || ''));
            const stUi = isHistoricalDriveOnly
              ? {
                  label: `Sin App Instalada (Drive: ${m.coreDbfPresent}/${m.coreDbfTotal})`,
                  badgeCls: 'bg-zinc-800/90 text-zinc-300 border-zinc-600/70',
                  cardBorder: 'border-zinc-800/90 bg-zinc-900/55',
                  barCls: m.coreDbfPresent >= m.coreDbfTotal ? 'bg-zinc-500' : 'bg-amber-500/70',
                  icon: HardDrive
                }
              : getStatusUi(m.status);
            const IconComp = stUi.icon;
            const isRunning = m.status === 'running';
            const displayPct =
              m.status === 'completed' || (m.status === 'idle' && m.coreDbfPresent >= m.coreDbfTotal)
                ? 100
                : Math.max(0, Math.min(100, m.percent || 0));

            return (
              <div
                key={m.machineKey}
                className={`rounded-2xl border p-4 space-y-3.5 transition ${stUi.cardBorder}`}
              >
                {/* Fila Superior: Nombre + Indicador Online en Vivo + Estado */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-orange-300 font-mono text-xs font-bold">
                        Suc. {m.branchId || '—'}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-100">{m.branchName}</h4>

                      {/* Pill de conexión en vivo del programa instalado */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          m.agentOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : isHistoricalDriveOnly
                            ? 'bg-zinc-900 text-zinc-400 border-zinc-700/80'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            m.agentOnline
                              ? 'bg-emerald-400 animate-ping'
                              : isHistoricalDriveOnly
                              ? 'bg-zinc-600'
                              : 'bg-amber-400'
                          }`}
                        />
                        {m.agentOnline
                          ? `Conectado en vivo (${formatAgo(m.secondsSinceHeartbeat)})`
                          : isHistoricalDriveOnly
                          ? 'Programa aún no instalado (dato previo de Drive)'
                          : `Instalado (${m.appVersion || 'v1.2'}) · Actualizar a v1.7 para control vivo`}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-1.5 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        {isHistoricalDriveOnly ? 'Última copia previa en Drive:' : 'Último backup exitoso:'}{' '}
                        <strong className="text-zinc-200">{formatDateTimeAR(m.lastSuccessAt)}</strong>
                      </span>
                      {m.scheduleLabel && (
                        <span>
                          · Modo: <strong className="text-orange-300">{m.scheduleLabel}</strong>
                        </span>
                      )}
                      {m.appVersion && !isHistoricalDriveOnly && (
                        <span>
                          · <span className="text-zinc-300">{m.appVersion}</span> ({m.osPlatform || 'Win'})
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border inline-flex items-center gap-1.5 shrink-0 ${stUi.badgeCls}`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    {stUi.label}
                  </span>
                </div>

                {/* Barra de Estado y Progreso en Vivo */}
                <div className="space-y-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-300 font-semibold truncate max-w-[72%]">
                      {isRunning
                        ? `Subiendo: ${m.currentFile || 'procesando...'}`
                        : m.currentFile && m.status === 'incomplete'
                        ? `Quedó frenado en: ${m.currentFile}`
                        : `Progreso de base de datos (${m.coreDbfPresent}/${m.coreDbfTotal} tablas DBF)`}
                    </span>
                    <span className="text-zinc-100 font-bold">{displayPct}%</span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${stUi.barCls}`}
                      style={{ width: `${Math.max(3, displayPct)}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1.5">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Duración corrida</span>
                      <strong className="text-zinc-200">{formatDuration(m.elapsedSeconds)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Tablas DBF</span>
                      <strong className="text-zinc-200">
                        {m.coreDbfPresent} / {m.coreDbfTotal}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Archivos</span>
                      <strong className="text-zinc-200">
                        {m.uploadedFiles} sub.
                        {m.pendingFiles > 0 ? ` (${m.pendingFiles} pend.)` : ''}
                      </strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">Volumen</span>
                      <strong className="text-zinc-200">
                        {formatBytes(m.uploadedBytes || m.totalBytes)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Botonera de Control Remoto Directo */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {!isRunning ? (
                      <button
                        type="button"
                        disabled={sendingCmdKey === `${m.machineKey}_start_backup`}
                        onClick={() => handleSendRemoteCommand(m, 'start_backup')}
                        className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                        title="Ordena a esta computadora iniciar un backup inmediatamente"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Iniciar Backup Remoto</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingCmdKey === `${m.machineKey}_pause_backup`}
                        onClick={() => handleSendRemoteCommand(m, 'pause_backup')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/45 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar Remoto</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={sendingCmdKey === `${m.machineKey}_start_full_backup`}
                      onClick={() => handleSendRemoteCommand(m, 'start_full_backup')}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Forzar re-verificación y subida completa de toda la carpeta"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Forzar Completo</span>
                    </button>

                    <button
                      type="button"
                      disabled={sendingCmdKey === `${m.machineKey}_check_update`}
                      onClick={() => handleSendRemoteCommand(m, 'check_update')}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      title="Ordena al programa buscar e instalar la última actualización de GitHub"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 text-sky-400" />
                      <span>Actualizar App</span>
                    </button>
                  </div>

                  {Array.isArray(m.activeCommands) && m.activeCommands.length > 0 && (
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      ⏳ Orden en cola: {COMMAND_LABELS[m.activeCommands[0].command] || m.activeCommands[0].command}
                    </span>
                  )}
                </div>

                {m.note && <p className="text-xs text-zinc-300 leading-relaxed">{m.note}</p>}

                {/* Lista exacta de tablas .DBF faltantes si está inconcluso */}
                {Array.isArray(m.missingDbfs) && m.missingDbfs.length > 0 && (
                  <div className="rounded-xl bg-rose-950/40 border border-rose-500/35 p-2.5 space-y-1.5">
                    <div className="text-[11px] font-mono font-bold text-rose-200 flex items-center gap-1.5">
                      <FileWarning className="w-3.5 h-3.5 text-rose-400" />
                      Tablas DBF que faltan subir a Google Drive ({m.missingDbfs.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.missingDbfs.map((tbl) => (
                        <span
                          key={tbl}
                          className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[10px] font-mono text-rose-100"
                        >
                          {tbl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial Cronológico de Corridas */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
          Historial de Backups Realizados ({filteredHistory.length})
        </h3>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/95 border-b border-zinc-800 text-[11px] font-mono uppercase text-zinc-400">
                <tr>
                  <th className="px-3 py-2.5">Fecha / Inicio</th>
                  <th className="px-3 py-2.5">Sucursal</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Duración</th>
                  <th className="px-3 py-2.5">Tablas DBF</th>
                  <th className="px-3 py-2.5">Archivos</th>
                  <th className="px-3 py-2.5">Detalle / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {filteredHistory.map((h) => {
                  const stUi = getStatusUi(h.status);
                  return (
                    <tr key={h.runUid} className="hover:bg-zinc-800/30">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                        {formatDateTimeAR(h.startedAt || h.updatedAt)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-zinc-100 whitespace-nowrap">
                        Suc. {h.branchId} · {h.branchName}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${stUi.badgeCls}`}
                        >
                          {stUi.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-zinc-200 whitespace-nowrap">
                        {formatDuration(h.elapsedSeconds)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-zinc-200 whitespace-nowrap">
                        {h.coreDbfPresent}/{h.coreDbfTotal}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-zinc-300 whitespace-nowrap">
                        {h.uploadedFiles} sub.
                        {h.pendingFiles > 0 ? (
                          <span className="text-rose-300"> ({h.pendingFiles} pend.)</span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300 max-w-md">
                        <div>{h.note}</div>
                        {h.lastFile && h.status !== 'completed' && (
                          <div className="text-[10px] font-mono text-amber-300 mt-0.5">
                            Corte en: {h.lastFile}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registro reciente de Comandos Remotos enviados desde la Web */}
      {commandsLog.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
            Órdenes Remotas Recientes Enviadas desde la Web
          </h3>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800/70">
            {commandsLog.slice(0, 8).map((c) => (
              <div key={c.id} className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-zinc-400">{formatDateTimeAR(c.createdAt)}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-orange-300 font-mono text-[11px] font-bold">
                    Suc. {c.branchId || c.machineKey}
                  </span>
                  <strong className="text-zinc-100">{COMMAND_LABELS[c.command] || c.command}</strong>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      c.status === 'executed'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                        : c.status === 'pending' || c.status === 'dispatched'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {c.status === 'executed'
                      ? '✓ Ejecutado'
                      : c.status === 'dispatched'
                      ? 'Enviado a la PC'
                      : c.status === 'pending'
                      ? 'En espera de PC'
                      : c.status}
                  </span>
                  {c.resultNote && <span className="text-zinc-400">{c.resultNote}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (inlinePage) {
    return contentBody;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/35 flex items-center justify-center text-orange-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                Centro de Control Remoto y Monitor de Backups
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  En Vivo (5s)
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Supervisá el progreso en vivo, último respaldo realizado e iniciá backups a distancia en cualquier sucursal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono"
            >
              <option value="ALL">Todas las sucursales</option>
              <option value="00">00 · Casa Central REMEX</option>
              <option value="01">01 · Ñireco</option>
              <option value="02">02 · El Bolsón</option>
              <option value="03">03 · Estadio</option>
              <option value="04">04 · Centro</option>
              <option value="05">05 · Villa Domínico</option>
              <option value="06">06 · Km 13</option>
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-orange-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {contentBody}
      </div>
    </div>
  );
}
