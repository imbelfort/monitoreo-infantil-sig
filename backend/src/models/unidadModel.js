const db = require('../db');

const getAllUnits = async () => {
  const result = await db.query(
    'SELECT id, nombre, direccion, ST_AsGeoJSON(geom) as geom FROM unidad_educativa ORDER BY id ASC'
  );
  return result.rows;
};

const createUnit = async (nombre, direccion, polygonGeoJSON) => {
  const result = await db.query(
    `INSERT INTO unidad_educativa (nombre, direccion, geom)
     VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
     RETURNING id, nombre, direccion`,
    [nombre, direccion, JSON.stringify(polygonGeoJSON)]
  );
  return result.rows[0];
};

const getUnitGeometry = async (id) => {
  const result = await db.query(
    `SELECT id, nombre, direccion, ST_AsGeoJSON(geom) AS geom
     FROM unidad_educativa
     WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

const deleteUnit = async (id) => {
  await db.query('DELETE FROM unidad_educativa WHERE id = $1', [id]);
};

module.exports = {
  getAllUnits,
  createUnit,
  getUnitGeometry,
  deleteUnit
};
