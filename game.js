import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import { getFirestore, doc, setDoc, updateDoc, getDoc, onSnapshot, deleteDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXUTAIDN9oBwFj9N6zRDl4sRVx3tc4STc",
  authDomain: "tic-tac-toe-onlinex.firebaseapp.com",
  databaseURL: "https://tic-tac-toe-onlinex-default-rtdb.asia-southeast1.firebasedatabase.app", 
  projectId: "tic-tac-toe-onlinex",
  storageBucket: "tic-tac-toe-onlinex.firebasestorage.app",
  messagingSenderId: "924586025656",
  appId: "1:924586025656:web:32e2805f80de726fb20a4d"
};

import { getDatabase, ref, onValue, onDisconnect, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const app = initializeApp(firebaseConfig); 
const db = getFirestore(app); 
const auth = getAuth(app);
const rtdb = getDatabase(app); 

let isOnline = false; let roomCode = ""; let playerRole = ""; let unsubscribeRoom = null;
let myUID = "LOADING..."; 
let currentSearchedUID = ""; 

let pc = null, localStream = null;

const servers = { iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }] };
window.pc = pc; window.localStream = localStream;

// ⭐=========================================⭐
// ⭐ LIVE THEME VIDEO DATABASE (PHASE 1) ⭐
// ⭐=========================================⭐
const BASE_VIDEO_URL = "https://cdn.jsdelivr.net/gh/shubhamsinghmzp1122-hub/TicTacTue@main/";

const liveWeatherVideos = {
    sunny: { morning: "sunny_morning.mp4", afternoon: "sunny_afternoon.mp4", evening: "sunny_evening.mp4", night: "sunny_night.mp4" },
    rainy: { morning: "rainy_morning.mp4", afternoon: "rainy_afternoon.mp4", evening: "rainy_evening.mp4", night: "rainy_night.mp4" },
    cloudy: { morning: "cloudy_morning.mp4", afternoon: "cloudy_afternoon.mp4", evening: "cloudy_evening.mp4", night: "cloudy_night.mp4" },
    windy: { morning: "windy_morning.mp4", afternoon: "windy_afternoon.mp4", evening: "windy_evening.mp4", night: "windy_night.mp4" },
    snowy: { morning: "snowy_morning.mp4", afternoon: "snowy_afternoon.mp4", evening: "snowy_evening.mp4", night: "snowy_night.mp4" },
    foggy: { morning: "foggy_morning.mp4", afternoon: "foggy_afternoon.mp4", evening: "foggy_evening.mp4", night: "foggy_night.mp4" },
    stormy: { morning: "stormy_morning.mp4", afternoon: "stormy_afternoon.mp4", evening: "stormy_evening.mp4", night: "stormy_night.mp4" },
    lightning: { morning: "lightning_morning.mp4", afternoon: "lightning_afternoon.mp4", evening: "lightning_evening.mp4", night: "lightning_night.mp4" },
    partly_cloudy: { morning: "partly_cloudy_morning.mp4", afternoon: "partly_cloudy_afternoon.mp4", evening: "partly_cloudy_evening.mp4", night: "partly_cloudy_night.mp4" },
    frosty: { morning: "frosty_morning.mp4", afternoon: "frosty_afternoon.mp4", evening: "frosty_evening.mp4", night: "frosty_night.mp4" },
    tornado: { morning: "tornado_morning.mp4", afternoon: "tornado_afternoon.mp4", evening: "tornado_evening.mp4", night: "tornado_night.mp4" },
    hot: { morning: "hot_morning.mp4", afternoon: "hot_afternoon.mp4", evening: "hot_evening.mp4", night: "hot_night.mp4" },
    cold: { morning: "cold_morning.mp4", afternoon: "cold_afternoon.mp4", evening: "cold_evening.mp4", night: "cold_night.mp4" }
};

let isLiveThemeActive = false; // Ye check karega ki theme ON hai ya OFF

// ⭐=====================================================⭐
// ⭐ ADVANCED LIVE THEME DOWNLOAD CONTROLLER (FIXED) ⭐
// ⭐=====================================================⭐
const CACHE_NAME = 'live-theme-videos-v1';

let downloadQueue = [];
let isDownloadPaused = false;
let currentDownloadIndex = 0;
let totalFilesCount = 52;

// 1. Queue Builder
function buildDownloadQueue() {
    downloadQueue = [];
    for (let weather in liveWeatherVideos) {
        for (let time in liveWeatherVideos[weather]) {
            downloadQueue.push(BASE_VIDEO_URL + liveWeatherVideos[weather][time]);
        }
    }
    totalFilesCount = downloadQueue.length;
}

// 2. Initial State Load (App Open)
async function initDownloadState() {
    buildDownloadQueue();
    const savedIndex = localStorage.getItem('liveTheme_downloadIndex');
    const savedPercent = localStorage.getItem('liveTheme_downloadPercent');
    const isCompleted = localStorage.getItem('liveTheme_downloadComplete');

    const btn = document.getElementById('startDownloadPackBtn');
    const resetBtn = document.getElementById('resetDownloadPackBtn');
    const progressBar = document.getElementById('packProgressBar');
    const percentText = document.getElementById('packPercentText');
    const statusText = document.getElementById('packStatusText');

    if (isCompleted === 'true') {
        progressBar.style.width = "100%";
        percentText.innerText = "100%";
        statusText.innerText = "Pack Installed Successfully! 🚀";
        statusText.style.color = "#00ff4d";
        btn.innerText = "✅ APPLY LIVE THEME";
        btn.style.background = "#00ff4d";
        btn.style.color = "#000";
        btn.onclick = () => activateLiveTheme();
        resetBtn.style.display = 'block';
        return;
    }

    if (savedIndex && parseInt(savedIndex) > 0) {
        currentDownloadIndex = parseInt(savedIndex);
        let pct = savedPercent || "0%";
        progressBar.style.width = pct;
        percentText.innerText = pct;
        statusText.innerText = `Paused at ${currentDownloadIndex}/${totalFilesCount}`;
        btn.innerText = "▶️ RESUME";
        resetBtn.style.display = 'block';
    }
}

// 3. Main Download Loop
async function startLiveThemeDownload() {
    if (!navigator.onLine) {
        window.showToast("Internet connection nahi hai bhai! 🌐");
        return;
    }

    isDownloadPaused = false;
    if (downloadQueue.length === 0) buildDownloadQueue();

    const btn = document.getElementById('startDownloadPackBtn');
    const pauseBtn = document.getElementById('pauseDownloadPackBtn');
    const resetBtn = document.getElementById('resetDownloadPackBtn');
    const progressBar = document.getElementById('packProgressBar');
    const percentText = document.getElementById('packPercentText');
    const statusText = document.getElementById('packStatusText');

    // UI INSTANT UPDATE: Hide Download/Resume, Show Pause
    btn.style.display = 'none';
    pauseBtn.style.display = 'block';
    pauseBtn.innerText = "⏸️ PAUSE";
    resetBtn.style.display = 'block';

    try {
        const cache = await caches.open(CACHE_NAME);

        while (currentDownloadIndex < totalFilesCount) {
            // Agar Pause dabaya hai toh turant loop break karo
            if (isDownloadPaused) {
                statusText.innerText = `Paused: ${currentDownloadIndex}/${totalFilesCount}`;
                return; // UI pehle hi pause button ne update kar diya hai
            }

            if (!navigator.onLine) {
                isDownloadPaused = true;
                window.showToast("Net band ho gaya! Pausing...");
                statusText.innerText = `Connection Lost! Paused.`;
                pauseBtn.style.display = 'none';
                btn.style.display = 'block';
                btn.innerText = "▶️ RESUME";
                return;
            }

            const url = downloadQueue[currentDownloadIndex];
            statusText.innerText = `Downloading Background ${currentDownloadIndex + 1} of ${totalFilesCount}...`;
            statusText.style.color = "#00ffff";

            const matched = await cache.match(url);
            if (!matched) {
                await cache.add(url);
            }

            // Dhyan rahe, await ke baad agar user ne pause dabaya hai, toh UI disturb na ho
            if (isDownloadPaused) return; 

            currentDownloadIndex++;
            let percent = Math.floor((currentDownloadIndex / totalFilesCount) * 100) + "%";
            progressBar.style.width = percent;
            percentText.innerText = percent;
            
            localStorage.setItem('liveTheme_downloadIndex', currentDownloadIndex);
            localStorage.setItem('liveTheme_downloadPercent', percent);
        }

        // Loop finished!
        localStorage.setItem('liveTheme_downloadComplete', 'true');
        statusText.innerText = "Pack Installed Successfully! 🚀";
        statusText.style.color = "#00ff4d";
        pauseBtn.style.display = 'none';
        btn.style.display = 'block';
        btn.innerText = "✅ APPLY LIVE THEME";
        btn.style.background = "#00ff4d";
        btn.style.color = "#000";
        btn.onclick = () => activateLiveTheme();

    } catch (error) {
        console.error("Download Error:", error);
        if (!isDownloadPaused) {
            statusText.innerText = "Download interrupted! Click Resume.";
            statusText.style.color = "#ff0055";
            pauseBtn.style.display = 'none';
            btn.style.display = 'block';
            btn.innerText = "▶️ RESUME";
        }
    }
}

// 4. INSTANT PAUSE BUTTON LOGIC
document.getElementById('pauseDownloadPackBtn').onclick = () => {
    settingClickSound();
    isDownloadPaused = true; // Is se background loop ruk jayega
    
    // UI Ko bina wait kiye INSTANT badal do!
    document.getElementById('pauseDownloadPackBtn').style.display = 'none';
    const startBtn = document.getElementById('startDownloadPackBtn');
    startBtn.style.display = 'block';
    startBtn.innerText = "▶️ RESUME";
    document.getElementById('packStatusText').innerText = "Pausing..."; 
};

// 5. CANCEL / RESET BUTTON LOGIC
document.getElementById('resetDownloadPackBtn').onclick = () => {
    menuClickSound();
    document.getElementById('resetDownloadConfirmModal').style.display = 'flex';
};

document.getElementById('confirmResetDownloadBtn').onclick = async () => {
    menuClickSound();
    document.getElementById('resetDownloadConfirmModal').style.display = 'none';
    
    isDownloadPaused = true;
    currentDownloadIndex = 0;
    
    // Purana data saaf karna
    await caches.delete(CACHE_NAME);
    localStorage.removeItem('liveTheme_downloadIndex');
    localStorage.removeItem('liveTheme_downloadPercent');
    localStorage.removeItem('liveTheme_downloadComplete');

    // UI reset 0%
    document.getElementById('packProgressBar').style.width = "0%";
    document.getElementById('packPercentText').innerText = "0%";
    document.getElementById('packStatusText').innerText = "Ready to Download";
    document.getElementById('packStatusText').style.color = "#fff";
    
    const btn = document.getElementById('startDownloadPackBtn');
    btn.style.display = 'block';
    btn.innerText = "⬇️ DOWNLOAD";
    btn.style.background = "#00ffff"; 
    btn.style.color = "#000";
    btn.onclick = () => startLiveThemeDownload();
    
    document.getElementById('pauseDownloadPackBtn').style.display = 'none';
    document.getElementById('resetDownloadPackBtn').style.display = 'none';
};

// Bind Start Button
document.getElementById('startDownloadPackBtn').onclick = () => startLiveThemeDownload();

// Initialize on Load
setTimeout(() => { initDownloadState(); }, 2000);

// ⭐=====================================================⭐
// ⭐ PHASE 3 & 4: WEATHER BRAIN & CROSS-FADE DIRECTOR  ⭐
// ⭐=====================================================⭐
let activeVideoPlayer = 1; 

// 1. WMO Code Mapping (API ke numbers ko apne folder names me badalna)
function mapWeatherCode(code) {
    if (code === 0) return 'sunny';
    if (code === 1 || code === 2) return 'partly_cloudy';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'foggy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
    if (code >= 95 && code <= 99) return 'stormy';
    return 'cloudy'; // Agar API confuse ho jaye toh fallback
}

// 2. Time Detection (Phone ki ghadi se bina internet ke)
function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    return 'night';
}

// 3. The Seamless Cross-Fade Video Director 🎬
async function playWeatherVideo(weather, time) {
    // Agar future mein kisi specific combo ki video missing hui toh galti se crash na ho
    if(!liveWeatherVideos[weather] || !liveWeatherVideos[weather][time]) {
        weather = 'cloudy'; // fallback
    }
    
    const videoFileName = liveWeatherVideos[weather][time];
    const videoUrl = BASE_VIDEO_URL + videoFileName;
    
    const player1 = document.getElementById('bgVideoPlayer1');
    const player2 = document.getElementById('bgVideoPlayer2');
    
    // Decide karte hain ki kaunsa player next video play karega
    const nextPlayer = (activeVideoPlayer === 1) ? player2 : player1;
    const currentPlayer = (activeVideoPlayer === 1) ? player1 : player2;

    try {
        // Cache memory se video nikalna (Zero Buffering)
        const cache = await caches.open(CACHE_NAME);
        const cachedRes = await cache.match(videoUrl);
        
        if (cachedRes) {
            const blob = await cachedRes.blob();
            nextPlayer.src = URL.createObjectURL(blob);
        } else {
            nextPlayer.src = videoUrl; // Agar memory me na mile toh internet se
        }

        // Play aur Cross-Fade Magic
        nextPlayer.play().then(() => {
            nextPlayer.style.opacity = 1;   // Nayi video Fade-IN
            currentPlayer.style.opacity = 0; // Purani video Fade-OUT
            activeVideoPlayer = (activeVideoPlayer === 1) ? 2 : 1; // Tracker Swap
        }).catch(e => console.log("AutoPlay blocked, waiting for interaction..."));

    } catch(err) { console.log("Video Play Error:", err); }
}

// 4. THE MASTER TRIGGER
window.activateLiveTheme = function() {
    menuClickSound();
    document.getElementById('liveThemeModal').style.display = 'none';
    
    // 🛑 FIX: Live Theme start hone se pehle baaki theme ki baarish/rang hata do
    setTheme('default');
    
    isLiveThemeActive = true;
    
    // 🛑 FIX: Button ka naam update kar diya taaki apply hat jaye
    document.getElementById('startDownloadPackBtn').innerText = "✅ LIVE THEME ACTIVE";
    
    document.body.style.background = 'transparent';
    document.getElementById('lobby').style.background = 'transparent';
    document.getElementById('game').style.background = 'transparent';
    document.getElementById('liveThemeVideoContainer').style.display = 'block';
    
    window.showToast("Detecting local weather... 🌍");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();
                
                const wmoCode = data.current_weather.weathercode;
                const weatherCondition = mapWeatherCode(wmoCode); // Map Code
                const timeCondition = getTimeOfDay(); // Map Time
                
                playWeatherVideo(weatherCondition, timeCondition);
                window.showToast(`Live BG: ${weatherCondition.toUpperCase()} ${timeCondition.toUpperCase()} 🎬`);
            } catch(error) {
                playWeatherVideo('cloudy', getTimeOfDay());
            }
        }, (error) => {
            window.showToast("Location denied. Default weather applied. ☁️");
            playWeatherVideo('cloudy', getTimeOfDay());
        });
    } else {
        playWeatherVideo('cloudy', getTimeOfDay());
    }
};

// 5. Lobby Return Refresh Hook (Mausam update karne ke liye)
// Isko hum apne backLobbyBtn.onclick mein check karenge aage chal kar.

// ⭐ UPDATE PRESENCE HELPER ⭐
window.updateMyPresence = function(state) {
    if (myUID && myUID !== "LOADING...") {
        set(ref(rtdb, '/status/' + myUID), state);
    }
};

// ⭐ TOAST NOTIFICATION HELPER ⭐
window.showToast = function(msg) {
    const toast = document.getElementById('toastNotification');
    toast.innerText = msg;
    toast.style.bottom = '20px';
    setTimeout(() => { toast.style.bottom = '-100px'; }, 3000);
};

async function startVoiceChat(isCreator) {
    window.pc = new RTCPeerConnection(servers);
    
    if (isCreator) {
        window.pc.createDataChannel("dummyChannel"); 
    } else {
        window.pc.ondatachannel = (e) => { console.log("Data channel connected!"); }; 
    }

    window.pc.oniceconnectionstatechange = () => {
        if (window.pc.iceConnectionState === 'disconnected' || 
            window.pc.iceConnectionState === 'failed' || 
            window.pc.iceConnectionState === 'closed') {
            
            if (isOnline) {
                document.getElementById('disconnectModal').style.display = 'flex';
                isOnline = false;
                if (roomCode !== "") {
                    try { updateDoc(doc(db, "rooms", roomCode), { status: "disconnected" }); } catch(e) {}
                }
            }
        }
    };

    let remoteStream = new MediaStream();
    const remoteVideoEl = document.getElementById('remoteVideo');
    remoteVideoEl.srcObject = remoteStream;

    window.pc.ontrack = e => { 
        e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t)); 
        remoteVideoEl.play().catch(e => console.log("Autoplay blocked"));
    };

    if(window.localStream) {
        window.localStream.getTracks().forEach(t => window.pc.addTrack(t, window.localStream));
    }

    const roomRef = doc(db, "rooms", roomCode);
    let pendingCandidates = [];

    if (isCreator) {
        window.pc.onicecandidate = e => { if(e.candidate) addDoc(collection(roomRef, "callerCandidates"), e.candidate.toJSON()); }
        const offer = await window.pc.createOffer(); 
        await window.pc.setLocalDescription(offer);
        await updateDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });
        
        onSnapshot(roomRef, async snap => { 
            const d = snap.data(); 
            if(d && d.answer && !window.pc.currentRemoteDescription) {
                await window.pc.setRemoteDescription(new RTCSessionDescription(d.answer)); 
                pendingCandidates.forEach(c => window.pc.addIceCandidate(new RTCIceCandidate(c)));
                pendingCandidates = [];
            }
        });
        onSnapshot(collection(roomRef, "calleeCandidates"), snap => { 
            snap.docChanges().forEach(c => { 
                if(c.type==='added') {
                    if(window.pc.currentRemoteDescription) { window.pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); } else { pendingCandidates.push(c.doc.data()); }
                }
            }); 
        });
    } else {
        window.pc.onicecandidate = e => { if(e.candidate) addDoc(collection(roomRef, "calleeCandidates"), e.candidate.toJSON()); }
        
        onSnapshot(roomRef, async snap => {
            const data = snap.data();
            if (!window.pc.currentRemoteDescription && data && data.offer) {
                await window.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await window.pc.createAnswer(); 
                await window.pc.setLocalDescription(answer);
                await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
                pendingCandidates.forEach(c => window.pc.addIceCandidate(new RTCIceCandidate(c)));
                pendingCandidates = [];
            }
        });
        
        onSnapshot(collection(roomRef, "callerCandidates"), snap => { 
            snap.docChanges().forEach(c => { 
                if(c.type==='added') {
                    if(window.pc.currentRemoteDescription) { window.pc.addIceCandidate(new RTCIceCandidate(c.doc.data())); } else { pendingCandidates.push(c.doc.data()); }
                }
            }); 
        });
    }
}

document.getElementById('micBtn').onclick = () => {
    if(window.localStream) {
        const audioTracks = window.localStream.getAudioTracks();
        if(audioTracks.length > 0) {
            const t = audioTracks[0]; t.enabled = !t.enabled;
            const btn = document.getElementById('micBtn');
            btn.innerText = t.enabled ? '🎙️ Mic: ON' : '🔇 Mic: OFF';
            btn.style.color = t.enabled ? '#00ff4d' : '#ff0000';
            btn.style.borderColor = t.enabled ? '#00ff4d' : '#ff0000';
            btn.style.boxShadow = t.enabled ? '0 0 10px #00ff4d' : '0 0 10px #ff0000';
        } else {
            alert("Microphone track not found! Make sure you allowed permissions.");
        }
    }
};

document.getElementById('camBtn').onclick = () => {
    if(window.localStream) {
        const videoTracks = window.localStream.getVideoTracks();
        if(videoTracks.length > 0) {
            const t = videoTracks[0]; t.enabled = !t.enabled;
            const btn = document.getElementById('camBtn');
            btn.innerText = t.enabled ? '📷 Cam: ON' : '📷 Cam: OFF';
            btn.style.color = t.enabled ? '#00ff4d' : '#ff0000';
            btn.style.borderColor = t.enabled ? '#00ff4d' : '#ff0000';
            btn.style.boxShadow = t.enabled ? '0 0 10px #00ff4d' : '0 0 10px #ff0000';
        } else {
            alert("Camera track not found! Make sure you allowed permissions.");
        }
    }
};

