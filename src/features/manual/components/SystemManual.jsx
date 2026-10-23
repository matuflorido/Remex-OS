import React, { useState } from 'react';
import { BookOpen, Search, ChevronRight, FileText, CheckCircle2, Star } from 'lucide-react';

const manualTopics = [
  {
    id: 'updates',
    title: 'Últimas Actualizaciones (v2.1.0)',
    content: '¡El sistema ha sido actualizado a la versión 2.1.0 incorporando el Centro de Control del Bot Check-Oil con Auto-Teléfono y el nuevo Circuito Integral de Viajes de Reparto, Rendición Triple y Flota!\n\n ✓ Bot Check-Oil sin pedir teléfono: El bot ahora detecta automáticamente el número de WhatsApp (remoteJid / remoteJidAlt) y el nombre del perfil del cliente para derivarlo a la sucursal sin preguntarle su número, eliminando el principal motivo de abandono.\n\n ✓ Diagnóstico de No Derivados y Fechas: Clasificación automática de charlas por fecha (Hoy, Ayer, Esta Semana, +1 Semana), motivo exacto de no derivación (Nunca respondió, Dejó a mitad de camino, Buscaba otra cosa, Audio/Foto) y botón de intervención en 1 clic.\n\n ✓ Viajes de Reparto y Deuda en Zona: Registro del valor de mercadería vendida en reparto (ej. $5.000.000) sumado a la deuda acumulada en la zona al salir (ej. $35.000.000 en El Bolsón).\n\n ✓ Gastos Pre-cargados y Rendición Triple: Botones rápidos para Combustible (Total $ + Litros cargados), Comida, Alojamiento, Mecánico en ruta y Gastos Manuales, más rendición separada en Efectivo, Cheques traídos y Transferencias.\n\n ✓ Flota, Mantenimiento y Movimiento en Bariloche: Ficha técnica de cada unidad (ej. Sprinter, capacidad de tanque, consumo L/100km), bitácora completa de todo (viajes, mecánico, lavados, services) y detección automática de kilómetros recorridos en Bariloche entre viajes.'
  },
  {
    id: 'intro',
    title: '1. Introducción al Sistema',
    content: 'Remex Work-OS es una plataforma integral diseñada para unificar la logística de reparto, el control de flota, la supervisión del Bot de WhatsApp (Check-Oil), el seguimiento de clientes (CRM) y la ejecución de tareas. Toda la información está sincronizada en tiempo real.'
  },
  {
    id: 'bot',
    title: '2. Bot & IA Check-Oil (WhatsApp)',
    content: 'Desde el menú lateral "Bot & IA Check-Oil" tienes control total y en vivo sobre el asistente virtual de recepción y derivación conectado a WhatsApp y n8n.\n\n Detección Automática de Teléfono y Nombre: El bot toma automáticamente el número de teléfono real de WhatsApp y el nombre del contacto sin pedírselos al cliente, enviando a la sucursal elegida la ficha completa con link directo wa.me.\n\n Pausa Inteligente por Intervención Humana: Si un operador humano escribe desde WhatsApp o desde Remex OS en una conversación, el bot se pone en pausa automáticamente para ese cliente y pasa a Modo Observador sin interrumpir.\n\n Fechas y Alerta de Seguimiento: Cada conversación muestra si es de Hoy, de Ayer, de Esta Semana o de hace más de una semana. Si un cliente quedó sin respuesta por más de 25 minutos, se activa una alerta con plantillas de seguimiento de 1 clic.\n\n Auditoría de No Derivados y Aprendizaje IA: Puedes filtrar todas las charlas que no llegaron a derivarse y ver por qué (Nunca respondió, Faltó elegir sucursal, Buscaba repuestos mecánicos o Envió audio/imagen), además de aprobar reglas en la Base de Conocimiento para que el bot aprenda.'
  },
  {
    id: 'tasks',
    title: '3. Motor de Tareas y Auditoría',
    content: 'El tablero de tareas funciona arrastrando y soltando tarjetas (Drag & Drop) a través de los diferentes estados (Nuevas, En Proceso, Validación, Cerradas). \n\n Chat Interno: Dentro de cada tarea, los usuarios asignados pueden comunicarse en tiempo real para dejar registro de las decisiones y adjuntar novedades.\n\n Tareas Privadas: Al crear una tarea, puedes marcarla como privada (ícono de candado). Solo tú, el creador, y los empleados asignados podrán verla en el tablero. Para el resto del equipo será invisible.\n\n Firmas Conjuntas: Si una tarea involucra a varias áreas (ej. Ventas y Operaciones), el sistema exigirá que un usuario de CADA área haga clic en "Firmar Aprobación" antes de poder cerrarla.\n\n Eliminación y Auditoría: Solo el Super Usuario puede eliminar tareas permanentemente. Por seguridad, la tarea se archiva en una base de datos de auditoría oculta junto con el nombre de quién la borró.'
  },
  {
    id: 'inbox',
    title: '4. Centro de Mensajes (Inbox)',
    content: 'El Centro de Mensajes, accesible desde el menú lateral, funciona como una bandeja de entrada clásica que centraliza toda la comunicación interna de la empresa sin tener que buscar tarea por tarea.\n\n Filtros Inteligentes: Puedes visualizar rápidamente qué mensajes no has leído, cuáles enviaste tú y cuáles recibiste.\n\n Búsqueda Global: Si no recuerdas en qué tarea se habló de un tema específico, usa el buscador del Centro de Mensajes para encontrar palabras clave, nombres de empleados o números de tarea.\n\n Salto Directo: Cada mensaje tiene un botón "Ir a Tarea" que te teletransportará exactamente a la tarjeta en el Tablero de Operaciones para que puedas responder al instante.'
  },
  {
    id: 'crm',
    title: '5. Directorio CRM y Clientes',
    content: 'En este directorio se guardan Clientes y Proveedores. \n\n Importación CSV: Usa el botón "Importar CSV" para cargar bases de datos completas desde Excel. Asegúrate de que el archivo esté separado por punto y coma (;).\n\n Atajos Rápidos: Al lado de cada cliente verás un ícono de Calendario. Al presionarlo, se abrirá la agenda y autocompletará los datos para programar una llamada o visita.\n\n Bitácora: Dentro del perfil de cada cliente, puedes anotar los detalles de tus interacciones (llamadas, acuerdos, promesas de pago).'
  },
  {
    id: 'zones',
    title: '6. Gestor de Zonas Logísticas',
    content: 'Las Zonas (ej. "El Bolsón", "Ruta Sur", "Valle") son esenciales para ordenar los recorridos y colorear el calendario. \n\n Zonas Múltiples: Un cliente puede pertenecer a más de una zona a la vez. Al editar un cliente, simplemente tilda todas las zonas que correspondan.\n\n Sincronización Inteligente: Si importaste clientes desde un Excel, usa el botón "Vincular Clientes Importados" dentro del Gestor de Zonas. El algoritmo escaneará los datos y los asignará automáticamente a las zonas oficiales creadas.\n\n Actualización Dinámica: Si renombras o cambias el color de una Zona, el sistema actualizará cientos de clientes y tareas que pertenecían a esa ruta al instante.'
  },
  {
    id: 'calendar',
    title: '7. Calendario Operativo',
    content: 'La Agenda Operativa te permite organizar el trabajo de todo el mes de forma visual. Puedes crear 4 tipos de eventos: \n\n Tarea General: Un evento simple sin zona obligatoria. Aparece como una pastilla verde.\n Llamada: Se vincula directamente a un contacto de tu CRM. Aparece azul.\n Recorrido Fijo: Se vincula a una Zona de un solo día. Aparece naranja.\n Ciclo Logístico (Multi-día): Permite programar un viaje definiendo una Fase de Preventa y una Fase de Reparto.'
  },
  {
    id: 'fleet',
    title: '8. Viajes de Reparto, Liquidación y Flota',
    content: 'Integrado dentro de Agenda y Rutas mediante 4 pestañas superiores (Calendario, Tablero de Viajes, Rendimiento y Zonas, y Flota y Mantenimiento):\n\n Salida de Reparto y Deuda en Zona: Selecciona el vehículo de la flota (ej. Sprinter), verifica su kilometraje y estado de tanque al salir, e ingresa el valor de la Mercadería Vendida que lleva junto con la Deuda Acumulada en la Zona.\n\n Movimiento en Bariloche entre Viajes: Si en el siguiente viaje la camioneta sale con un kilometraje mayor al que llegó en el viaje anterior, el sistema calcula automáticamente la diferencia y la registra como Movimiento Urbano en Bariloche.\n\n Gastos Pre-cargados y Consumo de Combustible: Al regresar, ingresa los kilómetros de llegada y el estado del tanque. Carga con 1 clic Combustible (Total $ y Litros cargados), Comida, Alojamiento, Mecánico en ruta u Otros gastos manuales.\n\n Rendición en Efectivo, Cheques y Transferencias: Registra por separado el Efectivo cobrado, los Cheques traídos y las Transferencias realizadas durante el viaje. El sistema calcula tanto el Efectivo Físico a entregar en mano como el Saldo Restante de Deuda en la Zona.\n\n Flota y Mantenimiento (El registro entero de todo): En la pestaña "Flota y Mantenimiento" puedes dar de alta vehículos con su consumo por km y capacidad de tanque, registrar arreglos mecánicos, lavados o services, y consultar la Bitácora Completa Unificada.'
  },
  {
    id: 'admin',
    title: '9. Administración y Seguridad',
    content: 'Panel exclusivo para el Super Usuario.\n\n Gestor de Áreas: Aquí creas los departamentos de tu empresa (Ventas, Mantenimiento, etc.) y sus subdivisiones. Estos datos alimentan automáticamente los selectores de creación de usuarios y los filtros del Tablero de Tareas.\n\n Control de Contraseñas: Por estrictas reglas de seguridad de Google, un administrador no puede cambiar la contraseña de un empleado desde la interfaz del cliente. Nuestro sistema soluciona esto disparando una orden cifrada a un servidor en la nube (Cloud Function) que fuerza la actualización de la clave del usuario.'
  },
  {
    id: 'stats',
    title: '10. Estadísticas y Preferencias',
    content: 'El panel de Estadísticas lee la base de datos en tiempo real y grafica el rendimiento de la empresa, además de permitir exportar reportes en PDF. Desde el ícono de engranaje en la barra superior puedes ajustar las Preferencias de Notificaciones (Todas, Solo Importantes o Silencio).'
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