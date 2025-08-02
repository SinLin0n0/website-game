// ===============================
// 遊戲變數與設定
// ===============================

// 遊戲變數
let canvas, ctx;
let gameState = 'playing';
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
let runningFrameInterval = 70; // 跑步動畫：0.07秒換一張
let spritesLoaded = false;

// 角色大小動態計算
function calculatePlayerSize() {
    const playerHeightRatio = 109 / 512; // 109像素高度在512背景中的比例 (21.29%)
    const dynamicHeight = Math.floor(GAME_HEIGHT * playerHeightRatio);
    // 假設角色寬高比為1:1，保持方形比例，如果有特定比例可以調整
    const dynamicWidth = dynamicHeight; // 保持方形，或可根據實際圖片比例調整
    
    return {
        width: dynamicWidth,
        height: dynamicHeight
    };
}

// 遊戲物件
let player = {
    x: 100, y: 0, width: 80, height: 80, // 初始值，會在init時動態計算
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
    backgroundImage.src = 'assets/background.jpg';
}

// 載入角色動畫 - 確保正確順序載入
function loadCharacterSprites() {
    // 重置動畫數組，確保順序正確
    characterSprites.idle = [];
    characterSprites.running = [];
    
    // 站立動畫圖片路徑（SVG格式）
    const idleFramePaths = [
        'assets/character-idle-1.svg',
        'assets/character-idle-2.svg'
    ];
    
    // 跑步動畫圖片路徑（SVG格式） - 按照正確順序
    const runningFramePaths = [
        'assets/character-run-1.svg',  // 索引0
        'assets/character-run-2.svg',  // 索引1
        'assets/character-run-3.svg',  // 索引2
        'assets/character-run-4.svg'   // 索引3
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
            console.log(`  跑步動畫：每${runningFrameInterval}ms切換一幀 (0.07秒)`);
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
    
    // 動態計算並設置角色大小
    const playerSize = calculatePlayerSize();
    player.width = playerSize.width;
    player.height = playerSize.height;
    
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
    loadHpLogoImage();
    createWorld();
    setupEventListeners();
    updateUI();
    gameLoop(); // 直接開始遊戲
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
    
    // 設定road-1位置：與背景齊左，動態計算底部距離
    const roadX = 0; // 與背景齊左
    const bottomDistanceRatio = 93 / 512; // 93像素距離在512高度背景中的比例 (18.16%)
    const dynamicBottomDistance = Math.floor(GAME_HEIGHT * bottomDistanceRatio);
    const roadY = GAME_HEIGHT - dynamicBottomDistance - roadHeight; // 動態計算底部距離
    
    // 計算road-kanban元件尺寸，原始比例為94:105
    const kanbanAspectRatio = 94 / 105; // 寬高比
    const kanbanHeightRatio = 105 / 512; // 105像素高度在512背景中的比例 (20.51%)
    const kanbanHeight = Math.floor(GAME_HEIGHT * kanbanHeightRatio);
    const kanbanWidth = Math.floor(kanbanHeight * kanbanAspectRatio); // 等比縮放
    
    // 設定road-kanban位置：底部對齊road-1頂部，左邊距離動態調整
    const kanbanLeftDistanceRatio = 37 / 512; // 37像素距離在512高度背景中的比例 (7.23%)
    const kanbanX = Math.floor(GAME_HEIGHT * kanbanLeftDistanceRatio); // 使用背景高度計算左邊距
    const kanbanY = roadY - kanbanHeight; // 底部對齊road-1頂部
    
    // 計算road-2元件尺寸，原始比例為171:32
    const road2AspectRatio = 171 / 32; // 寬高比
    const road2HeightRatio = 32 / 512; // 32像素高度在512背景中的比例 (6.25%)
    const road2Height = Math.floor(GAME_HEIGHT * road2HeightRatio);
    const road2Width = Math.floor(road2Height * road2AspectRatio); // 等比縮放
    
    // 設定road-2位置：底部對齊背景底部，左邊對齊road-1右邊
    const road2BottomDistanceRatio = 202 / 512; // 202像素距離在512背景中的比例 (39.45%)
    const road2LeftDistanceRatio = 135 / 512; // 135像素距離在512背景中的比例 (26.37%)
    const road2X = Math.floor(GAME_WIDTH * road2LeftDistanceRatio); // 使用背景寬度計算左邊距
    const road2Y = GAME_HEIGHT - Math.floor(GAME_HEIGHT * road2BottomDistanceRatio) - road2Height; // 底部對齊背景底部
    
    // 計算house-1元件尺寸，假設寬高比為4:3（可根據實際圖片調整）
    const house1AspectRatio = 4 / 3; // 寬高比，房子寬度通常比高度大
    const house1HeightRatio = 221 / 512; // 221像素高度在512背景中的比例 (43.16%)
    const house1Height = Math.floor(GAME_HEIGHT * house1HeightRatio);
    const house1Width = Math.floor(house1Height * house1AspectRatio); // 等比縮放
    
    // 設定house-1位置：底部對齊road-2的頂部，右邊與road-2右邊距離為33
    const house1RightDistanceRatio = 33 / 512; // 33像素距離在512背景中的比例 (6.45%)
    const house1RightDistance = Math.floor(GAME_HEIGHT * house1RightDistanceRatio); // 使用背景高度計算距離
    const house1X = road2X + road2Width - house1Width - house1RightDistance; // 右邊距離road-2右邊33像素
    const house1Y = road2Y - house1Height; // 底部對齊road-2頂部
    
    // 創建road元件
    world.roads = [
        {
            x: roadX, 
            y: roadY, 
            width: roadWidth, 
            height: roadHeight,
            type: 'road-1'
        },
        {
            x: kanbanX,
            y: kanbanY,
            width: kanbanWidth,
            height: kanbanHeight,
            type: 'road-kanban'
        },
        {
            x: road2X,
            y: road2Y,
            width: road2Width,
            height: road2Height,
            type: 'road-2'
        },
        {
            x: house1X,
            y: house1Y,
            width: house1Width,
            height: house1Height,
            type: 'house-1'
        }
    ];
    
    // 設置玩家初始位置在road-1元件上方
    player.x = roadX + 50; // 在road-1左側一點
    player.y = roadY - player.height; // 站在road-1上方
    
    // 創建HP Logo - 4個hp-logo，動態尺寸調整
    const hpLogoHeightRatio = 41 / 512; // 41像素高度在512背景中的比例 (8.01%)
    const hpLogoHeight = Math.floor(GAME_HEIGHT * hpLogoHeightRatio);
    // 假設hp-logo是正方形，如果有特定比例可以調整
    const hpLogoWidth = hpLogoHeight; // 等比縮放，保持正方形
    
    // 第一個hp-logo位置計算
    const hpLogoLeftDistanceRatio = 15 / 512; // 15像素距離在512背景中的比例 (2.93%)
    const hpLogoBottomDistanceRatio = 121 / 512; // 121像素距離在512背景中的比例 (23.63%)
    const hpLogoLeftDistance = Math.floor(GAME_HEIGHT * hpLogoLeftDistanceRatio);
    const hpLogoBottomDistance = Math.floor(GAME_HEIGHT * hpLogoBottomDistanceRatio);
    
    // 找到road-2的信息
    const road2 = world.roads.find(road => road.type === 'road-2');
    const firstHpLogoX = road2.x + hpLogoLeftDistance; // hp-logo左邊與road-2的左邊距離
    const firstHpLogoY = road2.y - hpLogoBottomDistance - hpLogoHeight; // hp-logo底部與road-2的頂部距離
    
    // 創建4個hp-logo，水平排列
    const hpLogoSpacingRatio = 8 / 512; // 8像素間距在512背景中的比例 (1.56%)
    const hpLogoSpacing = Math.floor(GAME_HEIGHT * hpLogoSpacingRatio);
    
    hpLogos = [];
    for (let i = 0; i < 4; i++) {
        hpLogos.push({
            x: firstHpLogoX + i * (hpLogoWidth + hpLogoSpacing),
            y: firstHpLogoY,
            width: hpLogoWidth,
            height: hpLogoHeight,
            collected: false, // 是否已被收集
            id: i
        });
    }
    
    console.log('🩹 HP Logo創建完成，共4個:', hpLogos);
    
    // 已刪除終點設定（lab 藍色框框）
    world.endpoint = null;
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
        
        // 動態重新計算角色大小
        const playerSize = calculatePlayerSize();
        player.width = playerSize.width;
        player.height = playerSize.height;
        
        // 重新創建世界以適應新尺寸（會自動調整玩家位置）
        createWorld();
    });
}