const AudioCtx = window.AudioContext || window.webkitAudioContext; const audioCtx = new AudioCtx(); function beep(freq, time=0.16){ try{ const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sine'; o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.0001, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + time); o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + time); }catch(e){} }
function tapSound() { beep(420,0.14); } function aiMoveSound() { beep(300,0.24); } function winOSound(){ beep(800,0.1); setTimeout(()=>beep(950,0.1),100); setTimeout(()=>beep(1100,0.1),200); } function winXSound(){ beep(400,0.1); setTimeout(()=>beep(350,0.1),100); setTimeout(()=>beep(300,0.1),200); } function drawSound(){ beep(500,0.12); setTimeout(()=>beep(250,0.2),120); } function menuClickSound() { beep(620, 0.08); } function settingClickSound() { beep(580, 0.06); } function resumeAudio(){ try{ audioCtx.resume && audioCtx.resume(); }catch(e){} document.removeEventListener('touchstart', resumeAudio); document.removeEventListener('click', resumeAudio); }

const lobby = document.getElementById('lobby'); const difficultyDiv = document.getElementById('difficulty'); const boardDiv = document.getElementById('board'); const gameDiv = document.getElementById('game'); const popup = document.getElementById('popup'); const winnerText = document.getElementById('winnerText'); const modeTitle = document.getElementById('modeTitle'); const winningLine = document.getElementById('winning-line'); const scoreboard = document.getElementById('scoreboard'); const backLobbyBtn = document.getElementById('backLobbyBtn'); const rainContainer = document.getElementById('rain-container'); const moon = document.getElementById('moon'); const sun = document.getElementById('sun'); const starContainer = document.getElementById('star-container'); const loadingOverlay = document.getElementById('loading-overlay'); const loadingBarFill = document.getElementById('loading-bar-fill'); const loadingPercentage = document.getElementById('loading-percentage'); const levelContainer = document.getElementById('level-system-container'); const levelInfoText = document.getElementById('level-info-text'); const levelProgressFill = document.getElementById('level-progress-fill'); const splashOverlay = document.getElementById('splash-overlay'); const splashLogo = document.querySelector('.splash-logo'); const particleContainer = document.getElementById('particle-container'); const lightStreak = document.querySelector('.light-streak');
const PARTICLE_COUNT = 80; const SPLASH_DURATION = 3500; const LOADING_DURATION = 5000; const UPDATE_INTERVAL = 50; 
let board = ["","","","","","","","",""]; let currentPlayer = "O"; let vsAI = false; let aiLevel = "easy"; let winningCombo = []; let scoreO = 0; let scoreX = 0; let currentTheme = 'default';

let isUltimateMode = false; let ultimateStartingTurn = 'O'; 
let ultimateActiveBoardIndex = -1; let largeBoardState = []; let smallBoardsState = [];

let isLevelUpMode = false;
let isBlitzMode = false;
let blitzTimeLeft = 3000;
let blitzInterval = null;
const BLITZ_MAX = 3000;
let lastForcedIndex = -1;
let offlineStartingTurn = 'O';
let isFirstMatch = true;

let levelUpMatchCount = 0; let playerLevel = 1; let currentExp = 0; let expToNextLevel = 10; let totalMatchesWon = 0; const BASE_EXP_REQ = 10; let playerName = "GUEST";

function loadGameData() { const data = localStorage.getItem('tictactoe_player_data'); if (data) { const loadedData = JSON.parse(data); playerLevel = loadedData.level || 1; currentExp = loadedData.exp || 0; totalMatchesWon = loadedData.matchesWon || 0; playerName = loadedData.name || "GUEST"; calculateNextLevelRequirement(); } else { saveGameData(); } updateLevelDisplay(); }

function saveGameData() { 
    calculateNextLevelRequirement(); 
    const dataToSave = { level: playerLevel, exp: currentExp, matchesWon: totalMatchesWon, name: playerName }; 
    localStorage.setItem('tictactoe_player_data', JSON.stringify(dataToSave)); 
    if (auth && auth.currentUser) {
        updateDoc(doc(db, "users", auth.currentUser.uid), {
            level: playerLevel, exp: currentExp, matchesWon: totalMatchesWon, playerName: playerName
        }).catch(e => console.log(e));
    }
}

function calculateNextLevelRequirement() { expToNextLevel = BASE_EXP_REQ * playerLevel; }
function gainExperience(amount) { currentExp += amount; while (currentExp >= expToNextLevel) { currentExp -= expToNextLevel; playerLevel++; calculateNextLevelRequirement(); } saveGameData(); updateLevelDisplay(); }
function updateLevelDisplay() { if (levelInfoText) { levelInfoText.textContent = `Level: ${playerLevel}`; levelProgressFill.style.width = `${(currentExp / expToNextLevel) * 100}%`; if (currentExp / expToNextLevel > 0.8) { levelProgressFill.style.background = 'linear-gradient(90deg, #00ffff, #ffffff)'; } else { levelProgressFill.style.background = 'linear-gradient(90deg, #00ffff, #ff00ff)'; } } }
function updateLevelSystemInLobby() { if (lobby.style.display === 'flex') { levelContainer.style.display = 'block'; updateLevelDisplay(); } else { levelContainer.style.display = 'none'; } }
document.getElementById('resetModeScoreBtn').onclick = () => { if(confirm("Are you sure you want to reset ALL Player Progress?")) { localStorage.removeItem('tictactoe_player_data'); playerLevel = 1; currentExp = 0; totalMatchesWon = 0; loadGameData(); alert("Player Progress reset!"); menuClickSound(); } };

async function handleCellClick(i, e) {
    if (board[i] !== "" || checkWinner()) return;
    if (vsAI && currentPlayer === 'X') return; 

    if (isOnline) {
        if (currentPlayer !== playerRole) return; 
        let newBoard = [...board]; newBoard[i] = playerRole; let nextPlayer = playerRole === 'O' ? 'X' : 'O';
        if(playerRole === 'O') tapSound(); else aiMoveSound();
        await updateDoc(doc(db, "rooms", roomCode), { board: newBoard, currentPlayer: nextPlayer }); return; 
    }
    lastForcedIndex = -1; // Normal click par forced move ka color reset
    makeMove(i, e); 
}

function makeMove(i, e){
  if(board[i]!=="" || checkWinner()) return;
  if(currentPlayer === 'O') tapSound(); else aiMoveSound(); 
  board[i] = currentPlayer; 
  drawBoard(); // Dabba ban gaya
  
  // 👇 YAHAN SE ASALI AAG LAGEGI 👇
  const allCells = document.querySelectorAll('#board .cell');
  if(allCells[i]) {
      window.triggerRealGameEffect(allCells[i], currentPlayer, e);
  }
  // 👆 AAG LAG GAYI 👆

  const winner = checkWinner();

  if(winner){ window.stopBlitzTimer(); handleWin(winner); return; }
  if(board.every(x=>x!=="")){ window.stopBlitzTimer(); handleDraw(); return; }
  currentPlayer = (currentPlayer==='O')?'X':'O';
  
  if (isBlitzMode) window.startBlitzTimer(); // 🔥 Har turn badalne par 3s ka timer restart
  
  if(vsAI && currentPlayer==='X') { aiMoveSound(); setTimeout(aiMove,350); }
}

// ⭐ NAYA XP SYSTEM LOGIC ⭐
function awardXP(outcome) {
    let earnedXP = 0;

    if (isOnline) {
        // Any Online Mode (Create, Join, Random)
        if (outcome === 'win') earnedXP = 12;
        else if (outcome === 'draw') earnedXP = 6;
        else if (outcome === 'lose') earnedXP = 2;
    } else if (isLevelUpMode) {
        // Level Up Mode
        if (outcome === 'win') earnedXP = 8;
        else if (outcome === 'draw') earnedXP = 5;
        else if (outcome === 'lose') earnedXP = 2;
    } else if (vsAI) {
        // Single Player AI Modes
        if (aiLevel === 'easy') {
            if (outcome === 'win') earnedXP = 3;
            else if (outcome === 'draw') earnedXP = 2;
            else if (outcome === 'lose') earnedXP = 1;
        } else if (aiLevel === 'medium') {
            if (outcome === 'win') earnedXP = 5;
            else if (outcome === 'draw') earnedXP = 3;
            else if (outcome === 'lose') earnedXP = 1;
        } else if (aiLevel === 'hard') {
            // Added logic for Hard mode
            if (outcome === 'win') earnedXP = 6;
            else if (outcome === 'draw') earnedXP = 4;
            else if (outcome === 'lose') earnedXP = 2;
        } else if (aiLevel === 'ultrahard') {
            if (outcome === 'win') {
                // Secret Easter Egg: +1 Full Level Up
                earnedXP = expToNextLevel; 
            }
            else if (outcome === 'draw') earnedXP = 5;
            else if (outcome === 'lose') earnedXP = 1;
        }
    } else {
        // Local Multiplayer (0 XP to prevent cheating)
        earnedXP = 0; 
    }

    // Agar XP 0 se zyada hai, toh add karo aur toast dikhao
    if (earnedXP > 0) {
        gainExperience(earnedXP);
        if (outcome === 'win') showToast(`🎉 +${earnedXP} XP Earned!`);
        else if (outcome === 'draw') showToast(`🤝 +${earnedXP} XP for Trying!`);
        else showToast(`😢 +${earnedXP} XP (Try Again)`);
    }
}

function handleWin(winner) {
    if(winner==='O') scoreO++; else scoreX++; totalMatchesWon++; 

    // --- NAYA XP TRIGGER ---
    let outcome = "lose"; 
    if (isOnline) {
        if (winner === playerRole) outcome = "win";
    } else if (vsAI) {
        if (winner === 'O') outcome = "win"; // Player humesha 'O' hota hai offline me
    }
    awardXP(outcome);
    // ----------------------

    drawWinningLine(winningCombo); 
    if(winner === 'O') winOSound(); else winXSound();
    
    let winMessage = ''; let loseMessage = '';
    if (isOnline) {
        if (winner === playerRole) { winMessage = 'YOU WON! 🎉'; loseMessage = 'OPPONENT LOST'; } 
        else { winMessage = 'YOU LOST! 😭'; loseMessage = 'OPPONENT WON'; }
    } else if (vsAI) {
        if (winner === 'O') { winMessage = 'YOU WINNER 🎉'; loseMessage = 'AI LOSER'; } 
        else { winMessage = 'AI WINNER 🎉'; loseMessage = 'YOU LOSER'; }
    } else {
        if (winner === 'O') { winMessage = 'Player O WINNER 🎉'; loseMessage = 'Player X LOSER'; } 
        else { winMessage = 'Player X WINNER 🎉'; loseMessage = 'Player O LOSER'; }
    }
    showPopup(winMessage, loseMessage); 
}

function handleDraw() { 
    // --- NAYA XP TRIGGER ---
    awardXP("draw");
    // -----------------------
    
    drawSound(); 
    setTimeout(()=> showPopup("DRAW!", ""),400); 
}

window.resetGame = async function(){
  tapSound();
    if (isUltimateMode) {
      popup.style.display='none'; 
      ultimateStartingTurn = (ultimateStartingTurn === 'O') ? 'X' : 'O'; // Turn palti
      initUltimateGame(true);
      updateScoreboard();
      return; 
  }

  if (isOnline) {
      popup.style.display='none';
      let nextStarter = window.startingTurn === 'O' ? 'X' : 'O';
      await updateDoc(doc(db, "rooms", roomCode), { board: ["","","","","","","","",""], currentPlayer: nextStarter, startingTurn: nextStarter }); return; 
  }
  popup.style.display='none'; winningLine.style.display='none'; board=["","","","","","","","",""]; winningCombo=[];
  if (isLevelUpMode) { levelUpMatchCount++; if (levelUpMatchCount % 2 !== 0) { currentPlayer = "O"; aiLevel = "hard"; } else { currentPlayer = "X"; aiLevel = "ultrahard"; } 
  } else if (vsAI && aiLevel === 'ultrahard') { 
      currentPlayer = "X"; 
  } else { 
      // 🔥 Agar lobby se naya naya mode shuru hua hai toh 'O' se start hoga
      if (isFirstMatch) {
          offlineStartingTurn = 'O';
          isFirstMatch = false; // Agle rounds ke liye flag off
      } else {
          // Baaki ke matches mein turn palti marega
          offlineStartingTurn = (offlineStartingTurn === 'O') ? 'X' : 'O'; 
      }
      currentPlayer = offlineStartingTurn; 
  }

  drawBoard(); updateScoreboard(); 
  if (isBlitzMode) window.startBlitzTimer();
  if (vsAI && currentPlayer==='X') { aiMoveSound(); setTimeout(aiMove, 350); }
}

const roomModal = document.getElementById('roomModal'); const roomCodeInput = document.getElementById('roomCodeInput'); const roomCodeDisplay = document.getElementById('roomCodeDisplay'); const roomStatusText = document.getElementById('roomStatusText'); const roomActionBtn = document.getElementById('roomActionBtn'); const roomModalTitle = document.getElementById('roomModalTitle');
function generateRoomCode() { return Math.floor(1000 + Math.random() * 9000).toString(); }

document.getElementById('createRoomBtn').onclick = async () => {
    menuClickSound(); roomCode = generateRoomCode(); playerRole = "O"; 
    
    try {
        if(!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
            if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
            document.getElementById('micBtn').style.display = 'block';
            document.getElementById('camBtn').style.display = 'block';
            document.getElementById('localVideo').srcObject = window.localStream;
        }
    } catch(e) { console.log("Media Denied/Error"); }

    roomModalTitle.innerText = "CREATE ROOM"; roomCodeInput.style.display = "none"; roomCodeDisplay.style.display = "block"; roomCodeDisplay.innerText = roomCode; roomStatusText.innerHTML = "Share code. Waiting for friend..."; roomActionBtn.style.display = "none"; roomModal.style.display = "flex";
    await setDoc(doc(db, "rooms", roomCode), { 
        board: ["","","","","","","","",""], 
        currentPlayer: "O", 
        startingTurn: "O", 
        status: "waiting",
        createdAt: serverTimestamp() 
    }); 
    listenToRoom();
};

document.getElementById('joinRoomBtn').onclick = () => {
    menuClickSound(); roomModalTitle.innerText = "JOIN ROOM"; roomCodeDisplay.style.display = "none"; roomCodeInput.style.display = "block"; roomCodeInput.value = ""; roomStatusText.innerHTML = "Enter 4-digit code to join"; roomActionBtn.style.display = "inline-block"; roomActionBtn.innerText = "JOIN"; roomModal.style.display = "flex";
};

roomActionBtn.onclick = async () => {
    menuClickSound(); const code = roomCodeInput.value.trim(); if(code.length !== 4 && !code.includes("R")) { roomStatusText.innerHTML = "<span style='color:#ff0055;'>❌ Enter a 4-digit code!</span>"; return; }
    roomActionBtn.innerText = "Joining..."; 
    
    try {
        if(!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
            if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
            document.getElementById('micBtn').style.display = 'block';
            document.getElementById('camBtn').style.display = 'block';
            document.getElementById('localVideo').srcObject = window.localStream;
        }
    } catch(e) { console.log("Media Denied/Error"); }

    const docRef = doc(db, "rooms", code); const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().status === "waiting") {
        roomCode = code; playerRole = "X"; await updateDoc(docRef, { status: "playing" }); listenToRoom();
    } else {
        roomStatusText.innerHTML = "<span style='color:#ff0055; text-shadow:0 0 10px #ff0055;'>❌ Room not found!</span>"; roomActionBtn.innerText = "JOIN";
    }
};

document.getElementById('roomCancelBtn').onclick = async () => {
    menuClickSound(); roomModal.style.display = "none"; if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
    if (playerRole === "O" && roomCode !== "") { await deleteDoc(doc(db, "rooms", roomCode)); } roomCode = ""; playerRole = "";
    document.getElementById('micBtn').style.display = 'none'; 
    document.getElementById('camBtn').style.display = 'none'; 
    if(window.localStream){window.localStream.getTracks().forEach(t=>t.stop()); window.localStream=null;}
};

// ⭐ UPDATED LISTEN TO ROOM (Matchmaking timer cancel + Chat Receive) ⭐
function listenToRoom() {
    if (unsubscribeRoom) unsubscribeRoom();
    unsubscribeRoom = onSnapshot(doc(db, "rooms", roomCode), (docSnap) => {
        if (!docSnap.exists() || docSnap.data().status === "disconnected") {
            if (isOnline) { 
                document.getElementById('disconnectModal').style.display = 'flex'; 
                isOnline = false; 
            } 
            return;
        }
        const data = docSnap.data();
        window.startingTurn = data.startingTurn || "O";
        
                if (data.status === "playing" && !isOnline) {
            
            // ⭐ NAYA LOGIC: Agar 3rd player galti se aa gaya, toh usko bahar nikal kar naya search karao
            if (playerRole === "X" && data.joinedBy && data.joinedBy !== myUID) {
                console.log("Room kisi aur ne le liya, retrying...");
                if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
                roomCode = ""; playerRole = "";
                // 1 second baad automatic dobara naya room dhundhega
                setTimeout(() => { document.getElementById('randomMatchBtn').click(); }, 1000);
                return;
            }

            isOnline = true; 
            roomModal.style.display = "none";
            
            // Matchmaking ka timer aur popup band karne ke liye
            if (window.matchmakingInterval) clearInterval(window.matchmakingInterval);
            document.getElementById('matchmakingModal').style.display = 'none';

            let rCodeDisplay = roomCode.includes("R") ? "RANDOM MATCH" : roomCode;
            startGame('LIVE MATCH<br><span style="font-size:22px; color:#ff00ff; letter-spacing:3px; text-shadow: 0 0 15px #ff00ff;">ROOM: ' + rCodeDisplay + '</span>');
            startVoiceChat(playerRole === "O");
        }

        if (isOnline) {
            let boardChanged = JSON.stringify(board) !== JSON.stringify(data.board); 
            board = data.board; currentPlayer = data.currentPlayer; 
            popup.style.display = 'none'; winningLine.style.display = 'none'; 
            drawBoard(); updateScoreboard();
            
            if (boardChanged) { if (currentPlayer === playerRole) { aiMoveSound(); } else { tapSound(); } }
            
            const winner = checkWinner(); 
            if (winner) { handleWin(winner); } 
            else if (board.every(x=>x!=="")) { handleDraw(); }

            // LIVE CHAT RECEIVE LOGIC
            if (data.lastMessage && window.lastMsgTime !== data.lastMessage.time) {
                window.lastMsgTime = data.lastMessage.time;
                if (window.showChatBubble) {
                    window.showChatBubble(data.lastMessage.text, data.lastMessage.sender);
                }
            }
        }
    });
}

// ⭐ UPDATED START GAME (Chat Box show/hide) ⭐
function startGame(selectedMode){
  scoreO = 0; scoreX = 0; lobby.style.display='none'; gameDiv.style.display='flex'; gameDiv.className = 'game-board ' + currentTheme; 
  if (isLevelUpMode) { modeTitle.innerHTML = 'LEVEL UP MODE'; } else { modeTitle.innerHTML = selectedMode; }
  document.getElementById('resetModeScoreBtn').style.display = 'none'; updateLevelSystemInLobby(); 
  isLevelUpMode = (selectedMode.includes("LEVEL UP MODE")); if (isLevelUpMode) levelUpMatchCount = 0; 
    
        if (isUltimateMode) {
      document.getElementById('board').style.display = 'none';
      document.getElementById('ultimateBoard').style.display = 'grid';
      ultimateStartingTurn = 'X';
      offlineStartingTurn = 'X'; // Taaki pehla match 'O' se chalu ho aur fir palti mare
      // Ye game reset hone se pehle 'X' banega, taaki palti hoke 'O' se start ho
  } else {

          document.getElementById('ultimateBoard').style.display = 'none';
      document.getElementById('board').style.display = 'grid';
      drawBoard();
  }
  
  isFirstMatch = true; // Lobby se aate hi pehla match reset karega

    // ⭐ BLITZ MODE UI & ENGINE CONTROL ⭐
  if (isBlitzMode) {
      document.getElementById('blitzTimerContainer').style.display = 'flex';
      window.startBlitzTimer();
  } else {
      document.getElementById('blitzTimerContainer').style.display = 'none';
      window.stopBlitzTimer();
  }

  updateScoreboard(); 
  moon.style.display = 'none'; 
  sun.style.display = 'none';
  
  updateMyPresence('busy');

  if (isOnline) {
      document.getElementById('videoContainer').style.display = 'flex';
      document.getElementById('chatContainer').style.display = 'flex'; 
  } else {
      document.getElementById('micBtn').style.display = 'none';
      document.getElementById('camBtn').style.display = 'none';
      document.getElementById('videoContainer').style.display = 'none';
      document.getElementById('chatContainer').style.display = 'none'; 
      resetGame(); 
  } 
}

const nameDisplayContainer = document.getElementById('nameDisplayContainer');
const nameEditContainer = document.getElementById('nameEditContainer');
const profileNameDisplay = document.getElementById('profileNameDisplay');
const playerNameInput = document.getElementById('playerNameInput');

document.getElementById('editNameBtn').onclick = () => {
    settingClickSound(); nameDisplayContainer.style.display = 'none'; nameEditContainer.style.display = 'flex'; playerNameInput.value = playerName === "GUEST" ? "" : playerName; playerNameInput.focus();
};

document.getElementById('saveNameBtn').onclick = () => {
    menuClickSound(); let newName = playerNameInput.value.trim().toUpperCase(); if(newName === "") newName = "GUEST"; playerName = newName; saveGameData(); 
    profileNameDisplay.innerText = playerName; nameEditContainer.style.display = 'none'; nameDisplayContainer.style.display = 'flex';
};

document.getElementById('profileBtn').onclick = () => {
    menuClickSound(); profileNameDisplay.innerText = playerName; document.getElementById('uidTextDisplay').innerText = myUID; nameEditContainer.style.display = 'none'; nameDisplayContainer.style.display = 'flex';
    document.getElementById('profileLevelDisplay').innerText = playerLevel; document.getElementById('profileWinsDisplay').innerText = totalMatchesWon + ' 🏆'; document.getElementById('profileExpDisplay').innerText = currentExp + ' / ' + expToNextLevel + ' EXP';
    
    let rName = ""; let rColor = ""; let rSvg = "";
    if (playerLevel < 10) { rName = "NOVICE"; rColor = "#a0a0a0"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="20" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 20) { rName = "FIGHTER"; rColor = "#cd7f32"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,10 90,40 70,90 30,90 10,40" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 70,45 60,75 40,75 30,45" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 30) { rName = "WARRIOR"; rColor = "#c0c0c0"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="25" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 40) { rName = "ELITE"; rColor = "#ffd700"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,50 50,75 25,50" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 50) { rName = "MASTER"; rColor = "#00ffff"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,25 70,40 60,65 40,65 30,40" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 60) { rName = "GRANDMASTER"; rColor = "#ff00ff"; rSvg = `<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 65,35 95,40 70,60 80,90 50,75 20,90 30,60 5,40 35,35" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 58,40 75,45 60,55 65,70 50,60 35,70 40,55 25,45 42,40" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 70) { rName = "EPIC"; rColor = "#ff0055"; rSvg = `<svg width="85" height="85" viewBox="0 0 100 100"><path d="M10 20 L50 5 L90 20 L90 60 L50 95 L10 60 Z" fill="none" stroke="${rColor}" stroke-width="8"/><path d="M30 35 L50 20 L70 35 L70 55 L50 70 L30 55 Z" fill="${rColor}"/></svg>`; }
    else if (playerLevel < 80) { rName = "MYTHIC"; rColor = "#8a2be2"; rSvg = `<svg width="90" height="90" viewBox="0 0 100 100"><polygon points="50,5 95,30 75,90 25,90 5,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,45 65,75 35,75 25,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>`; }
    else if (playerLevel < 90) { rName = "LEGEND"; rColor = "#ff4500"; rSvg = `<svg width="90" height="90" viewBox="0 0 100 100"><path d="M50 0 L100 40 L75 100 L25 100 L0 40 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 80,50 65,85 35,85 20,50" fill="${rColor}"/><polygon points="50,40 60,55 50,70 40,55" fill="#fff"/></svg>`; }
    else if (playerLevel < 100) { rName = "SUPREME"; rColor = "#ffffff"; rSvg = `<svg width="95" height="95" viewBox="0 0 100 100"><polygon points="50,0 65,30 100,30 75,55 85,95 50,75 15,95 25,55 0,30 35,30" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 58,40 80,40 60,55 68,80 50,65 32,80 40,55 20,40 42,40" fill="${rColor}"/><circle cx="50" cy="53" r="8" fill="#000"/></svg>`; }
    else { rName = "IMMORTAL"; rColor = "#ff2a2a"; rSvg = `<svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#ffd700" stroke-width="8"/><polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 65,45 60,70 40,70 35,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#ffd700"/></svg>`; }

    const badgeDisplay = document.getElementById('profileBadgeDisplay'); badgeDisplay.innerHTML = rName; badgeDisplay.style.color = rColor; badgeDisplay.style.textShadow = `0 0 15px ${rColor}`;
    const mainIcon = document.getElementById('profileMainIcon'); mainIcon.innerHTML = rSvg; mainIcon.style.filter = `drop-shadow(0 0 20px ${rColor})`;
    document.getElementById('profileModal').style.display = 'flex';
};

document.getElementById("ultimateMultiBtn").onclick = ()=>{ 
    menuClickSound(); vsAI = false; isLevelUpMode = false; isUltimateMode = true; 
    startGame('ULTIMATE LOCAL MATCH'); 
};

document.getElementById("single").onclick = ()=>{ menuClickSound(); if (difficultyDiv.style.display === 'flex') { difficultyDiv.style.display = 'none'; } else { difficultyDiv.style.display = 'flex'; } };
document.querySelectorAll('.diff').forEach(btn=>{ btn.onclick = ()=>{ menuClickSound(); aiLevel = btn.dataset.level; vsAI = true; let modeText = (aiLevel === 'ultrahard') ? `AI (ULTRA HARD +)` : 'AI ('+aiLevel.toUpperCase()+')'; startGame(modeText); }; });
document.getElementById("levelUpMode").onclick = ()=>{ menuClickSound(); vsAI = true; isLevelUpMode = true; startGame('LEVEL UP MODE (Alternating Difficulty & Start)'); };

document.getElementById("multi").onclick = ()=>{ menuClickSound(); vsAI = false; isLevelUpMode = false; isUltimateMode = false; isBlitzMode = false; startGame('Player O vs Player X'); };

// Naya Blitz Button ka Event
document.getElementById("blitzBtn").onclick = ()=>{ menuClickSound(); vsAI = false; isLevelUpMode = false; isUltimateMode = false; isBlitzMode = true; startGame('⏳ BLITZ MODE (3s)'); };

document.getElementById('searchPlayerBtn').onclick = async () => {
    menuClickSound(); const searchInput = document.getElementById('searchUidInput'); const searchUid = searchInput.value.trim(); const resultText = document.getElementById('searchResultText');
    const showError = (msg) => { searchInput.value = ''; document.getElementById('searchedProfileModal').style.display = 'none'; resultText.style.display = 'block'; resultText.innerHTML = msg; setTimeout(() => { resultText.style.display = 'none'; }, 2000); };
    if (searchUid.length !== 5) { showError("<span style='color: #ff0055;'>❌ Sirf 5-Digit UID dal bhai!</span>"); return; }
    if (searchUid === myUID) { showError("<span style='color: #ffcc00;'>⚠️ Ye tera hi UID hai bhai!</span>"); return; }
    resultText.style.display = 'block'; resultText.innerHTML = "<span style='color: #00ffff;'>Searching Radar... ⏳</span>";

    try {
        const q = query(collection(db, "users"), where("gameUID", "==", searchUid)); const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) { showError("<span style='color: #ff0055;'>❌ Player Not Found!</span>"); } else {
            resultText.style.display = 'none'; searchInput.value = ''; 
            const pData = querySnapshot.docs[0].data(); let pLevel = pData.level || 1;
            document.getElementById('searchNameDisplay').innerText = pData.playerName || "GUEST"; document.getElementById('searchUidDisplay').innerText = pData.gameUID; document.getElementById('searchLevelDisplay').innerText = pLevel; document.getElementById('searchWinsDisplay').innerText = (pData.matchesWon || 0) + ' 🏆';
            currentSearchedUID = pData.gameUID; const reqBtn = document.getElementById('sendRequestBtn'); const rmvBtn = document.getElementById('removeFriendBtnCard');
            reqBtn.innerText = "➕ SEND REQUEST"; reqBtn.style.background = "#ff00ff"; reqBtn.style.boxShadow = "0 0 15px #ff00ff"; reqBtn.disabled = false; reqBtn.style.display = 'block'; rmvBtn.style.display = 'none'; 
            
            try {
                const friendCheckSnap = await getDoc(doc(db, "users", myUID, "friends", currentSearchedUID));
                if (friendCheckSnap.exists()) { reqBtn.style.display = 'none'; rmvBtn.style.display = 'block'; rmvBtn.onclick = () => showRemoveConfirm(currentSearchedUID, pData.playerName || "GUEST"); }
            } catch(e) { console.log(e); }
       
            let rName="", rColor="", rSvg="";
            if (pLevel < 10) { rName="NOVICE"; rColor="#a0a0a0"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="20" fill="${rColor}"/></svg>`; }
            else if (pLevel < 20) { rName="FIGHTER"; rColor="#cd7f32"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,10 90,40 70,90 30,90 10,40" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 70,45 60,75 40,75 30,45" fill="${rColor}"/></svg>`; }
            else if (pLevel < 30) { rName="WARRIOR"; rColor="#c0c0c0"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="25" fill="${rColor}"/></svg>`; }
            else if (pLevel < 40) { rName="ELITE"; rColor="#ffd700"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,50 50,75 25,50" fill="${rColor}"/></svg>`; }
            else if (pLevel < 50) { rName="MASTER"; rColor="#00ffff"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,25 70,40 60,65 40,65 30,40" fill="${rColor}"/></svg>`; }
            else if (pLevel < 60) { rName="GRANDMASTER"; rColor="#ff00ff"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 65,35 95,40 70,60 80,90 50,75 20,90 30,60 5,40 35,35" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 58,40 75,45 60,55 65,70 50,60 35,70 40,55 25,45 42,40" fill="${rColor}"/></svg>`; }
            else if (pLevel < 70) { rName="EPIC"; rColor="#ff0055"; rSvg=`<svg width="85" height="85" viewBox="0 0 100 100"><path d="M10 20 L50 5 L90 20 L90 60 L50 95 L10 60 Z" fill="none" stroke="${rColor}" stroke-width="8"/><path d="M30 35 L50 20 L70 35 L70 55 L50 70 L30 55 Z" fill="${rColor}"/></svg>`; }
            else if (pLevel < 80) { rName="MYTHIC"; rColor="#8a2be2"; rSvg=`<svg width="90" height="90" viewBox="0 0 100 100"><polygon points="50,5 95,30 75,90 25,90 5,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,45 65,75 35,75 25,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>`; }
            else if (pLevel < 90) { rName="LEGEND"; rColor="#ff4500"; rSvg=`<svg width="90" height="90" viewBox="0 0 100 100"><path d="M50 0 L100 40 L75 100 L25 100 L0 40 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 80,50 65,85 35,85 20,50" fill="${rColor}"/><polygon points="50,40 60,55 50,70 40,55" fill="#fff"/></svg>`; }
            else if (pLevel < 100) { rName="SUPREME"; rColor="#ffffff"; rSvg=`<svg width="95" height="95" viewBox="0 0 100 100"><polygon points="50,0 65,30 100,30 75,55 85,95 50,75 15,95 25,55 0,30 35,30" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 58,40 80,40 60,55 68,80 50,65 32,80 40,55 20,40 42,40" fill="${rColor}"/><circle cx="50" cy="53" r="8" fill="#000"/></svg>`; }
            else { rName="IMMORTAL"; rColor="#ff2a2a"; rSvg=`<svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#ffd700" stroke-width="8"/><polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 65,45 60,70 40,70 35,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#ffd700"/></svg>`; }

            const sBadge = document.getElementById('searchBadgeDisplay'); sBadge.innerHTML = rName; sBadge.style.color = rColor; sBadge.style.textShadow = `0 0 15px ${rColor}`;
            const sIcon = document.getElementById('searchMainIcon'); sIcon.innerHTML = rSvg; sIcon.style.filter = `drop-shadow(0 0 20px ${rColor})`;
            document.getElementById('searchedProfileModal').style.display = 'flex';
        }
    } catch (error) { showError("<span style='color: #ff0055;'>❌ Server Error!</span>"); console.log(error); }
};

document.getElementById('sendRequestBtn').onclick = async () => {
    menuClickSound(); const btn = document.getElementById('sendRequestBtn'); btn.innerText = "⏳ SENDING..."; btn.disabled = true;
    try {
        const requestDocId = myUID + "_" + currentSearchedUID;
        await setDoc(doc(db, "friend_requests", requestDocId), { fromUID: myUID, fromName: playerName, toUID: currentSearchedUID, status: "pending", timestamp: serverTimestamp() });
        btn.innerText = "✅ SENT!"; btn.style.background = "#00ff4d"; btn.style.boxShadow = "0 0 15px #00ff4d";
        setTimeout(() => { document.getElementById('searchedProfileModal').style.display = 'none'; }, 1500);
    } catch (error) { console.log("Request Error: ", error); btn.innerText = "❌ ERROR!"; btn.disabled = false; }
};

window.loadFriendRequests = async function() {
    const reqBox = document.getElementById('contentRequests'); reqBox.innerHTML = "<p style='color:#00ffff; margin-top:110px;'>Radar scanning... ⏳</p>";
    try {
        const q = query(collection(db, "friend_requests"), where("toUID", "==", myUID), where("status", "==", "pending")); const snapshot = await getDocs(q);
        if(snapshot.empty) { reqBox.innerHTML = "<p style='color:#aaa; margin-top:110px;'>No new requests 😴</p>"; return; }
        let html = "";
        snapshot.forEach(docSnap => {
            const req = docSnap.data(); const docId = docSnap.id;
            html += `<div style="background: rgba(0,0,0,0.8); border: 1px solid #ff00ff; border-radius: 8px; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 10px rgba(255,0,255,0.2);">
                <div style="text-align: left;"><div style="color:#fff; font-weight:bold; font-size:16px; text-transform:uppercase;">${req.fromName}</div><div style="color:#aaa; font-size:12px; letter-spacing:1px;">UID: ${req.fromUID}</div></div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="handleRequest('${docId}', 'accepted', '${req.fromUID}', '${req.fromName}')" style="background:#00ff4d; color:#000; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow: 0 0 10px #00ff4d;">✅</button>
                    <button onclick="handleRequest('${docId}', 'rejected', '${req.fromUID}', '${req.fromName}')" style="background:#ff0055; color:#fff; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow: 0 0 10px #ff0055;">❌</button>
                </div></div>`;
        });
        reqBox.innerHTML = html;
    } catch(e) { reqBox.innerHTML = "<p style='color:#ff0055; margin-top:110px;'>Error loading ❌</p>"; console.log("Fetch Error: ", e); }
};

if(window.friendUnsubs) window.friendUnsubs.forEach(u => u());
window.friendUnsubs = [];

// FRIEND LIST
window.loadMyFriends = async function() {
    const friendBox = document.getElementById('contentMyFriends'); friendBox.style.display = 'flex'; friendBox.style.flexDirection = 'column'; friendBox.innerHTML = "<p style='color:#00ffff; margin-top:110px; order: 0;'>Fetching Friends... ⏳</p>";
    try {
        if(window.friendUnsubs) { window.friendUnsubs.forEach(u => u()); window.friendUnsubs = []; }
        const snapshot = await getDocs(collection(db, "users", myUID, "friends"));
        if(snapshot.empty) { friendBox.innerHTML = "<p style='color:#aaa; margin-top:110px; order: 0;'>No friends yet 😢<br><span style='font-size:12px;'>Search UID to add!</span></p>"; return; }
        
        let html = ""; const friendIDs = snapshot.docs.map(docSnap => docSnap.id);
        friendIDs.forEach(fid => {
            html += `<div id="friendBox_${fid}" style="order: 1; background: rgba(0,0,0,0.8); border: 1px solid #00ffff; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 0 10px rgba(0,255,255,0.2); transition: order 0.3s, background 0.3s;">
                <div style="text-align: left; cursor: pointer; flex: 1;" onclick="viewPlayerCard('${fid}', true)">
                    <div style="color:#00ffff; font-weight:bold; font-size:16px; text-transform:uppercase; text-shadow:0 0 5px #00ffff;"><span id="fName_${fid}">LOADING...</span></div>
                    <div style="color:#aaa; font-size:12px; letter-spacing:1px; font-weight:bold; display:flex; align-items:center; gap:6px;">Lv. <span id="fLevel_${fid}">-</span><span id="fStatusDot_${fid}" style="width:10px; height:10px; border-radius:50%; background:#555; display:inline-block; transition: 0.3s;"></span></div>
                </div>
                <button id="fInviteBtn_${fid}" class="btn" style="display:none; margin:0 0 0 10px; padding:5px 12px; font-size:13px; background:#00ffff !important; color:#000 !important; border:none; border-radius:5px; font-weight: bold; box-shadow:0 0 8px #00ffff; cursor: pointer;" onclick="event.stopPropagation(); sendMatchInvite('${fid}', document.getElementById('fName_${fid}').innerText)">➕ PLAY</button>
            </div>`;
        });
        friendBox.innerHTML = html;

        friendIDs.forEach(fid => {
            const q = query(collection(db, "users"), where("gameUID", "==", fid));
            const unsubFS = onSnapshot(q, (querySnapshot) => {
                if(!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    const nameEl = document.getElementById(`fName_${fid}`); const levelEl = document.getElementById(`fLevel_${fid}`);
                    if(nameEl) nameEl.innerText = data.playerName || 'GUEST'; if(levelEl) levelEl.innerText = data.level || 1;
                }
            });
            window.friendUnsubs.push(unsubFS);

            const statusRef = ref(rtdb, '/status/' + fid);
            const unsubRTDB = onValue(statusRef, (snap) => {
                const state = snap.val();
                const statusDot = document.getElementById(`fStatusDot_${fid}`); const inviteBtn = document.getElementById(`fInviteBtn_${fid}`); const friendRow = document.getElementById(`friendBox_${fid}`); 
                if(statusDot && inviteBtn && friendRow) {
                    if(state === 'online') { statusDot.style.display = 'none'; inviteBtn.style.display = 'block'; friendRow.style.order = "-1"; } 
                    else if (state === 'busy') { statusDot.style.display = 'inline-block'; statusDot.style.background = '#00ff4d'; statusDot.style.boxShadow = '0 0 8px #00ff4d'; inviteBtn.style.display = 'none'; friendRow.style.order = "0"; } 
                    else { statusDot.style.display = 'inline-block'; statusDot.style.background = '#555'; statusDot.style.boxShadow = 'none'; inviteBtn.style.display = 'none'; friendRow.style.order = "1"; }
                }
            });
            window.friendUnsubs.push(() => unsubRTDB()); 
        });
    } catch(e) { friendBox.innerHTML = "<p style='color:#ff0055; margin-top:110px; order: 0;'>Error loading ❌</p>"; console.log("Friend Fetch Error: ", e); }
};
// ⭐ FRIEND LIST SE PLAYER CARD OPEN KARNE KA FUNCTION (FIXED) ⭐
let isCardOpenedFromFriendList = false; 
window.viewPlayerCard = async (uid, fromFriendList = false) => {
    menuClickSound();
    try {
        // 🔥 ASLI FIX YAHAN HAI: Firebase mein ab sahi ID se dost ko dhoondhega
        const q = query(collection(db, "users"), where("gameUID", "==", uid)); 
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const pData = querySnapshot.docs[0].data();
            let pLevel = pData.level || 1;
            
            document.getElementById('searchNameDisplay').innerText = pData.playerName || "GUEST"; 
            document.getElementById('searchUidDisplay').innerText = pData.gameUID; 
            document.getElementById('searchLevelDisplay').innerText = pLevel; 
            document.getElementById('searchWinsDisplay').innerText = (pData.matchesWon || 0) + ' 🏆';
            currentSearchedUID = pData.gameUID; 
            
            const reqBtn = document.getElementById('sendRequestBtn'); 
            const rmvBtn = document.getElementById('removeFriendBtnCard');
            
            if (fromFriendList) {
                reqBtn.style.display = 'none'; 
                rmvBtn.style.display = 'block'; 
                rmvBtn.onclick = () => showRemoveConfirm(currentSearchedUID, pData.playerName || "GUEST");
                isCardOpenedFromFriendList = true;
            } else {
                isCardOpenedFromFriendList = false;
                reqBtn.innerText = "➕ SEND REQUEST"; 
                reqBtn.style.display = 'block'; 
                rmvBtn.style.display = 'none'; 
            }

            // Badge Update Logic
            let rName="", rColor="", rSvg="";
            if (pLevel < 10) { rName="NOVICE"; rColor="#a0a0a0"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="20" fill="${rColor}"/></svg>`; }
            else if (pLevel < 20) { rName="FIGHTER"; rColor="#cd7f32"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,10 90,40 70,90 30,90 10,40" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 70,45 60,75 40,75 30,45" fill="${rColor}"/></svg>`; }
            else if (pLevel < 30) { rName="WARRIOR"; rColor="#c0c0c0"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 Z" fill="none" stroke="${rColor}" stroke-width="6"/><circle cx="50" cy="50" r="25" fill="${rColor}"/></svg>`; }
            else if (pLevel < 40) { rName="ELITE"; rColor="#ffd700"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 95,50 50,95 5,50" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,50 50,75 25,50" fill="${rColor}"/></svg>`; }
            else if (pLevel < 50) { rName="MASTER"; rColor="#00ffff"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><path d="M50 5 L85 25 L85 75 L50 95 L15 75 L15 25 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,25 70,40 60,65 40,65 30,40" fill="${rColor}"/></svg>`; }
            else if (pLevel < 60) { rName="GRANDMASTER"; rColor="#ff00ff"; rSvg=`<svg width="80" height="80" viewBox="0 0 100 100"><polygon points="50,5 65,35 95,40 70,60 80,90 50,75 20,90 30,60 5,40 35,35" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 58,40 75,45 60,55 65,70 50,60 35,70 40,55 25,45 42,40" fill="${rColor}"/></svg>`; }
            else if (pLevel < 70) { rName="EPIC"; rColor="#ff0055"; rSvg=`<svg width="85" height="85" viewBox="0 0 100 100"><path d="M10 20 L50 5 L90 20 L90 60 L50 95 L10 60 Z" fill="none" stroke="${rColor}" stroke-width="8"/><path d="M30 35 L50 20 L70 35 L70 55 L50 70 L30 55 Z" fill="${rColor}"/></svg>`; }
            else if (pLevel < 80) { rName="MYTHIC"; rColor="#8a2be2"; rSvg=`<svg width="90" height="90" viewBox="0 0 100 100"><polygon points="50,5 95,30 75,90 25,90 5,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,25 75,45 65,75 35,75 25,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>`; }
            else if (pLevel < 90) { rName="LEGEND"; rColor="#ff4500"; rSvg=`<svg width="90" height="90" viewBox="0 0 100 100"><path d="M50 0 L100 40 L75 100 L25 100 L0 40 Z" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 80,50 65,85 35,85 20,50" fill="${rColor}"/><polygon points="50,40 60,55 50,70 40,55" fill="#fff"/></svg>`; }
            else if (pLevel < 100) { rName="SUPREME"; rColor="#ffffff"; rSvg=`<svg width="95" height="95" viewBox="0 0 100 100"><polygon points="50,0 65,30 100,30 75,55 85,95 50,75 15,95 25,55 0,30 35,30" fill="none" stroke="${rColor}" stroke-width="8"/><polygon points="50,20 58,40 80,40 60,55 68,80 50,65 32,80 40,55 20,40 42,40" fill="${rColor}"/><circle cx="50" cy="53" r="8" fill="#000"/></svg>`; }
            else { rName="IMMORTAL"; rColor="#ff2a2a"; rSvg=`<svg width="100" height="100" viewBox="0 0 100 100"><polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="none" stroke="#ffd700" stroke-width="8"/><polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="none" stroke="${rColor}" stroke-width="6"/><polygon points="50,30 65,45 60,70 40,70 35,45" fill="${rColor}"/><circle cx="50" cy="50" r="10" fill="#ffd700"/></svg>`; }

            const sBadge = document.getElementById('searchBadgeDisplay'); sBadge.innerHTML = rName; sBadge.style.color = rColor; sBadge.style.textShadow = `0 0 15px ${rColor}`;
            const sIcon = document.getElementById('searchMainIcon'); sIcon.innerHTML = rSvg; sIcon.style.filter = `drop-shadow(0 0 20px ${rColor})`;
            
            // Sab data set hone ke baad modal khol do
            document.getElementById('friendsModal').style.display = 'none'; // Background me friend list band karo
            document.getElementById('searchedProfileModal').style.display = 'flex';
        } else {
            console.log("User nahi mila database mein!");
        }
    } catch(e) { console.log(e); }
};

let uidToRemove = "";
window.showRemoveConfirm = (uid, friendName) => { menuClickSound(); uidToRemove = uid; document.getElementById('confirmFriendName').innerText = friendName; document.getElementById('customConfirmModal').style.display = 'flex'; };
document.getElementById('confirmYesBtn').onclick = async () => {
    menuClickSound(); const btn = document.getElementById('confirmYesBtn'); btn.innerText = "⏳..."; btn.disabled = true;
    try {
        await deleteDoc(doc(db, "users", myUID, "friends", uidToRemove)); await deleteDoc(doc(db, "users", uidToRemove, "friends", myUID));
        document.getElementById('customConfirmModal').style.display = 'none'; document.getElementById('searchedProfileModal').style.display = 'none'; btn.innerText = "YES"; btn.disabled = false;
        if (isCardOpenedFromFriendList) { document.getElementById('friendsModal').style.display = 'flex'; loadMyFriends(); }
    } catch(e) { console.log("Remove Error:", e); btn.innerText = "❌ ERROR"; setTimeout(() => { btn.innerText = "YES"; btn.disabled = false; }, 2000); }
};
document.querySelector('#searchedProfileModal button:last-child').onclick = () => {
    menuClickSound(); document.getElementById('searchedProfileModal').style.display = 'none'; if (isCardOpenedFromFriendList) { document.getElementById('friendsModal').style.display = 'flex'; isCardOpenedFromFriendList = false; }
};

window.handleRequest = async (docId, action, friendUID, friendName) => {
    menuClickSound(); document.getElementById('contentRequests').innerHTML = "<p style='color:#00ffff; margin-top:110px;'>Updating... ⏳</p>";
    try {
        await updateDoc(doc(db, "friend_requests", docId), { status: action });
        if (action === 'accepted') { await setDoc(doc(db, "users", myUID, "friends", friendUID), { uid: friendUID, addedAt: serverTimestamp() }); await setDoc(doc(db, "users", friendUID, "friends", myUID), { uid: myUID, addedAt: serverTimestamp() }); }
        loadFriendRequests(); 
    } catch(e) { console.log("Action Error:", e); loadFriendRequests(); }
};

document.getElementById('friendsListBtn').onclick = () => { menuClickSound(); document.getElementById('friendsModal').style.display = 'flex'; document.getElementById('tabMyFriends').click(); };
document.getElementById('tabMyFriends').onclick = () => { menuClickSound(); document.getElementById('tabMyFriends').style.cssText = "flex: 1; padding: 8px; font-size: 14px; margin: 0; background: #ff00ff !important; color: #fff !important; border: none !important;"; document.getElementById('tabRequests').style.cssText = "flex: 1; padding: 8px; font-size: 14px; margin: 0; background: #333 !important; color: #aaa !important; border: 1px solid #555 !important;"; document.getElementById('contentMyFriends').style.display = 'block'; document.getElementById('contentRequests').style.display = 'none'; loadMyFriends(); };
document.getElementById('tabRequests').onclick = () => { menuClickSound(); document.getElementById('tabRequests').style.cssText = "flex: 1; padding: 8px; font-size: 14px; margin: 0; background: #ff00ff !important; color: #fff !important; border: none !important;"; document.getElementById('tabMyFriends').style.cssText = "flex: 1; padding: 8px; font-size: 14px; margin: 0; background: #333 !important; color: #aaa !important; border: 1px solid #555 !important;"; document.getElementById('contentRequests').style.display = 'block'; document.getElementById('contentMyFriends').style.display = 'none'; loadFriendRequests(); };

// ⭐ SEND MATCH INVITE (Friend) ⭐
let isInviting = false; let activeInviteId = "";
window.sendMatchInvite = async function(friendUID, friendName) {
    menuClickSound(); const btn = document.getElementById(`fInviteBtn_${friendUID}`); if (btn.disabled) return;
    btn.disabled = true; btn.style.background = "#555 !important"; btn.style.color = "#aaa !important"; btn.style.boxShadow = "none"; btn.innerText = "⏳...";
    setTimeout(() => { if(btn){ btn.disabled = false; btn.style.background = "#00ffff !important"; btn.style.color = "#000 !important"; btn.style.boxShadow = "0 0 5px #00ffff"; btn.innerText = "➕ PLAY"; } }, 8000);
    roomCode = generateRoomCode(); playerRole = "O";
    try {
        if(!window.localStream) {
            window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
            if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
            document.getElementById('micBtn').style.display = 'block'; document.getElementById('camBtn').style.display = 'block'; document.getElementById('localVideo').srcObject = window.localStream;
        }
    } catch(e) { console.log("Media Denied/Error"); }

    await setDoc(doc(db, "rooms", roomCode), { board: ["","","","","","","","",""], currentPlayer: "O", startingTurn: "O", status: "waiting", createdAt: serverTimestamp() }); 
    listenToRoom(); activeInviteId = myUID + "_" + friendUID;
    await setDoc(doc(db, "match_invites", activeInviteId), { fromUID: myUID, fromName: playerName, toUID: friendUID, roomCode: roomCode, status: "pending", timestamp: serverTimestamp() });

    document.getElementById('waitingFriendName').innerText = friendName; document.getElementById('waitingInviteModal').style.display = 'flex'; isInviting = true;
    const unsubInvite = onSnapshot(doc(db, "match_invites", activeInviteId), (snap) => {
        if (!snap.exists()) return; const data = snap.data();
        if (data.status === "rejected" || data.status === "timeout") {
            document.getElementById('waitingInviteModal').style.display = 'none'; showToast(friendName + (data.status === "timeout" ? " didn't respond!" : " is busy right now!")); isInviting = false; unsubInvite();
            if (playerRole === "O" && roomCode !== "") { deleteDoc(doc(db, "rooms", roomCode)); } roomCode = ""; playerRole = "";
        } else if (data.status === "accepted") { document.getElementById('waitingInviteModal').style.display = 'none'; document.getElementById('friendsModal').style.display = 'none'; isInviting = false; unsubInvite(); }
    });
};

document.getElementById('cancelInviteBtn').onclick = async () => {
    menuClickSound(); document.getElementById('waitingInviteModal').style.display = 'none'; isInviting = false;
    if(activeInviteId) { await updateDoc(doc(db, "match_invites", activeInviteId), { status: "rejected" }).catch(e=>{}); await deleteDoc(doc(db, "match_invites", activeInviteId)).catch(e=>{}); }
    if (playerRole === "O" && roomCode !== "") { await deleteDoc(doc(db, "rooms", roomCode)); } roomCode = ""; playerRole = "";
};

// ⭐ RECEIVE MATCH INVITE ⭐
let currentIncomingInviteId = ""; let inviteTimerInterval = null;
function listenForInvites() {
    const q = query(collection(db, "match_invites"), where("toUID", "==", myUID), where("status", "==", "pending"));
    onSnapshot(q, (snap) => {
        snap.docChanges().forEach(change => {
            if (change.type === "added") {
                const data = change.doc.data(); currentIncomingInviteId = change.doc.id;
                if(isOnline || gameDiv.style.display === 'flex') { updateDoc(doc(db, "match_invites", currentIncomingInviteId), { status: "rejected" }); return; }
                document.getElementById('challengerNameDisplay').innerText = data.fromName; document.getElementById('incomingInviteModal').style.display = 'flex';
                const bar = document.getElementById('inviteTimerBar'); bar.style.width = '100%'; let timeLeft = 5000; clearInterval(inviteTimerInterval);
                inviteTimerInterval = setInterval(() => {
                    timeLeft -= 50; bar.style.width = (timeLeft / 5000 * 100) + '%';
                    if(timeLeft <= 0) { clearInterval(inviteTimerInterval); document.getElementById('incomingInviteModal').style.display = 'none'; updateDoc(doc(db, "match_invites", currentIncomingInviteId), { status: "timeout" }).catch(e=>{}); }
                }, 50);

                document.getElementById('acceptInviteBtn').onclick = async () => {
                    menuClickSound(); clearInterval(inviteTimerInterval); document.getElementById('incomingInviteModal').style.display = 'none';
                    await updateDoc(doc(db, "match_invites", currentIncomingInviteId), { status: "accepted" }); roomCode = data.roomCode; playerRole = "X";
                    try {
                        if(!window.localStream) {
                            window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                            if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
                            if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
                            document.getElementById('micBtn').style.display = 'block'; document.getElementById('camBtn').style.display = 'block'; document.getElementById('localVideo').srcObject = window.localStream;
                        }
                    } catch(e) {}
                    await updateDoc(doc(db, "rooms", roomCode), { status: "playing" }); listenToRoom(); document.getElementById('friendsModal').style.display = 'none';
                };

                document.getElementById('rejectInviteBtn').onclick = async () => { menuClickSound(); clearInterval(inviteTimerInterval); document.getElementById('incomingInviteModal').style.display = 'none'; await updateDoc(doc(db, "match_invites", currentIncomingInviteId), { status: "rejected" }); };
            }
        });
    });
}

// ⭐ NEW: MATCHMAKING LOGIC (RANDOM) ⭐
window.matchmakingInterval = null;
document.getElementById('randomMatchBtn').onclick = async () => {
    menuClickSound(); document.getElementById('matchmakingModal').style.display = 'flex'; let timeLeft = 30; document.getElementById('matchmakingTimerDisplay').innerText = timeLeft;
    try {
        const q = query(collection(db, "rooms"), where("status", "==", "public_waiting")); const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const foundRoom = querySnapshot.docs[0]; roomCode = foundRoom.id; playerRole = "X";
            try {
                if(!window.localStream) {
                    window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
                    if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
                    document.getElementById('micBtn').style.display = 'block'; document.getElementById('camBtn').style.display = 'block'; document.getElementById('localVideo').srcObject = window.localStream;
                }
            } catch(e) {}
                        // ⭐ NAYA LOGIC: Apna UID chipka do taaki 3rd player na ghus paye
            await updateDoc(doc(db, "rooms", roomCode), { 
                status: "playing", 
                joinedBy: myUID 
            });
            listenToRoom(); 
        } else {
            roomCode = generateRoomCode() + "R"; playerRole = "O";
            try {
                if(!window.localStream) {
                    window.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                    if (window.localStream.getAudioTracks().length > 0) window.localStream.getAudioTracks()[0].enabled = false;
                    if (window.localStream.getVideoTracks().length > 0) window.localStream.getVideoTracks()[0].enabled = false; 
                    document.getElementById('micBtn').style.display = 'block'; document.getElementById('camBtn').style.display = 'block'; document.getElementById('localVideo').srcObject = window.localStream;
                }
            } catch(e) {}
            await setDoc(doc(db, "rooms", roomCode), { board: ["","","","","","","","",""], currentPlayer: "O", startingTurn: "O", status: "public_waiting", createdAt: serverTimestamp() });
            listenToRoom();
            if (window.matchmakingInterval) clearInterval(window.matchmakingInterval);
            window.matchmakingInterval = setInterval(async () => {
                timeLeft--; document.getElementById('matchmakingTimerDisplay').innerText = timeLeft;
                if (timeLeft <= 0) {
                    clearInterval(window.matchmakingInterval); document.getElementById('matchmakingModal').style.display = 'none'; showToast("No opponent found! Try again.");
                    if (playerRole === "O" && roomCode !== "") { await deleteDoc(doc(db, "rooms", roomCode)).catch(e=>{}); }
                    roomCode = ""; playerRole = ""; if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
                }
            }, 1000);
        }
    } catch (e) { console.log("Matchmaking Error:", e); showToast("Error starting matchmaking!"); document.getElementById('matchmakingModal').style.display = 'none'; }
};

document.getElementById('cancelMatchmakingBtn').onclick = async () => {
    menuClickSound(); if (window.matchmakingInterval) clearInterval(window.matchmakingInterval); document.getElementById('matchmakingModal').style.display = 'none';
    if (playerRole === "O" && roomCode !== "") { await deleteDoc(doc(db, "rooms", roomCode)).catch(e=>{}); } roomCode = ""; playerRole = ""; if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; }
};

backLobbyBtn.onclick = async ()=>{
  menuClickSound(); 
  isBlitzMode = false;
window.stopBlitzTimer();

  // 🌟 FIX: LOBBY ME AATE HI GLOBAL CANVAS CLEAR KARO 🌟
  const gCanvas = document.getElementById('globalFxCanvas');
  if(gCanvas) {
      const gCtx = gCanvas.getContext('2d');
      gCtx.clearRect(0,0,gCanvas.width, gCanvas.height);
      gCanvas.style.display = 'none';
  }
  const gFluid = document.getElementById('globalFluidWrapper');
  if(gFluid) gFluid.style.display = 'none';

  if (isOnline) { 
      try { await updateDoc(doc(db, "rooms", roomCode), { status: "disconnected" }); } catch(e) {}
      isOnline = false; if (unsubscribeRoom) { unsubscribeRoom(); unsubscribeRoom = null; } 
      try { if (playerRole === "O") await deleteDoc(doc(db, "rooms", roomCode)); } catch(e) {} 
      roomCode = ""; playerRole = ""; 
      if(window.pc){ window.pc.ontrack = null; window.pc.onicecandidate = null; window.pc.close(); window.pc=null; } 
      if(window.localStream){window.localStream.getTracks().forEach(t=>t.stop()); window.localStream=null;} 
      document.getElementById('micBtn').style.display='none'; document.getElementById('micBtn').innerHTML='🔇 Mic: OFF'; document.getElementById('micBtn').style.color='#ff0000'; document.getElementById('micBtn').style.borderColor='#ff0000'; document.getElementById('micBtn').style.boxShadow='0 0 10px #ff0000'; 
      document.getElementById('camBtn').style.display='none'; document.getElementById('camBtn').innerHTML='📷 Cam: OFF'; document.getElementById('camBtn').style.color='#ff0000'; document.getElementById('camBtn').style.borderColor='#ff0000'; document.getElementById('camBtn').style.boxShadow='0 0 10px #ff0000'; 
      document.getElementById('videoContainer').style.display='none'; document.getElementById('localVideo').srcObject = null; document.getElementById('remoteVideo').srcObject = null;
  }
    scoreO = 0; scoreX = 0; isLevelUpMode = false; isUltimateMode = false; levelUpMatchCount = 0; lobby.style.display='flex'; gameDiv.style.display='none'; document.getElementById('ultimateBoard').style.display='none'; board = ["","","","","","","","",""]; winningCombo = []; currentPlayer = "O"; difficultyDiv.style.display='none'; gameDiv.className = 'game-board ' + currentTheme; document.getElementById('resetModeScoreBtn').style.display = 'block'; 
    
  updateScoreboard(); updateLevelSystemInLobby(); updateMyPresence('online'); 
  if (currentTheme === 'dark') { moon.style.display = 'block'; starContainer.style.display = 'block'; } if (currentTheme === 'light') { sun.style.display = 'block'; }
  
      // ⭐ NAYA ADDITION 1: LOBBY RETURN REFRESH ⭐
      if (isLiveThemeActive) {
          window.activateLiveTheme();
      }
    };
    
const settingBtn = document.getElementById('settingBtn'); const themeOptions = document.getElementById('themeOptions');
settingBtn.onclick = ()=> { settingClickSound(); themeOptions.style.display = themeOptions.style.display==='flex'?'none':'flex'; }
document.querySelectorAll('#themeOptions .theme-btn').forEach(btn => { btn.onclick = () => { settingClickSound(); const themeName = btn.textContent.includes('Love Mode') ? 'pink' : btn.textContent.toLowerCase().split(' ')[0]; setTheme(themeName); themeOptions.style.display = 'none'; document.getElementById('customPickerContainer').style.display = 'none'; }; });
document.getElementById('customToggleBtn').onclick = () => { settingClickSound(); const container = document.getElementById('customPickerContainer'); container.style.display = container.style.display === 'flex' ? 'none' : 'flex'; };

    // ⭐ OPEN LIVE THEME MODAL ⭐
document.getElementById('liveThemeTriggerBtn').onclick = () => { 
    settingClickSound(); 
    document.getElementById('liveThemeModal').style.display = 'flex'; 
    document.getElementById('themeOptions').style.display = 'none'; // Background wala theme menu hide karne ke liye
};

// ⭐ OPEN FULL PAGE CLICK EFFECTS ⭐
document.getElementById('clickEffectBtn').onclick = () => { 
    settingClickSound(); 
    document.getElementById('clickEffectPage').style.display = 'flex'; 
    document.getElementById('themeOptions').style.display = 'none'; 
    document.getElementById('pingDisplay').style.display = 'none';

    // 🌟 FIX: PREVIEW CANVAS WAPAS SET KARO TESTING KE LIYE 🌟
    fxCanvas = document.getElementById('fxCanvasLayer');
    fxCtx = fxCanvas.getContext('2d');
    fluidWrapper = document.getElementById('fluidWrapper');
    fluidCanvas = document.getElementById('fluidCanvasLayer');
    fluidCtx = fluidCanvas.getContext('2d');

    // 👇 NAYA FIX: ENGINE KO WAPAS TESTING BOARD PAR LAO 👇
    fxCanvas = document.getElementById('fxCanvasLayer');
    fxCtx = fxCanvas.getContext('2d');
    fluidWrapper = document.getElementById('fluidWrapper');
    fluidCanvas = document.getElementById('fluidCanvasLayer');
    fluidCtx = fluidCanvas.getContext('2d');
    if (activeSelection.startsWith('spacetime')) { initSpacetimeMeshLocked(); }
};

// 👇 NAYA LOGIC: Remove Effects Button ke liye 👇
document.getElementById('removeClickEffectBtn').onclick = () => {
    menuClickSound();
    
    // 1. Storage se effect uda do
    localStorage.removeItem('selected_fx');
    activeSelection = '';
    
    // 2. Jo effect select tha, usse highlight hata do
    document.querySelectorAll('.fx-btn').forEach(b => b.classList.remove('selected'));
    
    // 3. Testing arena aur container chhupa do
    const previewContainer = document.getElementById('inline-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // 4. Asli Game board ka canvas aur CSS clear kar do
    const gCanvas = document.getElementById('globalFxCanvas');
    if(gCanvas) {
        const gCtx = gCanvas.getContext('2d');
        gCtx.clearRect(0,0,gCanvas.width, gCanvas.height);
        gCanvas.style.display = 'none';
    }
    const gFluid = document.getElementById('globalFluidWrapper');
    if(gFluid) gFluid.style.display = 'none';

    const mainBoard = document.getElementById('board');
    if(mainBoard) mainBoard.classList.remove('board-canvas-wrapper', 'holo-mode', 'quantum-mode');

    // 5. Testing board saaf kar do
    if (typeof clearPreviewArena === 'function') clearPreviewArena();

    // 6. User ko confirmation toast dikhao
    if (typeof window.showToast === 'function') {
        window.showToast("🚫 All Click Effects Removed!");
    }
};
// 👆 YAHAN TAK 👆

// ⭐ CLOSE FULL PAGE CLICK EFFECTS AUR REFRESH ARENA ⭐
document.getElementById('closeClickEffectPageBtn').onclick = () => {
    menuClickSound(); // Close hone par sound effect
    document.getElementById('clickEffectPage').style.display = 'none';
    
    // NAYA LOGIC: X dabaate hi sab kuch wapas default reset ho jayega
    document.querySelectorAll('.fx-category').forEach(c => {
        c.classList.remove('active'); 
        if (c.querySelector('.fx-content')) {
            c.querySelector('.fx-content').style.maxHeight = null;
        }
    });
    
    const previewContainer = document.getElementById('inline-preview-container');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }
    
    // Board aur canvas ko saaf karne ka function call
    if (typeof clearPreviewArena === 'function') {
        clearPreviewArena();
    }
};

document.getElementById('applyCustomBtn').onclick = () => { settingClickSound(); const bgColor = document.getElementById('customBgColor').value; const textColor = document.getElementById('customTextColor').value; const customEmoji = document.getElementById('customRainEmoji').value || '✨'; const isRainEnabled = document.getElementById('enableCustomRain').checked; const isNeonEnabled = document.getElementById('enableCustomNeon').checked; setTheme('custom', bgColor, textColor, customEmoji, isRainEnabled, isNeonEnabled); themeOptions.style.display = 'none'; document.getElementById('customPickerContainer').style.display = 'none'; };
let customStyleTag = document.getElementById('customThemeStyle'); if (!customStyleTag) { customStyleTag = document.createElement('style'); customStyleTag.id = 'customThemeStyle'; document.head.appendChild(customStyleTag); }

// ⭐ PERSONAL THEME LOGIC (PHOTO / VIDEO PROCESSOR) ⭐
window.personalThemeBlobUrl = null;

document.getElementById('personalThemeBtn').onclick = () => {
    settingClickSound();
    document.getElementById('personalThemeInput').click(); 
};

document.getElementById('personalThemeInput').onchange = (e) => {
    const files = e.target.files;
    if (files.length === 0) return;
    const file = files[0]; // Sirf 1 file chahiye

    // 🛑 Size limit check (Max 30MB) - Game crash hone se bachayega
    const maxSizeInBytes = 30 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
        window.showToast("❌ File size bahut badi hai! 30MB se kam rakho bhai.");
        document.getElementById('personalThemeInput').value = '';
        return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
        window.showToast("❌ Sirf Photo ya Video allow hai bhai!");
        document.getElementById('personalThemeInput').value = '';
        return;
    }

    window.showToast(`✅ Loading Personal Theme...`);
    document.getElementById('themeOptions').style.display = 'none';
    
    applyPersonalTheme(file, isImage, isVideo);
    document.getElementById('personalThemeInput').value = '';
};

