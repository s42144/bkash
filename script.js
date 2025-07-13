// -------------------
// Chanda Run: ক্ষমতার পেছনে দৌড়
// -------------------
// All logic: vanilla JS. Asset = placeholder. Bengali interface.
// Modular approach. Game state, rendering, UI, event, audio, leaderboard, shop, memes, calculator.
// -------------------

// ==== Settings ====
const GAME_WIDTH = 400, GAME_HEIGHT = 600;
const LANE_COUNT = 3;
const PLAYER_SIZE = 44;
const OBSTACLE_SIZE = 44;
const CHANDA_SIZE = 32;
const GAME_SPEED_BASE = 3.2;
const OBSTACLE_INTERVAL = 1100;
const CHANDA_INTERVAL = 850;
const RED_JULY_MODE_SCORE = 80;
const ELECTION_MODE_SCORE = 200;

const MEMES_BN = [
    "নেতা: মামলার জ্বালা!", "এত FIR কে করল?", "ভাই, পুলিশ আসতেছে!", 
    "চাঁদা কম হয় নাই তো?", "অনেক মামলা, অনেক সম্মান", "নেতার জন্য চাঁদা!",
    "আবারও কোর্ট!", "মিডিয়া ভাই, লাইভ দেন!", "কেস ফাইল জমা হল!",
    "ভাই, আরেকটা মামলা আসতেছে!", "আজ রেড জুলাই!", "ভাই, চাঁদার হিসাব রাখো!",
    "জয় বাংলা, চাঁদা বাংলা!"
];
const MEMES_EN = [
    "Leader: So many cases!", "Who filed all these FIRs?", "Run! Police incoming!", 
    "Donation's never enough!", "Many cases, much respect.", "Chanda for the leader!",
    "Court again!", "Media, go live!", "Case files piling up!",
    "Another FIR incoming!", "It's Red July!", "Count the donations!", 
    "Joy Bangla, Chanda Bangla!"
];

const VOICE_LINES_BN = [
    "ভাই, আরেকটা মামলা আসতেছে!",
    "চাঁদা কম হয় নাই তো?",
    "মিডিয়া ভাই, ছবি তুলুন!",
    "নেতা, FIR সাবধানে!",
    "পুলিশ আসতেছে, দৌড়াও!",
    "নতুন মামলা লিস্টে যোগ হলো!",
    "ভাই, চাঁদার হিসাব মিলাইছে?",
    "নেতা, কোর্ট ডাকে!",
];
const VOICE_LINES_EN = [
    "Another case incoming, bro!",
    "Is the donation enough?",
    "Media bro, take a pic!",
    "Leader, careful with FIR!",
    "Police incoming, run!",
    "New case added to list!",
    "Bro, checked the donation count?",
    "Leader, court is calling!",
];

const SHOP_ITEMS = [
    { name_bn: "লাঠি (বোনাস: পুলিশ ধীর)", name_en: "Stick (slows police)", price: 30, id: "stick" },
    { name_bn: "রেজিনেটা (অতিরিক্ত চাঁদা)", name_en: "Resineta (extra chanda)", price: 50, id: "resineta" },
    { name_bn: "নিউজ কভারেজ (মেমে ডাবল)", name_en: "News Coverage (double memes)", price: 40, id: "news" },
];

const FAKE_NAMES = [
    "আলমগীর ভাই", "বাবলু স্যার", "রিজভী ভাই", "নূরুল হক", "শাহিনুল", "শরীফুল মিয়া", "রুবেল মোল্লা", "ডাক্তার মিজান", "ইসমাইল ভাই", "ফারুক ফার্মাসিস্ট", "বদরুল ভাই"
];

// ==== State ====
let state = {
    running: false,
    over: false,
    election: false,
    redJuly: false,
    sound: true,
    language: "bn",
    controls: "swipe", // or keys
    chanda: 0,
    score: 0,
    chandaCollected: 0,
    obstacles: [],
    chandas: [],
    player: {
        lane: 1,
        y: GAME_HEIGHT - 110,
        jumping: false,
        jumpY: 0,
        jumpV: 0,
    },
    speed: GAME_SPEED_BASE,
    lastObstacle: 0,
    lastChanda: 0,
    shop: {},
    leaderboard: [],
    memes: [],
    voices: [],
    fakeName: "",
    memeBuff: false,
    resinetaBuff: false,
    stickBuff: false,
    timeStarted: 0,
    timeEnded: 0,
};

