// Game Variables
let canvas, ctx;
let player;
let poops = [];
let powerups = [];
let score = 0;
let lives = 3;
let gameActive = false;
let gamePaused = false;
let poopSpeed = 3;
let spawnTimers = { poop: 0, powerup: 0 };
let activePowerup = null;
let powerupTimer = 0;
let playerName = '';
let currentScreen = 'name';
let scoreTimer = 0;
let clouds = [];
let showPowerupMessage = false;
let powerupMessageText = '';
let powerupMessageTimer = 0;

// Speed increase variables
let gameStartTime = 0;
let currentPoopSpeed = 3;
let speedIncreaseInterval = 45000;
let lastSpeedIncrease = 0;
let poopSpawnRate = 500;
let lastPoopSpawn = 0;
let speedLevel = 0;

// Power-up types
const POWERUP_TYPES = {
    TOILET_PAPER: {
        color: '#FFFFFF',
        symbol: '💖',
        effect: 'extraLife',
        name: 'EXTRA LIFE',
        description: '+1 Life Added!'
    },
    SOAP_BUBBLE: {
        color: '#ADD8E6',
        symbol: '🛡️',
        effect: 'shield',
        name: 'BUBBLE SHIELD',
        description: '5s Protection from Poop!',
        duration: 300
    },
    AIR: {
        color: '#F0F8FF',
        symbol: '💨',
        effect: 'slowMotion',
        name: 'SLOW MOTION',
        description: 'Slower Poop Falling!\nActive for 5 seconds',
        duration: 300
    }
};

// Initialize Game
function init() {
    console.log("init() called");

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    console.log("Canvas:", canvas);
    console.log("Context:", ctx);

    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    // Set up event listeners
    document.getElementById('continueBtn').addEventListener('click', continueToMenu);
    document.getElementById('playBtn').addEventListener('click', startGame);
    document.getElementById('howToPlayBtn').addEventListener('click', showHowToPlay);
    document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('menuBtn').addEventListener('click', showMenu);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyUp);

    // Enter key for name input
    document.getElementById('playerName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            continueToMenu();
        }
    });

    // Click handler for power-up messages
    canvas.addEventListener('click', function() {
        console.log("Canvas clicked, showPowerupMessage:", showPowerupMessage);
        if (showPowerupMessage) {
            showPowerupMessage = false;
        }
    });

    // Mobile touch controls
    setupTouchControls();

    showScreen('nameScreen');
    console.log("init() completed");
}

// Screen Management
function showScreen(screenId) {
    console.log("Showing screen:", screenId);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
    currentScreen = screenId;
}

function continueToMenu() {
    console.log("continueToMenu() called");
    const nameInput = document.getElementById('playerName');
    if (nameInput.value.trim() === '') {
        alert('Please enter your name!');
        return;
    }
    playerName = nameInput.value.trim();
    showScreen('menuScreen');
}

function showMenu() {
    console.log("showMenu() called");
    showScreen('menuScreen');
}

function showHowToPlay() {
    console.log("showHowToPlay() called");
    showScreen('howToPlayScreen');
}

function showLeaderboard() {
    console.log("showLeaderboard() called");
    showScreen('leaderboardScreen');
    updateLeaderboard();
}

// FIXED Leaderboard System - Only one entry per player with best score
function getLeaderboard() {
    const leaderboard = localStorage.getItem('poopDodgeLeaderboard');
    return leaderboard ? JSON.parse(leaderboard) : [];
}

function saveToLeaderboard(name, score) {
    const leaderboard = getLeaderboard();
    const now = new Date();
    const date = now.toLocaleDateString();

    // Check if player already exists
    const existingPlayerIndex = leaderboard.findIndex(player => player.name === name);

    if (existingPlayerIndex !== -1) {
        // Player exists - update only if new score is better
        if (score > leaderboard[existingPlayerIndex].score) {
            leaderboard[existingPlayerIndex].score = score;
            leaderboard[existingPlayerIndex].date = date;
        }
    } else {
        // New player - add to leaderboard
        leaderboard.push({
            name: name,
            score: score,
            date: date
        });
    }

    // Sort by score (descending) and keep top 10
    leaderboard.sort((a, b) => b.score - a.score);
    const topScores = leaderboard.slice(0, 10);

    localStorage.setItem('poopDodgeLeaderboard', JSON.stringify(topScores));
}

function updateLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardElement = document.getElementById('leaderboard');

    if (leaderboard.length === 0) {
        leaderboardElement.innerHTML = '<p>No scores yet! Be the first Poop-Master! 🏆</p>';
        return;
    }

    leaderboardElement.innerHTML = leaderboard.map((entry, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">#${index + 1}</span>
            <span class="leaderboard-name">${entry.name}</span>
            <span class="leaderboard-score">${entry.score}</span>
        </div>
    `).join('');
}

// Create clouds
function createClouds() {
    clouds = [
        { x: 100, y: 80, width: 120, height: 60, speed: 0.2 },
        { x: 400, y: 120, width: 150, height: 70, speed: 0.3 },
        { x: 600, y: 60, width: 100, height: 50, speed: 0.25 }
    ];
}

// Game Start
function startGame() {
    console.log("startGame() called");

    // Reset game state
    player = {
        x: canvas.width / 2 - 15,
        y: canvas.height - 80,
        width: 30,
        height: 60,
        speed: 8,
        movingLeft: false,
        movingRight: false
    };

    poops = [];
    powerups = [];
    score = 0;
    lives = 3;
    poopSpeed = 3;
    activePowerup = null;
    powerupTimer = 0;
    scoreTimer = 0;
    showPowerupMessage = false;
    gamePaused = false;

    // Reset speed variables
    currentPoopSpeed = 3;
    lastSpeedIncrease = 0;
    speedLevel = 0;
    gameStartTime = Date.now();

    createClouds();
    showScreen('gameScreen');
    gameActive = true;

    console.log("Starting game loop...");
    // Start game loop
    gameLoop();
}

// Game Loop
function gameLoop() {
    if (!gameActive) {
        console.log("Game not active, stopping loop");
        return;
    }

    update();
    render();

    requestAnimationFrame(gameLoop);
}

// Update Game State
function update() {
    if (!gameActive || gamePaused) return;

    const currentTime = Date.now();

    // Increase poop speed every 45 seconds
    if (currentTime - lastSpeedIncrease > speedIncreaseInterval) {
        speedLevel++;
        currentPoopSpeed = Math.min(8, 3 + (speedLevel * 0.5));
        lastSpeedIncrease = currentTime;
    }

    // Update score every second
    scoreTimer++;
    if (scoreTimer >= 60) {
        score += 1;
        scoreTimer = 0;
    }

    // Update clouds
    clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width) {
            cloud.x = -cloud.width;
        }
    });

    // Update player movement
    if (player.movingLeft) {
        player.x = Math.max(0, player.x - player.speed);
    }
    if (player.movingRight) {
        player.x = Math.min(canvas.width - player.width, player.x + player.speed);
    }

    // Update power-up message timer
    if (showPowerupMessage) {
        powerupMessageTimer--;
        if (powerupMessageTimer <= 0) {
            showPowerupMessage = false;
        }
    }

    // Update power-up timer
    if (activePowerup && powerupTimer > 0) {
        powerupTimer--;
        if (powerupTimer === 0) {
            deactivatePowerup();
        }
    }

    // Spawn objects
    spawnTimers.poop++;
    spawnTimers.powerup++;

    // Controlled poop spawning
    const currentTimeMs = Date.now();
    if (currentTimeMs - lastPoopSpawn > poopSpawnRate) {
        spawnPoop();
        lastPoopSpawn = currentTimeMs;
        poopSpawnRate = Math.random() * 167 + 333;
    }

    if (spawnTimers.powerup > 180) {
        spawnPowerup();
        spawnTimers.powerup = 0;
    }

    // Update poops
    for (let i = poops.length - 1; i >= 0; i--) {
        const poop = poops[i];
        const speed = activePowerup?.effect === 'slowMotion' ? currentPoopSpeed * 0.5 : currentPoopSpeed;
        poop.y += speed;

        if (poop.y > canvas.height) {
            poops.splice(i, 1);
        }
    }

    // Update power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.y += 3;

        if (powerup.y > canvas.height) {
            powerups.splice(i, 1);
        }
    }

    // Check collisions
    checkCollisions();
}

// Render Game
function render() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.ellipse(cloud.x, cloud.y, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
        ctx.ellipse(cloud.x - cloud.width/3, cloud.y, cloud.width/2.5, cloud.height/2, 0, 0, Math.PI * 2);
        ctx.ellipse(cloud.x + cloud.width/3, cloud.y, cloud.width/2.5, cloud.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Draw player
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    // Head
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + 10, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y + 18);
    ctx.lineTo(player.x + player.width/2, player.y + 35);
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y + 25);
    ctx.lineTo(player.x + player.width/2 - 12, player.y + 20);
    ctx.moveTo(player.x + player.width/2, player.y + 25);
    ctx.lineTo(player.x + player.width/2 + 12, player.y + 20);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y + 35);
    ctx.lineTo(player.x + player.width/2 - 10, player.y + 50);
    ctx.moveTo(player.x + player.width/2, player.y + 35);
    ctx.lineTo(player.x + player.width/2 + 10, player.y + 50);
    ctx.stroke();

    // Draw shield if active
    if (activePowerup?.effect === 'shield') {
        ctx.strokeStyle = '#ADD8E6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw poops
    poops.forEach(poop => {
        ctx.font = `${poop.size}px Arial`;
        ctx.fillText('💩', poop.x, poop.y);
    });

    // Draw power-ups
    powerups.forEach(powerup => {
        ctx.font = '30px Arial';
        ctx.fillText(powerup.symbol, powerup.x, powerup.y);
    });

    // Draw UI
    drawGameUI();

    // Draw power-up message
    if (showPowerupMessage) {
        gamePaused = true;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;

        const messageWidth = 400;
        const messageHeight = 140;
        const x = (canvas.width - messageWidth) / 2;
        const y = (canvas.height - messageHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, messageWidth, messageHeight, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 24px Comic Sans MS';
        ctx.textAlign = 'center';

        const lines = powerupMessageText.split('\n');
        lines.forEach((line, index) => {
            ctx.fillText(line, canvas.width / 2, y + 45 + (index * 30));
        });

        // Continue button
        ctx.fillStyle = '#8B4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - 150, y + 230, 300, 40, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Comic Sans MS';
        ctx.fillText('CLICK ANYWHERE TO CONTINUE', canvas.width / 2, y + 255);

        ctx.textAlign = 'left';
    } else {
        gamePaused = false;
    }
}

// Draw UI
function drawGameUI() {
    // Score
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 10, 120, 50, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 20px Comic Sans MS';
    ctx.fillText(`SCORE: ${score}`, 25, 40);

    // Lives
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(canvas.width - 130, 10, 120, 50, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF4444';
    ctx.font = '30px Arial';
    ctx.fillText('❤️'.repeat(lives), canvas.width - 115, 45);

    // Speed level
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 60, 10, 120, 30, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8B4513';
    ctx.font = 'bold 14px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText(`SPEED: ${speedLevel + 1}`, canvas.width / 2, 30);
    ctx.textAlign = 'left';

    // Active power-up timer
    if (activePowerup && powerupTimer > 0) {
        const seconds = Math.ceil(powerupTimer / 60);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(canvas.width - 130, 70, 120, 40, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 18px Comic Sans MS';
        ctx.fillText(`${activePowerup.symbol} ${seconds}s`, canvas.width - 115, 95);
    }
}

// Spawn Objects
function spawnPoop() {
    const size = Math.random() * 10 + 25;
    poops.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        size: size,
        width: 30,
        height: 30
    });
}

function spawnPowerup() {
    const types = Object.values(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];

    powerups.push({
        x: Math.random() * (canvas.width - 40),
        y: -40,
        width: 30,
        height: 30,
        ...type
    });
}

// Collision Detection
function checkCollisions() {
    // Check poop collisions
    for (let i = poops.length - 1; i >= 0; i--) {
        const poop = poops[i];
        if (checkCollision(player, poop)) {
            if (activePowerup?.effect === 'shield') {
                poops.splice(i, 1);
                score += 5;
            } else {
                loseLife();
                poops.splice(i, 1);
                break;
            }
        }
    }

    // Check power-up collisions
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        if (checkCollision(player, powerup)) {
            activatePowerup(powerup);
            powerups.splice(i, 1);
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Power-up System
function activatePowerup(powerup) {
    console.log("Power-up activated:", powerup.name);
    activePowerup = powerup;

    showPowerupMessage = true;
    powerupMessageTimer = 180;

    if (powerup.effect === 'extraLife') {
        powerupMessageText = `${powerup.name} ACTIVATED!\n${powerup.description}`;
        lives++;
        activePowerup = null;
    } else {
        powerupMessageText = `${powerup.name} ACTIVATED!\n${powerup.description}`;
        powerupTimer = powerup.duration || 300;
    }
}

function deactivatePowerup() {
    activePowerup = null;
}

// Game Events
function loseLife() {
    lives--;
    if (lives <= 0) {
        gameOver();
    }
}

function gameOver() {
    console.log("Game Over");
    gameActive = false;
    saveToLeaderboard(playerName, score);
    document.getElementById('finalScore').textContent = score;
    showScreen('gameOverScreen');
}

// Input Handling
function handleKeyPress(e) {
    if (!gameActive) return;

    switch (e.key) {
        case 'ArrowLeft':
            player.movingLeft = true;
            break;
        case 'ArrowRight':
            player.movingRight = true;
            break;
    }
}

function handleKeyUp(e) {
    if (!gameActive) return;

    switch (e.key) {
        case 'ArrowLeft':
            player.movingLeft = false;
            break;
        case 'ArrowRight':
            player.movingRight = false;
            break;
    }
}

// Mobile Touch Controls
function setupTouchControls() {
    const gameScreen = document.getElementById('gameScreen');

    const touchControls = document.createElement('div');
    touchControls.className = 'touch-controls hidden';
    touchControls.innerHTML = `
        <div class="touch-btn" id="leftBtn">←</div>
        <div class="touch-btn" id="rightBtn">→</div>
    `;
    document.body.appendChild(touchControls);

    function updateTouchControls() {
        if (currentScreen === 'gameScreen' && isMobile()) {
            touchControls.classList.remove('hidden');
        } else {
            touchControls.classList.add('hidden');
        }
    }

    document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.movingLeft = true;
    });

    document.getElementById('leftBtn').addEventListener('touchend', (e) => {
        e.preventDefault();
        player.movingLeft = false;
    });

    document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        player.movingRight = true;
    });

    document.getElementById('rightBtn').addEventListener('touchend', (e) => {
        e.preventDefault();
        player.movingRight = false;
    });

    const originalShowScreen = showScreen;
    showScreen = function(screenId) {
        originalShowScreen(screenId);
        updateTouchControls();
    };
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Start the game when page loads
window.addEventListener('load', init);
