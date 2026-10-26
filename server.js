require('dotenv').config();
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
// 🛡️ SUPABASE LIVE DATABASE INTEGRATION
// Matches 2D Exonie 'Exonians' table schema
// ==========================================
let supabase = null;
try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log(`✅ [Supabase] Connected to live database at: ${supabaseUrl}`);
    } else {
        console.warn('⚠️ [Supabase Notice] SUPABASE_URL or SUPABASE_KEY missing. Database calls will safely use memory fallback.');
    }
} catch (e) {
    console.warn('⚠️ [Supabase Warning] Could not initialize Supabase client:', e.message);
}

// In-memory fallback database for local testing or when Supabase keys are not set
const memoryDb = {
    users: {}, // username -> user record
    accounts: {} // accountName -> [char1, char2, char3]
};

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

// ==========================================
// 🛡️ 2D EXONIE LOOT & STAT GENERATION ENGINE
// Matches 2D Exonie server.js lines 670-1300
// ==========================================
const STAT_TYPES = ['attack', 'magic', 'defense', 'speed', 'int', 'str', 'hp'];
const RARITY_COLORS = {
    Starter: "#aaaaaa",
    Basic: "#8B4513",
    Rare: "#2196F3",
    Unique: "#9c27b0",
    Legendary: "#f44336",
    Godly: "#e0ffff",
    Divine: "#ffea00"
};

const ITEM_TEMPLATES = {
    sword:    { slot: 'weapon', statKey: 'attack',  baseName: 'Sword',    spriteName: 'sword' },
    staff:    { slot: 'weapon', statKey: 'magic',   baseName: 'Staff',    spriteName: 'staff' },
    pendant:  { slot: 'weapon', statKey: 'magic',   baseName: 'Pendant',  spriteName: 'pendant' },
    gun:      { slot: 'weapon', statKey: 'attack',  baseName: 'Gun',      spriteName: 'gun' },
    dagger:   { slot: 'weapon', statKey: 'attack',  baseName: 'Dagger',   spriteName: 'dagger' },
    touchpad: { slot: 'weapon', statKey: 'magic',   baseName: 'Touchpad', spriteName: 'touchpad' },
    armor:    { slot: 'armor',  statKey: 'defense', baseName: 'Armor',    spriteName: 'armor' },
    leggings: { slot: 'leggings', statKey: 'hp',    baseName: 'Leggings', spriteName: 'leggings' }
};

