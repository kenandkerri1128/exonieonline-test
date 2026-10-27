// ============================================================================
// EXONIE 3D REMASTERED — CIRCUIT SIEGE WORLD, REALM & LABYRINTH MAZE GENERATOR
// Authentic 2D Map Proportions (15x Town, 10x Patterned Labyrinth Maze Floors,
// Floor-Located Dungeons, Woods Neutral Zone & Battlefield, & Solo Tavern Arena)
// ============================================================================
import * as THREE from 'three';
import { Character3D, chamferBox } from './character3d.js';
import { MONSTER_DATABASE } from './game_data.js';

export const MAP_THEMES = {
    town:           { name: 'Town of Exonie',            type: 'town',    sky: 0x0f2036, fog: 0x0f2036, ground: 0x26332c, wall: 0x78909c, accent: 0x00e5ff },
    floor1:         { name: 'Spire Floor 1 — Slime Sanctum',    type: 'spire',   sky: 0x101c2e, fog: 0x101c2e, ground: 0x1e293b, wall: 0x334155, accent: 0xff69b4 },
    floor2:         { name: 'Spire Floor 2 — Emerald Halls',    type: 'spire',   sky: 0x0d211d, fog: 0x0d211d, ground: 0x162b24, wall: 0x28473d, accent: 0x00e676 },
    floor3:         { name: 'Spire Floor 3 — Shadow Cavern',    type: 'spire',   sky: 0x140d26, fog: 0x140d26, ground: 0x1d1433, wall: 0x312254, accent: 0xb388ff },
    floor4:         { name: 'Spire Floor 4 — Crimson Roost',    type: 'spire',   sky: 0x240b12, fog: 0x240b12, ground: 0x301019, wall: 0x4d1927, accent: 0xff1744 },
    floor5:         { name: 'Spire Floor 5 — Magma Core',       type: 'spire',   sky: 0x291008, fog: 0x291008, ground: 0x38170c, wall: 0x572312, accent: 0xff6d00 },
    floor6:         { name: 'Spire Floor 6 — Astral Furnace',   type: 'spire',   sky: 0x1f1408, fog: 0x1f1408, ground: 0x2e1f0d, wall: 0x4a3216, accent: 0xffab00 },
    floor7:         { name: 'Spire Floor 7 — Monolith Depths',  type: 'spire',   sky: 0x171412, fog: 0x171412, ground: 0x26211d, wall: 0x423933, accent: 0xff9100 },
    floor8:         { name: 'Spire Floor 8 — Obsidian Citadel', type: 'spire',   sky: 0x121216, fog: 0x121216, ground: 0x1c1c24, wall: 0x323240, accent: 0x00e5ff },
    floor9:         { name: 'Spire Floor 9 — Wraith Necropolis',type: 'spire',   sky: 0x140824, fog: 0x140824, ground: 0x1f0d38, wall: 0x36165e, accent: 0xd500f9 },
    floor10:        { name: 'Spire Floor 10 — Throne of the Void King', type: 'spire', sky: 0x090312, fog: 0x090312, ground: 0x140726, wall: 0x280e4a, accent: 0xaa00ff },
    dungeon1:       { name: 'Dungeon 1 — Slime King Lair',      type: 'dungeon', sky: 0x0b1f17, fog: 0x0b1f17, ground: 0x133326, wall: 0x1e4d3a, accent: 0x76ff03 },
    dungeon2a:      { name: 'Ancient Cave A — Wraith Crypt',    type: 'dungeon', sky: 0x130821, fog: 0x130821, ground: 0x1d0d33, wall: 0x311654, accent: 0xd500f9 },
    dungeon2b:      { name: 'Ancient Cave B — Minotaur Maze',   type: 'dungeon', sky: 0x21110b, fog: 0x21110b, ground: 0x331a10, wall: 0x4f2919, accent: 0xff6d00 },
    dungeon2c:      { name: 'Ancient Cave C — Ignis Dragon Lair',type: 'dungeon',sky: 0x260808, fog: 0x260808, ground: 0x380c0c, wall: 0x5c1414, accent: 0xffd700 },
    event_cave:     { name: 'Labyrinth Event Cave',             type: 'dungeon', sky: 0x1f120b, fog: 0x1f120b, ground: 0x2e1b10, wall: 0x4a2c1a, accent: 0xff5252 },
    trainingtavern: { name: 'Training Tavern (Solo Challenge)', type: 'indoor',  sky: 0x1c120c, fog: 0x1c120c, ground: 0x3d281a, wall: 0x5c3d28, accent: 0xffab00 },
    neutralzone:    { name: 'Neutral Zone — Wild Woods (PvP & World Boss)', type: 'woods', sky: 0x102418, fog: 0x132a1c, ground: 0x1e3522, wall: 0x2e4c32, accent: 0xffd700 },
    battlefield:    { name: 'Battle Field — Forest Fortress Raid', type: 'woods', sky: 0x1d1612, fog: 0x241914, ground: 0x26331e, wall: 0x3e4a32, accent: 0xff1744 },
    hauntedhouse:   { name: 'Haunted House',                    type: 'dungeon', sky: 0x0b0514, fog: 0x0b0514, ground: 0x160a26, wall: 0x291347, accent: 0xb388ff },
    guildbase:      { name: 'Guild Base',                       type: 'town',    sky: 0x121e30, fog: 0x121e30, ground: 0x22303c, wall: 0x455a64, accent: 0xffd700 },
    home:           { name: 'My Home',                          type: 'indoor',  sky: 0x14241b, fog: 0x14241b, ground: 0x3d281a, wall: 0x5c3d28, accent: 0x69f0ae }
};

export class World3D {
    constructor(sceneOrEngine) {
        this.scene = sceneOrEngine.isScene ? sceneOrEngine : sceneOrEngine.scene;
        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        this.currentMap = 'town';
        this.colliders = [];
        this.portals = [];
        this.npcs = [];
        this.animatedProps = [];
        this.texCache = {};
        this.textureLoader = new THREE.TextureLoader();
        this.isNight = false;
        this.skyGroup = null;
        this.cloudMeshes = [];
        this.starMeshes = [];

        // Training Tavern challenge configuration (populated by #tavern-modal before entering)
        this.tavernChallengeConfig = {
            bossType: 'common', // 'common' | 'mini' | 'floor'
            level: 10
        };
    }

