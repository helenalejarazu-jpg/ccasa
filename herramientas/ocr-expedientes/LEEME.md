# OCR para expedientes escaneados

## Para qué sirve

Los expedientes que te llegan escaneados no tienen texto: son fotos del papel.
Eso significa que no se pueden buscar, no se puede copiar nada de ellos, y
leerlos cuesta unas **6 veces más** que un PDF normal.

Esta herramienta les mete el texto por debajo. El documento se sigue viendo
**exactamente igual**, pero ya se puede buscar, copiar y leer.

**Los originales no se tocan nunca.** Los resultados van a una carpeta nueva.

## Cuánto ahorra (medido, no estimado)

| | Sin OCR | Con OCR |
|---|---:|---:|
| Una página escaneada | 2.900 tokens | 675 tokens |
| Un expediente de 80 páginas | 232.000 tokens | 54.000 tokens |

Son **4,3 veces más barato**. Y un expediente de 80 páginas escaneadas no cabe
entero de una sentada; después del OCR, sí.

Tarda unos 2 segundos por página. Un expediente de 80 páginas, unos 3 minutos.
Se hace **una sola vez** por documento.

---

## Instalación

Solo hay que hacerlo una vez.

### Si tienes Mac

Abre la aplicación **Terminal** y pega esto, línea a línea:

```bash
# 1. Instalar Homebrew (sáltate este paso si ya lo tienes)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Instalar el programa de OCR y los idiomas
brew install ocrmypdf tesseract-lang

# 3. Instalar la librería que lee PDFs
pip3 install pymupdf
```

### Si tienes Windows

1. Instala **Python** desde [python.org](https://www.python.org/downloads/).
   Importante: en la primera pantalla marca la casilla **"Add Python to PATH"**.
2. Instala **Tesseract** desde
   [este instalador](https://github.com/UB-Mannheim/tesseract/wiki).
   Durante la instalación, en la lista de idiomas marca **Spanish** y **Basque**.
3. Instala **Ghostscript** desde [ghostscript.com](https://www.ghostscript.com/releases/gsdnld.html)
   (la versión de 64 bits).
4. Abre **Símbolo del sistema** y pega:

```
pip install ocrmypdf pymupdf
```

---

## Cómo se usa

Abre la Terminal (Mac) o el Símbolo del sistema (Windows) y escribe:

```bash
python ocr_lote.py "/ruta/a/la/carpeta/con/los/expedientes"
```

Truco para no pelearte con la ruta: escribe `python ocr_lote.py ` (con el
espacio al final) y luego **arrastra la carpeta** desde el explorador de
archivos hasta la ventana. La ruta se escribe sola.

### Qué verás

```
12 PDF encontrados en /Users/helena/Expedientes 2025
Los resultados van a: /Users/helena/Expedientes 2025-ocr

[1/12] EPIG 2025-0142.pdf              -> OK (34 pag.)
[2/12] Informe verificacion.pdf        -> ya tiene texto, no hace falta
[3/12] Ordenanza movilidad.pdf         -> OK (18 pag.)
...

Convertidos : 9
Ya tenian texto : 2
Fallidos : 1
```

Los archivos convertidos aparecen en una carpeta con el mismo nombre más
`-ocr` al final, respetando las subcarpetas que tuvieras.

---

## Detalles útiles

- **Se salta solo** los PDF que ya tienen texto. No pierdes tiempo ni calidad.
- **Entiende castellano y euskera** a la vez, sin configurar nada.
- **Las subcarpetas se respetan**: si tenías todo ordenado, sigue ordenado.
- **Los PDF protegidos con contraseña o dañados** se saltan y te avisa al final.
  No paran el proceso.
- **Ocupan mucho menos**: en la prueba, 25 MB se quedaron en 432 KB.

## Si algo falla

| Mensaje | Qué pasa |
|---|---|
| `Faltan estas herramientas` | No terminó la instalación. Repite los pasos de arriba. |
| `no se puede abrir (protegido o danado)` | Ese PDF tiene contraseña o está corrupto. Ábrelo a mano para comprobarlo. |
| `No encuentro la carpeta` | La ruta está mal escrita. Usa el truco de arrastrar la carpeta. |

## Opciones

```bash
# Solo castellano (un pelín más rápido)
python ocr_lote.py "carpeta" --idiomas spa

# Forzar el OCR también en los que ya tienen texto
# (útil si el texto que traen es basura)
python ocr_lote.py "carpeta" --forzar
```
