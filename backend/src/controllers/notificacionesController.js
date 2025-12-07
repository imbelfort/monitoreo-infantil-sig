const db = require("../db");
const webpush = require("../utils/push");

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
    console.log("🟩 subscription.endpoint:", subscription?.endpoint);

    const usuario = await db.query(
      "SELECT push_subscriptions FROM usuario WHERE id = $1",
      [userId]
    );
    console.log("📌 Suscripciones actuales en BD:", usuario.rows[0]);

    let subs = usuario.rows[0].push_subscriptions || [];

    const yaExiste = subs.find(x => x.endpoint === subscription.endpoint);
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
  try {
    console.log("\n===== 🟧 LLEGÓ PETICIÓN /notificacion-prueba =====");
    console.log("Body recibido:", req.body);

    const { userId, titulo, mensaje } = req.body;

    const usuario = await db.query(
      "SELECT push_subscriptions FROM usuario WHERE id = $1",
      [userId]
    );

    console.log("📌 Suscripciones del usuario:", usuario.rows[0]);
    const subs = usuario.rows[0].push_subscriptions || [];

    if (subs.length === 0) {
      console.log("⚠ No hay suscripciones guardadas");
      return res.json({ ok: false, msg: "No hay suscripciones." });
    }

    const payload = {
      title: titulo || "📢 Notificación",
      body: mensaje || "Mensaje desde el frontend",
      icon: "/icon.png"
    };
    console.log("📨 Enviando payload:", payload);

    for (const sub of subs) {
      console.log("🚀 Enviando a endpoint:", sub.endpoint);
      await webpush.sendNotification(sub, JSON.stringify(payload));
      console.log("✅ Notificación enviada a:", sub.endpoint);
    }

    res.json({ ok: true });

  } catch (err) {
    console.error("❌ Error enviando notificación:", err);
    res.status(500).json({ error: "Error enviando notificación" });
  }
};

exports.enviarNotificacionSalida = async (ninoId, ninoNombre, madreId) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error("❌ ERROR CRÍTICO: VAPID Keys no encontradas en variables de entorno!");
    } else {
      console.log("✅ VAPID Keys detectadas.");
    }

    const usuario = await db.query(
      "SELECT push_subscriptions FROM usuario WHERE id = $1",
      [madreId]
    );
    const subs = usuario.rows[0].push_subscriptions || [];

    if (subs.length === 0) return;

    const payload = {
      title: "🚨 Alerta de Seguridad",
      body: `${ninoNombre} ha salido del área segura.`,
      icon: "/icon.png"
    };

    console.log(`🔔 Enviando alerta salida para ${ninoNombre} a madre ${madreId}`);

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (e) {
        console.error("Error enviando push individual:", e.statusCode);
      }
    }
  } catch (error) {
    console.error("Error en enviarNotificacionSalida:", error);
  }
};
