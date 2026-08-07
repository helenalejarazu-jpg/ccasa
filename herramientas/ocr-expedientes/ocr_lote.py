#!/usr/bin/env python3
"""
Pasa por OCR una carpeta entera de PDFs escaneados.

Los PDF escaneados son fotos: no tienen texto, y leerlos cuesta unas 6 veces
mas que un PDF normal. Este script les mete una capa de texto por debajo.
El documento se sigue viendo exactamente igual, pero ya se puede leer, buscar
y copiar.

Uso:
    python ocr_lote.py "ruta/de/la/carpeta"

Los originales NO se tocan. Los resultados se guardan en una carpeta nueva
llamada "<nombre de la carpeta>-ocr", al lado de la original.
"""

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

# Un PDF con menos de este numero de caracteres por pagina se considera
# escaneado (una pagina de texto normal ronda los 1.500-3.000).
UMBRAL_CARACTERES_POR_PAGINA = 100

# Coste aproximado en tokens, medido con el tokenizador de Claude.
TOKENS_PAGINA_ESCANEADA = 2900
TOKENS_PAGINA_TEXTO = 675


def comprobar_dependencias():
    faltan = []
    if shutil.which("ocrmypdf") is None:
        faltan.append("ocrmypdf")
    if shutil.which("tesseract") is None:
        faltan.append("tesseract")
    try:
        import pymupdf  # noqa: F401
    except ImportError:
        faltan.append("pymupdf (pip install pymupdf)")
    if faltan:
        print("Faltan estas herramientas:", ", ".join(faltan))
        print("Mira las instrucciones de instalacion en LEEME.md")
        sys.exit(1)


def paginas_y_texto(pdf):
    """Devuelve (numero de paginas, caracteres de texto) o None si no se abre."""
    import pymupdf

    try:
        with pymupdf.open(pdf) as doc:
            if doc.needs_pass:
                return None
            return doc.page_count, sum(len(p.get_text()) for p in doc)
    except Exception:
        return None


def main():
    p = argparse.ArgumentParser(description="OCR en lote para PDFs escaneados.")
    p.add_argument("carpeta", help="Carpeta con los PDF")
    p.add_argument("--idiomas", default="spa+eus",
                   help="Idiomas del OCR (por defecto castellano y euskera)")
    p.add_argument("--forzar", action="store_true",
                   help="Procesar tambien los PDF que ya tienen texto")
    args = p.parse_args()

    comprobar_dependencias()

    origen = Path(args.carpeta).expanduser().resolve()
    if not origen.is_dir():
        print(f"No encuentro la carpeta: {origen}")
        sys.exit(1)

    destino = origen.parent / f"{origen.name}-ocr"
    destino.mkdir(exist_ok=True)

    pdfs = sorted(f for f in origen.rglob("*.pdf") if destino not in f.parents)
    if not pdfs:
        print(f"No hay ningun PDF en {origen}")
        return

    print(f"\n{len(pdfs)} PDF encontrados en {origen}")
    print(f"Los resultados van a: {destino}\n")

    procesados = omitidos = fallidos = 0
    paginas_ocr = 0
    inicio = time.time()

    for i, pdf in enumerate(pdfs, 1):
        etiqueta = f"[{i}/{len(pdfs)}] {pdf.name[:55]}"
        info = paginas_y_texto(pdf)

        if info is None:
            print(f"{etiqueta}  -> ERROR: no se puede abrir (protegido o danado)")
            fallidos += 1
            continue

        n_paginas, n_caracteres = info
        ya_tiene_texto = n_paginas and n_caracteres / n_paginas > UMBRAL_CARACTERES_POR_PAGINA

        if ya_tiene_texto and not args.forzar:
            print(f"{etiqueta}  -> ya tiene texto, no hace falta")
            omitidos += 1
            continue

        salida = destino / pdf.relative_to(origen)
        salida.parent.mkdir(parents=True, exist_ok=True)

        orden = ["ocrmypdf", "-l", args.idiomas, "--skip-text",
                 "--optimize", "3", "--quiet", str(pdf), str(salida)]
        resultado = subprocess.run(orden, capture_output=True, text=True)

        if resultado.returncode == 0:
            print(f"{etiqueta}  -> OK ({n_paginas} pag.)")
            procesados += 1
            paginas_ocr += n_paginas
        else:
            primera_linea = (resultado.stderr or "").strip().splitlines()
            motivo = primera_linea[-1][:70] if primera_linea else "desconocido"
            print(f"{etiqueta}  -> FALLO: {motivo}")
            fallidos += 1

    minutos = (time.time() - inicio) / 60
    ahorro = paginas_ocr * (TOKENS_PAGINA_ESCANEADA - TOKENS_PAGINA_TEXTO)

    print(f"\n{'-' * 60}")
    print(f"Convertidos : {procesados}")
    print(f"Ya tenian texto : {omitidos}")
    print(f"Fallidos : {fallidos}")
    print(f"Tiempo : {minutos:.1f} minutos")
    if paginas_ocr:
        print(f"\nPaginas pasadas por OCR: {paginas_ocr}")
        print(f"Ahorro aproximado: {ahorro:,.0f} tokens cada vez que uses estos documentos")
    print(f"\nTienes los archivos en: {destino}")


if __name__ == "__main__":
    main()
