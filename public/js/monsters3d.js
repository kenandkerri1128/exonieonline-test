// ============================================================================
// EXONIE 3D REMASTERED — CIRCUIT SIEGE PROCEDURAL 3D MONSTER FACTORY & AI
// Featuring Attractive 3D Glowing Borders (2D cssColor & cssBorder),
// Bevelled Armor Plates, Multi-Jointed Wings/Limbs & Damped Animations
// ============================================================================
import * as THREE from 'three';
import { MONSTER_DATABASE } from './game_data.js';
import { chamferBox, getCharacterBlobShadowTex } from './character3d.js';

function parseCssColor(str, fallback = 0x00e5ff) {
    if (!str || str === 'none') return new THREE.Color(fallback);
    const hexMatch = String(str).match(/#[0-9a-fA-F]{6}/);
    if (hexMatch) return new THREE.Color(hexMatch[0]);
    const rgbMatch = String(str).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) {
        return new THREE.Color(
            Number(rgbMatch[1]) / 255,
            Number(rgbMatch[2]) / 255,
            Number(rgbMatch[3]) / 255
        );
    }
    try {
        return new THREE.Color(str);
    } catch (e) {
        return new THREE.Color(fallback);
    }
}

export class Monster3D {
    constructor(arg1, arg2, arg3, arg4, arg5) {
        if (typeof arg1 === 'object' && arg1 !== null) {
            // Signature 1: new Monster3D(spawnData, positionVec3)
            const sp = arg1;
            const posVec = arg2 || sp.position || new THREE.Vector3(0, 0, 0);
            this.id = sp.id || `mob_${Math.random().toString(36).slice(2, 8)}`;
            this.dbKey = sp.monsterKey || sp.dbKey || 'common_mobs1';
            this.originalKey = sp.originalKey || sp.monsterKey || this.dbKey;
            this.monsterKey = this.dbKey;
            this.template = MONSTER_DATABASE[this.dbKey] || MONSTER_DATABASE.common_mobs1;

            this.level = sp.level || this.template.level || 5;
            const levelScale = Math.max(0.5, this.level / (this.template.level || 5));

            this.name = sp.name || this.template.name;
            this.category = sp.category || this.template.category || 'common_mobs';
            this.type = this.category === 'floor_boss' ? 'floor_boss' : (this.category === 'mini_boss' ? 'mini_boss' : 'common');

            this.maxHp = sp.maxHp || Math.floor(this.template.maxHp * levelScale);
            this.hp = this.maxHp;
            this.atk = sp.atk || Math.floor(this.template.atk * levelScale);
            this.def = sp.def !== undefined ? sp.def : Math.floor(this.template.def * levelScale);
            this.speed = sp.speed || this.template.speed || 2.5;
            this.expYield = sp.expYield || Math.floor(this.template.expYield * levelScale);
            this.goldYield = sp.goldYield || Math.floor(this.template.goldYield * levelScale);
            this.cssColor = sp.cssColor || this.template.cssColor || '#ff69b4';
            this.cssBorder = sp.cssBorder || this.template.cssBorder || 'none';
            this.spawnPos = new THREE.Vector3(posVec.x || 0, 0, posVec.z || 0);
            this.isTavernBoss = !!sp.isTavernBoss;
            this.isNeutralBoss = !!sp.isNeutralBoss;
            this.isBattlefieldBoss = !!sp.isBattlefieldBoss;
            this.noRespawn = !!sp.noRespawn;
            this.customRespawnDelay = sp.respawnDelay || 0;
        } else {
            // Signature 2: new Monster3D(id, dbKey, targetLevel, x, z)
            this.id = arg1;
            this.dbKey = arg2 || 'common_mobs1';
            this.monsterKey = this.dbKey;
            this.template = MONSTER_DATABASE[this.dbKey] || MONSTER_DATABASE.common_mobs1;

            this.level = arg3 || this.template.level || 5;
            const levelScale = Math.max(0.5, this.level / (this.template.level || 5));

            this.name = this.template.name;
            this.category = this.template.category || 'common_mobs';
            this.type = this.category === 'floor_boss' ? 'floor_boss' : (this.category === 'mini_boss' ? 'mini_boss' : 'common');

            this.maxHp = Math.floor(this.template.maxHp * levelScale);
            this.hp = this.maxHp;
            this.atk = Math.floor(this.template.atk * levelScale);
            this.def = Math.floor(this.template.def * levelScale);
            this.speed = this.template.speed || 2.5;
            this.expYield = Math.floor(this.template.expYield * levelScale);
            this.goldYield = Math.floor(this.template.goldYield * levelScale);
            this.cssColor = this.template.cssColor || '#ff69b4';
            this.cssBorder = this.template.cssBorder || 'none';
            this.spawnPos = new THREE.Vector3(arg4 || 0, 0, arg5 || 0);
            this.isTavernBoss = false;
            this.isNeutralBoss = false;
            this.isBattlefieldBoss = false;
            this.noRespawn = false;
            this.customRespawnDelay = 0;
        }

        this.scaleFactor = this.type === 'floor_boss' ? 1.85 : (this.type === 'mini_boss' ? 1.35 : 0.95);
        this.pos = this.spawnPos.clone();

        this.group = new THREE.Group();
        this.group.position.copy(this.pos);
        this.bodyGroup = new THREE.Group();
        this.group.add(this.bodyGroup);

        this.parts = {};
        this.animTime = Math.random() * 10;
        this.attackAnimTimer = 0;

        this.state = 'idle'; // idle, chase, attack, dead

        // Monster Subtypes & Classification (Authoritative 2D Exonie recognition)
        const keyLower = String(this.dbKey || '').toLowerCase();
        const origLower = String(this.originalKey || '').toLowerCase();
        const nameLower = String(this.name || '').toLowerCase();
        const catLower = String(this.category || '').toLowerCase();

        this.isRanged = keyLower.includes('mobs3') || keyLower.includes('boss3') || keyLower.includes('wraith') || keyLower.includes('dragon') || keyLower.includes('bat') || keyLower.includes('mobs2') || keyLower.includes('boss2');
        this.isGolem = keyLower.includes('golem') || nameLower.includes('golem') || nameLower.includes('behemoth') || nameLower.includes('titan');
        this.isSlime = keyLower.includes('slime') || keyLower.includes('mobs1') || keyLower.includes('boss1') || nameLower.includes('slime');
        this.isWraith = keyLower.includes('wraith') || origLower.includes('wraith') || nameLower.includes('wraith') || nameLower.includes('void') || nameLower.includes('reaper');
        this.isMinotaur = keyLower.includes('minotaur') || origLower.includes('minotaur') || nameLower.includes('minotaur') || nameLower.includes('gorehorn') || nameLower.includes('asterion');
        this.isDragon = keyLower.includes('dragon') || origLower.includes('dragon') || nameLower.includes('dragon') || nameLower.includes('drake') || nameLower.includes('ignis');
        this.isBoss = this.type === 'mini_boss' || this.type === 'floor_boss' || catLower === 'mini_boss' || catLower === 'floor_boss' || keyLower.includes('mini_boss') || keyLower.includes('floor_boss') || this.isTavernBoss || this.isNeutralBoss || this.isBattlefieldBoss;

        // Aggro & Attack Range (Significantly expanded per user request, especially ranged mobs)
        if (this.isRanged) {
            this.aggroRange = this.type === 'floor_boss' ? 48.0 : (this.type === 'mini_boss' ? 38.0 : 30.0);
            this.attackRange = this.type === 'floor_boss' ? 18.0 : (this.type === 'mini_boss' ? 14.0 : 10.0);
        } else {
            this.aggroRange = this.type === 'floor_boss' ? 44.0 : (this.type === 'mini_boss' ? 30.0 : 22.0);
            this.attackRange = 2.4 + this.scaleFactor * 0.85;
        }

        this.attackCooldown = 0;
        this.respawnTimer = 0;
        this.hitFlashTimer = 0;

        // Skills Cooldowns
        this.earthquakeCooldown = 6.0 + Math.random() * 5.0;
        this.voidBlinkCooldown = 5.0 + Math.random() * 5.0;

        this.isFrozen = false;
        this.freezeTimer = 0;
        this.bleedTimer = 0;
        this.bleedDamage = 0;
        this.bleedTickTimer = 0;

        // Minotaur Charge Dash State (The ONLY place in the game that plays charge.mp3!)
        this.isMinotaur = this.dbKey.includes('minotaur');
        this.chargeCooldown = 4.0 + Math.random() * 3.0;
        this.chargeTimer = 0;
        this.chargeDir = new THREE.Vector3();

        // 🛡️ Provoke & Aggro System (Berserker Callout, Slimes, Golems)
        this.provokeTarget = null;
        this.provokeTimer = 0;

        this.buildMesh();
        this.ensureOverheadUI();
        this.updateOverheadUI();
    }

