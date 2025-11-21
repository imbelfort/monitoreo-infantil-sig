const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuarioModel');

// Inicia sesión verificando email y contraseña de madre o niño
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await usuarioModel.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValid = await bcrypt.compare(password, usuario.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login
};
