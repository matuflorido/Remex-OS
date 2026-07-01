import { collection, query, onSnapshot, doc, addDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';

// Escuchar en tiempo real a los clientes y proveedores
export const subscribeToEntities = (callback) => {
  const q = query(collection(db, 'entities'));
  return onSnapshot(q, (snapshot) => {
    const entities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(entities);
  });
};

// Crear un nuevo cliente o proveedor
export const createEntityInDb = async (entityData) => {
  const entitiesRef = collection(db, 'entities');
  await addDoc(entitiesRef, {
    ...entityData,
    createdAt: serverTimestamp()
  });
};

// Actualizar límite de crédito
export const updateEntityCreditLimit = async (entityId, newLimit) => {
  const entityRef = doc(db, 'entities', entityId);
  await updateDoc(entityRef, { creditLimit: newLimit });
};

// NUEVO: Agregar un registro a la bitácora del cliente
export const addEntityLogInDb = async (entityId, logEntry) => {
  const entityRef = doc(db, 'entities', entityId);
  await updateDoc(entityRef, { history: arrayUnion(logEntry) });
};