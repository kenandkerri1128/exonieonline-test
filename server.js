try {
    require('dotenv').config();
} catch (e) {
    // dotenv is optional in environments where variables are already injected or local fallback is used
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    allowEIO3: true
});

const PORT = process.env.PORT || 3003;

// Lightweight HTTP ping route to quickly wake sleeping cloud containers (e.g. Render)
app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
});

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

        // 🛡️ IMMEDIATELY PURGE INVALID COOLDOWNS (Haunted House is an unlimited challenge, NEVER has a cooldown!)
        supabase.from('boss_timers').delete().in('boss_id', ['hauntedhouse', 'hh_wraith_king', 'town', 'trainingtavern']).then(() => {
            console.log('✅ [Supabase Cleanup] Successfully purged hauntedhouse, town, and tavern from boss_timers.');
        }).catch(err => console.warn('[Supabase Cleanup Warning]:', err.message));
    } else {
        console.warn('⚠️ [Supabase Notice] SUPABASE_URL or SUPABASE_KEY missing. Database calls will safely use memory fallback.');
    }
} catch (e) {
    console.warn('⚠️ [Supabase Warning] Could not initialize Supabase client:', e.message);
}

// In-memory fallback database for local testing or when Supabase keys are not set
let memoryDb = { users: {} };

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
    leggings: { slot: 'leggings', statKey: 'hp',    baseName: 'Leggings', spriteName: 'leggings' },
    necklace: { slot: 'necklace', statKey: 'magic', baseName: 'Necklace', spriteName: 'necklace' },
    ring:     { slot: 'ring',     statKey: 'attack', baseName: 'Ring',    spriteName: 'ring' },
    earrings: { slot: 'earrings', statKey: 'defense', baseName: 'Earrings', spriteName: 'earrings' }
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

    const isWpn = template.slot === 'weapon';
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
        leggings: { id: 'eq_leg_' + Date.now(), name: "Starter Leggings", type: "leggings", sprite: "starterleggings", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { hp: 5 } },
        necklace: null,
        ring: null,
        earrings: null
    };

    const starterInventory = [];
    for (let i = 0; i < 30; i++) starterInventory.push(null);

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
const memoryAuctions = {};
const bossTimersMemory = {};

// ==========================================
// 🛡️ 3-SLOT MULTI-CHARACTER PARSER & SERIALIZER
// Seamlessly bridges 2D Exonie (multi-row per email) AND 3D Remastered (pipe-separated)
// Weapons, stats, inventory, levels, and gold are segregated per slot.
// ==========================================

function safeParseJson(raw, fallback) {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object') ? parsed : fallback;
    } catch (e) {
        return fallback;
    }
}

function parseSlotArray(fieldValue, defaultFactory) {
    if (fieldValue === null || fieldValue === undefined) {
        return [defaultFactory(), defaultFactory(), defaultFactory()];
    }

    if (Array.isArray(fieldValue)) {
        if (fieldValue.length === 3 && (
            fieldValue[0] === null ||
            Array.isArray(fieldValue[0]) ||
            (typeof fieldValue[0] === 'object' && ('weapon' in fieldValue[0] || 'hp' in fieldValue[0] || 'playerClass' in fieldValue[0] || 'str' in fieldValue[0] || 'level' in fieldValue[0]))
        )) {
            return [
                fieldValue[0] || defaultFactory(),
                fieldValue[1] || defaultFactory(),
                fieldValue[2] || defaultFactory()
            ];
        }
        return [fieldValue, defaultFactory(), defaultFactory()];
    }

    if (typeof fieldValue === 'object') {
        if ('slot0' in fieldValue || 'slot1' in fieldValue || 'slot2' in fieldValue) {
            return [
                fieldValue.slot0 || defaultFactory(),
                fieldValue.slot1 || defaultFactory(),
                fieldValue.slot2 || defaultFactory()
            ];
        }
        return [fieldValue, defaultFactory(), defaultFactory()];
    }

    if (typeof fieldValue === 'string') {
        const str = fieldValue.trim();
        if (str.startsWith('[') || str.startsWith('{')) {
            try {
                const parsed = JSON.parse(str);
                return parseSlotArray(parsed, defaultFactory);
            } catch (e) {}
        }

        let delimiter = null;
        if (str.includes('|||')) delimiter = '|||';
        else if (str.includes(';;;')) delimiter = ';;;';
        else if (str.includes('|')) delimiter = '|';

        if (delimiter) {
            const parts = str.split(delimiter);
            const res = [];
            for (let i = 0; i < 3; i++) {
                const p = (parts[i] || '').trim();
                if (!p || p === 'none' || p === 'null') {
                    res.push(defaultFactory());
                } else {
                    try {
                        res.push(JSON.parse(p));
                    } catch (e) {
                        res.push(p);
                    }
                }
            }
            return res;
        }

        return [str, defaultFactory(), defaultFactory()];
    }

    return [defaultFactory(), defaultFactory(), defaultFactory()];
}

function convert2DRowToSlot(row, slotIndex = 0) {
    if (!row) return null;
    const charName = String(row.character_name || '').trim();
    if (!charName || charName.toLowerCase().startsWith('none') || charName.toLowerCase().startsWith('__empty') || charName === 'null' || charName === 'undefined') return null;

    let baseStats = safeParseJson(row.base_stats, null);
    if (!baseStats || typeof baseStats !== 'object') {
        baseStats = {
            hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
            playerClass: null, title: null, homeStorage: Array(15).fill(null),
            tavernEntries: 5, dungeonEntries: 7
        };
    }

    let equips = safeParseJson(row.equips, null);
    if (!equips || typeof equips !== 'object' || Array.isArray(equips)) {
        equips = getStarterItems().starterEquips;
    }

    let inventory = safeParseJson(row.inventory, null);
    if (!Array.isArray(inventory)) {
        inventory = getStarterItems().starterInventory;
    }
    while (inventory.length < 30) inventory.push(null);

    // Hair style in 2D is integer 1 to 5
    let rawStyle = String(row.hair_style !== undefined ? row.hair_style : '1').trim();
    if (!['1', '2', '3', '4', '5'].includes(rawStyle)) rawStyle = '1';

    // 2D Supabase has NO gender column; safely default to 'female'
    const gender = String((row.gender && row.gender !== 'none') ? row.gender : (baseStats.gender || 'female')).trim();

    const lvl = Number(row.level) || (baseStats.level ? Number(baseStats.level) : 1);
    const gld = row.gold !== undefined ? Number(row.gold) : (baseStats.gold !== undefined ? Number(baseStats.gold) : 500);
    const xp = Number(row.exp) || 0;

    return {
        slotIndex: slotIndex,
        character_name: charName,
        name: charName,
        email: row.email || '',
        skin_color: String(row.skin_color || '#f5c6a5').trim(),
        skinColor: String(row.skin_color || '#f5c6a5').trim(),
        hair_color: String(row.hair_color || '#111111').trim(),
        hairColor: String(row.hair_color || '#111111').trim(),
        hair_style: rawStyle,
        hairStyle: rawStyle,
        gender: gender,
        level: lvl,
        gold: gld,
        exp: xp,
        equips: equips,
        inventory: inventory,
        base_stats: baseStats,
        baseStats: baseStats,
        playerClass: baseStats.playerClass || null,
        title: row.title || baseStats.title || null
    };
}

function parseAccountSlots(userRow) {
    if (!userRow) return [null, null, null];

    const rawNames = String(userRow.character_name !== undefined ? userRow.character_name : '');
    const nameParts = rawNames.includes('|') ? rawNames.split('|') : [rawNames];

    const rawSkins = String(userRow.skin_color !== undefined ? userRow.skin_color : '');
    const skinParts = rawSkins.includes('|') ? rawSkins.split('|') : [rawSkins];

    const rawHairs = String(userRow.hair_color !== undefined ? userRow.hair_color : '');
    const hairParts = rawHairs.includes('|') ? rawHairs.split('|') : [rawHairs];

    const rawStyles = String(userRow.hair_style !== undefined ? userRow.hair_style : '1');
    const styleParts = rawStyles.includes('|') ? rawStyles.split('|') : [rawStyles];

    const rawGenders = String(userRow.gender !== undefined ? userRow.gender : 'female');
    const genderParts = rawGenders.includes('|') ? rawGenders.split('|') : [rawGenders];

    const rawGolds = String(userRow.gold !== undefined ? userRow.gold : '500');
    const goldParts = rawGolds.includes('|') ? rawGolds.split('|') : [rawGolds];

    const rawLevels = String(userRow.level !== undefined ? userRow.level : '1');
    const levelParts = rawLevels.includes('|') ? rawLevels.split('|') : [rawLevels];

    const rawExps = String(userRow.exp !== undefined ? userRow.exp : '0');
    const expParts = rawExps.includes('|') ? rawExps.split('|') : [rawExps];

    const equipsSlots = parseSlotArray(userRow.equips, () => getStarterItems().starterEquips);
    const inventorySlots = parseSlotArray(userRow.inventory, () => getStarterItems().starterInventory);
    const statsSlots = parseSlotArray(userRow.base_stats, () => ({
        hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
        playerClass: null, title: null, homeStorage: Array(15).fill(null),
        tavernEntries: 5, dungeonEntries: 7
    }));

    const slots = [null, null, null];

    for (let i = 0; i < 3; i++) {
        const name = (nameParts[i] || '').trim();
        const skin = (skinParts[i] || '').trim();

        if (name && !name.toLowerCase().startsWith('none') && !name.toLowerCase().startsWith('__empty') && name !== 'null' && name !== 'undefined') {
            const slotStats = statsSlots[i] || { hp: 100, attack: 5, str: 10, int: 10, playerClass: null };
            const lvl = (slotStats && slotStats.level) ? Number(slotStats.level) : (Number(levelParts[i]) || Number(levelParts[0]) || 1);
            const gld = (slotStats && slotStats.gold !== undefined) ? Number(slotStats.gold) : (Number(goldParts[i]) || Number(goldParts[0]) || 500);
            const xp = (slotStats && slotStats.exp !== undefined) ? Number(slotStats.exp) : (Number(expParts[i]) || Number(expParts[0]) || 0);

            let styleStr = String(styleParts[i] || '1').trim();
            if (!['1', '2', '3', '4', '5'].includes(styleStr)) styleStr = '1';

            const slotTitle = (slotStats && slotStats.title) || (userRow && userRow.title) || null;

            slots[i] = {
                slotIndex: i,
                character_name: name,
                name: name,
                email: userRow.email || '',
                skin_color: skin || '#f5c6a5',
                skinColor: skin || '#f5c6a5',
                hair_color: (hairParts[i] || '#111111').trim(),
                hairColor: (hairParts[i] || '#111111').trim(),
                hair_style: styleStr,
                hairStyle: styleStr,
                gender: (genderParts[i] || 'female').trim(),
                level: lvl,
                gold: gld,
                exp: xp,
                equips: equipsSlots[i] || getStarterItems().starterEquips,
                inventory: inventorySlots[i] || getStarterItems().starterInventory,
                base_stats: slotStats,
                baseStats: slotStats,
                playerClass: (slotStats && slotStats.playerClass) || null,
                title: slotTitle
            };
        }
    }

    return slots;
}

