const db = require('../db');

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT id, nombre, email, password_hash, rol FROM usuario WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

const findById = async (id) => {
  const result = await db.query(
    'SELECT id, nombre, email, rol FROM usuario WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  findByEmail,
  findById
};
