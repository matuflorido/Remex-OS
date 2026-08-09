import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';

const CURRENT_VERSION = '1.8.0';

export default function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('remex_last_version_seen');
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('remex_last_version_seen', CURRENT_VERSION);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-6 relative shrink-0">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide">¡Remex OS se ha actualizado!</h2>
              <p className="text-orange-100 text-sm font-medium">Bienvenido a la versión {CURRENT_VERSION}</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          <p className="text-zinc-300 mb-6 text-sm">
            Hemos integrado el nuevo <strong>Módulo Logístico</strong> para que tengas control absoluto sobre los costos, viáticos y rendiciones de tus viajes. Esto es lo nuevo:
          </p>

          <div className="space-y-4">
            
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Tablero de Viajes y Hojas de Ruta</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Dentro del calendario encontrarás una nueva pestaña con un panel Kanban. Arrastra los viajes desde "Programados" hasta "Liquidados" para abrir la calculadora automática de viáticos, gastos y cobranzas.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Plan de Cuentas (Categorías Dinámicas)</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Ahora puedes crear tus propios grupos de gastos (Ej. Viáticos, Mantenimiento) y asignarles ítems específicos para estandarizar la carga de comprobantes que traen los choferes.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Estadísticas de Flota en Tiempo Real</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  El sistema cruza instantáneamente los kilómetros recorridos con los comprobantes cargados para calcular el costo operativo por kilómetro y visualizar el historial completo de cada zona.
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 shrink-0 flex justify-end">
          <button 
            onClick={handleClose}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
          >
            ¡Entendido, a trabajar!
          </button>
        </div>

      </div>
    </div>
  );
}