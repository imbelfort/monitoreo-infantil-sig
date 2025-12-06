const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    }
    : {
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE
    }
);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