// ===============================
// 遊戲流程控制
// ===============================

// 故事相關函數已移除

function endGame(success) {
    // 停止遊戲循環
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    gameState = 'ended';
    
    // 停止跑步音效（如果函數存在）
    if (typeof stopRunningAudio === 'function') {
        stopRunningAudio();
    }
    
    if (success) {
        const modal = document.getElementById('endingModal');
        const title = document.getElementById('endingTitle');
        const text = document.getElementById('endingText');
        
        title.textContent = '🎉 任務成功！';
        text.innerHTML = `恭喜你成功逃出了危險！<br><br>你發現的秘密將改變整個世界...<br><br>在你的努力下，人類終於找到了<br>突破科技極限的關鍵。<br><br>新的時代即將來臨！`;
        
        modal.style.display = 'flex';
    }
    // 移除失敗畫面處理，為客製化做準備
}

function restartGame() {
    // 停止遊戲循環
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    gameState = 'playing';
    
    // 動態計算角色大小
    const playerSize = calculatePlayerSize();
    
    // 完全重置玩家狀態（位置將在createWorld中設定）
    player = {
        x: 100, y: Math.floor(GAME_HEIGHT * 0.5), 
        width: playerSize.width, height: playerSize.height,
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
    
    // 重置HP Logo收集計數
    collectedHpCount = 0;
    
    // 清除所有按鍵狀態
    keys = {};
    
    updateUI();
    
    document.getElementById('endingModal').style.display = 'none';
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
    
    // 檢查與路面的碰撞
    world.roads.forEach(road => {
        // road-kanban 和 house-1 作為背景，不參與碰撞檢測
        if (road.type === 'road-kanban' || road.type === 'house-1') {
            return; // 跳過背景元素的碰撞檢測
        }
        
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
    
    // 檢查與HP Logo的碰撞
    hpLogos.forEach(hpLogo => {
        if (hpLogo.collected) return; // 已被收集的不檢查碰撞
        
        if (player.x < hpLogo.x + hpLogo.width &&
            player.x + player.width > hpLogo.x &&
            player.y < hpLogo.y + hpLogo.height &&
            player.y + player.height > hpLogo.y) {
            
            // 收集HP Logo
            hpLogo.collected = true;
            collectedHpCount++;
            console.log(`🩹 收集到HP Logo ${hpLogo.id + 1}！總共收集：${collectedHpCount}/4`);
            
            // 更新UI顯示
            updateUI();
        }
    });
}

function checkEndpoint() {
    // 已刪除終點檢測（lab 藍色框框）
    return;
}

function takeDamage(amount) {
    player.health -= amount;
    if (player.health <= 0) {
        player.health = 0;
        // 顯示失敗畫面（如果函數存在）
        if (typeof showFailureScreen === 'function') {
            showFailureScreen();
        } else {
            console.log('玩家生命值歸零');
        }
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
    document.getElementById('hpCount').textContent = `${collectedHpCount}/4`;
}

// ===============================
// 渲染功能
// ===============================

function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    drawBackground();
    drawRoads();
    drawHpLogos();
    // drawEndpoint(); // 已刪除 lab 藍色框框
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

// HP Logo 系統
let hpLogos = [];
let hpLogoImage = null;
let hpLogoLoaded = false;
let collectedHpCount = 0; // 收集到的hp數量

function loadRoadImages() {
    const roadTypes = ['road-1', 'road-kanban', 'road-2', 'house-1'];
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
        img.src = `assets/${type}.svg`;
    });
}

// 載入HP Logo圖片
function loadHpLogoImage() {
    hpLogoImage = new Image();
    hpLogoImage.onload = function() {
        hpLogoLoaded = true;
        console.log('✅ HP Logo圖片載入完成: hp-logo.svg');
    };
    hpLogoImage.onerror = function() {
        console.log('❌ HP Logo圖片載入失敗: hp-logo.svg');
        hpLogoLoaded = false;
    };
    hpLogoImage.src = 'assets/hp-logo.svg';
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

function drawHpLogos() {
    hpLogos.forEach(hpLogo => {
        // 如果hp-logo已被收集，不繪製
        if (hpLogo.collected) return;
        
        // 使用Math.floor確保整數像素位置，避免閃爍
        const x = Math.floor(hpLogo.x - camera.x);
        const y = Math.floor(hpLogo.y - camera.y);
        
        // 檢查是否在畫面內
        if (x + hpLogo.width >= 0 && x <= GAME_WIDTH &&
            y + hpLogo.height >= 0 && y <= GAME_HEIGHT) {
            
            // 嘗試繪製HP Logo圖片
            if (hpLogoLoaded && hpLogoImage) {
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(hpLogoImage, x, y, hpLogo.width, hpLogo.height);
                ctx.restore();
            } else {
                // 如果圖片未載入，繪製預設的紅色十字
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(x, y, hpLogo.width, hpLogo.height);
                
                // 繪製白色十字
                ctx.fillStyle = '#ffffff';
                const crossSize = Math.floor(hpLogo.width * 0.6);
                const crossThickness = Math.floor(hpLogo.width * 0.15);
                const centerX = x + hpLogo.width / 2;
                const centerY = y + hpLogo.height / 2;
                
                // 水平線
                ctx.fillRect(centerX - crossSize/2, centerY - crossThickness/2, crossSize, crossThickness);
                // 垂直線
                ctx.fillRect(centerX - crossThickness/2, centerY - crossSize/2, crossThickness, crossSize);
            }
        }
    });
}

function drawEndpoint() {
    // 已刪除 lab 藍色框框
    return;
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