    get2DBackgroundTexture(filename) {
        const cleanName = String(filename || '').replace(/^backgrounds\//, '');
        const key = `bg2d_${cleanName}`;
        if (this.texCache[key]) return this.texCache[key];
        const tex = this.textureLoader.load(cleanName);
        tex.colorSpace = THREE.SRGBColorSpace;
        this.texCache[key] = tex;
        return tex;
    }

    toggleSkyTime() {
        this.isNight = !this.isNight;
        if (this.currentMap === 'town') {
            this.buildTownSkyAtmosphere();
        }
        return this.isNight;
    }

    buildTownSkyAtmosphere() {
        if (this.skyGroup) {
            this.worldGroup.remove(this.skyGroup);
            this.skyGroup = null;
        }
        this.cloudMeshes = [];
        this.starMeshes = [];

        const skyGroup = new THREE.Group();
        this.skyGroup = skyGroup;
        this.worldGroup.add(skyGroup);

        if (!this.isNight) {
            // ================================================================
            // MORNING / DAYTIME SKY: BRIGHT BLUE SKY, GOLDEN SUN & PUFFY CLOUDS
            // ================================================================
            this.scene.background = new THREE.Color(0x5da9e9);
            this.scene.fog = new THREE.FogExp2(0x8ecae6, 0.0022);

            const sunGroup = new THREE.Group();
            sunGroup.position.set(110, 105, -135);

            const sunCore = new THREE.Mesh(
                new THREE.SphereGeometry(10.5, 24, 24),
                new THREE.MeshBasicMaterial({ color: 0xfff3b0 })
            );
            sunGroup.add(sunCore);

            const sunHalo = new THREE.Mesh(
                new THREE.RingGeometry(11.5, 19.5, 32),
                new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
            );
            sunHalo.lookAt(0, 0, 0);
            sunGroup.add(sunHalo);

            const sunLight = new THREE.PointLight(0xfff3b0, 2.0, 380);
            sunGroup.add(sunLight);
            skyGroup.add(sunGroup);

            // 32 Fluffy 3D White Clouds Drifting Across the 15x Larger Town Sky
            const cloudMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0xdbeafe,
                emissiveIntensity: 0.25,
                roughness: 0.85,
                metalness: 0.0
            });
            for (let c = 0; c < 32; c++) {
                const cloud = new THREE.Group();
                const cx = (Math.random() - 0.5) * 320;
                const cy = 48 + Math.random() * 26;
                const cz = (Math.random() - 0.5) * 320;
                cloud.position.set(cx, cy, cz);

                const puffCount = 4 + (c % 3);
                for (let p = 0; p < puffCount; p++) {
                    const r = 3.6 + (p % 2) * 1.6;
                    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
                    puff.position.set((p - puffCount * 0.5) * 3.1, (p % 2) * 0.8, (p % 3 - 1) * 1.1);
                    puff.scale.set(1.3, 0.68, 1.0);
                    cloud.add(puff);
                }
                const speed = 1.6 + (c % 4) * 0.55;
                skyGroup.add(cloud);
                this.cloudMeshes.push({ mesh: cloud, speed });
            }
        } else {
            // ================================================================
            // NIGHTTIME SKY: DEEP STARRY SKY, GLOWING MOON & TWINKLING STARS
            // ================================================================
            this.scene.background = new THREE.Color(0x070b19);
            this.scene.fog = new THREE.FogExp2(0x070b19, 0.0026);

            const moonGroup = new THREE.Group();
            moonGroup.position.set(-105, 98, -125);

            const moonCore = new THREE.Mesh(
                new THREE.SphereGeometry(9.0, 24, 24),
                new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
            );
            moonGroup.add(moonCore);

            const moonHalo = new THREE.Mesh(
                new THREE.RingGeometry(9.8, 16.5, 32),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.42 })
            );
            moonHalo.lookAt(0, 0, 0);
            moonGroup.add(moonHalo);

            const moonLight = new THREE.PointLight(0x93c5fd, 1.6, 350);
            moonGroup.add(moonLight);
            skyGroup.add(moonGroup);

            const starGeo = new THREE.OctahedronGeometry(0.45, 0);
            for (let s = 0; s < 320; s++) {
                const starMat = new THREE.MeshBasicMaterial({
                    color: s % 5 === 0 ? 0x93c5fd : (s % 7 === 0 ? 0xfde047 : 0xffffff),
                    transparent: true,
                    opacity: 0.65 + Math.random() * 0.35
                });
                const star = new THREE.Mesh(starGeo, starMat);
                const theta = Math.random() * Math.PI * 2;
                const dist = 50 + Math.random() * 165;
                const sy = 42 + Math.random() * 70;
                star.position.set(Math.cos(theta) * dist, sy, Math.sin(theta) * dist);
                skyGroup.add(star);
                this.starMeshes.push({ mesh: star, mat: starMat, phase: Math.random() * 10 });
            }
        }
    }

    // Build a 100% Continuous, Gap-Free 4-Sided Perimeter Wall Around Any Map
    buildEnclosedPerimeterWalls(bound, wallH, theme, wallHexOverride = null) {
        const baseColor = wallHexOverride || ('#' + new THREE.Color(theme.wall || 0x334155).getHexString());
        const lineColor = '#' + new THREE.Color(theme.accent || 0x00e5ff).multiplyScalar(0.55).getHexString();
        const wallTex = this.getProceduralTexture('brick', baseColor, lineColor);
        wallTex.repeat.set(Math.max(10, Math.round(bound / 3.5)), 2);

        const wallMat = new THREE.MeshStandardMaterial({
            map: wallTex,
            roughness: 0.55,
            metalness: 0.30
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: theme.accent || 0x00e5ff,
            emissive: theme.accent || 0x00e5ff,
            emissiveIntensity: 0.85,
            roughness: 0.25
        });

        const fullLen = bound * 2 + 2.8;
        const thick = 2.6;
        const sides = [
            [0, -bound, fullLen, 0],
            [0,  bound, fullLen, 0],
            [-bound, 0, fullLen, Math.PI / 2],
            [ bound, 0, fullLen, Math.PI / 2]
        ];

        sides.forEach(([cx, cz, len, rotY]) => {
            const g = new THREE.Group();
            g.position.set(cx, 0, cz);
            g.rotation.y = rotY;

            const wMesh = new THREE.Mesh(chamferBox(len, wallH, thick, 0.12), wallMat);
            wMesh.position.y = wallH * 0.5;
            wMesh.castShadow = true;
            wMesh.receiveShadow = true;
            g.add(wMesh);

            const trimBar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, thick + 0.3), trimMat);
            trimBar.position.y = wallH * 0.82;
            g.add(trimBar);

            this.worldGroup.add(g);

            const steps = Math.max(24, Math.ceil(len / 3.5));
            for (let s = 0; s <= steps; s++) {
                const offset = -len * 0.49 + (s / steps) * (len * 0.98);
                const wx = cx + Math.cos(rotY) * offset;
                const wz = cz - Math.sin(rotY) * offset;
                this.colliders.push({ x: wx, z: wz, r: 2.0 });
            }
        });

        [[-bound, -bound], [bound, -bound], [-bound, bound], [bound, bound]].forEach(([px, pz]) => {
            const corner = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, wallH + 2.5, 12), wallMat);
            corner.position.set(px, (wallH + 2.5) * 0.5, pz);
            corner.castShadow = true;
            this.worldGroup.add(corner);

            const cap = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), trimMat);
            cap.position.set(px, wallH + 3.4, pz);
            this.worldGroup.add(cap);
        });
    }

    drawFloorPattern(ctx, floorNum, tx, ty, tileSize, cx, cy) {
        if (floorNum === 1) {
            ctx.strokeRect(tx + 46, ty + 46, tileSize - 92, tileSize - 92);
            ctx.strokeRect(tx + 78, ty + 78, tileSize - 156, tileSize - 156);
            ctx.beginPath();
            ctx.moveTo(cx, ty + 24); ctx.lineTo(cx, ty + 78);
            ctx.moveTo(tx + 24, cy); ctx.lineTo(tx + 78, cy);
            ctx.stroke();
        } else if (floorNum === 2) {
            for (let r = 26; r <= 84; r += 26) {
                ctx.beginPath();
                for (let a = 0; a < 8; a++) {
                    const ang = (a / 8) * Math.PI * 2;
                    const px = cx + Math.cos(ang) * r;
                    const py = cy + Math.sin(ang) * r;
                    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }
        } else if (floorNum === 3) {
            ctx.beginPath();
            ctx.moveTo(cx, ty + 26); ctx.lineTo(tx + tileSize - 26, cy);
            ctx.lineTo(cx, ty + tileSize - 26); ctx.lineTo(tx + 26, cy);
            ctx.closePath();
            ctx.stroke();
            ctx.strokeRect(cx - 30, cy - 30, 60, 60);
        } else if (floorNum === 4) {
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const ang = (a / 6) * Math.PI * 2;
                const px = cx + Math.cos(ang) * 68;
                const py = cy + Math.sin(ang) * 68;
                if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (floorNum === 5) {
            ctx.beginPath();
            for (let a = 0; a < 12; a++) {
                const ang = (a / 12) * Math.PI * 2;
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * 88, cy + Math.sin(ang) * 88);
            }
            ctx.stroke();
            ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.stroke();
        } else if (floorNum === 6) {
            ctx.strokeRect(tx + 40, ty + 40, tileSize - 80, tileSize - 80);
            ctx.beginPath();
            ctx.arc(tx + 40, ty + 40, 36, 0, Math.PI / 2);
            ctx.arc(tx + tileSize - 40, ty + 40, 36, Math.PI / 2, Math.PI);
            ctx.arc(tx + tileSize - 40, ty + tileSize - 40, 36, Math.PI, Math.PI * 1.5);
            ctx.arc(tx + 40, ty + tileSize - 40, 36, Math.PI * 1.5, Math.PI * 2);
            ctx.stroke();
        } else if (floorNum === 7) {
            ctx.beginPath();
            ctx.moveTo(tx + 24, ty + 24); ctx.lineTo(tx + tileSize - 24, ty + tileSize - 24);
            ctx.moveTo(tx + tileSize - 24, ty + 24); ctx.lineTo(tx + 24, ty + tileSize - 24);
            ctx.stroke();
            ctx.strokeRect(cx - 44, cy - 44, 88, 88);
        } else if (floorNum === 8) {
            ctx.beginPath();
            for (let t = 0; t < Math.PI * 6; t += 0.2) {
                const r = 14 + t * 4.0;
                const px = cx + Math.cos(t) * r;
                const py = cy + Math.sin(t) * r;
                if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        } else if (floorNum === 9) {
            ctx.beginPath();
            [-1, 1].forEach(s => {
                ctx.moveTo(cx, cy - 80 * s); ctx.lineTo(cx + 22, cy);
                ctx.lineTo(cx, cy + 80 * s); ctx.lineTo(cx - 22, cy);
            });
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, 75, 0, Math.PI * 2);
            ctx.arc(cx, cy, 38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeRect(cx - 52, cy - 52, 104, 104);
        }
    }

    // ========================================================================
    // INTRICATE REAL MAZE FLOOR PATTERN GENERATOR (10 Distinct Floor Patterns)
    // ========================================================================
    getMazePatternTexture(theme, floorNum = 1) {
        const baseHex = '#' + new THREE.Color(theme.ground || 0x1e293b).getHexString();
        const wallHex = '#' + new THREE.Color(theme.wall || 0x334155).getHexString();
        const accentHex = '#' + new THREE.Color(theme.accent || 0x00e5ff).getHexString();
        const key = `maze_pattern_v3_fl${floorNum}_${baseHex}_${accentHex}`;
        if (this.texCache[key]) return this.texCache[key];

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // 1. Deep Stone Base
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, 1024, 1024);

        // 2. 4x4 Grid of Carved Labyrinth Stone Flagstones (256x256 each)
        const tileSize = 256;
        for (let gy = 0; gy < 4; gy++) {
            for (let gx = 0; gx < 4; gx++) {
                const tx = gx * tileSize;
                const ty = gy * tileSize;
                const isAlt = (gx + gy) % 2 === 1;

                // Outer stone slab bevel
                ctx.fillStyle = isAlt ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.12)';
                ctx.fillRect(tx + 6, ty + 6, tileSize - 12, tileSize - 12);

                // Deep stone mortar trench
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.68)';
                ctx.lineWidth = 8;
                ctx.strokeRect(tx + 2, ty + 2, tileSize - 4, tileSize - 4);

                // Bevel highlight edge
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.lineWidth = 3;
                ctx.strokeRect(tx + 8, ty + 8, tileSize - 16, tileSize - 16);

                ctx.strokeStyle = wallHex;
                ctx.lineWidth = 4;
                ctx.strokeRect(tx + 24, ty + 24, tileSize - 48, tileSize - 48);

                ctx.strokeStyle = accentHex;
                ctx.lineWidth = 3.5;
                ctx.globalAlpha = 0.40;

                const cx = tx + tileSize / 2;
                const cy = ty + tileSize / 2;

                // Outer labyrinth ring with cardinal openings
                ctx.beginPath();
                this.drawFloorPattern(ctx, floorNum, tx, ty, tileSize, cx, cy);
                /* floor-specific pattern handled in drawFloorPattern */

                // Cross-pathway connectors (forming a true geometric maze pattern)
                ctx.beginPath();
                if (false) {
                    ctx.moveTo(cx, ty + 28); ctx.lineTo(cx, ty + 76);
                    ctx.moveTo(cx, ty + tileSize - 28); ctx.lineTo(cx, ty + tileSize - 76);
                    ctx.moveTo(tx + 44, cy); ctx.lineTo(tx + 96, cy);
                    ctx.moveTo(tx + tileSize - 44, cy); ctx.lineTo(tx + tileSize - 96, cy);
                } else {
                    ctx.moveTo(tx + 28, cy); ctx.lineTo(tx + 76, cy);
                    ctx.moveTo(tx + tileSize - 28, cy); ctx.lineTo(tx + tileSize - 76, cy);
                    ctx.moveTo(cx, ty + 44); ctx.lineTo(cx, ty + 96);
                    ctx.moveTo(cx, ty + tileSize - 44); ctx.lineTo(cx, ty + tileSize - 96);
                }
                ctx.stroke();

                // Center Runic Diamond Medallion inside each tile
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.moveTo(cx, cy - 26);
                ctx.lineTo(cx + 26, cy);
                ctx.lineTo(cx, cy + 26);
                ctx.lineTo(cx - 26, cy);
                ctx.closePath();
                ctx.stroke();

                ctx.fillStyle = accentHex;
                ctx.globalAlpha = 0.22;
                ctx.fill();

                // Corner rivets
                ctx.globalAlpha = 0.42;
                [[tx + 22, ty + 22], [tx + tileSize - 22, ty + 22], [tx + 22, ty + tileSize - 22], [tx + tileSize - 22, ty + tileSize - 22]].forEach(([rx, ry]) => {
                    ctx.beginPath();
                    ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.globalAlpha = 1.0;
            }
        }

        // 3. Grand Central Labyrinth Compass Rose Overlay across the 1024x1024 macro-tile
        ctx.strokeStyle = accentHex;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(512, 512, 460, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(512, 512, 220, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(16, 16);
        this.texCache[key] = tex;
        return tex;
    }

    // ========================================================================
    // WOODS / FOREST FLOOR TEXTURE GENERATOR (For Neutral Zone & Battlefield)
    // ========================================================================
    getWoodsFloorTexture(mapName) {
        const key = `woods_floor_${mapName}`;
        if (this.texCache[key]) return this.texCache[key];

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        const isBattle = mapName === 'battlefield';
        ctx.fillStyle = isBattle ? '#1f2d1a' : '#1b3320';
        ctx.fillRect(0, 0, 512, 512);

        // Organic woodland grass patches, moss, and forest dirt speckles
        for (let i = 0; i < 260; i++) {
            const x = (i * 73) % 512;
            const y = (i * 137) % 512;
            const r = 10 + (i % 5) * 6;
            ctx.fillStyle = i % 3 === 0
                ? 'rgba(46, 125, 50, 0.28)'
                : (i % 4 === 0 ? 'rgba(62, 39, 35, 0.24)' : 'rgba(102, 187, 106, 0.14)');
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Grass blade strokes
        ctx.strokeStyle = isBattle ? 'rgba(139, 195, 74, 0.22)' : 'rgba(129, 199, 132, 0.26)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 320; i++) {
            const gx = (i * 97) % 512;
            const gy = (i * 61) % 512;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + ((i % 3) - 1) * 4, gy - 9);
            ctx.stroke();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(24, 24);
        this.texCache[key] = tex;
        return tex;
    }

    getProceduralTexture(type, baseHex, lineHex) {
        const key = `${type}_${baseHex}_${lineHex}`;
        if (this.texCache[key]) return this.texCache[key];

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, 512, 512);

        if (type === 'cobble' || type === 'brick') {
            ctx.strokeStyle = lineHex;
            ctx.lineWidth = 4;
            const rows = 8;
            const cols = 4;
            const rh = 512 / rows;
            const cw = 512 / cols;
            for (let r = 0; r < rows; r++) {
                const offset = (r % 2) * (cw / 2);
                for (let c = -1; c <= cols; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,0.038)' : 'rgba(0,0,0,0.09)';
                    ctx.fillRect(c * cw + offset + 3, r * rh + 3, cw - 6, rh - 6);
                    ctx.strokeRect(c * cw + offset, r * rh, cw, rh);
                }
            }
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            for (let y = 32; y < 512; y += 64) {
                for (let x = 32; x < 512; x += 64) {
                    ctx.beginPath();
                    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (type === 'wood') {
            ctx.strokeStyle = lineHex;
            ctx.lineWidth = 3;
            for (let i = 0; i < 16; i++) {
                const y = i * 32;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(512, y);
                ctx.stroke();
            }
        } else if (type === 'grid') {
            ctx.strokeStyle = lineHex;
            ctx.lineWidth = 3;
            for (let i = 0; i <= 512; i += 64) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.14)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 512; i += 16) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
            }
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(28, 28);
        this.texCache[key] = tex;
        return tex;
    }

    clearWorld() {
        while (this.worldGroup.children.length > 0) {
            this.worldGroup.remove(this.worldGroup.children[0]);
        }
        this.colliders = [];
        this.portals = [];
        this.npcs = [];
        this.animatedProps = [];
    }

    loadMap(mapName = 'town', targetX, targetY) {
        this.clearWorld();
        this.currentMap = mapName;
        this.mapBound = 146.0;
        const theme = MAP_THEMES[mapName] || MAP_THEMES.town;

        this.scene.background = new THREE.Color(theme.sky);
        const fogDensity = mapName === 'town'
            ? 0.0022
            : (mapName.startsWith('floor') ? 0.0038 : (theme.type === 'woods' ? 0.0045 : 0.0085));
        this.scene.fog = new THREE.FogExp2(theme.fog, fogDensity);

        let groundTex;
        if (mapName.startsWith('floor')) {
            const floorNum = parseInt(mapName.replace('floor', ''), 10) || 1;
            groundTex = this.getMazePatternTexture(theme, floorNum);
        } else if (theme.type === 'woods') {
            groundTex = this.getWoodsFloorTexture(mapName);
        } else if (theme.type === 'town') {
            groundTex = this.getProceduralTexture('cobble', '#26332c', '#18221d');
            groundTex.repeat.set(42, 42);
        } else if (theme.type === 'indoor') {
            groundTex = this.getProceduralTexture('wood', '#3d281a', '#26170e');
        } else {
            const hexStr = '#' + new THREE.Color(theme.ground).getHexString();
            const lineStr = '#' + new THREE.Color(theme.accent).multiplyScalar(0.45).getHexString();
            groundTex = this.getProceduralTexture('brick', hexStr, lineStr);
        }

        const groundGeo = new THREE.PlaneGeometry(420, 420);
        const groundMat = new THREE.MeshStandardMaterial({
            map: groundTex,
            roughness: 0.66,
            metalness: 0.22
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.worldGroup.add(ground);

        const monsterSpawns = [];
        let spawn = new THREE.Vector3(0, 0, 18);

        if (mapName === 'town') {
            this.buildTown(theme);
            if (targetX !== undefined && targetY !== undefined && (targetX !== 0 || targetY !== 0)) {
                spawn.set(targetX, 0, targetY);
            } else {
                spawn.set(0, 0, 22);
            }
        } else if (mapName.startsWith('floor')) {
            const floorNum = parseInt(mapName.replace('floor', ''), 10) || 1;
            this.buildSpireFloor(floorNum, theme, monsterSpawns);
            spawn.set(0, 0, 104);
        } else if (mapName.startsWith('dungeon') || mapName === 'event_cave') {
            this.buildDungeon(mapName, theme, monsterSpawns);
            spawn.set(0, 0, 32);
        } else if (mapName === 'neutralzone' || mapName === 'battlefield') {
            this.buildWoodsRealm(mapName, theme, monsterSpawns);
            spawn.set(0, 0, 82);
        } else {
            this.buildSpecialRealm(mapName, theme, monsterSpawns);
            spawn.set(0, 0, 20);
        }

        // SAFETY FILTER: Never allow any wall/pillar collider to overlap the player's spawn zone or portal pads!
        this.colliders = this.colliders.filter(c => {
            if (Math.hypot(c.x - spawn.x, c.z - spawn.z) < (c.r + 5.0)) return false;
            for (const p of this.portals) {
                if (Math.hypot(c.x - p.x, c.z - p.z) < (c.r + 3.2)) return false;
            }
            return true;
        });

        return {
            name: theme.name,
            spawn,
            monsterSpawns
        };
    }

    makeFloatingLabelSprite(title, subtitle, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 144;
        const ctx = canvas.getContext('2d');

        const hexStr = '#' + new THREE.Color(colorHex).getHexString();

        ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
        ctx.strokeStyle = hexStr;
        ctx.lineWidth = 5;
        const r = 22;
        ctx.beginPath();
        ctx.moveTo(16 + r, 14);
        ctx.lineTo(496 - r, 14);
        ctx.quadraticCurveTo(496, 14, 496, 14 + r);
        ctx.lineTo(496, 130 - r);
        ctx.quadraticCurveTo(496, 130, 496 - r, 130);
        ctx.lineTo(16 + r, 130);
        ctx.quadraticCurveTo(16, 130, 16, 130 - r);
        ctx.lineTo(16, 14 + r);
        ctx.quadraticCurveTo(16, 14, 16 + r, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = '900 32px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = hexStr;
        ctx.shadowBlur = 12;
        ctx.fillText(title.toUpperCase(), 256, subtitle ? 64 : 82);

        if (subtitle) {
            ctx.shadowBlur = 0;
            ctx.font = '700 21px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = hexStr;
            ctx.fillText(subtitle.toUpperCase(), 256, 104);
        }

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(6.8, 1.9, 1);
        sprite.renderOrder = 999;
        return sprite;
    }

    // ========================================================================
    // 15X LARGER TOWN OF EXONIE (300 x 300 UNITS, SPACED-OUT FACILITIES)
    // Authentic 2D Portals Only — Dungeons Removed from Town & Moved to Spire!
    // ========================================================================
    buildTown() {
        this.mapBound = 145.0;

        // 1. Grand Central Plaza & Paved Stone Roads Connecting All Districts
        const roadTex = this.getProceduralTexture('cobble', '#455a64', '#263238');
        roadTex.repeat.set(14, 14);
        const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.45, metalness: 0.32 });
        const trimMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const plaza = new THREE.Mesh(new THREE.CylinderGeometry(28, 29, 0.24, 48), roadMat);
        plaza.position.y = 0.12;
        plaza.receiveShadow = true;
        this.worldGroup.add(plaza);

        const plazaTrim = new THREE.Mesh(new THREE.TorusGeometry(28.5, 0.12, 8, 64), trimMat);
        plazaTrim.rotation.x = Math.PI / 2;
        plazaTrim.position.y = 0.24;
        this.worldGroup.add(plazaTrim);

        // Cardinal & Diagonal Stone Avenues radiating across the 15x larger Town
        const avenues = [
            [0, -68, 11, 105, 0],          // North Grand Avenue -> To The Maze Spire Tower
            [0,  68, 11, 105, 0],          // South Grand Avenue -> To Battlefield & Neutral Zone
            [-58, 0, 105, 10, 0],          // West Avenue -> To Event Cave & Haunted House
            [ 58, 0, 105, 10, 0],          // East Avenue -> To Guild Base & Training Tavern
            [-45, 32, 75, 8, -0.58],       // SW Road -> To Home District
            [ 45, 32, 75, 8,  0.58],       // SE Road -> To Marketplace & Forge
            [ 45, -52, 78, 8, -0.68],      // NE Road -> To Training Tavern
            [-45, -52, 78, 8,  0.68]       // NW Road -> To Haunted House Manor
        ];
        avenues.forEach(([ax, az, w, d, rotY]) => {
            const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), roadMat);
            road.position.set(ax, 0.07, az);
            road.rotation.y = rotY;
            road.receiveShadow = true;
            this.worldGroup.add(road);
        });

        // 2. Central Crystal Fountain at (0, 0)
        const fountainGroup = new THREE.Group();
        const basinMat = new THREE.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.6 });
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.8, 1.3, 28), basinMat);
        basin.position.y = 0.65;
        basin.castShadow = true;
        fountainGroup.add(basin);

        const water = new THREE.Mesh(
            new THREE.CylinderGeometry(5.7, 5.7, 1.1, 28),
            new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x0088aa, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 })
        );
        water.position.y = 0.72;
        fountainGroup.add(water);

        const spireCrystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(1.8, 0),
            new THREE.MeshStandardMaterial({ color: 0x18ffff, emissive: 0x00e5ff, emissiveIntensity: 1.9, roughness: 0.1, metalness: 0.8 })
        );
        spireCrystal.position.y = 4.4;
        spireCrystal.scale.set(0.85, 1.75, 0.85);
        fountainGroup.add(spireCrystal);
        this.animatedProps.push({ mesh: spireCrystal, type: 'float_spin', baseY: 4.4 });

        const fLight = new THREE.PointLight(0x00e5ff, 2.5, 28);
        fLight.position.y = 5.2;
        fountainGroup.add(fLight);

        this.worldGroup.add(fountainGroup);
        this.colliders.push({ x: 0, z: 0, r: 6.6 });

        // 3. Training Tavern Leaderboard Trophy Monument on Plaza East (16, -12)
        this.buildLeaderboardMonument(16, -12);

        // 4. Spaced-Out Interactive Town Facilities (Matching 2D Town Layout!)
        // Training Tavern Lodge (North-East District: 76, -86)
        this.buildInteractiveHouse(
            'TRAINING TAVERN',
            'Solo Challenge & Ranking',
            'trainingtavern',
            76, -86,
            0xffab00,
            Math.atan2(-76, 86)
        );
        // Guild Base Citadel (East District: 88, -22)
        this.buildInteractiveHouse(
            'GUILD BASE',
            'Guild Hall & Sanctum',
            'guildbase',
            88, -22,
            0xffd700,
            Math.atan2(-88, 22)
        );
        // Authentic 2D Quest Board outside the Guild Base for Gold (Daily Missions: 25k / 100k / 250k G)
        this.buildQuestBoard(72, -32);
        // Authentic 2D Maze Guide Station outside the Colossal Spire Tower
        this.buildMazeGuideStation(-12, -109);
        // Personal Home Residence (South-West District: -76, 56)
        this.buildInteractiveHouse(
            'HOME',
            'Personal Residence',
            'home',
            -76, 56,
            0x69f0ae,
            Math.atan2(76, -56)
        );
        // Grand Marketplace & Blacksmith Forge (South-East District: 76, 56)
        this.buildInteractiveHouse(
            'MARKETPLACE',
            'Shop, Potions & Forge',
            'marketplace',
            76, 56,
            0x4fc3f7,
            Math.atan2(-76, -56)
        );

        // Decorative Town District Houses & Guild Quarters to make the 15x Town lively
        const decoHouses = [
            [-108, 30, 0x388e3c, Math.PI / 3],
            [-108, 82, 0x2e7d32, Math.PI / 4],
            [108, 30, 0x0288d1, -Math.PI / 3],
            [108, 82, 0x1976d2, -Math.PI / 4],
            [112, -62, 0xf57c00, -Math.PI / 2.5],
            [-112, -55, 0x5e35b1, Math.PI / 2.5],
            [-42, -108, 0x455a64, 0],
            [ 42, -108, 0x455a64, 0],
            // Additional lively neighborhood filler houses
            [-82, 12, 0x546e7a, Math.PI / 2],
            [-82, -12, 0x607d8b, Math.PI / 2],
            [-82, -38, 0x4e342e, Math.PI / 2],
            [ 82, 12, 0x546e7a, -Math.PI / 2],
            [ 82, 38, 0x455a64, -Math.PI / 2],
            [-32, -68, 0x795548, 0],
            [ 32, -68, 0x6d4c41, 0],
            [-28, 68, 0x5d4037, Math.PI],
            [ 28, 68, 0x4e342e, Math.PI],
            [-58, 88, 0x388e3c, Math.PI / 6],
            [ 58, 88, 0x1565c0, -Math.PI / 6],
            [-52, -112, 0x37474f, 0],
            [ 52, -112, 0x37474f, 0],
            [-102, -88, 0x455a64, Math.PI / 4],
            [ 102, -88, 0x546e7a, -Math.PI / 4],
            [-125, -20, 0x5d4037, Math.PI / 2],
            [ 125, -20, 0x6d4c41, -Math.PI / 2],
            [-125, 20, 0x3e2723, Math.PI / 2],
            [ 125, 20, 0x4e342e, -Math.PI / 2],
            [-75, 115, 0x2e7d32, 0],
            [ 75, 115, 0x1976d2, 0],
            [-38, 122, 0x455a64, 0],
            [ 38, 122, 0x455a64, 0]
        ];
        decoHouses.forEach(([hx, hz, hColor, hRot]) => this.buildHouse(hx, hz, hColor, hRot));

        // Street Lanterns lining the Grand Avenues & Plaza
        const lanternCoords = [
            [-20, -20], [20, -20], [-20, 20], [20, 20],
            [-8, -45], [8, -45], [-8, -75], [8, -75], [-8, -100], [8, -100],
            [-8, 45], [8, 45], [-8, 75], [8, 75], [-8, 102], [8, 102],
            [-45, -7], [-45, 7], [-75, -7], [-75, 7],
            [45, -7], [45, 7], [75, -7], [75, 7],
            [-35, -55], [35, -55], [-35, 55], [35, 55],
            [-65, -70], [65, -70], [-65, 70], [65, 70]
        ];
        lanternCoords.forEach(([lx, lz]) => this.buildStreetLantern(lx, lz));

        // 5. Sky Atmosphere & 15x Fortress Wall Perimeter (bound = 148)
        this.buildTownSkyAtmosphere();
        this.buildTownFortressWall(148.0);

        // 6. Lush Town Park Trees & Groves scattered across the 15x Town (60+ trees)
        const treeCoords = [
            [-36, -34], [36, -34], [-36, 34], [36, 34],
            [-62, -28], [62, -28], [-62, 28], [62, 28],
            [-32, 85], [32, 85], [-95, 115], [95, 115],
            [-122, -95], [122, -95], [-122, 5], [122, 5],
            [-125, 65], [125, 65], [-55, 118], [55, 118],
            [-18, -42], [18, -42], [-18, 42], [18, 42],
            [-48, -48], [48, -48], [-48, 48], [48, 48],
            [-72, -18], [72, -18], [-72, 18], [72, 18],
            [-92, -35], [92, -35], [-92, 35], [92, 35],
            [-15, 88], [15, 88], [-25, 105], [25, 105],
            [-68, 75], [68, 75], [-85, 62], [85, 62],
            [-110, -10], [110, -10], [-110, 50], [110, 50],
            [-45, -85], [45, -85], [-22, -95], [22, -95],
            [-88, -75], [88, -75], [-105, -75], [105, -75],
            [-135, -45], [135, -45], [-135, 45], [135, 45],
            [-98, 98], [98, 98], [-42, 130], [42, 130]
        ];
        treeCoords.forEach(([tx, tz], i) => this.buildTree(tx, tz, 1.1 + (i % 3) * 0.2, i % 2 === 0));

        // Outer Forest Ring beyond the Town Fortress Walls
        for (let i = 0; i < 48; i++) {
            const angle = (i / 48) * Math.PI * 2;
            const dist = 160 + (i % 3) * 8;
            this.buildTree(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.4);
        }

        // 7. COLOSSAL SPIRE TOWER AT NORTH AVENUE FOR THE MAZE (FLOOR 1)
        this.buildColossalSpireTower(0, -122.0);

        // 8. AUTHENTIC 2D TOWN PORTALS & BUILDINGS
        this.createPortal('BATTLE FIELD', 'Forest Fortress Co-Op Raid', 'battlefield', 0, 126, 0xff1744);
        this.createPortal('NEUTRAL ZONE', 'Wild Woods (PvP & World Boss)', 'neutralzone', 52, 122, 0xffea00);
        this.buildHauntedManorHouse(-78, -86);
        this.createPortal('EVENT CAVE', 'Minotaur Labyrinth', 'event_cave', -96, -12, 0xff6d00);
    }

    buildLeaderboardMonument(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffab00,
            emissiveIntensity: 1.4,
            roughness: 0.18,
            metalness: 0.88
        });

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.5, 1.6, 16), baseMat);
        ped.position.y = 0.8;
        g.add(ped);

        const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.55, 1.8, 16), goldMat);
        cup.position.y = 2.6;
        g.add(cup);

        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), goldMat);
        star.position.y = 4.2;
        g.add(star);
        this.animatedProps.push({ mesh: star, type: 'float_spin', baseY: 4.2 });

        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(2.4, 3.0, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.y = 0.06;
        g.add(stepRing);

        const labelSprite = this.makeFloatingLabelSprite('🏆 TAVERN RANKINGS', 'Top 50 Solo Boss Speedruns', 0xffd700);
        labelSprite.position.set(0, 6.0, 0);
        g.add(labelSprite);

        this.worldGroup.add(g);
        this.portals.push({
            label: 'TAVERN LEADERBOARD',
            subtitle: 'View Top 50 Rankings',
            targetMapId: 'leaderboard',
            targetMap: 'leaderboard',
            x,
            z,
            pos: new THREE.Vector3(x, 0, z),
            mesh: stepRing,
            glowMat: goldMat,
            groundRing: stepRing,
            labelSprite,
            isHouse: true,
            colorHex: 0xffd700
        });
    }

    buildQuestBoard(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = Math.atan2(-x, -z);

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.75 });
        const parchmentMat = new THREE.MeshStandardMaterial({
            color: 0xfff8e1,
            emissive: 0xffca28,
            emissiveIntensity: 0.35,
            roughness: 0.4
        });
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffab00,
            emissiveIntensity: 1.5,
            roughness: 0.2,
            metalness: 0.85
        });

        // Two wooden support posts
        [-1.8, 1.8].forEach(px => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 10), darkWoodMat);
            post.position.set(px, 2.1, 0);
            post.castShadow = true;
            g.add(post);
        });

        // Notice board backing panel
        const board = new THREE.Mesh(chamferBox(3.8, 2.3, 0.28, 0.06), woodMat);
        board.position.set(0, 2.55, 0);
        board.castShadow = true;
        g.add(board);

        // Pitched wooden roof overhang
        const roof = new THREE.Mesh(chamferBox(4.4, 0.38, 1.3, 0.06), darkWoodMat);
        roof.position.set(0, 3.85, 0);
        g.add(roof);

        // 3 Pinned Quest Parchment Scrolls (Beginner 25kG, Novice 100kG, Expert 250kG)
        [-1.1, 0, 1.1].forEach((sx, idx) => {
            const scroll = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.25, 0.06), parchmentMat);
            scroll.position.set(sx, 2.55 + (idx % 2) * 0.08, 0.16);
            scroll.rotation.z = (idx - 1) * 0.05;
            g.add(scroll);

            const waxSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), goldMat);
            waxSeal.rotation.x = Math.PI / 2;
            waxSeal.position.set(sx, 2.12, 0.20);
            g.add(waxSeal);
        });

        // Floating Golden Exclamation / Coin Emblem above the Quest Board
        const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), goldMat);
        emblem.position.set(0, 4.75, 0);
        g.add(emblem);
        this.animatedProps.push({ mesh: emblem, type: 'float_spin', baseY: 4.75 });

        // Interactive Step Ring in front of Quest Board
        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(2.3, 2.95, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.set(0, 0.06, 0);
        g.add(stepRing);

        const qLight = new THREE.PointLight(0xffd700, 2.0, 14);
        qLight.position.set(0, 3.4, 1.2);
        g.add(qLight);

        const labelSprite = this.makeFloatingLabelSprite('📜 QUEST BOARD', 'Daily Gold Missions (25k–250k G)', 0xffd700);
        labelSprite.position.set(0, 6.2, 0);
        g.add(labelSprite);

        this.worldGroup.add(g);
        this.portals.push({
            label: 'QUEST BOARD (DAILY MISSIONS)',
            subtitle: 'Complete Daily Quests for 25k–250k Gold',
            targetMapId: 'daily_missions',
            targetMap: 'daily_missions',
            x,
            z,
            pos: new THREE.Vector3(x, 0, z),
            mesh: stepRing,
            glowMat: goldMat,
            groundRing: stepRing,
            light: qLight,
            labelSprite,
            isHouse: true,
            colorHex: 0xffd700
        });
    }

    buildMazeGuideStation(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 });
        const cyanGlowMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.8,
            roughness: 0.15
        });

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 1.8, 12), pedMat);
        ped.position.y = 0.9;
        g.add(ped);

        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), cyanGlowMat);
        crystal.position.y = 2.9;
        g.add(crystal);
        this.animatedProps.push({ mesh: crystal, type: 'float_spin', baseY: 2.9 });

        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(2.2, 2.8, 32),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.y = 0.06;
        g.add(stepRing);

        const labelSprite = this.makeFloatingLabelSprite('🗺️ MAZE GUIDE', 'Floor Fast Travel & Spire Guide', 0x00e5ff);
        labelSprite.position.set(0, 5.2, 0);
        g.add(labelSprite);

        this.worldGroup.add(g);
        this.portals.push({
            label: 'MAZE GUIDE & FAST TRAVEL',
            subtitle: 'Teleport to Conquered Spire Floors',
            targetMapId: 'maze_guide',
            targetMap: 'maze_guide',
            x,
            z,
            pos: new THREE.Vector3(x, 0, z),
            mesh: stepRing,
            glowMat: cyanGlowMat,
            groundRing: stepRing,
            labelSprite,
            isHouse: true,
            colorHex: 0x00e5ff
        });
    }

    buildColossalSpireTower(x, z) {
        const towerGroup = new THREE.Group();
        towerGroup.position.set(x, 0, z);

        const stoneTex = this.getProceduralTexture('brick', '#1e293b', '#00e5ff');
        stoneTex.repeat.set(6, 14);
        const towerMat = new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.45,
            metalness: 0.45
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.35,
            metalness: 0.75
        });
        const runeGlowMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 2.2,
            roughness: 0.15
        });

        // Colossal 4-Tier Spire Tower rising 78 units into the sky
        const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 10.5, 22, 16), towerMat);
        tier1.position.y = 11.0;
        tier1.castShadow = true;
        tier1.receiveShadow = true;
        towerGroup.add(tier1);

        const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 8.2, 22, 16), towerMat);
        tier2.position.y = 33.0;
        tier2.castShadow = true;
        towerGroup.add(tier2);

        const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 6.5, 20, 16), towerMat);
        tier3.position.y = 54.0;
        tier3.castShadow = true;
        towerGroup.add(tier3);

        const crown = new THREE.Mesh(new THREE.ConeGeometry(5.8, 16, 16), darkMat);
        crown.position.y = 72.0;
        towerGroup.add(crown);

        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const bx = Math.cos(ang) * 9.2;
            const bz = Math.sin(ang) * 9.2;
            const buttress = new THREE.Mesh(chamferBox(1.8, 36, 2.6, 0.12), darkMat);
            buttress.position.set(bx, 18, bz);
            buttress.lookAt(0, 18, 0);
            towerGroup.add(buttress);

            const runeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 58, 0.55), runeGlowMat);
            runeStrip.position.set(Math.cos(ang) * 7.6, 32, Math.sin(ang) * 7.6);
            towerGroup.add(runeStrip);
        }

        [22, 42, 60].forEach((ry, idx) => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(9.8 - idx * 1.6, 0.32, 10, 40),
                runeGlowMat
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = ry;
            towerGroup.add(ring);
            this.animatedProps.push({ mesh: ring, type: 'float_spin', baseY: ry });
        });

        const archFrame = new THREE.Mesh(chamferBox(5.6, 6.8, 1.5, 0.14), runeGlowMat);
        archFrame.position.set(0, 3.4, 9.2);
        towerGroup.add(archFrame);

        const vortexMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
        });
        const archPortal = new THREE.Mesh(new THREE.BoxGeometry(4.4, 5.8, 1.6), vortexMat);
        archPortal.position.set(0, 3.0, 9.25);
        towerGroup.add(archPortal);

        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(2.8, 3.8, 32),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.set(0, 0.06, 10.6);
        towerGroup.add(stepRing);

        const tLight = new THREE.PointLight(0x00e5ff, 3.0, 26);
        tLight.position.set(0, 5.5, 11.0);
        towerGroup.add(tLight);

        const labelSprite = this.makeFloatingLabelSprite('🏰 THE MAZE (FLOOR 1)', '100-Floor Infinite Labyrinth Tower', 0x00e5ff);
        labelSprite.position.set(0, 9.5, 10.2);
        towerGroup.add(labelSprite);

        this.worldGroup.add(towerGroup);
        this.colliders.push({ x, z: z - 1.0, r: 8.8 });

        const doorZ = z + 10.6;
        this.portals.push({
            label: 'FLOOR 1 (THE MAZE)',
            subtitle: '100-Floor Infinite Labyrinth Tower',
            targetMapId: 'floor1',
            targetMap: 'floor1',
            x,
            z: doorZ,
            pos: new THREE.Vector3(x, 0, doorZ),
            mesh: stepRing,
            glowMat: runeGlowMat,
            vortexMat,
            groundRing: stepRing,
            light: tLight,
            labelSprite,
            isHouse: true,
            colorHex: 0x00e5ff
        });
    }

    buildTownFortressWall(bound = 148.0) {
        const wallTex = this.getProceduralTexture('brick', '#546e7a', '#263238');
        wallTex.repeat.set(36, 2);
        const stoneMat = new THREE.MeshStandardMaterial({
            map: wallTex,
            roughness: 0.65,
            metalness: 0.25
        });
        const darkTrimMat = new THREE.MeshStandardMaterial({
            color: 0x263238,
            roughness: 0.45,
            metalness: 0.65
        });
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a5f,
            roughness: 0.35,
            metalness: 0.45
        });
        const bannerGlowMat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.5,
            roughness: 0.2
        });

        const wallH = 8.5;
        const wallThick = 3.2;
        const fullLen = bound * 2;

        const buildWallSegment = (cx, cz, length, rotY) => {
            const segGroup = new THREE.Group();
            segGroup.position.set(cx, 0, cz);
            segGroup.rotation.y = rotY;

            const mainWall = new THREE.Mesh(chamferBox(length, wallH, wallThick, 0.14), stoneMat);
            mainWall.position.y = wallH * 0.5;
            mainWall.castShadow = true;
            mainWall.receiveShadow = true;
            segGroup.add(mainWall);

            const parapetWalk = new THREE.Mesh(new THREE.BoxGeometry(length + 0.2, 0.45, wallThick + 0.5), darkTrimMat);
            parapetWalk.position.y = wallH + 0.18;
            segGroup.add(parapetWalk);

            const merlonCount = Math.floor(length / 4.2);
            for (let i = 0; i < merlonCount; i++) {
                const mx = -length * 0.5 + 2.1 + i * 4.2;
                const merlon = new THREE.Mesh(chamferBox(2.0, 1.25, wallThick * 0.85, 0.06), stoneMat);
                merlon.position.set(mx, wallH + 0.95, 0);
                segGroup.add(merlon);
            }

            this.worldGroup.add(segGroup);

            const steps = 48;
            for (let s = 0; s <= steps; s++) {
                const offset = -length * 0.495 + (s / steps) * (length * 0.99);
                const wx = cx + Math.cos(rotY) * offset;
                const wz = cz - Math.sin(rotY) * offset;
                this.colliders.push({ x: wx, z: wz, r: 2.4 });
            }
        };

        buildWallSegment(0, -bound, fullLen, 0);
        buildWallSegment(0,  bound, fullLen, 0);
        buildWallSegment(-bound, 0, fullLen, Math.PI / 2);
        buildWallSegment( bound, 0, fullLen, Math.PI / 2);

        const gatePositions = [
            [0, -bound, 0],
            [0,  bound, 0],
            [-bound, 0, Math.PI / 2],
            [ bound, 0, Math.PI / 2]
        ];
        gatePositions.forEach(([gx, gz, gRot]) => {
            const gate = new THREE.Group();
            gate.position.set(gx, 0, gz);
            gate.rotation.y = gRot;

            [-6.5, 6.5].forEach(sideX => {
                const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 11.5, 12), stoneMat);
                tower.position.set(sideX, 5.75, 0);
                tower.castShadow = true;
                gate.add(tower);

                const cap = new THREE.Mesh(new THREE.ConeGeometry(3.1, 4.2, 12), roofMat);
                cap.position.set(sideX, 13.5, 0);
                gate.add(cap);

                const banner = new THREE.Mesh(new THREE.BoxGeometry(0.95, 3.6, 0.14), bannerGlowMat);
                banner.position.set(sideX, 6.8, 2.5);
                gate.add(banner);
            });

            const lintel = new THREE.Mesh(chamferBox(15.0, 2.6, 3.6, 0.15), darkTrimMat);
            lintel.position.set(0, 9.8, 0);
            lintel.castShadow = true;
            gate.add(lintel);

            const crest = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), bannerGlowMat);
            crest.position.set(0, 11.8, 0);
            gate.add(crest);

            this.worldGroup.add(gate);
        });

        const corners = [
            [-bound, -bound],
            [ bound, -bound],
            [-bound,  bound],
            [ bound,  bound]
        ];
        corners.forEach(([tx, tz]) => {
            const towerGroup = new THREE.Group();
            towerGroup.position.set(tx, 0, tz);

            const body = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 13.5, 16), stoneMat);
            body.position.y = 6.75;
            body.castShadow = true;
            towerGroup.add(body);

            const spire = new THREE.Mesh(new THREE.ConeGeometry(5.4, 6.5, 16), roofMat);
            spire.position.y = 16.5;
            towerGroup.add(spire);

            const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), bannerGlowMat);
            beacon.position.y = 20.2;
            towerGroup.add(beacon);

            this.worldGroup.add(towerGroup);
            this.colliders.push({ x: tx, z: tz, r: 4.8 });
        });
    }

    buildInteractiveHouse(title, subtitle, targetMapId, x, z, accentColor, rotY) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rotY;

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 });
        const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.65 });
        const timberMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.75 });
        const roofMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, metalness: 0.25 });
        const shutterMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
        const brickMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });

        // 1. Stone Foundation Base
        const stoneBase = new THREE.Mesh(chamferBox(12.4, 2.2, 10.6, 0.15), stoneMat);
        stoneBase.position.y = 1.1;
        stoneBase.castShadow = true;
        stoneBase.receiveShadow = true;
        g.add(stoneBase);

        // 2. Main Timber-Framed Upper Floor
        const mainBody = new THREE.Mesh(chamferBox(11.8, 6.2, 10.0, 0.12), plasterMat);
        mainBody.position.y = 5.2;
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        g.add(mainBody);

        // Timber Corner Pillars and Horizontal Girders
        [[-5.8, -4.9], [5.8, -4.9], [-5.8, 4.9], [5.8, 4.9]].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.4, 0.65), timberMat);
            pillar.position.set(px, 4.2, pz);
            g.add(pillar);
        });
        const midBeam = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.45, 10.2), timberMat);
        midBeam.position.y = 2.2;
        g.add(midBeam);
        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.45, 10.2), timberMat);
        topBeam.position.y = 8.3;
        g.add(topBeam);

        // 3. Tiled Pitched Roof with Dormer Windows
        const roof = new THREE.Mesh(new THREE.ConeGeometry(10.2, 5.8, 4), roofMat);
        roof.position.y = 11.2;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        g.add(roof);

        // Attic Dormer Window
        const dormer = new THREE.Mesh(chamferBox(2.4, 2.0, 2.2, 0.08), timberMat);
        dormer.position.set(0, 9.6, 3.8);
        g.add(dormer);
        const dormerRoof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.4, 4), roofMat);
        dormerRoof.position.set(0, 10.9, 3.8);
        dormerRoof.rotation.y = Math.PI / 4;
        g.add(dormerRoof);

        // 4. Stone Chimney with Smoke Glow
        const chimney = new THREE.Mesh(chamferBox(1.6, 9.8, 1.6, 0.1), brickMat);
        chimney.position.set(-4.5, 6.8, -3.2);
        chimney.castShadow = true;
        g.add(chimney);
        const chimneyCap = new THREE.Mesh(chamferBox(2.0, 0.4, 2.0, 0.05), stoneMat);
        chimneyCap.position.set(-4.5, 11.8, -3.2);
        g.add(chimneyCap);

        // 5. Front Porch with Pillars & Awning
        const porchRoof = new THREE.Mesh(chamferBox(5.6, 0.35, 3.2, 0.06), timberMat);
        porchRoof.position.set(0, 4.6, 6.4);
        g.add(porchRoof);
        [-2.4, 2.4].forEach(px => {
            const pPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.4, 8), timberMat);
            pPost.position.set(px, 2.2, 7.6);
            pPost.castShadow = true;
            g.add(pPost);
        });

        // 6. Glowing Doorway & Windows with Shutters
        const doorGlowMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 1.6,
            roughness: 0.15
        });
        const doorFrame = new THREE.Mesh(chamferBox(2.8, 4.2, 0.48, 0.06), doorGlowMat);
        doorFrame.position.set(0, 2.1, 5.02);
        g.add(doorFrame);

        const doorPortalMat = new THREE.MeshBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: 0.45
        });
        const doorInner = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.7, 0.52), doorPortalMat);
        doorInner.position.set(0, 1.9, 5.05);
        g.add(doorInner);

        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(1.6, 2.4, 28),
            new THREE.MeshBasicMaterial({
                color: accentColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.72
            })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.set(0, 0.05, 7.6);
        g.add(stepRing);

        const winMat = new THREE.MeshStandardMaterial({
            color: 0xfff9c4,
            emissive: accentColor,
            emissiveIntensity: 0.85
        });
        [-3.6, 3.6].forEach(wx => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.32), winMat);
            win.position.set(wx, 4.6, 5.02);
            g.add(win);
            // Wooden window shutters
            [-1.15, 1.15].forEach(sx => {
                const shut = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.8, 0.15), shutterMat);
                shut.position.set(wx + sx, 4.6, 5.15);
                g.add(shut);
            });
        });

        const doorLight = new THREE.PointLight(accentColor, 1.8, 16);
        doorLight.position.set(0, 3.8, 7.8);
        g.add(doorLight);

        const labelSprite = this.makeFloatingLabelSprite(`🏠 ${title}`, subtitle, accentColor);
        labelSprite.position.set(0, 8.8, 6.2);
        g.add(labelSprite);

        this.worldGroup.add(g);

        const doorWorldX = x + Math.sin(rotY) * 7.6;
        const doorWorldZ = z + Math.cos(rotY) * 7.6;
        const backX = x - Math.sin(rotY) * 0.8;
        const backZ = z - Math.cos(rotY) * 0.8;
        this.colliders.push({ x: backX, z: backZ, r: 5.6 });

        this.portals.push({
            label: title,
            subtitle,
            targetMapId,
            targetMap: targetMapId,
            x: doorWorldX,
            z: doorWorldZ,
            pos: new THREE.Vector3(doorWorldX, 0, doorWorldZ),
            mesh: stepRing,
            glowMat: doorGlowMat,
            vortexMat: doorPortalMat,
            light: doorLight,
            labelSprite,
            isHouse: true,
            colorHex: accentColor
        });
    }

    // Worn-out, Decrepit Haunted Manor House with Dead Twisted Trees & Purple Glow (Request #3)
    buildHauntedManorHouse(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const rotY = Math.atan2(-x, -z);
        g.rotation.y = rotY;

        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.95 });
        const crackedStoneMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.9 });
        const darkRoofMat = new THREE.MeshStandardMaterial({ color: 0x120c1f, roughness: 0.7 });
        const eeriePurpleMat = new THREE.MeshStandardMaterial({
            color: 0x9c27b0,
            emissive: 0xba68c8,
            emissiveIntensity: 1.8,
            roughness: 0.2
        });
        const plankMat = new THREE.MeshStandardMaterial({ color: 0x3d312a, roughness: 0.9 });

        // 1. Crooked Cracked Stone Foundation
        const base = new THREE.Mesh(chamferBox(13.2, 2.8, 11.0, 0.18), crackedStoneMat);
        base.position.y = 1.4;
        base.rotation.z = 0.02;
        base.castShadow = true;
        g.add(base);

        // 2. Weathered Dark Wood Manor Body
        const mainBody = new THREE.Mesh(chamferBox(12.4, 7.2, 10.2, 0.12), darkWoodMat);
        mainBody.position.y = 6.0;
        mainBody.rotation.z = -0.025; // Crooked dilapidated tilt
        mainBody.castShadow = true;
        g.add(mainBody);

        // 3. Asymmetric Tilted Gothic Pitch Roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(10.8, 6.8, 4), darkRoofMat);
        roof.position.set(0, 12.8, 0);
        roof.rotation.y = Math.PI / 4 + 0.05;
        roof.rotation.z = 0.04;
        roof.castShadow = true;
        g.add(roof);

        // Crooked Leaning Chimney
        const chimney = new THREE.Mesh(chamferBox(1.8, 10.5, 1.8, 0.1), crackedStoneMat);
        chimney.position.set(-4.6, 7.8, -3.4);
        chimney.rotation.z = -0.09;
        g.add(chimney);

        // 4. Boarded-Up Windows with Eerie Purple Glow peeking through cracks
        [-3.6, 3.6].forEach((wx, idx) => {
            const glowWin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 0.3), eeriePurpleMat);
            glowWin.position.set(wx, 5.4, 5.15);
            g.add(glowWin);

            // Boarded planks nailed across windows
            [-0.45, 0, 0.45].forEach((py, pIdx) => {
                const plank = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 0.14), plankMat);
                plank.position.set(wx, 5.4 + py, 5.32);
                plank.rotation.z = (pIdx - 1) * 0.18 + (idx === 0 ? 0.08 : -0.08);
                g.add(plank);
            });
        });

        // 5. Spooky Dilapidated Doorway
        const doorFrame = new THREE.Mesh(chamferBox(3.0, 4.4, 0.45, 0.06), darkWoodMat);
        doorFrame.position.set(0, 2.4, 5.15);
        doorFrame.rotation.z = 0.03;
        g.add(doorFrame);

        const doorPortalMat = new THREE.MeshBasicMaterial({
            color: 0x9c27b0,
            transparent: true,
            opacity: 0.65
        });
        const doorVortex = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.5), doorPortalMat);
        doorVortex.position.set(0, 2.2, 5.2);
        g.add(doorVortex);

        const stepRing = new THREE.Mesh(
            new THREE.RingGeometry(1.8, 2.6, 28),
            new THREE.MeshBasicMaterial({
                color: 0xab47bc,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.78
            })
        );
        stepRing.rotation.x = -Math.PI / 2;
        stepRing.position.set(0, 0.05, 7.8);
        g.add(stepRing);

        const spookyLight = new THREE.PointLight(0xba68c8, 2.2, 18);
        spookyLight.position.set(0, 4.2, 7.8);
        g.add(spookyLight);

        // Dead gnarled trees flanking the dilapidated manor
        [-8.2, 8.2].forEach(tx => {
            const deadTree = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.65, 7.5, 7),
                darkWoodMat
            );
            deadTree.position.set(tx, 3.75, 4.2);
            deadTree.rotation.z = tx < 0 ? -0.15 : 0.18;
            g.add(deadTree);

            for (let b = 0; b < 3; b++) {
                const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.2, 5), darkWoodMat);
                branch.position.set(tx + (b % 2 === 0 ? 0.8 : -0.8), 5.2 + b * 1.1, 4.2);
                branch.rotation.z = b % 2 === 0 ? 0.65 : -0.65;
                g.add(branch);
            }
        });

        const labelSprite = this.makeFloatingLabelSprite('👻 HAUNTED HOUSE', 'Face the Wraith King (Lv.1–80)', 0xba68c8);
        labelSprite.position.set(0, 9.4, 6.2);
        g.add(labelSprite);

        this.worldGroup.add(g);

        const doorWorldX = x + Math.sin(rotY) * 7.8;
        const doorWorldZ = z + Math.cos(rotY) * 7.8;
        this.colliders.push({ x, z, r: 6.2 });

        this.portals.push({
            label: 'HAUNTED HOUSE',
            subtitle: 'Face the Wraith King',
            targetMapId: 'hauntedhouse',
            targetMap: 'hauntedhouse',
            x: doorWorldX,
            z: doorWorldZ,
            pos: new THREE.Vector3(doorWorldX, 0, doorWorldZ),
            mesh: stepRing,
            glowMat: eeriePurpleMat,
            vortexMat: doorPortalMat,
            light: spookyLight,
            labelSprite,
            isHouse: true,
            colorHex: 0xba68c8
        });
    }

    buildHouse(x, z, roofColor, rotY) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.rotation.y = rotY;

        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.68 });
        const timberMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.75 });
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.38, metalness: 0.25 });
        const windowMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffe082, emissiveIntensity: 0.75 });
        const shutterMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.72 });

        // Stone Base
        const stoneBase = new THREE.Mesh(chamferBox(10.8, 1.8, 9.2, 0.12), stoneMat);
        stoneBase.position.y = 0.9;
        stoneBase.castShadow = true;
        g.add(stoneBase);

        // Plaster & Timber Walls
        const base = new THREE.Mesh(chamferBox(10.2, 5.6, 8.8, 0.12), wallMat);
        base.position.y = 4.6;
        base.castShadow = true;
        base.receiveShadow = true;
        g.add(base);

        [[-4.9, -4.3], [4.9, -4.3], [-4.9, 4.3], [4.9, 4.3]].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 7.2, 0.55), timberMat);
            pillar.position.set(px, 3.7, pz);
            g.add(pillar);
        });

        const topBeam = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.4, 9.0), timberMat);
        topBeam.position.y = 7.4;
        g.add(topBeam);

        // Pitched Roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 5.2, 4), roofMat);
        roof.position.y = 9.8;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        g.add(roof);

        // Brick Chimney
        const chimney = new THREE.Mesh(chamferBox(1.4, 7.8, 1.4, 0.08), stoneMat);
        chimney.position.set(-3.8, 6.2, -2.6);
        chimney.castShadow = true;
        g.add(chimney);

        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.6, 0.3), timberMat);
        door.position.set(0, 1.9, 4.45);
        g.add(door);

        // Windows with Shutters
        [-2.8, 2.8].forEach(wx => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.25), windowMat);
            win.position.set(wx, 4.2, 4.45);
            g.add(win);
            [-0.95, 0.95].forEach(sx => {
                const shut = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.5, 0.12), shutterMat);
                shut.position.set(wx + sx, 4.2, 4.54);
                g.add(shut);
            });
        });

        this.worldGroup.add(g);
        this.colliders.push({ x, z, r: 5.6 });
    }

    buildStreetLantern(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.85, roughness: 0.25 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 4.8, 10), poleMat);
        pole.position.y = 2.4;
        pole.castShadow = true;
        g.add(pole);

        const bulb = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.42, 1),
            new THREE.MeshBasicMaterial({ color: 0xffea00 })
        );
        bulb.position.y = 5.0;
        g.add(bulb);
        this.worldGroup.add(g);
    }

    buildTree(x, z, scale = 1.0, isOak = false) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42 * scale, 0.65 * scale, 3.6 * scale, 10),
            new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.88 })
        );
        trunk.position.y = 1.8 * scale;
        trunk.castShadow = true;
        g.add(trunk);

        const leafColor = isOak ? 0x33691e : 0x2e7d32;
        const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.58 });
        if (isOak) {
            const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8 * scale, 1), leafMat);
            crown.position.y = 4.8 * scale;
            crown.scale.set(1.15, 0.9, 1.15);
            crown.castShadow = true;
            g.add(crown);
        } else {
            [0, 1, 2].forEach(i => {
                const cone = new THREE.Mesh(new THREE.ConeGeometry((2.7 - i * 0.55) * scale, 3.1 * scale, 10), leafMat);
                cone.position.y = (3.8 + i * 1.6) * scale;
                cone.castShadow = true;
                g.add(cone);
            });
        }

        this.worldGroup.add(g);
        this.colliders.push({ x, z, r: 1.25 * scale });
    }

    // ========================================================================
    // 10X LARGER SPIRE MAZE FLOORS (260 x 260 UNITS, TRUE LABYRINTH CORRIDORS,
    // REAL MAZE FLOOR PATTERNS, & FLOOR-LOCATED DUNGEONS 1 & 2)
    // ========================================================================
    buildSpireFloor(floorNum, theme, monsterSpawns) {
        const bound = 128.0; // 256 x 256 units (10x larger area than previous 80x80!)
        this.mapBound = bound - 2.0;

        // 1. Continuous Enclosed 4-Sided Fortress Wall Around the 256x256 Maze Floor
        this.buildEnclosedPerimeterWalls(bound, 14.0, theme);

        const wallTex = this.getProceduralTexture(
            'brick',
            '#' + new THREE.Color(theme.wall || 0x334155).getHexString(),
            '#' + new THREE.Color(theme.accent || 0x00e5ff).multiplyScalar(0.55).getHexString()
        );
        wallTex.repeat.set(4, 2);

        const wallMat = new THREE.MeshStandardMaterial({
            map: wallTex,
            roughness: 0.48,
            metalness: 0.38
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: theme.accent,
            emissive: theme.accent,
            emissiveIntensity: 1.35,
            roughness: 0.2
        });
        const stonePathMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(theme.wall).multiplyScalar(1.18),
            roughness: 0.52,
            metalness: 0.28
        });

        // 2. 3D Inlaid Labyrinth Floor Pathways, Runic Compass Medallions & 2D Floor Emblem Sanctum
        this.buildMazeFloorPatternInlays(floorNum, theme, stonePathMat, accentMat);

        // 3. True Multi-Corridor 3D Labyrinth Maze Walls (Varied by Floor!)
        const addMazeWall = (cx, cz, len, rotY) => {
            const wg = new THREE.Group();
            wg.position.set(cx, 0, cz);
            wg.rotation.y = rotY;

            const wallH = 8.2;
            const wallThick = 2.4;
            const mesh = new THREE.Mesh(chamferBox(len, wallH, wallThick, 0.12), wallMat);
            mesh.position.y = wallH * 0.5;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            wg.add(mesh);

            // Glowing Labyrinth Runic Trim Strip along every corridor wall!
            const runeTrim = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.24, wallThick + 0.22), accentMat);
            runeTrim.position.y = 3.2;
            wg.add(runeTrim);

            const capTrim = new THREE.Mesh(new THREE.BoxGeometry(len + 0.2, 0.30, wallThick + 0.30), stonePathMat);
            capTrim.position.y = wallH + 0.12;
            wg.add(capTrim);

            this.worldGroup.add(wg);

            const steps = Math.max(4, Math.ceil(len / 3.0));
            for (let s = 0; s <= steps; s++) {
                const off = -len * 0.48 + (s / steps) * (len * 0.96);
                const wx = cx + Math.cos(rotY) * off;
                const wz = cz - Math.sin(rotY) * off;
                this.colliders.push({ x: wx, z: wz, r: 1.65 });
            }
        };

        // Outer, Middle, and Inner Labyrinth Rings with Unique Corridors on Every Floor
        const fMod = floorNum % 4;
        const sX = ((floorNum * 9) % 24) - 12;
        const sZ = ((floorNum * 7) % 18) - 9;
        const labyrinthSegments = [
            // South Entrance Maze Gate & Baffle Corridors (around z = 82)
            [-55 + sX, 82, 54, 0],
            [ 55 + sX, 82, 54, 0],
            [fMod === 0 ? -22 : (fMod === 1 ? 22 : 0), 62 + sZ, 48, 0],
            [-84, 52 + sZ, 58, Math.PI / 2],
            [ 84, 52 - sZ, 58, Math.PI / 2],
            [-42 + sX, 38, 44, Math.PI / 2],
            [ 42 - sX, 38, 44, Math.PI / 2],

            // Mid-South Labyrinth Chambers (z = 18..28)
            [-72, 20 + sZ, 46, 0],
            [ 72, 20 - sZ, 46, 0],
            [  0, 22 + sZ, 40, fMod % 2 === 0 ? 0 : Math.PI / 2],
            [-28 + sX,  0, 44, Math.PI / 2],
            [ 28 - sX,  0, 44, Math.PI / 2],

            // Central Labyrinth Crossroads & East/West Side Wings (z = -25..15)
            [-92, -12 + sZ, 54, Math.PI / 2],
            [ 92, -12 - sZ, 54, Math.PI / 2],
            [-58 + sX, -18, 44, 0],
            [ 58 - sX, -18, 44, 0],
            [fMod === 1 ? -20 : (fMod === 2 ? 20 : 0), -24 + sZ, 46, 0],

            // Upper-Mid Labyrinth Corridors (z = -52)
            [-64 + sX, -52, 52, 0],
            [ 64 - sX, -52, 52, 0],
            [-46, -42 + sZ, 38, Math.PI / 2],
            [ 46, -42 - sZ, 38, Math.PI / 2],
            [-86, -68 + sZ, 48, Math.PI / 2],
            [ 86, -68 - sZ, 48, Math.PI / 2],

            // North Boss Sanctum Flanking Walls (around z = -76)
            [-48 + sX, -76, 48, 0],
            [ 48 - sX, -76, 48, 0]
        ];
        labyrinthSegments.forEach(([wx, wz, wLen, wRot]) => addMazeWall(wx, wz, wLen, wRot));

        // 4. Distinct Floor-Specific 3D Landmarks at Maze Intersections & Chambers
        const landmarkCoords = [
            [-64, 52], [64, 52], [-64, 0], [64, 0],
            [-64, -36], [64, -36], [-32, -88], [32, -88],
            [-98, 28], [98, 28], [-98, -42], [98, -42]
        ];
        landmarkCoords.forEach(([ix, iz], idx) => {
            if (floorNum <= 2) {
                const vatBase = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 1.4, 16), wallMat);
                vatBase.position.set(ix, 0.7, iz);
                this.worldGroup.add(vatBase);

                const slimePool = new THREE.Mesh(
                    new THREE.CylinderGeometry(2.4, 2.4, 1.5, 16),
                    new THREE.MeshStandardMaterial({ color: theme.accent, emissive: theme.accent, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })
                );
                slimePool.position.set(ix, 0.75, iz);
                this.worldGroup.add(slimePool);

                const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.35, 0), accentMat);
                crystal.position.set(ix, 3.8, iz);
                this.worldGroup.add(crystal);
                this.animatedProps.push({ mesh: crystal, type: 'float_spin', baseY: 3.8 });
            } else if (floorNum <= 4) {
                const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 11.5, 7), wallMat);
                spire.position.set(ix, 5.75, iz);
                spire.castShadow = true;
                this.worldGroup.add(spire);

                const shard = new THREE.Mesh(new THREE.ConeGeometry(1.0, 4.4, 5), accentMat);
                shard.position.set(ix + (idx % 2 === 0 ? 1.5 : -1.5), 2.2, iz + 0.9);
                shard.rotation.z = idx % 2 === 0 ? -0.35 : 0.35;
                this.worldGroup.add(shard);
            } else if (floorNum <= 6) {
                const col = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 9.5, 6), wallMat);
                col.position.set(ix, 4.75, iz);
                col.castShadow = true;
                this.worldGroup.add(col);

                const lavaRing = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.32, 8, 20), accentMat);
                lavaRing.rotation.x = Math.PI / 2;
                lavaRing.position.set(ix, 0.35, iz);
                this.worldGroup.add(lavaRing);

                const flameCore = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 0), accentMat);
                flameCore.position.set(ix, 11.0, iz);
                this.worldGroup.add(flameCore);
                this.animatedProps.push({ mesh: flameCore, type: 'float_spin', baseY: 11.0 });
            } else if (floorNum <= 8) {
                const monolith = new THREE.Mesh(chamferBox(3.5, 12.0, 2.6, 0.15), wallMat);
                monolith.position.set(ix, 6.0, iz);
                monolith.lookAt(0, 6.0, 0);
                monolith.castShadow = true;
                this.worldGroup.add(monolith);

                const rune = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9.5, 2.75), accentMat);
                rune.position.set(ix, 6.0, iz);
                rune.lookAt(0, 6.0, 0);
                this.worldGroup.add(rune);
            } else {
                const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.2, 12.5, 4), wallMat);
                obelisk.position.set(ix, 6.25, iz);
                obelisk.castShadow = true;
                this.worldGroup.add(obelisk);

                const voidHalo = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.2, 8, 24), accentMat);
                voidHalo.position.set(ix, 10.2, iz);
                this.worldGroup.add(voidHalo);
                this.animatedProps.push({ mesh: voidHalo, type: 'float_spin', baseY: 10.2 });
            }

            this.colliders.push({ x: ix, z: iz, r: 2.6 });
        });

        // Floor 10: Grand Void King Throne Dais at North Sanctum
        if (floorNum === 10) {
            const dais = new THREE.Mesh(chamferBox(18, 1.4, 12, 0.12), wallMat);
            dais.position.set(0, 0.7, -102);
            this.worldGroup.add(dais);
            const throne = new THREE.Mesh(chamferBox(4.6, 7.2, 2.8, 0.14), accentMat);
            throne.position.set(0, 4.3, -105);
            this.worldGroup.add(throne);
        }

        // 5. AUTHENTIC 2D MAZE PORTALS & FLOOR-LOCATED DUNGEONS
        // Floor 1 has an exit doorway back out of the Spire Tower into Town; Floors 2-10 have NO town portal (just like 2D!)
        if (floorNum === 1) {
            this.createPortal('EXIT SPIRE TO TOWN', 'Step Outside Spire Tower', 'town', 18, 112, 0x00e676);
        }
        if (floorNum > 1) {
            this.createPortal(`FLOOR ${floorNum - 1}`, 'Descend Spire Maze', `floor${floorNum - 1}`, -18, 112, 0x29b6f6);
        }
        if (floorNum < 10) {
            this.createPortal(`FLOOR ${floorNum + 1}`, 'Ascend Spire Maze', `floor${floorNum + 1}`, 0, -112, 0xff5252);
        }

        // DUNGEON 1 (Slime Dungeon) is located on Spire Floor 3 per 2D Exonie!
        if (floorNum === 3) {
            this.createPortal('SLIME DUNGEON (D1)', 'Select Difficulty (7/7 Weekly)', 'dungeon1', 72, -34, 0x76ff03);
        }
        // DUNGEON 2 (Ancient Cave) is located on Spire Floor 9 per 2D Exonie!
        if (floorNum === 9) {
            this.createPortal('ANCIENT CAVE (D2)', 'Select Difficulty (7/7 Weekly)', 'dungeon2a', 72, -34, 0xd500f9);
        }
        if (floorNum === 8) {
            this.createPortal('WARP TO FLOOR 10', 'Void King Throne', 'floor10', 72, -34, 0xaa00ff);
        }

        // 6. Authoritative 2D Floor Monster Spawns Distributed Across the 10x Larger Maze
        const FLOOR_SPAWN_TABLE = {
            1:  { common: ['common_mobs1', 5],   mini: ['mini_boss1', 15],       boss: ['floor_boss1', 20] },
            2:  { common: ['common_mobs1', 10],  mini: ['mini_boss1', 20],       boss: ['floor_boss1', 30] },
            3:  { common: ['common_mobs2', 15],  mini: ['mini_boss2', 30],       boss: ['floor_boss2', 40] },
            4:  { common: ['common_mobs2', 35],  mini: ['mini_boss2', 45],       boss: ['floor_boss2', 55] },
            5:  { common: ['common_mobs3', 40],  mini: ['mini_boss3', 55],       boss: ['floor_boss3', 80] },
            6:  { common: ['common_mobs3', 55],  mini: ['mini_boss3', 75],       boss: ['floor_boss3', 95] },
            7:  { common: ['common_golem', 75],  mini: ['mini_boss_golem', 85],  boss: ['floor_boss_golem', 105] },
            8:  { common: ['common_golem', 100], mini: ['mini_boss_golem', 150], boss: ['floor_boss_golem', 200] },
            9:  { common: ['common_wraith', 175],mini: ['mini_boss_wraith', 210],boss: ['floor_boss_wraith', 250] },
            10: { common: ['common_wraith', 250],mini: ['mini_boss_wraith', 300],boss: ['floor_boss_wraith', 400] }
        };

        const cfg = FLOOR_SPAWN_TABLE[floorNum] || FLOOR_SPAWN_TABLE[1];

        // 18 Common Mobs patrolling the Labyrinth Corridors
        const commonCoords = [
            [-24, 92], [24, 92], [0, 72],
            [-62, 68], [62, 68], [-22, 42], [22, 42],
            [-54, 28], [54, 28], [-82, 8], [82, 8],
            [-18, -8], [18, -8], [-58, -32], [58, -32],
            [-32, -62], [32, -62], [0, -42]
        ];
        commonCoords.forEach(([mx, mz], i) => {
            this.queueSpawn(monsterSpawns, `${floorNum}_c_${i}`, cfg.common[0], 'common_mobs', cfg.common[1], mx, mz);
        });

        // 4 Mini-Bosses guarding the Labyrinth Mid-Wings & Upper Gate
        const miniCoords = [
            [-46, 12], [46, 12], [-42, -58], [42, -58]
        ];
        miniCoords.forEach(([mx, mz], i) => {
            this.queueSpawn(monsterSpawns, `${floorNum}_m_${i + 1}`, cfg.mini[0], 'mini_boss', cfg.mini[1], mx, mz);
        });

        // 1 Floor Boss in the Grand North Sanctum
        this.queueSpawn(monsterSpawns, `${floorNum}_boss`, cfg.boss[0], 'floor_boss', cfg.boss[1], 0, -90);
    }

    // Build 3D Inlaid Stone Maze Flagstones, Compass Rose Medallions & Runic Floor Borders
    buildMazeFloorPatternInlays(floorNum, theme, stonePathMat, accentMat) {
        // 1. 2D Floor Theme Art Medallion in the North Boss Sanctum & Central Crossroads
        const bgTex = this.get2DBackgroundTexture(`floor${floorNum}.png`);
        const bossSanctumArt = new THREE.Mesh(
            new THREE.CircleGeometry(24, 40),
            new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.55, metalness: 0.2 })
        );
        bossSanctumArt.rotation.x = -Math.PI / 2;
        bossSanctumArt.position.set(0, 0.03, -90);
        bossSanctumArt.receiveShadow = true;
        this.worldGroup.add(bossSanctumArt);

        const bossRing = new THREE.Mesh(
            new THREE.RingGeometry(23.6, 25.2, 48),
            new THREE.MeshBasicMaterial({ color: theme.accent, side: THREE.DoubleSide })
        );
        bossRing.rotation.x = -Math.PI / 2;
        bossRing.position.set(0, 0.05, -90);
        this.worldGroup.add(bossRing);

        // 2. Central Labyrinth Compass Rose Medallion & 2D Emblem at (0, 0)
        const centerArt = new THREE.Mesh(
            new THREE.CircleGeometry(14.5, 36),
            new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.55, metalness: 0.2 })
        );
        centerArt.rotation.x = -Math.PI / 2;
        centerArt.position.set(0, 0.03, 0);
        centerArt.receiveShadow = true;
        this.worldGroup.add(centerArt);

        const centerRings = [8, 15, 22];
        centerRings.forEach((r, idx) => {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(r - 0.45, r, 32),
                idx % 2 === 0 ? accentMat : stonePathMat
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.04, 0);
            this.worldGroup.add(ring);
        });

        // 3. 3D Raised Labyrinth Flagstone Pathways & Glowing Runic Guide Strips along Maze Corridors
        const pathwayStrips = [
            [0, 95, 10, 42],    // South Entrance Hallway
            [0, 48, 10, 46],    // South-Center Spine
            [0, -10, 10, 56],   // Center Spine
            [0, -64, 10, 52],   // North Boss Approach
            [-56, 36, 88, 9],   // Lower East-West Maze Corridor
            [ 56, 36, 88, 9],
            [-56, -34, 88, 9],  // Upper East-West Maze Corridor
            [ 56, -34, 88, 9],
            [-74, 0, 9, 136],   // West Outer Labyrinth Hall
            [ 74, 0, 9, 136]    // East Outer Labyrinth Hall
        ];
        pathwayStrips.forEach(([px, pz, pw, pd]) => {
            const slab = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.08, pd), stonePathMat);
            slab.position.set(px, 0.04, pz);
            slab.receiveShadow = true;
            this.worldGroup.add(slab);

            // Glowing runic border lines along the stone pathway
            const isVertical = pd >= pw;
            const borderW = isVertical ? 0.28 : pw;
            const borderD = isVertical ? pd : 0.28;
            [-1, 1].forEach(side => {
                const strip = new THREE.Mesh(new THREE.BoxGeometry(borderW, 0.10, borderD), accentMat);
                strip.position.set(
                    px + (isVertical ? side * (pw * 0.46) : 0),
                    0.05,
                    pz + (isVertical ? 0 : side * (pd * 0.46))
                );
                this.worldGroup.add(strip);
            });
        });

        // 4. Glowing Runic Floor Nodes at Corridor Intersections
        const intersections = [
            [0, 72], [0, 36], [-74, 36], [74, 36],
            [-74, -34], [74, -34], [0, -34], [0, -68]
        ];
        intersections.forEach(([nx, nz]) => {
            const node = new THREE.Mesh(
                new THREE.RingGeometry(2.6, 3.6, 6),
                new THREE.MeshBasicMaterial({ color: theme.accent, side: THREE.DoubleSide })
            );
            node.rotation.x = -Math.PI / 2;
            node.position.set(nx, 0.06, nz);
            this.worldGroup.add(node);
        });
    }

    // ========================================================================
    // WOODS / FOREST REALM GENERATOR (FOR NEUTRAL ZONE & BATTLEFIELD)
    // Authentic 2D Woods Feel + Exact 2D Neutral Zone & Battlefield Mechanics
    // ========================================================================
    buildWoodsRealm(mapName, theme, monsterSpawns) {
        const bound = 104.0;
        this.mapBound = bound - 2.0;

        // 1. Central Forest Clearing overlaid with Authentic 2D Map Texture
        const bgFile = mapName === 'neutralzone' ? 'neutralzone.png' : 'battlefield.png';
        const bgTex = this.get2DBackgroundTexture(bgFile);
        const clearingPlane = new THREE.Mesh(
            new THREE.CircleGeometry(46, 48),
            new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.68, metalness: 0.12 })
        );
        clearingPlane.rotation.x = -Math.PI / 2;
        clearingPlane.position.set(0, 0.03, -12);
        clearingPlane.receiveShadow = true;
        this.worldGroup.add(clearingPlane);

        // Winding Dirt Forest Trail from South Gate (0, 88) to the North Clearing
        const trailMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.88 });
        for (let z = 88; z >= -60; z -= 10) {
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.0, 0.08, 16), trailMat);
            pad.position.set(Math.sin(z * 0.05) * 4.5, 0.04, z);
            pad.receiveShadow = true;
            this.worldGroup.add(pad);
        }

        // 2. Enclosed Wooden Palisade & Cliff Wall Perimeter (Zero Open Edges)
        this.buildEnclosedPerimeterWalls(bound, 10.5, theme, '#3e2723');

        // 3. Dense 3D Woods & Forest Groves (85+ Pine & Ancient Oak Trees, Mossy Boulders, Logs)
        // Outer dense forest border inside the perimeter wall
        for (let i = 0; i < 56; i++) {
            const ang = (i / 56) * Math.PI * 2;
            const r = 82 + (i % 3) * 6.5;
            const tx = Math.cos(ang) * r;
            const tz = Math.sin(ang) * r;
            if (Math.hypot(tx, tz - 88) < 16) continue; // Keep South entrance clear
            this.buildTree(tx, tz, 1.35 + (i % 3) * 0.25, i % 3 === 0);
        }

        // Inner Woodland Groves & Forest Clusters creating an authentic 2D Woods feel
        const groveCoords = [
            [-54, 52], [-66, 38], [-48, 26], [54, 52], [66, 38], [48, 26],
            [-62, -6], [-52, -22], [-68, -36], [62, -6], [52, -22], [68, -36],
            [-46, -58], [-62, -68], [46, -58], [62, -68],
            [-32, 42], [32, 42], [-36, 12], [36, 12],
            [-38, -42], [38, -42], [-22, -72], [22, -72], [0, -78]
        ];
        groveCoords.forEach(([gx, gz], idx) => {
            this.buildTree(gx, gz, 1.2 + (idx % 3) * 0.22, idx % 2 === 0);
        });

        // Mossy Forest Boulders & Fallen Logs
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.82 });
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.75 });
        const boulderCoords = [
            [-26, 22], [26, 22], [-30, -18], [30, -18],
            [-24, -52], [24, -52], [-44, 4], [44, 4]
        ];
        boulderCoords.forEach(([bx, bz], i) => {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + (i % 2) * 0.6, 1), rockMat);
            rock.position.set(bx, 1.1, bz);
            rock.scale.set(1.2, 0.85, 1.1);
            rock.castShadow = true;
            this.worldGroup.add(rock);

            const mossCap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8), mossMat);
            mossCap.position.set(bx, 1.85, bz);
            mossCap.scale.set(1.2, 0.4, 1.1);
            this.worldGroup.add(mossCap);
            this.colliders.push({ x: bx, z: bz, r: 2.2 });
        });

        // Return to Town Portal at South Forest Gate (0, 92)
        this.createPortal('RETURN TO TOWN', 'Exit the Woods', 'town', 0, 92, 0x00e676);

        if (mapName === 'neutralzone') {
            // ================================================================
            // AUTHENTIC 2D NEUTRAL ZONE (server.js lines 978-1034):
            // 1. Wild PvP & World Boss Woods!
            // 2. Spawns 1 Random Boss from MONSTER_DATABASE (Lv. 1 - 100) in the center clearing!
            // ================================================================
            const bossKeys = Object.keys(MONSTER_DATABASE);
            const randomKey = bossKeys[Math.floor(Math.random() * bossKeys.length)] || 'floor_boss_golem';
            const randomLevel = Math.floor(Math.random() * 100) + 1;

            // Ancient World Boss Stone Altar Ring in Center Clearing (0, -22)
            const altarRing = new THREE.Mesh(
                new THREE.RingGeometry(9.5, 11.2, 36),
                new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide })
            );
            altarRing.rotation.x = -Math.PI / 2;
            altarRing.position.set(0, 0.06, -22);
            this.worldGroup.add(altarRing);

            this.queueSpawn(monsterSpawns, `nz_world_boss`, randomKey, 'floor_boss', randomLevel, 0, -22, {
                isNeutralBoss: true,
                noRespawn: true // 2D server.js respawnDelayMs: -1 (Controlled strictly by Supabase boss_timers!)
            });
            // Matching 2D Neutral Zone: 1 Solo World Boss in the center clearing, NO gold slimes (Golden Slime is ultra-rare Spire event)
        } else if (mapName === 'battlefield') {
            // ================================================================
            // AUTHENTIC 2D BATTLEFIELD (server.js lines 1036-1064):
            // Co-op Castle Defense Woods vs 1 Colossal Raid Boss (Lv. 500 - 1000)
            // Drops Huge Nugget (500,000 G) or Lv. 150 Divine Gear & auto-returns to Town!
            // ================================================================
            // Woodland Fortress Bastion Gates at South Clearing (0, 58)
            const fortMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6 });
            [-18, 18].forEach(fx => {
                const bastion = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 11, 12), fortMat);
                bastion.position.set(fx, 5.5, 58);
                bastion.castShadow = true;
                this.worldGroup.add(bastion);
                this.colliders.push({ x: fx, z: 58, r: 4.5 });
            });

            const raidArenaRing = new THREE.Mesh(
                new THREE.RingGeometry(16.0, 18.0, 48),
                new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide })
            );
            raidArenaRing.rotation.x = -Math.PI / 2;
            raidArenaRing.position.set(0, 0.06, -24);
            this.worldGroup.add(raidArenaRing);

            const bfBossPool = ['floor_boss_wraith', 'floor_boss_minotaur', 'floor_boss_dragon'];
            const randomBfKey = bfBossPool[Math.floor(Math.random() * bfBossPool.length)];
            const randomBfLevel = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

            this.queueSpawn(monsterSpawns, `bf_raid_boss`, randomBfKey, 'floor_boss', randomBfLevel, 0, -24, {
                isBattlefieldBoss: true,
                noRespawn: true
            });
        }
    }

    buildDungeon(mapName, theme, monsterSpawns) {
        const bound = 48.0;
        this.mapBound = bound - 1.5;

        const bgFile = mapName === 'event_cave' ? 'dungeon2b.png' : `${mapName}.png`;
        const bgTex = this.get2DBackgroundTexture(bgFile);
        const floorArtPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(bound * 2, bound * 2),
            new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.65, metalness: 0.15 })
        );
        floorArtPlane.rotation.x = -Math.PI / 2;
        floorArtPlane.position.y = 0.02;
        floorArtPlane.receiveShadow = true;
        this.worldGroup.add(floorArtPlane);

        this.buildEnclosedPerimeterWalls(bound, 12.0, theme);

        const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.55, metalness: 0.35 });
        const glowMat = new THREE.MeshStandardMaterial({
            color: theme.accent,
            emissive: theme.accent,
            emissiveIntensity: 1.4
        });

        for (let i = 0; i < 14; i++) {
            const angle = (i / 14) * Math.PI * 2 + 0.25;
            const cx = Math.cos(angle) * 40;
            const cz = Math.sin(angle) * 40;
            const crystal = new THREE.Mesh(new THREE.ConeGeometry(2.3, 9.5, 6), i % 2 === 0 ? glowMat : wallMat);
            crystal.position.set(cx, 4.7, cz);
            crystal.rotation.z = (Math.random() - 0.5) * 0.35;
            crystal.castShadow = true;
            this.worldGroup.add(crystal);
        }

        // Return portal leads back to the Spire Floor where the Dungeon resides (or Town)
        if (mapName === 'dungeon1') {
            this.createPortal('EXIT TO FLOOR 3', 'Return to Shadow Cavern', 'floor3', 0, 39, 0x00e676);
        } else if (mapName.startsWith('dungeon2')) {
            this.createPortal('EXIT TO FLOOR 9', 'Return to Astral Nexus', 'floor9', 0, 39, 0x00e676);
        } else {
            const exitX = mapName === 'event_cave' ? -86 : 0;
            const exitZ = mapName === 'event_cave' ? -12 : 22;
            this.createPortal('EXIT TO TOWN', 'Return to Safe Haven', 'town', 0, 39, 0x00e676, exitX, exitZ);
        }

        // Scale monster levels by selected Dungeon Difficulty (Easy 1x, Medium 1.4x, Hard 1.9x, Extreme 2.5x)
        const diffMult = this.dungeonDifficultyMult || 1.0;

        if (mapName === 'dungeon1') {
            this.queueSpawn(monsterSpawns, 'd1_boss', 'floor_boss1', 'floor_boss', Math.round(50 * diffMult), 0, -24);
            this.queueSpawn(monsterSpawns, 'd1_mini1', 'mini_boss1', 'mini_boss', Math.round(35 * diffMult), -14, -12);
            this.queueSpawn(monsterSpawns, 'd1_mini2', 'mini_boss1', 'mini_boss', Math.round(35 * diffMult),  14, -12);
            for (let i = 0; i < 6; i++) {
                this.queueSpawn(monsterSpawns, `d1_c_${i}`, 'common_mobs1', 'common_mobs', Math.round(30 * diffMult), -20 + i * 8, 12);
            }
        } else if (mapName === 'dungeon2a') {
            this.createPortal('ANCIENT CAVE B', 'Minotaur Maze', 'dungeon2b', 0, -39, 0xff9100);
            this.queueSpawn(monsterSpawns, 'd2a_boss', 'floor_boss_wraith', 'floor_boss', Math.round(150 * diffMult), 0, -22);
            this.queueSpawn(monsterSpawns, 'd2a_mini', 'mini_boss_wraith', 'mini_boss', Math.round(150 * diffMult), -14, -10);
            for (let i = 0; i < 5; i++) {
                this.queueSpawn(monsterSpawns, `d2a_c_${i}`, 'common_wraith', 'common_mobs', Math.round(150 * diffMult), -16 + i * 8, 10);
            }
        } else if (mapName === 'dungeon2b') {
            this.createPortal('ANCIENT CAVE C', 'Ignis Dragon Lair', 'dungeon2c', 0, -39, 0xff1744);
            this.queueSpawn(monsterSpawns, 'd2b_boss', 'floor_boss_minotaur', 'floor_boss', Math.round(150 * diffMult), 0, -22);
            this.queueSpawn(monsterSpawns, 'd2b_mini', 'mini_boss_minotaur', 'mini_boss', Math.round(150 * diffMult), 14, -10);
            for (let i = 0; i < 5; i++) {
                this.queueSpawn(monsterSpawns, `d2b_c_${i}`, 'common_minotaur', 'common_mobs', Math.round(150 * diffMult), -16 + i * 8, 10);
            }
        } else if (mapName === 'dungeon2c') {
            this.queueSpawn(monsterSpawns, 'd2c_boss', 'floor_boss_dragon', 'floor_boss', Math.round(450 * diffMult), 0, -24);
            this.queueSpawn(monsterSpawns, 'd2c_mini1', 'mini_boss_dragon', 'mini_boss', Math.round(350 * diffMult), -14, -10);
            this.queueSpawn(monsterSpawns, 'd2c_mini2', 'mini_boss_dragon', 'mini_boss', Math.round(350 * diffMult),  14, -10);
            for (let i = 0; i < 5; i++) {
                this.queueSpawn(monsterSpawns, `d2c_c_${i}`, 'common_dragon', 'common_mobs', Math.round(300 * diffMult), -16 + i * 8, 12);
            }
        } else if (mapName === 'event_cave') {
            this.queueSpawn(monsterSpawns, 'ev_boss', 'floor_boss_minotaur', 'floor_boss', 85, 0, -24);
            this.queueSpawn(monsterSpawns, 'ev_mini1', 'mini_boss_minotaur', 'mini_boss', 50, -14, -10);
            this.queueSpawn(monsterSpawns, 'ev_mini2', 'mini_boss_minotaur', 'mini_boss', 50,  14, -10);
            for (let i = 0; i < 5; i++) {
                this.queueSpawn(monsterSpawns, `ev_c_${i}`, 'common_minotaur', 'common_mobs', 50, -16 + i * 8, 12);
            }
        }
    }

    buildSpecialRealm(mapName, theme, monsterSpawns) {
        const bgMap = {
            home: 'home.png',
            guildbase: 'guildbase.png',
            trainingtavern: 'trainingtavern.png',
            hauntedhouse: 'hauntedhouse.png'
        };
        const isCozyRoom = (mapName === 'home');
        const roomBound = isCozyRoom ? 24.0 : 34.0;
        this.mapBound = roomBound - 1.5;

        if (bgMap[mapName]) {
            const bgTex = this.get2DBackgroundTexture(bgMap[mapName]);
            const artPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(roomBound * 2, roomBound * 2),
                new THREE.MeshStandardMaterial({ map: bgTex, roughness: 0.58, metalness: 0.15 })
            );
            artPlane.rotation.x = -Math.PI / 2;
            artPlane.position.y = 0.02;
            artPlane.receiveShadow = true;
            this.worldGroup.add(artPlane);
        }

        this.buildEnclosedPerimeterWalls(roomBound, isCozyRoom ? 8.5 : 10.5, theme);

        let exitSpawnX = 0, exitSpawnZ = 22;
        if (mapName === 'home') { exitSpawnX = -66; exitSpawnZ = 56; }
        else if (mapName === 'guildbase') { exitSpawnX = 78; exitSpawnZ = -22; }
        else if (mapName === 'trainingtavern') { exitSpawnX = 76; exitSpawnZ = -74; }
        else if (mapName === 'hauntedhouse') { exitSpawnX = -78; exitSpawnZ = -74; }

        this.createPortal('RETURN TO TOWN', 'Safe Haven', 'town', 0, isCozyRoom ? 19 : 27, 0x00e676, exitSpawnX, exitSpawnZ);

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.65 });
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.85, roughness: 0.2 });
        const clothRedMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.55 });
        const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff3d00, emissiveIntensity: 2.0 });

        if (mapName === 'home') {
            const hearth = new THREE.Mesh(chamferBox(6.5, 6.2, 2.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.7 }));
            hearth.position.set(0, 3.1, -21.0);
            this.worldGroup.add(hearth);
            const fireCore = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.0, 8), fireMat);
            fireCore.position.set(0, 1.2, -19.8);
            this.worldGroup.add(fireCore);
            const hearthLight = new THREE.PointLight(0xff6d00, 2.2, 22);
            hearthLight.position.set(0, 2.5, -18.5);
            this.worldGroup.add(hearthLight);
            this.colliders.push({ x: 0, z: -20.5, r: 3.2 });

            const bedFrame = new THREE.Mesh(chamferBox(5.2, 1.1, 6.8, 0.1), darkWoodMat);
            bedFrame.position.set(-15, 0.55, -14);
            this.worldGroup.add(bedFrame);
            const blanket = new THREE.Mesh(chamferBox(4.8, 0.45, 5.0, 0.08), clothRedMat);
            blanket.position.set(-15, 1.2, -13.2);
            this.worldGroup.add(blanket);
            const pillow = new THREE.Mesh(chamferBox(3.8, 0.38, 1.4, 0.08), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
            pillow.position.set(-15, 1.3, -16.2);
            this.worldGroup.add(pillow);
            this.colliders.push({ x: -15, z: -14, r: 3.4 });

            const shelf = new THREE.Mesh(chamferBox(5.6, 6.0, 1.8, 0.08), darkWoodMat);
            shelf.position.set(15, 3.0, -18.5);
            this.worldGroup.add(shelf);
            this.colliders.push({ x: 15, z: -18.5, r: 2.8 });

            // Royal velvet woven rug with gold bullion fringe border
            const royalRug = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.05, 11.5), clothRedMat);
            royalRug.position.set(0, 0.035, -5);
            royalRug.receiveShadow = true;
            this.worldGroup.add(royalRug);
            const rugFringe = new THREE.Mesh(new THREE.BoxGeometry(16.2, 0.04, 12.2), goldMat);
            rugFringe.position.set(0, 0.03, -5);
            this.worldGroup.add(rugFringe);

            const table = new THREE.Mesh(chamferBox(5.4, 1.5, 3.4, 0.08), woodMat);
            table.position.set(0, 0.75, -5);
            this.worldGroup.add(table);
            this.colliders.push({ x: 0, z: -5, r: 2.6 });

            // ================================================================
            // AUTHENTIC 2D HOME STORAGE VAULT (Portal I -> window.openStorageUI)
            // Interactive 15-Slot Personal Storage Chest inside Home at (-15, 4)!
            // ================================================================
            const chest = new THREE.Mesh(chamferBox(2.8, 1.8, 1.8, 0.08), woodMat);
            chest.position.set(-15, 0.9, 4);
            chest.castShadow = true;
            this.worldGroup.add(chest);
            const chestLock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.9), goldMat);
            chestLock.position.set(-15, 1.1, 4);
            this.worldGroup.add(chestLock);
            this.colliders.push({ x: -15.4, z: 4, r: 1.0 });

            const storageGlowMat = new THREE.MeshStandardMaterial({
                color: 0xffca28,
                emissive: 0xffab00,
                emissiveIntensity: 1.6,
                roughness: 0.2
            });
            const storageRing = new THREE.Mesh(
                new THREE.RingGeometry(2.1, 2.75, 32),
                new THREE.MeshBasicMaterial({ color: 0xffca28, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
            );
            storageRing.rotation.x = -Math.PI / 2;
            storageRing.position.set(-13.2, 0.06, 4);
            this.worldGroup.add(storageRing);

            const storageGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), storageGlowMat);
            storageGem.position.set(-15, 2.6, 4);
            this.worldGroup.add(storageGem);
            this.animatedProps.push({ mesh: storageGem, type: 'float_spin', baseY: 2.6 });

            const storageLight = new THREE.PointLight(0xffca28, 1.8, 12);
            storageLight.position.set(-14, 2.8, 4);
            this.worldGroup.add(storageLight);

            const storageLabel = this.makeFloatingLabelSprite('🧰 HOME STORAGE', '15-Slot Vault — Step in to Open', 0xffca28);
            storageLabel.position.set(-14.5, 4.1, 4);
            this.worldGroup.add(storageLabel);

            this.portals.push({
                label: 'HOME STORAGE VAULT',
                subtitle: '15-Slot Personal Item Storage',
                targetMapId: 'storage',
                targetMap: 'storage',
                x: -13.2,
                z: 4,
                pos: new THREE.Vector3(-13.2, 0, 4),
                mesh: storageRing,
                glowMat: storageGlowMat,
                groundRing: storageRing,
                light: storageLight,
                labelSprite: storageLabel,
                isHouse: true,
                colorHex: 0xffca28
            });

        } else if (mapName === 'guildbase') {
            // Grand velvet ceremonial runner with gold embroidered borders
            const runner = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.06, 44), clothRedMat);
            runner.position.set(0, 0.04, 0);
            this.worldGroup.add(runner);

            const runnerBorder = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.045, 44.4), goldMat);
            runnerBorder.position.set(0, 0.035, 0);
            this.worldGroup.add(runnerBorder);

            // Grand concentric guild crest dais rings on floor
            const guildRingMat = new THREE.MeshBasicMaterial({ color: 0x1e88e5, side: THREE.DoubleSide });
            const gRing1 = new THREE.Mesh(new THREE.RingGeometry(16, 17.2, 48), goldMat);
            gRing1.rotation.x = -Math.PI / 2;
            gRing1.position.set(0, 0.048, -10);
            this.worldGroup.add(gRing1);

            const gRing2 = new THREE.Mesh(new THREE.RingGeometry(11, 12, 36), guildRingMat);
            gRing2.rotation.x = -Math.PI / 2;
            gRing2.position.set(0, 0.049, -10);
            this.worldGroup.add(gRing2);

            const dais = new THREE.Mesh(chamferBox(14, 1.1, 7.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }));
            dais.position.set(0, 0.55, -23);
            this.worldGroup.add(dais);
            const throne = new THREE.Mesh(chamferBox(3.4, 5.2, 2.2, 0.12), goldMat);
            throne.position.set(0, 3.2, -25);
            this.worldGroup.add(throne);
            this.colliders.push({ x: 0, z: -25, r: 2.5 });

            [-12, 12].forEach(tx => {
                const bTable = new THREE.Mesh(chamferBox(4.2, 1.5, 16, 0.1), woodMat);
                bTable.position.set(tx, 0.75, -4);
                this.worldGroup.add(bTable);
                this.colliders.push({ x: tx, z: -9, r: 2.4 });
                this.colliders.push({ x: tx, z:  1, r: 2.4 });
            });

            [[-7, -18], [7, -18], [-7, 8], [7, 8]].forEach(([bx, bz]) => {
                const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 2.6, 12), goldMat);
                stand.position.set(bx, 1.3, bz);
                this.worldGroup.add(stand);
                const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), fireMat);
                flame.position.set(bx, 3.1, bz);
                this.worldGroup.add(flame);
                this.animatedProps.push({ mesh: flame, type: 'float_spin', baseY: 3.1 });
                this.colliders.push({ x: bx, z: bz, r: 1.3 });
            });

        } else if (mapName === 'trainingtavern') {
            // ================================================================
            // AUTHENTIC 2D TRAINING TAVERN SOLO CHALLENGE ARENA (server.js 4623-4739)
            // Spawns the single chosen Opponent Type ('common' | 'mini' | 'floor')
            // at the player's chosen Level (1-50) for the timed speedrun!
            // ================================================================
            const barCounter = new THREE.Mesh(chamferBox(3.2, 2.2, 14, 0.1), woodMat);
            barCounter.position.set(-24, 1.1, 6);
            this.worldGroup.add(barCounter);
            this.colliders.push({ x: -24, z: 6, r: 2.8 });

            [-27, -27, -27].forEach((kx, idx) => {
                const keg = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 12), darkWoodMat);
                keg.position.set(kx, 1.1, 1 + idx * 4.5);
                this.worldGroup.add(keg);
            });

            const arenaRing = new THREE.Mesh(
                new THREE.RingGeometry(15.5, 16.5, 40),
                new THREE.MeshBasicMaterial({ color: 0xffab00, side: THREE.DoubleSide })
            );
            arenaRing.rotation.x = -Math.PI / 2;
            arenaRing.position.set(0, 0.05, -8);
            this.worldGroup.add(arenaRing);

            const cfg = this.tavernChallengeConfig || { bossType: 'common', level: 10 };
            let dbKey = 'common_mobs1';
            let cat = 'common_mobs';
            if (cfg.bossType === 'mini') {
                dbKey = 'mini_boss1';
                cat = 'mini_boss';
            } else if (cfg.bossType === 'floor') {
                dbKey = 'floor_boss1';
                cat = 'floor_boss';
            }
            const targetLv = Math.max(1, Math.min(50, parseInt(cfg.level, 10) || 10));

            this.queueSpawn(monsterSpawns, `tavern_boss_${Date.now()}`, dbKey, cat, targetLv, 0, -10, {
                isTavernBoss: true,
                noRespawn: true
            });

        } else if (mapName === 'hauntedhouse') {
            // Eldritch Necrotic Ritual Summoning Circle & Arcane Rune Circles
            const purpleGlowMat = new THREE.MeshStandardMaterial({
                color: 0xba68c8,
                emissive: 0x9c27b0,
                emissiveIntensity: 1.8,
                roughness: 0.2
            });
            const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x1f162b, roughness: 0.75, metalness: 0.3 });

            // Concentric Glowing Arcane Runic Rings on the Haunted House Floor
            [8, 14, 20].forEach((r, idx) => {
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(r - 0.35, r, 48),
                    idx === 1 ? purpleGlowMat : new THREE.MeshBasicMaterial({ color: 0x7b1fa2, side: THREE.DoubleSide })
                );
                ring.rotation.x = -Math.PI / 2;
                ring.position.set(0, 0.05, -14);
                this.worldGroup.add(ring);
            });

            // 4 Gothic Stone Brazier Pillars with Levitating Soul Crystals
            [[-16, -26], [16, -26], [-16, -2], [16, -2]].forEach(([px, pz]) => {
                const pillar = new THREE.Mesh(chamferBox(2.2, 5.5, 2.2, 0.12), darkStoneMat);
                pillar.position.set(px, 2.75, pz);
                pillar.castShadow = true;
                this.worldGroup.add(pillar);

                const soulCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), purpleGlowMat);
                soulCrystal.position.set(px, 6.4, pz);
                this.worldGroup.add(soulCrystal);
                this.animatedProps.push({ mesh: soulCrystal, type: 'float_spin', baseY: 6.4 });

                const soulLight = new THREE.PointLight(0xba68c8, 1.8, 18);
                soulLight.position.set(px, 6.4, pz);
                this.worldGroup.add(soulLight);
                this.colliders.push({ x: px, z: pz, r: 1.8 });
            });

            const hLevel = this.hauntedHouseLevel || 15;
            this.queueSpawn(monsterSpawns, `hh_wraith_king`, 'floor_boss_wraith', 'floor_boss', hLevel, 0, -18, {
                isHauntedBoss: true,
                noRespawn: true
            });
        }
    }

    queueSpawn(list, id, monsterKey, category, level, x, z, extra = {}) {
        let finalKey = monsterKey;
        // 🌟 2D Rare Mutation (server.js lines 1681-1687): When any common mob spawns, 0.05% chance to mutate into Golden Slime!
        if (category === 'common_mobs' && finalKey !== 'common_mobs_golden' && !extra.isTavernBoss) {
            if (Math.random() < 0.0005) {
                finalKey = 'common_mobs_golden';
            }
        }
        list.push({
            id,
            monsterKey: finalKey,
            originalKey: monsterKey,
            category,
            level,
            position: new THREE.Vector3(x, 0, z),
            ...extra
        });
    }

    createPortal(arg1, arg2, arg3, arg4, arg5, arg6, targetSpawnX, targetSpawnZ) {
        let label, subtitle, targetMapId, x, z, colorHex;
        if (arg6 !== undefined) {
            label = arg1;
            subtitle = arg2;
            targetMapId = arg3;
            x = arg4;
            z = arg5;
            colorHex = arg6;
        } else {
            label = arg1;
            subtitle = 'Step in to Teleport';
            targetMapId = arg2;
            x = arg3;
            z = arg4;
            colorHex = arg5;
        }

        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const baseMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.85, roughness: 0.25 });
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.9, 0.38, 24), baseMat);
        ped.position.y = 0.19;
        g.add(ped);

        const ringMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 1.65,
            roughness: 0.15
        });
        const torus = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.20, 12, 32), ringMat);
        torus.position.y = 2.4;
        g.add(torus);

        const vortexMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.38,
            side: THREE.DoubleSide
        });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1.86, 24), vortexMat);
        disc.position.y = 2.4;
        g.add(disc);

        const groundGlowRing = new THREE.Mesh(
            new THREE.RingGeometry(2.6, 3.2, 32),
            new THREE.MeshBasicMaterial({
                color: colorHex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.58
            })
        );
        groundGlowRing.rotation.x = -Math.PI / 2;
        groundGlowRing.position.y = 0.05;
        g.add(groundGlowRing);

        const pLight = new THREE.PointLight(colorHex, 1.6, 15);
        pLight.position.y = 2.6;
        g.add(pLight);

        const labelSprite = this.makeFloatingLabelSprite(`🌀 ${label}`, subtitle, colorHex);
        labelSprite.position.set(0, 5.4, 0);
        g.add(labelSprite);

        this.worldGroup.add(g);
        this.portals.push({
            label,
            subtitle,
            targetMapId,
            targetMap: targetMapId,
            x,
            z,
            targetX: targetSpawnX,
            targetY: targetSpawnZ,
            pos: new THREE.Vector3(x, 0, z),
            mesh: torus,
            glowMat: ringMat,
            vortexMat,
            groundRing: groundGlowRing,
            light: pLight,
            labelSprite,
            isHouse: false,
            colorHex
        });
    }

    checkPortalTrigger(px, pz) {
        for (const p of this.portals) {
            const triggerRadius = p.isHouse ? 2.8 : 2.5;
            if (Math.hypot(px - p.x, pz - p.z) < triggerRadius) {
                return p;
            }
        }
        return null;
    }

    checkCollision(px, pz, radius = 0.6) {
        const bound = this.mapBound || 145.0;
        if (Math.abs(px) > (bound - radius) || Math.abs(pz) > (bound - radius)) return true;
        for (const c of this.colliders) {
            if (Math.hypot(px - c.x, pz - c.z) < (c.r + radius)) {
                return true;
            }
        }
        return false;
    }

    update(dt, playerPos) {
        const time = performance.now() * 0.001;

        for (const c of this.cloudMeshes) {
            c.mesh.position.x += dt * c.speed;
            if (c.mesh.position.x > 160) c.mesh.position.x = -160;
        }
        for (const s of this.starMeshes) {
            s.mat.opacity = 0.45 + 0.55 * Math.abs(Math.sin(time * 2.2 + s.phase));
        }
        for (const p of this.portals) {
            if (p.mesh && !p.isHouse) {
                p.mesh.rotation.z += dt * 1.6;
            }
            const dist = playerPos ? Math.hypot(playerPos.x - p.x, playerPos.z - p.z) : 999;
            const isNear = dist < 9.5;
            p.isNear = isNear;

            if (isNear) {
                const pulse = 1.0 + Math.sin(time * 7.5) * 0.12;
                if (p.glowMat) p.glowMat.emissiveIntensity = 3.8 + Math.sin(time * 9.0) * 1.1;
                if (p.vortexMat) p.vortexMat.opacity = 0.72 + Math.sin(time * 8.0) * 0.18;
                if (p.light) p.light.intensity = 3.6;
                if (p.mesh) p.mesh.scale.setScalar(pulse);
                if (p.groundRing) p.groundRing.scale.setScalar(pulse * 1.08);
                if (p.labelSprite) p.labelSprite.scale.set(7.4, 2.08, 1);

                if (window.game && window.game.engine && Math.random() < 0.45) {
                    const ang = Math.random() * Math.PI * 2;
                    const r = 1.5 + Math.random() * 1.0;
                    window.game.engine.emitParticle(
                        p.x + Math.cos(ang) * r,
                        0.2,
                        p.z + Math.sin(ang) * r,
                        0,
                        2.8 + Math.random() * 2.2,
                        0,
                        p.colorHex,
                        0.38,
                        0.65,
                        -1.5
                    );
                }
            } else {
                if (p.glowMat) p.glowMat.emissiveIntensity = 1.55;
                if (p.vortexMat) p.vortexMat.opacity = 0.38;
                if (p.light) p.light.intensity = 1.3;
                if (p.mesh) p.mesh.scale.setScalar(1.0);
                if (p.groundRing) p.groundRing.scale.setScalar(1.0);
                if (p.labelSprite) p.labelSprite.scale.set(6.8, 1.9, 1);
            }
        }
        for (const prop of this.animatedProps) {
            if (prop.type === 'float_spin') {
                prop.mesh.rotation.y += dt * 1.9;
                prop.mesh.position.y = prop.baseY + Math.sin(time * 2.6) * 0.25;
            }
        }
    }
}

window.World3D = World3D;
