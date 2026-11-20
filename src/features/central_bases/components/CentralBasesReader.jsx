import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Database,
  RefreshCw,
  Lock,
  TrendingUp,
  Package,
  Receipt,
  Landmark,
  HardDrive,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Upload,
  Building2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Sparkles,
  ChevronRight,
  Info,
  Eye,
  Maximize2,
  X
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  canAccessCentralBasesSection,
  fetchCentralBasesIndex,
  fetchCentralBranchSnapshot,
  buildWeeklyCollectionsForecast,
  parseLocalDbfArrayBuffer
} from '../services/centralBasesService';

function fmtARS(val) {
  const n = Number(val || 0);
  return `$ ${Math.round(n).toLocaleString('es-AR')}`;
}

function fmtCompactARS(val) {
  const n = Number(val || 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `$ ${(n / 1_000_000).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} M`;
  }
  if (abs >= 10_000) {
    return `$ ${Math.round(n / 1_000).toLocaleString('es-AR')} mil`;
  }
  return fmtARS(n);
}

function fmtDateAR(iso) {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

function InfoBadge({ text, className = '' }) {
  return (
    <span
      data-globo={text}
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-800/90 hover:bg-amber-500/25 border border-zinc-700 hover:border-amber-400/60 text-zinc-400 hover:text-amber-300 cursor-help shrink-0 transition-colors ${className}`}
    >
      <Info className="w-2.5 h-2.5" />
    </span>
  );
}

export default function CentralBasesReader() {
  const { user } = useAuthStore();
  const hasAccess = canAccessCentralBasesSection(user);

  const [branchesIndex, setBranchesIndex] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('00');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'catalog' | 'clients' | 'treasury' | 'dbf_inspector'
  const [selectedForecastWeekIdx, setSelectedForecastWeekIdx] = useState(0);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);
  const [showWeekDetailModal, setShowWeekDetailModal] = useState(false);
  const [weekModalSearch, setWeekModalSearch] = useState('');

  // Filtros de pestañas
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all'); // 'all' | 'in_stock' | 'reorder' | 'stagnant'
  const [clientSearch, setClientSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('with_debt'); // 'with_debt' | 'overdue_60' | 'all'
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSchemaTable, setSelectedSchemaTable] = useState(null);

  // Lector directo de archivo .DBF local desde la PC
  const fileInputRef = useRef(null);
  const [localDbfResult, setLocalDbfResult] = useState(null);
  const [localDbfSearch, setLocalDbfSearch] = useState('');
  const [localDbfError, setLocalDbfError] = useState('');

  const loadData = useCallback(async (targetId = selectedBranchId, isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg('');

    try {
      const [idxRes, snapRes] = await Promise.all([
        fetchCentralBasesIndex().catch(() => null),
        fetchCentralBranchSnapshot(targetId)
      ]);
      if (idxRes?.branches) {
        setBranchesIndex(idxRes.branches.filter((b) => !b.hiddenFromSelector));
      }
      setSnapshot(snapRes);
    } catch (err) {
      setErrorMsg(
        `No se pudo conectar con la base Central REMEX: ${err.message || 'verificar conexión'}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    if (hasAccess) {
      loadData(selectedBranchId, false);
    }
  }, [hasAccess, selectedBranchId]);

  // Seguridad estricta: si un usuario sin rol Socio ni Super_Usuario intentara abrir la vista
  if (!hasAccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950 h-full">
        <div className="max-w-md w-full bg-zinc-900 border border-rose-500/40 rounded-3xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-white">Acceso Restringido — Dirección General</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            El <strong>Lector de Bases Central REMEX</strong> contiene información contable, mayorista y crediticia reservada exclusivamente para los <strong>Socios Directores (Martín, Alejandro, Juan Pablo)</strong> y <strong>SuperAdmin</strong>.
          </p>
        </div>
      </div>
    );
  }

  const branchInfo = snapshot?.branch || {};
  const kpis = snapshot?.kpis || {};
  const articles = snapshot?.articles || [];
  const autoPurchaseOrders = snapshot?.autoPurchaseOrders || [];
  const clients = snapshot?.clients || [];
  const invoices = snapshot?.invoices || [];
  const suppliers = snapshot?.suppliers || [];
  const purchases = snapshot?.purchases || [];
  const treasury = snapshot?.treasury || {};
  const dbfTables = snapshot?.bridge?.tables || [];
  const monthlyRows = snapshot?.financialAnalytics?.monthly || [];

  const forecast = useMemo(() => {
    if (!snapshot?.weeklyCollectionsData) return null;
    return buildWeeklyCollectionsForecast({
      weeklyCollectionsData: snapshot.weeklyCollectionsData,
      clients
    });
  }, [snapshot?.weeklyCollectionsData, clients]);

  const activeForecastWeek = useMemo(() => {
    if (!forecast?.projectedWeeks?.length) return null;
    return forecast.projectedWeeks[selectedForecastWeekIdx] || forecast.projectedWeeks[0];
  }, [forecast, selectedForecastWeekIdx]);

  // Filtrado de Artículos
  const filteredArticles = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return articles
      .filter((a) => {
        if (catalogFilter === 'in_stock' && Number(a.stock || 0) <= 0) return false;
        if (
          catalogFilter === 'reorder' &&
          !(Number(a.stockMin || 0) > 0 && Number(a.stock || 0) <= Number(a.stockMin || 0)) &&
          !(Number(a.diasCobertura || 999) < 30 && Number(a.ventas180d || 0) > 0)
        ) {
          return false;
        }
        if (
          catalogFilter === 'stagnant' &&
          !(Number(a.stock || 0) > 0 && Number(a.ventas365d || 0) === 0)
        ) {
          return false;
        }
        if (!q) return true;
        const hay = `${a.codigo || ''} ${a.descrip || ''} ${a.marcaNombre || ''} ${a.rubroNombre || ''} ${a.proveedorNombre || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 250);
  }, [articles, catalogSearch, catalogFilter]);

  // Filtrado de Clientes Mayoristas
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const todayIso = branchInfo.ultimaFechaOperativa || new Date().toISOString().slice(0, 10);
    const todayMs = new Date(`${todayIso}T12:00:00Z`).getTime();

    return [...clients]
      .filter((c) => {
        const debt = Number(c.saldoPendiente || 0);
        if (clientFilter === 'with_debt' && debt <= 10) return false;
        if (clientFilter === 'overdue_60') {
          if (debt <= 10 || !c.fechaDeudaMasVieja) return false;
          const oldMs = new Date(`${String(c.fechaDeudaMasVieja).slice(0, 10)}T12:00:00Z`).getTime();
          const ageDays = Math.round((todayMs - oldMs) / 86400000);
          if (ageDays <= 60) return false;
        }
        if (!q) return true;
        const hay = `${c.codigo || ''} ${c.nombre || ''} ${c.razonSocial || ''} ${c.cuit || ''} ${c.localidad || ''} ${c.vendedor || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => Number(b.saldoPendiente || 0) - Number(a.saldoPendiente || 0))
      .slice(0, 250);
  }, [clients, clientSearch, clientFilter, branchInfo.ultimaFechaOperativa]);

  // Filtrado de Proveedores
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    return [...suppliers]
      .filter((s) => {
        if (!q) return Number(s.saldoPendiente || 0) > 0 || Number(s.compras12m || 0) > 0;
        const hay = `${s.codigo || ''} ${s.nombre || ''} ${s.cuit || ''} ${s.localidad || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => Number(b.saldoPendiente || 0) - Number(a.saldoPendiente || 0))
      .slice(0, 200);
  }, [suppliers, supplierSearch]);

  const activeCheques = useMemo(() => {
    const list = treasury.cheques || [];
    return [...list].sort((a, b) => String(a.fechaVto || '').localeCompare(String(b.fechaVto || '')));
  }, [treasury.cheques]);

  // Exportar CSV de la pestaña activa
  const handleExportCatalogCsv = () => {
    const headers = ['Codigo', 'Descripcion', 'Marca', 'Rubro', 'Stock', 'Stock_Min', 'Costo_Neto', 'Precio_Final', 'Ventas_180d', 'Ultima_Venta'];
    const rows = filteredArticles.map((a) => [
      `"${(a.codigo || '').replace(/"/g, '""')}"`,
      `"${(a.descrip || '').replace(/"/g, '""')}"`,
      `"${(a.marcaNombre || a.marca || '').replace(/"/g, '""')}"`,
      `"${(a.rubroNombre || a.rubro || '').replace(/"/g, '""')}"`,
      Number(a.stock || 0),
      Number(a.stockMin || 0),
      Number(a.costo || 0),
      Number(a.precioFinal || 0),
      Number(a.ventas180d || 0),
      `"${a.ultimaVenta || ''}"`
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `Central_REMEX_${selectedBranchId}_Articulos.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manejo de apertura de archivo .DBF local desde la computadora
  const handleLocalDbfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalDbfError('');
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseLocalDbfArrayBuffer(buf, 2000);
      setLocalDbfResult({
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        ...parsed
      });
      setLocalDbfSearch('');
    } catch (err) {
      setLocalDbfError(err.message || 'No se pudo leer el archivo .DBF');
    } finally {
      e.target.value = '';
    }
  };

  const filteredLocalDbfRows = useMemo(() => {
    if (!localDbfResult?.rows) return [];
    const q = localDbfSearch.trim().toLowerCase();
    if (!q) return localDbfResult.rows.slice(0, 150);
    return localDbfResult.rows
      .filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)))
      .slice(0, 150);
  }, [localDbfResult, localDbfSearch]);

  // Datos de gráficos para Overview
  const forecastChartMeta = useMemo(() => {
    if (!forecast?.projectedWeeks) return [];
    const histMeta = (forecast.weeklyHistory || []).map((h) => ({
      kind: 'HIST',
      label: h.shortLabel
        ? `${h.shortLabel}${h.esSemanaEnCurso ? '*' : ''}`
        : fmtDateAR(h.endDate || h.startDate).slice(0, 5),
      rangeLabel: h.rangeLabel || `${fmtDateAR(h.startDate).slice(0, 5)} al ${fmtDateAR(h.endDate).slice(0, 5)}`,
      cobradoReal: Math.round(
        Number(h.cobradoTotalReal ?? h.cobradoRecibosCtaCte ?? h.cobradoTotal ?? h.recibosTotal ?? 0)
      ),
      facturadoTotal: Math.round(Number(h.facturadoTotal || 0)),
      recibosCount: Number(h.recibosCount || 0),
      esSemanaEnCurso: Boolean(h.esSemanaEnCurso),
      daysCovered: Number(h.daysCovered || 7)
    }));
    const projMeta = forecast.projectedWeeks.map((w) => ({
      kind: 'PROJ',
      label: `${w.shortLabel} (${w.rangeLabel.slice(0, 5)})`,
      rangeLabel: w.rangeLabel,
      totalEstimado: Math.round(Number(w.ingresoTotalEstimado || 0)),
      clientesCount: (w.clientesEsperados || []).length
    }));
    return [...histMeta, ...projMeta];
  }, [forecast]);

  const forecastChartData = useMemo(() => {
    if (!forecast?.projectedWeeks) return null;
    const histList = forecast.weeklyHistory || [];
    const histLen = histList.length;
    const labels = forecastChartMeta.map((m) => m.label);
    return {
      labels,
      datasets: [
        {
          label: 'Cobrado Real Histórico',
          data: [
            ...histList.map((h) =>
              Math.round(
                Number(h.cobradoTotalReal ?? h.cobradoRecibosCtaCte ?? h.cobradoTotal ?? h.recibosTotal ?? 0)
              )
            ),
            ...forecast.projectedWeeks.map(() => null)
          ],
          backgroundColor: '#64748b',
          hoverBackgroundColor: '#94a3b8',
          borderRadius: 6
        },
        {
          label: 'Cta. Cte. + Recupero Estimado',
          data: [
            ...new Array(histLen).fill(null),
            ...forecast.projectedWeeks.map((w) => Math.round(w.ctaCteYaFacturada + w.rotacionNuevasVentasCtaCte))
          ],
          backgroundColor: '#f97316',
          hoverBackgroundColor: '#fb923c',
          borderRadius: 6
        },
        {
          label: 'Cheques por Acreditar + Contado',
          data: [
            ...new Array(histLen).fill(null),
            ...forecast.projectedWeeks.map((w) => Math.round(w.chequesPorAcreditar + w.ventasContadoEstimadas))
          ],
          backgroundColor: '#10b981',
          hoverBackgroundColor: '#34d399',
          borderRadius: 6
        }
      ]
    };
  }, [forecast, forecastChartMeta]);

  const monthlyChartData = useMemo(() => {
    const slice = monthlyRows.slice(-10);
    if (!slice.length) return null;
    return {
      labels: slice.map((m) => m.month),
      datasets: [
        {
          label: 'Facturación con IVA',
          data: slice.map((m) => Math.round(Number(m.facturadoConIva || 0))),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249,115,22,0.12)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Compras Mercadería con IVA',
          data: slice.map((m) => Math.round(Number(m.comprasConIva || 0))),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.06)',
          borderWidth: 2,
          fill: false,
          tension: 0.3
        },
        {
          label: 'Ganancia Bruta Real (Sin IVA)',
          data: slice.map((m) => Math.round(Number(m.margenBruto || 0))),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          borderWidth: 2,
          fill: false,
          tension: 0.3
        }
      ]
    };
  }, [monthlyRows]);

  const centralBranches = branchesIndex.filter((b) => String(b.id).startsWith('00'));
  const networkBranches = branchesIndex.filter((b) => !String(b.id).startsWith('00'));

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col h-full font-sans space-y-5">
      {/* CABECERA EJECUTIVA + SELECTOR DE BASE CENTRAL */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/25 border border-amber-500/35 rounded-3xl p-4 lg:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5 shrink-0">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black flex items-center gap-1">
              <Lock className="w-3 h-3" /> Dirección
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {branchInfo.backupHealth?.badgeLabel || `Corte: ${fmtDateAR(branchInfo.ultimaFechaOperativa)}`}
            </span>
            <span
              data-globo={`Punto de Venta ${branchInfo.puntoVenta || '0060'} • ${branchInfo.backupHealth?.copiedDbfCount || dbfTables.length || 38} tablas C:\\mayor\\*.DBF sincronizadas en solo-lectura por Remex Backup hacia la base en nube (u566398466_franquicias), sin bloquear ni modificar el sistema administrativo de Casa Central.`}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 inline-flex items-center gap-1 cursor-help"
            >
              PV {branchInfo.puntoVenta || '0060'} • {branchInfo.backupHealth?.copiedDbfCount || dbfTables.length || 38} .DBF
              <Info className="w-3 h-3 text-amber-300" />
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg lg:text-xl font-black text-white truncate">
              Base Central REMEX — {branchInfo.nombre || 'Casa Central REMEX'}
            </h2>
            <InfoBadge text="Lectura directa 100% solo-lectura de las tablas originales C:\mayor\*.DBF sincronizadas por Remex Backup. Reservado exclusivamente para los 3 Socios Directores (Martín, Alejandro, Juan Pablo) y SuperAdmin." />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-2xl px-3 py-2">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent text-xs font-black text-white outline-none cursor-pointer max-w-[210px]"
            >
              <optgroup label="🏛️ Bases de Administración Central REMEX" className="bg-zinc-900 text-amber-300">
                {(centralBranches.length > 0
                  ? centralBranches
                  : [
                      { id: '00', numeroSucursal: '00', nombre: 'Casa Central REMEX (Bariloche)' },
                      { id: '00-bsas', numeroSucursal: '00 BsAs', nombre: 'REMEX Sede Buenos Aires' }
                    ]
                ).map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.numeroSucursal} · {b.nombre}
                  </option>
                ))}
              </optgroup>
              {networkBranches.length > 0 && (
                <optgroup label="🔍 Cruce Opcional con Sucursales Check-Oil" className="bg-zinc-900 text-zinc-400">
                  {networkBranches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                      Suc. {b.numeroSucursal} · {b.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaGuide((v) => !v)}
            data-globo="Abrir o cerrar la guía completa de dónde sale cada dato (.DBF) y cómo se calcula cada fórmula paso a paso."
            className={`px-3 py-2 rounded-2xl text-xs font-black border flex items-center gap-1.5 transition-all ${
              showFormulaGuide
                ? 'bg-amber-400 text-black border-amber-300'
                : 'bg-zinc-950 text-amber-300 border-amber-500/40 hover:bg-amber-950/30'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Fórmulas
          </button>

          <button
            type="button"
            onClick={() => loadData(selectedBranchId, true)}
            disabled={refreshing || loading}
            data-globo="Volver a consultar los datos sincronizados más recientes desde Casa Central."
            className="px-3.5 py-2 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* PANEL EXPLICATIVO DESPLEGABLE DE ORIGEN DE DATOS Y FÓRMULAS */}
      {showFormulaGuide && (
        <div className="bg-zinc-900/95 border border-amber-500/40 rounded-3xl p-5 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4" /> Guía Transparente: De dónde sale cada número de Central REMEX y cómo se calcula
            </h3>
            <button
              type="button"
              onClick={() => setShowFormulaGuide(false)}
              className="text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cerrar guía ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="font-black text-white">1. Recaudación Estimada Próxima Semana</div>
              <p className="text-zinc-300 leading-relaxed">
                Sale de cruzar las facturas impagas (<code className="text-orange-300">factura1.DBF</code>), los recibos históricos (<code className="text-orange-300">RECIBOS.DBF</code>) y los cheques en cartera (<code className="text-orange-300">CHEQUES.DBF</code>):
              </p>
              <ul className="text-zinc-400 space-y-1 list-disc pl-4">
                <li><strong>Plazo real de cada cliente:</strong> pesa <strong>70%</strong> lo que ese cliente tarda de verdad en pagar y <strong>30%</strong> el plazo escrito en la factura.</li>
                <li><strong>Atrasos recientes (≤60 días):</strong> se reparten en cuotas prudentes (60%/40% o 35%/35%/30%) en lugar de asumir que entra todo el lunes.</li>
                <li><strong>Mora vieja (&gt;90 días):</strong> se <strong>separa al 100%</strong> para jamás inflar la plata que esperás cobrar esta semana.</li>
                <li>Se suman los <strong>cheques con fecha de vencimiento en esos 7 días</strong> + el promedio semanal de ventas al contado de las últimas 8 semanas.</li>
              </ul>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="font-black text-white">2. Stock Valorizado, Capital Estancado y Compras IA</div>
              <p className="text-zinc-300 leading-relaxed">
                Proviene de <code className="text-orange-300">articulo.DBF</code>, <code className="text-orange-300">remex.dbf</code> y los renglones vendidos en <code className="text-orange-300">factura2.dbf</code>:
              </p>
              <ul className="text-zinc-400 space-y-1 list-disc pl-4">
                <li><strong>Valorizado Costo:</strong> suma de <code>Stock Actual × Costo Neto de Reposición</code> de todos los artículos con stock positivo.</li>
                <li><strong>Capital Estancado:</strong> mercadería en estantería que tuvo <strong>0 unidades vendidas en los últimos 365 días</strong>.</li>
                <li><strong>Ahorro Compras IA:</strong> resta lo que pediría una reposición ciega por “stock mínimo” menos lo que realmente hace falta según la rotación real de los últimos 180 días.</li>
              </ul>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-1.5">
              <div className="font-black text-white">3. Ganancia Bruta Real y Cuentas Corrientes</div>
              <p className="text-zinc-300 leading-relaxed">
                Cruza <code className="text-orange-300">factura1.DBF</code>, <code className="text-orange-300">factura2.dbf</code>, <code className="text-orange-300">CLIENTE.DBF</code> y <code className="text-orange-300">proveedo.DBF</code>:
              </p>
              <ul className="text-zinc-400 space-y-1 list-disc pl-4">
                <li><strong>Ganancia Bruta Mensual:</strong> toma la venta neta sin IVA de cada renglón facturado y le resta el costo de reposición vigente de ese artículo (<code>Venta Neta − CMV</code>).</li>
                <li><strong>Cuentas por Cobrar / Pagar:</strong> suma únicamente el saldo vivo pendiente después de descontar notas de crédito, recibos imputados (<code className="text-orange-300">RECI_FAC.DBF</code>) y órdenes de pago (<code className="text-orange-300">OP_FAC.DBF</code>).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => loadData(selectedBranchId, true)} className="font-black underline">
            Reintentar
          </button>
        </div>
      )}

      {/* NAVEGACIÓN DE SUB-PESTAÑAS DEL LECTOR CENTRAL */}
      <div className="flex flex-wrap gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl shrink-0">
        {[
          { id: 'overview', label: 'Resumen & Cobranzas', icon: TrendingUp },
          { id: 'catalog', label: 'Catálogo & Compras IA', badge: Number(kpis.totalArticles || 0).toLocaleString('es-AR'), icon: Package },
          { id: 'clients', label: 'Clientes & Cta. Cte.', badge: Number(kpis.totalClients || 0).toLocaleString('es-AR'), icon: Receipt },
          { id: 'treasury', label: 'Proveedores & Cheques', icon: Landmark },
          { id: 'dbf_inspector', label: 'Tablas .DBF + Lector', badge: dbfTables.length || 32, icon: HardDrive }
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                active
                  ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    active ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-orange-400">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-black uppercase tracking-widest">
            Leyendo tablas DBF de {selectedBranchId === '00' ? 'Casa Central REMEX' : selectedBranchId}...
          </p>
        </div>
      ) : (
        <>
          {/* =========================================================
              TAB 1: RESUMEN EJECUTIVO & RECAUDACIÓN SEMANAL ESTIMADA
          ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* 6 KPIs Maestros (adaptados a monitores chicos: 2 -> 3 -> 6 cols) */}
              <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
                <div className="bg-zinc-900 border border-orange-500/40 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-orange-400 truncate">Cuentas por Cobrar</span>
                    <InfoBadge text="Suma de todas las facturas de clientes en Cuenta Corriente con saldo abierto hoy en factura1.DBF descontando recibos imputados." />
                  </div>
                  <div className="text-lg font-black text-white mt-1.5">
                    {fmtCompactARS(kpis.cuentasPorCobrar)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {kpis.facturasConSaldoCount || 0} facturas abiertas
                  </div>
                </div>

                <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-400 truncate">Estimado Próx. 7 Días</span>
                    <InfoBadge text="Ingreso estimado para los próximos 7 días corridos combinando vencimientos reales según conducta de pago de cada cliente + cheques que acreditan en la semana + contado promedio." />
                  </div>
                  <div className="text-lg font-black text-emerald-300 mt-1.5">
                    {fmtCompactARS(forecast?.totals?.proximaSemanaTotal || 0)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Prom. 4 sem: {fmtCompactARS(forecast?.totals?.promedioIngresoProyectadoSemanal || 0)}/sem
                  </div>
                </div>

                <div className="bg-zinc-900 border border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-cyan-400 truncate">Cheques en Cartera</span>
                    <InfoBadge text="Total de valores y E-Cheqs activos en cartera (CHEQUES.DBF) pendientes de depósito o acreditación." />
                  </div>
                  <div className="text-lg font-black text-white mt-1.5">
                    {fmtCompactARS(kpis.chequesEnCarteraTotal)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Mediana cobro: {forecast?.benchmarks?.medianaDiasCobroSucursal || 30} días
                  </div>
                </div>

                <div className="bg-zinc-900 border border-rose-500/40 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-rose-400 truncate">Cta. Cte. Proveedores</span>
                    <InfoBadge text="Deuda comercial vigente con proveedores de mercadería según compras1.DBF menos órdenes de pago aplicadas en OP_FAC.DBF." />
                  </div>
                  <div className="text-lg font-black text-white mt-1.5">
                    {fmtCompactARS(kpis.cuentasPorPagarProveedores)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {suppliers.length} proveedores
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-zinc-400 truncate">Stock a Costo Neto</span>
                    <InfoBadge text="Valorización del inventario físico actual (articulo.DBF) multiplicando unidades en existencia por su costo neto de reposición." />
                  </div>
                  <div className="text-lg font-black text-white mt-1.5">
                    {fmtCompactARS(kpis.valorizadoCostoStock)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Venta: {fmtCompactARS(kpis.valorizadoVentaStock)}
                  </div>
                </div>

                <div className="bg-zinc-900 border border-amber-500/35 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-400 truncate">Ahorro Compras IA</span>
                    <InfoBadge text="Dinero que Compras IA evita gastar de más recortando artículos con stock mínimo inflado pero baja rotación real en los últimos 6 meses." />
                  </div>
                  <div className="text-lg font-black text-amber-300 mt-1.5">
                    {fmtCompactARS(kpis.ahorroComprasIa)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {kpis.articlesOmittedByAi || 0} códigos frenados
                  </div>
                </div>
              </div>

              {/* PROYECCIÓN DE RECAUDACIÓN SEMANAL (W1..W4) + AGENDA NOMINAL */}
              {forecast?.hasData && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5 space-y-4">
                  {/* Cabecera compacta + selector de 4 semanas en grilla limpia */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-base lg:text-lg font-black text-white">
                          Proyección de Recaudación (Próximas 4 Semanas)
                        </h3>
                        <InfoBadge text="Motor predictivo que cruza facturas abiertas (factura1.DBF), conducta histórica de cobro (RECIBOS.DBF) y cheques en cartera (CHEQUES.DBF) para estimar el ingreso real semana por semana." />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-globo={`Promedio real cobrado en las últimas ${forecast.benchmarks?.semanasAnalizadas || 8} semanas cerradas según RECIBOS.DBF: ${fmtARS(forecast.benchmarks?.promedioCobradoTotalSemanal || 0)}/sem.`}
                          className="px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 inline-flex items-center gap-1.5 cursor-help"
                        >
                          Prom. hist.: <b className="text-white">{fmtCompactARS(forecast.benchmarks?.promedioCobradoTotalSemanal || 0)}/sem</b>
                          <Info className="w-3 h-3 text-zinc-400" />
                        </span>
                        <span
                          data-globo={`Mora congelada (>90 días sin cobro): ${fmtARS(forecast.totals?.moraAntiguaExcluida || 0)} en ${forecast.totals?.moraAntiguaFacturasCount || 0} comprobantes. Se excluye 100% del pronóstico semanal para no inflar la plata esperada.`}
                          className="px-2.5 py-1 rounded-xl bg-zinc-950 border border-amber-500/30 text-[11px] text-zinc-300 inline-flex items-center gap-1.5 cursor-help"
                        >
                          Mora &gt;90d excluida: <b className="text-amber-300">{fmtCompactARS(forecast.totals?.moraAntiguaExcluida || 0)}</b>
                          <Info className="w-3 h-3 text-amber-400" />
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {forecast.projectedWeeks.map((w, idx) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedForecastWeekIdx(idx)}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-left flex items-center justify-between gap-2 ${
                            selectedForecastWeekIdx === idx
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{w.shortLabel}</div>
                            <div
                              className={`text-[10px] font-medium truncate ${
                                selectedForecastWeekIdx === idx ? 'text-black/75' : 'text-zinc-400'
                              }`}
                            >
                              {w.rangeLabel}
                            </div>
                          </div>
                          <div className="text-xs font-mono font-black shrink-0">
                            {fmtCompactARS(w.ingresoTotalEstimado)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    {/* Gráfico Históricos vs Proyectados */}
                    <div className="xl:col-span-7 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-black text-zinc-200">
                          <span>Últimas 8 Semanas Cobradas vs. Próximas 4 Estimadas</span>
                          <InfoBadge text="Las barras grises muestran el dinero real efectivamente cobrado en cada semana histórica (RECIBOS.DBF + contado). Las barras naranjas y verdes muestran la recaudación proyectada para las próximas 4 semanas. El asterisco (*) indica la semana en curso (parcial)." />
                        </div>
                      </div>
                      <div className="h-72">
                        {forecastChartData && (
                          <Bar
                            data={forecastChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                x: {
                                  stacked: true,
                                  grid: { display: false },
                                  ticks: { color: '#a1a1aa', font: { size: 10 } }
                                },
                                y: {
                                  stacked: true,
                                  grid: { color: '#27272a' },
                                  ticks: {
                                    color: '#a1a1aa',
                                    font: { size: 10 },
                                    callback: (v) => fmtCompactARS(v)
                                  }
                                }
                              },
                              plugins: {
                                legend: {
                                  position: 'top',
                                  labels: { boxWidth: 10, color: '#d4d4d8', font: { size: 11 } }
                                },
                                tooltip: {
                                  callbacks: {
                                    title: (items) => {
                                      const idx = items?.[0]?.dataIndex;
                                      const meta = forecastChartMeta[idx];
                                      if (!meta) return items?.[0]?.label || '';
                                      if (meta.kind === 'HIST') {
                                        return `Histórico (${meta.rangeLabel})${meta.esSemanaEnCurso ? ` · En curso (${meta.daysCovered}d)` : ''}`;
                                      }
                                      return `${meta.label} (${meta.rangeLabel})`;
                                    },
                                    label: (ctx) => {
                                      const val = ctx.parsed?.y;
                                      if (val === null || val === undefined) return null;
                                      return ` ${ctx.dataset.label}: ${fmtARS(val)}`;
                                    },
                                    afterBody: (items) => {
                                      const idx = items?.[0]?.dataIndex;
                                      const meta = forecastChartMeta[idx];
                                      if (!meta) return '';
                                      if (meta.kind === 'HIST') {
                                        return [
                                          `Facturado esa semana: ${fmtARS(meta.facturadoTotal)}`,
                                          `Recibos registrados: ${meta.recibosCount}`
                                        ];
                                      }
                                      return [
                                        `Total esperado: ${fmtARS(meta.totalEstimado)}`,
                                        `Clientes en agenda: ${meta.clientesCount}`
                                      ];
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Desglose Aritmético + Agenda de Clientes de la Semana Seleccionada */}
                    <div className="xl:col-span-5 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-3 min-w-0">
                      {activeForecastWeek && (
                        <>
                          <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase text-emerald-400 truncate">
                                  Desglose — {activeForecastWeek.title}
                                </span>
                                <InfoBadge text="Suma exacta de las 4 fuentes de ingreso proyectadas para esta semana. Hacé clic en 'Ver más' para ver el listado completo de clientes y cheques." />
                              </div>
                              <div className="text-base font-black text-white mt-0.5">
                                Total esperado: {fmtARS(activeForecastWeek.ingresoTotalEstimado)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setWeekModalSearch('');
                                setShowWeekDetailModal(true);
                              }}
                              data-globo="Abrir vista ampliada de esta semana con todos los clientes a cobrar, buscador y cheques por acreditar."
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-black inline-flex items-center gap-1 shrink-0 transition-colors"
                            >
                              <Maximize2 className="w-3 h-3" />
                              Ver más
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-zinc-400 truncate">1. Facturas en término</span>
                                <InfoBadge text="Facturas abiertas en factura1.DBF cuya fecha estimada de cobro cae dentro de esta semana. Se calcula pesando 70% el plazo real histórico con que paga cada cliente (RECIBOS.DBF) y 30% el plazo pactado en la factura." />
                              </div>
                              <b className="text-white text-xs block mt-1">{fmtARS(activeForecastWeek.ctaCteEnTermino)}</b>
                            </div>

                            <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-zinc-400 truncate">2. Recupero atraso</span>
                                <InfoBadge text="Facturas con atraso reciente (≤60 días, o hasta 75 días en pagadores activos) repartidas en cuotas prudentes (60%/40% o 35%/35%/30%) entre las próximas semanas. La mora vieja >90 días queda 100% excluida." />
                              </div>
                              <b className="text-orange-300 text-xs block mt-1">{fmtARS(activeForecastWeek.ctaCteRecuperoAtraso)}</b>
                            </div>

                            <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-zinc-400 truncate">3. Cheques a acreditar</span>
                                <InfoBadge text="Cheques físicos y E-Cheqs activos en cartera (CHEQUES.DBF) cuya fecha de vencimiento/depósito cae dentro de estos 7 días." />
                              </div>
                              <div className="flex items-baseline justify-between gap-1 mt-1">
                                <b className="text-cyan-300 text-xs">{fmtARS(activeForecastWeek.chequesPorAcreditar)}</b>
                                {(activeForecastWeek.chequesList?.length || 0) > 0 && (
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {activeForecastWeek.chequesList.length} ch.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-zinc-400 truncate">4. Rotación + Contado</span>
                                <InfoBadge text="Suma de dos ingresos recurrentes: ventas al contado promedio semanal (últimas 8 semanas) + cobranza estimada de facturas nuevas de plazo corto que todavía no se emitieron pero rotan en Semanas +3 y +4." />
                              </div>
                              <b className="text-emerald-300 text-xs block mt-1">
                                {fmtARS(
                                  activeForecastWeek.rotacionNuevasVentasCtaCte +
                                    activeForecastWeek.ventasContadoEstimadas
                                )}
                              </b>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[11px] font-black uppercase text-zinc-400">
                              Clientes a Cobrar ({activeForecastWeek.clientesEsperados.length})
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {activeForecastWeek.rangeLabel}
                            </span>
                          </div>

                          <div className="flex-1 max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                            {activeForecastWeek.clientesEsperados.length === 0 ? (
                              <p className="text-xs text-zinc-500 py-4 text-center">
                                Sin vencimientos nominales asignados a esta ventana.
                              </p>
                            ) : (
                              activeForecastWeek.clientesEsperados.slice(0, 6).map((cl, i) => (
                                <div
                                  key={i}
                                  className="p-2 rounded-xl bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-bold text-zinc-100 truncate">
                                      {cl.clienteNombre || `Cliente #${cl.clienteCod}`}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">
                                      {cl.facturasCount} fact. • {cl.motivo}
                                    </div>
                                  </div>
                                  <span className="font-mono font-black text-emerald-300 shrink-0">
                                    {fmtARS(cl.montoEstimado)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>

                          {activeForecastWeek.clientesEsperados.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setWeekModalSearch('');
                                setShowWeekDetailModal(true);
                              }}
                              className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-xs font-black text-emerald-300 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              Ver los {activeForecastWeek.clientesEsperados.length} clientes y detalle completo
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* EVOLUCIÓN MENSUAL DE FACTURACIÓN, COMPRAS Y MARGEN BRUTO */}
              {monthlyChartData && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 lg:p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">
                      Serie Mensual: Facturación vs. Compras vs. Ganancia Bruta Real
                    </h3>
                    <InfoBadge text="Calculado mes por mes cruzando factura1.DBF (facturación con IVA), compras1.DBF (compras de mercadería con IVA) y ganancia bruta sin IVA línea por línea en factura2.dbf (Venta Neta − Costo de Reposición)." />
                  </div>
                  <div className="h-64 bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                    <Line
                      data={monthlyChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: { grid: { display: false } },
                          y: {
                            grid: { color: '#27272a' },
                            ticks: { callback: (v) => fmtCompactARS(v) }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: CATÁLOGO MAYORISTA, STOCK Y COMPRAS IA
          ========================================================= */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar por código, descripción, marca, rubro o proveedor..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: `Todos (${articles.length})` },
                    { id: 'in_stock', label: `Con Stock (${kpis.articlesInStock || 0})` },
                    { id: 'reorder', label: `A Reponer (${kpis.articlesToReorder || 0})` },
                    { id: 'stagnant', label: `Estancados >12m (${fmtCompactARS(kpis.stagnantCapital)})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCatalogFilter(f.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border ${
                        catalogFilter === f.id
                          ? 'bg-orange-500 text-black border-orange-400'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleExportCatalogCsv}
                    className="px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-xs font-black text-orange-300 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                </div>
              </div>

              {autoPurchaseOrders.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                  <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Pedidos Inteligentes Sugeridos por Proveedor ({autoPurchaseOrders.length} proveedores activos)
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                    {autoPurchaseOrders.slice(0, 10).map((po, idx) => (
                      <div
                        key={idx}
                        className="min-w-[230px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs shrink-0"
                      >
                        <div className="font-black text-white truncate">{po.proveedorNombre}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {po.totalItems} ítems a pedir • {po.totalOmittedByAi || 0} frenados IA
                        </div>
                        <div className="font-mono font-black text-orange-300 mt-1">
                          Neto est.: {fmtARS(po.totalNeto || po.totalEstimadoNeto)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-800">
                        <th className="p-3">Código</th>
                        <th className="p-3">Descripción / Marca</th>
                        <th className="p-3 text-right">Stock</th>
                        <th className="p-3 text-right">Mín.</th>
                        <th className="p-3 text-right">Ventas 180d</th>
                        <th className="p-3 text-right">Costo Neto</th>
                        <th className="p-3 text-right">Precio Final</th>
                        <th className="p-3">Últ. Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {filteredArticles.map((a, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/40">
                          <td className="p-3 font-mono font-black text-orange-300">{a.codigo}</td>
                          <td className="p-3">
                            <div className="font-bold text-white">{a.descrip}</div>
                            <div className="text-[10px] text-zinc-400">
                              {a.marcaNombre || a.marca || 'S/M'} • {a.rubroNombre || a.rubro || 'General'}
                            </div>
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-black ${
                              Number(a.stock || 0) <= 0 ? 'text-rose-400' : 'text-emerald-300'
                            }`}
                          >
                            {Number(a.stock || 0).toLocaleString('es-AR')}
                          </td>
                          <td className="p-3 text-right font-mono text-zinc-400">
                            {Number(a.stockMin || 0)}
                          </td>
                          <td className="p-3 text-right font-mono text-cyan-300">
                            {Number(a.ventas180d || 0).toLocaleString('es-AR')}
                          </td>
                          <td className="p-3 text-right font-mono text-zinc-200">
                            {fmtARS(a.costo)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">
                            {fmtARS(a.precioFinal)}
                          </td>
                          <td className="p-3 text-[11px] text-zinc-400">{fmtDateAR(a.ultimaVenta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: CLIENTES MAYORISTAS, FACTURACIÓN Y CUENTAS CORRIENTES
          ========================================================= */}
          {activeTab === 'clients' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-7 space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar cliente por razón social, código, CUIT o localidad..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-orange-500"
                    />
                  </div>
                  {[
                    { id: 'with_debt', label: 'Con Saldo Deudor' },
                    { id: 'overdue_60', label: 'Mora > 60 días' },
                    { id: 'all', label: 'Todos' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setClientFilter(f.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border ${
                        clientFilter === f.id
                          ? 'bg-orange-500 text-black border-orange-400'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[540px] custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-800 sticky top-0">
                          <th className="p-3">Cliente Mayorista</th>
                          <th className="p-3">Localidad / Vend.</th>
                          <th className="p-3 text-center">Ciclo Pago</th>
                          <th className="p-3 text-right">Saldo Cta. Cte.</th>
                          <th className="p-3">Deuda más vieja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredClients.map((c, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/40">
                            <td className="p-3">
                              <div className="font-bold text-white">
                                {c.nombre || c.razonSocial}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                #{c.codigo} • CUIT: {c.cuit || 'S/D'}
                              </div>
                            </td>
                            <td className="p-3 text-[11px] text-zinc-300">
                              <div>{c.localidad || '—'}</div>
                              <div className="text-[10px] text-zinc-500">Vend: {c.vendedor || 'CENTRAL'}</div>
                            </td>
                            <td className="p-3 text-center font-mono text-cyan-300">
                              {c.diasPagoHabitual ? `~${c.diasPagoHabitual}d` : '—'}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-orange-300">
                              {fmtARS(c.saldoPendiente)}
                              {c.facturasImpagasCount > 0 && (
                                <span className="block text-[10px] text-zinc-400 font-normal">
                                  {c.facturasImpagasCount} comp.
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-zinc-300">
                              {fmtDateAR(c.fechaDeudaMasVieja)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Últimas Facturas Emitidas en factura1.DBF */}
              <div className="xl:col-span-5 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col">
                <h4 className="text-sm font-black text-white mb-1">
                  Últimos Comprobantes Emitidos (<code className="text-orange-300">factura1.DBF</code>)
                </h4>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Tocá cualquier factura para inspeccionar sus renglones de <code className="text-orange-300">factura2.dbf</code>.
                </p>
                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[540px] space-y-2 pr-1">
                  {invoices.slice(0, 80).map((inv, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedInvoiceModal(inv)}
                      className="p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {inv.tipo} {inv.letra} {inv.numero} — {inv.clienteNombre}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Fecha: {fmtDateAR(inv.fecha)} • {inv.condicion || 'Cta. Cte.'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-black text-emerald-300">
                          {fmtARS(inv.total)}
                        </div>
                        {Number(inv.saldo || 0) > 1 && (
                          <div className="text-[10px] font-mono text-amber-300">
                            Saldo: {fmtARS(inv.saldo)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 4: PROVEEDORES, COMPRAS Y CHEQUES EN CARTERA
          ========================================================= */}
          {activeTab === 'treasury' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Proveedores */}
              <div className="xl:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-black text-white">
                      Saldos con Proveedores (<code className="text-orange-300">proveedo.DBF</code>)
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Total exigible actual: <b className="text-rose-300">{fmtARS(kpis.cuentasPorPagarProveedores)}</b>
                    </p>
                  </div>
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Buscar proveedor..."
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                <div className="overflow-y-auto custom-scrollbar max-h-[480px] space-y-2 pr-1">
                  {filteredSuppliers.map((sup, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{sup.nombre}</div>
                        <div className="text-[10px] text-zinc-400">
                          #{sup.codigo} • CUIT: {sup.cuit || 'S/D'} • Últ. compra: {fmtDateAR(sup.ultimaCompra)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-rose-300">
                          {fmtARS(sup.saldoPendiente)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Compras 12m: {fmtCompactARS(sup.compras12m)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cheques en Cartera */}
              <div className="xl:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col space-y-3">
                <div>
                  <h4 className="text-sm font-black text-white">
                    Cartera de Cheques y E-Cheqs (<code className="text-orange-300">CHEQUES.DBF</code>)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    En cartera activa: <b className="text-cyan-300">{fmtARS(kpis.chequesEnCarteraTotal)}</b> • Registros recientes: {activeCheques.length}
                  </p>
                </div>

                <div className="overflow-y-auto custom-scrollbar max-h-[480px] space-y-2 pr-1">
                  {activeCheques.slice(0, 120).map((ch, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          #{ch.nro} • {ch.banco || 'Banco'} ({ch.firmante || 'Tercero'})
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Vence: <b className="text-cyan-300">{fmtDateAR(ch.fechaVto)}</b> • Estado:{' '}
                          <span className="text-zinc-200">{ch.estado || 'En Cartera'}</span>
                          {ch.endosadoA ? ` → ${ch.endosadoA}` : ''}
                        </div>
                      </div>
                      <div className="font-mono font-black text-emerald-300 shrink-0">
                        {fmtARS(ch.importe)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 5: AUDITORÍA DE TABLAS .DBF CRUDAS + LECTOR LOCAL .DBF
          ========================================================= */}
          {activeTab === 'dbf_inspector' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Inventario Técnico de las 32 Tablas DBF en Nube */}
              <div className="xl:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col space-y-3">
                <div>
                  <h4 className="text-sm font-black text-white">
                    Esquema Técnico de las Tablas <code className="text-orange-300">.DBF</code> Sincronizadas ({dbfTables.length})
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Tocá cualquier archivo para ver todas sus columnas originales en FoxPro/dBase, registros activos y fecha de cabecera.
                  </p>
                </div>

                <div className="overflow-y-auto custom-scrollbar max-h-[500px] space-y-2 pr-1">
                  {dbfTables.map((tb, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedSchemaTable(tb)}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                        selectedSchemaTable?.fileName === tb.fileName
                          ? 'bg-orange-500/15 border-orange-500/50'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono font-black text-orange-300">
                          {tb.fileName}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Cabecera: {tb.lastHeaderUpdate} • {tb.fieldCount} columnas ({tb.version})
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-mono font-black text-white">
                          {Number(tb.activeRecords || 0).toLocaleString('es-AR')} reg.
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {Number(tb.deletedRecords || 0).toLocaleString('es-AR')} borrados
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSchemaTable && (
                  <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="text-xs font-black text-orange-300">
                      Columnas de {selectedSchemaTable.fileName} ({selectedSchemaTable.fields?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {(selectedSchemaTable.fields || []).map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-200"
                        >
                          <b>{f.name}</b> ({f.type}:{f.length}{f.decimals ? `.${f.decimals}` : ''})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lector Directo de cualquier archivo .DBF suelto desde la PC */}
              <div className="xl:col-span-6 bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Lector Directo de Archivos <code className="text-emerald-300">.DBF</code> desde tu Computadora
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      ¿Tenés un backup o tabla <code className="text-zinc-200">.DBF</code> suelta en una carpeta o pendrive? Abrila acá en modo 100% lectura sin instalar FoxPro.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".dbf,.DBF"
                    onChange={handleLocalDbfUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-4 h-4" /> Abrir archivo .DBF
                  </button>
                </div>

                {localDbfError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
                    {localDbfError}
                  </div>
                )}

                {!localDbfResult ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 min-h-[280px] border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors"
                  >
                    <Upload className="w-8 h-8 text-zinc-600 mb-2" />
                    <p className="text-xs font-black text-zinc-300">
                      Hacé clic para seleccionar cualquier archivo .DBF local
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Soporta codificación Windows-1252 (acentos y Ñ), dBase III y Visual FoxPro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs">
                      <div>
                        <b className="text-emerald-300 font-mono">{localDbfResult.fileName}</b>{' '}
                        <span className="text-zinc-400">
                          ({localDbfResult.fileSizeKb} KB • {localDbfResult.activeCount.toLocaleString('es-AR')} filas activas • Últ. mod: {localDbfResult.lastUpdate})
                        </span>
                      </div>
                      <input
                        type="text"
                        value={localDbfSearch}
                        onChange={(e) => setLocalDbfSearch(e.target.value)}
                        placeholder="Filtrar filas..."
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                      />
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar max-h-[380px] border border-zinc-800 rounded-2xl bg-zinc-950">
                      <table className="w-full text-left border-collapse text-[11px] font-mono">
                        <thead>
                          <tr className="bg-zinc-900 text-zinc-300 sticky top-0 border-b border-zinc-800">
                            {localDbfResult.fields.map((f) => (
                              <th key={f.name} className="p-2 whitespace-nowrap">
                                {f.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {filteredLocalDbfRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-zinc-900/70">
                              {localDbfResult.fields.map((f) => (
                                <td key={f.name} className="p-2 whitespace-nowrap text-zinc-300">
                                  {String(row[f.name] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DESGLOSE COMPLETO DE LA SEMANA SELECCIONADA ("VER MÁS") */}
      {showWeekDetailModal && activeForecastWeek && (
        <div
          onClick={() => setShowWeekDetailModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-emerald-500/40 rounded-3xl max-w-4xl w-full p-5 lg:p-6 space-y-4 max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Cabecera del Modal */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Desglose Completo — {activeForecastWeek.title} ({activeForecastWeek.rangeLabel})
                </span>
                <h4 className="text-lg lg:text-xl font-black text-white mt-0.5">
                  Total esperado: {fmtARS(activeForecastWeek.ingresoTotalEstimado)}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {(forecast?.projectedWeeks || []).map((w, idx) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedForecastWeekIdx(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                        selectedForecastWeekIdx === idx
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {w.shortLabel}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeekDetailModal(false)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Pilares explicados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-zinc-300">1. Facturas en término</span>
                  <InfoBadge text="Facturas abiertas en factura1.DBF que vencen en esta semana según 70% conducta real histórica del cliente (RECIBOS.DBF) + 30% plazo pactado." />
                </div>
                <div className="text-sm font-mono font-black text-white mt-1">
                  {fmtARS(activeForecastWeek.ctaCteEnTermino)}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Vencimiento normal según plazo real</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-zinc-300">2. Recupero atraso</span>
                  <InfoBadge text="Atrasos recientes (≤60d, o ≤75d en pagadores activos) prorrateados en cuotas prudentes (60/40 o 35/35/30). Mora >90d excluida." />
                </div>
                <div className="text-sm font-mono font-black text-orange-300 mt-1">
                  {fmtARS(activeForecastWeek.ctaCteRecuperoAtraso)}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Cuota prudente de atrasos ≤60d</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-zinc-300">3. Cheques a acreditar</span>
                  <InfoBadge text="Cheques y E-Cheqs en cartera (CHEQUES.DBF) con fecha de depósito/vencimiento dentro de esta semana." />
                </div>
                <div className="text-sm font-mono font-black text-cyan-300 mt-1">
                  {fmtARS(activeForecastWeek.chequesPorAcreditar)}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {(activeForecastWeek.chequesList || []).length} valor(es) en cartera
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-zinc-300">4. Rotación + Contado</span>
                  <InfoBadge text="Promedio semanal de ventas al contado (últ. 8 sem.) + cobranza estimada de nuevas facturas de corto plazo que rotan en Sem. +3 y +4." />
                </div>
                <div className="text-sm font-mono font-black text-emerald-300 mt-1">
                  {fmtARS(
                    activeForecastWeek.rotacionNuevasVentasCtaCte +
                      activeForecastWeek.ventasContadoEstimadas
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Contado: {fmtCompactARS(activeForecastWeek.ventasContadoEstimadas)} • Rot.:{' '}
                  {fmtCompactARS(activeForecastWeek.rotacionNuevasVentasCtaCte)}
                </p>
              </div>
            </div>

            {/* Buscador + Listado completo scrolleable */}
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-black uppercase text-zinc-300">
                Agenda Nominal Completa ({activeForecastWeek.clientesEsperados.length} clientes)
              </span>
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={weekModalSearch}
                  onChange={(e) => setWeekModalSearch(e.target.value)}
                  placeholder="Filtrar cliente en esta semana..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {(() => {
                const q = weekModalSearch.trim().toLowerCase();
                const list = (activeForecastWeek.clientesEsperados || []).filter((cl) => {
                  if (!q) return true;
                  return `${cl.clienteNombre || ''} ${cl.clienteCod || ''} ${cl.motivo || ''}`
                    .toLowerCase()
                    .includes(q);
                });
                if (list.length === 0) {
                  return (
                    <p className="text-xs text-zinc-500 py-8 text-center">
                      No hay clientes que coincidan con el filtro en esta semana.
                    </p>
                  );
                }
                return list.map((cl, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">#{idx + 1}</span>
                        <span className="font-bold text-white truncate">
                          {cl.clienteNombre || `Cliente #${cl.clienteCod}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                            cl.tipo === 'RECUPERO_MORA_RECIENTE'
                              ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {cl.tipo === 'RECUPERO_MORA_RECIENTE' ? 'Recupero atraso' : 'En término'}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {cl.facturasCount} comprobante(s) • {cl.motivo}
                        {cl.ejemploComprobante ? ` • Ej. Comp. ${cl.ejemploComprobante}` : ''}
                      </div>
                    </div>
                    <span className="font-mono font-black text-sm text-emerald-300 shrink-0">
                      {fmtARS(cl.montoEstimado)}
                    </span>
                  </div>
                ));
              })()}

              {(activeForecastWeek.chequesList || []).length > 0 && (
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="text-xs font-black uppercase text-cyan-300">
                    Cheques y E-Cheqs que acreditan esta semana ({activeForecastWeek.chequesList.length})
                  </div>
                  {activeForecastWeek.chequesList.map((ch, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-950 border border-cyan-500/25 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          #{ch.nro} • {ch.banco || 'Banco'} ({ch.firmante || 'Tercero'})
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Vence: <b className="text-cyan-300">{fmtDateAR(ch.fechaVto)}</b> • {ch.estado || 'En Cartera'}
                        </div>
                      </div>
                      <span className="font-mono font-black text-cyan-300 shrink-0">
                        {fmtARS(ch.importe)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE RENGLONES DE FACTURA */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-orange-400">
                  Comprobante Mayorista Central REMEX
                </span>
                <h4 className="text-base font-black text-white">
                  {selectedInvoiceModal.tipo} {selectedInvoiceModal.letra} {selectedInvoiceModal.numero} —{' '}
                  {selectedInvoiceModal.clienteNombre}
                </h4>
                <p className="text-xs text-zinc-400">
                  Fecha: {fmtDateAR(selectedInvoiceModal.fecha)} • Condición: {selectedInvoiceModal.condicion} • CAE:{' '}
                  {selectedInvoiceModal.cae || 'S/D'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceModal(null)}
                className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-2">
              {(selectedInvoiceModal.items || []).length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">
                  Sin renglones detallados en este corte histórico.
                </p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase text-zinc-400 border-b border-zinc-800">
                      <th className="py-2">Código</th>
                      <th className="py-2">Descripción</th>
                      <th className="py-2 text-right">Cant.</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {selectedInvoiceModal.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-mono text-orange-300">{it.codigo || it.art}</td>
                        <td className="py-2 text-zinc-200">{it.descrip || it.descripcion}</td>
                        <td className="py-2 text-right font-mono">{it.cantidad || it.cant}</td>
                        <td className="py-2 text-right font-mono font-bold text-white">
                          {fmtARS(it.total || it.importe || it.precioUnitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-800 text-xs">
              <span className="text-zinc-400">
                Saldo pendiente: <b className="text-amber-300">{fmtARS(selectedInvoiceModal.saldo)}</b>
              </span>
              <span className="text-sm font-black text-emerald-300 font-mono">
                Total: {fmtARS(selectedInvoiceModal.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
