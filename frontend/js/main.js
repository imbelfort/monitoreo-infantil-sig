import { iniciarNotificaciones } from './modules/notificaciones.js';

window.onerror = function (message, source, lineno, colno, error) {
  alert('Error JS Global: ' + message + ' \nLinea: ' + lineno);
};

// ==================CONFIGURACIÓN=========================
// Usar ruta relativa para producción (Vercel) o localhost por defecto si falla
const API_BASE = '/api';

// const CHILD_ID = 1; // ELIMINADO: Ahora se obtiene dinámicamente al iniciar sesión
const DEFAULT_CENTER = { lat: -17.78305, lon: -63.18255 };
// VAPID KEY MOVED TO MODULE

let map;
let drawnItems;
let areaLayer = null;
let unidadLayer = null;
let marcador;
let unidadesCache = [];
let currentUser = null;
let childData = null;
let madreMonitorInterval = null;
let pendingAreaGeoJSON = null;
let drawPolygonTool = null;
let currentChildId = null; // ID del niño seleccionado
let watchId = null; // Variable de rastreo
let isUserInteracting = false;

// Elementos UI
const loginEmail = document.getElementById('login-email');
const loginPass = document.getElementById('login-pass');
const estadoTexto = document.getElementById('estado-texto');
const unidadActivaEl = document.getElementById('unidad-activa');
const ninoActivoEl = document.getElementById('nino-activo');
const btnSimular = document.getElementById('btn-simular');
const btnDibujarArea = document.getElementById('btn-dibujar-area');
const btnGuardarArea = document.getElementById('btn-guardar-area');
const btnEliminarArea = document.getElementById('btn-eliminar-area');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const listaNinosEl = document.getElementById('lista-ninos');

// Elementos Modal Vinculacion
const btnGenerarCodigo = document.getElementById('btn-generar-codigo');
const btnMostrarModalCodigo = document.getElementById('btn-mostrar-modal-codigo');
const closeModalCodigo = document.getElementById('close-modal-codigo');
const modalCodigo = document.getElementById('modal-codigo');

// Elementos Modal Nuevo Niño
const modalNino = document.getElementById('modal-nuevo-nino');
const btnMostrarModalNino = document.getElementById('btn-mostrar-modal-nino');
const closeModalNino = document.getElementById('close-modal-nino');
const btnGuardarNino = document.getElementById('btn-guardar-nino');
const selectUnidadNino = document.getElementById('new-nino-unidad');

// Elementos Modal Nueva Unidad
// Elementos Modal Nueva Unidad
const modalUnidad = document.getElementById('modal-nueva-unidad');
const closeModalUnidad = document.getElementById('close-modal-unidad');
const btnGuardarUnidad = document.getElementById('btn-guardar-unidad');
const btnNuevaUnidad = document.getElementById('btn-nueva-unidad');
const btnGestionUnidades = document.getElementById('btn-gestion-unidades');
const modalGestionUnidades = document.getElementById('modal-gestion-unidades');
const closeModalGestion = document.getElementById('close-modal-gestion');

// DEBUG: Verificar elementos críticos
[
  { id: 'modal-nueva-unidad', el: modalUnidad },
  { id: 'close-modal-unidad', el: closeModalUnidad },
  { id: 'btn-guardar-unidad', el: btnGuardarUnidad },
  { id: 'btn-nueva-unidad', el: btnNuevaUnidad }
].forEach(check => {
  if (!check.el) console.error(`ERROR CRÍTICO: Elemento no encontrado: #${check.id}`);
});

