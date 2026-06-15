// Lectura y escritura de Excel (.xlsx) con imágenes, usando ExcelJS (cargado por CDN).

const XLS = (() => {

  // --- utilidades ---
  function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function bufferToDataUrl(buf, extension) {
    const ext = (extension || "png").toLowerCase();
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/" + ext;
    return "data:" + mime + ";base64," + bufToBase64(buf);
  }

  function parseDataUrl(dataUrl) {
    const m = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
    if (!m) throw new Error("dataUrl no válido");
    let ext = (m[1].split("/")[1] || "png").toLowerCase();
    if (ext === "jpg") ext = "jpeg";
    return { base64: dataUrl, extension: ext };
  }

  function cellText(cell) {
    const v = cell.value;
    if (v == null) return "";
    if (typeof v === "object") {
      if (v.richText) return v.richText.map((t) => t.text).join("");
      if (v.text) return v.text;
      if (v.result != null) return String(v.result);
      if (v.hyperlink) return v.text || v.hyperlink;
      if (v instanceof Date) return v.toLocaleDateString();
      return "";
    }
    return String(v);
  }

  function downloadBlob(data, filename, type) {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // --- IMPORTAR (genérico, para Excel de formato libre) ---
  // Devuelve [{ name, rows: [[texto,...]], images: [{row, dataUrl}] }]
  async function readExcel(arrayBuffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const sheets = [];
    wb.eachSheet((ws) => {
      const rows = [];
      ws.eachRow({ includeEmpty: true }, (row) => {
        const vals = [];
        const last = row.cellCount || 0;
        for (let c = 1; c <= Math.max(last, 1); c++) {
          vals.push(cellText(row.getCell(c)));
        }
        rows.push(vals);
      });

      const images = [];
      const imgs = ws.getImages ? ws.getImages() : [];
      imgs.forEach((im) => {
        const media = wb.getImage(im.imageId);
        if (media && media.buffer) {
          const dataUrl = bufferToDataUrl(media.buffer, media.extension);
          const nativeRow = im.range && im.range.tl ? im.range.tl.nativeRow : 0;
          images.push({ row: Math.round(nativeRow) + 1, dataUrl });
        }
      });

      sheets.push({ name: ws.name, rows, images });
    });
    return sheets;
  }

  // --- IMPORTAR (formato específico: 1 hoja = 1 semana, 4 días en paralelo) ---
  // Bloques de día empiezan en las columnas 1, 9, 17, 25.
  // Columnas por día: FOTO, EJERCICIO, SERIES, PESOS/REPES, DESC, COMENTARIOS.
  const DAY_STARTS = [1, 9, 17, 25];

  function wsText(ws, r, c) {
    return cellText(ws.getCell(r, c)).trim();
  }

  function parseWeekSheet(wb, ws) {
    const imgs = (ws.getImages ? ws.getImages() : [])
      .map((im) => {
        const m = wb.getImage(im.imageId);
        return {
          col: im.range.tl.nativeCol,
          row: im.range.tl.nativeRow,
          url: m && m.buffer ? bufferToDataUrl(m.buffer, m.extension) : null,
        };
      })
      .filter((i) => i.url);

    const days = [];
    DAY_STARTS.forEach((start) => {
      const dayName = wsText(ws, 1, start) || wsText(ws, 1, start + 1);
      if (!dayName) return;
      const pesosLabel = (wsText(ws, 2, start + 3) || "PESOS").toUpperCase();
      const colEj = start + 1, colSer = start + 2, colPR = start + 3, colDesc = start + 4, colCom = start + 5;

      const items = [];
      let last = null;
      for (let r = 3; r <= ws.rowCount; r++) {
        const name = wsText(ws, r, colEj);
        if (name && name !== last) {
          if (items.length) items[items.length - 1].rowEnd = r - 1;
          const series = wsText(ws, r, colSer);
          const com = wsText(ws, r, colCom);
          // fila-rótulo combinada (el mismo texto ocupa varias columnas): es una nota, no un ejercicio
          const esBanner = series === name && (com === name || com === "");
          items.push({
            name,
            series: esBanner ? "" : series,
            pesos: esBanner ? "" : wsText(ws, r, colPR),
            desc: esBanner ? "" : wsText(ws, r, colDesc),
            comentarios: esBanner ? "" : com,
            esBanner,
            rowStart: r,
            rowEnd: r,
            image: null,
          });
          last = name;
        }
      }
      if (items.length) items[items.length - 1].rowEnd = ws.rowCount;

      // emparejar imágenes con su ejercicio según columna (día) y fila
      imgs
        .filter((im) => im.col >= start - 1 && im.col <= start + 5)
        .forEach((im) => {
          const er = im.row + 1;
          let target = items.find((it) => er >= it.rowStart && er <= it.rowEnd);
          if (!target && items.length) {
            target = items.reduce((best, it) => {
              const d = Math.min(Math.abs(er - it.rowStart), Math.abs(er - it.rowEnd));
              return !best || d < best.d ? { it, d } : best;
            }, null).it;
          }
          if (target && !target.image) target.image = im.url;
        });

      days.push({ name: dayName, pesosLabel, items });
    });
    return days;
  }

  // Intenta leer el formato específico. Devuelve { weeks:[{name, days:[{name,pesosLabel,items}]}] }
  // o null si no parece de ese formato.
  async function parseStructured(arrayBuffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const weeks = [];
    wb.worksheets.forEach((ws) => {
      // ¿la fila 2 tiene FOTO/EJERCICIO? entonces es una hoja de semana de este formato
      const looksLikeWeek =
        wsText(ws, 2, 1).toUpperCase() === "FOTO" && wsText(ws, 2, 2).toUpperCase() === "EJERCICIO";
      if (!looksLikeWeek) return;
      const days = parseWeekSheet(wb, ws).filter((d) => d.items.length);
      if (days.length) weeks.push({ name: ws.name, days });
    });
    return weeks.length ? { weeks } : null;
  }

  // --- EXPORTAR (rejilla de 4 días en paralelo, como las plantillas originales) ---
  async function exportWeek(client, week, exercisesById) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Gestor de Entrenamientos";
    const ws = wb.addWorksheet((week.name || "Semana").slice(0, 28).replace(/[\\/?*\[\]:]/g, " "));

    const thin = {
      top: { style: "thin", color: { argb: "FFCBD5E0" } },
      left: { style: "thin", color: { argb: "FFCBD5E0" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E0" } },
      right: { style: "thin", color: { argb: "FFCBD5E0" } },
    };
    const DAY_W = 6; // columnas por día
    const SPACER = 1; // columna de separación
    const STEP = DAY_W + SPACER; // 7

    const days = week.days || [];
    // anchos de columna por día
    const colW = [18, 22, 10, 9, 9, 32];
    days.forEach((d, di) => {
      const base = di * STEP;
      colW.forEach((w, i) => (ws.getColumn(base + i + 1).width = w));
      if (di < days.length - 1) ws.getColumn(base + DAY_W + 1).width = 3;
    });

    // título general (fila 1)
    const totalCols = days.length * STEP - SPACER;
    ws.mergeCells(1, 1, 1, Math.max(totalCols, 1));
    const t = ws.getCell(1, 1);
    t.value = (client.name || "") + " — " + (week.name || "");
    t.font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B6CB0" } };
    t.alignment = { vertical: "middle" };
    ws.getRow(1).height = 24;

    days.forEach((day, di) => {
      const base = di * STEP;
      // fila 2: título del día
      ws.mergeCells(2, base + 1, 2, base + DAY_W);
      const dc = ws.getCell(2, base + 1);
      dc.value = day.name || "Día " + (di + 1);
      dc.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      dc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C7A7B" } };
      dc.alignment = { vertical: "middle", horizontal: "center" };

      // fila 3: cabeceras
      const heads = ["FOTO", "EJERCICIO", "SERIES", (day.pesosLabel || "PESOS"), "DESC", "COMENTARIOS"];
      heads.forEach((h, i) => {
        const c = ws.getCell(3, base + i + 1);
        c.value = h;
        c.font = { bold: true, size: 10 };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF2F7" } };
        c.border = thin;
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      // ejercicios desde la fila 4
      (day.items || []).forEach((item, ri) => {
        const r = 4 + ri;
        const ex = item.exerciseId ? exercisesById[item.exerciseId] : null;
        const name = ex ? ex.name : item.name || "";
        const comentarios = item.notes || (ex && ex.description) || "";
        const vals = [null, name, item.series || "", item.pesos || "", item.desc || "", comentarios];
        vals.forEach((v, i) => {
          const c = ws.getCell(r, base + i + 1);
          if (i !== 0) c.value = v;
          c.border = thin;
          c.alignment = { vertical: "middle", wrapText: true, horizontal: i >= 2 && i <= 4 ? "center" : "left" };
          c.font = { size: 10 };
        });
        ws.getRow(r).height = 70;

        const img = item.image || (ex && ex.image);
        if (img) {
          try {
            const { base64, extension } = parseDataUrl(img);
            const id = wb.addImage({ base64, extension });
            ws.addImage(id, {
              tl: { col: base + 0 + 0.1, row: r - 1 + 0.08 },
              ext: { width: 110, height: 88 },
            });
          } catch (e) {
            /* sin imagen */
          }
        }
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    const safe = (s) => (s || "").replace(/[^\w\sÀ-ÿ-]/g, "").trim().replace(/\s+/g, "_");
    if (typeof document !== "undefined") {
      downloadBlob(
        buf,
        `${safe(client.name) || "entrenamiento"}_${safe(week.name) || "semana"}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    }
    return buf;
  }

  return { readExcel, parseStructured, exportWeek, downloadBlob };
})();

// Exporta para pruebas en Node (no afecta al navegador).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { XLS };
}
