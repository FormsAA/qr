document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby6WfSPoAN0_h5r4Ar_JnbhT7-nDSsZ1b2ltGPEZiYBhk7D2ugly0zNE-5B_l-RNa0/exec";

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

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function showMessage(message, isError = true) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? 'red' : 'green';
        setTimeout(() => messageContainer.textContent = '', 4000);
    }

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

    forms.register.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        handleUserData('register', { email });
    });

    forms.login.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        handleUserData('login', { email });
    });

    async function handleUserData(action, data) {
        const url = `${SCRIPT_URL}?action=${action}&email=${encodeURIComponent(data.email)}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors', // Para evitar problemas de CORS con Apps Script
                redirect: 'follow',
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            // Con no-cors no podemos leer la respuesta, así que asumimos éxito y verificamos
            if (action === 'register') {
                showMessage("Registro enviado. Intenta iniciar sesión.", false);
                showScreen('login');
            } else if (action === 'login') {
                // Hacemos otra llamada para obtener los datos del usuario
                const getUserUrl = `${SCRIPT_URL}?action=getUserData&email=${encodeURIComponent(data.email)}`;
                const userResponse = await fetch(getUserUrl);
                const result = await userResponse.json();
                
                if (result.success) {
                    localStorage.setItem('userEmail', result.user.email);
                    updateUserInfo(result.user);
                    showScreen('game');
                } else {
                    showMessage(result.message || "No se pudo iniciar sesión.");
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage("Ocurrió un error de red.");
        }
    }

    function updateUserInfo(user) {
        userInfo.email.textContent = user.email;
        userInfo.points.textContent = user.points;
        userInfo.position.textContent = user.position;
    }
    
    // Lógica para escanear QR
    buttons.scanQR.addEventListener('click', () => {
        qrReaderDiv.style.display = 'block';
        html5QrCode = new Html5Qrcode("qr-reader");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            handleQRScan(decodedText);
            html5QrCode.stop().then(() => {
                qrReaderDiv.style.display = 'none';
            }).catch(err => console.log(err));
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
    });

    async function handleQRScan(qrData) {
        const scannerEmail = localStorage.getItem('userEmail');
        if (!scannerEmail) {
            showMessage("Debes iniciar sesión para escanear.");
            return;
        }

        const url = `${SCRIPT_URL}?action=scanQR&email=${encodeURIComponent(scannerEmail)}&qrData=${encodeURIComponent(qrData)}`;
        
        try {
             const response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors'
            });

            // Tras el escaneo, volvemos a pedir los datos del usuario para actualizar
             setTimeout(async () => {
                const getUserUrl = `${SCRIPT_URL}?action=getUserData&email=${encodeURIComponent(scannerEmail)}`;
                const userResponse = await fetch(getUserUrl);
                const result = await userResponse.json();
                
                if (result.success) {
                    updateUserInfo(result.user);
                    // No podemos leer la respuesta del POST, pero podemos dar un mensaje genérico
                    showMessage("Escaneo procesado. Puntos actualizados.", false);
                } else {
                     showMessage("No se pudo actualizar la información.");
                }
            }, 2000); // Damos un tiempo para que el script procese
            
        } catch (error) {
            console.error('Error:', error);
            showMessage("Error al procesar el QR.");
        }
    }
    
    // Verificar si el usuario ya está logueado al cargar la página
    const loggedInUser = localStorage.getItem('userEmail');
    if(loggedInUser){
        handleUserData('login', { email: loggedInUser });
    } else {
        showScreen('initial');
    }

});