const panels = {
  login: document.getElementById('login-panel'),
  usuario: document.getElementById('usuario-panel'),
  madre: document.getElementById('madre-panel'),
  map: document.getElementById('map-panel')
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarMapa();

  // Eventos Login
  if (btnLogin) btnLogin.addEventListener('click', iniciarSesion);
  if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

  // Eventos Madre
  if (btnDibujarArea) btnDibujarArea.addEventListener('click', iniciarDibujoMadre);
  if (btnGuardarArea) btnGuardarArea.addEventListener('click', guardarAreaMadre);
  if (btnEliminarArea) btnEliminarArea.addEventListener('click', eliminarAreaMadre);

  // Eventos Gestion Escolar
  if (btnNuevaUnidad) {
    btnNuevaUnidad.addEventListener('click', iniciarDibujoUnidad);
  }
  if (btnGestionUnidades) {
    btnGestionUnidades.addEventListener('click', abrirModalGestionUnidades);
  }
  if (closeModalGestion) {
    closeModalGestion.addEventListener('click', () => modalGestionUnidades.classList.add('hidden'));
  }

  // Eventos Rastreo/Simulacion
  if (btnSimular) {
    btnSimular.addEventListener('click', toggleRastreo);
  }

  // Eventos Vinculacion
  if (btnGenerarCodigo) btnGenerarCodigo.addEventListener('click', generarCodigoNino);
  if (btnMostrarModalCodigo) {
    btnMostrarModalCodigo.addEventListener('click', () => {
      modalCodigo.classList.remove('hidden');
      if (currentChildId) generarCodigoNino();
    });
  }
  if (closeModalCodigo) {
    closeModalCodigo.addEventListener('click', () => {
      modalCodigo.classList.add('hidden');
    });
  }

  // Eventos Nuevo Niño
  if (btnMostrarModalNino) {
    btnMostrarModalNino.addEventListener('click', abrirModalNuevoNino);
  }
  if (closeModalNino) {
    closeModalNino.addEventListener('click', () => {
      modalNino.classList.add('hidden');
    });
  }
  if (btnGuardarNino) {
    btnGuardarNino.addEventListener('click', guardarNuevoNino);
  }

  // Eventos Nueva Unidad (Modal guardado)
  // Eventos Nueva Unidad (Modal guardado)
  if (closeModalUnidad) {
    console.log("Asignando evento click a close-modal-unidad");
    closeModalUnidad.addEventListener('click', () => {
      console.log("Cerrando modal unidad");
      modalUnidad.classList.add('hidden');
    });
  } else {
    console.error("No se pudo asignar evento a close-modal-unidad porque es null");
  }
  if (btnGuardarUnidad) {
    console.log("Asignando evento click a btn-guardar-unidad");
    btnGuardarUnidad.addEventListener('click', (e) => {
      console.log("CLICK en btn-guardar-unidad");
      guardarNuevaUnidad(e);
    });
  } else {
    console.error("No se pudo asignar evento a btn-guardar-unidad porque es null");
  }

  // Cerrar Modales click afuera
  window.addEventListener('click', (event) => {
    if (modalCodigo && event.target == modalCodigo) modalCodigo.classList.add('hidden');
    if (modalNino && event.target == modalNino) modalNino.classList.add('hidden');
    if (modalUnidad && event.target == modalUnidad) modalUnidad.classList.add('hidden');
    if (modalGestionUnidades && event.target == modalGestionUnidades) modalGestionUnidades.classList.add('hidden');
  });

  cargarUnidades();
});

let drawingMode = 'area_segura'; // 'area_segura' | 'unidad_educativa'

function inicializarMapa() {
  map = L.map('map').setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], 17);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  // Detectar interacción del usuario para evitar saltos automáticos
  map.on('mousedown', () => { isUserInteracting = true; });
  map.on('mouseup', () => { isUserInteracting = false; });
  map.on('dragstart', () => { isUserInteracting = true; });
  map.on('dragend', () => { isUserInteracting = false; });
  map.on('draw:created', () => { isUserInteracting = false; });
  map.on('draw:drawstart', () => { isUserInteracting = true; });
  map.on('draw:drawstop', () => { isUserInteracting = false; });

  marcador = L.circleMarker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], {
    radius: 10,
    color: '#2ecc71',
    weight: 2,
    fillColor: '#2ecc71',
    fillOpacity: 0.8
  }).addTo(map);

  map.on(L.Draw.Event.CREATED, (event) => {
    if (!currentUser || currentUser.rol !== 'madre') return;

    // Limpiar dibujo previo si existe
    if (areaLayer && drawingMode === 'area_segura') {
      drawnItems.removeLayer(areaLayer);
    }
    // Si estamos creando unidad, limpiamos capa temporal anterior si hubiera
    // Pero aquí asumimos un dibujo fresco cada vez

    const layer = event.layer;
    drawnItems.addLayer(layer);
    pendingAreaGeoJSON = layer.toGeoJSON();

    if (drawingMode === 'area_segura') {
      areaLayer = layer;
      unidadActivaEl.textContent = 'Área segura (no guardada)';
    } else if (drawingMode === 'unidad_educativa') {
      // Al terminar de dibujar unidad, abrimos modal
      modalUnidad.classList.remove('hidden');
      // Temporalmente guardamos la capa para removerla si cancela
      areaLayer = layer;
    }
  });
}

