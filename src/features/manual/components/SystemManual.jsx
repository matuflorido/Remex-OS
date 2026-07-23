import React, { useState } from 'react';
import { BookOpen, Search, ChevronRight, FileText, CheckCircle2, Star } from 'lucide-react';

const manualTopics = [
  {
    id: 'updates',
    title: '⭐ Últimas Actualizaciones',
    content: '¡El sistema ha sido actualizado con nuevas funciones clave para mejorar la logística y seguridad!\n\n 🗓️ Nuevo Calendario y Ciclos Logísticos: Se rediseñó la Agenda Operativa. Ahora el calendario tiene scroll infinito (mostrando semanas continuas sin cortar viajes largos). Además, se agregó la función "Ciclo Logístico" para programar campañas con una fase de "Preventa" (días de llamadas) y una fase de "Reparto" (viaje), coloreando automáticamente los días en la grilla.\n\n 🗑️ Eliminación y Auditoría de Tareas: Los Super Usuarios ahora tienen un ícono de papelera para eliminar tareas. Por seguridad, la tarea no desaparece, sino que se archiva en una base de datos de auditoría oculta junto con el nombre de quién la borró.\n\n 🏢 Filtros de Áreas Dinámicos: El Tablero de Operaciones y las Firmas Conjuntas ahora leen en tiempo real las áreas exactas que hayas configurado en el panel de Administración, mejorando la precisión al delegar trabajos.\n\n 🔐 Seguridad Avanzada de Contraseñas: Se integró una Cloud Function (servidor en la nube) que permite a los administradores forzar el cambio de contraseña de cualquier empleado directamente desde la interfaz, saltando las restricciones estándar de Firebase.'
  },
  {
    id: 'intro',
    title: '1. Introducción al Sistema',
    content: 'Remex Work-OS es una plataforma integral diseñada para unificar la logística, el seguimiento de clientes (CRM) y la ejecución de tareas. Toda la información está sincronizada en tiempo real. Si alguien actualiza una tarea o un cliente, todos los involucrados lo verán al instante sin necesidad de recargar la página.'
  },
  {
    id: 'tasks',
    title: '2. Motor de Tareas y Auditoría',
    content: 'El tablero de tareas funciona arrastrando y soltando tarjetas (Drag & Drop) a través de los diferentes estados (Nuevas, En Proceso, Validación, Cerradas). \n\n Tareas Privadas: Al crear una tarea, puedes marcarla como privada (ícono de candado). Solo tú, el creador, y los empleados asignados podrán verla en el tablero. Para el resto del equipo será invisible.\n\n Firmas Conjuntas: Si una tarea involucra a varias áreas (ej. Ventas y Operaciones), el sistema exigirá que un usuario de CADA área haga clic en "Firmar Aprobación" antes de poder cerrarla.\n\n Eliminación y Auditoría: Solo el Super Usuario puede eliminar tareas permanentemente. Sin embargo, por seguridad, la tarea no se borra en el aire; el sistema ejecuta una transacción de bases de datos que crea un registro de auditoría oculto con la fecha, la hora y el nombre de quién la borró.'
  },
  {
    id: 'crm',
    title: '3. Directorio CRM y Clientes',
    content: 'En este directorio se guardan Clientes y Proveedores. \n\nPara agilizar el trabajo, al lado de cada cliente en la tabla verás un ícono de Calendario naranja. Al presionarlo, el sistema abrirá la agenda y completará automáticamente los datos del cliente para que programes una llamada o visita en segundos. \n\nAdemás, dentro del perfil de cada cliente, puedes usar la "Bitácora" para anotar detalles de tus interacciones (llamadas, acuerdos, promesas de pago, etc.).'
  },
  {
    id: 'zones',
    title: '4. Gestor de Zonas Logísticas',
    content: 'Las Zonas (ej. "Ruta Sur", "Valle") son esenciales para ordenar los recorridos y colorear el calendario. \n\nNo se escriben a mano al crear un cliente. Debes presionar el botón "ZONAS" en el panel de CRM para crear la ruta oficial y asignarle un color único. \n\nLa gran ventaja es que si en el futuro decides renombrar o cambiar el color de una Zona, el sistema actualizará automáticamente a todos los cientos de clientes y tareas que pertenecían a esa ruta al instante.'
  },
  {
    id: 'calendar',
    title: '5. Calendario y Ciclos Logísticos',
    content: 'La Agenda Operativa te permite organizar el trabajo de todo el mes de forma visual. Puedes crear 4 tipos de eventos: \n\n Tarea General: Un evento simple sin zona obligatoria. Aparece como una pastilla verde.\n Llamada: Se vincula directamente a un contacto de tu CRM. Aparece azul.\n Recorrido Fijo: Se vincula a una Zona de un solo día. Aparece naranja.\n Ciclo Logístico (Multi-día): Es la herramienta más potente. Permite programar un viaje largo definiendo una Fase de Preventa (días de llamadas para levantar pedidos) y una Fase de Reparto (los días en ruta). \n\nEl Ciclo Logístico teñirá el fondo del calendario del color de la Zona y mostrará un pasillo con bordes para la preventa. La grilla del calendario es dinámica, por lo que los viajes que terminen al mes siguiente se verán de forma continua sin tener que cambiar de pantalla.'
  },
  {
    id: 'admin',
    title: '6. Administración y Seguridad',
    content: 'Panel exclusivo para el Super Usuario.\n\n Gestor de Áreas: Aquí creas los departamentos de tu empresa (Ventas, Mantenimiento, etc.) y sus subdivisiones. Estos datos alimentan automáticamente los selectores de creación de usuarios y los filtros del Tablero de Tareas.\n\n Control de Contraseñas: Por estrictas reglas de seguridad de Google, un administrador no puede cambiar la contraseña de un empleado desde la interfaz del cliente. Nuestro sistema soluciona esto disparando una orden cifrada a un servidor en la nube (Cloud Function) que fuerza la actualización de la clave del usuario.'
  },
  {
    id: 'stats',
    title: '7. Estadísticas y Reportes',
    content: 'Este panel lee la base de datos en tiempo real y grafica el rendimiento de la empresa (volumen de tareas, efectividad de cierre y carga de trabajo por zona logística). \n\nPuedes utilizar el botón "Exportar PDF" en la esquina superior derecha para generar automáticamente un documento listo para presentar a gerencia con todos los indicadores actuales.'
  },
  {
    id: 'settings',
    title: '8. Preferencias de Notificaciones',
    content: 'El ícono de la campana en la barra superior te avisará de cualquier movimiento en las áreas a las que perteneces. \n\nSi haces clic en la tuerca (Ajustes) al lado de la campana, puedes configurar si deseas recibir alertas de sonido/Windows para todas las acciones, solo para las de prioridad Crítica/Alta (como Firmas Conjuntas), o silenciarlas por completo mediante el Modo Concentración.'
  }
];

