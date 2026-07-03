import React from 'react';
import { X, Settings, BellRing, AlertTriangle, BellOff } from 'lucide-react';
import useSettingsStore from '../../../store/useSettingsStore';

export default function SettingsModal({ onClose }) {
  const { notificationLevel, setNotificationLevel } = useSettingsStore();

  const options = [
    {
      id: 'all',
      title: 'Todas las Notificaciones',
      desc: 'Recibirás avisos de Windows para cualquier actividad en tu área.',
      icon: <BellRing className="w-5 h-5 text-emerald-500" />,
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-500/10'
    },
    {
      id: 'important',
      title: 'Solo Importantes',
      desc: 'Solo avisos de tareas de Alta prioridad, Críticas o Firmas Conjuntas.',
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      border: 'border-orange-500/50',
      bg: 'bg-orange-500/10'
    },
    {
      id: 'none',
      title: 'Silenciar Todo (Modo Concentración)',
      desc: 'No recibirás ningún aviso de Windows. Solo las verás al entrar a la app.',
      icon: <BellOff className="w-5 h-5 text-zinc-500" />,
      border: 'border-zinc-600',
      bg: 'bg-zinc-800'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-zinc-400" /> Preferencias
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
            Intensidad de Notificaciones
          </h3>
          
          {options.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => setNotificationLevel(opt.id)}
              className={`cursor-pointer p-4 rounded-xl border transition-all flex items-start gap-4 
                ${notificationLevel === opt.id ? `${opt.border} ${opt.bg}` : 'border-zinc-800 bg-black hover:border-zinc-600'}
              `}
            >
              <div className="mt-1 shrink-0">
                {opt.icon}
              </div>
              <div>
                <h4 className={`text-sm font-bold ${notificationLevel === opt.id ? 'text-white' : 'text-zinc-400'}`}>
                  {opt.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{opt.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-end">
          <button onClick={onClose} className="bg-orange-600 hover:bg-orange-500 text-black font-black px-8 py-2.5 rounded-xl text-sm transition-colors">
            CERRAR Y GUARDAR
          </button>
        </div>

      </div>
    </div>
  );
}