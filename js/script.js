// 垂直立方体滑块功能
class VerticalCubeSlider {
    constructor() {
        this.currentIndex = 0;
        this.isAnimating = false;
        this.sliceCount = 10;
        this.autoPlayInterval = null;
        this.isPlaying = true;
        this.currentFace = 0;
        
        this.images = [
            {
                url: 'img/unsplash-image-01.jpg',
                thumb: 'img/unsplash-thumb-01.jpg',
                title: 'Carrot-Loving Bubu',
                description: 'Bubu enjoys munching on a fresh carrot, his favorite snack.'
            },
            {
                url: 'img/unsplash-image-02.jpg',
                thumb: 'img/unsplash-thumb-02.jpg',
                title: 'Sleepy Bubu',
                description: 'Bubu is taking a cozy nap, with a cute bubble on his face'
            },
            {
                url: 'img/unsplash-image-03.jpg',
                thumb: 'img/unsplash-thumb-03.jpg',
                title: ' Traveler Bubu at the Forbidden City',
                description: 'Bubu explores the Forbidden City, carrying a bowl of delicious food.'
            },
            {
                url: 'img/unsplash-image-04.jpg',
                thumb: 'img/unsplash-thumb-04.jpg',
                title: 'Foodie Bubu',
                description: 'Bubu is happily eating a meal, savoring every bite.'
            }
        ];
        
        this.init();
    }
    
    init() {
        this.createSlices();
        this.createDots();
        this.createThumbnails();
        this.attachEventListeners();
        this.initializeImages();
        this.startAutoPlay();
    }
    
    createSlices() {
        const stage = document.getElementById('sliderStage');
        const containerWidth = stage.offsetWidth;
        
        for (let i = 0; i < this.sliceCount; i++) {
            const sliceContainer = document.createElement('div');
            sliceContainer.className = 'slice-container';
            
            const sliceCube = document.createElement('div');
            sliceCube.className = 'slice-cube';
            
            for (let face = 1; face <= 4; face++) {
                const sliceFace = document.createElement('div');
                sliceFace.className = `slice-face face-${face}`;
                
                const sliceImage = document.createElement('div');
                sliceImage.className = 'slice-image';
                sliceImage.dataset.face = face;
                
                const sliceWidth = containerWidth / this.sliceCount;
                const leftPosition = -(i * sliceWidth);
                sliceImage.style.left = `${leftPosition}px`;
                sliceImage.style.width = `${containerWidth}px`;
                
                sliceFace.appendChild(sliceImage);
                sliceCube.appendChild(sliceFace);
            }
            
            sliceContainer.appendChild(sliceCube);
            stage.appendChild(sliceContainer);
        }
    }
    
