// ============================================================================
// EXONIE 3D REMASTERED — AUTHORITATIVE 2D CLASS SKILLS, PASSIVES & 3D COMBAT
// ============================================================================
import * as THREE from 'three';
import { CLASSES } from './game_data.js';

export class CombatSystem {
    constructor(engine, audioManager) {
        this.engine = engine;
        this.audio = audioManager;

        this.comboCount = 0;
        this.comboResetTimer = 0;
        this.lastAttackTime = 0;
        this.currentComboStep = 1;
        this.targetMonster = null;
        this.droneAttackTimer = 0;

        this.targetReticle = document.getElementById('target-reticle');
        this.comboContainer = document.getElementById('combo-container');
        this.comboCountEl = document.querySelector('.combo-count');
        this.comboTextEl = document.querySelector('.combo-text');

        this.cooldowns = {
            skill1: 0,
            skill2: 0,
            skill3: 0,
            dodge: 0
        };
        this.maxCooldowns = {
            skill1: 1,
            skill2: 1,
            skill3: 1,
            dodge: 1.2
        };

        // 🐾 Allied Minions & Companions (Summon Slime, etc.)
        this.alliedMinions = [];

        // 🔥 Persistent Area-of-Effect Zones (Molotov Cocktail, Ice Storm)
        this.fireZones = [];

        // 🚀 Projectiles in Flight
        this.projectiles = [];
    }

    // Find nearest alive monster in any 360-degree direction for instant Left-Click Auto-Aim
    findNearestMonster(playerPos, monsters, maxRange = 18) {
        let nearest = null;
        let minDist = maxRange;
        for (const m of monsters) {
            if (!m.isAlive) continue;
            const dist = playerPos.distanceTo(m.group.position);
            if (dist <= minDist) {
                minDist = dist;
                nearest = m;
            }
        }
        return nearest;
    }

    // Auto-aim player rotation toward nearest monster on left click
    autoAimNearestMonster(player, monsters, maxRange = 18) {
        const nearest = this.findNearestMonster(player.pos, monsters, maxRange);
        if (nearest) {
            const dx = nearest.group.position.x - player.pos.x;
            const dz = nearest.group.position.z - player.pos.z;
            player.rotY = Math.atan2(dx, dz);
            if (player.char3D) {
                player.char3D.group.rotation.y = player.rotY;
            }
            this.targetMonster = nearest;
            this.updateTargetReticle();
        }
        return nearest;
    }

    findTarget(playerPos, playerRotY, monsters, maxRange = 14) {
        let nearest = null;
        let minDist = maxRange;
        const forward = new THREE.Vector3(Math.sin(playerRotY), 0, Math.cos(playerRotY));

        for (const m of monsters) {
            if (!m.isAlive) continue;
            const dist = playerPos.distanceTo(m.group.position);
            if (dist > maxRange) continue;

            const dirToMob = m.group.position.clone().sub(playerPos).normalize();
            const dot = forward.dot(dirToMob);

            if (dot > 0.15 && dist < minDist) {
                minDist = dist;
                nearest = m;
            }
        }

        if (!nearest) {
            nearest = this.findNearestMonster(playerPos, monsters, maxRange);
        }

        this.targetMonster = nearest;
        this.updateTargetReticle();
        return nearest;
    }

    updateTargetReticle() {
        if (!this.targetMonster || !this.targetMonster.isAlive) {
            if (this.targetReticle) this.targetReticle.style.display = 'none';
            return;
        }

        const screenPos = this.targetMonster.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        screenPos.project(this.engine.camera);

        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        if (screenPos.z < 1.0 && this.targetReticle) {
            this.targetReticle.style.display = 'block';
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        } else if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
    }

    // Apply 2D Class Passives on any hit against a monster
    applyOnHitPassives(player, mob, baseDmgDealt, onMonsterKilled) {
        if (!mob || !mob.isAlive) return;
        const pClass = player.baseStats?.playerClass || '';
        const lvl = player.level || 1;

        // 1. Ice Master Lv.25 Passive: Chill! (25% chance to freeze enemy for 3s)
        if (pClass === 'Ice Master' && lvl >= 25 && Math.random() < 0.25) {
            mob.isFrozen = true;
            mob.freezeTimer = 3.0;
            if (mob.mainMat) {
                mob.mainMat.emissive.setHex(0x00e5ff);
                mob.mainMat.emissiveIntensity = 0.75;
            }
            this.spawnFloatingDamage(mob.group.position, '❄️ CHILL! (FROZEN)', false, true);
        }

        // 2. Blademaster Lv.75 Passive: Sharp Edge (25% chance to Bleed for 15% ATK over 3s)
        if (pClass === 'Blademaster' && lvl >= 75 && Math.random() < 0.25) {
            mob.bleedTimer = 3.0;
            mob.bleedTickTimer = 1.0;
            mob.bleedDamage = Math.max(2, Math.floor((player.atk || 20) * 0.15));
            this.spawnFloatingDamage(mob.group.position, '🩸 BLEED!', false);
        }

        // 3. Phantom Striker Lv.75 Passive: Craftiness (25% chance on normal attack to reset all skill CDs)
        if (pClass === 'Phantom Striker' && lvl >= 75 && Math.random() < 0.25) {
            this.cooldowns.skill1 = 0;
            this.cooldowns.skill2 = 0;
            this.spawnFloatingDamage(player.pos, '⚡ CRAFTINESS! (CD RESET)', false, true);
        }

        // 4. Sniper Lv.75 Passive: Dual Bullet (50% chance to fire a second bullet)
        if (pClass === 'Sniper' && lvl >= 75 && Math.random() < 0.50) {
            setTimeout(() => {
                if (!mob.isAlive) return;
                const extraDmg = Math.max(1, Math.floor(baseDmgDealt * 0.85));
                mob.takeDamage(extraDmg);
                this.engine.spawnHitSparks(mob.group.position, 0xffea00, 12);
                this.spawnFloatingDamage(mob.group.position, `DUAL! ${extraDmg}`, true);
                this.registerComboHit(1);
                if (!mob.isAlive && onMonsterKilled) onMonsterKilled(mob);
            }, 110);
        }

        // 5. Phantom Striker Lv.25 Passive: Sleight of Hand (50% chance to hit twice)
        if (pClass === 'Phantom Striker' && lvl >= 25 && Math.random() < 0.50) {
            setTimeout(() => {
                if (!mob.isAlive) return;
                const extraDmg = Math.max(1, Math.floor(baseDmgDealt * 0.85));
                mob.takeDamage(extraDmg);
                this.engine.spawnHitSparks(mob.group.position, 0x00e5ff, 12);
                this.spawnFloatingDamage(mob.group.position, `DOUBLE! ${extraDmg}`, true);
                this.registerComboHit(1);
                if (!mob.isAlive && onMonsterKilled) onMonsterKilled(mob);
            }, 95);
        }
    }

