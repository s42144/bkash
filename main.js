// ===================== Chanda Run: Pro Edition =====================

// ------ Character, Shop, Sound, Assistant, Game Classes ------
class Character {
  constructor(id, name, img, unlockScore, unlocked = false) {
    this.id = id; this.name = name; this.img = img;
    this.unlockScore = unlockScore; this.unlocked = unlocked;
  }
}
class ShopItem {
  constructor(id, name, price, icon, desc) {
    this.id = id; this.name = name; this.price = price; this.icon = icon; this.desc = desc;
  }
}
class SoundManager {
  static play(id) {
    const el = document.getElementById(id);
    if (el) { el.currentTime = 0; el.play(); }
  }
  static stop(id) {
    const el = document.getElementById(id);
    if (el) { el.pause(); el.currentTime = 0; }
  }
  static toggle(id, on) {
    const el = document.getElementById(id);
    if (el) el.muted = !on;
  }
}
class Assistant {
  static tips = [
    "টিপ ১: মামলার ফাঁদে পড়লে দ্রুত Swipe করুন!",
    "টিপ ২: দোকানদার থেকে আইটেম কিনুন, পুলিশকে ঠেকাতে কাজে আসবে।",
    "টিপ ৩: Shop-এ বিশেষ অফার দেখুন!",
    "টিপ ৪: ক্যারেক্টর আনলক করলে বিশেষ পার্ক পাবেন!",
    "টিপ ৫: চাঁদা বেশি হলে নেতা খুশি!"
  ];
  static funVoices = [
    "assets/sound/assist-voice1.mp3",
    "assets/sound/assist-voice2.mp3"
  ];
  static showTips() {
    const tipList = document.getElementById('assistant-tips');
    tipList.innerHTML = '';
    Assistant.tips.forEach(tip => {
      const li = document.createElement('li'); li.textContent = tip; tipList.appendChild(li);
    });
    document.getElementById('assistant-dialogue').textContent = "আজকের টিপস!";
    SoundManager.play('voice-assist');
  }
}

// ------ State ------
const state = {
  score: 0, caseCount: 0, lang: 'bn', selectedChar: 0,
  characters: [
    new Character('leader', 'নেতা', 'assets/leader.png', 0, true),
    new Character('police', 'পুলিশ', 'assets/police.png', 800),
    new Character('shopkeeper', 'দোকানদার', 'assets/shopkeeper.png', 1200),
    new Character('assistant', 'এসিস্ট', 'assets/assistant.png', 1500),
  ],
  shop: [
    new ShopItem('lathi', 'লাঠি', 2000, 'assets/lathi.png', 'পুলিশ ঠেকাতে কাজে আসে'),
    new ShopItem('rezineta', 'রেজিনেটা', 3000, 'assets/rezineta.png', 'কেস থেকে বাঁচায়'),
    new ShopItem('news', 'নিউজ কভারেজ', 5000, 'assets/news.png', 'সমর্থন বাড়ায়')
  ],
  ownedItems: [],
  chandaCalc: { area: 1, rate: 1000, total: 1000 }
};
const memeData = [
  "ভোট ছাড়লে মামলাই পাই", "চাঁদার টাকা কই গেলো রে ভাই!", "নেতা পলাতক…", "এইখানে চাঁদা কম কেন?!", "ভাই, পুলিশ আসতেছে!"
];

// ------ UI Refs ------
const screens = {
  start: document.getElementById('start-screen'),
  menu: document.getElementById('menu-screen'),
  game: document.getElementById('game-screen'),
  ending: document.getElementById('ending-screen')
};
const modals = {
  shop: document.getElementById('shop-modal'),
  charUnlock: document.getElementById('char-unlock-modal'),
  assistant: document.getElementById('assistant-modal'),
  chandaCalc: document.getElementById('chanda-calc-modal'),
  leaderboard: document.getElementById('leaderboard-modal'),
  settings: document.getElementById('settings-modal'),
  guide: document.getElementById('guide-modal')
};
function showScreen(name) { Object.values(screens).forEach(s => s.classList.remove('active')); if (screens[name]) screens[name].classList.add('active'); Object.values(modals).forEach(m => m.classList.remove('active')); }
function showModal(name) { if (modals[name]) modals[name].classList.add('active'); }
function closeModal(name) { if (modals[name]) modals[name].classList.remove('active'); }

// ------ Navigation Logic ------
document.getElementById('btn-start').onclick = () => { showScreen('menu'); showMenuMeme(); renderCharList(); };
document.getElementById('btn-play').onclick = () => { startGame(); };
document.getElementById('btn-pause').onclick = () => { showScreen('menu'); showMenuMeme(); };
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
document.getElementById('btn-play-again').onclick = () => { showScreen('menu'); showMenuMeme(); };
document.getElementById('btn-assistant').onclick = () => { showModal('assistant'); Assistant.showTips(); };
document.getElementById('btn-assistant-close').onclick = () => closeModal('assistant');
document.getElementById('btn-unlock-ok').onclick = () => closeModal('charUnlock');

