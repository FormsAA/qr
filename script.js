document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: Paste your new Web App URL from Google Apps Script here !!!
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAeB-VRZOhkxe3k20Uz78-wQHZs9tYa4sb_yFB_A6He9iYGxz6xTEjr-vZjfJErg_T/exec";

    const screens = {
        initial: document.getElementById('initial-screen'),
        register: document.getElementById('register-screen'),
        login: document.getElementById('login-screen'),
        game: document.getElementById('game-screen'),
        scanner: document.getElementById('scanner-screen') // Nueva pantalla
    };

    const buttons = {
        showLogin: document.getElementById('show-login-btn'),
        showRegister: document.getElementById('show-register-btn'),
        back: document.querySelectorAll('.back-btn'),
        scanQR: document.getElementById('scan-qr-btn'),
        logout: document.getElementById('logout-btn'),
        cancelScan: document.getElementById('cancel-scan-btn') // Nuevo botón
    };

    const forms = {
        register: document.getElementById('register-form'),
        login: document.getElementById('login-form'),
    };
    
    const userInfo = {
        email: document.getElementById('user-email'),
        points: document.getElementById('user-points'),
        position: document.getElementById('user-position'),
    };

    const messageContainer = document.getElementById('message-container');
    let html5QrCode;

    function showScreen(screenName) {
        // Oculta el contenedor principal si se muestra el escáner
        document.getElementById('app-container').style.display = screenName === 'scanner' ? 'none' : 'flex';
        
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
        messageContainer.textContent = ''; // Limpia mensajes al cambiar de pantalla
    }

    function showMessage(message, isError = true) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? '#D8000C' : '#4F8A10'; // Rojo para error, Verde para éxito
        setTimeout(() => messageContainer.textContent = '', 4000);
    }

    async function apiPost(action, data) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action, ...data })
            });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            showMessage("Ocurrió un error de red. Intenta de nuevo.");
            return { success: false, message: "Ocurrió un error de red." };
        }
    }

    // --- Lógica de Navegación y Formularios (sin cambios) ---
    buttons.showLogin.addEventListener('click', () => showScreen('login'));
    buttons.showRegister.addEventListener('click', () => showScreen('register'));
    buttons.back.forEach(btn => btn.addEventListener('click', () => showScreen('initial')));

    buttons.logout.addEventListener('click', () => {
        localStorage.removeItem('userEmail');
        showScreen('initial');
        document.getElementById('login-email').value = '';
        document.getElementById('register-email').value = '';
    });

    forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        if (!email) { showMessage("Por favor, ingresa un correo."); return; }
        const result = await apiPost('register', { email });
        if (result.success) {
            showMessage(result.message, false);
            showScreen('login');
        } else {
            showMessage(result.message || "Falló el registro.");
        }
    });

    forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        if (!email) { showMessage("Por favor, ingresa un correo."); return; }
        const result = await apiPost('login', { email });
        if (result.success) {
            localStorage.setItem('userEmail', result.user.email);
            updateUserInfo(result.user);
            showScreen('game');
        } else {
            showMessage(result.message || "Falló el inicio de sesión.");
        }
    });

    function updateUserInfo(user) {
        if (user) {
            userInfo.email.textContent = user.email;
            userInfo.points.textContent = user.points;
            userInfo.position.textContent = user.position;
        }
    }
    
    // --- LÓGICA DEL ESCÁNER DE QR (ACTUALIZADA) ---

    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log("QR Scanner stopped.");
            }).catch(err => {
                console.error("Failed to stop QR scanner.", err);
            });
        }
    }

    buttons.scanQR.addEventListener('click', () => {
        showScreen('scanner');
        html5QrCode = new Html5Qrcode("qr-reader-full");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            stopScanner();
            showScreen('game');
            handleQRScan(decodedText);
        };
        
        const config = { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.7); // Usa el 70% del lado más corto
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                showMessage("No se pudo iniciar el escáner. Revisa los permisos de la cámara.");
                showScreen('game');
            });
    });

    buttons.cancelScan.addEventListener('click', () => {
        stopScanner();
        showScreen('game');
    });

    async function handleQRScan(qrData) {
        const scannerEmail = localStorage.getItem('userEmail');
        if (!scannerEmail) {
            showMessage("Debes iniciar sesión para escanear.");
            return;
        }

        const result = await apiPost('scanQR', { email: scannerEmail, qrData: qrData });
        
        if (result.success) {
            showMessage(result.message, false);
            updateUserInfo(result.user);
        } else {
            showMessage(result.message || "No se pudo procesar el QR.");
        }
    }
    
    // --- Carga Inicial de la Página (sin cambios) ---
    async function checkLoggedInUser() {
        const loggedInUser = localStorage.getItem('userEmail');
        if (loggedInUser) {
            try {
                const url = `${SCRIPT_URL}?action=getUserData&email=${encodeURIComponent(loggedInUser)}`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.success) {
                    updateUserInfo(result.user);
                    showScreen('game');
                } else {
                    localStorage.removeItem('userEmail');
                    showScreen('initial');
                }
            } catch (error) {
                console.error("Error checking logged in user:", error);
                showScreen('initial');
            }
        } else {
            showScreen('initial');
        }
    }
    
    checkLoggedInUser();
});