    // Automatic Proximity Drone Attack for Tech Genius (2D Exonie 1000ms interval — requires Tech Genius class!)
    updateAutoDrone(delta, player, monsters, onMonsterKilled) {
        if (!player || !player.equips || !player.equips.weapon) return;
        const wpnSprite = String(player.equips.weapon.weaponType || player.equips.weapon.sprite || player.equips.weapon.name || '').toLowerCase();
        const pClass = player.baseStats?.playerClass || '';
        // Gadget Drone is Tech Genius's Level 1 passive skill — only active when class Tech Genius is chosen!
        if (pClass !== 'Tech Genius' || !wpnSprite.includes('touchpad')) return;

        this.droneAttackTimer += delta;
        if (this.droneAttackTimer < 1.0) return; // 1000ms interval in 2D Exonie

        // Find closest alive monster within proximity range (13 units in 3D = 300px in 2D)
        const target = this.findNearestMonster(player.pos, monsters, 13.5);
        if (!target) return;

        this.droneAttackTimer = 0;
        this.targetMonster = target;
        this.updateTargetReticle();

        if (player.char3D) {
            player.char3D.triggerAttack(1, 'touchpad');
        }

        const dronePos = (player.char3D && player.char3D.getDroneWorldPosition)
            ? player.char3D.getDroneWorldPosition()
            : player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY + 0.6) * 0.88, 2.15, Math.cos(player.rotY + 0.6) * 0.88));
        const targetPos = target.group.position.clone().add(new THREE.Vector3(0, 1.0, 0));

        // 2D Exonie Drone: 50% Crit Chance (1.5x INT on Crit, 1.0x INT normal), lightning.mp3 SFX
        const isCrit = Math.random() < 0.50;
        const laserColor = isCrit ? 0xff1744 : 0x00e5ff;
        this.engine.spawnLaserBolt(dronePos, targetPos, laserColor, isCrit ? 0.20 : 0.14);
        if (this.audio) this.audio.playSfx('lightning');

        const totalInt = player.totalInt || (player.baseStats && player.baseStats.int) || 10;
        const rawDmg = Math.floor(totalInt * (isCrit ? 1.5 : 1.0));
        const finalDmg = Math.max(1, rawDmg - (target.def || 0));

        setTimeout(() => {
            if (!target.isAlive) return;
            target.takeDamage(finalDmg);
            this.engine.spawnHitSparks(target.group.position, laserColor, 14);
            this.spawnFloatingDamage(target.group.position, isCrit ? `⚡ CRIT! ${finalDmg}` : finalDmg, isCrit);
            this.registerComboHit(1);
            this.applyOnHitPassives(player, target, finalDmg, onMonsterKilled);
            if (!target.isAlive && onMonsterKilled) onMonsterKilled(target);
        }, 65);
    }

    // Execute Primary Attack (Left Click) — Auto-Aims at nearest monster & uses exact 2D Exonie formulas!
    executePrimaryAttack(player, monsters, onMonsterKilled) {
        // Disallow attack during dodge roll (prevents animation breaking/floating)
        if (player.char3D && player.char3D.isDodging) return;

        if (!player.equips || !player.equips.weapon) {
            this.autoAimNearestMonster(player, monsters, 6.0);
            this.executeUnarmedAttack(player, monsters, onMonsterKilled);
            return;
        }

        const wpnSprite = String(player.equips.weapon.weaponType || player.equips.weapon.sprite || player.equips.weapon.name || '').toLowerCase();
        const pClass = player.baseStats?.playerClass || '';
        const cloneMult = player.shadowCloneActive ? 2.0 : 1.0;

        // 1. TOUCHPAD / TECH GENIUS: Has NO left-click basic attack in 2D! Drone attacks automatically once Tech Genius class is chosen.
        if (wpnSprite.includes('touchpad') || pClass === 'Tech Genius') {
            if (window.game && window.game.ui) {
                if (pClass !== 'Tech Genius') {
                    window.game.ui.showToast("🤖 Open Skills [K] and choose the Tech Genius class to summon your Gadget Drone!");
                } else {
                    window.game.ui.showToast("🤖 Tech Geniuses use their Gadget Drone! Walk near monsters to auto-attack.");
                }
            }
            return;
        }

        // 2. GUN (Sniper / Explosives Expert) — 800ms attack interval, 2D AttackPower formula
        if (wpnSprite.includes('gun') || pClass === 'Sniper' || pClass === 'Explosives Expert') {
            const now = performance.now();
            if (now - this.lastAttackTime < 800) return;
            this.lastAttackTime = now;

            // Sniper Lv.1 Passive: Eagle Eye (+15% attack range)
            const range = pClass === 'Sniper' ? 23 : 19;
            const target = this.autoAimNearestMonster(player, monsters, range);

            if (player.char3D) player.char3D.triggerAttack(1, 'gun');
            if (this.audio) this.audio.playSfx('gunshot');

            const muzzlePos = player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 1.15, 1.38, Math.cos(player.rotY) * 1.15));
            const targetPos = target
                ? target.group.position.clone().add(new THREE.Vector3(0, 1.0, 0))
                : player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * range, 1.38, Math.cos(player.rotY) * range));

            this.engine.spawnBulletTracer(muzzlePos, targetPos);
            this.engine.addScreenshake(0.20);

            if (target) {
                const trueDmg = Math.floor((player.atk || 12) * (0.9 + Math.random() * 0.2) * cloneMult);
                const finalDmg = Math.max(1, trueDmg - (target.def || 0));

                target.takeDamage(finalDmg);
                this.engine.spawnHitSparks(target.group.position, 0xffd600, 14);
                this.spawnFloatingDamage(target.group.position, finalDmg, false);
                this.registerComboHit(1);
                this.applyOnHitPassives(player, target, finalDmg, onMonsterKilled);
                if (!target.isAlive && onMonsterKilled) onMonsterKilled(target);
            }
            return;
        }

        // 3. STAFF (Summoner / Ice Master) — 800ms attack interval, 2D MagicAttack formula
        if (wpnSprite.includes('staff') || pClass === 'Summoner' || pClass === 'Ice Master') {
            const now = performance.now();
            if (now - this.lastAttackTime < 800) return;
            this.lastAttackTime = now;

            const target = this.autoAimNearestMonster(player, monsters, 17);

            if (player.char3D) player.char3D.triggerAttack(1, 'staff');
            if (this.audio) this.audio.playSfx('lightning');

            const castPos = player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 1.0, 1.6, Math.cos(player.rotY) * 1.0));
            const targetPos = target
                ? target.group.position.clone().add(new THREE.Vector3(0, 1.0, 0))
                : player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 16, 1.4, Math.cos(player.rotY) * 16));

            this.engine.spawnLaserBolt(castPos, targetPos, pClass === 'Ice Master' ? 0x80d8ff : 0x7c4dff);

            if (target) {
                const trueDmg = Math.floor((player.mag || 13) * (0.9 + Math.random() * 0.2) * cloneMult);
                const finalDmg = Math.max(1, trueDmg - (target.def || 0));

                setTimeout(() => {
                    if (!target.isAlive) return;
                    target.takeDamage(finalDmg);
                    this.engine.spawnHitSparks(target.group.position, 0x80d8ff, 15);
                    this.spawnFloatingDamage(target.group.position, finalDmg, false);
                    this.registerComboHit(1);
                    this.applyOnHitPassives(player, target, finalDmg, onMonsterKilled);
                    if (!target.isAlive && onMonsterKilled) onMonsterKilled(target);
                }, 80);
            }
            return;
        }

        // 4. PENDANT (Healer) — 800ms attack interval, 2D MagicAttack formula
        if (wpnSprite.includes('pendant') || pClass === 'Healer') {
            const now = performance.now();
            if (now - this.lastAttackTime < 800) return;
            this.lastAttackTime = now;

            const target = this.autoAimNearestMonster(player, monsters, 16);

            if (player.char3D) player.char3D.triggerAttack(1, 'pendant');
            if (this.audio) this.audio.playSfx('splash');

            const prayerPos = player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 0.8, 1.4, Math.cos(player.rotY) * 0.8));
            const targetPos = target
                ? target.group.position.clone().add(new THREE.Vector3(0, 1.0, 0))
                : player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 15, 1.4, Math.cos(player.rotY) * 15));

            this.engine.spawnLaserBolt(prayerPos, targetPos, 0x00e676);

            // Healer Lv.75 Passive: Healing Touch (normal attacks heal for 5% of INT)
            const intVal = player.totalInt || (player.baseStats && player.baseStats.int) || 10;
            if (pClass === 'Healer' && player.level >= 75) {
                const healTick = Math.max(1, Math.floor(intVal * 0.05));
                player.hp = Math.min(player.maxHp, player.hp + healTick);
                this.spawnFloatingDamage(player.pos, `+${healTick} HP`, false, true);
            }

            if (target) {
                const trueDmg = Math.floor((player.mag || 12) * (0.9 + Math.random() * 0.2) * cloneMult);
                const finalDmg = Math.max(1, trueDmg - (target.def || 0));

                setTimeout(() => {
                    if (!target.isAlive) return;
                    target.takeDamage(finalDmg);
                    this.engine.spawnHitSparks(target.group.position, 0x00e676, 16);
                    this.spawnFloatingDamage(target.group.position, finalDmg, false);
                    this.registerComboHit(1);
                    this.applyOnHitPassives(player, target, finalDmg, onMonsterKilled);
                    if (!target.isAlive && onMonsterKilled) onMonsterKilled(target);
                }, 80);
            }
            return;
        }

        // 5. MELEE SWORD / DUAL DAGGER — Auto-Aims nearest monster & uses exact 2D AttackPower formula
        const isDagger = wpnSprite.includes('dagger') || pClass === 'Phantom Striker' || pClass === 'Ninja Assassin';
        const now = performance.now();
        const attackInterval = isDagger ? 650 : 800; // 2D 800ms base cooldown (slightly faster with dagger +2 speed)
        if (now - this.lastAttackTime < attackInterval) return;

        if (now - this.lastAttackTime < 1500) {
            this.currentComboStep = (this.currentComboStep % 3) + 1;
        } else {
            this.currentComboStep = 1;
        }
        this.lastAttackTime = now;

        // Auto-aim toward nearest monster within 12 units so left-clicking always faces the enemy!
        this.autoAimNearestMonster(player, monsters, 12.0);

        player.char3D.triggerAttack(this.currentComboStep, isDagger ? 'dagger' : 'sword');
        if (this.audio) this.audio.playSfx('slash');

        const slashColors = isDagger ? [0xd500f9, 0x00e5ff, 0xffea00] : [0x00e5ff, 0xffea00, 0xff1744];
        const slashColor = slashColors[this.currentComboStep - 1];
        const slashTilts = [0.12, -0.22, 0.0];
        this.engine.spawnSlashArc(player.pos, player.rotY, slashColor, isDagger ? 2.5 : 3.1, slashTilts[this.currentComboStep - 1]);

        const hitRadius = this.currentComboStep === 3 ? 3.8 : 3.2;
        const playerForward = new THREE.Vector3(Math.sin(player.rotY), 0, Math.cos(player.rotY));

        let hitCount = 0;

        for (const m of monsters) {
            if (!m.isAlive) continue;
            const dist = player.pos.distanceTo(m.group.position);
            if (dist > hitRadius) continue;

            const dirToMob = m.group.position.clone().sub(player.pos).normalize();
            if (this.currentComboStep !== 3 && playerForward.dot(dirToMob) < 0.05) continue;

            // Exact 2D Exonie Basic Swing Damage Formula (server.js line 3893):
            // trueDmg = Math.floor(atkPwr * (0.9 + Math.random() * 0.2)), mitigated by monster.def
            const trueDmg = Math.floor((player.atk || 13) * (0.9 + Math.random() * 0.2) * cloneMult);
            const finalDmg = Math.max(1, trueDmg - (m.def || 0));

            m.takeDamage(finalDmg);
            hitCount++;

            this.engine.addScreenshake(this.currentComboStep === 3 ? 0.45 : 0.22);
            this.engine.spawnHitSparks(m.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), slashColor, 15);
            this.spawnFloatingDamage(m.group.position, finalDmg, false);

            if (this.currentComboStep === 3) {
                this.engine.spawnGroundShockwave(m.group.position, slashColor, 3.8);
                const knockbackDir = dirToMob.clone().multiplyScalar(0.75);
                m.group.position.add(knockbackDir);
            }

            this.applyOnHitPassives(player, m, finalDmg, onMonsterKilled);

            if (!m.isAlive && onMonsterKilled) {
                onMonsterKilled(m);
            }
        }

        if (hitCount > 0) {
            this.registerComboHit(hitCount);
        }
    }

    executeUnarmedAttack(player, monsters, onMonsterKilled) {
        const now = performance.now();
        if (now - this.lastAttackTime < 800) return;
        this.lastAttackTime = now;

        if (player.char3D) player.char3D.triggerAttack(1, 'sword');
        if (this.audio) this.audio.playSfx('bump');

        const punchPos = player.pos.clone().add(new THREE.Vector3(Math.sin(player.rotY) * 1.2, 1.0, Math.cos(player.rotY) * 1.2));
        this.engine.spawnHitSparks(punchPos, 0xaaaaaa, 10);

        for (const m of monsters) {
            if (!m.isAlive) continue;
            if (player.pos.distanceTo(m.group.position) <= 2.6) {
                const rawUnarmed = Math.floor(10 * (0.9 + Math.random() * 0.2));
                const unarmedDmg = Math.max(1, rawUnarmed - (m.def || 0));
                m.takeDamage(unarmedDmg);
                this.spawnFloatingDamage(m.group.position, unarmedDmg, false);
                this.registerComboHit(1);
                if (!m.isAlive && onMonsterKilled) onMonsterKilled(m);
            }
        }
    }

    // Cast Active Class Skill (Slot 1 or 2)
    executeSkill(skillSlot, player, monsters, onMonsterKilled) {
        // Disallow skills during dodge roll
        if (player.char3D && player.char3D.isDodging) return;

        if (!player.equips || !player.equips.weapon) {
            this.spawnFloatingDamage(player.pos, "EQUIP WEAPON FIRST!", false);
            if (this.audio) this.audio.playSfx('bump');
            return;
        }

        const pClass = player.baseStats?.playerClass || null;
        if (!pClass || !CLASSES[pClass]) {
            this.spawnFloatingDamage(player.pos, "AWAKEN CLASS IN SKILLS (K)!", false);
            if (this.audio) this.audio.playSfx('bump');
            return;
        }

        // Weapon requirement check matching 2D Exonie: CLASSES[pClass].weapon
        const reqWpn = CLASSES[pClass]?.weapon;
        const wpn = player.equips?.weapon;
        const wpnType = String(wpn?.weaponType || wpn?.sprite || wpn?.name || '').toLowerCase();
        if (reqWpn && !wpnType.includes(reqWpn)) {
            this.spawnFloatingDamage(player.pos, `WRONG WEAPON! (${reqWpn.toUpperCase()})`, false);
            if (this.audio) this.audio.playSfx('bump');
            if (window.game && window.game.ui) {
                window.game.ui.showToast(`⚠️ ${pClass} requires a ${reqWpn.toUpperCase()} to use class skills!`);
            }
            return;
        }

        const activeSkills = CLASSES[pClass].skills.filter(s => s.type === 'active');
        const skillDef = activeSkills[skillSlot - 1];
        if (!skillDef) return;

        // Check 2D Skill Level Unlock requirement (Lv.1 / Lv.25 / Lv.50)
        if (player.level < skillDef.unlock) {
            this.spawnFloatingDamage(player.pos, `LOCKED! REQ LV.${skillDef.unlock}`, false);
            if (window.game && window.game.ui) {
                window.game.ui.showToast(`⚠️ ${skillDef.name} unlocks at Level ${skillDef.unlock}!`);
            }
            if (this.audio) this.audio.playSfx('bump');
            return;
        }

        const cdKeys = { 1: 'skill1', 2: 'skill2', 3: 'skill3' };
        const key = cdKeys[skillSlot];
        if (this.cooldowns[key] > 0) return;

        // 🛡️ HEALER PURIFICATION CHECK: Max 5 uses per run & cannot cast inside safe Town
        if (pClass === 'Healer' && skillSlot === 2) {
            const currMap = (window.game && window.game.currentMapId) || 'town';
            if (currMap === 'town') {
                this.spawnFloatingDamage(player.pos, 'CANNOT CAST IN TOWN!', false);
                if (window.game && window.game.ui) {
                    window.game.ui.showToast('⚠️ Purification cannot be cast inside Town!');
                }
                if (this.audio) this.audio.playSfx('bump');
                return;
            }
            player.purificationUses = Number(player.purificationUses) || 0;
            if (player.purificationUses >= 5) {
                this.spawnFloatingDamage(player.pos, 'PURIFICATION EXHAUSTED (5/5)!', false);
                if (window.game && window.game.ui) {
                    window.game.ui.showToast('⚠️ You have exhausted your Purification miracles for this zone (Max 5/5).');
                }
                if (this.audio) this.audio.playSfx('bump');
                return;
            }
        }

        // Play authentic Exonie class voice shout
        if (this.audio && this.audio.playClassVoice) {
            this.audio.playClassVoice(player.hairStyle || '1', pClass);
        }

        if (player.char3D && player.char3D.triggerSkillCast) {
            player.char3D.triggerSkillCast(0x00e5ff);
        }

        const playerForward = new THREE.Vector3(Math.sin(player.rotY), 0, Math.cos(player.rotY));
        const intVal = (player.baseStats && player.baseStats.int) || 10;
        const atkVal = player.atk || 20;
        const baseCdSec = (skillDef.cd || 15000) / 1000;
        this.cooldowns[key] = baseCdSec;
        if (!this.maxCooldowns) this.maxCooldowns = { skill1: 1, skill2: 1, skill3: 1 };
        this.maxCooldowns[key] = baseCdSec;

        if (pClass === 'Blademaster') {
            if (skillSlot === 1) {
                // Parry (Lv.25, 13s CD): 70% chance to parry attacks for 10s
                this.engine.spawnSlashArc(player.pos, player.rotY, 0x00e5ff, 3.2);
                if (this.audio) this.audio.playSfx('slash');
                player.isParrying = true;
                this.spawnFloatingDamage(player.pos, '⚔️ PARRY STANCE (10s)!', false, true);
                setTimeout(() => { player.isParrying = false; }, 10000);
                this.damageMonstersInRadius(player, player.pos, 4.0, atkVal * 1.8, monsters, onMonsterKilled);
            } else {
                // Mega Slash (Lv.50, 50s CD): 5x ATK Power
                this.engine.addScreenshake(0.9);
                this.engine.spawnGroundShockwave(player.pos, 0xff1744, 7.0);
                if (this.audio) this.audio.playSfx('slash');
                this.damageMonstersInCone(player, player.pos, playerForward, 8.5, atkVal * 5.0, monsters, onMonsterKilled);
            }
        } else if (pClass === 'Berserker') {
            if (skillSlot === 1) {
                // Callout! (Lv.1, 14s CD): Taunt enemies + 3x DEF for 10s
                player.calloutActive = true;
                if (window.game) window.game.recalculateStats();
                setTimeout(() => {
                    player.calloutActive = false;
                    if (window.game) window.game.recalculateStats();
                }, 10000);
                this.spawnFloatingDamage(player.pos, '🛡️ CALLOUT! (PROVOKE)', false, true);
                this.engine.spawnGroundShockwave(player.pos, 0xff1744, 6.5);
                if (this.audio) this.audio.playSfx('slash');

                // Provoke all monsters within 18 units to aggro on Berserker
                if (monsters) {
                    for (const mob of monsters) {
                        if (mob && mob.isAlive && player.pos.distanceTo(mob.group.position) <= 18) {
                            if (mob.provoke) mob.provoke(player, 10.0);
                        }
                    }
                }

                this.damageMonstersInRadius(player, player.pos, 8.0, atkVal * 1.5, monsters, onMonsterKilled);
            } else {
                // Immortal (Lv.50, 100s CD): HP cannot drop below 1 for 10s
                player.isImmortal = true;
                setTimeout(() => { player.isImmortal = false; }, 10000);
                this.spawnFloatingDamage(player.pos, '🔥 IMMORTAL (10s)!', true, true);
                this.engine.spawnLevelUpVFX(player.pos);
                if (this.audio) this.audio.playSfx('splash');
            }
        } else if (pClass === 'Healer') {
            // Boost Passive (Lv.25): Makes Heal 3x INT instead of 2x INT
            const mult = player.level >= 25 ? 3 : 2;
            if (skillSlot === 1) {
                const healAmt = intVal * mult;
                player.hp = Math.min(player.maxHp, player.hp + healAmt);
                this.spawnFloatingDamage(player.pos, `+${healAmt} HP`, false, true);
                this.engine.spawnHitSparks(player.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x00e676, 28);
                if (this.audio) this.audio.playSfx('splash');
            } else {
                // Purification (Lv.50, 100s CD): Full party heal & cleanse (Max 5/5 per run)
                player.purificationUses = (Number(player.purificationUses) || 0) + 1;
                player.hp = player.maxHp;
                if (window.game && window.game.ui) {
                    window.game.ui.showToast(`✨ Purification used (${player.purificationUses}/5 for this run).`);
                    window.game.ui.updatePlayerHUD(player);
                }
                this.spawnFloatingDamage(player.pos, `✨ PURIFICATION! (${player.purificationUses}/5)`, true, true);
                this.engine.spawnLevelUpVFX(player.pos);
                if (this.audio) this.audio.playSfx('splash');
            }
        } else if (pClass === 'Summoner') {
            if (skillSlot === 1) {
                // Summon Slime (Lv.1, Duplicate at Lv.25, Big Boss at Lv.75) — Actively summons 3D Slimes that fight!
                const numSlimes = player.level >= 25 ? 2 : 1;
                const hasBigBoss = player.level >= 75;

                // Clean up previous slimes if any
                for (const sm of this.alliedMinions) {
                    this.engine.scene.remove(sm.group);
                }
                this.alliedMinions = [];

                for (let s = 0; s < numSlimes; s++) {
                    this.spawnSlimeCompanion(player, false, intVal);
                }
                if (hasBigBoss) {
                    this.spawnSlimeCompanion(player, true, intVal);
                }

                const label = hasBigBoss ? '👑 SUMMONED 2 SLIMES + BIG BOSS SLIME!' : `✨ SUMMONED ${numSlimes} ALLIED SLIME(S)!`;
                this.engine.spawnGroundShockwave(player.pos, 0x00e5ff, 6.0);
                this.spawnFloatingDamage(player.pos, label, true, true);
                if (this.audio) this.audio.playSfx('splash');
                this.damageMonstersInRadius(player, player.pos, 6.0, intVal * 1.5, monsters, onMonsterKilled);
            } else {
                // Enhance! (Lv.50, 100s CD): 4x AoE Earthquake
                this.engine.addScreenshake(1.0);
                this.engine.spawnGroundShockwave(player.pos, 0x2196f3, 9.5);
                this.damageMonstersInRadius(player, player.pos, 9.5, Math.max(atkVal * 4.0, intVal * 5.0), monsters, onMonsterKilled);
                if (this.audio) this.audio.playSfx('bump');
            }
        } else if (pClass === 'Ice Master') {
            const isSplash = player.level >= 75; // Ice Splash Lv.75 makes skills AoE
            if (skillSlot === 1) {
                // Icicle Spear (Lv.1, 25s CD): 2x MATK + Freeze + Giant Ice Burst
                if (this.audio) this.audio.playSfx('lightning');
                const impactPos = player.pos.clone().add(playerForward.clone().multiplyScalar(4.5));
                this.engine.spawnGroundShockwave(impactPos, 0x00e5ff, isSplash ? 7.5 : 4.5);
                this.engine.spawnHitSparks(impactPos, 0x80d8ff, 30);
                this.spawnFloatingDamage(impactPos, '❄️ ICICLE SPEAR!', true);
                this.damageMonstersInRadius(player, impactPos, isSplash ? 7.5 : 4.5, intVal * 2.5, monsters, onMonsterKilled, true);
            } else {
                // Icicle Storm (Lv.50, 100s CD): 3 Icicles AoE + Freeze
                this.engine.addScreenshake(0.95);
                this.engine.spawnGroundShockwave(player.pos, 0x00e5ff, 9.0);
                this.engine.spawnHitSparks(player.pos, 0x80d8ff, 45);
                if (this.audio) this.audio.playSfx('splash');
                this.spawnFloatingDamage(player.pos, '❄️ ICICLE STORM (FROZEN)!', true);
                this.damageMonstersInRadius(player, player.pos, 9.0, intVal * 5.0, monsters, onMonsterKilled, true);
            }
        } else if (pClass === 'Sniper') {
            if (skillSlot === 1) {
                // Silver Bullet (Lv.25, 5s CD): 2x ATK
                if (this.audio) this.audio.playSfx('gunshot');
                this.engine.spawnSlashArc(player.pos, player.rotY, 0xffffff, 4.0);
                this.spawnFloatingDamage(player.pos, '⚡ SILVER BULLET!', true);
                this.damageMonstersInCone(player, player.pos, playerForward, 20.0, atkVal * 2.2, monsters, onMonsterKilled);
            } else {
                // Killshot (Lv.50, 50s CD): 4x ATK
                this.engine.addScreenshake(0.85);
                if (this.audio) this.audio.playSfx('gunshot');
                this.spawnFloatingDamage(player.pos, '🎯 KILLSHOT!', true);
                this.damageMonstersInCone(player, player.pos, playerForward, 24.0, atkVal * 4.5, monsters, onMonsterKilled);
            }
        } else if (pClass === 'Explosives Expert') {
            if (skillSlot === 1) {
                // Molotov (Lv.1, 12s CD; Improved Oil Lv.25 increases duration) — Persistent Burning Fire Zone!
                if (this.audio) this.audio.playSfx('bump');
                const firePos = player.pos.clone().add(playerForward.clone().multiplyScalar(5.0));
                const dur = player.level >= 25 ? 6.5 : 4.5;
                this.spawnMolotovFireZone(firePos, atkVal, dur);
                this.spawnFloatingDamage(firePos, '🔥 MOLOTOV COCKTAIL (BURNING)!', true, true);
            } else {
                // Go Boom! (Lv.50, 30s CD; Big Explosion Lv.75 increases AoE)
                const radius = player.level >= 75 ? 11.0 : 8.0;
                this.engine.addScreenshake(1.1);
                const bombPos = player.pos.clone().add(playerForward.clone().multiplyScalar(5));
                this.engine.spawnGroundShockwave(bombPos, 0xff1744, radius);
                this.engine.spawnHitSparks(bombPos, 0xff3d00, 40);
                if (this.audio) this.audio.playSfx('gunshot');
                this.spawnFloatingDamage(bombPos, '💣 GO BOOM!', true);
                this.damageMonstersInRadius(player, bombPos, radius, atkVal * 5.0, monsters, onMonsterKilled);
            }
        } else if (pClass === 'Phantom Striker') {
            if (skillSlot === 1) {
                // Shadow Step (Lv.1, 5s CD): Blink 8 units forward
                if (this.audio) this.audio.playSfx('slash');
                const targetPos = player.pos.clone().add(playerForward.clone().multiplyScalar(7.5));
                if (Math.hypot(targetPos.x, targetPos.z) < 46) {
                    player.pos.copy(targetPos);
                }
                this.engine.spawnHitSparks(player.pos, 0x00e5ff, 22);
                this.spawnFloatingDamage(player.pos, '💨 SHADOW STEP!', false, true);
            } else {
                // Blink Stab (Lv.50, 30s CD): Blink to nearest enemy and stab for 2x ATK
                if (this.audio) this.audio.playSfx('slash');
                const target = this.findTarget(player.pos, player.rotY, monsters, 16);
                if (target) {
                    player.pos.copy(target.group.position).sub(playerForward.clone().multiplyScalar(1.4));
                }
                this.engine.spawnSlashArc(player.pos, player.rotY, 0x00e5ff, 3.5);
                this.damageMonstersInRadius(player, player.pos, 5.0, atkVal * 3.0, monsters, onMonsterKilled);
            }
        } else if (pClass === 'Ninja Assassin') {
            if (skillSlot === 1) {
                // Smoke Bomb (Lv.1, 10s CD): Enemies miss 75% of attacks for 10s
                player.smokeBombActive = true;
                setTimeout(() => { player.smokeBombActive = false; }, 10000);
                this.engine.spawnGroundShockwave(player.pos, 0xb388ff, 6.0);
                this.spawnFloatingDamage(player.pos, '💨 SMOKE BOMB (75% EVADE)!', false, true);
                if (this.audio) this.audio.playSfx('bump');
            } else {
                // Shadow Copy (Lv.50, 50s CD): 200% stat clone for 10s
                player.shadowCloneActive = true;
                setTimeout(() => { player.shadowCloneActive = false; }, 10000);
                this.engine.spawnLevelUpVFX(player.pos);
                this.spawnFloatingDamage(player.pos, '👥 SHADOW COPY (2x DMG)!', true, true);
                if (this.audio) this.audio.playSfx('lightning');
            }
        } else if (pClass === 'Tech Genius') {
            if (skillSlot === 1) {
                // Gamma Shield (Lv.25, 100s CD): Shields party for 100% INT
                player.shieldHp = Math.max(20, intVal);
                player.maxShieldHp = player.shieldHp;
                this.spawnFloatingDamage(player.pos, `🛡️ GAMMA SHIELD (+${player.shieldHp})`, false, true);
                this.engine.spawnGroundShockwave(player.pos, 0x00e5ff, 5.0);
                if (this.audio) this.audio.playSfx('lightning');
                if (window.game && window.game.createPlayerShieldVFX) {
                    window.game.createPlayerShieldVFX();
                }
            } else {
                // Golem Buster (Lv.50, 100s CD): Summons Golem Bot companion + Taunt + AoE blast
                this.engine.addScreenshake(0.95);
                this.engine.spawnGroundShockwave(player.pos, 0x18ffff, 8.5);
                this.spawnFloatingDamage(player.pos, '🤖 GOLEM BUSTER (TAUNT)!', true, true);
                if (this.audio) this.audio.playSfx('lightning');

                // Provoke all monsters within 22 units
                if (monsters) {
                    for (const mob of monsters) {
                        if (mob && mob.isAlive && player.pos.distanceTo(mob.group.position) <= 22) {
                            if (mob.provoke) mob.provoke(player, 10.0);
                        }
                    }
                }

                this.damageMonstersInRadius(player, player.pos, 8.5, intVal * 4.5, monsters, onMonsterKilled);

                // Spawn the actual 3D Golem Buster Minion!
                if (window.game && window.game.spawnGolemBusterMinion) {
                    window.game.spawnGolemBusterMinion();
                }
            }
        }
    }

    damageMonstersInRadius(player, pos, radius, damage, monsters, onMonsterKilled, freeze = false) {
        for (const m of monsters) {
            if (!m.isAlive) continue;
            if (pos.distanceTo(m.group.position) <= radius) {
                const finalDmg = Math.max(1, Math.floor(damage) - (m.def || 0));
                m.takeDamage(finalDmg);
                if (freeze) {
                    m.isFrozen = true;
                    m.freezeTimer = 3.5;
                }
                this.spawnFloatingDamage(m.group.position, finalDmg, true);
                this.registerComboHit(1);
                this.applyOnHitPassives(player, m, finalDmg, onMonsterKilled);
                if (!m.isAlive && onMonsterKilled) onMonsterKilled(m);
            }
        }
    }

    damageMonstersInCone(player, pos, forward, range, damage, monsters, onMonsterKilled) {
        for (const m of monsters) {
            if (!m.isAlive) continue;
            const dist = pos.distanceTo(m.group.position);
            if (dist > range) continue;

            const dir = m.group.position.clone().sub(pos).normalize();
            if (forward.dot(dir) > 0.35) {
                const finalDmg = Math.max(1, Math.floor(damage) - (m.def || 0));
                m.takeDamage(finalDmg);
                this.spawnFloatingDamage(m.group.position, finalDmg, true);
                this.registerComboHit(1);
                this.applyOnHitPassives(player, m, finalDmg, onMonsterKilled);
                if (!m.isAlive && onMonsterKilled) onMonsterKilled(m);
            }
        }
    }

    spawnFloatingDamage(pos, text, isCrit = false, isHeal = false) {
        const el = document.createElement('div');
        el.className = 'floating-damage';
        if (isCrit) el.classList.add('damage-crit');
        if (isHeal) el.classList.add('damage-heal');
        el.textContent = (isCrit && typeof text === 'number') ? `💥 CRIT! ${text}` : text;

        const screenPos = pos.clone().add(new THREE.Vector3(0, 1.8 + Math.random() * 0.3, 0));
        screenPos.project(this.engine.camera);

        // Don't show if behind the camera
        if (screenPos.z > 1.0) return;

        const jitterX = (Math.random() - 0.5) * 36;
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth + jitterX;
        const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;

        document.body.appendChild(el);

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 950);
    }

    registerComboHit(hits = 1) {
        this.comboCount += hits;
        this.comboResetTimer = 2.5;

        if (this.comboContainer && this.comboCountEl) {
            this.comboContainer.style.display = 'flex';
            this.comboCountEl.textContent = `${this.comboCount}`;

            if (this.comboTextEl) {
                if (this.comboCount >= 20) this.comboTextEl.textContent = 'GODLIKE!';
                else if (this.comboCount >= 10) this.comboTextEl.textContent = 'FANTASTIC!';
                else if (this.comboCount >= 5) this.comboTextEl.textContent = 'GREAT COMBO!';
                else this.comboTextEl.textContent = 'HITS';
            }
        }
    }

    // 🐾 SUMMON SLIME: Active 3D Slime Minion Factory
    spawnSlimeCompanion(player, isBoss = false, intVal = 10) {
        const group = new THREE.Group();
        const scale = isBoss ? 1.6 : 0.85;
        const color = isBoss ? 0xffd700 : 0x00e5ff;
        const emissive = isBoss ? 0xff9800 : 0x00b0ff;

        // Slime body
        const geo = new THREE.SphereGeometry(0.5 * scale, 16, 14);
        geo.scale(1.0, 0.78, 1.0);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 0.9,
            roughness: 0.18,
            metalness: 0.2,
            transparent: true,
            opacity: 0.92
        });
        const body = new THREE.Mesh(geo, mat);
        body.position.y = 0.38 * scale;
        body.castShadow = true;
        group.add(body);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.14 * scale, 0.44 * scale, 0.38 * scale);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.14 * scale, 0.44 * scale, 0.38 * scale);
        group.add(leftEye, rightEye);

        // Crown on Boss Slime
        if (isBoss) {
            const crownGeo = new THREE.ConeGeometry(0.18, 0.28, 5);
            const crownMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
            const crown = new THREE.Mesh(crownGeo, crownMat);
            crown.position.set(0, 0.85 * scale, 0);
            group.add(crown);
        }

        const angle = Math.random() * Math.PI * 2;
        group.position.set(
            player.pos.x + Math.sin(angle) * (1.8 + Math.random()),
            0,
            player.pos.z + Math.cos(angle) * (1.8 + Math.random())
        );

        this.engine.scene.add(group);
        this.engine.spawnHitSparks(group.position, color, 14);

        const minion = {
            group: group,
            isBoss: isBoss,
            intVal: intVal,
            lifeTimer: 35.0,
            attackCooldown: 0.8,
            hopTime: Math.random() * 5
        };

        this.alliedMinions.push(minion);
        return minion;
    }

    spawnGolemBuster(player, intVal = 10, matk = 50) {
        const group = new THREE.Group();
        const scale = 1.15;

        // Dark metallic chassis
        const chassisMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.85,
            roughness: 0.35,
            emissive: 0x0f172a
        });
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        // Heavy Torso
        const torsoGeo = new THREE.BoxGeometry(0.85 * scale, 0.75 * scale, 0.55 * scale);
        const torso = new THREE.Mesh(torsoGeo, chassisMat);
        torso.position.y = 0.82 * scale;
        torso.castShadow = true;
        group.add(torso);

        // Core Reactor Glow on chest
        const reactorGeo = new THREE.CylinderGeometry(0.16 * scale, 0.16 * scale, 0.12 * scale, 16);
        reactorGeo.rotateX(Math.PI / 2);
        const reactor = new THREE.Mesh(reactorGeo, glowMat);
        reactor.position.set(0, 0.82 * scale, 0.28 * scale);
        group.add(reactor);

        // Head with glowing cyan visor
        const headGeo = new THREE.BoxGeometry(0.48 * scale, 0.35 * scale, 0.42 * scale);
        const head = new THREE.Mesh(headGeo, chassisMat);
        head.position.set(0, 1.30 * scale, 0.05 * scale);
        group.add(head);

        const visorGeo = new THREE.BoxGeometry(0.38 * scale, 0.10 * scale, 0.08 * scale);
        const visor = new THREE.Mesh(visorGeo, glowMat);
        visor.position.set(0, 1.30 * scale, 0.25 * scale);
        group.add(visor);

        // Heavy arms
        const armGeo = new THREE.BoxGeometry(0.30 * scale, 0.80 * scale, 0.32 * scale);
        const leftArm = new THREE.Mesh(armGeo, chassisMat);
        leftArm.position.set(-0.62 * scale, 0.72 * scale, 0);
        const rightArm = new THREE.Mesh(armGeo, chassisMat);
        rightArm.position.set(0.62 * scale, 0.72 * scale, 0);
        group.add(leftArm, rightArm);

        // Heavy Legs
        const legGeo = new THREE.BoxGeometry(0.32 * scale, 0.55 * scale, 0.36 * scale);
        const leftLeg = new THREE.Mesh(legGeo, chassisMat);
        leftLeg.position.set(-0.24 * scale, 0.28 * scale, 0);
        const rightLeg = new THREE.Mesh(legGeo, chassisMat);
        rightLeg.position.set(0.24 * scale, 0.28 * scale, 0);
        group.add(leftLeg, rightLeg);

        const angle = Math.random() * Math.PI * 2;
        group.position.set(
            player.pos.x + Math.sin(angle) * 2.2,
            0,
            player.pos.z + Math.cos(angle) * 2.2
        );

        this.engine.scene.add(group);
        this.engine.spawnHitSparks(group.position, 0x00e5ff, 20);
        this.engine.spawnGroundShockwave(group.position, 0x00e5ff, 4.0);

        const minion = {
            group: group,
            isGolemBuster: true,
            isBoss: true,
            intVal: intVal,
            matk: matk,
            hp: intVal * 10,
            maxHp: intVal * 10,
            lifeTimer: 75.0,
            attackCooldown: 0.6,
            hopTime: 0
        };

        this.alliedMinions.push(minion);
        return minion;
    }

    updateAlliedMinions(delta, player, monsters, onMonsterKilled) {
        if (!this.alliedMinions || this.alliedMinions.length === 0) return;

        for (let i = this.alliedMinions.length - 1; i >= 0; i--) {
            const m = this.alliedMinions[i];
            m.lifeTimer -= delta;
            m.hopTime += delta * 6;
            m.attackCooldown = Math.max(0, m.attackCooldown - delta);

            if (m.lifeTimer <= 0) {
                this.engine.spawnHitSparks(m.group.position, 0x00e5ff, 12);
                this.engine.scene.remove(m.group);
                this.alliedMinions.splice(i, 1);
                continue;
            }

            let target = null;
            let minDist = 18.0;
            if (monsters && monsters.length > 0) {
                for (const mob of monsters) {
                    if (!mob.isAlive) continue;
                    const d = m.group.position.distanceTo(mob.group.position);
                    if (d < minDist) {
                        minDist = d;
                        target = mob;
                    }
                }
            }

            const hopY = m.isGolemBuster ? 0 : Math.abs(Math.sin(m.hopTime)) * 0.42;

            if (target) {
                const dir = target.group.position.clone().sub(m.group.position);
                dir.y = 0;
                const dist = dir.length();
                if (dist > 2.0) {
                    dir.normalize();
                    const walkSpeed = m.isGolemBuster ? 5.2 : 4.5;
                    m.group.position.add(dir.multiplyScalar(walkSpeed * delta));
                    m.group.rotation.y = Math.atan2(dir.x, dir.z);
                }
                m.group.position.y = hopY;

                if (dist <= 2.8 && m.attackCooldown <= 0) {
                    m.attackCooldown = m.isGolemBuster ? 1.5 : 1.1;
                    let dmg = 0;
                    if (m.isGolemBuster) {
                        const rawDmg = Math.floor(m.matk || (m.intVal * 2.5));
                        dmg = Math.max(1, rawDmg - (target.def || 0));
                        target.takeDamage(dmg);
                        if (target.provoke) target.provoke(m, 10.0);
                        this.engine.spawnHitSparks(target.group.position, 0x00e5ff, 20);
                        this.engine.spawnGroundShockwave(target.group.position, 0x00e5ff, 3.2);
                        this.spawnFloatingDamage(target.group.position, `🤖 BUSTER SLAM: ${dmg}`, true, true);
                    } else {
                        const mult = m.isBoss ? 3.0 : 1.5;
                        const rawDmg = Math.floor(m.intVal * mult);
                        dmg = Math.max(1, rawDmg - (target.def || 0));
                        target.takeDamage(dmg);
                        if (target.provoke && (!target.provokeTimer || target.provokeTimer <= 0)) {
                            target.provoke(m, m.isBoss ? 8.0 : 4.0);
                        }
                        this.engine.spawnHitSparks(target.group.position, m.isBoss ? 0xffd700 : 0x00e5ff, 14);
                        this.spawnFloatingDamage(target.group.position, `💧 SLIME: ${dmg}`, m.isBoss);
                    }
                    this.registerComboHit(1);
                    if (!target.isAlive && onMonsterKilled) {
                        onMonsterKilled(target);
                    }
                }
            } else if (player && player.pos) {
                const pDist = m.group.position.distanceTo(player.pos);
                if (pDist > 3.0) {
                    const pDir = player.pos.clone().sub(m.group.position);
                    pDir.y = 0;
                    pDir.normalize();
                    m.group.position.add(pDir.multiplyScalar(5.5 * delta));
                    m.group.rotation.y = Math.atan2(pDir.x, pDir.z);
                }
                m.group.position.y = hopY;
            }
        }
    }

    // 🔥 MOLOTOV: Persistent AoE Burning Fire Zone
    spawnMolotovFireZone(firePos, atkVal, durationSec = 5.0) {
        const ringGeo = new THREE.RingGeometry(0.3, 5.0, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff5722,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.65
        });
        const firePatch = new THREE.Mesh(ringGeo, ringMat);
        firePatch.position.copy(firePos);
        firePatch.position.y = 0.05;

        const fireLight = new THREE.PointLight(0xff5722, 3.5, 7.5);
        fireLight.position.copy(firePos);
        fireLight.position.y = 1.0;
        firePatch.add(fireLight);

        this.engine.scene.add(firePatch);
        this.engine.spawnGroundShockwave(firePos, 0xff3d00, 5.5);
        this.engine.spawnHitSparks(firePos, 0xff5722, 25);

        this.fireZones.push({
            mesh: firePatch,
            light: fireLight,
            pos: firePos.clone(),
            radius: 5.5,
            atkVal: atkVal,
            lifeTimer: durationSec,
            tickTimer: 0.4
        });
    }

    updateFireZones(delta, player, monsters, onMonsterKilled) {
        if (!this.fireZones || this.fireZones.length === 0) return;

        for (let i = this.fireZones.length - 1; i >= 0; i--) {
            const f = this.fireZones[i];
            f.lifeTimer -= delta;
            f.tickTimer -= delta;

            f.light.intensity = 2.5 + Math.random() * 2.0;
            f.mesh.rotation.y += delta * 0.5;

            if (Math.random() < 0.45) {
                const ox = (Math.random() - 0.5) * f.radius * 1.2;
                const oz = (Math.random() - 0.5) * f.radius * 1.2;
                this.engine.spawnHitSparks(f.pos.clone().add(new THREE.Vector3(ox, 0.4, oz)), 0xff5722, 4);
            }

            if (f.tickTimer <= 0) {
                f.tickTimer = 0.65;
                if (monsters) {
                    for (const m of monsters) {
                        if (!m.isAlive) continue;
                        if (f.pos.distanceTo(m.group.position) <= f.radius) {
                            const burnDmg = Math.max(2, Math.floor(f.atkVal * 0.95));
                            m.takeDamage(burnDmg);
                            this.engine.spawnHitSparks(m.group.position, 0xff5722, 6);
                            this.spawnFloatingDamage(m.group.position, `🔥 ${burnDmg}`, true);
                            this.registerComboHit(1);
                            if (!m.isAlive && onMonsterKilled) {
                                onMonsterKilled(m);
                            }
                        }
                    }
                }
            }

            if (f.lifeTimer <= 0) {
                this.engine.scene.remove(f.mesh);
                this.fireZones.splice(i, 1);
            }
        }
    }

    update(delta, player = null, monsters = [], onMonsterKilled = null) {
        for (const k in this.cooldowns) {
            if (this.cooldowns[k] > 0) {
                this.cooldowns[k] = Math.max(0, this.cooldowns[k] - delta);
            }
        }

        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= delta;
            if (this.comboResetTimer <= 0) {
                this.comboCount = 0;
                if (this.comboContainer) this.comboContainer.style.display = 'none';
            }
        }

        // Update Active 3D Allied Minions
        this.updateAlliedMinions(delta, player, monsters, onMonsterKilled);

        // Update Persistent Fire Zones
        this.updateFireZones(delta, player, monsters, onMonsterKilled);

        this.updateTargetReticle();
    }
}
