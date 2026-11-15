import { createTaskInDb } from '../../tasks/services/taskService';
import { createEventInDb } from '../../calendar/services/calendarService';
import { upsertBotDocumentInN8n } from '../../bot/services/botService';

/**
 * ============================================================================
 * MANUAL MAESTRO Y BASE DE CONOCIMIENTO INTEGRAL — REMEX WORK-OS
 * ============================================================================
 * Cubre las 14 secciones y sub-módulos del ecosistema Remex OS (Web + Desktop Electron)
 * con capturas reales rotuladas (/manual/remex/*.png), origen exacto de la información,
 * vinculaciones cruzadas automáticas entre módulos y guía operativa paso a paso.
 */
export const REMEX_ARCHITECTURE_OVERVIEW = {
  systemName: 'Remex Work-OS (Web & Desktop Electron)',
  version: '2.6.0',
  goldenRules: [
    'Sincronización reactiva 100% en tiempo real sobre Firebase Firestore (onSnapshot): cualquier cambio de un usuario impacta al instante en todas las PCs y sesiones abiertas.',
    'Control Maestro en Producción del Bot WhatsApp Check-Oil conectado a n8n (https://n8n.check-oil.tech) + Evolution API + PostgreSQL (checkoil_bot).',
    'Trazabilidad e Integridad Corporativa: ninguna tarea borrada desaparece (va a deleted_tasks con usuario y fecha), las tareas multi-área exigen Firma Conjunta y las normas de Socios exigen unanimidad 3/3.',
    'Automatización Financiera-Operativa: las fotos de deuda en calle (debt_snapshots) calculan absorción FIFO del límite crediticio y disparan solas tareas urgentes de cobranza en el Tablero.'
  ],
  dataSourcesSummary: [
    {
      source: 'Firebase Auth + Firestore (users, areas)',
      mode: 'Seguridad Corporativa & Roles',
      tables: 'users, areas + Cloud Function cifrada de cambio de claves',
      feeds: 'Login, Permisos por Área, Super_Usuario, Selector de Responsables en Tareas y Socios 3/3'
    },
    {
      source: 'Motor Operativo Firestore (tasks, deleted_tasks, notifications)',
      mode: 'Tiempo Real Multi-Usuario',
      tables: 'tasks, deleted_tasks, notifications + Badge Nativo Electron',
      feeds: 'Tablero KanBan de Tareas, Chat Interno por Tarea, Bandeja Inbox Global y Estadísticas'
    },
    {
      source: 'Comercial y Logística Firestore (contacts, zones, events, trips)',
      mode: 'Circuito Integrado Preventa → Reparto → Rendición',
      tables: 'contacts, zones, events, trips',
      feeds: 'CRM Clientes, Gestor de Zonas, Calendario Operativo, Hojas de Ruta y Rendición Triple'
    },
    {
      source: 'Flota y Mantenimiento Firestore (fleet_vehicles, fleet_logs)',
      mode: 'Telemetría de Unidades y Km Urbano',
      tables: 'fleet_vehicles, fleet_logs',
      feeds: 'Flota, Consumo L/100km, Detección automática de Km Urbano en Bariloche entre viajes y Bitácora Total'
    },
    {
      source: 'Gobierno y Riesgo Firestore (partner_proposals, debt_snapshots)',
      mode: 'Dirección & Finanzas',
      tables: 'partner_proposals (votos 3/3), debt_snapshots (tramos de antigüedad)',
      feeds: 'Directorio Exclusivo de Socios (Martín, Alejandro, Juan Pablo) y Finanzas / Riesgo Crediticio'
    },
    {
      source: 'Servidor Bot WhatsApp n8n + PostgreSQL (n8n.check-oil.tech)',
      mode: 'Control Activo de Producción',
      tables: 'sesiones_clientes, bot_config_global, bot_sync_cache',
      feeds: 'Bot Check-Oil en Vivo, Informe Sin Derivación, Monitor de Charlas, Aprendizaje IA y Presupuestos Centro (#COT)'
    }
  ]
};

