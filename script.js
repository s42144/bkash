// Professional Chanda Run Game: Fully-featured, modular, expandable
// Vanilla JS, HTML5 Canvas, Audio/Video, Bengali/English, Responsive, 2.5D visuals, all features

// ============ CONSTANTS =============
const GAME_W = 400, GAME_H = 600, LANES = 3;
const PLAYER_SZ = 64, OBSTACLE_SZ = 60, CHANDA_SZ = 48, Z_START = 0.1, Z_END = 1.12;
const GAME_SPEED = 0.008, RED_JULY_SCORE = 70, ELECTION_SCORE = 150;
const SHOP_ITEMS = [
    { name_bn: "লাঠি (পুলিশ ধীর)", name_en: "Stick (slow police)", price: 30, id: "stick" },
    { name_bn: "রেজিনেটা (চাঁদা ×২)", name_en: "Resineta (double chanda)", price: 50, id: "resineta" },
    { name_bn: "নিউজ কভারেজ (ডাবল মেমে)", name_en: "News Coverage (double meme)", price: 40, id: "news" },
    { name_bn: "ইনভিন্সিবল ভেস্ট (১বার ফ্রি হিট)", name_en: "Invincible Vest (one free hit)", price: 60, id: "vest" }
];
const FAKE_NAMES = ["আলমগীর ভাই","বাবলু স্যার","রিজভী ভাই","নূরুল হক","শাহিনুল","শরীফুল মিয়া","রুবেল মোল্লা","ডাক্তার মিজান","ইসমাইল ভাই","ফারুক ফার্মাসিস্ট","বদরুল ভাই"];
const MEMES_BN = [
    "নেতা: মামলার জ্বালা!","এত FIR কে করল?","ভাই, পুলিশ আসতেছে!","চাঁদা কম হয় নাই তো?",
    "অনেক মামলা, অনেক সম্মান","নেতার জন্য চাঁদা!","আবারও কোর্ট!","মিডিয়া ভাই, লাইভ দেন!",
    "কেস ফাইল জমা হল!","ভাই, আরেকটা মামলা আসতেছে!","আজ রেড জুলাই!","ভাই, চাঁদার হিসাব রাখো!","জয় বাংলা, চাঁদা বাংলা!"
];
const MEMES_EN = [
    "Leader: So many cases!","Who filed all these FIRs?","Police incoming!","Donation's never enough!",
    "Many cases, much respect.","Chanda for the leader!","Court again!","Media, go live!",
    "Case files piling up!","Another FIR incoming!","It's Red July!","Count the donations!","Joy Bangla, Chanda Bangla!"
];
const VOICE_LINES_BN = [
    "ভাই, আরেকটা মামলা আসতেছে!","চাঁদা কম হয় নাই তো?","মিডিয়া ভাই, ছবি তুলুন!","নেতা, FIR সাবধানে!",
    "পুলিশ আসতেছে, দৌড়াও!","নতুন মামলা লিস্টে যোগ হলো!","ভাই, চাঁদার হিসাব মিলাইছে?","নেতা, কোর্ট ডাকে!"
];
const VOICE_LINES_EN = [
    "Another case incoming, bro!","Is the donation enough?","Media bro, take a pic!","Leader, careful with FIR!",
    "Police incoming, run!","New case added to list!","Bro, checked the donation count?","Leader, court is calling!"
];

// ============ STATE =============
let state = {
    running: false, over: false, election: false, redJuly: false,
    sound: true, language: "bn", controls: "swipe",
    chanda: 0, score: 0, chandaCollected: 0, leaderboard: [],
    player: { lane: 1, jump: 0, jumping: false, jumpV: 0, vest: false },
    obstacles: [], chandas: [], powerups: [],
    lastObstacle: 0, lastChanda: 0, speed: GAME_SPEED,
    shop: {}, memeBuff: false, resinetaBuff: false, stickBuff: false,
    timeStarted: 0, timeEnded: 0, fakeName: "", power: {},
    memeArr: MEMES_BN, voiceArr: VOICE_LINES_BN
};

// ============ UTILS =============
function toBengaliDigits(n) { return n.toString().split('').map(d=>'০১২৩৪৫৬৭৮৯'[+d]||d).join(''); }
function choice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function now() { return performance.now(); }
function getLaneX(lane, z) {
    let base = [110, 200, 290];
    let perspective = x=>200+(x-200)*(0.55+0.45*z);
    return perspective(base[lane]);
}
function getLaneY(z) { return 70+500*z; }
function scaleByZ(z, size) { return size*(0.60+0.45*z); }
function randomInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

