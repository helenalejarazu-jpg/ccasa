# 🏋️ Gestor de Entrenamientos

Aplicación web para gestionar los entrenamientos de tus clientes y generar
cada semana un **Excel con las imágenes** de los ejercicios.

No necesitas instalar nada: funciona en cualquier navegador (móvil o PC) y
todos los datos se guardan **en tu propio navegador**.

## Qué puedes hacer

- **Personas**: añade a cada persona que entrenas.
- **Biblioteca de ejercicios**: cada ejercicio con su foto (se reutiliza en todos los planes).
- **Plan**: organiza por semanas y días; en cada ejercicio defines series, repeticiones, peso, descanso y notas. Puedes **duplicar una semana** para crear la siguiente y solo cambiar los pesos.
- **Importar Excel**:
  - **Automático**: si el `.xlsx` tiene tu formato de plantilla (1 hoja = 1 semana, 4 días en paralelo con columnas FOTO · EJERCICIO · SERIES · PESOS/REPES · DESC · COMENTARIOS), la app detecta semanas, días, ejercicios y **extrae las fotos** sin que tengas que configurar nada.
  - **Manual**: para cualquier otro Excel, eliges qué columna es cada cosa.
  - Los Google Sheets se importan descargándolos primero como `.xlsx` (*Archivo → Descargar → Microsoft Excel*).
- **Exportar Excel**: eliges persona + semana y descargas un Excel con los 4 días en paralelo, sus ejercicios y la foto de cada uno, parecido a tus plantillas originales.

## Datos de ejemplo ya cargados

Hay dos copias listas para restaurar desde **Copias → Restaurar copia**:

- `datos_ejemplo_helena.json`: los 4 meses de HELENA (15 semanas, 37 ejercicios).
- `datos_ejemplo_completo.json`: 18 personas de la carpeta de clientes
  (ANITA, ANA G., GABRIEL, PACO, VANESA, BEA F., IÑIGO P., FELI, MAITANE,
  TXIKI, TERESA, JULIÁN, JOANA A., ELENA R, CLAUDIA L., AMAIA B, NEREA C.,
  MARÍA F), con 213 ejercicios y 204 fotos. Las fotos van recomprimidas
  para que el archivo sea ligero.

Para verlos: abre la app → **Copias** → **Restaurar copia** → elige el archivo.
Aparecerán todas las personas en **Personas** y sus semanas en **Plan**.
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

### Instalarla en el móvil y usarla SIN conexión

La app es una **PWA**: se puede instalar en el móvil y funcionar offline.
Primero hay que publicarla con GitHub Pages (opción B). Luego, en el móvil:

- **Android (Chrome)**: abre la URL → menú **⋮** → **Añadir a pantalla de inicio** / **Instalar app**.
- **iPhone (Safari)**: abre la URL → botón **Compartir** → **Añadir a pantalla de inicio**.

La primera vez necesita internet (para guardarse). Después se abre como una app
normal desde el icono y **funciona sin conexión**: gestionar planes, importar y
exportar Excel con imágenes, todo offline. ExcelJS va incluido en el proyecto,
así que no depende de internet.

## Notas técnicas

- Hecho solo con HTML/CSS/JavaScript (sin servidor).
- Lectura/escritura de Excel con [ExcelJS](https://github.com/exceljs/exceljs) (cargado por CDN).
- Almacenamiento local con IndexedDB.

## Pendiente de afinar

El importador funciona "a ojo": tú indicas qué columna es cada dato. Cuando me
pases un Excel real de ejemplo, ajusto la lectura para que reconozca tu formato
automáticamente (cabeceras, varios días por hoja, posición exacta de las fotos, etc.).
