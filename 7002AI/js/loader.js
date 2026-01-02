/* ============================================================
   🚀 智能加载器 (Loader)
   功能：根据 URL 参数加载题库（支持本地缓存 和 远程文件）
   ============================================================ */
(function() {
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject') || 'default';

    console.log(`📡 准备加载题库: [${subject}]`);

    // --- 分支 1: 如果是 "local" 模式，直接读取 LocalStorage ---
    if (subject === 'local') {
        const localData = localStorage.getItem('my_local_question_bank');
        
        if (localData) {
            try {
                // 将本地数据赋值给全局变量，模拟文件加载效果
                window.QuestionBank = JSON.parse(localData);
                console.log(`✅ 成功读取本地题库，共 ${window.QuestionBank.length} 题`);
                
                // 启动系统
                startQuizSystem();
            } catch (e) {
                alert("❌ 本地数据损坏，请尝试在首页清空题库。");
                console.error(e);
            }
        } else {
            alert("⚠️ 本地题库为空！\n请先在首页上传 PDF 生成题目。");
            window.location.href = 'index.html'; //以此跳回首页
        }
        return; // 结束执行，不再加载外部文件
    }

    // --- 分支 2: 常规模式，加载 js/banks/ 下的文件 ---
    const src = `banks/${subject}.js?t=${new Date().getTime()}`; // 加时间戳防缓存

    const script = document.createElement('script');
    script.src = src;
    
    script.onload = () => {
        console.log("✅ 远程题库文件加载完毕");
        startQuizSystem();
    };

    script.onerror = () => {
        alert(`❌ 无法加载题库: ${subject}.js\n请检查文件名是否正确。`);
    };

    document.head.appendChild(script);

    // --- 辅助函数：启动 Quiz ---
    function startQuizSystem() {
        // 确保 quizSystem 已存在（quiz.js 已加载）
        if (window.quizSystem) {
            window.quizSystem.init();
            // 如果不是刷题模式，自动开始第一题
            if(!window.quizSystem.isReviewMode) {
                window.quizSystem.nextQuestion();
            }
        }
    }

})();