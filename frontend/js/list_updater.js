
async function actualizarEstadosLista() {
    if (!currentUser || !currentUser.ninos) return;

    for (const nino of currentUser.ninos) {
        try {
            // Usar limit=1 para obtener solo la última
            const resp = await fetch(`${API_BASE}/posiciones/ultimas/${nino.id}?limit=1`);
            const el = document.getElementById(`status-nino-${nino.id}`);

            if (!el) continue;

            if (!resp.ok) {
                el.textContent = "Error";
                el.style.color = "red";
                continue;
            }

            const data = await resp.json();
            if (!data.posiciones || data.posiciones.length === 0) {
                el.textContent = "Sin datos";
                el.style.color = "#95a5a6"; // Gris
                continue;
            }

            const ultima = data.posiciones[0];
            const esSeguro = ultima.estado === 'dentro';

            el.textContent = esSeguro ? "Seguro (Dentro)" : "ALERTA (Fuera)";
            el.style.color = esSeguro ? "#2ecc71" : "#e74c3c";

        } catch (e) {
            console.error("Error status lista:", e);
        }
    }
}