function applyPersonalTheme(file, isImage, isVideo) {
    setTheme('personal'); // Purana sab kuch clear karne ke liye
    
    document.getElementById('lobby').style.background = 'transparent';
    document.getElementById('game').style.background = 'transparent';

    if (window.personalThemeBlobUrl) {
        URL.revokeObjectURL(window.personalThemeBlobUrl);
    }
    window.personalThemeBlobUrl = URL.createObjectURL(file);

    if (isImage) {
        // 🖼️ PHOTO LOGIC (Bina Loop)
        document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url('${window.personalThemeBlobUrl}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.transition = "background-image 0.5s ease-in-out";
    } else if (isVideo) {
        // 🎞️ VIDEO LOGIC (Auto Loop, Muted, 75% Dark Overlay)
        document.body.style.backgroundImage = "none"; 
        
        let videoContainer = document.getElementById('personalVideoContainer');
        if (!videoContainer) {
            // Javascript se naya player banana
            videoContainer = document.createElement('div');
            videoContainer.id = 'personalVideoContainer';
            videoContainer.style.position = 'fixed';
            videoContainer.style.top = '0';
            videoContainer.style.left = '0';
            videoContainer.style.width = '100vw';
            videoContainer.style.height = '100vh';
            videoContainer.style.zIndex = '-1'; // Sabse peeche
            videoContainer.style.background = '#000';
            
            const videoEl = document.createElement('video');
            videoEl.id = 'personalVideoPlayer';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true; // Aawaz hamesha band
            videoEl.playsInline = true;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            
            const darkOverlay = document.createElement('div');
            darkOverlay.style.position = 'absolute';
            darkOverlay.style.top = '0';
            darkOverlay.style.left = '0';
            darkOverlay.style.width = '100%';
            darkOverlay.style.height = '100%';
            darkOverlay.style.background = 'rgba(0,0,0,0.75)'; // 75% Kala Sheesha
            
            videoContainer.appendChild(videoEl);
            videoContainer.appendChild(darkOverlay);
            document.body.appendChild(videoContainer);
        }
        
        document.getElementById('personalVideoContainer').style.display = 'block';
        const player = document.getElementById('personalVideoPlayer');
        player.src = window.personalThemeBlobUrl;
        player.play().catch(e => console.log("Video auto-play blocked"));
    }
}

function setTheme(t, bgColor = '', textColor = '', customEmoji = '', isRainEnabled = false, isNeonEnabled = false){
  // 🛑 FIX: Jab naya theme select ho, toh Live Theme Video hide kar do!
  document.getElementById('liveThemeVideoContainer').style.display = 'none';
  isLiveThemeActive = false;

  // 🛑 FIX: Agar koi aur theme laga, toh Personal Theme (Photo/Video) ko clear kar do
  if (t !== 'personal') {
      if (window.personalThemeBlobUrl) {
          URL.revokeObjectURL(window.personalThemeBlobUrl);
          window.personalThemeBlobUrl = null;
      }
      document.body.style.backgroundImage = "none";
      
      // Video chal rahi ho toh band karna
      const pvContainer = document.getElementById('personalVideoContainer');
      if (pvContainer) {
          const pPlayer = document.getElementById('personalVideoPlayer');
          if (pPlayer) { pPlayer.pause(); pPlayer.src = ""; }
          pvContainer.style.display = 'none';
      }

      // Lobby aur Game ke background ko wapas theek karna
      document.getElementById('lobby').style.background = ""; 
      document.getElementById('game').style.background = "";
  }

  currentTheme = t; document.body.className = t; lobby.className = 'lobby ' + t; gameDiv.className = 'game-board ' + t; 
  if (t === 'custom') {
      let customShadow = isNeonEnabled ? `2px 2px 5px rgba(0,0,0,0.9), 0 0 15px ${textColor}` : `2px 2px 5px rgba(0,0,0,0.9)`; let neonBox = isNeonEnabled ? `0 0 10px ${textColor}` : `none`; let hoverGlow = isNeonEnabled ? `0 0 20px ${textColor}` : `none`; let heavyGlow = isNeonEnabled ? `0 0 15px ${textColor}` : `none`;
      customStyleTag.innerHTML = `body.custom { background: ${bgColor} !important; color: ${textColor} !important; } .lobby.custom { background: ${bgColor} !important; color: ${textColor} !important; } .lobby.custom h1, .game-board.custom h1, .lobby.custom #liveOnlineText { color: ${textColor} !important; text-shadow: ${customShadow} !important; animation: none !important; } .lobby.custom .btn { border-color: ${textColor} !important; color: ${textColor} !important; background: rgba(0,0,0,0.7) !important; box-shadow: ${neonBox} !important;} .lobby.custom .btn:hover { background: ${textColor} !important; color: #000 !important; box-shadow: ${hoverGlow} !important; } .lobby.custom #settingBtn { background: ${textColor} !important; color: #000 !important; border: 2px solid #fff !important; box-shadow: ${neonBox} !important; text-shadow: none !important; } .lobby.custom #settingBtn:hover { background: #fff !important; color: #000 !important; box-shadow: ${hoverGlow} !important; } .game-board.custom #backLobbyBtn { border: 2px solid ${textColor} !important; color: ${textColor} !important; background: rgba(0,0,0,0.8) !important; text-shadow: none !important; box-shadow: ${neonBox} !important; } .game-board.custom #backLobbyBtn:hover { background: ${textColor} !important; color: #000 !important; box-shadow: ${heavyGlow} !important; } .game-board.custom #scoreboard, .game-board.custom #modeTitle, #level-info-text { color: ${textColor} !important; text-shadow: ${customShadow} !important; } .game-board.custom .cell { border-color: ${textColor} !important; background: rgba(0,0,0,0.6) !important; color: ${textColor} !important; text-shadow: ${customShadow} !important; box-shadow: ${isNeonEnabled ? `inset 0 0 10px ${textColor}` : 'none'} !important; animation: none !important; } .game-board.custom .board { border-color: ${textColor} !important; background: rgba(10,10,10,0.8) !important; box-shadow: ${heavyGlow} !important; } .custom .drop { color: ${textColor} !important; text-shadow: ${isNeonEnabled ? `0 0 5px ${textColor}` : 'none'} !important; } .custom .drop::before { content: '${customEmoji}' !important; }`;
  } else { customStyleTag.innerHTML = ''; }
  document.querySelectorAll('.btn').forEach(b=>{ b.style.color="";b.style.textShadow="";b.style.borderColor="";b.style.boxShadow=""; b.style.background=""; });
  if(t==='default'){ document.querySelectorAll('.btn').forEach(b=>{ b.style.color="#fff"; b.style.borderColor="#00ffff"; b.style.background="rgba(0, 0, 0, 0.7)"; }); backLobbyBtn.style.cssText = `position:absolute;top:20px;right:20px; border:2px solid #00ffff;color:#000;padding:10px 20px; border-radius:15px;cursor:pointer;transition:0.3s; background:linear-gradient(90deg,#00ffff,#ff00ff) !important; font-weight:bold;text-shadow:0 0 5px #ffffff !important; box-shadow:0 0 10px #00ffff, 0 0 20px #ff00ff; z-index: 15;`; document.getElementById('settingBtn').style.cssText = `position:absolute;top:20px;left:20px;border:2px solid #ffffff !important;color:#000000 !important; padding:8px 15px;border-radius:12px;cursor:pointer;transition:0.3s; background:#00ffff !important; font-weight:900 !important; text-shadow:none !important; display:flex;align-items:center;gap:5px; z-index: 100 !important; box-shadow: 0 0 15px rgba(0, 255, 255, 0.8) !important; opacity: 1 !important;`; } 
  stopRain(); stopNightSky(); stopDaySky();
  if (t === 'pink' || t === 'red' || t === 'yellow' || t === 'green' || (t === 'custom' && isRainEnabled)) { startRain(); } else if (t === 'dark') { startNightSky(); } else if (t === 'light') { startDaySky(); }
  updateLevelDisplay(); if (gameDiv.style.display === 'flex') { drawBoard(); }
}

function startDaySky() { sun.style.display = 'block'; } function stopDaySky() { sun.style.display = 'none'; } const numberOfStars = 100; function startNightSky() { stopNightSky(); moon.style.display = 'block'; starContainer.style.display = 'block'; for (let i = 0; i < numberOfStars; i++) { createStar(true); } } function createStar(isInitial = false) { const star = document.createElement('div'); star.classList.add('star'); const size = Math.random() * 2 + 1; const duration = Math.random() * 100 + 150; let delay = Math.random() * -duration; const left = Math.random() * 100; const top = Math.random() * 100; star.style.width = `${size}px`; star.style.height = `${size}px`; star.style.left = `${left}vw`; star.style.top = `${top}vh`; star.style.animationDuration = `${duration}s`; star.style.animationDelay = `${delay}s`; star.style.opacity = Math.random() * 0.7 + 0.3; star.addEventListener('animationend', () => { star.remove(); if (document.body.classList.contains('dark')) { createStar(false); } }); starContainer.appendChild(star); } function stopNightSky() { moon.style.display = 'none'; starContainer.style.display = 'none'; starContainer.innerHTML = ''; } const numberOfDrops = 50; function startRain() { stopRain(); for (let i = 0; i < numberOfDrops; i++) { createDrop(true); } } function createDrop(isInitial = false) { const drop = document.createElement('div'); drop.classList.add('drop'); const left = Math.random() * 100; const duration = Math.random() * 5 + 5; let delay = Math.random() * -10; if (isInitial) { delay = Math.random() * -duration; } else { delay = 0; drop.style.bottom = '100%'; } drop.style.left = `${left}vw`; drop.style.animationDuration = `${duration}s`; drop.style.animationDelay = `${delay}s`; const size = Math.random() * 0.5 + 1; drop.style.transform = `scale(${size})`; drop.addEventListener('animationend', () => { drop.remove(); const isCustomRain = document.body.classList.contains('custom') && document.getElementById('enableCustomRain').checked; if (document.body.classList.contains('pink') || document.body.classList.contains('red') || document.body.classList.contains('yellow') || document.body.classList.contains('green') || isCustomRain) { createDrop(false); } }); rainContainer.appendChild(drop); } function stopRain() { rainContainer.innerHTML = ''; }

function minimax(newBoard, player) { const human = 'O'; const ai = 'X'; const emptySpots = newBoard.map((v,i) => v === "" ? i : null).filter(x => x !== null); const winner = checkWinnerForMinimax(newBoard); if (winner === ai) return { score: 10 }; if (winner === human) return { score: -10 }; if (emptySpots.length === 0) return { score: 0 }; const moves = []; for (let i of emptySpots) { const move = {}; move.index = i; newBoard[i] = player; const result = minimax(newBoard, player === ai ? human : ai); move.score = result.score; newBoard[i] = ""; moves.push(move); } let bestScore; let bestMoves = []; if (player === ai) { bestScore = -Infinity; for (let i = 0; i < moves.length; i++) { if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMoves = [moves[i]]; } else if (moves[i].score === bestScore) { bestMoves.push(moves[i]); } } } else { bestScore = Infinity; for (let i = 0; i < moves.length; i++) { if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMoves = [moves[i]]; } else if (moves[i].score === bestScore) { bestMoves.push(moves[i]); } } } if (bestMoves.length > 1) { const randomIndex = Math.floor(Math.random() * bestMoves.length); return bestMoves[randomIndex]; } return bestMoves[0]; }
function checkWinnerForMinimax(currentBoard){ const winCombos=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for(const [a,b,c] of winCombos){ if(currentBoard[a] && currentBoard[a]===currentBoard[b] && currentBoard[a]===currentBoard[c]){ return currentBoard[a]; } } return null; }
function aiMove(){ let empty = board.map((v,i)=> v===""?i:null).filter(x=>x!==null); let move; if(aiLevel === 'ultrahard'){ const bestMove = minimax(board, 'X'); move = bestMove.index; } else if(aiLevel==='easy'){ move = empty[Math.floor(Math.random()*empty.length)]; } else{ for(let i of empty){ board[i]='X'; if(checkWinner()==='X'){ board[i]=''; move=i; break;} board[i]=''; } for(let i of empty){ board[i]='O'; if(checkWinner()==='O'){ board[i]=''; move=i; break;} board[i]=''; } if(move===undefined) move = empty[Math.floor(Math.random()*empty.length)]; } if (move !== undefined && board[move] === "") { makeMove(move); } else if (empty.length > 0 && move === undefined) { makeMove(empty[0]); } }

