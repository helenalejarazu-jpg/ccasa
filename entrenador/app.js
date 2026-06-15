// Lógica principal de la aplicación: estado, render y eventos.
//
// Modelo de datos:
//   state.exercises: [{ id, name, image(dataURL|null), description }]  (description = comentarios/técnica)
//   state.clients:   [{ id, name, notes, plan:{ weeks:[
//                        { id, name, days:[
//                          { id, name, pesosLabel:'PESOS'|'REPES', items:[
//                            { id, exerciseId, series, pesos, desc, notes }
//                          ]}
//                        ]}
//                      ]}}]

let state = { clients: [], exercises: [] };

// ---------- utilidades ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => DB.save(state).catch((e) => console.error(e)), 200);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function exercisesById() {
  const map = {};
  state.exercises.forEach((e) => (map[e.id] = e));
  return map;
}

function findOrCreateExercise(name) {
  const key = name.trim().toLowerCase();
  let ex = state.exercises.find((e) => e.name.trim().toLowerCase() === key);
  if (!ex) {
    ex = { id: uid(), name: name.trim(), image: null, description: "" };
    state.exercises.push(ex);
  }
  return ex;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------- navegación por pestañas ----------
function setupTabs() {
  $all(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $all(".tab").forEach((t) => t.classList.remove("active"));
      $all(".view").forEach((v) => v.classList.remove("active"));
      tab.classList.add("active");
      $("#view-" + tab.dataset.view).classList.add("active");
      if (tab.dataset.view === "plan") renderPlan();
      if (tab.dataset.view === "exportar") renderExportSelects();
    });
  });
}

// ---------- PERSONAS ----------
function renderClientes() {
  const cont = $("#listaClientes");
  if (!state.clients.length) {
    cont.innerHTML = '<div class="empty">Aún no hay personas. Añade la primera arriba o impórtalas desde un Excel.</div>';
    return;
  }
  cont.innerHTML = state.clients
    .map((c) => {
      const weeks = c.plan && c.plan.weeks ? c.plan.weeks.length : 0;
      return `<div class="card" data-id="${c.id}">
        <h3>${escapeHtml(c.name)}</h3>
        <div class="meta">${weeks} semana(s) de plan</div>
        <div class="actions">
          <button class="btn small" data-act="abrir">Abrir plan</button>
          <button class="btn small" data-act="renombrar">Renombrar</button>
          <button class="btn small danger" data-act="eliminar">Eliminar</button>
        </div>
      </div>`;
    })
    .join("");
}

function setupPersonas() {
  $("#addCliente").addEventListener("click", () => {
    const name = $("#nuevoClienteNombre").value.trim();
    if (!name) return toast("Escribe un nombre");
    state.clients.push({ id: uid(), name, notes: "", plan: { weeks: [] } });
    $("#nuevoClienteNombre").value = "";
    save();
    renderClientes();
    toast("Persona añadida");
  });

  $("#listaClientes").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = e.target.closest(".card").dataset.id;
    const c = state.clients.find((x) => x.id === id);
    if (!c) return;
    const act = btn.dataset.act;
    if (act === "eliminar") {
      if (confirm(`¿Eliminar a ${c.name} y todo su plan?`)) {
        state.clients = state.clients.filter((x) => x.id !== id);
        save();
        renderClientes();
        toast("Persona eliminada");
      }
    } else if (act === "renombrar") {
      const nn = prompt("Nuevo nombre:", c.name);
      if (nn && nn.trim()) {
        c.name = nn.trim();
        save();
        renderClientes();
      }
    } else if (act === "abrir") {
      $('.tab[data-view="plan"]').click();
      $("#planCliente").value = id;
      renderPlan();
    }
  });
}

// ---------- EJERCICIOS ----------
function renderEjercicios() {
  const cont = $("#listaEjercicios");
  if (!state.exercises.length) {
    cont.innerHTML = '<div class="empty">Biblioteca vacía. Añade ejercicios y súbeles una foto, o impórtalos desde un Excel.</div>';
    return;
  }
  const orden = state.exercises.slice().sort((a, b) => a.name.localeCompare(b.name, "es"));
  cont.innerHTML = orden
    .map(
      (e) => `<div class="ej-card" data-id="${e.id}">
        <div class="ej-img">${e.image ? `<img src="${e.image}" alt="">` : "Sin foto"}</div>
        <div class="ej-body">
          <input type="text" value="${escapeHtml(e.name)}" data-field="name" />
          <textarea data-field="description" rows="2" placeholder="Comentarios / técnica">${escapeHtml(e.description || "")}</textarea>
          <div class="actions">
            <label class="btn small">Foto<input type="file" accept="image/*" data-field="image" hidden></label>
            ${e.image ? '<button class="btn small" data-act="quitarFoto">Quitar foto</button>' : ""}
            <button class="btn small danger" data-act="eliminar">Eliminar</button>
          </div>
        </div>
      </div>`
    )
    .join("");
}