function abrirModalNuevoNino() {
  console.log("Intentando abrir modal nuevo niño. Rol:", currentUser?.rol);
  if (!currentUser || currentUser.rol !== 'madre') {
    return alert("Debes iniciar sesión como Madre para registrar un niño.");
  }

  // Limpiar campos
  document.getElementById('new-nino-nombre').value = '';
  document.getElementById('new-nino-apellidos').value = '';
  document.getElementById('new-nino-obs').value = '';

  // Llenar select
  selectUnidadNino.innerHTML = '<option value="">Seleccione Unidad...</option>';
  unidadesCache.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.nombre;
    selectUnidadNino.appendChild(opt);
  });

  modalNino.classList.remove('hidden');
}

async function guardarNuevoNino() {
  const nombre = document.getElementById('new-nino-nombre').value.trim();
  const apellidos = document.getElementById('new-nino-apellidos').value.trim();
  const obs = document.getElementById('new-nino-obs').value.trim();
  const unidadId = selectUnidadNino.value;

  if (!nombre || !unidadId) {
    return alert('Nombre y Unidad Educativa son obligatorios.');
  }

  try {
    const resp = await fetch(`${API_BASE}/ninos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        apellidos,
        observaciones: obs,
        unidad_id: Number(unidadId),
        madre_id: currentUser.id
      })
    });

    if (!resp.ok) throw new Error('Error al registrar niño');
    const nuevoNino = await resp.json();

    // Actualizar UI
    modalNino.classList.add('hidden');
    currentChildId = nuevoNino.id;
    actualizarEstadoUI(`Niño "${nuevoNino.nombre}" registrado exitosamente.`, 'pendiente');

    // Agregar a la lista local y repintar
    if (currentUser) {
      if (!currentUser.ninos) currentUser.ninos = [];
      // Hack: obtener nombre unidad del select
      const nombreUnidad = selectUnidadNino.options[selectUnidadNino.selectedIndex].text;
      nuevoNino.nombre_unidad = nombreUnidad;
      currentUser.ninos.push(nuevoNino);
      renderListaNinos(currentUser.ninos);
    }

    // Recargar datos
    cargarDatosNino();

    // Sugerir vinculación
    setTimeout(() => {
      if (confirm('¿Deseas vincular el dispositivo de ' + nuevoNino.nombre + ' ahora?')) {
        modalCodigo.classList.remove('hidden');
        generarCodigoNino();
      }
    }, 500);

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// function registrarPush removed - logic moved to modules/notificaciones.js

async function cargarDatosNino() {
  if (!currentChildId) return;
  try {
    const resp = await fetch(`${API_BASE}/ninos/${currentChildId}`);
    if (!resp.ok) throw new Error('No se pudo obtener datos del niño');
    childData = await resp.json();

    let statusHtml = '';
    if (childData.codigo_vinculacion) {
      statusHtml = '<span style="color: green; font-size: 0.9em;">(Dispositivo Vinculado)</span>';
    } else {
      statusHtml = '<span style="color: #e67e22; font-size: 0.9em;">(Sin Dispositivo Vinculado)</span>';
    }

    ninoActivoEl.innerHTML = `<strong>${childData.nombre}</strong> ${statusHtml}`;
    await cargarAreaSegura();
  } catch (error) {
    console.error(error.message);
  }
}

async function cargarUnidades() {
  try {
    const resp = await fetch(`${API_BASE}/unidades`);
    if (!resp.ok) throw new Error('No se pudo obtener unidades');
    unidadesCache = await resp.json();
    unidadesCache.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (!areaLayer && unidadesCache.length) {
      await cargarUnidadEducativa(unidadesCache[0].id);
    }
  } catch (error) {
    console.error(error.message);
  }
}

async function cargarAreaSegura() {
  if (!currentChildId) return;
  try {
    const resp = await fetch(`${API_BASE}/ninos/${currentChildId}/area`);
    if (!resp.ok) throw new Error('Sin área personalizada');
    const data = await resp.json();
    if (data.geom) {
      const geojson = JSON.parse(data.geom);
      pendingAreaGeoJSON = geojson;
      dibujarAreaSegura(geojson);
      unidadActivaEl.textContent = data.nombre || 'Área segura personalizada';
      return;
    }
  } catch (error) {
    console.log('Área personalizada no encontrada, usando unidad base.');
  }
  const fallbackId = childData?.unidadId || unidadesCache[0]?.id;
  if (fallbackId) {
    await cargarUnidadEducativa(fallbackId);
  } else {
    unidadActivaEl.textContent = 'Sin área segura';
  }
}

async function iniciarSesion() {
  try {
    const email = loginEmail.value.trim();
    const password = loginPass.value.trim();
    if (!email || !password) {
      return actualizarEstadoUI('Ingresa email y contraseña.', 'pendiente');
    }
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'Credenciales inválidas.');
    }
    currentUser = data;

    iniciarNotificaciones(currentUser.id, API_BASE);
    console.log("Sistema de notificaciones inicializado para:", currentUser.email);

    loginEmail.value = '';
    loginPass.value = '';
    actualizarPaneles();

    // Lógica selección de niño
    if (currentUser.rol === 'madre') {
      if (data.ninos && data.ninos.length > 0) {
        currentChildId = data.ninos[0].id; // Por defecto el primero
        console.log("Niño seleccionado ID:", currentChildId);
        renderListaNinos(data.ninos);
        await cargarDatosNino(); // Cargar datos del niño seleccionado
        iniciarMonitoreoMadre();
        actualizarEstadoUI('Selecciona un niño de la lista.', 'pendiente');
      } else {
        renderListaNinos([]);
        actualizarEstadoUI('No tienes niños vinculados.', 'fuera');
      }
    } else {
      detenerMonitoreoMadre();
      actualizarEstadoUI('Conectado. Puedes reportar posiciones.', 'pendiente');
    }
  } catch (error) {
    actualizarEstadoUI(error.message, 'pendiente');
  }
}

function cerrarSesion() {
  currentUser = null;
  currentChildId = null;
  detenerMonitoreoMadre();
  actualizarPaneles();
  actualizarEstadoUI('Inicia sesión para comenzar.', 'pendiente');
}

function actualizarPaneles() {
  const isLogged = Boolean(currentUser);
  panels.login.classList.toggle('hidden', isLogged);
  panels.usuario.classList.toggle('hidden', !isLogged);
  panels.map.classList.toggle('hidden', !isLogged);
  panels.madre.classList.toggle('hidden', !isLogged || currentUser.rol !== 'madre');
  document.getElementById('usuario-rol').textContent = isLogged
    ? `${currentUser.rol === 'madre' ? 'Madre' : 'Niño'} conectado`
    : '';
  panels.usuario.querySelector('.usuario-detalle').textContent = isLogged ? currentUser.email : '';
  if (isLogged && currentUser.rol === 'nino') {
    btnSimular.disabled = false;
    btnSimular.textContent = "Iniciar Rastreo GPS";
  } else {
    btnSimular.disabled = true;
    btnSimular.textContent = "Simular nueva posición";
  }
  const soloMadre = !isLogged || currentUser.rol !== 'madre';
  [btnDibujarArea, btnGuardarArea, btnEliminarArea].forEach((btn) => {
    btn.classList.toggle('hidden', soloMadre);
  });
}

function iniciarDibujoMadre() {
  if (drawPolygonTool) {
    drawPolygonTool.disable();
  }
  drawingMode = 'area_segura'; // EXPLICITAMENTE
  drawPolygonTool = new L.Draw.Polygon(map, {
    shapeOptions: {
      color: '#8e44ad',
      weight: 2
    }
  });
  drawPolygonTool.enable();
  unidadActivaEl.textContent = 'Dibujando nueva área...';
  alert("Dibuja el perímetro del Área Segura Personal para tu niño.");
}

async function guardarAreaMadre() {
  if (!pendingAreaGeoJSON) {
    return actualizarEstadoUI('Primero dibuja un área en el mapa.', 'pendiente');
  }
  if (!currentUser || currentUser.rol !== 'madre') return;

  try {
    const payload = {
      madre_id: currentUser.id,
      nombre: 'Área definida por la madre',
      geom: pendingAreaGeoJSON.geometry || pendingAreaGeoJSON
    };
    const resp = await fetch(`${API_BASE}/ninos/${currentChildId}/area`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error('Error guardando área');
    }

    const data = await resp.json();
    unidadActivaEl.textContent = data.nombre || 'Área segura personalizada';
    actualizarEstadoUI('Área segura guardada correctamente.', 'dentro');
  } catch (error) {
    actualizarEstadoUI(error.message, 'pendiente');
  }
}

async function eliminarAreaMadre() {
  if (!currentUser || currentUser.rol !== 'madre') {
    return actualizarEstadoUI('Solo la madre puede eliminar el área.', 'pendiente');
  }
  try {
    await fetch(`${API_BASE}/ninos/${currentChildId}/area`, {
      method: 'DELETE'
    });
    if (areaLayer) {
      drawnItems.removeLayer(areaLayer);
      areaLayer = null;
    }
    pendingAreaGeoJSON = null;
    unidadActivaEl.textContent = 'Sin área segura';
    actualizarEstadoUI('Área segura eliminada.', 'pendiente');
    const fallbackId = childData?.unidadId || unidadesCache[0]?.id;
    if (fallbackId) {
      await cargarUnidadEducativa(fallbackId);
    }
  } catch (error) {
    actualizarEstadoUI(error.message, 'pendiente');
  }
}

async function cargarUnidadEducativa(id) {
  try {
    const resp = await fetch(`${API_BASE}/unidades/${id}/geom`);
    if (!resp.ok) {
      throw new Error('Geometría no disponible');
    }
    const data = await resp.json();
    const geojson = data.geom ? JSON.parse(data.geom) : null;
    if (!geojson) throw new Error('Respuesta sin geometría');
    dibujarUnidadBase(geojson);
    unidadActivaEl.textContent = data.nombre || getNombreUnidad(id);
  } catch (error) {
    console.warn('No se pudo cargar la geometría base:', error.message);
  }
}

function dibujarAreaSegura(geojson) {
  if (areaLayer) {
    drawnItems.removeLayer(areaLayer);
  }
  areaLayer = L.geoJSON(geojson, {
    style: {
      color: '#8e44ad',
      weight: 2,
      fillColor: '#8e44ad',
      fillOpacity: 0.15
    }
  });
  drawnItems.addLayer(areaLayer);
  map.fitBounds(areaLayer.getBounds(), { padding: [20, 20] });
}

function dibujarUnidadBase(geojson) {
  if (unidadLayer) {
    unidadLayer.remove();
  }
  unidadLayer = L.geoJSON(geojson, {
    style: {
      color: '#27ae60',
      weight: 2,
      fillColor: '#2ecc71',
      fillOpacity: 0.15
    }
  }).addTo(map);
  map.fitBounds(unidadLayer.getBounds(), { padding: [20, 20] });
}


async function toggleRastreo() {
  if (!currentUser || currentUser.rol !== 'nino') return;

  const btn = btnSimular;

  if (watchId !== null) {
    // DETENER RASTREO
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    btn.textContent = "Iniciar Rastreo GPS";
    btn.classList.remove('pulsando'); // Remover efecto visual si existe
    actualizarEstadoUI('Rastreo detenido.', 'pendiente');
  } else {
    // INICIAR RASTREO
    if (!('geolocation' in navigator)) {
      return alert('Tu dispositivo no soporta GPS.');
    }

    btn.textContent = "Detener Rastreo";
    btn.classList.add('pulsando'); // Efecto visual para indicar actividad
    actualizarEstadoUI('Buscando señal GPS...', 'pendiente');

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        enviarPosicionReal(latitude, longitude, accuracy);
      },
      (error) => {
        console.error("Error GPS:", error);
        actualizarEstadoUI('Error obteniendo ubicación: ' + error.message, 'fuera');
      },
      {
        enableHighAccuracy: true, // Usar GPS real
        maximumAge: 0,
        timeout: 10000
      }
    );
  }
}

async function enviarPosicionReal(lat, lon, accuracy) {
  try {
    // Mostrar en mapa localmente
    moverMarcador(lat, lon, 'pendiente', new Date().toISOString());

    // Enviar al Backend
    const resp = await fetch(`${API_BASE}/posiciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nino_id: currentUser.id, // Si es el niño quien reporta, usa su propio ID.
        lat: lat,
        lon: lon,
        precision: accuracy
      })
    });

    if (!resp.ok) throw new Error('Error enviando posición');

    const data = await resp.json();
    // Actualizar color/estado basado en la respuesta del servidor (dentro/fuera)
    moverMarcador(data.lat, data.lon, data.estado, data.fecha_hora);
    actualizarEstadoUI(data.mensaje, data.estado, data.fecha_hora);

  } catch (error) {
    console.error(error);
  }
}

