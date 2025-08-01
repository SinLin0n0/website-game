// ===============================
// 遊戲變數與設定
// ===============================

// 遊戲變數
let canvas, ctx;
let gameState = 'story';
let currentStoryPage = 1;
let maxStoryPages = 3;
let gameLoopId = null;

// 背景圖片變數
let backgroundImage = null;
let backgroundWidth = 0;
let backgroundHeight = 0;
let backgroundLoaded = false;

// 角色動畫系統
let characterSprites = {
    idle: [],
    running: []
};
let currentAnimation = 'idle';
let animationFrame = 0;
let lastFrameTime = 0;
let idleFrameInterval = 300; // 站立動畫：0.3秒換一張
let runningFrameInterval = 100; // 跑步動畫：0.1秒換一張
let spritesLoaded = false;

// 遊戲物件
let player = {
    x: 100, y: 0, width: 80, height: 80, // y位置會在初始化時設定
    velocityX: 0, velocityY: 0, onGround: false,
    health: 100, maxHealth: 100,
    shieldActive: false, shieldHits: 0,
    facingRight: true
};

let camera = { x: 0, y: 0 };

let world = {
    width: 4000, height: 0, gravity: 0.3, // 增加世界寬度以適應寬屏，高度初始化後設定
    roads: [], endpoint: null
};

let inventory = { healthPotions: 2, shields: 1 };
let keys = {};

// 遊戲尺寸設定 - 按照 513:749 比例
const GAME_HEIGHT_RATIO = 513 / 749;  // 遊戲高度與螢幕高度的比例
let GAME_HEIGHT = Math.floor(window.innerHeight * GAME_HEIGHT_RATIO);  // 動態計算遊戲高度
let GAME_WIDTH = window.innerWidth;  // 遊戲畫面寬度適應視窗

// ===============================
// 資源載入功能
// ===============================

// 載入背景圖片
function loadBackgroundImage() {
    backgroundImage = new Image();
    backgroundImage.onload = function() {
        backgroundWidth = this.width;
        backgroundHeight = this.height;
        backgroundLoaded = true;
        console.log('背景圖片載入完成:', backgroundWidth + 'x' + backgroundHeight);
    };
    backgroundImage.onerror = function() {
        console.log('背景圖片載入失敗，使用預設背景');
        backgroundLoaded = false;
    };
    // 使用相對路徑 - 請將您的背景圖片命名為 background.jpg 並放在與此HTML文件相同的目錄中
    backgroundImage.src = 'background.jpg';
}

// 載入角色動畫 - 確保正確順序載入
function loadCharacterSprites() {
    // 重置動畫數組，確保順序正確
    characterSprites.idle = [];
    characterSprites.running = [];
    
    // 站立動畫圖片路徑（SVG格式）
    const idleFramePaths = [
        'character-idle-1.svg',
        'character-idle-2.svg'
    ];
    
    // 跑步動畫圖片路徑（SVG格式） - 按照正確順序
    const runningFramePaths = [
        'character-run-1.svg',  // 索引0
        'character-run-2.svg',  // 索引1
        'character-run-3.svg',  // 索引2
        'character-run-4.svg'   // 索引3
    ];
    
    let loadedCount = 0;
    const totalFrames = idleFramePaths.length + runningFramePaths.length;
    
    // 確保按順序載入站立動畫
    function loadIdleAnimation(index) {
        if (index >= idleFramePaths.length) {
            loadRunningAnimation(0); // 開始載入跑步動畫
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            characterSprites.idle[index] = img;
            loadedCount++;
            console.log(`✅ 站立動畫 ${index + 1} 載入完成: ${idleFramePaths[index]} (${this.width}x${this.height})`);
            loadIdleAnimation(index + 1); // 載入下一個
        };
        img.onerror = function() {
            console.log(`❌ 站立動畫 ${index + 1} 載入失敗: ${idleFramePaths[index]}`);
            loadIdleAnimation(index + 1); // 繼續載入下一個
        };
        img.src = idleFramePaths[index];
    }
    
    // 確保按順序載入跑步動畫
    function loadRunningAnimation(index) {
        if (index >= runningFramePaths.length) {
            // 所有動畫載入完成
            spritesLoaded = true;
            console.log('🎉 所有角色動畫載入完成！');
            console.log('📊 載入結果:');
            console.log('  站立動畫:', characterSprites.idle.length, '幀');
            console.log('  跑步動畫:', characterSprites.running.length, '幀');
            console.log('⏱️ 動畫速度設定:');
            console.log(`  站立動畫：每${idleFrameInterval}ms切換一幀 (0.3秒)`);
            console.log(`  跑步動畫：每${runningFrameInterval}ms切換一幀 (0.1秒)`);
            console.log('🏃 跑步動畫順序確認:');
            characterSprites.running.forEach((sprite, i) => {
                console.log(`  索引${i}: ${runningFramePaths[i]} ✅`);
            });
            
            // 驗證動畫完整性
            console.log('🔍 動畫完整性檢查:');
            console.log('  預期跑步動畫順序: character-run-1 → character-run-2 → character-run-3 → character-run-4');
            console.log('  實際載入順序:', characterSprites.running.map((_, i) => `character-run-${i+1}`).join(' → '));
            
            if (characterSprites.running.length === 4) {
                console.log('✅ 跑步動畫載入完整，共4幀');
            } else {
                console.log(`❌ 跑步動畫載入不完整，預期4幀，實際${characterSprites.running.length}幀`);
            }
            return;
        }
        
        const img = new Image();
        img.onload = function() {
            characterSprites.running[index] = img;
            loadedCount++;
            console.log(`✅ 跑步動畫 ${index + 1} 載入完成: ${runningFramePaths[index]} (${this.width}x${this.height})`);
            loadRunningAnimation(index + 1); // 載入下一個
        };
        img.onerror = function() {
            console.log(`❌ 跑步動畫 ${index + 1} 載入失敗: ${runningFramePaths[index]}`);
            loadRunningAnimation(index + 1); // 繼續載入下一個
        };
        img.src = runningFramePaths[index];
    }
    
    // 開始按順序載入
    loadIdleAnimation(0);
}