export const REMEX_MANUAL_CHAPTERS = [
  {
    id: 'login_y_seguridad',
    number: '01',
    title: 'Acceso Corporativo, Roles por Área y Modo Super Usuario',
    badge: 'SEGURIDAD Y ACCESOS',
    viewTarget: 'tasks',
    image: '/manual/remex/01_login_corporativo.png',
    purpose:
      'Autentica a cada integrante del equipo con correo y contraseña corporativa, cargando automáticamente su perfil, área operativa y nivel de acceso.',
    howItWorks:
      'Valida contra Firebase Authentication y sincroniza el documento users/{uid} en Firestore. Asigna permisos de área (Ventas, Logística, Administración, etc.), habilita Super_Usuario para dirección general y verifica identidad para módulos restringidos como Socios (3/3) y Admin.',
    dataSource:
      'Firebase Authentication + colección Firestore users + colección areas.',
    crossLinks: [
      'Define qué tareas privadas puede ver cada empleado en el Tablero KanBan.',
      'Controla quién puede firmar aprobaciones conjuntas por área y quién accede a Socios o Administración.'
    ],
    howToUse: [
      'Ingresá tu correo y clave en la pantalla inicial de Remex Work-OS (Web o App Desktop Windows/Mac).',
      'Desde el engranaje superior podés configurar el nivel de alertas sonoras y notificaciones.'
    ],
    callouts: [
      "Cabecera Corporativa Remex Work-OS: identifica la estación segura Web / Desktop Electron (Windows y Mac) con actualización OTA.",
      "Identificación por Correo Oficial: vincula el ingreso con el perfil departamental almacenado en Firestore (users/{uid}).",
      "Credencial Cifrada Firebase Auth: protege cada sesión individual y admite reseteo administrativo vía Google Cloud Function.",
      "Ingreso y Carga Dinámica de Permisos: suscribe alertas en tiempo real y habilita Socios (3/3) y Admin solo a cuentas autorizadas."
    ]
  },
  {
    id: 'motor_tareas_kanban',
    number: '02',
    title: 'Tablero KanBan de Tareas Operativas, Firmas Conjuntas y Chat Interno',
    badge: 'OPERACIONES DIARIAS',
    viewTarget: 'tasks',
    image: '/manual/remex/02_tablero_tareas_kanban.png',
    purpose:
      'Centro neurálgico de ejecución diaria: organiza todas las tareas de la empresa en columnas KanBan (Nuevas, Bloqueadas, En Proceso, Validación y Cerradas) con responsables, prioridades, recurrencia y chat propio.',
    howItWorks:
      'Permite arrastrar y soltar tarjetas, bloquear tareas por dependencias previas, crear tareas privadas (candado), exigir "Firma Conjunta" cuando intervienen múltiples áreas y clonar automáticamente tareas recurrentes al cerrarse.',
    dataSource:
      'Colección Firestore tasks en tiempo real + archivo inmutable de auditoría en deleted_tasks.',
    crossLinks: [
      'Cada comentario escrito dentro de una tarea dispara notificaciones en vivo y aparece centralizado en el módulo "Mensajes (Inbox)".',
      'Recibe tareas automáticas generadas por "Finanzas" cuando se detecta exceso de deuda vencida (>30 días).',
      'Puede vincularse directamente a un cliente del "CRM Comercial".'
    ],
    howToUse: [
      'Hacé clic en "+ Nueva Tarea" para asignar área, prioridad, fecha límite, bloques de subtareas o privacidad.',
      'Abrí cualquier tarjeta para chatear con los responsables, adjuntar avances o firmar aprobación conjunta.'
    ],
    callouts: [
      "Menú Lateral por Módulos: conecta Operaciones (Tareas, Mensajes, Bot, Presupuestos, CRM, Agenda) y Gestión (Socios 3/3, Finanzas, Admin).",
      "Barra Superior de Acceso Rápido: integra buscador global, atajos directos a Presupuestos, Socios (3/3), Ayudante IA y campana de alertas.",
      "Cabecera Operativa y Filtro Global: permite crear \"+ Nueva Tarea\" (con candado o firma conjunta) y filtrar por Área o Empleado.",
      "Columnas KanBan Reactivas (Drag & Drop): sincronizan en vivo alertas críticas de Finanzas, bloqueos por dependencias, proceso y validación."
    ]
  },
  {
    id: 'centro_mensajes_inbox',
    number: '03',
    title: 'Centro de Mensajes Internos (Inbox Global y Salto a Tarea)',
    badge: 'COMUNICACIÓN INTERNA',
    viewTarget: 'inbox',
    image: '/manual/remex/03_centro_mensajes_inbox.png',
    purpose:
      'Bandeja de entrada unificada que reúne todas las conversaciones, menciones y avisos internos sin tener que abrir tarjeta por tarjeta en el tablero.',
    howItWorks:
      'Escucha en tiempo real las notificaciones e historiales de comentarios de tareas, separa No Leídos / Recibidos / Enviados, actualiza el contador rojo (incluyendo ícono de barra de tareas en Windows/Mac) y permite saltar directo a la tarea origen.',
    dataSource:
      'Colecciones Firestore notifications y array history dentro de tasks.',
    crossLinks: [
      'Botón "Ir a Tarea" teletransporta inmediatamente al usuario a la tarjeta exacta dentro del Tablero KanBan.',
      'Sincronizado con la campana superior de alertas sonoras y notificaciones nativas del sistema operativo.'
    ],
    howToUse: [
      'Entrá a "Mensajes" en la barra izquierda para revisar avisos pendientes, filtrar no leídos o buscar una conversación por palabra clave.'
    ],
    callouts: [
      "Cabecera del Centro de Mensajes: reúne en una sola bandeja toda la conversación interna originada en las tarjetas operativas.",
      "Pestañas Inteligentes de Lectura: separa de inmediato mensajes No Leídos, Todos, Recibidos y Enviados para responder a tiempo.",
      "Buscador Global y Filtro por Fecha: localiza acuerdos internos, nombres de compañeros o códigos TSK aunque la tarea ya esté cerrada.",
      "Hilos con Botón \"Ir a Tarea\": muestra remitente, comentario, fecha/hora y abre directamente el modal de la tarjeta madre en 1 clic."
    ]
  },
  {
    id: 'bot_maestro_estadisticas',
    number: '04',
    title: 'Bot & IA Check-Oil — Control Maestro en Producción y Estadísticas',
    badge: 'PRODUCCIÓN WHATSAPP',
    viewTarget: 'bot',
    image: '/manual/remex/04_bot_estadisticas_maestro.png',
    purpose:
      'Panel de comando en producción del Bot de WhatsApp de Check-Oil: permite activar/pausar el bot globalmente, configurar Auto-Pausa Humana, ajustar cada cuántos minutos recuerda a las sucursales y medir derivaciones por sede.',
    howItWorks:
      'A diferencia de Cochecita 2.0 (que es espejo de lectura), Remex OS gobierna directamente la configuración viva del Bot en n8n/PostgreSQL (bot_config_global). Muestra alertas de seguimiento (>25 min sin cerrar) y gráficos de conversión por sucursal.',
    dataSource:
      'API bidireccional https://n8n.check-oil.tech/webhook/remex-bot-api (PostgreSQL sesiones_clientes y bot_config_global) + respaldo en Firestore bot_sync_cache.',
    crossLinks: [
      'El selector "Recordatorio SLA (ej. 30 min)" actualiza en caliente el cron de recordatorios que vigila a Sucursal Centro en "Presupuestos".',
      'La alerta amarilla superior lleva en 1 clic a las conversaciones inconclusas dentro del "Monitor de Charlas".'
    ],
    howToUse: [
      'Usá los botones maestros superiores para encender/pausar el Bot, activar Auto-Pausa o cambiar los minutos de recordatorio SLA.',
      'Analizá la demanda de derivaciones entre Centro, Estadio, Ñireco, Km13, El Bolsón y Dominico.'
    ],
    callouts: [
      "Controles Maestros en Producción: gobierna encendido/pausa global del Bot WhatsApp, Auto-Pausa humana y selector persistente de SLA (30 min).",
      "Banner Ámbar de Alerta de Seguimiento: avisa cuántos clientes recientes quedaron sin cerrar y permite intervenirlos en 1 clic.",
      "Navegador de 5 Sub-Módulos y KPIs en Vivo: conmuta vistas operativas y mide Clientes Totales (105), Derivados (61%) y Para Intervenir.",
      "Radiografía de Clientes No Derivados: desglosa motivos de corte (silencio, falta sucursal, otro rubro, audio) con salto directo a cada chat."
    ]
  },
  {
    id: 'bot_informe_sin_derivacion_remex',
    number: '05',
    title: 'Bot & IA — Informe Forense de Conversaciones Sin Derivación',
    badge: 'ANÁLISIS CAUSA RAÍZ',
    viewTarget: 'bot',
    image: '/manual/remex/05_bot_informe_sin_derivacion.png',
    purpose:
      'Explica con precisión matemática por qué cada conversación no terminó en derivación: clientes que pidieron servicios que no ofrecemos (y cuáles fueron), clientes que dejaron de responder (y en qué paso), saludos sueltos y casos recuperables.',
    howItWorks:
      'Audita el historial completo de cada sesión WhatsApp: recupera las charlas que sí habían sido derivadas pero tenían un "Gracias/Ok" final, separa los presupuestos #COT de Centro y arma el ranking vivo de servicios no ofrecidos solicitados (Frenos, Baterías, Bujías, A/C, Escape, RTO, etc.).',
    dataSource:
      'Historial completo JSON de sesiones_clientes procesado por botNonDerivedAnalyzer.js.',
    crossLinks: [
      'Cada fila, ejemplo de servicio o lead recuperable abre directamente esa conversación en el "Monitor de Charlas" para intervenir desde Remex OS.',
      'Permite copiar el informe ejecutivo en texto para enviarlo al grupo de socios o descargar CSV.'
    ],
    howToUse: [
      'Dentro de "Bot Check-Oil", hacé clic en la pestaña "Informe Sin Derivación".',
      'Filtrá por período, revisá los servicios solicitados fuera de catálogo y contactá con 1 clic a los clientes recuperables.'
    ],
    callouts: [
      "Selector Activo \"Informe Sin Derivación\": ejecuta la auditoría forense mensaje por mensaje dentro del panel maestro de Remex OS.",
      "Filtros Temporales y Exportación Ejecutiva: acota por Historial, 30d, 7d o 24h y copia resumen para socios o descarga CSV completo.",
      "Bloque de Depuración Estadística: transparenta cuántas fichas vacías pre-15/10 se excluyeron y cuántas derivadas pisó un \"Gracias\".",
      "Contadores Forenses Accionables: separa Charlas Reales (105), Derivadas Efectivas (64), #COT (7) y Casos Reales Sin Derivar (34)."
    ]
  },
  {
    id: 'bot_monitor_charlas_y_aprendizaje',
    number: '06',
    title: 'Bot & IA — Monitor de Charlas en Vivo, Intervención Humana y Reglas IA',
    badge: 'ATENCIÓN Y ENTRENAMIENTO',
    viewTarget: 'bot',
    image: '/manual/remex/06_bot_monitor_charlas_wa.png',
    purpose:
      'Permite leer en vivo cada chat de WhatsApp, pausar el bot para un cliente puntual, responderle manualmente desde Remex OS y enseñar nuevas reglas permanentes a la IA.',
    howItWorks:
      'Muestra la burbuja exacta de cliente, bot, sucursal y operador con fecha/hora Argentina. Si un operador envía un mensaje manual, Evolution API lo entrega al WhatsApp del cliente y activa pausa humana automática en esa sesión. En la pestaña "Aprendizaje IA", permite aprobar reglas que se inyectan al instante en el System Prompt vivo de n8n.',
    dataSource:
      'PostgreSQL sesiones_clientes + envío en vivo vía n8n / Evolution API + reglas_aprendidas_json en bot_config_global.',
    crossLinks: [
      'Las reglas aprobadas en "Aprendizaje IA" modifican de inmediato cómo responde el Bot en WhatsApp sin tocar código.',
      'Se vincula con "Presupuestos" mostrando también dentro del chat los eventos #COT de Sucursal Centro.'
    ],
    howToUse: [
      'Elegí un chat a la izquierda (filtrando por Hoy, Sin Respuesta, En Pausa o No Derivados) y usá la barra inferior si necesitás intervenir manualmente.',
      'En "Aprendizaje IA e Incompletas", aprobá o redactá reglas nuevas para perfeccionar al Bot.'
    ],
    callouts: [
      "Selector Monitor + Aprendizaje IA: alterna entre atención activa de charlas (105), reglas aprendidas (35 nuevas) y Prompt en producción.",
      "Columna de Filtros y Reactivación Masiva: segmenta por Hoy, Ayer, No Derivados, Alerta Sin Respuesta o En Pausa y reactiva bots en 1 clic.",
      "Cabecera del Cliente e Intervención Humana: muestra teléfono nativo, motivo, botón \"Pausar Bot (Modo Observador)\" y plantillas rápidas.",
      "Registro de Interacción WhatsApp: reproduce los mensajes con hora exacta junto al diagnóstico ejecutivo para retomar la venta."
    ]
  },
  {
    id: 'presupuestos_piloto_centro_remex',
    number: '07',
    title: 'Módulo Exclusivo de Presupuestos, Filtros, Aceites y Demoras (Centro)',
    badge: 'AUDITORÍA #COT & SLA',
    viewTarget: 'bot_quotes',
    image: '/manual/remex/07_presupuestos_piloto_centro.png',
    purpose:
      'Controla en tiempo real todas las cotizaciones intermediadas por el Bot con Sucursal Centro: tiempos hábiles de respuesta, repreguntas técnicas de la sucursal, PDFs enviados, desglose de insumos cotizados y confirmación de turnos.',
    howItWorks:
      'Sigue las 3 reglas sagradas: 1) El Bot jamás inventa precios; 2) Solo traslada el pedido #COT (sin teléfono hasta confirmar); 3) Solo responde al cliente exactamente lo que manda la sucursal (pregunta adicional o PDF/texto de presupuesto). Calcula la demora hábil neta descontando noches/domingos y envía recordatorios cada X minutos.',
    dataSource:
      'PostgreSQL sesiones_clientes (cotizacion_actual_json, cotizaciones_historial_json, segundos_acumulados_sucursal) + configuración horaria en bot_config_global.',
    crossLinks: [
      'Conectado directamente al selector de minutos de recordatorio SLA del Bot.',
      'Permite auditar precios promedio por modelo, códigos WEGA cotizados y cuellos de botella por franja horaria.'
    ],
    howToUse: [
      'Entrá a "Presupuestos (Centro)" en la barra lateral para monitorear tickets pendientes, repreguntas abiertas y PDFs entregados.',
      'Ajustá horarios comerciales de sucursal o revisá el comparador técnico de aceites y filtros cotizados.'
    ],
    callouts: [
      "Cabecera Productiva y Reloj SLA: gobierna en vivo el recordatorio a Sucursal Centro (cada 30 min), estado hábil y carga/análisis de PDFs.",
      "6 Sub-Pestañas Especializadas: Pedidos en Vivo, Filtros por Modelo, Comparador de Precios, Demoras Horarias, Simulador PDF y Config SLA.",
      "Tablero de Eficiencia #COT: mide pedidos totales, modelos cotizados, ítems relevados, demora hábil promedio y confirmaciones.",
      "Tarjetas de Seguimiento #COT: detallan vehículo, códigos WEGA/aceite extraídos del PDF, monto oficial cotizado o repregunta abierta."
    ]
  },
  {
    id: 'crm_comercial_y_zonas',
    number: '08',
    title: 'Directorio CRM Comercial, Bitácora y Gestor Dinámico de Zonas',
    badge: 'CLIENTES Y RUTAS',
    viewTarget: 'crm',
    image: '/manual/remex/08_crm_clientes_y_zonas.png',
    purpose:
      'Administra la cartera comercial de clientes mayoristas/reparto y proveedores, su asignación a una o múltiples Zonas Logísticas (ej. El Bolsón, Ruta Sur, Valle) y la bitácora histórica de llamadas y acuerdos.',
    howItWorks:
      'Permite alta manual o importación masiva CSV (;), etiquetado multi-zona con colores identificatorios y "Sincronización Inteligente" para vincular clientes importados a zonas oficiales. Si se renombra o cambia el color de una Zona, actualiza en cascada todos los contactos asociados.',
    dataSource:
      'Colecciones Firestore contacts y zones con actualización masiva atómica (writeBatch).',
    crossLinks: [
      'El ícono de calendario en cada cliente abre "Agenda" pre-cargando una llamada o visita comercial.',
      'Las Zonas creadas aquí alimentan los recorridos del "Calendario Operativo", las "Hojas de Ruta de Viajes" y los análisis de deuda zonal.'
    ],
    howToUse: [
      'Filtrá por Zona o buscá por nombre/localidad para abrir la ficha y cargar notas en su Bitácora.',
      'Usá "Gestor de Zonas" para crear rutas logísticas o unificar clientes importados de Excel.'
    ],
    callouts: [
      "Cabecera del Directorio Comercial: centraliza la cartera mayorista y de reparto conectada con la Agenda Operativa y las Hojas de Ruta.",
      "Herramientas de Carga y Rutas: importa planillas Excel/CSV (;), abre el Gestor Dinámico de Zonas por color y crea nuevos registros.",
      "Selector Clientes/Proveedores y Corredores: alterna padrones y filtra en 1 clic por Bariloche, El Bolsón o Villa La Angostura.",
      "Grilla Comercial con Atajo a Agenda: exhibe razón social, fantasía, teléfono, localidad, etiquetas multi-zona y botón de agendar llamada."
    ]
  },
  {
    id: 'agenda_y_viajes_reparto',
    number: '09',
    title: 'Agenda Operativa, Tablero de Viajes de Reparto y Rendición Triple',
    badge: 'LOGÍSTICA Y COBRANZAS',
    viewTarget: 'calendar',
    image: '/manual/remex/09_agenda_y_viajes_reparto.png',
    purpose:
      'Integra en un solo módulo de 4 pestañas la planificación mensual (Calendario) con la ejecución real de cada Viaje de Reparto: salida de camioneta, mercadería llevada, deuda acumulada en zona, gastos en ruta y rendición separada en Efectivo, Cheques y Transferencias.',
    howItWorks:
      'Al agendar un Recorrido o Ciclo Logístico en el Calendario (events), genera su Hoja de Ruta vinculada en trips/{eventId}. Al salir registra km inicial, checklist mecánico, valor de mercadería y deuda previa en la zona; al volver registra km final, gastos pre-cargados (Combustible con litros, Comida, Alojamiento, Mecánico) y calcula exacto el Efectivo Físico a entregar en mano y el Nuevo Saldo de Deuda en Zona.',
    dataSource:
      'Colecciones Firestore events y trips cruzadas con zones y fleet_vehicles.',
    crossLinks: [
      'Vinculado en vivo con "Flota y Mantenimiento": toma el último km de llegada de la unidad y detecta automáticamente los kilómetros recorridos dentro de Bariloche entre un viaje y el siguiente.',
      'Alimenta las métricas de costo logístico y cobranza en "Rendimiento y Zonas".'
    ],
    howToUse: [
      'En "Calendario", programá tareas, llamadas, recorridos fijos o ciclos preventa+reparto.',
      'Cambiá a las pestañas superiores "Tablero de Viajes", "Flota y Mantenimiento" o "Rendimiento y Zonas" para gestionar salidas, gastos y rendiciones.'
    ],
    callouts: [
      "Barra Superior de 4 Sub-Módulos: integra Agenda Operativa, Tablero de Viajes, Flota y Mantenimiento y Métricas Zonales.",
      "Panel de Hojas de Ruta Operativas: permite abrir un \"+ Nuevo Viaje Operativo\" vinculado 1 a 1 con los ciclos del calendario.",
      "Columnas Programados y En Curso: registran unidad, km de salida (+Km Urbano BRC), combustible, mercadería llevada y deuda en zona.",
      "Columna Historial Liquidados: audita km totales, gastos descontados y la Rendición Triple con el Efectivo Neto entregado en mano."
    ]
  },
  {
    id: 'flota_y_movimiento_urbano',
    number: '10',
    title: 'Flota, Mantenimiento y Detección de Movimiento Urbano en Bariloche',
    badge: 'CONTROL DE UNIDADES',
    viewTarget: 'calendar',
    image: '/manual/remex/10_flota_y_mantenimiento.png',
    purpose:
      'Lleva la historia clínica e inventario completo de cada vehículo propio de reparto (ej. Sprinter, camionetas): consumo esperado L/100km, capacidad de tanque, services, arreglos mecánicos, lavados y control de kilómetros urbanos entre viajes.',
    howItWorks:
      'Compara el odómetro de llegada del viaje anterior con el odómetro de salida del nuevo viaje: si hay diferencia positiva, registra automáticamente esos kilómetros como "Movimiento Urbano en Bariloche" para que no quede ni un kilómetro ni litro de combustible sin auditar.',
    dataSource:
      'Colecciones Firestore fleet_vehicles y fleet_logs sincronizadas con trips.',
    crossLinks: [
      'Provee el selector de unidades y último kilometraje al abrir una salida en "Tablero de Viajes".',
      'Consolida en una sola Bitácora Unificada tanto viajes de ruta como talleres, lavados y services.'
    ],
    howToUse: [
      'Dentro de "Agenda", seleccioná la pestaña superior "Flota y Mantenimiento" para dar de alta vehículos, registrar mantenimientos o auditar la bitácora completa.'
    ],
    callouts: [
      "Pestaña Activa \"Flota y Mantenimiento\": sincroniza automáticamente odómetros y consumos con cada cierre del Tablero de Viajes.",
      "Controles de Registro Rápido: permite incorporar nuevas unidades utilitarias o asentar mantenimientos, services y lavados.",
      "Tarjetas Técnicas por Vehículo: muestran patente, km actual, rendimiento L/100km y botones rápidos Mecánico, Lavado y Service.",
      "Bitácora Completa y Detector Urbano: audita viajes, taller y los kilómetros urbanos recorridos en Bariloche entre repartos (+160 km)."
    ]
  },
  {
    id: 'directorio_socios_3de3',
    number: '11',
    title: 'Directorio Exclusivo de Socios — Gobernanza y Unanimidad 3/3',
    badge: 'MARTÍN • ALEJANDRO • JUAN PABLO',
    viewTarget: 'partners',
    image: '/manual/remex/11_directorio_socios_3de3.png',
    purpose:
      'Ámbito reservado exclusivamente a Dirección/Socios para proponer normas operativas, inversiones o políticas comerciales y convertirlas en "Regla Firme" únicamente cuando cuentan con el voto positivo unánime de los 3 socios (3/3).',
    howItWorks:
      'Verifica permisos estrictos de acceso (canAccessPartnersSection). Cada propuesta registra categoría, impacto, argumentos, comentarios y el voto individual de Martín, Alejandro y Juan Pablo. Si los 3 aprueban → pasa automáticamente a "Regla Firme Vigente"; si alguno rechaza → queda marcada como Rechazada/En revisión.',
    dataSource:
      'Colección Firestore partner_proposals con trazabilidad nominal de votos y timestamps.',
    crossLinks: [
      'Visible únicamente en el menú lateral para cuentas autorizadas de Socios / Super Usuario.',
      'Funciona como libro de actas vivo e inalterable de las decisiones estratégicas de la empresa.'
    ],
    howToUse: [
      'Creá una nueva propuesta indicando título, área de aplicación y detalle.',
      'Filtrá por "Pendientes de mi voto", "En Votación" o "Reglas Firmes (3/3)" para emitir voto o consultar normas vigentes.'
    ],
    callouts: [
      "Cabecera Exclusiva del Directorio: identifica a Martín, Alejandro y Juan Pablo, consulta el Estatuto y redacta nuevas propuestas.",
      "Contadores Ejecutivos de Gobernanza: exhibe Reglas Firmes vigentes (3/3), mociones En Votación, votos pendientes y observadas.",
      "Filtros del Libro de Actas: segmenta por estado de votación, categoría normativa o palabra clave dentro del directorio.",
      "Tarjeta de Regla Firme Aprobada (3/3): resguarda texto normativo, alcance empresarial y los 3 votos nominales con sus fundamentos."
    ]
  },
  {
    id: 'finanzas_y_riesgo_crediticio',
    number: '12',
    title: 'Finanzas, Absorción de Límite Crediticio y Disparo Automático de Cobranza',
    badge: 'RIESGO Y FLUJO DE CAJA',
    viewTarget: 'finances',
    image: '/manual/remex/12_finanzas_y_riesgo.png',
    purpose:
      'Monitorea la salud financiera, exposición de deuda en la calle por tramos de antigüedad vs. límite de crédito disponible y dispara automáticamente objetivos urgentes de cobranza cuando detecta riesgo crítico.',
    howItWorks:
      'Al guardar una Foto de Deuda (DS-YYYYMMDD en debt_snapshots), ordena los tramos del más antiguo al más nuevo (FIFO), absorbe hasta cubrir el límite crediticio y calcula si queda deuda descubierta con más de 30 días de antigüedad (criticalExcess). Si existe exceso crítico, crea solo una tarea urgente en el Tablero KanBan asignada a los responsables.',
    dataSource:
      'Colección Firestore debt_snapshots vinculada por código con createTaskInDb (tasks).',
    crossLinks: [
      'Vínculo directo automático Finanzas → Operaciones: genera tarjetas "Objetivo de Cobranza Urgente: $..." en el Tablero de Tareas.',
      'Complementa las rendiciones de efectivo, cheques y transferencias registradas en los Viajes de Reparto.'
    ],
    howToUse: [
      'Cargá una nueva foto de tramos de deuda y límite vigente para evaluar exposición real.',
      'Compará la evolución histórica entre fechas para medir reducción de mora.'
    ],
    callouts: [
      "Cabecera de Auditoría Crediticia: informa el último corte procesado y permite cargar un \"+ Nuevo Corte\" manual o desde Excel.",
      "Motor Matemático de Exposición FIFO: compara Deuda Total en Calle ($31,85M) contra Límite Operativo ($27M) y Exposición Crítica ($4,85M).",
      "Gráfico Histórico de Evolución: contrasta corte tras corte la curva real de calle frente a la línea punteada del cupo tolerado.",
      "Antigüedad de Saldos y Gatillo Operativo: aísla mora >30 días no cubierta y dispara sola una Tarea Crítica de Cobranza en el KanBan."
    ]
  },
  {
    id: 'estadisticas_y_administracion',
    number: '13',
    title: 'Estadísticas Generales de Rendimiento y Administración de Usuarios/Áreas',
    badge: 'GERENCIA Y CONTROL CLOUD',
    viewTarget: 'reports',
    image: '/manual/remex/13_estadisticas_y_admin.png',
    purpose:
      'Mide la productividad global por área/empleado ("Estadísticas") y centraliza el alta de personal, creación de áreas/subáreas y blanqueo seguro de contraseñas ("Admin").',
    howItWorks:
      'En "Estadísticas", procesa en tiempo real tasas de cierre, cuellos de botella y carga por departamento con opción de exportación. En "Admin", gestiona las colecciones users y areas e invoca una Cloud Function cifrada para actualizar contraseñas de empleados en Firebase Auth sin exponer credenciales.',
    dataSource:
      'Colecciones Firestore tasks, users, areas + Google Cloud Function de seguridad.',
    crossLinks: [
      'Las áreas creadas en "Admin" alimentan automáticamente los selectores del Tablero de Tareas y los filtros de Estadísticas.',
      'Cualquier ajuste de rol o activación/baja impacta en el acto sobre la sesión del empleado.'
    ],
    howToUse: [
      'En "Estadísticas", revisá el cumplimiento operativo global y por departamento.',
      'En "Admin", creá nuevas áreas operativas, gestioná roles de usuarios o reseteá contraseñas.'
    ],
    callouts: [
      "Módulos de Gerencia en Barra Lateral: articula \"Estadísticas\" (informes gráficos exportables a PDF) y \"Admin\" (exclusivo Super_Usuario).",
      "Cabecera de Estructura Organizacional: abre \"Gestionar Áreas\" (sectores y subáreas) y registra nuevos usuarios sin cerrar la sesión propia.",
      "Buscador Instantáneo de Cuentas: filtra integrantes activos o pausados por nombre, correo institucional o departamento asignado.",
      "Padrón de Permisos y Seguridad Cloud: edita áreas por empleado, estado de acceso y blanquea claves vía Google Cloud Function cifrada."
    ]
  },
  {
    id: 'manual_visual_y_copiloto_remex',
    number: '14',
    title: 'Manual Visual Rotulado y Ayudante Copiloto IA con Manejo Total de Remex OS',
    badge: 'CONOCIMIENTO Y ACCIÓN IA',
    viewTarget: 'manual',
    image: '/manual/remex/14_manual_y_copiloto_remex.png',
    purpose:
      'Integra dentro de Remex OS toda esta documentación visual con capturas rotuladas, el mapa completo de colecciones y vinculaciones, descarga de PDF y un Ayudante IA capaz tanto de responder cualquier consulta como de operar el sistema por vos.',
    howItWorks:
      'El botón flotante "Ayudante Remex OS" está disponible en todas las pantallas: escucha en vivo las colecciones de Firestore (tareas, clientes, zonas, agenda, viajes, socios, finanzas) y la API del Bot n8n, responde preguntas sobre datos reales o arquitectura, y ejecuta órdenes directas (navegar, crear tareas, agendar eventos, ajustar recordatorios SLA o filtrar vistas).',
    dataSource:
      'Base documental maestra (remexKnowledgeAndCopilotEngine.js) + suscripciones en vivo Firestore + API n8n.',
    crossLinks: [
      'Conecta y controla los 11 módulos principales de Remex Work-OS desde una sola ventana conversacional.',
      'Permite abrir en pantalla completa cualquier foto con carteles o descargar el Manual PDF Profesional de Remex OS.'
    ],
    howToUse: [
      'Hacé clic en el botón flotante naranja "Ayudante Remex OS" abajo a la derecha desde cualquier módulo.',
      'Pedile información o acciones directas, por ejemplo: "¿Qué tareas hay pendientes?", "Creá una tarea: Revisar stock filtros Centro", "Cambiá el recordatorio del bot a 30 minutos" o "¿Cómo se vincula Finanzas con Tareas?".'
    ],
    callouts: [
      "Cabecera Documental Remex Work-OS: alterna entre las 14 pantallas rotuladas en HD, el Mapa de Datos y Vínculos y la descarga PDF.",
      "Directorio Interactivo Buscable: localiza al instante cualquier módulo, colección Firestore o circuito logístico/financiero.",
      "Visor Ampliable y Teletransporte: abre la captura rotulada en pantalla completa o salta al módulo real con \"Ir a esta sección en vivo\".",
      "Cajón \"Ayudante IA Remex Work-OS\": lee en vivo 7 colecciones Firestore + n8n y crea tareas, agenda eventos o cambia el SLA por chat."
    ]
  }
];

