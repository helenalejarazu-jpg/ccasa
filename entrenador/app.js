// Lógica principal de la aplicación: estado, render y eventos.

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
    cont.innerHTML = '<div class="empty">Aún no hay personas. Añade la primera arriba.</div>';
    return;
  }
  cont.innerHTML = state.clients
    .map((c) => {
      const weeks = (c.plan && c.plan.weeks ? c.plan.weeks.length : 0);
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
    cont.innerHTML = '<div class="empty">Biblioteca vacía. Añade ejercicios y súbeles una foto.</div>';
    return;
  }
  cont.innerHTML = state.exercises
    .map(
      (e) => `<div class="ej-card" data-id="${e.id}">
        <div class="ej-img">${e.image ? `<img src="${e.image}" alt="">` : "Sin foto"}</div>
        <div class="ej-body">
          <input type="text" value="${escapeHtml(e.name)}" data-field="name" />
          <input type="text" value="${escapeHtml(e.description || "")}" data-field="description" placeholder="Descripción (opcional)" />
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
              <button class="btn small" data-act="addItem">+ Ejercicio</button>
              <button class="btn small danger" data-act="delDia">Eliminar día</button>
            </div>
          </div>
          <table class="items">
            <thead><tr>
              <th style="width:40px"></th><th>Ejercicio</th><th>Series</th><th>Reps</th>
              <th>Peso</th><th>Descanso</th><th>Notas</th><th></th>
            </tr></thead>
            <tbody>
            ${(d.items || [])
              .map((it) => {
                const ex = it.exerciseId ? byId[it.exerciseId] : null;
                const img = it.image || (ex && ex.image);
                return `<tr data-item="${it.id}">
                  <td>${img ? `<img class="thumb" src="${img}">` : ""}</td>
                  <td><select data-field="exerciseId">${exOptions(it.exerciseId)}</select></td>
                  <td><input type="text" value="${escapeHtml(it.sets || "")}" data-field="sets"></td>
                  <td><input type="text" value="${escapeHtml(it.reps || "")}" data-field="reps"></td>
                  <td><input type="text" value="${escapeHtml(it.weight || "")}" data-field="weight"></td>
                  <td><input type="text" value="${escapeHtml(it.rest || "")}" data-field="rest"></td>
                  <td><input type="text" value="${escapeHtml(it.notes || "")}" data-field="notes"></td>
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

  // edición de campos (sin re-render para no perder el foco)
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
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      d.name = e.target.value;
    } else {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      const it = d.items.find((x) => x.id === e.target.closest("tr").dataset.item);
      if (it) it[f] = e.target.value;
    }
    save();
  });

  // selects (ejercicio) -> sí re-render para mostrar miniatura
  cont.addEventListener("change", (e) => {
    if (e.target.dataset.field !== "exerciseId") return;
    const c = currentPlanClient();
    const w = findWeek(c, e.target.closest(".semana").dataset.week);
    const d = findDay(w, e.target.closest(".dia").dataset.day);
    const it = d.items.find((x) => x.id === e.target.closest("tr").dataset.item);
    if (it) {
      it.exerciseId = e.target.value;
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
      if (confirm("¿Eliminar esta semana?")) {
        c.plan.weeks = c.plan.weeks.filter((x) => x.id !== w.id);
      }
    } else if (act === "dupSemana") {
      const copy = JSON.parse(JSON.stringify(w));
      copy.id = uid();
      copy.name = w.name + " (copia)";
      copy.days.forEach((d) => {
        d.id = uid();
        d.items.forEach((it) => (it.id = uid()));
      });
      const idx = c.plan.weeks.indexOf(w);
      c.plan.weeks.splice(idx + 1, 0, copy);
    } else if (act === "addDia") {
      w.days = w.days || [];
      w.days.push({ id: uid(), name: "Día " + (w.days.length + 1), items: [] });
    } else if (act === "delDia") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      w.days = w.days.filter((x) => x.id !== d.id);
    } else if (act === "addItem") {
      const d = findDay(w, e.target.closest(".dia").dataset.day);
      d.items = d.items || [];
      d.items.push({ id: uid(), exerciseId: "", sets: "", reps: "", weight: "", rest: "", notes: "" });
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
let importData = null; // { sheets, sheetIdx }

function setupImportar() {
  $("#excelInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const sheets = await XLS.readExcel(buf);
      importData = { sheets, sheetIdx: 0 };
      renderImport();
      toast("Excel leído");
    } catch (err) {
      console.error(err);
      $("#importResultado").innerHTML = `<div class="empty">No se pudo leer el archivo: ${escapeHtml(err.message)}</div>`;
    }
  });
}