// ===============================
// 初始化與設定功能
// ===============================

// 初始化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 設置遊戲尺寸
    updateCanvasSize();
    
    // 設置世界高度等於遊戲高度
    world.height = GAME_HEIGHT;
    
    // 設置玩家初始位置（將在createWorld後調整到road-1上方）
    player.y = Math.floor(GAME_HEIGHT * 0.5);
    
    // 設置渲染質量
    ctx.imageSmoothingEnabled = false; // 像素風格保持銳利
    canvas.oncontextmenu = function(e) { e.preventDefault(); e.stopPropagation(); }
    
    loadBackgroundImage();
    loadCharacterSprites();
    loadRoadImages();
    createWorld();
    setupEventListeners();
    updateUI();
}

// 更新Canvas尺寸
function updateCanvasSize() {
    GAME_WIDTH = window.innerWidth;
    GAME_HEIGHT = Math.floor(window.innerHeight * GAME_HEIGHT_RATIO);
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = GAME_WIDTH + 'px';
    canvas.style.height = GAME_HEIGHT + 'px';
    
    // 重新設置渲染品質
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'high';
}

function createWorld() {
    // 計算road-1元件尺寸，比例為171:247
    const roadRatio = 171 / 247;
    const roadWidth = Math.floor(GAME_WIDTH * roadRatio);
    const roadHeight = Math.floor(GAME_HEIGHT * roadRatio);
    
    // 設定road-1位置：與背景齊左，對齊背景下方為97
    const roadX = 0; // 與背景齊左
    const roadY = GAME_HEIGHT - 97 - roadHeight; // 對齊背景下方為97，但扣除元件高度
    
    // 創建road-1元件
    world.roads = [
        {
            x: roadX, 
            y: roadY, 
            width: roadWidth, 
            height: roadHeight,
            type: 'road-1'
        }
    ];
    
    // 設置玩家初始位置在road-1元件上方
    player.x = roadX + 50; // 在road-1左側一點
    player.y = roadY - player.height; // 站在road-1上方
    
    // 終點設在road元件的右側
    world.endpoint = {x: roadX + roadWidth + 50, y: roadY - 50, width: 100, height: 80};
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
    });
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    window.addEventListener('resize', () => {
        // 更新遊戲尺寸以適應新的視窗尺寸
        updateCanvasSize();
        world.height = GAME_HEIGHT; // 同時更新世界高度
        
        // 重新創建世界以適應新尺寸（會自動調整玩家位置）
        createWorld();
    });
}

// ===============================
// 遊戲流程控制
// ===============================

function nextPage() {
    if (currentStoryPage < maxStoryPages) {
        document.querySelector(`.story-page[data-page="${currentStoryPage}"]`).classList.remove('active');
        currentStoryPage++;
        document.querySelector(`.story-page[data-page="${currentStoryPage}"]`).classList.add('active');
        
        if (currentStoryPage === maxStoryPages) {
            document.getElementById('nextBtn').classList.add('hidden');
            document.getElementById('startBtn').classList.remove('hidden');
        }
    }
}