function drawBoard(){ 
  Array.from(boardDiv.querySelectorAll('.cell')).forEach(n=>n.remove()); 
  
      board.forEach((val,i)=>{ 
    const cell = document.createElement('div'); 
    cell.className='cell'; 
    // 👇 VFX UPGRADE: Asali dabbon mein CSS effects ka engine daal diya
    cell.innerHTML = `
        <div class="shine"></div>
        <div class="shine-rainbow"></div>
        <span class="cell-text">${val}</span>
    `;
    
    if (currentTheme !== 'custom') { 

        if(val==='O'){ cell.style.color='#00ffff'; cell.style.animation='neonBlue 1s infinite alternate'; } 
      else if(val==='X'){ cell.style.color='#ff0000'; cell.style.animation='neonRed 1s infinite alternate'; } 
      else cell.style.animation='none'; 
    } 
    if(winningCombo.includes(i)) cell.classList.add('winningCell'); 
    
    // ⭐ BLITZ LOGIC: Penalty Move chamkane ke liye
    if(i === lastForcedIndex) {
      cell.classList.add("forced-move");
      setTimeout(() => { cell.classList.remove("forced-move"); lastForcedIndex = -1; }, 500);
    }

    cell.onclick = (e) => handleCellClick(i, e);
boardDiv.appendChild(cell); 
  }); 
  boardDiv.appendChild(winningLine); 
}

