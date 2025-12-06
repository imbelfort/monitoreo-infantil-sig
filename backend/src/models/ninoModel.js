const db = require('../db');

const createChild = async ({
  nombre,
  apellidos,
  observaciones,
  unidadId,
  madreId
}) => {
  const result = await db.query(
    `INSERT INTO nino (nombre, apellidos, observaciones, unidad_id, madre_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nombre, apellidos, observaciones, unidad_id AS "unidadId", madre_id AS "madreId"`,
    [nombre, apellidos, observaciones, unidadId, madreId]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    `SELECT
        n.id,
        n.nombre,
        n.apellidos,
        n.unidad_id AS "unidadId",
        n.madre_id AS "madreId",
        u.email AS "madreEmail",
        u.nombre AS "madreNombre"
     FROM nino n
     LEFT JOIN usuario u ON u.id = n.madre_id
     WHERE n.id = $1`,
    [id]
  );
  return result.rows[0];
};

const assignUnit = async ({ ninoId, unidadId }) => {
  const result = await db.query(
    `UPDATE nino
     SET unidad_id = $2
     WHERE id = $1
     RETURNING id, nombre, unidad_id AS "unidadId"`,
    [ninoId, unidadId]
  );
  return result.rows[0];
};

module.exports = {
  createChild,
  findById,
  assignUnit,
  guardarCodigo: async (id, codigo) => {
    return db.query('UPDATE nino SET codigo_vinculacion = $2 WHERE id = $1', [id, codigo]);
  },
  buscarPorCodigo: async (codigo) => {
    const res = await db.query('SELECT * FROM nino WHERE codigo_vinculacion = $1', [codigo]);
    return res.rows[0];
  },
  findByMadreId: async (madreId) => {
    const res = await db.query('SELECT * FROM nino WHERE madre_id = $1', [madreId]);
    return res.rows;
  }
};