function startGame() {
    document.getElementById('storyModal').classList.add('hidden');
    gameState = 'playing';
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
    }
    gameLoop();
}

function endGame(success) {
    // 停止遊戲循環
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    gameState = 'ended';
    const modal = document.getElementById('endingModal');
    const title = document.getElementById('endingTitle');
    const text = document.getElementById('endingText');
    
    if (success) {
        title.textContent = '🎉 任務成功！';
        text.innerHTML = `恭喜你成功逃出了實驗室！<br><br>你發現的秘密將改變整個世界...<br><br>在你的努力下，人類終於找到了<br>突破科技極限的關鍵。<br><br>新的時代即將來臨！`;
    } else {
        title.textContent = '💀 任務失敗';
        text.innerHTML = `你在逃脫過程中不幸犧牲了...<br><br>但你的勇氣激勵了其他研究員，<br><br>他們將繼承你的意志，<br>繼續尋找真相。<br><br>你的犧牲不會白費！`;
    }
    
    modal.style.display = 'flex';
}

function restartGame() {
    // 停止遊戲循環
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    gameState = 'story';
    currentStoryPage = 1;
    
    // 完全重置玩家狀態（位置將在createWorld中設定）
    player = {
        x: 100, y: Math.floor(GAME_HEIGHT * 0.5), width: 80, height: 80,
        velocityX: 0, velocityY: 0, onGround: false,
        health: 100, maxHealth: 100,
        shieldActive: false, shieldHits: 0,
        facingRight: true
    };
    
    // 重置動畫狀態
    currentAnimation = 'idle';
    animationFrame = 0;
    lastFrameTime = Date.now();
    
    // 重置攝影機
    camera = { x: 0, y: 0 };
    
    // 重置世界
    createWorld();
    
    // 重置庫存
    inventory = { healthPotions: 2, shields: 1 };
    
    // 清除所有按鍵狀態
    keys = {};
    
    updateUI();
    
    document.getElementById('endingModal').style.display = 'none';
    document.getElementById('storyModal').classList.remove('hidden');
    
    document.querySelectorAll('.story-page').forEach(page => page.classList.remove('active'));
    document.querySelector('.story-page[data-page="1"]').classList.add('active');
    document.getElementById('nextBtn').classList.remove('hidden');
    document.getElementById('startBtn').classList.add('hidden');
}

// ===============================
// 遊戲更新邏輯
// ===============================

function update() {
    if (gameState !== 'playing') return;
    updatePlayer();
    updateCamera();
    checkCollisions();
    checkEndpoint();
}

function updatePlayer() {
    const wasMoving = Math.abs(player.velocityX) > 0.1;
    
    if (keys['ArrowLeft']) {
        player.velocityX = -3;
        player.facingRight = false;
    } else if (keys['ArrowRight']) {
        player.velocityX = 3;
        player.facingRight = true;
    } else {
        player.velocityX *= 0.9;
    }
    
    if (keys['Space'] && player.onGround) {
        player.velocityY = -8;
        player.onGround = false;
    }
    
    // 更新動畫狀態
    const isMoving = Math.abs(player.velocityX) > 0.1;
    const newAnimation = (isMoving && player.onGround) ? 'running' : 'idle';
    
    // 如果動畫狀態改變，重置動畫幀索引和時間
    if (newAnimation !== currentAnimation) {
        currentAnimation = newAnimation;
        animationFrame = 0; // 重置到第一幀
        lastFrameTime = Date.now(); // 重置時間，避免時間混亂
    }
    
    player.velocityY += world.gravity;
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    if (player.x < 0) player.x = 0;
    if (player.x > world.width - player.width) player.x = world.width - player.width;
    if (player.y > world.height) takeDamage(100);
    
    // 更新動畫幀
    updateAnimation();
}

function updateAnimation() {
    const currentTime = Date.now();
    
    // 根據動畫類型選擇不同的間隔時間
    const currentInterval = currentAnimation === 'running' ? runningFrameInterval : idleFrameInterval;
    
    if (currentTime - lastFrameTime > currentInterval) {
        const animFrames = characterSprites[currentAnimation];
        if (animFrames && animFrames.length > 0) {
            // 確保動畫幀索引在有效範圍內
            if (animationFrame >= animFrames.length) {
                animationFrame = 0;
            }
            
            const previousFrame = animationFrame;
            animationFrame = (animationFrame + 1) % animFrames.length;
            
            // 調試：僅顯示動畫循環重啟
            if (currentAnimation === 'running' && previousFrame === 3 && animationFrame === 0) {
                console.log(`🔄 跑步動畫循環重啟: character-run-4 → character-run-1 (${runningFrameInterval}ms間隔)`);
            } else if (currentAnimation === 'idle' && previousFrame === 1 && animationFrame === 0) {
                console.log(`🔄 站立動畫循環重啟: character-idle-2 → character-idle-1 (${idleFrameInterval}ms間隔)`);
            }
        } else {
            // 如果沒有動畫，重置動畫幀
            animationFrame = 0;
            console.log(`⚠️ 沒有找到 ${currentAnimation} 動畫幀，重置為0`);
        }
        lastFrameTime = currentTime;
    }
}

