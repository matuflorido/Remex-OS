import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Truck, Fuel, DollarSign, Receipt, MapPin, CheckCircle2, Plus, Trash2,
  Save, Navigation, Package, ShieldCheck, AlertTriangle, User, Gauge,
  TrendingUp, Utensils, BedDouble, Wrench, CreditCard, Landmark, Banknote
} from 'lucide-react';
import {
  subscribeToTrip,
  updateTripInDb,
  ensureTripExists,
  subscribeToVehicles,
  saveVehicleInDb,
  subscribeToAllTrips,
  setDeterministicFleetLogInDb
} from '../services/fleetService';

const FUEL_FRACTIONS = {
  'Reserva': 0.10,
  '1/4': 0.25,
  '1/2': 0.50,
  '3/4': 0.75,
  'Lleno': 1.00
};

const PRESET_EXPENSE_TYPES = [
  { id: 'Combustible', label: '⛽ Combustible', macro: 'Pre-cargados de Viaje', micro: 'Combustible', isFuel: true, isMaintenance: false },
  { id: 'Comida', label: '🍽️ Comida', macro: 'Pre-cargados de Viaje', micro: 'Comida', isFuel: false, isMaintenance: false },
  { id: 'Alojamiento', label: '🏨 Alojamiento', macro: 'Pre-cargados de Viaje', micro: 'Alojamiento', isFuel: false, isMaintenance: false },
  { id: 'Mecanico', label: '🔧 Mecánico / Ruta', macro: 'Mantenimiento y Otros', micro: 'Mecánico / Auxilio en Ruta', isFuel: false, isMaintenance: true },
  { id: 'Otro', label: '➕ Otro (Manual)', macro: 'Mantenimiento y Otros', micro: 'Otros Manuales', isFuel: false, isMaintenance: false }
];

