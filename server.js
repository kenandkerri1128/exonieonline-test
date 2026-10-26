const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3003;

// Serve static assets from public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// ==========================================
// EXONIE 3D MONSTER DATABASE & RULES
// ==========================================
const MonsterDatabase = {
    // Type 1: Slimes
    "common_mobs1": { name: "Slime", category: "common_mobs", level: 5, maxHp: 120, atk: 18, def: 2, speed: 2.2, expYield: 130, goldYield: 5, modelType: "slime", color: 0xff69b4, scale: 1.0 },
    "common_mobs_golden": { name: "Golden Slime", category: "common_mobs", level: 8, maxHp: 200, atk: 25, def: 5, speed: 3.8, expYield: 600, goldYield: 1500, modelType: "slime", color: 0xffd700, scale: 1.1 },
    "mini_boss1": { name: "Orc Slime", category: "mini_boss", level: 15, maxHp: 5500, atk: 75, def: 25, speed: 2.5, expYield: 1800, goldYield: 45, modelType: "slime", color: 0x2196F3, scale: 2.0 },
    "floor_boss1": { name: "Dragon Slime", category: "floor_boss", level: 25, maxHp: 35000, atk: 450, def: 90, speed: 3.2, expYield: 15000, goldYield: 250, modelType: "slime", color: 0xf44336, scale: 3.5 },

    // Type 2: Bats
    "common_mobs2": { name: "Shadow Bat", category: "common_mobs", level: 10, maxHp: 220, atk: 40, def: 5, speed: 4.2, expYield: 160, goldYield: 8, modelType: "bat", color: 0x2d114d, scale: 1.0 },
    "mini_boss2": { name: "Vampire Bat", category: "mini_boss", level: 20, maxHp: 14000, atk: 280, def: 20, speed: 4.8, expYield: 2400, goldYield: 80, modelType: "bat", color: 0x8a2be2, scale: 2.0 },
    "floor_boss2": { name: "Bloodwing Terror", category: "floor_boss", level: 30, maxHp: 42000, atk: 550, def: 110, speed: 5.5, expYield: 20000, goldYield: 400, modelType: "bat", color: 0xd32f2f, scale: 3.2 },

    // Type 3: Fire Elementals
    "common_mobs3": { name: "Fire Sprite", category: "common_mobs", level: 15, maxHp: 320, atk: 65, def: 8, speed: 2.6, expYield: 210, goldYield: 12, modelType: "fire_sprite", color: 0xff5722, scale: 1.0 },
    "mini_boss3": { name: "Inferno Core", category: "mini_boss", level: 25, maxHp: 18000, atk: 360, def: 40, speed: 3.0, expYield: 3200, goldYield: 120, modelType: "fire_sprite", color: 0xff9800, scale: 2.0 },
    "floor_boss3": { name: "Astral Blaze", category: "floor_boss", level: 35, maxHp: 58000, atk: 680, def: 140, speed: 3.6, expYield: 28000, goldYield: 600, modelType: "fire_sprite", color: 0xff1744, scale: 3.5 },

    // Type 4: Stone Golems
    "common_golem": { name: "Stone Golem", category: "common_mobs", level: 20, maxHp: 650, atk: 60, def: 35, speed: 1.6, expYield: 280, goldYield: 18, modelType: "golem", color: 0x795548, scale: 1.2 },
    "mini_boss_golem": { name: "Obsidian Behemoth", category: "mini_boss", level: 30, maxHp: 32000, atk: 420, def: 90, speed: 2.0, expYield: 4500, goldYield: 200, modelType: "golem", color: 0x37474f, scale: 2.2 },
    "floor_boss_golem": { name: "Titan of the Deep", category: "floor_boss", level: 40, maxHp: 95000, atk: 750, def: 220, speed: 2.4, expYield: 42000, goldYield: 1000, modelType: "golem", color: 0x263238, scale: 4.0 },

    // Type 5: Spectral Wraiths
    "common_wraith": { name: "Spectral Wraith", category: "common_mobs", level: 25, maxHp: 480, atk: 95, def: 15, speed: 4.0, expYield: 350, goldYield: 25, modelType: "wraith", color: 0x7c4dff, scale: 1.1 },
    "mini_boss_wraith": { name: "Soul Reaper", category: "mini_boss", level: 35, maxHp: 26000, atk: 520, def: 60, speed: 4.6, expYield: 5800, goldYield: 300, modelType: "wraith", color: 0x651fff, scale: 2.2 },
    "floor_boss_wraith": { name: "The Void King", category: "floor_boss", level: 45, maxHp: 110000, atk: 900, def: 180, speed: 5.2, expYield: 55000, goldYield: 1500, modelType: "wraith", color: 0x311b92, scale: 3.5 },

    // Type 6: Minotaurs
    "common_minotaur": { name: "Minotaur Grunt", category: "common_mobs", level: 30, maxHp: 900, atk: 110, def: 45, speed: 2.2, expYield: 420, goldYield: 35, modelType: "minotaur", color: 0x5d4037, scale: 1.3 },
    "mini_boss_minotaur": { name: "Gorehorn", category: "mini_boss", level: 40, maxHp: 42000, atk: 620, def: 120, speed: 2.8, expYield: 7500, goldYield: 450, modelType: "minotaur", color: 0xb71c1c, scale: 2.4 },
    "floor_boss_minotaur": { name: "Asterion The Labyrinth King", category: "floor_boss", level: 50, maxHp: 160000, atk: 1100, def: 280, speed: 3.2, expYield: 75000, goldYield: 2500, modelType: "minotaur", color: 0x212121, scale: 4.2 },

    // Type 7: Dragons
    "common_dragon": { name: "Dragon Whelp", category: "common_mobs", level: 35, maxHp: 750, atk: 135, def: 35, speed: 3.4, expYield: 500, goldYield: 50, modelType: "dragon", color: 0x4caf50, scale: 1.4 },
    "mini_boss_dragon": { name: "Drake of Embers", category: "mini_boss", level: 45, maxHp: 52000, atk: 750, def: 140, speed: 3.9, expYield: 11000, goldYield: 700, modelType: "dragon", color: 0xff5722, scale: 2.6 },
    "floor_boss_dragon": { name: "Ignis The Ancient", category: "floor_boss", level: 60, maxHp: 240000, atk: 1400, def: 380, speed: 4.5, expYield: 120000, goldYield: 5000, modelType: "dragon", color: 0xd50000, scale: 5.0 }
};

