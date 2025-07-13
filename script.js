// Chanda Run: Professional Vanilla JS "3D-feel" Endless Runner
// Modular JS: Game engine, Audio/Video Manager, UI, Powerups, 2.5D Canvas rendering

// =========== Audio/Video ==============
const audio = {
    bg: document.getElementById("bg-music"),
    coin: document.getElementById("sfx-chanda"),
    jump: document.getElementById("sfx-jump"),
    hit: document.getElementById("sfx-hit"),
    powerup: document.getElementById("sfx-powerup"),
    redjuly: document.getElementById("sfx-redjuly"),
};
function playAudio(aud) {
    if (state.sound && audio[aud]) {
        audio[aud].currentTime = 0;
        audio[aud].play();
    }
}
function playVoiceLine(text) {
    if (!state.sound) return;
    // If you have custom voice audio, play here! Otherwise, use speechSynthesis.
    if ('speechSynthesis' in window) {
        let utter = new SpeechSynthesisUtterance(text);
        utter.lang = state.language === "bn" ? "bn-BD" : "en-US";
        window.speechSynthesis.speak(utter);
    }
    // Show text visually too:
    let box = document.getElementById("voice-line");
    box.innerText = text;
    box.classList.add("active");
    setTimeout(() => box.classList.remove("active"), 1400);
}

// =========== "3D" Canvas Rendering ============
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

