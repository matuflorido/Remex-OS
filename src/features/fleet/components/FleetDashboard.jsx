import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Truck, DollarSign, Settings, ArrowUpRight, TrendingUp,
  Package, Fuel, MapPin, ShieldCheck, AlertTriangle, CheckCircle2, Filter
} from 'lucide-react';
import { subscribeToAllTrips } from '../services/fleetService';
import ExpenseCategoryManagerModal from './ExpenseCategoryManagerModal';
import TripSettlementModal from './TripSettlementModal';

const isFuelExpense = (e) => {
  const str = `${e.macroCategory || ''} ${e.microCategory || ''}`.toLowerCase();
  return e.isFuel || str.includes('combust') || str.includes('nafta') || str.includes('gasoil') || str.includes('ypf') || str.includes('diesel');
};

export default function FleetDashboard() {
  const [trips, setTrips] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all_active'); // 'liquidado' | 'all_active'
  const [zoneFilter, setZoneFilter] = useState('ALL');

  useEffect(() => {
    const unsub = subscribeToAllTrips((data) => setTrips(data));
    return () => unsub();
  }, []);

  // Lista de zonas únicas
  const availableZones = useMemo(() => {
    const set = new Set();
    trips.forEach(t => { if (t.zone) set.add(t.zone); });
    return Array.from(set).sort();
  }, [trips]);

  // Filtrado de viajes para análisis
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      if (statusFilter === 'liquidado' && t.status !== 'liquidado') return false;
      if (zoneFilter !== 'ALL' && t.zone !== zoneFilter) return false;
      return true;
    });
  }, [trips, statusFilter, zoneFilter]);

  // Procesamiento global y por zona (La mercadería que viaja ya está vendida = Valor del Reparto)
  const metrics = useMemo(() => {
    let totalKm = 0;
    let totalMerchOut = 0;
    let totalCollected = 0;
    let totalExpenses = 0;
    let totalFuel = 0;
    let totalLiters = 0;
    let totalCashAdvance = 0;

    const zoneMap = {};

    filteredTrips.forEach(t => {
      const kmOut = Number(t.departure?.km) || 0;
      const kmIn = Number(t.return?.km) || 0;
      const km = kmIn > 0 && kmOut > 0 ? Math.max(0, kmIn - kmOut) : 0;

      const rawMerch = Number(t.departure?.merchandiseValue) || 0;
      const zoneDebt = Number(t.departure?.zoneDebt) || 0;
      const collectedCash = t.finances?.collectedCash !== undefined
        ? (Number(t.finances.collectedCash) || 0)
        : (Number(t.finances?.totalCollected) || 0);
      const collectedChecks = Number(t.finances?.collectedChecks) || 0;
      const collectedTransfers = Number(t.finances?.collectedTransfers) || 0;
      const totalTripCollections = collectedCash + collectedChecks + collectedTransfers;

      // Si es un viaje de reparto, la mercadería que viaja ya está vendida; si en algún viaje antiguo no cargaron mercadería, usamos lo cobrado
      const merchSold = rawMerch > 0 ? rawMerch : totalTripCollections;
      const cashAdv = Number(t.departure?.cashAdvance) || 0;

      const expensesList = t.finances?.expenses || [];
      const expTotal = expensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const fuelExp = expensesList.filter(isFuelExpense).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const liters = expensesList.filter(isFuelExpense).reduce((s, e) => s + (Number(e.liters) || 0), 0);

      totalKm += km;
      totalMerchOut += merchSold;
      totalCollected += collectedCash;
      totalExpenses += expTotal;
      totalFuel += fuelExp;
      totalLiters += liters;
      totalCashAdvance += cashAdv;

      const zName = t.zone || 'Sin Zona';
      if (!zoneMap[zName]) {
        zoneMap[zName] = {
          zone: zName,
          tripCount: 0,
          km: 0,
          merchOut: 0,
          latestZoneDebt: 0,
          collectedCash: 0,
          collectedChecks: 0,
          collectedTransfers: 0,
          totalCollections: 0,
          expenses: 0,
          fuel: 0,
          liters: 0
        };
      }
      zoneMap[zName].tripCount += 1;
      zoneMap[zName].km += km;
      zoneMap[zName].merchOut += merchSold;
      if (zoneDebt > 0 && zoneMap[zName].latestZoneDebt === 0) {
        zoneMap[zName].latestZoneDebt = zoneDebt;
      }
      zoneMap[zName].collectedCash += collectedCash;
      zoneMap[zName].collectedChecks += collectedChecks;
      zoneMap[zName].collectedTransfers += collectedTransfers;
      zoneMap[zName].totalCollections += totalTripCollections;
      zoneMap[zName].expenses += expTotal;
      zoneMap[zName].fuel += fuelExp;
      zoneMap[zName].liters += liters;
    });

    const tripCount = filteredTrips.length;
    const avgMerchPerTrip = tripCount > 0 ? totalMerchOut / tripCount : 0;

    const zonesRanking = Object.values(zoneMap)
      .map(z => {
        const netResult = z.merchOut - z.expenses;
        const avgZoneMerch = z.tripCount > 0 ? z.merchOut / z.tripCount : 0;
        const vsGlobalAvgPct = avgMerchPerTrip > 0 ? Math.round(((avgZoneMerch - avgMerchPerTrip) / avgMerchPerTrip) * 100) : 0;
        const salesPerKm = z.km > 0 ? z.merchOut / z.km : 0;
        const costPerKm = z.km > 0 ? z.expenses / z.km : 0;
        const expenseRatio = z.merchOut > 0 ? (z.expenses / z.merchOut) * 100 : 0;
        return {
          ...z,
          netResult,
          avgZoneMerch,
          vsGlobalAvgPct,
          salesPerKm,
          costPerKm,
          expenseRatio
        };
      })
      .sort((a, b) => b.netResult - a.netResult);

    const globalSalesPerKm = totalKm > 0 ? totalMerchOut / totalKm : 0;
    const globalCostPerKm = totalKm > 0 ? totalExpenses / totalKm : 0;
    const globalFuelPerKm = totalKm > 0 ? totalFuel / totalKm : 0;
    const globalExpenseRatio = totalMerchOut > 0 ? (totalExpenses / totalMerchOut) * 100 : 0;
    const globalNet = totalMerchOut - totalExpenses;
    const totalCashReturned = totalCashAdvance + totalCollected - totalExpenses;

    return {
      tripCount,
      totalKm,
      totalMerchOut,
      avgMerchPerTrip,
      totalCollected,
      totalExpenses,
      totalFuel,
      totalLiters,
      totalCashAdvance,
      totalCashReturned,
      globalSalesPerKm,
      globalCostPerKm,
      globalFuelPerKm,
      globalExpenseRatio,
      globalNet,
      zonesRanking
    };
  }, [filteredTrips]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto custom-scrollbar p-2 space-y-5">

      {/* Barra Superior de Filtros y Configuración */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-lg shrink-0">
        <div>
          <h3 className="text-white font-black flex items-center gap-2 text-base">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Rendimiento de Repartos, Mercadería, Distancias y Zonas
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Controla cuánta mercadería vendida viaja en cada reparto, la distancia recorrida en relación a lo vendido y qué zonas rinden más.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-black border border-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all_active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'all_active' ? 'bg-orange-600 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({trips.length})
            </button>
            <button
              onClick={() => setStatusFilter('liquidado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'liquidado' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Solo Liquidados ({trips.filter(t => t.status === 'liquidado').length})
            </button>
          </div>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-black border border-zinc-800 text-zinc-200 font-bold px-3 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
          >
            <option value="ALL">Todas las Zonas</option>
            {availableZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors border border-zinc-700 ml-auto lg:ml-0"
          >
            <Settings className="w-4 h-4 text-orange-500" /> Rubros de Gastos
          </button>
        </div>
      </div>

      {/* 4 TARJETAS DE INDICADORES CLAVE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {/* 1. Mercadería Vendida en Reparto */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Mercadería en Reparto (Vendida)
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-black text-white">${metrics.totalMerchOut.toLocaleString('es-AR')}</h3>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold mt-2">
            Promedio por viaje: <span className="text-amber-300">${Math.round(metrics.avgMerchPerTrip).toLocaleString('es-AR')}</span>
          </p>
        </div>

        {/* 2. Distancia Recorrida en relación a lo Vendido */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Distancia vs. Mercadería Vendida
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-black text-white">
              {metrics.totalKm.toLocaleString('es-AR')} <span className="text-sm text-zinc-500">km</span>
            </h3>
            <span className="text-xs font-black text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md">
              ${metrics.globalSalesPerKm.toFixed(0)} / km
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold mt-2">
            Gasto operativo por km: <span className="text-red-400">${metrics.globalCostPerKm.toFixed(0)}/km</span>
          </p>
        </div>

        {/* 3. Gasto en Combustible y Viáticos */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5" /> Combustible y Gastos de Viaje
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-black text-orange-400">${metrics.totalFuel.toLocaleString('es-AR')}</h3>
            <span className="text-xs font-bold text-zinc-400">
              {metrics.totalLiters > 0 ? `${metrics.totalLiters} Lts` : `$${metrics.globalFuelPerKm.toFixed(0)}/km`}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold mt-2">
            Total Gastos: <span className="text-red-400">-${metrics.totalExpenses.toLocaleString('es-AR')}</span> ({metrics.globalExpenseRatio.toFixed(1)}% del reparto)
          </p>
        </div>

        {/* 4. Rendimiento Neto y Efectivo Traído */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Rendimiento (Reparto - Gastos)
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className={`text-2xl font-black ${metrics.globalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${metrics.globalNet.toLocaleString('es-AR')}
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold mt-2">
            Efectivo traído en mano: <span className="text-emerald-300">${metrics.totalCashReturned.toLocaleString('es-AR')}</span>
          </p>
        </div>
      </div>

      {/* RANKING DE ZONAS: ¿QUÉ ZONAS RINDEN MÁS O MENOS? */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" /> Ranking por Zona: ¿Qué zonas rinden más o menos?
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compara cuánta mercadería viaja a cada zona, si se vende más o menos por viaje, los KM recorridos en relación a lo vendido y los gastos del viaje.
            </p>
          </div>
        </div>

        {metrics.zonesRanking.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-bold">
            Todavía no hay viajes registrados para comparar zonas.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Zona de Reparto</th>
                  <th className="py-2.5 px-3 text-center">Viajes</th>
                  <th className="py-2.5 px-3 text-right">Distancia Total</th>
                  <th className="py-2.5 px-3 text-right">Mercadería Vendida (Total)</th>
                  <th className="py-2.5 px-3 text-right">Promedio por Viaje</th>
                  <th className="py-2.5 px-3 text-right">Relación Venta / KM</th>
                  <th className="py-2.5 px-3 text-right">Combustible y Gastos</th>
                  <th className="py-2.5 px-3 text-right">Rendimiento Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs font-bold">
                {metrics.zonesRanking.map((z, idx) => {
                  let badge = { label: '🔥 Rinde Muy Bien', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
                  if (z.netResult <= 0 && z.expenses > 0) {
                    badge = { label: '⚠️ Costo Mayor al Reparto', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
                  } else if (z.expenseRatio > 25) {
                    badge = { label: '⚖️ Gasto Alto vs. Carga', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
                  }

                  return (
                    <tr key={z.zone} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] flex items-center justify-center font-black">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-white font-black block">{z.zone}</span>
                            <span className={`inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-zinc-300">{z.tripCount}</td>
                      <td className="py-3 px-3 text-right text-zinc-200">{z.km.toLocaleString('es-AR')} km</td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-amber-400 font-black">${z.merchOut.toLocaleString('es-AR')}</div>
                        {z.latestZoneDebt > 0 && (
                          <div className="text-[10px] text-rose-400">Deuda zona: ${z.latestZoneDebt.toLocaleString('es-AR')}</div>
                        )}
                        {z.totalCollections > 0 && (
                          <div className="text-[10px] text-blue-400">
                            Rindió total: ${z.totalCollections.toLocaleString('es-AR')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-white font-bold">${Math.round(z.avgZoneMerch).toLocaleString('es-AR')}/viaje</div>
                        {metrics.zonesRanking.length > 1 && z.avgZoneMerch > 0 && (
                          <div className={`text-[10px] font-black ${z.vsGlobalAvgPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {z.vsGlobalAvgPct >= 0 ? `▲ +${z.vsGlobalAvgPct}% vs prom.` : `▼ ${z.vsGlobalAvgPct}% vs prom.`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-emerald-300 font-black">${z.salesPerKm.toFixed(0)}/km</span>
                        {z.km > 0 && (
                          <span className="block text-[10px] text-zinc-500">Costo: ${z.costPerKm.toFixed(0)}/km</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-red-400">-${z.expenses.toLocaleString('es-AR')} ({z.expenseRatio.toFixed(1)}%)</div>
                        <div className="text-[10px] text-orange-400">
                          Comb: ${z.fuel.toLocaleString('es-AR')} {z.liters > 0 ? `(${z.liters} Lts)` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm font-black ${z.netResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${z.netResult.toLocaleString('es-AR')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETALLE HISTÓRICO VIAJE POR VIAJE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
        <div className="mb-4 pb-3 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" /> Comparativa Viaje por Viaje (¿Se vende más o menos? / Control de Caja)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compara la mercadería llevada en cada reparto, la deuda en zona, lo cobrado en Efectivo / Cheques / Transferencias y el efectivo entregado en mano.
            </p>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-bold">
            No hay viajes para los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Fecha / Zona</th>
                  <th className="py-2.5 px-3">Camioneta / Tanque</th>
                  <th className="py-2.5 px-3 text-right">KM (Sal → Lleg)</th>
                  <th className="py-2.5 px-3 text-right">Mercadería y Deuda Zona</th>
                  <th className="py-2.5 px-3 text-right">Venta por KM</th>
                  <th className="py-2.5 px-3 text-right">Rindió (Efvo / Cheques / Trf)</th>
                  <th className="py-2.5 px-3 text-right">Comb. / Gastos (-)</th>
                  <th className="py-2.5 px-3 text-right">Efectivo en Mano (=)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs font-bold">
                {filteredTrips.map(t => {
                  const kmOut = Number(t.departure?.km) || 0;
                  const kmIn = Number(t.return?.km) || 0;
                  const km = kmIn > 0 && kmOut > 0 ? Math.max(0, kmIn - kmOut) : 0;
                  const urbanBrcKm = Number(t.departure?.urbanKmBariloche) || 0;

                  const rawMerch = Number(t.departure?.merchandiseValue) || 0;
                  const zoneDebt = Number(t.departure?.zoneDebt) || 0;
                  const collectedCash = t.finances?.collectedCash !== undefined
                    ? (Number(t.finances.collectedCash) || 0)
                    : (Number(t.finances?.totalCollected) || 0);
                  const collectedChecks = Number(t.finances?.collectedChecks) || 0;
                  const collectedTransfers = Number(t.finances?.collectedTransfers) || 0;
                  const totalAllCollected = collectedCash + collectedChecks + collectedTransfers;

                  const merchOut = rawMerch > 0 ? rawMerch : totalAllCollected;
                  const cashAdvance = Number(t.departure?.cashAdvance) || 0;

                  const expenses = t.finances?.expenses || [];
                  const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                  const fuelExp = expenses.filter(isFuelExpense).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                  const fuelLiters = expenses.filter(isFuelExpense).reduce((s, e) => s + (Number(e.liters) || 0), 0);
                  const cashReturned = cashAdvance + collectedCash - totalExp;
                  const tripSalesPerKm = km > 0 ? merchOut / km : 0;
                  const vsAvgPct = metrics.avgMerchPerTrip > 0 && merchOut > 0
                    ? Math.round(((merchOut - metrics.avgMerchPerTrip) / metrics.avgMerchPerTrip) * 100)
                    : null;

                  const vehicleHasIssue = (t.departure?.vehicleStatus && t.departure.vehicleStatus !== 'Óptimo') ||
                    (t.return?.vehicleCondition && t.return.vehicleCondition !== 'Sin Novedades');

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrip(t)}
                      className="hover:bg-zinc-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span className="text-white font-black block">{t.zone}</span>
                        <span className="text-[10px] text-zinc-500">{t.date || 'Sin fecha'} • {t.status === 'liquidado' ? '✅ Liquidado' : (t.status === 'en_ruta' ? '🚚 En Ruta' : '⏳ Preparación')}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-zinc-200">{t.vehicle || 'Sin especificar'} {t.driver ? `(${t.driver})` : ''}</div>
                        <div className={`text-[10px] ${vehicleHasIssue ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {vehicleHasIssue
                            ? `⚠️ ${t.return?.vehicleCondition || t.departure?.vehicleStatus}`
                            : `⛽ Sal: ${t.departure?.fuelLevel || 'Lleno'} → Lleg: ${t.return?.fuelLevel || '-'}`}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-orange-400 font-black">{km > 0 ? `${km.toLocaleString('es-AR')} km` : '-'}</div>
                        <div className="text-[10px] text-zinc-500">{kmOut || 0} → {kmIn || 0}</div>
                        {urbanBrcKm > 0 && (
                          <div className="text-[9px] text-purple-400">+{urbanBrcKm} km BRC</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-amber-300 font-black">${merchOut.toLocaleString('es-AR')}</div>
                        {zoneDebt > 0 && (
                          <div className="text-[10px] text-rose-400">Deuda: ${zoneDebt.toLocaleString('es-AR')}</div>
                        )}
                        <div className="text-[10px] flex justify-end gap-1.5">
                          {t.departure?.merchandisePackages > 0 && (
                            <span className="text-zinc-500">{t.departure.merchandisePackages} bultos</span>
                          )}
                          {vsAvgPct !== null && filteredTrips.length > 1 && (
                            <span className={vsAvgPct >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {vsAvgPct >= 0 ? `▲ +${vsAvgPct}%` : `▼ ${vsAvgPct}%`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-emerald-300 font-black">{km > 0 ? `$${tripSalesPerKm.toFixed(0)}/km` : '-'}</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-emerald-400 font-bold">Efvo: +${collectedCash.toLocaleString('es-AR')}</div>
                        {(collectedChecks > 0 || collectedTransfers > 0) && (
                          <div className="text-[10px] text-amber-300">
                            {collectedChecks > 0 ? `Chq: $${collectedChecks.toLocaleString('es-AR')} ` : ''}
                            {collectedTransfers > 0 ? `Trf: $${collectedTransfers.toLocaleString('es-AR')}` : ''}
                          </div>
                        )}
                        {cashAdvance > 0 && (
                          <div className="text-[10px] text-zinc-400">Salió c/: ${cashAdvance.toLocaleString('es-AR')}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="text-red-400">-${totalExp.toLocaleString('es-AR')}</div>
                        <div className="text-[10px] text-orange-400">
                          Comb: ${fuelExp.toLocaleString('es-AR')} {fuelLiters > 0 ? `(${fuelLiters}L)` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`text-sm font-black ${cashReturned >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${cashReturned.toLocaleString('es-AR')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCategoryModalOpen && <ExpenseCategoryManagerModal onClose={() => setIsCategoryModalOpen(false)} />}
      {selectedTrip && (
        <TripSettlementModal
          eventId={selectedTrip.id}
          zoneName={selectedTrip.zone}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}