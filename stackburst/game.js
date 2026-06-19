// ==========================================================================
// STACKBURST - SYSTEM ARCHITECTURE & ENGINE (DIRECT START SCRIPT)
// ==========================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('gameContainer');

// Game Engine State - Direct Auto-Start Configuration
let gameState = 'playing'; // Set to playing to bypass frozen menus completely
let score = 0;
let highScore = localStorage.getItem('stackBurstHighScore') || 0;
let blocksPopped = 0;
let combo = 0;
let maxCombo = 0;
let level = 1;
let baseSpeed = 2.2;
let spawnRate = 75; // Frames between block spawns
let frameCount = 0;
let hasRevived = false;

// Layout & Grid Configuration
let W, H;
let blockSize = 40;
let grid = [[], [], [], [], []]; // 5 Stacking columns on the platform
const GRID_COLS = 5;
const MAX_STACK_HEIGHT = 6; // Limit height before game over

// Custom Neon Colors (Synthwave Palette)
const COLORS = [
    '#00f0ff', // Cyan (Neon Blue)
    '#ff007f', // Pink (Neon Pink)
    '#39ff14', // Light Green (Neon Green)
    '#ffde07', // Gold (Neon Yellow)
    '#ff5e00', // Orange (Neon Orange)
    '#ff3131', // Bright Red
    '#b026ff'  // Purple
];

// Screen Shake Effect
let shakeTime = 0;
let shakeIntensity = 0;

// Platform Definition
let platform = {
    x: 0,
    y: 0,
    width: 200,
    height: 16,
    color: '#00f0ff',
    targetX: 0,
    minWidth: 80,
    maxWidth: 200
};

// Lists for Game Elements
let fallingBlocks = [];
let particles = [];
let floatingTexts = [];

