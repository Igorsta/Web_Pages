"use strict";
// static/main/ts/src/sseNotifications.ts
class SSENotifications {
    constructor(endpointUrl = '/board/events/') {
        this.eventSource = null;
        this.toastContainer = null;
        this.sseEndpointUrl = endpointUrl;
        this.toastContainer = document.getElementById('toast-container');
        // Inicjuj tylko jeśli kontener istnieje
        if (this.toastContainer) {
            this.connect();
        }
        else {
            console.warn("Toast container not found. SSE Notifications will not be displayed visually.");
            // Mimo to można próbować się połączyć, jeśli powiadomienia mają inne efekty
            // this.connect(); 
        }
    }
    connect() {
        if (this.eventSource && (this.eventSource.readyState === EventSource.OPEN || this.eventSource.readyState === EventSource.CONNECTING)) {
            console.log("SSE connection already open or connecting.");
            return;
        }
        console.log(`Attempting to connect to SSE endpoint: ${this.sseEndpointUrl}`);
        this.eventSource = new EventSource(this.sseEndpointUrl);
        this.eventSource.onopen = (event) => {
            console.log("SSE Connection opened.", event);
            // Możesz tu wyświetlić powiadomienie o połączeniu, jeśli chcesz
            // this.showToast("Connected to real-time notifications.", "info");
        };
        this.eventSource.onerror = (error) => {
            console.error("SSE Error:", error);
            // Możesz spróbować zamknąć i ponownie otworzyć połączenie po jakimś czasie,
            // EventSource domyślnie próbuje się połączyć ponownie.
            if (this.eventSource) {
                this.showToast("Notification service error. Reconnecting...", "error", 10000);
                // Domyślne ponowne połączenie EventSource powinno zadziałać.
                // Jeśli readyState to EventSource.CLOSED, można by spróbować this.eventSource.close(); a potem this.connect();
            }
        };
        // Listener dla konkretnego zdarzenia "newBoard"
        this.eventSource.addEventListener('newBoard', (event) => {
            console.log("SSE newBoard event received:", event);
            try {
                const data = JSON.parse(event.data);
                const message = `User '${data.creator_username}' created a new board: "${data.board_name}".`;
                // Opcjonalnie: link do planszy
                const link = `/board/${data.board_id}/edit/`; // Dostosuj URL, jeśli jest inny
                this.showToast(message, "success", 7000, link);
            }
            catch (e) {
                console.error("Error parsing newBoard data:", e);
            }
        });
        // Listener dla konkretnego zdarzenia "newPath"
        this.eventSource.addEventListener('newPath', (event) => {
            console.log("SSE newPath event received:", event);
            try {
                const data = JSON.parse(event.data);
                let messageBase = `User '${data.user_username}' `;
                if (data.action === "created") {
                    messageBase += `uploaded a new path background: "${data.board_name}".`;
                }
                else if (data.action === "updated") {
                    messageBase += `updated paths on board: "${data.board_name}".`;
                }
                else if (data.action === "point_added") {
                    messageBase += `added a point to a path on board: "${data.board_name}".`;
                }
                else {
                    messageBase += `saved a path on board: "${data.board_name}".`;
                }
                // Opcjonalnie: link do planszy (UserImage)
                // Zakładając, że `home.html` przyjmuje `?selected=IMAGE_NAME`
                const link = `/?selected=${encodeURIComponent(data.board_name)}`; // Dostosuj URL
                this.showToast(messageBase, "info", 7000, link);
            }
            catch (e) {
                console.error("Error parsing newPath data:", e);
            }
        });
        // Ogólny listener onmessage (opcjonalnie, jeśli chcesz przechwytywać zdarzenia bez określonego typu 'event:')
        // lub komentarze keep-alive (choć zwykle są ignorowane przez EventSource).
        this.eventSource.onmessage = (event) => {
            // Komentarze keep-alive (zaczynające się od ':') nie powinny tu trafiać.
            // Jeśli serwer wysyła zdarzenia bez linii "event: name", trafią one tutaj.
            console.log("SSE Generic message received:", event.data);
        };
    }
    showToast(message, type = 'info', duration = 5000, link) {
        if (!this.toastContainer)
            return;
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        let content = message;
        if (link) {
            content = `<a href="${link}" style="color: white; text-decoration: underline;">${message}</a>`;
        }
        toast.innerHTML = content; // Użyj innerHTML, jeśli masz link
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                var _a;
                if (toast.parentNode === this.toastContainer) { // Sprawdź, czy wciąż jest dzieckiem
                    (_a = this.toastContainer) === null || _a === void 0 ? void 0 : _a.removeChild(toast);
                }
            }, 500); // Czas na animację wyjścia
        };
        toast.appendChild(closeBtn);
        this.toastContainer.appendChild(toast);
        // Wymuś reflow, aby animacja zadziałała przy dodaniu klasy 'show'
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                var _a;
                // Sprawdź, czy element wciąż istnieje i jest dzieckiem kontenera przed usunięciem
                if (toast.parentNode === this.toastContainer) {
                    (_a = this.toastContainer) === null || _a === void 0 ? void 0 : _a.removeChild(toast);
                }
            }, 500); // Czas na animację wyjścia
        }, duration);
    }
    closeConnection() {
        if (this.eventSource) {
            this.eventSource.close();
            console.log("SSE Connection closed by client.");
        }
    }
}
// Inicjalizacja po załadowaniu DOM
// Możesz zdecydować, czy chcesz to inicjować na każdej stronie,
// czy tylko na wybranych (np. sprawdzając istnienie pewnego elementu).
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź, czy użytkownik jest zalogowany, zanim nawiążesz połączenie SSE,
    // jeśli endpoint SSE wymaga autoryzacji lub jeśli powiadomienia są tylko dla zalogowanych.
    // Możesz to zrobić sprawdzając obecność np. elementu z nazwą użytkownika
    // lub przekazując flagę z Django do szablonu.
    // Prosty przykład: inicjuj zawsze, jeśli jest kontener na toasty
    if (document.getElementById('toast-container')) {
        console.log("Initializing SSE Notifications client...");
        const sseClient = new SSENotifications('/board/events/'); // UŻYJ POPRAWNEGO URL ENDPOINTU SSE
        // Aby móc zamknąć połączenie np. przy wylogowaniu:
        // window.sseClient = sseClient; 
    }
});
//# sourceMappingURL=sseNotifications.js.map