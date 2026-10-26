// Exonie 2D to 3D Data Bridge
export const MAX_LEVEL = 150;

export const CLASSES = {
    "Healer": { weapon: "pendant", aura: "green", skills: [
        { id: 'heal1', name: "Heal", unlock: 1, cd: 20000, type: 'active', desc: "Heals all party members in range x2 of your INT." },
        { id: 'heal2', name: "Boost", unlock: 25, type: 'passive', desc: "Makes your heal x3 of your INT." },
        { id: 'heal3', name: "Purification", unlock: 50, cd: 100000, type: 'active', desc: "Revives dead party members globally and heals everyone." },
        { id: 'heal4', name: "Healing Touch", unlock: 75, type: 'passive', desc: "Normal attacks heal all party members for 5% of your INT." }
    ]},
  "Summoner": { weapon: "staff", aura: "blue", skills: [
        { id: 'sum1', name: "Summon Slime", unlock: 1, cd: 25000, type: 'active', desc: "Summons a permanent slime with 25% stats to fight alongside you." },
        { id: 'sum2', name: "Duplicate", unlock: 25, type: 'passive', desc: "Summon Slime now spawns 2 slimes." },
        { id: 'sum3', name: "Enhance!", unlock: 50, cd: 100000, type: 'active', desc: "10s: Slimes gain 100% stats. Big Boss deals 4x Damage (1800 AoE)." },
        { id: 'sum4', name: "Big Boss", unlock: 75, type: 'passive', desc: "Summon Slime also summons a Giant White Boss Slime (5x HP) with Earthquake." }
    ]},
    "Ice Master": { weapon: "staff", aura: "blue", skills: [
        { id: 'ice1', name: "Icicle Spear", unlock: 1, cd: 25000, type: 'active', desc: "Drops an icicle dealing 2x Magic Attack." },
        { id: 'ice2', name: "Chill!", unlock: 25, type: 'passive', desc: "Your attacks have a 25% chance to freeze enemies." },
        { id: 'ice3', name: "Icicle Storm", unlock: 50, cd: 100000, type: 'active', desc: "Drops 3 icicles on the enemy." },
        { id: 'ice4', name: "Ice Splash", unlock: 75, type: 'passive', desc: "Your skills become AoE and hit all nearby enemies." }
    ]},
   "Berserker": { weapon: "sword", aura: "red", skills: [
        { id: 'ber1', name: "Callout!", unlock: 1, cd: 14000, type: 'active', desc: "Taunts enemies and multiplies Defense by 3x for 10s." },
        { id: 'ber2', name: "Bulk Up!", unlock: 25, type: 'passive', desc: "Increases base Defense and HP by 25%." },
        { id: 'ber3', name: "Immortal", unlock: 50, cd: 100000, type: 'active', desc: "Your HP cannot drop below 1 for 10 seconds." },
        { id: 'ber4', name: "I love PAIN", unlock: 75, type: 'passive', desc: "15% chance to heal a third of all incoming damage." }
    ]},
    "Blademaster": { weapon: "sword", aura: "red", skills: [
        { id: 'bld1', name: "Sharpen Up!", unlock: 1, type: 'passive', desc: "Increases base Attack by 25%." },
        { id: 'bld2', name: "Parry", unlock: 25, cd: 13000, type: 'active', desc: "70% chance to parry any attacks for 10 seconds." },
        { id: 'bld3', name: "Mega Slash", unlock: 50, cd: 50000, type: 'active', desc: "Slashes the enemy for 5x Attack Power." },
        { id: 'bld4', name: "Sharp Edge", unlock: 75, type: 'passive', desc: "25% chance to Bleed enemies for 15% ATK over 3 seconds." }
    ]},
"Sniper": { weapon: "gun", aura: "white", skills: [
        { id: 'snp1', name: "Eagle Eye", unlock: 1, type: 'passive', desc: "Increases basic attack range by 15%." },
        { id: 'snp2', name: "Silver Bullet", unlock: 25, cd: 5000, type: 'active', desc: "Fires a fast silver bullet dealing 2x Attack Power." },
        { id: 'snp3', name: "Killshot", unlock: 50, cd: 50000, type: 'active', desc: "Fires a devastating bullet dealing 4x Attack Power." },
        { id: 'snp4', name: "Dual Bullet", unlock: 75, type: 'passive', desc: "50% chance to release a double bullet on any attack." }
    ]},
    "Explosives Expert": { weapon: "gun", aura: "orange", skills: [
        { id: 'exp1', name: "Molotov", unlock: 1, cd: 12000, type: 'active', desc: "Throws a firebomb dealing 100% ATK per second on the ground." },
        { id: 'exp2', name: "Improved Oil", unlock: 25, type: 'passive', desc: "Increases Molotov ground fire duration from 3s to 10s." },
        { id: 'exp3', name: "Go Boom!", unlock: 50, cd: 30000, type: 'active', desc: "Throws a massive bomb dealing 5x Attack Power." },
        { id: 'exp4', name: "Big Explosion", unlock: 75, type: 'passive', desc: "Go Boom! becomes a massive AoE explosion." }
    ]},
"Phantom Striker": { weapon: "dagger", aura: "white", skills: [
        { id: 'phs1', name: "Shadow Step", unlock: 1, cd: 5000, type: 'active', desc: "Blinks in the direction you are facing." },
        { id: 'phs2', name: "Sleight of Hand", unlock: 25, type: 'passive', desc: "50% chance to hit twice in one interval." },
        { id: 'phs3', name: "Blink Stab", unlock: 50, cd: 30000, type: 'active', desc: "Blink to the enemy and stab for 2x Attack." },
        { id: 'phs4', name: "Craftiness", unlock: 75, type: 'passive', desc: "25% chance on normal attack to reset all skill cooldowns." }
    ]},
    "Ninja Assassin": { weapon: "dagger", aura: "lightning", skills: [
        { id: 'nin1', name: "Smoke Bomb", unlock: 1, cd: 10000, type: 'active', desc: "Throws a smoke bomb. Enemies miss 75% of attacks for 10s." },
        { id: 'nin2', name: "Agility", unlock: 25, type: 'passive', desc: "25% chance to dodge any incoming attack." },
        { id: 'nin3', name: "Shadow Copy", unlock: 50, cd: 50000, type: 'active', desc: "Summons a 200% stat clone for 10 seconds." },
        { id: 'nin4', name: "More Agility", unlock: 75, type: 'passive', desc: "Increases your dodge chance to 35%." }
    ]},
    "Tech Genius": { weapon: "touchpad", aura: "blue", skills: [
        { id: 'tech1', name: "Gadget Drone", unlock: 1, type: 'passive', desc: "Summons an untargetable Ball Drone that attacks for 100% of your INT." },
        { id: 'tech2', name: "Gamma Shield", unlock: 25, cd: 100000, type: 'active', desc: "Shields party and summons for 100% INT." },
        { id: 'tech3', name: "Golem Buster", unlock: 50, cd: 100000, type: 'active', desc: "Summons a Golem Bot that taunts enemies. HP: 10x INT, DMG: 100% MATK." },
        { id: 'tech4', name: "Advance Medicine", unlock: 75, type: 'passive', desc: "Heals shielded allies for 10% INT continuously." }
    ]}
};

