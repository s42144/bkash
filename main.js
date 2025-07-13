// ========== Chanda Run: Game Logic & UI Control ==========

// ------ State & Config ------
const state = {
  score: 0,
  caseCount: 0,
  lang: 'bn',
  memes: [],
  leaderboard: [],
  shop: [
    { id: 'lathi', name: 'লাঠি', price: 2000, icon: 'assets/lathi.png' },
    { id: 'rezineta', name: 'রেজিনেটা', price: 3000, icon: 'assets/rezineta.png' },
    { id: 'news', name: 'নিউজ কভারেজ', price: 5000, icon: 'assets/news.png' }
  ],
  ownedItems: [],
  chandaCalc: { area: 1, rate: 1000, total: 1000 }
};

// Dummy meme dialogue data
const memeData = [
  "ভোট ছাড়লে মামলাই পাই",
  "চাঁদার টাকা কই গেলো রে ভাই!",
  "নেতা পলাতক…",
  "এইখানে চাঁদা কম কেন?!",
  "ভাই, আরেকটা মামলা আসতেছে!"
];

// ------ UI Element References ------
const screens = {
  start: document.getElementById('start-screen'),
  menu: document.getElementById('menu-screen'),
  game: document.getElementById('game-screen'),
  ending: document.getElementById('ending-screen')
};
const modals = {
  redJuly: document.getElementById('red-july-modal'),
  election: document.getElementById('election-modal'),
  chandaCalc: document.getElementById('chanda-calc-modal'),
  leaderboard: document.getElementById('leaderboard-modal'),
  shop: document.getElementById('shop-modal'),
  settings: document.getElementById('settings-modal'),
  guide: document.getElementById('guide-modal')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
  // Hide all modals
  Object.values(modals).forEach(m => m.classList.remove('active'));
}

function showModal(name) {
  if (modals[name]) modals[name].classList.add('active');
}

function closeModal(name) {
  if (modals[name]) modals[name].classList.remove('active');
}

// ------ Navigation Logic ------
document.getElementById('btn-start').onclick = () => {
  showScreen('menu');
  showMenuMeme();
};

document.getElementById('btn-play').onclick = () => {
  startGame();
};

document.getElementById('btn-pause').onclick = () => {
  showScreen('menu');
  showMenuMeme();
};

document.getElementById('btn-chanda-calc').onclick = () => showModal('chandaCalc');
document.getElementById('btn-leaderboard').onclick = () => showLeaderboard();
document.getElementById('btn-shop').onclick = () => showShop();
document.getElementById('btn-settings').onclick = () => showModal('settings');
document.getElementById('btn-calc-close').onclick = () => closeModal('chandaCalc');
document.getElementById('btn-leaderboard-close').onclick = () => closeModal('leaderboard');
document.getElementById('btn-shop-close').onclick = () => closeModal('shop');
document.getElementById('btn-settings-close').onclick = () => closeModal('settings');
document.getElementById('btn-guide').onclick = () => showModal('guide');
document.getElementById('btn-guide-close').onclick = () => closeModal('guide');
document.getElementById('btn-play-again').onclick = () => {
  showScreen('menu');
  showMenuMeme();
};

// ------ Chanda Calculator Logic ------
const areaInput = document.getElementById('area-count');
const rateInput = document.getElementById('area-rate');
const totalElem = document.getElementById('chanda-total');

function updateChandaCalc() {
  const area = parseInt(areaInput.value) || 1;
  const rate = parseInt(rateInput.value) || 1000;
  const total = area * rate;
  state.chandaCalc = { area, rate, total };
  totalElem.textContent = total;
}
areaInput.oninput = updateChandaCalc;
rateInput.oninput = updateChandaCalc;

// ------ Meme Popup System ------
function showMeme(text, targetId = 'game-meme', duration = 2200) {
  const memeElem = document.getElementById(targetId);
  memeElem.textContent = text;
  memeElem.style.display = 'block';
  setTimeout(() => {
    memeElem.style.display = 'none';
  }, duration);
}
function showMenuMeme() {
  const meme = memeData[Math.floor(Math.random() * memeData.length)];
  showMeme(meme, 'menu-meme', 3200);
}