function updateScoreboard(){ scoreboard.innerHTML = isOnline ? '<span style="color:#00ffff">O: ' + scoreO + '</span> &nbsp;|&nbsp; <span style="color:#ff0000">X: ' + scoreX + '</span><br><div style="font-size:16px; color:#ccc; text-shadow:none; margin-top:5px;">You are <b style="color:#fff; font-size:22px;">' + playerRole + '</b></div>' : (vsAI ? 'Player (O): '+scoreO+' | AI (X): '+scoreX : 'Player O: '+scoreO+' | Player X: '+scoreX); }
function checkWinner(){ const winCombos=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; for(const [a,b,c] of winCombos){ if(board[a] && board[a]===board[b] && board[a]===board[c]){ winningCombo=[a,b,c]; return board[a]; } } winningCombo=[]; return null; }
function drawWinningLine(combo){ if(!combo||combo.length!==3) return; const cells=Array.from(boardDiv.querySelectorAll('.cell')); const first=cells[combo[0]], last=cells[combo[2]]; const boardRect=boardDiv.getBoundingClientRect(); const r1=first.getBoundingClientRect(), r2=last.getBoundingClientRect(); const x1=r1.left+r1.width/2-boardRect.left, y1=r1.top+r1.height/2-boardRect.top; const x2=r2.left+r2.width/2-boardRect.left, y2=r2.top+r2.height/2-boardRect.top; const dx=x2-x1, dy=y2-y1; const length=Math.sqrt(dx*dx+dy*dy); const angle=Math.atan2(dy,dx)*(180/Math.PI); const mx=(x1+x2)/2, my=(y1+y2)/2; winningLine.style.width=(length+20)+'px'; winningLine.style.height='10px'; winningLine.style.left=(mx-(length+20)/2)+'px'; winningLine.style.top=(my-5)+'px'; winningLine.style.transform=`rotate(${angle}deg)`; winningLine.style.display='block'; }
function showPopup(winMsg, loseMsg){ popup.style.display='flex'; let contentHTML = `<div class="win-msg">${winMsg}</div>`; if (loseMsg && loseMsg !== "") { contentHTML += `<div class="lose-msg">${loseMsg}</div>`; } winnerText.innerHTML = contentHTML; }

function createParticle() { const particle = document.createElement('div'); particle.classList.add('particle'); const size = Math.random() * 4 + 1; const duration = Math.random() * 4 + 3; const left = Math.random() * 100; const top = Math.random() * 100; const delay = Math.random() * -duration; particle.style.width = `${size}px`; particle.style.height = `${size}px`; particle.style.left = `${left}vw`; particle.style.top = `${top}vh`; particle.style.animationDuration = `${duration}s`; particle.style.animationDelay = `${delay}s`; particle.style.opacity = Math.random() * 0.5 + 0.3; particle.addEventListener('animationend', () => { particle.remove(); createParticle(); }); particleContainer.appendChild(particle); }
function startLoadingScreen() { loadingOverlay.style.display = 'flex'; loadingOverlay.style.pointerEvents = 'auto'; requestAnimationFrame(() => { loadingOverlay.style.opacity = '1'; }); let currentProgress = 0; loadingBarFill.style.width = '0%'; loadingPercentage.textContent = '0%'; const interval = setInterval(() => { currentProgress += (UPDATE_INTERVAL / LOADING_DURATION) * 100; if (currentProgress >= 100) { currentProgress = 100; clearInterval(interval); } loadingBarFill.style.width = `${currentProgress}%`; loadingPercentage.textContent = `${Math.floor(currentProgress)}%`; if (currentProgress === 100) { setTimeout(() => { loadingOverlay.style.opacity = '0'; setTimeout(() => { loadingOverlay.style.display = 'none'; lobby.style.display='flex'; updateLevelSystemInLobby(); setTheme('default'); }, 1000); }, 500); } }, UPDATE_INTERVAL); }
function showSplash() { splashOverlay.style.display = 'flex'; splashLogo.style.transform = 'scale(0.9)'; for (let i = 0; i < PARTICLE_COUNT; i++) { createParticle(); } requestAnimationFrame(() => { splashLogo.style.transform = 'scale(1)'; }); setTimeout(() => { splashOverlay.style.opacity = '0'; splashLogo.style.transform = 'scale(1.2)'; setTimeout(() => { splashOverlay.style.display = 'none'; particleContainer.innerHTML = ''; lightStreak.style.opacity = 0; startLoadingScreen(); }, 1000); }, SPLASH_DURATION); }

function initializePlayerAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                myUID = userDoc.data().gameUID;
            } else {
                let newGameUID = Math.floor(10000 + Math.random() * 90000).toString();
                await setDoc(userDocRef, {
                    gameUID: newGameUID,
                    playerName: playerName,
                    level: playerLevel,
                    matchesWon: totalMatchesWon,
                    exp: currentExp,
                    createdAt: serverTimestamp()
                });
                myUID = newGameUID;
            }

            const myStatusRef = ref(rtdb, '/status/' + myUID);
            onValue(ref(rtdb, '.info/connected'), (snap) => {
                if (snap.val() === true) {
                    onDisconnect(myStatusRef).set("offline").then(() => {
                        updateMyPresence(gameDiv.style.display === 'flex' ? 'busy' : 'online');
                    });
                }
            });
            listenForInvites(); 
        } else {
            signInAnonymously(auth).catch((error) => console.log("Auth Error:", error));
        }
    });
}

window.addEventListener('load', () => { loadGameData(); showSplash(); initializePlayerAuth(); });
document.addEventListener('touchstart', resumeAudio, {passive:true}); document.addEventListener('click', resumeAudio, {passive:true});

let deferredPrompt;
const downloadAppBtn = document.getElementById('downloadAppBtn');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('Service Worker Registered!', reg);
    }).catch(err => console.log('SW Fail', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    downloadAppBtn.style.display = 'inline-block'; 
});

downloadAppBtn.addEventListener('click', async () => {
    menuClickSound();
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('VIP PWA Installed!');
            downloadAppBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

window.addEventListener('beforeunload', () => {
    if (isOnline && roomCode !== "") {
        updateDoc(doc(db, "rooms", roomCode), { status: "disconnected" });
    }
    updateMyPresence("offline");
});

// ⭐ CHAT SYSTEM WITH COOLDOWN & ENTER KEY ⭐
window.lastMsgTime = 0; 
let lastChatSentTime = 0; 
const CHAT_COOLDOWN = 2000; 

window.showChatBubble = function(text, senderRole) {
    if(senderRole !== playerRole) tapSound(); 
    const area = document.getElementById('chatDisplayArea');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (senderRole !== playerRole) { bubble.classList.add('enemy'); }
    bubble.innerText = (senderRole === playerRole ? "YOU: " : "FRIEND: ") + text;
    area.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 3000);
};

window.sendChat = async function(msgText) {
    if (!isOnline || roomCode === "") return;
    const now = Date.now();
    if (now - lastChatSentTime < CHAT_COOLDOWN) { showToast("Thoda aaram se bhai! ⏳"); return; }
    
    let msg = "";
    if (typeof msgText === 'string') { msg = msgText; } 
    else { msg = document.getElementById('chatInput').value.trim(); }
    if (msg === "") return;

    lastChatSentTime = now; 
    document.getElementById('chatInput').value = ""; 
    menuClickSound(); 

    const sendBtn = document.getElementById('sendChatBtn');
    if(sendBtn) {
        sendBtn.disabled = true; sendBtn.innerText = "⏳"; sendBtn.style.opacity = "0.5";
        setTimeout(() => { sendBtn.disabled = false; sendBtn.innerText = "Send"; sendBtn.style.opacity = "1"; }, CHAT_COOLDOWN);
    }

    try { await updateDoc(doc(db, "rooms", roomCode), { lastMessage: { text: msg, sender: playerRole, time: Date.now() } }); } catch(e) { console.log("Chat Error:", e); }
};

const chatInputBox = document.getElementById('chatInput');
if(chatInputBox) { chatInputBox.addEventListener("keypress", function(event) { if (event.key === "Enter") { event.preventDefault(); window.sendChat(); } }); }
document.getElementById('sendChatBtn').onclick = () => window.sendChat();

// ⭐ NAYA ADDITION 2: SILENT AUTO-WEATHER REFRESHER (Har 15 Minute Mein) ⭐
setInterval(() => {
    if (isLiveThemeActive) {
        console.log("Background Check: Time & Weather update ho raha hai...");
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                    const data = await res.json();
                    
                    const wmoCode = data.current_weather.weathercode;
                    const weatherCondition = mapWeatherCode(wmoCode); 
                    const timeCondition = getTimeOfDay(); 
                    
                    // Chup-chaap nayi video chala do bina kisi Toast ya Popup ke
                    playWeatherVideo(weatherCondition, timeCondition);
                } catch(error) {
                    playWeatherVideo('cloudy', getTimeOfDay());
                }
            }, (error) => {
                playWeatherVideo('cloudy', getTimeOfDay());
            });
        } else {
            playWeatherVideo('cloudy', getTimeOfDay());
        }
    }
}, 15 * 60 * 1000); // 15 Minute (900,000 milliseconds)

// ⭐ PING SYSTEM LOGIC (SMART WI-FI/MOBILE SVG ICONS) ⭐
setInterval(() => {
    const pingBox = document.getElementById('pingDisplay');
    const pingText = document.getElementById('pingText');
    const pingIcon = document.getElementById('pingIcon');
    const lobbyDiv = document.getElementById('lobby');
    const gameDiv = document.getElementById('game');

    // 🎨 PRO SVG ICONS (Apne aap color change karenge)
    const wifiSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 2px currentColor);"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`;
    const cellularSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 2px currentColor);"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></svg>`;
    const warningSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 2px currentColor);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

        // 🛑 Kahan dikhana hai, kahan nahi
    const fxPage = document.getElementById('clickEffectPage');
    // Naya logic: Agar page 'none' nahi hai, matlab khula hai, toh ping uda do!
    if (fxPage && fxPage.style.display !== 'none') {
        pingBox.style.display = 'none'; return; 
    }

    if (lobbyDiv.style.display === 'none' && gameDiv.style.display === 'none') {
        pingBox.style.display = 'none'; return; 
    }

    if (gameDiv.style.display === 'flex' && !isOnline) {
        pingBox.style.display = 'none'; return;
    } else {
        pingBox.style.display = 'flex';
    }

    // 🛑 Agar internet band ho gaya
    if (!navigator.onLine) {
        pingBox.style.borderColor = "#ff0055"; pingBox.style.color = "#ff0055";
        pingBox.style.textShadow = "0 0 5px #ff0055"; pingBox.style.boxShadow = "0 0 10px rgba(255,0,85,0.5)";
        pingText.innerText = "999+ ms";
        pingIcon.innerHTML = warningSvg;
        return;
    }

    // 🔍 Wi-Fi ya Mobile Data (SMART DETECTION)
    let currentIcon = cellularSvg; // Default Mobile Data
    if (navigator.connection && navigator.connection.type === 'wifi') {
        currentIcon = wifiSvg; // Agar WiFi mila toh icon change
    }

    // Asli ping nikalna 
    let basePing = 40; 
    if (navigator.connection && navigator.connection.rtt) { basePing = navigator.connection.rtt; }
    
    let ping = basePing + Math.floor(Math.random() * 8) - 4;
    if (ping < 15) ping = 25; 
    
    if(ping >= 999) { pingText.innerText = "999+ ms"; } 
    else { pingText.innerText = ping + " ms"; }
    
    pingIcon.innerHTML = currentIcon; // Yahan Emoji ki jagah apna custom Logo update ho raha hai!

    // 🟢🟡🔴 PING COLORS
    if (ping < 250) { 
        pingBox.style.borderColor = "#00ff4d"; pingBox.style.color = "#00ff4d";
        pingBox.style.textShadow = "0 0 5px #00ff4d"; pingBox.style.boxShadow = "0 0 10px rgba(0,255,77,0.3)";
    } else if (ping < 600) { 
        pingBox.style.borderColor = "#ffcc00"; pingBox.style.color = "#ffcc00";
        pingBox.style.textShadow = "0 0 5px #ffcc00"; pingBox.style.boxShadow = "0 0 10px rgba(255,204,0,0.3)";
    } else { 
        pingBox.style.borderColor = "#ff0055"; pingBox.style.color = "#ff0055";
        pingBox.style.textShadow = "0 0 5px #ff0055"; pingBox.style.boxShadow = "0 0 10px rgba(255,0,85,0.3)";
    }
}, 1500);