// ===== Helpers =====
function getLaneX(lane) {
    return 40 + lane * 110;
}
function rndi(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
}
function choice(arr) {
    return arr[rndi(0, arr.length - 1)];
}
function now() {
    return performance.now();
}
function toBengaliDigits(n) {
    return n.toString().split('').map(d => '০১২৩৪৫৬৭৮৯'[+d] || d).join('');
}

// ====== UI Elements ======
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("score-value");
const memePopup = document.getElementById("meme-popup");
const voiceLineBox = document.getElementById("voice-line");
const redJulyBanner = document.getElementById("red-july-banner");

const leaderboardModal = document.getElementById("leaderboard-modal");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const leaderboardBtnBottom = document.getElementById("leaderboard-btn-bottom");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardClose = document.getElementById("leaderboard-close");

const shopModal = document.getElementById("shop-modal");
const shopBtn = document.getElementById("shop-btn");
const shopBtnBottom = document.getElementById("shop-btn-bottom");
const shopList = document.getElementById("shop-list");
const shopClose = document.getElementById("shop-close");

const chandaCalcBtn = document.getElementById("chanda-calc-btn");
const chandaCalcModal = document.getElementById("chanda-calc-modal");
const chandaCalcClose = document.getElementById("chanda-calc-close");
const chandaCalcForm = document.getElementById("chanda-calc-form");
const chandaCalcResult = document.getElementById("chanda-calc-result");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsClose = document.getElementById("settings-close");
const soundToggle = document.getElementById("sound-toggle");
const languageToggle = document.getElementById("language-toggle");
const controlsToggle = document.getElementById("controls-toggle");

const gameOverModal = document.getElementById("game-over-modal");
const finalScore = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const gameOverMeme = document.getElementById("game-over-meme");
const shareFb = document.getElementById("share-fb");
const shareTg = document.getElementById("share-tg");

const electionModeModal = document.getElementById("election-mode-modal");
const electionModeFlags = document.getElementById("election-mode-flags");
const electionRestartBtn = document.getElementById("election-restart-btn");

// ====== Game Asset Placeholders ======
// Player: dark blue rectangle with red scarf
// Obstacle: police (blue), FIR bomb (red), file (brown), protestor (orange)
// Chanda: green bundle

