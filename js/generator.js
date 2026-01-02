// js/generator.js（前后端交互版）
window.onload = function() {
    // 获取DOM元素
    const tryNowBtn = document.getElementById('animalGeneratorBtn');
    const generatorArea = document.getElementById('animalGenerator');
    const generateNewBtn = document.getElementById('generateNewBtn');
    const loading = document.getElementById('loadingIndicator');
    const resultImg = document.getElementById('generatedImage');

// 替换为你的公开网址（示例，需根据实际地址修改）
    const API_URL = "https://u794977-a2d0-21822356.bjb1.seetacloud.com:8443/generate";
    // 初始隐藏生成器区域
    generatorArea.style.display = 'none';

    // Try Now按钮：显示生成器区域并生成第一张图像
    tryNowBtn.addEventListener('click', function(e) {
        e.preventDefault();
        generatorArea.style.display = 'block';
        generatorArea.scrollIntoView({ behavior: 'smooth' });
        generateImage();  // 触发首次生成
    });

    // 生成新图像按钮
    generateNewBtn.addEventListener('click', generateImage);

    // 核心：调用后端API生成图像
    function generateImage() {
        // 显示加载状态
        loading.style.display = 'flex';  // 假设CSS中loading是flex布局
        resultImg.style.display = 'none';
        generateNewBtn.disabled = true;

        // 发送POST请求到后端
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ num_images: 4 })  // 生成4张图像
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('后端请求失败');
            }
            return response.blob();  // 接收图像二进制数据
        })
        .then(blob => {
            // 将二进制数据转为图片URL
            const imageUrl = URL.createObjectURL(blob);
            resultImg.src = imageUrl;
            
            // 图片加载完成后更新UI
            resultImg.onload = function() {
                loading.style.display = 'none';
                resultImg.style.display = 'block';
                generateNewBtn.disabled = false;
                URL.revokeObjectURL(imageUrl);  // 释放内存
            };
        })
        .catch(error => {
            // 处理错误
            console.error('生成失败：', error);
            loading.innerHTML = `<p>生成失败：${error.message}</p><p>请重试</p>`;
            generateNewBtn.disabled = false;
        });
    }
};