function parseRowsToSlots(dbRows) {
    if (!dbRows) return [null, null, null];
    const rows = Array.isArray(dbRows) ? dbRows : [dbRows];
    if (rows.length === 0) return [null, null, null];

    // Case 1: Multiple rows for this email (2D Exonie multi-row schema)
    if (rows.length > 1) {
        return [
            convert2DRowToSlot(rows[0], 0),
            convert2DRowToSlot(rows[1], 1),
            rows[2] ? convert2DRowToSlot(rows[2], 2) : null
        ];
    }

    // Case 2: Exactly 1 row returned
    const singleRow = rows[0];
    const rawNames = String(singleRow.character_name || '');
    if (rawNames.includes('|')) {
        return parseAccountSlots(singleRow);
    }

    return [
        convert2DRowToSlot(singleRow, 0),
        null,
        null
    ];
}

function serializeSlotsToRow(slots, existingRow = {}) {
    const names = [];
    const skins = [];
    const hairs = [];
    const styles = [];
    const genders = [];
    const levels = [];
    const golds = [];
    const exps = [];
    const equipsArr = [];
    const invArr = [];
    const statsArr = [];

    for (let i = 0; i < 3; i++) {
        const c = slots[i];
        if (c && c.name && c.name !== 'none') {
            names.push(c.character_name || c.name);
            skins.push(c.skin_color || c.skinColor || '#f5c6a5');
            hairs.push(c.hair_color || c.hairColor || '#111111');
            const styleNum = String(c.hair_style || c.hairStyle || '1');
            styles.push(['1', '2', '3', '4', '5'].includes(styleNum) ? styleNum : '1');
            const gnd = (c.gender === 'male' || (c.base_stats && c.base_stats.gender === 'male')) ? 'male' : 'female';
            genders.push(gnd);
            const lvl = Number(c.level) || 1;
            const gld = c.gold !== undefined ? Number(c.gold) : 500;
            const xp = Number(c.exp) || 0;
            levels.push(lvl);
            golds.push(gld);
            exps.push(xp);
            equipsArr.push(c.equips || getStarterItems().starterEquips);
            invArr.push(c.inventory || getStarterItems().starterInventory);
            const slotStats = Object.assign({}, c.base_stats || c.baseStats || { hp: 100, str: 10, int: 10, playerClass: null }, {
                level: lvl,
                gold: gld,
                exp: xp,
                gender: gnd,
                hairStyle: ['1', '2', '3', '4', '5'].includes(styleNum) ? styleNum : '1',
                hairColor: c.hair_color || c.hairColor || '#111111',
                skinColor: c.skin_color || c.skinColor || '#f5c6a5',
                title: c.title || (c.base_stats && c.base_stats.title) || null
            });
            statsArr.push(slotStats);
        } else {
            names.push('none');
            skins.push('none');
            hairs.push('none');
            styles.push('none');
            genders.push('none');
            levels.push(1);
            golds.push(0);
            exps.push(0);
            equipsArr.push(null);
            invArr.push(null);
            statsArr.push(null);
        }
    }

    const firstValidStyle = styles.find(s => ['1', '2', '3', '4', '5'].includes(s)) || '1';

    // If all character slots are empty, ensure slot 0 has a unique none placeholder to avoid Supabase unique constraint conflicts
    if (names.every(n => !n || n.startsWith('none'))) {
        const uId = existingRow.email ? existingRow.email.split('@')[0] : (existingRow.id || 'usr');
        names[0] = `none_${uId}_1`;
    }

    return {
        character_name: names.join('|'),
        skin_color: skins.join('|'),
        hair_color: hairs.join('|'),
        hair_style: parseInt(firstValidStyle, 10) || 1,
        level: Number(levels[0]) || 1,
        gold: Number(golds[0]) || 500,
        exp: Number(exps[0]) || 0,
        equips: equipsArr,
        inventory: invArr,
        base_stats: statsArr,
        title: (slots[0]?.title || slots[0]?.base_stats?.title || null)
    };
}

// ==========================================
// 🛡️ PERSISTENT LOCAL DEV DATABASE
// Ensures accounts & 3-character slots persist across restarts even when Supabase is offline
// ==========================================
const DB_FILE = path.join(__dirname, 'local_dev_db.json');

function initDefaultDevAccounts() {
    const row = serializeSlotsToRow([null, null, null], {
        email: 'jken.ayag@gmail.com',
        password: 'password123'
    });
    row.email = 'jken.ayag@gmail.com';
    row.password = 'password123';
    row.character_name = 'none|none|none';

    return {
        users: {
            "jken.ayag@gmail.com": row
        }
    };
}

function loadLocalDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.users === 'object') {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not load local_dev_db.json, recreating defaults:', e.message);
    }
    const def = initDefaultDevAccounts();
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(def, null, 2), 'utf8');
    } catch (e) {}
    return def;
}

function saveLocalDb() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf8');
    } catch (e) {
        console.warn('⚠️ Could not save local_dev_db.json:', e.message);
    }
}

// Initialize memoryDb from persistent file
memoryDb = loadLocalDb();

// 🛡️ Helper: Robust account lookup across 2D character names, 2D emails, and 3D multi-slots
async function findAccountRows(identifier) {
    if (!identifier) return [];
    if (!supabase) {
        const key = String(identifier).toLowerCase();
        const mem = memoryDb.users[key] || Object.values(memoryDb.users).find(u =>
            (u.email && u.email.toLowerCase() === key) ||
            (u.character_name && u.character_name.toLowerCase().includes(key))
        );
        return mem ? [mem] : [];
    }

    const clean = String(identifier).trim();
    if (!clean) return [];

    try {
        // 1. If it contains '@', query by email first
        if (clean.includes('@')) {
            const { data: byEmail, error: errEmail } = await supabase
                .from('Exonians')
                .select('*')
                .ilike('email', clean);
            if (!errEmail && byEmail && byEmail.length > 0) return byEmail;
        } else {
            const { data: byAutoEmail } = await supabase
                .from('Exonians')
                .select('*')
                .ilike('email', `${clean}@exonie.com`);
            if (byAutoEmail && byAutoEmail.length > 0) return byAutoEmail;
        }

        // 2. Query by character_name exact match (case-insensitive)
        const { data: byName, error: errName } = await supabase
            .from('Exonians')
            .select('*')
            .ilike('character_name', clean);
        if (!errName && byName && byName.length > 0) {
            // If primary row has an email and is a single row, fetch siblings with the same email
            if (byName[0].email && byName.length === 1) {
                const { data: sibs } = await supabase.from('Exonians').select('*').eq('email', byName[0].email);
                if (sibs && sibs.length > 1) return sibs;
            }
            return byName;
        }

        // 3. Query by pipe-delimited character_name (contains input)
        if (!clean.includes('@')) {
            const { data: byLike, error: errLike } = await supabase
                .from('Exonians')
                .select('*')
                .ilike('character_name', `%${clean}%`);
            if (!errLike && byLike && byLike.length > 0) return byLike;
        }

        // 4. Fallback: check email even if clean string had no '@'
        const { data: byEmailFback } = await supabase
            .from('Exonians')
            .select('*')
            .ilike('email', clean);
        if (byEmailFback && byEmailFback.length > 0) return byEmailFback;

    } catch (e) {
        console.error(`[DB QUERY ERROR] findAccountRows for ${clean}:`, e.message);
    }

    return [];
}

// ==========================================
// ⚔️ GLOBAL PARTY & FRIENDS ENGINE (2D ALIGNMENT)
// ==========================================
const playerParty = {}; // Maps character_name -> partyId
const parties = {};     // Maps partyId -> { id, leaderId, members: Set<character_name> }
if (!global.playerFriends) global.playerFriends = {}; // Maps character_name -> Set<friendName>

function findSocketIdByPlayerName(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    for (const sid in onlinePlayers) {
        const p = onlinePlayers[sid];
        if (p && p.name && p.name.trim().toLowerCase() === clean) return sid;
    }
    return null;
}

function getPlayerByName(name) {
    if (!name) return null;
    const clean = String(name).trim().toLowerCase();
    for (const sid in onlinePlayers) {
        const p = onlinePlayers[sid];
        if (p && p.name && p.name.trim().toLowerCase() === clean) return p;
    }
    return null;
}

function emitPartyUpdate(partyId) {
    const party = parties[partyId];
    if (!party) return;
    const members = [];
    for (const pid of party.members) {
        const p = getPlayerByName(pid);
        if (p) {
            members.push({
                id: p.name,
                name: p.name,
                level: p.level || 1,
                playerClass: p.className || p.playerClass || (p.baseStats && p.baseStats.playerClass) || 'Novice',
                currentHp: p.hp !== undefined ? p.hp : (p.maxHp || 100),
                maxHp: p.maxHp || 100,
                isGhost: !!p.isGhost
            });
        } else {
            members.push({
                id: pid,
                name: pid,
                level: 1,
                playerClass: 'Novice',
                currentHp: 100,
                maxHp: 100,
                isGhost: false
            });
        }
    }

    const payload = {
        partyId: party.id,
        leaderId: party.leaderId,
        name: `${party.leaderId}'s Party`,
        members
    };

    for (const pid of party.members) {
        const sid = findSocketIdByPlayerName(pid);
        if (sid) io.to(sid).emit('partyUpdate', payload);
    }
}

function removeFromParty(playerId) {
    if (!playerId) return;
    const pid = playerParty[playerId];
    if (!pid) return;
    const party = parties[pid];
    if (!party) {
        delete playerParty[playerId];
        return;
    }

    party.members.delete(playerId);
    delete playerParty[playerId];

    const sid = findSocketIdByPlayerName(playerId);
    if (sid) io.to(sid).emit('partyKickedOrLeft');

    if (party.leaderId === playerId) {
        const next = party.members.values().next().value;
        party.leaderId = next || null;
    }

    if (!party.leaderId || party.members.size <= 1) {
        // Disband party if only 1 member remains
        for (const rem of party.members) {
            delete playerParty[rem];
            const remSid = findSocketIdByPlayerName(rem);
            if (remSid) io.to(remSid).emit('partyKickedOrLeft');
        }
        delete parties[pid];
        return;
    }

    emitPartyUpdate(pid);
}

