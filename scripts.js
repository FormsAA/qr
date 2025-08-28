// --- CONFIGURACIÓN ---
// PEGA AQUÍ LA URL DE TU APLICACIÓN WEB OBTENIDA DE GOOGLE APPS SCRIPT
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwkE94R8oF38vc6-b1AUBYY87yj-_l5DZKY5v0DN8xtDbyM9AxVNHHkfeVicUmC5nI/exec'; 

// --- REFERENCIAS A ELEMENTOS DEL DOM ---
const views = {
    login: document.getElementById('login-view'),
    menu: document.getElementById('menu-view'),
    scanner: document.getElementById('scanner-view')
};
const emailInput = document.getElementById('email-input');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const scanBtn = document.getElementById('scan-btn');
const logoutBtn = document.getElementById('logout-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

const pointsDisplay = document.getElementById('points-display');
const rankDisplay = document.getElementById('rank-display');
const loginStatus = document.getElementById('login-status');
const scanStatus = document.getElementById('scan-status');

let currentUser = null;
let html5QrCode = null;

// --- LÓGICA DE NAVEGACIÓN ---

// Muestra una vista y oculta las demás
function showView(viewName) {
    Object.values(views).forEach(view => view.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
}

// --- LÓGICA DE LA API (Comunicación con Google Sheets) ---

// Función genérica para enviar datos a nuestro Apps Script
async function postData(data) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'text/plain;charset=utf-t', // Apps Script web apps prefieren text/plain para POST
            },
            body: JSON.stringify(data),
            redirect: 'follow'
        });
        const result = await response.json();
        if (result.status === 'error') {
            throw new Error(result.message);
        }
        return result.data;
    } catch (error) {
        console.error('Error en la API:', error);
        throw error;
    }
}

// --- LÓGICA DE AUTENTICACIÓN ---

async function handleLogin() {
    const email = emailInput.value.trim();
    if (!email) {
        loginStatus.textContent = 'Por favor, ingresa un correo.';
        return;
    }
    loginStatus.textContent = 'Iniciando sesión...';
    try {
        const userData = await postData({ action: 'login', email: email });
        currentUser = userData;
        sessionStorage.setItem('qrGameUser', JSON.stringify(currentUser)); // Guardar sesión
        await updateDashboard();
        showView('menu');
    } catch (error) {
        loginStatus.textContent = error.message;
    }
}

async function handleRegister() {
    const email = emailInput.value.trim();
    if (!email) {
        loginStatus.textContent = 'Por favor, ingresa un correo.';
        return;
    }
    loginStatus.textContent = 'Registrando...';
    try {
        const userData = await postData({ action: 'register', email: email });
        currentUser = userData;
        sessionStorage.setItem('qrGameUser', JSON.stringify(currentUser)); // Guardar sesión
        await updateDashboard();
        showView('menu');
    } catch (error) {
        loginStatus.textContent = error.message;
    }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('qrGameUser');
    emailInput.value = '';
    loginStatus.textContent = '';
    showView('login');
}

// --- LÓGICA DEL JUEGO ---

async function updateDashboard() {
    if (!currentUser) return;
    
    pointsDisplay.textContent = currentUser.points;
    rankDisplay.textContent = 'Calculando posición...';

    try {
        const leaderboard = await postData({ action: 'getLeaderboard' });
        const userRank = leaderboard.findIndex(user => user.email.toLowerCase() === currentUser.email.toLowerCase()) + 1;
        
        currentUser.points = leaderboard[userRank - 1].points; // Actualizar puntos desde la fuente de verdad
        pointsDisplay.textContent = currentUser.points;
        rankDisplay.textContent = `Posición: #${userRank} de ${leaderboard.length}`;
    } catch (error) {
        rankDisplay.textContent = 'No se pudo obtener la posición.';
    }
}


// --- LÓGICA DEL ESCÁNER QR ---

function startScanner() {
    showView('scanner');
    scanStatus.textContent = 'Iniciando cámara...';

    html5QrCode = new Html5Qrcode("qr-reader");
    const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
        // Detener el escáner para evitar múltiples lecturas
        html5QrCode.stop().then(() => {
            handleScanSuccess(decodedText);
        }).catch(err => console.error("Fallo al detener el escáner.", err));
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
        .catch(err => {
            scanStatus.textContent = "Error al iniciar la cámara. Revisa los permisos.";
            console.error(err);
        });
}


async function handleScanSuccess(qrCode) {
    scanStatus.textContent = 'Verificando código...';
    try {
        const result = await postData({ action: 'scan', email: currentUser.email, qrCode: qrCode });
        currentUser.points = result.newPoints;
        scanStatus.textContent = `✅ ${result.message} Tienes ${result.newPoints} puntos.`;
        setTimeout(() => {
            updateDashboard();
            showView('menu');
        }, 2000); // Espera 2 segundos para que el usuario lea el mensaje
    } catch (error) {
        scanStatus.textContent = `❌ ${error.message}`;
        setTimeout(() => {
            updateDashboard();
            showView('menu');
        }, 3000); // Espera 3 segundos en caso de error
    }
}

function stopScannerAndGoToMenu() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.log("El escáner ya estaba detenido."));
    }
    showView('menu');
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Revisar si hay una sesión guardada
    const savedUser = sessionStorage.getItem('qrGameUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateDashboard();
        showView('menu');
    } else {
        showView('login');
    }
});

loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
scanBtn.addEventListener('click', startScanner);
backToMenuBtn.addEventListener('click', stopScannerAndGoToMenu);
