document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztmya2meeosdiKRjpg4JKO9BndGUXy92F24adQRd9wBFsILrzmB2f-mLrC3qvK-tI/exec";

    const screens = {
        initial: document.getElementById('initial-screen'),
        register: document.getElementById('register-screen'),
        login: document.getElementById('login-screen'),
        game: document.getElementById('game-screen'),
    };

    const buttons = {
        showLogin: document.getElementById('show-login-btn'),
        showRegister: document.getElementById('show-register-btn'),
        back: document.querySelectorAll('.back-btn'),
        scanQR: document.getElementById('scan-qr-btn'),
        logout: document.getElementById('logout-btn'),
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
    const qrReaderDiv = document.getElementById('qr-reader');
    let html5QrCode;

    // -------- API Helper --------
    async function callAPI(action, payload = {}) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...payload })
            });
            return await response.json();
        } catch (err) {
            console.error("Error API:", err);
            return { success: false, message: "Error de red" };
        }
    }

    // -------- UI Helpers --------
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function showMessage(message, isError = true) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? 'red' : 'green';
        setTimeout(() => messageContainer.textContent = '', 4000);
    }

    function updateUserInfo(user) {
        userInfo.email.textContent = user.email;
        userInfo.points.textContent = user.points;
        userInfo.position.textContent = user.position;
    }

    // -------- Navegación --------
    buttons.showLogin.addEventListener('click', () => showScreen('login'));
    buttons.showRegister.addEventListener('click', () => showScreen('register'));
    buttons.back.forEach(btn => btn.addEventListener('click', () => showScreen('initial')));

    buttons.logout.addEventListener('click', () => {
        localStorage.removeItem('userEmail');
        showScreen('initial');
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop();
        }
        qrReaderDiv.style.display = 'none';
    });

    // -------- Registro --------
    forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const result = await callAPI("register", { email });
        if (result.success) {
            showMessage(result.message, false);
            showScreen('login');
        } else {
            showMessage(result.message);
        }
    });

    // -------- Login --------
    forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const result = await callAPI("login", { email });
        if (result.success) {
            localStorage.setItem("userEmail", result.user.email);
            updateUserInfo(result.user);
            showScreen("game");
        } else {
            showMessage(result.message);
        }
    });

    // -------- Escaneo QR --------
    buttons.scanQR.addEventListener('click', () => {
        qrReaderDiv.style.display = 'block';
        html5QrCode = new Html5Qrcode("qr-reader");

        const qrCodeSuccessCallback = async (decodedText) => {
            await handleQRScan(decodedText);
            html5QrCode.stop().then(() => {
                qrReaderDiv.style.display = 'none';
            }).catch(err => console.log(err));
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
    });

    async function handleQRScan(qrData) {
        const scannerEmail = localStorage.getItem("userEmail");
        if (!scannerEmail) {
            showMessage("Debes iniciar sesión para escanear.");
            return;
        }
        const result = await callAPI("scanQR", { email: scannerEmail, qrData });
        if (result.success) {
            updateUserInfo(result.user);
            showMessage(result.message, false);
        } else {
            showMessage(result.message);
        }
    }
    
    // -------- Autologin --------
    const loggedInUser = localStorage.getItem('userEmail');
    if (loggedInUser) {
        callAPI('login', { email: loggedInUser }).then(result => {
            if (result.success) {
                updateUserInfo(result.user);
                showScreen('game');
            } else {
                showScreen('initial');
            }
        });
    } else {
        showScreen('initial');
    }
});