// ============ AUDIO/VIDEO =============
const audio = {
    bg: document.getElementById("bg-music"),
    coin: document.getElementById("sfx-chanda"),
    jump: document.getElementById("sfx-jump"),
    hit: document.getElementById("sfx-hit"),
    powerup: document.getElementById("sfx-powerup"),
    redjuly: document.getElementById("sfx-redjuly"),
};
function playAudio(aud){if(state.sound&&audio[aud]){audio[aud].currentTime=0;audio[aud].play();}}
function stopAudio(aud){if(audio[aud]){audio[aud].pause();audio[aud].currentTime=0;}}
function playVoiceLine(text){
    if(!state.sound)return;
    if('speechSynthesis' in window){
        let utter=new SpeechSynthesisUtterance(text);
        utter.lang=state.language==="bn"?"bn-BD":"en-US";
        window.speechSynthesis.speak(utter);
    }
    let box=document.getElementById("voice-line");
    box.innerText=text;box.classList.add("active");
    setTimeout(()=>box.classList.remove("active"),1400);
}
function showCutscene(type){
    const vid=document.getElementById("cutscene-video");
    vid.style.display="block";
    vid.src= type==="start"?"assets/intro.mp4" :
             type==="win"?"assets/election.mp4" :"assets/gameover.mp4";
    vid.play();
    vid.onended=()=>{ vid.style.display="none"; if(type==="start") resetGame(); };
}