export const MONSTER_DATABASE = {
    "common_mobs1": { name: "Slime", category: "common_mobs", level: 5, maxHp: 100, atk: 15, def: 0, speed: 2.5, expYield: 125, goldYield: 1, aggroRadius: 250, chaseRadius: 400, attackRange: 55, width: 40, height: 40, respawnDelay: 10000, cssColor: '#ff69b4', cssBorder: '#c71585' },
    // 🌟 THE GOLDEN SLIME
    "common_mobs_golden": { name: "Golden Slime", category: "common_mobs", level: 5, maxHp: 100, atk: 15, def: 0, speed: 4.0, expYield: 500, goldYield: 1500, aggroRadius: 250, chaseRadius: 500, attackRange: 55, width: 40, height: 40, respawnDelay: 10000, cssColor: '#ffd700', cssBorder: '#b8860b' },
    "mini_boss1": { name: "Orc Slime", category: "mini_boss", level: 15, maxHp: 5500, atk: 50, def: 25, speed: 2.8, expYield: 1500, goldYield: 3, aggroRadius: 350, chaseRadius: 500, attackRange: 90, width: 60, height: 60, respawnDelay: 120000, cssColor: '#2196F3', cssBorder: '#0b7dda' },
    "floor_boss1": { name: "Dragon Slime", category: "floor_boss", level: 25, maxHp: 35000, atk: 450, def: 100, speed: 3.5, expYield: 13000, goldYield: 5, aggroRadius: 500, chaseRadius: 700, attackRange: 130, width: 100, height: 100, respawnDelay: -1, cssColor: '#f44336', cssBorder: '#b71c1c' },
    // ==================
    // TYPE 2: BATS (Fast, Squishy, Melee)
    // ==================
    "common_mobs2": { name: "Shadow Bat", category: "common_mobs", level: 5, maxHp: 160, atk: 35, def: 0, speed: 4.5, expYield: 130, goldYield: 1, aggroRadius: 300, chaseRadius: 500, attackRange: 55, width: 40, height: 40, respawnDelay: 10000, cssColor: '#1a1a1a', cssBorder: 'none' },
    "mini_boss2": { name: "Vampire Bat", category: "mini_boss", level: 15, maxHp: 13700, atk: 280, def: 5, speed: 5.0, expYield: 1600, goldYield: 3, aggroRadius: 400, chaseRadius: 600, attackRange: 90, width: 60, height: 60, respawnDelay: 120000, cssColor: '#8a2be2', cssBorder: 'none' },
    "floor_boss2": { name: "Bloodwing Terror", category: "floor_boss", level: 25, maxHp: 35500, atk: 530, def: 35, speed: 6.0, expYield: 13500, goldYield: 5, aggroRadius: 600, chaseRadius: 800, attackRange: 130, width: 100, height: 100, respawnDelay: -1, cssColor: '#d32f2f', cssBorder: 'none' },

    // ==================
    // TYPE 3: FIRE ELEMENTALS (Glass Cannons, Ranged)
    // ==================
    "common_mobs3": { name: "Fire Sprite", category: "common_mobs", level: 5, maxHp: 180, atk: 50, def: 0, speed: 2.5, expYield: 135, goldYield: 1, aggroRadius: 350, chaseRadius: 500, attackRange: 200, width: 40, height: 40, respawnDelay: 10000, cssColor: '#f44336', cssBorder: 'none' },
    "mini_boss3": { name: "Inferno Core", category: "mini_boss", level: 15, maxHp: 14200, atk: 320, def: 25, speed: 2.8, expYield: 1700, goldYield: 3, aggroRadius: 450, chaseRadius: 650, attackRange: 250, width: 60, height: 60, respawnDelay: 120000, cssColor: '#ff9800', cssBorder: 'none' },
    "floor_boss3": { name: "Astral Blaze", category: "floor_boss", level: 25, maxHp: 37500, atk: 600, def: 75, speed: 3.5, expYield: 14000, goldYield: 5, aggroRadius: 800, chaseRadius: 900, attackRange: 300, width: 100, height: 100, respawnDelay: -1, cssColor: 'linear-gradient(45deg, #2196F3, #ff9800)', cssBorder: 'none' },

    // ==================
    // TYPE 4: STONE GOLEMS (Massive Tanks, Slow, High Defense)
    // ==================
    "common_golem": { name: "Stone Golem", category: "common_mobs", level: 10, maxHp: 400, atk: 45, def: 20, speed: 1.5, expYield: 160, goldYield: 1, aggroRadius: 200, chaseRadius: 350, attackRange: 60, width: 50, height: 50, respawnDelay: 12000, cssColor: '#795548', cssBorder: '#4E342E' },
    "mini_boss_golem": { name: "Obsidian Behemoth", category: "mini_boss", level: 15, maxHp: 28000, atk: 350, def: 75, speed: 1.8, expYield: 1200, goldYield: 3, aggroRadius: 300, chaseRadius: 450, attackRange: 90, width: 80, height: 80, respawnDelay: 120000, cssColor: '#424242', cssBorder: '#212121' },
    "floor_boss_golem": { name: "Titan of the Deep", category: "floor_boss", level: 25, maxHp: 100000, atk: 350, def: 350, speed: 2.2, expYield: 16000, goldYield: 5, aggroRadius: 400, chaseRadius: 600, attackRange: 140, width: 120, height: 120, respawnDelay: -1, cssColor: 'linear-gradient(45deg, #5D4037, #212121)', cssBorder: '#3E2723' },

    // ==================
    // TYPE 5: SPECTRAL WRAITHS (Ethereal, Fast, Ranged Assassins)
    // ==================
    "common_wraith": { name: "Spectral Wraith", category: "common_mobs", level: 10, maxHp: 150, atk: 75, def: 0, speed: 4.8, expYield: 165, goldYield: 1, aggroRadius: 400, chaseRadius: 600, attackRange: 250, width: 40, height: 40, respawnDelay: 10000, cssColor: 'rgba(156, 39, 176, 0.7)', cssBorder: '#7B1FA2' },
    "mini_boss_wraith": { name: "Soul Reaper", category: "mini_boss", level: 15, maxHp: 11000, atk: 480, def: 10, speed: 5.5, expYield: 1300, goldYield: 3, aggroRadius: 500, chaseRadius: 700, attackRange: 300, width: 60, height: 60, respawnDelay: 120000, cssColor: 'rgba(103, 58, 183, 0.8)', cssBorder: '#512DA8' },
    "floor_boss_wraith": { name: "The Void King", category: "floor_boss", level: 25, maxHp: 45000, atk: 800, def: 100, speed: 6.5, expYield: 16500, goldYield: 5, aggroRadius: 700, chaseRadius: 1000, attackRange: 350, width: 100, height: 100, respawnDelay: -1, cssColor: 'linear-gradient(45deg, #4A148C, #000000)', cssBorder: '#311B92' },

    // ==================
    // TYPE 6: MINOTAURS (Brute Force, Charging Tanks)
    // ==================
    "common_minotaur": { name: "Minotaur Grunt", category: "common_mobs", level: 10, maxHp: 600, atk: 65, def: 15, speed: 2.0, expYield: 180, goldYield: 2, aggroRadius: 300, chaseRadius: 450, attackRange: 60, width: 60, height: 60, respawnDelay: 12000, cssColor: '#795548', cssBorder: '#3E2723' },
    "mini_boss_minotaur": { name: "Gorehorn", category: "mini_boss", level: 15, maxHp: 30000, atk: 450, def: 60, speed: 2.5, expYield: 1800, goldYield: 4, aggroRadius: 400, chaseRadius: 550, attackRange: 90, width: 90, height: 90, respawnDelay: 120000, cssColor: '#5D4037', cssBorder: '#212121' },
    "floor_boss_minotaur": { name: "Asterion The Labyrinth King", category: "floor_boss", level: 25, maxHp: 150000, atk: 550, def: 400, speed: 3.0, expYield: 8500, goldYield: 6, aggroRadius: 500, chaseRadius: 700, attackRange: 140, width: 140, height: 140, respawnDelay: -1, cssColor: 'linear-gradient(45deg, #4E342E, #b71c1c)', cssBorder: '#b71c1c' },

    // ==================
    // TYPE 7: DRAGONS (Armor Piercing, Fire Breathing)
    // ==================
    "common_dragon": { name: "Dragon Whelp", category: "common_mobs", level: 12, maxHp: 400, atk: 85, def: 10, speed: 3.5, expYield: 190, goldYield: 3, aggroRadius: 400, chaseRadius: 600, attackRange: 200, width: 50, height: 50, respawnDelay: 12000, cssColor: '#f44336', cssBorder: '#FF9800' },
    "mini_boss_dragon": { name: "Drake of Embers", category: "mini_boss", level: 15, maxHp: 28000, atk: 500, def: 30, speed: 4.0, expYield: 2000, goldYield: 4, aggroRadius: 500, chaseRadius: 700, attackRange: 250, width: 80, height: 80, respawnDelay: 120000, cssColor: '#d32f2f', cssBorder: '#FFeb3b' },
    "floor_boss_dragon": { name: "Ignis The Ancient", category: "floor_boss", level: 25, maxHp: 180000, atk: 800, def: 500, speed: 4.5, expYield: 19500, goldYield: 8, aggroRadius: 700, chaseRadius: 900, attackRange: 300, width: 160, height: 160, respawnDelay: -1, cssColor: 'linear-gradient(45deg, #b71c1c, #FF9800)', cssBorder: '#FFD700' }
};

