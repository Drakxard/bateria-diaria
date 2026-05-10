# Bateria diaria

Aplicacion Next.js de productividad que ahora funciona 100% local en navegador Chromium.

## Funcionalidades actuales

- Inicio bloqueado hasta autorizar una carpeta local compatible con File System Access API.
- Persistencia local de meta diaria, minutos acumulados, duracion del temporizador y modo oscuro.
- Pegado de imagen con `Ctrl+V`, guardado en la carpeta elegida y restauracion al reabrir.
- Ajuste leve de imagen con click para seleccionar, arrastre para mover y zoom con rueda o botones.
- Bloque de tiempo independiente en la esquina superior izquierda, separado del area visual principal.
- Temporizador central con estados `running`, `paused` e `idle`.
- Modal para sumar horas a la meta diaria.
- Modal para decidir si el tiempo excedido tambien se agrega al progreso.
- Vista de desglose de sesiones del dia en pilas visuales.

## Atajos de teclado

- `Ctrl+V`: pegar o reemplazar la imagen actual.
- `Enter`: iniciar temporizador, confirmar meta o confirmar minutos del temporizador segun el contexto.
- `Espacio`: pausar o reanudar el temporizador cuando no hay modales abiertos.
- `Escape`: cancelar temporizador, cerrar modales, salir de la seleccion de imagen o cerrar la vista de pilas.
- `0-9`: abrir la carga de meta y escribir horas; si esta abierto el modal del temporizador, escribe minutos.
- `Backspace`: borrar el ultimo digito en el modal activo.
- `D`: alternar modo oscuro.
- `C`: mostrar u ocultar la vista de pilas de sesiones del dia.
- `ArrowDown`: acelera el temporizador mientras esta corriendo.

## Persistencia

- Estado diario y configuracion: `localStorage`.
- Handle de carpeta autorizada: `IndexedDB`.
- Imagen pegada y metadata de ajuste: archivos dentro de la carpeta elegida.
- Cambio de dia: reinicia minutos acumulados y conserva la meta diaria configurada.