// ------ Game Logic (Demo/Structure) ------
function startGame() {
  state.score = 0;
  state.caseCount = 0;
  updateHud();
  showScreen('game');
  // Start meme popup loop
  memePopupLoop();
  // Simulate gameplay
  simulateRun();
}
function updateHud() {
  document.getElementById('score').textContent = state.score;
  document.getElementById('case-count').textContent = state.caseCount;
}

function memePopupLoop() {
  if (!screens.game.classList.contains('active')) return;
  const meme = memeData[Math.floor(Math.random() * memeData.length)];
  showMeme(meme, 'game-meme', 1800);
  setTimeout(memePopupLoop, 5000 + Math.random() * 5000);
}

// ======= DEMO GAME ENGINE (Replace with Phaser/Canvas Engine) =======
function simulateRun() {
  let tick = 0;
  function step() {
    if (!screens.game.classList.contains('active')) return;
    tick++;
    if (tick % 15 === 0) {
      state.score += 100 + Math.floor(Math.random() * 100);
      if (Math.random() < .22) {
        state.caseCount++;
        showMeme("নতুন মামলা দায়ের হলো!", 'game-meme', 1800);
        // Trigger Red July randomly
        if (Math.random() < .2) {
          showModal('redJuly');
          document.getElementById('btn-red-july-ok').onclick = () => {
            closeModal('redJuly');
            // Could enter Red July Mode here (for now, just meme)
            showMeme("Red July: সাবধান!", 'game-meme', 2200);
          };
        }
      }
      updateHud();
      // Simulate ending trigger
      if (state.score > 3000) {
        setTimeout(gameOver, 900);
        return;
      }
    }
    setTimeout(step, 280);
  }
  step();
}

function gameOver() {
  showScreen('ending');
  document.getElementById('final-score').textContent = `চাঁদা: ${state.score}৳ | মামলা: ${state.caseCount}`;
  // Random meme image (dummy)
  document.getElementById('ending-meme-img').src = "assets/meme1.png";
}

// ------ Leaderboard Logic (Dummy Data) ------
function showLeaderboard() {
  const listElem = document.getElementById('leaderboard-list');
  listElem.innerHTML = '';
  const data = [
    { name: "শহীদ ভাই", score: 3000000 },
    { name: "রফিক ভাই", score: 2200000 },
    { name: "আমির ভাই", score: 1000000 },
    { name: "আপনি", score: state.score }
  ];
  data.sort((a, b) => b.score - a.score);
  data.forEach((item, idx) => {
    const li = document.createElement('li');
    li.textContent = `${idx+1}. ${item.name} — চাঁদা: ${item.score}`;
    if (item.name === "আপনি") li.style.color = "#e72d2d";
    listElem.appendChild(li);
  });
  showModal('leaderboard');
}

// ------ Shop Logic ------
function showShop() {
  const shopElem = document.getElementById('shop-items');
  shopElem.innerHTML = '';
  state.shop.forEach(item => {
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `
      <img src="${item.icon}" alt="${item.name}">
      <div>${item.name}</div>
      <div>৳${item.price}</div>
      <button class="btn-main" data-id="${item.id}">Buy</button>
    `;
    shopElem.appendChild(div);
  });
  showModal('shop');
}

// ------ Share Buttons ------
document.getElementById('btn-share-fb').onclick = () => {
  alert("FB শেয়ারের ফিচার এখান থেকে ইমপ্লিমেন্ট করুন (Open Graph + Meme Image)!");
};
document.getElementById('btn-share-tg').onclick = () => {
  alert("Telegram শেয়ারের ফিচার এখান থেকে ইমপ্লিমেন্ট করুন!");
};

// ------ Multi-language Support (Optional advanced) ------
// Add your i18n logic here

// ------ Responsive & Mobile Friendly ------
// All UI is flex, 44px+ button, touch support, canvas resizes

// ========== END ==========