    getAttackSfx() {
        if (this.dbKey.includes('mobs2') || this.dbKey.includes('boss2')) return 'lightning';
        if (this.dbKey.includes('mobs3') || this.dbKey.includes('boss3') || this.dbKey.includes('dragon')) return 'splash';
        return 'bump';
    }

    get isAlive() {
        return this.state !== 'dead' && this.hp > 0;
    }

    get attackPower() {
        return Number(this.atk) || 10;
    }

    addBorderShell(mesh, borderMat, thickness = 1.075) {
        const shell = new THREE.Mesh(mesh.geometry, borderMat);
        shell.position.copy(mesh.position);
        shell.rotation.copy(mesh.rotation);
        shell.scale.copy(mesh.scale).multiplyScalar(thickness);
        if (mesh.parent) {
            mesh.parent.add(shell);
        }
        return shell;
    }

    buildMesh() {
        while (this.bodyGroup.children.length > 0) {
            this.bodyGroup.remove(this.bodyGroup.children[0]);
        }
        this.parts = {};

        const primaryColor = parseCssColor(this.cssColor, 0xff69b4);
        // Ensure every monster has a vivid, attractive border color even if 2D cssBorder is 'none'
        let fallbackBorder = 0x00e5ff;
        if (this.dbKey.includes('mobs2') || this.dbKey.includes('boss2')) fallbackBorder = 0xd500f9;
        else if (this.dbKey.includes('mobs3') || this.dbKey === 'mini_boss3') fallbackBorder = 0xffea00;
        else if (this.dbKey === 'floor_boss3') fallbackBorder = 0xff9800;

        const borderColor = parseCssColor(this.cssBorder, fallbackBorder);

        const mainMat = new THREE.MeshStandardMaterial({
            color: primaryColor,
            roughness: 0.28,
            metalness: 0.42
        });
        const darkArmorMat = new THREE.MeshStandardMaterial({
            color: primaryColor.clone().multiplyScalar(0.45),
            roughness: 0.35,
            metalness: 0.78
        });
        const borderGlowMat = new THREE.MeshStandardMaterial({
            color: borderColor,
            emissive: borderColor,
            emissiveIntensity: 1.85,
            roughness: 0.18,
            metalness: 0.5
        });
        const outlineShellMat = new THREE.MeshBasicMaterial({
            color: borderColor,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.72
        });
        const eyeMat = new THREE.MeshBasicMaterial({
            color: this.type === 'floor_boss' ? 0xff1744 : 0xffea00
        });

        this.mainMat = mainMat;
        this.borderGlowMat = borderGlowMat;
        this.outlineShellMat = outlineShellMat;
        this.originalColor = primaryColor.clone();

        // Contact Blob Shadow
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2.1 * this.scaleFactor, 2.1 * this.scaleFactor),
            new THREE.MeshBasicMaterial({
                map: getCharacterBlobShadowTex(),
                transparent: true,
                depthWrite: false
            })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.02;
        this.bodyGroup.add(shadowPlane);

