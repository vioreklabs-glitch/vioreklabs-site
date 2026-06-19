const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('gameContainer');

let gameState = 'menu'; // Oyun artık donmadan menüde bekleyecek
let score = 0;
let level = 1;
let frameCount = 0;
let lastTime = 0;
const fpsInterval = 1000 / 60;

let baseSpeed = 1.2;     
let spawnRate = 110;     
let W, H, blockSize;
let grid = [[], [], [], [], []]; 
const GRID_COLS = 5;
const MAX_STACK_HEIGHT = 6; 
const COLORS = ['#00f0ff', '#ff007f', '#39ff14', '#ffde07', '#ff5e00', '#ff3131', '#b026ff'];

let platform = { x: 0, y: 0, width: 200, height: 16, targetX: 0, minWidth: 80, maxWidth: 200 };
let fallingBlocks = [];

class Block {
    constructor() {
        this.size = Math.round(blockSize * 0.9);
        this.x = Math.random() * (W - this.size);
        this.y = -this.size - 10;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.speed = baseSpeed + Math.random() * 0.4;
    }
    update() { this.y += this.speed; }
    draw() {
        ctx.save(); ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.roundRect(this.x, this.y, this.size, this.size, 6); ctx.fill(); ctx.restore();
    }
}

function checkCollision(block) {
    const blockCenter = block.x + block.size / 2;
    if (blockCenter >= platform.x && blockCenter <= platform.x + platform.width) {
        const slot = Math.max(0, Math.min(GRID_COLS - 1, Math.round((blockCenter - (platform.x + platform.width / 2)) / blockSize) + 2));
        const landingLevel = platform.y - grid[slot].length * blockSize;
        if (block.y + block.size >= landingLevel - 3 && block.y <= landingLevel + platform.height) {
            return { collided: true, slot: slot };
        }
    }
    return { collided: false };
}

function checkGridMatches() {
    let visited = Array.from({ length: GRID_COLS }, () => []);
    let blocksToRemove = [];
    for (let c = 0; c < GRID_COLS; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            if (visited[c][r]) continue;
            const targetColor = grid[c][r];
            let group = []; let queue = [{ c, r }]; visited[c][r] = true;
            while (queue.length > 0) {
                const curr = queue.shift(); group.push(curr);
                const adjacents = [{ c: curr.c - 1, r: curr.r }, { c: curr.c + 1, r: curr.r }, { c: curr.c, r: curr.r - 1 }, { c: curr.c, r: curr.r + 1 }];
                adjacents.forEach(adj => {
                    if (adj.c >= 0 && adj.c < GRID_COLS && adj.r >= 0 && adj.r < grid[adj.c].length) {
                        if (!visited[adj.c][adj.r] && grid[adj.c][adj.r] === targetColor) { visited[adj.c][adj.r] = true; queue.push(adj); }
                    }
                });
            }
            if (group.length >= 3) blocksToRemove.push(...group);
        }
    }
    if (blocksToRemove.length > 0) {
        blocksToRemove.sort((a, b) => b.r - a.r);
        let removedMap = Array.from({ length: GRID_COLS }, () => []);
        blocksToRemove.forEach(b => { removedMap[b.c][b.r] = true; });
        for (let c = 0; c < GRID_COLS; c++) grid[c] = grid[c].filter((_, idx) => !removedMap[c][idx]);
        
        // SKORU BURADA ARTTIRIP EKRENA BASIYORUZ
        score += blocksToRemove.length * 50;
        updateHUD(); 
        
        if (score >= level * 1000) { level++; baseSpeed += 0.2; spawnRate = Math.max(40, spawnRate - 8); updateHUD(); }
        setTimeout(() => checkGridMatches(), 120);
    }
}

function drawPlatform() {
    ctx.save(); ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 15; ctx.fillStyle = 'rgba(13, 13, 33, 0.85)';
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 8);
    ctx.fill(); ctx.stroke(); ctx.restore();
}

function drawStackedBlocks() {
    for (let col = 0; col < GRID_COLS; col++) {
        const stack = grid[col]; const visualX = (platform.x + platform.width / 2) + (col - 2) * blockSize - (blockSize * 0.9) / 2;
        for (let row = 0; row < stack.length; row++) {
            const blockY = platform.y - (row + 1) * blockSize + (blockSize * 0.1) / 2;
            const size = Math.round(blockSize * 0.9); const color = stack[row];
            ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 10; ctx.fillStyle = color; ctx.beginPath();
            ctx.roundRect(visualX, blockY, size, size, 5); ctx.fill(); ctx.restore();
        }
    }
}

function gameLoop(timestamp) {
    if (gameState !== 'playing') return;
    if (!timestamp) timestamp = 0;
    const elapsed = timestamp - lastTime;

    if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);
        frameCount++;
        ctx.clearRect(0, 0, W, H);

        if (frameCount % spawnRate === 0) fallingBlocks.push(new Block());

        platform.x += (platform.targetX - platform.x) * 0.16;
        platform.x = Math.max(0, Math.min(W - platform.width, platform.x));

        for (let i = fallingBlocks.length - 1; i >= 0; i--) {
            const block = fallingBlocks[i]; block.update(); block.draw();
            const colRes = checkCollision(block);
            if (colRes.collided) {
                const col = colRes.slot; grid[col].push(block.color); fallingBlocks.splice(i, 1);
                checkGridMatches();
                if (grid[col].length > MAX_STACK_HEIGHT) gameOver();
            } else if (block.y > H) {
                fallingBlocks.splice(i, 1);
                platform.width = Math.max(platform.minWidth, platform.width - 15);
                if (platform.width <= platform.minWidth) gameOver();
            }
        }
        drawStackedBlocks(); drawPlatform();
    }
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect(); platform.targetX = (e.clientX - rect.left) - platform.width / 2;
});
canvas.addEventListener('touchmove', (e) => {
    if (gameState !== 'playing') return; e.preventDefault();
    const rect = canvas.getBoundingClientRect(); const touch = e.touches[0];
    platform.targetX = (touch.clientX - rect.left) - platform.width / 2;
}, { passive: false });

function resize() {
    W = container.clientWidth; H = container.clientHeight; canvas.width = W; canvas.height = H;
    blockSize = Math.max(32, Math.floor(W * 0.11)); platform.maxWidth = blockSize * 5; platform.minWidth = Math.round(blockSize * 1.8);
    platform.y = H - 100;
    if (gameState === 'menu' || frameCount === 0) { platform.width = platform.maxWidth; platform.x = W / 2 - platform.width / 2; platform.targetX = platform.x; }
}
window.addEventListener('resize', resize);

function updateHUD() {
    const scoreEl = document.getElementById('score');
    const lvlEl = document.getElementById('levelIndicator');
    if (scoreEl) scoreEl.textContent = score;
    if (lvlEl) lvlEl.textContent = `SEVİYE ${level}`;
}

function startGame() {
    gameState = 'playing'; score = 0; level = 1; frameCount = 0; lastTime = 0;
    grid = [[], [], [], [], []]; fallingBlocks = [];
    platform.width = platform.maxWidth; platform.x = W / 2 - platform.width / 2; platform.targetX = platform.x;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    updateHUD();
    resize();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

resize();
