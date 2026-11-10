import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Scale, Award } from 'lucide-react';
import useUIStore from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { canAccessPartnersSection } from '../features/partners/services/partnerGovernanceService';

const CURRENT_VERSION = '2.5.1';

export default function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { setCurrentView } = useUIStore();
  const { user } = useAuthStore();
  const isPartnerUser = canAccessPartnersSection(user);

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

  const handleOpenQuotes = () => {
    localStorage.setItem('remex_last_version_seen', CURRENT_VERSION);
    setIsOpen(false);
    setCurrentView('bot_quotes');
  };

  const handleOpenPartners = () => {
    localStorage.setItem('remex_last_version_seen', CURRENT_VERSION);
    setIsOpen(false);
    setCurrentView('partners');
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
            La versión <strong>2.5.1</strong> incorpora el <strong>Recordatorio Configurable en Minutos (por defecto cada 15 min)</strong> desde el Bot y desde Presupuestos, la <strong>Barra Lateral Extendible/Cerrable</strong> y el <strong>Módulo de Presupuestos 100% Independiente</strong>:
          </p>

          <div className="space-y-4">
            <div className="bg-zinc-900/80 border border-orange-500/50 p-4 rounded-xl flex gap-3">
              <Scale className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">🧾 Módulo Presupuestos 100% Separado + Estadísticas por Modelo, Filtros, Aceite y Horarios</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  La sección <strong>Presupuestos</strong> ahora muestra exclusivamente los pedidos de cotización y el análisis de PDFs y charlas: <strong>qué filtros y aceite cotiza cada sucursal para cada modelo de vehículo</strong>, diferencias de precios en filtros y aceite por litro entre sucursales, y en qué <strong>franjas horarias</strong> hay más o menos demoras.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-emerald-500/40 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">📐 Barra Lateral Extendible y Cerrable con Explicación al Pasar el Mouse</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Los botones de la barra izquierda ahora tienen textos cortos sin recortes, puedes <strong>contraer o expandir el menú</strong> en cualquier momento, y al pasar el mouse sobre cualquier botón aparece una tarjeta flotante explicando qué hace cada sección.
                </p>
              </div>
            </div>
            {isPartnerUser && (
              <div className="bg-zinc-900/80 border border-amber-500/50 p-4 rounded-xl flex gap-3">
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-bold text-sm mb-1">🏛️ Nuevo: Directorio Exclusivo de Socios (Martín, Alejandro y Juan Pablo — 3/3)</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Espacio confidencial exclusivo para los 3 socios donde cada uno puede exponer ideas o nuevas normas operativas, acordar, rechazar con observaciones y dejar comentarios. Al alcanzar los <strong>3 votos a favor (3/3)</strong>, la propuesta queda automáticamente <strong>Firme como Regla Vigente</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-zinc-900/80 border border-orange-500/40 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Intermediario de Presupuestos, SLA Hábil y Precios PDF (Piloto Lunes 09/11 • Centro)</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  El bot solicita presupuestos a la sucursal sin revelar el contacto del cliente hasta que confirme la cotización, traslada repreguntas ida y vuelta, analiza los <strong>PDFs de presupuesto</strong> (aceite, códigos de filtros y descuentos), mide la demora neta en horario comercial (recordatorio automático a los 25 min) y compara diferencias de precios entre sucursales.
                </p>
              </div>
            </div>
            
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Bot Check-Oil: Detección Automática de Teléfono + Diagnóstico de No Derivados</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  El bot ahora toma automáticamente el número de teléfono y nombre de WhatsApp del cliente sin pedírselos, evitando charlas truncadas. Además puedes filtrar conversaciones por fecha (Hoy, Ayer, Esta Semana, +1 Semana), auditar por qué no se derivó un contacto e intervenir con 1 clic.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Liquidación de Reparto: Mercadería, Deuda en Zona y Rendición Triple</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Registra la mercadería vendida en reparto y la deuda acumulada en la zona al salir, carga gastos rápidos pre-cargados (Combustible con $ y Litros, Comida, Alojamiento, Mecánico y Manual) y rinde por separado <strong>Efectivo, Cheques y Transferencias</strong>.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 p-4 rounded-xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-bold text-sm mb-1">Flota, Mantenimiento y Movimiento Automático en Bariloche</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Nueva pestaña de <strong>Flota y Mantenimiento</strong> con ficha técnica por vehículo (Sprinter, tanque, consumo L/100km), bitácora completa de talleres, lavados y services, y detección automática de los kilómetros recorridos en Bariloche entre viajes.
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 shrink-0 flex flex-wrap justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPartnerUser && (
              <button 
                onClick={handleOpenPartners}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Award className="w-4 h-4" />
                🏛️ Abrir Directorio de Socios (3/3)
              </button>
            )}
            <button 
              onClick={handleOpenQuotes}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Scale className="w-4 h-4" />
              🧾 Presupuestos & PDF (Centro)
            </button>
          </div>
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