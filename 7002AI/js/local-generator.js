/* ============================================================
   🏭 本地题库工厂 (DeepSeek 专用版 - V3.0 终极版)
   功能：高级提示词(QA/Fill) + 默认Key + 进度条 + 兼容性修复
   ============================================================ */

window.localGen = {
    STORAGE_KEY: "my_local_question_bank",
    // 你的充值 Key，已内置
    DEFAULT_KEY: "sk-8c1725053cb943a4ad839cd692911662", 

    init: function() {
        this.updateCount();
        var input = document.getElementById("apiKeyInput");
        
        // 强制设置默认 Key，避免用户手动粘贴
        if (input) {
            input.value = this.DEFAULT_KEY;
        }
        window.testDeepSeek = this.testConnection;
    },

    startProcess: async function() {
        var fileInput = document.getElementById("pdfUpload");
        var apiKeyInput = document.getElementById("apiKeyInput");
        var status = document.getElementById("genStatus");
        var progressBar = document.getElementById("progressBar");
        var progressContainer = document.getElementById("progressContainer");

        var apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert("🔑 请先输入 DeepSeek API Key！");
            return;
        }
        if (fileInput.files.length === 0) {
            alert("📄 请先选择一个 PDF 文件！");
            return;
        }

        localStorage.setItem("user_deepseek_key", apiKey);

        try {
            // 1. 读取 PDF
            status.innerHTML = '<span style="color:#f1c40f">⏳ 1/3 正在读取 PDF...</span>';
            var text = await this.readPDF(fileInput.files[0]);
            
            if (!text || text.length < 50) {
                throw new Error("PDF 内容太少，无法生成。");
            }

            // 2. 调用 AI (启动进度条)
            status.innerHTML = '<span style="color:#00bfff">🧠 2/3 DeepSeek 正在深度思考 (生成混合题型)...</span>';
            
            // 显示进度条
            if(progressContainer) progressContainer.style.display = "block";
            this.startFakeProgress();

            var newQuestions = await this.callAI(text, apiKey);

            // 进度条跑满
            this.stopFakeProgress();
            if(progressBar) progressBar.style.width = "100%";

            // 3. 保存
            status.innerHTML = '<span style="color:#2ecc71">💾 3/3 正在保存...</span>';
            this.appendData(newQuestions);

            status.innerHTML = '✅ 成功！本次生成 ' + newQuestions.length + ' 题。';
            
            // 延迟隐藏进度条
            setTimeout(function() {
                if(progressContainer) progressContainer.style.display = "none";
                if(progressBar) progressBar.style.width = "0%";
            }, 2000);

            alert("🎉 搞定！DeepSeek 为你生成了 " + newQuestions.length + " 道高质量题目。\n包含：选择、填空、简答。\n快去抽卡试试！");
            fileInput.value = "";

        } catch (e) {
            console.error("生成失败:", e);
            this.stopFakeProgress();
            if(progressContainer) progressContainer.style.display = "none";
            status.innerHTML = '<span style="color:#e74c3c">❌ 失败: ' + e.message + '</span>';
        }
    },

    // --- 拟真进度条逻辑 ---
    progressInterval: null,
    startFakeProgress: function() {
        var bar = document.getElementById("progressBar");
        if(!bar) return;
        var width = 0;
        clearInterval(this.progressInterval);
        // 30秒内慢慢跑道 90%
        this.progressInterval = setInterval(function() {
            if (width >= 90) {
                // 等待真实结果
            } else {
                width += 0.5;
                bar.style.width = width + "%";
            }
        }, 100);
    },
    stopFakeProgress: function() {
        clearInterval(this.progressInterval);
    },

    readPDF: async function(file) {
        var arrayBuffer = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        var fullText = "";
        // 读取前 15 页，确保内容足够
        var maxPages = Math.min(pdf.numPages, 15); 
        for (var i = 1; i <= maxPages; i++) {
            var page = await pdf.getPage(i);
            var content = await page.getTextContent();
            var strings = content.items.map(function(item) { return item.str; });
            fullText += strings.join(" ") + "\n";
        }
        return fullText.slice(0, 40000); 
    },

    callAI: async function(text, key) {
        // --- 核心修改：植入高级提示词 ---
        var systemPrompt = `
# Role
你是一位拥有20年经验的资深教育专家和全栈工程师。

# Task
深度分析用户提供的文本资料，覆盖所有关键知识点，生成一个包含 选择题 (choice)、填空题 (fill)、简答题 (qa) 的题库数组。

# Rules (必须严格遵守)
1. 题目质量：
   - 拒绝简单查找，题目应考察理解、应用和逻辑。
   - 选择题：必须有4个选项，干扰项要有迷惑性。
   - 填空题：挖空的必须是核心关键词。
   - 简答题：考察核心概念的定义、原理或对比。
   - 解析 (explanation)：必须详细，解释为什么选这个，补充背景知识。
   - 提示 (hint)：幽默一点，或者给出联想记忆法。

2. 数据结构 (JSON Only)：
   必须返回纯 JSON 数组，严禁包含 markdown 标记 (不要写 \`\`\`json)。
   格式示例:
   [
     {
       "id": "unique_id_1",
       "type": "choice",
       "question": "题目...",
       "options": ["A", "B", "C", "D"],
       "answer": 0,
       "hint": "提示...",
       "explanation": "解析..."
     },
     {
       "id": "unique_id_2",
       "type": "fill",
       "question": "题目中挖空用____表示",
       "answer": "关键词",
       "hint": "...",
       "explanation": "..."
     },
     {
       "id": "unique_id_3",
       "type": "qa",
       "question": "简述...",
       "answer": "核心要点...",
       "hint": "...",
       "explanation": "..."
     }
   ]

3. 分布比例：
   - 选择题 50%, 填空题 30%, 简答题 20%。
   - **目标至少生成 10 道题**。
`;

        var userPrompt = "【学习资料内容如下】:\n" + text;
        
        // 修正 URL，去掉 markdown 符号
        var url = "https://api.deepseek.com/chat/completions";
        
        var payload = {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            stream: false,
            response_format: { type: "json_object" },
            max_tokens: 4000 // 增加 token 以支持生成更多题目
        };

        var response = await fetch(url, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            var errText = await response.text();
            if (response.status === 402) throw new Error("余额不足 (402)");
            if (response.status === 401) throw new Error("Key 无效 (401)");
            throw new Error("API 错误: " + response.status);
        }

        var data = await response.json();
        var rawJson = data.choices[0].message.content;
        
        // 暴力清洗 markdown
        rawJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
        
        try {
            var parsed = JSON.parse(rawJson);
            
            // 兼容各种返回格式
            if (Array.isArray(parsed)) return parsed;
            if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
            if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
            
            // 暴力搜索数组
            var keys = Object.keys(parsed);
            for(var i=0; i<keys.length; i++) {
                if(Array.isArray(parsed[keys[i]])) return parsed[keys[i]];
            }
            throw new Error("AI 返回格式无法解析");
        } catch (e) {
            console.error("JSON Error:", rawJson);
            throw new Error("生成失败，JSON 解析错误。");
        }
    },

    appendData: function(newItems) {
        var oldDataStr = localStorage.getItem(this.STORAGE_KEY);
        var currentBank = oldDataStr ? JSON.parse(oldDataStr) : [];
        var timestamp = Date.now();
        
        for(var i=0; i<newItems.length; i++) {
            newItems[i].id = "Local-" + timestamp + "-" + i;
            newItems[i].source = "UserUpload"; 
        }
        
        var finalBank = currentBank.concat(newItems);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(finalBank));
        this.updateCount();
    },

    clearData: function() {
        if(confirm("⚠️ 确定要清空所有本地生成的题目吗？")) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.updateCount();
            alert("已清空！");
        }
    },

    updateCount: function() {
        var s = localStorage.getItem(this.STORAGE_KEY);
        var count = s ? JSON.parse(s).length : 0;
        var el = document.getElementById("localCount");
        if(el) el.innerText = count;
        
        var btn = document.getElementById("startLocalQuizBtn");
        if(btn) {
            btn.style.display = (count > 0) ? "inline-block" : "none";
            btn.innerText = "🚀 去答题 (共" + count + "题)";
        }
    },

    testConnection: async function() {
        var key = document.getElementById("apiKeyInput").value;
        if(!key) return alert("请先填入 Key");
        try {
            var res = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [{role: "user", content: "Hi"}],
                    max_tokens: 5
                })
            });
            if(res.ok) alert("✅ 连接成功！");
            else alert("❌ 连接失败: " + res.status);
        } catch(e) {
            alert("❌ 网络不通");
        }
    }
};

setTimeout(function() { 
    if(window.localGen) window.localGen.init(); 
}, 500);