// ==========================================================================
// PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = localStorage.getItem('stackBurstMuted') === 'true';
        this.synthLoopInterval = null;
        this.currentStep = 0;
        this.isPlayingMusic = false;
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
        }
        this.updateToggleState();
    }

    resumeContext() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playMatch() {
        if (this.muted || !this.ctx) return;
        this.resumeContext();
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playLand() {
        if (this.muted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playMiss() {
        if (this.muted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.3);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    playCrash() {
        if (this.muted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.25);
        
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playLevelUp() {
        if (this.muted || !this.ctx) return;
        this.resumeContext();
        
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25];
        
        notes.forEach((freq, index) => {
            const time = now + index * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            gain.gain.setValueAtTime(0.12, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.2);
        });
    }

    playGameOver() {
        if (this.muted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.8);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
    }

    toggleMute() {
        this.muted = !this.muted;
        localStorage.setItem('stackBurstMuted', this.muted);
        this.updateToggleState();
        
        if (this.muted) {
            this.stopMusic();
        } else {
            this.resumeContext();
            this.startMusic();
        }
        return this.muted;
    }

    updateToggleState() {
        const soundOnIcon = document.getElementById('soundOnIcon');
        const soundOffIcon = document.getElementById('soundOffIcon');
        if (!soundOnIcon || !soundOffIcon) return;
        if (this.muted) {
            soundOnIcon.style.display = 'none';
            soundOffIcon.style.display = 'block';
        } else {
            soundOnIcon.style.display = 'block';
            soundOffIcon.style.display = 'none';
        }
    }

    startMusic() {
        if (this.muted || this.isPlayingMusic || !this.ctx) return;
        this.isPlayingMusic = true;
        
        this.currentStep = 0;
        const stepTimeMs = 200;
        const bassNotes = [110.00, 110.00, 130.81, 130.81, 98.00, 98.00, 87.31, 87.31];
        
        this.synthLoopInterval = setInterval(() => {
            if (this.muted || !this.ctx || gameState !== 'playing') return;
            
            const now = this.ctx.currentTime;
            const noteFreq = bassNotes[this.currentStep % bassNotes.length];
            
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(noteFreq, now);
            
            filter.type = 'lowpass';
            filter.Q.setValueAtTime(5, now);
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.15);
            
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.18);
            
            if (this.currentStep % 16 === 12) {
                this.playAmbientArpeggio(now);
            }
            
            this.currentStep++;
        }, stepTimeMs);
    }

    playAmbientArpeggio(time) {
        const arpeggioFreqs = [440, 523.25, 659.25, 783.99];
        arpeggioFreqs.forEach((freq, i) => {
            const noteTime = time + i * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            gain.gain.setValueAtTime(0.02, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.3);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(noteTime);
            osc.stop(noteTime + 0.3);
        });
    }

    stopMusic() {
        if (this.synthLoopInterval) {
            clearInterval(this.synthLoopInterval);
            this.synthLoopInterval = null;
        }
        this.isPlayingMusic = false;
    }
}

const sfx = new SoundSynth();

// ==========================================================================
// ADMONETIZATION & MOCK ADVERTISING FRAMEWORK (AdManager)
// ==========================================================================
class AdManager {
    constructor() {
        this.adTimer = null;
        this.countdownValue = 5;
        this.onAdCompleteCallback = null;
        this.adType = '';
    }

    showInterstitial(onComplete) {
        this.adType = 'interstitial';
        this.onAdCompleteCallback = onComplete;
        this.triggerAdOverlay(false);
    }

    showRewarded(onComplete) {
        this.adType = 'rewarded';
        this.onAdCompleteCallback = onComplete;
        this.triggerAdOverlay(true);
    }

    triggerAdOverlay(isRewarded) {
        sfx.stopMusic();
        const overlay = document.getElementById('mockAdOverlay');
        const countdownEl = document.getElementById('adCountdown');
        const skipBtn = document.getElementById('skipAdBtn');
        if (!overlay || !countdownEl || !skipBtn) return;
        
        overlay.style.display = 'flex';
        this.countdownValue = 5;
        countdownEl.textContent = this.countdownValue;
        
        skipBtn.disabled = true;
        skipBtn.className = 'btn btn-disabled';
        skipBtn.textContent = isRewarded ? `Ödül için bekleyin (${this.countdownValue})` : `Reklamı Geç (${this.countdownValue})`;

        if (this.adTimer) clearInterval(this.adTimer);
        
        this.adTimer = setInterval(() => {
            this.countdownValue--;
            countdownEl.textContent = this.countdownValue;
            skipBtn.textContent = isRewarded ? `Ödül için bekleyin (${this.countdownValue})` : `Reklamı Geç (${this.countdownValue})`;
            
            if (this.countdownValue <= 0) {
                clearInterval(this.adTimer);
                skipBtn.disabled = false;
                if (isRewarded) {
                    skipBtn.className = 'btn btn-rewarded';
                    skipBtn.textContent = 'ÖDÜLÜ AL VE DEVAM ET';
                } else {
                    skipBtn.className = 'btn btn-primary';
                    skipBtn.textContent = 'REKLAMI GEÇ';
                }
            }
        }, 1000);
    }

    closeAd() {
        if (this.countdownValue > 0 && this.adType === 'rewarded') return;
        clearInterval(this.adTimer);
        const overlay = document.getElementById('mockAdOverlay');
        if (overlay) overlay.style.display = 'none';
        
        if (gameState === 'playing') {
            sfx.startMusic();
        }
        if (this.onAdCompleteCallback) {
            this.onAdCompleteCallback();
            this.onAdCompleteCallback = null;
        }
    }
}

const adManager = new AdManager();
const skipAdBtn = document.getElementById('skipAdBtn');
if (skipAdBtn) skipAdBtn.addEventListener('click', () => adManager.closeAd());

// ==========================================================================
// CLASSES (Block, Particle, FloatingText)
// ==========================================================================
class Block {
    constructor() {
        this.size = Math.round(blockSize * 0.9);
        this.x = Math.random() * (W - this.size);
        this.y = -this.size - 10;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.speed = baseSpeed + Math.random() * 0.6;
        this.rotation = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.04;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(-this.size/2, -this.size/2, this.size, this.size, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(-this.size/2 + 3, -this.size/2 + 3, this.size/2, this.size/2, 3);
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 6 + 3;
        const angle = Math.random() * Math.PI * 2;
        const force = Math.random() * 8 + 3;
        this.speedX = Math.cos(angle) * force;
        this.speedY = Math.sin(angle) * force - 2;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.025;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.25;
        this.speedX *= 0.98;
        this.life -= this.decay;
        this.size *= 0.96;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1.0;
        this.speedY = -1.2;
    }

    update() {
        this.y += this.speedY;
        this.alpha -= 0.02;
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 15px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// ==========================================================================
// GRID STACKING & COLLISION CALCULATOR
// ==========================================================================
function getSlotInfo(blockCenterX) {
    const platformCenter = platform.x + platform.width / 2;
    const relativeX = blockCenterX - platformCenter;
    const slot = Math.round(relativeX / blockSize) + 2;
    return Math.max(0, Math.min(GRID_COLS - 1, slot));
}

function getSlotVisualX(slotIndex) {
    const platformCenter = platform.x + platform.width / 2;
    const offsetX = (slotIndex - 2) * blockSize;
    return platformCenter + offsetX;
}

function checkUnsupportedColumns() {
    const platformHalfWidth = platform.width / 2;
    for (let col = 0; col < GRID_COLS; col++) {
        if (grid[col].length > 0) {
            const offsetX = Math.abs(col - 2) * blockSize;
            const slotExtent = offsetX + blockSize / 2;
            if (platformHalfWidth < slotExtent - 5) {
                const colX = getSlotVisualX(col);
                for (let r = 0; r < grid[col].length; r++) {
                    const blockY = platform.y - (r + 0.5) * blockSize;
                    createExplosion(colX, blockY, grid[col][r], 10);
                }
                grid[col] = [];
                sfx.playCrash();
                triggerScreenShake(8, 12);
                platform.width = Math.max(platform.minWidth, platform.width - 8);
            }
        }
    }
}

function checkCollision(block) {
    const blockCenter = block.x + block.size / 2;
    if (blockCenter >= platform.x && blockCenter <= platform.x + platform.width) {
        const slot = getSlotInfo(blockCenter);
        const stackHeight = grid[slot].length;
        const landingLevel = platform.y - stackHeight * blockSize;
        if (block.y + block.size >= landingLevel - 3 && block.y <= landingLevel + platform.height) {
            return { collided: true, slot: slot };
        }
    }
    return { collided: false };
}

// ==========================================================================
// FLOOD-FILL MATCH-3 MATCH DETECTOR
// ==========================================================================
function checkGridMatches() {
    let visited = Array.from({ length: GRID_COLS }, () => []);
    let blocksToRemove = [];
    
    for (let c = 0; c < GRID_COLS; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            if (visited[c][r]) continue;
            
            const targetColor = grid[c][r];
            let group = [];
            let queue = [{ c, r }];
            visited[c][r] = true;
            
            while (queue.length > 0) {
                const curr = queue.shift();
                group.push(curr);
                
                const adjacents = [
                    { c: curr.c - 1, r: curr.r },
                    { c: curr.c + 1, r: curr.r },
                    { c: curr.c, r: curr.r - 1 },
                    { c: curr.c, r: curr.r + 1 }
                ];
                
                adjacents.forEach(adj => {
                    if (adj.c >= 0 && adj.c < GRID_COLS && adj.r >= 0 && adj.r < grid[adj.c].length) {
                        if (!visited[adj.c][adj.r] && grid[adj.c][adj.r] === targetColor) {
                            visited[adj.c][adj.r] = true;
                            queue.push(adj);
                        }
                    }
                });
            }
            if (group.length >= 3) {
                blocksToRemove.push(...group);
            }
        }
    }
    
    if (blocksToRemove.length > 0) {
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const mult = Math.min(combo, 10);
        let avgX = 0, avgY = 0;
        
        blocksToRemove.sort((a, b) => b.r - a.r);
        let removedMap = Array.from({ length: GRID_COLS }, () => []);
        blocksToRemove.forEach(b => {
            removedMap[b.c][b.r] = true;
            const visualX = getSlotVisualX(b.c);
            const visualY = platform.y - (b.r + 0.5) * blockSize;
            avgX += visualX;
            avgY += visualY;
            createExplosion(visualX, visualY, grid[b.c][b.r], 15);
            blocksPopped++;
        });
        
        avgX /= blocksToRemove.length;
        avgY /= blocksToRemove.length;
        
        for (let c = 0; c < GRID_COLS; c++) {
            grid[c] = grid[c].filter((_, idx) => !removedMap[c][idx]);
        }
        
        const pointsGained = blocksToRemove.length * 50 * mult;
        score += pointsGained;
        
        floatingTexts.push(new FloatingText(`+${pointsGained}`, avgX, avgY - 20, '#00f0ff'));
        if (mult > 1) {
            showComboIndicator(mult);
            floatingTexts.push(new FloatingText(`KOMBO x${mult}!`, avgX, avgY, '#ffde07'));
        }
        
        sfx.playMatch();
        triggerScreenShake(5, 8);
        platform.width = Math.min(platform.maxWidth, platform.width + 10);
        
        if (score >= level * 1000) {
            levelUp();
        }
        setTimeout(() => checkGridMatches(), 120);
    } else {
        if (combo > 0) {
            setTimeout(() => { if (fallingBlocks.length === 0) combo = 0; }, 600);
        }
    }
    updateHUD();
}

function showComboIndicator(mult) {
    const el = document.getElementById('combo');
    if (!el) return;
    el.textContent = `COMBO x${mult}!`;
    el.className = 'combo-indicator neon-text-yellow combo-active';
    setTimeout(() => { el.className = 'combo-indicator neon-text-yellow'; }, 1200);
}

function triggerScreenShake(time, intensity) {
    shakeTime = time;
    shakeIntensity = intensity;
}

function createExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function levelUp() {
    level++;
    baseSpeed += 0.35;
    spawnRate = Math.max(22, spawnRate - 6);
    sfx.playLevelUp();
    floatingTexts.push(new FloatingText("SEVİYE ATLANDI!", W / 2, H / 3, '#ff007f'));
    updateHUD();
}

// ==========================================================================
// RENDER LOOPS & GRID VISUAL EFFECTS
// ==========================================================================
function drawNeonGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    const spacing = 40;
    for (let x = 0; x < W; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    const offset = (frameCount * 0.4) % spacing;
    for (let y = offset; y < H; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    const dangerY = platform.y - MAX_STACK_HEIGHT * blockSize;
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(W, dangerY);
    ctx.stroke();
    ctx.restore();
}

function drawPlatform() {
    ctx.save();
    const grad = ctx.createLinearGradient(platform.x, platform.y, platform.x + platform.width, platform.y);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#ff007f');
    grad.addColorStop(1, '#00f0ff');
    
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(13, 13, 33, 0.85)';
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(platform.x, platform.y, platform.width, platform.height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(platform.x + 6, platform.y + 4, platform.width - 12, 2);
    ctx.restore();
}

function drawStackedBlocks() {
    for (let col = 0; col < GRID_COLS; col++) {
        const stack = grid[col];
        const visualX = getSlotVisualX(col) - (blockSize * 0.9) / 2;
        for (let row = 0; row < stack.length; row++) {
            const blockY = platform.y - (row + 1) * blockSize + (blockSize * 0.1) / 2;
            const size = Math.round(blockSize * 0.9);
            const color = stack[row];
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(visualX, blockY, size, size, 5);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(visualX + 2, blockY + 2, size / 2, size / 2);
            ctx.restore();
        }
    }
}

// ==========================================================================
// CORE ENGINE GAME LOOP
// ==========================================================================
function gameLoop() {
    if (gameState !== 'playing') {
        if (gameState === 'menu') drawMenuOnly();
        return;
    }

    frameCount++;
    ctx.save();
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
        shakeTime--;
    }

    ctx.clearRect(0, 0, W, H);
    drawNeonGrid();

    if (frameCount % spawnRate === 0) {
        fallingBlocks.push(new Block());
    }

    platform.x += (platform.targetX - platform.x) * 0.26;
    platform.x = Math.max(0, Math.min(W - platform.width, platform.x));

    checkUnsupportedColumns();

    for (let i = fallingBlocks.length - 1; i >= 0; i--) {
        const block = fallingBlocks[i];
        block.update();
        block.draw();

        const colRes = checkCollision(block);
        if (colRes.collided) {
            const col = colRes.slot;
            grid[col].push(block.color);
            fallingBlocks.splice(i, 1);
            sfx.playLand();
            triggerScreenShake(2, 3);
            checkGridMatches();
            if (grid[col].length > MAX_STACK_HEIGHT) {
                gameOver();
            }
        }
        else if (block.y > H) {
            fallingBlocks.splice(i, 1);
            sfx.playMiss();
            triggerScreenShake(6, 6);
            platform.width = Math.max(platform.minWidth, platform.width - 15);
            if (platform.width <= platform.minWidth) {
                gameOver();
            }
        }
    }

    drawStackedBlocks();
    drawPlatform();

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update();
        floatingTexts[i].draw();
        if (floatingTexts[i].alpha <= 0) floatingTexts.splice(i, 1);
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

function drawMenuOnly() {
    ctx.clearRect(0, 0, W, H);
    drawNeonGrid();
}

// ==========================================================================
// CONTROLLER INPUT SYSTEM
// ==========================================================================
canvas.addEventListener('touchmove', (e) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    platform.targetX = (touch.clientX - rect.left) - platform.width / 2;
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
    sfx.resumeContext();
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    platform.targetX = (touch.clientX - rect.left) - platform.width / 2;
}, { passive: true });

canvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    platform.targetX = (e.clientX - rect.left) - platform.width / 2;
});

window.addEventListener('keydown', (e) => {
    if (gameState !== 'playing') return;
    const step = 25;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        platform.targetX = Math.max(0, platform.targetX - step);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        platform.targetX = Math.min(W - platform.width, platform.targetX + step);
    }
});

const soundBtn = document.getElementById('soundToggleBtn');
if (soundBtn) soundBtn.addEventListener('click', () => sfx.toggleMute());

// ==========================================================================
// ENGINE RESIZER & ADAPTIVE RATIO SCALING
// ==========================================================================
function resize() {
    W = container.clientWidth;
    H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;
    blockSize = Math.max(32, Math.floor(W * 0.11));
    platform.maxWidth = blockSize * 5;
    platform.minWidth = Math.round(blockSize * 1.8);
    platform.y = H - Math.max(90, Math.floor(H * 0.12));
    
    if (gameState === 'menu' || frameCount === 0) {
        platform.width = platform.maxWidth;
        platform.x = W / 2 - platform.width / 2;
        platform.targetX = platform.x;
    }
}

window.addEventListener('resize', resize);

// ==========================================================================
// GAME STATE MANAGEMENT (START, GAMEOVER, REVIVE, RESTART)
// ==========================================================================
function updateHUD() {
    const scoreEl = document.getElementById('score');
    const lvlEl = document.getElementById('levelIndicator');
    if (scoreEl) scoreEl.textContent = score;
    if (lvlEl) lvlEl.textContent = `SEVİYE ${level}`;
}

function startGame() {
    sfx.resumeContext();
    gameState = 'playing';
    score = 0;
    blocksPopped = 0;
    combo = 0;
    maxCombo = 0;
    level = 1;
    baseSpeed = 2.2;
    spawnRate = 75;
    frameCount = 0;
    hasRevived = false;
    
    grid = [[], [], [], [], []];
    fallingBlocks = [];
    particles = [];
    floatingTexts = [];
    
    platform.width = platform.maxWidth;
    platform.x = W / 2 - platform.width / 2;
    platform.targetX = platform.x;
    
    const startScr = document.getElementById('startScreen');
    const govScr = document.getElementById('gameOverScreen');
    if (startScr) startScr.style.display = 'none';
    if (govScr) govScr.style.display = 'none';
    
    updateHUD();
    sfx.startMusic();
    gameLoop();
}

function gameOver() {
    gameState = 'gameover';
    sfx.stopMusic();
    sfx.playGameOver();
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('stackBurstHighScore', highScore);
    }
    
    saveToLeaderboard();
    
    const fScore = document.getElementById('finalScore');
    const hScore = document.getElementById('statHighScore');
    const sLvl = document.getElementById('statLevel');
    const sBlk = document.getElementById('statBlocks');
    const sCmb = document.getElementById('statMaxCombo');
    
    if (fScore) fScore.textContent = score;
    if (hScore) hScore.textContent = highScore;
    if (sLvl) sLvl.textContent = level;
    if (sBlk) sBlk.textContent = blocksPopped;
    if (sCmb) sCmb.textContent = `x${maxCombo}`;
    
    const reviveBtn = document.getElementById('reviveBtn');
    if (reviveBtn) reviveBtn.style.display = hasRevived ? 'none' : 'flex';
    
    const govScr = document.getElementById('gameOverScreen');
    if (govScr) govScr.style.display = 'flex';
}