function updateCamera() {
    // 使用Math.floor確保攝影機位置為整數，避免閃爍
    camera.x = Math.floor(player.x - GAME_WIDTH / 2);
    camera.y = Math.floor(player.y - GAME_HEIGHT / 2);
    
    if (camera.x < 0) camera.x = 0;
    if (camera.x > world.width - GAME_WIDTH) camera.x = Math.max(0, world.width - GAME_WIDTH);
    if (camera.y < 0) camera.y = 0;
    if (camera.y > world.height - GAME_HEIGHT) camera.y = world.height - GAME_HEIGHT;
}

// ===============================
// 碰撞檢測與遊戲邏輯
// ===============================

function checkCollisions() {
    player.onGround = false;
    world.roads.forEach(road => {
        if (player.x < road.x + road.width &&
            player.x + player.width > road.x &&
            player.y < road.y + road.height &&
            player.y + player.height > road.y) {
            
            if (player.velocityY > 0 && player.y < road.y) {
                player.y = road.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
            }
        }
    });
}

function checkEndpoint() {
    if (world.endpoint &&
        player.x < world.endpoint.x + world.endpoint.width &&
        player.x + player.width > world.endpoint.x &&
        player.y < world.endpoint.y + world.endpoint.height &&
        player.y + player.height > world.endpoint.y) {
        endGame(true);
    }
}

function takeDamage(amount) {
    player.health -= amount;
    if (player.health <= 0) {
        player.health = 0;
        endGame(false);
    }
    updateUI();
}

// ===============================
// 物品使用功能
// ===============================

function useHealthPotion() {
    if (inventory.healthPotions > 0 && player.health < player.maxHealth) {
        inventory.healthPotions--;
        player.health = Math.min(player.maxHealth, player.health + 50);
        updateUI();
    }
}

function useShield() {
    if (inventory.shields > 0 && !player.shieldActive) {
        inventory.shields--;
        player.shieldActive = true;
        player.shieldHits = 0;
        updateUI();
    }
}

function updateUI() {
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = `HP: ${player.health}/${player.maxHealth}`;
    document.getElementById('healthCount').textContent = inventory.healthPotions;
    document.getElementById('shieldCount').textContent = inventory.shields;
}

// ===============================
// 渲染功能
// ===============================

function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    drawBackground();
    drawRoads();
    drawEndpoint();
    drawPlayer();
}

function drawBackground() {
    if (backgroundLoaded && backgroundImage) {
        // 計算背景圖片的縮放比例，讓圖片高度填滿畫面
        const scale = GAME_HEIGHT / backgroundHeight;
        const scaledWidth = Math.floor(backgroundWidth * scale);
        const scaledHeight = GAME_HEIGHT;
        
        // 計算背景的滾動位置（視差效果）
        const parallaxSpeed = 0.3; // 背景滾動速度（相對於攝影機速度）
        const backgroundOffsetX = Math.floor(camera.x * parallaxSpeed) % scaledWidth;
        
        // 計算需要繪製的背景圖片數量，確保完整覆蓋
        const startTile = Math.floor(-backgroundOffsetX / scaledWidth) - 1;
        const endTile = Math.ceil((GAME_WIDTH - backgroundOffsetX) / scaledWidth) + 1;
        
        // 繪製背景圖片以實現無限滾動，確保整數位置
        for (let i = startTile; i <= endTile; i++) {
            const x = Math.floor(i * scaledWidth - backgroundOffsetX);
            // 確保繪製尺寸也是整數
            ctx.drawImage(backgroundImage, x, 0, Math.floor(scaledWidth), Math.floor(scaledHeight));
        }
    } else {
        // 如果背景圖片載入失敗，使用原來的星空背景
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = (i * 137) % world.width - camera.x;
            const y = (i * 73) % world.height - camera.y;
            if (x >= -10 && x <= GAME_WIDTH + 10 && y >= -10 && y <= GAME_HEIGHT + 10) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }
}

// 路面圖片載入
let roadImages = {};
let roadsLoaded = false;

