import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where, getDocs, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export const subscribeToContacts = (callback) => {
  const q = query(collection(db, 'contacts'));
  return onSnapshot(q, (snapshot) => {
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(contacts);
  });
};

export const createContactInDb = async (contactData) => {
  await addDoc(collection(db, 'contacts'), {
    ...contactData,
    history: [], 
    createdAt: serverTimestamp()
  });
};

export const updateContactInDb = async (contactId, contactData) => {
  const contactRef = doc(db, 'contacts', contactId);
  await updateDoc(contactRef, contactData);
};

export const deleteContactInDb = async (contactId) => {
  const contactRef = doc(db, 'contacts', contactId);
  await deleteDoc(contactRef);
};

export const addContactNoteInDb = async (contactId, note) => {
  const contactRef = doc(db, 'contacts', contactId);
  await updateDoc(contactRef, {
    history: arrayUnion(note)
  });
};

// ==========================================
// GESTOR INDEPENDIENTE DE ZONAS
// ==========================================

export const subscribeToZones = (callback) => {
  const q = query(collection(db, 'zones'));
  return onSnapshot(q, (snapshot) => {
    const zones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(zones.sort((a, b) => a.name.localeCompare(b.name)));
  });
};

export const createZoneInDb = async (zoneName, color = '#f97316') => {
  await addDoc(collection(db, 'zones'), {
    name: zoneName,
    color: color,
    createdAt: serverTimestamp()
  });
};

// Actualizado para arreglar las zonas múltiples en los clientes
export const updateZoneAndContacts = async (zoneId, oldName, newName, newColor) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'zones', zoneId), { name: newName, color: newColor });
  
  const q = query(collection(db, 'contacts'), where('zones', 'array-contains', oldName));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(docSnap => {
    const contact = docSnap.data();
    const newZones = (contact.zones || []).map(z => z === oldName ? newName : z);
    batch.update(docSnap.ref, { zones: newZones });
  });
  
  await batch.commit();
};

export const deleteZoneAndUnlinkContacts = async (zoneId, zoneName) => {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'zones', zoneId));
  
  const q = query(collection(db, 'contacts'), where('zones', 'array-contains', zoneName));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(docSnap => {
    const contact = docSnap.data();
    const newZones = (contact.zones || []).filter(z => z !== zoneName);
    batch.update(docSnap.ref, { zones: newZones });
  });
  
  await batch.commit();
};

export const importBulkContactsInDb = async (contactsArray) => {
  const batch = writeBatch(db);
  contactsArray.forEach(contact => {
    const newRef = doc(collection(db, 'contacts'));
    batch.set(newRef, {
      ...contact,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
};

// ==========================================
// ALGORITMO: SINCRONIZADOR PATAGÓNICO (Múltiples Zonas)
// ==========================================
export const smartSyncZones = async (officialZones) => {
  if (!officialZones || officialZones.length === 0) return 0;

  const q = query(collection(db, 'contacts'));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;

  snapshot.forEach(docSnap => {
    const contact = docSnap.data();
    
    // Leemos qué decía el Excel original, y si estaba vacío, buscamos la localidad
    const rawZone = (contact.importRawZone || contact.zone || '').toLowerCase();
    const city = (contact.city || '').toLowerCase();
    const searchString = rawZone + " " + city;

    const assignedZones = new Set(contact.zones || []);
    const matches = (keywords) => keywords.some(k => searchString.includes(k));

    // Diccionario de Keywords para Múltiples Zonas
    const isBariloche = matches(['bariloche', 'brc']);
    const isBolson = matches(['bolson', 'esquel', 'cholila', 'trevelin', 'epuyen', 'puelo']);
    const isRuta23 = matches(['ruta 23', 'linea sur', 'jacobacci', 'maquinchao', 'los menucos', 'pilcaniyeu']);
    const isBsAs = matches(['buenos aires', 'bs as']);
    
    // Zonas Neuquinas y Combinadas
    const isVLA_SMA = matches(['vla', 'villa la angostura', 'angostura', 'sma', 'san martin', 'junin']);
    const isZapala = matches(['zapala', 'cutral co', 'cutralco', 'plaza huincul']);
    const isMix = matches(['mix']);

    // Detectamos las zonas oficiales en tu base de datos
    const zBariloche = officialZones.find(z => z.name.toLowerCase().includes('bariloche'));
    const zBolson = officialZones.find(z => z.name.toLowerCase().includes('bolson') || z.name.toLowerCase().includes('esquel'));
    const zRuta23 = officialZones.find(z => z.name.toLowerCase().includes('23'));
    const zBsAs = officialZones.find(z => z.name.toLowerCase().includes('buenos aires'));
    const zVlaSma = officialZones.find(z => z.name.toLowerCase().includes('vla') || z.name.toLowerCase().includes('junin'));
    const zZapala = officialZones.find(z => z.name.toLowerCase().includes('zapala') || z.name.toLowerCase().includes('cutral'));
    const zMix = officialZones.find(z => z.name.toLowerCase().includes('mix'));

    // Asignación de Lógica Doble
    if (isBariloche && zBariloche) assignedZones.add(zBariloche.name);
    if (isBolson && zBolson) assignedZones.add(zBolson.name);
    if (isRuta23 && zRuta23) assignedZones.add(zRuta23.name);
    if (isBsAs && zBsAs) assignedZones.add(zBsAs.name);

    if (isVLA_SMA) {
       if (zVlaSma) assignedZones.add(zVlaSma.name);
       if (zMix) assignedZones.add(zMix.name); // ¡Agrega al Mix también!
    }
    if (isZapala) {
       if (zZapala) assignedZones.add(zZapala.name);
       if (zMix) assignedZones.add(zMix.name); // ¡Agrega al Mix también!
    }
    if (isMix && zMix) {
       assignedZones.add(zMix.name);
    }

    const finalZonesArray = Array.from(assignedZones);
    const currentZonesStr = (contact.zones || []).sort().join(',');
    const newZonesStr = finalZonesArray.sort().join(',');

    // Si hubo cambios, actualizamos Firebase y limpiamos el rawZone para no volver a pisarlo
    if (currentZonesStr !== newZonesStr || contact.importRawZone) {
      batch.update(docSnap.ref, { 
         zones: finalZonesArray,
         importRawZone: null,
         zone: null // Limpiamos el texto único viejo por seguridad
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
  }
  
  return count;
};