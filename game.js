// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_HEIGHT = 30;
const GRAVITY = 1;
const JUMP_FORCE = -15;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.0001;
const OBSTACLE_SPAWN_RATE = 1500; // milliseconds

// Game elements
let canvas, ctx;
let player, obstacles, powerups;
let score, knowledge, highScore;
let speed, spawnTimer, animationId;
let gameRunning, examSession;
let currentSemester;
let character = 'stem';
let touchStartY;

// Character stats
const CHARACTERS = {
    stem: { jumpForce: -18, speed: 1, invincibilityTime: 1 },
    humanities: { jumpForce: -15, speed: 1.2, invincibilityTime: 1 },
    medical: { jumpForce: -15, speed: 1, invincibilityTime: 1.5 }
};

// Obstacle types
const OBSTACLES = [
    { type: 'labWork', width: 30, height: 40, points: 10, rarity: 0.4 },
    { type: 'test', width: 40, height: 60, points: 20, rarity: 0.3 },
    { type: 'project', width: 35, height: 80, points: 30, rarity: 0.2 },
    { type: 'exam', width: 50, height: 70, points: 50, rarity: 0.1 },
    { type: 'flyingObstacle', width: 40, height: 30, points: 15, rarity: 0.2, flying: true }
];

// Powerup types
const POWERUPS = [
    { type: 'coffee', effect: 'speed', duration: 5000, rarity: 0.4 },
    { type: 'cheatSheet', effect: 'invincibility', duration: 3000, rarity: 0.2 },
    { type: 'notes', effect: 'points', points: 50, rarity: 0.4 }
];

// Background themes (semesters)
const BACKGROUNDS = [
    { name: 'Freshman Year', ground: '#8B4513', sky: '#87CEEB', buildings: '#555' },
    { name: 'Sophomore Year', ground: '#556B2F', sky: '#ADD8E6', buildings: '#777' },
    { name: 'Junior Year', ground: '#A52A2A', sky: '#B0E0E6', buildings: '#888' },
    { name: 'Senior Year', ground: '#4B0082', sky: '#F0F8FF', buildings: '#999' }
];

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');
    
    // Load saved knowledge and unlocks
    loadGameData();
    updateCharacterSelect();
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
    document.getElementById('useCheatSheet').addEventListener('click', useCheatSheet);
    
    document.querySelectorAll('.character').forEach(char => {
        char.addEventListener('click', selectCharacter);
    });
}

function loadGameData() {
    highScore = localStorage.getItem('studentRunner_highScore') || 0;
    knowledge = parseInt(localStorage.getItem('studentRunner_knowledge') || 0);
    
    // Unlock characters based on knowledge
    const unlockedCharacters = JSON.parse(localStorage.getItem('studentRunner_unlockedCharacters') || '["stem"]');
    
    document.getElementById('knowledge').textContent = knowledge;
    
    return { highScore, knowledge, unlockedCharacters };
}

function saveGameData() {
    localStorage.setItem('studentRunner_highScore', highScore);
    localStorage.setItem('studentRunner_knowledge', knowledge);
    
    // Get all unlocked characters
    const unlockedCharacters = [];
    document.querySelectorAll('.character:not(.locked)').forEach(char => {
        unlockedCharacters.push(char.dataset.type);
    });
    
    localStorage.setItem('studentRunner_unlockedCharacters', JSON.stringify(unlockedCharacters));
}

function updateCharacterSelect() {
    const { unlockedCharacters } = loadGameData();
    
    document.querySelectorAll('.character').forEach(char => {
        if (unlockedCharacters.includes(char.dataset.type)) {
            char.classList.remove('locked');
            char.querySelector('.locked').classList.add('hidden');
        } else {
            char.classList.add('locked');
            char.querySelector('.locked').classList.remove('hidden');
        }
    });
}

function selectCharacter(e) {
    const charElement = e.currentTarget;
    if (charElement.classList.contains('locked')) {
        const requiredKnowledge = parseInt(charElement.querySelector('.locked').textContent.match(/\d+/)[0]);
        
        if (knowledge >= requiredKnowledge) {
            // Unlock character
            knowledge -= requiredKnowledge;
            document.getElementById('knowledge').textContent = knowledge;
            
            charElement.classList.remove('locked');
            charElement.querySelector('.locked').classList.add('hidden');
            saveGameData();
        }
        return;
    }
    
    // Select character
    document.querySelectorAll('.character').forEach(c => c.classList.remove('selected'));
    charElement.classList.add('selected');
    character = charElement.dataset.type;
}