export default function SystemManual() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Al inicializar, seleccionamos el ID 'updates' para que sea la pantalla de bienvenida
  const [activeTopicId, setActiveTopicId] = useState(manualTopics[0].id);

  const filteredTopics = manualTopics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTopic = manualTopics.find(t => t.id === activeTopicId);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      
      {/* HEADER */}
      <div className="p-6 lg:p-8 shrink-0 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-orange-500" /> Manual del Sistema
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Guía completa de uso, mecánicas y buenas prácticas.</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
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
                <span className="text-sm font-bold truncate pr-2">
                  {topic.id === 'updates' && <Star className="w-3 h-3 inline mr-1 -mt-0.5 text-orange-500 fill-orange-500"/>}
                  {topic.title}
                </span>
                {activeTopicId === topic.id && <ChevronRight className="w-4 h-4 shrink-0"/>}
              </button>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: Contenido */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
          {activeTopic ? (
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800/50 border border-zinc-700 rounded-full text-xs font-bold text-zinc-400 mb-6 uppercase tracking-widest">
                {activeTopic.id === 'updates' ? <Star className="w-3 h-3 text-orange-500" /> : <FileText className="w-3 h-3"/>} 
                {activeTopic.id === 'updates' ? 'Boletín de Versión' : 'Documentación Oficial'}
              </div>
              
              <h1 className="text-3xl font-black text-white mb-8">{activeTopic.title}</h1>
              
              <div className="prose prose-invert prose-orange max-w-none">
                {activeTopic.content.split('\n').map((paragraph, idx) => {
                  if (paragraph.startsWith(' ')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 mb-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-zinc-300 leading-relaxed text-sm font-medium m-0">{paragraph.substring(1).trim()}</p>
                      </div>
                    );
                  }
                  if (paragraph.trim() === '') return <br key={idx} className="my-2" />;
                  return (
                    <p key={idx} className="text-zinc-300 leading-relaxed text-sm mb-4">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              <div className="mt-12 p-6 bg-orange-950/20 border border-orange-900/30 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-orange-500 font-bold mb-1">¿Dudas específicas?</h4>
                  <p className="text-sm text-zinc-400">Busca el ícono de interrogación (?) en las diferentes pantallas de la app para ver atajos rápidos.</p>
                </div>
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