// ------ Chanda Calculator Logic ------
const areaInput = document.getElementById('area-count');
const rateInput = document.getElementById('area-rate');
const totalElem = document.getElementById('chanda-total');
function updateChandaCalc() {
  const area = parseInt(areaInput.value) || 1; const rate = parseInt(rateInput.value) || 1000; const total = area * rate;
  state.chandaCalc = { area, rate, total }; totalElem.textContent = total;
}
areaInput.oninput = updateChandaCalc; rateInput.oninput = updateChandaCalc;

// ------ Meme Popup System ------
function showMeme(text, targetId = 'game-meme', duration = 2200) {
  const memeElem = document.getElementById(targetId); memeElem.textContent = text; memeElem.style.display = 'block';
  setTimeout(() => { memeElem.style.display = 'none'; }, duration);
}
function showMenuMeme() { const meme = memeData[Math.floor(Math.random() * memeData.length)]; showMeme(meme, 'menu-meme', 3200); }

// ------ Character Selection ------
function renderCharList() {
  const charList = document.getElementById('char-list');
  charList.innerHTML = '';
  state.characters.forEach((c, i) => {
    const img = document.createElement('img');
    img.src = c.img; img.alt = c.name; img.className = "char-avatar" + (state.selectedChar === i ? " selected" : "");
    img.onclick = () => { if (c.unlocked) { state.selectedChar = i; renderCharList(); } };
    if (!c.unlocked) { img.style.opacity = .4; img.title = `Unlock at ${c.unlockScore} চাঁদা`; }
    charList.appendChild(img);
  });
  updateSelectedChar();
}
function updateSelectedChar() {
  const char = state.characters[state.selectedChar];
  document.getElementById('player-char-img').src = char.img;
}

// ------ Game Logic (Demo/Structure) ------
function startGame() {
  state.score = 0; state.caseCount = 0; updateHud(); showScreen('game');
  SoundManager.play('bg-music'); // BG music
  updateSelectedChar(); // Player character
  // Show police/shopkeeper/assistant in game
  document.getElementById('police-img').style.display = 'inline';
  document.getElementById('shopkeeper-img').style.display = 'inline';
  document.getElementById('assistant-img').style.display = 'inline';
  memePopupLoop(); simulateRun();
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
    if (!screens.game.classList.contains('active')) { SoundManager.stop('bg-music'); return; }
    tick++;
    if (tick % 15 === 0) {
      state.score += 100 + Math.floor(Math.random() * 100);
      SoundManager.play('sfx-collect');
      if (Math.random() < .22) {
        state.caseCount++;
        SoundManager.play('sfx-case');
        showMeme("নতুন মামলা দায়ের হলো!", 'game-meme', 1800);
        // Police pops up
        document.getElementById('police-img').classList.add('shake');
        setTimeout(() => document.getElementById('police-img').classList.remove('shake'), 500);
        // Unlock character if score reached
        unlockCharacters();
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
function unlockCharacters() {
  state.characters.forEach((c, idx) => {
    if (!c.unlocked && state.score >= c.unlockScore) {
      c.unlocked = true;
      showCharUnlock(c);
    }
  });
  renderCharList();
}
function showCharUnlock(char) {
  document.getElementById('unlocked-char-img').src = char.img;
  document.getElementById('unlocked-char-name').textContent = char.name + " আনলক!";
  showModal('charUnlock');
}
function gameOver() {
  showScreen('ending'); SoundManager.stop('bg-music');
  document.getElementById('final-score').textContent = `চাঁদা: ${state.score}৳ | মামলা: ${state.caseCount}`;
  document.getElementById('ending-meme-img').src = "assets/meme1.png";
}

// ------ Leaderboard Logic (Dummy Data) ------
function showLeaderboard() {
  const listElem = document.getElementById('leaderboard-list');
  listElem.innerHTML = '';
  const data = [
    { name: "শহীদ ভাই", score: 3000000 },
    { name: "পুলিশ", score: 2700000 },
    { name: "দোকানদার", score: 1600000 },
    { name: "এসিস্ট", score: 1450000 },
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
    const owned = state.ownedItems.includes(item.id);
    div.innerHTML = `
      <img src="${item.icon}" alt="${item.name}">
      <div>${item.name}</div>
      <div style="font-size:0.9em;color:#666;">${item.desc}</div>
      <div>৳${item.price}</div>
      <button class="btn-main" data-id="${item.id}" ${owned ? "disabled" : ""}>${owned ? "Owned" : "Buy"}</button>
    `;
    div.querySelector('button').onclick = () => {
      if (!owned && state.score >= item.price) {
        state.score -= item.price; state.ownedItems.push(item.id);
        document.getElementById('shopkeeper-dialogue').textContent = "অর্ডার কনফার্ম, ভাই!";
        SoundManager.play('sfx-collect');
        updateHud(); showShop();
      } else if (!owned) {
        document.getElementById('shopkeeper-dialogue').textContent = "আপনার চাঁদা কম!";
        SoundManager.play('sfx-case');
      }
    };
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

// ------ Animation Helper ------
document.querySelectorAll('.char-sprite, .char-avatar').forEach(el => {
  el.addEventListener('animationend', () => el.classList.remove('shake'));
});

// ========== END ==========