    createDots() {
        const dotsContainer = document.getElementById('dots');
        
        this.images.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (index === 0) dot.classList.add('active');
            dot.dataset.index = index;
            
            dot.addEventListener('click', () => {
                if (!this.isAnimating && index !== this.currentIndex) {
                    this.goToSlide(index);
                }
            });
            
            dotsContainer.appendChild(dot);
        });
    }
    
    createThumbnails() {
        const thumbnailsContainer = document.getElementById('thumbnails');
        
        this.images.forEach((image, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail';
            if (index === 0) thumbnail.classList.add('active');
            thumbnail.dataset.index = index;
            thumbnail.style.backgroundImage = `url(${image.thumb})`;
            
            thumbnail.addEventListener('click', () => {
                if (!this.isAnimating && index !== this.currentIndex) {
                    this.goToSlide(index);
                }
            });
            
            thumbnailsContainer.appendChild(thumbnail);
        });
    }
    
    initializeImages() {
        // 设置初始图片
        this.updateSlideContent(this.currentIndex);
    }
    
    attachEventListeners() {
        // 箭头导航
        document.getElementById('prevArrow').addEventListener('click', () => this.prevSlide());
        document.getElementById('nextArrow').addEventListener('click', () => this.nextSlide());
        
        // 播放/暂停按钮
        const playPauseBtn = document.getElementById('playPauseBtn');
        playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pauseAutoPlay();
                playPauseBtn.classList.add('paused');
            } else {
                this.startAutoPlay();
                playPauseBtn.classList.remove('paused');
            }
        });
        
        // 窗口大小变化时重新计算切片宽度
        window.addEventListener('resize', () => this.updateSliceWidths());
        
        // 导航栏滚动效果
        window.addEventListener('scroll', () => {
            const header = document.getElementById('header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        // 移动端菜单
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // 导航链接点击关闭菜单
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    updateSliceWidths() {
        const stage = document.getElementById('sliderStage');
        const containerWidth = stage.offsetWidth;
        const slices = document.querySelectorAll('.slice-image');
        const sliceWidth = containerWidth / this.sliceCount;
        
        slices.forEach((slice, i) => {
            const sliceIndex = i % this.sliceCount;
            const leftPosition = -(sliceIndex * sliceWidth);
            slice.style.width = `${containerWidth}px`;
            slice.style.left = `${leftPosition}px`;
        });
    }
    
    updateSlideContent(index) {
        const images = document.querySelectorAll('.slice-image');
        const imageData = this.images[index];
        
        // 更新所有切片的图片
        images.forEach((img, i) => {
            const face = parseInt(img.dataset.face);
            const targetIndex = (index + face - 1) % this.images.length;
            img.style.backgroundImage = `url(${this.images[targetIndex].url})`;
        });
        
        // 更新标题和描述（带动画）
        const textOverlay = document.getElementById('textOverlay');
        textOverlay.classList.add('hiding');
        
        setTimeout(() => {
            document.getElementById('slideTitle').textContent = imageData.title;
            document.getElementById('slideDescription').textContent = imageData.description;
            textOverlay.classList.remove('hiding');
        }, 300);
        
        // 更新指示器
        this.updateIndicators(index);
    }
    
    updateIndicators(index) {
        // 更新 dots
        document.querySelectorAll('.dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        // 更新缩略图
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }
    
    rotateSlices() {
        this.isAnimating = true;
        const cubes = document.querySelectorAll('.slice-cube');
        
        // 重置进度条
        const progressBar = document.getElementById('progressBar');
        progressBar.classList.remove('active', 'reset');
        void progressBar.offsetWidth; // 触发重绘
        progressBar.classList.add('active');
        
        // 计算下一个面
        this.currentFace = (this.currentFace + 1) % 4;
        
        // 应用旋转动画
        cubes.forEach(cube => {
            cube.className = 'slice-cube';
            cube.classList.add(`rotate-${this.currentFace}`);
        });
        
        // 动画结束后更新状态
        setTimeout(() => {
            this.isAnimating = false;
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this.updateSlideContent(this.currentIndex);
            
            // 如果自动播放中，重置计时器
            if (this.isPlaying) {
                this.resetAutoPlay();
            }
        }, 900); // 与CSS过渡时间匹配
    }
    
    goToSlide(index) {
        if (this.isAnimating) return;
        
        const diff = Math.abs(index - this.currentIndex);
        this.isAnimating = true;
        
        // 重置进度条
        const progressBar = document.getElementById('progressBar');
        progressBar.classList.remove('active', 'reset');
        
        // 旋转到目标索引
        const cubes = document.querySelectorAll('.slice-cube');
        cubes.forEach(cube => {
            cube.className = 'slice-cube';
            cube.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
        });
        
        // 计算需要旋转的面数
        let faceDiff = (index - this.currentIndex + this.images.length) % this.images.length;
        this.currentFace = (this.currentFace + faceDiff) % 4;
        
        cubes.forEach(cube => {
            cube.classList.add(`rotate-${this.currentFace}`);
        });
        
        setTimeout(() => {
            this.currentIndex = index;
            this.updateSlideContent(this.currentIndex);
            this.isAnimating = false;
            
            // 重置自动播放
            if (this.isPlaying) {
                this.resetAutoPlay();
            }
        }, 600);
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        const prevIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.goToSlide(prevIndex);
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        this.rotateSlices();
    }
    
    startAutoPlay() {
        this.isPlaying = true;
        this.autoPlayInterval = setInterval(() => this.rotateSlices(), 5000); // 5秒切换一次
        document.getElementById('progressBar').classList.add('active');
    }
    
    pauseAutoPlay() {
        this.isPlaying = false;
        clearInterval(this.autoPlayInterval);
        document.getElementById('progressBar').classList.remove('active');
    }
    
    resetAutoPlay() {
        clearInterval(this.autoPlayInterval);
        this.autoPlayInterval = setInterval(() => this.rotateSlices(), 5000);
    }
}

// 初始化滑块和页面基础交互
document.addEventListener('DOMContentLoaded', () => {
    // 初始化垂直立方体滑块
    // new VerticalCubeSlider();
    
    // 表单提交处理（原有功能）
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Message sent successfully! (Demo only)');
            contactForm.reset();
        });
    }
});