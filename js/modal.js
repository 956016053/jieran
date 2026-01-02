// 等待页面DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有训练中模型的按钮
    const trainingButtons = [
        document.getElementById('novelToAnimeBtn'),
        document.getElementById('shortStoryBtn'),
        document.getElementById('audioSynthesisBtn'),
        document.getElementById('virtualCharacterBtn'),
        document.getElementById('virtualPartnerBtn')
    ];
    
    // 获取提示框元素
    const trainingModal = document.getElementById('trainingModal');
    
    // 为每个按钮绑定点击事件
    trainingButtons.forEach(button => {
        if (button) { // 避免空元素报错
            button.addEventListener('click', function(e) {
                e.preventDefault(); // 阻止默认链接跳转
                trainingModal.style.display = 'flex'; // 显示提示框
            });
        }
    });

    // 点击外部遮罩关闭提示框
    trainingModal.addEventListener('click', function(e) {
        if (e.target === this) { // 仅点击遮罩层时触发
            closeModal();
        }
    });
});

// 关闭提示框的函数
function closeModal() {
    document.getElementById('trainingModal').style.display = 'none';
}