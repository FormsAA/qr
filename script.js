document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANTE: Pega aquí la URL de tu nueva Web App de Google Apps Script !!!
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAeB-VRZOhkxe3k20Uz78-wQHZs9tYa4sb_yFB_A6He9iYGxz6xTEjr-vZjfJErg_T/exec";

    const screens = {
        initial: document.getElementById('initial-screen'),
        register: document.getElementById('register-screen'),
        login: document.getElementById('login-screen'),
        game: document.getElementById('game-screen'),
        scanner: document.getElementById('scanner-screen'),
        scanChoice: document.getElementById('scan-choice-screen') // Nueva pantalla de selección
    };

    const buttons = {
        showLogin: document.getElementById('show-login-btn'),
        showRegister: document.getElementById('show-register-btn'),
        back: document.querySelectorAll('.back-btn'),
        scanQR: document.getElementById('scan-qr-btn'),
        logout: document.getElementById('logout-btn'),
        cancelScan: document.getElementById('cancel-scan-btn'),
        openCamera: document.getElementById('open-camera-btn'), // Nuevo
        uploadImage: document.getElementById('upload-image-btn'), // Nuevo
        cancelChoice: document.getElementById('cancel-choice-btn') // Nuevo
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
    const qrImageInput = document.getElementById('qr-image-input');
    let html5QrCode;

    function showScreen(screenName) {
        document.getElementById('app-container').style.display = (screenName === 'scanner') ? 'none' : 'flex';
        
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
        messageContainer.textContent = '';
    }

    function showMessage(message, isError = true) {
        // Muestra el mensaje en la pantalla de juego si no estamos en una pantalla de overlay
        const currentScreen = document.querySelector('.screen.active').id;
        const targetMessageContainer = (currentScreen === 'game-screen') ? messageContainer : document.getElementById('message-container');

        targetMessageContainer.textContent = message;
        targetMessageContainer.style.color = isError ? '#D8000C' : '#4F8A10';
        setTimeout(() => targetMessageContainer.textContent = '', 4000);
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

    // --- Lógica de Navegación y Formularios (sin cambios importantes) ---
    buttons.showLogin.addEventListener('click', () => showScreen('login'));
    buttons.showRegister.addEventListener('click', () => showScreen('register'));
    buttons.back.forEach(btn => btn.addEventListener('click', () => showScreen('initial')));
    buttons.logout.addEventListener('click', () => {
        localStorage.removeItem('userEmail');
        showScreen('initial');
        document.getElementById('login-email').value = '';
        document.getElementById('register-email').value = '';
    });
    forms.register.addEventListener('submit', async (e) => { e.preventDefault(); handleFormSubmit('register', 'register-email'); });
    forms.login.addEventListener('submit', async (e) => { e.preventDefault(); handleFormSubmit('login', 'login-email'); });

    async function handleFormSubmit(action, emailFieldId) {
        const email = document.getElementById(emailFieldId).value.trim();
        if (!email) { showMessage("Por favor, ingresa un correo."); return; }
        const result = await apiPost(action, { email });
        if (result.success) {
            if (action === 'login') {
                localStorage.setItem('userEmail', result.user.email);
                updateUserInfo(result.user);
                showScreen('game');
            } else {
                showMessage(result.message, false);
                showScreen('login');
            }
        } else {
            showMessage(result.message || `Falló ${action}.`);
        }
    }

    function updateUserInfo(user) {
        if (user) {
            userInfo.email.textContent = user.email;
            userInfo.points.textContent = user.points;
            userInfo.position.textContent = user.position;
        }
    }
    
    // --- LÓGICA DEL ESCÁNER DE QR (ACTUALIZADA) ---

    // 1. Botón principal ahora abre el menú de selección
    buttons.scanQR.addEventListener('click', () => showScreen('scanChoice'));
    buttons.cancelChoice.addEventListener('click', () => showScreen('game'));

    // 2. Botón para abrir la cámara
    buttons.openCamera.addEventListener('click', () => {
        showScreen('scanner');
        html5QrCode = new Html5Qrcode("qr-reader-full");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            stopScanner();
            showScreen('game');
            handleQRScan(decodedText);
        };
        
        const config = { 
            fps: 10, 
            qrbox: (w, h) => ({ width: Math.floor(Math.min(w, h) * 0.7), height: Math.floor(Math.min(w, h) * 0.7) })
        };

        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                showMessage("No se pudo iniciar el escáner. Revisa los permisos de la cámara.");
                showScreen('game');
            });
    });

    // 3. Botón para subir imagen
    buttons.uploadImage.addEventListener('click', () => qrImageInput.click());
    
    // 4. Lógica cuando se selecciona un archivo
    qrImageInput.addEventListener('change', e => {
        if (e.target.files && e.target.files.length > 0) {
            const imageFile = e.target.files[0];
            html5QrCode = new Html5Qrcode("qr-reader-full"); // Usamos el mismo elemento, no importa que esté oculto
            html5QrCode.scanFile(imageFile, true)
                .then(decodedText => {
                    showScreen('game');
                    handleQRScan(decodedText);
                })
                .catch(err => {
                    showMessage("No se encontró un código QR en la imagen.");
                    showScreen('game');
                });
        }
        // Resetea el valor para poder subir la misma imagen otra vez si es necesario
        e.target.value = '';
    });


    function stopScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.error("Fallo al detener el escáner.", err));
        }
    }

    buttons.cancelScan.addEventListener('click', () => {
        stopScanner();
        showScreen('game');
    });

    async function handleQRScan(qrData) {
        const scannerEmail = localStorage.getItem('userEmail');
        if (!scannerEmail) { showMessage("Debes iniciar sesión para escanear."); return; }
        const result = await apiPost('scanQR', { email: scannerEmail, qrData: qrData });
        if (result.success) {
            showMessage(result.message, false);
            updateUserInfo(result.user);
        } else {
            showMessage(result.message || "No se pudo procesar el QR.");
        }
    }
    
    // --- Carga Inicial de la Página ---
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
                console.error("Error al verificar usuario:", error);
                showScreen('initial');
            }
        } else {
            showScreen('initial');
        }
    }
    
    checkLoggedInUser();
});

