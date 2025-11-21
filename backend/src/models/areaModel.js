const db = require('../db');

const getByChildId = async (ninoId) => {
  const result = await db.query(
    `SELECT id,
            nino_id AS "ninoId",
            madre_id AS "madreId",
            nombre,
            ST_AsGeoJSON(geom) AS geom,
            fecha_actualizacion AS "fechaActualizacion"
     FROM area_segura
     WHERE nino_id = $1`,
    [ninoId]
  );
  return result.rows[0];
};

const upsertArea = async ({ ninoId, madreId, nombre, geojson }) => {
  const result = await db.query(
    `INSERT INTO area_segura (nino_id, madre_id, nombre, geom)
     VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
     ON CONFLICT (nino_id)
     DO UPDATE SET nombre = EXCLUDED.nombre,
                   geom = EXCLUDED.geom,
                   fecha_actualizacion = NOW()
     RETURNING id,
               nino_id AS "ninoId",
               madre_id AS "madreId",
               nombre,
               ST_AsGeoJSON(geom) AS geom,
               fecha_actualizacion AS "fechaActualizacion"`,
    [ninoId, madreId, nombre || null, JSON.stringify(geojson)]
  );
  return result.rows[0];
};

const deleteArea = async (ninoId) => {
  await db.query('DELETE FROM area_segura WHERE nino_id = $1', [ninoId]);
};

module.exports = {
  getByChildId,
  upsertArea,
  deleteArea
};