function revivePlayer() {
    adManager.showRewarded(() => {
        gameState = 'playing';
        hasRevived = true;
        platform.width = platform.maxWidth;
        platform.x = W / 2 - platform.width / 2;
        platform.targetX = platform.x;
        
        for (let col = 0; col < GRID_COLS; col++) {
            grid[col] = grid[col].slice(0, Math.max(0, grid[col].length - 3));
        }
        fallingBlocks = [];
        particles = [];
        
        const govScr = document.getElementById('gameOverScreen');
        if (govScr) govScr.style.display = 'none';
        
        sfx.startMusic();
        gameLoop();
    });
}

function restartGame() {
    if (Math.random() < 0.4) {
        adManager.showInterstitial(() => { startGame(); });
    } else {
        startGame();
    }
}

function shareScore() {
    const text = `StackBurst oyununda ${score} skor yaparak rekor kırdım! 🌌`;
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: 'StackBurst', text: text, url: url }).catch(err => console.log(err));
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
}

function saveToLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('stackBurstLeaderboard')) || [];
    const name = localStorage.getItem('stackBurstPlayerName') || 'Kozmik Oyuncu';
    leaderboard.push({ name, score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    localStorage.setItem('stackBurstLeaderboard', JSON.stringify(leaderboard));
}

// HUD Elements Bindings
const rstBtn = document.getElementById('restartBtn');
const rvvBtn = document.getElementById('reviveBtn');
const shrBtn = document.getElementById('shareBtn');
const strBtn = document.getElementById('startBtn');

if (rstBtn) rstBtn.addEventListener('click', restartGame);
if (rvvBtn) rvvBtn.addEventListener('click', revivePlayer);
if (shrBtn) shrBtn.addEventListener('click', shareScore);
if (strBtn) strBtn.addEventListener('click', startGame);

const hmeBtn = document.getElementById('homeBtn');
if (hmeBtn) hmeBtn.addEventListener('click', () => { location.reload(); });

// Auto Initialize Engine and Core Actions On Window Load
window.addEventListener('blur', () => { if (gameState === 'playing') sfx.stopMusic(); });
window.addEventListener('focus', () => { if (gameState === 'playing' && !sfx.muted) sfx.startMusic(); });

// FORCE INITIAL DIRECT AUTO-RUN AT ARCHITECTURE LEVEL
resize();
startGame();
