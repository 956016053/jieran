/* ============================================================
    手势系统 V27.0 - 进出自动缩放 + 终极防抖版
   ============================================================ */
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

window.GestureSystem = {
    webcamRunning: false,
    handLandmarker: undefined,
    lastX: 0, lastY: 0, cooldown: false,
    handLostFrames: 0, // 丢失手势的帧数计数
    isHandPresent: false, // 标记手是否在画面内
    
    actions: {
        up: { label: "向上", fn: null },
        down: { label: "向下", fn: null },
        left: { label: "向左", fn: null },
        right: { label: "向右", fn: null }
    },

    bind(direction, label, callback) {
        if(this.actions[direction]) {
            this.actions[direction].label = label;
            this.actions[direction].fn = callback;
        }
    },

    async toggleCamera() {
        const btn = document.getElementById('camBtn');
        const container = document.getElementById('videoContainer');

        if (this.webcamRunning) {
            this.webcamRunning = false;
            this.stopCam();
            container.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-camera"></i> 开启手势';
            return;
        }

        container.style.display = 'flex'; 
        container.style.minHeight = "200px"; 
        
        this.webcamRunning = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 启动中...';

        try {
            await this.startCam(btn);

            if (!this.handLandmarker) {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: { 
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU" 
                    },
                    runningMode: "VIDEO", 
                    numHands: 1
                });
                console.log("✅ AI Ready");
            }
            btn.innerHTML = '<i class="fas fa-video-slash"></i> 关闭手势';
        } catch(e) {
            console.error(e);
            alert("启动失败：" + e.message);
            this.webcamRunning = false;
            container.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-camera"></i> 开启手势';
        }
    },

    startCam(btn) {
        return new Promise((resolve, reject) => {
            const video = document.getElementById('webcam');
            const canvas = document.getElementById('output_canvas');

            video.muted = true;
            video.playsInline = true;

            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                video.srcObject = stream;
                const playVideo = () => {
                    video.play().then(() => {
                        this.predict(); 
                        resolve();
                    }).catch(e => setTimeout(playVideo, 100));
                };
                if (video.readyState >= 1) playVideo();
                else video.onloadedmetadata = playVideo;
            }).catch(err => {
                alert("无法获取摄像头权限！");
                reject(err);
            });
        });
    },
    
    stopCam() {
        const video = document.getElementById('webcam');
        if(video && video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
    },
    
    async predict() {
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('output_canvas');
        
        if(!this.webcamRunning || !video || !canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
                canvas.width = video.clientWidth;
                canvas.height = video.clientHeight;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if(this.handLandmarker) {
                try {
                    let now = performance.now();
                    const result = this.handLandmarker.detectForVideo(video, now);
                    
                    if(result.landmarks && result.landmarks.length > 0) {
                        // --- 手在画面内 ---
                        this.handLostFrames = 0;
                        
                        // 🔥 如果之前没手，现在有了 -> 触发进入
                        if (!this.isHandPresent) {
                            this.isHandPresent = true;
                            if(window.quizSystem && window.quizSystem.enterFocusMode) {
                                window.quizSystem.enterFocusMode();
                                this.showFeedback("✋ 手势已接管 (自动放大)");
                            }
                        }

                        const landmarks = result.landmarks[0];
                        const x = landmarks[8].x * canvas.width;
                        const y = landmarks[8].y * canvas.height;
                        
                        ctx.fillStyle = "#00f2fe"; 
                        ctx.shadowBlur = 15;
                        ctx.shadowColor = "#00f2fe";
                        ctx.beginPath(); 
                        ctx.arc(x, y, 10, 0, 2*Math.PI); 
                        ctx.fill();

                        this.processGesture(landmarks[8].x, landmarks[8].y);
                    } else {
                        // --- 手不在画面内 ---
                        this.handLostFrames++;
                        // 连续 20 帧 (约0.5秒) 没检测到手，才判定离开，防止闪烁
                        if (this.handLostFrames > 20 && this.isHandPresent) {
                            this.isHandPresent = false;
                            if(window.quizSystem && window.quizSystem.exitFocusMode) {
                                window.quizSystem.exitFocusMode();
                                this.showFeedback("👋 手势已断开 (自动恢复)");
                            }
                        }
                    }
                } catch (e) {}
            }
        }
        window.requestAnimationFrame(() => this.predict());
    },

    processGesture(currX, currY) {
        // 🔥🔥🔥 核心修复：即使在冷却期，也要更新坐标！🔥🔥🔥
        // 这能解决“回正误触”问题。因为你回手的时候，lastX 也在跟着变，
        // 等冷却结束时，相对位移就很小，不会触发反向操作。
        if (this.cooldown) {
            this.lastX = currX;
            this.lastY = currY;
            return;
        }

        if(this.lastX !== 0) {
            const deltaX = currX - this.lastX;
            const deltaY = currY - this.lastY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            
            // 灵敏度 0.03 (平衡点)
            const THRESHOLD = 0.03; 
            
            if (absX > THRESHOLD || absY > THRESHOLD) {
                let dir = "";
                if (absY > absX) {
                    dir = deltaY < -THRESHOLD ? 'up' : 'down';
                } else {
                    dir = deltaX > 0 ? 'left' : 'right'; 
                }
                
                if(dir && this.actions[dir].fn) {
                    this.triggerAction(dir);
                }
            }
        }
        this.lastX = currX; this.lastY = currY;
    },

    triggerAction(dir) {
        const action = this.actions[dir];
        this.showFeedback("识别到: " + action.label, "#00f2fe");

        if(action.fn) action.fn();
        
        this.cooldown = true;
        // 冷却 800ms，配合上面的坐标实时更新，手感会很顺滑
        setTimeout(() => { 
            this.cooldown = false; 
            const feedback = document.getElementById('gestureFeedback');
            if(feedback) { 
                feedback.style.color = "white"; 
                feedback.innerText = "等待手势..."; 
            }
        }, 800); 
    },

    showFeedback(text, color = "white") {
        const feedback = document.getElementById('gestureFeedback');
        if(feedback) {
            feedback.innerText = text;
            feedback.style.color = color;
        }
        if (text.includes("识别到")) return; 
        const overlay = document.getElementById('gestureActionOverlay');
        if(overlay) {
            overlay.innerText = text;
            overlay.classList.add('show');
            setTimeout(() => overlay.classList.remove('show'), 1000);
        }
    }
};

window.gestureSystem = window.GestureSystem;