function drawRoad() {
    // Simulate perspective road (gray), with vanishing point
    ctx.save();
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(90, 0);
    ctx.lineTo(310, 0);
    ctx.lineTo(390, 600);
    ctx.lineTo(10, 600);
    ctx.closePath();
    ctx.fill();
    // Center stripes (faux 3D effect)
    ctx.strokeStyle = "#fffb";
    ctx.setLineDash([40, 25]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(200, 0);
    ctx.lineTo(200, 600);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}
function getLaneX(lane, z) {
    // 3 lanes, z is "depth" (0=far, 1=close)
    // Lane 0: left, 1: center, 2: right
    let base = [110, 200, 290];
    let perspective = (x) => 200 + (x - 200) * (0.55 + 0.45 * z);
    return perspective(base[lane]);
}
function getLaneY(z) {
    // Z: 0 (far) to 1 (close)
    return 70 + 500 * z;
}
function scaleByZ(z, size) {
    // Simulate size shrinking by depth
    return size * (0.60 + 0.45 * z);
}

// =========== Game State ============
const LANE_COUNT = 3;
const OBSTACLE_SIZE = 60, CHANDA_SIZE = 48, PLAYER_SIZE = 64;
const Z_START = 0.1, Z_END = 1.1;
const SPAWN_Z = Z_START;
const GAME_SPEED = 0.008; // z per frame
const RED_JULY_SCORE = 70, ELECTION_SCORE = 150;

const MEMES_BN = [
    "নেতা: মামলার জ্বালা!", "এত FIR কে করল?", "ভাই, পুলিশ আসতেছে!",
    "চাঁদা কম হয় নাই তো?", "অনেক মামলা, অনেক সম্মান", "নেতার জন্য চাঁদা!",
    "আবারও কোর্ট!", "মিডিয়া ভাই, লাইভ দেন!", "কেস ফাইল জমা হল!",
    "ভাই, আরেকটা মামলা আসতেছে!", "আজ রেড জুলাই!", "ভাই, চাঁদার হিসাব রাখো!",
    "জয় বাংলা, চাঁদা বাংলা!"
];

let state = {
    running: false, over: false, election: false, redJuly: false,
    sound: true, language: "bn", controls: "swipe",
    chanda: 0, score: 0, chandaCollected: 0,
    player: { lane: 1, jump: 0, jumping: false, jumpV: 0 },
    obstacles: [], chandas: [],
    powerups: [],
    lastObstacle: 0, lastChanda: 0,
    speed: GAME_SPEED,
    shop: {}, memeBuff: false, resinetaBuff: false, stickBuff: false,
    timeStarted: 0, timeEnded: 0,
    fakeName: "",
};

function toBengaliDigits(n) {
    return n.toString().split('').map(d => '০১২৩৪৫৬৭৮৯'[+d] || d).join('');
}

// =========== Entities ============
function spawnObstacle() {
    // Varied types, more during Red July
    let types = ["police", "file", "fir", "protestor"];
    if (state.redJuly) types.push("fire");
    let type = types[Math.floor(Math.random() * types.length)];
    let lane = Math.floor(Math.random() * LANE_COUNT);
    state.obstacles.push({
        type, lane, z: SPAWN_Z,
        hit: false,
    });
}
function spawnChanda() {
    let lane = Math.floor(Math.random() * LANE_COUNT);
    state.chandas.push({ lane, z: SPAWN_Z, collected: false });
}
function spawnPowerup() {
    // 1 in 12 chance
    if (Math.random() < 0.08) {
        let kinds = ["double", "invincible", "slow"];
        let kind = kinds[Math.floor(Math.random() * kinds.length)];
        let lane = Math.floor(Math.random() * LANE_COUNT);
        state.powerups.push({ kind, lane, z: SPAWN_Z, active: false });
    }
}

// =========== Main Loop ============
function resetGame() {
    state.running = true; state.over = false; state.election = false; state.redJuly = false;
    state.chanda = 0; state.score = 0; state.chandaCollected = 0;
    state.player = { lane: 1, jump: 0, jumping: false, jumpV: 0 };
    state.obstacles = []; state.chandas = []; state.powerups = [];
    state.lastObstacle = 0; state.lastChanda = 0;
    state.speed = GAME_SPEED;
    state.shop = {}; state.memeBuff = false; state.resinetaBuff = false; state.stickBuff = false;
    state.timeStarted = Date.now();
    closeAllModals();
    playAudio("bg");
    requestAnimationFrame(loop);
}
function loop(ts) {
    if (!state.running) return;
    ctx.clearRect(0, 0, 400, 600);

    drawRoad();

    // Draw entities, sorted by z (far to near)
    let entities = [];
    for (let o of state.obstacles) entities.push({ ...o, ent: "obstacle" });
    for (let c of state.chandas) entities.push({ ...c, ent: "chanda" });
    for (let p of state.powerups) entities.push({ ...p, ent: "powerup" });
    entities = entities.filter(e => e.z > Z_START && e.z < Z_END)
        .sort((a, b) => a.z - b.z);

    // Draw all background entities
    for (let e of entities) {
        let x = getLaneX(e.lane, e.z);
        let y = getLaneY(e.z);
        let sz = scaleByZ(e.z, e.ent === "chanda" ? CHANDA_SIZE : OBSTACLE_SIZE);
        if (e.ent === "obstacle") drawObstacle3D(e.type, x, y, sz);
        if (e.ent === "chanda") drawChanda3D(x, y, sz);
        if (e.ent === "powerup") drawPowerup3D(e.kind, x, y, sz);
    }

    // Draw player (always z=playerZ)
    let playerZ = 0.95;
    let px = getLaneX(state.player.lane, playerZ);
    let py = getLaneY(playerZ) - state.player.jump;
    drawPlayer3D(px, py, scaleByZ(playerZ, PLAYER_SIZE));

    // Move entities forward (increase z)
    let speed = state.speed * (state.redJuly ? 1.55 : 1);
    for (let o of state.obstacles) o.z += speed;
    for (let c of state.chandas) c.z += speed;
    for (let p of state.powerups) p.z += speed;

    // Remove past
    state.obstacles = state.obstacles.filter(o => o.z < Z_END && !o.hit);
    state.chandas = state.chandas.filter(c => c.z < Z_END && !c.collected);
    state.powerups = state.powerups.filter(p => p.z < Z_END && !p.active);

    // Spawning
    if (Math.random() < (state.redJuly ? 0.07 : 0.045)) spawnObstacle();
    if (Math.random() < 0.07) spawnChanda();
    if (Math.random() < 0.017) spawnPowerup();

    // Collisions
    let playerLane = state.player.lane;
    for (let o of state.obstacles) {
        if (Math.abs(o.lane - playerLane) === 0 &&
            o.z > 0.87 && o.z < 0.98 &&
            !o.hit && state.player.jump < 28
        ) {
            if (state.stickBuff && o.type === "police") {
                o.hit = true; showMeme(); playVoiceLine("পুলিশ ধীর!");
            } else if (state.powerInvincible) {
                o.hit = true;
            } else {
                o.hit = true; playAudio("hit");
                triggerGameOver(o.type);
                return;
            }
        }
    }
    for (let c of state.chandas) {
        if (Math.abs(c.lane - playerLane) === 0 &&
            c.z > 0.88 && c.z < 0.99 && !c.collected
        ) {
            c.collected = true;
            playAudio("coin");
            let amount = 1 + (state.resinetaBuff ? 1 : 0) + (state.powerDouble ? 1 : 0);
            state.chanda += amount; state.chandaCollected += amount;
            showMeme();
            playVoiceLine("চাঁদা কম হয় নাই তো?");
        }
    }
    for (let p of state.powerups) {
        if (Math.abs(p.lane - playerLane) === 0 &&
            p.z > 0.88 && p.z < 0.99 && !p.active
        ) {
            p.active = true;
            applyPowerup(p.kind);
        }
    }

    // Score
    state.score += 1 + (state.resinetaBuff ? 1 : 0);
    updateScorePanel();

    // Player jump
    if (state.player.jumping) {
        state.player.jump += state.player.jumpV;
        state.player.jumpV += 1.4;
        if (state.player.jump > 0) {
            state.player.jumping = false;
            state.player.jump = 0;
            state.player.jumpV = 0;
        }
    }

    // Red July mode
    if (!state.redJuly && state.chanda >= RED_JULY_SCORE) {
        state.redJuly = true;
        document.getElementById("red-july-banner").style.display = 'block';
        playAudio("redjuly");
        setTimeout(() => {
            document.getElementById("red-july-banner").style.display = 'none';
        }, 2500);
    }
    // Election mode
    if (!state.election && state.chanda >= ELECTION_SCORE) {
        state.election = true;
        state.running = false;
        setTimeout(() => {
            showElectionModal();
            stopAudio("bg");
        }, 900);
        return;
    }

    requestAnimationFrame(loop);
}

// =========== "3D" Drawing ============
function drawPlayer3D(x, y, sz) {
    ctx.save();
    ctx.translate(x, y);
    // Shadow
    ctx.globalAlpha = 0.18; ctx.beginPath();
    ctx.ellipse(0, sz * 0.7, sz * 0.32, sz * 0.16, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#000"; ctx.fill(); ctx.globalAlpha = 1;
    // Body
    ctx.fillStyle = "#1d2f81";
    ctx.fillRect(-sz/2, -sz/2, sz, sz * 0.75);
    // Head
    ctx.beginPath(); ctx.arc(0, -sz*0.32, sz*0.26, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffe8c9"; ctx.fill();
    // Scarf
    ctx.fillStyle = "#e62d23"; ctx.fillRect(-sz/2 + 5, sz*0.12, sz-10, sz*0.13);
    ctx.restore();
}
function drawObstacle3D(type, x, y, sz) {
    ctx.save(); ctx.translate(x, y);
    // Shadow
    ctx.globalAlpha = 0.13;
    ctx.beginPath(); ctx.ellipse(0, sz * 0.7, sz * 0.30, sz * 0.14, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#000"; ctx.fill(); ctx.globalAlpha = 1;
    // Draw by type
    if (type === "police") {
        ctx.fillStyle = "#3067b6"; ctx.fillRect(-sz/2, -sz/2, sz, sz);
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#fff";
        ctx.fillText("👮", -sz*0.33, sz*0.23);
    } else if (type === "file") {
        ctx.fillStyle = "#b44c1c"; ctx.fillRect(-sz/2, -sz/2, sz, sz*0.68);
        ctx.font = (sz*0.5) + "px serif"; ctx.fillStyle = "#fff";
        ctx.fillText("📄", -sz*0.25, sz*0.10);
    } else if (type === "fir") {
        ctx.fillStyle = "#e62d23";
        ctx.beginPath(); ctx.arc(0, 0, sz/2, 0, 2 * Math.PI); ctx.fill();
        ctx.font = (sz*0.32) + "px serif"; ctx.fillStyle = "#fff";
        ctx.fillText("FIR", -sz*0.30, sz*0.13);
    } else if (type === "protestor") {
        ctx.fillStyle = "#f78224"; ctx.fillRect(-sz/2, sz*0.07, sz, sz*0.6);
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#000";
        ctx.fillText("😡", -sz*0.33, sz*0.45);
    } else if (type === "fire") {
        ctx.fillStyle = "#ff2b1c";
        ctx.beginPath(); ctx.arc(0, 0, sz*0.56, 0, 2 * Math.PI); ctx.fill();
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#fff700";
        ctx.fillText("🔥", -sz*0.33, sz*0.23);
    }
    ctx.restore();
}
function drawChanda3D(x, y, sz) {
    ctx.save(); ctx.translate(x, y);
    // Shadow
    ctx.globalAlpha = 0.14;
    ctx.beginPath(); ctx.ellipse(0, sz * 0.5, sz * 0.26, sz * 0.10, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#000"; ctx.fill(); ctx.globalAlpha = 1;
    // Chanda bundle
    ctx.fillStyle = "#1a9d36"; ctx.fillRect(-sz/2+4, -sz/2+8, sz-8, sz-20);
    ctx.font = (sz*0.8) + "px serif"; ctx.fillStyle = "#fff";
    ctx.fillText("৳", -sz*0.28, sz*0.23);
    ctx.restore();
}
function drawPowerup3D(kind, x, y, sz) {
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.arc(0, 0, sz/2+8, 0, 2*Math.PI); ctx.fillStyle="#fff700"; ctx.fill(); ctx.globalAlpha=1;
    if (kind === "double") {
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#2a8";
        ctx.fillText("×২", -sz*0.20, sz*0.25);
    } else if (kind === "invincible") {
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#f23";
        ctx.fillText("🦺", -sz*0.33, sz*0.23);
    } else if (kind === "slow") {
        ctx.font = (sz*0.7) + "px serif"; ctx.fillStyle = "#29d";
        ctx.fillText("🐢", -sz*0.33, sz*0.23);
    }
    ctx.restore();
}

// =========== Powerups ============
function applyPowerup(kind) {
    if (kind === "double") {
        state.powerDouble = true;
        showBanner("চাঁদা ×২!");
        playAudio("powerup");
        setTimeout(() => { state.powerDouble = false; }, 6500);
    }
    if (kind === "invincible") {
        state.powerInvincible = true;
        showBanner("নেতা অজেয়!");
        playAudio("powerup");
        setTimeout(() => { state.powerInvincible = false; }, 6500);
    }
    if (kind === "slow") {
        let oldSpeed = state.speed;
        state.speed = GAME_SPEED * 0.55;
        showBanner("স্লো মোশন!");
        playAudio("powerup");
        setTimeout(() => { state.speed = oldSpeed; }, 6500);
    }
}
function showBanner(text) {
    let bn = document.getElementById("powerup-banner");
    bn.innerText = text;
    bn.style.display = "block";
    setTimeout(() => { bn.style.display = "none"; }, 1200);
}

// =========== UI & Controls ============
function showMeme() {
    let memes = MEMES_BN;
    let meme = memes[Math.floor(Math.random() * memes.length)];
    let memeElem = document.createElement("div");
    memeElem.className = "meme-text";
    memeElem.innerText = meme;
    memeElem.style.left = Math.floor(Math.random()*180+10) + "px";
    memeElem.style.top = Math.floor(Math.random()*40+25) + "px";
    document.getElementById("meme-popup").appendChild(memeElem);
    setTimeout(() => memeElem.remove(), 1800);
}
function updateScorePanel() {
    document.getElementById("score-value").innerText = toBengaliDigits(state.chanda);
}

// Controls
function moveLeft() { if (state.player.lane > 0) state.player.lane--; }
function moveRight() { if (state.player.lane < LANE_COUNT-1) state.player.lane++; }
function jump() {
    if (!state.player.jumping) {
        state.player.jumping = true; state.player.jumpV = -20;
        playAudio("jump");
    }
}
document.addEventListener("keydown", function(e) {
    if (!state.running) return;
    if (e.key === "ArrowLeft") moveLeft();
    if (e.key === "ArrowRight") moveRight();
    if (e.key === " " || e.key === "ArrowUp") jump();
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
    let dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 40) moveRight();
        else if (dx < -40) moveLeft();
    } else { if (dy < -30) jump(); }
});

// =========== Game Over & Cutscenes ============
function triggerGameOver(type) {
    state.running = false; state.over = true; state.timeEnded = Date.now();
    playAudio("hit");
    stopAudio("bg");
    // (Show your own video cutscene if desired)
    setTimeout(() => {
        // Show your game over modal here
        alert("ব্রেকিং নিউজ: নেতা গ্রেফতার!\nআপনার সংগ্রহ: " + toBengaliDigits(state.chanda));
        // For production, use a modal (see previous versions)
    }, 900);
}
function stopAudio(aud) {
    if (audio[aud]) { audio[aud].pause(); audio[aud].currentTime = 0; }
}
function showElectionModal() {
    // (Show your election win cutscene or modal here)
    alert("বিজয়! তারেক ভাই প্রধানমন্ত্রী!\nআপনি যথেষ্ট চাঁদা তুলেছেন!");
    // For production, use a modal (see previous versions)
}

// =========== Modal UI (stub) ============
function closeAllModals() {
    // Implement modal closing (see previous versions)
}

// =========== Init ============
resetGame();
window.onresize = function() {
    // Responsive canvas (optional)
    let w = Math.min(window.innerWidth, 400);
    canvas.width = w; canvas.height = Math.max(400, Math.min(window.innerHeight - 200, 600));
};
window.onresize();