function startGame() {
    // Hide menus
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    
    // Reset game state
    player = {
        x: 50,
        y: CANVAS_HEIGHT - GROUND_HEIGHT - 50,
        width: 30,
        height: 50,
        jumping: false,
        crouching: false,
        velocityY: 0,
        jumpForce: CHARACTERS[character].jumpForce,
        invincible: false
    };
    
    obstacles = [];
    powerups = [];
    score = 0;
    speed = INITIAL_SPEED * CHARACTERS[character].speed;
    gameRunning = true;
    examSession = false;
    currentSemester = 0;
    
    // Start game loop
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnObstacle, OBSTACLE_SPAWN_RATE);
    
    // Start animation
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function gameLoop() {
    update();
    render();
    
    if (gameRunning) {
        animationId = requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Update player
    if (player.jumping) {
        player.velocityY += GRAVITY;
        player.y += player.velocityY;
        
        // Check if landed
        if (player.y >= CANVAS_HEIGHT - GROUND_HEIGHT - player.height) {
            player.y = CANVAS_HEIGHT - GROUND_HEIGHT - player.height;
            player.jumping = false;
            player.velocityY = 0;
        }
    }
    
    // Update speed and score
    speed += SPEED_INCREMENT;
    score++;
    document.getElementById('score').textContent = score;
    
    // Check semester progression
    const newSemester = Math.floor(score / 1000);
    if (newSemester > currentSemester && newSemester < BACKGROUNDS.length) {
        currentSemester = newSemester;
        document.getElementById('semester').textContent = currentSemester + 1;
    }
    
    // Random exam session
    if (Math.random() < 0.0005 && !examSession) {
        startExamSession();
    }
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= speed;
        
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(i, 1);
        } else if (!player.invincible && checkCollision(player, obstacle)) {
            gameOver();
            return;
        }
    }
    
    // Update powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.x -= speed;
        
        // Remove off-screen powerups
        if (powerup.x + powerup.width < 0) {
            powerups.splice(i, 1);
        } else if (checkCollision(player, powerup)) {
            activatePowerup(powerup);
            powerups.splice(i, 1);
        }
    }
}

function startExamSession() {
    examSession = true;
    const originalSpawnRate = spawnTimer;
    clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnObstacle, OBSTACLE_SPAWN_RATE / 2);
    
    // End exam session after 10 seconds
    setTimeout(() => {
        if (gameRunning) {
            examSession = false;
            clearInterval(spawnTimer);
            spawnTimer = setInterval(spawnObstacle, OBSTACLE_SPAWN_RATE);
        }
    }, 10000);
}

function spawnObstacle() {
    if (!gameRunning) return;
    
    // Decide between obstacle and powerup
    if (Math.random() < 0.8) {
        // Spawn obstacle
        const weights = OBSTACLES.map(o => o.rarity);
        const obstacleType = weightedRandom(OBSTACLES, weights);
        
        const obstacle = {
            x: CANVAS_WIDTH,
            y: obstacleType.flying ? 
                CANVAS_HEIGHT - GROUND_HEIGHT - 80 - Math.random() * 60 : 
                CANVAS_HEIGHT - GROUND_HEIGHT - obstacleType.height,
            width: obstacleType.width,
            height: obstacleType.height,
            type: obstacleType.type,
            points: obstacleType.points,
            flying: obstacleType.flying || false
        };
        
        obstacles.push(obstacle);
    } else {
        // Spawn powerup
        const weights = POWERUPS.map(p => p.rarity);
        const powerupType = weightedRandom(POWERUPS, weights);
        
        const powerup = {
            x: CANVAS_WIDTH,
            y: CANVAS_HEIGHT - GROUND_HEIGHT - 40 - Math.random() * 60,
            width: 30,
            height: 30,
            type: powerupType.type,
            effect: powerupType.effect,
            duration: powerupType.duration,
            points: powerupType.points
        };
        
        powerups.push(powerup);
    }
}

function activatePowerup(powerup) {
    switch (powerup.effect) {
        case 'speed':
            const originalSpeed = speed;
            speed *= 1.5;
            setTimeout(() => {
                if (gameRunning) speed = originalSpeed;
            }, powerup.duration);
            break;
        case 'invincibility':
            player.invincible = true;
            setTimeout(() => {
                if (gameRunning) player.invincible = false;
            }, powerup.duration * CHARACTERS[character].invincibilityTime);
            break;
        case 'points':
            score += powerup.points;
            document.getElementById('score').textContent = score;
            break;
    }
}

