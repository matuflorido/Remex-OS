# Protocolo Predeterminado Obligatorio — Remex Work-OS & Aplicaciones de Escritorio

Estas reglas son **predeterminadas y obligatorias** cada vez que se realiza un cambio, mejora o nueva sección en **Remex Work-OS** (`/Users/matiasr.florido/Documents/webs/remex-work-os`) o proyectos asociados:

1. **Actualización Automática del Bot Interno (Ayudante IA Copiloto):**
   - Cada vez que se agregue o modifique una sección, tabla, fórmula o flujo en Remex OS, **actualizar siempre en el mismo cambio** la base de conocimiento y acciones del Bot Interno (`src/features/copilot/services/remexKnowledgeAndCopilotEngine.js` y `src/features/copilot/components/RemexSystemCopilot.jsx`) para que el Copiloto conozca la nueva funcionalidad, de dónde sale cada dato y cómo se calcula cada indicador.

2. **Instalación Local de Prueba Primero (Sin Subir OTA hasta Confirmación):**
   - Antes de publicar o subir cualquier nueva versión a GitHub Releases (OTA) o servidores de distribución:
     1. Compilar la nueva versión localmente.
     2. **Eliminar la versión anterior** instalada en la Mac (`/Applications/Remex OS.app`) y limpiar los instaladores viejos en `dist-exe/`.
     3. **Guardar e instalar la nueva versión en la compu de Matías** (`/Applications/Remex OS.app`) para que pueda ver los cambios y probarlos tranquilo.
     4. **NO subir ni publicar el Release OTA** hasta que Matías lo pruebe y autorice explícitamente subirlo.

3. **Estándar Pedagógico para Manuales y Presentaciones:**
   - En toda sección de manuales o presentaciones, explicar siempre **de dónde viene la información** (origen exacto de tablas/colecciones) y **cómo se calcula cada número paso a paso** con lenguaje claro, directo y transparente para adultos (sin tecnicismos opacos ni tono infantil).