function loadRoadImages() {
    const roadTypes = ['road-1'];
    let loadedCount = 0;
    
    roadTypes.forEach(type => {
        const img = new Image();
        img.onload = function() {
            roadImages[type] = img;
            loadedCount++;
            console.log(`✅ 路面圖片載入完成: ${type}.svg`);
            
            if (loadedCount === roadTypes.length) {
                roadsLoaded = true;
                console.log('🛣️ 所有路面圖片載入完成！');
            }
        };
        img.onerror = function() {
            console.log(`❌ 路面圖片載入失敗: ${type}.svg`);
            loadedCount++;
            if (loadedCount === roadTypes.length) {
                roadsLoaded = true;
            }
        };
        img.src = `${type}.svg`;
    });
}

function drawRoads() {
    world.roads.forEach(road => {
        // 使用Math.floor確保整數像素位置，避免閃爍
        const x = Math.floor(road.x - camera.x);
        const y = Math.floor(road.y - camera.y);
        
        if (x + road.width >= 0 && x <= GAME_WIDTH &&
            y + road.height >= 0 && y <= GAME_HEIGHT) {
            
            // 嘗試繪製SVG圖片
            if (roadsLoaded && roadImages[road.type]) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(roadImages[road.type], x, y, road.width, road.height);
                ctx.restore();
            } else {
                // 如果圖片未載入，繪製預設的綠色方塊
                ctx.fillStyle = '#228B22';
                ctx.strokeStyle = '#32CD32';
                ctx.lineWidth = 2;
                ctx.fillRect(x, y, road.width, road.height);
                ctx.strokeRect(x, y, road.width, road.height);
                
                // 顯示文字標示
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px "Press Start 2P"';
                ctx.fillText(road.type, x + 10, y + 30);
            }
        }
    });
}

function drawEndpoint() {
    if (!world.endpoint) return;
    
    // 使用Math.floor確保整數像素位置，避免閃爍
    const x = Math.floor(world.endpoint.x - camera.x);
    const y = Math.floor(world.endpoint.y - camera.y);
    
    if (x + world.endpoint.width >= 0 && x <= GAME_WIDTH &&
        y + world.endpoint.height >= 0 && y <= GAME_HEIGHT) {
        
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(x, y, world.endpoint.width, world.endpoint.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('🔬', x + 40, y + 25);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('LAB', x + 35, y + 45);
    }
}

function drawPlayer() {
    // 使用Math.floor確保整數像素位置，避免閃爍
    const x = Math.floor(player.x - camera.x);
    const y = Math.floor(player.y - camera.y);
    
    // 檢查是否有有效的動畫幀
    const animFrames = characterSprites[currentAnimation];
    
    // 確保動畫幀索引在有效範圍內
    if (animFrames && animFrames.length > 0 && animationFrame >= animFrames.length) {
        console.log(`⚠️ 動畫幀索引超出範圍: ${animationFrame} >= ${animFrames.length}，重置為0`);
        animationFrame = 0;
    }
    
    const hasValidSprite = animFrames && 
                          animFrames.length > 0 && 
                          animationFrame < animFrames.length &&
                          animFrames[animationFrame] && 
                          animFrames[animationFrame].complete;
    
    // 調試信息（僅在需要時顯示）
    if (currentAnimation === 'running' && !hasValidSprite) {
        console.log(`❌ 跑步動畫幀無效: 索引${animationFrame}, 動畫數組長度${animFrames?.length}`);
    }
    
    if (hasValidSprite) {
        // 繪製自定義角色動畫
        const sprite = animFrames[animationFrame];
        
        ctx.save();
        
        // 設置高品質渲染
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';
        
        // 如果面向左邊，水平翻轉
        if (!player.facingRight) {
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, -(x + player.width), y, player.width, player.height);
        } else {
            ctx.drawImage(sprite, x, y, player.width, player.height);
        }
        
        ctx.restore();
    } else {
        // 使用預設的emoji角色
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(x, y, player.width, player.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '26px "Press Start 2P"';
        
        // 根據面向方向調整emoji
        if (!player.facingRight) {
            // 面向左邊時稍微偏移
            ctx.fillText('🧑‍🔬', x + 15, y + 35);
        } else {
            ctx.fillText('🧑‍🔬', x + 18, y + 35);
        }
    }
    
    // 繪製防護罩效果
    if (player.shieldActive) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x + player.width/2, y + player.height/2, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`${3 - player.shieldHits}`, x + player.width + 8, y + 15);
    }
}

// ===============================
// 遊戲主循環
// ===============================

function gameLoop() {
    update();
    render();
    if (gameState === 'playing') {
        gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// ===============================
// 初始化啟動
// ===============================

window.addEventListener('load', init); 