function setupEjercicios() {
  $("#addEjercicio").addEventListener("click", () => {
    const name = $("#nuevoEjercicioNombre").value.trim();
    if (!name) return toast("Escribe un nombre");
    state.exercises.push({ id: uid(), name, image: null, description: "" });
    $("#nuevoEjercicioNombre").value = "";
    save();
    renderEjercicios();
  });

  const cont = $("#listaEjercicios");
  cont.addEventListener("input", (e) => {
    const field = e.target.dataset.field;
    if (field !== "name" && field !== "description") return;
    const id = e.target.closest(".ej-card").dataset.id;
    const ex = state.exercises.find((x) => x.id === id);
    if (ex) {
      ex[field] = e.target.value;
      save();
    }
  });
  cont.addEventListener("change", async (e) => {
    if (e.target.dataset.field !== "image") return;
    const id = e.target.closest(".ej-card").dataset.id;
    const ex = state.exercises.find((x) => x.id === id);
    if (ex && e.target.files[0]) {
      ex.image = await fileToDataUrl(e.target.files[0]);
      save();
      renderEjercicios();
      toast("Foto actualizada");
    }
  });
  cont.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = e.target.closest(".ej-card").dataset.id;
    const ex = state.exercises.find((x) => x.id === id);
    if (!ex) return;
    if (btn.dataset.act === "eliminar") {
      if (confirm(`¿Eliminar el ejercicio "${ex.name}"?`)) {
        state.exercises = state.exercises.filter((x) => x.id !== id);
        save();
        renderEjercicios();
      }
    } else if (btn.dataset.act === "quitarFoto") {
      ex.image = null;
      save();
      renderEjercicios();
    }
  });
}

// ---------- PLAN ----------
function fillClientSelect(sel, keepValue) {
  const prev = keepValue ? sel.value : null;
  sel.innerHTML = state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  if (prev && state.clients.some((c) => c.id === prev)) sel.value = prev;
}

function currentPlanClient() {
  const id = $("#planCliente").value;
  return state.clients.find((c) => c.id === id);
}