// ⭐ SMART BATTERY MANAGEMENT SYSTEM (DYNAMIC BAR + SOUNDS) ⭐
let hasNotified15 = false;
let hasNotified5 = false;
let hasNotified95 = false;

if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
        function updateBatteryUI() {
            const level = Math.floor(battery.level * 100);
            const isCharging = battery.charging;

            const batteryText = document.getElementById('batteryText');
            const chargingIcon = document.getElementById('chargingIcon');
            const batteryBox = document.getElementById('lobbyBatteryDisplay');
            const batteryFill = document.getElementById('batteryFill'); // SVG ka andar wala danda

            if (batteryText) batteryText.innerText = level + "%";
            if (chargingIcon) chargingIcon.style.display = isCharging ? "inline" : "none";

            // 🔥 MASTER MAGIC: Battery ke dande ko real-time fill/empty karna (Max width 12 hoti hai)
            if (batteryFill) {
                const fillWidth = (level / 100) * 12;
                batteryFill.setAttribute('width', fillWidth);
            }

            // Level ke hisaab se border aur battery dono ka rang badalna
            if (batteryBox) {
                if (level <= 15) {
                    batteryBox.style.borderColor = "#ff0055"; // Red Alert
                    batteryBox.style.color = "#ff0055";
                    batteryBox.style.boxShadow = "0 0 10px rgba(255,0,85,0.5)";
                } else if (level <= 30) {
                    batteryBox.style.borderColor = "#ffcc00"; // Yellow Warning
                    batteryBox.style.color = "#ffcc00";
                    batteryBox.style.boxShadow = "0 0 10px rgba(255,204,0,0.4)";
                } else {
                    batteryBox.style.borderColor = "#00ffff"; // Cyan Normal
                    batteryBox.style.color = "#fff";
                    batteryBox.style.boxShadow = "0 0 10px rgba(0,255,255,0.2)";
                }
            }

            // 🛑 PROFESSIONAL NOTIFICATION THRESHOLDS LOGIC
            if (level <= 5) {
                if (!hasNotified5) {
                    beep(350, 0.12); setTimeout(() => beep(300, 0.15), 180);
                    window.showToast("⚠️ Critical Battery Status: Please connect a power source immediately.");
                    hasNotified5 = true;
                }
                hasNotified15 = true; 
                hasNotified95 = false;
            } 
            else if (level <= 15) {
                if (!hasNotified15) {
                    beep(420, 0.15); 
                    window.showToast("🪫 Low Battery Alert: Consider connecting a charger soon.");
                    hasNotified15 = true;
                }
                hasNotified5 = false;
                hasNotified95 = false;
            } 
            else if (level >= 95) {
                if (!hasNotified95 && isCharging) {
                    beep(600, 0.1); setTimeout(() => beep(800, 0.12), 120);
                    window.showToast("🔋 Battery Sufficiently Charged: You may disconnect the charger.");
                    hasNotified95 = true;
                }
                hasNotified15 = false;
                hasNotified5 = false;
            } 
            else {
                hasNotified15 = false;
                hasNotified5 = false;
                hasNotified95 = false;
            }
        }

        updateBatteryUI();
        battery.addEventListener('levelchange', updateBatteryUI);
        battery.addEventListener('chargingchange', updateBatteryUI);
    });
}

// ⭐ ULTIMATE TIC-TAC-TOE JAVASCRIPT LOGIC ⭐
function initUltimateGame(isReset = false) {
    if(!isReset) ultimateStartingTurn = 'O'; 
    currentPlayer = ultimateStartingTurn;
    ultimateActiveBoardIndex = -1;
    largeBoardState = Array(9).fill('');
    smallBoardsState = Array(9).fill(null).map(() => Array(9).fill(''));
    
    // Purani line chhupane ke liye
    const ultLine = document.getElementById('ultimate-winning-line');
    if(ultLine) ultLine.style.display = 'none';
    
    renderUltimateBoard();
}
function renderUltimateBoard() {
    const mainBoard = document.getElementById('ultimateBoard');
    // 👇 YAHAN CHANGE HAI - Pura khali karne ki jagah line ko wapas zinda kar rahe hain!
    mainBoard.innerHTML = '<div class="winning-line" id="ultimate-winning-line" style="display:none;"></div>';
    
    for (let l = 0; l < 9; l++) {

        const largeCell = document.createElement('div');
        largeCell.className = `large-cell ${largeBoardState[l] === '' && (ultimateActiveBoardIndex === -1 || ultimateActiveBoardIndex === l) ? 'active-target' : ''}`;
        if(largeBoardState[l] === 'O') largeCell.classList.add('won-o');
        else if(largeBoardState[l] === 'X') largeCell.classList.add('won-x');
        else if(largeBoardState[l] === 'draw') largeCell.classList.add('won-draw');
        largeCell.id = `large-${l}`;

        const smallBoard = document.createElement('div');
        smallBoard.className = 'small-board';

        for (let s = 0; s < 9; s++) {
            const smallCell = document.createElement('div');
            smallCell.className = 'small-cell';
            if(smallBoardsState[l][s] !== '') {
                smallCell.textContent = smallBoardsState[l][s];
                smallCell.classList.add(smallBoardsState[l][s] === 'O' ? 'player-o' : 'player-x');
                
                // Theme Logic Applier
                if(currentTheme !== 'custom') {
                    smallCell.style.color = smallBoardsState[l][s] === 'O' ? '#00ffff' : '#ff00ff';
                    smallCell.style.textShadow = smallBoardsState[l][s] === 'O' ? '0 0 5px #00ffff' : '0 0 5px #ff00ff';
                }
            }
            smallCell.onclick = () => handleUltimateMove(l, s);
            smallBoard.appendChild(smallCell);
        }
        largeCell.appendChild(smallBoard);
        mainBoard.appendChild(largeCell);
    }
}

function handleUltimateMove(largeIdx, smallIdx) {
    if(checkSectionWinner(largeBoardState, 'O') || checkSectionWinner(largeBoardState, 'X')) return; 
    if (ultimateActiveBoardIndex !== -1 && largeIdx !== ultimateActiveBoardIndex) return; 
    if (largeBoardState[largeIdx] !== '') return; 
    if (smallBoardsState[largeIdx][smallIdx] !== '') return; 

    // Play Sound
    if(currentPlayer === 'O') tapSound(); else aiMoveSound();

    smallBoardsState[largeIdx][smallIdx] = currentPlayer;
    
    // Check agar Chota Board Jeet Gaya
    if (checkSectionWinner(smallBoardsState[largeIdx], currentPlayer)) {
        largeBoardState[largeIdx] = currentPlayer;
        if(currentPlayer === 'O') winOSound(); else winXSound();
        
        // Check agar Pura Bada Game Jeet Gaya
        const winCombo = getUltimateWinningCombo(largeBoardState, currentPlayer);
        if (winCombo) {
            renderUltimateBoard();
            drawUltimateWinningLine(winCombo); // ⚡ LINE DRAW HOGI ⚡
            setTimeout(() => {
                handleWin(currentPlayer); 
            }, 600); // Popup aane se pehle 0.6 sec ka delay taaki line dikhe
            return;
        }
    } else if (smallBoardsState[largeIdx].every(cell => cell !== '')) {

        largeBoardState[largeIdx] = 'draw';
    }

    // Check agar Game Draw Ho Gaya
    if (largeBoardState.every(cell => cell !== '') && !checkSectionWinner(largeBoardState, 'O') && !checkSectionWinner(largeBoardState, 'X')) {
        renderUltimateBoard();
        handleDraw(); // Real draw popup
        return;
    }

    // Agla Target Board Set Karo
    if (largeBoardState[smallIdx] !== '') {
        ultimateActiveBoardIndex = -1; // FREE MOVE (Neon Glow on all remaining)
    } else {
        ultimateActiveBoardIndex = smallIdx; // Lock target
    }

    // Turn Palti karo
    currentPlayer = (currentPlayer === 'O') ? 'X' : 'O';
    renderUltimateBoard();
    updateScoreboard();
}

function checkSectionWinner(boardArr, player) {
    const winCombos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return winCombos.some(([a, b, c]) => boardArr[a] === player && boardArr[b] === player && boardArr[c] === player);
}

// Ye check karega ki kaun si line match hui
function getUltimateWinningCombo(boardArr, player) {
    const winCombos = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let combo of winCombos) {
        if (boardArr[combo[0]] === player && boardArr[combo[1]] === player && boardArr[combo[2]] === player) return combo;
    }
    return null;
}

// Ye BADE board par Neon Line draw karega
function drawUltimateWinningLine(combo) {
    if(!combo || combo.length !== 3) return;
    const ultBoard = document.getElementById('ultimateBoard');
    let line = document.getElementById('ultimate-winning-line');
    
    const cells = Array.from(ultBoard.querySelectorAll('.large-cell'));
    const first = cells[combo[0]], last = cells[combo[2]];
    const boardRect = ultBoard.getBoundingClientRect();
    const r1 = first.getBoundingClientRect(), r2 = last.getBoundingClientRect();
    
    const x1 = r1.left + r1.width/2 - boardRect.left, y1 = r1.top + r1.height/2 - boardRect.top;
    const x2 = r2.left + r2.width/2 - boardRect.left, y2 = r2.top + r2.height/2 - boardRect.top;
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    
    line.style.width = (length + 40) + 'px';
    line.style.height = '12px';
    line.style.left = (mx - (length + 40)/2) + 'px';
    line.style.top = (my - 6) + 'px';
    line.style.transform = `rotate(${angle}deg)`;
    line.style.display = 'block';
    line.style.zIndex = '25';
    // O aur X ke hisaab se line ka color aur glow badlega
    line.style.boxShadow = currentPlayer === 'O' ? '0 0 20px #00ffff, 0 0 40px #00ffff' : '0 0 20px #ff00ff, 0 0 40px #ff00ff';
    line.style.background = currentPlayer === 'O' ? '#00ffff' : '#ff00ff';
}
// ⭐=========================================⭐
// ⭐      THE CORE BLITZ TIMER ENGINE        ⭐
// ⭐=========================================⭐
window.startBlitzTimer = function() {
    window.stopBlitzTimer();
    blitzTimeLeft = BLITZ_MAX;
    document.body.classList.remove("panic-mode");
    updateBlitzUI();
    blitzInterval = setInterval(() => {
        if (popup.style.display === 'flex' || checkWinner() || !isBlitzMode) { window.stopBlitzTimer(); return; } 
        blitzTimeLeft -= 50;
        updateBlitzUI();
        if (blitzTimeLeft <= 0) {
            window.stopBlitzTimer();
            forceBlitzMove();
        }
    }, 50);
}

window.stopBlitzTimer = function() {
    clearInterval(blitzInterval);
    document.body.classList.remove("panic-mode");
}

function updateBlitzUI() {
    const bar = document.getElementById("blitzTimerBar");
    const txt = document.getElementById("blitzTimeText");
    if(!bar || !txt) return;
    let pct = (blitzTimeLeft / BLITZ_MAX) * 100;
    bar.style.width = pct + "%";
    txt.innerText = (blitzTimeLeft / 1000).toFixed(1) + "s";

    if (blitzTimeLeft > 1500) {
        bar.style.background = "#00ff4d"; bar.style.boxShadow = "0 0 10px #00ff4d"; txt.style.color = "#00ff4d";
        document.body.classList.remove("panic-mode");
    } else if (blitzTimeLeft > 500) {
        bar.style.background = "#ffcc00"; bar.style.boxShadow = "0 0 10px #ffcc00"; txt.style.color = "#ffcc00";
    } else {
        bar.style.background = "#ff0055"; bar.style.boxShadow = "0 0 15px #ff0055"; txt.style.color = "#ff0055";
        document.body.classList.add("panic-mode"); // 🚨 Trigger screen shake inside 0.5 seconds
    }
}