export default function TripSettlementModal({ eventId, zoneName, onClose }) {
  const [trip, setTrip] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [allTrips, setAllTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para carga de gastos pre-cargados y manuales
  const [selectedPreset, setSelectedPreset] = useState('Combustible');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    liters: '',
    customConcept: '',
    description: ''
  });

  useEffect(() => {
    let unsubscribeTrip;
    let unsubscribeVehicles;
    let unsubscribeAllTrips;

    const initialize = async () => {
      await ensureTripExists(eventId, zoneName);

      unsubscribeTrip = subscribeToTrip(eventId, (data) => {
        setTrip(data);
        setLoading(false);
      });

      unsubscribeVehicles = subscribeToVehicles((list) => {
        setVehicles(list || []);
      });

      unsubscribeAllTrips = subscribeToAllTrips((list) => {
        setAllTrips(list || []);
      });
    };

    initialize();
    return () => {
      if (unsubscribeTrip) unsubscribeTrip();
      if (unsubscribeVehicles) unsubscribeVehicles();
      if (unsubscribeAllTrips) unsubscribeAllTrips();
    };
  }, [eventId, zoneName]);

  // Si hay vehículos en la flota y el viaje aún no tiene vehículo asignado, vincular si coincide por nombre o si solo hay 1
  const selectedVehicleObj = useMemo(() => {
    if (!trip || vehicles.length === 0) return null;
    if (trip.vehicleId) {
      const byId = vehicles.find(v => v.id === trip.vehicleId);
      if (byId) return byId;
    }
    if (trip.vehicle) {
      const byName = vehicles.find(v => v.name.toLowerCase() === trip.vehicle.toLowerCase());
      if (byName) return byName;
    }
    return null;
  }, [trip, vehicles]);

  // Buscar el último KM de llegada del viaje anterior de esta misma camioneta para detectar Movimientos en Bariloche entre viajes
  const previousTripArrivalKm = useMemo(() => {
    if (!trip) return 0;
    const vehId = trip.vehicleId || selectedVehicleObj?.id || '';
    const vehName = (trip.vehicle || selectedVehicleObj?.name || '').toLowerCase().trim();
    if (!vehId && !vehName) return 0;

    // Buscar otros viajes anteriores de la misma unidad que tengan return.km > 0
    const otherTrips = allTrips.filter(t => {
      if (t.id === trip.id) return false;
      const tReturnKm = Number(t.return?.km) || 0;
      if (tReturnKm <= 0) return false;
      const matchId = vehId && t.vehicleId === vehId;
      const matchName = vehName && (t.vehicle || '').toLowerCase().trim() === vehName;
      return matchId || matchName;
    });

    const kmOutCurrent = Number(trip.departure?.km) || 0;

    // Tomamos el mayor return.km que sea menor o igual al km de salida actual (o el último registrado)
    let bestPrevKm = 0;
    otherTrips.forEach(t => {
      const rKm = Number(t.return?.km) || 0;
      if (kmOutCurrent > 0) {
        if (rKm <= kmOutCurrent && rKm > bestPrevKm) {
          bestPrevKm = rKm;
        }
      } else if (rKm > bestPrevKm) {
        bestPrevKm = rKm;
      }
    });

    // Si no había viaje previo pero el vehículo tenía guardado un lastArrivalKm menor al de salida
    if (bestPrevKm === 0 && selectedVehicleObj?.lastArrivalKm) {
      const lastArr = Number(selectedVehicleObj.lastArrivalKm) || 0;
      if (kmOutCurrent === 0 || lastArr <= kmOutCurrent) {
        bestPrevKm = lastArr;
      }
    }

    return bestPrevKm;
  }, [trip, allTrips, selectedVehicleObj]);

  const handleSelectVehicle = (vehId) => {
    const veh = vehicles.find(v => v.id === vehId);
    if (!veh) {
      setTrip(prev => ({ ...prev, vehicleId: '', vehicle: '' }));
      return;
    }
    setTrip(prev => ({
      ...prev,
      vehicleId: veh.id,
      vehicle: veh.name,
      driver: prev.driver || veh.defaultDriver || '',
      departure: {
        ...(prev.departure || {}),
        km: prev.departure?.km || veh.currentKm || '',
        fuelLevel: prev.departure?.fuelLevel || veh.fuelLevel || 'Lleno'
      }
    }));
  };

  const handleUpdateRoot = (field, value) => {
    setTrip(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateNested = (section, field, value, isText = false) => {
    setTrip(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: isText ? value : (value === '' ? '' : (Number(value) ?? value))
      }
    }));
  };

  const handleUpdateCashCollected = (val) => {
    const numVal = val === '' ? '' : (Number(val) || 0);
    setTrip(prev => ({
      ...prev,
      finances: {
        ...(prev.finances || {}),
        collectedCash: numVal,
        totalCollected: Number(val) || 0
      }
    }));
  };

  const handleAddExpense = () => {
    const presetObj = PRESET_EXPENSE_TYPES.find(p => p.id === selectedPreset) || PRESET_EXPENSE_TYPES[0];
    const amountNum = Number(newExpense.amount) || 0;
    const litersNum = Number(newExpense.liters) || 0;

    if (amountNum <= 0) return;
    // En combustible se pide cargar el total y los litros cargados
    if (presetObj.isFuel && litersNum <= 0) {
      alert('Por favor ingresa la cantidad de litros cargados de combustible.');
      return;
    }
    if (selectedPreset === 'Otro' && !newExpense.customConcept.trim() && !newExpense.description.trim()) {
      alert('Por favor escribe el concepto del gasto manual.');
      return;
    }

    const conceptLabel = selectedPreset === 'Otro'
      ? (newExpense.customConcept.trim() || 'Gasto Manual')
      : presetObj.micro;

    const defaultDesc = presetObj.isFuel
      ? `Carga Combustible (${litersNum} Lts)${newExpense.description.trim() ? ` - ${newExpense.description.trim()}` : ''}`
      : (newExpense.description.trim() || conceptLabel);

    const expenseItem = {
      id: Date.now(),
      macroCategory: presetObj.macro,
      microCategory: conceptLabel,
      amount: amountNum,
      liters: presetObj.isFuel ? litersNum : 0,
      isFuel: presetObj.isFuel,
      isMaintenance: presetObj.isMaintenance,
      description: defaultDesc
    };

    setTrip(prev => ({
      ...prev,
      finances: {
        ...(prev.finances || {}),
        expenses: [...(prev.finances?.expenses || []), expenseItem]
      }
    }));

    setNewExpense({ amount: '', liters: '', customConcept: '', description: '' });
  };

  const handleRemoveExpense = (expenseId) => {
    setTrip(prev => ({
      ...prev,
      finances: {
        ...(prev.finances || {}),
        expenses: (prev.finances?.expenses || []).filter(e => e.id !== expenseId)
      }
    }));
  };

  // Cálculos principales en tiempo real
  const kmOut = Number(trip?.departure?.km) || 0;
  const kmIn = Number(trip?.return?.km) || 0;
  const kmTraveled = kmIn > 0 && kmOut > 0 ? kmIn - kmOut : 0;

  // Diferencia entre viajes (Movimiento en Bariloche)
  const prevArrivalKm = previousTripArrivalKm || Number(trip?.departure?.previousArrivalKm) || 0;
  const urbanKmBariloche = prevArrivalKm > 0 && kmOut > prevArrivalKm ? (kmOut - prevArrivalKm) : 0;

  // Datos técnicos de la unidad (Capacidad tanque y Consumo cada 100 km)
  const tankCapacity = Number(selectedVehicleObj?.tankCapacityLiters) || 75;
  const unitConsumptionL100 = Number(selectedVehicleObj?.consumptionL100) || 10.5;
  const unitKmPerLiter = unitConsumptionL100 > 0 ? (100 / unitConsumptionL100) : 9.5;

  const isFuelCategory = (macro = '', micro = '') => {
    const str = `${macro} ${micro}`.toLowerCase();
    return str.includes('combust') || str.includes('nafta') || str.includes('gasoil') || str.includes('ypf') || str.includes('diesel');
  };

  const expensesList = trip?.finances?.expenses || [];
  const totalExpenses = expensesList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const fuelExpenses = expensesList
    .filter(e => e.isFuel || isFuelCategory(e.macroCategory, e.microCategory))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalLitersLoaded = expensesList
    .filter(e => e.isFuel || isFuelCategory(e.macroCategory, e.microCategory))
    .reduce((acc, curr) => acc + (Number(curr.liters) || 0), 0);

  const foodExpenses = expensesList
    .filter(e => `${e.microCategory}`.toLowerCase().includes('comida'))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const lodgingExpenses = expensesList
    .filter(e => `${e.microCategory}`.toLowerCase().includes('alojamiento') || `${e.microCategory}`.toLowerCase().includes('hospedaje'))
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const otherExpenses = totalExpenses - fuelExpenses - foodExpenses - lodgingExpenses;

  // Estimación de combustible según ficha del vehículo
  const expectedLitersForTrip = kmTraveled > 0 ? (kmTraveled * unitConsumptionL100) / 100 : 0;
  const startLitersInTank = (FUEL_FRACTIONS[trip?.departure?.fuelLevel || 'Lleno'] ?? 1) * tankCapacity;
  const endLitersInTank = (FUEL_FRACTIONS[trip?.return?.fuelLevel || '1/2'] ?? 0.5) * tankCapacity;
  // Litros reales usados = Litros en tanque al salir + Litros cargados en estación - Litros en tanque al volver
  const estimatedRealLitersUsed = kmTraveled > 0
    ? Math.max(0, startLitersInTank + totalLitersLoaded - endLitersInTank)
    : 0;
  const realConsumptionL100 = kmTraveled > 0 && estimatedRealLitersUsed > 0
    ? (estimatedRealLitersUsed / kmTraveled) * 100
    : 0;

  // Mercadería y Deuda de la Zona
  const merchOut = Number(trip?.departure?.merchandiseValue) || 0;
  const zoneDebtOut = Number(trip?.departure?.zoneDebt) || 0;
  const totalZoneExigible = zoneDebtOut + merchOut;

  // Cobranzas separadas: Efectivo, Cheques y Transferencias
  const collectedCash = trip?.finances?.collectedCash !== undefined && trip?.finances?.collectedCash !== ''
    ? Number(trip.finances.collectedCash)
    : (Number(trip?.finances?.totalCollected) || 0);
  const collectedChecks = Number(trip?.finances?.collectedChecks) || 0;
  const collectedTransfers = Number(trip?.finances?.collectedTransfers) || 0;
  const totalAllCollections = collectedCash + collectedChecks + collectedTransfers;

  // Saldo restante de deuda en la zona
  const remainingZoneDebt = Math.max(0, totalZoneExigible - totalAllCollections);

  // Arqueo de Efectivo Físico en Mano ("Lo que se trajo en billetes")
  const cashAdvance = Number(trip?.departure?.cashAdvance) || 0;
  const cashToRenderInHand = cashAdvance + collectedCash - totalExpenses;

  const hasActualCash = trip?.return?.actualCashReturned !== undefined && trip?.return?.actualCashReturned !== '';
  const actualCash = hasActualCash ? Number(trip.return.actualCashReturned) : null;
  const cashDiff = actualCash !== null ? actualCash - cashToRenderInHand : 0;

  const handleSave = async () => {
    setIsSaving(true);
    const updatedDeparture = {
      ...(trip.departure || {}),
      previousArrivalKm: prevArrivalKm,
      urbanKmBariloche
    };

    const updatedFinances = {
      ...(trip.finances || {}),
      collectedCash,
      totalCollected: collectedCash, // mantenemos compatibilidad
      collectedChecks,
      collectedTransfers,
      totalAllCollections
    };

    await updateTripInDb(trip.id, {
      status: trip.status,
      vehicleId: trip.vehicleId || selectedVehicleObj?.id || '',
      vehicle: trip.vehicle || selectedVehicleObj?.name || '',
      driver: trip.driver || '',
      date: trip.date || new Date().toISOString().split('T')[0],
      zone: trip.zone || zoneName || 'Sin Zona',
      departure: updatedDeparture,
      return: trip.return || {},
      finances: updatedFinances
    });

    // 1. Si hubo diferencia de KM entre el viaje anterior y la salida de este viaje, registrarlo automáticamente como Movimiento en Bariloche
    const targetVehId = trip.vehicleId || selectedVehicleObj?.id || '';
    const targetVehName = trip.vehicle || selectedVehicleObj?.name || 'Unidad';
    if (urbanKmBariloche > 0 && kmOut > 0) {
      await setDeterministicFleetLogInDb(`urban_${trip.id}`, {
        vehicleId: targetVehId,
        vehicleName: targetVehName,
        type: 'movimiento_bariloche',
        date: trip.date || new Date().toISOString().split('T')[0],
        km: kmOut,
        kmFrom: prevArrivalKm,
        kmTo: kmOut,
        urbanKm: urbanKmBariloche,
        cost: 0,
        location: 'Bariloche (Entre Viajes)',
        description: `Movimiento en Bariloche entre viajes (${prevArrivalKm.toLocaleString('es-AR')} → ${kmOut.toLocaleString('es-AR')} km = +${urbanKmBariloche.toLocaleString('es-AR')} km antes de salir a ${trip.zone})`
      });
    }

    // 2. Si cargaron algún gasto de Mecánico / Auxilio en Ruta dentro del viaje, guardarlo en la Bitácora de la Flota
    const maintExpenses = expensesList.filter(e => e.isMaintenance || `${e.microCategory}`.toLowerCase().includes('mecánic') || `${e.microCategory}`.toLowerCase().includes('mecanico'));
    for (const mExp of maintExpenses) {
      await setDeterministicFleetLogInDb(`tripmaint_${trip.id}_${mExp.id}`, {
        vehicleId: targetVehId,
        vehicleName: targetVehName,
        type: 'incidente_viaje',
        date: trip.date || new Date().toISOString().split('T')[0],
        km: kmIn || kmOut,
        cost: Number(mExp.amount) || 0,
        location: `En Viaje (${trip.zone})`,
        description: `Mantenimiento / Auxilio en viaje a ${trip.zone}: ${mExp.description}`
      });
    }

    // 3. Actualizar el odómetro y estado del tanque de la unidad en `fleet_vehicles`
    if (selectedVehicleObj) {
      const latestKm = Math.max(Number(selectedVehicleObj.currentKm) || 0, kmIn, kmOut);
      const updateVeh = {
        currentKm: latestKm,
        fuelLevel: kmIn > 0 ? (trip.return?.fuelLevel || '1/2') : (trip.departure?.fuelLevel || 'Lleno')
      };
      if (kmIn > 0) {
        updateVeh.lastArrivalKm = kmIn;
      }
      await saveVehicleInDb(selectedVehicleObj.id, updateVeh);
    }

    setIsSaving(false);
    onClose();
  };

  if (loading || !trip) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center">
        <div className="text-orange-500 font-bold animate-pulse tracking-widest text-sm">CARGANDO HOJA DE RUTA...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-2 sm:p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-[1380px] shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[96vh]">

        {/* CABECERA: ZONA, FECHA, SELECCIÓN DE UNIDAD DE FLOTA Y CHOFER */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest border border-zinc-700 bg-black px-2 py-0.5 rounded">
                ID: {trip.id.slice(0, 8)}
              </span>
              <span className="text-[10px] text-orange-400 font-black uppercase tracking-widest bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/30">
                Destino: {trip.zone}
              </span>
              <input
                type="date"
                value={trip.date || ''}
                onChange={(e) => handleUpdateRoot('date', e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-0.5 text-[11px] font-bold text-zinc-300 focus:border-orange-500 outline-none"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Truck className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
              Hoja de Ruta y Liquidación de Viaje ({trip.zone})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Vehículo de la Flota */}
            <div className="bg-black/90 border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <label className="block text-[9px] font-black text-zinc-500 uppercase">Unidad de Flota</label>
                {vehicles.length > 0 ? (
                  <select
                    value={trip.vehicleId || selectedVehicleObj?.id || ''}
                    onChange={(e) => handleSelectVehicle(e.target.value)}
                    className="bg-transparent text-xs font-black text-white outline-none pr-2"
                  >
                    <option value="" className="bg-zinc-900">-- Elegir Unidad --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id} className="bg-zinc-900">
                        {v.name} {v.plate ? `(${v.plate})` : ''} - {v.currentKm} km
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={trip.vehicle || ''}
                    onChange={(e) => handleUpdateRoot('vehicle', e.target.value)}
                    placeholder="Ej. Sprinter..."
                    className="bg-transparent text-xs font-bold text-white outline-none w-32 placeholder:text-zinc-700"
                  />
                )}
              </div>
            </div>

            <div className="bg-black/90 border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <label className="block text-[9px] font-black text-zinc-500 uppercase">Chofer / Viajante</label>
                <input
                  type="text"
                  value={trip.driver || ''}
                  onChange={(e) => handleUpdateRoot('driver', e.target.value)}
                  placeholder="Nombre..."
                  className="bg-transparent text-xs font-bold text-white outline-none w-32 placeholder:text-zinc-700"
                />
              </div>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors ml-auto lg:ml-0">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* CUERPO EN 3 COLUMNAS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/60">

            {/* =========================================================
                COLUMNA 1: SALIDA (ODÓMETRO, TANQUE, MERCADERÍA Y DEUDA EN ZONA)
               ========================================================= */}
            <div className="space-y-4 lg:pr-5">
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                <Navigation className="w-4 h-4 text-orange-500" /> 1. Datos de Salida (Ej. Rumbo a {trip.zone})
              </h3>

              {/* A. Kilometraje, Tanque de Salida y Detección de Movimiento en Bariloche */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-orange-500" /> Kilometraje y Tanque al Salir
                  </span>
                  {selectedVehicleObj && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      Tanque {tankCapacity}L • {unitConsumptionL100} L/100km
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">KM al Salir</label>
                    <input
                      type="number"
                      value={trip.departure?.km || ''}
                      onChange={(e) => handleUpdateNested('departure', 'km', e.target.value)}
                      placeholder="Ej. 43250"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-black text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-orange-400" /> Tanque al Salir
                    </label>
                    <select
                      value={trip.departure?.fuelLevel || 'Lleno'}
                      onChange={(e) => handleUpdateNested('departure', 'fuelLevel', e.target.value, true)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-orange-500 outline-none"
                    >
                      <option value="Lleno">Tanque Lleno ({tankCapacity} Lts)</option>
                      <option value="3/4">3/4 Tanque (~{Math.round(tankCapacity * 0.75)} Lts)</option>
                      <option value="1/2">1/2 Tanque (~{Math.round(tankCapacity * 0.5)} Lts)</option>
                      <option value="1/4">1/4 Tanque (~{Math.round(tankCapacity * 0.25)} Lts)</option>
                      <option value="Reserva">Reserva (~{Math.round(tankCapacity * 0.1)} Lts)</option>
                    </select>
                  </div>
                </div>

                {/* Alerta automática si el KM de salida es distinto al KM con que llegó del viaje anterior */}
                {urbanKmBariloche > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5 text-[11px] text-orange-300 font-bold flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-orange-400 block">
                        +{urbanKmBariloche.toLocaleString('es-AR')} km de Movimiento en Bariloche entre viajes
                      </span>
                      Llegó del viaje anterior con {prevArrivalKm.toLocaleString('es-AR')} km y hoy sale con {kmOut.toLocaleString('es-AR')} km. Se registrará automáticamente en la bitácora de la unidad.
                    </div>
                  </div>
                )}
              </div>

              {/* B. Mercadería Vendida que Lleva + Deuda en la Zona */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Mercadería en Reparto y Deuda en {trip.zone}
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Mercadería que Lleva (Reparto Ya Vendido $)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                    <input
                      type="number"
                      value={trip.departure?.merchandiseValue || ''}
                      onChange={(e) => handleUpdateNested('departure', 'merchandiseValue', e.target.value)}
                      placeholder="Ej. 5000000"
                      className="w-full bg-black border border-amber-900/50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-black text-amber-400 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Deuda Acumulada en {trip.zone} al Salir ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                    <input
                      type="number"
                      value={trip.departure?.zoneDebt || ''}
                      onChange={(e) => handleUpdateNested('departure', 'zoneDebt', e.target.value)}
                      placeholder="Ej. 35000000"
                      className="w-full bg-black border border-rose-900/50 rounded-xl pl-9 pr-3 py-2.5 text-sm font-black text-rose-400 focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                {(merchOut > 0 || zoneDebtOut > 0) && (
                  <div className="bg-black/80 border border-zinc-800 rounded-xl px-3 py-2 flex justify-between items-center text-xs font-bold">
                    <span className="text-zinc-400">Total en Calle ({trip.zone}):</span>
                    <span className="text-white font-black">${totalZoneExigible.toLocaleString('es-AR')}</span>
                  </div>
                )}

                <input
                  type="text"
                  value={trip.departure?.merchandiseNotes || ''}
                  onChange={(e) => handleUpdateNested('departure', 'merchandiseNotes', e.target.value, true)}
                  placeholder="Notas de carga / Bultos / Remitos (opcional)..."
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:border-amber-500 outline-none"
                />
              </div>

              {/* C. Dinero en mano con el que sale (Viáticos / Cambio) */}
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-4">
                <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1.5">
                  💵 Efectivo con el que sale en mano (Viáticos / Cambio)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    type="number"
                    value={trip.departure?.cashAdvance || ''}
                    onChange={(e) => handleUpdateNested('departure', 'cashAdvance', e.target.value)}
                    placeholder="0"
                    className="w-full bg-black border border-emerald-800/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-emerald-400 font-black focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* =========================================================
                COLUMNA 2: GASTOS PRE-CARGADOS (COMBUSTIBLE, COMIDA, ALOJAMIENTO) Y MANUALES
               ========================================================= */}
            <div className="space-y-4 pt-6 lg:pt-0 lg:px-5 flex flex-col h-full">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-2.5 shrink-0">
                <Receipt className="w-4 h-4 text-blue-500" /> 2. Gastos del Viaje (Pre-cargados + Manuales)
              </h3>

              {/* Resumen rápido por rubro pre-cargado */}
              <div className="grid grid-cols-4 gap-2 shrink-0 text-center">
                <div className="bg-orange-950/20 border border-orange-900/40 rounded-xl p-2">
                  <span className="block text-[9px] font-black text-orange-400 uppercase">⛽ Combust.</span>
                  <span className="text-xs font-black text-white">${fuelExpenses.toLocaleString('es-AR')}</span>
                  <span className="block text-[9px] text-orange-300 font-bold">{totalLitersLoaded} Lts</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <span className="block text-[9px] font-black text-zinc-400 uppercase">🍽️ Comida</span>
                  <span className="text-xs font-black text-white">${foodExpenses.toLocaleString('es-AR')}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <span className="block text-[9px] font-black text-zinc-400 uppercase">🏨 Alojam.</span>
                  <span className="text-xs font-black text-white">${lodgingExpenses.toLocaleString('es-AR')}</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2">
                  <span className="block text-[9px] font-black text-zinc-400 uppercase">➕ Otros</span>
                  <span className="text-xs font-black text-white">${otherExpenses.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Selector de Gasto Pre-cargado o Manual */}
              <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 space-y-3 shrink-0">
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                  Selecciona el gasto a cargar:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {PRESET_EXPENSE_TYPES.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPreset(p.id)}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-black border text-left transition-all ${
                        selectedPreset === p.id
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                          : 'bg-black text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Campos dinámicos según el botón elegido */}
                {selectedPreset === 'Otro' && (
                  <input
                    type="text"
                    placeholder="Nombre del gasto manual (ej. Peaje, Lavado, Repuesto...)"
                    value={newExpense.customConcept}
                    onChange={e => setNewExpense({ ...newExpense, customConcept: e.target.value })}
                    className="w-full bg-black border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                  />
                )}

                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <div className="relative flex-1 min-w-[110px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      placeholder="Total ($)"
                      value={newExpense.amount}
                      onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                      className="w-full bg-black border border-zinc-700 rounded-xl pl-7 pr-2.5 py-2.5 text-xs font-black text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {selectedPreset === 'Combustible' && (
                    <div className="w-32 relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Litros *"
                        value={newExpense.liters}
                        onChange={e => setNewExpense({ ...newExpense, liters: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                        className="w-full bg-black border border-orange-500/60 rounded-xl px-3 py-2.5 text-xs font-black text-orange-400 outline-none focus:border-orange-500"
                      />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder={
                      selectedPreset === 'Combustible'
                        ? 'Estación / Nota (Op)'
                        : (selectedPreset === 'Mecanico' ? 'Qué se reparó en ruta...' : 'Detalle / Factura (Op)')
                    }
                    value={newExpense.description}
                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                    className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleAddExpense}
                    disabled={!newExpense.amount}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              </div>

              {/* Lista de gastos cargados en el viaje */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[200px] max-h-[320px] pr-1">
                {expensesList.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center py-8 opacity-60">
                    <Receipt className="w-7 h-7 mb-1.5" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sin gastos cargados todavía</p>
                  </div>
                ) : (
                  expensesList.map(exp => {
                    const isFuel = exp.isFuel || isFuelCategory(exp.macroCategory, exp.microCategory);
                    return (
                      <div
                        key={exp.id}
                        className={`bg-black border p-2.5 rounded-xl flex justify-between items-center group transition-colors ${
                          isFuel ? 'border-orange-900/50' : 'border-zinc-800'
                        }`}
                      >
                        <div className="flex flex-col overflow-hidden pr-2">
                          <span className="text-xs font-bold text-zinc-200 truncate flex items-center gap-1.5">
                            {isFuel && <Fuel className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                            {exp.description}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                            {exp.microCategory || exp.macroCategory}
                            {exp.liters > 0 && (
                              <span className="text-orange-400 ml-1.5">
                                • {exp.liters} Lts (${Math.round(exp.amount / exp.liters).toLocaleString('es-AR')}/L)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-black text-red-400">-${Number(exp.amount).toLocaleString('es-AR')}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-zinc-900 rounded-md"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 flex justify-between items-center shrink-0">
                <span className="text-xs font-black text-zinc-400 uppercase">Total Gastos del Viaje:</span>
                <span className="text-base font-black text-red-400">-${totalExpenses.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* =========================================================
                COLUMNA 3: REGRESO (KM LLEGADA, CONSUMO, EFECTIVO/CHEQUES/TRF Y ARQUEO)
               ========================================================= */}
            <div className="space-y-4 pt-6 lg:pt-0 lg:pl-5">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3. Regreso, Rendición y Deuda
              </h3>

              {/* A. Kilometraje de Llegada, Estado del Tanque y Cálculo de Consumo */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">KM al Llegar</label>
                    <input
                      type="number"
                      value={trip.return?.km || ''}
                      onChange={(e) => handleUpdateNested('return', 'km', e.target.value)}
                      placeholder="Ej. 43550"
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm font-black text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Tanque al Llegar</label>
                    <select
                      value={trip.return?.fuelLevel || '1/2'}
                      onChange={(e) => handleUpdateNested('return', 'fuelLevel', e.target.value, true)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-orange-500 outline-none"
                    >
                      <option value="Lleno">Tanque Lleno ({tankCapacity} Lts)</option>
                      <option value="3/4">3/4 Tanque (~{Math.round(tankCapacity * 0.75)} Lts)</option>
                      <option value="1/2">1/2 Tanque (~{Math.round(tankCapacity * 0.5)} Lts)</option>
                      <option value="1/4">1/4 Tanque (~{Math.round(tankCapacity * 0.25)} Lts)</option>
                      <option value="Reserva">Reserva (~{Math.round(tankCapacity * 0.1)} Lts)</option>
                    </select>
                  </div>
                </div>

                {kmTraveled > 0 && (
                  <div className="bg-black/80 border border-zinc-800 rounded-xl p-2.5 space-y-1 text-[11px] font-bold">
                    <div className="flex justify-between text-orange-400">
                      <span>Distancia Recorrida en Viaje:</span>
                      <span className="font-black">{kmTraveled.toLocaleString('es-AR')} km</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Consumo Teórico ({unitConsumptionL100} L/100km):</span>
                      <span className="text-zinc-200">{expectedLitersForTrip.toFixed(1)} Lts esperados</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Litros Cargados / Usados Est.:</span>
                      <span className="text-emerald-400">
                        {totalLitersLoaded} Lts cargados • ~{estimatedRealLitersUsed.toFixed(1)} Lts usados ({realConsumptionL100.toFixed(1)} L/100km)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* B. Dinero que Rinde: Efectivo, Cheques que trajo y Transferencias */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">
                  💰 Dinero y Valores Rendidos del Viaje
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[9px] font-black text-emerald-400 uppercase mb-1 flex items-center gap-1">
                      <Banknote className="w-3 h-3" /> 1. Efectivo ($)
                    </label>
                    <input
                      type="number"
                      value={trip.finances?.collectedCash ?? trip.finances?.totalCollected ?? ''}
                      onChange={(e) => handleUpdateCashCollected(e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-emerald-900/60 rounded-xl px-3 py-2 text-xs font-black text-emerald-400 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-amber-400 uppercase mb-1 flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> 2. Cheques Traídos ($)
                    </label>
                    <input
                      type="number"
                      value={trip.finances?.collectedChecks || ''}
                      onChange={(e) => handleUpdateNested('finances', 'collectedChecks', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-amber-900/60 rounded-xl px-3 py-2 text-xs font-black text-amber-400 focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-blue-400 uppercase mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> 3. Transferencias ($)
                    </label>
                    <input
                      type="number"
                      value={trip.finances?.collectedTransfers || ''}
                      onChange={(e) => handleUpdateNested('finances', 'collectedTransfers', e.target.value)}
                      placeholder="0"
                      className="w-full bg-black border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-black text-blue-400 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Resumen de Cobranza Total vs Deuda de la Zona */}
                <div className="bg-black/80 border border-zinc-800 rounded-xl p-2.5 space-y-1 text-[11px] font-bold">
                  <div className="flex justify-between text-zinc-300">
                    <span>Total Cobrado (Efvo + Cheques + Trf):</span>
                    <span className="text-blue-400 font-black">${totalAllCollections.toLocaleString('es-AR')}</span>
                  </div>
                  {(zoneDebtOut > 0 || merchOut > 0) && (
                    <div className="flex justify-between text-zinc-400 border-t border-zinc-800/80 pt-1">
                      <span>Deuda restante en {trip.zone} (${totalZoneExigible.toLocaleString('es-AR')} - Cobrado):</span>
                      <span className="text-rose-400 font-black">${remainingZoneDebt.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* C. Arqueo de Efectivo Físico en Mano ("Lo que se trajo en billetes") */}
              <div className="bg-zinc-950 border border-emerald-900/50 p-4 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.06)]">
                <h4 className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-2.5 border-b border-emerald-900/30 pb-1.5">
                  Arqueo de Efectivo Físico en Mano
                </h4>
                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Efectivo con que salió (+)</span>
                    <span className="text-white">${cashAdvance.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Efectivo cobrado en viaje (+)</span>
                    <span className="text-emerald-400">+${collectedCash.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-400/90 border-b border-zinc-800 pb-2">
                    <span>Total Gastos del viaje (-)</span>
                    <span className="text-red-400">-${totalExpenses.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-black text-white uppercase">EFECTIVO A ENTREGAR:</span>
                    <span className={`text-xl font-black tracking-tight ${cashToRenderInHand >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                      ${cashToRenderInHand.toLocaleString('es-AR')}
                    </span>
                  </div>
                  {collectedChecks > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-amber-400 pt-1">
                      <span>+ Cheques físicos en carpeta:</span>
                      <span className="font-black">${collectedChecks.toLocaleString('es-AR')}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">Estado del Viaje:</span>
            <select
              value={trip.status}
              onChange={(e) => setTrip({ ...trip, status: e.target.value })}
              className={`w-full sm:w-auto bg-black border rounded-xl px-4 py-2 text-xs font-bold outline-none transition-colors ${
                trip.status === 'liquidado' ? 'text-emerald-400 border-emerald-500/30' : 'text-orange-500 border-zinc-800'
              }`}
            >
              <option value="en_preparacion">En Preparación (Pre-viaje)</option>
              <option value="en_ruta">En Ruta (Viajando)</option>
              <option value="liquidado">Liquidado (Rendición Cerrada)</option>
            </select>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              CERRAR
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (kmIn > 0 && kmIn < kmOut)}
              className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
            >
              {isSaving ? 'GUARDANDO...' : <><Save className="w-4 h-4" /> GUARDAR Y ACTUALIZAR FLOTA</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}