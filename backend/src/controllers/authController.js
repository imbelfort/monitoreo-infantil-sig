const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');

// Inicia sesión verificando email y contraseña de madre o niño
const login = async (req, res, next) => {
  try {
    console.log("LOGIN REQUEST:", req.body);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await usuarioModel.findByEmail(email);
    console.log("USUARIO ENCONTRADO:", usuario);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValid = await bcrypt.compare(password, usuario.password_hash);
    console.log("PASSWORD VALID:", isValid);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    let ninos = [];
    if (usuario.rol === 'madre') {
      try {
        ninos = await require('../models/ninoModel').findByMadreId(usuario.id);
        console.log("NIÑOS ENCONTRADOS:", ninos);
      } catch (err) {
        console.error("ERROR BUSCANDO NIÑOS:", err);
      }
    }

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      ninos: ninos
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    next(error);
  }
};

module.exports = {
  login,
  generarCodigoNino: async (req, res, next) => {
    try {
      const { ninoId } = req.body;
      // Generar código aleatorio de 6 caracteres (letras y numeros)
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Guardar en DB (asumiendo que existe el método en el modelo)
      await require('../models/ninoModel').guardarCodigo(ninoId, codigo);
      res.json({ codigo });
    } catch (error) { next(error); }
  },

  vincularDispositivo: async (req, res, next) => {
    try {
      const { codigo } = req.body;
      const nino = await require('../models/ninoModel').buscarPorCodigo(codigo);
      if (!nino) return res.status(404).json({ error: 'Código inválido' });

      // Retornar datos "como si fuera login" pero para el dispositivo
      res.json({
        id: nino.id,
        nombre: nino.nombre,
        rol: 'nino',
        vinculado: true
      });
    } catch (error) { next(error); }
  }
};