        // Glowing Ground Border Ring
        const ringRadius = 0.85 * this.scaleFactor;
        const groundRing = new THREE.Mesh(
            new THREE.RingGeometry(ringRadius * 0.84, ringRadius, 32),
            new THREE.MeshBasicMaterial({
                color: borderColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: this.type === 'common' ? 0.58 : 0.88
            })
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = 0.035;
        this.bodyGroup.add(groundRing);
        this.parts.groundRing = groundRing;

        if (this.type !== 'common') {
            const outerRing = new THREE.Mesh(
                new THREE.RingGeometry(ringRadius * 1.12, ringRadius * 1.22, 6),
                new THREE.MeshBasicMaterial({
                    color: primaryColor,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.65
                })
            );
            outerRing.rotation.x = -Math.PI / 2;
            outerRing.position.y = 0.03;
            this.bodyGroup.add(outerRing);
            this.parts.outerRing = outerRing;
        }

        if (this.dbKey.includes('mobs1') || this.dbKey.includes('boss1') || this.dbKey.includes('golden')) {
            this.buildSlime(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('mobs2') || this.dbKey.includes('boss2')) {
            this.buildBat(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('mobs3') || this.dbKey.includes('boss3')) {
            this.buildFireElemental(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('golem')) {
            this.buildGolem(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('wraith')) {
            this.buildWraith(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('minotaur')) {
            this.buildMinotaur(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else if (this.dbKey.includes('dragon')) {
            this.buildDragon(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        } else {
            this.buildSlime(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat);
        }

        this.bodyGroup.scale.setScalar(this.scaleFactor);
    }

    buildSlime(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const slimeRoot = new THREE.Group();
        this.bodyGroup.add(slimeRoot);
        this.parts.slimeRoot = slimeRoot;

        mainMat.transparent = true;
        mainMat.opacity = 0.84;
        mainMat.roughness = 0.10;
        mainMat.metalness = 0.18;

        const domeGeo = new THREE.SphereGeometry(0.88, 28, 22);
        domeGeo.scale(1.08, 0.86, 1.08);
        const dome = new THREE.Mesh(domeGeo, mainMat);
        dome.position.y = 0.72;
        dome.castShadow = true;
        slimeRoot.add(dome);
        this.addBorderShell(dome, outlineShellMat, 1.075);

        const rimBelt = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.035, 10, 32), borderGlowMat);
        rimBelt.rotation.x = Math.PI / 2;
        rimBelt.position.y = 0.42;
        slimeRoot.add(rimBelt);

        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), borderGlowMat);
        core.position.y = 0.72;
        slimeRoot.add(core);
        this.parts.core = core;

        for (let i = 0; i < 5; i++) {
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 2) * 0.04, 10, 10), borderGlowMat);
            const ang = (i / 5) * Math.PI * 2;
            b.position.set(Math.cos(ang) * 0.46, 0.55 + (i % 3) * 0.18, Math.sin(ang) * 0.46);
            slimeRoot.add(b);
        }

        const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-1, 1].forEach(s => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 14), eyeMat);
            eye.scale.set(1.0, 1.2, 0.6);
            eye.position.set(s * 0.28, 0.82, 0.82);
            slimeRoot.add(eye);

            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), whiteMat);
            pupil.position.set(s * 0.28 + 0.03, 0.86, 0.88);
            slimeRoot.add(pupil);
        });

        if (this.dbKey === 'mini_boss1') {
            [-1, 1].forEach(s => {
                const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 8), whiteMat);
                tusk.position.set(s * 0.28, 0.52, 0.88);
                tusk.rotation.x = 0.38;
                slimeRoot.add(tusk);
            });
            const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 0.26, 8), darkArmorMat);
            helm.position.y = 1.42;
            slimeRoot.add(helm);
            this.addBorderShell(helm, outlineShellMat, 1.08);
        }

        if (this.dbKey === 'floor_boss1' || this.dbKey.includes('golden')) {
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.30, 8, 1, true), borderGlowMat);
            crown.position.y = 1.52;
            slimeRoot.add(crown);

            if (this.dbKey === 'floor_boss1') {
                [-1, 1].forEach(s => {
                    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.62, 8), borderGlowMat);
                    horn.position.set(s * 0.45, 1.52, 0);
                    horn.rotation.z = s * -0.45;
                    slimeRoot.add(horn);

                    const wingPivot = new THREE.Group();
                    wingPivot.position.set(s * 0.82, 0.95, -0.15);
                    const wingBlade = new THREE.Mesh(chamferBox(0.75, 0.48, 0.06, 0.02), borderGlowMat);
                    wingBlade.position.x = s * 0.38;
                    wingPivot.add(wingBlade);
                    slimeRoot.add(wingPivot);
                    this.parts[s < 0 ? 'lWing' : 'rWing'] = wingPivot;
                });
            }
        }
    }

    buildBat(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const hoverRoot = new THREE.Group();
        hoverRoot.position.y = 1.75;
        this.bodyGroup.add(hoverRoot);
        this.parts.hoverRoot = hoverRoot;

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 18), mainMat);
        body.scale.set(0.95, 1.15, 0.90);
        body.castShadow = true;
        hoverRoot.add(body);
        this.addBorderShell(body, outlineShellMat, 1.08);

        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), borderGlowMat);
        crest.position.set(0, 0.05, 0.45);
        crest.scale.set(1.2, 1.4, 0.5);
        hoverRoot.add(crest);

        const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-1, 1].forEach(s => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.56, 6), mainMat);
            ear.position.set(s * 0.28, 0.68, 0.05);
            ear.rotation.z = s * -0.26;
            hoverRoot.add(ear);
            this.addBorderShell(ear, outlineShellMat, 1.10);

            const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.40, 6), borderGlowMat);
            earInner.position.set(s * 0.28, 0.65, 0.10);
            earInner.rotation.z = s * -0.26;
            hoverRoot.add(earInner);

            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), eyeMat);
            eye.position.set(s * 0.20, 0.18, 0.48);
            hoverRoot.add(eye);

            const fang = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.20, 6), fangMat);
            fang.position.set(s * 0.12, -0.10, 0.50);
            fang.rotation.x = Math.PI;
            hoverRoot.add(fang);
        });

        [-1, 1].forEach(s => {
            const innerWing = new THREE.Group();
            innerWing.position.set(s * 0.45, 0.15, 0);
            hoverRoot.add(innerWing);

            const bone1 = new THREE.Mesh(chamferBox(0.85, 0.08, 0.08, 0.02), borderGlowMat);
            bone1.position.set(s * 0.42, 0.18, 0);
            bone1.rotation.z = s * 0.22;
            innerWing.add(bone1);

            const web1 = new THREE.Mesh(chamferBox(0.82, 0.56, 0.04, 0.01), darkArmorMat);
            web1.position.set(s * 0.42, -0.08, -0.02);
            innerWing.add(web1);
            this.addBorderShell(web1, outlineShellMat, 1.06);

            const outerWing = new THREE.Group();
            outerWing.position.set(s * 0.82, 0.12, 0);
            innerWing.add(outerWing);

            const bone2 = new THREE.Mesh(chamferBox(0.90, 0.06, 0.06, 0.015), borderGlowMat);
            bone2.position.set(s * 0.45, 0.05, 0);
            bone2.rotation.z = s * -0.18;
            outerWing.add(bone2);

            const web2 = new THREE.Mesh(chamferBox(0.88, 0.62, 0.035, 0.01), mainMat);
            web2.position.set(s * 0.44, -0.16, -0.02);
            outerWing.add(web2);
            this.addBorderShell(web2, outlineShellMat, 1.06);

            this.parts[s < 0 ? 'lWing' : 'rWing'] = innerWing;
            this.parts[s < 0 ? 'lWingOuter' : 'rWingOuter'] = outerWing;
        });
    }

    buildFireElemental(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const hoverRoot = new THREE.Group();
        hoverRoot.position.y = 1.65;
        this.bodyGroup.add(hoverRoot);
        this.parts.hoverRoot = hoverRoot;

        mainMat.emissive = this.originalColor.clone();
        mainMat.emissiveIntensity = 1.15;

        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), mainMat);
        core.castShadow = true;
        hoverRoot.add(core);
        this.addBorderShell(core, outlineShellMat, 1.09);
        this.parts.core = core;

        [-1, 1].forEach(s => {
            const eye = new THREE.Mesh(chamferBox(0.18, 0.08, 0.08, 0.02), eyeMat);
            eye.position.set(s * 0.22, 0.12, 0.62);
            eye.rotation.z = s * -0.25;
            hoverRoot.add(eye);
        });

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 10, 32), borderGlowMat);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.045, 10, 32), mainMat);
        ring2.rotation.x = Math.PI / 3;
        hoverRoot.add(ring1, ring2);
        this.parts.ring1 = ring1;
        this.parts.ring2 = ring2;

        const shardGroup = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const shard = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.56, 5), i % 2 === 0 ? borderGlowMat : mainMat);
            shard.position.set(Math.cos(angle) * 1.15, (i % 2 === 0 ? 0.2 : -0.2), Math.sin(angle) * 1.15);
            shardGroup.add(shard);
            this.addBorderShell(shard, outlineShellMat, 1.08);
        }
        hoverRoot.add(shardGroup);
        this.parts.shardGroup = shardGroup;
    }

    buildGolem(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        mainMat.roughness = 0.72;
        mainMat.metalness = 0.25;

        const hips = new THREE.Group();
        hips.position.y = 1.05;
        this.bodyGroup.add(hips);
        this.parts.hips = hips;

        const pelvis = new THREE.Mesh(chamferBox(0.95, 0.38, 0.65, 0.06), darkArmorMat);
        hips.add(pelvis);

        const torso = new THREE.Group();
        torso.position.y = 0.20;
        hips.add(torso);
        this.parts.torso = torso;

        const chest = new THREE.Mesh(chamferBox(1.48, 1.25, 0.92, 0.09), mainMat);
        chest.position.y = 0.62;
        chest.castShadow = true;
        torso.add(chest);
        this.addBorderShell(chest, outlineShellMat, 1.06);

        const coreRune = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), borderGlowMat);
        coreRune.position.set(0, 0.68, 0.46);
        torso.add(coreRune);

        const hSeam = new THREE.Mesh(chamferBox(1.52, 0.09, 0.96, 0.02), borderGlowMat);
        hSeam.position.y = 0.68;
        torso.add(hSeam);

        const head = new THREE.Mesh(chamferBox(0.68, 0.62, 0.65, 0.06), mainMat);
        head.position.y = 1.55;
        torso.add(head);
        this.addBorderShell(head, outlineShellMat, 1.07);

        [-1, 1].forEach(s => {
            const eye = new THREE.Mesh(chamferBox(0.18, 0.09, 0.06, 0.01), eyeMat);
            eye.position.set(s * 0.16, 1.58, 0.33);
            torso.add(eye);

            if (this.type !== 'common') {
                const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 5), borderGlowMat);
                crystal.position.set(s * 0.75, 1.42, 0);
                crystal.rotation.z = s * -0.38;
                torso.add(crystal);
            }
        });

        [-1, 1].forEach(s => {
            const arm = new THREE.Group();
            arm.position.set(s * 0.98, 1.08, 0);
            torso.add(arm);

            const pauldron = new THREE.Mesh(chamferBox(0.54, 0.48, 0.54, 0.06), darkArmorMat);
            arm.add(pauldron);
            this.addBorderShell(pauldron, outlineShellMat, 1.07);

            const forearm = new THREE.Mesh(chamferBox(0.50, 0.92, 0.50, 0.06), mainMat);
            forearm.position.y = -0.62;
            forearm.castShadow = true;
            arm.add(forearm);
            this.addBorderShell(forearm, outlineShellMat, 1.06);

            const knuckleBand = new THREE.Mesh(chamferBox(0.54, 0.12, 0.54, 0.02), borderGlowMat);
            knuckleBand.position.y = -0.92;
            arm.add(knuckleBand);

            this.parts[s < 0 ? 'lArm' : 'rArm'] = arm;
        });

        [-1, 1].forEach(s => {
            const leg = new THREE.Group();
            leg.position.set(s * 0.36, -0.10, 0);
            hips.add(leg);

            const pillar = new THREE.Mesh(chamferBox(0.44, 0.92, 0.48, 0.05), mainMat);
            pillar.position.y = -0.45;
            pillar.castShadow = true;
            leg.add(pillar);
            this.addBorderShell(pillar, outlineShellMat, 1.06);

            this.parts[s < 0 ? 'lLeg' : 'rLeg'] = leg;
        });
    }

    buildWraith(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const hoverRoot = new THREE.Group();
        hoverRoot.position.y = 0.35;
        this.bodyGroup.add(hoverRoot);
        this.parts.hoverRoot = hoverRoot;

        mainMat.transparent = true;
        mainMat.opacity = 0.88;

        const cloakGeo = new THREE.ConeGeometry(0.95, 2.35, 16, 1, true);
        const cloak = new THREE.Mesh(cloakGeo, mainMat);
        cloak.position.y = 1.25;
        cloak.castShadow = true;
        hoverRoot.add(cloak);
        this.addBorderShell(cloak, outlineShellMat, 1.06);

        const mantle = new THREE.Mesh(chamferBox(1.15, 0.24, 0.68, 0.05), borderGlowMat);
        mantle.position.y = 2.05;
        hoverRoot.add(mantle);

        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), mainMat);
        hood.position.y = 2.38;
        hoverRoot.add(hood);
        this.addBorderShell(hood, outlineShellMat, 1.08);

        const voidFace = new THREE.Mesh(
            new THREE.SphereGeometry(0.36, 14, 14),
            new THREE.MeshBasicMaterial({ color: 0x05020a })
        );
        voidFace.position.set(0, 2.36, 0.14);
        hoverRoot.add(voidFace);

        [-1, 1].forEach(s => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), eyeMat);
            eye.position.set(s * 0.14, 2.38, 0.46);
            hoverRoot.add(eye);
        });

        if (this.dbKey === 'floor_boss_wraith') {
            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.38, 8, 1, true), borderGlowMat);
            crown.position.y = 2.86;
            hoverRoot.add(crown);

            const voidHalo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 32), borderGlowMat);
            voidHalo.position.set(0, 2.35, -0.35);
            hoverRoot.add(voidHalo);
            this.parts.voidHalo = voidHalo;
        }

        [-1, 1].forEach(s => {
            const arm = new THREE.Group();
            arm.position.set(s * 0.68, 1.98, 0);
            hoverRoot.add(arm);

            const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 8), darkArmorMat);
            sleeve.position.y = -0.42;
            arm.add(sleeve);
            this.addBorderShell(sleeve, outlineShellMat, 1.08);

            if (s === 1) {
                const scythe = new THREE.Group();
                scythe.position.set(0, -0.65, 0.25);
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.75, 10), darkArmorMat);
                const crescent = new THREE.Mesh(chamferBox(1.25, 0.22, 0.05, 0.015), borderGlowMat);
                crescent.position.set(0.52, 1.25, 0);
                crescent.rotation.z = -0.32;
                scythe.add(pole, crescent);
                scythe.rotation.x = 0.45;
                arm.add(scythe);
            }

            this.parts[s < 0 ? 'lArm' : 'rArm'] = arm;
        });
    }

    buildMinotaur(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const hips = new THREE.Group();
        hips.position.y = 1.05;
        this.bodyGroup.add(hips);
        this.parts.hips = hips;

        const pelvis = new THREE.Mesh(chamferBox(0.82, 0.34, 0.56, 0.05), darkArmorMat);
        hips.add(pelvis);

        const torso = new THREE.Group();
        torso.position.y = 0.16;
        hips.add(torso);
        this.parts.torso = torso;

        const chest = new THREE.Mesh(chamferBox(1.28, 1.15, 0.78, 0.08), mainMat);
        chest.position.y = 0.58;
        chest.castShadow = true;
        torso.add(chest);
        this.addBorderShell(chest, outlineShellMat, 1.06);

        const harness = new THREE.Mesh(chamferBox(1.32, 0.16, 0.82, 0.02), borderGlowMat);
        harness.position.y = 0.58;
        harness.rotation.z = 0.35;
        torso.add(harness);

        const head = new THREE.Mesh(chamferBox(0.62, 0.58, 0.72, 0.06), mainMat);
        head.position.set(0, 1.42, 0.14);
        torso.add(head);
        this.addBorderShell(head, outlineShellMat, 1.07);

        const noseRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 8, 20), borderGlowMat);
        noseRing.position.set(0, 1.26, 0.54);
        torso.add(noseRing);

        [-1, 1].forEach(s => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 8), borderGlowMat);
            horn.position.set(s * 0.48, 1.68, 0.12);
            horn.rotation.z = s * -0.78;
            horn.rotation.x = 0.28;
            torso.add(horn);

            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), eyeMat);
            eye.position.set(s * 0.20, 1.48, 0.50);
            torso.add(eye);
        });

        [-1, 1].forEach(s => {
            const arm = new THREE.Group();
            arm.position.set(s * 0.84, 1.02, 0);
            torso.add(arm);

            const limb = new THREE.Mesh(chamferBox(0.38, 0.92, 0.38, 0.05), mainMat);
            limb.position.y = -0.42;
            limb.castShadow = true;
            arm.add(limb);
            this.addBorderShell(limb, outlineShellMat, 1.07);

            if (s === 1) {
                const axe = new THREE.Group();
                axe.position.set(0, -0.78, 0.35);
                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.25, 10), darkArmorMat);
                shaft.rotation.x = Math.PI / 2;
                const blade = new THREE.Mesh(chamferBox(0.12, 0.95, 0.65, 0.02), borderGlowMat);
                blade.position.set(0, 0, 0.85);
                axe.add(shaft, blade);
                arm.add(axe);
            }

            this.parts[s < 0 ? 'lArm' : 'rArm'] = arm;
        });

        [-1, 1].forEach(s => {
            const leg = new THREE.Group();
            leg.position.set(s * 0.32, -0.10, 0);
            hips.add(leg);

            const thigh = new THREE.Mesh(chamferBox(0.38, 0.92, 0.42, 0.05), mainMat);
            thigh.position.y = -0.45;
            thigh.castShadow = true;
            leg.add(thigh);
            this.addBorderShell(thigh, outlineShellMat, 1.06);

            this.parts[s < 0 ? 'lLeg' : 'rLeg'] = leg;
        });
    }

    buildDragon(mainMat, darkArmorMat, borderGlowMat, outlineShellMat, eyeMat) {
        const dragonRoot = new THREE.Group();
        dragonRoot.position.y = 1.25;
        this.bodyGroup.add(dragonRoot);
        this.parts.dragonRoot = dragonRoot;

        const torso = new THREE.Mesh(chamferBox(1.38, 1.05, 2.25, 0.12), mainMat);
        torso.castShadow = true;
        dragonRoot.add(torso);
        this.addBorderShell(torso, outlineShellMat, 1.06);

        const bellyPlate = new THREE.Mesh(chamferBox(1.05, 0.22, 1.95, 0.04), borderGlowMat);
        bellyPlate.position.y = -0.48;
        dragonRoot.add(bellyPlate);

        for (let i = 0; i < 5; i++) {
            const spine = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 5), borderGlowMat);
            spine.position.set(0, 0.72, 0.75 - i * 0.42);
            spine.rotation.x = -0.25;
            dragonRoot.add(spine);
        }

        const neck = new THREE.Group();
        neck.position.set(0, 0.45, 1.05);
        dragonRoot.add(neck);
        this.parts.neck = neck;

        const neckSeg = new THREE.Mesh(chamferBox(0.68, 0.85, 0.68, 0.08), mainMat);
        neckSeg.position.set(0, 0.35, 0.25);
        neckSeg.rotation.x = 0.42;
        neck.add(neckSeg);
        this.addBorderShell(neckSeg, outlineShellMat, 1.07);

        const head = new THREE.Mesh(chamferBox(0.76, 0.62, 1.15, 0.08), mainMat);
        head.position.set(0, 0.82, 0.68);
        neck.add(head);
        this.addBorderShell(head, outlineShellMat, 1.07);

        [-1, 1].forEach(s => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.92, 8), borderGlowMat);
            horn.position.set(s * 0.32, 1.25, 0.35);
            horn.rotation.x = -0.68;
            horn.rotation.z = s * -0.26;
            neck.add(horn);

            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 12), eyeMat);
            eye.position.set(s * 0.28, 0.92, 1.18);
            neck.add(eye);
        });

        [-1, 1].forEach(s => {
            const innerWing = new THREE.Group();
            innerWing.position.set(s * 0.68, 0.48, 0.15);
            dragonRoot.add(innerWing);

            const strut1 = new THREE.Mesh(chamferBox(1.35, 0.10, 0.12, 0.02), borderGlowMat);
            strut1.position.set(s * 0.68, 0.18, 0);
            strut1.rotation.z = s * 0.18;
            innerWing.add(strut1);

            const membrane1 = new THREE.Mesh(chamferBox(1.32, 0.06, 1.28, 0.02), darkArmorMat);
            membrane1.position.set(s * 0.68, 0.05, -0.15);
            innerWing.add(membrane1);
            this.addBorderShell(membrane1, outlineShellMat, 1.05);

            const outerWing = new THREE.Group();
            outerWing.position.set(s * 1.32, 0.18, 0);
            innerWing.add(outerWing);

            const membrane2 = new THREE.Mesh(chamferBox(1.25, 0.05, 1.10, 0.02), borderGlowMat);
            membrane2.position.set(s * 0.62, 0, -0.15);
            outerWing.add(membrane2);

            this.parts[s < 0 ? 'lWing' : 'rWing'] = innerWing;
            this.parts[s < 0 ? 'lWingOuter' : 'rWingOuter'] = outerWing;
        });

        [-1, 1].forEach(s => {
            [-0.68, 0.68].forEach((zOff, idx) => {
                const leg = new THREE.Mesh(chamferBox(0.36, 0.95, 0.38, 0.05), mainMat);
                leg.position.set(s * 0.56, -0.72, zOff);
                leg.castShadow = true;
                dragonRoot.add(leg);
                this.addBorderShell(leg, outlineShellMat, 1.06);
                if (idx === 1) this.parts[s < 0 ? 'lLeg' : 'rLeg'] = leg;
            });
        });

        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.85, 8), mainMat);
        tail.position.set(0, -0.10, -1.75);
        tail.rotation.x = -Math.PI / 2.3;
        dragonRoot.add(tail);
        this.addBorderShell(tail, outlineShellMat, 1.06);
        this.parts.tail = tail;
    }

    provoke(targetEntity, duration = 10.0) {
        this.provokeTarget = targetEntity;
        this.provokeTimer = duration;
        this.state = 'chase';
    }

    ensureOverheadUI() {
        if (this.overheadGroup) return;
        this.overheadGroup = new THREE.Group();
        this.group.add(this.overheadGroup);

        this.overheadCanvas = document.createElement('canvas');
        this.overheadCanvas.width = 256;
        this.overheadCanvas.height = 64;
        this.overheadTex = new THREE.CanvasTexture(this.overheadCanvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.overheadTex,
            transparent: true,
            depthTest: false
        });
        this.overheadSprite = new THREE.Sprite(spriteMat);
        const height = 1.6 + this.scaleFactor * 0.85;
        this.overheadSprite.position.set(0, height, 0);
        this.overheadSprite.scale.set(2.8, 0.7, 1);
        this.overheadSprite.renderOrder = 995;
        this.overheadGroup.add(this.overheadSprite);
        this._lastOverheadHp = -1;
        this._lastOverheadMaxHp = -1;
    }

    updateOverheadUI() {
        if (!this.overheadGroup) this.ensureOverheadUI();
        if (this.state === 'dead') {
            this.overheadGroup.visible = false;
            return;
        }
        this.overheadGroup.visible = true;

        if (this.hp === this._lastOverheadHp && this.maxHp === this._lastOverheadMaxHp) return;
        this._lastOverheadHp = this.hp;
        this._lastOverheadMaxHp = this.maxHp;

        const ctx = this.overheadCanvas.getContext('2d');
        ctx.clearRect(0, 0, 256, 64);

        // Name & Level
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(`Lv.${this.level} ${this.name}`, 129, 23);
        ctx.fillText(`Lv.${this.level} ${this.name}`, 127, 21);
        ctx.fillStyle = this.type === 'floor_boss' ? '#ff3b30' : (this.type === 'mini_boss' ? '#ff9500' : '#ffffff');
        ctx.fillText(`Lv.${this.level} ${this.name}`, 128, 22);

        // Health bar background
        const barX = 28;
        const barY = 30;
        const barW = 200;
        const barH = 14;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        // Health bar fill
        const ratio = Math.max(0, Math.min(1, this.hp / (this.maxHp || 1)));
        const fillW = Math.round((barW - 4) * ratio);
        if (fillW > 0) {
            ctx.fillStyle = ratio > 0.5 ? '#22c55e' : (ratio > 0.25 ? '#eab308' : '#ef4444');
            ctx.fillRect(barX + 2, barY + 2, fillW, barH - 4);
        }

        this.overheadTex.needsUpdate = true;
    }

    takeDamage(amount) {
        if (this.state === 'dead') return false;
        this.hp = Math.max(0, this.hp - amount);
        this.hitFlashTimer = 0.14;
        if (this.mainMat) {
            this.mainMat.emissive.setHex(0xffffff);
            this.mainMat.emissiveIntensity = 1.4;
        }

        // Engage boss HUD ONLY when boss is attacked
        if (window.game && (this === window.game.floorBoss || this.type === 'floor_boss')) {
            window.game.bossEngaged = true;
        }

        this.updateOverheadUI();

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    get2DRespawnDuration() {
        if (this.customRespawnDelay > 0) return this.customRespawnDelay;
        if (this.type === 'floor_boss') return 180; // 3m floor boss respawn cooldown
        if (this.type === 'mini_boss') return 120;  // 2D server.js line 1322: 120,000ms (120s) for Mini-Bosses
        if (this.dbKey.includes('golem') || this.dbKey.includes('minotaur') || this.dbKey.includes('dragon')) {
            return 12; // 2D server.js line 1320: 12,000ms (12s) for Golem/Minotaur/Dragon common mobs
        }
        return 10; // 2D server.js line 1323: 10,000ms (10s) for Slimes/Bats/Fire Elementals/Wraiths
    }

    ensureRespawnCounterUI() {
        if (this.respawnGroup) return;
        this.respawnGroup = new THREE.Group();
        this.respawnGroup.visible = false;
        this.group.add(this.respawnGroup);

        const ringColor = this.type === 'floor_boss' ? 0xff1744 : (this.type === 'mini_boss' ? 0xff9100 : 0x00e5ff);
        const markerRing = new THREE.Mesh(
            new THREE.RingGeometry(0.65 * this.scaleFactor, 0.85 * this.scaleFactor, 28),
            new THREE.MeshBasicMaterial({
                color: ringColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.45
            })
        );
        markerRing.rotation.x = -Math.PI / 2;
        markerRing.position.y = 0.04;
        this.respawnGroup.add(markerRing);
        this.respawnMarkerRing = markerRing;

        this.respawnCanvas = document.createElement('canvas');
        this.respawnCanvas.width = 384;
        this.respawnCanvas.height = 112;
        this.respawnTex = new THREE.CanvasTexture(this.respawnCanvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.respawnTex,
            transparent: true,
            depthTest: false
        });
        this.respawnSprite = new THREE.Sprite(spriteMat);
        this.respawnSprite.position.set(0, 1.45 + this.scaleFactor * 0.4, 0);
        this.respawnSprite.scale.set(3.8, 1.1, 1);
        this.respawnSprite.renderOrder = 998;
        this.respawnGroup.add(this.respawnSprite);
        this._lastRespawnSec = -1;
    }

    updateRespawnCounterUI() {
        if (!this.respawnGroup) this.ensureRespawnCounterUI();
        const sec = Math.max(0, Math.ceil(this.respawnTimer));
        if (sec === this._lastRespawnSec) return;
        this._lastRespawnSec = sec;

        const ctx = this.respawnCanvas.getContext('2d');
        ctx.clearRect(0, 0, 384, 112);

        const accent = this.type === 'floor_boss' ? '#ff1744' : (this.type === 'mini_boss' ? '#ffab00' : '#00e5ff');
        ctx.fillStyle = 'rgba(7, 11, 22, 0.86)';
        ctx.strokeStyle = accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(10, 10, 364, 92, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${this.name} (Lv.${this.level})`, 192, 44);

        const mins = Math.floor(sec / 60);
        const remS = sec % 60;
        const timeStr = mins > 0
            ? `${mins}m ${String(remS).padStart(2, '0')}s`
            : `${remS}s`;

        ctx.font = '900 26px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText(`⏳ Respawn: ${timeStr}`, 192, 82);
        this.respawnTex.needsUpdate = true;
    }

    die() {
        this.state = 'dead';
        if (this.overheadGroup) this.overheadGroup.visible = false;
        if (window.game && this === window.game.floorBoss) {
            window.game.bossEngaged = false;
        }
        this.respawnTimer = this.get2DRespawnDuration();
        this.pos.copy(this.spawnPos);
        this.group.position.copy(this.spawnPos);

        if (this.noRespawn) {
            this.group.visible = false;
            return;
        }

        this.group.visible = true;
        this.bodyGroup.visible = false;
        this.ensureRespawnCounterUI();
        this._lastRespawnSec = -1;
        this.updateRespawnCounterUI();
        this.respawnGroup.visible = true;
    }

    respawn() {
        this.state = 'idle';
        this.hp = this.maxHp;
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.bleedTimer = 0;
        this.provokeTarget = null;
        this.provokeTimer = 0;

        // 🌟 2D Dynamic Golden Slime Mutation on Respawn:
        if (this.category === 'common_mobs' && !this.isTavernBoss) {
            const mutate = Math.random() < 0.0005;
            if (mutate && this.dbKey !== 'common_mobs_golden') {
                this.dbKey = 'common_mobs_golden';
                this.monsterKey = 'common_mobs_golden';
                this.name = 'Golden Slime';
                this.originalColor = new THREE.Color(0xffd700);
            } else if (!mutate && this.dbKey === 'common_mobs_golden' && this.originalKey) {
                this.dbKey = this.originalKey;
                this.monsterKey = this.originalKey;
                const tmpl = MONSTER_DATABASE[this.originalKey] || MONSTER_DATABASE.common_mobs1;
                this.name = tmpl.name;
                this.originalColor = new THREE.Color(tmpl.color || 0xff69b4);
            }
        }

        this.pos.copy(this.spawnPos);
        this.group.position.copy(this.pos);
        this.group.visible = true;
        this.bodyGroup.visible = true;
        if (this.respawnGroup) {
            this.respawnGroup.visible = false;
        }
        if (this.mainMat) {
            this.mainMat.color.copy(this.originalColor);
            this.mainMat.emissive.setHex(0x000000);
        }
        this.updateOverheadUI();
        if (window.game && window.game.engine) {
            window.game.engine.spawnGroundShockwave(this.spawnPos, 0x00e5ff, 2.2 * this.scaleFactor);
        }
    }

    triggerAttackAnim() {
        this.attackAnimTimer = 0.42;
    }

    update(dt, playerPos, onAttackPlayer) {
        if (this.state === 'dead') {
            if (this.noRespawn) return;
            this.respawnTimer -= dt;
            if (this.respawnMarkerRing) {
                this.respawnMarkerRing.rotation.z += dt * 1.2;
            }
            this.updateRespawnCounterUI();
            if (this.respawnTimer <= 0) this.respawn();
            return;
        }

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            if (this.hitFlashTimer <= 0 && this.mainMat) {
                if (this.isFrozen) {
                    this.mainMat.emissive.setHex(0x00e5ff);
                    this.mainMat.emissiveIntensity = 0.65;
                } else if (this.dbKey.includes('mobs3') || this.dbKey.includes('boss3')) {
                    this.mainMat.emissive.copy(this.originalColor);
                    this.mainMat.emissiveIntensity = 1.15;
                } else {
                    this.mainMat.emissive.setHex(0x000000);
                    this.mainMat.emissiveIntensity = 0;
                }
            }
        }

        // Blademaster Sharp Edge Bleed DoT
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            this.bleedTickTimer -= dt;
            if (this.bleedTickTimer <= 0) {
                this.bleedTickTimer = 1.0;
                if (this.bleedDamage > 0) {
                    const died = this.takeDamage(this.bleedDamage);
                    if (window.game && window.game.combat) {
                        window.game.combat.spawnFloatingDamage(this.group.position, `BLEED -${Math.floor(this.bleedDamage)}`, false);
                    }
                    if (died && window.game) {
                        window.game.onMonsterDefeated(this);
                        return;
                    }
                }
            }
        }

        // Ice Master Chill! Freeze
        if (this.isFrozen) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                if (this.mainMat) {
                    this.mainMat.emissive.setHex(0x000000);
                    this.mainMat.emissiveIntensity = 0;
                }
            } else {
                return;
            }
        }

        this.animTime += dt;
        const p = this.parts;

        if (p.groundRing) p.groundRing.rotation.z = this.animTime * 0.8;
        if (p.outerRing) p.outerRing.rotation.z = -this.animTime * 1.4;

        let attackImpulse = 0;
        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
            attackImpulse = Math.sin((1 - this.attackAnimTimer / 0.42) * Math.PI);
        }

        if (p.slimeRoot) {
            const bounce = Math.abs(Math.sin(this.animTime * 4.5));
            const sy = 0.86 + bounce * 0.28 + attackImpulse * 0.32;
            const sxz = 1.08 - bounce * 0.12 + attackImpulse * 0.20;
            p.slimeRoot.scale.set(sxz, sy, sxz);
            p.slimeRoot.position.y = bounce * 0.28 + attackImpulse * 0.45;
            p.slimeRoot.position.z = attackImpulse * 0.65;
            if (p.core) {
                p.core.rotation.y += dt * 2.5;
                p.core.rotation.x += dt * 1.8;
            }
        }

        if (p.hoverRoot) {
            const baseHover = this.dbKey.includes('wraith') ? 0.35 : 1.70;
            p.hoverRoot.position.y = baseHover + Math.sin(this.animTime * 3.8) * 0.22;
            p.hoverRoot.position.z = attackImpulse * 0.75;
            p.hoverRoot.rotation.x = attackImpulse * 0.35;
        }

        if (p.dragonRoot) {
            p.dragonRoot.position.y = 1.25 + Math.sin(this.animTime * 3.2) * 0.18;
            p.dragonRoot.position.z = attackImpulse * 0.85;
            if (p.neck) p.dragonRoot.rotation.x = attackImpulse * 0.25;
            if (p.tail) p.tail.rotation.z = Math.sin(this.animTime * 4.5) * 0.28;
        }

        if (p.lWing && p.rWing) {
            const flapSpeed = this.dbKey.includes('dragon') ? 6.8 : 11.5;
            const flap = Math.sin(this.animTime * flapSpeed) * 0.58;
            const lagFlap = Math.sin(this.animTime * flapSpeed - 0.65) * 0.48;
            p.lWing.rotation.z = flap;
            p.rWing.rotation.z = -flap;
            if (p.lWingOuter && p.rWingOuter) {
                p.lWingOuter.rotation.z = lagFlap;
                p.rWingOuter.rotation.z = -lagFlap;
            }
        }

        if (p.ring1 && p.ring2) {
            p.ring1.rotation.x += dt * 2.4;
            p.ring1.rotation.y += dt * 1.8;
            p.ring2.rotation.y -= dt * 2.8;
            p.ring2.rotation.z += dt * 1.6;
        }
        if (p.shardGroup) p.shardGroup.rotation.y -= dt * 2.2;
        if (p.voidHalo) p.voidHalo.rotation.z += dt * 1.8;

        const isMoving = this.state === 'chase';
        if (p.lArm && p.rArm) {
            if (attackImpulse > 0.01) {
                p.lArm.rotation.x = -attackImpulse * 1.85;
                p.rArm.rotation.x = -attackImpulse * 2.15;
            } else if (isMoving) {
                const swing = Math.sin(this.animTime * 7.5) * 0.62;
                p.lArm.rotation.x = swing;
                p.rArm.rotation.x = -swing;
            } else {
                const idleBreath = Math.sin(this.animTime * 2.5) * 0.08;
                p.lArm.rotation.x = idleBreath;
                p.rArm.rotation.x = -idleBreath;
            }
        }
        if (p.lLeg && p.rLeg) {
            if (isMoving) {
                const stride = Math.sin(this.animTime * 7.5) * 0.58;
                p.lLeg.rotation.x = -stride;
                p.rLeg.rotation.x = stride;
                if (p.hips) p.hips.position.y = 1.05 + Math.abs(Math.sin(this.animTime * 7.5)) * 0.10;
            } else {
                p.lLeg.rotation.x *= 0.85;
                p.rLeg.rotation.x *= 0.85;
            }
        }

        // AI Movement & Attack State
        let targetPos = playerPos;
        if (this.provokeTimer > 0 && this.provokeTarget) {
            this.provokeTimer -= dt;
            const pPos = this.provokeTarget.pos || (this.provokeTarget.group && this.provokeTarget.group.position);
            if (pPos) targetPos = pPos;
            else this.provokeTarget = null;
        }

        if (targetPos) {
            this.pos.copy(this.group.position);
            const distToPlayer = this.pos.distanceTo(targetPos);
            const distToSpawn = this.pos.distanceTo(this.spawnPos);

            if (this.isMinotaur) {
                this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
                if (this.chargeTimer > 0) {
                    this.chargeTimer -= dt;
                    this.state = 'chase';
                    const dashSpeed = Math.max(18.0, this.speed * 4.2);
                    this.pos.addScaledVector(this.chargeDir, dashSpeed * dt);
                    this.group.position.copy(this.pos);
                    this.group.rotation.y = Math.atan2(this.chargeDir.x, this.chargeDir.z);
                    if (p.torso) p.torso.rotation.x = 0.52;
                    if (window.game && window.game.engine && Math.random() < 0.65) {
                        window.game.engine.spawnHitSparks(this.pos, 0xff1744, 4);
                        window.game.engine.spawnGroundShockwave(this.pos, 0xff5252, 1.8);
                    }
                    if (distToPlayer <= this.attackRange && onAttackPlayer && !this._chargeHitDealt) {
                        this._chargeHitDealt = true;
                        this.triggerAttackAnim();
                        const chargeDmg = Math.max(5, Math.floor((Number(this.atk) || 10) * 1.5));
                        onAttackPlayer(chargeDmg);
                        if (window.game) {
                            if (window.game.combat) {
                                window.game.combat.spawnFloatingDamage(targetPos, '🐂 BULL RUSH! (STUNNED)', true);
                            }
                            if (window.game.applyPlayerStun) {
                                window.game.applyPlayerStun(3.0);
                            }
                        }
                    }
                    return;
                } else if (p.torso) {
                    p.torso.rotation.x = 0;
                    this._chargeHitDealt = false;
                }
            }

            // Universal Earthquake Skill (ALL Mini Bosses & Floor Bosses per 2D Exonie rules!)
            const isFloorBoss = this.type === 'floor_boss' || this.category === 'floor_boss' || this.dbKey.includes('floor_boss') || this.isBattlefieldBoss;
            if (this.isBoss && distToPlayer <= this.aggroRange && distToSpawn < 90) {
                this.earthquakeCooldown = (this.earthquakeCooldown || 10.0) - dt;
                if (this.earthquakeCooldown <= 0) {
                    this.earthquakeCooldown = isFloorBoss ? 8.5 : 12.0;
                    const aoeRadius = isFloorBoss ? 22.0 : 14.0;
                    if (window.game) {
                        let shockColor = 0xffd700;
                        if (this.isDragon || this.dbKey.includes('boss3') || this.dbKey.includes('mobs3')) shockColor = 0xff5722;
                        else if (this.isWraith) shockColor = 0x9c27b0;
                        else if (this.dbKey.includes('bat') || this.dbKey.includes('boss2')) shockColor = 0xd500f9;
                        else if (this.isGolem || this.isMinotaur) shockColor = 0x795548;
                        else if (this.isSlime) shockColor = 0x00e5ff;

                        window.game.engine.spawnGroundShockwave(this.pos, shockColor, aoeRadius);
                        window.game.engine.addScreenshake(isFloorBoss ? 1.0 : 0.6);
                        window.game.audio.playSfx('bump');
                        window.game.combat.spawnFloatingDamage(this.pos, '🌋 EARTHQUAKE!', true);
                        if (distToPlayer <= aoeRadius) {
                            const rawAtk = Number(this.atk) || Number(this.attackPower) || 10;
                            const eqDmg = Math.max(5, Math.floor(rawAtk * 1.5));
                            window.game.onMonsterHitPlayer(eqDmg, 'Earthquake', this);
                        }
                    }
                }
            }

            // Void Blink / Vanish Skill (Spectral Wraiths, Soul Reaper, The Void King)
            if (this.isWraith && distToPlayer <= this.aggroRange && distToPlayer > 3.0 && distToSpawn < 90) {
                this.voidBlinkCooldown = (this.voidBlinkCooldown || 9.0) - dt;
                if (this.voidBlinkCooldown <= 0) {
                    this.voidBlinkCooldown = this.type === 'floor_boss' ? 7.5 : 11.0;
                    if (window.game) {
                        window.game.engine.spawnHitSparks(this.pos, 0x9c27b0, 32);
                        window.game.audio.playSfx('lightning');
                        // Teleport 2.2m behind the player
                        const pRot = window.game.player.rotY || 0;
                        const behind = targetPos.clone().add(new THREE.Vector3(
                            -Math.sin(pRot) * 2.2,
                            0,
                            -Math.cos(pRot) * 2.2
                        ));
                        this.pos.copy(behind);
                        this.group.position.copy(behind);
                        window.game.engine.spawnHitSparks(this.pos, 0x9c27b0, 24);
                        window.game.engine.spawnGroundShockwave(this.pos, 0x7b1fa2, 3.5);
                        window.game.ui.showToast(`👻 ${this.name} flickers into the void... it is watching you.`);
                        window.game.combat.spawnFloatingDamage(this.pos, '👻 VOID BLINK!', true);
                    }
                }
            }

            if (distToPlayer <= this.attackRange) {
                this.state = 'attack';
                const angle = Math.atan2(targetPos.x - this.pos.x, targetPos.z - this.pos.z);
                this.group.rotation.y = angle;
                if (this.attackCooldown <= 0.15 && this.attackAnimTimer <= 0) {
                    this.triggerAttackAnim();
                    // Ranged attack visual fx
                    if (this.isRanged && distToPlayer > 3.2 && window.game?.engine) {
                        const boltCol = this.dbKey.includes('wraith') ? 0x9c27b0 : 0xff5722;
                        window.game.engine.spawnLaserBolt(
                            this.pos.clone().add(new THREE.Vector3(0, 1.1, 0)),
                            targetPos.clone().add(new THREE.Vector3(0, 0.8, 0)),
                            boltCol,
                            0.16
                        );
                    }
                }
            } else if ((distToPlayer <= this.aggroRange || this.provokeTimer > 0) && distToSpawn < 90) {
                this.state = 'chase';
                const dir = new THREE.Vector3().subVectors(targetPos, this.pos);
                dir.y = 0;
                dir.normalize();

                // Minotaur Dash / Charge Initiation (Plays charge.mp3 strictly here!)
                if (this.isMinotaur && this.chargeCooldown <= 0 && distToPlayer > 3.0 && distToPlayer < 32.0) {
                    this.chargeCooldown = 9.0;
                    this.chargeTimer = 1.55;
                    this._chargeHitDealt = false;
                    this.chargeDir.copy(dir);
                    if (window.game) {
                        if (window.game.audio) window.game.audio.playSfx('charge');
                        if (window.game.combat) window.game.combat.spawnFloatingDamage(this.pos, '🐂 MINOTAUR CHARGE!', true);
                        if (window.game.engine) window.game.engine.spawnGroundShockwave(this.pos, 0xff1744, 4.5);
                    }
                    return;
                }

                const moveSpeed = Math.max(2.6, Math.min(7.5, this.speed * 1.25));
                this.pos.addScaledVector(dir, moveSpeed * dt);
                this.group.position.copy(this.pos);
                this.group.rotation.y = Math.atan2(dir.x, dir.z);
            } else {
                this.state = 'idle';
                if (distToSpawn > 1.2) {
                    const dir = new THREE.Vector3().subVectors(this.spawnPos, this.pos);
                    dir.y = 0;
                    dir.normalize();
                    this.pos.addScaledVector(dir, 3.8 * dt);
                    this.group.position.copy(this.pos);
                    this.group.rotation.y = Math.atan2(dir.x, dir.z);
                }
            }
        }
    }
}

window.Monster3D = Monster3D;
