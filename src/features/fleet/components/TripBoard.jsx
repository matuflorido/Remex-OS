import React, { useState, useEffect } from 'react';
import {
  Truck, MapPin, Calendar as CalIcon, DollarSign, GripVertical,
  CheckCircle2, Plus, Package, Fuel, Trash2, User, Navigation
} from 'lucide-react';
import { subscribeToAllTrips, updateTripInDb, createTripInDb, deleteTripInDb, subscribeToVehicles } from '../services/fleetService';
import { subscribeToZones } from '../../crm/services/crmService';
import TripSettlementModal from './TripSettlementModal';

const TRIP_COLUMNS = [
  { id: 'en_preparacion', title: 'PROGRAMADOS (PREPARACIÓN)', color: 'bg-zinc-500', sort: 'asc' },
  { id: 'en_ruta', title: 'EN CURSO (EN RUTA)', color: 'bg-blue-500', sort: 'asc' },
  { id: 'liquidado', title: 'HISTORIAL (LIQUIDADOS)', color: 'bg-emerald-500', sort: 'desc' }
];

const isFuelExpense = (e) => {
  const str = `${e.macroCategory || ''} ${e.microCategory || ''}`.toLowerCase();
  return e.isFuel || str.includes('combust') || str.includes('nafta') || str.includes('gasoil') || str.includes('ypf') || str.includes('diesel');
};

