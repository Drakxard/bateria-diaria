# Bateria diaria

Aplicacion Next.js para registrar minutos de trabajo sobre una meta diaria, con persistencia en Neon/Postgres.

## Funcionalidades actuales

- Cilindro principal con progreso segun `minutos acumulados / meta diaria`.
- Temporizador central con estados `running`, `paused` e `idle`.
- Suma de minutos al completar una sesion.
- Configuracion del temporizador en minutos.
- Suma incremental de horas a la meta diaria.
- Modal para decidir si el tiempo excedido tambien se agrega al progreso.
- Modo oscuro persistido en `localStorage`.
- Vista de desglose de sesiones del dia en pilas visuales.
- Sincronizacion de la sesion actual con DB via `/api/session`.

## Atajos de teclado

- `Enter`: iniciar temporizador, confirmar meta o confirmar minutos del temporizador segun el contexto.
- `Espacio`: pausar o reanudar el temporizador cuando no hay modales abiertos.
- `Escape`: cancelar temporizador, cerrar modales o cerrar la vista de pilas.
- `0-9`: abrir la carga de meta y escribir horas; si esta abierto el modal del temporizador, escribe minutos.
- `Backspace`: borrar el ultimo digito en el modal activo.
- `D`: alternar modo oscuro.
- `C`: mostrar u ocultar la vista de pilas de sesiones del dia.
- `ArrowDown`: acelera el temporizador mientras esta corriendo.

## Persistencia

- `GET /api/session`: trae la sesion actual.
- `POST /api/session` con `action: "addMinutes"`: suma minutos al dia actual.
- `POST /api/session` con `action: "updateGoal"`: suma horas a la meta diaria.
- `lib/db.ts`: si cambia el dia calendario, crea automaticamente nuevos registros diarios manteniendo la meta base.