function drawPlayer() {
    // Body
    ctx.fillStyle = "#1d2f81";
    ctx.fillRect(getLaneX(state.player.lane), state.player.y + state.player.jumpY, PLAYER_SIZE, PLAYER_SIZE);
    // Head
    ctx.fillStyle = "#ffe8c9";
    ctx.beginPath();
    ctx.arc(getLaneX(state.player.lane) + 22, state.player.y + state.player.jumpY + 13, 14, 0, 2 * Math.PI);
    ctx.fill();
    // Scarf
    ctx.fillStyle = "#e62d23";
    ctx.fillRect(getLaneX(state.player.lane) + 7, state.player.y + state.player.jumpY + 34, 30, 7);
}
function drawObstacle(obs) {
    if (obs.type === "police") {
        ctx.fillStyle = "#3067b6";
        ctx.fillRect(obs.x, obs.y, OBSTACLE_SIZE, OBSTACLE_SIZE);
        ctx.fillStyle = "#fff";
        ctx.fillText("👮", obs.x + 8, obs.y + 30);
    } else if (obs.type === "file") {
        ctx.fillStyle = "#b44c1c";
        ctx.fillRect(obs.x, obs.y, OBSTACLE_SIZE, OBSTACLE_SIZE - 14);
        ctx.fillStyle = "#fff";
        ctx.fillText("📄", obs.x + 8, obs.y + 25);
    } else if (obs.type === "fir") {
        ctx.fillStyle = "#e62d23";
        ctx.beginPath();
        ctx.arc(obs.x + 22, obs.y + 22, 22, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText("FIR", obs.x + 7, obs.y + 28);
    } else if (obs.type === "protestor") {
        ctx.fillStyle = "#f78224";
        ctx.fillRect(obs.x, obs.y + 14, OBSTACLE_SIZE, OBSTACLE_SIZE - 14);
        ctx.fillStyle = "#000";
        ctx.fillText("😡", obs.x + 8, obs.y + 39);
    } else if (obs.type === "fire") {
        ctx.fillStyle = "#ff2b1c";
        ctx.beginPath();
        ctx.arc(obs.x + 22, obs.y + 22, 24, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#fff700";
        ctx.fillText("🔥", obs.x + 8, obs.y + 28);
    }
}
function drawChanda(c) {
    ctx.fillStyle = "#1a9d36";
    ctx.fillRect(c.x + 7, c.y + 12, CHANDA_SIZE - 14, CHANDA_SIZE - 14);
    ctx.fillStyle = "#fff";
    ctx.fillText("৳", c.x + 14, c.y + 32);
}

// ====== Game Loop ======
function resetGame() {
    state.running = true;
    state.over = false;
    state.election = false;
    state.redJuly = false;
    state.chanda = 0;
    state.score = 0;
    state.chandaCollected = 0;
    state.obstacles = [];
    state.chandas = [];
    state.player = { lane: 1, y: GAME_HEIGHT - 110, jumping: false, jumpY: 0, jumpV: 0 };
    state.speed = GAME_SPEED_BASE;
    state.lastObstacle = 0;
    state.lastChanda = 0;
    state.memeBuff = false;
    state.resinetaBuff = false;
    state.stickBuff = false;
    state.timeStarted = Date.now();
    closeAllModals();
    updateScorePanel();
    requestAnimationFrame(loop);
}
function loop(ts) {
    if (!state.running) return;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Background
    if (state.redJuly) {
        ctx.fillStyle = "#ff2b1c44";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Lane lines
    ctx.strokeStyle = "#c2c2c2";
    for (let i = 1; i < LANE_COUNT; i++)
        ctx.beginPath(), ctx.moveTo(getLaneX(i) - 12, 0), ctx.lineTo(getLaneX(i) - 12, GAME_HEIGHT), ctx.stroke();

    // Player
    drawPlayer();

    // Obstacles
    for (let obs of state.obstacles)
        drawObstacle(obs);

    // Chanda
    for (let c of state.chandas)
        drawChanda(c);

    // Move obstacles/chanda
    let speed = state.speed * (state.redJuly ? 1.27 : 1);
    for (let obs of state.obstacles)
        obs.y += speed;
    for (let c of state.chandas)
        c.y += speed;

    // Remove passed obstacles/chanda
    state.obstacles = state.obstacles.filter(o => o.y < GAME_HEIGHT + 60);
    state.chandas = state.chandas.filter(c => c.y < GAME_HEIGHT + 60);

    // Obstacle collision
    for (let obs of state.obstacles) {
        if (Math.abs(obs.lane - state.player.lane) === 0 &&
            obs.y + OBSTACLE_SIZE > state.player.y + state.player.jumpY + 8 &&
            obs.y < state.player.y + state.player.jumpY + PLAYER_SIZE - 8) {
            if (obs.type === "fire") {
                triggerGameOver("fire");
                return;
            }
            if (obs.type === "police" && !state.stickBuff)
                return triggerGameOver("police");
            if (obs.type === "protestor")
                return triggerGameOver("protestor");
            if (obs.type === "fir")
                return triggerGameOver("fir");
            if (obs.type === "file")
                return triggerGameOver("file");
            // Buff: stick (police slows)
            if (obs.type === "police" && state.stickBuff) {
                showMeme();
                playVoiceLine();
                obs.y += 60; // skip
            }
        }
    }
    // Chanda collection
    for (let c of state.chandas) {
        if (Math.abs(c.lane - state.player.lane) === 0 &&
            c.y + CHANDA_SIZE > state.player.y + state.player.jumpY + 15 &&
            c.y < state.player.y + state.player.jumpY + PLAYER_SIZE - 12) {
            c.collected = true;
            let amount = 1 + (state.resinetaBuff ? 1 : 0);
            state.chanda += amount;
            state.chandaCollected += amount;
            showMeme();
            playVoiceLine();
        }
    }
    state.chandas = state.chandas.filter(c => !c.collected);

    // Score
    state.score += 1 + (state.resinetaBuff ? 1 : 0);
    updateScorePanel();

    // Jump logic
    if (state.player.jumping) {
        state.player.jumpY += state.player.jumpV;
        state.player.jumpV += 1.2;
        if (state.player.jumpY > 0) {
            state.player.jumping = false;
            state.player.jumpY = 0;
            state.player.jumpV = 0;
        }
    }

    // Obstacle spawn
    let t = now();
    if (t - state.lastObstacle > (state.redJuly ? OBSTACLE_INTERVAL * 0.7 : OBSTACLE_INTERVAL)) {
        spawnObstacle();
        state.lastObstacle = t;
    }
    // Chanda spawn
    if (t - state.lastChanda > CHANDA_INTERVAL) {
        spawnChanda();
        state.lastChanda = t;
    }

    // Red July mode
    if (!state.redJuly && state.chanda >= RED_JULY_MODE_SCORE) {
        triggerRedJulyMode();
    }
    // Election mode
    if (!state.election && state.chanda >= ELECTION_MODE_SCORE) {
        triggerElectionMode();
        return;
    }

    requestAnimationFrame(loop);
}

// ====== Obstacle & Chanda Spawning ======
function spawnObstacle() {
    let rand = Math.random();
    let type;
    if (state.redJuly) {
        if (rand < 0.16) type = "fire";
        else if (rand < 0.39) type = "fir";
        else if (rand < 0.62) type = "police";
        else if (rand < 0.81) type = "file";
        else type = "protestor";
    } else {
        if (rand < 0.28) type = "police";
        else if (rand < 0.46) type = "file";
        else if (rand < 0.56) type = "fir";
        else type = "protestor";
    }
    let lane = rndi(0, LANE_COUNT - 1);
    state.obstacles.push({
        type,
        x: getLaneX(lane),
        y: -OBSTACLE_SIZE,
        lane,
    });
}
function spawnChanda() {
    let lane = rndi(0, LANE_COUNT - 1);
    state.chandas.push({
        x: getLaneX(lane) + 4,
        y: -CHANDA_SIZE,
        lane,
        collected: false,
    });
}

// ====== Meme System ======
function showMeme() {
    let memes = state.language === "bn" ? MEMES_BN : MEMES_EN;
    let meme = choice(memes);
    let memeElem = document.createElement("div");
    memeElem.className = "meme-text";
    memeElem.innerText = meme;
    memeElem.style.left = rndi(10, 200) + "px";
    memeElem.style.top = rndi(15, 80) + "px";
    memePopup.appendChild(memeElem);
    setTimeout(() => memeElem.remove(), 2000);
    // Buff: news coverage (double memes)
    if (state.memeBuff) {
        let meme2 = choice(memes);
        if (meme2 !== meme) {
            let memeElem2 = document.createElement("div");
            memeElem2.className = "meme-text";
            memeElem2.innerText = meme2;
            memeElem2.style.left = rndi(130, 330) + "px";
            memeElem2.style.top = rndi(50, 120) + "px";
            memePopup.appendChild(memeElem2);
            setTimeout(() => memeElem2.remove(), 2000);
        }
    }
}

// ====== Voice Lines ======
function playVoiceLine() {
    if (!state.sound) return;
    let voices = state.language === "bn" ? VOICE_LINES_BN : VOICE_LINES_EN;
    let text = choice(voices);
    voiceLineBox.innerText = text;
    voiceLineBox.classList.add("active");
    setTimeout(() => voiceLineBox.classList.remove("active"), 1350);
    // Optionally: play sound file here if desired
}

// ====== Red July Mode ======
function triggerRedJulyMode() {
    state.redJuly = true;
    redJulyBanner.style.display = 'block';
    // Change background music if desired
    setTimeout(() => {
        redJulyBanner.style.display = 'none';
    }, 2500);
}

// ====== Election Mode ======
function triggerElectionMode() {
    state.election = true;
    state.running = false;
    setTimeout(() => {
        showElectionModal();
    }, 900);
}

// ====== Game Over ======
function triggerGameOver(type) {
    state.running = false;
    state.over = true;
    state.timeEnded = Date.now();
    let cause = {
        "fire": state.language === "bn" ? "রেড জুলাই আগুনে পুড়লেন!" : "Burned in Red July fire!",
        "police": state.language === "bn" ? "পুলিশ গ্রেফতার করল!" : "Arrested by police!",
        "protestor": state.language === "bn" ? "বিক্ষোভকারীদের রোষে!" : "Angry protestors attack!",
        "fir": state.language === "bn" ? "FIR বোমা ধরল!" : "Hit by FIR bomb!",
        "file": state.language === "bn" ? "কেস ফাইল জমে গেল!" : "Drowned in case files!",
    }[type];
    let tagline = state.language === "bn" ?
        "নেতা: "+ cause :
        "Leader: "+ cause;
    finalScore.innerHTML = (state.language === "bn" ? "আপনার সংগ্রহ: " : "Your Collection: ") +
        (state.language === "bn" ? toBengaliDigits(state.chanda) : state.chanda) +
        " " + (state.language === "bn" ? "চাঁদা" : "chanda");
    gameOverMeme.innerText = tagline;
    gameOverModal.style.display = "flex";
    updateLeaderboard();
}

// ====== Score/Panel ======
function updateScorePanel() {
    scoreValue.innerText = state.language === "bn" ? toBengaliDigits(state.chanda) : state.chanda;
}

// ====== Shop ======
function openShop() {
    shopModal.style.display = "flex";
    shopList.innerHTML = "";
    for (let item of SHOP_ITEMS) {
        let li = document.createElement("li");
        let name = state.language === "bn" ? item.name_bn : item.name_en;
        let nameDiv = document.createElement("span");
        nameDiv.className = "shop-item-name";
        nameDiv.innerText = name;
        let priceDiv = document.createElement("span");
        priceDiv.className = "shop-item-price";
        priceDiv.innerText = (state.language === "bn" ? toBengaliDigits(item.price) : item.price) + " চাঁদা";
        let buyBtn = document.createElement("button");
        buyBtn.className = "shop-buy-btn";
        buyBtn.innerText = state.language === "bn" ? "কিনুন" : "Buy";
        buyBtn.disabled = state.chanda < item.price || state.shop[item.id];
        buyBtn.onclick = () => buyShopItem(item);
        li.append(nameDiv, priceDiv, buyBtn);
        shopList.appendChild(li);
    }
}
function buyShopItem(item) {
    if (state.chanda >= item.price && !state.shop[item.id]) {
        state.chanda -= item.price;
        state.shop[item.id] = true;
        if (item.id === "stick") state.stickBuff = true;
        if (item.id === "resineta") state.resinetaBuff = true;
        if (item.id === "news") state.memeBuff = true;
        openShop();
        updateScorePanel();
    }
}

// ====== Leaderboard ======
function updateLeaderboard() {
    // Fake names + player
    let scores = [];
    for (let i = 0; i < 7; i++) {
        let fakeScore = rndi(40, 230);
        scores.push({ name: FAKE_NAMES[i], score: fakeScore });
    }
    // Add user score
    state.fakeName = choice(FAKE_NAMES);
    scores.push({ name: state.fakeName + " (আপনি)", score: state.chanda });
    scores = scores.sort((a, b) => b.score - a.score).slice(0, 8);
    leaderboardList.innerHTML = "";
    for (let i = 0; i < scores.length; i++) {
        let li = document.createElement("li");
        let rank = document.createElement("span");
        rank.className = "rank";
        rank.innerText = (state.language === "bn" ? toBengaliDigits(i + 1) : (i + 1)) + ".";
        li.append(rank, scores[i].name + " — " + (state.language === "bn" ? toBengaliDigits(scores[i].score) : scores[i].score));
        leaderboardList.appendChild(li);
    }
}

// ====== Election Modal ======
function showElectionModal() {
    electionModeFlags.innerText = "🏴‍☠️ 🇧🇩 🟦 🏁";
    electionModeModal.style.display = "flex";
}

// ====== Chanda Calculator ======
chandaCalcForm.onsubmit = function(e) {
    e.preventDefault();
    let count = parseInt(document.getElementById("zone-count").value);
    let amt = parseInt(document.getElementById("zone-amount").value);
    let total = count * amt;
    chandaCalcResult.innerText =
        (state.language === "bn" ? "মোট চাঁদা: " : "Total Chanda: ") +
        (state.language === "bn" ? toBengaliDigits(total) : total) + "৳";
};
chandaCalcBtn.onclick = () => chandaCalcModal.style.display = "flex";
chandaCalcClose.onclick = () => chandaCalcModal.style.display = "none";

// ====== Controls ======
function moveLeft() {
    if (!state.running) return;
    if (state.player.lane > 0) state.player.lane--;
}
function moveRight() {
    if (!state.running) return;
    if (state.player.lane < LANE_COUNT - 1) state.player.lane++;
}
function jump() {
    if (!state.running) return;
    if (!state.player.jumping) {
        state.player.jumping = true;
        state.player.jumpV = -17;
    }
}

// Keyboard/Touch
document.addEventListener("keydown", function(e) {
    if (!state.running) return;
    if (state.controls === "keys") {
        if (e.key === "ArrowLeft") moveLeft();
        if (e.key === "ArrowRight") moveRight();
        if (e.key === " " || e.key === "ArrowUp") jump();
    }
});
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener("touchstart", function(e) {
    if (!state.running) return;
    let t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
});
canvas.addEventListener("touchend", function(e) {
    if (!state.running) return;
    let t = e.changedTouches[0];
    let dx = t.clientX - touchStartX;
    let dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) moveRight();
        else if (dx < -40) moveLeft();
    } else {
        if (dy < -30) jump();
    }
});

// ====== UI Buttons & Modals ======
function closeAllModals() {
    leaderboardModal.style.display = "none";
    shopModal.style.display = "none";
    chandaCalcModal.style.display = "none";
    gameOverModal.style.display = "none";
    electionModeModal.style.display = "none";
    settingsModal.style.display = "none";
}
leaderboardBtn.onclick = leaderboardBtnBottom.onclick = function() {
    updateLeaderboard();
    leaderboardModal.style.display = "flex";
};
leaderboardClose.onclick = () => leaderboardModal.style.display = "none";
shopBtn.onclick = shopBtnBottom.onclick = openShop;
shopClose.onclick = () => shopModal.style.display = "none";
settingsBtn.onclick = () => settingsModal.style.display = "flex";
settingsClose.onclick = () => settingsModal.style.display = "none";

// ==== Settings ====
soundToggle.onchange = function() {
    state.sound = soundToggle.checked;
};
languageToggle.onchange = function() {
    state.language = languageToggle.value;
    updateScorePanel();
};
controlsToggle.onchange = function() {
    state.controls = controlsToggle.value;
};

// ====== Game Over / Restart ======
restartBtn.onclick = electionRestartBtn.onclick = function() {
    resetGame();
};
shareFb.onclick = function() {
    let msg = (state.language === "bn" ? "চাঁদা রান: আমার সংগ্রহ " : "Chanda Run: My score ") +
        (state.language === "bn" ? toBengaliDigits(state.chanda) : state.chanda) + " চাঁদা!";
    let url = encodeURIComponent(location.href);
    window.open(`https://facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(msg)}`);
};
shareTg.onclick = function() {
    let msg = (state.language === "bn" ? "চাঁদা রান: আমার সংগ্রহ " : "Chanda Run: My score ") +
        (state.language === "bn" ? toBengaliDigits(state.chanda) : state.chanda) + " চাঁদা!\n" +
        location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(msg)}`);
};

// ====== Initial ======
resetGame();

window.onresize = function() {
    // Responsive canvas
    let w = Math.min(window.innerWidth, 400);
    canvas.width = w;
    canvas.height = Math.max(400, Math.min(window.innerHeight - 200, 600));
};

window.onresize();