function getBaseStat(lvl) {
    if (lvl >= 50) {
        let extraTicks = Math.floor((lvl - 50) / 5);
        return 100 + (extraTicks * 3);
    }
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

function generateDrop(mLevel, category) {
    let rarityRoll = Math.random();
    let rarity = "Basic";

    if (category === "floor_boss") {
        rarity = rarityRoll < 0.15 ? "Divine" : (rarityRoll <= 0.45 ? "Godly" : "Legendary");
    } else if (category === "mini_boss") {
        rarity = rarityRoll < 0.10 ? "Godly" : (rarityRoll < 0.40 ? "Legendary" : (rarityRoll < 0.70 ? "Unique" : "Rare"));
    } else {
        rarity = rarityRoll < 0.02 ? "Godly" : (rarityRoll < 0.08 ? "Legendary" : (rarityRoll < 0.25 ? "Unique" : (rarityRoll < 0.50 ? "Rare" : "Basic")));
    }

    const keys = Object.keys(ITEM_TEMPLATES);
    const typeKey = keys[Math.floor(Math.random() * keys.length)];
    const template = ITEM_TEMPLATES[typeKey];

    let statVal = getBaseStat(mLevel) + ({ "Starter": 0, "Basic": 0, "Rare": 2, "Unique": 5, "Legendary": 8, "Godly": 12, "Divine": 12 }[rarity] || 0);
    if (rarity === "Divine") statVal = (getBaseStat(mLevel) + 12) * 2;
    if (typeKey === 'gun' || typeKey === 'pendant') statVal = Math.floor(statVal / 2);

    const fixedStat = {};
    fixedStat[template.statKey] = statVal;

    const randomStat = {};
    const numStats = rarity === "Divine" ? 4 : (rarity === "Godly" ? 3 : (rarity === "Legendary" ? 2 : 1));
    const availableStats = [...STAT_TYPES];
    for (let i = 0; i < numStats; i++) {
        if (availableStats.length === 0) break;
        let rIdx = Math.floor(Math.random() * availableStats.length);
        let sKey = availableStats.splice(rIdx, 1)[0];
        randomStat[sKey] = Math.floor(Math.random() * getBaseStat(mLevel)) + 1;
    }

    const isWpn = !['armor', 'leggings'].includes(typeKey);
    return {
        id: 'drop_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        name: `${rarity} ${template.baseName}`,
        type: template.slot,
        weaponType: isWpn ? typeKey : null,
        sprite: `${rarity.toLowerCase()}${template.spriteName}`,
        level: mLevel,
        rarity: rarity,
        color: RARITY_COLORS[rarity] || '#ffffff',
        fixedStat: fixedStat,
        randomStat: randomStat,
        enhanceLevel: 0,
        quantity: 1
    };
}

// Starter Items matching 2D Exonie createCharacter
function getStarterItems() {
    const starterEquips = {
        weapon: null,
        armor: { id: 'eq_armor_' + Date.now(), name: "Starter Armor", type: "armor", sprite: "starterarmor", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { defense: 2 } },
        leggings: { id: 'eq_leg_' + Date.now(), name: "Starter Leggings", type: "leggings", sprite: "starterleggings", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { hp: 5 } }
    };

    const starterInventory = [];
    for (let i = 0; i < 20; i++) starterInventory.push(null);

    starterInventory[0] = { id: 'wpn_1_' + Date.now(), name: "Starter Sword", type: "weapon", weaponType: "sword", sprite: "startersword", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 3 }, randomStat: {} };
    starterInventory[1] = { id: 'wpn_2_' + Date.now(), name: "Starter Staff", type: "weapon", weaponType: "staff", sprite: "starterstaff", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 3 }, randomStat: {} };
    starterInventory[2] = { id: 'wpn_3_' + Date.now(), name: "Starter Pendant", type: "weapon", weaponType: "pendant", sprite: "starterpendant", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 2 }, randomStat: {} };
    starterInventory[3] = { id: 'wpn_4_' + Date.now(), name: "Starter Gun", type: "weapon", weaponType: "gun", sprite: "startergun", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 2 }, randomStat: {} };
    starterInventory[4] = { id: 'wpn_5_' + Date.now(), name: "Starter Dagger", type: "weapon", weaponType: "dagger", sprite: "starterdagger", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 3, speed: 2 }, randomStat: {} };
    starterInventory[5] = { id: 'wpn_6_' + Date.now(), name: "Starter Touchpad", type: "weapon", weaponType: "touchpad", sprite: "startertouchpad", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 3 }, randomStat: {} };
    starterInventory[6] = { id: 'pot_1_' + Date.now(), name: "Health Potion", type: "potion", sprite: "potion1", level: 1, rarity: "Basic", color: "#8B4513", fixedStat: { hpHeal: 50 }, quantity: 10 };

    return { starterEquips, starterInventory };
}

// In-memory player state for active online players
const onlinePlayers = {};