export const DEFAULT_BASE_STATS = {
    hp: 100,
    attack: 5,
    magic: 5,
    defense: 2,
    speed: 1,
    str: 10,
    int: 10,
    playerClass: null,
    title: null,
    hasHome: false
};

export const STARTER_ITEMS = {
    equips: {
        weapon: null,
        armor: { id: 'starter_armor_1', name: "Starter Armor", type: "armor", sprite: "starterarmor", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { defense: 2 } },
        leggings: { id: 'starter_leggings_1', name: "Starter Leggings", type: "leggings", sprite: "starterleggings", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { hp: 5 } }
    },
    inventory: [
        { id: 'starter_wpn_sword', name: "Starter Sword", type: "weapon", weaponType: "sword", sprite: "startersword", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 3 }, desc: "A reliable iron blade. Required for Berserker & Blademaster." },
        { id: 'starter_wpn_staff', name: "Starter Staff", type: "weapon", weaponType: "staff", sprite: "starterstaff", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 3 }, desc: "An oak staff humming with mana. Required for Summoner & Ice Master." },
        { id: 'starter_wpn_pendant', name: "Starter Pendant", type: "weapon", weaponType: "pendant", sprite: "starterpendant", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 2 }, desc: "A sacred healing amulet. Required for Healer." },
        { id: 'starter_wpn_gun', name: "Starter Gun", type: "weapon", weaponType: "gun", sprite: "startergun", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 2 }, desc: "A flintlock firearm. Required for Sniper & Explosives Expert." },
        { id: 'starter_wpn_dagger', name: "Starter Dagger", type: "weapon", weaponType: "dagger", sprite: "starterdagger", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { attack: 3, speed: 2 }, desc: "Twin agile daggers. Required for Phantom Striker & Ninja Assassin." },
        { id: 'starter_wpn_touchpad', name: "Starter Touchpad", type: "weapon", weaponType: "touchpad", sprite: "startertouchpad", level: 1, rarity: "Starter", color: "#aaaaaa", fixedStat: { magic: 3 }, desc: "A holographic control pad. Required for Tech Genius (Auto-Drone)." },
        { id: 'starter_potion_1', name: "Health Potion", type: "potion", sprite: "potion1", level: 1, rarity: "Basic", color: "#8B4513", fixedStat: { hpHeal: 25 }, quantity: 10, desc: "Restores 10% Max HP (min 25 HP) immediately. 5s Cooldown." }
    ]
};

