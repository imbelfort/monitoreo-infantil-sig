const db = require("../db");
const webpush = require("../utils/push");
const { Expo } = require('expo-server-sdk');

// Crear cliente Expo
const expo = new Expo();

exports.guardarSuscripcion = async (req, res) => {
  try {
    console.log("\n===== 🟦 LLEGÓ PETICIÓN /suscripcion-push =====");
    console.log("Body recibido:", req.body);

    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      console.log("❗Datos incompletos -  Faltan datos en la suscripción push.");
      return res.status(400).json({ error: "Faltan datos." });
    }
    console.log("🟩 userId:", userId);

    // Determinar tipo de suscripción para log
    const esExpo = typeof subscription === 'string';
    console.log(esExpo ? `🟩 Token Expo: ${subscription}` : `🟩 Web Push Endpoint: ${subscription.endpoint}`);

    const usuario = await db.query(
      "SELECT push_subscriptions FROM usuario WHERE id = $1",
      [userId]
    );
    console.log("📌 Suscripciones actuales en BD:", usuario.rows[0]);

    let subs = usuario.rows[0].push_subscriptions || [];

    // Verificar Existencia
    let yaExiste = false;
    if (esExpo) {
      // Si es string, buscamos si ya existe ese string
      yaExiste = subs.includes(subscription);
    } else {
      // Si es objeto, buscamos por endpoint
      yaExiste = subs.find(x => typeof x === 'object' && x.endpoint === subscription.endpoint);
    }

    console.log("🔍 Ya existía?", yaExiste ? "Sí" : "No");

    if (!yaExiste) {
      subs.push(subscription);
      console.log("📌 Nueva suscripción añadida");
    }

    await db.query(
      "UPDATE usuario SET push_subscriptions = $1 WHERE id = $2",
      [JSON.stringify(subs), userId]
    );
    console.log("💾 BD ACTUALIZADA CORRECTAMENTE")

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error guardando suscripción" });
  }
};

exports.enviarPrueba = async (req, res) => {
  // ... (Implementación similar si se desea probar, por ahora priorizamos Salida)
  res.json({ ok: true, msg: "No implementado para prueba manual mixta aun." })
};

exports.enviarNotificacionSalida = async (ninoId, ninoNombre, madreId) => {
  try {
    const usuario = await db.query(
      "SELECT push_subscriptions FROM usuario WHERE id = $1",
      [madreId]
    );
    const subs = usuario.rows[0].push_subscriptions || [];

    if (subs.length === 0) return;

    console.log(`🔔 Enviando alerta salida para ${ninoNombre} a madre ${madreId} (${subs.length} dispositivos)`);

    // Separar suscripciones
    const webSubs = subs.filter(s => typeof s === 'object' && s.endpoint);
    const expoTokens = subs.filter(s => typeof s === 'string' && Expo.isExpoPushToken(s));

    // 1. Enviar WEB PUSH
    if (webSubs.length > 0) {
      const payload = {
        title: "🚨 Alerta de Seguridad",
        body: `${ninoNombre} ha salido del área segura.`,
        icon: "/icon.png"
      };
      for (const sub of webSubs) {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload));
        } catch (e) {
          console.error("Error enviando Web Push:", e.statusCode);
        }
      }
    }

    // 2. Enviar EXPO PUSH (Móvil)
    if (expoTokens.length > 0) {
      let messages = [];
      for (let pushToken of expoTokens) {
        messages.push({
          to: pushToken,
          sound: 'default',
          title: '🚨 Alerta de Seguridad',
          body: `${ninoNombre} ha salido del área segura.`,
          data: { ninoId },
          priority: 'high',
          channelId: 'alerta-seguridad', // Android Channel (Configurar en App)
        });
      }

      let chunks = expo.chunkPushNotifications(messages);
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log("📱 Expo Push Ticket:", ticketChunk);
        } catch (error) {
          console.error("Error enviando Expo Push Chunk:", error);
        }
      }
    }

  } catch (error) {
    console.error("Error en enviarNotificacionSalida:", error);
  }
};