// ============ CANVAS 3D =============
const canvas=document.getElementById("game-canvas"), ctx=canvas.getContext("2d");
function drawRoad(){
    ctx.save();
    ctx.fillStyle="#444";
    ctx.beginPath();ctx.moveTo(90,0);ctx.lineTo(310,0);ctx.lineTo(390,600);ctx.lineTo(10,600);ctx.closePath();
    ctx.fill();
    ctx.strokeStyle="#fffb";ctx.setLineDash([40,25]);ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(200,0);ctx.lineTo(200,600);ctx.stroke();ctx.setLineDash([]);
    ctx.restore();
}
function drawPlayer3D(x,y,sz){
    ctx.save();ctx.translate(x,y);
    ctx.globalAlpha=0.18;ctx.beginPath();ctx.ellipse(0,sz*0.7,sz*0.32,sz*0.16,0,0,2*Math.PI);
    ctx.fillStyle="#000";ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle="#1d2f81";ctx.fillRect(-sz/2,-sz/2,sz,sz*0.75);
    ctx.beginPath();ctx.arc(0,-sz*0.32,sz*0.26,0,2*Math.PI);ctx.fillStyle="#ffe8c9";ctx.fill();
    ctx.fillStyle="#e62d23";ctx.fillRect(-sz/2+5,sz*0.12,sz-10,sz*0.13);
    if(state.player.vest){
        ctx.strokeStyle="#ff0";ctx.lineWidth=5;
        ctx.beginPath();ctx.arc(0,sz*0.28,sz*0.40,Math.PI,2*Math.PI);ctx.stroke();
    }
    ctx.restore();
}
function drawObstacle3D(type,x,y,sz){
    ctx.save();ctx.translate(x,y);
    ctx.globalAlpha=0.13;ctx.beginPath();ctx.ellipse(0,sz*0.7,sz*0.30,sz*0.14,0,0,2*Math.PI);
    ctx.fillStyle="#000";ctx.fill();ctx.globalAlpha=1;
    if(type==="police"){ ctx.fillStyle="#3067b6";ctx.fillRect(-sz/2,-sz/2,sz,sz);
        ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#fff";ctx.fillText("👮", -sz*0.33, sz*0.23);}
    else if(type==="file"){ ctx.fillStyle="#b44c1c";ctx.fillRect(-sz/2,-sz/2,sz,sz*0.68);
        ctx.font=(sz*0.5)+"px serif";ctx.fillStyle="#fff";ctx.fillText("📄",-sz*0.25,sz*0.10);}
    else if(type==="fir"){ ctx.fillStyle="#e62d23";
        ctx.beginPath();ctx.arc(0,0,sz/2,0,2*Math.PI);ctx.fill();
        ctx.font=(sz*0.32)+"px serif";ctx.fillStyle="#fff";ctx.fillText("FIR",-sz*0.30,sz*0.13);}
    else if(type==="protestor"){ ctx.fillStyle="#f78224";ctx.fillRect(-sz/2,sz*0.07,sz,sz*0.6);
        ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#000";ctx.fillText("😡",-sz*0.33,sz*0.45);}
    else if(type==="fire"){ ctx.fillStyle="#ff2b1c";
        ctx.beginPath();ctx.arc(0,0,sz*0.56,0,2*Math.PI);ctx.fill();
        ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#fff700";ctx.fillText("🔥",-sz*0.33,sz*0.23);}
    ctx.restore();
}
function drawChanda3D(x,y,sz){
    ctx.save();ctx.translate(x,y);
    ctx.globalAlpha=0.14;ctx.beginPath();ctx.ellipse(0,sz*0.5,sz*0.26,sz*0.10,0,0,2*Math.PI);
    ctx.fillStyle="#000";ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle="#1a9d36";ctx.fillRect(-sz/2+4,-sz/2+8,sz-8,sz-20);
    ctx.font=(sz*0.8)+"px serif";ctx.fillStyle="#fff";ctx.fillText("৳",-sz*0.28,sz*0.23);
    ctx.restore();
}
function drawPowerup3D(kind,x,y,sz){
    ctx.save();ctx.translate(x,y);
    ctx.globalAlpha=0.18;ctx.beginPath();ctx.arc(0,0,sz/2+8,0,2*Math.PI);ctx.fillStyle="#fff700";ctx.fill();ctx.globalAlpha=1;
    if(kind==="double"){ ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#2a8";ctx.fillText("×২",-sz*0.20,sz*0.25);}
    else if(kind==="invincible"){ ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#f23";ctx.fillText("🦺",-sz*0.33,sz*0.23);}
    else if(kind==="slow"){ ctx.font=(sz*0.7)+"px serif";ctx.fillStyle="#29d";ctx.fillText("🐢",-sz*0.33,sz*0.23);}
    ctx.restore();
}

// ============ GAME LOOP =============
function resetGame(){
    state.running=true;state.over=false;state.election=false;state.redJuly=false;
    state.chanda=0;state.score=0;state.chandaCollected=0;
    state.player={lane:1,jump:0,jumping:false,jumpV:0,vest:!!state.shop["vest"]};
    state.obstacles=[];state.chandas=[];state.powerups=[];
    state.lastObstacle=0;state.lastChanda=0;state.speed=GAME_SPEED;
    state.shop=state.shop||{};state.memeBuff=!!state.shop["news"];state.resinetaBuff=!!state.shop["resineta"];
    state.stickBuff=!!state.shop["stick"];
    state.power={};state.memeArr=state.language==="bn"?MEMES_BN:MEMES_EN;
    state.voiceArr=state.language==="bn"?VOICE_LINES_BN:VOICE_LINES_EN;
    closeAllModals();playAudio("bg");
    updateScorePanel();requestAnimationFrame(loop);
}
function loop(ts){
    if(!state.running)return;
    ctx.clearRect(0,0,GAME_W,GAME_H);
    drawRoad();
    let entities=[];
    for(let o of state.obstacles)entities.push({...o,ent:"obstacle"});
    for(let c of state.chandas)entities.push({...c,ent:"chanda"});
    for(let p of state.powerups)entities.push({...p,ent:"powerup"});
    entities=entities.filter(e=>e.z>Z_START&&e.z<Z_END).sort((a,b)=>a.z-b.z);
    for(let e of entities){
        let x=getLaneX(e.lane,e.z),y=getLaneY(e.z);
        let sz=scaleByZ(e.z,e.ent==="chanda"?CHANDA_SZ:(e.ent==="powerup"?50:OBSTACLE_SZ));
        if(e.ent==="obstacle")drawObstacle3D(e.type,x,y,sz);
        if(e.ent==="chanda")drawChanda3D(x,y,sz);
        if(e.ent==="powerup")drawPowerup3D(e.kind,x,y,sz);
    }
    let playerZ=0.95,px=getLaneX(state.player.lane,playerZ),py=getLaneY(playerZ)-state.player.jump;
    drawPlayer3D(px,py,scaleByZ(playerZ,PLAYER_SZ));
    let speed=state.speed*(state.redJuly?1.55:1);
    for(let o of state.obstacles)o.z+=speed;
    for(let c of state.chandas)c.z+=speed;
    for(let p of state.powerups)p.z+=speed;
    state.obstacles=state.obstacles.filter(o=>o.z<Z_END&&!o.hit);
    state.chandas=state.chandas.filter(c=>c.z<Z_END&&!c.collected);
    state.powerups=state.powerups.filter(p=>p.z<Z_END&&!p.active);
    if(Math.random()<(state.redJuly?0.07:0.045))spawnObstacle();
    if(Math.random()<0.07)spawnChanda();
    if(Math.random()<0.017)spawnPowerup();
    // Collisions
    let playerLane=state.player.lane;
    for(let o of state.obstacles){
        if(Math.abs(o.lane-playerLane)===0&&o.z>0.87&&o.z<0.98&&!o.hit&&state.player.jump<28){
            if(state.stickBuff&&o.type==="police"){o.hit=true;showMeme();playVoiceLine("পুলিশ ধীর!");}
            else if(state.power.invincible){o.hit=true;}
            else if(state.player.vest){o.hit=true;state.player.vest=false;state.shop["vest"]=false;showBanner("ভেস্ট সেভড!");}
            else{ o.hit=true;playAudio("hit");triggerGameOver(o.type);return;}
        }
    }
    for(let c of state.chandas){
        if(Math.abs(c.lane-playerLane)===0&&c.z>0.88&&c.z<0.99&&!c.collected){
            c.collected=true;playAudio("coin");
            let amount=1+(state.resinetaBuff?1:0)+(state.power.double?1:0);
            state.chanda+=amount;state.chandaCollected+=amount;
            showMeme();playVoiceLine(choice(state.voiceArr));
        }
    }
    for(let p of state.powerups){
        if(Math.abs(p.lane-playerLane)===0&&p.z>0.88&&p.z<0.99&&!p.active){
            p.active=true;applyPowerup(p.kind);
        }
    }
    state.score+=1+(state.resinetaBuff?1:0);
    updateScorePanel();
    if(state.player.jumping){state.player.jump+=state.player.jumpV;state.player.jumpV+=1.4;if(state.player.jump>0){state.player.jumping=false;state.player.jump=0;state.player.jumpV=0;}}
    if(!state.redJuly&&state.chanda>=RED_JULY_SCORE){
        state.redJuly=true;document.getElementById("red-july-banner").style.display='block';
        playAudio("redjuly");setTimeout(()=>{document.getElementById("red-july-banner").style.display='none';},2500);}
    if(!state.election&&state.chanda>=ELECTION_SCORE){
        state.election=true;state.running=false;
        setTimeout(()=>{showElectionModal();stopAudio("bg");},900);return;}
    requestAnimationFrame(loop);
}
function spawnObstacle(){
    let types=["police","file","fir","protestor"];
    if(state.redJuly)types.push("fire");
    let type=choice(types),lane=randomInt(0,LANES-1);
    state.obstacles.push({type,lane,z:Z_START,hit:false});
}
function spawnChanda(){ let lane=randomInt(0,LANES-1);state.chandas.push({lane,z:Z_START,collected:false}); }
function spawnPowerup(){ if(Math.random()<0.08){ let kinds=["double","invincible","slow"],kind=choice(kinds),lane=randomInt(0,LANES-1);state.powerups.push({kind,lane,z:Z_START,active:false}); } }
function applyPowerup(kind){
    if(kind==="double"){state.power.double=true;showBanner("চাঁদা ×২!");playAudio("powerup");setTimeout(()=>{state.power.double=false;},6500);}
    if(kind==="invincible"){state.power.invincible=true;showBanner("নেতা অজেয়!");playAudio("powerup");setTimeout(()=>{state.power.invincible=false;},6500);}
    if(kind==="slow"){let oldSpeed=state.speed;state.speed=GAME_SPEED*0.55;showBanner("স্লো মোশন!");playAudio("powerup");setTimeout(()=>{state.speed=oldSpeed;},6500);}
}
function showBanner(text){
    let bn=document.getElementById("powerup-banner");bn.innerText=text;bn.style.display="block";setTimeout(()=>{bn.style.display="none";},1200);
}
function showMeme(){
    let memes=state.language==="bn"?MEMES_BN:MEMES_EN,meme=choice(memes);
    let memeElem=document.createElement("div");memeElem.className="meme-text";memeElem.innerText=meme;
    memeElem.style.left=randomInt(10,200)+"px";memeElem.style.top=randomInt(15,80)+"px";
    document.getElementById("meme-popup").appendChild(memeElem);setTimeout(()=>memeElem.remove(),1800);
    if(state.memeBuff){let meme2=choice(memes);if(meme2!==meme){let memeElem2=document.createElement("div");memeElem2.className="meme-text";memeElem2.innerText=meme2;memeElem2.style.left=randomInt(130,330)+"px";memeElem2.style.top=randomInt(50,120)+"px";document.getElementById("meme-popup").appendChild(memeElem2);setTimeout(()=>memeElem2.remove(),1800);}}
}
function updateScorePanel(){document.getElementById("score-value").innerText=state.language==="bn"?toBengaliDigits(state.chanda):state.chanda;}

// ============ UI/MODALS =============
function openShop(){
    document.getElementById("shop-modal").style.display="flex";
    let shopList=document.getElementById("shop-list");shopList.innerHTML="";
    for(let item of SHOP_ITEMS){
        let li=document.createElement("li"),name=state.language==="bn"?item.name_bn:item.name_en;
        let nameDiv=document.createElement("span");nameDiv.className="shop-item-name";nameDiv.innerText=name;
        let priceDiv=document.createElement("span");priceDiv.className="shop-item-price";priceDiv.innerText=(state.language==="bn"?toBengaliDigits(item.price):item.price)+" চাঁদা";
        let buyBtn=document.createElement("button");buyBtn.className="shop-buy-btn";
        buyBtn.innerText=state.language==="bn"?"কিনুন":"Buy";
        buyBtn.disabled=state.chanda<item.price||state.shop[item.id];
        buyBtn.onclick=()=>buyShopItem(item);
        li.append(nameDiv,priceDiv,buyBtn);shopList.appendChild(li);
    }
}
function buyShopItem(item){
    if(state.chanda>=item.price&&!state.shop[item.id]){
        state.chanda-=item.price;state.shop[item.id]=true;
        if(item.id==="stick")state.stickBuff=true;
        if(item.id==="resineta")state.resinetaBuff=true;
        if(item.id==="news")state.memeBuff=true;
        if(item.id==="vest")state.player.vest=true;
        openShop();updateScorePanel();
    }
}
function updateLeaderboard(){
    let scores=[];
    for(let i=0;i<7;i++)scores.push({name:FAKE_NAMES[i],score:randomInt(40,230)});
    state.fakeName=choice(FAKE_NAMES);
    scores.push({name:state.fakeName+" (আপনি)",score:state.chanda});
    scores=scores.sort((a,b)=>b.score-a.score).slice(0,8);
    let leaderboardList=document.getElementById("leaderboard-list");leaderboardList.innerHTML="";
    for(let i=0;i<scores.length;i++){
        let li=document.createElement("li"),rank=document.createElement("span");
        rank.className="rank";rank.innerText=(state.language==="bn"?toBengaliDigits(i+1):(i+1))+".";
        li.append(rank,scores[i].name+" — "+(state.language==="bn"?toBengaliDigits(scores[i].score):scores[i].score));
        leaderboardList.appendChild(li);
    }
}
function showElectionModal(){
    document.getElementById("election-mode-flags").innerText="🏴‍☠️ 🇧🇩 🟦 🏁";
    document.getElementById("election-mode-modal").style.display="flex";
}
function closeAllModals(){
    for(let id of ["leaderboard-modal","shop-modal","chanda-calc-modal","game-over-modal","election-mode-modal","settings-modal"])
        document.getElementById(id).style.display="none";
}
function triggerGameOver(type){
    state.running=false;state.over=true;state.timeEnded=Date.now();playAudio("hit");stopAudio("bg");
    let cause={
        "fire":state.language==="bn"?"রেড জুলাই আগুনে পুড়লেন!":"Burned in Red July fire!",
        "police":state.language==="bn"?"পুলিশ গ্রেফতার করল!":"Arrested by police!",
        "protestor":state.language==="bn"?"বিক্ষোভকারীদের রোষে!":"Angry protestors attack!",
        "fir":state.language==="bn"?"FIR বোমা ধরল!":"Hit by FIR bomb!",
        "file":state.language==="bn"?"কেস ফাইল জমে গেল!":"Drowned in case files!"
    }[type];
    let tagline=state.language==="bn"?"নেতা: "+cause:"Leader: "+cause;
    document.getElementById("final-score").innerHTML=(state.language==="bn"?"আপনার সংগ্রহ: ":"Your Collection: ")+(state.language==="bn"?toBengaliDigits(state.chanda):state.chanda)+(state.language==="bn"?" চাঁদা":" chanda");
    document.getElementById("game-over-meme").innerText=tagline;document.getElementById("game-over-modal").style.display="flex";
    updateLeaderboard();
}

// ============ CONTROLS =============
function moveLeft(){if(!state.running)return;if(state.player.lane>0)state.player.lane--;}
function moveRight(){if(!state.running)return;if(state.player.lane<LANES-1)state.player.lane++;}
function jump(){if(!state.running)return;if(!state.player.jumping){state.player.jumping=true;state.player.jumpV=-20;playAudio("jump");}}
document.addEventListener("keydown",function(e){
    if(!state.running)return;
    if(state.controls==="keys"){
        if(e.key==="ArrowLeft")moveLeft();
        if(e.key==="ArrowRight")moveRight();
        if(e.key===" "||e.key==="ArrowUp")jump();
    }
});
let touchStartX=0,touchStartY=0;
canvas.addEventListener("touchstart",function(e){
    if(!state.running)return;
    let t=e.touches[0];touchStartX=t.clientX;touchStartY=t.clientY;
});
canvas.addEventListener("touchend",function(e){
    if(!state.running)return;
    let t=e.changedTouches[0],dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;
    if(Math.abs(dx)>Math.abs(dy)){
        if(dx>40)moveRight(); else if(dx<-40)moveLeft();
    }else{if(dy<-30)jump();}
});

// ============ MODAL UI SETUP ===========
document.getElementById("leaderboard-btn").onclick=
document.getElementById("leaderboard-btn-bottom").onclick=()=>{updateLeaderboard();document.getElementById("leaderboard-modal").style.display="flex";};
document.getElementById("leaderboard-close").onclick=()=>document.getElementById("leaderboard-modal").style.display="none";
document.getElementById("shop-btn").onclick=
document.getElementById("shop-btn-bottom").onclick=openShop;
document.getElementById("shop-close").onclick=()=>document.getElementById("shop-modal").style.display="none";
document.getElementById("settings-btn").onclick=()=>document.getElementById("settings-modal").style.display="flex";
document.getElementById("settings-close").onclick=()=>document.getElementById("settings-modal").style.display="none";
document.getElementById("chanda-calc-btn").onclick=()=>document.getElementById("chanda-calc-modal").style.display="flex";
document.getElementById("chanda-calc-close").onclick=()=>document.getElementById("chanda-calc-modal").style.display="none";
document.getElementById("restart-btn").onclick=document.getElementById("election-restart-btn").onclick=function(){resetGame();};
document.getElementById("share-fb").onclick=function(){
    let msg=(state.language==="bn"?"চাঁদা রান: আমার সংগ্রহ ":"Chanda Run: My score ")+(state.language==="bn"?toBengaliDigits(state.chanda):state.chanda)+" চাঁদা!";
    let url=encodeURIComponent(location.href);
    window.open(`https://facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(msg)}`);};
document.getElementById("share-tg").onclick=function(){
    let msg=(state.language==="bn"?"চাঁদা রান: আমার সংগ্রহ ":"Chanda Run: My score ")+(state.language==="bn"?toBengaliDigits(state.chanda):state.chanda)+" চাঁদা!\n"+location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(msg)}`);};
document.getElementById("chanda-calc-form").onsubmit=function(e){
    e.preventDefault();
    let count=parseInt(document.getElementById("zone-count").value),amt=parseInt(document.getElementById("zone-amount").value),total=count*amt;
    document.getElementById("chanda-calc-result").innerText=(state.language==="bn"?"মোট চাঁদা: ":"Total Chanda: ")+(state.language==="bn"?toBengaliDigits(total):total)+"৳";
};
document.getElementById("sound-toggle").onchange=function(){state.sound=document.getElementById("sound-toggle").checked;};
document.getElementById("language-toggle").onchange=function(){
    state.language=document.getElementById("language-toggle").value;state.memeArr=state.language==="bn"?MEMES_BN:MEMES_EN;state.voiceArr=state.language==="bn"?VOICE_LINES_BN:VOICE_LINES_EN;updateScorePanel();
};
document.getElementById("controls-toggle").onchange=function(){state.controls=document.getElementById("controls-toggle").value;};

// ============ INIT ============
resetGame();
window.onresize=function(){let w=Math.min(window.innerWidth,400);canvas.width=w;canvas.height=Math.max(400,Math.min(window.innerHeight-200,600));};
window.onresize();
