const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = []; // {ws, username, balance}
let currentBets = [];
let roundState = "waiting"; // "in-progress", "crashed"
let crashMultiplier = 0;
let currentMultiplier = 1;
let roundTimer;
const ROUND_INTERVAL = 50;
const ROUND_WAIT = 4000;

// Provably Fair Crash
function getCrashMultiplier(serverSeed, clientSeed, nonce) {
  // HMAC-SHA256(serverSeed, clientSeed:nonce)
  const hash = crypto.createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");
  const hex = parseInt(hash.slice(0, 16), 16);
  let rand = hex / 0xffffffffffffffff;
  if (rand < 1e-6) return 0; // rare instant crash
  let crash = Math.floor(1 / (1 - rand) * 100) / 100;
  return Math.max(1.01, Math.min(crash, 100));
}

let serverSeed = crypto.randomBytes(32).toString("hex");
let clientSeed = crypto.randomBytes(16).toString("hex");
let nonce = 0;

// --- WebSocket Handling ---
wss.on("connection", function connection(ws) {
  let user = { ws, username: "Player" + Math.floor(Math.random()*10000), balance: 1000 };
  clients.push(user);
  ws.send(JSON.stringify({ type: "welcome", username: user.username, balance: user.balance }));

  ws.on("message", function incoming(message) {
    let data = {};
    try { data = JSON.parse(message); } catch {}
    if (data.type === "bet" && roundState === "waiting" && data.amount > 0 && data.amount <= user.balance) {
      user.balance -= data.amount;
      currentBets.push({ user, amount: data.amount, autoCashoutAt: data.auto, hasCashedOut: false });
      ws.send(JSON.stringify({ type: "bet-ack", amount: data.amount, auto: data.auto }));
      broadcastState();
    }
    if (data.type === "cashout" && roundState === "in-progress") {
      let bet = currentBets.find(b => b.user === user && !b.hasCashedOut);
      if (bet) {
        bet.hasCashedOut = true;
        bet.cashoutMultiplier = currentMultiplier;
        let win = +(bet.amount * currentMultiplier).toFixed(2);
        user.balance += win;
        ws.send(JSON.stringify({ type: "cashout-ack", win, multiplier: currentMultiplier }));
        broadcastState();
      }
    }
  });

  ws.on("close", () => {
    clients = clients.filter(u => u.ws !== ws);
  });
});

// --- Game Loop ---
function startRound() {
  roundState = "in-progress";
  currentMultiplier = 1.00;
  crashMultiplier = getCrashMultiplier(serverSeed, clientSeed, ++nonce);
  broadcastState();
  roundTimer = setInterval(() => {
    currentMultiplier = +(currentMultiplier * 1.011 + 0.012).toFixed(2);
    // handle auto cashouts
    currentBets.forEach(bet => {
      if (!bet.hasCashedOut && bet.autoCashoutAt && currentMultiplier >= bet.autoCashoutAt) {
        bet.hasCashedOut = true;
        bet.cashoutMultiplier = bet.autoCashoutAt;
        let win = +(bet.amount * bet.autoCashoutAt).toFixed(2);
        bet.user.balance += win;
        bet.user.ws.send(JSON.stringify({ type: "auto-cashout", win, multiplier: bet.autoCashoutAt }));
      }
    });
    if (currentMultiplier >= crashMultiplier) {
      clearInterval(roundTimer);
      roundState = "crashed";
      // lose all who didn't cash out
      currentBets.forEach(bet => {
        if (!bet.hasCashedOut) {
          bet.user.ws.send(JSON.stringify({ type: "crash", at: crashMultiplier }));
        }
      });
      broadcastState();
      setTimeout(() => {
        roundState = "waiting";
        currentBets = [];
        crashMultiplier = 0;
        currentMultiplier = 1;
        broadcastState();
        setTimeout(startRound, ROUND_WAIT);
      }, ROUND_WAIT);
    } else {
      broadcastState();
    }
  }, ROUND_INTERVAL);
}
setTimeout(startRound, ROUND_WAIT);

function broadcastState() {
  let state = {
    type: "state",
    roundState,
    currentMultiplier,
    crashMultiplier,
    bets: currentBets.map(b => ({
      username: b.user.username,
      amount: b.amount,
      auto: b.autoCashoutAt,
      hasCashedOut: b.hasCashedOut,
      cashoutMultiplier: b.cashoutMultiplier
    }))
  };
  clients.forEach(u => u.ws.send(JSON.stringify(state)));
}

server.listen(3000, () => {
  console.log("Aviator backend server running on http://localhost:3000");
});