function renderPlan() {
  fillClientSelect($("#planCliente"), true);
  const cont = $("#planContenido");
  const c = currentPlanClient();
  if (!c) {
    cont.innerHTML = '<div class="empty">Crea una persona primero en la pestaña «Personas».</div>';
    return;
  }
  if (!c.plan) c.plan = { weeks: [] };
  if (!c.plan.weeks.length) {
    cont.innerHTML = '<div class="empty">Sin semanas. Pulsa «+ Semana» para empezar.</div>';
    return;
  }
  const exOptions = (selId) =>
    `<option value="">— ejercicio —</option>` +
    state.exercises
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((e) => `<option value="${e.id}" ${e.id === selId ? "selected" : ""}>${escapeHtml(e.name)}</option>`)
      .join("");
  const byId = exercisesById();

  cont.innerHTML = c.plan.weeks
    .map(
      (w) => `<div class="semana" data-week="${w.id}">
      <div class="semana-head">
        <input type="text" value="${escapeHtml(w.name)}" data-field="weekName" />
        <div class="row">
          <button class="btn small" data-act="addDia">+ Día</button>
          <button class="btn small" data-act="dupSemana">Duplicar</button>
          <button class="btn small danger" data-act="delSemana">Eliminar semana</button>
        </div>
      </div>
      ${(w.days || [])
        .map(
          (d) => `<div class="dia" data-day="${d.id}">
          <div class="dia-head">
            <input type="text" value="${escapeHtml(d.name)}" data-field="dayName" />
            <div class="row">
              <label>4ª col:
                <select data-field="pesosLabel">
                  <option value="PESOS" ${(d.pesosLabel || "PESOS") === "PESOS" ? "selected" : ""}>PESOS</option>
                  <option value="REPES" ${d.pesosLabel === "REPES" ? "selected" : ""}>REPES</option>
                </select>
              </label>
              <button class="btn small" data-act="addItem">+ Ejercicio</button>
              <button class="btn small danger" data-act="delDia">Eliminar día</button>
            </div>
          </div>
          <table class="items">
            <thead><tr>
              <th style="width:46px"></th><th>Ejercicio</th><th>Series</th>
              <th>${escapeHtml(d.pesosLabel || "PESOS")}</th><th>Desc</th><th>Comentarios</th><th></th>
            </tr></thead>
            <tbody>
            ${(d.items || [])
              .map((it) => {
                const ex = it.exerciseId ? byId[it.exerciseId] : null;
                const img = ex && ex.image;
                const com = it.notes || (ex && ex.description) || "";
                return `<tr data-item="${it.id}">
                  <td>${img ? `<img class="thumb" src="${img}">` : ""}</td>
                  <td><select data-field="exerciseId">${exOptions(it.exerciseId)}</select></td>
                  <td><input type="text" value="${escapeHtml(it.series || "")}" data-field="series"></td>
                  <td><input type="text" value="${escapeHtml(it.pesos || "")}" data-field="pesos"></td>
                  <td><input type="text" value="${escapeHtml(it.desc || "")}" data-field="desc"></td>
                  <td><input type="text" value="${escapeHtml(com)}" data-field="comentarios"></td>
                  <td><button class="btn small danger" data-act="delItem">✕</button></td>
                </tr>`;
              })
              .join("")}
            </tbody>
          </table>
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("");
}

function findWeek(c, wid) {
  return c.plan.weeks.find((w) => w.id === wid);
}
function findDay(w, did) {
  return (w.days || []).find((d) => d.id === did);
}

function setupPlan() {
  $("#planCliente").addEventListener("change", renderPlan);

  $("#addSemana").addEventListener("click", () => {
    const c = currentPlanClient();
    if (!c) return toast("Crea una persona primero");
    if (!c.plan) c.plan = { weeks: [] };
    const n = c.plan.weeks.length + 1;
    c.plan.weeks.push({ id: uid(), name: "Semana " + n, days: [] });
    save();
    renderPlan();
  });

  const cont = $("#planContenido");

  // edición de campos de texto (sin re-render para no perder el foco)
  cont.addEventListener("input", (e) => {
    const f = e.target.dataset.field;
    if (!f) return;
    const c = currentPlanClient();
    if (!c) return;
    const wEl = e.target.closest(".semana");
    const w = wEl && findWeek(c, wEl.dataset.week);
    if (f === "weekName") {
      w.name = e.target.value;
    } else if (f === "dayName") {
      findDay(w, e.target.closest(".dia").dataset.day).name = e.target.value;
    } else if (["series", "pesos", "desc"].includes(f)) {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      const it = d.items.find((x) => x.id === e.target.closest("tr").dataset.item);
      if (it) it[f] = e.target.value;
    } else if (f === "comentarios") {
      // el comentario es la técnica del ejercicio: se guarda en la biblioteca
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      const it = d.items.find((x) => x.id === e.target.closest("tr").dataset.item);
      const ex = it && it.exerciseId && exercisesById()[it.exerciseId];
      if (ex) ex.description = e.target.value;
      else if (it) it.notes = e.target.value;
    }
    save();
  });

  // selects (ejercicio / etiqueta 4ª col) -> re-render
  cont.addEventListener("change", (e) => {
    const f = e.target.dataset.field;
    const c = currentPlanClient();
    if (!c) return;
    const w = findWeek(c, e.target.closest(".semana").dataset.week);
    if (f === "exerciseId") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      const it = d.items.find((x) => x.id === e.target.closest("tr").dataset.item);
      if (it) it.exerciseId = e.target.value;
      save();
      renderPlan();
    } else if (f === "pesosLabel") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      d.pesosLabel = e.target.value;
      save();
      renderPlan();
    }
  });

  // botones (añadir/eliminar/duplicar)
  cont.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || !btn.dataset.act) return;
    const c = currentPlanClient();
    const w = findWeek(c, e.target.closest(".semana").dataset.week);
    const act = btn.dataset.act;
    if (act === "delSemana") {
      if (confirm("¿Eliminar esta semana?")) c.plan.weeks = c.plan.weeks.filter((x) => x.id !== w.id);
    } else if (act === "dupSemana") {
      const copy = JSON.parse(JSON.stringify(w));
      copy.id = uid();
      copy.name = w.name + " (copia)";
      (copy.days || []).forEach((d) => {
        d.id = uid();
        (d.items || []).forEach((it) => (it.id = uid()));
      });
      c.plan.weeks.splice(c.plan.weeks.indexOf(w) + 1, 0, copy);
    } else if (act === "addDia") {
      w.days = w.days || [];
      w.days.push({ id: uid(), name: "Día " + (w.days.length + 1), pesosLabel: "PESOS", items: [] });
    } else if (act === "delDia") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      w.days = w.days.filter((x) => x.id !== d.id);
    } else if (act === "addItem") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      d.items = d.items || [];
      d.items.push({ id: uid(), exerciseId: "", series: "", pesos: "", desc: "", notes: "" });
    } else if (act === "delItem") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      const itId = e.target.closest("tr").dataset.item;
      d.items = d.items.filter((x) => x.id !== itId);
    } else {
      return;
    }
    save();
    renderPlan();
  });
}

