
// frontend/js/modules/alertas.js

let audioContext = null;
let isAlertActive = false;
let currentAlertChildId = null;

// Crear el elemento DOM del modal si no existe
function garantizarModal() {
    if (document.getElementById('modal-alerta-visual')) return;

    const div = document.createElement('div');
    div.id = 'modal-alerta-visual';
    div.className = 'alert-floating-container hidden';
    div.innerHTML = `
        <div class="alert-box">
            <div class="alert-icon-small">⚠️</div>
            <div style="flex:1;">
                <h3 class="alert-title-small">¡ALERTA DE SEGURIDAD!</h3>
                <p id="alert-message" class="alert-message-small">El niño ha salido del área segura.</p>
            </div>
            <button id="btn-silenciar" class="btn-alert-small">X</button>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById('btn-silenciar').addEventListener('click', ocultarAlerta);
}

// Reproducir sonido de alerta
function playAlertSound() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Oscilador simple (Beep-Beep)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.5); // A5

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
}

export function mostrarAlerta(nombreNino, ninoId) {
    if (isAlertActive && currentAlertChildId === ninoId) return; // Ya mostrada para este niño

    garantizarModal();
    const modal = document.getElementById('modal-alerta-visual');
    const msg = document.getElementById('alert-message');

    msg.textContent = `${nombreNino} ha salido del área segura.`;
    modal.classList.remove('hidden');

    isAlertActive = true;
    currentAlertChildId = ninoId;

    playAlertSound();

    // Repetir sonido cada 3 segundos si sigue abierta
    // (Opcional, por ahora solo un beep al abrir para no ser molesto)
}

export function ocultarAlerta() {
    const modal = document.getElementById('modal-alerta-visual');
    if (modal) {
        modal.classList.add('hidden');
    }
    isAlertActive = false;
    currentAlertChildId = null;
}
