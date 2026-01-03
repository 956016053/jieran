/* ============================================================
    手势系统 V54.0 - 宽度解锁修正版
   ============================================================ */
import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

window.GestureSystem = {
    webcamRunning: false,
    handLandmarker: undefined,
    lastX: 0, lastY: 0, cooldown: false,
    
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

        container.style.display = 'flex'; // Flex 布局
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
            console.error("启动失败:", e);
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

            // CSS 负责布局，JS 只负责功能
            video.muted = true;
            video.playsInline = true;

            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                video.srcObject = stream;

                const playVideo = () => {
                    video.play().then(() => {
                        this.predict(); 
                        resolve();
                    }).catch(e => {
                        setTimeout(playVideo, 100);
                    });
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
            // 🔥🔥🔥 核心修复：只调整画布尺寸，绝对不要动视频尺寸！ 🔥🔥🔥
            // 让 CSS 的 object-fit: cover 自动处理视频拉伸
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
                    }
                } catch (e) {}
            }
        }
        window.requestAnimationFrame(() => this.predict());
    },

    processGesture(currX, currY) {
        if(this.lastX !== 0 && !this.cooldown) {
            const deltaX = currX - this.lastX;
            const deltaY = currY - this.lastY;
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            const THRESHOLD = 0.02; 
            
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
        const feedback = document.getElementById('gestureFeedback');
        const overlay = document.getElementById('gestureActionOverlay');
        const action = this.actions[dir];
        
        if(feedback) { 
            feedback.innerText = "识别到: " + action.label; 
            feedback.style.color = "#00f2fe"; 
        }
        
        if(overlay) {
            overlay.innerText = action.label;
            overlay.classList.add('show');
            setTimeout(() => overlay.classList.remove('show'), 500);
        }

        if(action.fn) action.fn();
        
        this.cooldown = true;
        setTimeout(() => { 
            this.cooldown = false; 
            if(feedback) { 
                feedback.style.color = "white"; 
                feedback.innerText = "等待手势..."; 
            }
        }, 400); 
    }
};

window.gestureSystem = window.GestureSystem;