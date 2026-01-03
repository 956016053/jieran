/* ============================================================
    抽卡系统 V37.0 - 题库兼容修复版
   修复：摄像头拉伸、题库页开启战斗不报错
   ============================================================ */
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

const REVIEW_INTERVALS = [0, 5*60000, 30*60000, 12*3600000, 24*3600000, 3*86400000, 7*86400000];

// 音效 (可替换为本地)
const SOUNDS = {
    bgmBattle: new Audio("https://cdn.pixabay.com/download/audio/2022/03/09/audio_c8c90c5945.mp3"),
    flip: new Audio("https://cdn.pixabay.com/download/audio/2022/03/24/audio_824f923236.mp3"),
    draw: new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c153e1.mp3"),
    victory: new Audio("https://cdn.pixabay.com/download/audio/2021/08/09/audio_27732295cc.mp3"),
    defeat: new Audio("https://cdn.pixabay.com/download/audio/2021/08/04/audio_893792015e.mp3"),
    hit: new Audio("https://cdn.pixabay.com/download/audio/2022/03/10/audio_c29ec8738a.mp3"),
    attack: new Audio("https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3")
};
SOUNDS.bgmBattle.loop = true;
SOUNDS.bgmBattle.volume = 0.5;

window.gachaSystem = {
    state: { score: 0, level: 1, progress: {} },
    
    battle: {
        active: false,
        playerHp: 100,
        enemyHp: 100,
        level: 1,
        timer: null
    },

    init() { 
        this.initParticles();
        this.bindGestures();
        // 即使没有 DB (题库页)，也要允许战斗系统运行
        this.loadState(); 
        if(window.DB) {
            this.updateUI(); 
        }
        this.initDraggable();
    },

    playSound(name) {
        if(SOUNDS[name]) {
            SOUNDS[name].currentTime = 0; 
            SOUNDS[name].play().catch(e => console.log("Audio blocked:", e));
        }
    },
    stopBGM() {
        SOUNDS.bgmBattle.pause();
        SOUNDS.bgmBattle.currentTime = 0;
    },

    // ---  生存模式 ---
    toggleBattleMode() {
        if (this.battle.active) this.endBattle(false);
        else this.startBattle();
    },

    startBattle() {
        if(!confirm("\u26a0\ufe0f \u8b66\u544a\uff1a\u8fdb\u5165\u65e0\u9650\u751f\u5b58\u6a21\u5f0f\uff01\n\n\u75c5\u6bd2\u5c06\u4e0d\u65ad\u53d8\u5f02\uff0c\u8bf7\u505a\u597d\u51c6\u5907\uff01")) return;

        this.battle.active = true;
        this.battle.playerHp = 100;
        this.battle.enemyHp = 100;
        this.battle.level = 1; 
        
        document.getElementById('battlePanel').style.display = 'block';
        document.getElementById('virusBoss').style.display = 'block';
        this.updateBattleUI();
        
        SOUNDS.bgmBattle.play().catch(e => console.log("Audio blocked"));

        //  修复：只有在首页(有DB)才发牌，题库页不发牌
        if(window.DB && document.getElementById('cardContainer')) {
            this.draw(10);
        }

        if(this.battle.timer) clearInterval(this.battle.timer);
        this.battle.timer = setInterval(() => { this.gameLoop(); }, 100);
        this.setParticleSpeed(8);
    },

    gameLoop() {
        if (!this.battle.active) return;

        const drainRate = 0.03 + (this.battle.level * 0.02); 
        this.battle.playerHp -= drainRate;
        
        const now = Date.now();
        const warn = document.getElementById('battleWarning');
        if(warn) warn.style.opacity = (this.battle.playerHp < 20 && now % 500 < 250) ? 1 : 0;
        
        if (now % 3000 < 100) {
            document.body.classList.add('red-alert-flash');
            setTimeout(() => document.body.classList.remove('red-alert-flash'), 1000);
        }

        if (this.battle.playerHp <= 0) {
            this.battle.playerHp = 0;
            this.updateBattleUI();
            this.endBattle(false);
        } else {
            this.updateBattleUI();
        }
    },

    nextLevel() {
        this.battle.level++; 
        this.battle.enemyHp = 100; 
        this.battle.playerHp = Math.min(100, this.battle.playerHp + 30); 
        
        alert(` \u75c5\u6bd2\u53d8\u5f02\uff01\u5f53\u524d\u7b49\u7ea7\uff1aLv.${this.battle.level}`);
        this.state.score += 500 * this.battle.level;
        this.saveState();

        //  修复：只有在首页才补牌
        if(window.DB && document.getElementById('cardContainer')) {
            this.draw(5); 
        }
    },

    endBattle(isVictory) {
        this.battle.active = false;
        clearInterval(this.battle.timer);
        document.getElementById('battlePanel').style.display = 'none';
        document.getElementById('virusBoss').style.display = 'none';
        this.setParticleSpeed(1.5); 
        this.stopBGM();
        
        if(isVictory) this.playSound('victory');
        else this.playSound('defeat');

        if(!isVictory) alert(` \u6e38\u620f\u7ed3\u675f\uff01\n\u6700\u7ec8\u7b49\u7ea7\uff1aLv.${this.battle.level}\n\u7ecf\u9a8c\u83b7\u5f97\uff1a${this.state.score}`);
    },

    updateBattleUI() {
        const eBar = document.getElementById('enemyHpBar');
        const pBar = document.getElementById('playerHpBar');
        if(eBar) eBar.style.width = this.battle.enemyHp + "%";
        if(pBar) pBar.style.width = this.battle.playerHp + "%";
        
        const eText = document.getElementById('enemyHpText');
        const pText = document.getElementById('playerHpText');
        if(eText) eText.innerText = `Lv.${this.battle.level} (${Math.floor(this.battle.enemyHp)}%)`;
        if(pText) pText.innerText = Math.floor(this.battle.playerHp) + "%";
        
        if(pBar) pBar.style.background = this.battle.playerHp < 30 ? "#ff0000" : "linear-gradient(90deg, #00f2fe, #4facfe)";
    },

    // --- 交互处理 ---
    markResult(btn, id, isKnown) {
        this.updateMastery(id, isKnown);
        if (this.battle.active) this.handleBattleAction(isKnown);
        this.playSound('flip');

        const cardWrapper = btn.closest('.card-wrapper');
        if (isKnown) {
            cardWrapper.style.transform = "scale(0) translateY(-150px) rotate(45deg)";
            cardWrapper.style.opacity = "0";
            setTimeout(() => {
                cardWrapper.remove();
                // 仅在首页自动补牌
                if(window.DB && document.getElementById('cardContainer')) {
                    const count = document.getElementById('cardContainer').children.length;
                    if(count < 3 && (this.battle.active || count === 0)) this.draw(3);
                }
            }, 500);
        } else {
            cardWrapper.classList.remove('flipped');
            cardWrapper.style.animation = "shake 0.5s";
            setTimeout(() => cardWrapper.style.animation = "", 500);
        }
    },

    handleBattleAction(isSuccess) {
        if (!this.battle.active) return;
        if (isSuccess) {
            this.playSound('attack');
            const dmg = 15 + Math.random() * 5;
            this.battle.enemyHp -= dmg;
            this.battle.playerHp = Math.min(100, this.battle.playerHp + 5);
            
            const virus = document.querySelector('.virus-icon');
            if(virus) {
                virus.classList.remove('virus-hurt');
                void virus.offsetWidth; 
                virus.classList.add('virus-hurt');
            }

            if (this.battle.enemyHp <= 0) {
                this.battle.enemyHp = 0;
                this.updateBattleUI();
                setTimeout(() => this.nextLevel(), 200);
            }
        } else {
            this.playSound('hit');
            this.battle.playerHp -= 20;
            document.body.classList.add('damage-effect');
            setTimeout(() => document.body.classList.remove('damage-effect'), 500);
        }
        this.updateBattleUI();
    },

    // --- 核心逻辑 ---
    getSmartPool(count) {
        //  修复：如果没有 DB (题库页)，直接返回空数组，防止 crash
        if (!window.DB) return [];
        
        const allIDs = window.DB.map(c => c.id);
        
        if (this.battle.active) {
            // 战斗模式：随机全量
            const shuffled = allIDs.sort(() => 0.5 - Math.random());
            return window.DB.filter(c => shuffled.slice(0, count).includes(c.id));
        }

        // 艾宾浩斯逻辑
        const now = Date.now();
        const dueCards = allIDs.filter(id => {
            const data = this.state.progress[id];
            return data && data.level > 0 && data.nextReview <= now;
        });
        const newCards = allIDs.filter(id => !this.state.progress[id] || this.state.progress[id].level === 0);
        
        let poolIDs = [...dueCards];
        if (poolIDs.length < count * 2) poolIDs = poolIDs.concat(newCards);
        if (poolIDs.length === 0) poolIDs = allIDs;
        
        return window.DB.filter(c => poolIDs.includes(c.id));
    },

    draw(count) {
        //  修复：如果没有 DB，或者没有容器，直接退出
        if (!window.DB) return;
        const container = document.getElementById('cardContainer');
        if (!container) return;

        if (!this.battle.active || container.children.length === 0) container.innerHTML = ''; 
        this.playSound('draw'); 

        const pool = this.getSmartPool(count);
        
        if (pool.length === 0) { 
            container.innerHTML = '<div style="color:#aaa;padding:40px;">\ud83c\udf89 \u6682\u65e0\u5f85\u590d\u4e60\u5185\u5bb9\uff0c\u4f11\u606f\u4e00\u4e0b\u5427\uff01</div>'; 
            return; 
        }
        
        for(let i=0; i<count; i++) {
            const card = pool[Math.floor(Math.random() * pool.length)];
            const cardData = this.getCardState(card.id);
            const cardEl = document.createElement('div');
            cardEl.className = `card-wrapper rarity-${card.rarity} mastery-level-${cardData.level}`;
            
            cardEl.onclick = function(e) {
                if(e.target.tagName === 'BUTTON') return;
                this.classList.toggle('flipped'); 
                window.gachaSystem.playSound('flip');
            };
            
            let borderColor = '#2ecc71'; let iconClass = 'fa-leaf'; let gradient = 'linear-gradient(135deg, #11998e, #38ef7d)'; let shadowColor = 'rgba(46, 204, 113, 0.6)';
            if(card.rarity === 'UR') { borderColor = '#ffd700'; iconClass = 'fa-gem'; gradient = 'linear-gradient(135deg, #fce38a, #f38181)'; shadowColor = 'rgba(255, 215, 0, 0.9)'; }
            else if(card.rarity === 'SSR') { borderColor = '#ff0080'; iconClass = 'fa-brain'; gradient = 'linear-gradient(135deg, #ff0080, #7928ca)'; shadowColor = 'rgba(255, 0, 128, 0.9)'; }
            else if(card.rarity === 'SR') { borderColor = '#00d2ff'; iconClass = 'fa-book-journal-whills'; gradient = 'linear-gradient(135deg, #00d2ff, #3a7bd5)'; shadowColor = 'rgba(0, 210, 255, 0.8)'; }

            const iconStyle = `font-size: 4rem; background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px ${shadowColor});`;
            const levelText = cardData.level === 0 ? "NEW" : `Lv.${cardData.level}`;
            const levelColor = cardData.level === 0 ? "#aaa" : "#ffd700";

            cardEl.innerHTML = `
                <div class="card-inner">
                    <div class="card-face face-front">
                        <div style="position:absolute; top:10px; left:10px; font-weight:bold; color:${levelColor}; border:1px solid ${levelColor}; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${levelText}</div>
                        <div class="rarity-badge" style="color:${borderColor}; border: 1px solid ${borderColor}">${card.rarity}</div>
                        <div class="card-icon" style="margin:20px 0;"><i class="fas ${iconClass}" style="${iconStyle}"></i></div>
                        <div class="card-title">${card.term}</div>
                        <div style="font-size:0.8rem; color:#aaa; margin-top:auto;"> \u70b9\u51fb\u7ffb\u8f6c</div>
                    </div>
                    <div class="card-face face-back" style="background: linear-gradient(145deg, #16213e 0%, #0f172a 100%);">
                        <div style="width:100%; z-index:1;">
                            <div style="color:${borderColor}; font-weight:bold; margin-bottom:10px; font-size:1.1rem; text-shadow: 0 0 5px ${borderColor}">${card.term}</div>
                            <div style="font-size:0.95rem; color:#eee; line-height:1.6; text-align:left; max-height:160px; overflow-y:auto; padding-right:5px;">${card.def || "\u6682\u65e0\u5b9a\u4e49"}</div>
                        </div>
                        <div class="card-actions" style="display:flex; gap:12px; margin-top:auto; z-index:2;">
                            <button class="btn-action btn-forget" onclick="window.gachaSystem.markResult(this, '${card.id}', false)" style="background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; color:#ff6b6b;"> \u4e0d\u4f1a</button>
                            <button class="btn-action btn-know" onclick="window.gachaSystem.markResult(this, '${card.id}', true)" style="background:rgba(46, 204, 113, 0.2); border:1px solid #2ecc71; color:#2ecc71;"> \u4f1a\u4e86</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(cardEl);
            setTimeout(() => { cardEl.classList.add('new-card'); }, i * 60);
        }
        this.saveState();
    },

    // --- 基础辅助 ---
    getCardState(id) { return this.state.progress[id] || { level: 0, nextReview: 0 }; },
    updateMastery(id, isKnown) {
        let cardData = this.state.progress[id] || { level: 0, nextReview: 0 };
        const now = Date.now();
        if (isKnown) {
            cardData.level = Math.min(cardData.level + 1, REVIEW_INTERVALS.length - 1);
            cardData.nextReview = now + REVIEW_INTERVALS[cardData.level];
            this.state.score += 10 * cardData.level;
        } else {
            cardData.level = Math.max(0, cardData.level - 2); 
            cardData.nextReview = 0;
        }
        this.state.progress[id] = cardData;
        this.saveState();
        this.updateUI();
    },
    loadState() { const s = localStorage.getItem('ai_gacha_save'); if(s) { const data = JSON.parse(s); if(Array.isArray(data.mastered)) { this.state.progress = {}; this.state.score = data.score; } else { this.state = data; } } },
    saveState() { localStorage.setItem('ai_gacha_save', JSON.stringify(this.state)); this.updateUI(); },
    flipAll() {
        const cards = document.querySelectorAll('.card-wrapper');
        if(cards.length > 0) this.playSound('draw');
        cards.forEach((card, index) => { setTimeout(() => { card.classList.toggle('flipped'); }, index * 50); });
    },
    updateUI() {
        const totalLv = Object.values(this.state.progress).reduce((acc, curr) => acc + curr.level, 0);
        const level = Math.floor(totalLv / 10) + 1; 
        const xp = (totalLv % 10) * 10;
        if(document.getElementById('xpBar')) document.getElementById('xpBar').style.width = xp + '%';
        if(document.getElementById('scoreVal')) document.getElementById('scoreVal').innerText = `Lv.${level}`;
        const masteredCount = Object.values(this.state.progress).filter(p => p.level >= 3).length;
        if(document.getElementById('masteredCount')) document.getElementById('masteredCount').innerText = masteredCount;
    },
    openAlbum() {
        const modal = document.getElementById('albumModal');
        const grid = document.getElementById('albumGrid');
        if(!modal || !grid) return;
        grid.innerHTML = '';
        window.DB.forEach(card => {
            const data = this.state.progress[card.id] || { level: 0 };
            const item = document.createElement('div');
            item.className = 'album-item';
            const isMastered = data.level >= 3;
            item.style.cssText = `background: ${isMastered ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : 'rgba(255,255,255,0.05)'}; padding:15px; border-radius:10px; color:#fff; text-align:center; font-size:0.9rem; border:1px solid ${isMastered ? '#2ecc71' : 'rgba(255,255,255,0.1)'};`;
            item.innerHTML = `${card.term} <br><span style="font-size:0.7rem;color:#aaa">Lv.${data.level}</span>`;
            grid.appendChild(item);
        });
        modal.style.display = 'block';
    },
    initParticles() {
        if (!document.getElementById("tsparticles")) return;
        if(window.tsParticles) {
            tsParticles.load("tsparticles", {
                fpsLimit: 60,
                particles: { number: { value: 80 }, color: { value: "#00f2fe" }, shape: { type: "circle" }, opacity: { value: 0.6 }, size: { value: 3 }, line_linked: { enable: true, distance: 150, color: "#00f2fe", opacity: 0.4, width: 1.5 }, move: { enable: true, speed: 1.5 } },
                interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" } }, modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } } },
                retina_detect: true
            });
        }
    },
    setParticleSpeed(speed) {
        if(window.tsParticles) {
            const container = tsParticles.domItem(0);
            if(container) { container.options.particles.move.speed = speed; container.refresh(); }
        }
    },
    bindGestures() {
        setTimeout(() => {
            if (!window.GestureSystem) return;
            const isQuizPage = document.getElementById('quizContainer') !== null;
            if (isQuizPage) {
                window.GestureSystem.bind('up', '\u5c55\u5f00\u5168\u90e8', () => { 
                    document.querySelectorAll('.analysis-box').forEach(box => box.style.display = 'block');
                    document.querySelectorAll('.btn-analysis').forEach(btn => btn.classList.add('active'));
                });
                window.GestureSystem.bind('down', '\u6536\u8d77\u5168\u90e8', () => { 
                    document.querySelectorAll('.analysis-box').forEach(box => box.style.display = 'none');
                    document.querySelectorAll('.btn-analysis').forEach(btn => btn.classList.remove('active'));
                });
            } else {
                window.GestureSystem.bind('up', '\u5341\u8fde\u62bd', () => this.draw(10));
                window.GestureSystem.bind('down', '\u5341\u8fde\u62bd', () => this.draw(10));
                window.GestureSystem.bind('left', '\u7ffb\u9875', () => this.flipAll());
                window.GestureSystem.bind('right', '\u7ffb\u9875', () => this.flipAll());
            }
        }, 1500);
    },
    initDraggable() {
        const elm = document.getElementById("draggableCamera");
        if(!elm) return;
        let isDragging = false; let startX, startY, initialLeft, initialTop;
        elm.addEventListener("mousedown", (e) => {
            if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            const rect = elm.getBoundingClientRect(); initialLeft = rect.left; initialTop = rect.top;
            elm.style.cursor = "grabbing"; elm.style.bottom = 'auto'; elm.style.right = 'auto'; elm.style.left = initialLeft + 'px'; elm.style.top = initialTop + 'px';
        });
        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            elm.style.left = (initialLeft + (e.clientX - startX)) + 'px'; elm.style.top = (initialTop + (e.clientY - startY)) + 'px';
        });
        window.addEventListener("mouseup", () => { isDragging = false; elm.style.cursor = "move"; });
    }
};

document.addEventListener('DOMContentLoaded', () => { window.gachaSystem.init(); });