function normalizeText(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Procesa cada consulta u orden enviada al Ayudante Inteligente de Remex Work-OS.
 * Soporta lectura en tiempo real de todas las colecciones + ejecución directa de acciones en Firestore/UI/n8n.
 */
export async function processRemexCopilotTurn(rawInput, ctx = {}) {
  const input = String(rawInput || '').trim();
  const norm = normalizeText(input);

  const {
    user = null,
    tasks = [],
    contacts = [],
    zones = [],
    events = [],
    trips = [],
    debtSnapshots = [],
    proposals = [],
    botSummary = null
  } = ctx;

  // 1. CREAR UNA TAREA REAL EN FIRESTORE ("crea una tarea: ...", "agrega tarea ...")
  const createTaskMatch = input.match(
    /^(?:crea|crear|agrega|agregar|nueva|anota)\s+(?:una\s+)?tarea(?:\s+nueva)?[:\s-]+(.+)$/i
  );
  if (createTaskMatch && createTaskMatch[1].trim().length >= 3) {
    const rawBody = createTaskMatch[1].trim();
    const isUrgent = /\b(urgente|critica|crítica|alta prioridad|prioridad alta)\b/i.test(rawBody);
    const cleanTitle = rawBody
      .replace(/\b(prioridad\s+alta|alta\s+prioridad|prioridad\s+media|prioridad\s+baja)\b/gi, '')
      .trim();
    const randomId = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    await createTaskInDb({
      id: randomId,
      title: cleanTitle,
      type: 'Operativa',
      assignedArea: user?.role || 'Super_Usuario',
      status: 'open',
      priority: isUrgent ? 'high' : 'medium',
      startDate: todayStr,
      dueDate: null,
      estimatedTime: '1h',
      recurrence: 'none',
      blocks: [],
      dependencies: [],
      requireJointApproval: false,
      clientId: null,
      clientName: null,
      isPrivate: false,
      creatorArea: user?.name || 'Ayudante IA Remex',
      approvedBy: [],
      history: [
        {
          author: user?.name || 'Ayudante IA',
          text: 'Tarea creada automáticamente desde el Ayudante Copiloto Remex OS.',
          timestamp: new Date().toISOString()
        }
      ]
    });

    return {
      text:
        `✅ **¡Tarea creada en vivo en Firestore!**\n\n` +
        `• **Código:** \`${randomId}\`\n` +
        `• **Título:** ${cleanTitle}\n` +
        `• **Prioridad:** ${isUrgent ? 'Alta 🔴' : 'Media 🟠'}\n` +
        `• **Estado inicial:** Nueva (\`open\`)\n\n` +
        `Te llevé al **Tablero de Tareas** para que la veas en la primera columna.`,
      autoAction: { type: 'NAVIGATE', view: 'tasks' },
      suggestedActions: [
        { label: '📋 Ver Tablero de Tareas', action: { type: 'NAVIGATE', view: 'tasks' } }
      ]
    };
  }

  // 2. AGENDAR UN EVENTO EN EL CALENDARIO ("agenda evento: ...", "programa en agenda: ...")
  const createEventMatch = input.match(
    /^(?:agenda|agendar|programa|programar)\s+(?:un\s+)?(?:evento|recordatorio|visita|llamada)?[:\s-]+(.+)$/i
  );
  if (createEventMatch && createEventMatch[1].trim().length >= 3) {
    const title = createEventMatch[1].trim();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + (/\bmanana\b/.test(norm) ? 1 : 0));
    const dateStr = tomorrow.toISOString().split('T')[0];

    await createEventInDb({
      title,
      date: dateStr,
      endDate: dateStr,
      type: 'general',
      zone: '',
      notes: 'Creado desde Ayudante Copiloto Remex OS',
      createdBy: user?.name || 'Ayudante IA'
    });

    return {
      text:
        `📅 **¡Evento agendado en el Calendario Operativo!**\n\n` +
        `• **Evento:** ${title}\n` +
        `• **Fecha:** ${dateStr}\n\n` +
        `Abrí la sección **Agenda** para visualizarlo.`,
      autoAction: { type: 'NAVIGATE', view: 'calendar' }
    };
  }

  // 3. CAMBIAR RECORDATORIO SLA DEL BOT EN N8N ("pone el recordatorio del bot en 30 minutos")
  const slaMatch = norm.match(/\b(?:recordatorio|sla)\b.*?(\d{1,3})\s*(?:min|minutos)/);
  if (slaMatch && /\b(cambia|cambiar|pone|poner|configura|ajustar|ajusta|setea)\b/.test(norm)) {
    const mins = String(slaMatch[1]);
    await upsertBotDocumentInN8n('bot_config_global', {
      documentId: 'bot_config_global',
      sla_recordatorio_minutos: mins
    });
    return {
      text:
        `⏰ **Configuración actualizada en vivo en n8n / PostgreSQL:**\n\n` +
        `El tiempo de **recordatorio SLA a sucursal** quedó fijado en **cada ${mins} minutos** en \`bot_config_global\`.`,
      suggestedActions: [
        { label: '🧾 Abrir Presupuestos Centro', action: { type: 'NAVIGATE', view: 'bot_quotes' } },
        { label: '🤖 Abrir Control del Bot', action: { type: 'NAVIGATE', view: 'bot' } }
      ]
    };
  }

  // 4. NAVEGACIÓN DIRECTA A CUALQUIER SECCIÓN ("abri...", "llevame a...", "ir a...")
  const isNav = /\b(abri|abrir|llevame|ir a|anda a|mostrame|entra a|cambiar a)\b/.test(norm);
  if (isNav) {
    if (/\b(presupuesto|cotizacion|#cot|piloto centro)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Presupuestos Bot (Piloto Sucursal Centro)**.',
        autoAction: { type: 'NAVIGATE', view: 'bot_quotes' },
        chapterRef: REMEX_MANUAL_CHAPTERS[6]
      };
    }
    if (/\b(bot|whatsapp|sin derivacion|no derivad|charlas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Centro de Control Bot & IA Check-Oil**.',
        autoAction: { type: 'NAVIGATE', view: 'bot' },
        chapterRef: REMEX_MANUAL_CHAPTERS[3]
      };
    }
    if (/\b(mensaje|inbox|bandeja)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Centro de Mensajes Internos (Inbox)**.',
        autoAction: { type: 'NAVIGATE', view: 'inbox' },
        chapterRef: REMEX_MANUAL_CHAPTERS[2]
      };
    }
    if (/\b(crm|clientes|zonas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Directorio CRM Comercial y Gestor de Zonas**.',
        autoAction: { type: 'NAVIGATE', view: 'crm' },
        chapterRef: REMEX_MANUAL_CHAPTERS[7]
      };
    }
    if (/\b(agenda|calendario|viajes|reparto|flota|sprinter)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Agenda, Viajes de Reparto y Flota**.',
        autoAction: { type: 'NAVIGATE', view: 'calendar' },
        chapterRef: REMEX_MANUAL_CHAPTERS[8]
      };
    }
    if (/\b(socios|3\/3|unanimidad|gobernanza|directorio)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Directorio Exclusivo de Socios (3/3)**.',
        autoAction: { type: 'NAVIGATE', view: 'partners' },
        chapterRef: REMEX_MANUAL_CHAPTERS[10]
      };
    }
    if (/\b(finanzas|deuda|riesgo|caja)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Finanzas y Riesgo Crediticio**.',
        autoAction: { type: 'NAVIGATE', view: 'finances' },
        chapterRef: REMEX_MANUAL_CHAPTERS[11]
      };
    }
    if (/\b(estadisticas|reportes|rendimiento)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Estadísticas Generales de Rendimiento**.',
        autoAction: { type: 'NAVIGATE', view: 'reports' },
        chapterRef: REMEX_MANUAL_CHAPTERS[12]
      };
    }
    if (/\b(admin|usuarios|claves|areas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Administración de Usuarios y Áreas**.',
        autoAction: { type: 'NAVIGATE', view: 'admin' },
        chapterRef: REMEX_MANUAL_CHAPTERS[12]
      };
    }
    if (/\b(manual|fotos|mapa|documentacion)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Manual Visual Rotulado y Mapa de Vinculaciones de Remex OS**.',
        autoAction: { type: 'NAVIGATE', view: 'manual' },
        chapterRef: REMEX_MANUAL_CHAPTERS[13]
      };
    }
    if (/\b(tareas|kanban|operaciones)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Tablero KanBan de Tareas Operativas**.',
        autoAction: { type: 'NAVIGATE', view: 'tasks' },
        chapterRef: REMEX_MANUAL_CHAPTERS[1]
      };
    }
  }

  // 5. CONSULTAS EN VIVO SOBRE EL ESTADO REAL DE TAREAS / CRM / FINANZAS / SOCIOS / BOT
  if (/\b(que tareas|cuantas tareas|tareas pendientes|resumen operativo|estado de remex|resumen general)\b/.test(norm)) {
    const openTasks = tasks.filter((t) => t.status === 'open');
    const inProg = tasks.filter((t) => t.status === 'in_progress');
    const validation = tasks.filter((t) => t.status === 'validation');
    const closed = tasks.filter((t) => t.status === 'closed');
    const highPrio = tasks.filter((t) => t.status !== 'closed' && (t.priority === 'high' || t.priority === 'critical'));

    const topPending = [...openTasks, ...inProg]
      .slice(0, 5)
      .map((t) => `• \`${t.id}\` **${t.title}** _(${t.status === 'open' ? 'Nueva' : 'En Proceso'} • ${t.assignedArea || 'General'})_`)
      .join('\n');

    const latestDebt = debtSnapshots[0];
    const firmRules = proposals.filter((p) => {
      const votes = p.votes || {};
      return Object.values(votes).filter((v) => v?.decision === 'aprobado').length >= 3;
    });

    return {
      text:
        `📊 **Estado en Tiempo Real de Remex Work-OS**\n\n` +
        `• **Tareas Totales:** ${tasks.length} — Nuevas: **${openTasks.length}** | En Proceso: **${inProg.length}** | Validación: **${validation.length}** | Cerradas: **${closed.length}**\n` +
        `• **Prioridad Alta / Crítica abiertas:** ${highPrio.length}\n` +
        `• **CRM Comercial:** ${contacts.length} contactos en **${zones.length} zonas logísticas**\n` +
        `• **Agenda y Logística:** ${events.length} eventos programados y **${trips.length} hojas de ruta de viaje**\n` +
        `• **Socios (3/3):** ${proposals.length} propuestas registradas (${firmRules.length} Reglas Firmes)\n` +
        (latestDebt ? `• **Última Foto Financiera:** \`${latestDebt.id}\` (${latestDebt.date}) — Límite: \$${Number(latestDebt.limit || 0).toLocaleString('es-AR')}\n` : '') +
        (botSummary
          ? `• **Bot WhatsApp en Vivo:** ${botSummary.realTotal} charlas reales (${botSummary.derived} derivadas efectivas • SLA: ${botSummary.slaMin} min)\n`
          : '') +
        (topPending ? `\n**Principales tareas activas:**\n${topPending}` : ''),
      suggestedActions: [
        { label: '⚡ Ir a Tareas', action: { type: 'NAVIGATE', view: 'tasks' } },
        { label: '🤖 Ver Bot Check-Oil', action: { type: 'NAVIGATE', view: 'bot' } },
        { label: '💲 Ver Finanzas', action: { type: 'NAVIGATE', view: 'finances' } }
      ]
    };
  }

  // 6. CONSULTAS SOBRE ARQUITECTURA GLOBAL, DE DÓNDE SALE LA INFO Y VINCULACIONES
  if (/\b(de donde sale|origen de|como se vincula|vinculacion|colecciones|arquitectura|como funciona todo|firestore)\b/.test(norm)) {
    const srcLines = REMEX_ARCHITECTURE_OVERVIEW.dataSourcesSummary
      .map((s) => `• **${s.source}** _(${s.mode})_ → Alimenta: ${s.feeds}.`)
      .join('\n');
    return {
      text:
        `🗺️ **Mapa Completo de Datos y Vinculaciones Automáticas — Remex Work-OS**\n\n` +
        `${srcLines}\n\n` +
        `**Principales Automatizaciones Cruzadas:**\n` +
        `↔️ **Finanzas → Tareas:** Guardar una foto en \`debt_snapshots\` con exceso crítico >30 días crea automáticamente una tarea urgente \`TSK-XXXX\` de cobranza.\n` +
        `↔️ **Agenda → Viajes → Flota:** Crear un recorrido en \`events\` genera su Hoja de Ruta \`trips/{id}\`, toma el odómetro de \`fleet_vehicles\` y calcula solo los km urbanos hechos en Bariloche entre viajes.\n` +
        `↔️ **Tareas ↔ Inbox:** Todo comentario en el chat de una tarea notifica en tiempo real y permite teletransportarse desde \`Mensajes\`.\n` +
        `↔️ **Bot ↔ Presupuestos Centro:** \`bot_config_global\` regula el SLA y las reglas IA del flujo en vivo de WhatsApp.`,
      chapterRef: REMEX_MANUAL_CHAPTERS[13],
      suggestedActions: [
        { label: '📖 Abrir Manual Visual con Fotos', action: { type: 'NAVIGATE', view: 'manual' } }
      ]
    };
  }

  // 7. BÚSQUEDA EN LOS 14 CAPÍTULOS DEL MANUAL DE REMEX OS
  const words = norm.split(/\s+/).filter((w) => w.length >= 3);
  let bestChapter = null;
  let bestScore = 0;
  for (const ch of REMEX_MANUAL_CHAPTERS) {
    const corpus = normalizeText(
      `${ch.title} ${ch.badge} ${ch.purpose} ${ch.howItWorks} ${ch.dataSource} ${ch.crossLinks.join(' ')}`
    );
    let score = 0;
    for (const w of words) {
      if (corpus.includes(w)) score += 2;
      if (normalizeText(ch.title).includes(w)) score += 4;
    }
    if (score > bestScore) {
      bestScore = score;
      bestChapter = ch;
    }
  }

  if (bestChapter && bestScore >= 4) {
    return {
      text:
        `📘 **${bestChapter.number}. ${bestChapter.title}**\n\n` +
        `• **¿Para qué sirve?:** ${bestChapter.purpose}\n` +
        `• **¿Cómo funciona?:** ${bestChapter.howItWorks}\n` +
        `• **¿De dónde sale la información?:** ${bestChapter.dataSource}\n\n` +
        `**Vinculaciones con otros módulos:**\n` +
        bestChapter.crossLinks.map((l) => `↔️ ${l}`).join('\n') +
        `\n\n**Cómo usarlo:**\n` +
        bestChapter.howToUse.map((u, i) => `${i + 1}. ${u}`).join('\n'),
      chapterRef: bestChapter,
      suggestedActions: [
        { label: `🚀 Ir a ${bestChapter.title.split('—')[0].split('(')[0].trim()}`, action: { type: 'NAVIGATE', view: bestChapter.viewTarget } },
        { label: '📖 Ver Captura Rotulada en Manual', action: { type: 'NAVIGATE', view: 'manual' } }
      ]
    };
  }

  // 8. RESPUESTA GUÍA COMPLETA POR DEFECTO
  return {
    text:
      `👋 Soy el **Ayudante Inteligente de Remex Work-OS** (usuario activo: **${user?.name || 'Operador'}**).\n\n` +
      `Tengo conocimiento completo de los **14 módulos**, sé de dónde sale cada colección y puedo ejecutar tareas reales por vos:\n` +
      `• **Crear tareas en vivo:** _"Creá una tarea: Revisar stock de filtros en Centro prioridad alta"_\n` +
      `• **Agendar en calendario:** _"Agendá evento: Llamar proveedor Wega mañana"_\n` +
      `• **Configurar Bot WhatsApp:** _"Cambiá el recordatorio del bot a 30 minutos"_\n` +
      `• **Consultar datos vivos:** _"¿Qué tareas hay pendientes?"_, _"Resumen operativo de Remex"_\n` +
      `• **Explicación y Navegación:** _"¿Cómo se vincula Finanzas con Tareas?"_, _"Abrí Viajes de Reparto"_, _"Abrí el Manual con fotos"_`,
    suggestedActions: [
      { label: '📊 Resumen Operativo en Vivo', action: { type: 'ASK_PROMPT', prompt: 'Resumen operativo de Remex' } },
      { label: '📖 Abrir Manual con Fotos', action: { type: 'NAVIGATE', view: 'manual' } },
      { label: '🗺️ ¿De dónde sale cada dato?', action: { type: 'ASK_PROMPT', prompt: '¿De dónde sale la información y cómo se vincula todo?' } },
      { label: '🤖 Ir a Bot Check-Oil', action: { type: 'NAVIGATE', view: 'bot' } }
    ]
  };
}
