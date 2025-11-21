const areaModel = require('../models/areaModel');
const ninoModel = require('../models/ninoModel');

// Returns the safe area stored for a child if any
const obtenerArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await areaModel.getByChildId(id);
    if (!area) {
      return res.status(404).json({ error: 'No existe un área segura registrada para este niño.' });
    }
    res.json(area);
  } catch (error) {
    next(error);
  }
};

// Creates or updates the safe area drawn by the mother
const guardarArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { madre_id, nombre, geom } = req.body;
    if (!madre_id) {
      return res.status(400).json({ error: 'madre_id es obligatorio.' });
    }
    if (!geom) {
      return res.status(400).json({ error: 'Se requiere el GeoJSON del polígono.' });
    }

    const nino = await ninoModel.findById(id);
    if (!nino) {
      return res.status(404).json({ error: 'Niño no encontrado.' });
    }

    const area = await areaModel.upsertArea({
      ninoId: id,
      madreId: madre_id,
      nombre,
      geojson: geom
    });
    res.json(area);
  } catch (error) {
    next(error);
  }
};

const eliminarArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    await areaModel.deleteArea(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  obtenerArea,
  guardarArea,
  eliminarArea
};
