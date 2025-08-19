document.addEventListener('DOMContentLoaded', () => {
    // !!! IMPORTANT: Paste your new Web App URL from Google Apps Script here !!!
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAeB-VRZOhkxe3k20Uz78-wQHZs9tYa4sb_yFB_A6He9iYGxz6xTEjr-vZjfJErg_T/exec";

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
        messageContainer.textContent = ''; // Clear messages on screen change
    }

    function showMessage(message, isError = true) {
        messageContainer.textContent = message;
        messageContainer.style.color = isError ? '#D8000C' : '#4F8A10'; // Red for error, Green for success
        setTimeout(() => messageContainer.textContent = '', 4000);
    }

    // Generic function to handle POST requests to the Apps Script
    async function apiPost(action, data) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { "Content-Type": "text/plain;charset=utf-8" }, // Use text/plain for Apps Script POST
                body: JSON.stringify({ action, ...data })
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            showMessage("A network error occurred. Please try again.");
            return { success: false, message: "A network error occurred." };
        }
    }

    // --- Event Listeners ---

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
        document.getElementById('login-email').value = '';
        document.getElementById('register-email').value = '';
    });

    forms.register.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value.trim();
        if (!email) {
            showMessage("Please enter an email.");
            return;
        }

        const result = await apiPost('register', { email });
        if (result.success) {
            showMessage(result.message, false);
            showScreen('login');
        } else {
            showMessage(result.message || "Registration failed.");
        }
    });

    forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        if (!email) {
            showMessage("Please enter an email.");
            return;
        }
        
        const result = await apiPost('login', { email });
        if (result.success) {
            localStorage.setItem('userEmail', result.user.email);
            updateUserInfo(result.user);
            showScreen('game');
        } else {
            showMessage(result.message || "Login failed.");
        }
    });

    function updateUserInfo(user) {
        if (user) {
            userInfo.email.textContent = user.email;
            userInfo.points.textContent = user.points;
            userInfo.position.textContent = user.position;
        }
    }
    
    buttons.scanQR.addEventListener('click', () => {
        qrReaderDiv.style.display = 'block';
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            html5QrCode.stop().then(() => {
                qrReaderDiv.style.display = 'none';
                handleQRScan(decodedText);
            }).catch(err => console.error("Error stopping QR scanner", err));
        };
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => showMessage("Could not start QR scanner. Check camera permissions."));
    });

    async function handleQRScan(qrData) {
        const scannerEmail = localStorage.getItem('userEmail');
        if (!scannerEmail) {
            showMessage("You must be logged in to scan.");
            return;
        }

        const result = await apiPost('scanQR', { email: scannerEmail, qrData: qrData });
        
        if (result.success) {
            showMessage(result.message, false);
            updateUserInfo(result.user); // Update UI with data returned from the server
        } else {
            showMessage(result.message || "Failed to process QR code.");
        }
    }
    
    // --- Initial Page Load ---
    
    async function checkLoggedInUser() {
        const loggedInUser = localStorage.getItem('userEmail');
        if (loggedInUser) {
            // Use GET request for fetching initial data
            try {
                const url = `${SCRIPT_URL}?action=getUserData&email=${encodeURIComponent(loggedInUser)}`;
                const response = await fetch(url);
                const result = await response.json();
                
                if (result.success) {
                    updateUserInfo(result.user);
                    showScreen('game');
                } else {
                    localStorage.removeItem('userEmail'); // Clear invalid stored email
                    showScreen('initial');
                }
            } catch (error) {
                console.error("Error checking logged in user:", error);
                showScreen('initial'); // Default to initial screen on error
            }
        } else {
            showScreen('initial');
        }
    }
    
    checkLoggedInUser();
});

