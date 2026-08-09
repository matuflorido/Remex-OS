import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calendar as CalIcon, DollarSign, GripVertical, CheckCircle2 } from 'lucide-react';
import { subscribeToAllTrips, updateTripInDb } from '../services/fleetService';
import TripSettlementModal from './TripSettlementModal';

const TRIP_COLUMNS = [
  { id: 'en_preparacion', title: 'PROGRAMADOS (PREPARACIÓN)', color: 'bg-zinc-500', sort: 'asc' },
  { id: 'en_ruta', title: 'EN CURSO (RUTA)', color: 'bg-blue-500', sort: 'asc' },
  { id: 'liquidado', title: 'HISTORIAL (LIQUIDADOS)', color: 'bg-emerald-500', sort: 'desc' }
];

export default function TripBoard() {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  
  const [draggedTripId, setDraggedTripId] = useState(null);
  const [draggedOverColId, setDraggedOverColId] = useState(null);

  useEffect(() => {
    const unsub = subscribeToAllTrips((data) => {
      setTrips(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

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
        
        // Si lo tiran en liquidado, abrimos el modal automáticamente para que rindan cuentas
        if (colId === 'liquidado') {
          setSelectedTrip(trip);
        }
      }
      setDraggedTripId(null);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-6 min-h-0 bg-zinc-950 p-2">
      {TRIP_COLUMNS.map(col => {
        let columnTrips = trips.filter(t => t.status === col.id);
        
        // Ordenamiento por fecha
        columnTrips.sort((a, b) => {
          const dateA = new Date(a.date || a.createdAt?.toDate() || 0).getTime();
          const dateB = new Date(b.date || b.createdAt?.toDate() || 0).getTime();
          return col.sort === 'asc' ? dateA - dateB : dateB - dateA;
        });

        const isOver = draggedOverColId === col.id && draggedTripId;

        return (
          <div 
            key={col.id}
            onDragOver={(e) => { if (draggedTripId) { e.preventDefault(); setDraggedOverColId(col.id); } }}
            onDragLeave={() => setDraggedOverColId(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex-shrink-0 flex flex-col rounded-2xl w-[320px] border transition-all duration-300
              ${isOver ? 'bg-orange-950/10 border-orange-500/50 ring-2 ring-orange-500/20' : 'bg-zinc-950/50 border-zinc-800/50'}
            `}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10 rounded-t-2xl">
              <div className="flex items-center gap-2 pointer-events-none">
                <GripVertical className="w-4 h-4 text-zinc-600"/>
                <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                <h3 className="font-black text-white text-sm">{col.title}</h3>
              </div>
              <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md font-bold">{columnTrips.length}</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
              {isLoading && <div className="text-orange-500 text-xs text-center p-4">Cargando viajes...</div>}
              {!isLoading && columnTrips.length === 0 && <div className="text-zinc-600 text-xs text-center p-4 italic">No hay viajes en esta columna.</div>}
              
              {!isLoading && columnTrips.map(trip => (
                <div 
                  key={trip.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, trip.id)}
                  onClick={() => setSelectedTrip(trip)}
                  className={`bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] flex flex-col gap-3 group ${draggedTripId === trip.id ? 'opacity-40 scale-95 border-orange-500 border-dashed' : 'opacity-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black tracking-widest text-zinc-500 flex items-center gap-1">
                      ID: {trip.id.slice(0,8)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold bg-black px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1">
                      <CalIcon className="w-3 h-3"/> {trip.date || 'Sin Fecha'}
                    </span>
                  </div>
                  
                  <h4 className="font-black text-white text-base leading-snug group-hover:text-orange-400 transition-colors flex items-center gap-2">
                    <Truck className="w-4 h-4 text-orange-500"/> {trip.zone}
                  </h4>
                  
                  {col.id === 'liquidado' && (
                    <div className="pt-3 mt-1 border-t border-zinc-800 flex justify-between items-center text-xs pointer-events-none">
                      <div className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3"/> Liquidado
                      </div>
                      <div className="flex items-center gap-1 text-zinc-400 font-bold">
                        <DollarSign className="w-3 h-3"/> Recaudado: ${(trip.finances?.totalCollected || 0).toLocaleString('es-AR')}
                      </div>
                    </div>
                  )}
                  {col.id === 'en_ruta' && (
                    <div className="pt-3 mt-1 border-t border-zinc-800 flex justify-between items-center text-xs pointer-events-none text-blue-400 font-bold">
                      <MapPin className="w-3 h-3"/> Viajando...
                    </div>
                  )}
                </div>
              ))}
              {isOver && draggedTripId && <div className="border-2 border-dashed border-orange-500/50 rounded-xl h-24 bg-orange-500/5 transition-all"></div>}
            </div>
          </div>
        );
      })}

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