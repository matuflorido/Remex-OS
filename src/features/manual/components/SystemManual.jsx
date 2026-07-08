import React, { useState } from 'react';
import { BookOpen, Search, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';

const manualTopics = [
  {
    id: 'intro',
    title: '1. Introducción al Sistema',
    content: 'Remex Work-OS es una plataforma integral diseñada para unificar la logística, el seguimiento de clientes (CRM) y la ejecución de tareas. Toda la información está sincronizada en tiempo real. Si alguien actualiza una tarea, todos los involucrados lo verán al instante sin necesidad de recargar la página.'
  },
  {
    id: 'tasks',
    title: '2. Motor de Tareas (Kanban)',
    content: 'El tablero de tareas funciona arrastrando y soltando (Drag & Drop). \n\n• NUEVAS: Tareas recién creadas.\n• EN PROCESO: Tareas en ejecución.\n• PENDIENTE VALIDACIÓN: El operador terminó, pero requiere que un supervisor la apruebe.\n• CERRADAS: Tareas finalizadas.\n\nFirmas Conjuntas: Si una tarea involucra a varias áreas (ej. Ventas y Operaciones), el sistema exigirá que un usuario de cada área haga clic en "Firmar Aprobación" antes de poder cerrarla.'
  },
  {
    id: 'crm',
    title: '3. CRM y Clientes',
    content: 'En este directorio se guardan Clientes y Proveedores. \n\nPara agilizar el trabajo, al lado de cada cliente en la tabla verás un ícono de Calendario naranja. Al presionarlo, el sistema abrirá la agenda y completará automáticamente los datos del cliente para que programes una llamada o visita en segundos. Además, dentro del perfil de cada cliente, puedes usar la "Bitácora" para anotar detalles de tus interacciones (llamadas, acuerdos, etc.).'
  },
  {
    id: 'zones',
    title: '4. Gestor de Zonas Logísticas',
    content: 'Las Zonas (ej. "Ruta Norte", "Línea Sur") son obligatorias para ordenar los recorridos. \n\nNo se escriben a mano al crear un cliente. Debes presionar el botón "ZONAS" en el panel de CRM para crear la ruta oficial. La gran ventaja es que si en el futuro decides renombrar "Ruta Norte" a "Zona 1", el sistema actualizará automáticamente a todos los cientos de clientes que pertenecían a esa ruta al instante.'
  },
  {
    id: 'calendar',
    title: '5. Calendario y Agenda',
    content: 'Aquí puedes organizar visualmente el trabajo del mes. Puedes crear eventos de dos tipos: \n\n• Llamadas: Se vinculan directamente a un contacto de tu CRM.\n• Recorridos: Se vinculan a una Zona Logística (previamente creada en tu Gestor de Zonas).\n\nHaz clic en cualquier día o evento para editar o reprogramar.'
  },
  {
    id: 'stats',
    title: '6. Estadísticas y Reportes',
    content: 'Este panel lee la base de datos en tiempo real y grafica el rendimiento de la empresa. Puedes utilizar el botón "Exportar PDF" en la esquina superior derecha para generar automáticamente un documento listo para presentar a gerencia con todos los indicadores actuales.'
  },
  {
    id: 'settings',
    title: '7. Notificaciones (Campanita)',
    content: 'El icono de la campana en la barra superior te avisará de cualquier movimiento en las áreas a las que perteneces. \n\nSi haces clic en la tuerca (Ajustes) al lado de la campana, puedes configurar si deseas recibir alertas nativas de Windows para todas las acciones, solo para las de prioridad Crítica/Alta, o silenciarlas por completo.'
  }
];

export default function SystemManual() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopicId, setActiveTopicId] = useState(manualTopics[0].id);

  const filteredTopics = manualTopics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTopic = manualTopics.find(t => t.id === activeTopicId);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      
      {}
      <div className="p-6 lg:p-8 shrink-0 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-orange-500" /> Manual del Sistema
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Guía completa de uso, atajos y buenas prácticas.</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {}
        {/* PANEL IZQUIERDO: Índice y Buscador */}
        <div className="w-80 border-r border-zinc-800 bg-black/20 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en el manual..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-orange-500 outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {filteredTopics.length === 0 && (
              <p className="text-xs text-zinc-500 text-center mt-4">No se encontraron resultados.</p>
            )}
            {filteredTopics.map(topic => (
              <button 
                key={topic.id}
                onClick={() => setActiveTopicId(topic.id)}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${activeTopicId === topic.id ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent'}`}
              >
                <span className="text-sm font-bold truncate pr-2">{topic.title}</span>
                {activeTopicId === topic.id && <ChevronRight className="w-4 h-4 shrink-0"/>}
              </button>
            ))}
          </div>
        </div>

        {}
        {/* PANEL DERECHO: Contenido */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          {activeTopic ? (
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 mb-6 uppercase tracking-widest">
                <FileText className="w-3 h-3"/> Documentación Oficial
              </div>
              
              <h1 className="text-3xl font-black text-white mb-8">{activeTopic.title}</h1>
              
              <div className="prose prose-invert prose-orange max-w-none">
                {activeTopic.content.split('\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('•')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-zinc-300 leading-relaxed text-sm">{paragraph.substring(1).trim()}</p>
                      </div>
                    );
                  }
                  if (paragraph.trim() === '') return <br key={idx} />;
                  return (
                    <p key={idx} className="text-zinc-300 leading-relaxed text-sm mb-4">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              <div className="mt-12 p-6 bg-orange-950/20 border border-orange-900/30 rounded-2xl">
                <h4 className="text-orange-500 font-bold mb-2">¿Necesitas más ayuda?</h4>
                <p className="text-sm text-zinc-400">Pronto integraremos a tu asistente de Inteligencia Artificial para responder consultas en vivo o realizar tareas por ti.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 font-bold">
              Selecciona un tema del menú izquierdo.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}