import React, { useState } from 'react';
import { Database, Check } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default function LoadInitialData() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success'

  const injectData = async () => {
    setStatus('loading');
    try {
      // Datos exactos del Excel al 20/08/2026
      const snapshotId = "DS-20260820";
      const snapshotData = {
        date: "2026-08-20",
        limit: 27000000,
        totalDebt: 130006272,
        tranches: [
          { date: "2026-08-20", amount: 7044786 },
          { date: "2026-08-13", amount: 16708024 },
          { date: "2026-08-06", amount: 24746280 },
          { date: "2026-07-30", amount: 27772740 },
          { date: "2026-07-23", amount: 16042039 },
          { date: "2026-07-16", amount: 9576182 },
          { date: "2026-07-09", amount: 28116221 }
        ]
      };

      const snapRef = doc(db, 'debt_snapshots', snapshotId);
      await setDoc(snapRef, {
        ...snapshotData,
        createdAt: serverTimestamp()
      });

      setStatus('success');
    } catch (error) {
      console.error("Error cargando datos:", error);
      setStatus('error');
    }
  };

  return (
    <button 
      onClick={injectData}
      disabled={status !== 'idle'}
      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-zinc-700 mx-auto mt-4"
    >
      {status === 'idle' && <><Database className="w-4 h-4 text-orange-500"/> Inyectar Datos de Excel (20/08)</>}
      {status === 'loading' && 'Cargando...'}
      {status === 'success' && <><Check className="w-4 h-4 text-emerald-500"/> ¡Datos inyectados!</>}
    </button>
  );
}