// Item Templates & Drop Rates
const RARITY_COLORS = {
    Starter: "#9e9e9e",
    Basic: "#ffffff",
    Rare: "#2196f3",
    Unique: "#ab47bc",
    Legendary: "#ff9800",
    Godly: "#f44336",
    Divine: "#ffea00"
};

const ITEM_TYPES = ['sword', 'dagger', 'staff', 'gun', 'touchpad', 'armor', 'leggings', 'pendant'];
const STAT_TYPES = ['attack', 'magic', 'defense', 'speed', 'int', 'str', 'hp'];

function getBaseStat(lvl) {
    if (lvl >= 50) return 100 + (Math.floor((lvl - 50) / 5) * 3);
    if (lvl >= 45) return 45;
    if (lvl >= 40) return 40;
    if (lvl >= 35) return 30;
    if (lvl >= 30) return 27;
    if (lvl >= 25) return 22;
    if (lvl >= 20) return 20;
    if (lvl >= 15) return 15;
    if (lvl >= 10) return 12;
    if (lvl >= 5)  return 8;
    return 5;
}

function generateDrop(mobLevel, category) {
    const roll = Math.random();
    let rarity = "Basic";
    if (category === "floor_boss") {
        if (roll < 0.15) rarity = "Divine";
        else if (roll < 0.40) rarity = "Godly";
        else if (roll < 0.75) rarity = "Legendary";
        else rarity = "Unique";
    } else if (category === "mini_boss") {
        if (roll < 0.05) rarity = "Godly";
        else if (roll < 0.25) rarity = "Legendary";
        else if (roll < 0.65) rarity = "Unique";
        else rarity = "Rare";
    } else {
        if (roll < 0.01) rarity = "Godly";
        else if (roll < 0.05) rarity = "Legendary";
        else if (roll < 0.20) rarity = "Unique";
        else if (roll < 0.50) rarity = "Rare";
        else rarity = "Basic";
    }

    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const bonusMultiplier = { Basic: 1.0, Rare: 1.4, Unique: 1.8, Legendary: 2.4, Godly: 3.2, Divine: 4.5 }[rarity] || 1.0;
    let statVal = getBaseStat(mobLevel) + ({ Basic: 0, Rare: 2, Unique: 5, Legendary: 8, Godly: 12, Divine: 12 }[rarity] || 0);
    if (rarity === "Divine") statVal = (getBaseStat(mobLevel) + 12) * 2;
    if (type === 'gun' || type === 'pendant') statVal = Math.floor(statVal / 2);

    const fixedStat = {};
    const isWpn = !['armor', 'leggings'].includes(type);
    const itemSlot = isWpn ? 'weapon' : type;
    if (type === 'armor') fixedStat.defense = Math.max(2, statVal);
    else if (type === 'leggings') fixedStat.hp = Math.max(10, statVal * 4);
    else if (['staff', 'pendant', 'touchpad'].includes(type)) fixedStat.magic = statVal;
    else fixedStat.attack = statVal;

    const randomStat = {};
    const numStats = rarity === "Divine" ? 4 : (rarity === "Godly" ? 3 : (rarity === "Legendary" ? 2 : 1));
    const available = [...STAT_TYPES];
    for (let i = 0; i < numStats; i++) {
        if (available.length === 0) break;
        const rIdx = Math.floor(Math.random() * available.length);
        const sKey = available.splice(rIdx, 1)[0];
        randomStat[sKey] = Math.max(1, Math.floor(Math.random() * getBaseStat(mobLevel)) + 1);
    }

    return {
        id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: `${rarity} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: itemSlot,
        weaponType: isWpn ? type : null,
        sprite: `${rarity.toLowerCase()}${type}`,
        rarity: rarity,
        level: mobLevel,
        levelReq: Math.max(1, mobLevel - 2),
        color: RARITY_COLORS[rarity],
        fixedStat: fixedStat,
        randomStat: randomStat,
        enhanceLevel: 0,
        sellPrice: Math.floor(mobLevel * 10 * bonusMultiplier)
    };
}

// In-memory player state for multiplayer
const players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            name: playerData.name || 'Hero',
            gender: playerData.gender || 'female',
            hairStyle: playerData.hairStyle || '1',
            hairColor: playerData.hairColor || '#111111',
            skinColor: playerData.skinColor || '#f5c6a5',
            className: playerData.className || 'Blademaster',
            level: playerData.level || 1,
            hp: playerData.hp || 500,
            maxHp: playerData.maxHp || 500,
            mp: playerData.mp || 200,
            maxMp: playerData.maxMp || 200,
            atk: playerData.atk || 50,
            def: playerData.def || 10,
            currentFloor: playerData.currentFloor || 1,
            x: 0,
            y: 0,
            z: 0,
            rotY: 0
        };

        // Notify client of join success and other players
        socket.emit('gameState', { self: players[socket.id], players });
        socket.broadcast.emit('playerJoined', players[socket.id]);
    });

    socket.on('playerMove', (data) => {
        if (!players[socket.id]) return;
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        players[socket.id].z = data.z;
        players[socket.id].rotY = data.rotY;
        players[socket.id].anim = data.anim;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('monsterKill', (data) => {
        const mob = MonsterDatabase[data.monsterKey] || MonsterDatabase['common_mobs1'];
        const drop = Math.random() < 0.65 ? generateDrop(data.level || mob.level, mob.category) : null;
        socket.emit('monsterLoot', {
            exp: mob.expYield,
            gold: mob.goldYield,
            drop: drop
        });
    });

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', data);
    });

    socket.on('worldChatMessage', (data) => {
        io.emit('worldChatMessage', data);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🛡️  EXONIE 3D REMASTERED SERVER STARTED 🛡️`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`⚡ Dragon Nest 3D Combat + Crisp Mobile Enabled`);
    console.log(`===============================================`);
});
