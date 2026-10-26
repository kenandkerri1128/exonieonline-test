// ============================================================================
// EXONIE 3D REMASTERED — SCULPTED PROCEDURAL 3D CHARACTER & WEAPON SYSTEM
// Built on Circuit Siege's Multi-Joint Rig, Bevelled Extrusions, Lathe Profiles
// & Exponentially Damped Procedural Animation State Machine
// ============================================================================
import * as THREE from 'three';

export const RARITY_COLORS = {
    Starter:   0x9e9e9e,
    Basic:     0xffffff,
    Rare:      0x2196f3,
    Unique:    0xab47bc,
    Legendary: 0xff5722,
    Godly:     0x00e5ff,
    Divine:    0xffea00
};

// 🛡️ Authentic 2D Equipment Visual Themes based ONLY on Rarity (Not Classes!)
export const EQUIPMENT_RARITY_THEMES = {
    Starter: {
        primary: 0x374151,  // Rough iron grey
        trim: 0x6b7280,     // Dull steel
        glow: 0x9ca3af,
        emissiveIntensity: 0.05,
        hasGlow: false
    },
    Basic: {
        primary: 0x453229,  // Hardened leather & bronze
        trim: 0x9a8370,     // Polished bronze
        glow: 0xd6c7b2,
        emissiveIntensity: 0.15,
        hasGlow: false
    },
    Rare: {
        primary: 0x0f2a4a,  // Cobalt Blue
        trim: 0x2196f3,     // Brilliant Sapphire
        glow: 0x60a5fa,
        emissiveIntensity: 0.50,
        hasGlow: false
    },
    Unique: {
        primary: 0x2e1047,  // Royal Amethyst
        trim: 0xab47bc,     // Arcane Violet
        glow: 0xc084fc,
        emissiveIntensity: 0.85,
        hasGlow: false
    },
    Legendary: {
        primary: 0x4a1212,  // Volcanic Crimson
        trim: 0xff3d00,     // Blazing Amber
        glow: 0xf44336,     // Fire Glow
        emissiveIntensity: 3.5,
        hasGlow: true       // 🔥 GLOWS ACTIVE
    },
    Godly: {
        primary: 0x0a2838,  // Celestial Ice
        trim: 0x00e5ff,     // Radiant Cyan
        glow: 0xe0ffff,     // Brilliant Diamond Radiance
        emissiveIntensity: 4.8,
        hasGlow: true       // ⚡ GLOWS ACTIVE
    },
    Divine: {
        primary: 0x3d3000,  // Sunforged Gold
        trim: 0xffd700,     // Pure Radiant Gold
        glow: 0xffea00,     // Blinding Divine Aura
        emissiveIntensity: 6.0,
        hasGlow: true       // ✨ GLOWS ACTIVE
    }
};

// ── Circuit Siege Shared Geometry Helpers ──
const _charGeoCache = new Map();

export function chamferBox(w, h, d, bevel = 0.03) {
    const key = `cb_${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${bevel.toFixed(3)}`;
    if (_charGeoCache.has(key)) return _charGeoCache.get(key);
    const b = Math.min(bevel, w * 0.28, h * 0.28, d * 0.28);
    const hw = Math.max(0.01, w / 2 - b);
    const hh = Math.max(0.01, h / 2 - b);
    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh);
    shape.lineTo(-hw, hh);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.01, d - b * 2),
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: b,
        bevelThickness: b
    });
    geo.center();
    _charGeoCache.set(key, geo);
    return geo;
}

function sculptedTorsoGeo(isFemale, h) {
    const key = `torso_${isFemale ? 'F' : 'M'}_${h.toFixed(3)}`;
    if (_charGeoCache.has(key)) return _charGeoCache.get(key);
    const pts = isFemale
        ? [
            new THREE.Vector2(0.01, -h * 0.5),
            new THREE.Vector2(0.28, -h * 0.46), // hips
            new THREE.Vector2(0.20, -h * 0.08), // hourglass waist
            new THREE.Vector2(0.29,  h * 0.24), // bust
            new THREE.Vector2(0.24,  h * 0.46), // shoulders
            new THREE.Vector2(0.11,  h * 0.50)  // collar
        ]
        : [
            new THREE.Vector2(0.01, -h * 0.5),
            new THREE.Vector2(0.25, -h * 0.46), // belt
            new THREE.Vector2(0.24, -h * 0.12), // athletic waist
            new THREE.Vector2(0.32,  h * 0.26), // broad chest
            new THREE.Vector2(0.30,  h * 0.46), // shoulders
            new THREE.Vector2(0.13,  h * 0.50)  // collar
        ];
    const geo = new THREE.LatheGeometry(pts, 18);
    geo.scale(1.0, 1.0, 0.72);
    _charGeoCache.set(key, geo);
    return geo;
}

let _sharedBlobShadowTex = null;
export function getCharacterBlobShadowTex() {
    if (_sharedBlobShadowTex) return _sharedBlobShadowTex;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(0,0,0,0.65)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    _sharedBlobShadowTex = new THREE.CanvasTexture(c);
    return _sharedBlobShadowTex;
}

function damp(cur, target, rate, dt) {
    return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}
function easeOut(t) { return 1 - (1 - t) * (1 - t); }

export class Character3D {
    constructor(options = {}) {
        this.name = options.name || 'Hero';
        this.gender = options.gender || 'female';
        this.hairStyle = String(options.hairStyle || '1');
        this.hairColor = options.hairColor || '#111111';
        this.skinColor = options.skinColor || '#f5c6a5';
        this.eyeColor = options.eyeColor || '#00e5ff';
        this.jobClass = options.jobClass || options.className || 'None';
        this.weaponType = options.weaponType || (options.weapon ? options.weapon.weaponType : null);
        this.weaponRarity = options.weaponRarity || (options.weapon ? options.weapon.rarity : 'Starter');
        this.armorRarity = options.armorRarity || (options.armor ? options.armor.rarity : 'Starter');
        this.leggingsRarity = options.leggingsRarity || (options.leggings ? options.leggings.rarity : 'Starter');

        this.group = new THREE.Group();
        this.parts = {};
        this.weaponGroup = new THREE.Group();
        this.offhandWeaponGroup = new THREE.Group();
        this.droneGroup = null;

        this.animTime = Math.random() * 10;
        this.state = 'idle'; // idle, walk, attack, skill, jump, dodge
        this.attackProgress = 0;
        this.attackComboStep = 0;
        this.attackWeaponType = 'sword';
        this.skillCastTimer = 0;
        this.dodgeTimer = 0;
        this.isGrounded = true;
        this.landTimer = 0;

        this.buildMesh();
        if (this.weaponType) {
            this.setWeapon(this.weaponType, this.weaponRarity);
        }
    }

    get isAttacking() {
        return this.state === 'attack';
    }

    get isDodging() {
        return this.state === 'dodge';
    }

    // 🛡️ Dynamic Equipment Visual Updates strictly following Rarity (2D Exonie style)
    setEquipVisuals(opts = {}) {
        if (opts.weaponType !== undefined) this.weaponType = opts.weaponType;
        if (opts.weaponRarity !== undefined) this.weaponRarity = opts.weaponRarity;
        if (opts.armorRarity !== undefined) this.armorRarity = opts.armorRarity;
        if (opts.leggingsRarity !== undefined) this.leggingsRarity = opts.leggingsRarity;
        this.buildMesh();
        if (this.weaponType) {
            this.setWeapon(this.weaponType, this.weaponRarity);
        }
    }

    setCustomization(opts = {}) {
        if (opts.gender !== undefined) this.gender = opts.gender;
        if (opts.hairStyle !== undefined) this.hairStyle = String(opts.hairStyle);
        if (opts.hairColor !== undefined) this.hairColor = opts.hairColor;
        if (opts.skinColor !== undefined) this.skinColor = opts.skinColor;
        if (opts.className !== undefined) this.jobClass = opts.className;
        if (opts.jobClass !== undefined) this.jobClass = opts.jobClass;
        if (opts.weaponRarity !== undefined) this.weaponRarity = opts.weaponRarity;
        if (opts.armorRarity !== undefined) this.armorRarity = opts.armorRarity;
        if (opts.leggingsRarity !== undefined) this.leggingsRarity = opts.leggingsRarity;
        this.buildMesh();
        if (opts.weaponType !== undefined) {
            this.setWeapon(opts.weaponType, opts.weaponRarity || this.weaponRarity);
        } else if (this.weaponType) {
            this.setWeapon(this.weaponType, this.weaponRarity);
        }
    }

    setJobClass(jobClass) {
        if (this.jobClass !== jobClass) {
            this.jobClass = jobClass || 'None';
            this.buildMesh();
            if (this.weaponType) {
                this.setWeapon(this.weaponType, this.weaponRarity);
            }
        }
    }

