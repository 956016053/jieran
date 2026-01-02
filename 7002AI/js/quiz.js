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
        this.initDraggableCamera(); // 启动全框拖拽
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
                
                window.GestureSystem.bind('left', '下一页', () => {
                    this.nextPage();
                    this.triggerVisualFeedback('next');
                });

                window.GestureSystem.bind('right', '上一页', () => {
                    this.prevPage();
                    this.triggerVisualFeedback('prev');
                });
                
                window.GestureSystem.bind('up', '看解析', () => {
                    this.triggerVisualFeedback('analysis');
                    const btns = document.querySelectorAll('.btn-analysis');
                    if(btns.length > 0) this.toggleAnalysis(btns[0]);
                });
            }
        }, 500);
    },

    // 🔥 核心修改：整个框都能拖，但点按钮不触发
    initDraggableCamera() {
        const draggableEl = document.getElementById("draggableCamera");
        if (!draggableEl) return;

        let isDragging = false;
        let startX, startY, initialX, initialY;
        let xOffset = 0, yOffset = 0;

        draggableEl.addEventListener("mousedown", dragStart);
        document.addEventListener("mouseup", dragEnd);
        document.addEventListener("mousemove", drag);

        draggableEl.addEventListener("touchstart", dragStart);
        document.addEventListener("touchend", dragEnd);
        document.addEventListener("touchmove", drag);

        function dragStart(e) {
            // 如果点的是按钮，不拖动
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }

            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (draggableEl.contains(e.target)) {
                isDragging = true;
                draggableEl.style.cursor = 'grabbing';
            }
        }

        function dragEnd() {
            initialX = xOffset;
            initialY = yOffset;
            isDragging = false;
            draggableEl.style.cursor = 'move';
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                let currentX, currentY;

                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                draggableEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        }
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
            if(typeof confetti === 'function') {
                confetti({ particleCount: 30, spread: 50, origin: { x: 1, y: 0.8 } });
            }
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

            card.innerHTML = `
                <div class="q-header">
                    <span class="q-badge">${typeLabel}</span>
                    <span class="q-id">#${displayId}</span>
                </div>
                
                <div class="q-title">${q.question}</div>

                <div class="q-input-area">
                    ${this.renderInputArea(q)}
                    
                    <button class="btn-analysis" onclick="window.quizSystem.toggleAnalysis(this)">
                        👀 查看解析
                    </button>
                    
                    <div class="analysis-box" style="display:none;">
                        ${hintContent}
                        <div class="correct-ans">✅ 答案：${this.formatAnswer(q)}</div>
                        <div class="expl-text">${analysisContent}</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        this.updatePagination();
    },

    formatAnswer(q) {
        if (q.type === 'choice' && typeof q.answer === 'number') {
            return String.fromCharCode(65 + q.answer);
        }
        return q.answer;
    },

    renderInputArea(q) {
        if (q.type === 'choice' && q.options) {
            return `
                <div class="opt-group">
                    ${q.options.map((opt, i) => `
                        <div class="opt-item" onclick="this.classList.toggle('selected')">
                            <span class="opt-key">${String.fromCharCode(65+i)}</span> 
                            <span>${opt}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            return `<input type="text" class="q-input" placeholder="请在此输入..." />`;
        }
    },

    toggleAnalysis(btn) {
        const box = btn.nextElementSibling;
        if (box.style.display === 'none') {
            box.style.display = 'block';
            btn.innerHTML = '🙈 收起';
            btn.classList.add('active');
        } else {
            box.style.display = 'none';
            btn.innerHTML = '👀 查看解析';
            btn.classList.remove('active');
        }
    },

    updatePagination() {
        const total = this.filteredData.length;
        const maxPage = Math.ceil(total / this.pageSize) || 1;
        document.getElementById('pageInfo').innerText = `第 ${this.currentPage} / ${maxPage} 页`;
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = this.currentPage === maxPage;
    },

    updateStats() {
        const el = document.getElementById('totalStats');
        if(el) el.innerText = `共 ${this.allQuestions.length} 题`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.quizSystem.init();
});