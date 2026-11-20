import { createTaskInDb } from '../../tasks/services/taskService';
import { createEventInDb } from '../../calendar/services/calendarService';
import { upsertBotDocumentInN8n } from '../../bot/services/botService';
import { canAccessCentralBasesSection } from '../../central_bases/services/centralBasesService';

/**
 * ============================================================================
 * MANUAL MAESTRO, FÓRMULAS EXPLICADAS Y MOTOR COPILOTO — REMEX WORK-OS v2.8.0
 * ============================================================================
 * Cubre las 17 secciones integrales de Remex OS (Web + Desktop Electron),
 * detallando siempre:
 *   1) De dónde viene exactamente la información (archivos .DBF, SQL, PostgreSQL o Firestore)
 *   2) Cómo se calcula cada indicador paso a paso, con lenguaje claro y directo para adultos.
 */
export const REMEX_ARCHITECTURE_OVERVIEW = {
  systemName: 'Remex Work-OS (Web & Desktop Electron)',
  version: '2.8.0',
  goldenRules: [
    'Sincronización reactiva en tiempo real sobre Firebase Firestore (onSnapshot): todo movimiento operativo se refleja al instante en todas las estaciones conectadas.',
    'Lectura 100% Segura y Sin Bloqueos de Casa Central REMEX (C:\\mayor\\*.DBF → u566398466_franquicias) reservada exclusivamente para Socios Directores y SuperAdmin.',
    'Control Maestro en Producción + Simulador Sandbox IA v3.0 del Bot WhatsApp Check-Oil: las correcciones se entrenan primero en Borrador y solo pasan a WhatsApp al publicarlas en vivo.',
    'Trazabilidad Contable y Operativa Transparente: ningún cálculo es una caja negra; cada indicador explica de qué tabla proviene y qué cuenta matemática exacta realiza.'
  ],
  dataSourcesSummary: [
    {
      source: 'Base Central REMEX (.DBF → MySQL Cloud)',
      mode: 'Exclusivo Socios & SuperAdmin (Solo Lectura)',
      tables: '38 tablas C:\\mayor\\*.DBF (factura1/2, CLIENTE, RECIBOS, CHEQUES, articulo, remex, compras1, proveedo)',
      feeds: 'Lector Base Central REMEX (00 Bariloche y 00 BsAs): Recaudación Semanal Estimada, Stock, Compras IA, Cta. Cte. y Cheques'
    },
    {
      source: 'Agentes Remex Backup en Sucursales y Central',
      mode: 'Telemetría Cada 5 Segundos + Control Remoto',
      tables: 'API franquicias.check-oil.com (backup_logs, backup_command)',
      feeds: 'Backups Red: estado en vivo de cada PC, barras de subida y órdenes remotas de respaldo'
    },
    {
      source: 'Servidor Bot WhatsApp n8n + PostgreSQL + Cochecita SQL',
      mode: 'Producción Activa + Simulador Sandbox v3.0',
      tables: 'sesiones_clientes, bot_config_global + SQL Cochecita Read-Only (/bot-lookup)',
      feeds: 'Bot Check-Oil, Simulador y Entrenador IA (Borrador → Vivo), Informe Sin Derivación y Presupuestos Centro (#COT)'
    },
    {
      source: 'Motor Operativo Firestore (tasks, deleted_tasks, notifications)',
      mode: 'Tiempo Real Multi-Usuario',
      tables: 'tasks, deleted_tasks, notifications + Badge Nativo Electron',
      feeds: 'Tablero KanBan de Tareas, Firmas Conjuntas, Bandeja Inbox Global y Estadísticas Generales'
    },
    {
      source: 'Comercial, Logística y Flota Firestore',
      mode: 'Circuito Preventa → Reparto → Rendición Triple → Flota',
      tables: 'contacts, zones, events, trips, fleet_vehicles, fleet_logs',
      feeds: 'CRM Clientes, Zonas, Calendario Operativo, Viajes de Reparto, Rendición en Mano y Km Urbano en Bariloche'
    },
    {
      source: 'Gobierno Societario y Riesgo Financiero Firestore',
      mode: 'Dirección 3/3 & Auditoría Crediticia FIFO',
      tables: 'partner_proposals (votos 3/3), debt_snapshots, users, areas',
      feeds: 'Directorio Exclusivo de Socios (Martín, Alejandro, Juan Pablo), Finanzas (FIFO) y Administración'
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
      'Autentica a cada integrante del equipo con correo y contraseña corporativa, cargando automáticamente su perfil, área operativa y permisos exactos.',
    howItWorks:
      'Valida credenciales contra Firebase Authentication y cruza el identificador del usuario con su ficha en Firestore (users/{uid}). Si quien ingresa es un Socio Director (Martín, Alejandro o Juan Pablo) o SuperAdmin, desbloquea además los módulos reservados de Socios (3/3), Base Central REMEX y Administración.',
    dataSource:
      'Firebase Authentication + colección Firestore users + colección areas.',
    howItCalculates: [
      'Nivel de Acceso Efectivo: el sistema lee el campo role/roles y el correo autenticado. Solo si coincide con uno de los 3 Socios Directores o con el rol Super_Usuario habilita los botones de "Socios (3/3)" y "Base Central DBF"; para el resto del personal ni siquiera se renderizan.',
      'Contador de Avisos Pendientes (Badge de Escritorio): toma todas las notificaciones recibidas por el usuario o su área y cuenta únicamente aquellas con estado read = false.'
    ],
    crossLinks: [
      'Define qué tareas con candado privado puede visualizar cada usuario en el Tablero KanBan.',
      'Controla quién puede estampar "Firma Conjunta" por área y quién accede a Base Central REMEX o Socios.'
    ],
    howToUse: [
      'Ingresá tu correo corporativo y contraseña en la portada de Remex Work-OS.',
      'Desde el ícono de configuración superior podés elegir si deseás alertas sonoras para todo, solo urgentes o silencio.'
    ],
    callouts: [
      'Cabecera Corporativa Remex Work-OS: identifica la estación segura Web / Desktop Electron (Windows y Mac).',
      'Identificación por Correo Oficial: vincula el ingreso con el perfil departamental almacenado en Firestore (users/{uid}).',
      'Credencial Cifrada Firebase Auth: protege cada sesión individual y admite blanqueo administrativo vía Cloud Function.',
      'Carga Dinámica de Permisos: habilita Base Central DBF, Socios (3/3) y Admin exclusivamente a cuentas autorizadas.'
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
      'Convierte cada pedido operativo o administrativo en una tarjeta trazable (TSK-XXXX) organizada en 5 etapas visuales con responsables, vencimientos, bloqueos y chat propio.',
    howItWorks:
      'Opera en tiempo real sobre la colección tasks. Soporta dependencias entre tareas, candado de privacidad, exigencia de "Firma Conjunta" cuando intervienen dos o más sectores y clonado automático de tareas periódicas al cerrarse.',
    dataSource:
      'Colección Firestore tasks en vivo + colección de resguardo inmutable deleted_tasks.',
    howItCalculates: [
      'Estado de Bloqueo por Dependencia: si la Tarea B declara que depende de la Tarea A, el sistema revisa si A tiene estado "closed". Mientras A siga abierta, B permanece retenida como bloqueada.',
      'Validación de Firma Conjunta: cuenta cuántas áreas distintas fueron asignadas a la tarjeta y verifica que exista al menos una firma aprobada por cada área involucrada antes de permitir el cierre definitivo.',
      'Próximo Vencimiento en Tareas Recurrentes: al pasar a "Cerrada" una tarea diaria, semanal o mensual, suma 1 día, 7 días o 1 mes calendario a la fecha base y crea limpia la siguiente ocurrencia.'
    ],
    crossLinks: [
      'Recibe tarjetas urgentes automáticas creadas por "Finanzas" cuando detecta deuda vencida descubierta mayor a 30 días.',
      'Todo comentario dentro de una tarjeta alimenta al instante la bandeja unificada de "Mensajes (Inbox)".'
    ],
    howToUse: [
      'Tocá "+ Nueva Tarea" para definir título, área responsable, prioridad, fecha límite y si requiere privacidad o firma conjunta.',
      'Arrastrá las tarjetas de izquierda a derecha a medida que avanzan hasta su validación y cierre.'
    ],
    callouts: [
      'Menú Lateral por Módulos: conecta Operaciones diarias y módulos gerenciales de Gestión.',
      'Barra Superior de Acceso Rápido: buscador transversal, atajos directos, Ayudante IA y campana de avisos.',
      'Cabecera Operativa y Filtro Global: alta de "+ Nueva Tarea" y filtrado instantáneo por Área o Responsable.',
      'Columnas KanBan Reactivas (Drag & Drop): Nuevas, Bloqueadas, En Proceso, Validación y Cerradas.'
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
      'Reúne en una sola bandeja tipo correo todos los comentarios, menciones y novedades escritas en cualquiera de las tareas de la empresa.',
    howItWorks:
      'Escucha simultáneamente la colección notifications y los historiales conversacionales de tasks, separando mensajes No Leídos, Recibidos y Enviados, con salto directo en 1 clic a la tarjeta donde nació la charla.',
    dataSource:
      'Colección Firestore notifications + campo history[] dentro de cada documento de tasks.',
    howItCalculates: [
      'Globo Naranja de Mensajes Sin Leer: filtra las notificaciones dirigidas al usuario o a su sector cuyo título/tipo corresponde a mensaje conversacional y suma las que aún tienen read = false.',
      'Orden Cronológico Unificado: toma la marca de tiempo exacta (timestamp ISO) del último comentario de cada hilo y ordena de más reciente a más antiguo.'
    ],
    crossLinks: [
      'El botón "Ir a Tarea" lleva al usuario directo al Tablero KanBan y abre en pantalla el expediente correspondiente.',
      'Actualiza el contador numérico en el ícono de la aplicación en Windows y macOS.'
    ],
    howToUse: [
      'Entrá a "Mensajes" cuando veas el contador naranja activo para leer novedades sin buscar tarjeta por tarjeta.',
      'Usá "Ir a Tarea" para contestar dentro del contexto completo del trabajo.'
    ],
    callouts: [
      'Cabecera del Centro de Mensajes: unifica toda la comunicación operativa interna.',
      'Pestañas de Lectura: separa No Leídos, Todos, Recibidos y Enviados.',
      'Buscador por Palabra Clave o Fecha: encuentra acuerdos históricos o códigos TSK en segundos.',
      'Botón "Ir a Tarea": abre de inmediato la tarjeta madre en el tablero operativo.'
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
      'Tablero de mando vivo del Bot de recepción WhatsApp de Check-Oil: gobierna encendido/pausa global, Auto-Pausa humana, minutos de recordatorio SLA y volumen derivado a cada sucursal.',
    howItWorks:
      'Lee y actualiza en caliente la base PostgreSQL de n8n (bot_config_global y sesiones_clientes), excluyendo grupos internos, teléfonos propios de sucursales y sesiones de prueba del simulador (__sim__).',
    dataSource:
      'API viva https://n8n.check-oil.tech/webhook/remex-bot-api (PostgreSQL checkoil_bot) + caché en Firestore bot_sync_cache.',
    howItCalculates: [
      'Tasa de Conversión a Sucursal (%): divide la cantidad de charlas reales que llegaron a derivarse efectivamente a una sucursal por el total de conversaciones reales de clientes, multiplicado por 100. Ejemplo: 64 derivadas sobre 105 charlas = (64 ÷ 105) × 100 = 61%.',
      'Alerta Amarilla de Seguimiento: mide cuántos minutos pasaron desde el último mensaje en charlas de hoy o ayer que aún no fueron derivadas; si supera los 25 minutos sin respuesta o cierre, enciende el aviso para intervenir.'
    ],
    crossLinks: [
      'El selector "Recordatorio (ej. cada 15 o 30 min)" regula automáticamente el reloj de avisos hacia Sucursal Centro en "Presupuestos".',
      'El botón de alerta amarilla abre directamente los casos estancados en el "Monitor de Charlas".'
    ],
    howToUse: [
      'Desde la barra superior podés pausar/activar el Bot globalmente o ajustar cada cuántos minutos recuerda presupuestos pendientes.',
      'Revisá los gráficos inferiores para comparar qué sucursales reciben más consultas.'
    ],
    callouts: [
      'Controles Maestros en Producción: encendido global del Bot, Auto-Pausa humana y selector de recordatorio SLA.',
      'Banner de Alerta de Seguimiento: detecta clientes recientes sin cerrar y permite intervenirlos en 1 clic.',
      'Navegador de 6 Sub-Módulos: Estadísticas, Informe Sin Derivación, Charlas, Simulador IA, Aprendizaje y Prompt.',
      'Gráficos de Conversión y Demanda por Sede: compara derivaciones entre las 6 sucursales.'
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
      'Audita mensaje por mensaje por qué ciertas conversaciones de WhatsApp no terminaron derivadas en sucursal y qué rubros fuera de catálogo están pidiendo los clientes.',
    howItWorks:
      'Analiza el historial completo de cada sesión para no dejarse engañar por saludos finales ("Gracias", "Ok") que antes pisaban el estado de derivado, y clasifica los no derivados reales por causa exacta.',
    dataSource:
      'Tabla PostgreSQL sesiones_clientes (historial_json completo) procesada por botNonDerivedAnalyzer.js.',
    howItCalculates: [
      'Depuración de Falsos "No Derivados": revisa todos los mensajes del historial; si en algún turno previo el Bot ya había enviado la derivación o el contacto de la sucursal y luego el cliente respondió "dale gracias", la cuenta correctamente como Derivada Efectiva.',
      'Porcentaje de Cada Motivo de Corte: sobre el subconjunto exclusivo de charlas realmente no derivadas, divide cada causal (dejó de contestar, faltó elegir sucursal, pidió frenos/baterías/mecánica, mandó audio sin texto) por el total de no derivados × 100.'
    ],
    crossLinks: [
      'Hacer clic en cualquier cliente del informe abre su conversación exacta en el "Monitor de Charlas" lista para contactarlo.'
    ],
    howToUse: [
      'Entrá a "Bot Check-Oil → Informe Sin Derivación", elegí el período (7 días, 30 días o histórico) y revisá los leads recuperables.'
    ],
    callouts: [
      'Pestaña "Informe Sin Derivación": auditoría forense automática sobre el historial real de WhatsApp.',
      'Filtros por Ventana de Tiempo y Exportación: acota por 24h, 7d, 30d o total y copia resumen ejecutivo.',
      'Depuración Transparente: muestra cuántas sesiones vacías se limpiaron y cuántas derivadas tenían saludo final.',
      'Desglose Accionable por Motivo y Rubro Pedido: identifica demanda insatisfecha y clientes a recuperar.'
    ]
  },
  {
    id: 'bot_monitor_charlas_y_aprendizaje',
    number: '06',
    title: 'Bot & IA — Monitor de Charlas en Vivo, Intervención y Enseñanza Directa',
    badge: 'ATENCIÓN Y CORRECCIÓN',
    viewTarget: 'bot',
    image: '/manual/remex/06_bot_monitor_charlas_wa.png',
    purpose:
      'Permite leer todas las conversaciones reales de WhatsApp, tomar el control humano cuando haga falta y corregir cualquier respuesta del Bot directamente desde la burbuja del mensaje.',
    howItWorks:
      'Muestra cada mensaje de cliente, bot, sucursal y operador. Al escribir desde la barra inferior envía el WhatsApp real por Evolution API y pausa al Bot en ese chat. Además, cada mensaje verde del Bot incluye el botón "Corregir / Enseñar respuesta" para entrenar nuevas reglas.',
    dataSource:
      'PostgreSQL sesiones_clientes + Evolution API + reglas_aprendidas_json en bot_config_global.',
    howItCalculates: [
      'Tiempo sin Respuesta por Chat: resta la hora actual menos la hora del último mensaje del cliente. Si la charla no fue derivada ni pausada y el cliente quedó esperando, la marca como pendiente de seguimiento.',
      'Prioridad Borrador vs. Vivo en Reglas: las correcciones guardadas como "Borrador" tienen impacto 0 en clientes reales de WhatsApp (solo actúan en el Simulador); recién al cambiar a "Publicada en Vivo" se inyectan en la atención real.'
    ],
    crossLinks: [
      'Desde cualquier corrección hecha en el Monitor podés pulsar "Probar este caso en el Simulador" y se carga automáticamente el teléfono y el mensaje en el laboratorio.'
    ],
    howToUse: [
      'Seleccioná una conversación a la izquierda para leerla o escribirle manualmente al cliente.',
      'Si ves una respuesta del Bot mejorable, tocá "Corregir / Enseñar respuesta" debajo de esa burbuja.'
    ],
    callouts: [
      'Navegación de Charlas y Aprendizaje: acceso rápido a todos los hilos reales y base de reglas IA.',
      'Filtros Operativos: separa charlas de Hoy, Ayer, Sin Respuesta, En Pausa o Derivadas.',
      'Control de Pausa e Intervención Humana: frena al Bot en ese número cuando atiende una persona.',
      'Burbujas Auditables con Botón "Corregir / Enseñar": convierte errores reales en reglas estructuradas.'
    ]
  },
  {
    id: 'bot_simulador_y_entrenador_ia',
    number: '07',
    title: 'Bot & IA — Simulador Sandbox de Conversaciones y Entrenador de Variables (v3.0)',
    badge: 'ENTRENAMIENTO SEGURO IA',
    viewTarget: 'bot',
    image: '/manual/remex/15_bot_simulador_entrenador_ia.png',
    purpose:
      'Laboratorio interactivo donde podés conversar con el Bot real (como Cliente Cochecita, Cliente Nuevo o Sucursal), ver qué variables internas detecta y corregir sus respuestas en Borrador antes de publicarlas al WhatsApp en vivo.',
    howItWorks:
      'Ejecuta exactamente el flujo real de n8n + consulta de patentes/vehículos en Cochecita (POST /webhook/remex-bot-sim), pero desvía cualquier envío a sucursal hacia un interceptor seguro (/sim-capture) para que jamás salga un WhatsApp verdadero durante las pruebas.',
    dataSource:
      'Motor n8n Bot v3.0 (/webhook/remex-bot-sim) + Puente SQL Cochecita Solo-Lectura (/bot-lookup) + Sintetizador IA OpenAI (synthesize_rule).',
    howItCalculates: [
      'Firewall Determinístico de Derivación: antes de dejar hablar a la IA, evalúa variables booleanas exactas (¿es solo consulta de historial/filtro?, ¿pidió una localidad donde no hay sucursal como Quilmes Oeste?, ¿tiene varios autos en Cochecita y aún no dijo cuál?, ¿disparó una regla entrenada con prohibir_derivar?). Si cualquiera da verdadero, bloquea físicamente la herramienta de derivar.',
      'Síntesis de Regla con Variables: cuando explicás en palabras qué hizo mal el Bot, el entrenador IA extrae palabras clave disparadoras (keywords_disparo), categoría, permiso de derivación y ejemplo de respuesta ideal, guardándolo en estado "borrador" hasta que apruebes "Publicar al Bot en Vivo".'
    ],
    crossLinks: [
      'Comparte la misma base de reglas con "Aprendizaje IA" y recibe casos reales enviados con 1 clic desde el "Monitor de Charlas".',
      'Consulta en vivo los vehículos y el último servicio completo registrado en SQL Cochecita sin modificar ni un dato.'
    ],
    howToUse: [
      'Dentro de "Bot Check-Oil", abrí la pestaña "Simulador y Entrenador IA" y elegí el modo (Cliente Cochecita por teléfono o patente, Cliente Nuevo o Sucursal).',
      'Escribí mensajes de prueba, revisá a la derecha las "Variables Detectadas" y usá "Corregir / Enseñar acá" para ajustar respuestas.',
      'Cuando la prueba en Borrador responda perfecto, tocá "Publicar al Bot en Vivo".'
    ],
    callouts: [
      'Barra de Ciclo Borrador → Vivo: muestra cuántos borradores estás probando y publica al WhatsApp real en 1 clic.',
      'Selector de 3 Modos Reales: prueba con teléfonos/patentes reales de Cochecita, clientes nuevos o cualquiera de las 6 sucursales.',
      'Chat Sandbox con Intercepción de Sucursal: muestra la vista previa exacta del #COT o derivación sin enviar WhatsApps reales.',
      'Inspector de Variables y Reglas en Vivo: transparenta bloqueos de derivación, autos de Cochecita y reglas disparadas.'
    ]
  },
  {
    id: 'presupuestos_piloto_centro_remex',
    number: '08',
    title: 'Módulo Exclusivo de Presupuestos, Filtros, Aceites y Demoras (Centro)',
    badge: 'AUDITORÍA #COT & SLA',
    viewTarget: 'bot_quotes',
    image: '/manual/remex/07_presupuestos_piloto_centro.png',
    purpose:
      'Audita todas las solicitudes de cotización (#COT) gestionadas con Sucursal Centro: tiempos reales de respuesta en horario comercial, repreguntas, PDFs enviados, códigos cotizados y confirmaciones.',
    howItWorks:
      'Cuando un cliente pide cotización para Centro, el Bot envía la ficha #COT (incluyendo patente y último servicio completo si está en Cochecita) y mide cuánto tarda la sucursal en responder el presupuesto oficial.',
    dataSource:
      'PostgreSQL sesiones_clientes (cotizacion_actual_json, cotizaciones_historial_json) + horario_comercial_json en bot_config_global.',
    howItCalculates: [
      'Demora Hábil Real (Reloj SLA Comercial): no cuenta horas nocturnas ni domingos cerrados. Si un cliente pide presupuesto un sábado a las 20:00 hs y la sucursal abre el lunes a las 08:30 hs y contesta a las 08:45 hs, la demora calculada es 15 minutos (solo los minutos dentro del horario de atención configurado).',
      'Diferencia de Precios / Ítems por Modelo: extrae de cada PDF o texto oficial el valor total, los litros de aceite y los códigos de filtros para comparar consistencia ante un mismo vehículo.'
    ],
    crossLinks: [
      'Sincronizado con el recordatorio automático por WhatsApp que avisa a Sucursal Centro cada X minutos hábiles mientras un #COT sigue pendiente.'
    ],
    howToUse: [
      'Abrí "Presupuestos (Centro)" en el menú lateral para ver pedidos abiertos, demoras por franja horaria y comparativa de insumos cotizados.'
    ],
    callouts: [
      'Cabecera y Reloj SLA Comercial: muestra estado de horario hábil y frecuencia de recordatorio activo.',
      'Sub-Pestañas Analíticas: Pedidos en Vivo, Filtros por Modelo, Comparador, Franjas Horarias y Configuración.',
      'Indicadores #COT: volumen cotizado, demora hábil promedio y tasa de aceptación.',
      'Tarjetas Detalladas por Ticket: vehículo, patente, insumos del PDF y tiempos exactos.'
    ]
  },
  {
    id: 'crm_comercial_y_zonas',
    number: '09',
    title: 'Directorio CRM Comercial, Bitácora y Gestor Dinámico de Zonas',
    badge: 'CLIENTES Y RUTAS',
    viewTarget: 'crm',
    image: '/manual/remex/08_crm_clientes_y_zonas.png',
    purpose:
      'Organiza el padrón comercial de clientes de reparto y proveedores, agrupándolos por Zonas Logísticas con colores e historial de acuerdos.',
    howItWorks:
      'Permite cargar fichas manuales o importar planillas CSV, asignar una o varias zonas a cada cliente y actualizar en cascada todas las fichas si se renombra un corredor.',
    dataSource:
      'Colecciones Firestore contacts y zones.',
    howItCalculates: [
      'Sincronización Inteligente de Zonas: compara el nombre de localidad/ruta escrito en clientes importados (ignorando mayúsculas y tildes) contra las Zonas oficiales creadas y los vincula automáticamente en lote.',
      'Densidad Comercial por Corredor: contabiliza cuántos clientes activos pertenecen a cada zona para dimensionar días de preventa y reparto.'
    ],
    crossLinks: [
      'Las Zonas definidas acá colorean el "Calendario Operativo", estructuran los "Viajes de Reparto" y segmentan "Estadísticas".'
    ],
    howToUse: [
      'Filtrá por corredor logístico o buscá un cliente para consultar su bitácora o agendarle una llamada en 1 clic.'
    ],
    callouts: [
      'Cabecera del Directorio Comercial: padrón unificado conectado con Agenda y Viajes.',
      'Importador CSV y Gestor de Zonas: alta masiva y mantenimiento de rutas por color.',
      'Filtros Rápidos por Corredor: Bariloche, El Bolsón, Línea Sur, Valle, etc.',
      'Fichas con Bitácora y Atajo a Agenda: historial comercial completo de cada cuenta.'
    ]
  },
  {
    id: 'agenda_y_viajes_reparto',
    number: '10',
    title: 'Agenda Operativa, Tablero de Viajes de Reparto y Rendición Triple',
    badge: 'LOGÍSTICA Y COBRANZAS',
    viewTarget: 'calendar',
    image: '/manual/remex/09_agenda_y_viajes_reparto.png',
    purpose:
      'Conecta el calendario mensual de preventa/reparto con la Hoja de Ruta real de cada camión o utilitario y la liquidación exacta del dinero y mercadería al regresar.',
    howItWorks:
      'Registra en la salida la camioneta asignada, km inicial, valor de mercadería cargada y deuda previa en esa zona; al volver registra km final, gastos de viaje y cobros separados por medio de pago.',
    dataSource:
      'Colecciones Firestore events y trips cruzadas con zones y fleet_vehicles.',
    howItCalculates: [
      'Efectivo Físico Neto a Entregar en Mano: toma únicamente lo cobrado en Efectivo billete durante el viaje y le resta los gastos pagados en efectivo en ruta (combustible, comida, hotel, peajes). Cheques y Transferencias se suman al total cobrado pero nunca se mezclan con los billetes físicos del sobre.',
      'Nuevo Saldo de Deuda en la Zona: parte de la Deuda Previa de la zona + Mercadería Entregada en el viaje − Total Cobrado (Efectivo + Cheques + Transferencias). Ejemplo: había $5.000.000 en la calle, se bajaron $3.000.000 de mercadería y se cobraron $4.500.000 → la zona queda en $3.500.000.',
      'Kilómetros Recorridos en Ruta: Odómetro de Llegada − Odómetro de Salida.'
    ],
    crossLinks: [
      'Al cerrar el viaje actualiza automáticamente el odómetro oficial del vehículo en "Flota y Mantenimiento".'
    ],
    howToUse: [
      'Programá la salida en "Agenda" o abrí "+ Nuevo Viaje Operativo" en "Tablero de Viajes" y completá al regreso la Rendición Triple.'
    ],
    callouts: [
      '4 Sub-Módulos Integrados: Calendario, Tablero de Viajes, Flota y Métricas Zonales.',
      'Apertura de Hoja de Ruta: vincula zona, chofer/vendedor, vehículo y carga inicial.',
      'Control en Curso: monitorea km de salida, mercadería llevada y saldo previo en calle.',
      'Liquidación con Rendición Triple: audita billetes en mano, valores, transferencias y gastos.'
    ]
  },
  {
    id: 'flota_y_movimiento_urbano',
    number: '11',
    title: 'Flota, Mantenimiento y Detección de Movimiento Urbano en Bariloche',
    badge: 'CONTROL DE UNIDADES',
    viewTarget: 'calendar',
    image: '/manual/remex/10_flota_y_mantenimiento.png',
    purpose:
      'Controla cada vehículo propio de reparto (odómetro actual, services, talleres, consumo esperado) y detecta automáticamente cuántos kilómetros se usó la unidad dentro de la ciudad entre un viaje y otro.',
    howItWorks:
      'Cruza cada nuevo viaje abierto con el último kilometraje de llegada guardado para esa patente en fleet_vehicles y consolida una bitácora única sin huecos.',
    dataSource:
      'Colecciones Firestore fleet_vehicles y fleet_logs vinculadas con trips.',
    howItCalculates: [
      'Kilómetros de Movimiento Urbano entre Viajes: resta el Odómetro de Salida del viaje actual menos el Odómetro de Llegada del viaje anterior. Ejemplo sencillo: si la Sprinter volvió de El Bolsón con 142.000 km y hoy sale a Villa La Angostura marcando 142.160 km, el sistema registra automáticamente 160 km de uso urbano local.',
      'Consumo Real (Litros cada 100 km): divide los litros totales cargados por los kilómetros recorridos y multiplica por 100: (Litros ÷ Km) × 100.'
    ],
    crossLinks: [
      'Alimenta el selector de vehículos y alertas de service próximo al iniciar cualquier Hoja de Ruta.'
    ],
    howToUse: [
      'Entrá a "Agenda → Flota y Mantenimiento" para auditar consumos, cargar arreglos mecánicos o revisar los km urbanos detectados.'
    ],
    callouts: [
      'Pestaña Flota Sincronizada: recibe odómetros automáticos de cada viaje liquidado.',
      'Alta de Unidades y Mantenimientos: registra camionetas, services, frenos o lavados.',
      'Tarjetas por Patente: muestran km actual, consumo L/100km e historial técnico.',
      'Detector Automático Urbano: deja asentados los km hechos en ciudad entre viajes de ruta.'
    ]
  },
  {
    id: 'directorio_socios_3de3',
    number: '12',
    title: 'Directorio Exclusivo de Socios — Gobernanza y Unanimidad 3/3',
    badge: 'MARTÍN • ALEJANDRO • JUAN PABLO',
    viewTarget: 'partners',
    image: '/manual/remex/11_directorio_socios_3de3.png',
    purpose:
      'Libro de actas digital privado de los 3 Socios Directores donde las propuestas comerciales u operativas solo se convierten en Regla Firme si logran aprobación unánime 3 de 3.',
    howItWorks:
      'Cada moción guarda el voto individual y fundamentado de Martín, Alejandro y Juan Pablo, bloqueando modificaciones unilaterales y dejando constancia histórica con fecha y hora.',
    dataSource:
      'Colección Firestore partner_proposals protegida por canAccessPartnersSection.',
    howItCalculates: [
      'Regla Matemática de Unanimidad (3/3): evalúa los 3 casilleros nominales (martin, alejandro, juan_pablo). Solo cuando los 3 registran voto "aprobado" (3 ÷ 3 = 100%) la propuesta pasa a estado "Regla Firme Vigente". Si hay 1 o 2 votos a favor y ninguno en contra, figura "En Votación"; si al menos 1 socio vota "observado/rechazado", se frena para revisión.'
    ],
    crossLinks: [
      'Acceso estrictamente restringido a los 3 Socios Directores y SuperAdmin.'
    ],
    howToUse: [
      'Entrá a "Socios (3/3)" para redactar una propuesta nueva, votar mociones pendientes o consultar las Reglas Firmes vigentes.'
    ],
    callouts: [
      'Cabecera del Directorio Societario: acceso exclusivo para Martín, Alejandro y Juan Pablo.',
      'Indicadores del Libro de Actas: Reglas Firmes 3/3, En Votación y Pendientes de mi voto.',
      'Filtros por Categoría y Estado: localiza políticas de precios, sucursales o normas internas.',
      'Tarjetas con Votación Nominal 3/3: exhibe el estado y fundamento de cada socio.'
    ]
  },
  {
    id: 'lector_bases_central_remex',
    number: '13',
    title: 'Lector de Bases Central REMEX (00 Bariloche & 00 BsAs — Recaudación, Stock y DBF)',
    badge: 'EXCLUSIVO SOCIOS & SUPERADMIN',
    viewTarget: 'central_bases',
    image: '/manual/remex/16_lector_bases_central_remex.png',
    purpose:
      'Permite a los Socios y SuperAdmin inspeccionar en vivo toda la contabilidad y operación mayorista de Casa Central REMEX (y Sede Bs. As.) directamente desde sus tablas originales C:\\mayor\\*.DBF, sin entrar al sistema viejo ni bloquear terminales.',
    howItWorks:
      'Consulta en modo 100% lectura el espejo MySQL alimentado por Remex Backup (38 tablas .DBF: facturación, clientes, recibos, cheques, stock, compras IA y proveedores) e incluye además un lector binario directo para abrir cualquier archivo .DBF suelto desde la PC.',
    dataSource:
      'API Cloud MySQL https://franquicias.check-oil.com/api/index.php (sedes 00 y 00-bsas originadas en C:\\mayor\\*.DBF) + lector local binario Windows-1252.',
    howItCalculates: [
      'Promedio y Proyección de Recaudación Estimada para la Siguiente Semana (Explicado en 5 pasos sencillos): ' +
        'Paso 1 (Limpieza): toma todas las facturas con saldo abierto (factura1.DBF), descuenta recibos ya cobrados y quita las cuentas marcadas como incobrables. ' +
        'Paso 2 (Cuándo paga de verdad cada cliente): en vez de confiar ciegamente en que dice "30 días", calcula el ciclo real combinando 70% lo que ese cliente tardó históricamente en pagar sus recibos (RECIBOS.DBF) + 30% el plazo teórico de la factura. Ejemplo: si un cliente suele pagar a los 40 días aunque su factura diga 30, el sistema proyecta su pago para el día 37 (40×0,7 + 30×0,3). ' +
        'Paso 3 (Prudencia según atraso y exclusión >90 días): las facturas en fecha caen en la semana exacta en que cumplen su ciclo; las que llevan un atraso corto (hasta 60 días) se reparten prudentemente en 2 o 3 semanas (60%/40% o 35%/35%/30%); las de 61 a 90 días solo proyectan recuperar el 60% repartido entre las semanas 2 a 4; y toda deuda vieja de más de 90 días se EXCLUYE por completo para jamás inflar con plata congelada lo que esperás cobrar la semana que viene. ' +
        'Paso 4 (Cheques en Cartera): suma de CHEQUES.DBF únicamente los cheques activos cuya fecha de vencimiento cae dentro de esos 7 días. ' +
        'Paso 5 (Ventas nuevas rápidas + Contado): en las semanas 3 y 4 agrega las nuevas ventas de ciclo corto (<21 días) ajustadas por la tasa real de cobro, y en todas suma el promedio semanal de ventas al contado de las últimas 8 semanas. Finalmente, el Promedio Semanal Proyectado es la suma de las próximas 4 semanas dividida por 4.',
      'Ganancia Bruta Real Mensual: toma las ventas netas sin IVA de cada artículo facturado (factura2.dbf) y les resta su costo neto de reposición (articulo.DBF).',
      'Capital Estancado y Ahorro Compras IA: suma a costo neto todos los artículos con stock > 0 que tuvieron 0 ventas en 365 días, y calcula cuánto dinero ahorra Compras IA al frenar reposiciones automáticas de artículos sin rotación reciente.'
    ],
    crossLinks: [
      'Alimentado automáticamente por los respaldos silenciosos monitoreados en la sección "Backups Red".',
      'Visible y accesible únicamente para los 3 Socios Directores y SuperAdmin.'
    ],
    howToUse: [
      'Entrá a "Base Central (DBF)" en el menú izquierdo y elegí "00 · Casa Central REMEX" o "00 BsAs".',
      'En "Resumen & Cobranzas", tocá Semana +1 a +4 para ver el gráfico de últimas 8 semanas cobradas vs. próximas 4 estimadas y pasá el mouse por cualquier ícono ⓘ para leer el origen exacto de cada número.',
      'Dentro del cuadro "Desglose", tocá "Ver más" (o el botón inferior) para abrir la ventana ampliada con todos los clientes a cobrar, buscador y cheques que acreditan esa semana.',
      'Navegá por Catálogo & Compras IA, Clientes & Cta. Cte., Proveedores & Cheques o abrí un archivo .DBF local en la quinta pestaña.'
    ],
    callouts: [
      'Cabecera Compacta Socios/SuperAdmin: selector entre Casa Central Bariloche (00), Sede BsAs (00-bsas), botón Fórmulas e íconos ⓘ con globos flotantes para monitores de cualquier resolución.',
      '6 KPIs Contables en Vivo: Cuentas por Cobrar, Estimado Próx. 7 Días, Cheques, Proveedores, Stock a Costo y Ahorro IA, cada uno con su ícono ⓘ explicativo.',
      'Proyección de Recaudación Semanal (Sem. +1 a +4): gráfico comparativo de las últimas 8 semanas reales cobradas (RECIBOS.DBF) vs. próximas 4 estimadas excluyendo mora >90 días.',
      'Desglose Exacto + Botón "Ver más": 4 recuadros con ícono ⓘ (Facturas en término, Recupero atraso, Cheques a acreditar, Rotación + Contado) y modal ampliado con la agenda nominal completa de clientes y cheques.'
    ]
  },
  {
    id: 'finanzas_y_riesgo_crediticio',
    number: '14',
    title: 'Finanzas, Absorción FIFO del Límite Crediticio y Disparo de Cobranza',
    badge: 'RIESGO Y FLUJO DE CAJA',
    viewTarget: 'finances',
    image: '/manual/remex/12_finanzas_y_riesgo.png',
    purpose:
      'Controla si la deuda acumulada en la calle supera el cupo financiero sano fijado por Dirección y dispara sola una tarea urgente de cobranza cuando queda deuda vieja sin respaldo.',
    howItWorks:
      'Registra cortes periódicos de deuda divididos por tramos de fecha (debt_snapshots) y los enfrenta contra el Límite Operativo tolerable.',
    dataSource:
      'Colección Firestore debt_snapshots conectada automáticamente con tasks.',
    howItCalculates: [
      'Absorción FIFO ("Primero lo más viejo") y Excedente Crítico (>30 días) explicado fácil: imaginá que tenés un "paraguas" (Límite Operativo) de $27.000.000 y dos tramos de deuda: uno viejo de hace 45 días por $20.000.000 y otro más reciente de hace 35 días por $11.850.000 (Deuda Total = $31.850.000). ' +
        'El sistema ordena del más antiguo al más nuevo: el primer tramo de $20M entra entero bajo el paraguas (quedan $7M de paraguas disponible). Del segundo tramo de $11,85M, el paraguas alcanza a cubrir $7M y quedan descubiertos $4.850.000. Como ese tramo ya tiene más de 30 días de antigüedad, esos $4.850.000 se marcan como Excedente Crítico y disparan automáticamente una Tarea Urgente de Cobranza en el KanBan.'
    ],
    crossLinks: [
      'Dispara tarjetas automáticas "Objetivo de Cobranza Urgente" en el Tablero KanBan cuando el Excedente Crítico es mayor a $0.'
    ],
    howToUse: [
      'Cargá un "+ Nuevo Corte" con los tramos por fecha o ajustá el Límite Operativo para medir exposición real.'
    ],
    callouts: [
      'Cabecera de Auditoría Crediticia: carga de nuevos cortes y ajuste de cupo tolerable.',
      'Tarjetas FIFO: Deuda Total en Calle vs. Límite Operativo vs. Excedente Crítico >30 días.',
      'Curva Histórica de Riesgo: evolución corte tras corte frente a la línea límite.',
      'Desglose por Tramos y Gatillo KanBan: muestra qué porción absorbió el cupo y cuál exige cobranza.'
    ]
  },
  {
    id: 'control_remoto_backups_red',
    number: '15',
    title: 'Control Remoto y Monitoreo en Vivo de Backups de la Red (Remex Backup)',
    badge: 'RESPALDO EN TIEMPO REAL',
    viewTarget: 'backups',
    image: '/manual/remex/17_backups_red_vivo.png',
    purpose:
      'Permite supervisar cada 5 segundos si las computadoras de Casa Central y de las 6 sucursales están respaldando al día sus bases .DBF y enviarles órdenes remotas en 1 clic.',
    howItWorks:
      'Recibe el pulso en vivo de cada agente de escritorio Remex Backup instalado en Windows/Mac, mostrando barra de porcentaje, tablas copiadas sobre el total de 32 tablas troncales e historial de corridas.',
    dataSource:
      'Endpoints en vivo https://franquicias.check-oil.com/api/index.php?action=backup_logs y action=backup_command.',
    howItCalculates: [
      'Estado "PC Conectada en Vivo": compara la hora actual del servidor menos el último latido (heartbeat) enviado por el programa Remex Backup de esa sucursal; si ocurrió hace pocos segundos, la marca Online en verde.',
      'Integridad de Base Completa (100%): verifica cuántas de las 32 tablas .DBF principales requeridas para contabilidad y stock están presentes y actualizadas sin cortes (ej. 32/32 tablas = Base 100% Completa).'
    ],
    crossLinks: [
      'Cada vez que la PC "00 · Casa Central REMEX" completa un backup aquí, actualiza automáticamente los números que ven los Socios en "Base Central (DBF)".'
    ],
    howToUse: [
      'Abrí "Backups Red" en el menú lateral para verificar que todas las sedes estén al 100% o enviar "Iniciar Backup Rápido" / "Forzar Backup Completo" a distancia.'
    ],
    callouts: [
      'Cabecera con Pulso cada 5 Segundos: filtro por sede (00 Casa Central a 06 Km 13) y actualización instantánea.',
      '4 KPIs de Salud de Red: PCs Conectadas en Vivo, Subiendo Ahora, Bases Completas (32/32) e Inconclusas.',
      'Tarjetas por Equipo con Barra en Vivo: progreso porcentual, peso en MB, duración y última fecha respaldada.',
      'Botonera de Mando Remoto: dispara Backup Rápido, Backup Completo, Pausa o Actualización sin tocar esa PC.'
    ]
  },
  {
    id: 'estadisticas_y_administracion',
    number: '16',
    title: 'Estadísticas Generales de Rendimiento y Administración de Usuarios/Áreas',
    badge: 'GERENCIA Y SEGURIDAD',
    viewTarget: 'reports',
    image: '/manual/remex/13_estadisticas_y_admin.png',
    purpose:
      'Mide con gráficos exportables a PDF la eficiencia de resolución de tareas por mes y por zona ("Estadísticas") y administra altas, bajas, sectores y claves del personal ("Admin").',
    howItWorks:
      'Cruza en vivo las colecciones tasks, zones, contacts y users para armar el tablero gerencial, mientras que Admin opera sobre Firebase Auth mediante Google Cloud Functions seguras.',
    dataSource:
      'Colecciones Firestore tasks, contacts, zones, users, areas + Cloud Function administrativa.',
    howItCalculates: [
      'Tasa Global de Cierre (%): divide el total de tareas en estado "closed" por el total general de tareas registradas y multiplica por 100: (Cerradas ÷ Totales) × 100.',
      'Eficiencia por Zona (%): para cada zona logística, cuenta cuántas tareas se asignaron a esa zona y qué porcentaje ya se cerró, clasificándola en Óptima, En Seguimiento o Crítica.'
    ],
    crossLinks: [
      'Las áreas y usuarios gestionados en "Admin" actualizan de inmediato los permisos de ingreso y los selectores de todo Remex OS.'
    ],
    howToUse: [
      'Entrá a "Estadísticas" para evaluar cumplimiento y descargar el Reporte Gerencial PDF, o a "Admin" para gestionar cuentas y sectores.'
    ],
    callouts: [
      'Acceso Dual Gerencial: Estadísticas operativas y panel Admin de usuarios.',
      'Gestión de Estructura y Áreas: crea departamentos y subáreas en caliente.',
      'Buscador de Personal: localiza cuentas activas o inactivas al instante.',
      'Control de Permisos y Claves: edita roles y resetea contraseñas de forma segura.'
    ]
  },
  {
    id: 'manual_visual_y_copiloto_remex',
    number: '17',
    title: 'Manual Completo con Fórmulas Explicadas y Ayudante Copiloto IA Interno',
    badge: 'DOCUMENTACIÓN Y COPILOTO IA',
    viewTarget: 'manual',
    image: '/manual/remex/14_manual_y_copiloto_remex.png',
    purpose:
      'Reúne dentro del propio sistema las 17 pantallas rotuladas, el origen exacto de cada dato, la explicación paso a paso de todas las fórmulas y el Bot Interno ("Ayudante Remex OS") capaz de consultar números en vivo y ejecutar órdenes.',
    howItWorks:
      'El botón flotante naranja acompaña todas las vistas: lee en tiempo real Firestore, el estado del Bot WhatsApp y (si sos Socio o SuperAdmin) los indicadores vivos de Casa Central REMEX, respondiendo dudas metodológicas o ejecutando acciones reales.',
    dataSource:
      'remexKnowledgeAndCopilotEngine.js + suscripciones en vivo Firestore + API n8n + API Central DBF (según rol).',
    howItCalculates: [
      'Búsqueda Contextual Inteligente: puntúa las palabras de tu consulta contra los títulos, orígenes de datos y fórmulas de las 17 secciones para traerte exactamente el capítulo, la cuenta matemática y el botón directo para ir a esa pantalla.'
    ],
    crossLinks: [
      'Se actualiza de forma predeterminada en cada evolución de Remex OS para reflejar siempre los últimos módulos y cálculos vigentes.'
    ],
    howToUse: [
      'Abrí "Manual" para recorrer las 17 secciones con sus fórmulas o descargar el PDF completo.',
      'Tocá "Ayudante Remex OS" abajo a la derecha y preguntale por ejemplo: "¿Cuánto se estima recaudar la próxima semana en Central y cómo se calcula?" o "Creá una tarea: Controlar cheques en cartera".'
    ],
    callouts: [
      'Cabecera Documental v2.8: acceso a las 17 pantallas rotuladas, Mapa de Datos y descarga nativa de PDF.',
      'Índice Buscable por Módulo o Fórmula: encuentra en segundos cualquier tabla o cálculo.',
      'Ficha con Origen de Datos y Matemática Clara: explica de dónde viene cada cifra y cómo se obtiene.',
      'Ayudante IA Interno Actualizado: responde con métricas reales en vivo y opera el sistema por chat.'
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

function fmtMoney(n) {
  return `$ ${Math.round(Number(n || 0)).toLocaleString('es-AR')}`;
}

/**
 * Procesa cada consulta u orden enviada al Bot Interno (Ayudante Inteligente de Remex Work-OS).
 * Soporta lectura en tiempo real (incluyendo Base Central REMEX para Socios/SuperAdmin),
 * explicación clara paso a paso de todas las fórmulas y ejecución directa de acciones.
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
    botSummary = null,
    centralSummary = null
  } = ctx;

  const canSeeCentral = canAccessCentralBasesSection(user);

  // 1. CREAR UNA TAREA REAL EN FIRESTORE
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

  // 2. AGENDAR UN EVENTO EN EL CALENDARIO
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

  // 3. CAMBIAR RECORDATORIO SLA DEL BOT EN N8N
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

  // 4. NAVEGACIÓN DIRECTA A CUALQUIER SECCIÓN (INCLUYENDO BASE CENTRAL, BACKUPS Y SIMULADOR)
  const isNav = /\b(abri|abrir|llevame|ir a|anda a|mostrame|entra a|cambiar a)\b/.test(norm);
  if (isNav) {
    if (/\b(base central|bases central|bases de remex|lector dbf|casa central|central remex)\b/.test(norm)) {
      if (!canSeeCentral) {
        return {
          text: '🔒 **Acceso reservado:** El **Lector de Bases Central REMEX** está habilitado exclusivamente para los **Socios Directores y SuperAdmin**.'
        };
      }
      return {
        text: '✅ **Listo:** abrí el **Lector de Bases Central REMEX (`00 Bariloche` & `00 BsAs`)**.',
        autoAction: { type: 'NAVIGATE', view: 'central_bases' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'lector_bases_central_remex')
      };
    }
    if (/\b(backup|backups|respaldo|respaldos)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Control Remoto de Backups de la Red (`Remex Backup`)**.',
        autoAction: { type: 'NAVIGATE', view: 'backups' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'control_remoto_backups_red')
      };
    }
    if (/\b(simulador|entrenador)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Bot Check-Oil** (seleccioná la pestaña **Simulador y Entrenador IA** para probar en modo Sandbox).',
        autoAction: { type: 'NAVIGATE', view: 'bot' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'bot_simulador_y_entrenador_ia')
      };
    }
    if (/\b(presupuesto|cotizacion|#cot|piloto centro)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Presupuestos Bot (Piloto Sucursal Centro)**.',
        autoAction: { type: 'NAVIGATE', view: 'bot_quotes' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'presupuestos_piloto_centro_remex')
      };
    }
    if (/\b(bot|whatsapp|sin derivacion|no derivad|charlas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Centro de Control Bot & IA Check-Oil**.',
        autoAction: { type: 'NAVIGATE', view: 'bot' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'bot_maestro_estadisticas')
      };
    }
    if (/\b(mensaje|inbox|bandeja)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Centro de Mensajes Internos (Inbox)**.',
        autoAction: { type: 'NAVIGATE', view: 'inbox' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'centro_mensajes_inbox')
      };
    }
    if (/\b(crm|clientes|zonas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Directorio CRM Comercial y Gestor de Zonas**.',
        autoAction: { type: 'NAVIGATE', view: 'crm' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'crm_comercial_y_zonas')
      };
    }
    if (/\b(agenda|calendario|viajes|reparto|flota|sprinter)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Agenda, Viajes de Reparto y Flota**.',
        autoAction: { type: 'NAVIGATE', view: 'calendar' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'agenda_y_viajes_reparto')
      };
    }
    if (/\b(socios|3\/3|unanimidad|gobernanza|directorio)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Directorio Exclusivo de Socios (3/3)**.',
        autoAction: { type: 'NAVIGATE', view: 'partners' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'directorio_socios_3de3')
      };
    }
    if (/\b(finanzas|deuda|riesgo|caja|fifo)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Finanzas y Riesgo Crediticio**.',
        autoAction: { type: 'NAVIGATE', view: 'finances' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'finanzas_y_riesgo_crediticio')
      };
    }
    if (/\b(estadisticas|reportes|rendimiento)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Estadísticas Generales de Rendimiento**.',
        autoAction: { type: 'NAVIGATE', view: 'reports' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'estadisticas_y_administracion')
      };
    }
    if (/\b(admin|usuarios|claves|areas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí **Administración de Usuarios y Áreas**.',
        autoAction: { type: 'NAVIGATE', view: 'admin' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'estadisticas_y_administracion')
      };
    }
    if (/\b(manual|fotos|mapa|documentacion|formulas)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Manual Completo y Fórmulas Explicadas de Remex OS**.',
        autoAction: { type: 'NAVIGATE', view: 'manual' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'manual_visual_y_copiloto_remex')
      };
    }
    if (/\b(tareas|kanban|operaciones)\b/.test(norm)) {
      return {
        text: '✅ **Listo:** abrí el **Tablero KanBan de Tareas Operativas**.',
        autoAction: { type: 'NAVIGATE', view: 'tasks' },
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'motor_tareas_kanban')
      };
    }
  }

  // 5. EXPLICACIÓN CLARA PASO A PASO DE RECAUDACIÓN SEMANAL ESTIMADA / BASE CENTRAL REMEX
  if (
    /\b(recaudacion|cobranza semanal|proxima semana|semana siguiente|base central|casa central|dbf|cheques en cartera|compras ia)\b/.test(
      norm
    )
  ) {
    if (!canSeeCentral && /\b(cuanto|monto|saldo|valor|numeros|datos)\b/.test(norm)) {
      return {
        text:
          `🔒 Los montos contables en vivo de **Casa Central REMEX** son de acceso exclusivo para **Socios y SuperAdmin**.\n\n` +
          `Sí puedo explicarte **cómo calcula el sistema la recaudación estimada semanal**: combina facturas abiertas (\`factura1.DBF\`), el plazo real histórico en que paga cada cliente (70% conducta real en \`RECIBOS.DBF\` + 30% plazo teórico), cheques que vencen en esos 7 días (\`CHEQUES.DBF\`) y ventas contado promedio, dejando 100% afuera la mora mayor a 90 días para no inflar la proyección.`
      };
    }

    const liveBlock =
      canSeeCentral && centralSummary
        ? `📊 **Números Reales Hoy en Casa Central REMEX (\`00 · Bariloche\`):**\n` +
          `• **Estimado próximos 7 días:** **${fmtMoney(centralSummary.proximaSemanaTotal)}**\n` +
          `• **Promedio semanal proyectado (próx. 4 sem.):** **${fmtMoney(centralSummary.promedioSemanal4Sem)} / sem**\n` +
          `• **Cuentas por cobrar activas:** ${fmtMoney(centralSummary.cuentasPorCobrar)} (${centralSummary.facturasAbiertas} facturas)\n` +
          `• **Cheques activos en cartera:** ${fmtMoney(centralSummary.chequesEnCartera)}\n` +
          `• **Mora vieja >90 días separada (no infla caja):** ${fmtMoney(centralSummary.moraExcluida)}\n` +
          `• **Stock valorizado a costo neto:** ${fmtMoney(centralSummary.stockCosto)} (Ahorro Compras IA: ${fmtMoney(centralSummary.ahorroIa)})\n\n`
        : '';

    return {
      text:
        `${liveBlock}🧮 **¿De dónde sale y cómo se calcula la Recaudación Estimada Semanal? (Paso a paso):**\n\n` +
        `**Origen de los datos:** archivos originales \`factura1.DBF\`, \`RECIBOS.DBF\` y \`CHEQUES.DBF\` de Casa Central sincronizados por \`Remex Backup\`.\n\n` +
        `**1. Limpieza inicial:** toma solo las facturas con saldo pendiente real y separa cualquier cuenta marcada como incobrable.\n` +
        `**2. Plazo real de cada cliente (70% realidad + 30% papel):** si la factura dice 30 días pero ese cliente históricamente paga sus recibos a los 40 días, el sistema calcula \`(40 × 0,70) + (30 × 0,30) = 37 días\` y agenda el cobro en la semana en que se cumplen esos 37 días.\n` +
        `**3. Tratamiento prudente de atrasos (sin optimismo falso):**\n` +
        `   • Si se pasó por pocos días (hasta 60 días totales), reparte el cobro en 2 o 3 semanas (\`60% / 40%\` o \`35% / 35% / 30%\`).\n` +
        `   • Si lleva entre **61 y 90 días**, estima cobrar solo el **60%** repartido entre las semanas 2, 3 y 4.\n` +
        `   • Si supera los **90 días de antigüedad**, lo **excluye al 100%** del pronóstico para no prometer plata congelada.\n` +
        `**4. Cheques por acreditar:** suma de \`CHEQUES.DBF\` los valores cuya fecha de vencimiento cae exactamente en esa semana.\n` +
        `**5. Ventas cortas + Contado:** agrega el promedio semanal de contado de las últimas 8 semanas y, en las semanas 3 y 4, la rotación de ventas nuevas de corto plazo (<21 días). El **promedio proyectado semanal** es la suma de las 4 semanas dividida por 4.`,
      chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'lector_bases_central_remex'),
      suggestedActions: canSeeCentral
        ? [{ label: '🗄️ Abrir Base Central REMEX', action: { type: 'NAVIGATE', view: 'central_bases' } }]
        : []
    };
  }

  // 6. EXPLICACIÓN DE OTRAS FÓRMULAS CLAVE (FIFO FINANZAS, KM URBANO, RENDICIÓN TRIPLE, SLA BOT)
  if (/\b(como se calcula|formula|calculo|explicame como)\b/.test(norm)) {
    if (/\b(fifo|finanzas|excedente|limite|deuda)\b/.test(norm)) {
      return {
        text:
          `🧮 **¿Cómo se calcula el Excedente Crítico FIFO en Finanzas?**\n\n` +
          `**Origen:** colección \`debt_snapshots\` (cortes de deuda en calle por fecha y límite operativo).\n\n` +
          `**Cálculo paso a paso:**\n` +
          `1. Ordena los tramos de deuda desde el **más viejo al más nuevo**.\n` +
          `2. Usa el **Límite Operativo** (ej. \`$27.000.000\`) como un cupo que va cubriendo primero las deudas más antiguas.\n` +
          `3. Una vez que el cupo llega a \`$0\`, revisa los tramos que quedaron descubiertos: todo peso descubierto que tenga **más de 30 días de antigüedad** se suma al **Excedente Crítico** y dispara automáticamente una Tarea Urgente de Cobranza en el KanBan.`,
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'finanzas_y_riesgo_crediticio'),
        suggestedActions: [{ label: '💲 Ir a Finanzas', action: { type: 'NAVIGATE', view: 'finances' } }]
      };
    }

    if (/\b(urbano|flota|kilometros|sprinter|rendicion|efectivo en mano)\b/.test(norm)) {
      return {
        text:
          `🧮 **Cálculos de Logística, Rendición Triple y Flota:**\n\n` +
          `• **Km de Movimiento Urbano en Bariloche** (\`fleet_vehicles\` + \`trips\`): resta el **Odómetro de Salida** del nuevo viaje menos el **Odómetro de Llegada** del viaje anterior de esa misma camioneta. Si llegó con \`142.000 km\` y hoy sale con \`142.160 km\`, deja registrados **160 km urbanos**.\n` +
          `• **Efectivo Neto en Mano** (\`trips\`): \`Cobrado en Efectivo Billete − Gastos Pagados en Efectivo en Ruta\`. Los cheques y transferencias se suman a la cobranza total pero jamás descuentan ni inflan el sobre físico de billetes.\n` +
          `• **Consumo cada 100 km:** \`(Litros cargados ÷ Km recorridos) × 100\`.`,
        chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'flota_y_movimiento_urbano'),
        suggestedActions: [{ label: '🚐 Ir a Viajes y Flota', action: { type: 'NAVIGATE', view: 'calendar' } }]
      };
    }
  }

  // 7. RESUMEN OPERATIVO EN VIVO DE TODO REMEX OS
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
      return Object.values(votes).filter((v) => v?.decision === 'aprobado' || v?.status === 'approved').length >= 3;
    });

    return {
      text:
        `📊 **Estado en Tiempo Real de Remex Work-OS (v2.8.0)**\n\n` +
        `• **Tareas Totales:** ${tasks.length} — Nuevas: **${openTasks.length}** | En Proceso: **${inProg.length}** | Validación: **${validation.length}** | Cerradas: **${closed.length}**\n` +
        `• **Prioridad Alta / Crítica abiertas:** ${highPrio.length}\n` +
        `• **CRM Comercial:** ${contacts.length} contactos en **${zones.length} zonas logísticas**\n` +
        `• **Agenda y Logística:** ${events.length} eventos y **${trips.length} hojas de ruta de viaje**\n` +
        `• **Socios (3/3):** ${proposals.length} propuestas (${firmRules.length} Reglas Firmes)\n` +
        (latestDebt ? `• **Último Corte Financiero:** \`${latestDebt.id}\` (${latestDebt.date}) — Cupo: ${fmtMoney(latestDebt.limit)}\n` : '') +
        (botSummary
          ? `• **Bot WhatsApp en Vivo:** ${botSummary.realTotal} charlas reales (${botSummary.derived} derivadas efectivas • SLA: ${botSummary.slaMin} min)\n`
          : '') +
        (canSeeCentral && centralSummary
          ? `• **Casa Central REMEX (\`00\`):** Cta. Cte. Activa ${fmtMoney(centralSummary.cuentasPorCobrar)} • Est. Próx. 7d: **${fmtMoney(centralSummary.proximaSemanaTotal)}**\n`
          : '') +
        (topPending ? `\n**Principales tareas activas:**\n${topPending}` : ''),
      suggestedActions: [
        { label: '⚡ Ir a Tareas', action: { type: 'NAVIGATE', view: 'tasks' } },
        ...(canSeeCentral
          ? [{ label: '🗄️ Base Central REMEX', action: { type: 'NAVIGATE', view: 'central_bases' } }]
          : []),
        { label: '🤖 Ver Bot & Simulador IA', action: { type: 'NAVIGATE', view: 'bot' } },
        { label: '📡 Ver Backups Red', action: { type: 'NAVIGATE', view: 'backups' } }
      ]
    };
  }

  // 8. CONSULTAS SOBRE ARQUITECTURA GLOBAL, DE DÓNDE SALE LA INFO Y VINCULACIONES
  if (/\b(de donde sale|origen de|como se vincula|vinculacion|colecciones|arquitectura|como funciona todo|firestore)\b/.test(norm)) {
    const srcLines = REMEX_ARCHITECTURE_OVERVIEW.dataSourcesSummary
      .map((s) => `• **${s.source}** _(${s.mode})_ → Alimenta: ${s.feeds}.`)
      .join('\n');
    return {
      text:
        `🗺️ **Mapa Completo de Datos y Vinculaciones Automáticas — Remex Work-OS v2.8.0**\n\n` +
        `${srcLines}\n\n` +
        `**Principales Automatizaciones Cruzadas:**\n` +
        `↔️ **Remex Backup → Base Central DBF:** Los respaldos automáticos de \`C:\\mayor\\*.DBF\` alimentan en vivo la recaudación estimada semanal, cuentas corrientes y stock que ven los Socios.\n` +
        `↔️ **Finanzas (FIFO) → Tareas:** Un corte en \`debt_snapshots\` con exceso crítico >30 días crea automáticamente una tarea urgente \`TSK-XXXX\` de cobranza.\n` +
        `↔️ **Agenda → Viajes → Flota:** Cerrar una Hoja de Ruta actualiza el odómetro y calcula solo los km urbanos hechos en Bariloche entre viajes.\n` +
        `↔️ **Simulador IA (Borrador) → Bot WhatsApp en Vivo:** Permite entrenar variables y probar con datos reales de Cochecita antes de publicarlas a clientes reales.`,
      chapterRef: REMEX_MANUAL_CHAPTERS.find((c) => c.id === 'manual_visual_y_copiloto_remex'),
      suggestedActions: [
        { label: '📖 Abrir Manual Completo', action: { type: 'NAVIGATE', view: 'manual' } }
      ]
    };
  }

  // 9. BÚSQUEDA EN LOS 17 CAPÍTULOS DEL MANUAL (INCLUYENDO FÓRMULAS PASO A PASO)
  const words = norm.split(/\s+/).filter((w) => w.length >= 3);
  let bestChapter = null;
  let bestScore = 0;
  for (const ch of REMEX_MANUAL_CHAPTERS) {
    const calcText = Array.isArray(ch.howItCalculates) ? ch.howItCalculates.join(' ') : '';
    const corpus = normalizeText(
      `${ch.title} ${ch.badge} ${ch.purpose} ${ch.howItWorks} ${ch.dataSource} ${calcText} ${ch.crossLinks.join(' ')}`
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
    const calcBlock =
      Array.isArray(bestChapter.howItCalculates) && bestChapter.howItCalculates.length > 0
        ? `\n\n**🧮 ¿Cómo se calcula cada número?:**\n` +
          bestChapter.howItCalculates.map((c) => `• ${c}`).join('\n')
        : '';

    return {
      text:
        `📘 **${bestChapter.number}. ${bestChapter.title}**\n\n` +
        `• **¿Para qué sirve?:** ${bestChapter.purpose}\n` +
        `• **¿De dónde viene la información?:** ${bestChapter.dataSource}` +
        `${calcBlock}\n\n` +
        `**Vinculaciones con otros módulos:**\n` +
        bestChapter.crossLinks.map((l) => `↔️ ${l}`).join('\n'),
      chapterRef: bestChapter,
      suggestedActions: [
        {
          label: `🚀 Ir a ${bestChapter.title.split('—')[0].split('(')[0].trim()}`,
          action: { type: 'NAVIGATE', view: bestChapter.viewTarget }
        },
        { label: '📖 Ver en Manual Completo', action: { type: 'NAVIGATE', view: 'manual' } }
      ]
    };
  }

  // 10. RESPUESTA GUÍA COMPLETA POR DEFECTO
  return {
    text:
      `👋 Soy el **Ayudante Inteligente de Remex Work-OS v2.8.0** (usuario activo: **${user?.name || 'Operador'}**).\n\n` +
      `Conozco las **17 secciones** del sistema, de dónde proviene cada tabla y cómo se calcula cada indicador paso a paso:\n` +
      (canSeeCentral
        ? `• **Base Central REMEX (Socios/SuperAdmin):** _"¿Cuánto se estima recaudar la próxima semana en Central y cómo se calcula?"_, _"Abrí Base Central"_\n`
        : '') +
      `• **Explicación de cálculos:** _"¿Cómo se calcula el excedente crítico FIFO en Finanzas?"_, _"¿Cómo se calculan los km urbanos de la flota?"_\n` +
      `• **Ejecutar órdenes en vivo:** _"Creá una tarea: Revisar cheques en cartera prioridad alta"_, _"Cambiá el recordatorio del bot a 20 minutos"_\n` +
      `• **Navegación rápida:** _"Abrí el Simulador del Bot"_, _"Abrí Backups Red"_, _"Abrí el Manual"_`,
    suggestedActions: [
      { label: '📊 Resumen Operativo en Vivo', action: { type: 'ASK_PROMPT', prompt: 'Resumen operativo de Remex' } },
      ...(canSeeCentral
        ? [
            {
              label: '🧮 Recaudación Semanal Central',
              action: { type: 'ASK_PROMPT', prompt: '¿Cuánto se estima recaudar la próxima semana en Central y cómo se calcula?' }
            }
          ]
        : []),
      { label: '📖 Abrir Manual y Fórmulas', action: { type: 'NAVIGATE', view: 'manual' } },
      { label: '🤖 Ir a Bot & Simulador IA', action: { type: 'NAVIGATE', view: 'bot' } }
    ]
  };
}