// EXP and Stat scaling matching 2D Exonie exactly
export function getExpForNextLevel(level) {
    if (level >= 80) return 100000;
    if (level >= 71) return 10000;
    if (level >= 61) return 7500;
    if (level >= 51) return 5000;
    if (level >= 41) return 1500;
    if (level >= 31) return 1000;
    if (level >= 21) return 750;
    if (level >= 11) return 500;
    return 100;
}

// ============================================================================
// AUTHORITATIVE 2D EXONIE LOOT GENERATOR (server.js generateLoot 1:1 port)
// ============================================================================
const RARITY_TIERS = [
    { name: 'Basic',     mult: 1.0, color: '#ffffff', weight: 52 },
    { name: 'Rare',      mult: 1.4, color: '#4caf50', weight: 26 },
    { name: 'Unique',    mult: 1.9, color: '#2196f3', weight: 12 },
    { name: 'Legendary', mult: 2.6, color: '#9c27b0', weight: 6 },
    { name: 'Godly',     mult: 3.6, color: '#ffeb3b', weight: 3 },
    { name: 'Divine',    mult: 5.0, color: '#e91e63', weight: 1 }
];

const WEAPON_ARCHETYPES = [
    { kind: 'sword',    label: 'Broadsword',   sprite: 'startersword',    stat: 'attack', desc: 'Forged for Berserker & Blademaster.' },
    { kind: 'dagger',   label: 'Twin Daggers', sprite: 'starterdagger',   stat: 'attack', desc: 'Balanced for Phantom Striker & Ninja Assassin.' },
    { kind: 'gun',      label: 'Caliber Gun',  sprite: 'startergun',      stat: 'attack', desc: 'Precision firearm for Sniper & Explosives Expert.' },
    { kind: 'staff',    label: 'Arcane Staff', sprite: 'starterstaff',    stat: 'magic',  desc: 'Focuses mana for Summoner & Ice Master.' },
    { kind: 'pendant',  label: 'Holy Pendant', sprite: 'starterpendant',  stat: 'magic',  desc: 'Sacred relic for Healer.' },
    { kind: 'touchpad', label: 'Magitech Pad', sprite: 'startertouchpad', stat: 'magic',  desc: 'Drone command terminal for Tech Genius.' }
];

