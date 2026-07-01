import { collection, query, onSnapshot, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

// Escuchar notificaciones en tiempo real filtradas por rol
export const subscribeToNotifications = (role, callback) => {
  const q = query(collection(db, 'notifications'));
  return onSnapshot(q, (snapshot) => {
    let notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtramos en memoria para evitar configuraciones complejas de índices en Firebase
    if (role !== 'Super_Usuario') {
      notifs = notifs.filter(n => n.targetRole === role || n.targetRole === 'Todos');
    }

    // Ordenar de más nuevas a más viejas
    notifs.sort((a, b) => {
      const dateA = a.createdAt?.toMillis() || 0;
      const dateB = b.createdAt?.toMillis() || 0;
      return dateB - dateA;
    });

    callback(notifs);
  });
};

// Crear un nuevo aviso (se disparará desde el Tablero)
export const createNotification = async (targetRole, title, message) => {
  await addDoc(collection(db, 'notifications'), {
    targetRole,
    title,
    message,
    read: false,
    createdAt: serverTimestamp()
  });
};

// Marcar como leída
export const markNotificationAsRead = async (id) => {
  await updateDoc(doc(db, 'notifications', id), { read: true });
};