function forceBlitzMove() {
    if (!isBlitzMode || popup.style.display === 'flex') return;
    let emptySpots = board.map((v, i) => v === "" ? i : null).filter(x => x !== null);
    if (emptySpots.length > 0) {
        let randomIdx = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        window.showToast("⏳ TOO SLOW! Random Move!");
        lastForcedIndex = randomIdx;
        makeMove(randomIdx);
    }
}

    // --- 🎮 MASTER 44-FX DATABASE MAPS 🎮 ---
    const fxLibrary = [
        { id: 'spacetime', icon: '🌌', name: 'Spacetime Fabric', levels: ['Gravity Singularity (Pull)', 'Supernova Blast (Push)', 'Cyber Resonance (Waves)', 'Magnetic Vortex (Twist)'] },
        { id: 'cyberslash', icon: '⚔️', name: 'Cyber Slash Engine', levels: ['Energy Katana (Slice)', 'Double Cross X (Twin Cut)', 'Circular Saber (Orbit)', 'Dimension Split (Plasma)'] },
        { id: 'hud', icon: '📡', name: 'Cyberpunk HUD', levels: ['Target Lock (Rotating Rings)', 'Matrix Rain (Local Binary Code)', 'Tech Scanner (Data Reading)', 'Telemetry Stream (Floating Bits)'] },
        { id: 'fluid', icon: '🧪', name: 'Organic Fluid', levels: ['Mercury Splash (Liquid Metal)', 'Ferrofluid Spikes (Magnetic)', 'Radioactive Slime (Sticky Drip)', 'Lava Fusion (Merging Blobs)'] },
        { id: 'harmonics', icon: '🎸', name: 'Laser Harmonics', levels: ['Guitar Pluck (Edge Anchors)', 'Laser Spiderweb (Cell Interlinks)', 'Axis Cross Ray (Full Screen Ripple)', 'Geometric Polygon Echo (Rotating Shells)'] },
        { id: 'growth', icon: '🌿', name: 'Generative Growth', levels: ['Snowflake Lattice (Level 1)', 'Cyber Ivy (Level 2)', 'Sacred Spiro (Level 3)', 'Fractal Lightning (Level 4)'] },
        // 💎 ENGINE 7: 3D HOLO CARDS 💎
        { id: 'holo', icon: '💎', name: 'Holographic 3D Cards', levels: ['Classic Holo Foil (Silver)', 'Cosmic Super-Pop (Depth)', 'Iridescent Rainbow (Rare)', 'Cyber Edge Scan (Radar)'] },
        // 🦾 ENGINE 8: HARDWARE DOM GLITCH 🦾
        { id: 'domglitch', icon: '🦾', name: 'Hardware DOM Glitch', levels: ['Holographic Ghost Echo (Afterimage Waves)', 'Cyber Glitch Slice (Matrix Screen Tear)', 'Quantum Quadrant Blast (Corner Bullets)', 'Vector Frame Pulse (Expanding Grid Glow)'] },
        // 💥 ENGINE 9: ANIME IMPACT ENGINE 💥
        { id: 'impact', icon: '💥', name: 'Anime Impact Engine', levels: ['Manga Speed Lines (Radial Focus)', 'Kinetic Comic Burst (Sharp Star Mesh)', 'Chrono Screen Split (Plasma Slash)', 'Sub-Pixel Glitch Scan (Instant Grid Tear)'] },
        // 🚀 ENGINE 10: QUANTUM DIMENSIONAL MATRIX ENGINE 🚀
        { id: 'quantum', icon: '🚀', name: 'Quantum Matrix Fold', levels: ['Paradigm 1: Dimensional Matrix Fold (Board Warp)', 'Paradigm 2: Neural Wurm Synapse (Fluid Beams)', 'Paradigm 3: Voxel Infrastructure (Inward Forge)', 'Paradigm 4: Event Horizon Nova (Shockwave)'] }
    ];

    const container = document.getElementById('fxContainer');
    const portablePreview = document.getElementById('inline-preview-container');
    const previewBoard = document.getElementById('previewBoard');
    
        // Normal Canvas
    let fxCanvas = document.getElementById('fxCanvasLayer');
    let fxCtx = fxCanvas.getContext('2d');
    
    // Fluid Canvas (Engine 4)
    let fluidWrapper = document.getElementById('fluidWrapper');
    let fluidCanvas = document.getElementById('fluidCanvasLayer');
    let fluidCtx = fluidCanvas.getContext('2d');

    let activeSelection = localStorage.getItem('selected_fx') || '';
    let dummyBoardState = Array(9).fill('');
    let currentSignTracker = 'O';

    if (activeSelection.startsWith('spacetime')) { fxCanvas.style.zIndex = '15'; } 
    else { fxCanvas.style.zIndex = '30'; }

    // ==========================================================
    // ⭐ ENGINES 1 TO 6: MASTER LOGIC CLASSES (UNTOUCHED) ⭐
    // ==========================================================
    let activeForces = [];
    let meshGrid = []; 
    let gridCols = 0; let gridRows = 0;
    const GRID_SPACING = 15; 
    let activeGridColor = "rgba(0, 255, 255, 0.2)"; 

        function initSpacetimeMeshLocked() {
        meshGrid = [];
        activeForces = []; 
        let startX, endX, startY, endY;

        if (fxCanvas.id === 'globalFxCanvas') {
            // Asli Game Board ka size nikalo
            let activeBoard = document.getElementById('board');
            if (activeBoard.style.display === 'none') activeBoard = document.getElementById('ultimateBoard');
            const boardRect = activeBoard.getBoundingClientRect();
            
            const padding = 35; // Board se thoda bahar nikalne ke liye
            startX = boardRect.left - padding;
            endX = boardRect.right + padding;
            startY = boardRect.top - padding;
            endY = boardRect.bottom + padding;
        } else {
            // Testing Board ka limit
            const padding = 20; 
            startX = padding; endX = fxCanvas.width - padding;
            startY = padding; endY = fxCanvas.height - padding;
        }

        gridCols = Math.ceil((endX - startX) / GRID_SPACING);
        gridRows = Math.ceil((endY - startY) / GRID_SPACING);
        for(let r = 0; r < gridRows; r++) {
            for(let c = 0; c < gridCols; c++) {
                let x = startX + c * GRID_SPACING;
                let y = startY + r * GRID_SPACING;
                meshGrid.push({ ox: x, oy: y, x: x, y: y, vx: 0, vy: 0 });
            }
        }
    }

    initSpacetimeMeshLocked();

    class PhysicsForce {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.type = type;
            this.alpha = 1;
            this.power = type === 'resonance' ? 0 : 60; 
            this.radius = type === 'resonance' ? 10 : 160; 
        }
        update() {
            if (this.type === 'resonance') { this.radius += 5; this.alpha -= 0.03; } 
            else { this.power *= 0.90; this.alpha -= 0.03; }
        }
    }

    let activeSlashes = []; let activeSparks = [];
    class BladeSlash {
        constructor(startX, startY, endX, endY, color, width = 4) {
            this.sx = startX; this.sy = startY; this.ex = endX; this.ey = endY;
            this.color = color; this.alpha = 1; this.width = width; this.decay = 0.05; 
        }
        update() { this.alpha -= this.decay; if(this.width > 0.5) this.width -= 0.15; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.strokeStyle = "#ffffff"; fxCtx.lineWidth = this.width; fxCtx.lineCap = "round";
            fxCtx.beginPath(); fxCtx.moveTo(this.sx, this.sy); fxCtx.lineTo(this.ex, this.ey); fxCtx.stroke();
            fxCtx.strokeStyle = this.color; fxCtx.lineWidth = this.width * 2.5;
            fxCtx.beginPath(); fxCtx.moveTo(this.sx, this.sy); fxCtx.lineTo(this.ex, this.ey); fxCtx.stroke();
            fxCtx.restore();
        }
    }

    class EmberSpark {
        constructor(x, y, color, angle = null) {
            this.x = x; this.y = y; this.color = color; this.alpha = 1;
            this.size = Math.random() * 2 + 1; this.decay = Math.random() * 0.03 + 0.02;
            const moveAngle = angle !== null ? angle + (Math.random() * 0.6 - 0.3) : Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.vx = Math.cos(moveAngle) * speed; this.vy = Math.sin(moveAngle) * speed;
            this.gravity = 0.05; 
        }
        update() { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.alpha -= this.decay; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.fillStyle = this.color; fxCtx.fillRect(this.x, this.y, this.size, this.size);
            fxCtx.restore();
        }
    }

    let activeHudElements = [];
    class HudTarget {
        constructor(x, y, color) {
            this.cx = x; this.cy = y; this.color = color; this.alpha = 1;
            this.radius = 35; this.angle = 0;
            this.speed = 0.08; this.decay = 0.04;
        }
        update() { this.angle += this.speed; this.alpha -= this.decay; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.strokeStyle = this.color; fxCtx.lineWidth = 2;
            fxCtx.beginPath(); fxCtx.arc(this.cx, this.cy, this.radius, this.angle, this.angle + Math.PI/2); fxCtx.stroke();
            fxCtx.beginPath(); fxCtx.arc(this.cx, this.cy, this.radius, this.angle + Math.PI, this.angle + 3*Math.PI/2); fxCtx.stroke();
            fxCtx.fillStyle = this.color; fxCtx.fillRect(this.cx - 2, this.cy - 2, 4, 4);
            fxCtx.restore();
        }
    }

    class MatrixRain {
        constructor(rect, color) {
            this.rect = rect; this.color = color; this.alpha = 1; this.decay = 0.025;
            this.streams = [];
            for(let i=0; i<4; i++) {
                this.streams.push({
                    x: rect.left + 8 + i * 18, y: rect.top + Math.random() * 15,
                    speed: Math.random() * 3 + 2, char: Math.random() < 0.5 ? "0" : "1"
                });
            }
        }
        update() {
            this.alpha -= this.decay;
            this.streams.forEach(s => { s.y += s.speed; if(Math.random() < 0.2) s.char = Math.random() < 0.5 ? "0" : "1"; });
        }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.fillStyle = this.color; fxCtx.font = "bold 14px monospace";
            this.streams.forEach(s => { if(s.y < this.rect.bottom) { fxCtx.fillText(s.char, s.x, s.y); } });
            fxCtx.restore();
        }
    }

    class TechScanner {
        constructor(rect, color) {
            this.rect = rect; this.color = color; this.alpha = 1;
            this.y = rect.top; this.dir = 1; this.speed = 6; this.life = 0;
        }
        update() {
            this.y += this.speed * this.dir;
            if(this.y >= this.rect.bottom - 4) this.dir = -1; 
            this.life++;
            if(this.life > 25) this.alpha -= 0.1; 
        }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.fillStyle = this.color;
            fxCtx.fillRect(this.rect.left + 4, this.y, this.rect.width - 8, 3);
            fxCtx.fillStyle = this.color === '#00ffff' ? 'rgba(0,255,255,0.04)' : 'rgba(255,0,255,0.04)';
            fxCtx.fillRect(this.rect.left + 4, this.rect.top + 4, this.rect.width - 8, this.rect.height - 8);
            fxCtx.restore();
        }
    }

    class TelemetryData {
        constructor(x, y, color) {
            this.x = x + (Math.random() * 40 - 20); this.y = y + (Math.random() * 20 - 10);
            this.color = color; this.alpha = 1;
            this.vy = -(Math.random() * 1.5 + 1); this.decay = 0.03;
            const hexCodes = ["0x3E", "SYS_OK", "LN_TRC", "BIT_1", "0x99", "DATA_LK"];
            this.text = hexCodes[Math.floor(Math.random() * hexCodes.length)];
        }
        update() { this.y += this.vy; this.alpha -= this.decay; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.fillStyle = this.color; fxCtx.font = "bold 11px Courier New";
            fxCtx.fillText(this.text, this.x, this.y); fxCtx.restore();
        }
    }

    let liquidDrops = [];
    class LiquidBlob {
        constructor(x, y, color, type) {
            this.x = x; this.y = y; this.color = color; this.type = type; this.alpha = 1;
            this.radius = Math.random() * 10 + 12; this.decay = 0.02;
            const angle = Math.random() * Math.PI * 2;
            if (type === 'mercury') {
                const speed = Math.random() * 6 + 4;
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; this.gravity = 0.15; 
            }
            else if (type === 'ferro') {
                const speed = Math.random() * 9 + 5; 
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                this.gravity = 0; this.decay = 0.04;
            }
            else if (type === 'slime') {
                this.vx = Math.random() * 2 - 1; this.vy = Math.random() * 2 + 1; 
                this.gravity = 0.2; this.radius = Math.random() * 15 + 15; this.decay = 0.015;
            }
            else if (type === 'fusion') {
                const speed = Math.random() * 3 + 1;
                this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
                this.gravity = 0; this.radius = Math.random() * 20 + 20; this.decay = 0.01;
            }
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.gravity) this.vy += this.gravity;
            if (this.type === 'slime' || this.type === 'fusion') { this.vx *= 0.96; this.vy *= 0.96; }
            if (this.radius > 2) this.radius -= 0.3; else this.alpha = 0;
        }
        draw() {
            if (this.radius <= 1) return;
            fluidCtx.save(); fluidCtx.fillStyle = this.color;
            fluidCtx.beginPath(); fluidCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); fluidCtx.fill();
            fluidCtx.restore();
        }
    }

    let activeWaves = [];
    class GuitarString {
        constructor(p1, p2, color) {
            this.p1 = p1; this.p2 = p2; this.color = color; this.alpha = 1;
            this.amplitude = Math.random() * 25 + 15; this.frequency = Math.random() * 0.4 + 0.3;
            this.timePhase = 0; this.decay = 0.03; 
        }
        update() { this.timePhase += this.frequency; this.amplitude *= 0.93; this.alpha -= this.decay; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.strokeStyle = this.color; fxCtx.lineWidth = 2.5;
            fxCtx.beginPath(); fxCtx.moveTo(this.p1.x, this.p1.y);
            let midX = (this.p1.x + this.p2.x) / 2; let midY = (this.p1.y + this.p2.y) / 2;
            let dx = this.p2.x - this.p1.x; let dy = this.p2.y - this.p1.y;
            let len = Math.sqrt(dx*dx + dy*dy); let nx = -dy / len; let ny = dx / len; 
            let ctrlX = midX + nx * Math.sin(this.timePhase) * this.amplitude;
            let ctrlY = midY + ny * Math.sin(this.timePhase) * this.amplitude;
            fxCtx.quadraticCurveTo(ctrlX, ctrlY, this.p2.x, this.p2.y);
            fxCtx.stroke(); fxCtx.restore();
        }
    }

    class GeometricShell {
        constructor(x, y, color) {
            this.cx = x; this.cy = y; this.color = color; this.alpha = 1;
            this.size = 2; this.growth = 4.5; this.angle = Math.random() * Math.PI;
            this.rotSpeed = 0.04; this.sides = Math.random() < 0.5 ? 3 : 4; 
        }
        update() { this.size += this.growth; this.angle += this.rotSpeed; this.alpha -= 0.025; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.strokeStyle = this.color; fxCtx.lineWidth = 2;
            fxCtx.beginPath();
            for(let i=0; i<=this.sides; i++) {
                let a = this.angle + (i / this.sides) * Math.PI * 2;
                let px = this.cx + Math.cos(a) * this.size; let py = this.cy + Math.sin(a) * this.size;
                if(i === 0) fxCtx.moveTo(px, py); else fxCtx.lineTo(px, py);
            }
            fxCtx.stroke(); fxCtx.restore();
        }
    }

    let growingBranches = [];
    class GrowthSegment {
        constructor(x, y, angle, length, depth, maxDepth, color, type) {
            this.sx = x; this.sy = y; this.angle = angle; this.maxLength = length; this.currentLength = 0;
            this.depth = depth; this.maxDepth = maxDepth; this.color = color; this.type = type;
            this.speed = type === 'lightning' ? length : length * 0.15; 
            this.isDone = false; this.alpha = 1; this.hasBranched = false;
            this.ex = this.sx + Math.cos(this.angle) * this.maxLength;
            this.ey = this.sy + Math.sin(this.angle) * this.maxLength;
        }
        update() {
            if (!this.isDone) {
                this.currentLength += this.speed;
                if (this.currentLength >= this.maxLength) { this.currentLength = this.maxLength; this.isDone = true; }
            } else { this.alpha -= 0.02; }
        }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha; fxCtx.strokeStyle = this.color;
            fxCtx.lineWidth = Math.max(1, this.maxDepth - this.depth + 1) * 0.7; fxCtx.lineCap = "round";
            fxCtx.beginPath(); fxCtx.moveTo(this.sx, this.sy);
            let cx = this.sx + Math.cos(this.angle) * this.currentLength;
            let cy = this.sy + Math.sin(this.angle) * this.currentLength;
            fxCtx.lineTo(cx, cy); fxCtx.stroke();
            if (this.isDone && (this.type === 'crystal' || this.type === 'mandala')) {
                fxCtx.fillStyle = "#fff"; fxCtx.beginPath(); fxCtx.arc(this.ex, this.ey, 1.2, 0, Math.PI*2); fxCtx.fill();
            }
            fxCtx.restore();
        }
    }

    // 💥 ENGINE 9: ANIME IMPACT ENGINE VARIABLES 💥
    let animeActive = false;
    let animeTimer = 0;
    let animeMaxDuration = 12;
    let animeX = 0, animeY = 0, animeColor = "#00ffff";

    // 🚀 ENGINE 10: QUANTUM DIMENSIONAL MATRIX VARIABLES 🚀
    let quantumElements = [];

    class NeuralWurmPath {
        constructor(sx, sy, tx, ty, color) {
            this.sx = sx; this.sy = sy; this.tx = tx; this.ty = ty;
            this.color = color; this.alpha = 1;
            this.progress = 0; this.speed = 0.04;
            this.ctrlX = (this.sx + this.tx)/2 + (Math.random() * 120 - 60);
            this.ctrlY = (this.sy + this.ty)/2 + (Math.random() * 120 - 60);
        }
        update() {
            if(this.progress < 1) this.progress += this.speed;
            else this.alpha -= 0.03;
        }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.strokeStyle = this.color; fxCtx.lineWidth = 2.5; fxCtx.lineCap = "round";
            fxCtx.beginPath();
            fxCtx.moveTo(this.sx, this.sy);
            let t = Math.min(1, this.progress);
            let cx = (1-t)*(1-t)*this.sx + 2*(1-t)*t*this.ctrlX + t*t*this.tx;
            let cy = (1-t)*(1-t)*this.sy + 2*(1-t)*t*this.ctrlY + t*t*this.ty;
            fxCtx.quadraticCurveTo(this.sx + (this.ctrlX - this.sx)*t, this.sy + (this.ctrlY - this.sy)*t, cx, cy);
            fxCtx.stroke(); fxCtx.restore();
        }
    }

    class VoxelInfrastructure {
        constructor(tx, ty, color) {
            this.tx = tx; this.ty = ty; this.color = color; this.alpha = 0.1;
            this.size = Math.random() * 4 + 3;
            this.progress = 0; this.speed = Math.random() * 0.04 + 0.03;
            this.x = this.tx + (Math.random() * 40 - 20);
            this.y = -20; 
        }
        update() {
            this.progress += this.speed;
            if(this.alpha < 1 && this.progress < 0.8) this.alpha += 0.08;
            let t = this.progress;
            let ease = t * t * (3 - 2 * t);
            this.y = this.y + (this.ty - this.y) * ease;
            if(this.progress >= 1) this.alpha -= 0.1;
        }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.fillStyle = this.color;
            fxCtx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            fxCtx.restore();
        }
    }

    class HorizonWave {
        constructor(cx, cy, color) {
            this.cx = cx; this.cy = cy; this.color = color; this.alpha = 1;
            this.radius = 5; this.growth = 6;
        }
        update() { this.radius += this.growth; this.alpha -= 0.025; }
        draw() {
            fxCtx.save(); fxCtx.globalAlpha = this.alpha;
            fxCtx.strokeStyle = this.color; fxCtx.lineWidth = 3;
            fxCtx.beginPath(); fxCtx.arc(this.cx, this.cy, this.radius, 0, Math.PI*2); fxCtx.stroke();
            fxCtx.setLineDash([6, 12]);
            fxCtx.beginPath(); fxCtx.arc(this.cx, this.cy, this.radius * 0.8, 0, Math.PI*2); fxCtx.stroke();
            fxCtx.restore();
        }
    }

    // ==========================================================
    // ⭐ CENTRAL ANIMATION LOOP ⭐
    // ==========================================================
    function MasterVFXEngineLoop() {
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        fxCtx.globalCompositeOperation = "lighter"; 
        fluidCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
        fluidCtx.globalCompositeOperation = "source-over";

        if (activeSelection.startsWith('spacetime')) {
            fxCtx.strokeStyle = activeGridColor; fxCtx.lineWidth = 1;
            meshGrid.forEach(p => {
                p.vx += (p.ox - p.x) * 0.20; p.vy += (p.oy - p.y) * 0.20;
                activeForces.forEach(f => {
                    let dx = f.x - p.x; let dy = f.y - p.y;
                    let dist = Math.sqrt(dx*dx + dy*dy); if (dist < 1) dist = 1;
                    if (f.type === 'singularity' && dist < f.radius) {
                        let pull = (f.radius - dist) * (f.power * 0.008);
                        p.vx += (dx / dist) * pull; p.vy += (dy / dist) * pull;
                    } 
                    else if (f.type === 'supernova' && dist < f.radius) {
                        let push = (f.radius - dist) * (f.power * 0.012);
                        p.vx -= (dx / dist) * push; p.vy -= (dy / dist) * push;
                    }
                    else if (f.type === 'resonance') {
                        let waveFront = Math.abs(dist - f.radius);
                        if (waveFront < 25) {
                            let tf = (25 - waveFront) * f.alpha;
                            let waveD = Math.sin((dist - f.radius) * 0.2) * tf * 0.8;
                            p.vx += (dx / dist) * waveD; p.vy += (dy / dist) * waveD;
                        }
                    }
                    else if (f.type === 'vortex' && dist < f.radius) {
                        let twist = (f.radius - dist) * (f.power * 0.01);
                        p.vx += (-dy / dist) * twist; p.vy += (dx / dist) * twist;
                    }
                });
                p.vx *= 0.65; p.vy *= 0.65; p.x += p.vx; p.y += p.vy;
            });

            for(let r = 0; r < gridRows; r++) {
                fxCtx.beginPath();
                for(let c = 0; c < gridCols; c++) {
                    let n = meshGrid[r * gridCols + c]; if(!n) continue;
                    if(c === 0) fxCtx.moveTo(n.x, n.y); else fxCtx.lineTo(n.x, n.y);
                }
                fxCtx.stroke();
            }
            for(let c = 0; c < gridCols; c++) {
                fxCtx.beginPath();
                for(let r = 0; r < gridRows; r++) {
                    let n = meshGrid[r * gridCols + c]; if(!n) continue;
                    if(r === 0) fxCtx.moveTo(n.x, n.y); else fxCtx.lineTo(n.x, n.y);
                }
                fxCtx.stroke();
            }
            activeForces = activeForces.filter(f => { f.update(); return f.alpha > 0; });
        } 
        else if (activeSelection.startsWith('cyberslash')) {
            activeSlashes = activeSlashes.filter(slash => { if (slash.alpha <= 0) return false; slash.update(); slash.draw(); return true; });
            activeSparks = activeSparks.filter(spark => { if (spark.alpha <= 0) return false; spark.update(); spark.draw(); return true; });
        }
        else if (activeSelection.startsWith('hud')) {
            activeHudElements = activeHudElements.filter(el => { if (el.alpha <= 0) return false; el.update(); el.draw(); return true; });
        }
        else if (activeSelection.startsWith('fluid')) {
            liquidDrops = liquidDrops.filter(blob => { if (blob.alpha <= 0) return false; blob.update(); blob.draw(); return true; });
        }
        else if (activeSelection.startsWith('harmonics')) {
            activeWaves = activeWaves.filter(wave => { if (wave.alpha <= 0) return false; wave.update(); wave.draw(); return true; });
        }
        else if (activeSelection.startsWith('growth')) {
            let nextGeneration = [];
            growingBranches.forEach(seg => {
                seg.update(); seg.draw();
                if (seg.isDone && !seg.hasBranched && seg.depth < seg.maxDepth) {
                    seg.hasBranched = true;
                    if (seg.type === 'ivy') {
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle - 0.4, seg.maxLength * 0.75, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle + 0.4, seg.maxLength * 0.75, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                    }
                    else if (seg.type === 'crystal') {
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle - Math.PI/3, seg.maxLength * 0.6, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle + Math.PI/3, seg.maxLength * 0.6, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                        if (Math.random() < 0.4) { nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle, seg.maxLength * 0.6, seg.depth + 1, seg.maxDepth, seg.color, seg.type)); }
                    }
                    else if (seg.type === 'mandala') {
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle - 0.5, seg.maxLength * 0.82, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                        nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, seg.angle + 0.5, seg.maxLength * 0.82, seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                    }
                    else if (seg.type === 'lightning') {
                        let branchesCount = Math.random() < 0.3 ? 3 : 2;
                        for (let k = 0; k < branchesCount; k++) {
                            let randAngle = seg.angle + (Math.random() * 1.0 - 0.5);
                            nextGeneration.push(new GrowthSegment(seg.ex, seg.ey, randAngle, seg.maxLength * (Math.random() * 0.3 + 0.5), seg.depth + 1, seg.maxDepth, seg.color, seg.type));
                        }
                    }
                }
            });
            if (nextGeneration.length > 0) growingBranches = growingBranches.concat(nextGeneration);
            growingBranches = growingBranches.filter(seg => seg.alpha > 0);
        }
        // 💥 ENGINE 9: ANIME IMPACT DRAW LOOP RENDERING 💥
        else if (activeSelection.startsWith('impact')) {
            if (animeActive) {
                animeTimer--;
                let progress = (animeMaxDuration - animeTimer) / animeMaxDuration;
                let lvlMode = activeSelection.split('-')[1];

                fxCtx.save();
                
                if (lvlMode === '0') {
                    fxCtx.strokeStyle = animeColor;
                    fxCtx.globalAlpha = 1 - progress;
                    let lineCount = 45;
                    let outerRadius = Math.max(fxCanvas.width, fxCanvas.height);
                    for (let i = 0; i < lineCount; i++) {
                        let angle = (i / lineCount) * Math.PI * 2 + Math.random() * 0.1;
                        let startDist = outerRadius;
                        let endDist = 80 + (1 - progress) * 200 + Math.random() * 60;
                        let sx = animeX + Math.cos(angle) * startDist;
                        let sy = animeY + Math.sin(angle) * startDist;
                        let ex = animeX + Math.cos(angle) * endDist;
                        let ey = animeY + Math.sin(angle) * endDist;
                        fxCtx.beginPath(); fxCtx.lineWidth = Math.random() * 2 + 1;
                        fxCtx.moveTo(sx, sy); fxCtx.lineTo(ex, ey); fxCtx.stroke();
                    }
                } 
                else if (lvlMode === '1') {
                    fxCtx.fillStyle = animeColor;
                    fxCtx.globalAlpha = 1 - progress;
                    fxCtx.beginPath();
                    let spikes = 12;
                    let outerR = progress * 110;
                    let innerR = progress * 40;
                    for (let i = 0; i < spikes * 2; i++) {
                        let angle = (i / (spikes * 2)) * Math.PI * 2;
                        let r = (i % 2 === 0) ? outerR : innerR;
                        let px = animeX + Math.cos(angle) * r;
                        let py = animeY + Math.sin(angle) * r;
                        if (i === 0) fxCtx.moveTo(px, py); else fxCtx.lineTo(px, py);
                    }
                    fxCtx.closePath(); fxCtx.fill();
                }
                else if (lvlMode === '2') {
                    fxCtx.strokeStyle = "#ffffff"; fxCtx.lineWidth = (1 - progress) * 12;
                    fxCtx.shadowBlur = 20; fxCtx.shadowColor = animeColor;
                    fxCtx.beginPath();
                    fxCtx.moveTo(0, animeY); fxCtx.lineTo(fxCanvas.width, animeY);
                    fxCtx.stroke();
                    if (animeTimer === animeMaxDuration - 1) {
                        fxCtx.globalAlpha = 0.15; fxCtx.fillStyle = "#ffffff";
                        fxCtx.fillRect(0, 0, fxCanvas.width, fxCanvas.height);
                    }
                }
                else if (lvlMode === '3') {
                    fxCtx.fillStyle = animeColor;
                    fxCtx.globalAlpha = (1 - progress) * 0.8;
                    let barsCount = 5;
                    for (let i = 0; i < barsCount; i++) {
                        let barW = Math.random() * 140 + 60;
                        let barH = Math.random() * 8 + 4;
                        let bx = animeX - barW / 2 + (Math.random() * 60 - 30);
                        let by = animeY + (i * 15 - 35);
                        fxCtx.fillRect(bx, by, barW, barH);
                    }
                }

                fxCtx.restore();
                if (animeTimer <= 0) { animeActive = false; }
            }
        }
        // 🚀 ENGINE 10: QUANTUM MATRIX RENDERING LOOP 🚀
        else if (activeSelection.startsWith('quantum')) {
            quantumElements = quantumElements.filter(el => {
                if (el.alpha <= 0) return false;
                el.update(); el.draw();
                return true;
            });
        }

        requestAnimationFrame(MasterVFXEngineLoop);
    }
    MasterVFXEngineLoop();

function triggerHoloMatrixTilt(e, cell, sign) {
    if (!e) return; 
    const rect = cell.getBoundingClientRect();
    
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top; 
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    let mode = 'classic';
    if (activeSelection.endsWith('1')) mode = 'superpop';
    if (activeSelection.endsWith('2')) mode = 'rainbow';
    if (activeSelection.endsWith('3')) mode = 'cyberedge';
    
    let maxTilt = mode === 'superpop' ? 36 : 22;
    let textDepth = mode === 'superpop' ? 'translateZ(55px) scale(1.05)' : 'translateZ(32px) scale(0.95)';
    
    const tiltX = ((centerY - y) / centerY) * maxTilt;
    const tiltY = ((x - centerX) / centerX) * maxTilt;

    const activeShine = mode === 'rainbow' ? cell.querySelector('.shine-rainbow') : cell.querySelector('.shine');
    const inactiveShine = mode === 'rainbow' ? cell.querySelector('.shine') : cell.querySelector('.shine-rainbow');

    if(inactiveShine) inactiveShine.style.opacity = "0";

    // ⭐ FIX 1: Browser ko batana ki naya element animate karna hai (Reflow Trick)
    void cell.offsetWidth;

    if(activeShine) {
        activeShine.style.opacity = "1";
        activeShine.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }

    const textLayer = cell.querySelector('.cell-text');
    if(textLayer) textLayer.style.transform = textDepth;

    cell.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(12px) scale(1.06)`;
    
    if(mode === 'cyberedge') {
        cell.style.borderColor = sign === 'O' ? '#ff00ff' : '#00ffff'; 
        cell.style.boxShadow = sign === 'O' ? '0 15px 30px rgba(255,0,255,0.3)' : '0 15px 30px rgba(0,255,255,0.3)';
    } else {
        cell.style.borderColor = sign === 'O' ? '#00ffff' : '#ff00ff';
        cell.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
    }

    setTimeout(() => {
        cell.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0px) scale(1)`;
        
        // ⭐ FIX 2: CSS clear karna taaki Main Game Board ka default glow wapas aa sake
        if (cell.classList.contains('cell')) {
            cell.style.borderColor = ''; 
            cell.style.boxShadow = '';
        } else {
            cell.style.borderColor = '#1a1a3a'; 
            cell.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
        }
        
        if(activeShine) activeShine.style.opacity = "0";
        if(textLayer) textLayer.style.transform = 'translateZ(30px) scale(0.9)'; 
    }, 400);
}

    // ==========================================================