function rollRarity(isBoss = false) {
    const roll = Math.random() * 100;
    if (isBoss) {
        if (roll < 5)  return RARITY_TIERS[5]; // Divine
        if (roll < 16) return RARITY_TIERS[4]; // Godly
        if (roll < 36) return RARITY_TIERS[3]; // Legendary
        if (roll < 68) return RARITY_TIERS[2]; // Unique
        return RARITY_TIERS[1];                // Rare
    }
    if (roll < 0.8) return RARITY_TIERS[5];
    if (roll < 3.0) return RARITY_TIERS[4];
    if (roll < 8.5) return RARITY_TIERS[3];
    if (roll < 22)  return RARITY_TIERS[2];
    if (roll < 52)  return RARITY_TIERS[1];
    return RARITY_TIERS[0];
}

// ============================================================================
// AUTHORITATIVE 2D EXONIE ITEM SELL PRICE FORMULA (server.js lines 7964-7980)
// ============================================================================
export function getItemSellPrice(item) {
    if (!item) return 0;
    let sellPrice = Number(item.sellPrice) || 0;
    if (!sellPrice) {
        const baseVal = (Number(item.level) || 1) * 2;
        const multiplier = {
            Starter: 1,
            Basic: 1,
            Rare: 1,
            Unique: 2,
            Legendary: 3,
            Godly: 5,
            Divine: 10
        }[item.rarity] || 1;
        sellPrice = Math.floor(baseVal * multiplier);
    }
    const qty = Math.max(1, Math.min(999, Number(item.quantity) || 1));
    return Math.min(500000, sellPrice * qty);
}

// ==========================================
// 2D EXONIE STAT SCALING & DROP ENGINE
// ==========================================
export const STAT_TYPES = ['attack', 'magic', 'defense', 'speed', 'int', 'str', 'hp'];

export const RARITY_COLORS = {
    Starter:   '#aaaaaa',
    Basic:     '#ffffff',
    Rare:      '#2196f3',
    Unique:    '#ab47bc',
    Legendary: '#ff9800',
    Godly:     '#f44336',
    Divine:    '#ffea00'
};

export const ITEM_TEMPLATES = {
    sword:    { slot: 'weapon', statKey: 'attack', baseName: 'Sword', spriteName: 'sword' },
    staff:    { slot: 'weapon', statKey: 'magic', baseName: 'Staff', spriteName: 'staff' },
    pendant:  { slot: 'weapon', statKey: 'magic', baseName: 'Pendant', spriteName: 'pendant' },
    gun:      { slot: 'weapon', statKey: 'attack', baseName: 'Gun', spriteName: 'gun' },
    dagger:   { slot: 'weapon', statKey: 'attack', baseName: 'Dagger', spriteName: 'dagger' },
    touchpad: { slot: 'weapon', statKey: 'magic', baseName: 'Touchpad', spriteName: 'touchpad' },
    armor:    { slot: 'armor', statKey: 'defense', baseName: 'Armor', spriteName: 'armor' },
    leggings: { slot: 'leggings', statKey: 'hp', baseName: 'Leggings', spriteName: 'leggings' }
};

