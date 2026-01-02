import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

window.GestureSystem = {
    webcamRunning: false,
    handLandmarker: undefined,
    lastX: 0, lastY: 0, cooldown: false,
    
    // 定义动作槽位
    actions: {
        up: { label: "向上", fn: null },
        down: { label: "向下", fn: null },
        left: { label: "向左", fn: null },
        right: { label: "向右", fn: null }
    },

    // 🔥 绑定动作的接口 (app.js 会调用这个)
    bind(direction, label, callback) {
        if(this.actions[direction]) {
            this.actions[direction].label = label;
            this.actions[direction].fn = callback;
        }
    },

    // 开关摄像头
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

        if (!this.handLandmarker) {
            btn.innerText = "⏳ 加载模型...";
            try {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: { 
                        // 🔥 修复：使用 Google 官方源，解决 jsDelivr 404 问题
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                        delegate: "GPU" 
                    },
                    runningMode: "VIDEO", numHands: 1
                });
            } catch(e) {
                console.error(e);
                alert("⚠️ 模型加载失败，请检查网络！(需能访问Google存储桶)");
                btn.innerText = "⚠️ 加载失败";
                return;
            }
        }

        this.webcamRunning = true;
        container.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 启动中...';
        this.startCam(btn);
    },

    startCam(btn) {
        const video = document.getElementById('webcam');
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            video.srcObject = stream;
            video.onloadeddata = () => {
                btn.innerHTML = '<i class="fas fa-video-slash"></i> 关闭手势';
                this.predict();
            };
        }).catch(err => {
            alert("无法访问摄像头权限！");
            this.webcamRunning = false;
        });
    },
    
    stopCam() {
        const video = document.getElementById('webcam');
        if(video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    },
    
    async predict() {
        const video = document.getElementById('webcam');
        const canvas = document.getElementById('output_canvas');
        const ctx = canvas.getContext('2d');
        if(!this.webcamRunning) return;
        
        if (video.videoWidth > 0) {
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            let now = performance.now();
            
            if(this.handLandmarker) {
                const result = this.handLandmarker.detectForVideo(video, now);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                if(result.landmarks.length > 0) {
                    const landmarks = result.landmarks[0];
                    const x = landmarks[9].x * canvas.width;
                    const y = landmarks[9].y * canvas.height;
                    
                    ctx.fillStyle = "#00ff00"; ctx.beginPath(); ctx.arc(x, y, 8, 0, 2*Math.PI); ctx.fill();

                    const currX = landmarks[9].x;
                    const currY = landmarks[9].y;

                    if(this.lastX !== 0 && !this.cooldown) {
                        const deltaX = currX - this.lastX;
                        const deltaY = currY - this.lastY;
                        const absX = Math.abs(deltaX);
                        const absY = Math.abs(deltaY);
                        const THRESHOLD = 0.04; // 灵敏度
                        
                        if (absX > THRESHOLD || absY > THRESHOLD) {
                            let dir = "";
                            if (absY > absX) {
                                // 👆 向上/👇 向下：统一映射为“换一批”
                                dir = deltaY < -THRESHOLD ? 'up' : 'down';
                            } else {
                                // 👈 向左/👉 向右：统一映射为“翻页/单抽”
                                // 镜像修正：x变大在视觉上是向右挥手
                                dir = deltaX > 0 ? 'left' : 'right'; 
                            }
                            
                            if(dir && this.actions[dir].fn) {
                                this.triggerAction(dir);
                            }
                        }
                    }
                    this.lastX = currX; this.lastY = currY;
                }
            }
        }
        window.requestAnimationFrame(() => this.predict());
    },

    triggerAction(dir) {
        const feedback = document.getElementById('gestureFeedback');
        const overlay = document.getElementById('gestureActionOverlay');
        const action = this.actions[dir];
        
        if(feedback) { feedback.innerText = action.label; feedback.style.color = "#00ff00"; }
        
        // 屏幕中央大图标反馈
        if(overlay) {
            overlay.innerText = action.label;
            overlay.classList.add('show');
            setTimeout(() => overlay.classList.remove('show'), 800);
        }

        if(action.fn) action.fn();
        
        this.cooldown = true;
        setTimeout(() => { 
            this.cooldown = false; 
            if(feedback) { feedback.style.color = "white"; feedback.innerText = "等待手势..."; }
        }, 800); 
    }
};

// 挂载
window.gestureSystem = window.GestureSystem;