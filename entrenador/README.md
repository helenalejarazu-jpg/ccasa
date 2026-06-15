# 🏋️ Gestor de Entrenamientos

Aplicación web para gestionar los entrenamientos de tus clientes y generar
cada semana un **Excel con las imágenes** de los ejercicios.

No necesitas instalar nada: funciona en cualquier navegador (móvil o PC) y
todos los datos se guardan **en tu propio navegador**.

## Qué puedes hacer

- **Personas**: añade a cada persona que entrenas.
- **Biblioteca de ejercicios**: cada ejercicio con su foto (se reutiliza en todos los planes).
- **Plan**: organiza por semanas y días; en cada ejercicio defines series, repeticiones, peso, descanso y notas. Puedes **duplicar una semana** para crear la siguiente y solo cambiar los pesos.
- **Importar Excel**: sube tus `.xlsx` actuales; la app lee las filas y extrae las imágenes incrustadas. Eliges qué columna es cada cosa y a qué persona/semana asignarlo.
- **Exportar Excel**: eliges persona + semana y descargas un Excel con cada día, sus ejercicios y la foto de cada uno.
- **Copias**: descarga una copia de seguridad (`.json`) y restáurala en otro equipo.

## Cómo usarla

### Opción A — En tu ordenador (rápido para probar)
Abre el archivo `index.html` con un navegador (doble clic). Necesita conexión
a internet la primera vez para cargar la librería de Excel.

### Opción B — Online y gratis (recomendada)
Publicarla con **GitHub Pages**:

1. En GitHub, ve a **Settings → Pages**.
2. En *Source* elige la rama del proyecto y la carpeta raíz (`/root`).
3. Espera un minuto: tendrás una URL pública tipo
   `https://TU-USUARIO.github.io/ccasa/entrenador/`.
4. Entra en esa URL desde el móvil o el PC. Guárdala en favoritos.

> Importante: los datos viven en el navegador donde la uses. Para pasarlos a
> otro equipo o móvil, usa **Copias → Descargar copia** y luego **Restaurar copia**.

## Notas técnicas

- Hecho solo con HTML/CSS/JavaScript (sin servidor).
- Lectura/escritura de Excel con [ExcelJS](https://github.com/exceljs/exceljs) (cargado por CDN).
- Almacenamiento local con IndexedDB.

## Pendiente de afinar

El importador funciona "a ojo": tú indicas qué columna es cada dato. Cuando me
pases un Excel real de ejemplo, ajusto la lectura para que reconozca tu formato
automáticamente (cabeceras, varios días por hoja, posición exacta de las fotos, etc.).
