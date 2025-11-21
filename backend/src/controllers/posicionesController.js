const posicionModel = require('../models/posicionModel');
const ninoModel = require('../models/ninoModel');

// Inserta una nueva posición y devuelve el estado dentro/fuera
const crearPosicion = async (req, res, next) => {
  try {
    const { nino_id, lat, lon } = req.body;
    if (!nino_id || typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({
        error: 'Se requieren nino_id, lat y lon numéricos.'
      });
    }

    const nino = await ninoModel.findById(nino_id);
    if (!nino) {
      return res.status(404).json({ error: 'Niño no encontrado.' });
    }

    const posicion = await posicionModel.insertPosition({ ninoId: nino_id, lon, lat });
    res.json(posicion);
  } catch (error) {
    next(error);
  }
};

// Devuelve la última o últimas posiciones registradas para un niño
const obtenerUltimas = async (req, res, next) => {
  try {
    const { ninoId } = req.params;
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 1, 1),
      50
    );
    const posiciones = await posicionModel.getLatestPositions(ninoId, limit);
    res.json({
      nino_id: Number(ninoId),
      total: posiciones.length,
      posiciones
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  crearPosicion,
  obtenerUltimas
};
