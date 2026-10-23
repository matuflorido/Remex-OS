import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, Plus, Wrench, Droplets, Fuel, Gauge, AlertTriangle,
  CheckCircle2, Trash2, Edit3, Navigation, Calendar, DollarSign,
  FileText, History, Sparkles, ShieldCheck, X, Save
} from 'lucide-react';
import {
  subscribeToVehicles,
  saveVehicleInDb,
  deleteVehicleInDb,
  subscribeToFleetLogs,
  addFleetLogInDb,
  deleteFleetLogInDb,
  subscribeToAllTrips
} from '../services/fleetService';
import TripSettlementModal from './TripSettlementModal';

const LOG_TYPES = [
  { id: 'mecanico', label: '🔧 Mecánico / Taller', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { id: 'service', label: '🛢️ Service (Aceite y Filtros)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'lavado', label: '🚿 Lavado / Limpieza', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'neumaticos', label: '🛞 Cubiertas / Auxilio / Parche', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { id: 'movimiento_bariloche', label: '📍 Movimiento en Bariloche (Entre Viajes)', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  { id: 'incidente_viaje', label: '🚨 Imprevisto / Auxilio en Ruta', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { id: 'otro', label: '📝 Otro Control en Remex', color: 'text-zinc-300 bg-zinc-800 border-zinc-700' }
];

export default function FleetVehiclesManager() {
  const [vehicles, setVehicles] = useState([]);
  const [fleetLogs, setFleetLogs] = useState([]);
  const [trips, setTrips] = useState([]);

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedTripModal, setSelectedTripModal] = useState(null);

  // Modal de Alta / Edición de Vehículo
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    plate: '',
    defaultDriver: '',
    currentKm: '',
    fuelLevel: 'Lleno',
    tankCapacityLiters: 75,
    consumptionL100: 10.5, // Litros cada 100 km
    nextServiceKm: '',
    status: 'Disponible',
    notes: ''
  });

  // Modal de Nuevo Registro (Mantenimiento / Lavado / Mecánico / Movimiento)
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    vehicleId: '',
    vehicleName: '',
    type: 'mecanico',
    date: new Date().toISOString().split('T')[0],
    km: '',
    cost: '',
    provider: '',
    location: 'En Remex (Bariloche)',
    description: ''
  });

  useEffect(() => {
    const unsubVeh = subscribeToVehicles(setVehicles);
    const unsubLogs = subscribeToFleetLogs(setFleetLogs);
    const unsubTrips = subscribeToAllTrips(setTrips);
    return () => {
      unsubVeh();
      unsubLogs();
      unsubTrips();
    };
  }, []);

  const handleOpenNewVehicle = (prefillSprinter = false) => {
    setEditingVehicle(null);
    if (prefillSprinter) {
      setVehicleForm({
        name: 'Sprinter',
        plate: '',
        defaultDriver: '',
        currentKm: 43250,
        fuelLevel: 'Lleno',
        tankCapacityLiters: 75,
        consumptionL100: 11,
        nextServiceKm: 50000,
        status: 'Disponible',
        notes: 'Unidad de reparto regional (El Bolsón / Línea Sur)'
      });
    } else {
      setVehicleForm({
        name: '',
        plate: '',
        defaultDriver: '',
        currentKm: '',
        fuelLevel: 'Lleno',
        tankCapacityLiters: 75,
        consumptionL100: 10.5,
        nextServiceKm: '',
        status: 'Disponible',
        notes: ''
      });
    }
    setShowVehicleModal(true);
  };

  const handleOpenEditVehicle = (veh) => {
    setEditingVehicle(veh);
    setVehicleForm({
      name: veh.name || '',
      plate: veh.plate || '',
      defaultDriver: veh.defaultDriver || '',
      currentKm: veh.currentKm || 0,
      fuelLevel: veh.fuelLevel || 'Lleno',
      tankCapacityLiters: veh.tankCapacityLiters || 75,
      consumptionL100: veh.consumptionL100 || 10.5,
      nextServiceKm: veh.nextServiceKm || '',
      status: veh.status || 'Disponible',
      notes: veh.notes || ''
    });
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.name.trim()) return;

    const cL100 = Number(vehicleForm.consumptionL100) || 10;
    const payload = {
      name: vehicleForm.name.trim(),
      plate: vehicleForm.plate.trim().toUpperCase(),
      defaultDriver: vehicleForm.defaultDriver.trim(),
      currentKm: Number(vehicleForm.currentKm) || 0,
      fuelLevel: vehicleForm.fuelLevel || 'Lleno',
      tankCapacityLiters: Number(vehicleForm.tankCapacityLiters) || 75,
      consumptionL100: cL100,
      kmPerLiter: cL100 > 0 ? Number((100 / cL100).toFixed(2)) : 0,
      nextServiceKm: Number(vehicleForm.nextServiceKm) || 0,
      status: vehicleForm.status || 'Disponible',
      notes: vehicleForm.notes.trim()
    };

    await saveVehicleInDb(editingVehicle?.id, payload);
    setShowVehicleModal(false);
  };

  const handleDeleteVehicle = async (veh) => {
    if (window.confirm(`¿Eliminar la unidad "${veh.name}" de la flota?`)) {
      await deleteVehicleInDb(veh.id);
    }
  };

  const handleOpenNewLog = (veh = null, defaultType = 'mecanico') => {
    const targetVeh = veh || vehicles[0] || null;
    setLogForm({
      vehicleId: targetVeh?.id || '',
      vehicleName: targetVeh?.name || '',
      type: defaultType,
      date: new Date().toISOString().split('T')[0],
      km: targetVeh?.currentKm || '',
      cost: '',
      provider: '',
      location: 'En Remex (Bariloche)',
      description: ''
    });
    setShowLogModal(true);
  };

  const handleSaveLog = async (e) => {
    e.preventDefault();
    if (!logForm.description.trim()) return;

    const veh = vehicles.find(v => v.id === logForm.vehicleId);
    const vehicleName = veh ? veh.name : (logForm.vehicleName || 'Unidad General');
    const kmNum = Number(logForm.km) || 0;

    await addFleetLogInDb({
      vehicleId: logForm.vehicleId || '',
      vehicleName,
      type: logForm.type,
      date: logForm.date || new Date().toISOString().split('T')[0],
      km: kmNum,
      cost: Number(logForm.cost) || 0,
      provider: logForm.provider.trim(),
      location: logForm.location,
      description: logForm.description.trim()
    });

    // Si el KM ingresado es mayor al actual del vehículo, actualizamos la ficha del vehículo
    if (veh && kmNum > (Number(veh.currentKm) || 0)) {
      const updatePayload = { currentKm: kmNum };
      if (logForm.type === 'service') {
        updatePayload.nextServiceKm = kmNum + 10000;
      }
      await saveVehicleInDb(veh.id, updatePayload);
    }

    setShowLogModal(false);
  };

  // =========================================================================
  // UNIFICACIÓN DEL HISTORIAL COMPLETO ("EL REGISTRO ENTERO DE TODO")
  // Combina:
  // 1) Registros de Mantenimiento / Lavado / Movimientos en Bariloche (fleet_logs)
  // 2) Viajes de Reparto (trips)
  // =========================================================================
  const unifiedTimeline = useMemo(() => {
    const items = [];

    // 1. Eventos de fleet_logs
    fleetLogs.forEach(log => {
      const typeMeta = LOG_TYPES.find(t => t.id === log.type) || LOG_TYPES[LOG_TYPES.length - 1];
      items.push({
        id: `log_${log.id}`,
        rawLogId: log.id,
        source: 'log',
        date: log.date || 'Sin fecha',
        vehicleId: log.vehicleId || '',
        vehicleName: log.vehicleName || 'Sin unidad',
        type: log.type || 'otro',
        badgeLabel: typeMeta.label,
        badgeColor: typeMeta.color,
        km: Number(log.km) || 0,
        kmDetail: log.kmFrom && log.kmTo
          ? `${Number(log.kmFrom).toLocaleString('es-AR')} → ${Number(log.kmTo).toLocaleString('es-AR')} km (+${Number(log.urbanKm || (log.kmTo - log.kmFrom)).toLocaleString('es-AR')} km)`
          : (log.km ? `${Number(log.km).toLocaleString('es-AR')} km` : '-'),
        cost: Number(log.cost) || 0,
        location: log.location || 'En Remex',
        title: log.description || typeMeta.label,
        subtitle: log.provider ? `Taller / Resp: ${log.provider}` : log.location
      });
    });

    // 2. Viajes operativos desde `trips`
    trips.forEach(trip => {
      const kmOut = Number(trip.departure?.km) || 0;
      const kmIn = Number(trip.return?.km) || 0;
      const kmTraveled = kmIn > 0 && kmOut > 0 ? Math.max(0, kmIn - kmOut) : 0;
      const expenses = trip.finances?.expenses || [];
      const totalExp = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const fuelExp = expenses
        .filter(e => e.isFuel || `${e.macroCategory} ${e.microCategory}`.toLowerCase().includes('combust'))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const totalLiters = expenses
        .filter(e => e.isFuel || `${e.macroCategory} ${e.microCategory}`.toLowerCase().includes('combust'))
        .reduce((s, e) => s + (Number(e.liters) || 0), 0);
      const merchVal = Number(trip.departure?.merchandiseValue) || 0;

      items.push({
        id: `trip_${trip.id}`,
        rawTrip: trip,
        source: 'trip',
        date: trip.date || 'Sin fecha',
        vehicleId: trip.vehicleId || '',
        vehicleName: trip.vehicle || 'Camioneta s/especificar',
        type: 'viaje_reparto',
        badgeLabel: `🚚 Viaje de Reparto (${trip.zone || 'Sin Zona'})`,
        badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        km: kmIn || kmOut,
        kmDetail: kmIn > 0
          ? `${kmOut.toLocaleString('es-AR')} → ${kmIn.toLocaleString('es-AR')} km (${kmTraveled.toLocaleString('es-AR')} km)`
          : (kmOut > 0 ? `Salió con ${kmOut.toLocaleString('es-AR')} km` : '-'),
        cost: totalExp,
        location: `Ruta: ${trip.zone || 'Sin Zona'}`,
        title: `Reparto a ${trip.zone} • Mercadería: $${merchVal.toLocaleString('es-AR')}`,
        subtitle: `Combustible: $${fuelExp.toLocaleString('es-AR')}${totalLiters > 0 ? ` (${totalLiters} Lts)` : ''} • Tanque: ${trip.departure?.fuelLevel || 'Lleno'} → ${trip.return?.fuelLevel || '-'}`
      });
    });

    // Filtrar por unidad y por tipo
    return items
      .filter(item => {
        if (selectedVehicleFilter !== 'ALL') {
          const matchById = item.vehicleId && item.vehicleId === selectedVehicleFilter;
          const selectedVeh = vehicles.find(v => v.id === selectedVehicleFilter);
          const matchByName = selectedVeh && item.vehicleName?.toLowerCase().includes(selectedVeh.name.toLowerCase());
          if (!matchById && !matchByName) return false;
        }
        if (selectedTypeFilter !== 'ALL' && item.type !== selectedTypeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const dbTime = new Date(b.date || 0).getTime();
        if (dbTime !== da) return dbTime - da;
        return (b.km || 0) - (a.km || 0);
      });
  }, [fleetLogs, trips, selectedVehicleFilter, selectedTypeFilter, vehicles]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-y-auto custom-scrollbar p-2 space-y-5">

      {/* CABECERA DE FLOTA Y BOTONES DE ACCIÓN */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-orange-500" />
            Flota de Vehículos, Mantenimiento y Bitácora Completa
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Controla el kilometraje de cada unidad, su consumo por km, movimientos en Bariloche entre viajes, lavados, mecánico y service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {vehicles.length === 0 && (
            <button
              onClick={() => handleOpenNewVehicle(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-black font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg"
            >
              <Sparkles className="w-4 h-4" /> Pre-cargar Sprinter (43.250 km)
            </button>
          )}
          <button
            onClick={() => handleOpenNewLog(null, 'mecanico')}
            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <Wrench className="w-4 h-4 text-orange-400" /> + Registrar Mantenimiento / Lavado
          </button>
          <button
            onClick={() => handleOpenNewVehicle(false)}
            className="bg-orange-600 hover:bg-orange-500 text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(249,115,22,0.25)]"
          >
            <Plus className="w-4 h-4" /> + Nueva Unidad de Flota
          </button>
        </div>
      </div>

      {/* TARJETAS DE UNIDADES REGISTRADAS EN LA FLOTA */}
      {vehicles.length === 0 ? (
        <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
          <Truck className="w-10 h-10 text-orange-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-black text-white">Aún no hay vehículos cargados en la Flota</h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-lg mx-auto">
            Registra el Sprinter o tus camionetas con su kilometraje actual, capacidad de litros del tanque y consumo por km para automatizar las hojas de ruta y detectar movimientos en Bariloche entre viajes.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => handleOpenNewVehicle(true)}
              className="bg-orange-600 hover:bg-orange-500 text-black font-black px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Cargar Sprinter (43.250 km - Tanque Lleno)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 shrink-0">
          {vehicles.map(veh => {
            const currentKm = Number(veh.currentKm) || 0;
            const nextService = Number(veh.nextServiceKm) || 0;
            const kmToService = nextService > 0 ? nextService - currentKm : null;
            const cL100 = Number(veh.consumptionL100) || 10.5;
            const kmPerL = cL100 > 0 ? (100 / cL100).toFixed(1) : '-';

            return (
              <div
                key={veh.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{veh.name}</h4>
                        {veh.plate && (
                          <span className="text-[10px] font-black bg-black border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded uppercase">
                            {veh.plate}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 font-bold">
                        {veh.defaultDriver ? `Chofer: ${veh.defaultDriver}` : 'Unidad Operativa Remex'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditVehicle(veh)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Editar Ficha de Unidad"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(veh)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Eliminar Unidad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Indicadores técnicos de la unidad */}
                <div className="grid grid-cols-3 gap-2 bg-black/60 border border-zinc-800/80 rounded-xl p-3 text-center">
                  <div>
                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">Odómetro Actual</span>
                    <span className="text-sm font-black text-white">{currentKm.toLocaleString('es-AR')} km</span>
                  </div>
                  <div className="border-x border-zinc-800">
                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">Tanque ({veh.tankCapacityLiters || 75}L)</span>
                    <span className="text-sm font-black text-orange-400">{veh.fuelLevel || 'Lleno'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-zinc-500 uppercase">Consumo Ficha</span>
                    <span className="text-xs font-black text-emerald-400">{cL100} L/100km</span>
                    <span className="block text-[9px] text-zinc-500 font-bold">({kmPerL} km/L)</span>
                  </div>
                </div>

                {kmToService !== null && (
                  <div className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border flex items-center justify-between ${
                    kmToService <= 1000
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}>
                    <span>Próximo Service: {nextService.toLocaleString('es-AR')} km</span>
                    <span className="font-black">
                      {kmToService > 0 ? `Faltan ${kmToService.toLocaleString('es-AR')} km` : `⚠️ Pasado por ${Math.abs(kmToService)} km`}
                    </span>
                  </div>
                )}

                {/* Botones rápidos de acción sobre esta unidad */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleOpenNewLog(veh, 'mecanico')}
                    className="flex-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Wrench className="w-3 h-3 text-red-400" /> Mecánico
                  </button>
                  <button
                    onClick={() => handleOpenNewLog(veh, 'lavado')}
                    className="flex-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Droplets className="w-3 h-3 text-cyan-400" /> Lavado
                  </button>
                  <button
                    onClick={() => handleOpenNewLog(veh, 'service')}
                    className="flex-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Fuel className="w-3 h-3 text-amber-400" /> Service
                  </button>
                  <button
                    onClick={() => setSelectedVehicleFilter(selectedVehicleFilter === veh.id ? 'ALL' : veh.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors ${
                      selectedVehicleFilter === veh.id
                        ? 'bg-orange-500 text-black'
                        : 'bg-black border border-zinc-800 text-orange-400 hover:border-orange-500/40'
                    }`}
                  >
                    Ver Historial
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BITÁCORA COMPLETA ("EL REGISTRO ENTERO DE TODO") */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col min-h-[320px]">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 pb-4 mb-4 border-b border-zinc-800">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" />
              Bitácora Completa de Flota (Viajes, Movimientos en Bariloche, Mecánico y Lavados)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Aquí queda registrado absolutamente todo lo que pasa con cada vehículo: viajes de reparto, diferencias de KM en Bariloche entre viajes, mantenimientos y lavados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="bg-black border border-zinc-800 text-zinc-200 font-bold px-3 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
            >
              <option value="ALL">Todas las Unidades</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} {v.plate ? `(${v.plate})` : ''}</option>)}
            </select>

            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-black border border-zinc-800 text-zinc-200 font-bold px-3 py-2 rounded-xl text-xs outline-none focus:border-orange-500"
            >
              <option value="ALL">Todos los Registros ({unifiedTimeline.length})</option>
              <option value="viaje_reparto">🚚 Viajes de Reparto</option>
              <option value="movimiento_bariloche">📍 Movimientos en Bariloche (Entre Viajes)</option>
              <option value="mecanico">🔧 Mecánico / Taller</option>
              <option value="service">🛢️ Service (Aceite / Filtros)</option>
              <option value="lavado">🚿 Lavado / Limpieza</option>
              <option value="incidente_viaje">🚨 Auxilio / Arreglo en Viaje</option>
            </select>
          </div>
        </div>

        {unifiedTimeline.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-10">
            <History className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-bold">No hay eventos registrados para este filtro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Unidad</th>
                  <th className="py-2.5 px-3">Tipo de Registro</th>
                  <th className="py-2.5 px-3">Detalle / Observación</th>
                  <th className="py-2.5 px-3 text-right">Kilometraje</th>
                  <th className="py-2.5 px-3 text-right">Costo / Gasto</th>
                  <th className="py-2.5 px-2 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs font-bold">
                {unifiedTimeline.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      if (item.source === 'trip' && item.rawTrip) {
                        setSelectedTripModal(item.rawTrip);
                      }
                    }}
                    className={`transition-colors ${item.source === 'trip' ? 'hover:bg-zinc-800/60 cursor-pointer' : 'hover:bg-zinc-800/30'}`}
                  >
                    <td className="py-3 px-3 text-zinc-300 whitespace-nowrap">{item.date}</td>
                    <td className="py-3 px-3 text-white font-black whitespace-nowrap">🛻 {item.vehicleName}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border ${item.badgeColor}`}>
                        {item.badgeLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-zinc-200">{item.title}</div>
                      {item.subtitle && <div className="text-[10px] text-zinc-500">{item.subtitle}</div>}
                    </td>
                    <td className="py-3 px-3 text-right text-orange-400 font-black whitespace-nowrap">
                      {item.kmDetail}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {item.cost > 0 ? (
                        <span className="text-red-400 font-black">-${item.cost.toLocaleString('es-AR')}</span>
                      ) : (
                        <span className="text-zinc-600">$0</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {item.source === 'log' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Eliminar este registro del historial?')) {
                              await deleteFleetLogInDb(item.rawLogId);
                            }
                          }}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE ALTA / EDICIÓN DE VEHÍCULO */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[350] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex justify-between items-center">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-500" />
                {editingVehicle ? `Editar Unidad: ${editingVehicle.name}` : 'Registrar Unidad en la Flota'}
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="p-1.5 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre / Modelo de Unidad *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sprinter / Hilux..."
                    value={vehicleForm.name}
                    onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Patente / Dominio</label>
                  <input
                    type="text"
                    placeholder="Ej. AF 123 CD"
                    value={vehicleForm.plate}
                    onChange={e => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white uppercase outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Kilometraje Actual (Odómetro) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej. 43250"
                    value={vehicleForm.currentKm}
                    onChange={e => setVehicleForm({ ...vehicleForm, currentKm: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-black text-orange-400 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Estado Actual del Tanque</label>
                  <select
                    value={vehicleForm.fuelLevel}
                    onChange={e => setVehicleForm({ ...vehicleForm, fuelLevel: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-500"
                  >
                    <option value="Lleno">Tanque Lleno</option>
                    <option value="3/4">3/4 Tanque</option>
                    <option value="1/2">1/2 Tanque</option>
                    <option value="1/4">1/4 Tanque</option>
                    <option value="Reserva">Reserva</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-black text-orange-400 uppercase mb-1">
                    Capacidad del Tanque (Litros)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 75"
                    value={vehicleForm.tankCapacityLiters}
                    onChange={e => setVehicleForm({ ...vehicleForm, tankCapacityLiters: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-400 uppercase mb-1">
                    Consumo cada 100 KM (Litros)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 11"
                    value={vehicleForm.consumptionL100}
                    onChange={e => setVehicleForm({ ...vehicleForm, consumptionL100: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                  />
                  {Number(vehicleForm.consumptionL100) > 0 && (
                    <span className="block text-[10px] text-zinc-400 font-bold mt-1">
                      Equivale a {(100 / Number(vehicleForm.consumptionL100)).toFixed(1)} km por litro
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Chofer Habitual</label>
                  <input
                    type="text"
                    placeholder="Nombre..."
                    value={vehicleForm.defaultDriver}
                    onChange={e => setVehicleForm({ ...vehicleForm, defaultDriver: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Próximo Service (KM)</label>
                  <input
                    type="number"
                    placeholder="Ej. 50000"
                    value={vehicleForm.nextServiceKm}
                    onChange={e => setVehicleForm({ ...vehicleForm, nextServiceKm: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> GUARDAR UNIDAD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR MANTENIMIENTO / LAVADO / MECÁNICO / EVENTO */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[350] flex justify-center items-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/60 flex justify-between items-center">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Registrar Mantenimiento, Lavado o Evento de Flota
              </h3>
              <button onClick={() => setShowLogModal(false)} className="p-1.5 text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Vehículo</label>
                  <select
                    value={logForm.vehicleId}
                    onChange={e => {
                      const v = vehicles.find(x => x.id === e.target.value);
                      setLogForm({
                        ...logForm,
                        vehicleId: e.target.value,
                        vehicleName: v?.name || '',
                        km: v?.currentKm || logForm.km
                      });
                    }}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                  >
                    <option value="">-- Seleccionar Unidad --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.currentKm} km)</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tipo de Registro</label>
                  <select
                    value={logForm.type}
                    onChange={e => setLogForm({ ...logForm, type: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                  >
                    {LOG_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={logForm.date}
                    onChange={e => setLogForm({ ...logForm, date: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Kilometraje</label>
                  <input
                    type="number"
                    placeholder="Ej. 43250"
                    value={logForm.km}
                    onChange={e => setLogForm({ ...logForm, km: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-orange-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Costo ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={logForm.cost}
                    onChange={e => setLogForm({ ...logForm, cost: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-red-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Lugar / Contexto</label>
                  <select
                    value={logForm.location}
                    onChange={e => setLogForm({ ...logForm, location: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="En Remex (Bariloche)">En Remex (Bariloche)</option>
                    <option value="En Taller Externo (Bariloche)">En Taller Externo (Bariloche)</option>
                    <option value="En Viaje / En Ruta">Durante un Viaje / En Ruta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Taller / Responsable (Op)</label>
                  <input
                    type="text"
                    placeholder="Ej. Lubricentro / Lavadero..."
                    value={logForm.provider}
                    onChange={e => setLogForm({ ...logForm, provider: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Descripción del trabajo o novedad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lavado completo chasis y carrocería / Cambio pastillas de freno..."
                  value={logForm.description}
                  onChange={e => setLogForm({ ...logForm, description: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-500 text-black font-black px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> GUARDAR EN BITÁCORA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTripModal && (
        <TripSettlementModal
          eventId={selectedTripModal.id}
          zoneName={selectedTripModal.zone}
          onClose={() => setSelectedTripModal(null)}
        />
      )}
    </div>
  );
}