async function sendFriendsUpdateTo(username) {
    if (!username) return;
    const sid = findSocketIdByPlayerName(username);
    if (!sid) return;

    const myFriends = global.playerFriends[username] ? Array.from(global.playerFriends[username]) : [];
    if (myFriends.length === 0) {
        return io.to(sid).emit('friendsListUpdate', []);
    }

    let dbFriends = [];
    if (supabase) {
        try {
            const { data } = await supabase
                .from('Exonians')
                .select('character_name, level, map_id, base_stats')
                .in('character_name', myFriends);
            if (data) dbFriends = data;
        } catch (e) {
            console.error('[Friends DB Fetch Error]:', e.message);
        }
    }

    const friendData = myFriends.map(f => {
        const onlineP = getPlayerByName(f);
        const isOnline = !!onlineP;
        let currentLevel = 1, currentMap = 'Town', currentClass = 'Novice';

        if (onlineP) {
            currentLevel = onlineP.level || 1;
            currentMap = onlineP.mapId || 'Town';
            currentClass = onlineP.className || onlineP.playerClass || (onlineP.baseStats && onlineP.baseStats.playerClass) || 'Novice';
        } else {
            const dbF = dbFriends.find(row => row.character_name && row.character_name.toLowerCase() === f.toLowerCase());
            if (dbF) {
                currentLevel = dbF.level || 1;
                currentMap = dbF.map_id || 'Town';
                currentClass = dbF.base_stats?.playerClass || 'Novice';
            }
        }
        return { id: f, online: isOnline, level: currentLevel, mapId: currentMap, pClass: currentClass };
    });

    io.to(sid).emit('friendsListUpdate', friendData);
}

