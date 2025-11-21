const db = require('../db');

const insertPosition = async ({ ninoId, lon, lat }) => {
  const result = await db.query(
    'SELECT * FROM registrar_posicion($1, $2, $3)',
    [ninoId, lon, lat]
  );
  return result.rows[0];
};

const getLatestPositions = async (ninoId, limit) => {
  const result = await db.query(
    `SELECT
        id,
        nino_id,
        ST_Y(posicion::geometry) AS lat,
        ST_X(posicion::geometry) AS lon,
        estado,
        fecha_hora
     FROM posicion_nino
     WHERE nino_id = $1
     ORDER BY fecha_hora DESC
     LIMIT $2`,
    [ninoId, limit]
  );
  return result.rows;
};

module.exports = {
  insertPosition,
  getLatestPositions
};