// ---------- IMPORTAR ----------
let importGeneric = null; // { sheets, sheetIdx } para formato libre

function setupImportar() {
  $("#excelInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const cont = $("#importResultado");
    cont.innerHTML = '<div class="empty">Leyendo Excel…</div>';
    try {
      const buf = await file.arrayBuffer();
      // 1) ¿es el formato de plantilla (4 días en paralelo)?
      const structured = await XLS.parseStructured(buf);
      if (structured) {
        renderStructuredImport(structured, file.name);
        toast("Formato de plantilla detectado");
        return;
      }
      // 2) formato libre -> mapeo manual de columnas
      const sheets = await XLS.readExcel(buf);
      importGeneric = { sheets, sheetIdx: 0 };
      renderGenericImport();
      toast("Excel leído (formato libre)");
    } catch (err) {
      console.error(err);
      cont.innerHTML = `<div class="empty">No se pudo leer el archivo: ${escapeHtml(err.message)}</div>`;
    }
  });
}

// Importación automática del formato de plantilla
function renderStructuredImport(structured, filename) {
  const baseName = (filename || "").replace(/\.xlsx?$/i, "");
  let totalEj = 0, totalFotos = 0;
  structured.weeks.forEach((w) => w.days.forEach((d) => d.items.forEach((it) => { totalEj++; if (it.image) totalFotos++; })));

  const resumen = structured.weeks
    .map((w) => `<li><strong>${escapeHtml(w.name)}</strong>: ${w.days.map((d) => `${escapeHtml(d.name)} (${d.items.length})`).join(" · ")}</li>`)
    .join("");

  $("#importResultado").innerHTML = `
    <div class="card">
      <h3>✅ Plantilla detectada</h3>
      <div class="meta">${structured.weeks.length} semana(s) · ${totalEj} ejercicios · ${totalFotos} con foto</div>
      <div class="map-grid">
        <label>Persona destino
          <select id="siCliente">
            <option value="__new">➕ Nueva persona…</option>
            ${state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
          </select>
        </label>
        <label>Nombre (si es nueva)<input type="text" id="siNombre" value="${escapeHtml(baseName)}"></label>
      </div>
      <button class="btn primary" id="btnImportStruct">Importar todo</button>
      <ul class="hint">${resumen}</ul>
    </div>`;

  $("#btnImportStruct").addEventListener("click", () => doStructuredImport(structured));
}

function doStructuredImport(structured) {
  let client;
  if ($("#siCliente").value === "__new") {
    client = { id: uid(), name: $("#siNombre").value.trim() || "Persona importada", notes: "", plan: { weeks: [] } };
    state.clients.push(client);
  } else {
    client = state.clients.find((c) => c.id === $("#siCliente").value);
  }
  if (!client.plan) client.plan = { weeks: [] };

  let nEj = 0;
  structured.weeks.forEach((w) => {
    const week = { id: uid(), name: w.name, days: [] };
    w.days.forEach((d) => {
      const day = { id: uid(), name: d.name, pesosLabel: d.pesosLabel || "PESOS", items: [] };
      d.items.forEach((it) => {
        const ex = findOrCreateExercise(it.name);
        if (!ex.image && it.image) ex.image = it.image;
        if (!ex.description && it.comentarios) ex.description = it.comentarios;
        day.items.push({ id: uid(), exerciseId: ex.id, series: it.series || "", pesos: it.pesos || "", desc: it.desc || "", notes: "" });
        nEj++;
      });
      week.days.push(day);
    });
    client.plan.weeks.push(week);
  });

  save();
  renderClientes();
  renderEjercicios();
  $("#importResultado").innerHTML = `<div class="empty">✅ Importadas ${structured.weeks.length} semana(s) y ${nEj} ejercicios en «${escapeHtml(client.name)}».<br>Revísalo en la pestaña «Plan».</div>`;
  $("#excelInput").value = "";
  toast("Importación completada");
}