// ==========================================
// SOCKET.IO REALTIME ENGINE
// ==========================================
io.on('connection', (socket) => {
    console.log(`[Socket] Connection established: ${socket.id}`);

    // 1. LOGIN (Supabase Exonians query matching 2D Exonie server.js line 3177)
    socket.on('login', async (data) => {
        try {
            const username = (data && data.username) ? String(data.username).trim() : '';
            const password = (data && data.password) ? String(data.password) : '';

            if (!username || !password) {
                return socket.emit('authError', 'Please enter both username and password.');
            }

            console.log(`[LOGIN ATTEMPT] Authenticating: ${username}`);

            let user = null;
            let characterSlots = [];
            const isHeroAccount = username.toLowerCase() === 'heroplayer' || username.startsWith('Hero_');

            if (isHeroAccount) {
                // Instant demo/test hero account - bypass DB requirement
                const { starterEquips, starterInventory } = getStarterItems();
                const defaultBaseStats = {
                    hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
                    playerClass: null, title: null, homeStorage: Array(15).fill(null),
                    tavernEntries: 5, dungeonEntries: 7
                };
                user = {
                    character_name: username,
                    password: password,
                    email: `${username}@exonie.com`,
                    level: 1,
                    exp: 0,
                    gold: 500,
                    skin_color: '#f5c6a5',
                    hair_color: '#111111',
                    hair_style: '1',
                    equips: starterEquips,
                    inventory: starterInventory,
                    base_stats: defaultBaseStats,
                    map_id: 'town',
                    pos_x: 960,
                    pos_y: 1000
                };
                characterSlots = [user, null, null];
            } else if (supabase) {
                // Query live Supabase Exonians database (case-insensitive for username or email)
                let query = supabase.from('Exonians').select('*').eq('password', password);
                if (username.includes('@')) {
                    query = query.eq('email', username);
                } else {
                    query = query.ilike('character_name', username);
                }

                const { data: dbUser, error: dbErr } = await query.maybeSingle();

                if (dbErr) {
                    console.error(`[LOGIN DB ERROR] ${username}:`, dbErr.message);
                }
                user = dbUser;

                if (user) {
                    // Fetch all character slots tied to this user's email if present
                    if (user.email) {
                        const { data: allChars } = await supabase
                            .from('Exonians')
                            .select('*')
                            .eq('email', user.email)
                            .limit(3);
                        if (allChars && allChars.length > 0) {
                            characterSlots = allChars.slice(0, 3);
                        } else {
                            characterSlots = [user];
                        }
                    } else {
                        characterSlots = [user];
                    }
                }
            }

            if (!user) {
                // In-memory fallback
                const mem = memoryDb.users[username.toLowerCase()] || memoryDb.users[username];
                if (mem && mem.password === password) {
                    user = mem;
                    characterSlots = memoryDb.accounts[username] || [mem];
                }
            }

            if (!user) {
                return socket.emit('authError', 'Invalid username or password.');
            }

            // Ensure 3 slots array
            while (characterSlots.length < 3) characterSlots.push(null);

            socket.username = username;
            socket.email = user.email || `${username}@exonie.com`;

            console.log(`[LOGIN SUCCESS] ${username} logged in with ${characterSlots.filter(Boolean).length} characters.`);
            socket.emit('loginSuccess', {
                username: username,
                email: socket.email,
                characters: characterSlots
            });

        } catch (e) {
            console.error('[LOGIN CRASH]', e);
            socket.emit('authError', 'Server error during login.');
        }
    });

    // 2. REGISTER (Inserts new character into Supabase Exonians table)
    socket.on('register', async (data) => {
        try {
            const username = (data && data.username) ? String(data.username).trim() : '';
            const password = (data && data.password) ? String(data.password) : '';
            const email = (data && data.email) ? String(data.email).trim() : `${username}@exonie.com`;

            if (!username || !password) {
                return socket.emit('authError', 'Please provide a username and password.');
            }

            if (supabase) {
                const { data: existing } = await supabase
                    .from('Exonians')
                    .select('character_name')
                    .eq('character_name', username)
                    .maybeSingle();

                if (existing) {
                    return socket.emit('authError', 'Username is already taken!');
                }

                const { starterEquips, starterInventory } = getStarterItems();
                const defaultBaseStats = {
                    hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
                    playerClass: null, title: null, homeStorage: Array(15).fill(null),
                    tavernEntries: 5, dungeonEntries: 7
                };

                const { error: insErr } = await supabase.from('Exonians').insert([{
                    character_name: username,
                    password: password,
                    email: email,
                    email_verified: true,
                    level: 1,
                    exp: 0,
                    gold: 500,
                    skin_color: '#f5c6a5',
                    hair_color: '#111111',
                    hair_style: '1',
                    equips: starterEquips,
                    inventory: starterInventory,
                    base_stats: defaultBaseStats,
                    map_id: 'town',
                    pos_x: 960,
                    pos_y: 1000
                }]);

                if (insErr) {
                    console.error('[REGISTER DB ERROR]', insErr.message);
                    return socket.emit('authError', `Failed to create account: ${insErr.message}`);
                }
            } else {
                if (memoryDb.users[username]) {
                    return socket.emit('authError', 'Username is already taken!');
                }
                const { starterEquips, starterInventory } = getStarterItems();
                const newRec = {
                    character_name: username,
                    password: password,
                    email: email,
                    level: 1,
                    exp: 0,
                    gold: 500,
                    skin_color: '#f5c6a5',
                    hair_color: '#111111',
                    hair_style: '1',
                    equips: starterEquips,
                    inventory: starterInventory,
                    base_stats: { hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10, playerClass: null },
                    map_id: 'town'
                };
                memoryDb.users[username] = newRec;
                memoryDb.accounts[username] = [newRec, null, null];
            }

            console.log(`[REGISTER SUCCESS] Account created: ${username}`);
            socket.emit('registerSuccess', username);

        } catch (e) {
            console.error('[REGISTER CRASH]', e);
            socket.emit('authError', 'Server error during registration.');
        }
    });

    // 3. FETCH ACCOUNT CHARACTERS
    socket.on('getAccountCharacters', async (data) => {
        try {
            const username = (data && data.username) || socket.username;
            if (!username) return socket.emit('accountCharacters', [null, null, null]);

            let slots = [null, null, null];
            if (supabase) {
                let chars = null;
                const userEmail = (data && data.email) || socket.email;
                if (userEmail) {
                    const { data: emailChars } = await supabase
                        .from('Exonians')
                        .select('*')
                        .eq('email', userEmail)
                        .limit(3);
                    if (emailChars && emailChars.length > 0) {
                        chars = emailChars;
                    }
                }
                if (!chars || chars.length === 0) {
                    const { data: nameChars } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('character_name', username)
                        .limit(3);
                    chars = nameChars;
                }
                if (chars && chars.length > 0) {
                    slots = chars.slice(0, 3);
                    while (slots.length < 3) slots.push(null);
                }
            } else {
                slots = memoryDb.accounts[username] || [null, null, null];
            }
            socket.emit('accountCharacters', slots);
        } catch (e) {
            console.error('[GET CHARS ERROR]', e);
        }
    });

    // 4. CREATE / CUSTOMIZE CHARACTER IN SLOT
    socket.on('createCharacter', async (data) => {
        try {
            const { username, charData } = data;
            const charName = (charData && charData.name) ? String(charData.name).trim() : username;
            const slotIdx = Math.max(0, Math.min(2, Number(data.slotIndex) || 0));

            console.log(`[CREATE CHAR] User: ${username}, Char: ${charName}, Slot: ${slotIdx}`);

            const { starterEquips, starterInventory } = getStarterItems();
            const defaultBaseStats = {
                hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
                playerClass: null, title: null, homeStorage: Array(15).fill(null),
                tavernEntries: 5, dungeonEntries: 7
            };

            let savedChar = null;

            if (supabase) {
                const userEmail = socket.email || `${username}@exonie.com`;
                const charRecord = {
                    character_name: charName,
                    password: data.password || 'default123',
                    email: userEmail,
                    email_verified: true,
                    skin_color: charData.skinColor || '#f5c6a5',
                    hair_color: charData.hairColor || '#111111',
                    hair_style: String(charData.hairStyle || '1'),
                    equips: starterEquips,
                    inventory: starterInventory,
                    base_stats: defaultBaseStats,
                    gold: 500,
                    level: 1,
                    exp: 0,
                    map_id: 'town',
                    pos_x: 960,
                    pos_y: 1000
                };

                // Upsert character into Exonians
                const { data: upserted, error: upErr } = await supabase
                    .from('Exonians')
                    .upsert(charRecord, { onConflict: 'character_name' })
                    .select()
                    .single();

                if (upErr) {
                    console.error('[CREATE CHAR DB ERROR]', upErr.message);
                    return socket.emit('authError', `Failed to save character: ${upErr.message}`);
                }
                savedChar = upserted;
            } else {
                savedChar = {
                    character_name: charName,
                    name: charName,
                    gender: charData.gender || 'female',
                    hairStyle: charData.hairStyle || '1',
                    hairColor: charData.hairColor || '#111111',
                    skinColor: charData.skinColor || '#f5c6a5',
                    equips: starterEquips,
                    inventory: starterInventory,
                    base_stats: defaultBaseStats,
                    gold: 500,
                    level: 1,
                    exp: 0,
                    map_id: 'town'
                };
                if (!memoryDb.accounts[username]) memoryDb.accounts[username] = [null, null, null];
                memoryDb.accounts[username][slotIdx] = savedChar;
            }

            socket.emit('characterCreated', { slotIndex: slotIdx, character: savedChar });

        } catch (e) {
            console.error('[CREATE CHAR CRASH]', e);
            socket.emit('authError', 'Server error creating character.');
        }
    });

    // 5. SAVE CHARACTER PROGRESS TO SUPABASE
    socket.on('saveCharacter', async (charState) => {
        try {
            if (!charState || !charState.name) return;
            const charName = String(charState.name).trim();

            if (supabase) {
                await supabase.from('Exonians').update({
                    level: charState.level || 1,
                    exp: charState.exp || 0,
                    gold: charState.gold || 0,
                    equips: charState.equips || {},
                    inventory: charState.inventory || [],
                    base_stats: charState.baseStats || {},
                    skin_color: charState.skinColor,
                    hair_color: charState.hairColor,
                    hair_style: charState.hairStyle
                }).eq('character_name', charName);
            }
        } catch (e) {
            console.error('[SAVE CHAR ERROR]', e.message);
        }
    });

    // 6. ENTER 3D WORLD / JOIN GAME
    socket.on('enterWorld', async (data) => {
        try {
            const charName = (data && (data.character_name || data.name)) ? String(data.character_name || data.name).trim() : 'Hero';
            let charRow = null;

            if (supabase) {
                const { data: fresh } = await supabase
                    .from('Exonians')
                    .select('*')
                    .eq('character_name', charName)
                    .maybeSingle();
                charRow = fresh;
            }

            const pData = charRow || data;

            onlinePlayers[socket.id] = {
                socketId: socket.id,
                id: charName,
                name: charName,
                gender: pData.gender || 'female',
                hairStyle: pData.hair_style || pData.hairStyle || '1',
                hairColor: pData.hair_color || pData.hairColor || '#111111',
                skinColor: pData.skin_color || pData.skinColor || '#f5c6a5',
                className: (pData.base_stats && pData.base_stats.playerClass) || pData.playerClass || 'Novice',
                level: pData.level || 1,
                exp: pData.exp || 0,
                gold: pData.gold || 500,
                equips: pData.equips || {},
                inventory: pData.inventory || [],
                baseStats: pData.base_stats || pData.baseStats || {},
                hp: 500,
                maxHp: 500,
                mp: 200,
                maxMp: 200,
                atk: 50,
                def: 10,
                x: 0,
                y: 0,
                z: 0,
                rotY: 0
            };

            socket.emit('gameState', { self: onlinePlayers[socket.id], players: onlinePlayers });
            socket.broadcast.emit('playerJoined', onlinePlayers[socket.id]);
            console.log(`[WORLD] ${charName} entered 3D world (Socket: ${socket.id})`);

        } catch (e) {
            console.error('[ENTER WORLD ERROR]', e);
        }
    });

    socket.on('joinGame', (playerData) => {
        onlinePlayers[socket.id] = Object.assign({ id: socket.id, x: 0, y: 0, z: 0, rotY: 0 }, playerData);
        socket.emit('gameState', { self: onlinePlayers[socket.id], players: onlinePlayers });
        socket.broadcast.emit('playerJoined', onlinePlayers[socket.id]);
    });

    socket.on('playerMove', (data) => {
        if (!onlinePlayers[socket.id]) return;
        onlinePlayers[socket.id].x = data.x;
        onlinePlayers[socket.id].y = data.y;
        onlinePlayers[socket.id].z = data.z;
        onlinePlayers[socket.id].rotY = data.rotY;
        onlinePlayers[socket.id].anim = data.anim;
        socket.broadcast.emit('playerMoved', onlinePlayers[socket.id]);
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
        console.log(`[Socket] Player disconnected: ${socket.id}`);
        delete onlinePlayers[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🛡️  EXONIE 3D REMASTERED SERVER STARTED 🛡️`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🗄️ Supabase Live Database Connection: ${supabase ? 'ACTIVE' : 'OFFLINE/FALLBACK'}`);
    console.log(`⚡ Dragon Nest 3D Combat + Crisp Mobile Enabled`);
    console.log(`===============================================`);
});