export default function TripBoard() {
  const [trips, setTrips] = useState([]);
  const [zones, setZones] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [newTripData, setNewTripData] = useState({
    zone: '',
    customZone: '',
    date: new Date().toISOString().split('T')[0],
    vehicleId: '',
    vehicle: '',
    driver: '',
    kmOut: '',
    merchandiseValue: '',
    zoneDebt: ''
  });

  const [draggedTripId, setDraggedTripId] = useState(null);
  const [draggedOverColId, setDraggedOverColId] = useState(null);

  useEffect(() => {
    const unsubTrips = subscribeToAllTrips((data) => {
      setTrips(data);
      setIsLoading(false);
    });
    const unsubZones = subscribeToZones((z) => setZones(z || []));
    const unsubVehicles = subscribeToVehicles((v) => setVehicles(v || []));
    return () => {
      unsubTrips();
      unsubZones();
      unsubVehicles();
    };
  }, []);

  const handleSelectVehicleInForm = (val) => {
    const veh = vehicles.find(v => v.id === val);
    if (veh) {
      setNewTripData(prev => ({
        ...prev,
        vehicleId: veh.id,
        vehicle: veh.name,
        driver: prev.driver || veh.defaultDriver || '',
        kmOut: veh.currentKm || ''
      }));
    } else {
      setNewTripData(prev => ({ ...prev, vehicleId: '', vehicle: val }));
    }
  };

  const handleCreateDirectTrip = async (e) => {
    e.preventDefault();
    const finalZone = newTripData.zone === '__custom__' ? newTripData.customZone.trim() : newTripData.zone.trim();
    if (!finalZone) return;

    const vehObj = vehicles.find(v => v.id === newTripData.vehicleId);
    const newId = `viaje_${Date.now()}`;
    await createTripInDb(newId, finalZone, newTripData.date, {
      vehicleId: vehObj?.id || '',
      vehicle: vehObj?.name || newTripData.vehicle.trim(),
      driver: newTripData.driver.trim(),
      departure: {
        km: Number(newTripData.kmOut) || vehObj?.currentKm || 0,
        fuelLevel: vehObj?.fuelLevel || 'Lleno',
        vehicleStatus: 'Óptimo',
        cashAdvance: 0,
        merchandiseValue: Number(newTripData.merchandiseValue) || 0,
        zoneDebt: Number(newTripData.zoneDebt) || 0
      }
    });

    setShowNewTripForm(false);
    setNewTripData({
      zone: '',
      customZone: '',
      date: new Date().toISOString().split('T')[0],
      vehicleId: '',
      vehicle: '',
      driver: '',
      kmOut: '',
      merchandiseValue: '',
      zoneDebt: ''
    });
    setSelectedTrip({ id: newId, zone: finalZone });
  };

  const handleDeleteTrip = async (e, tripId, zoneName) => {
    e.stopPropagation();
    if (window.confirm(`¿Eliminar el viaje de "${zoneName}"?`)) {
      await deleteTripInDb(tripId);
    }
  };

  const handleDragStart = (e, tripId) => {
    e.stopPropagation();
    setDraggedTripId(tripId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverColId(null);

    if (draggedTripId) {
      const trip = trips.find(t => t.id === draggedTripId);
      if (trip && trip.status !== colId) {
        setTrips(prev => prev.map(t => t.id === draggedTripId ? { ...t, status: colId } : t));
        await updateTripInDb(draggedTripId, { status: colId });

        if (colId === 'liquidado') {
          setSelectedTrip(trip);
        }
      }
      setDraggedTripId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-2 gap-4">
      {/* Barra Superior de Acción Rápida */}
      <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-2xl flex flex-col gap-3 shrink-0">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500" /> Hojas de Ruta y Control de Viajes Operativos
            </h3>
            <p className="text-[11px] text-zinc-400">
              Haz clic en cualquier viaje para controlar KM de salida/llegada, tanque, gastos pre-cargados (Combustible con litros, Comida, Alojamiento) y rendición (Efectivo, Cheques, Transferencias).
            </p>
          </div>
          <button
            onClick={() => setShowNewTripForm(!showNewTripForm)}
            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(249,115,22,0.25)]"
          >
            <Plus className="w-4 h-4" /> NUEVO VIAJE OPERATIVO
          </button>
        </div>

        {showNewTripForm && (
          <form onSubmit={handleCreateDirectTrip} className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Zona / Destino</label>
              <select
                value={newTripData.zone}
                onChange={(e) => setNewTripData({ ...newTripData, zone: e.target.value })}
                required
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
              >
                <option value="">-- Seleccionar Zona --</option>
                {zones.map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
                <option value="__custom__">+ Escribir otra zona (ej. El Bolsón)...</option>
              </select>
            </div>

            {newTripData.zone === '__custom__' && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre de Zona</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. El Bolsón..."
                  value={newTripData.customZone}
                  onChange={(e) => setNewTripData({ ...newTripData, customZone: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Unidad de Flota</label>
              {vehicles.length > 0 ? (
                <select
                  value={newTripData.vehicleId}
                  onChange={(e) => handleSelectVehicleInForm(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                >
                  <option value="">-- Elegir Unidad --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.currentKm} km)</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej. Sprinter..."
                  value={newTripData.vehicle}
                  onChange={(e) => setNewTripData({ ...newTripData, vehicle: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">KM de Salida</label>
              <input
                type="number"
                placeholder="Ej. 43250"
                value={newTripData.kmOut}
                onChange={(e) => setNewTripData({ ...newTripData, kmOut: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-orange-400 outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Mercadería ($)</label>
              <input
                type="number"
                placeholder="Ej. 5000000"
                value={newTripData.merchandiseValue}
                onChange={(e) => setNewTripData({ ...newTripData, merchandiseValue: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Deuda Zona ($)</label>
                <input
                  type="number"
                  placeholder="Ej. 35000000"
                  value={newTripData.zoneDebt}
                  onChange={(e) => setNewTripData({ ...newTripData, zoneDebt: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 outline-none focus:border-rose-500"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-black font-black px-4 py-2 rounded-xl text-xs shrink-0 h-[34px]"
              >
                CREAR
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Columnas Kanban */}
      <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-5 min-h-0">
        {TRIP_COLUMNS.map(col => {
          let columnTrips = trips.filter(t => t.status === col.id);

          columnTrips.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt?.toDate?.() || 0).getTime();
            const dateB = new Date(b.date || b.createdAt?.toDate?.() || 0).getTime();
            return col.sort === 'asc' ? dateA - dateB : dateB - dateA;
          });

          const isOver = draggedOverColId === col.id && draggedTripId;

          return (
            <div
              key={col.id}
              onDragOver={(e) => { if (draggedTripId) { e.preventDefault(); setDraggedOverColId(col.id); } }}
              onDragLeave={() => setDraggedOverColId(null)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex-shrink-0 flex flex-col rounded-2xl w-[360px] border transition-all duration-300 ${
                isOver ? 'bg-orange-950/10 border-orange-500/50 ring-2 ring-orange-500/20' : 'bg-zinc-950/50 border-zinc-800/60'
              }`}
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10 rounded-t-2xl">
                <div className="flex items-center gap-2 pointer-events-none">
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                  <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                  <h3 className="font-black text-white text-xs sm:text-sm">{col.title}</h3>
                </div>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md font-bold">{columnTrips.length}</span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                {isLoading && <div className="text-orange-500 text-xs text-center p-4">Cargando viajes...</div>}
                {!isLoading && columnTrips.length === 0 && (
                  <div className="text-zinc-600 text-xs text-center p-6 italic">No hay viajes en esta columna.</div>
                )}

                {!isLoading && columnTrips.map(trip => {
                  const kmOut = Number(trip.departure?.km) || 0;
                  const kmIn = Number(trip.return?.km) || 0;
                  const kmTraveled = kmIn > 0 && kmOut > 0 ? kmIn - kmOut : 0;
                  const urbanKm = Number(trip.departure?.urbanKmBariloche) || 0;

                  const expenses = trip.finances?.expenses || [];
                  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const fuelExpenses = expenses.filter(isFuelExpense).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const totalLiters = expenses.filter(isFuelExpense).reduce((sum, e) => sum + (Number(e.liters) || 0), 0);

                  const cashAdvance = Number(trip.departure?.cashAdvance) || 0;
                  const collectedCash = trip.finances?.collectedCash !== undefined
                    ? Number(trip.finances.collectedCash)
                    : (Number(trip.finances?.totalCollected) || 0);
                  const collectedChecks = Number(trip.finances?.collectedChecks) || 0;
                  const collectedTransfers = Number(trip.finances?.collectedTransfers) || 0;
                  const totalCollectedAll = collectedCash + collectedChecks + collectedTransfers;

                  const merchOut = Number(trip.departure?.merchandiseValue) || 0;
                  const zoneDebt = Number(trip.departure?.zoneDebt) || 0;
                  const cashToReturn = cashAdvance + collectedCash - totalExpenses;

                  return (
                    <div
                      key={trip.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, trip.id)}
                      onClick={() => setSelectedTrip(trip)}
                      className={`bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] flex flex-col gap-2.5 group ${
                        draggedTripId === trip.id ? 'opacity-40 scale-95 border-orange-500 border-dashed' : 'opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-zinc-400 font-bold bg-black px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                          <CalIcon className="w-3 h-3 text-orange-400" /> {trip.date || 'Sin Fecha'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {urbanKm > 0 && (
                            <span className="text-[9px] font-black uppercase bg-orange-500/15 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded">
                              📍 +{urbanKm} km BRC
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTrip(e, trip.id, trip.zone)}
                            className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar viaje"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-black text-white text-base leading-snug group-hover:text-orange-400 transition-colors flex items-center gap-2">
                          <Truck className="w-4 h-4 text-orange-500 shrink-0" /> {trip.zone}
                        </h4>
                        {(trip.vehicle || trip.driver) && (
                          <p className="text-[11px] text-zinc-400 font-bold mt-1 flex items-center gap-2">
                            {trip.vehicle && <span>🛻 {trip.vehicle}</span>}
                            {trip.driver && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {trip.driver}</span>}
                          </p>
                        )}
                      </div>

                      {/* Mini resumen de KM, Mercadería, Deuda, Combustible y Cobranzas */}
                      <div className="grid grid-cols-2 gap-1.5 bg-black/60 border border-zinc-800/80 rounded-lg p-2 text-[10px] font-bold">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>KM:</span>
                          <span className="text-white">{kmTraveled > 0 ? `${kmTraveled} km` : (kmOut > 0 ? `Sal: ${kmOut}` : '-')}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="flex items-center gap-0.5"><Fuel className="w-2.5 h-2.5 text-orange-400" /> Comb.:</span>
                          <span className="text-orange-300">
                            ${fuelExpenses.toLocaleString('es-AR')}{totalLiters > 0 ? ` (${totalLiters}L)` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span className="flex items-center gap-0.5"><Package className="w-2.5 h-2.5 text-amber-400" /> Reparto:</span>
                          <span className="text-amber-300">${merchOut.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Deuda Zona:</span>
                          <span className="text-rose-400">${zoneDebt.toLocaleString('es-AR')}</span>
                        </div>
                      </div>

                      {/* Pie de tarjeta con Cobrado Total y Efectivo en Mano */}
                      <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs pointer-events-none">
                        <div className="text-[10px] text-zinc-400 font-bold">
                          Cobrado Total: <span className="text-blue-400">${totalCollectedAll.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] text-zinc-500 font-bold uppercase">Efvo en mano</span>
                          <span className={`text-xs font-black ${cashToReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${cashToReturn.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isOver && draggedTripId && (
                  <div className="border-2 border-dashed border-orange-500/50 rounded-xl h-24 bg-orange-500/5 transition-all"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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