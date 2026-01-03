window.quizSystem = {
    currentPage: 1,
    pageSize: 6,
    currentFilter: 'all', 
    filteredData: [],
    allQuestions: [], 

    init() {
        console.log("🚀 Quiz System Initializing...");
        this.loadData();
        this.bindEvents();
        this.bindGestureEvents();
        // 🔥 REMOVED initDraggableCamera() to prevent conflict with app.js
        this.render();
    },

    loadData() {
        const urlParams = new URLSearchParams(window.location.search);
        const subject = urlParams.get('subject'); 
        let targetData = [];

        if (subject === 'local') {
            const localJson = localStorage.getItem('my_local_question_bank'); 
            if (localJson) {
                targetData = JSON.parse(localJson);
                const title = document.querySelector('h2');
                if(title) title.innerHTML = '🏭 本地题库工厂';
            } else {
                if(window.QuestionBank) targetData = window.QuestionBank;
            }
        } else {
            if (typeof window.QuestionBank !== 'undefined') targetData = window.QuestionBank;
        }

        if (!targetData) targetData = [];

        this.allQuestions = targetData.map((q, index) => ({
            ...q,
            id: q.id || index + 1,
            type: this.normalizeType(q.type) 
        }));

        this.filteredData = this.allQuestions;
        this.updateStats();
    },

    normalizeType(type) {
        if (!type) return 'qa';
        const t = type.toLowerCase();
        if (t.includes('choice') || t.includes('选择')) return 'choice';
        if (t.includes('fill') || t.includes('填空')) return 'fill';
        return 'qa'; 
    },

    bindEvents() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(e.currentTarget.getAttribute('onclick')) return;
                filterBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.currentFilter = e.currentTarget.dataset.type;
                this.currentPage = 1; 
                this.filterQuestions();
            });
        });
    },

    bindGestureEvents() {
        const checkGesture = setInterval(() => {
            if (window.GestureSystem) {
                clearInterval(checkGesture);
                window.GestureSystem.bind('left', '下一页', () => { this.nextPage(); this.triggerVisualFeedback('next'); });
                window.GestureSystem.bind('right', '上一页', () => { this.prevPage(); this.triggerVisualFeedback('prev'); });
                window.GestureSystem.bind('up', '看解析', () => {
                    this.triggerVisualFeedback('analysis');
                    const btns = document.querySelectorAll('.btn-analysis');
                    if(btns.length > 0) this.toggleAnalysis(btns[0]);
                });
            }
        }, 500);
    },

    triggerVisualFeedback(actionType) {
        const overlay = document.getElementById('gestureActionOverlay');
        if(!overlay) return;
        let icon = '';
        if(actionType === 'next') icon = '➡️ 下一页';
        else if(actionType === 'prev') icon = '⬅️ 上一页';
        else if(actionType === 'analysis') icon = '💡 看解析';
        overlay.innerHTML = icon;
        overlay.classList.add('show');
        setTimeout(() => overlay.classList.remove('show'), 500);
    },

    filterQuestions() {
        if (this.currentFilter === 'all') {
            this.filteredData = this.allQuestions;
        } else {
            this.filteredData = this.allQuestions.filter(q => q.type === this.currentFilter);
        }
        this.render();
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    },

    nextPage() {
        const maxPage = Math.ceil(this.filteredData.length / this.pageSize);
        if (this.currentPage < maxPage) {
            this.currentPage++;
            this.render();
            if(typeof confetti === 'function') confetti({ particleCount: 30, spread: 50, origin: { x: 1, y: 0.8 } });
        }
    },

    formatAnswer(q) {
        if (q.type === 'choice' && typeof q.answer === 'number') {
            return String.fromCharCode(65 + q.answer);
        }
        return q.answer;
    },

    renderInputArea(q) {
        if (q.type === 'choice' && q.options) {
            return `<div class="opt-group">${q.options.map((opt, i) => `
                <div class="opt-item" onclick="this.classList.toggle('selected')">
                    <span class="opt-key">${String.fromCharCode(65+i)}</span> 
                    <span>${opt}</span>
                </div>`).join('')}
            </div>`;
        } else {
            return `<input type="text" class="q-input" placeholder="请在此输入..." />`;
        }
    },

    toggleAnalysis(btn) {
        const box = btn.nextElementSibling;
        if (box.style.display === 'none') {
            box.style.display = 'block';
            btn.innerHTML = '🙈 收起解析';
            btn.classList.add('active');
        } else {
            box.style.display = 'none';
            btn.innerHTML = '👀 查看解析';
            btn.classList.remove('active');
        }
    },

    rateQuestion(id, isKnown, btn) {
        if (window.gachaSystem) {
            window.gachaSystem.updateMastery(id, isKnown);
            
            if (typeof window.gachaSystem.handleBattleAction === 'function') {
                window.gachaSystem.handleBattleAction(isKnown);
            }
            
            const parent = btn.parentElement;
            parent.innerHTML = isKnown 
                ? '<div style="color:#2ecc71; text-align:center; font-weight:bold;">⚔️ 暴击！病毒受损！</div>'
                : '<div style="color:#e74c3c; text-align:center; font-weight:bold;">🛡️ 受到重创！</div>';
        } else {
            alert("⚠️ 无法连接到主系统");
        }
    },

    render() {
        const container = document.getElementById('quizContainer');
        if (!container) return;

        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const currentItems = this.filteredData.slice(start, end);

        container.innerHTML = '';

        if (this.filteredData.length === 0) {
             container.innerHTML = `<div class="empty-tip">📭 暂无数据</div>`;
             return;
        }

        currentItems.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = `q-card type-${q.type} animate-in`;
            card.style.animationDelay = `${index * 0.05}s`;
            
            let typeLabel = '简答';
            if(q.type === 'choice') typeLabel = '选择';
            if(q.type === 'fill') typeLabel = '填空';

            const displayId = String(start + index + 1).padStart(3, '0');
            const analysisContent = q.explanation || q.analysis || "暂无详细解析";
            const hintContent = q.hint ? `<div class="hint-text">💡 ${q.hint}</div>` : '';
            
            let levelHtml = '';
            if (window.gachaSystem) {
                const cardState = window.gachaSystem.getCardState(q.id);
                if(cardState.level > 0) levelHtml = `<span style="font-size:0.7rem; color:#ffd700; margin-left:10px;">Lv.${cardState.level}</span>`;
            }

            card.innerHTML = `
                <div class="q-header">
                    <div>
                        <span class="q-badge">${typeLabel}</span>
                        <span class="q-id">#${displayId}</span>
                        ${levelHtml}
                    </div>
                </div>
                <div class="q-title">${q.question}</div>
                <div class="q-input-area">
                    ${this.renderInputArea(q)}
                    <button class="btn-analysis" onclick="window.quizSystem.toggleAnalysis(this)">👀 查看解析 & 评分</button>
                    <div class="analysis-box" style="display:none;">
                        ${hintContent}
                        <div class="correct-ans">✅ 参考答案：${this.formatAnswer(q)}</div>
                        <div class="expl-text">${analysisContent}</div>
                        <div style="margin-top:15px; border-top:1px dashed rgba(255,255,255,0.2); padding-top:10px; display:flex; gap:10px;">
                            <button onclick="window.quizSystem.rateQuestion('${q.id}', false, this)" 
                                style="flex:1; padding:8px; background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; color:#ff6b6b; border-radius:5px; cursor:pointer;">
                                😰 还没学会
                            </button>
                            <button onclick="window.quizSystem.rateQuestion('${q.id}', true, this)" 
                                style="flex:1; padding:8px; background:rgba(46, 204, 113, 0.2); border:1px solid #2ecc71; color:#2ecc71; border-radius:5px; cursor:pointer;">
                                🧠 已经掌握
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        this.updatePagination();
    },

    updatePagination() {
        const total = this.filteredData.length;
        const maxPage = Math.ceil(total / this.pageSize) || 1;
        document.getElementById('pageInfo').innerText = `第 ${this.currentPage} / ${maxPage} 页`;
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if(prevBtn) prevBtn.disabled = this.currentPage === 1;
        if(nextBtn) nextBtn.disabled = this.currentPage === maxPage;
    },

    updateStats() {
        const el = document.getElementById('totalStats');
        if(el) el.innerText = `共 ${this.allQuestions.length} 题`;
    }
};

document.addEventListener('DOMContentLoaded', () => { window.quizSystem.init(); });