// ==========================================
// SOCKET.IO REALTIME ENGINE
// ==========================================
io.on('connection', (socket) => {
    console.log(`[Socket] Connection established: ${socket.id}`);

    // Chat rate limiting tracking per socket
    socket._lastWorldChatTime = 0;
    socket._worldChatCount = 0;
    socket._worldChatWindowStart = 0;

    // 1. LOGIN BY EMAIL OR CHARACTER NAME & PASSWORD (100% 2D & 3D COMPATIBLE)
    socket.on('login', async (data) => {
        try {
            const cleanInput = (data && (data.email || data.username)) ? String(data.email || data.username).trim() : '';
            const password = (data && data.password) ? String(data.password) : '';

            if (!cleanInput || !password) {
                return socket.emit('authError', 'Please enter your Email or Character Name and Password.');
            }

            console.log(`[LOGIN ATTEMPT] Authenticating: ${cleanInput}`);

            let matchedRows = [];
            if (supabase) {
                let fetchError = null;

                // Step 1: If input contains '@', check email first
                if (cleanInput.includes('@')) {
                    const { data: byEmail, error: errEmail } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('email', cleanInput)
                        .eq('password', password);
                    if (errEmail) fetchError = errEmail;
                    if (byEmail && byEmail.length > 0) {
                        matchedRows = byEmail;
                    }
                } else {
                    const { data: byAutoEmail, error: errAutoEmail } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('email', `${cleanInput}@exonie.com`)
                        .eq('password', password);
                    if (errAutoEmail) fetchError = errAutoEmail;
                    if (byAutoEmail && byAutoEmail.length > 0) {
                        matchedRows = byAutoEmail;
                    }
                }

                // Step 2: Check exact character_name
                if (matchedRows.length === 0) {
                    const { data: byName, error: errName } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('character_name', cleanInput)
                        .eq('password', password);
                    if (errName) fetchError = errName;
                    if (byName && byName.length > 0) {
                        matchedRows = byName;
                    }
                }

                // Step 3: Check pipe-delimited character_name (multi-character slot)
                if (matchedRows.length === 0 && !cleanInput.includes('@')) {
                    const { data: byLike, error: errLike } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('character_name', `%${cleanInput}%`)
                        .eq('password', password);
                    if (errLike) fetchError = errLike;
                    if (byLike && byLike.length > 0) {
                        matchedRows = byLike;
                    }
                }

                // Step 4: Fallback check email
                if (matchedRows.length === 0 && !cleanInput.includes('@')) {
                    const { data: byEmailFback, error: errEmailFback } = await supabase
                        .from('Exonians')
                        .select('*')
                        .ilike('email', cleanInput)
                        .eq('password', password);
                    if (errEmailFback) fetchError = errEmailFback;
                    if (byEmailFback && byEmailFback.length > 0) {
                        matchedRows = byEmailFback;
                    }
                }

                if (matchedRows.length === 0 && fetchError) {
                    console.error(`[LOGIN DB ERROR] ${cleanInput}:`, fetchError.message);
                }

                // If single row matched and has an email, fetch sibling 2D characters under same email
                if (matchedRows.length === 1 && matchedRows[0].email) {
                    const { data: siblings } = await supabase
                        .from('Exonians')
                        .select('*')
                        .eq('email', matchedRows[0].email)
                        .eq('password', password);
                    if (siblings && siblings.length > 1) {
                        matchedRows = siblings;
                    }
                }
            } else {
                const lower = cleanInput.toLowerCase();
                let mem = memoryDb.users[lower] || Object.values(memoryDb.users).find(u =>
                    (u.email && u.email.toLowerCase() === lower) ||
                    (u.character_name && u.character_name.toLowerCase().includes(lower))
                );

                if (!mem) {
                    // Auto-provision user account in fallback mode with 3 empty character slots
                    const serialized = serializeSlotsToRow([null, null, null], {
                        email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@exonie.com`,
                        password: password
                    });
                    serialized.character_name = 'none|none|none';
                    mem = Object.assign({
                        email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@exonie.com`,
                        password: password
                    }, serialized);
                    memoryDb.users[lower] = mem;
                    saveLocalDb();
                    console.log(`[LOCAL DEV] Auto-created empty fallback account for: ${cleanInput}`);
                } else {
                    // Update password if changed locally so dev is never locked out
                    mem.password = password;
                    saveLocalDb();
                }
                matchedRows = [mem];
            }

            if (!matchedRows || matchedRows.length === 0) {
                return socket.emit('authError', 'Invalid Email/Character Name or Password.');
            }

            const primaryRow = matchedRows[0];
            const characterSlots = parseRowsToSlots(matchedRows);
            const userEmail = primaryRow.email || (cleanInput.includes('@') ? cleanInput : `${primaryRow.character_name || 'user'}@exonie.com`);
            const accountIdentifier = primaryRow.email || primaryRow.character_name || cleanInput;

            socket.email = userEmail;
            socket.accountEmail = userEmail;
            socket.accountIdentifier = accountIdentifier;
            socket.primaryCharName = primaryRow.character_name;

            const existingCount = characterSlots.filter(Boolean).length;
            console.log(`[LOGIN SUCCESS] ${accountIdentifier} authenticated with ${existingCount} characters.`);

            socket.emit('loginSuccess', {
                email: userEmail,
                username: primaryRow.character_name || userEmail,
                characters: characterSlots
            });

        } catch (e) {
            console.error('[LOGIN CRASH]', e);
            socket.emit('authError', 'Server error during login.');
        }
    });

    // 2. REGISTER BY EMAIL OR CHARACTER NAME & PASSWORD
    socket.on('register', async (data) => {
        try {
            const rawInput = (data && (data.email || data.username)) ? String(data.email || data.username).trim() : '';
            const password = (data && data.password) ? String(data.password) : '';
            const deviceId = (data && data.deviceId) || 'unknown_device';

            if (!rawInput || !password) {
                return socket.emit('authError', 'Please provide an Email or Username and Password.');
            }
            if (rawInput.length < 3) {
                return socket.emit('authError', 'Email or username must be at least 3 characters.');
            }
            if (password.length < 4) {
                return socket.emit('authError', 'Password must be at least 4 characters long.');
            }

            const clientIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;

            const basePart = rawInput.includes('@') ? rawInput.split('@')[0] : rawInput;
            const cleanBase = basePart.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16) || 'user';
            const accountEmail = rawInput.includes('@') ? rawInput : `${cleanBase}@exonie.com`;
            const uniquePlaceholder = `none_${cleanBase}_${Date.now() % 100000}|none|none`;

            if (supabase) {
                // Check if account already exists
                const existing = await findAccountRows(rawInput);
                if (existing && existing.length > 0) {
                    return socket.emit('authError', 'An account with this Email/Username already exists!');
                }

                const insertPayload = {
                    email: accountEmail,
                    character_name: uniquePlaceholder,
                    password: password,
                    email_verified: true,
                    ip_address: clientIp,
                    device_id: deviceId
                };

                const { error: insErr } = await supabase.from('Exonians').insert([insertPayload]);
                if (insErr) {
                    console.error('[REGISTER DB ERROR]', insErr.message);
                    return socket.emit('authError', `Database Error: ${insErr.message}`);
                }
            } else {
                const key = rawInput.toLowerCase();
                if (memoryDb.users[key] || memoryDb.users[accountEmail.toLowerCase()]) {
                    return socket.emit('authError', 'An account with this Email/Username already exists!');
                }
                const newRec = {
                    email: accountEmail,
                    password: password,
                    character_name: uniquePlaceholder
                };
                memoryDb.users[key] = newRec;
                memoryDb.users[accountEmail.toLowerCase()] = newRec;
                saveLocalDb();
            }

            console.log(`[REGISTER SUCCESS] Account created: ${rawInput}`);
            socket.emit('registerSuccess', rawInput);

        } catch (e) {
            console.error('[REGISTER CRASH]', e);
            socket.emit('authError', 'Server error during registration.');
        }
    });

    // 3. FETCH ACCOUNT CHARACTERS
    socket.on('getAccountCharacters', async (data) => {
        try {
            const identifier = (data && (data.email || data.username || data.character_name)) || socket.accountIdentifier || socket.email || socket.primaryCharName;
            if (!identifier) return socket.emit('accountCharacters', [null, null, null]);

            const dbRows = await findAccountRows(identifier);
            const slots = parseRowsToSlots(dbRows);
            socket.emit('accountCharacters', slots);
        } catch (e) {
            console.error('[GET CHARS ERROR]', e);
            socket.emit('accountCharacters', [null, null, null]);
        }
    });

    // 4. CREATE / CUSTOMIZE CHARACTER IN SPECIFIC SLOT (ISOLATED STATS & ITEMS)
    socket.on('createCharacter', async (data) => {
        try {
            const identifier = (data && (data.email || data.username || data.character_name)) || socket.accountIdentifier || socket.email || socket.primaryCharName;
            const slotIdx = Math.max(0, Math.min(2, Number(data.slotIndex) || 0));
            const charData = data.charData || {};
            const charName = (charData.name && charData.name.trim()) ? charData.name.trim().replace(/\|/g, '') : `Hero_${slotIdx + 1}`;

            console.log(`[CREATE CHAR] Account: ${identifier}, Char: ${charName}, Slot: ${slotIdx}`);

            const dbRows = await findAccountRows(identifier);
            if (!dbRows || dbRows.length === 0) {
                return socket.emit('authError', 'Account record not found.');
            }

            const slots = parseRowsToSlots(dbRows);

            const { starterEquips, starterInventory } = getStarterItems();
            const defaultBaseStats = {
                hp: 100, attack: 5, magic: 5, defense: 2, speed: 1, str: 10, int: 10,
                playerClass: charData.playerClass || charData.className || null,
                title: null, homeStorage: Array(15).fill(null),
                tavernEntries: 5, dungeonEntries: 7,
                gender: charData.gender || 'female',
                hairStyle: String(charData.hairStyle || '1'),
                hairColor: charData.hairColor || '#111111',
                skinColor: charData.skinColor || '#f5c6a5'
            };

            let safeStyle = String(charData.hairStyle || '1').trim();
            if (!['1', '2', '3', '4', '5'].includes(safeStyle)) safeStyle = '1';

            const userEmail = dbRows[0].email || (identifier && identifier.includes('@') ? identifier : '');

            const newChar = {
                slotIndex: slotIdx,
                character_name: charName,
                name: charName,
                email: userEmail,
                skin_color: charData.skinColor || '#f5c6a5',
                skinColor: charData.skinColor || '#f5c6a5',
                hair_color: charData.hairColor || '#111111',
                hairColor: charData.hairColor || '#111111',
                hair_style: safeStyle,
                hairStyle: safeStyle,
                gender: charData.gender || 'female',
                equips: starterEquips,
                inventory: starterInventory,
                base_stats: defaultBaseStats,
                baseStats: defaultBaseStats,
                gold: 500,
                level: 1,
                exp: 0,
                map_id: 'town'
            };

            slots[slotIdx] = newChar;

            // Handle multi-row vs single-row persistence
            if (supabase) {
                if (dbRows.length > 1) {
                    // 2D multi-row schema: update existing slot row if present, else insert new row
                    if (dbRows[slotIdx]) {
                        await supabase.from('Exonians').update({
                            character_name: charName,
                            skin_color: newChar.skinColor,
                            hair_color: newChar.hairColor,
                            hair_style: parseInt(safeStyle, 10) || 1,
                            base_stats: defaultBaseStats,
                            equips: starterEquips,
                            inventory: starterInventory,
                            gold: 500,
                            level: 1,
                            exp: 0
                        }).eq('character_name', dbRows[slotIdx].character_name);
                    } else {
                        await supabase.from('Exonians').insert([{
                            email: userEmail || `${charName}@exonie.com`,
                            password: dbRows[0].password,
                            character_name: charName,
                            skin_color: newChar.skinColor,
                            hair_color: newChar.hairColor,
                            hair_style: parseInt(safeStyle, 10) || 1,
                            base_stats: defaultBaseStats,
                            equips: starterEquips,
                            inventory: starterInventory,
                            gold: 500,
                            level: 1,
                            exp: 0,
                            email_verified: true
                        }]);
                    }
                } else {
                    // Single row: serialize using 3D multi-character pipe format
                    const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                    let q = supabase.from('Exonians').update(updatePayload);
                    if (dbRows[0].id) {
                        q = q.eq('id', dbRows[0].id);
                    } else if (dbRows[0].email) {
                        q = q.eq('email', dbRows[0].email);
                    } else {
                        q = q.eq('character_name', dbRows[0].character_name);
                    }
                    const { error: upErr } = await q;
                    if (upErr) {
                        console.error('[CREATE CHAR DB ERROR]', upErr.message);
                    }
                }
            } else {
                const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                const key = String(identifier).toLowerCase();
                if (memoryDb.users[key]) {
                    Object.assign(memoryDb.users[key], updatePayload);
                } else {
                    memoryDb.users[key] = Object.assign({}, dbRows[0], updatePayload);
                }
                saveLocalDb();
            }

            socket.emit('characterCreated', { slotIndex: slotIdx, character: newChar });
            socket.emit('accountCharacters', slots);

        } catch (e) {
            console.error('[CREATE CHAR CRASH]', e);
            socket.emit('authError', 'Server error creating character.');
        }
    });

    // 5. DELETE CHARACTER SLOT
    socket.on('deleteCharacter', async (data) => {
        try {
            const identifier = (data && (data.email || data.username || data.character_name)) || socket.accountIdentifier || socket.email || socket.primaryCharName;
            const slotIdx = Math.max(0, Math.min(2, Number(data.slotIndex) || 0));

            if (!identifier) return;

            const dbRows = await findAccountRows(identifier);
            if (!dbRows || dbRows.length === 0) return;

            const slots = parseRowsToSlots(dbRows);
            slots[slotIdx] = null;

            if (supabase) {
                if (dbRows.length > 1 && dbRows[slotIdx]) {
                    // In 2D multi-row, delete the specific row
                    await supabase.from('Exonians').delete().eq('character_name', dbRows[slotIdx].character_name);
                } else {
                    const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                    let q = supabase.from('Exonians').update(updatePayload);
                    if (dbRows[0].id) {
                        q = q.eq('id', dbRows[0].id);
                    } else if (dbRows[0].email) {
                        q = q.eq('email', dbRows[0].email);
                    } else {
                        q = q.eq('character_name', dbRows[0].character_name);
                    }
                    await q;
                }
            } else {
                const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                const key = String(identifier).toLowerCase();
                if (memoryDb.users[key]) {
                    Object.assign(memoryDb.users[key], updatePayload);
                } else {
                    memoryDb.users[key] = Object.assign({}, dbRows[0], updatePayload);
                }
                saveLocalDb();
            }

            console.log(`[DELETE CHAR] Cleared Slot ${slotIdx + 1} for ${identifier}`);
            socket.emit('accountCharacters', slots);

        } catch (e) {
            console.error('[DELETE CHAR ERROR]', e);
        }
    });

    // 6. SAVE CHARACTER PROGRESS (SEGREGATED PER SLOT)
    socket.on('saveCharacter', async (payload) => {
        try {
            if (!payload) return;
            const identifier = payload.email || payload.username || socket.accountIdentifier || socket.email || socket.primaryCharName;
            const slotIdx = Math.max(0, Math.min(2, Number(payload.slotIndex) || 0));
            const charState = payload.characterState || payload;

            if (!identifier) return;

            const dbRows = await findAccountRows(identifier);
            if (!dbRows || dbRows.length === 0) return;

            const slots = parseRowsToSlots(dbRows);
            if (!slots[slotIdx]) {
                slots[slotIdx] = {};
            }

            let safeStyle = String(charState.hairStyle || slots[slotIdx].hair_style || '1').trim();
            if (!['1', '2', '3', '4', '5'].includes(safeStyle)) safeStyle = '1';

            const updatedBaseStats = charState.baseStats || charState.base_stats || slots[slotIdx].base_stats || {};
            updatedBaseStats.gender = charState.gender || slots[slotIdx].gender || 'female';
            updatedBaseStats.hairStyle = safeStyle;
            updatedBaseStats.hairColor = charState.hairColor || slots[slotIdx].hair_color || '#111111';
            updatedBaseStats.skinColor = charState.skinColor || slots[slotIdx].skin_color || '#f5c6a5';

            Object.assign(slots[slotIdx], {
                name: charState.name || slots[slotIdx].name,
                character_name: charState.name || slots[slotIdx].name,
                level: charState.level || slots[slotIdx].level || 1,
                exp: charState.exp || slots[slotIdx].exp || 0,
                gold: charState.gold !== undefined ? charState.gold : slots[slotIdx].gold,
                equips: charState.equips || slots[slotIdx].equips,
                inventory: charState.inventory || slots[slotIdx].inventory,
                base_stats: updatedBaseStats,
                baseStats: updatedBaseStats,
                skin_color: charState.skinColor || slots[slotIdx].skin_color,
                hair_color: charState.hairColor || slots[slotIdx].hair_color,
                hair_style: safeStyle,
                title: charState.title || updatedBaseStats.title || slots[slotIdx].title || null
            });

            if (supabase) {
                if (dbRows.length > 1) {
                    const rowToUpdate = dbRows[slotIdx] || dbRows.find(r => r.character_name === slots[slotIdx].name);
                    if (rowToUpdate) {
                        await supabase.from('Exonians').update({
                            character_name: slots[slotIdx].name,
                            level: slots[slotIdx].level,
                            exp: slots[slotIdx].exp,
                            gold: slots[slotIdx].gold,
                            equips: slots[slotIdx].equips,
                            inventory: slots[slotIdx].inventory,
                            base_stats: slots[slotIdx].base_stats,
                            skin_color: slots[slotIdx].skin_color,
                            hair_color: slots[slotIdx].hair_color,
                            hair_style: parseInt(safeStyle, 10) || 1,
                            title: slots[slotIdx].title || slots[slotIdx].base_stats?.title || null
                        }).eq('character_name', rowToUpdate.character_name);
                    }
                } else {
                    const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                    let q = supabase.from('Exonians').update(updatePayload);
                    if (dbRows[0].id) {
                        q = q.eq('id', dbRows[0].id);
                    } else if (dbRows[0].email) {
                        q = q.eq('email', dbRows[0].email);
                    } else {
                        q = q.eq('character_name', dbRows[0].character_name);
                    }
                    await q;
                }
            } else {
                const updatePayload = serializeSlotsToRow(slots, dbRows[0]);
                const key = String(identifier).toLowerCase();
                if (memoryDb.users[key]) {
                    Object.assign(memoryDb.users[key], updatePayload);
                } else {
                    memoryDb.users[key] = Object.assign({}, dbRows[0], updatePayload);
                }
                saveLocalDb();
            }

        } catch (e) {
            console.error('[SAVE CHAR ERROR]', e.message);
        }
    });

    // 7. ENTER 3D WORLD
    socket.on('enterWorld', async (data) => {
        try {
            if (!data) return;
            const charName = (data.character_name || data.name) ? String(data.character_name || data.name).trim() : null;
            const explicitSlot = (data.slotIndex !== undefined && data.slotIndex !== null && !isNaN(data.slotIndex)) ? Number(data.slotIndex) : null;
            const identifier = data.email || data.username || socket.email || socket.accountIdentifier;
            let slotData = null;

            // PRIORITY 1: Exact match on character_name directly in Supabase (2D single-row schema & 3D pipe schema)
            if (supabase && charName && charName !== 'Hero') {
                try {
                    const { data: dbChar } = await supabase.from('Exonians').select('*').ilike('character_name', charName).maybeSingle();
                    if (dbChar) {
                        if (String(dbChar.character_name).includes('|')) {
                            const slots = parseAccountSlots(dbChar);
                            slotData = slots.find(s => s && s.name && s.name.toLowerCase() === charName.toLowerCase()) || (explicitSlot !== null ? slots[explicitSlot] : null);
                        } else {
                            slotData = convert2DRowToSlot(dbChar, explicitSlot !== null ? explicitSlot : 0);
                        }
                    }
                } catch (e) {
                    console.warn('[ENTER WORLD] Supabase direct lookup notice:', e.message);
                }
            }

            // PRIORITY 2: If not found yet and identifier provided, query account rows
            if (!slotData && identifier) {
                const dbRows = await findAccountRows(identifier);
                if (dbRows && dbRows.length > 0) {
                    const slots = parseRowsToSlots(dbRows);
                    if (charName && charName !== 'Hero') {
                        slotData = slots.find(s => s && s.name && s.name.toLowerCase() === charName.toLowerCase());
                    }
                    if (!slotData && explicitSlot !== null && explicitSlot >= 0 && explicitSlot < slots.length && slots[explicitSlot]) {
                        slotData = slots[explicitSlot];
                    }
                }
            }

            const pData = slotData || {};
            const finalName = charName || pData.name || pData.character_name || (data && data.name) || 'Exonian';
            const userEmail = socket.email || data.email || pData.email || '';
            const slotIdx = (explicitSlot !== null && explicitSlot >= 0) ? explicitSlot : (pData.slotIndex || 0);

            // Client data is authoritative for cosmetic choices (gender, hair, skin) configured in character selection
            const gender = data.gender || pData.gender || 'female';
            const hairStyle = String(data.hairStyle || pData.hairStyle || pData.hair_style || '1');
            const hairColor = data.hairColor || pData.hairColor || pData.hair_color || '#111111';
            const skinColor = data.skinColor || pData.skinColor || pData.skin_color || '#f5c6a5';
            const equips = (data.equips && Object.keys(data.equips).length > 0) ? data.equips : (pData.equips || {});
            const weapon = data.weapon || (equips && equips.weapon) || pData.weapon || null;
            const className = data.playerClass || pData.playerClass || (pData.base_stats && pData.base_stats.playerClass) || 'Novice';
            const level = Number(data.level) || Number(pData.level) || 1;
            const hp = Number(data.hp) || Number(pData.hp) || 500;
            const maxHp = Number(data.maxHp) || Number(pData.maxHp) || (pData.base_stats && pData.base_stats.hp) || 500;

            socket.accountIdentifier = userEmail || finalName;
            socket.characterName = finalName;

            onlinePlayers[socket.id] = {
                socketId: socket.id,
                email: userEmail,
                slotIndex: slotIdx,
                id: socket.id,
                name: finalName,
                character_name: finalName,
                gender: gender,
                hairStyle: hairStyle,
                hairColor: hairColor,
                skinColor: skinColor,
                className: className,
                playerClass: className,
                level: level,
                exp: pData.exp || 0,
                gold: pData.gold !== undefined ? pData.gold : 500,
                equips: equips,
                weapon: weapon,
                inventory: data.inventory || pData.inventory || [],
                baseStats: pData.base_stats || pData.baseStats || {},
                hp: hp,
                maxHp: maxHp,
                mp: 200,
                maxMp: 200,
                atk: 50,
                def: 10,
                x: (data.pos && data.pos.x) || data.x || 0,
                y: (data.pos && data.pos.y) || data.y || 0,
                z: (data.pos && data.pos.z) || data.z || 0,
                rotY: (data.pos && data.pos.rotY) || data.rotY || 0,
                anim: 'idle',
                title: pData.title || (pData.base_stats && pData.base_stats.title) || data.title || null
            };

            socket.emit('gameState', { self: onlinePlayers[socket.id], players: onlinePlayers });
            socket.broadcast.emit('playerJoined', onlinePlayers[socket.id]);

            // Sync Friends List on world enter
            sendFriendsUpdateTo(finalName);
            if (global.playerFriends[finalName]) {
                for (const fn of global.playerFriends[finalName]) {
                    sendFriendsUpdateTo(fn);
                }
            }

            // Sync Boss Cooldowns strictly from Supabase boss_timers
            let activeCooldowns = {};
            if (supabase) {
                try {
                    const { data: bTimers } = await supabase.from('boss_timers').select('*');
                    if (bTimers) {
                        const now = Date.now();
                        bTimers.forEach(t => {
                            // 🛡️ STRICT 2D EXONIE: Haunted House, Town, and Tavern NEVER have cooldowns! Purge if found.
                            if (t.boss_id === 'hauntedhouse' || t.boss_id === 'hh_wraith_king' || t.boss_id === 'town' || t.boss_id === 'trainingtavern') {
                                supabase.from('boss_timers').delete().eq('boss_id', t.boss_id).then(() => {});
                                return;
                            }
                            const deathTime = parseInt(t.last_death_time) || 0;
                            let rem = 0;
                            if (t.boss_id === 'neutralzone_boss') {
                                rem = (deathTime + (5 * 60 * 60 * 1000)) - now;
                            } else if (t.boss_id === 'battlefield_boss') {
                                rem = deathTime - now;
                            } else {
                                rem = (deathTime + (24 * 60 * 60 * 1000)) - now;
                            }
                            if (rem > 0) {
                                activeCooldowns[t.boss_id] = now + rem;
                            }
                        });
                    }
                } catch (e) {
                    activeCooldowns = Object.assign({}, bossTimersMemory);
                }
            } else {
                activeCooldowns = Object.assign({}, bossTimersMemory);
            }
            // Remove invalid keys from memory fallback as well
            delete activeCooldowns['hauntedhouse'];
            delete activeCooldowns['hh_wraith_king'];
            delete activeCooldowns['town'];
            delete activeCooldowns['trainingtavern'];
            socket.emit('bossCooldownSync', activeCooldowns);

            console.log(`[WORLD] ${finalName} (Email: ${userEmail}, Slot ${slotIdx + 1}) entered 3D world (Socket: ${socket.id})`);

        } catch (e) {
            console.error('[ENTER WORLD ERROR]', e);
        }
    });

    socket.on('requestBossCooldownSync', async () => {
        let activeCooldowns = {};
        if (supabase) {
            try {
                const { data: bTimers } = await supabase.from('boss_timers').select('*');
                if (bTimers) {
                    const now = Date.now();
                    bTimers.forEach(t => {
                        if (t.boss_id === 'hauntedhouse' || t.boss_id === 'hh_wraith_king' || t.boss_id === 'town' || t.boss_id === 'trainingtavern') {
                            supabase.from('boss_timers').delete().eq('boss_id', t.boss_id).then(() => {});
                            return;
                        }
                        const deathTime = parseInt(t.last_death_time) || 0;
                        let rem = 0;
                        if (t.boss_id === 'neutralzone_boss') {
                            rem = (deathTime + (5 * 60 * 60 * 1000)) - now;
                        } else if (t.boss_id === 'battlefield_boss') {
                            rem = deathTime - now;
                        } else {
                            rem = (deathTime + (24 * 60 * 60 * 1000)) - now;
                        }
                        if (rem > 0) {
                            activeCooldowns[t.boss_id] = now + rem;
                        }
                    });
                }
            } catch (e) {
                activeCooldowns = Object.assign({}, bossTimersMemory);
            }
        } else {
            activeCooldowns = Object.assign({}, bossTimersMemory);
        }
        delete activeCooldowns['hauntedhouse'];
        delete activeCooldowns['hh_wraith_king'];
        delete activeCooldowns['town'];
        delete activeCooldowns['trainingtavern'];
        socket.emit('bossCooldownSync', activeCooldowns);
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
        if (data.hp !== undefined) {
            const oldHp = onlinePlayers[socket.id].hp;
            onlinePlayers[socket.id].hp = data.hp;
            if (oldHp !== data.hp) {
                const pName = onlinePlayers[socket.id].name;
                if (pName && playerParty[pName]) {
                    emitPartyUpdate(playerParty[pName]);
                }
            }
        }
        if (data.maxHp !== undefined) onlinePlayers[socket.id].maxHp = data.maxHp;
        if (data.weapon !== undefined) onlinePlayers[socket.id].weapon = data.weapon;
        if (data.equips !== undefined) onlinePlayers[socket.id].equips = data.equips;
        socket.broadcast.emit('playerMoved', onlinePlayers[socket.id]);
    });

    socket.on('playerEquipUpdate', (data) => {
        if (!onlinePlayers[socket.id] || !data) return;
        if (data.equips) onlinePlayers[socket.id].equips = data.equips;
        if (data.weapon !== undefined) onlinePlayers[socket.id].weapon = data.weapon;
        socket.broadcast.emit('playerEquipsChanged', {
            socketId: socket.id,
            name: onlinePlayers[socket.id].name,
            equips: onlinePlayers[socket.id].equips,
            weapon: onlinePlayers[socket.id].weapon
        });
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
        if (!data) return;
        const sender = onlinePlayers[socket.id];
        const author = (sender && sender.name) || socket.characterName || (data && data.name) || (data && data.id) || 'Exonian';
        socket.broadcast.emit('chatMessage', {
            id: author,
            name: author,
            socketId: socket.id,
            text: data.text
        });
    });

    // 2D Exonie World Chat with Anti-Spam Limitation & Zero Double-Send
    socket.on('worldChatMessage', (data) => {
        if (!data || !data.text) return;
        const now = Date.now();

        // 3-second cooldown
        if (socket._lastWorldChatTime && (now - socket._lastWorldChatTime) < 3000) {
            return socket.emit('chatMessage', { id: 'System', text: '⚠️ World Chat has a 3-second cooldown between messages.' });
        }
        socket._lastWorldChatTime = now;

        // 10 messages per minute quota
        if (!socket._worldChatWindowStart || (now - socket._worldChatWindowStart) > 60000) {
            socket._worldChatWindowStart = now;
            socket._worldChatCount = 0;
        }
        socket._worldChatCount = (socket._worldChatCount || 0) + 1;
        if (socket._worldChatCount > 10) {
            return socket.emit('chatMessage', { id: 'System', text: '⚠️ World Chat limit reached (10 msgs/min). Please wait.' });
        }

        const safeText = String(data.text).slice(0, 120);
        const sender = onlinePlayers[socket.id];
        const name = (sender && sender.name) || socket.characterName || (data && data.name) || (data && data.id) || 'Exonian';

        // Broadcast to all other sockets without double-sending to sender
        socket.broadcast.emit('worldChatMessage', { id: name, name: name, socketId: socket.id, text: safeText });
    });

    // ==========================================
    // 📢 WORLD ANNOUNCEMENTS & GLOBAL SYNC (No Self-Echo!)
    // ==========================================
    socket.on('broadcastWorldAnnouncement', (data) => {
        if (data && data.html) {
            // Use broadcast so the triggering client (who already rendered it locally) does NOT get a duplicate echo!
            socket.broadcast.emit('worldAnnouncement', data);
            socket.broadcast.emit('worldChatMessage', { id: 'ANNOUNCEMENT', text: data.html.replace(/<[^>]+>/g, '') });
        }
    });

    // ==========================================
    // ⚔️ FLOOR BOSS RESPAWN & SUPABASE COOLDOWNS
    // ==========================================
    socket.on('floorBossKilled', async (data) => {
        if (!data || !data.floorId) return;
        const floorId = String(data.floorId).toLowerCase();

        // 🛡️ STRICT 2D EXONIE RULE: Instanced / Private maps NEVER set 24h floor cooldown or world announcements
        const noAnnounceMaps = ['town', 'neutralzone', 'battlefield', 'hauntedhouse', 'trainingtavern'];
        if (noAnnounceMaps.includes(floorId) || floorId.startsWith('dungeon')) return;

        const now = Date.now();
        const cdDuration = 24 * 60 * 60 * 1000; // 24 Hours matching 2D Exonie
        bossTimersMemory[floorId] = now + cdDuration;
        io.emit('bossCooldownActive', { floorId: floorId, remaining: cdDuration });

        if (supabase) {
            try {
                const { data: existing } = await supabase.from('boss_timers').select('boss_id').eq('boss_id', floorId).maybeSingle();
                if (existing) {
                    await supabase.from('boss_timers').update({ last_death_time: now }).eq('boss_id', floorId);
                } else {
                    await supabase.from('boss_timers').insert([{ boss_id: floorId, last_death_time: now }]);
                }
            } catch (e) {
                console.error('[Supabase Boss Timer Save Error]:', e.message);
            }
        }

        // ==========================================
        // 🏆 TITLE ENGINE: FLOOR CONQUEROR (Matching 2D Exonie)
        // Awards & Upgrades <FLOOR CONQUEROR/DOMINATOR/MASTER N> for killer and party!
        // ==========================================
        const match = floorId.match(/floor(\d+)/i);
        const killedFloorNum = match ? parseInt(match[1], 10) : null;
        if (killedFloorNum && killedFloorNum >= 1) {
            const killer = onlinePlayers[socket.id];
            if (killer) {
                const partyId = playerParty[socket.id];
                const recipientSids = (partyId && parties[partyId]) ? parties[partyId].members : [socket.id];

                for (const targetSid of recipientSids) {
                    const targetPlayer = onlinePlayers[targetSid];
                    if (!targetPlayer) continue;

                    let currentHighestFloor = 0;
                    let hasCustomTitle = false;
                    const existingTitle = targetPlayer.title ? String(targetPlayer.title).toUpperCase() : "";

                    if (existingTitle && (existingTitle.startsWith('FLOOR CONQUEROR') || existingTitle.startsWith('FLOOR DOMINATOR') || existingTitle.startsWith('FLOOR MASTER'))) {
                        const flMatch = existingTitle.match(/(?:FLOOR CONQUEROR|FLOOR DOMINATOR|FLOOR MASTER)\s+(\d+)/);
                        currentHighestFloor = flMatch ? parseInt(flMatch[1], 10) : 0;
                    } else if (existingTitle && existingTitle.length > 0) {
                        hasCustomTitle = true; // Special custom titles (e.g. GM) are preserved
                    }

                    if (!hasCustomTitle && killedFloorNum > currentHighestFloor) {
                        const d2Best = targetPlayer.baseStats?.d2HighestDifficulty || 'Normal';
                        const titlePrefix = d2Best === 'Extreme' ? 'FLOOR MASTER' : (d2Best === 'Hard' ? 'FLOOR DOMINATOR' : 'FLOOR CONQUEROR');
                        const newTitle = `${titlePrefix} ${killedFloorNum}`;
                        targetPlayer.title = newTitle;
                        if (!targetPlayer.baseStats) targetPlayer.baseStats = {};
                        targetPlayer.baseStats.title = newTitle;

                        io.to(targetSid).emit('titleUnlocked', { title: newTitle, floorNum: killedFloorNum });
                        io.emit('playerTitleUpdated', { id: targetSid, name: targetPlayer.name, title: newTitle });

                        const tierColor = titlePrefix === 'FLOOR MASTER' ? '#ff4444' : (titlePrefix === 'FLOOR DOMINATOR' ? '#e040fb' : '#ffd700');
                        const tierGlow = titlePrefix === 'FLOOR MASTER' ? 'rgba(255, 68, 68, 0.7)' : (titlePrefix === 'FLOOR DOMINATOR' ? 'rgba(224, 64, 251, 0.7)' : 'rgba(255, 215, 0, 0.7)');
                        io.emit('systemMessage', `<span style="color:${tierColor}; font-weight:bold; text-shadow: 0 0 8px ${tierGlow};">🏆 [WORLD] ${targetPlayer.name} has conquered Floor ${killedFloorNum} and earned the title &lt;${newTitle}&gt;!</span>`);

                        // Hard-save title to Supabase Exonians
                        if (supabase && targetPlayer.name) {
                            supabase.from('Exonians').update({ title: newTitle }).eq('character_name', targetPlayer.name).then(() => {}).catch(err => console.warn('[Title Supabase Save Error]:', err.message));
                        }
                    }
                }
            }
        }
    });

    socket.on('neutralBossKilled', async (data) => {
        const now = Date.now();
        bossTimersMemory['neutralzone_boss'] = now + (5 * 60 * 60 * 1000);
        io.emit('bossCooldownActive', { floorId: 'neutralzone_boss', remaining: 5 * 60 * 60 * 1000 });

        clearTimeout(global.neutralBossDespawnTimer);
        clearTimeout(global.neutralBossSpawnTimer);
        global.neutralBossSpawnTimer = setTimeout(spawnNeutralBoss, 5 * 60 * 60 * 1000);

        if (supabase) {
            try {
                await supabase.from('boss_timers').upsert(
                    { boss_id: 'neutralzone_boss', last_death_time: now },
                    { onConflict: 'boss_id' }
                );
            } catch (e) {
                console.error('[Neutral Boss Save Error]:', e.message);
            }
        }
    });

    socket.on('battlefieldBossKilled', async (data) => {
        io.emit('worldAnnouncement', {
            html: `🏰 <strong style="color:#ff1744;">[BATTLEFIELD RAID]</strong> Castle defense successful! The colossal raid boss has been vanquished by <strong>${data?.killerName || 'Heroes'}</strong>!`,
            color: '#ff1744'
        });
        clearTimeout(global.bfBossDespawnTimer);
        clearTimeout(global.bfBossSpawnTimer);
        scheduleBattlefieldBoss();
    });

    // ==========================================
    // 🛡️ MULTIPLAYER SKILL EFFECTS & SHIELD BROADCASTS
    // ==========================================
    socket.on('applyGammaShield', (data) => {
        if (!data) return;
        socket.broadcast.emit('applyGammaShield', data);
    });

    socket.on('breakGammaShield', (data) => {
        if (!data) return;
        socket.broadcast.emit('breakGammaShield', data);
    });

    socket.on('remoteSkillEffect', (data) => {
        if (!data) return;
        socket.broadcast.emit('remoteSkillEffect', data);
    });

    socket.on('partyHeal', (data) => {
        if (!data) return;
        socket.broadcast.emit('partyHeal', data);
    });

    socket.on('partyRevive', (data) => {
        if (!data) return;
        socket.broadcast.emit('partyRevive', data);
    });

    // ==========================================
    // 🔍 INSPECT PLAYER SYSTEM (2D Exonie port)
    // ==========================================
    socket.on('inspectRequest', async (data) => {
        if (!data || (!data.targetId && !data.targetName)) return;
        const targetQuery = String(data.targetId || data.targetName || '').trim().toLowerCase();

        // 1. Search online players first
        let target = null;
        for (const sid in onlinePlayers) {
            const p = onlinePlayers[sid];
            if (p && (sid.toLowerCase() === targetQuery || 
                     (p.socketId && p.socketId.toLowerCase() === targetQuery) ||
                     (p.name && p.name.toLowerCase() === targetQuery) || 
                     (p.character_name && p.character_name.toLowerCase() === targetQuery) || 
                     (p.id && String(p.id).toLowerCase() === targetQuery))) {
                target = p;
                break;
            }
        }

        if (target) {
            return socket.emit('inspectData', {
                id: target.socketId || target.id || target.name,
                socketId: target.socketId || target.id,
                name: target.name || target.character_name || 'Exonian',
                level: target.level || 1,
                playerClass: target.className || target.playerClass || target.baseStats?.playerClass || 'Novice',
                currentHp: target.hp || target.currentHp || 100,
                maxHp: target.maxHp || 100,
                weapon: target.weapon || (target.equips && target.equips.weapon) || null,
                equips: target.equips || { weapon: null, armor: null, leggings: null, necklace: null, ring: null, earrings: null },
                title: target.title || target.baseStats?.title || null
            });
        }

        // 2. Search offline accounts in database
        try {
            const dbRows = await findAccountRows(targetQuery);
            if (dbRows && dbRows.length > 0) {
                const slots = parseRowsToSlots(dbRows);
                // Look specifically for the character slot matching targetQuery
                const matchedSlot = slots.find(s => s && s.name && s.name.toLowerCase() === targetQuery) || slots.find(s => s !== null);
                if (matchedSlot) {
                    return socket.emit('inspectData', {
                        id: matchedSlot.name,
                        name: matchedSlot.name,
                        level: matchedSlot.level || 1,
                        playerClass: (matchedSlot.base_stats && matchedSlot.base_stats.playerClass) || matchedSlot.playerClass || 'Novice',
                        currentHp: matchedSlot.hp || 100,
                        maxHp: (matchedSlot.base_stats && matchedSlot.base_stats.hp) || 100,
                        weapon: matchedSlot.weapon || (matchedSlot.equips && matchedSlot.equips.weapon) || null,
                        equips: matchedSlot.equips || { weapon: null, armor: null, leggings: null, necklace: null, ring: null, earrings: null },
                        title: matchedSlot.title || matchedSlot.base_stats?.title || null
                    });
                }
            }
        } catch (err) {
            console.error('[Inspect Error]:', err.message);
        }
    });

    // ==========================================
    // 🏆 TAVERN SPEEDRUN LEADERBOARD (SUPABASE ALIGNED)
    // ==========================================
    socket.on('getTavernLeaderboard', async () => {
        if (!supabase) return socket.emit('updateLeaderboardUI', []);
        try {
            const { data, error } = await supabase.from('Tavern_Leaderboard').select('*').limit(1000);
            if (error) {
                console.error('[Tavern LB] Query error:', error.message);
                return socket.emit('updateLeaderboardUI', []);
            }
            const w = { 'floor_boss': 3, 'mini_boss': 2, 'common_mobs': 1 };
            let sorted = (data || []).sort((a, b) => {
                let aW = w[a.mob_type] || 0; let bW = w[b.mob_type] || 0;
                if (aW !== bW) return bW - aW;
                if (Number(a.mob_level || 0) !== Number(b.mob_level || 0)) {
                    return Number(b.mob_level || 0) - Number(a.mob_level || 0);
                }
                return Number(a.time_taken || 0) - Number(b.time_taken || 0);
            });
            socket.emit('updateLeaderboardUI', sorted.slice(0, 50));
        } catch (err) {
            console.error('[Tavern LB] Server error:', err.message);
            socket.emit('updateLeaderboardUI', []);
        }
    });

    // ==========================================
    // 🤝 SOCIAL INTERACTIONS (Party, Raid, Friend)
    // ==========================================
    socket.on('getFriendsList', async () => {
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (myName) sendFriendsUpdateTo(myName);
    });

    socket.on('addFriend', async (data) => {
        if (!data) return;
        const targetName = String(data.targetName || data.targetId || '').trim();
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (!myName || !targetName || myName.toLowerCase() === targetName.toLowerCase()) return;

        if (!global.playerFriends[myName]) global.playerFriends[myName] = new Set();
        global.playerFriends[myName].add(targetName);

        // Mutual friendship registration
        if (!global.playerFriends[targetName]) global.playerFriends[targetName] = new Set();
        global.playerFriends[targetName].add(myName);

        sendFriendsUpdateTo(myName);
        sendFriendsUpdateTo(targetName);

        const targetSid = findSocketIdByPlayerName(targetName);
        if (targetSid) {
            io.to(targetSid).emit('friendRequest', { from: myName, fromId: socket.id });
        }
    });

    socket.on('removeFriend', async (data) => {
        if (!data) return;
        const targetName = String(data.targetName || data.targetId || '').trim();
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (!myName || !targetName) return;

        if (global.playerFriends[myName]) global.playerFriends[myName].delete(targetName);
        sendFriendsUpdateTo(myName);
    });

    socket.on('partyInvite', (data) => {
        if (!data) return;
        const targetName = String(data.targetName || data.targetId || '').trim();
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (!myName || !targetName || myName.toLowerCase() === targetName.toLowerCase()) return;

        const targetSid = findSocketIdByPlayerName(targetName);
        if (!targetSid) {
            return socket.emit('chatMessage', { id: 'System', text: `Player ${targetName} is not online.` });
        }

        io.to(targetSid).emit('partyInviteReceived', { fromId: myName, from: myName });
        io.to(targetSid).emit('partyInvite', { fromId: myName, from: myName });
        socket.emit('chatMessage', { id: 'System', text: `⚔️ Party invite sent to ${targetName}.` });
    });

    socket.on('partyInviteResponse', ({ fromId, accept }) => {
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (!myName || !fromId) return;

        const fromSid = findSocketIdByPlayerName(fromId);
        if (!fromSid) return;

        if (!accept) {
            io.to(fromSid).emit('partyError', `${myName} declined your party invite.`);
            return;
        }

        let pid = playerParty[fromId];
        if (pid && parties[pid] && parties[pid].members.size >= 4) {
            socket.emit('partyError', 'That party is already full (Max 4 players).');
            io.to(fromSid).emit('partyError', `${myName} tried to join, but your party is full!`);
            return;
        }

        // Leave existing party if any
        if (playerParty[myName]) removeFromParty(myName);

        if (!pid || !parties[pid]) {
            pid = `party_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            parties[pid] = { id: pid, leaderId: fromId, members: new Set([fromId, myName]) };
            playerParty[fromId] = pid;
            playerParty[myName] = pid;
        } else {
            parties[pid].members.add(myName);
            playerParty[myName] = pid;
        }

        emitPartyUpdate(pid);
    });

    socket.on('leaveParty', () => {
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (myName) removeFromParty(myName);
    });

    socket.on('raidInvite', (data) => {
        if (!data || (!data.targetId && !data.targetName)) return;
        const targetQuery = String(data.targetId || data.targetName || '').trim().toLowerCase();
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : (socket.characterName || 'A player');
        for (const sid in onlinePlayers) {
            const p = onlinePlayers[sid];
            if (p && p.name && p.name.toLowerCase() === targetQuery && sid !== socket.id) {
                io.to(sid).emit('raidInvite', { from: myName, fromId: socket.id });
                socket.emit('chatMessage', { id: 'System', text: `🏰 Raid invite sent to ${p.name}.` });
                return;
            }
        }
        socket.emit('chatMessage', { id: 'System', text: `Player ${data.targetId || data.targetName} is not online.` });
    });

    // ==========================================
    // 🏛️ AUCTION HOUSE (AUTHENTIC 2D EXONIE ENGINE)
    // ==========================================
    socket.on('ah_search', async (query) => {
        try {
            if (supabase) {
                let q = supabase.from('Auction_House').select('*').order('created_at', { ascending: false }).limit(50);
                if (query && String(query).trim() !== '') {
                    q = q.ilike('item_name', `%${String(query).trim()}%`);
                }
                const { data, error } = await q;
                if (!error && data) {
                    return socket.emit('ah_searchResults', data);
                }
            }

            // In-memory fallback
            let results = Object.values(memoryAuctions);
            if (query && String(query).trim() !== '') {
                const qLow = String(query).trim().toLowerCase();
                results = results.filter(a => (a.item_name || '').toLowerCase().includes(qLow));
            }
            socket.emit('ah_searchResults', results);
        } catch (e) {
            console.error('AH Search Error:', e);
            socket.emit('ah_searchResults', []);
        }
    });

    socket.on('ah_getMyAuctions', async () => {
        const p = onlinePlayers[socket.id];
        if (!p) return;
        try {
            if (supabase) {
                const { data, error } = await supabase.from('Auction_House').select('*').eq('seller_name', p.name).order('created_at', { ascending: false });
                if (!error && data) {
                    return socket.emit('ah_myAuctions', { count: data.length, auctions: data });
                }
            }
            const myAucs = Object.values(memoryAuctions).filter(a => a.seller_name === p.name);
            socket.emit('ah_myAuctions', { count: myAucs.length, auctions: myAucs });
        } catch (e) {
            console.error('AH Get My Error:', e);
        }
    });

    socket.on('ah_list', async (data) => {
        const p = onlinePlayers[socket.id];
        if (!p || typeof data?.invIndex !== 'number' || !data?.price || data.price < 1) return;

        try {
            // Check active listing count (Max 5 items, matching 2D Exonie)
            let currentCount = 0;
            if (supabase) {
                const { count } = await supabase.from('Auction_House').select('*', { count: 'exact', head: true }).eq('seller_name', p.name);
                currentCount = count || 0;
            } else {
                currentCount = Object.values(memoryAuctions).filter(a => a.seller_name === p.name).length;
            }

            if (currentCount >= 5) {
                return socket.emit('chatMessage', { id: 'System', text: '⚠️ You can only have 5 items listed on the Auction House at once.' });
            }

            const inv = Array.isArray(p.inventory) ? p.inventory : [];
            let originalItem = inv[data.invIndex];
            if (!originalItem) return socket.emit('chatMessage', { id: 'System', text: 'Item not found in your bag.' });

            let auctionItem = JSON.parse(JSON.stringify(originalItem));
            auctionItem.quantity = 1;

            if (originalItem.quantity && originalItem.quantity > 1) {
                originalItem.quantity -= 1;
            } else {
                inv[data.invIndex] = null;
            }
            p.inventory = inv;

            const aucRecord = {
                id: `auc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                seller_name: p.name,
                item_name: auctionItem.name,
                item_data: auctionItem,
                price: Math.floor(data.price),
                created_at: new Date().toISOString()
            };

            if (supabase) {
                try {
                    await supabase.from('Auction_House').insert([{
                        seller_name: aucRecord.seller_name,
                        item_name: aucRecord.item_name,
                        item_data: aucRecord.item_data,
                        price: aucRecord.price
                    }]);
                } catch (e) {
                    memoryAuctions[aucRecord.id] = aucRecord;
                }
            } else {
                memoryAuctions[aucRecord.id] = aucRecord;
            }

            socket.emit('syncInventory', p.inventory);
            socket.emit('ah_listSuccess');
        } catch (e) {
            console.error('AH List Error:', e);
        }
    });

    socket.on('ah_cancel', async (data) => {
        const p = onlinePlayers[socket.id];
        if (!p || !data?.auctionId) return;

        try {
            let auc = null;
            if (supabase) {
                const { data: dbAuc } = await supabase.from('Auction_House').select('*').eq('id', data.auctionId).maybeSingle();
                auc = dbAuc;
                if (auc) await supabase.from('Auction_House').delete().eq('id', data.auctionId);
            }
            if (!auc && memoryAuctions[data.auctionId]) {
                auc = memoryAuctions[data.auctionId];
                delete memoryAuctions[data.auctionId];
            }
            if (!auc) return;

            // Return item to inventory
            const inv = Array.isArray(p.inventory) ? p.inventory : Array(30).fill(null);
            const emptySlot = inv.findIndex(i => i === null);
            if (emptySlot !== -1) {
                inv[emptySlot] = auc.item_data;
                p.inventory = inv;
                socket.emit('syncInventory', p.inventory);
            }

            if (supabase) {
                const { data: refreshData } = await supabase.from('Auction_House').select('*').eq('seller_name', p.name).order('created_at', { ascending: false });
                socket.emit('ah_myAuctions', { count: (refreshData || []).length, auctions: refreshData || [] });
            } else {
                const myAucs = Object.values(memoryAuctions).filter(a => a.seller_name === p.name);
                socket.emit('ah_myAuctions', { count: myAucs.length, auctions: myAucs });
            }
        } catch (e) {
            console.error('AH Cancel Error:', e);
        }
    });

    socket.on('ah_buy', async (data) => {
        const p = onlinePlayers[socket.id];
        if (!p || !data?.auctionId) return;

        try {
            let auc = null;
            if (supabase) {
                const { data: dbAuc } = await supabase.from('Auction_House').select('*').eq('id', data.auctionId).maybeSingle();
                auc = dbAuc;
                if (auc) {
                    const { error: delErr } = await supabase.from('Auction_House').delete().eq('id', auc.id);
                    if (delErr) auc = null;
                }
            }
            if (!auc && memoryAuctions[data.auctionId]) {
                auc = memoryAuctions[data.auctionId];
                delete memoryAuctions[data.auctionId];
            }
            if (!auc) return socket.emit('chatMessage', { id: 'System', text: 'This item has already been sold or cancelled.' });

            if ((p.gold || 0) < auc.price) return socket.emit('chatMessage', { id: 'System', text: 'Not enough Gold to purchase.' });

            const inv = Array.isArray(p.inventory) ? p.inventory : Array(30).fill(null);
            const emptySlot = inv.findIndex(i => i === null);
            if (emptySlot === -1) return socket.emit('chatMessage', { id: 'System', text: 'Your bag is full!' });

            p.gold -= auc.price;
            inv[emptySlot] = auc.item_data;
            p.inventory = inv;

            socket.emit('syncInventory', p.inventory);
            socket.emit('purchaseSuccess', { newGold: p.gold, inventory: p.inventory });
            socket.emit('chatMessage', { id: 'System', text: `Successfully purchased ${auc.item_name} for ${auc.price.toLocaleString()} Gold!` });

            // Reward the seller
            for (const sid in onlinePlayers) {
                const sp = onlinePlayers[sid];
                if (sp.name === auc.seller_name) {
                    sp.gold = (sp.gold || 0) + auc.price;
                    io.to(sid).emit('purchaseSuccess', { newGold: sp.gold, inventory: sp.inventory });
                    io.to(sid).emit('chatMessage', { id: 'System', text: `Auction Sold: ${auc.item_name} for ${auc.price.toLocaleString()} Gold!` });
                    break;
                }
            }

            // Refresh browse listings
            let freshList = [];
            if (supabase) {
                const { data: fresh } = await supabase.from('Auction_House').select('*').order('created_at', { ascending: false }).limit(50);
                freshList = fresh || [];
            } else {
                freshList = Object.values(memoryAuctions);
            }
            io.emit('ah_searchResults', freshList);
        } catch (e) {
            console.error('AH Buy Error:', e);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Player disconnected: ${socket.id}`);
        const me = onlinePlayers[socket.id];
        const myName = me ? me.name : socket.characterName;
        if (myName) {
            removeFromParty(myName);
        }
        delete onlinePlayers[socket.id];
        io.emit('playerLeft', socket.id);
    });
});

// ==========================================
// ⚔️ NEUTRAL ZONE & BATTLEFIELD ENGINE
// ==========================================
global.neutralBossDespawnTimer = null;
global.neutralBossSpawnTimer = null;
const NEUTRAL_SPAWN_CD = 5 * 60 * 60 * 1000; // 5 hours
const NEUTRAL_DESPAWN_TIME = 12 * 60 * 60 * 1000; // 12 hours

async function checkNeutralBoss() {
    if (!supabase) return;
    try {
        const { data: timer } = await supabase.from('boss_timers').select('last_death_time').eq('boss_id', 'neutralzone_boss').maybeSingle();
        let remaining = 0;
        if (timer && timer.last_death_time) {
            remaining = (parseInt(timer.last_death_time) + NEUTRAL_SPAWN_CD) - Date.now();
        }
        if (remaining > 0) {
            bossTimersMemory['neutralzone_boss'] = Date.now() + remaining;
            clearTimeout(global.neutralBossSpawnTimer);
            global.neutralBossSpawnTimer = setTimeout(spawnNeutralBoss, remaining);
        } else {
            spawnNeutralBoss();
        }
    } catch (err) {
        console.error('[Neutral Boss Init Error]:', err.message);
    }
}

function spawnNeutralBoss() {
    delete bossTimersMemory['neutralzone_boss'];
    if (supabase) {
        supabase.from('boss_timers').delete().eq('boss_id', 'neutralzone_boss').then(() => {});
    }
    io.emit('bossCooldownActive', { floorId: 'neutralzone_boss', remaining: 0 });
    io.emit('worldAnnouncement', {
        html: `🌲 <strong style="color:#4ade80;">[NEUTRAL ZONE]</strong> A powerful World Boss has appeared in the Neutral Zone Wilds!`,
        color: '#4ade80'
    });

    clearTimeout(global.neutralBossDespawnTimer);
    global.neutralBossDespawnTimer = setTimeout(async () => {
        io.emit('worldAnnouncement', {
            html: `🌲 <strong style="color:#888888;">[NEUTRAL ZONE]</strong> The Neutral Zone World Boss has despawned after 12 hours.`,
            color: '#aaaaaa'
        });
        const now = Date.now();
        bossTimersMemory['neutralzone_boss'] = now + NEUTRAL_SPAWN_CD;
        io.emit('bossCooldownActive', { floorId: 'neutralzone_boss', remaining: NEUTRAL_SPAWN_CD });
        if (supabase) {
            await supabase.from('boss_timers').upsert({ boss_id: 'neutralzone_boss', last_death_time: now }, { onConflict: 'boss_id' });
        }
        clearTimeout(global.neutralBossSpawnTimer);
        global.neutralBossSpawnTimer = setTimeout(spawnNeutralBoss, NEUTRAL_SPAWN_CD);
    }, NEUTRAL_DESPAWN_TIME);
}

// 🏰 BATTLEFIELD CO-OP RAID BOSS ENGINE
global.bfBossDespawnTimer = null;
global.bfBossSpawnTimer = null;

async function scheduleBattlefieldBoss() {
    const minMs = 1 * 60 * 60 * 1000; // 1 hour
    const maxMs = 48 * 60 * 60 * 1000; // 48 hours
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    const nextSpawnTs = Date.now() + delay;

    bossTimersMemory['battlefield_boss'] = nextSpawnTs;
    io.emit('bossCooldownActive', { floorId: 'battlefield_boss', remaining: delay });

    if (supabase) {
        try {
            const { data } = await supabase.from('boss_timers').select('boss_id').eq('boss_id', 'battlefield_boss').maybeSingle();
            if (data) {
                await supabase.from('boss_timers').update({ last_death_time: nextSpawnTs }).eq('boss_id', 'battlefield_boss');
            } else {
                await supabase.from('boss_timers').insert([{ boss_id: 'battlefield_boss', last_death_time: nextSpawnTs }]);
            }
        } catch (e) {
            console.error('[Battlefield Schedule Error]:', e.message);
        }
    }

    clearTimeout(global.bfBossSpawnTimer);
    global.bfBossSpawnTimer = setTimeout(spawnBattlefieldBoss, delay);
}

function spawnBattlefieldBoss() {
    delete bossTimersMemory['battlefield_boss'];
    if (supabase) {
        supabase.from('boss_timers').delete().eq('boss_id', 'battlefield_boss').then(() => {});
    }
    io.emit('bossCooldownActive', { floorId: 'battlefield_boss', remaining: 0 });

    const randomLevel = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
    io.emit('worldAnnouncement', {
        html: `🏰 <strong style="color:#ff1744;">[WORLD ALERT]</strong> A Level ${randomLevel} Colossal Raid Boss is assaulting the Castle! Enter the Battle Field to defend!`,
        color: '#ff1744'
    });

    clearTimeout(global.bfBossDespawnTimer);
    global.bfBossDespawnTimer = setTimeout(() => {
        io.emit('worldAnnouncement', {
            html: `🏰 <strong style="color:#888888;">[BATTLEFIELD]</strong> The Battlefield threat has retreated after 1 week.`,
            color: '#aaaaaa'
        });
        io.emit('forceTownTeleport');
        scheduleBattlefieldBoss();
    }, 7 * 24 * 60 * 60 * 1000);
}

async function initBattlefieldEngine() {
    if (!supabase) return;
    try {
        const { data: timer } = await supabase.from('boss_timers').select('last_death_time').eq('boss_id', 'battlefield_boss').maybeSingle();
        if (timer && timer.last_death_time) {
            const remaining = parseInt(timer.last_death_time) - Date.now();
            if (remaining > 0) {
                bossTimersMemory['battlefield_boss'] = Date.now() + remaining;
                clearTimeout(global.bfBossSpawnTimer);
                global.bfBossSpawnTimer = setTimeout(spawnBattlefieldBoss, remaining);
            } else {
                spawnBattlefieldBoss();
            }
        } else {
            console.log('[BATTLEFIELD] No DB timer. Spawning boss in 2 seconds...');
            clearTimeout(global.bfBossSpawnTimer);
            global.bfBossSpawnTimer = setTimeout(spawnBattlefieldBoss, 2000);
        }
    } catch (err) {
        console.error('[Battlefield Init Error]:', err.message);
    }
}

// Start Neutral & Battlefield Engines on boot
setTimeout(checkNeutralBoss, 2500);
setTimeout(initBattlefieldEngine, 3500);

server.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`🛡️  EXONIE 3D REMASTERED SERVER STARTED 🛡️`);
    console.log(`📡 URL: http://localhost:${PORT} (0.0.0.0)`);
    console.log(`🗄️ Supabase Live Database Connection: ${supabase ? 'ACTIVE' : 'OFFLINE/FALLBACK'}`);
    console.log(`⚡ Dragon Nest 3D Combat + Crisp Mobile Enabled`);
    console.log(`===============================================`);
});