function getNombreUnidad(id) {
  const unidad = unidadesCache.find((u) => u.id === Number(id));
  return unidad ? unidad.nombre : 'Sin asignar';
}

function iniciarMonitoreoMadre() {
  detenerMonitoreoMadre();
  consultarUltimaPosicion();
  madreMonitorInterval = setInterval(consultarUltimaPosicion, 5000);
}

function detenerMonitoreoMadre() {
  if (madreMonitorInterval) {
    clearInterval(madreMonitorInterval);
    madreMonitorInterval = null;
  }
}

async function consultarUltimaPosicion() {
  if (!currentChildId) return;
  try {
    const resp = await fetch(`${API_BASE}/posiciones/ultimas/${currentChildId}?limit=1`);
    if (!resp.ok) throw new Error('No se pudo obtener la última posición.');
    const data = await resp.json();
    if (data.total === 0) {
      actualizarEstadoUI('Aún no hay posiciones registradas.', 'pendiente');
      return;
    }
    const ultima = data.posiciones[0];
    const estado = ultima.estado;
    const mensaje = estado === 'dentro'
      ? 'El niño está dentro del área segura.'
      : 'ALERTA: El niño está fuera del área segura.';
    actualizarEstadoUI(mensaje, estado, ultima.fecha_hora);
    if (typeof ultima.lat === 'number' && typeof ultima.lon === 'number') {
      moverMarcador(ultima.lat, ultima.lon, estado, ultima.fecha_hora);
    }
  } catch (error) {
    console.warn(error.message);
  }
}