function gameOver() {
    gameRunning = false;
    clearInterval(spawnTimer);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
    }
    
    // Award knowledge
    const earnedKnowledge = Math.floor(score / 100);
    knowledge += earnedKnowledge;
    
    // Update display
    document.getElementById('finalScore').textContent = score;
    document.getElementById('earnedKnowledge').textContent = earnedKnowledge;
    document.getElementById('knowledge').textContent = knowledge;
    
    // Show or hide cheat sheet option
    const cheatSheetBtn = document.getElementById('useCheatSheet');
    if (knowledge >= 50) {
        cheatSheetBtn.classList.remove('hidden');
    } else {
        cheatSheetBtn.classList.add('hidden');
    }
    
    // Show game over screen
    document.getElementById('gameOver').classList.remove('hidden');
    
    // Save game data
    saveGameData();
}

function useCheatSheet() {
    if (knowledge >= 50) {
        knowledge -= 50;
        document.getElementById('knowledge').textContent = knowledge;
        document.getElementById('gameOver').classList.add('hidden');
        
        // Give temporary invincibility
        player.invincible = true;
        gameRunning = true;
        
        // Restart game loop
        if (spawnTimer) clearInterval(spawnTimer);
        spawnTimer = setInterval(spawnObstacle, OBSTACLE_SPAWN_RATE);
        
        gameLoop();
        
        // End invincibility after 3 seconds
        setTimeout(() => {
            if (gameRunning) player.invincible = false;
        }, 3000);
        
        saveGameData();
    }
}

function render() {
    // Draw background (sky)
    ctx.fillStyle = BACKGROUNDS[currentSemester].sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw buildings
    ctx.fillStyle = BACKGROUNDS[currentSemester].buildings;
    for (let i = 0; i < 5; i++) {
        const buildingHeight = 100 + Math.sin(i * 1.5) * 50;
        ctx.fillRect(i * 200 - (score * 0.2) % 200, CANVAS_HEIGHT - GROUND_HEIGHT - buildingHeight, 180, buildingHeight);
    }
    
    // Draw ground
    ctx.fillStyle = BACKGROUNDS[currentSemester].ground;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
    
    // Draw player
    if (player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
        // Blinking effect when invincible
        ctx.fillStyle = '#FFD700';
    } else {
        ctx.fillStyle = '#00F';
    }
    
    const playerHeight = player.crouching ? player.height / 2 : player.height;
    const playerY = player.crouching ? player.y + player.height / 2 : player.y;
    
    ctx.fillRect(player.x, playerY, player.width, playerHeight);
    
    // Draw obstacles
    for (const obstacle of obstacles) {
        switch (obstacle.type) {
            case 'labWork':
                ctx.fillStyle = '#8B0000';
                break;
            case 'test':
                ctx.fillStyle = '#FF4500';
                break;
            case 'project':
                ctx.fillStyle = '#4B0082';
                break;
            case 'exam':
                ctx.fillStyle = '#000';
                break;
            case 'flyingObstacle':
                ctx.fillStyle = '#800080';
                break;
        }
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    
    // Draw powerups
    for (const powerup of powerups) {
        switch (powerup.type) {
            case 'coffee':
                ctx.fillStyle = '#8B4513';
                break;
            case 'cheatSheet':
                ctx.fillStyle = '#FFD700';
                break;
            case 'notes':
                ctx.fillStyle = '#32CD32';
                break;
        }
        ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
    }
    
    // Draw exam session indicator
    if (examSession) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// Input handlers
function handleKeyDown(e) {
    if (!gameRunning) return;
    
    if (e.code === 'Space' && !player.jumping) {
        jump();
    } else if (e.code === 'ArrowDown') {
        player.crouching = true;
    }
}

function handleKeyUp(e) {
    if (!gameRunning) return;
    
    if (e.code === 'ArrowDown') {
        player.crouching = false;
    }
}

function handleTouchStart(e) {
    if (!gameRunning) return;
    
    touchStartY = e.touches[0].clientY;
}

function handleTouchMove(e) {
    if (!gameRunning || !touchStartY) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    
    if (diff > 50) {
        player.crouching = true;
    }
}

function handleTouchEnd(e) {
    if (!gameRunning) return;
    
    if (player.crouching) {
        player.crouching = false;
    } else if (!player.jumping) {
        jump();
    }
    
    touchStartY = null;
}

function jump() {
    player.jumping = true;
    player.velocityY = player.jumpForce;
}

function checkCollision(a, b) {
    if (a.crouching && b.flying) {
        return false; // Successfully ducked under flying obstacle
    }
    
    const aHeight = a.crouching ? a.height / 2 : a.height;
    const aY = a.crouching ? a.y + a.height / 2 : a.y;
    
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        aY < b.y + b.height &&
        aY + aHeight > b.y
    );
}

function weightedRandom(items, weights) {
    let total = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (let i = 0; i < items.length; i++) {
        if (random < weights[i]) {
            return items[i];
        }
        random -= weights[i];
    }
    
    return items[0]; // Fallback
}

// Initialize game when page loads
window.addEventListener('load', init);

