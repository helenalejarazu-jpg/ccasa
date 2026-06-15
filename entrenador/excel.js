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

  // --- IMPORTAR ---
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

  // --- EXPORTAR ---
  async function exportWeek(client, week, exercisesById) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Gestor de Entrenamientos";
    const ws = wb.addWorksheet((client.name || "Entrenamiento").slice(0, 28));

    const widths = [30, 9, 12, 12, 13, 32, 24];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

    const thin = {
      top: { style: "thin", color: { argb: "FFCBD5E0" } },
      left: { style: "thin", color: { argb: "FFCBD5E0" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E0" } },
      right: { style: "thin", color: { argb: "FFCBD5E0" } },
    };

    let r = 1;
    ws.mergeCells(r, 1, r, 7);
    const t = ws.getCell(r, 1);
    t.value = "PLAN DE ENTRENAMIENTO — " + (client.name || "");
    t.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B6CB0" } };
    t.alignment = { vertical: "middle" };
    ws.getRow(r).height = 26;
    r++;

    ws.mergeCells(r, 1, r, 7);
    const s = ws.getCell(r, 1);
    s.value = "Semana: " + (week.name || "");
    s.font = { bold: true, size: 12 };
    r++;
    r++; // fila en blanco

    (week.days || []).forEach((day) => {
      ws.mergeCells(r, 1, r, 7);
      const d = ws.getCell(r, 1);
      d.value = day.name || "Día";
      d.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
      d.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C7A7B" } };
      d.alignment = { vertical: "middle" };
      ws.getRow(r).height = 22;
      r++;

      const heads = ["Ejercicio", "Series", "Reps", "Peso", "Descanso", "Notas", "Imagen"];
      heads.forEach((h, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = h;
        c.font = { bold: true };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF2F7" } };
        c.border = thin;
        c.alignment = { vertical: "middle" };
      });
      r++;

      (day.items || []).forEach((item) => {
        const ex = item.exerciseId ? exercisesById[item.exerciseId] : null;
        const name = ex ? ex.name : item.name || "";
        ws.getCell(r, 1).value = name;
        ws.getCell(r, 2).value = item.sets || "";
        ws.getCell(r, 3).value = item.reps || "";
        ws.getCell(r, 4).value = item.weight || "";
        ws.getCell(r, 5).value = item.rest || "";
        ws.getCell(r, 6).value = item.notes || "";
        for (let c = 1; c <= 7; c++) {
          ws.getCell(r, c).border = thin;
          ws.getCell(r, c).alignment = { vertical: "middle", wrapText: true };
        }

        const img = item.image || (ex && ex.image);
        if (img) {
          try {
            const { base64, extension } = parseDataUrl(img);
            const id = wb.addImage({ base64, extension });
            ws.addImage(id, {
              tl: { col: 6, row: r - 1 + 0.1 },
              ext: { width: 130, height: 95 },
            });
            ws.getRow(r).height = 78;
          } catch (e) {
            ws.getRow(r).height = 22;
          }
        } else {
          ws.getRow(r).height = 22;
        }
        r++;
      });
      r++; // separación entre días
    });

    const buf = await wb.xlsx.writeBuffer();
    const safe = (client.name || "entrenamiento").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    const safeWeek = (week.name || "semana").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    downloadBlob(
      buf,
      `${safe}_${safeWeek}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  return { readExcel, exportWeek, downloadBlob };
})();