async function generarCodigoNino() {
  if (!currentUser || currentUser.rol !== 'madre') return;

  const btn = document.getElementById('btn-generar-codigo');
  const display = document.getElementById('codigo-display');
  btn.disabled = true;
  display.textContent = 'Generando...';

  try {
    const resp = await fetch(`${API_BASE}/ninos/generar-codigo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninoId: currentChildId })
    });

    if (!resp.ok) {
      throw new Error('Error al generar código');
    }

    const data = await resp.json();
    display.textContent = data.codigo;
    actualizarEstadoUI('Código generado. Úsalo en el celular del niño.', 'pendiente');

    // Actualizar lista
    if (currentUser && currentUser.ninos) {
      const nino = currentUser.ninos.find(n => n.id === currentChildId);
      if (nino) nino.codigo_vinculacion = data.codigo;
      renderListaNinos(currentUser.ninos);
    }

    cargarDatosNino(); // Actualizar detalle activo
  } catch (error) {
    console.error(error);
    display.textContent = 'ERROR';
    actualizarEstadoUI('No se pudo generar el código.', 'fuera');
    display.style.fontSize = "1rem";
    display.textContent = 'ERR: ' + error.message;
  } finally {
    btn.disabled = false;
  }
}

function actualizarEstadoUI(mensaje, estado, fecha) {
  const estadoTexto = document.getElementById('estado-texto');
  if (!estadoTexto) return;

  estadoTexto.textContent = mensaje;
  estadoTexto.className = 'estado'; // reset

  if (estado) {
    estadoTexto.classList.add(`estado-${estado}`);
  }
}

function moverMarcador(lat, lon, estado, fecha) {
  if (!marcador) return;

  // Actualizar posición
  marcador.setLatLng([lat, lon]);

  // Centrar mapa si es necesario (opcional) 
  // Solo si NO está interactuando y NO está dibujando
  if (!isUserInteracting && (!drawPolygonTool || !drawPolygonTool._enabled)) {
    map.panTo([lat, lon]);
  }

  // Actualizar color según estado
  let color = '#3498db'; // Azul (pendiente)
  if (estado === 'dentro') color = '#2ecc71'; // Verde
  if (estado === 'fuera') color = '#e74c3c'; // Rojo

  marcador.setStyle({
    color: color,
    fillColor: color
  });

  // Configurar Popup
  let nombre = 'Niño';
  if (childData && childData.nombre) {
    nombre = childData.nombre;
  } else if (currentUser && currentUser.nombre) {
    nombre = currentUser.nombre;
  }

  const tiempo = fecha ? new Date(fecha).toLocaleString() : 'Reciente';

  const popupContent = `
    <div style="text-align: center;">
      <strong>${nombre}</strong><br>
      <span style="font-size: 0.85em; color: #555;">${tiempo}</span>
    </div>
  `;

  if (marcador.getPopup()) {
    marcador.setPopupContent(popupContent);
  } else {
    marcador.bindPopup(popupContent);
  }
}

// ==========================================
// FUNCIONES NUEVAS PARA GESTION ESCOLAR
// ==========================================

function renderListaNinos(ninos) {
  if (!listaNinosEl) return;
  listaNinosEl.innerHTML = '';

  if (!ninos || ninos.length === 0) {
    listaNinosEl.innerHTML = '<p class="nota">No tienes niños registrados.</p>';
    return;
  }

  ninos.forEach(nino => {
    const div = document.createElement('div');
    div.className = 'nino-card';
    if (currentChildId === nino.id) {
      div.classList.add('activo');
    }

    const linkedStatus = nino.codigo_vinculacion
      ? '<span style="color: green; font-weight: bold;">✓ Vinculado</span>'
      : '<span style="color: #e67e22;">⚠ Sin App</span>';

    div.innerHTML = `
      <div style="flex: 1;">
        <strong>${nino.nombre} ${nino.apellidos || ''}</strong><br>
        <small>${nino.nombre_unidad || 'Sin escuela'}</small><br>
        <small>Código: <code>${nino.codigo_vinculacion || '---'}</code></small>
      </div>
      <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
        <small>${linkedStatus}</small>
        <div style="display: flex; gap: 5px;">
            <button class="btn-vincular secundario" style="padding: 5px 10px; font-size: 0.8em;" data-id="${nino.id}">Vincular</button>
            <button class="btn-ver-mapa" data-id="${nino.id}">Ver en Mapa</button>
        </div>
      </div>
    `;

    // Evento Vincular
    const btnVincular = div.querySelector('.btn-vincular');
    btnVincular.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar seleccionar al niño en el mapa si no se quiere
      currentChildId = nino.id;
      modalCodigo.classList.remove('hidden');
      generarCodigoNino();
    });

    // Evento seleccionar
    const btnVer = div.querySelector('.btn-ver-mapa');
    btnVer.addEventListener('click', async () => {
      currentChildId = nino.id;
      console.log("Cambio de niño activo:", currentChildId);

      // Actualizar UI visualmente
      document.querySelectorAll('.nino-card').forEach(c => c.classList.remove('activo'));
      div.classList.add('activo');

      await cargarDatosNino();
      iniciarMonitoreoMadre();
    });

    listaNinosEl.appendChild(div);
  });
}

function iniciarDibujoUnidad(e) {
  if (e) e.preventDefault();
  if (drawPolygonTool) {
    drawPolygonTool.disable();
  }
  drawingMode = 'unidad_educativa';
  drawPolygonTool = new L.Draw.Polygon(map, {
    shapeOptions: {
      color: '#2980b9',
      weight: 2
    }
  });
  drawPolygonTool.enable();
  alert('Dibuja el perímetro de la escuela en el mapa.');
}

async function guardarNuevaUnidad(e) {
  if (e) e.preventDefault();
  console.log("Ejecutando guardarNuevaUnidad...");
  const nombre = document.getElementById('new-unidad-nombre').value.trim();
  const direccion = document.getElementById('new-unidad-direccion').value.trim();

  if (!nombre) return alert('El nombre es obligatorio.');
  if (!pendingAreaGeoJSON) {
    console.error("No hay geometría pendiente (pendingAreaGeoJSON es null)");
    return alert('Error: No has dibujado el área en el mapa.');
  }

  try {
    const geometry = pendingAreaGeoJSON.geometry || pendingAreaGeoJSON;
    console.log("Geometría detectada:", geometry);

    // Backend espera coordenadas closed ring [ [lon,lat]... ]
    if (!geometry.coordinates || geometry.coordinates.length === 0) {
      throw new Error("Geometría vacía o inválida");
    }
    let coords = geometry.coordinates[0];

    // Debug payload
    console.log("Enviando coordenadas unidad:", coords);

    const resp = await fetch(`${API_BASE}/unidades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        direccion,
        coordenadas: coords
      })
    });

    if (!resp.ok) throw new Error('Error al guardar unidad');

    const nuevaUnidad = await resp.json();
    alert(`Unidad "${nuevaUnidad.nombre}" creada.`);

    // Limpiar UI
    modalUnidad.classList.add('hidden');
    if (areaLayer) drawnItems.removeLayer(areaLayer);
    areaLayer = null;
    document.getElementById('new-unidad-nombre').value = '';
    document.getElementById('new-unidad-direccion').value = '';

    // Recargar select
    await cargarUnidades();

    // Seleccionar la nueva en el select
    selectUnidadNino.value = nuevaUnidad.id;

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

