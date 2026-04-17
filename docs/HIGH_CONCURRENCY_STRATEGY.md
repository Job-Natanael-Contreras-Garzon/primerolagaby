# Estrategia de Alta Concurrencia (100k Usuarios) y Optimización

Este documento describe la arquitectura y prácticas a implementar para que el sistema Electoral soporte hasta 100,000 usuarios concurrentes sin que los servidores caigan, garantizando velocidad e integridad de datos.

## 1. Patrón Front-End: Offline-First y Persistencia (Local Storage)
En zonas de votación la conectividad puede ser intermitente o saturada.
- **Service Worker / PWA**: Todos los assets estáticos del Front-End se sirven desde caché, evitando peticiones redundantes.
- **Cola de Transmisiones en LocalStorage**: Si el usuario envía datos y la red falla (o el servidor está en *timeout*), los datos se serializan en un arreglo dentro de `localStorage` (`transmisiones_pendientes`).
- **Sincronización Asíncrona (Background Sync)**: Un intervalo o comprobación al recuperar internet envía automáticamente el bloque de transacciones pendientes.

## 2. Idempotencia y UI Non-Blocking
Si un usuario desesperado presiona el botón "Enviar" 50 veces seguidas por lentitud de la red, el sistema no debe crear 50 registros ni bloquear la base de datos.
- **Deshabilitación de Botones (Debouncing)**: Todo botón de acción (`type="submit"`, validaciones) aplica estado `disabled / loading` el milisegundo 1 después del clic. 
- **Timeouts dinámicos**: Si una petición dura más de X segundos, se aborta y se mueve a la cola local (Offline-First) en lugar de dejar colgado al cliente.
- **UUID Pre-generados**: Para inserciones críticas, el frontend debe originar un UUID temporal que sirva como llave de idempotencia. Si Supabase recibe el mismo UUID de transmisión dos veces (porque el primer request quedó en timeout local pero sí llegó), el motor de Postgres lo rechaza al violar el constraints UNIQUE, protegiendo los datos.

## 3. Caché y Pools de Conexión (Back-End)
Supabase (PostgreSQL) sufrirá con 100,000 aperturas simultáneas de conexión "vivas".
- **Connection Pooling**: Se debe usar PgBouncer o Supavisor para multiplexar millones de queries y mantener un pool fijo hacia Supabase.
- **Caché en Catálogos**: Listados largos (Recintos, Partidos, Candidatos) NO deben hacer fetch a la base de datos por cada usuario cada vez. Ya se ha implementado el hook `useCatalogos()` con un Caché en Memoria (`catalogosCached`), pero la PWA también lo asienta en LocalStorage. 
- **Vistas Materializadas**: Las métricas estáticas (`vista_monitoreo`) no deben procesar cálculo complejo cada segundo. 

## 4. Limpieza del Root y Tree Shaking (Optimización UI)
- Archivos `.md` de documentación se movieron a la carpeta `/docs`.
- Archivos de pruebas residuales (`/ant/`) se eliminaron.
- Se implementará optimización de Vite para comprimir los chunks (`build`).

## 5. Próximos Pasos en el Componente VeedorView
- [x] Generar botón submit *Idempotente*.
- [x] Prevenir Doble-Submit en la capa visual.
- [x] Timeout explícito para no dejar estancado al usuario.
- [x] Guardado como borrador local si hay error crudo.
