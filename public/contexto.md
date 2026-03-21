Contexto del Proyecto: Sistema de Transmisión de Resultados Electorales
1. Descripción General
El objetivo es desarrollar una aplicación web altamente optimizada para la recopilación en tiempo real de resultados electorales. El sistema permitirá a operadores en el terreno enviar los totales de votos y fotografías de las actas físicas al finalizar la jornada electoral.

2. Requisitos de Rendimiento y Arquitectura
Tráfico esperado: Aproximadamente 400 usuarios reportando datos en una ventana crítica de 2 horas (estimando 3 a 4 peticiones simultáneas por minuto).

Prevención de Cuellos de Botella: La arquitectura separa estrictamente el texto de las imágenes.

Los datos numéricos van a una base de datos relacional SQL rápida.

Las fotografías no se guardan en la base de datos, sino en un servicio de almacenamiento de objetos (como AWS S3 o MinIO), guardando solo la URL en SQL.

Optimización de Frontend: El frontend debe comprimir las fotografías (reduciendo su peso en MB) en el dispositivo del usuario antes de enviarlas al servidor para evitar la saturación de la red y tiempos de espera largos.

3. Roles de Usuario y Flujo de Trabajo
Operador de Mesa (Público/Anónimo): No requiere inicio de sesión para agilizar el proceso. Sube los votos y las fotos de la mesa. Para evitar spam o ataques, el sistema registra obligatoriamente la dirección IP de origen de cada envío.

Supervisor de Distrito: Usuario autenticado con panel de control. Su vista está restringida únicamente a los Colegios y Mesas de su distrito asignado. Tiene permisos para auditar, editar o eliminar actas y fotografías subidas por los operadores si detecta errores, fotos borrosas o datos basura.

Administrador General: Control total del sistema. Puede ver todos los distritos, gestionar a los Supervisores (crear, editar, eliminar cuentas) y administrar los catálogos base.

4. Estructura de Datos (Esquema Relacional)
El sistema está completamente normalizado para evitar redundancias y facilitar la escalabilidad del frontend:

Catálogo Político:

Partidos: Nombre y siglas.

Colores_Partido: Permite que un partido tenga uno o múltiples colores (códigos HEX) para la interfaz UI.

Cargos: Ejemplo: "Alcalde", "Concejal".

Candidatos: Entidad central que une a un Partido, un Cargo y un Nombre específico.

Geografía Electoral:

La jerarquía es estricta: Distritos -> contienen Colegios -> contienen Mesas.

Transaccional (El Reporte):

Actas: Registra el ID de la Mesa, la fecha/hora exacta, observaciones y la IP del operador.

Detalle_Votos: Se vincula al Acta y al Candidato, guardando la cantidad exacta de votos.

Fotografias_Actas: Se vincula al Acta y guarda las URLs de las evidencias.

5. Stack Tecnológico
Frontend: React inicializado con Vite para máxima velocidad y optimización en el desarrollo y compilación.

Backend: API REST (por definir lenguaje, enfocado en concurrencia) encargada de recibir el JSON transaccional y derivar las imágenes.

Base de Datos: Motor SQL (MySQL/MariaDB) estructurado con llaves foráneas para mantener la integridad referencial total.

Puedes guardar este texto en un archivo contexto.md dentro de tu carpeta C:\Users\asus\Documents\front electoral.

¿Te gustaría que ahora pasemos a escribir el código de React para el formulario principal, o prefieres que configuremos Tailwind CSS en tu nuevo proyecto de Vite para que el diseño se vea profesional desde el inicio?