function renderImport() {
  const cont = $("#importResultado");
  if (!importData) return;
  const sheet = importData.sheets[importData.sheetIdx];
  const cols = Math.max(...sheet.rows.map((r) => r.length), 0);
  const colLabels = Array.from({ length: cols }, (_, i) => "Columna " + (i + 1));

  const previewRows = sheet.rows.slice(0, 20);
  const colOptions = (sel) =>
    `<option value="-1">(ninguna)</option>` +
    colLabels.map((l, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${l}</option>`).join("");

  cont.innerHTML = `
    <div class="row">
      <label>Hoja:</label>
      <select id="impSheet">${importData.sheets
        .map((s, i) => `<option value="${i}" ${i === importData.sheetIdx ? "selected" : ""}>${escapeHtml(s.name)}</option>`)
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
      <label>Fila de la primera fila de datos<input type="number" id="impFilaInicio" value="2" min="1"></label>
    </div>

    <div class="map-grid">
      <label>Columna · Ejercicio<select id="mapEjercicio">${colOptions(0)}</select></label>
      <label>Columna · Series<select id="mapSeries">${colOptions(1)}</select></label>
      <label>Columna · Reps<select id="mapReps">${colOptions(2)}</select></label>
      <label>Columna · Peso<select id="mapPeso">${colOptions(3)}</select></label>
      <label>Columna · Descanso<select id="mapDescanso">${colOptions(-1)}</select></label>
      <label>Columna · Notas<select id="mapNotas">${colOptions(-1)}</select></label>
    </div>

    <div class="row">
      <button class="btn primary" id="btnImportar">Importar a la app</button>
      <label class="row" style="gap:4px"><input type="checkbox" id="impConImagenes" checked> Añadir imágenes a la biblioteca</label>
    </div>

    <p class="hint">Vista previa (primeras 20 filas):</p>
    <div class="preview-wrap">
      <table class="preview"><tbody>
        ${previewRows
          .map(
            (r, ri) =>
              `<tr><td style="color:var(--muted)">${ri + 1}</td>${Array.from({ length: cols }, (_, ci) => `<td>${escapeHtml(r[ci] || "")}</td>`).join("")}</tr>`
          )
          .join("")}
      </tbody></table>
    </div>
  `;

  $("#impSheet").addEventListener("change", (e) => {
    importData.sheetIdx = +e.target.value;
    renderImport();
  });
  $("#btnImportar").addEventListener("click", doImport);
}

function doImport() {
  const sheet = importData.sheets[importData.sheetIdx];
  const getMap = (id) => +$("#" + id).value;
  const map = {
    name: getMap("mapEjercicio"),
    sets: getMap("mapSeries"),
    reps: getMap("mapReps"),
    weight: getMap("mapPeso"),
    rest: getMap("mapDescanso"),
    notes: getMap("mapNotas"),
  };
  const startRow = Math.max(1, +$("#impFilaInicio").value) - 1;
  const conImagenes = $("#impConImagenes").checked;

  // persona destino
  let clientId = $("#impCliente").value;
  let client;
  if (clientId === "__new") {
    const nombre = $("#impNuevoNombre").value.trim() || "Persona importada";
    client = { id: uid(), name: nombre, notes: "", plan: { weeks: [] } };
    state.clients.push(client);
  } else {
    client = state.clients.find((c) => c.id === clientId);
  }
  if (!client.plan) client.plan = { weeks: [] };

  const week = { id: uid(), name: $("#impSemana").value.trim() || "Semana importada", days: [] };
  const day = { id: uid(), name: $("#impDia").value.trim() || "Día 1", items: [] };
  week.days.push(day);
  client.plan.weeks.push(week);

  // mapa de imágenes por número de fila del Excel
  const imgByRow = {};
  sheet.images.forEach((im) => {
    imgByRow[im.row] = im.dataUrl;
  });
  const findImageForRow = (excelRow) => {
    if (imgByRow[excelRow]) return imgByRow[excelRow];
    // buscar imagen cercana (±1 fila)
    for (const off of [0, 1, -1, 2, -2]) {
      if (imgByRow[excelRow + off]) return imgByRow[excelRow + off];
    }
    return null;
  };

  const byName = {};
  state.exercises.forEach((e) => (byName[e.name.trim().toLowerCase()] = e));

  let count = 0;
  for (let i = startRow; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    const exName = map.name >= 0 ? (row[map.name] || "").trim() : "";
    if (!exName) continue; // saltar filas sin nombre de ejercicio

    // ejercicio en biblioteca (crear si no existe)
    let ex = byName[exName.toLowerCase()];
    if (!ex) {
      ex = { id: uid(), name: exName, image: null, description: "" };
      state.exercises.push(ex);
      byName[exName.toLowerCase()] = ex;
    }
    if (conImagenes && !ex.image) {
      const img = findImageForRow(i + 1);
      if (img) ex.image = img;
    }

    day.items.push({
      id: uid(),
      exerciseId: ex.id,
      sets: map.sets >= 0 ? row[map.sets] || "" : "",
      reps: map.reps >= 0 ? row[map.reps] || "" : "",
      weight: map.weight >= 0 ? row[map.weight] || "" : "",
      rest: map.rest >= 0 ? row[map.rest] || "" : "",
      notes: map.notes >= 0 ? row[map.notes] || "" : "",
    });
    count++;
  }

  save();
  renderClientes();
  renderEjercicios();
  toast(`Importados ${count} ejercicios para ${client.name}`);
  $("#importResultado").innerHTML = `<div class="empty">✅ Importados ${count} ejercicios en «${escapeHtml(client.name)}» → ${escapeHtml(week.name)} / ${escapeHtml(day.name)}.<br>Revisa el resultado en la pestaña «Plan».</div>`;
  importData = null;
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
    const json = JSON.stringify(state, null, 2);
    XLS.downloadBlob(json, "copia_entrenamientos.json", "application/json");
    toast("Copia descargada");
  });
  $("#restoreInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
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
  if (!state.clients) state.clients = [];
  if (!state.exercises) state.exercises = [];
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
