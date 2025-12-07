const unidadModel = require('../models/unidadModel');

// Valida y cierra el anillo del pol�gono recibido desde el frontend
const ensureClosedRing = (coords) => {
  if (!Array.isArray(coords) || coords.length < 4) {
    throw new Error('El poligono requiere al menos 4 puntos');
  }
  const cleaned = coords.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error('Cada coordenada debe ser un arreglo [lon, lat]');
    }
    const [lon, lat] = pair.map(Number);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
      throw new Error('Las coordenadas deben ser num�ricas');
    }
    return [lon, lat];
  });
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    cleaned.push(first);
  }
  return cleaned;
};

// Lista b�sica de unidades sin geometr�a pesada
const listarUnidades = async (req, res, next) => {
  try {
    const unidades = await unidadModel.getAllUnits();
    res.json(unidades);
  } catch (error) {
    next(error);
  }
};

// Registra una nueva unidad educativa persistiendo el pol�gono recibido
const crearUnidad = async (req, res, next) => {
  try {
    console.log("BODY RECV:", req.body);
    const { nombre, direccion, coordenadas } = req.body;
    if (!nombre || !Array.isArray(coordenadas)) {
      return res.status(400).json({
        error: 'Se requieren nombre y coordenadas para crear la unidad.'
      });
    }
    // Asegurar que es array de arrays
    const coordsLimpias = coordenadas.map(c => {
      if (Array.isArray(c)) return c;
      // Si llega como objeto {lat, lng} de Leaflet direct
      if (c.lat && c.lng || c.lat && c.lon) return [c.lng || c.lon, c.lat];
      return c;
    });

    const ring = ensureClosedRing(coordsLimpias);
    const polygonGeoJSON = {
      type: 'Polygon',
      coordinates: [ring]
    };
    const unidad = await unidadModel.createUnit(nombre, direccion, polygonGeoJSON);
    res.status(201).json(unidad);
  } catch (error) {
    console.error("Error crearUnidad:", error);
    next(error);
  }
};

// Devuelve la geometr�a GeoJSON de una unidad espec�fica
const obtenerUnidadGeom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unidad = await unidadModel.getUnitGeometry(id);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad educativa no encontrada.' });
    }
    res.json(unidad);
  } catch (error) {
    next(error);
  }
};

// Elimina una unidad educativa
const eliminarUnidad = async (req, res, next) => {
  try {
    const { id } = req.params;
    await unidadModel.deleteUnit(id); // Asumimos que el modelo tendrá este método o usamos query directa aquí si es simple
    // Como no tenemos el método en el modelo aún, lo hacemos directo o lo agregamos al modelo.
    // Revisando unidadModel (no lo vi completo), mejor agregar query directa aquí por rapidez o invocar db.
    // PERO mejor mantener consistencia. Voy a asumir que debo agregarlo al modelo o hacerlo aquí con db.
    // Al no tener 'db' importado aqui (solo unidadModel), debo modificar unidadModel tambien.
    // Espera, unidadModel.js no fue leido recientemente completo.
    // Voy a agregarlo a unidadModel primero.
    res.json({ ok: true, message: 'Unidad eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listarUnidades,
  crearUnidad,
  obtenerUnidadGeom,
  eliminarUnidad
};
