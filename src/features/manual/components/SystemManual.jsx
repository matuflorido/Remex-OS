import React, { useState } from 'react';
import { BookOpen, Search, ChevronRight, FileText, CheckCircle2, Star } from 'lucide-react';

const manualTopics = [
  {
    id: 'updates',
    title: 'Últimas Actualizaciones',
    content: '¡El sistema ha sido actualizado a la versión 1.8.0 incorporando el Módulo Logístico Integral!\n\n ✓ Hojas de Ruta: Ahora los Ciclos Logísticos y Recorridos crean automáticamente un documento contable para liquidar viáticos, combustible y recaudación.\n\n ✓ Tablero de Viajes: Un nuevo Kanban dentro de la agenda operativa te permite arrastrar los viajes entre los estados "Preparación", "En Ruta" y "Liquidado".\n\n ✓ Plan de Cuentas: Crea categorías personalizadas de gastos (Macro y Micro) para mantener tus costos organizados al dedillo.\n\n ✓ Métricas de Flota: Análisis automático de kilómetros recorridos, dinero gastado y cálculo exacto del costo operativo por kilómetro.'
  },
  {
    id: 'intro',
    title: '1. Introducción al Sistema',
    content: 'Remex Work-OS es una plataforma integral diseñada para unificar la logística, el seguimiento de clientes (CRM) y la ejecución de tareas. Toda la información está sincronizada en tiempo real. Si alguien actualiza una tarea o un cliente, todos los involucrados lo verán al instante sin necesidad de recargar la página.'
  },
  {
    id: 'tasks',
    title: '2. Motor de Tareas y Auditoría',
    content: 'El tablero de tareas funciona arrastrando y soltando tarjetas (Drag & Drop) a través de los diferentes estados (Nuevas, En Proceso, Validación, Cerradas). \n\n Chat Interno: Dentro de cada tarea, los usuarios asignados pueden comunicarse en tiempo real para dejar registro de las decisiones y adjuntar novedades.\n\n Tareas Privadas: Al crear una tarea, puedes marcarla como privada (ícono de candado). Solo tú, el creador, y los empleados asignados podrán verla en el tablero. Para el resto del equipo será invisible.\n\n Firmas Conjuntas: Si una tarea involucra a varias áreas (ej. Ventas y Operaciones), el sistema exigirá que un usuario de CADA área haga clic en "Firmar Aprobación" antes de poder cerrarla.\n\n Eliminación y Auditoría: Solo el Super Usuario puede eliminar tareas permanentemente. Por seguridad, la tarea se archiva en una base de datos de auditoría oculta junto con el nombre de quién la borró.'
  },
  {
    id: 'inbox',
    title: '3. Centro de Mensajes (Inbox)',
    content: 'El Centro de Mensajes, accesible desde el menú lateral, funciona como una bandeja de entrada clásica que centraliza toda la comunicación interna de la empresa sin tener que buscar tarea por tarea.\n\n Filtros Inteligentes: Puedes visualizar rápidamente qué mensajes no has leído, cuáles enviaste tú y cuáles recibiste.\n\n Búsqueda Global: Si no recuerdas en qué tarea se habló de un tema específico, usa el buscador del Centro de Mensajes para encontrar palabras clave, nombres de empleados o números de tarea.\n\n Salto Directo: Cada mensaje tiene un botón "Ir a Tarea" que te teletransportará exactamente a la tarjeta en el Tablero de Operaciones para que puedas responder al instante.'
  },
  {
    id: 'crm',
    title: '4. Directorio CRM y Clientes',
    content: 'En este directorio se guardan Clientes y Proveedores. \n\n Importación CSV: Usa el botón "Importar CSV" para cargar bases de datos completas desde Excel. Asegúrate de que el archivo esté separado por punto y coma (;).\n\n Atajos Rápidos: Al lado de cada cliente verás un ícono de Calendario. Al presionarlo, se abrirá la agenda y autocompletará los datos para programar una llamada o visita.\n\n Bitácora: Dentro del perfil de cada cliente, puedes anotar los detalles de tus interacciones (llamadas, acuerdos, promesas de pago).'
  },
  {
    id: 'zones',
    title: '5. Gestor de Zonas Logísticas',
    content: 'Las Zonas (ej. "Ruta Sur", "Valle") son esenciales para ordenar los recorridos y colorear el calendario. \n\n Zonas Múltiples: Un cliente puede pertenecer a más de una zona a la vez. Al editar un cliente, simplemente tilda todas las zonas que correspondan.\n\n Sincronización Inteligente: Si importaste clientes desde un Excel, usa el botón "Vincular Clientes Importados" dentro del Gestor de Zonas. El algoritmo escaneará los datos y los asignará automáticamente a las zonas oficiales creadas (incluso si tienen nombres diferentes en tu planilla vieja).\n\n Actualización Dinámica: Si renombras o cambias el color de una Zona, el sistema actualizará cientos de clientes y tareas que pertenecían a esa ruta al instante.'
  },
  {
    id: 'calendar',
    title: '6. Calendario Operativo',
    content: 'La Agenda Operativa te permite organizar el trabajo de todo el mes de forma visual. Puedes crear 4 tipos de eventos: \n\n Tarea General: Un evento simple sin zona obligatoria. Aparece como una pastilla verde.\n Llamada: Se vincula directamente a un contacto de tu CRM. Aparece azul.\n Recorrido Fijo: Se vincula a una Zona de un solo día. Aparece naranja.\n Ciclo Logístico (Multi-día): Es la herramienta más potente. Permite programar un viaje largo definiendo una Fase de Preventa (días de llamadas para levantar pedidos) y una Fase de Reparto (los días en ruta). \n\nEl Ciclo Logístico tiñe el fondo del calendario del color de la Zona y mostrará un pasillo con bordes para la preventa. La grilla del calendario es dinámica con scroll infinito.'
  },
  {
    id: 'fleet',
    title: '7. Módulo Logístico y Hoja de Ruta',
    content: 'Esta herramienta contable está anclada al Calendario Operativo y se accede mediante las pestañas superiores:\n\n Tablero de Viajes: Un entorno Kanban paralelo al de tareas. Aquí verás los Ciclos Logísticos ordenados por fecha. Arrastra la tarjeta a "Liquidado" cuando el chofer regrese del viaje para hacer la rendición de caja.\n\n Liquidación (Hoja de Ruta): Al hacer clic en un viaje, se abre la calculadora. Carga los kilómetros, el efectivo inicial, lo recaudado y los comprobantes físicos para que el sistema te indique el balance exacto.\n\n Plan de Cuentas: Desde la pestaña "Estadísticas de Flota", usa el ícono de engranaje para crear tus Macro y Micro categorías de gastos (ej. Viáticos > Comida). Así evitarás errores humanos al cargar tickets.'
  },
  {
    id: 'admin',
    title: '8. Administración y Seguridad',
    content: 'Panel exclusivo para el Super Usuario.\n\n Gestor de Áreas: Aquí creas los departamentos de tu empresa (Ventas, Mantenimiento, etc.) y sus subdivisiones. Estos datos alimentan automáticamente los selectores de creación de usuarios y los filtros del Tablero de Tareas.\n\n Control de Contraseñas: Por estrictas reglas de seguridad de Google, un administrador no puede cambiar la contraseña de un empleado desde la interfaz del cliente. Nuestro sistema soluciona esto disparando una orden cifrada a un servidor en la nube (Cloud Function) que fuerza la actualización de la clave del usuario.'
  },
  {
    id: 'stats',
    title: '9. Estadísticas de Empresa',
    content: 'Este panel lee la base de datos en tiempo real y grafica el rendimiento de la empresa (volumen de tareas, efectividad de cierre y carga de trabajo por zona logística). \n\n Rendimiento del Personal: Analiza automáticamente las tareas de todo tu equipo para mostrarte en una gráfica apilada cuántas tienen en curso, cuántas bloqueadas, y un ranking global con su efectividad (porcentaje de resolución de tareas asignadas).\n\n Exportación: Puedes utilizar el botón "Exportar PDF" en la esquina superior derecha para generar automáticamente un documento listo para presentar a gerencia con todos los indicadores actuales.'
  },
  {
    id: 'settings',
    title: '10. Preferencias de Notificaciones',
    content: 'A través del ícono de tuerca (Ajustes) al lado de la campana superior, puedes configurar cómo deseas recibir los avisos del sistema.\n\n Alertas Nativas y Sonido: Por defecto, recibirás un sonido de alerta y una tarjeta nativa de Windows/Mac en tu pantalla cada vez que te envíen un mensaje.\n\n Modo Importante: Utilízalo para silenciar los chats cotidianos. Solo recibirás notificaciones visuales/sonoras cuando una tarea sea Crítica, de Alta prioridad o requiera tu Firma Conjunta.\n\n Modo Concentración: Apaga completamente los sonidos y carteles del sistema operativo. Solo verás las burbujas naranjas titilando cuando entres voluntariamente a la aplicación.'
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
                  if (paragraph.startsWith(' ✓')) {
                    return (
                      <div key={idx} className="flex items-start gap-2 mb-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-zinc-300 leading-relaxed text-sm font-medium m-0">{paragraph.substring(2).trim()}</p>
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