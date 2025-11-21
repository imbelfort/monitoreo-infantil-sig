const ninoModel = require('../models/ninoModel');
const unidadModel = require('../models/unidadModel');

// Crea un nuevo registro de niño a monitorear
const crearNino = async (req, res, next) => {
  try {
    const { nombre, apellidos, observaciones, unidad_id, madre_id } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del niño es obligatorio.' });
    }
    if (!madre_id) {
      return res.status(400).json({ error: 'Se requiere el identificador de la madre.' });
    }

    if (unidad_id) {
      const unidad = await unidadModel.getUnitGeometry(unidad_id);
      if (!unidad) {
        return res.status(404).json({ error: 'La unidad educativa indicada no existe.' });
      }
    }

    const nino = await ninoModel.createChild({
      nombre,
      apellidos,
      observaciones,
      unidadId: unidad_id || null,
      madreId: madre_id
    });
    res.status(201).json(nino);
  } catch (error) {
    next(error);
  }
};

// Asigna o actualiza la unidad educativa de un niño
const asignarUnidad = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { unidad_id } = req.body;
    if (!unidad_id) {
      return res.status(400).json({ error: 'unidad_id es obligatorio.' });
    }
    const unidad = await unidadModel.getUnitGeometry(unidad_id);
    if (!unidad) {
      return res.status(404).json({ error: 'La unidad educativa indicada no existe.' });
    }
    const actualizado = await ninoModel.assignUnit({ ninoId: id, unidadId: unidad_id });
    res.json(actualizado);
  } catch (error) {
    next(error);
  }
};

const obtenerNino = async (req, res, next) => {
  try {
    const { id } = req.params;
    const nino = await ninoModel.findById(id);
    if (!nino) {
      return res.status(404).json({ error: 'Niño no encontrado.' });
    }
    res.json(nino);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearNino,
  asignarUnidad,
  obtenerNino
};