// ==========================================
// FUNCIONES GESTION UNIDADES
// ==========================================

async function abrirModalGestionUnidades() {
  modalGestionUnidades.classList.remove('hidden');
  const lista = document.getElementById('lista-unidades-gestion');
  lista.innerHTML = 'Cargando...';

  await cargarUnidades(); // Refrescar cache

  if (unidadesCache.length === 0) {
    lista.innerHTML = '<p>No hay unidades registradas.</p>';
    return;
  }

  lista.innerHTML = '';
  unidadesCache.forEach(u => {
    const item = document.createElement('div');
    item.style.borderBottom = '1px solid #eee';
    item.style.padding = '8px';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';

    item.innerHTML = `
            <span>${u.nombre}</span>
            <button class="peligro btn-sm" data-id="${u.id}" style="padding: 2px 8px; font-size: 0.8em;">Eliminar</button>
        `;

    item.querySelector('button').addEventListener('click', () => eliminarUnidadBackend(u.id, u.nombre));
    lista.appendChild(item);
  });
}

async function eliminarUnidadBackend(id, nombre) {
  if (!confirm(`¿Estás seguro de eliminar la unidad "${nombre}"?\nLos niños asociados quedarán sin unidad asignada.`)) {
    return;
  }

  try {
    const resp = await fetch(`${API_BASE}/unidades/${id}`, {
      method: 'DELETE'
    });

    if (!resp.ok) throw new Error('Error al eliminar unidad');

    alert('Unidad eliminada correctamente.');
    abrirModalGestionUnidades(); // Recargar lista modal
    cargarUnidades(); // Recargar cache global

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
