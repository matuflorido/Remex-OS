import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { createTaskInDb } from '../../tasks/services/taskService';

// Escuchar el historial de fotos de deuda
export const subscribeToDebtSnapshots = (callback) => {
  const q = query(collection(db, 'debt_snapshots'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenamos del más reciente al más antiguo
    callback(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
  });
};

// Guardar una nueva foto y calcular riesgos
export const saveDebtSnapshotInDb = async (snapshotData, assignedEmployees) => {
  const snapshotId = `DS-${snapshotData.date.replace(/-/g, '')}`;
  const snapRef = doc(db, 'debt_snapshots', snapshotId);
  
  await setDoc(snapRef, {
    ...snapshotData,
    createdAt: serverTimestamp()
  });

  // =========================================================
  // MATEMÁTICA DE RIESGO CREDITICIO (Absorción de Límite)
  // =========================================================
  const snapshotDateObj = new Date(snapshotData.date + 'T00:00:00');
  
  // 1. Ordenamos los tramos desde el MÁS VIEJO al MÁS NUEVO
  const sortedTranches = [...snapshotData.tranches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let remainingLimit = snapshotData.limit;
  let criticalExcess = 0; // Excedente de más de 30 días que NO fue cubierto por el límite

  sortedTranches.forEach(tranche => {
    const trancheDate = new Date(tranche.date + 'T00:00:00');
    // Calculamos los días de antigüedad
    const diffTime = Math.abs(snapshotDateObj - trancheDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Absorvemos la deuda con el límite disponible
    const covered = Math.min(tranche.amount, remainingLimit);
    const uncovered = tranche.amount - covered;
    remainingLimit -= covered;

    // Si la deuda tiene más de 30 días, el tramo no cubierto suma al riesgo crítico
    if (diffDays > 30) {
      criticalExcess += uncovered;
    }
  });

  // =========================================================
  // DISPARO AUTOMÁTICO DE TAREA LOGÍSTICA
  // =========================================================
  if (criticalExcess > 0 && assignedEmployees.length > 0) {
    const randomId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const taskData = {
      id: randomId,
      title: `Objetivo de Cobranza Urgente: $${criticalExcess.toLocaleString('es-AR')}`,
      type: 'Operativa',
      assignedEmployees: assignedEmployees,
      assignedArea: '',
      status: 'open',
      priority: 'critical',
      startDate: snapshotData.date,
      dueDate: null,
      estimatedTime: '',
      recurrence: 'none',
      blocks: [
        { 
          type: 'text', 
          content: `⚠️ ALERTA FINANCIERA AUTOMÁTICA:\n\nSe ha procesado un nuevo Cierre de Saldos con fecha ${snapshotData.date.split('-').reverse().join('/')}.\n\nTras absorber el límite operativo tolerado de $${snapshotData.limit.toLocaleString('es-AR')}, el sistema detectó capital VENCIDO (más de 30 días de antigüedad) en la calle.\n\nMonto Crítico a recuperar: $${criticalExcess.toLocaleString('es-AR')}\n\nAcción Requerida: Coordinar la cobranza de estos saldos en los próximos recorridos de forma obligatoria.` 
        }
      ],
      dependencies: [],
      requireJointApproval: false,
      isPrivate: false,
      creatorArea: 'Auditoría Financiera',
      approvedBy: [],
      history: [{
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: 'Sistema Automático',
        comment: `Tarea generada por el Módulo de Riesgo Crediticio al detectarse una exposición mayor al límite permitido.`,
        isMessage: false
      }]
    };
    
    await createTaskInDb(taskData);
  }
};

// Actualizar un corte existente (Sin disparar tareas para evitar duplicados molestos)
export const updateDebtSnapshotInDb = async (snapshotId, snapshotData) => {
  const snapRef = doc(db, 'debt_snapshots', snapshotId);
  await updateDoc(snapRef, {
    limit: snapshotData.limit,
    totalDebt: snapshotData.totalDebt,
    tranches: snapshotData.tranches
  });
};

// Eliminar un corte del historial
export const deleteDebtSnapshotInDb = async (snapshotId) => {
  await deleteDoc(doc(db, 'debt_snapshots', snapshotId));
};