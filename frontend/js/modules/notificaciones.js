
const VAPID_PUBLIC_KEY = "BJBWcyM9jEKZvKnIO3Nh3mUIQditqSCNiMSCVpfS-MJjL5Pm1Fk8dS1EzAXOU7fJMLV-jHKDStAArhDAWRkngmY";

export async function iniciarNotificaciones(userId, apiBase) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        return;
    }

    try {
        // Registrar service worker
        // Asumimos que service-worker.js está en la raíz o accesible publicamente
        const registro = await navigator.serviceWorker.register("/service-worker.js");
        console.log('Service Worker registrado');

        // Pedir permiso
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
            console.log("Permiso de notificaciones denegado");
            return;
        }

        // Suscribirse
        const subscription = await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: VAPID_PUBLIC_KEY
        });

        // Enviar suscripción al backend
        await fetch(`${apiBase}/suscripcion-push`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, subscription })
        });

        console.log("Suscripción Push guardada/actualizada correctamente para usuario", userId);

    } catch (error) {
        console.error("Error en iniciarNotificaciones:", error);
    }
}