    buildMesh() {
        while (this.group.children.length > 0) {
            this.group.remove(this.group.children[0]);
        }
        this.parts = {};
        this.droneGroup = null;

        const isFemale = this.gender === 'female';
        // 🛡️ Strict 2D Exonie Visual Rule: Appearance changes ONLY based on rarity of equipment!
        const armorTheme = EQUIPMENT_RARITY_THEMES[this.armorRarity] || EQUIPMENT_RARITY_THEMES['Starter'];
        const leggingsTheme = EQUIPMENT_RARITY_THEMES[this.leggingsRarity] || EQUIPMENT_RARITY_THEMES['Starter'];

        const skinMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.skinColor),
            roughness: 0.52,
            metalness: 0.05
        });
        const hairMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.hairColor),
            roughness: 0.32,
            metalness: 0.22
        });
        const armorMat = new THREE.MeshStandardMaterial({
            color: armorTheme.primary,
            roughness: 0.28,
            metalness: 0.78
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: armorTheme.trim,
            roughness: 0.22,
            metalness: 0.88
        });
        const jointMat = new THREE.MeshStandardMaterial({
            color: 0x1a1d24,
            roughness: 0.45,
            metalness: 0.72
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: armorTheme.glow,
            emissive: armorTheme.glow,
            emissiveIntensity: armorTheme.hasGlow ? armorTheme.emissiveIntensity : 0.2,
            roughness: 0.15,
            metalness: 0.1
        });
        const outlineMat = new THREE.MeshBasicMaterial({
            color: armorTheme.trim,
            side: THREE.BackSide,
            transparent: true,
            opacity: armorTheme.hasGlow ? 0.65 : 0.35
        });

        // Leggings Materials (Separate Rarity Visuals for Legs)
        const leggingsMat = new THREE.MeshStandardMaterial({
            color: leggingsTheme.primary,
            roughness: 0.28,
            metalness: 0.78
        });
        const leggingsTrimMat = new THREE.MeshStandardMaterial({
            color: leggingsTheme.trim,
            roughness: 0.22,
            metalness: 0.88
        });
        const leggingsGlowMat = new THREE.MeshStandardMaterial({
            color: leggingsTheme.glow,
            emissive: leggingsTheme.glow,
            emissiveIntensity: leggingsTheme.hasGlow ? leggingsTheme.emissiveIntensity : 0.2,
            roughness: 0.15,
            metalness: 0.1
        });

        this.materials = { skinMat, hairMat, armorMat, trimMat, jointMat, glowMat, outlineMat, leggingsMat, leggingsTrimMat, leggingsGlowMat };

        // Contact Blob Shadow & Aura Ring
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1.75, 1.75),
            new THREE.MeshBasicMaterial({
                map: getCharacterBlobShadowTex(),
                transparent: true,
                depthWrite: false
            })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.02;
        this.group.add(shadowPlane);

        const hasClass = this.jobClass && this.jobClass !== 'None' && this.jobClass !== 'No Class';
        const auraRingGeo = new THREE.RingGeometry(0.68, 0.82, 32);
        const auraRingMat = new THREE.MeshBasicMaterial({
            color: armorTheme.glow,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: hasClass ? 0.58 : 0.22
        });
        this.auraRing = new THREE.Mesh(auraRingGeo, auraRingMat);
        this.auraRing.rotation.x = -Math.PI / 2;
        this.auraRing.position.y = 0.03;
        this.group.add(this.auraRing);

        // Root Pelvis / Hips Pivot (Raised so boots sit cleanly on top of floor & carpets)
        const hips = new THREE.Group();
        hips.position.y = 1.05;
        this.group.add(hips);
        this.parts.hips = hips;

        const pelvisMesh = new THREE.Mesh(chamferBox(0.46, 0.22, 0.30, 0.04), armorMat);
        pelvisMesh.castShadow = true;
        hips.add(pelvisMesh);

        const beltMesh = new THREE.Mesh(chamferBox(0.50, 0.09, 0.34, 0.02), trimMat);
        beltMesh.position.y = 0.06;
        hips.add(beltMesh);

        const buckleGlow = new THREE.Mesh(chamferBox(0.14, 0.08, 0.06, 0.015), glowMat);
        buckleGlow.position.set(0, 0.06, 0.16);
        hips.add(buckleGlow);

        if (isFemale) {
            const skirtGeo = new THREE.ConeGeometry(0.39, 0.34, 16, 1, true);
            const skirtMesh = new THREE.Mesh(skirtGeo, armorMat);
            skirtMesh.position.y = -0.10;
            skirtMesh.castShadow = true;
            hips.add(skirtMesh);

            const skirtHem = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 8, 24), glowMat);
            skirtHem.rotation.x = Math.PI / 2;
            skirtHem.position.y = -0.26;
            hips.add(skirtHem);
        } else {
            [-1, 1].forEach(side => {
                const tasset = new THREE.Mesh(chamferBox(0.14, 0.28, 0.26, 0.025), armorMat);
                tasset.position.set(side * 0.24, -0.10, 0);
                tasset.rotation.z = side * -0.14;
                tasset.castShadow = true;
                hips.add(tasset);

                const tassetTrim = new THREE.Mesh(chamferBox(0.15, 0.04, 0.27, 0.01), glowMat);
                tassetTrim.position.set(side * 0.25, -0.22, 0);
                tassetTrim.rotation.z = side * -0.14;
                hips.add(tassetTrim);
            });
        }

        // Sculpted Torso Pivot
        const torso = new THREE.Group();
        torso.position.y = 0.08;
        hips.add(torso);
        this.parts.torso = torso;

        const torsoH = 0.68;
        const chestMesh = new THREE.Mesh(sculptedTorsoGeo(isFemale, torsoH), armorMat);
        chestMesh.position.y = torsoH * 0.5;
        chestMesh.castShadow = true;
        chestMesh.receiveShadow = true;
        torso.add(chestMesh);

        const chestOutline = new THREE.Mesh(sculptedTorsoGeo(isFemale, torsoH), outlineMat);
        chestOutline.position.y = torsoH * 0.5;
        chestOutline.scale.setScalar(1.045);
        torso.add(chestOutline);

        const plastron = new THREE.Mesh(chamferBox(isFemale ? 0.34 : 0.42, 0.28, 0.14, 0.035), trimMat);
        plastron.position.set(0, torsoH * 0.62, 0.14);
        plastron.castShadow = true;
        torso.add(plastron);

        const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), glowMat);
        coreGem.position.set(0, torsoH * 0.62, 0.21);
        coreGem.scale.set(1, 1.3, 0.6);
        torso.add(coreGem);

        const backPack = new THREE.Mesh(chamferBox(0.28, 0.34, 0.14, 0.03), trimMat);
        backPack.position.set(0, torsoH * 0.58, -0.18);
        backPack.castShadow = true;
        torso.add(backPack);

        const spineGlow = new THREE.Mesh(chamferBox(0.06, 0.26, 0.04, 0.01), glowMat);
        spineGlow.position.set(0, torsoH * 0.58, -0.25);
        torso.add(spineGlow);

        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 20), trimMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = torsoH + 0.01;
        torso.add(collar);

        // Neck & Expressive Anime Head
        const neck = new THREE.Group();
        neck.position.y = torsoH + 0.04;
        torso.add(neck);
        this.parts.neck = neck;

        const neckCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.14, 14), skinMat);
        neckCyl.position.y = 0.05;
        neck.add(neckCyl);

        const head = new THREE.Group();
        head.position.y = 0.28;
        neck.add(head);
        this.parts.head = head;

        const headGeo = new THREE.SphereGeometry(0.29, 24, 20);
        headGeo.scale(1.0, 1.04, 0.96);
        const headMesh = new THREE.Mesh(headGeo, skinMat);
        headMesh.castShadow = true;
        head.add(headMesh);

        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyeIrisMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.eyeColor) });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090b10 });
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8a80, transparent: true, opacity: 0.42 });

        [-1, 1].forEach(side => {
            const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), eyeWhiteMat);
            sclera.scale.set(1.15, 1.35, 0.45);
            sclera.position.set(side * 0.105, -0.01, 0.245);
            head.add(sclera);

            const iris = new THREE.Mesh(new THREE.SphereGeometry(0.043, 12, 12), eyeIrisMat);
            iris.scale.set(1.0, 1.25, 0.45);
            iris.position.set(side * 0.105, -0.01, 0.262);
            head.add(iris);

            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), pupilMat);
            pupil.scale.set(1.0, 1.2, 0.45);
            pupil.position.set(side * 0.105, -0.01, 0.274);
            head.add(pupil);

            const shine = new THREE.Mesh(new THREE.SphereGeometry(0.013, 8, 8), eyeWhiteMat);
            shine.position.set(side * 0.105 + 0.016, 0.018, 0.282);
            head.add(shine);

            const brow = new THREE.Mesh(chamferBox(0.09, 0.02, 0.02, 0.005), hairMat);
            brow.position.set(side * 0.105, 0.075, 0.268);
            brow.rotation.z = side * (isFemale ? 0.06 : -0.10);
            head.add(brow);

            const blush = new THREE.Mesh(new THREE.CircleGeometry(0.036, 12), blushMat);
            blush.position.set(side * 0.15, -0.075, 0.258);
            blush.rotation.y = side * 0.35;
            head.add(blush);
        });

        this.buildHair(head, hairMat, glowMat);

        // Two-Segment Articulated Arms
        const shoulderX = isFemale ? 0.31 : 0.36;
        const shoulderY = torsoH - 0.08;

        this.buildArm('l', -shoulderX, shoulderY, torso, armorMat, trimMat, jointMat, glowMat, skinMat);
        this.buildArm('r',  shoulderX, shoulderY, torso, armorMat, trimMat, jointMat, glowMat, skinMat);

        this.weaponGroup = new THREE.Group();
        this.weaponGroup.position.set(0, -0.08, 0.04);
        this.parts.rHand.add(this.weaponGroup);

        this.offhandWeaponGroup = new THREE.Group();
        this.offhandWeaponGroup.position.set(0, -0.08, 0.04);
        this.parts.lHand.add(this.offhandWeaponGroup);

        // Two-Segment Articulated Legs (Uses separate Leggings Rarity Materials)
        const hipX = 0.155;
        this.buildLeg('l', -hipX, hips, leggingsMat, leggingsTrimMat, jointMat, leggingsGlowMat, skinMat);
        this.buildLeg('r',  hipX, hips, leggingsMat, leggingsTrimMat, jointMat, leggingsGlowMat, skinMat);

        // Dynamic Armor & Leggings Glow Lights (Legendary, Godly, Divine)
        if (armorTheme.hasGlow) {
            const chestGlowLight = new THREE.PointLight(armorTheme.glow, 2.2, 3.8);
            chestGlowLight.position.set(0, torsoH * 0.62, 0.28);
            torso.add(chestGlowLight);
        }
        if (leggingsTheme.hasGlow) {
            const legGlowLight = new THREE.PointLight(leggingsTheme.glow, 1.8, 3.2);
            legGlowLight.position.set(0, -0.25, 0.12);
            hips.add(legGlowLight);
        }

        this.auraLight = new THREE.PointLight(armorTheme.glow, hasClass ? 1.1 : 0.35, 4.5);
        this.auraLight.position.set(0, 1.3, 0.3);
        this.group.add(this.auraLight);

        this.applyCombatReadyPose();
    }

    buildArm(side, x, y, torso, armorMat, trimMat, jointMat, glowMat, skinMat) {
        const sign = side === 'l' ? -1 : 1;
        const shoulder = new THREE.Group();
        shoulder.position.set(x, y, 0);
        torso.add(shoulder);

        const pauldron = new THREE.Mesh(chamferBox(0.18, 0.16, 0.20, 0.035), armorMat);
        pauldron.position.set(sign * 0.03, 0.03, 0);
        pauldron.rotation.z = sign * -0.22;
        pauldron.castShadow = true;
        shoulder.add(pauldron);

        const pauldronTrim = new THREE.Mesh(chamferBox(0.19, 0.035, 0.21, 0.01), glowMat);
        pauldronTrim.position.set(sign * 0.03, -0.03, 0);
        pauldronTrim.rotation.z = sign * -0.22;
        shoulder.add(pauldronTrim);

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.30, 12), skinMat);
        upperArm.position.y = -0.16;
        upperArm.castShadow = true;
        shoulder.add(upperArm);

        const elbow = new THREE.Group();
        elbow.position.y = -0.31;
        shoulder.add(elbow);

        const elbowSphere = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), jointMat);
        elbow.add(elbowSphere);

        const forearm = new THREE.Mesh(chamferBox(0.12, 0.28, 0.12, 0.025), armorMat);
        forearm.position.y = -0.15;
        forearm.castShadow = true;
        elbow.add(forearm);

        const vambraceGlow = new THREE.Mesh(chamferBox(0.035, 0.18, 0.13, 0.01), glowMat);
        vambraceGlow.position.set(sign * 0.045, -0.15, 0);
        elbow.add(vambraceGlow);

        const hand = new THREE.Group();
        hand.position.y = -0.30;
        elbow.add(hand);

        const fist = new THREE.Mesh(chamferBox(0.10, 0.11, 0.11, 0.025), skinMat);
        fist.castShadow = true;
        hand.add(fist);

        this.parts[`${side}Shoulder`] = shoulder;
        this.parts[`${side}Elbow`] = elbow;
        this.parts[`${side}Hand`] = hand;
    }

    buildLeg(side, x, hips, armorMat, trimMat, jointMat, glowMat, skinMat) {
        const hip = new THREE.Group();
        hip.position.set(x, -0.06, 0);
        hips.add(hip);

        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.085, 0.42, 14), skinMat);
        thigh.position.y = -0.21;
        thigh.castShadow = true;
        hip.add(thigh);

        const thighPlate = new THREE.Mesh(chamferBox(0.16, 0.26, 0.18, 0.03), armorMat);
        thighPlate.position.set(0, -0.18, 0.02);
        thighPlate.castShadow = true;
        hip.add(thighPlate);

        const knee = new THREE.Group();
        knee.position.y = -0.42;
        hip.add(knee);

        const kneeGuard = new THREE.Mesh(chamferBox(0.14, 0.13, 0.15, 0.03), trimMat);
        kneeGuard.position.set(0, 0, 0.04);
        knee.add(kneeGuard);

        const shin = new THREE.Mesh(chamferBox(0.15, 0.38, 0.16, 0.03), armorMat);
        shin.position.y = -0.20;
        shin.castShadow = true;
        knee.add(shin);

        const shinStripe = new THREE.Mesh(chamferBox(0.04, 0.24, 0.17, 0.01), glowMat);
        shinStripe.position.set(0, -0.20, 0.01);
        knee.add(shinStripe);

        const foot = new THREE.Group();
        foot.position.y = -0.39;
        knee.add(foot);

        const boot = new THREE.Mesh(chamferBox(0.17, 0.12, 0.28, 0.03), trimMat);
        boot.position.set(0, 0.015, 0.05);
        boot.castShadow = true;
        foot.add(boot);

        const soleGlow = new THREE.Mesh(chamferBox(0.175, 0.03, 0.285, 0.01), glowMat);
        soleGlow.position.set(0, -0.04, 0.05);
        foot.add(soleGlow);

        this.parts[`${side}Hip`] = hip;
        this.parts[`${side}Knee`] = knee;
        this.parts[`${side}Foot`] = foot;
    }

    buildHair(headGroup, hairMat, glowMat) {
        if (this.hairStyle === 'none') return;

        const isFemale = this.gender === 'female';
        const styleNum = Math.max(1, Math.min(5, Number(this.hairStyle) || 1));

        // Base skull hair cap
        const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.308, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
            hairMat
        );
        cap.position.y = 0.02;
        cap.castShadow = true;
        headGroup.add(cap);

        if (isFemale) {
            // ================================================================
            // 5 DISTINCT FEMALE HAIRSTYLES
            // ================================================================
            if (styleNum === 1) {
                // Female Style 1: Twin Tails with Ribbons & Soft Fringe
                for (let i = -2; i <= 2; i++) {
                    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.064, 0.22, 6), hairMat);
                    bang.position.set(i * 0.07, 0.15, 0.248 - Math.abs(i) * 0.018);
                    bang.rotation.x = Math.PI + 0.18;
                    bang.rotation.z = i * -0.08;
                    headGroup.add(bang);
                }
                [-1, 1].forEach(s => {
                    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.022, 8, 16), glowMat);
                    ribbon.position.set(s * 0.29, 0.12, -0.06);
                    ribbon.rotation.y = Math.PI / 2;
                    headGroup.add(ribbon);

                    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.72, 10), hairMat);
                    tail.position.set(s * 0.39, -0.16, -0.10);
                    tail.rotation.z = s * 0.36;
                    tail.rotation.x = Math.PI - 0.20;
                    headGroup.add(tail);
                });
            } else if (styleNum === 2) {
                // Female Style 2: Long Flowing Waist-Length Hair with Side-Swept Bangs
                for (let i = -2; i <= 2; i++) {
                    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.24, 6), hairMat);
                    bang.position.set(i * 0.072, 0.15, 0.245 - Math.abs(i) * 0.018);
                    bang.rotation.x = Math.PI + 0.20;
                    bang.rotation.z = 0.22 - i * 0.06;
                    headGroup.add(bang);
                }
                const headband = new THREE.Mesh(new THREE.TorusGeometry(0.298, 0.018, 8, 24), glowMat);
                headband.rotation.x = Math.PI * 0.42;
                headband.position.y = 0.11;
                headGroup.add(headband);

                const backHair = new THREE.Mesh(chamferBox(0.54, 0.78, 0.16, 0.06), hairMat);
                backHair.position.set(0, -0.26, -0.22);
                backHair.rotation.x = 0.18;
                headGroup.add(backHair);

                [-1, 1].forEach(s => {
                    const sideLock = new THREE.Mesh(new THREE.ConeGeometry(0.078, 0.54, 8), hairMat);
                    sideLock.position.set(s * 0.25, -0.16, 0.11);
                    sideLock.rotation.x = Math.PI;
                    headGroup.add(sideLock);
                });
            } else if (styleNum === 3) {
                // Female Style 3: Sleek Hime Bob Cut
                for (let i = -2; i <= 2; i++) {
                    const fringe = new THREE.Mesh(chamferBox(0.068, 0.19, 0.04, 0.01), hairMat);
                    fringe.position.set(i * 0.065, 0.15, 0.255 - Math.abs(i) * 0.012);
                    fringe.rotation.x = -0.16;
                    headGroup.add(fringe);
                }
                const backBob = new THREE.Mesh(chamferBox(0.52, 0.38, 0.18, 0.06), hairMat);
                backBob.position.set(0, -0.06, -0.19);
                headGroup.add(backBob);

                [-1, 1].forEach(s => {
                    const cheekBob = new THREE.Mesh(chamferBox(0.11, 0.42, 0.26, 0.04), hairMat);
                    cheekBob.position.set(s * 0.25, -0.06, 0.02);
                    cheekBob.rotation.z = s * -0.08;
                    headGroup.add(cheekBob);
                });
            } else if (styleNum === 4) {
                // Female Style 4: High Valkyrie Ponytail
                for (let i = -1; i <= 1; i += 2) {
                    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 6), hairMat);
                    bang.position.set(i * 0.11, 0.13, 0.24);
                    bang.rotation.x = Math.PI + 0.18;
                    bang.rotation.z = i * -0.22;
                    headGroup.add(bang);
                }
                const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 8, 18), glowMat);
                tieRing.position.set(0, 0.24, -0.24);
                headGroup.add(tieRing);

                const highPony = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.68, 10), hairMat);
                highPony.position.set(0, 0.04, -0.44);
                highPony.rotation.x = -Math.PI * 0.70;
                headGroup.add(highPony);
            } else {
                // Female Style 5: Double Space Buns (Odango) with Framing Curls
                for (let i = -1; i <= 1; i += 2) {
                    const curl = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.42, 8), hairMat);
                    curl.position.set(i * 0.24, -0.10, 0.14);
                    curl.rotation.x = Math.PI;
                    headGroup.add(curl);

                    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 14), hairMat);
                    bun.position.set(i * 0.24, 0.27, -0.05);
                    headGroup.add(bun);

                    const bunRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), glowMat);
                    bunRing.position.set(i * 0.20, 0.22, -0.04);
                    bunRing.rotation.z = i * -0.65;
                    bunRing.rotation.x = Math.PI / 2;
                    headGroup.add(bunRing);
                }
            }
        } else {
            // ================================================================
            // 5 DISTINCT MALE HAIRSTYLES
            // ================================================================
            if (styleNum === 1) {
                // Male Style 1: Anime Hero Spikes
                for (let i = -2; i <= 2; i++) {
                    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.24, 6), hairMat);
                    bang.position.set(i * 0.075, 0.15, 0.245 - Math.abs(i) * 0.02);
                    bang.rotation.x = Math.PI + 0.25;
                    bang.rotation.z = i * -0.14;
                    headGroup.add(bang);
                }
                for (let i = 0; i < 9; i++) {
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.098, 0.36, 6), hairMat);
                    const angle = (i / 9) * Math.PI * 1.4 - Math.PI * 0.7;
                    spike.position.set(Math.sin(angle) * 0.24, 0.19 + (i % 2) * 0.06, -Math.cos(angle) * 0.22);
                    spike.rotation.z = -Math.sin(angle) * 0.78;
                    spike.rotation.x = -0.55;
                    headGroup.add(spike);
                }
            } else if (styleNum === 2) {
                // Male Style 2: Swept-Back Royal Quiff / Pompadour
                for (let i = -2; i <= 2; i++) {
                    const quiff = new THREE.Mesh(chamferBox(0.09, 0.18, 0.28, 0.03), hairMat);
                    quiff.position.set(i * 0.065, 0.26 - Math.abs(i) * 0.02, 0.06);
                    quiff.rotation.x = 0.35;
                    quiff.rotation.z = i * -0.12;
                    headGroup.add(quiff);
                }
                const forelock = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), hairMat);
                forelock.position.set(0.08, 0.16, 0.26);
                forelock.rotation.x = Math.PI + 0.22;
                forelock.rotation.z = -0.25;
                headGroup.add(forelock);
            } else if (styleNum === 3) {
                // Male Style 3: Samurai Warrior Topknot / Wolf-Tail + Headband
                const headband = new THREE.Mesh(new THREE.TorusGeometry(0.298, 0.022, 8, 24), glowMat);
                headband.rotation.x = Math.PI * 0.45;
                headband.position.y = 0.12;
                headGroup.add(headband);

                [-1, 1].forEach(s => {
                    const templeSpike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 6), hairMat);
                    templeSpike.position.set(s * 0.22, 0.04, 0.18);
                    templeSpike.rotation.x = Math.PI + 0.12;
                    templeSpike.rotation.z = s * -0.15;
                    headGroup.add(templeSpike);
                });

                const knotTie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 16), glowMat);
                knotTie.position.set(0, 0.24, -0.22);
                headGroup.add(knotTie);

                const wolfTail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 8), hairMat);
                wolfTail.position.set(0, 0.20, -0.38);
                wolfTail.rotation.x = -Math.PI * 0.58;
                headGroup.add(wolfTail);
            } else if (styleNum === 4) {
                // Male Style 4: Tactical Short Crop / Clean Undercut
                const topCrop = new THREE.Mesh(chamferBox(0.42, 0.14, 0.44, 0.04), hairMat);
                topCrop.position.set(0, 0.24, 0.02);
                topCrop.rotation.z = -0.08;
                headGroup.add(topCrop);

                for (let i = -2; i <= 2; i++) {
                    const shortFringe = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.14, 5), hairMat);
                    shortFringe.position.set(i * 0.068, 0.19, 0.24);
                    shortFringe.rotation.x = Math.PI + 0.35;
                    shortFringe.rotation.z = -0.20;
                    headGroup.add(shortFringe);
                }
            } else {
                // Male Style 5: Parted Curtain Bangs (Swordsman Middle Part)
                [-1, 1].forEach(s => {
                    const curtain = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.34, 7), hairMat);
                    curtain.position.set(s * 0.13, 0.11, 0.22);
                    curtain.rotation.x = Math.PI + 0.16;
                    curtain.rotation.z = s * -0.42;
                    headGroup.add(curtain);

                    const sideLayer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.32, 6), hairMat);
                    sideLayer.position.set(s * 0.25, -0.02, 0.04);
                    sideLayer.rotation.x = Math.PI - 0.10;
                    sideLayer.rotation.z = s * 0.15;
                    headGroup.add(sideLayer);
                });
                const napeHair = new THREE.Mesh(chamferBox(0.44, 0.26, 0.14, 0.04), hairMat);
                napeHair.position.set(0, -0.04, -0.22);
                napeHair.rotation.x = 0.22;
                headGroup.add(napeHair);
            }
        }
    }

    applyCombatReadyPose() {
        const p = this.parts;
        if (!p.hips) return;
        const wType = this.weaponType || 'sword';

        p.hips.rotation.set(0, 0, 0);
        p.hips.position.set(0, 1.05, 0);
        p.torso.rotation.set(0.06, -0.14, 0);
        p.head.rotation.set(-0.03, 0.12, 0);

        if (wType === 'gun') {
            // Marksman forward aim stance: barrel points 100% straight forward (+Z)
            p.torso.rotation.set(0.04, -0.16, 0);
            p.head.rotation.set(-0.02, 0.16, 0);
            p.rShoulder.rotation.set(-0.85, -0.06, -0.08);
            p.rElbow.rotation.set(-0.72, 0, 0);
            p.lShoulder.rotation.set(-0.76, 0.46, 0.18);
            p.lElbow.rotation.set(-0.82, 0, 0);
        } else if (wType === 'staff') {
            // Upright Arcane Mage channel stance (staff held vertically in front of right hand, never on shoulder)
            p.torso.rotation.set(0.04, -0.12, 0);
            p.rShoulder.rotation.set(-0.62, -0.12, -0.16);
            p.rElbow.rotation.set(-0.78, 0, 0);
            p.lShoulder.rotation.set(-0.62, 0.28, 0.34);
            p.lElbow.rotation.set(-0.85, 0, 0);
        } else if (wType === 'pendant') {
            // Sacred Healer prayer clasp stance
            p.torso.rotation.set(0.02, 0, 0);
            p.head.rotation.set(0.04, 0, 0);
            p.lShoulder.rotation.set(-0.78, 0.46, 0.18);
            p.lElbow.rotation.set(-1.05, 0, 0);
            p.rShoulder.rotation.set(-0.78, -0.46, -0.18);
            p.rElbow.rotation.set(-1.05, 0, 0);
        } else if (wType === 'touchpad') {
            // Tech Genius tablet on left forearm + right hand tapping hologram
            p.torso.rotation.set(0.05, 0.10, 0);
            p.head.rotation.set(0.14, -0.12, 0);
            p.lShoulder.rotation.set(-0.72, 0.42, 0.22);
            p.lElbow.rotation.set(-1.02, 0, 0);
            p.rShoulder.rotation.set(-0.78, -0.36, -0.18);
            p.rElbow.rotation.set(-0.92, 0, 0);
        } else if (wType === 'dagger') {
            // Agile Twin-Dagger Assassin crouch stance
            p.hips.position.y = 0.99;
            p.torso.rotation.set(0.22, -0.18, 0);
            p.lShoulder.rotation.set(-0.52, 0.24, 0.32);
            p.lElbow.rotation.set(-0.92, 0, 0);
            p.rShoulder.rotation.set(-0.58, -0.24, -0.32);
            p.rElbow.rotation.set(-0.85, 0, 0);
        } else {
            // Heroic Broadsword warrior stance
            p.torso.rotation.set(0.08, -0.22, 0);
            p.lShoulder.rotation.set(-0.36, 0.22, 0.28);
            p.lElbow.rotation.set(-0.72, 0, 0);
            p.rShoulder.rotation.set(-0.32, -0.28, -0.36);
            p.rElbow.rotation.set(-0.65, 0, 0);
        }

        p.lHip.rotation.set(-0.08, 0, -0.04);
        p.lKnee.rotation.set(0.16, 0, 0);
        p.rHip.rotation.set(0.10, 0, 0.04);
        p.rKnee.rotation.set(0.18, 0, 0);
    }

    // ========================================================================
    // 3D WEAPONS & TECH GENIUS HOVERING MAGITECH DRONE
    // ========================================================================
    equipWeapon(weaponObj) {
        if (!weaponObj) {
            this.setWeapon(null);
            return;
        }
        const s = String(weaponObj.weaponType || weaponObj.sprite || weaponObj.name || 'sword').toLowerCase();
        let wType = 'sword';
        if (s.includes('touchpad')) wType = 'touchpad';
        else if (s.includes('dagger')) wType = 'dagger';
        else if (s.includes('gun')) wType = 'gun';
        else if (s.includes('staff')) wType = 'staff';
        else if (s.includes('pendant')) wType = 'pendant';
        this.setWeapon(wType, weaponObj.rarity || 'Starter');
    }

    setWeapon(wType, rarity = 'Starter') {
        this.weaponType = wType;
        this.weaponRarity = rarity || 'Starter';

        while (this.weaponGroup.children.length > 0) {
            this.weaponGroup.remove(this.weaponGroup.children[0]);
        }
        while (this.offhandWeaponGroup.children.length > 0) {
            this.offhandWeaponGroup.remove(this.offhandWeaponGroup.children[0]);
        }
        if (this.droneGroup) {
            this.group.remove(this.droneGroup);
            this.droneGroup = null;
        }
        if (!wType) {
            this.applyCombatReadyPose();
            return;
        }

        const theme = EQUIPMENT_RARITY_THEMES[this.weaponRarity] || EQUIPMENT_RARITY_THEMES['Starter'];
        const rarityColor = theme.glow;

        const metalMat = new THREE.MeshStandardMaterial({
            color: this.weaponRarity === 'Divine' ? 0xffea00 : (this.weaponRarity === 'Godly' ? 0xe0ffff : (this.weaponRarity === 'Legendary' ? 0xffccbc : 0xe0e6ed)),
            metalness: 0.92,
            roughness: 0.16
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: theme.primary,
            metalness: 0.78,
            roughness: 0.32
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: theme.glow,
            emissive: theme.glow,
            emissiveIntensity: theme.hasGlow ? theme.emissiveIntensity : 0.25,
            roughness: 0.15
        });

        const mesh = new THREE.Group();

        // 🌟 Legendary & Up Weapons have glowing aura lights & pulses!
        if (theme.hasGlow) {
            const wpnLight = new THREE.PointLight(theme.glow, 2.4, 4.0);
            wpnLight.position.set(0, 0.65, 0.05);
            mesh.add(wpnLight);
        }

        if (wType === 'sword') {
            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.34, 10), darkMat);
            const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), glowMat);
            pommel.position.y = -0.20;

            const guard = new THREE.Mesh(chamferBox(0.42, 0.08, 0.12, 0.02), darkMat);
            guard.position.y = 0.18;

            const guardCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), glowMat);
            guardCore.position.set(0, 0.18, 0.05);

            const blade = new THREE.Mesh(chamferBox(0.13, 1.38, 0.035, 0.01), metalMat);
            blade.position.y = 0.90;
            blade.castShadow = true;

            const fuller = new THREE.Mesh(chamferBox(0.045, 1.18, 0.042, 0.008), glowMat);
            fuller.position.y = 0.86;

            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 4), metalMat);
            tip.position.y = 1.68;
            tip.rotation.y = Math.PI / 4;

            mesh.add(handle, pommel, guard, guardCore, blade, fuller, tip);
            mesh.rotation.x = Math.PI / 2;

        } else if (wType === 'dagger') {
            const buildDaggerMesh = () => {
                const d = new THREE.Group();
                const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.24, 8), darkMat);
                const guard = new THREE.Mesh(chamferBox(0.24, 0.05, 0.08, 0.015), glowMat);
                guard.position.y = 0.12;
                const blade = new THREE.Mesh(chamferBox(0.085, 0.66, 0.028, 0.008), metalMat);
                blade.position.y = 0.46;
                const edgeGlow = new THREE.Mesh(chamferBox(0.03, 0.56, 0.034, 0.005), glowMat);
                edgeGlow.position.y = 0.45;
                d.add(handle, guard, blade, edgeGlow);
                d.rotation.x = Math.PI / 2;
                return d;
            };
            mesh.add(buildDaggerMesh());
            const offhand = buildDaggerMesh();
            offhand.rotation.x = -Math.PI / 2;
            this.offhandWeaponGroup.add(offhand);

        } else if (wType === 'gun') {
            const body = new THREE.Mesh(chamferBox(0.11, 0.20, 0.68, 0.025), darkMat);
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.68, 12), metalMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 0.05, 0.44);
            const railGlow = new THREE.Mesh(chamferBox(0.045, 0.06, 0.66, 0.01), glowMat);
            railGlow.position.set(0, 0.09, 0.28);
            const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.09, 12), glowMat);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.set(0, 0.05, 0.78);
            const grip = new THREE.Mesh(chamferBox(0.08, 0.24, 0.11, 0.02), darkMat);
            grip.position.set(0, -0.14, -0.14);
            grip.rotation.x = 0.25;
            mesh.add(body, barrel, railGlow, muzzle, grip);
            // Rotate +90 deg around X so when the arm is raised to aim forward (rShoulder.rx + rElbow.rx = -90 deg),
            // the gun barrel points 100% horizontally straight forward (+Z) and the grip sits in the fist!
            mesh.rotation.x = Math.PI / 2;
            mesh.position.set(0, -0.04, 0.02);

        } else if (wType === 'staff') {
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.95, 10), darkMat);
            shaft.position.y = 0.38;
            const bottomCap = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.18, 8), metalMat);
            bottomCap.position.y = -0.62;
            bottomCap.rotation.x = Math.PI;
            const gripWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.32, 10), glowMat);
            gripWrap.position.y = 0.0;
            const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.024, 8, 24), metalMat);
            ring1.position.y = 1.42;
            const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 20), glowMat);
            ring2.position.y = 1.42;
            ring2.rotation.y = Math.PI / 2;
            const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), glowMat);
            orb.position.y = 1.42;
            mesh.add(shaft, bottomCap, gripWrap, ring1, ring2, orb);
            // Counter the forearm bend (rShoulder.rx + rElbow.rx = -1.40 rad) so the staff stands
            // vertically upright in front of the mage (tilted slightly forward, never resting on the shoulder!)
            mesh.rotation.set(1.48, 0, 0.14);
            mesh.position.set(0.02, -0.04, 0.06);
            this.staffRing1 = ring1;
            this.staffRing2 = ring2;
            this.staffOrb = orb;

        } else if (wType === 'pendant') {
            const chain = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.016, 8, 20), metalMat);
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowMat);
            crystal.position.y = 0.26;
            const halo = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 24), glowMat);
            halo.position.y = 0.26;
            const innerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 20), metalMat);
            innerHalo.position.y = 0.26;
            innerHalo.rotation.x = Math.PI / 2;
            mesh.add(chain, crystal, halo, innerHalo);
            mesh.rotation.x = Math.PI / 2;
            this.pendantCrystal = crystal;
            this.pendantHalo = halo;

        } else if (wType === 'touchpad') {
            const padFrame = new THREE.Mesh(chamferBox(0.38, 0.038, 0.28, 0.01), darkMat);
            const padScreen = new THREE.Mesh(
                chamferBox(0.33, 0.022, 0.23, 0.005),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.90 })
            );
            padScreen.position.y = 0.018;

            const holoRing = new THREE.Mesh(
                new THREE.RingGeometry(0.06, 0.11, 20),
                new THREE.MeshBasicMaterial({ color: rarityColor, side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
            );
            holoRing.rotation.x = -Math.PI / 2;
            holoRing.position.y = 0.08;

            const holoProj = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.055, 0),
                glowMat
            );
            holoProj.position.y = 0.14;
            this.touchpadHolo = holoProj;
            this.touchpadRing = holoRing;

            mesh.add(padFrame, padScreen, holoRing, holoProj);
            mesh.rotation.x = 0.25;
            mesh.position.set(0.04, -0.04, 0.06);
            this.offhandWeaponGroup.add(mesh);
            // Only summon the hovering Gadget Drone when the player has awakened as a Tech Genius!
            if (this.jobClass === 'Tech Genius') {
                this.buildMagitechDrone(rarityColor, metalMat, darkMat, glowMat);
            }
            this.applyCombatReadyPose();
            return;
        }

        this.weaponGroup.add(mesh);
        this.applyCombatReadyPose();
    }

    buildMagitechDrone(rarityColor, metalMat, darkMat, glowMat) {
        const drone = new THREE.Group();
        drone.position.set(0.88, 2.15, 0.25);

        const chassis = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), metalMat);
        chassis.scale.set(1.15, 0.78, 1.25);
        chassis.castShadow = true;
        drone.add(chassis);

        const armorShell = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), darkMat);
        armorShell.position.y = 0.03;
        drone.add(armorShell);

        const gyroRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 8, 28), glowMat);
        gyroRing.rotation.x = Math.PI / 2;
        drone.add(gyroRing);

        const eyeLens = new THREE.Mesh(
            new THREE.SphereGeometry(0.095, 14, 14),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        eyeLens.position.set(0, 0, 0.21);
        drone.add(eyeLens);

        [-0.19, 0.19].forEach(xOff => {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.38, 10), darkMat);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(xOff, -0.05, 0.22);
            drone.add(barrel);

            const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10), glowMat);
            tip.rotation.x = Math.PI / 2;
            tip.position.set(xOff, -0.05, 0.42);
            drone.add(tip);
        });

        const droneLight = new THREE.PointLight(rarityColor, 1.0, 3.8);
        drone.add(droneLight);

        this.group.add(drone);
        this.droneGroup = drone;
    }

    getDroneWorldPosition() {
        const pos = new THREE.Vector3();
        if (this.droneGroup) {
            this.droneGroup.getWorldPosition(pos);
        } else {
            this.group.getWorldPosition(pos);
            pos.y += 1.45;
        }
        return pos;
    }

    // ========================================================================
    // PROCEDURAL ANIMATION TRIGGERS & CIRCUIT SIEGE STATE MACHINE
    // ========================================================================
    triggerAttack(comboStep = 1, weaponType = null) {
        this.state = 'attack';
        this.attackProgress = 0;
        this.attackComboStep = Math.max(0, (comboStep || 1) - 1);
        this.attackWeaponType = weaponType || this.weaponType || 'sword';
    }

    triggerSkillCast(colorHex = 0x00e5ff) {
        this.state = 'skill';
        this.skillCastTimer = 0.55;
        if (this.auraLight) {
            this.auraLight.color.setHex(colorHex);
            this.auraLight.intensity = 3.2;
        }
    }

    triggerJump() {
        this.isGrounded = false;
    }

    onLand() {
        this.isGrounded = true;
        this.landTimer = 0.16;
    }

    triggerDodge() {
        this.state = 'dodge';
        this.dodgeTimer = 0.36;
    }

    update(dt, isMoving = false) {
        this.animTime += dt;
        const p = this.parts;
        if (!p.hips) return;

        if (this.landTimer > 0) this.landTimer = Math.max(0, this.landTimer - dt);

        const wType = this.weaponType || 'sword';
        const isDagger = wType === 'dagger';
        const isGun = wType === 'gun';
        const isStaff = wType === 'staff';
        const isPendant = wType === 'pendant';
        const isTouchpad = wType === 'touchpad';

        // Animate Weapon Orbs, Halos & Holograms
        if (this.staffOrb) {
            this.staffOrb.rotation.y = this.animTime * 2.5;
            this.staffOrb.rotation.x = this.animTime * 1.6;
        }
        if (this.staffRing1) this.staffRing1.rotation.z = this.animTime * 2.2;
        if (this.staffRing2) this.staffRing2.rotation.x = -this.animTime * 2.8;

        if (this.pendantCrystal) {
            this.pendantCrystal.rotation.y = this.animTime * 3.0;
            this.pendantCrystal.position.y = 0.26 + Math.sin(this.animTime * 4.0) * 0.03;
        }
        if (this.pendantHalo) {
            this.pendantHalo.rotation.z = -this.animTime * 2.4;
        }
        if (this.touchpadHolo) {
            this.touchpadHolo.rotation.y = this.animTime * 3.6;
            this.touchpadHolo.position.y = 0.14 + Math.sin(this.animTime * 5.0) * 0.02;
        }
        if (this.touchpadRing) {
            this.touchpadRing.rotation.z = this.animTime * 2.8;
        }

        // Animate Hovering Magitech Drone
        if (this.droneGroup) {
            this.droneGroup.position.y = 2.15 + Math.sin(this.animTime * 4.2) * 0.11;
            this.droneGroup.position.x = 0.88 + Math.cos(this.animTime * 2.4) * 0.06;
            if (this.droneGroup.children[2]) {
                this.droneGroup.children[2].rotation.z = this.animTime * 3.5;
            }
            if (this.state === 'attack' && this.attackWeaponType === 'touchpad') {
                const kick = Math.sin(this.attackProgress * Math.PI);
                this.droneGroup.position.z = 0.25 - kick * 0.18;
                this.droneGroup.rotation.x = -kick * 0.24;
            } else {
                this.droneGroup.position.z = damp(this.droneGroup.position.z, 0.25, 12, dt);
                this.droneGroup.rotation.x = damp(this.droneGroup.rotation.x, 0, 12, dt);
            }
        }

        if (this.auraRing) {
            this.auraRing.rotation.z = this.animTime * 0.9;
        }

        // 1. DODGE ROLL (360 Forward Flip)
        if (this.state === 'dodge') {
            this.dodgeTimer -= dt;
            const prog = 1 - Math.max(0, this.dodgeTimer / 0.36);
            p.hips.rotation.x = prog * Math.PI * 2;
            p.hips.position.y = 0.94 + Math.sin(prog * Math.PI) * 0.35;
            p.lKnee.rotation.x = 1.1;
            p.rKnee.rotation.x = 1.1;
            if (this.dodgeTimer <= 0) {
                p.hips.rotation.x = 0;
                p.hips.position.y = 1.05;
                this.state = 'idle';
            }
            return;
        }

        // 2. SKILL CAST SURGE
        if (this.state === 'skill') {
            this.skillCastTimer -= dt;
            const u = 1 - Math.max(0, this.skillCastTimer / 0.55);
            const pulse = Math.sin(u * Math.PI);
            p.hips.position.y = 1.05 + pulse * 0.14;
            p.torso.rotation.x = -0.18 * pulse;
            p.torso.rotation.y = 0;
            p.lShoulder.rotation.set(-2.1 * pulse, 0.3, -0.45);
            p.rShoulder.rotation.set(-2.1 * pulse, -0.3, 0.45);
            p.lElbow.rotation.x = -0.35;
            p.rElbow.rotation.x = -0.35;
            if (this.skillCastTimer <= 0) {
                const theme = CLASS_ARMOR_THEMES[this.jobClass] || CLASS_ARMOR_THEMES['None'];
                if (this.auraLight) {
                    this.auraLight.color.setHex(theme.glow);
                    this.auraLight.intensity = (this.jobClass && this.jobClass !== 'None') ? 1.1 : 0.35;
                }
                this.state = 'idle';
            }
            return;
        }

        // 3. DISTINCT WEAPON IDLE & LOCOMOTION TARGETS
        const k = 16;
        let hipY = isDagger ? 0.99 : 1.05;
        let hipZ = 0;
        let torsoRx = 0.08, torsoRy = -0.20, torsoRz = 0;
        let headRx = -0.03, headRy = 0.14;
        let lHipRx = -0.08, rHipRx = 0.10;
        let lKneeRx = 0.16, rKneeRx = 0.18;
        let lShRx = -0.36, lShRy = 0.22, lShRz = 0.28;
        let rShRx = -0.32, rShRy = -0.28, rShRz = -0.36;
        let lElRx = -0.72, rElRx = -0.65;

        const b = Math.sin(this.animTime * 2.8);

        if (isGun) {
            // Marksman: Gun leveled horizontally forward (+Z), left hand supporting wrist
            torsoRx = 0.04; torsoRy = -0.16;
            headRx = -0.02; headRy = 0.16;
            rShRx = -0.85 + b * 0.02; rShRy = -0.06; rShRz = -0.08;
            rElRx = -0.72; // rShRx (-0.85) + rElRx (-0.72) = -1.57 rad (-90 deg), pointing gun straight forward!
            lShRx = -0.76 + b * 0.02; lShRy = 0.46; lShRz = 0.18;
            lElRx = -0.82;
        } else if (isStaff) {
            // Arcane Mage: Upright staff held vertically in front of right hand, left hand weaving arcane mana
            torsoRx = 0.04; torsoRy = -0.12;
            rShRx = -0.62 + b * 0.025; rShRy = -0.12; rShRz = -0.16;
            rElRx = -0.78;
            lShRx = -0.65 + Math.sin(this.animTime * 3.8) * 0.16;
            lShRy = 0.28 + Math.cos(this.animTime * 3.8) * 0.12;
            lShRz = 0.34;
            lElRx = -0.88;
        } else if (isPendant) {
            // Sacred Healer: Serene prayer clasp near heart, gentle floating breath
            hipY = 1.06 + b * 0.035;
            torsoRx = 0.02; torsoRy = 0;
            headRx = 0.04; headRy = 0;
            lShRx = -0.78 + b * 0.04; lShRy = 0.46; lShRz = 0.18; lElRx = -1.05;
            rShRx = -0.78 + b * 0.04; rShRy = -0.46; rShRz = -0.18; rElRx = -1.05;
        } else if (isTouchpad) {
            // Tech Genius: Left forearm holds holographic tablet, right hand taps keys continuously
            torsoRx = 0.05; torsoRy = 0.10;
            headRx = 0.14; headRy = -0.12;
            lShRx = -0.72; lShRy = 0.42; lShRz = 0.22; lElRx = -1.02;
            const tapWave = Math.sin(this.animTime * 7.5);
            rShRx = -0.82 + tapWave * 0.08;
            rShRy = -0.36 + Math.cos(this.animTime * 5.2) * 0.06;
            rShRz = -0.18;
            rElRx = -0.92 - Math.abs(tapWave) * 0.12;
        } else if (isDagger) {
            // Twin-Dagger Assassin: Low forward crouch, dual blades poised
            hipY = 0.99 + b * 0.02;
            torsoRx = 0.22 + b * 0.02; torsoRy = -0.18;
            lShRx = -0.52 + b * 0.04; lShRy = 0.24; lShRz = 0.32; lElRx = -0.92;
            rShRx = -0.58 + b * 0.04; rShRy = -0.24; rShRz = -0.32; rElRx = -0.85;
        }

        if (!this.isGrounded) {
            hipY = 1.10;
            torsoRx = 0.14;
            lHipRx = -0.55; lKneeRx = 0.95;
            rHipRx = -0.30; rKneeRx = 0.65;
            if (!isGun && !isTouchpad) {
                lShRx = -0.65; lShRz = 0.45;
                rShRx = -0.55; rShRz = -0.45;
            }
        } else if (isMoving) {
            const phase = this.animTime * 12.5;
            const s = Math.sin(phase);
            const c = Math.cos(phase);

            hipY = (isDagger ? 0.98 : 1.03) + Math.abs(s) * 0.065;
            torsoRx = (isDagger ? 0.32 : (isPendant ? 0.12 : 0.22)) + Math.abs(c) * 0.04;
            torsoRy = isGun ? -0.14 : (isPendant ? -s * 0.08 : -s * 0.18);
            torsoRz = c * 0.04;
            headRx = isTouchpad ? 0.10 : -0.10;
            headRy = isGun ? 0.14 : s * 0.10;

            lHipRx = s * 0.78;
            rHipRx = -s * 0.78;
            lKneeRx = Math.max(0.08, -c * 0.85 + 0.35);
            rKneeRx = Math.max(0.08,  c * 0.85 + 0.35);

            if (isGun) {
                // Keep gun aimed forward while running!
                rShRx = -0.85 + Math.abs(s) * 0.04; rShRy = -0.06; rElRx = -0.72;
                lShRx = -s * 0.45 - 0.25; lElRx = -0.78;
            } else if (isTouchpad) {
                // Keep tablet steady on left forearm while right hand operates it
                lShRx = -0.72 + s * 0.06; lShRy = 0.42; lElRx = -1.02;
                rShRx = -0.80 + Math.sin(this.animTime * 9.0) * 0.09; rShRy = -0.34; rElRx = -0.95;
            } else if (isPendant) {
                // Keep holy pendant clasped at chest while gliding forward
                lShRx = -0.76 + s * 0.10; lShRy = 0.44; lElRx = -1.02;
                rShRx = -0.76 - s * 0.10; rShRy = -0.44; rElRx = -1.02;
            } else if (isStaff) {
                // Carry staff upright in front of right hand while running
                rShRx = -0.62 + s * 0.08; rShRy = -0.12; rShRz = -0.16; rElRx = -0.78;
                lShRx = -s * 0.55 - 0.20; lElRx = -0.82;
            } else {
                lShRx = -s * 0.65 - 0.15;
                lElRx = -0.82;
                rShRx = s * 0.55 - 0.20;
                rElRx = -0.72;
            }
        } else if (!isGun && !isStaff && !isPendant && !isTouchpad && !isDagger) {
            hipY = 1.05 + b * 0.022;
            torsoRx = 0.08 + b * 0.025;
            lShRx += b * 0.04;
            rShRx += b * 0.04;
        }

        if (this.landTimer > 0) {
            const squash = Math.sin((this.landTimer / 0.16) * Math.PI);
            hipY -= squash * 0.10;
            lKneeRx += squash * 0.40;
            rKneeRx += squash * 0.40;
        }

        // 4. LAYERED WEAPON ATTACK OVERRIDE (WITH BIG MELEE OOMPH & DISTINCT WEAPON MOTIONS)
        if (this.state === 'attack') {
            const speed = isDagger ? 4.4 : (isGun || isTouchpad ? 4.2 : 3.4);
            this.attackProgress += dt * speed;
            const u = Math.min(1, this.attackProgress);

            if (this.attackWeaponType === 'sword') {
                // HEAVY BROADSWORD — Wide Windup, Forward Lunge Step & Massive Follow-Through Cleave!
                if (this.attackComboStep === 0) {
                    // Combo 1: Deep right windup -> Explosive wide horizontal cleave across body
                    const isWindup = u < 0.24;
                    const swing = isWindup
                        ? -easeOut(u / 0.24) * 0.85
                        : -0.85 + easeOut((u - 0.24) / 0.76) * 2.25;
                    const lunge = Math.sin(u * Math.PI);
                    hipZ = lunge * 0.44;
                    hipY = 0.91 - lunge * 0.05;
                    torsoRx = 0.26 + lunge * 0.12;
                    torsoRy = swing * 1.05;
                    torsoRz = -swing * 0.16;
                    headRy = -swing * 0.45;
                    rShRx = -1.25 - lunge * 0.25;
                    rShRy = -0.35 + swing * 1.45;
                    rShRz = -0.75;
                    rElRx = -0.14;
                    lShRx = -0.55; lShRy = -0.35; lShRz = 0.45;
                    rHipRx = -0.45 * lunge; rKneeRx = 0.55 * lunge;
                    lHipRx = 0.35 * lunge;
                } else if (this.attackComboStep === 1) {
                    // Combo 2: Low crouch windup -> Fierce rising diagonal reverse slash!
                    const isWindup = u < 0.22;
                    const swing = isWindup
                        ? -easeOut(u / 0.22) * 0.75
                        : -0.75 + easeOut((u - 0.22) / 0.78) * 2.15;
                    const lunge = Math.sin(u * Math.PI);
                    hipZ = lunge * 0.48;
                    hipY = 0.88 + swing * 0.08;
                    torsoRx = 0.22 - swing * 0.24;
                    torsoRy = -swing * 1.08;
                    torsoRz = swing * 0.18;
                    rShRx = -0.65 - Math.max(0, swing) * 1.45;
                    rShRy = 0.65 - swing * 1.40;
                    rShRz = -0.45 + swing * 0.55;
                    rElRx = -0.18;
                    lHipRx = -0.48 * lunge; lKneeRx = 0.58 * lunge;
                } else {
                    // Combo 3: Full 360° Tornado Spin into Heavy Overhead Ground-Breaker Slam!
                    const spinPhase = Math.min(1, u / 0.68);
                    const slamPhase = u > 0.55 ? easeOut((u - 0.55) / 0.45) : 0;
                    const lunge = Math.sin(u * Math.PI);
                    p.hips.rotation.y = easeOut(spinPhase) * Math.PI * 2;
                    hipZ = lunge * 0.58;
                    hipY = 0.96 + Math.sin(spinPhase * Math.PI) * 0.18 - slamPhase * 0.12;
                    torsoRx = 0.18 + slamPhase * 0.38;
                    rShRx = -1.65 + slamPhase * 0.85;
                    rShRy = -0.25 * slamPhase;
                    rShRz = -1.05 * (1 - slamPhase * 0.6);
                    rElRx = -0.12;
                    lShRx = -1.25; lShRz = 0.75;
                }
            } else if (this.attackWeaponType === 'dagger') {
                // TWIN DAGGERS — Rapid Lunging Dual-Blade Flurry & X-Scissor Finisher!
                const strike = Math.sin(u * Math.PI);
                const swing = u < 0.22 ? -easeOut(u / 0.22) * 0.65 : -0.65 + easeOut((u - 0.22) / 0.78) * 1.95;
                hipZ = strike * 0.42;
                hipY = 0.86;
                torsoRx = 0.34;
                if (this.attackComboStep === 0) {
                    // Right blade wide lunging slash
                    torsoRy = swing * 0.98;
                    rShRx = -1.35;
                    rShRy = -0.30 + swing * 1.35;
                    rShRz = -0.55;
                    rElRx = -0.15;
                } else if (this.attackComboStep === 1) {
                    // Left offhand blade spinning ripper slash
                    torsoRy = -swing * 0.98;
                    lShRx = -1.35;
                    lShRy = 0.30 - swing * 1.35;
                    lShRz = 0.55;
                    lElRx = -0.15;
                } else {
                    // Twin-Blade X-Scissor Cross Cleave (Both arms slash simultaneously!)
                    hipZ = strike * 0.52;
                    torsoRx = 0.42;
                    torsoRy = 0;
                    lShRx = -1.42; lShRy = -0.45 + swing * 1.15; lShRz = 0.48; lElRx = -0.15;
                    rShRx = -1.42; rShRy = 0.45 - swing * 1.15; rShRz = -0.48; rElRx = -0.15;
                }
            } else if (this.attackWeaponType === 'gun') {
                // MARKSMAN GUN — Horizontal Forward Aim + Crisp Muzzle Recoil Kick!
                const recoil = Math.sin(u * Math.PI);
                hipZ = -recoil * 0.10;
                torsoRx = 0.04 - recoil * 0.10;
                torsoRy = -0.16;
                rShRx = -0.85 - recoil * 0.22;
                rShRy = -0.06;
                rShRz = -0.06;
                rElRx = -0.72 - recoil * 0.16;
                lShRx = -0.78 - recoil * 0.12;
                lShRy = 0.46;
                lElRx = -0.82;
            } else if (this.attackWeaponType === 'staff') {
                // ARCANE STAFF — Forward Upright Mage Thrust & Mana Projection (never tilts onto shoulder!)
                const cast = Math.sin(u * Math.PI);
                hipZ = cast * 0.18;
                torsoRx = 0.12 * cast;
                torsoRy = -0.20 + easeOut(u) * 0.55;
                rShRx = -0.62 - cast * 0.22;
                rShRy = -0.12 + cast * 0.28;
                rShRz = -0.16;
                rElRx = -0.78 + cast * 0.42;
                lShRx = -0.95 * cast - 0.45;
                lShRy = 0.35;
                lElRx = -0.45;
            } else if (this.attackWeaponType === 'pendant') {
                // SACRED PENDANT — Radiant Levitation & Skyward Prayer Benediction!
                const pray = Math.sin(u * Math.PI);
                hipY = 0.97 + pray * 0.12;
                torsoRx = -0.16 * pray;
                torsoRy = 0;
                headRx = -0.22 * pray;
                lShRx = -0.78 - pray * 0.85; lShRy = 0.42 * (1 - pray * 0.5); lElRx = -1.05 + pray * 0.65;
                rShRx = -0.78 - pray * 0.95; rShRy = -0.42 * (1 - pray * 0.5); rElRx = -1.05 + pray * 0.65;
            } else if (this.attackWeaponType === 'touchpad') {
                // TECH GENIUS TOUCHPAD — Rapid Command Swipe on Forearm Hologram Tablet!
                const tap = Math.sin(u * Math.PI * 2);
                lShRx = -0.78; lShRy = 0.44; lElRx = -1.05;
                rShRx = -0.92 - Math.abs(tap) * 0.25;
                rShRy = -0.28 + tap * 0.22;
                rElRx = -0.85;
            }

            const attackDamp = (this.attackWeaponType === 'sword' || this.attackWeaponType === 'dagger') ? 26 : k;
            p.hips.position.z = damp(p.hips.position.z, hipZ, attackDamp, dt);

            if (this.attackProgress >= 1) {
                p.hips.rotation.y = 0;
                p.hips.position.z = 0;
                this.state = isMoving ? 'walk' : 'idle';
                this.attackProgress = 0;
            }
        } else {
            p.hips.rotation.y = damp(p.hips.rotation.y, 0, k, dt);
            p.hips.position.z = damp(p.hips.position.z, 0, k, dt);
        }

        p.hips.position.y = damp(p.hips.position.y, hipY, k, dt);
        p.torso.rotation.x = damp(p.torso.rotation.x, torsoRx, k, dt);
        p.torso.rotation.y = damp(p.torso.rotation.y, torsoRy, k, dt);
        p.torso.rotation.z = damp(p.torso.rotation.z, torsoRz, k, dt);
        p.head.rotation.x = damp(p.head.rotation.x, headRx, k, dt);
        p.head.rotation.y = damp(p.head.rotation.y, headRy, k, dt);

        p.lShoulder.rotation.x = damp(p.lShoulder.rotation.x, lShRx, k, dt);
        p.lShoulder.rotation.y = damp(p.lShoulder.rotation.y, lShRy, k, dt);
        p.lShoulder.rotation.z = damp(p.lShoulder.rotation.z, lShRz, k, dt);
        p.lElbow.rotation.x = damp(p.lElbow.rotation.x, lElRx, k, dt);

        p.rShoulder.rotation.x = damp(p.rShoulder.rotation.x, rShRx, k, dt);
        p.rShoulder.rotation.y = damp(p.rShoulder.rotation.y, rShRy, k, dt);
        p.rShoulder.rotation.z = damp(p.rShoulder.rotation.z, rShRz, k, dt);
        p.rElbow.rotation.x = damp(p.rElbow.rotation.x, rElRx, k, dt);

        p.lHip.rotation.x = damp(p.lHip.rotation.x, lHipRx, k, dt);
        p.rHip.rotation.x = damp(p.rHip.rotation.x, rHipRx, k, dt);
        p.lKnee.rotation.x = damp(p.lKnee.rotation.x, lKneeRx, k, dt);
        p.rKnee.rotation.x = damp(p.rKnee.rotation.x, rKneeRx, k, dt);
    }
}

window.Character3D = Character3D;
