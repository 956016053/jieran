/* ============================================================
    抽卡系统 V28.0 - 粒子修复 + 题库手势修复
   ============================================================ */
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

window.gachaSystem = {
    state: { score: 0, level: 1, mastered: [] },
    
    init() { 
        //  1. 无论什么页面，先启动粒子特效 (修复 Quiz 页面没背景问题)
        this.initParticles();
        
        //  2. 启动手势
        this.bindGestures();

        // 3. 如果没有数据 (如 Quiz 页面)，就不执行后面的抽卡逻辑
        if(!window.DB) return;
        
        // 4. 抽卡页面特有逻辑
        this.loadState(); 
        this.updateUI(); 
        this.initDraggable();
    },

    // 粒子初始化
    initParticles() {
        if (!document.getElementById("tsparticles")) return; // 如果HTML里没这个div就不跑
        
        if(window.tsParticles) {
            tsParticles.load("tsparticles", {
                fpsLimit: 60,
                particles: {
                    number: { value: 60, density: { enable: true, value_area: 800 } },
                    color: { value: "#ffffff" },
                    shape: { type: "circle" },
                    opacity: { value: 0.5, random: true },
                    size: { value: 3, random: true },
                    line_linked: { enable: true, distance: 150, color: "#ffffff", opacity: 0.4, width: 1 },
                    move: { enable: true, speed: 2, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" } },
                    modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
                },
                retina_detect: true
            });
        }
    },

    bindGestures() {
        setTimeout(() => {
            if (!window.GestureSystem) return;

            //  修复：检测当前页面是否有题库容器，比 URL 检测更准
            const isQuizPage = document.getElementById('quizContainer') !== null;

            if (isQuizPage) {
                console.log(" 激活题库页手势：上下=展开/收起");
                //  向上：展开
                window.GestureSystem.bind('up', '\u5c55\u5f00\u5168\u90e8', () => { 
                    document.querySelectorAll('.analysis-box').forEach(box => box.style.display = 'block');
                    document.querySelectorAll('.btn-analysis').forEach(btn => btn.classList.add('active'));
                });
                //  向下：收起
                window.GestureSystem.bind('down', '\u6536\u8d77\u5168\u90e8', () => { 
                    document.querySelectorAll('.analysis-box').forEach(box => box.style.display = 'none');
                    document.querySelectorAll('.btn-analysis').forEach(btn => btn.classList.remove('active'));
                });
            } else {
                console.log(" 激活抽卡页手势：上下=十连");
                //  首页
                window.GestureSystem.bind('up', '\u5341\u8fde\u62bd', () => this.draw(10));
                window.GestureSystem.bind('down', '\u5341\u8fde\u62bd', () => this.draw(10));
                window.GestureSystem.bind('left', '\u7ffb\u9875', () => this.flipAll());
                window.GestureSystem.bind('right', '\u7ffb\u9875', () => this.flipAll());
            }
        }, 2000); // 延迟2秒，确保 DOM 加载完
    },

    loadState() { const s = localStorage.getItem('ai_gacha_save'); if(s) this.state = JSON.parse(s); },
    saveState() { localStorage.setItem('ai_gacha_save', JSON.stringify(this.state)); this.updateUI(); },
    
    flipAll() {
        const cards = document.querySelectorAll('.card-wrapper');
        if(cards.length === 0) return;
        cards.forEach((card, index) => {
            setTimeout(() => { card.classList.toggle('flipped'); }, index * 50); 
        });
    },

    draw(count) {
        const container = document.getElementById('cardContainer');
        container.innerHTML = ''; 
        const pool = window.DB.filter(card => !this.state.mastered.includes(card.id));
        
        if (pool.length === 0) { 
            container.innerHTML = '<div style="color:#aaa;padding:40px;width:100%;text-align:center;"> \u592a\u5f3a\u4e86\uff01\u6240\u6709\u77e5\u8bc6\u70b9\u5df2\u638c\u63e1\uff01</div>'; 
            return; 
        }
        
        for(let i=0; i<count; i++) {
            const card = pool[Math.floor(Math.random() * pool.length)];
            const cardEl = document.createElement('div');
            cardEl.className = `card-wrapper rarity-${card.rarity}`;
            
            cardEl.onclick = function(e) {
                if(e.target.tagName === 'BUTTON') return;
                this.classList.toggle('flipped'); 
            };
            
            let borderColor = '#2ecc71'; 
            let iconClass = 'fa-leaf'; 
            let gradient = 'linear-gradient(135deg, #11998e, #38ef7d)'; 
            let shadowColor = 'rgba(46, 204, 113, 0.6)';

            if(card.rarity === 'UR') { 
                borderColor = '#ffd700'; iconClass = 'fa-gem'; 
                gradient = 'linear-gradient(135deg, #fce38a, #f38181)'; 
                shadowColor = 'rgba(255, 215, 0, 0.9)'; 
            } else if(card.rarity === 'SSR') { 
                borderColor = '#ff0080'; iconClass = 'fa-brain'; 
                gradient = 'linear-gradient(135deg, #ff0080, #7928ca)'; 
                shadowColor = 'rgba(255, 0, 128, 0.9)'; 
            } else if(card.rarity === 'SR') {
                borderColor = '#00d2ff'; iconClass = 'fa-book-journal-whills'; 
                gradient = 'linear-gradient(135deg, #00d2ff, #3a7bd5)'; 
                shadowColor = 'rgba(0, 210, 255, 0.8)';
            } 

            const iconStyle = `font-size: 4rem; background: ${gradient}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 10px ${shadowColor});`;

            cardEl.innerHTML = `
                <div class="card-inner">
                    <div class="card-face face-front">
                        <div class="rarity-badge" style="color:${borderColor}; border: 1px solid ${borderColor}">${card.rarity}</div>
                        <div class="card-icon" style="margin:20px 0;"><i class="fas ${iconClass}" style="${iconStyle}"></i></div>
                        <div class="card-title">${card.term}</div>
                        <div style="font-size:0.8rem; color:#aaa; margin-top:auto;"> \u70b9\u51fb\u7ffb\u8f6c</div>
                    </div>
                    <div class="card-face face-back" style="background: linear-gradient(145deg, #16213e 0%, #0f172a 100%);">
                        <div style="position:absolute; bottom:-10px; right:-10px; opacity:0.1; pointer-events:none;"><i class="fas ${iconClass}" style="font-size:8rem; color:${borderColor};"></i></div>
                        <div style="width:100%; z-index:1;">
                            <div style="color:${borderColor}; font-weight:bold; margin-bottom:10px; font-size:1.1rem; text-shadow: 0 0 5px ${borderColor}">${card.term}</div>
                            <div style="font-size:0.95rem; color:#eee; line-height:1.6; text-align:left; max-height:160px; overflow-y:auto; padding-right:5px;">${card.def || "\u6682\u65e0\u5b9a\u4e49"}</div>
                        </div>
                        <div class="card-actions" style="display:flex; gap:12px; margin-top:auto; z-index:2;">
                            <button class="btn-action btn-forget" onclick="window.gachaSystem.markUnknown(this)" style="background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; color:#ff6b6b;"> \u4e0d\u4f1a</button>
                            <button class="btn-action btn-know" onclick="window.gachaSystem.markKnown(this, '${card.id}')" style="background:rgba(46, 204, 113, 0.2); border:1px solid #2ecc71; color:#2ecc71;"> \u4f1a\u4e86</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(cardEl);
            setTimeout(() => { cardEl.classList.add('new-card'); }, i * 60);
        }
        
        this.state.score += count * 5;
        this.saveState();
        if(typeof confetti === 'function') confetti({ particleCount: count * 15, spread: 80, origin: { y: 0.6 } });
    },

    markKnown(btn, id) {
        const cardWrapper = btn.closest('.card-wrapper');
        if(typeof confetti === 'function') {
            const rect = btn.getBoundingClientRect();
            confetti({ particleCount: 50, spread: 70, origin: { x: (rect.left + rect.width/2)/window.innerWidth, y: rect.top/window.innerHeight }, colors: ['#ffd700', '#ff0080', '#00f2fe', '#38ef7d'], shapes: ['star'] });
        }
        cardWrapper.style.transform = "scale(0) translateY(-150px) rotate(45deg)";
        cardWrapper.style.opacity = "0";
        setTimeout(() => {
            cardWrapper.remove();
            if(document.getElementById('cardContainer').children.length === 0) {
                document.getElementById('cardContainer').innerHTML = '<div style="color:#aaa;padding:20px;"> \u672c\u7ec4\u590d\u4e60\u5b8c\u6bd5\uff01</div>';
            }
        }, 500);
        if(!this.state.mastered.includes(id)) { this.state.mastered.push(id); this.state.score += 20; this.saveState(); }
    },

    markUnknown(btn) { btn.closest('.card-wrapper').classList.remove('flipped'); },

    updateUI() {
        const xp = this.state.score % 100;
        const level = Math.floor(this.state.score / 100) + 1;
        if(document.getElementById('xpBar')) document.getElementById('xpBar').style.width = xp + '%';
        if(document.getElementById('scoreVal')) document.getElementById('scoreVal').innerText = `Lv.${level} (${this.state.score})`;
        if(document.getElementById('masteredCount')) document.getElementById('masteredCount').innerText = this.state.mastered.length;
    },

    openAlbum() {
        const modal = document.getElementById('albumModal');
        const grid = document.getElementById('albumGrid');
        if(!modal || !grid) return;
        grid.innerHTML = '';
        window.DB.forEach(card => {
            const item = document.createElement('div');
            const isMastered = this.state.mastered.includes(card.id);
            item.className = 'album-item';
            item.style.cssText = `background: ${isMastered ? 'linear-gradient(135deg, #2ecc71, #27ae60)' : '#222'}; padding:15px; border-radius:10px; color:#fff; text-align:center; font-size:0.9rem; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: default;`;
            item.innerText = card.term;
            grid.appendChild(item);
        });
        modal.style.display = 'block';
    },

    initDraggable() {
        const elm = document.getElementById("draggableCamera");
        if(!elm) return;
        let isDragging = false; let startX, startY, initialLeft, initialTop;
        elm.addEventListener("mousedown", (e) => {
            if(e.target.tagName === 'BUTTON') return;
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