export function getBaseStat(lvl) {
    if (lvl >= 50) {
        const extraTicks = Math.floor((lvl - 50) / 5);
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

// 🛡️ Authentic 2D Rolled Bonus Stats
export function rollRandomStats(mLevel, rarity) {
    const numStats = rarity === 'Divine' ? 4 : (rarity === 'Godly' ? 3 : (rarity === 'Legendary' ? 2 : 1));
    const available = [...STAT_TYPES];
    const rolled = {};
    const baseStat = getBaseStat(mLevel);

    for (let i = 0; i < numStats; i++) {
        if (available.length === 0) break;
        const rIdx = Math.floor(Math.random() * available.length);
        const sKey = available.splice(rIdx, 1)[0];
        rolled[sKey] = Math.max(1, Math.floor(Math.random() * baseStat) + 1);
    }
    return rolled;
}

export function generatePowerGem(level, rarity) {
    const r = rarity || 'Unique';
    const stats = [...STAT_TYPES];
    const rStat = stats[Math.floor(Math.random() * stats.length)];
    const statVal = getBaseStat(level) + ({ Basic: 0, Rare: 2, Unique: 5, Legendary: 8, Godly: 12, Divine: 16 }[r] || 0);

    return {
        id: `gem_${Date.now()}_${Math.random()}`,
        name: `${r} Power Gem`,
        type: 'material',
        sprite: 'powergem',
        level: level,
        rarity: r,
        color: RARITY_COLORS[r] || '#ab47bc',
        fixedStat: {},
        randomStat: { [rStat]: statVal },
        enhanceLevel: 0,
        quantity: 1,
        bonusStr: Math.max(2, Math.floor(statVal * 0.5)),
        bonusInt: Math.max(2, Math.floor(statVal * 0.5)),
        desc: `Imbues equipped weapon with +${statVal} ${rStat.toUpperCase()}!`
    };
}

export function generateLoot(mob) {
    if (!mob) return [];
    const drops = [];
    const lvl = Math.max(1, mob.level || 5);
    const category = mob.category || 'common_mobs';
    const isGolden = (mob.dbKey || mob.monsterKey || '').includes('golden');

    // 🌟 1. GOLDEN SLIME CUSTOM LOOT TABLE (Strict 2D replication)
    if (isGolden) {
        const roll = Math.random();
        if (roll < 0.15) {
            drops.push({
                id: `reset_${Date.now()}_${Math.random()}`,
                name: 'Class Reset Book',
                type: 'consumable',
                rarity: 'Godly',
                color: '#f44336',
                desc: 'Resets your chosen class so you can pick a new path in the Skills menu.',
                quantity: 1
            });
        } else if (roll < 0.18) {
            drops.push({
                id: `mat_${Date.now()}_${Math.random()}`,
                name: 'Divine Essence',
                type: 'material',
                rarity: 'Divine',
                level: 1,
                color: '#ffea00',
                sellPrice: 100000,
                desc: 'A blindingly bright golden essence. Required to craft Divine equipment.',
                quantity: 1
            });
        } else if (roll < 0.29) {
            drops.push({
                id: `mat_${Date.now()}_${Math.random()}`,
                name: 'Divine Enhancement Stone',
                type: 'material',
                rarity: 'Divine',
                level: lvl,
                color: '#ffea00',
                desc: 'Enhances Divine equipment.',
                quantity: 1
            });
        }

        // Gold Bar Roll (2D Gold Bar tiers)
        const barRoll = Math.random() * 100;
        let barItem = { name: 'Small Gold Bar', rarity: 'Basic', color: '#ffd700', sellPrice: 10000 };
        if (barRoll < 3) {
            barItem = { name: 'Huge Nugget', rarity: 'Legendary', color: '#ffd700', sellPrice: 500000 };
        } else if (barRoll < 15) {
            barItem = { name: 'Big Gold Bar', rarity: 'Unique', color: '#ffd700', sellPrice: 250000 };
        } else if (barRoll < 45) {
            barItem = { name: 'Normal Gold Bar', rarity: 'Rare', color: '#ffd700', sellPrice: 25000 };
        }
        drops.push({
            id: `goldbar_${Date.now()}_${Math.random()}`,
            name: barItem.name,
            type: 'material',
            sprite: 'goldbar',
            level: lvl,
            rarity: barItem.rarity,
            color: barItem.color,
            sellPrice: barItem.sellPrice,
            sellValue: barItem.sellPrice,
            desc: `Pure 24k Exonie bullion. Sell in Bag for ${barItem.sellPrice.toLocaleString()} Gold!`
        });

        // Remaining roll: 63% Legendary, 37% Unique Equipment
        const gearRarity = Math.random() < 0.63 ? 'Legendary' : 'Unique';
        const arch = WEAPON_ARCHETYPES[Math.floor(Math.random() * WEAPON_ARCHETYPES.length)];
        drops.push({
            id: `wpn_${Date.now()}_${Math.random()}`,
            name: `${gearRarity} ${arch.label}`,
            type: 'weapon',
            weaponType: arch.kind,
            sprite: arch.sprite,
            level: lvl,
            rarity: gearRarity,
            color: gearRarity === 'Legendary' ? '#ff9800' : '#ab47bc',
            fixedStat: { [arch.stat]: Math.max(10, lvl * 3) },
            desc: arch.desc
        });

        return drops;
    }

    // 💰 2. BOSS GOLD BAR INJECTION
    if (category === 'floor_boss' && Math.random() < 0.10) {
        drops.push({
            id: `bar_${Date.now()}_${Math.random()}`,
            name: 'Big Gold Bar',
            type: 'material',
            rarity: 'Godly',
            color: '#e0ffff',
            sellPrice: 250000,
            sellValue: 250000,
            desc: 'A heavy bar of pure gold. Sell for 250,000 Gold.',
            quantity: 1
        });
    } else if (category === 'mini_boss' && Math.random() < 0.05) {
        drops.push({
            id: `bar_${Date.now()}_${Math.random()}`,
            name: 'Normal Gold Bar',
            type: 'material',
            rarity: 'Legendary',
            color: '#f44336',
            sellPrice: 25000,
            sellValue: 25000,
            desc: 'A standard bar of pure gold. Sell for 25,000 Gold.',
            quantity: 1
        });
    }

    // 3. COMMON MOB SPECIALS: REVIVAL JUICE (0.09%) & SMALL GOLD BAR (0.80%)
    if (category === 'common_mobs') {
        const commRoll = Math.random();
        if (commRoll < 0.0009) {
            drops.push({
                id: `pot_${Date.now()}_${Math.random()}`,
                name: 'Revival Juice',
                type: 'potion',
                sprite: 'revivaljuice',
                level: lvl,
                rarity: 'Unique',
                color: '#ab47bc',
                fixedStat: { hpHeal: 99999 },
                desc: 'Revives you instantly on the spot when dead.',
                quantity: 1
            });
            return drops;
        } else if (commRoll < 0.0080) {
            drops.push({
                id: `bar_${Date.now()}_${Math.random()}`,
                name: 'Small Gold Bar',
                type: 'material',
                rarity: 'Unique',
                color: '#ab47bc',
                sellPrice: 10000,
                sellValue: 10000,
                desc: 'A small bar of pure gold. Sell for 10,000 Gold.',
                quantity: 1
            });
            return drops;
        }
    }

    // ✨ FLOOR BOSS DIVINE STONE (5%)
    if (category === 'floor_boss' && Math.random() < 0.05) {
        drops.push({
            id: `mat_${Date.now()}_${Math.random()}`,
            name: 'Divine Enhancement Stone',
            type: 'material',
            rarity: 'Divine',
            level: lvl,
            color: '#ffea00',
            desc: 'Enhances Divine equipment.',
            quantity: 1
        });
    }

    // 4. MAIN DROP RATE ROLL: Common 45%, Mini Boss 85%, Floor Boss 100%
    const dropRate = category === 'floor_boss' ? 1.0 : (category === 'mini_boss' ? 0.85 : 0.45);
    if (Math.random() > dropRate && drops.length === 0) return drops;

    // 💎 REFINEMENT STONES (15%) - NO POWER GEMS FOR COMMON OR MINI BOSS!
    if (Math.random() < 0.15) {
        let stoneRarity = 'Basic';
        const r = Math.random();
        if (category === 'mini_boss') stoneRarity = r < 0.35 ? 'Unique' : 'Rare';
        else if (category === 'floor_boss') stoneRarity = r < 0.10 ? 'Godly' : 'Legendary';
        else stoneRarity = r < 0.10 ? 'Rare' : 'Basic';

        const colorMap = { Basic: '#ffffff', Rare: '#2196f3', Unique: '#ab47bc', Legendary: '#ff9800', Godly: '#f44336' };
        drops.push({
            id: `stone_${Date.now()}_${Math.random()}`,
            name: `Refinement Stone Lv.${lvl}`,
            type: 'material',
            sprite: 'refinementstone',
            level: lvl,
            rarity: stoneRarity,
            color: colorMap[stoneRarity] || '#ffffff',
            desc: 'Enhances equipment.'
        });
        return drops;
    }

    // ⚔️ GEAR DROP (50%) - STRICT 2D EXONIE FORMULAS (FIXED STAT + RANDOM BONUS STATS)
    const arch = WEAPON_ARCHETYPES[Math.floor(Math.random() * WEAPON_ARCHETYPES.length)];
    const equipTypeRoll = Math.random();
    let rarity = 'Basic';
    const rarityRoll = Math.random();

    if (category === 'floor_boss') rarity = rarityRoll <= 0.35 ? 'Godly' : 'Legendary';
    else if (category === 'mini_boss') rarity = rarityRoll < 0.35 ? 'Unique' : 'Rare';
    else rarity = rarityRoll < 0.15 ? 'Rare' : 'Basic';

    const color = RARITY_COLORS[rarity] || '#ffffff';
    let statVal = getBaseStat(lvl) + ({ Starter: 0, Basic: 0, Rare: 2, Unique: 5, Legendary: 8, Godly: 12, Divine: 12 }[rarity] || 0);
    if (rarity === 'Divine') statVal = (getBaseStat(lvl) + 12) * 2;

    const randomStats = rollRandomStats(lvl, rarity);

    if (equipTypeRoll < 0.50) {
        // Weapon
        let wpnStat = statVal;
        if (arch.kind === 'gun' || arch.kind === 'pendant') wpnStat = Math.floor(statVal / 2);
        drops.push({
            id: `wpn_${Date.now()}_${Math.random()}`,
            name: `${rarity} ${arch.label}`,
            type: 'weapon',
            weaponType: arch.kind,
            sprite: `${rarity.toLowerCase()}${arch.kind}`,
            level: lvl,
            rarity: rarity,
            color: color,
            fixedStat: { [arch.stat]: Math.max(3, wpnStat) },
            randomStat: randomStats,
            enhanceLevel: 0,
            desc: arch.desc
        });
    } else if (equipTypeRoll < 0.75) {
        // Armor
        drops.push({
            id: `arm_${Date.now()}_${Math.random()}`,
            name: `${rarity} Armor`,
            type: 'armor',
            sprite: `${rarity.toLowerCase()}armor`,
            level: lvl,
            rarity: rarity,
            color: color,
            fixedStat: { defense: Math.max(2, statVal) },
            randomStat: randomStats,
            enhanceLevel: 0,
            desc: 'Reinforced Exonie chestplate.'
        });
    } else {
        // Leggings
        drops.push({
            id: `leg_${Date.now()}_${Math.random()}`,
            name: `${rarity} Leggings`,
            type: 'leggings',
            sprite: `${rarity.toLowerCase()}leggings`,
            level: lvl,
            rarity: rarity,
            color: color,
            fixedStat: { hp: Math.max(10, statVal * 4) },
            randomStat: randomStats,
            enhanceLevel: 0,
            desc: 'Armored leg guards that boost vitality.'
        });
    }

    return drops;
}

// 👻 HAUNTED HOUSE LOOT GENERATOR (Wraith King Boss — Drops Power Gems!)
export function generateHauntedLoot(level) {
    const lvl = level || 25;
    const drops = [];
    const roll = Math.random();

    // 25% chance for Power Gem!
    if (roll < 0.25) {
        let gemRarity = 'Unique';
        const gRoll = Math.random();
        if (gRoll < 0.10) gemRarity = 'Godly';
        else if (gRoll < 0.40) gemRarity = 'Legendary';
        drops.push(generatePowerGem(lvl, gemRarity));
    } else if (roll < 0.28) {
        // 3% Soul Piece
        drops.push({
            id: `soul_${Date.now()}_${Math.random()}`,
            name: 'Soul Piece',
            type: 'material',
            rarity: 'Godly',
            color: '#f44336',
            desc: 'An ethereal shard resonating with ancient dark energy.',
            quantity: 1
        });
    } else if (roll < 0.30) {
        // 2% Divine Essence
        drops.push({
            id: `mat_${Date.now()}_${Math.random()}`,
            name: 'Divine Essence',
            type: 'material',
            rarity: 'Divine',
            level: 1,
            color: '#ffea00',
            sellPrice: 100000,
            desc: 'A blindingly bright golden essence. Required to craft Divine equipment.',
            quantity: 1
        });
    } else if (roll < 0.45) {
        // 15% Refinement Stone (Legendary or Godly)
        const stoneRarity = Math.random() < 0.25 ? 'Godly' : 'Legendary';
        drops.push({
            id: `stone_${Date.now()}_${Math.random()}`,
            name: `Refinement Stone Lv.${lvl}`,
            type: 'material',
            sprite: 'refinementstone',
            level: lvl,
            rarity: stoneRarity,
            color: stoneRarity === 'Godly' ? '#f44336' : '#ff9800',
            desc: 'Enhances equipment.'
        });
    } else {
        // 55% Gear (Legendary or Godly)
        const gearRarity = Math.random() < 0.25 ? 'Godly' : 'Legendary';
        const arch = WEAPON_ARCHETYPES[Math.floor(Math.random() * WEAPON_ARCHETYPES.length)];
        let statVal = getBaseStat(lvl) + (gearRarity === 'Godly' ? 12 : 8);
        drops.push({
            id: `wpn_${Date.now()}_${Math.random()}`,
            name: `${gearRarity} ${arch.label}`,
            type: 'weapon',
            weaponType: arch.kind,
            sprite: `${gearRarity.toLowerCase()}${arch.kind}`,
            level: lvl,
            rarity: gearRarity,
            color: RARITY_COLORS[gearRarity] || '#ff9800',
            fixedStat: { [arch.stat]: statVal },
            randomStat: rollRandomStats(lvl, gearRarity),
            enhanceLevel: 0,
            desc: arch.desc
        });
    }

    return drops;
}

// 🗝️ DUNGEON BOSS LOOT (The Cave / Dungeon 1 & 2 Bosses — 50% Power Gem!)
export function generateDungeonLoot(mob) {
    const lvl = Math.max(1, (mob && mob.level) || 15);
    const drops = [];

    // 50% chance for a Power Gem!
    if (Math.random() < 0.50) {
        let gemRarity = 'Basic';
        const roll = Math.random();
        if (roll < 0.013) gemRarity = 'Godly';
        else if (roll < 0.040) gemRarity = 'Legendary';
        else if (roll < 0.35) gemRarity = 'Unique';
        else if (roll < 0.70) gemRarity = 'Rare';
        drops.push(generatePowerGem(lvl, gemRarity));
    } else {
        // 50% High-tier gear with random stats
        const roll = Math.random();
        let rarity = 'Rare';
        if (roll < 0.05) rarity = 'Godly';
        else if (roll < 0.25) rarity = 'Legendary';
        else if (roll < 0.65) rarity = 'Unique';

        const arch = WEAPON_ARCHETYPES[Math.floor(Math.random() * WEAPON_ARCHETYPES.length)];
        let statVal = getBaseStat(lvl) + ({ Unique: 5, Legendary: 8, Godly: 12 }[rarity] || 2);
        drops.push({
            id: `wpn_${Date.now()}_${Math.random()}`,
            name: `${rarity} ${arch.label}`,
            type: 'weapon',
            weaponType: arch.kind,
            sprite: `${rarity.toLowerCase()}${arch.kind}`,
            level: lvl,
            rarity: rarity,
            color: RARITY_COLORS[rarity] || '#2196f3',
            fixedStat: { [arch.stat]: statVal },
            randomStat: rollRandomStats(lvl, rarity),
            enhanceLevel: 0,
            desc: arch.desc
        });
    }
    return drops;
}
