// ==================CONFIGURACIÓN=========================
// Usar ruta relativa para producción (Vercel) o localhost por defecto si falla
const API_BASE = '/api';

// const CHILD_ID = 1; // ELIMINADO: Ahora se obtiene dinámicamente al iniciar sesión
const DEFAULT_CENTER = { lat: -17.78305, lon: -63.18255 };
const VAPID_PUBLIC_KEY = "BJBWcyM9jEKZvKnIO3Nh3mUIQditqSCNiMSCVpfS-MJjL5Pm1Fk8dS1EzAXOU7fJMLV-jHKDStAArhDAWRkngmY"

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
const modalUnidad = document.getElementById('modal-nueva-unidad');
const closeModalUnidad = document.getElementById('close-modal-unidad');
const btnGuardarUnidad = document.getElementById('btn-guardar-unidad');
const btnNuevaUnidadMapa = document.getElementById('btn-nueva-unidad-mapa');
const listaNinosEl = document.getElementById('lista-ninos');

btnSimular.disabled = true;

const panels = {
  login: document.getElementById('login-panel'),
  usuario: document.getElementById('usuario-panel'),
  madre: document.getElementById('madre-panel'),
  map: document.getElementById('map-panel')
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarMapa();

  // Eventos Login
  btnLogin.addEventListener('click', iniciarSesion);
  btnLogout.addEventListener('click', cerrarSesion);

  // Eventos Madre
  btnDibujarArea.addEventListener('click', iniciarDibujoMadre);
  btnGuardarArea.addEventListener('click', guardarAreaMadre);
  btnEliminarArea.addEventListener('click', eliminarAreaMadre);

  // Eventos Rastreo/Simulacion
  btnSimular.addEventListener('click', toggleRastreo);

  // Eventos Vinculacion
  btnGenerarCodigo.addEventListener('click', generarCodigoNino);
  btnMostrarModalCodigo.addEventListener('click', () => {
    modalCodigo.classList.remove('hidden');
    if (currentChildId) generarCodigoNino();
  });
  closeModalCodigo.addEventListener('click', () => {
    modalCodigo.classList.add('hidden');
  });

  // Eventos Nuevo Niño
  if (btnMostrarModalNino) {
    btnMostrarModalNino.addEventListener('click', abrirModalNuevoNino);
    closeModalNino.addEventListener('click', () => {
      modalNino.classList.add('hidden');
    });
    btnGuardarNino.addEventListener('click', guardarNuevoNino);
  }

  // Eventos Nueva Unidad
  if (btnNuevaUnidadMapa) {
    btnNuevaUnidadMapa.addEventListener('click', iniciarDibujoUnidad);
    closeModalUnidad.addEventListener('click', () => modalUnidad.classList.add('hidden'));
    btnGuardarUnidad.addEventListener('click', guardarNuevaUnidad);
  }

  // Cerrar Modales click afuera
  window.addEventListener('click', (event) => {
    if (event.target == modalCodigo) modalCodigo.classList.add('hidden');
    if (event.target == modalNino) modalNino.classList.add('hidden');
    if (event.target == modalUnidad) modalUnidad.classList.add('hidden');
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
  if (!currentUser || currentUser.rol !== 'madre') return;

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

async function registrarPush(userId) {
  // Registrar service worker
  const registro = await navigator.serviceWorker.register("/service-worker.js");

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    console.log("Permiso de notificaciones denegado");
    return;
  }

  const subscription = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY // esta variable debe venir del backend
  });

  await fetch(`${API_BASE}/suscripcion-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription })
  });

  console.log("Suscripción guardada correctamente");
}

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

    registrarPush(currentUser.id);
    console.log("Push registrado para el usuario:", currentUser);

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
  drawPolygonTool = new L.Draw.Polygon(map, {
    shapeOptions: {
      color: '#8e44ad',
      weight: 2
    }
  });
  drawPolygonTool.enable();
  unidadActivaEl.textContent = 'Dibujando nueva área...';
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
  map.panTo([lat, lon]);

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
        <button class="btn-ver-mapa" data-id="${nino.id}">Ver en Mapa</button>
      </div>
    `;

    // Evento seleccionar
    const btn = div.querySelector('.btn-ver-mapa');
    btn.addEventListener('click', async () => {
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

async function guardarNuevaUnidad() {
  const nombre = document.getElementById('new-unidad-nombre').value.trim();
  const direccion = document.getElementById('new-unidad-direccion').value.trim();

  if (!nombre) return alert('El nombre es obligatorio.');
  if (!pendingAreaGeoJSON) return alert('No hay geometría dibujada.');

  try {
    const geometry = pendingAreaGeoJSON.geometry || pendingAreaGeoJSON;
    // Backend espera coordenadas closed ring [ [lon,lat]... ]
    let coords = geometry.coordinates[0];

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
