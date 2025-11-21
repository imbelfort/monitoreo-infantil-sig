require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