// Importación genérica (formato libre): mapeo manual de columnas
function renderGenericImport() {
  const cont = $("#importResultado");
  if (!importGeneric) return;
  const sheet = importGeneric.sheets[importGeneric.sheetIdx];
  const cols = Math.max(...sheet.rows.map((r) => r.length), 0);
  const colLabels = Array.from({ length: cols }, (_, i) => "Columna " + (i + 1));
  const previewRows = sheet.rows.slice(0, 20);
  const colOptions = (sel) =>
    `<option value="-1">(ninguna)</option>` +
    colLabels.map((l, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${l}</option>`).join("");

  cont.innerHTML = `
    <div class="row">
      <label>Hoja:</label>
      <select id="impSheet">${importGeneric.sheets
        .map((s, i) => `<option value="${i}" ${i === importGeneric.sheetIdx ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
        .join("")}</select>
      <span class="hint">${sheet.images.length} imagen(es) detectada(s)</span>
    </div>
    <div class="map-grid">
      <label>Persona destino
        <select id="impCliente">
          <option value="__new">➕ Nueva persona…</option>
          ${state.clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
        </select>
      </label>
      <label>Nombre (si es nueva)<input type="text" id="impNuevoNombre" value="${escapeHtml(sheet.name)}"></label>
      <label>Nombre de la semana<input type="text" id="impSemana" value="Semana importada"></label>
      <label>Nombre del día<input type="text" id="impDia" value="Día 1"></label>
      <label>Primera fila de datos<input type="number" id="impFilaInicio" value="2" min="1"></label>
    </div>
    <div class="map-grid">
      <label>Columna · Ejercicio<select id="mapEjercicio">${colOptions(0)}</select></label>
      <label>Columna · Series<select id="mapSeries">${colOptions(1)}</select></label>
      <label>Columna · Peso/Reps<select id="mapPesos">${colOptions(2)}</select></label>
      <label>Columna · Descanso<select id="mapDesc">${colOptions(-1)}</select></label>
      <label>Columna · Comentarios<select id="mapCom">${colOptions(-1)}</select></label>
    </div>
    <div class="row">
      <button class="btn primary" id="btnImportar">Importar a la app</button>
      <label class="row" style="gap:4px"><input type="checkbox" id="impConImagenes" checked> Añadir imágenes a la biblioteca</label>
    </div>
    <p class="hint">Vista previa (primeras 20 filas):</p>
    <div class="preview-wrap">
      <table class="preview"><tbody>
        ${previewRows
          .map((r, ri) => `<tr><td style="color:var(--muted)">${ri + 1}</td>${Array.from({ length: cols }, (_, ci) => `<td>${escapeHtml(r[ci] || "")}</td>`).join("")}</tr>`)
          .join("")}
      </tbody></table>
    </div>`;

  $("#impSheet").addEventListener("change", (e) => {
    importGeneric.sheetIdx = +e.target.value;
    renderGenericImport();
  });
  $("#btnImportar").addEventListener("click", doGenericImport);
}

function doGenericImport() {
  const sheet = importGeneric.sheets[importGeneric.sheetIdx];
  const g = (id) => +$("#" + id).value;
  const map = { name: g("mapEjercicio"), series: g("mapSeries"), pesos: g("mapPesos"), desc: g("mapDesc"), com: g("mapCom") };
  const startRow = Math.max(1, +$("#impFilaInicio").value) - 1;
  const conImagenes = $("#impConImagenes").checked;

  let client;
  if ($("#impCliente").value === "__new") {
    client = { id: uid(), name: $("#impNuevoNombre").value.trim() || "Persona importada", notes: "", plan: { weeks: [] } };
    state.clients.push(client);
  } else {
    client = state.clients.find((c) => c.id === $("#impCliente").value);
  }
  if (!client.plan) client.plan = { weeks: [] };

  const day = { id: uid(), name: $("#impDia").value.trim() || "Día 1", pesosLabel: "PESOS", items: [] };
  const week = { id: uid(), name: $("#impSemana").value.trim() || "Semana importada", days: [day] };
  client.plan.weeks.push(week);

  const imgByRow = {};
  sheet.images.forEach((im) => (imgByRow[im.row] = im.dataUrl));
  const imgForRow = (excelRow) => {
    for (const off of [0, 1, -1, 2, -2]) if (imgByRow[excelRow + off]) return imgByRow[excelRow + off];
    return null;
  };

  let count = 0;
  for (let i = startRow; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const exName = map.name >= 0 ? (row[map.name] || "").trim() : "";
    if (!exName) continue;
    const ex = findOrCreateExercise(exName);
    if (conImagenes && !ex.image) {
      const img = imgForRow(i + 1);
      if (img) ex.image = img;
    }
    if (map.com >= 0 && !ex.description) ex.description = row[map.com] || "";
    day.items.push({
      id: uid(),
      exerciseId: ex.id,
      series: map.series >= 0 ? row[map.series] || "" : "",
      pesos: map.pesos >= 0 ? row[map.pesos] || "" : "",
      desc: map.desc >= 0 ? row[map.desc] || "" : "",
      notes: "",
    });
    count++;
  }

  save();
  renderClientes();
  renderEjercicios();
  toast(`Importados ${count} ejercicios`);
  $("#importResultado").innerHTML = `<div class="empty">✅ Importados ${count} ejercicios en «${escapeHtml(client.name)}» → ${escapeHtml(week.name)} / ${escapeHtml(day.name)}.</div>`;
  importGeneric = null;
  $("#excelInput").value = "";
}

// ---------- EXPORTAR ----------
function renderExportSelects() {
  fillClientSelect($("#expCliente"), true);
  renderExportWeeks();
}
function renderExportWeeks() {
  const c = state.clients.find((x) => x.id === $("#expCliente").value);
  const sel = $("#expSemana");
  if (!c || !c.plan || !c.plan.weeks.length) {
    sel.innerHTML = '<option value="">(sin semanas)</option>';
    return;
  }
  sel.innerHTML = c.plan.weeks.map((w) => `<option value="${w.id}">${escapeHtml(w.name)}</option>`).join("");
}

function setupExportar() {
  $("#expCliente").addEventListener("change", renderExportWeeks);
  $("#btnExportar").addEventListener("click", async () => {
    const c = state.clients.find((x) => x.id === $("#expCliente").value);
    if (!c) return toast("Elige una persona");
    const w = c.plan && c.plan.weeks.find((x) => x.id === $("#expSemana").value);
    if (!w) return toast("Elige una semana");
    $("#expEstado").innerHTML = '<div class="empty">Generando Excel…</div>';
    try {
      await XLS.exportWeek(c, w, exercisesById());
      $("#expEstado").innerHTML = `<div class="empty">✅ Excel generado y descargado: ${escapeHtml(c.name)} — ${escapeHtml(w.name)}.</div>`;
    } catch (err) {
      console.error(err);
      $("#expEstado").innerHTML = `<div class="empty">Error al generar: ${escapeHtml(err.message)}</div>`;
    }
  });
}

// ---------- COPIAS ----------
function setupDatos() {
  $("#btnBackup").addEventListener("click", () => {
    XLS.downloadBlob(JSON.stringify(state, null, 2), "copia_entrenamientos.json", "application/json");
    toast("Copia descargada");
  });
  $("#restoreInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.clients || !data.exercises) throw new Error("Archivo no válido");
      if (confirm("Esto reemplazará todos los datos actuales. ¿Continuar?")) {
        state = data;
        save();
        renderAll();
        toast("Copia restaurada");
      }
    } catch (err) {
      toast("No se pudo restaurar: " + err.message);
    }
    e.target.value = "";
  });
  $("#btnReset").addEventListener("click", async () => {
    if (confirm("¿Borrar TODOS los datos (personas, ejercicios y planes)? Esto no se puede deshacer.")) {
      state = { clients: [], exercises: [] };
      await DB.clear();
      renderAll();
      toast("Todo borrado");
    }
  });
}

// ---------- arranque ----------
function renderAll() {
  renderClientes();
  renderEjercicios();
  renderPlan();
  renderExportSelects();
}

async function init() {
  setupTabs();
  setupPersonas();
  setupEjercicios();
  setupPlan();
  setupImportar();
  setupExportar();
  setupDatos();

  try {
    const loaded = await DB.load();
    if (loaded) state = loaded;
  } catch (e) {
    console.error("No se pudo cargar:", e);
  }
  // Datos de ejemplo precargados (solo si la app está vacía y hay semilla disponible).
  if ((!state.clients || !state.clients.length) && typeof window !== "undefined" && window.__SEED__) {
    state = window.__SEED__;
    save();
  }
  if (!state.clients) state.clients = [];
  if (!state.exercises) state.exercises = [];
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
