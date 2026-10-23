import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, serverTimestamp, collection, query
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const DEFAULT_TRIP = {
  status: 'en_preparacion',
  vehicleId: '',
  vehicle: '',
  driver: '',
  departure: {
    km: 0,
    previousArrivalKm: 0,
    urbanKmBariloche: 0,
    fuelLevel: 'Lleno',
    vehicleStatus: 'Óptimo',
    checkOilWater: true,
    checkTires: true,
    checkLightsBrakes: true,
    checkCleanCargo: true,
    vehicleNotesOut: '',
    cashAdvance: 0,
    merchandiseValue: 0,
    merchandisePackages: 0,
    merchandiseNotes: '',
    zoneDebt: 0
  },
  return: {
    km: 0,
    fuelLevel: '1/2',
    vehicleCondition: 'Sin Novedades',
    vehicleNotesIn: '',
    merchandiseReturned: 0,
    actualCashReturned: ''
  },
  finances: {
    totalCollected: 0,      // Efectivo cobrado en mano
    collectedCash: 0,       // Efectivo cobrado en mano (espejo claro)
    collectedChecks: 0,     // Cheques traídos
    collectedTransfers: 0,  // Transferencias realizadas durante el viaje
    checksList: [],         // Detalle opcional de cheques/transferencias
    totalSold: 0,
    expenses: []
  }
};

export const DEFAULT_CATEGORIES = {
  "Pre-cargados de Viaje": ["Combustible", "Comida", "Alojamiento"],
  "Mantenimiento y Otros": ["Mecánico / Auxilio en Ruta", "Lavado", "Peajes", "Otros Manuales"]
};

// ==========================================
// VIAJES (HOJAS DE RUTA)
// ==========================================
export const createTripInDb = async (tripId, zoneName, dateStr, extraData = {}) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  await setDoc(tripRef, {
    zone: zoneName || 'Sin Zona',
    date: dateStr || new Date().toISOString().split('T')[0],
    ...DEFAULT_TRIP,
    ...extraData,
    createdAt: serverTimestamp()
  });
};

export const ensureTripExists = async (tripId, zoneName, dateStr) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  const snap = await getDoc(tripRef);

  if (!snap.exists()) {
    await createTripInDb(tripId, zoneName, dateStr);
  }
};

export const subscribeToTrip = (tripId, callback) => {
  if (!tripId) return () => {};

  const tripRef = doc(db, 'trips', tripId);
  return onSnapshot(tripRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

export const updateTripInDb = async (tripId, data) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  await updateDoc(tripRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTripInDb = async (tripId) => {
  if (!tripId) return;
  const tripRef = doc(db, 'trips', tripId);
  await deleteDoc(tripRef);
};

export const subscribeToAllTrips = (callback) => {
  const q = query(collection(db, 'trips'));
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    callback(trips);
  });
};

// ==========================================
// VEHÍCULOS DE LA FLOTA (UNIDADES)
// ==========================================
export const subscribeToVehicles = (callback) => {
  const q = query(collection(db, 'fleet_vehicles'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
};

export const saveVehicleInDb = async (vehicleId, data) => {
  const id = vehicleId || `veh_${Date.now()}`;
  const ref = doc(db, 'fleet_vehicles', id);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
};

export const deleteVehicleInDb = async (vehicleId) => {
  if (!vehicleId) return;
  await deleteDoc(doc(db, 'fleet_vehicles', vehicleId));
};

// ==========================================
// BITÁCORA / HISTORIAL DE FLOTA Y MANTENIMIENTO
// ==========================================
export const subscribeToFleetLogs = (callback) => {
  const q = query(collection(db, 'fleet_logs'));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    logs.sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const dbTime = new Date(b.date || 0).getTime();
      return dbTime - da;
    });
    callback(logs);
  });
};

export const addFleetLogInDb = async (logData) => {
  const colRef = collection(db, 'fleet_logs');
  const docRef = await addDoc(colRef, {
    ...logData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const setDeterministicFleetLogInDb = async (logId, logData) => {
  if (!logId) return;
  const ref = doc(db, 'fleet_logs', logId);
  await setDoc(ref, {
    ...logData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const deleteFleetLogInDb = async (logId) => {
  if (!logId) return;
  await deleteDoc(doc(db, 'fleet_logs', logId));
};

// ==========================================
// CATEGORÍAS DE GASTOS
// ==========================================
export const subscribeToExpenseCategories = (callback) => {
  const docRef = doc(db, 'settings', 'fleet_categories');
  return onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().categories);
    } else {
      await setDoc(docRef, { categories: DEFAULT_CATEGORIES });
      callback(DEFAULT_CATEGORIES);
    }
  });
};

export const updateExpenseCategoriesInDb = async (newCategories) => {
  const docRef = doc(db, 'settings', 'fleet_categories');
  await updateDoc(docRef, { categories: newCategories });
};