// 🎴 SMART INTERACTIVE ENGINE (REAL GAME + TESTING ARENA) 🎴
// ==========================================================
function triggerEffectLogic(cell, sign, e, targetBoard = previewBoard) {
    const cellRect = cell.getBoundingClientRect();
    const canvasRect = fxCanvas.getBoundingClientRect();
    const centerX = (cellRect.left + cellRect.width / 2) - canvasRect.left;
    const centerY = (cellRect.top + cellRect.height / 2) - canvasRect.top;
    const burstColor = sign === "O" ? "#00ffff" : "#ff00ff";

    // SMART RADAR: Pata karo ki asali board hai ya testing board
    const activeBoard = cell.closest('#board') || document.getElementById('previewBoard');

    if (activeSelection.startsWith('spacetime')) {
        activeGridColor = sign === "O" ? "rgba(0, 255, 255, 0.45)" : "rgba(255, 0, 255, 0.45)";
        let type = 'singularity';
        if (activeSelection.endsWith('1')) type = 'supernova';
        else if (activeSelection.endsWith('2')) type = 'resonance';
        else if (activeSelection.endsWith('3')) type = 'vortex';
        activeForces.push(new PhysicsForce(centerX, centerY, type));
    } 
    else if (activeSelection.startsWith('cyberslash')) {
        const offset = 35; 
        if (activeSelection.endsWith('0')) { 
            const angles = [
                {sx: centerX - offset, sy: centerY - offset, ex: centerX + offset, ey: centerY + offset, ang: Math.PI/4},
                {sx: centerX + offset, sy: centerY - offset, ex: centerX - offset, ey: centerY + offset, ang: 3*Math.PI/4}
            ];
            let cut = angles[Math.floor(Math.random() * angles.length)];
            activeSlashes.push(new BladeSlash(cut.sx, cut.sy, cut.ex, cut.ey, burstColor));
            for(let i=0; i<15; i++) {
                let px = cut.sx + (cut.ex - cut.sx) * Math.random(); let py = cut.sy + (cut.ey - cut.sy) * Math.random();
                activeSparks.push(new EmberSpark(px, py, burstColor, cut.ang + Math.PI/2));
            }
        } 
        else if (activeSelection.endsWith('1')) { 
            activeSlashes.push(new BladeSlash(centerX - offset, centerY - offset, centerX + offset, centerY + offset, burstColor));
            setTimeout(() => { activeSlashes.push(new BladeSlash(centerX + offset, centerY - offset, centerX - offset, centerY + offset, burstColor)); }, 80); 
            for(let i=0; i<25; i++) { activeSparks.push(new EmberSpark(centerX + (Math.random()*20-10), centerY + (Math.random()*20-10), burstColor)); }
        }
        else if (activeSelection.endsWith('2')) { 
            let steps = 16; let r = 30;
            for(let i=0; i<steps; i++) {
                let a1 = (i / steps) * Math.PI * 2; let a2 = ((i+1) / steps) * Math.PI * 2;
                let x1 = centerX + Math.cos(a1) * r; let y1 = centerY + Math.sin(a1) * r;
                let x2 = centerX + Math.cos(a2) * r; let y2 = centerY + Math.sin(a2) * r;
                setTimeout(() => {
                    activeSlashes.push(new BladeSlash(x1, y1, x2, y2, burstColor, 2));
                    activeSparks.push(new EmberSpark(x1, y1, burstColor, a1));
                }, i * 15);
            }
        }
        else if (activeSelection.endsWith('3')) { 
            activeSlashes.push(new BladeSlash(centerX, centerY - 45, centerX, centerY + 45, burstColor, 10));
            for(let i=0; i<25; i++) {
                let py = (centerY - 45) + Math.random() * 90;
                activeSparks.push(new EmberSpark(centerX, py, "#ffffff")); activeSparks.push(new EmberSpark(centerX, py, burstColor));
            }
        }
    }
    else if (activeSelection.startsWith('hud')) {
        const mappedRect = { left: cellRect.left - canvasRect.left, top: cellRect.top - canvasRect.top, right: cellRect.right - canvasRect.left, bottom: cellRect.bottom - canvasRect.top, width: cellRect.width, height: cellRect.height };
        if (activeSelection.endsWith('0')) { activeHudElements.push(new HudTarget(centerX, centerY, burstColor)); } 
        else if (activeSelection.endsWith('1')) { activeHudElements.push(new MatrixRain(mappedRect, burstColor)); }
        else if (activeSelection.endsWith('2')) { activeHudElements.push(new TechScanner(mappedRect, burstColor)); }
        else if (activeSelection.endsWith('3')) { for(let i=0; i<5; i++) { setTimeout(() => { activeHudElements.push(new TelemetryData(centerX, centerY, burstColor)); }, i * 100); } }
    }
    else if (activeSelection.startsWith('fluid')) {
        let type = 'mercury'; let count = 22;
        if (activeSelection.endsWith('1')) type = 'ferro'; else if (activeSelection.endsWith('2')) type = 'slime'; else if (activeSelection.endsWith('3')) { type = 'fusion'; count = 8; }
        for (let i = 0; i < count; i++) { liquidDrops.push(new LiquidBlob(centerX, centerY, burstColor, type)); }
    }
    else if (activeSelection.startsWith('harmonics')) {
        const boardRect = activeBoard.getBoundingClientRect();
        const bLeft = boardRect.left - canvasRect.left; const bRight = boardRect.right - canvasRect.left;
        const bTop = boardRect.top - canvasRect.top; const bBottom = boardRect.bottom - canvasRect.top;
        if (activeSelection.endsWith('0')) { 
            const anchors = [ {x: bLeft, y: bTop}, {x: bRight, y: bTop}, {x: bRight, y: bBottom}, {x: bLeft, y: bBottom}, {x: (bLeft+bRight)/2, y: bTop}, {x: (bLeft+bRight)/2, y: bBottom} ];
            anchors.forEach(anc => { activeWaves.push(new GuitarString({x: centerX, y: centerY}, anc, burstColor)); });
        }
        else if (activeSelection.endsWith('1')) { 
            const cells = Array.from(activeBoard.querySelectorAll('.cell, .preview-cell'));
            cells.forEach(c => {
                const cRect = c.getBoundingClientRect(); const cX = (cRect.left + cRect.width/2) - canvasRect.left; const cY = (cRect.top + cRect.height/2) - canvasRect.top;
                if (Math.abs(cX - centerX) > 5 || Math.abs(cY - centerY) > 5) { activeWaves.push(new GuitarString({x: centerX, y: centerY}, {x: cX, y: cY}, burstColor)); }
            });
        }
        else if (activeSelection.endsWith('2')) { 
            activeWaves.push(new GuitarString({x: 0, y: centerY}, {x: fxCanvas.width, y: centerY}, burstColor));
            activeWaves.push(new GuitarString({x: centerX, y: 0}, {x: centerX, y: fxCanvas.height}, burstColor));
        }
        else if (activeSelection.endsWith('3')) { 
            activeWaves.push(new GeometricShell(centerX, centerY, burstColor));
            setTimeout(() => activeWaves.push(new GeometricShell(centerX, centerY, burstColor)), 140);
            setTimeout(() => activeWaves.push(new GeometricShell(centerX, centerY, burstColor)), 280);
        }
    }
    else if (activeSelection.startsWith('growth')) {
        if (activeSelection.endsWith('0')) {
            for (let i = 0; i < 6; i++) { let baseAngle = (i / 6) * Math.PI * 2; growingBranches.push(new GrowthSegment(centerX, centerY, baseAngle, 30, 1, 4, burstColor, 'crystal')); }
        }
        else if (activeSelection.endsWith('1')) {
            for (let i = 0; i < 3; i++) { let baseAngle = (i / 3) * Math.PI * 2 + Math.random(); growingBranches.push(new GrowthSegment(centerX, centerY, baseAngle, 25, 1, 5, burstColor, 'ivy')); }
        }
        else if (activeSelection.endsWith('2')) {
            let shellCount = 6;
            for (let i = 0; i < shellCount; i++) { let baseAngle = (i / shellCount) * Math.PI * 2; growingBranches.push(new GrowthSegment(centerX, centerY, baseAngle, 38, 1, 4, burstColor, 'mandala')); }
        }
        else if (activeSelection.endsWith('3')) {
            for (let i = 0; i < 4; i++) { let baseAngle = (i / 4) * Math.PI * 2 + (Math.random() * 0.4 - 0.2); growingBranches.push(new GrowthSegment(centerX, centerY, baseAngle, 25, 1, 5, burstColor, 'lightning')); }
        }
    }
    else if (activeSelection.startsWith('holo')) {
        triggerHoloMatrixTilt(e, cell, sign);
    }
    else if (activeSelection.startsWith('domglitch')) {
        if (activeSelection.endsWith('0')) {
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    let ghost = document.createElement('div');
                    ghost.className = 'ghost-echo';
                    ghost.innerText = sign;
                    ghost.style.color = burstColor;
                    ghost.style.textShadow = `0 0 15px ${burstColor}`;
                    cell.appendChild(ghost);
                    ghost.addEventListener('animationend', () => ghost.remove());
                }, i * 80);
            }
        }
        else if (activeSelection.endsWith('1')) {
            const textCore = cell.querySelector('.cell-text');
            if(textCore) {
                textCore.classList.add('glitch-active');
                setTimeout(() => textCore.classList.remove('glitch-active'), 250);
            }
        }
        else if (activeSelection.endsWith('2')) {
            const directions = [
                {x: '-45px', y: '-45px'}, {x: '45px', y: '-45px'},
                {x: '-45px', y: '45px'},  {x: '45px', y: '45px'}
            ];
            directions.forEach(dir => {
                let chunk = document.createElement('div');
                chunk.className = 'quadrant-chunk';
                chunk.style.backgroundColor = burstColor;
                chunk.style.boxShadow = `0 0 10px ${burstColor}`;
                chunk.style.setProperty('--mx', dir.x);
                chunk.style.setProperty('--my', dir.y);
                cell.appendChild(chunk);
                chunk.addEventListener('animationend', () => chunk.remove());
            });
        }
        else if (activeSelection.endsWith('3')) {
            let frame = document.createElement('div');
            frame.className = 'laser-frame-pulse';
            frame.style.setProperty('--laser-color', burstColor);
            activeBoard.appendChild(frame); // Asali board mein laser aayega ab
            frame.addEventListener('animationend', () => frame.remove());
        }
    }
    else if (activeSelection.startsWith('impact')) {
        animeX = centerX;
        animeY = centerY;
        animeColor = burstColor;
        animeTimer = animeMaxDuration;
        animeActive = true;
    }
    else if (activeSelection.startsWith('quantum')) {
        const bRect = activeBoard.getBoundingClientRect();
        const bCenterX = bRect.left + bRect.width / 2;
        const bCenterY = bRect.top + bRect.height / 2;

        let offsetFactorX = ((cellRect.left + cellRect.width/2) - bCenterX) / (bRect.width / 2);
        let offsetFactorY = ((cellRect.top + cellRect.height/2) - bCenterY) / (bRect.height / 2);
        
        let rotX = -offsetFactorY * 26;
        let rotY = offsetFactorX * 26;

        activeBoard.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(20px)`;
        setTimeout(() => {
            activeBoard.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0px)`;
        }, 550);

        if (activeSelection.endsWith('0')) {
            Array.from(activeBoard.querySelectorAll('.cell, .preview-cell')).forEach(c => {
                let r = c.getBoundingClientRect();
                let cx = (r.left + r.width/2) - canvasRect.left;
                let cy = (r.top + r.height/2) - canvasRect.top;
                if (Math.abs(cx - centerX) > 5 || Math.abs(cy - centerY) > 5) {
                    quantumElements.push(new NeuralWurmPath(centerX, centerY, cx, cy, burstColor));
                }
            });
        }
        else if (activeSelection.endsWith('1')) {
            let beamCount = 8;
            for (let i = 0; i < beamCount; i++) {
                let angle = (i / beamCount) * Math.PI * 2 + (Math.random() * 0.5);
                let distance = Math.random() * 100 + 80;
                let tx = centerX + Math.cos(angle) * distance;
                let ty = centerY + Math.sin(angle) * distance;
                let fluidBeam = new NeuralWurmPath(centerX, centerY, tx, ty, burstColor);
                fluidBeam.speed = 0.025; 
                quantumElements.push(fluidBeam);
            }
        }
        else if (activeSelection.endsWith('2')) {
            for (let i = 0; i < 35; i++) {
                quantumElements.push(new VoxelInfrastructure(centerX + (Math.random()*40-20), centerY + (Math.random()*40-20), burstColor));
            }
        }
        else if (activeSelection.endsWith('3')) {
            quantumElements.push(new HorizonWave(centerX, centerY, burstColor));
            setTimeout(() => quantumElements.push(new HorizonWave(centerX, centerY, "#ffffff")), 120);
        }
    }
}

    function buildTestingArenaBoard() {
        previewBoard.innerHTML = "";
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'preview-cell';
            
            cell.innerHTML = `
                <div class="shine"></div>
                <div class="shine-rainbow"></div>
                <span class="cell-text">${dummyBoardState[i]}</span>
            `; 
            
            if(dummyBoardState[i]==='O') cell.classList.add('o-sign');
            if(dummyBoardState[i]==='X') cell.classList.add('x-sign');

            cell.onclick = (e) => {
                if(dummyBoardState[i] !== '') {
                    if(activeSelection.startsWith('holo')) triggerHoloMatrixTilt(e, cell, dummyBoardState[i]);
                    return; 
                }
                dummyBoardState[i] = currentSignTracker;
                cell.querySelector('.cell-text').innerText = currentSignTracker;
                cell.classList.add(currentSignTracker === 'O' ? 'o-sign' : 'x-sign');
                
                triggerEffectLogic(cell, currentSignTracker, e);
                currentSignTracker = currentSignTracker === 'O' ? 'X' : 'O';
            };
            previewBoard.appendChild(cell);
        }
    }

    function clearPreviewArena() {
        dummyBoardState = Array(9).fill(''); 
        currentSignTracker = 'O'; 
        
        activeForces = []; activeSlashes = []; activeSparks = []; 
        activeHudElements = []; liquidDrops = []; activeWaves = []; growingBranches = [];
        animeActive = false; animeTimer = 0; 
        
        // Reset Engine 10 State
        quantumElements = [];
        previewBoard.style.transform = 'none';
        
        if(fxCtx) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        if(fluidCtx) fluidCtx.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);

        buildTestingArenaBoard(); 
    }

    // ==========================================================
    // 🧱 UI GENERATOR & INLINE PREVIEW MOVER LOGIC 🧱
    // ==========================================================
    function buildConfigurationMenuPanel() {
        fxLibrary.forEach((category, catIndex) => {
            const card = document.createElement('div');
            card.className = 'fx-category';

            const header = document.createElement('div');
            header.className = 'fx-header';
            header.innerHTML = `<div class="fx-title"><span class="fx-icon">${category.icon}</span> ${category.name}</div><span class="arrow">▼</span>`;

            const content = document.createElement('div');
            content.className = 'fx-content';
            
            const inner = document.createElement('div');
            inner.className = 'fx-content-inner';

            category.levels.forEach((lvl, lvlIdx) => {
                const btnId = `${category.id}-${lvlIdx}`;
                const btn = document.createElement('button');
                btn.className = `fx-btn ${activeSelection === btnId ? 'selected' : ''}`;
                btn.innerText = lvl;

                btn.onclick = (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.fx-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    activeSelection = btnId;
                    
                    localStorage.setItem('selected_fx', activeSelection);
                    inner.appendChild(portablePreview);
                    portablePreview.style.display = 'flex';
                    
                    // 🌟 Z-INDEX, CANVAS & CSS TOGGLE LOGIC 🌟
                    previewBoard.classList.remove('solid-boxes', 'holo-mode', 'quantum-mode'); // Added quantum-mode clear to not break 1 to 9
                    
                    if(activeSelection.startsWith('spacetime')) { 
                        fxCanvas.style.zIndex = '15'; 
                        fluidWrapper.style.display = 'none';
                        setTimeout(() => initSpacetimeMeshLocked(), 350); 
                    } else if (activeSelection.startsWith('fluid')) {
                        fxCanvas.style.zIndex = '30'; 
                        fluidWrapper.style.display = 'block'; 
                    } else if (activeSelection.startsWith('growth')) {
                        fxCanvas.style.zIndex = '15'; 
                        fluidWrapper.style.display = 'none';
                        previewBoard.classList.add('solid-boxes');
                    } else if (activeSelection.startsWith('holo')) {
                        fxCanvas.style.zIndex = '15'; 
                        fluidWrapper.style.display = 'none';
                        previewBoard.classList.add('holo-mode'); 
                    } else if (activeSelection.startsWith('domglitch')) {
                        fxCanvas.style.zIndex = '15'; 
                        fluidWrapper.style.display = 'none';
                    } else if (activeSelection.startsWith('impact')) {
                        fxCanvas.style.zIndex = '30'; 
                        fluidWrapper.style.display = 'none';
                    } else if (activeSelection.startsWith('quantum')) {
                        fxCanvas.style.zIndex = '30'; 
                        fluidWrapper.style.display = 'none';
                        previewBoard.classList.add('quantum-mode'); // Applied Engine 10 board css
                    } else {
                        fxCanvas.style.zIndex = '30'; 
                        fluidWrapper.style.display = 'none';
                    }
                    
                    clearPreviewArena(); 
                    content.style.maxHeight = content.scrollHeight + "px";
                    setTimeout(() => { portablePreview.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
                };
                inner.appendChild(btn);
            });

            content.appendChild(inner); 
            card.appendChild(header); 
            card.appendChild(content);
            container.appendChild(card);

            header.onclick = () => {
                const isAct = card.classList.contains('active');
                document.querySelectorAll('.fx-category').forEach(c => {
                    c.classList.remove('active'); 
                    c.querySelector('.fx-content').style.maxHeight = null;
                });
                if (!isAct) {
                    card.classList.add('active'); 
                    setTimeout(() => { content.style.maxHeight = content.scrollHeight + "px"; }, 10);
                }
            };
        });
    }

    function showApplyConfirm() {
        const selectedBtn = document.querySelector('.fx-btn.selected');
        if (selectedBtn) { document.getElementById('confirmEffectName').innerText = selectedBtn.innerText; }
        document.getElementById('applyConfirmModal').style.display = 'flex';
    }

    function closeApplyConfirm() { document.getElementById('applyConfirmModal').style.display = 'none'; }
    
    function confirmApplyEffect() {
        menuClickSound(); // Click sound aaye
        document.getElementById('applyConfirmModal').style.display = 'none'; // Modal band karo
        
        // 1. Board aur test arena saaf karo
        if (typeof clearPreviewArena === 'function') { clearPreviewArena(); }
        
        // 2. Testing dabba chhupao
        const previewContainer = document.getElementById('inline-preview-container');
        if (previewContainer) { previewContainer.style.display = 'none'; }
        
        // 3. Khule hue options (menu) wapas sikud (collapse) do
        document.querySelectorAll('.fx-category').forEach(c => {
            c.classList.remove('active'); 
            if (c.querySelector('.fx-content')) { c.querySelector('.fx-content').style.maxHeight = null; }
        });

        // 🚨 Yahan se clickEffectPage.style.display = 'none' HATA DIYA GAYA HAI 🚨
        
        // 4. Apna VIP toast dikhao! 😎
        if (typeof window.showToast === 'function') {
            window.showToast("🎉 Effect Applied Successfully!");
        }
    }

    if (activeSelection.startsWith('fluid')) fluidWrapper.style.display = 'block';
    if (activeSelection.startsWith('growth')) previewBoard.classList.add('solid-boxes');
    if (activeSelection.startsWith('holo')) previewBoard.classList.add('holo-mode');
    if (activeSelection.startsWith('quantum')) previewBoard.classList.add('quantum-mode');

    buildConfigurationMenuPanel();
    buildTestingArenaBoard();
// ⭐ FIX FOR HTML BUTTONS (Making them Global) ⭐
window.clearPreviewArena = clearPreviewArena;
window.showApplyConfirm = showApplyConfirm;
window.closeApplyConfirm = closeApplyConfirm;
window.confirmApplyEffect = confirmApplyEffect;

// ⭐ ASALI GAME KA VFX LAUNCHER ⭐
window.triggerRealGameEffect = function(cell, sign, e) {
    let selectedFx = localStorage.getItem('selected_fx');
    if(!selectedFx) return; // Agar koi effect nahi chuna, toh chup chap wapas jao

    // 1. Kanch ko Poori Screen (Global) par set karo
    fxCanvas = document.getElementById('globalFxCanvas');
    fxCtx = fxCanvas.getContext('2d');
    fluidWrapper = document.getElementById('globalFluidWrapper');
    fluidCanvas = document.getElementById('globalFluidCanvas');
    fluidCtx = fluidCanvas.getContext('2d');

    // 2. Kanch ka size mobile ki screen ke barabar karo
    
        fxCanvas.width = window.innerWidth;
    fxCanvas.height = window.innerHeight;
    fluidCanvas.width = window.innerWidth;
    fluidCanvas.height = window.innerHeight;

    fxCanvas.style.display = 'block';

    // 👇 Z-INDEX & GRID FIX 👇
    if (selectedFx.startsWith('spacetime')) { 
        fxCanvas.style.zIndex = '14'; // Grid Board ke piche jayega (Board = 15)
        initSpacetimeMeshLocked(); 
    } else {
        fxCanvas.style.zIndex = '9998'; // Baki effects board ke upar aayenge
    }

    if (selectedFx.startsWith('fluid')) { fluidWrapper.style.display = 'block'; }

    // 3. Asali board par CSS classes lagao (3D Holo aur Glitch ke liye)
    const mainBoard = document.getElementById('board');
    mainBoard.classList.add('board-canvas-wrapper'); // Engine ko dhoka dene ke liye 🤫
    if (selectedFx.startsWith('holo')) mainBoard.classList.add('holo-mode');
    else mainBoard.classList.remove('holo-mode');

    if (selectedFx.startsWith('quantum')) mainBoard.classList.add('quantum-mode');
    else mainBoard.classList.remove('quantum-mode');

    // 4. Exact Touch Location nikalo aur Asali dhamaaka karo! 💣
    const rect = cell.getBoundingClientRect();
    
    let activeEvent = e || { clientX: rect.left + rect.width/2 + (Math.random() * 20 - 10), clientY: rect.top + rect.height/2 + (Math.random() * 20 - 10) };

triggerEffectLogic(cell, sign, activeEvent, mainBoard);
};
