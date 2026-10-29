// ============================================================================
// EXONIE 3D REMASTERED — CIRCUIT SIEGE STUDIO PBR ENGINE, CAMERA & GPU VFX
// ============================================================================
import * as THREE from 'three';

const MAX_PARTICLES = 2500;

export class Engine3D {
    constructor(containerId = 'game-container') {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d1522);
        this.scene.fog = new THREE.FogExp2(0x0d1522, 0.0075);

        this.camera = new THREE.PerspectiveCamera(
            56,
            window.innerWidth / window.innerHeight,
            0.1,
            450
        );

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.18;
        if (THREE.SRGBColorSpace) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        this.renderer.domElement.id = 'canvas-3d';

        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);
        }

        // Circuit Siege Procedural Studio Environment Reflection Map
        this.envMap = this.buildStudioEnvMap();
        this.scene.environment = this.envMap;

        // Third-Person Action Camera Controls
        this.cameraYaw = 0;
        this.cameraPitch = 0.34;
        this.cameraDistance = 10.5;
        this.cameraTarget = new THREE.Vector3(0, 1.4, 0);
        this.smoothCamPos = new THREE.Vector3(0, 5, 10);
        this.isPointerLocked = false;
        this.isDraggingCam = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        this.onAttackCallback = null;
        this.onDodgeCallback = null;

        this.transientMeshes = [];
        this.projectiles = [];

        this.setupLights();
        this.initParticlePool();
        this.setupInputs();

        window.addEventListener('resize', () => this.onResize());
    }

    buildStudioEnvMap() {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();
        const envScene = new THREE.Scene();

        const skyGeo = new THREE.SphereGeometry(20, 24, 16);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x1e2c44, side: THREE.BackSide });
        envScene.add(new THREE.Mesh(skyGeo, skyMat));

        const keyCard = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
        );
        keyCard.position.set(10, 14, 10);
        keyCard.lookAt(0, 0, 0);
        envScene.add(keyCard);

        const cyanRim = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 10),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
        );
        cyanRim.position.set(-14, 6, -10);
        cyanRim.lookAt(0, 0, 0);
        envScene.add(cyanRim);

        const warmRim = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 10),
            new THREE.MeshBasicMaterial({ color: 0xffab40, side: THREE.DoubleSide })
        );
        warmRim.position.set(12, 4, -12);
        warmRim.lookAt(0, 0, 0);
        envScene.add(warmRim);

        const groundCard = new THREE.Mesh(
            new THREE.PlaneGeometry(30, 30),
            new THREE.MeshBasicMaterial({ color: 0x101824, side: THREE.DoubleSide })
        );
        groundCard.rotation.x = -Math.PI / 2;
        groundCard.position.y = -6;
        envScene.add(groundCard);

        const rt = pmrem.fromScene(envScene, 0.04);
        pmrem.dispose();
        return rt.texture;
    }

    setupLights() {
        this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.92);
        this.hemiLight.position.set(0, 60, 0);
        this.scene.add(this.hemiLight);

        this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
        this.dirLight.position.set(28, 48, 24);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 2;
        this.dirLight.shadow.camera.far = 140;
        const d = 42;
        this.dirLight.shadow.camera.left = -d;
        this.dirLight.shadow.camera.right = d;
        this.dirLight.shadow.camera.top = d;
        this.dirLight.shadow.camera.bottom = -d;
        this.dirLight.shadow.bias = -0.0005;
        this.scene.add(this.dirLight);
        this.scene.add(this.dirLight.target);

        this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
        this.rimLight.position.set(-25, 18, -22);
        this.scene.add(this.rimLight);
    }

    // ============================================================
    // ☀️ DYNAMIC DAY / NIGHT CYCLE (15-Minute Morning & Night Shift)
    // ============================================================
    updateDayNightCycle(dt, isTown = true) {
        if (!isTown) {
            this.setEnvironmentTheme('dungeon');
            return { isDay: false, label: 'Dungeon', tDay: 0 };
        }

        // 15 minutes morning/day (900s), 15 minutes night (900s) -> 1800s total period
        // Synchronized with wall clock (Date.now())
        const cycleSec = (Date.now() / 1000) % 1800;
        
        let tDay = 1.0;
        let phaseLabel = '☀️ Morning';

        if (cycleSec < 60) {
            // Dawn: Night shifting into morning (0.0 -> 1.0)
            tDay = cycleSec / 60;
            phaseLabel = '🌅 Sunrise';
        } else if (cycleSec < 780) {
            // Full morning / day
            tDay = 1.0;
            phaseLabel = cycleSec < 420 ? '☀️ Morning' : '☀️ Day';
        } else if (cycleSec < 900) {
            // Sunset: Day shifting into night (1.0 -> 0.0)
            tDay = 1 - ((cycleSec - 780) / 120);
            phaseLabel = '🌇 Sunset';
        } else if (cycleSec < 960) {
            // Twilight into night
            tDay = 0.0;
            phaseLabel = '🌆 Twilight';
        } else if (cycleSec < 1740) {
            // Full night
            tDay = 0.0;
            phaseLabel = '🌙 Night';
        } else {
            // Pre-dawn transition (1740 -> 1800)
            tDay = (cycleSec - 1740) / 60 * 0.25;
            phaseLabel = '🌌 Pre-Dawn';
        }

        tDay = Math.max(0, Math.min(1, tDay));

        // Background & Atmospheric Fog Colors
        const daySky = new THREE.Color(0x192e47);
        const sunsetSky = new THREE.Color(0x381822);
        const nightSky = new THREE.Color(0x070b16);

        let curSky = new THREE.Color();
        if (tDay > 0.5) {
            curSky.lerpColors(sunsetSky, daySky, (tDay - 0.5) * 2);
        } else {
            curSky.lerpColors(nightSky, sunsetSky, tDay * 2);
        }

        this.scene.background = curSky;
        if (!this.scene.fog) {
            this.scene.fog = new THREE.FogExp2(curSky, 0.0065);
        } else {
            this.scene.fog.color.copy(curSky);
            this.scene.fog.density = 0.0055 + (1 - tDay) * 0.0025;
        }

        // Hemisphere Light (Sky & Ground Ambient)
        const dayHemiSky = new THREE.Color(0xe0f2fe);
        const nightHemiSky = new THREE.Color(0x25476a);
        this.hemiLight.color.lerpColors(nightHemiSky, dayHemiSky, tDay);

        const dayHemiGnd = new THREE.Color(0x1e293b);
        const nightHemiGnd = new THREE.Color(0x060911);
        this.hemiLight.groundColor.lerpColors(nightHemiGnd, dayHemiGnd, tDay);
        this.hemiLight.intensity = 0.48 + tDay * 0.52;

        // Directional Light: Sun (Golden Warm Sunlight) vs Moon (Pale Silvery Cyan Moonlight)
        const dayDir = new THREE.Color(0xfff7ed);
        const nightDir = new THREE.Color(0x93c5fd);
        this.dirLight.color.lerpColors(nightDir, dayDir, tDay);
        this.dirLight.intensity = 0.65 + tDay * 0.95;

        // Rim light
        const dayRim = new THREE.Color(0x38bdf8);
        const nightRim = new THREE.Color(0x6366f1);
        this.rimLight.color.lerpColors(nightRim, dayRim, tDay);
        this.rimLight.intensity = 0.35 + tDay * 0.35;

        return {
            isDay: tDay >= 0.5,
            label: phaseLabel,
            tDay: tDay
        };
    }

    setEnvironmentTheme(themeName) {
        if (themeName === 'dungeon') {
            this.scene.background = new THREE.Color(0x090612);
            this.scene.fog = new THREE.FogExp2(0x090612, 0.011);
            this.hemiLight.color.setHex(0x7c4dff);
            this.hemiLight.groundColor.setHex(0x120a1f);
            this.hemiLight.intensity = 0.72;
            this.dirLight.color.setHex(0xb388ff);
            this.dirLight.intensity = 1.25;
        } else {
            this.scene.background = new THREE.Color(0x0f1b2d);
            this.scene.fog = new THREE.FogExp2(0x0f1b2d, 0.0065);
            this.hemiLight.color.setHex(0xdbeafe);
            this.hemiLight.groundColor.setHex(0x1e293b);
            this.hemiLight.intensity = 0.95;
            this.dirLight.color.setHex(0xfffbeb);
            this.dirLight.intensity = 1.55;
        }
    }

    initParticlePool() {
        this.pPositions = new Float32Array(MAX_PARTICLES * 3);
        this.pColors = new Float32Array(MAX_PARTICLES * 3);
        this.pSizes = new Float32Array(MAX_PARTICLES);
        this.pVelocities = new Float32Array(MAX_PARTICLES * 3);
        this.pLife = new Float32Array(MAX_PARTICLES);
        this.pMaxLife = new Float32Array(MAX_PARTICLES);
        this.pGravity = new Float32Array(MAX_PARTICLES);
        this.pCursor = 0;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.pPositions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(this.pColors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(this.pSizes, 1));

        const mat = new THREE.ShaderMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (260.0 / max(1.0, -mvPosition.z));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float d = length(uv);
                    if (d > 0.5) discard;
                    float alpha = smoothstep(0.5, 0.05, d);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `
        });

        this.particleSystem = new THREE.Points(geo, mat);
        this.particleSystem.frustumCulled = false;
        this.scene.add(this.particleSystem);
    }

    emitParticle(x, y, z, vx, vy, vz, colorHex, size = 0.45, life = 0.5, gravity = 9.8) {
        const i = this.pCursor;
        this.pCursor = (this.pCursor + 1) % MAX_PARTICLES;

        const i3 = i * 3;
        this.pPositions[i3] = x;
        this.pPositions[i3 + 1] = y;
        this.pPositions[i3 + 2] = z;

        this.pVelocities[i3] = vx;
        this.pVelocities[i3 + 1] = vy;
        this.pVelocities[i3 + 2] = vz;

        const c = new THREE.Color(colorHex);
        this.pColors[i3] = c.r;
        this.pColors[i3 + 1] = c.g;
        this.pColors[i3 + 2] = c.b;

        this.pSizes[i] = size;
        this.pLife[i] = life;
        this.pMaxLife[i] = life;
        this.pGravity[i] = gravity;
    }

    setupInputs() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('mousedown', (e) => {
            // Right-Click (button 2) or Middle-Click (button 1) orbits the camera;
            // Left-Click (button 0) is dedicated to Auto-Aim & Primary Attack!
            if (e.button === 2 || e.button === 1) {
                this.isDraggingCam = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDraggingCam = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPointerLocked) {
                this.cameraYaw -= e.movementX * 0.0032;
                this.cameraPitch = Math.max(0.08, Math.min(1.25, this.cameraPitch + e.movementY * 0.0028));
            } else if (this.isDraggingCam) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.cameraYaw -= dx * 0.0055;
                this.cameraPitch = Math.max(0.08, Math.min(1.25, this.cameraPitch + dy * 0.0045));
            }
        });

        window.addEventListener('wheel', (e) => {
            this.cameraDistance = Math.max(4.5, Math.min(22, this.cameraDistance + e.deltaY * 0.008));
        }, { passive: true });

        // Circuit Siege Mobile Touch Camera Look (Drag screen outside HUD buttons to rotate camera)
        let lookPointerId = null;
        let lastLookX = 0, lastLookY = 0;
        let initialPinchDist = null;
        let initialCamDist = null;

        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') return;
            if (e.target && e.target.closest && e.target.closest('#mobile-dpad-container, #joystick-zone, #touch-actions-zone, #mobile-menu-modal, .hud-mobile-menu-wrapper, #persistent-chat-box, .game-modal, button, input, a, select')) return;

            lookPointerId = e.pointerId;
            lastLookX = e.clientX;
            lastLookY = e.clientY;
        }, { passive: true });

        window.addEventListener('pointermove', (e) => {
            if (e.pointerId === lookPointerId) {
                const dx = e.clientX - lastLookX;
                const dy = e.clientY - lastLookY;
                lastLookX = e.clientX;
                lastLookY = e.clientY;
                if (Math.abs(dx) < 300 && Math.abs(dy) < 300) {
                    this.cameraYaw -= dx * 0.0055;
                    this.cameraPitch = Math.max(0.08, Math.min(1.25, this.cameraPitch + dy * 0.0045));
                }
            }
        }, { passive: true });

        const clearLook = (e) => {
            if (e.pointerId === lookPointerId) {
                lookPointerId = null;
            }
        };
        window.addEventListener('pointerup', clearLook, { passive: true });
        window.addEventListener('pointercancel', clearLook, { passive: true });

        // Mobile Pinch-to-Zoom
        window.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length === 2) {
                const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                if (initialPinchDist === null) {
                    initialPinchDist = dist;
                    initialCamDist = this.cameraDistance;
                } else {
                    const diff = (initialPinchDist - dist) * 0.03;
                    this.cameraDistance = Math.max(4.5, Math.min(22, initialCamDist + diff));
                }
            }
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (!e.touches || e.touches.length < 2) {
                initialPinchDist = null;
                initialCamDist = null;
            }
        }, { passive: true });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = (document.pointerLockElement === canvas);
            const ch = document.getElementById('crosshair-center');
            if (ch) ch.style.display = this.isPointerLocked ? 'block' : 'none';
        });
    }

    setGraphicsQuality(highQuality = true) {
        this.highQuality = highQuality;
        this.renderer.shadowMap.enabled = highQuality;
        this.renderer.setPixelRatio(highQuality ? Math.min(window.devicePixelRatio || 1, 2) : 1);
        if (this.dirLight) {
            this.dirLight.castShadow = highQuality;
        }
    }

    togglePointerLock() {
        const canvas = this.renderer.domElement;
        if (!this.isPointerLocked) {
            canvas.requestPointerLock?.();
        } else {
            document.exitPointerLock?.();
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addScreenshake(intensity = 0.35, duration = 0.22) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
    }

    triggerShake(intensity = 0.35, duration = 0.22) {
        this.addScreenshake(intensity, duration);
    }

    // ========================================================================
    // CIRCUIT SIEGE 3D COMBAT VFX HELPERS
    // ========================================================================
    spawnHitSparks(pos, colorHex = 0x00e5ff, count = 24) {
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.75;
            const speed = 3.5 + Math.random() * 8.5;
            const vx = Math.sin(phi) * Math.cos(theta) * speed;
            const vy = Math.cos(phi) * speed + 2.5;
            const vz = Math.sin(phi) * Math.sin(theta) * speed;
            this.emitParticle(
                pos.x, pos.y + 0.9, pos.z,
                vx, vy, vz,
                i % 3 === 0 ? 0xffffff : colorHex,
                0.35 + Math.random() * 0.35,
                0.32 + Math.random() * 0.28,
                14.0
            );
        }
    }

    spawnSlashArc(pos, yaw, colorHex = 0x00e5ff, radius = 2.5, tilt = 0) {
        const group = new THREE.Group();
        group.position.set(pos.x, pos.y + 1.15, pos.z);
        group.rotation.y = yaw;
        group.rotation.z = tilt;

        const outerGeo = new THREE.RingGeometry(radius * 0.62, radius, 24, 1, -Math.PI * 0.62, Math.PI * 1.24);
        const outerMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const outerMesh = new THREE.Mesh(outerGeo, outerMat);
        outerMesh.rotation.x = Math.PI / 2;
        group.add(outerMesh);

        const coreGeo = new THREE.RingGeometry(radius * 0.80, radius * 0.96, 24, 1, -Math.PI * 0.58, Math.PI * 1.16);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.rotation.x = Math.PI / 2;
        group.add(coreMesh);

        this.scene.add(group);
        this.transientMeshes.push({
            mesh: group,
            materials: [outerMat, coreMat],
            life: 0.22,
            maxLife: 0.22,
            scaleSpeed: 2.8,
            rotSpeedY: 4.5
        });

        for (let i = 0; i < 14; i++) {
            const a = yaw + (Math.random() - 0.5) * 2.2;
            const r = radius * (0.7 + Math.random() * 0.3);
            this.emitParticle(
                pos.x + Math.sin(a) * r,
                pos.y + 1.1 + (Math.random() - 0.5) * 0.4,
                pos.z + Math.cos(a) * r,
                Math.sin(a) * 3, 1.5, Math.cos(a) * 3,
                colorHex, 0.38, 0.28, 2.0
            );
        }
    }

    spawnLaserBolt(startPos, endPos, colorHex = 0x00e5ff, width = 0.14) {
        const dist = startPos.distanceTo(endPos);
        if (dist < 0.05) return;

        const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const group = new THREE.Group();
        group.position.copy(mid);
        group.lookAt(endPos);

        const coreGeo = new THREE.CylinderGeometry(width * 0.45, width * 0.45, dist, 8);
        coreGeo.rotateX(Math.PI / 2);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.98,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(coreGeo, coreMat));

        const glowGeo = new THREE.CylinderGeometry(width * 1.35, width * 1.35, dist, 10);
        glowGeo.rotateX(Math.PI / 2);
        const glowMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        this.scene.add(group);
        this.transientMeshes.push({
            mesh: group,
            materials: [coreMat, glowMat],
            life: 0.20,
            maxLife: 0.20,
            scaleSpeed: 0
        });

        this.spawnHitSparks(endPos, colorHex, 14);
    }

    spawnBulletTracer(startPos, endPos) {
        this.spawnLaserBolt(startPos, endPos, 0xffea00, 0.10);
    }

    spawnGroundShockwave(pos, colorHex = 0xff5252, maxRadius = 6.0) {
        const geo = new THREE.TorusGeometry(0.6, 0.12, 10, 36);
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(pos.x, pos.y + 0.12, pos.z);
        this.scene.add(mesh);

        this.transientMeshes.push({
            mesh,
            materials: [mat],
            life: 0.38,
            maxLife: 0.38,
            scaleSpeed: maxRadius * 3.8
        });

        this.spawnHitSparks(pos, colorHex, 28);
    }

    spawnLevelUpVFX(pos) {
        this.spawnGroundShockwave(pos, 0xffea00, 5.0);
        this.spawnGroundShockwave(pos, 0x00e5ff, 3.5);
        for (let i = 0; i < 65; i++) {
            const angle = (i / 65) * Math.PI * 6;
            const r = 0.8 + (i / 65) * 1.4;
            this.emitParticle(
                pos.x + Math.cos(angle) * r,
                pos.y + (i / 65) * 2.5,
                pos.z + Math.sin(angle) * r,
                Math.cos(angle) * 1.5,
                5.5 + Math.random() * 4.0,
                Math.sin(angle) * 1.5,
                i % 2 === 0 ? 0xffea00 : 0x00e5ff,
                0.55,
                0.85,
                -1.0
            );
        }
    }

    // ==========================================
    // 🔮 WEAPON PROJECTILES (STAFF, GUN, PENDANT)
    // ==========================================

    // Staff Normal Attack: Arcane / Frost Glowing Magical Orb
    spawnMagicOrb(startPos, endPos, colorHex = 0xba68c8, onImpact = null) {
        const group = new THREE.Group();
        group.position.copy(startPos);

        const coreGeo = new THREE.SphereGeometry(0.20, 12, 10);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        group.add(new THREE.Mesh(coreGeo, coreMat));

        const auraGeo = new THREE.SphereGeometry(0.42, 12, 10);
        const auraMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(auraGeo, auraMat));

        this.scene.add(group);

        const dist = startPos.distanceTo(endPos);
        const duration = Math.max(0.12, Math.min(0.35, dist / 36.0));

        this.projectiles.push({
            mesh: group,
            geometries: [coreGeo, auraGeo],
            materials: [coreMat, auraMat],
            startPos: startPos.clone(),
            endPos: endPos.clone(),
            duration: duration,
            elapsed: 0,
            onTick: (dt, t) => {
                group.rotation.x += dt * 8.0;
                group.rotation.y += dt * 10.0;
                if (Math.random() < 0.65) {
                    this.emitParticle(
                        group.position.x + (Math.random() - 0.5) * 0.3,
                        group.position.y + (Math.random() - 0.5) * 0.3,
                        group.position.z + (Math.random() - 0.5) * 0.3,
                        (Math.random() - 0.5) * 0.8,
                        (Math.random() - 0.5) * 0.8,
                        (Math.random() - 0.5) * 0.8,
                        colorHex, 0.28, 0.32, -0.2
                    );
                }
            },
            onImpact: () => {
                this.spawnHitSparks(endPos, colorHex, 22);
                this.spawnGroundShockwave(endPos, colorHex, 1.8);
                if (onImpact) onImpact();
            }
        });
    }

    // Gun Normal Attack: Fast Metallic Bullet Projectile with Muzzle Tracer
    spawnBulletProjectile(startPos, endPos, onImpact = null) {
        const group = new THREE.Group();
        group.position.copy(startPos);
        group.lookAt(endPos);

        const bulletGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.40, 8);
        bulletGeo.rotateX(Math.PI / 2);
        const bulletMat = new THREE.MeshStandardMaterial({
            color: 0xffd54f,
            metalness: 0.95,
            roughness: 0.15,
            emissive: 0xff9800,
            emissiveIntensity: 0.8
        });
        group.add(new THREE.Mesh(bulletGeo, bulletMat));

        const tipGeo = new THREE.SphereGeometry(0.055, 8, 8);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const tipMesh = new THREE.Mesh(tipGeo, tipMat);
        tipMesh.position.z = 0.20;
        group.add(tipMesh);

        this.scene.add(group);

        const dist = startPos.distanceTo(endPos);
        const duration = Math.max(0.06, Math.min(0.16, dist / 90.0));

        this.projectiles.push({
            mesh: group,
            geometries: [bulletGeo, tipGeo],
            materials: [bulletMat, tipMat],
            startPos: startPos.clone(),
            endPos: endPos.clone(),
            duration: duration,
            elapsed: 0,
            onTick: (dt, t) => {
                if (Math.random() < 0.5) {
                    this.emitParticle(
                        group.position.x, group.position.y, group.position.z,
                        (Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5,
                        0xffd54f, 0.15, 0.18, 0.5
                    );
                }
            },
            onImpact: () => {
                this.spawnHitSparks(endPos, 0xffd54f, 16);
                if (onImpact) onImpact();
            }
        });
    }

    // Pendant Normal Attack: Shimmering Starlight Holy Projectile
    spawnShimmeringProjectile(startPos, endPos, colorHex = 0x69f0ae, onImpact = null) {
        const group = new THREE.Group();
        group.position.copy(startPos);

        const starGeo = new THREE.OctahedronGeometry(0.22);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        group.add(new THREE.Mesh(starGeo, starMat));

        const shimmerGeo = new THREE.SphereGeometry(0.38, 10, 8);
        const shimmerMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.80,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(shimmerGeo, shimmerMat));

        this.scene.add(group);

        const dist = startPos.distanceTo(endPos);
        const duration = Math.max(0.12, Math.min(0.30, dist / 35.0));

        this.projectiles.push({
            mesh: group,
            geometries: [starGeo, shimmerGeo],
            materials: [starMat, shimmerMat],
            startPos: startPos.clone(),
            endPos: endPos.clone(),
            duration: duration,
            elapsed: 0,
            onTick: (dt, t) => {
                group.rotation.x += dt * 6.0;
                group.rotation.y += dt * 9.0;
                group.rotation.z += dt * 7.0;
                if (Math.random() < 0.7) {
                    this.emitParticle(
                        group.position.x + (Math.random() - 0.5) * 0.35,
                        group.position.y + (Math.random() - 0.5) * 0.35,
                        group.position.z + (Math.random() - 0.5) * 0.35,
                        (Math.random() - 0.5) * 0.6,
                        0.5,
                        (Math.random() - 0.5) * 0.6,
                        Math.random() < 0.5 ? 0xffffff : colorHex,
                        0.25, 0.35, -0.3
                    );
                }
            },
            onImpact: () => {
                this.spawnHitSparks(endPos, colorHex, 24);
                this.spawnGroundShockwave(endPos, colorHex, 2.2);
                if (onImpact) onImpact();
            }
        });
    }

    // Explosives Expert: Thrown Flaming Molotov Cocktail Bottle
    spawnThrownMolotov(startPos, endPos, onImpact = null) {
        const group = new THREE.Group();
        group.position.copy(startPos);

        const bottleGeo = new THREE.CylinderGeometry(0.08, 0.11, 0.36, 8);
        const bottleMat = new THREE.MeshStandardMaterial({
            color: 0x8d6e63,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        group.add(new THREE.Mesh(bottleGeo, bottleMat));

        const flameGeo = new THREE.SphereGeometry(0.10, 8, 8);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
        const flameMesh = new THREE.Mesh(flameGeo, flameMat);
        flameMesh.position.y = 0.20;
        group.add(flameMesh);

        this.scene.add(group);

        this.projectiles.push({
            mesh: group,
            geometries: [bottleGeo, flameGeo],
            materials: [bottleMat, flameMat],
            startPos: startPos.clone(),
            endPos: endPos.clone(),
            isArc: true,
            arcHeight: 2.8,
            duration: 0.38,
            elapsed: 0,
            onTick: (dt, t) => {
                group.rotation.x += dt * 14.0;
                group.rotation.z += dt * 11.0;
                this.emitParticle(
                    group.position.x, group.position.y, group.position.z,
                    (Math.random() - 0.5) * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 0.8,
                    Math.random() < 0.5 ? 0xff3d00 : 0xffea00,
                    0.28, 0.35, -1.0
                );
            },
            onImpact: () => {
                this.spawnHitSparks(endPos, 0xff3d00, 32);
                this.spawnGroundShockwave(endPos, 0xff5722, 4.5);
                if (onImpact) onImpact();
            }
        });
    }

    // ==========================================
    // ❄️ ICE MASTER: MASSIVE FALLING ICICLE DROP (VERY OBVIOUS VFX & SFX)
    // ==========================================
    spawnFallingIcicle(targetPos, onImpact = null) {
        // 1. Glowing Cyan Ground Targeting Rune Decal
        const runeGeo = new THREE.RingGeometry(0.8, 1.45, 32);
        const runeMat = new THREE.MeshBasicMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.90,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const runeMesh = new THREE.Mesh(runeGeo, runeMat);
        runeMesh.rotation.x = -Math.PI / 2;
        runeMesh.position.set(targetPos.x, targetPos.y + 0.08, targetPos.z);
        this.scene.add(runeMesh);

        this.transientMeshes.push({
            mesh: runeMesh,
            materials: [runeMat],
            life: 0.40,
            maxLife: 0.40,
            scaleSpeed: 1.2
        });

        // 2. Colossal Crystallized Ice Spear Group
        const group = new THREE.Group();
        const startY = targetPos.y + 17.0;
        group.position.set(targetPos.x, startY, targetPos.z);

        const spearBodyGeo = new THREE.CylinderGeometry(0.08, 0.65, 3.4, 6);
        spearBodyGeo.rotateX(Math.PI); // Point downward!
        const spearTipGeo = new THREE.ConeGeometry(0.65, 1.5, 6);
        spearTipGeo.rotateX(Math.PI); // Point downward!
        spearTipGeo.translate(0, -2.45, 0);

        const iceMat = new THREE.MeshStandardMaterial({
            color: 0xe0f7fa,
            emissive: 0x00e5ff,
            emissiveIntensity: 1.6,
            roughness: 0.08,
            metalness: 0.85,
            transparent: true,
            opacity: 0.92
        });

        const bodyMesh = new THREE.Mesh(spearBodyGeo, iceMat);
        const tipMesh = new THREE.Mesh(spearTipGeo, iceMat);
        group.add(bodyMesh, tipMesh);

        // Core White Glint Inner Light
        const glintGeo = new THREE.CylinderGeometry(0.04, 0.25, 4.2, 6);
        glintGeo.rotateX(Math.PI);
        const glintMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(glintGeo, glintMat));

        this.scene.add(group);

        const fallDuration = 0.28;
        let elapsed = 0;
        const tickInterval = setInterval(() => {
            elapsed += 0.016;
            const t = Math.min(1.0, elapsed / fallDuration);
            // Accelerating gravity drop curve
            group.position.y = THREE.MathUtils.lerp(startY, targetPos.y + 0.15, t * t);

            // Trailing ice flakes and frosty snow particles
            for (let k = 0; k < 3; k++) {
                this.emitParticle(
                    group.position.x + (Math.random() - 0.5) * 0.8,
                    group.position.y + Math.random() * 2.5,
                    group.position.z + (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 1.5,
                    2.0 + Math.random() * 2.0,
                    (Math.random() - 0.5) * 1.5,
                    k % 2 === 0 ? 0x00e5ff : 0xffffff,
                    0.35, 0.45, -2.0
                );
            }

            if (t >= 1.0) {
                clearInterval(tickInterval);
                this.scene.remove(group);
                spearBodyGeo.dispose();
                spearTipGeo.dispose();
                glintGeo.dispose();
                iceMat.dispose();
                glintMat.dispose();

                // 💥 IMPACT: Dramatic Screen Shake & Authentic Procedural Ice Shatter Audio
                this.addScreenshake(0.95);
                if (window.game?.audio?.playIceShatter) {
                    window.game.audio.playIceShatter();
                } else if (window.game?.audio?.playSfx) {
                    window.game.audio.playSfx('ice');
                }

                // Dual Expanding Frost Nova Shockwaves
                this.spawnGroundShockwave(targetPos, 0x00e5ff, 6.2);
                this.spawnGroundShockwave(targetPos, 0x80d8ff, 3.8);

                // 45+ Exploding Ice Shards in all directions
                for (let s = 0; s < 45; s++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 4.0 + Math.random() * 8.0;
                    this.emitParticle(
                        targetPos.x, targetPos.y + 0.3, targetPos.z,
                        Math.cos(angle) * spd, 3.0 + Math.random() * 5.0, Math.sin(angle) * spd,
                        s % 3 === 0 ? 0xffffff : (s % 3 === 1 ? 0x00e5ff : 0x80d8ff),
                        0.45, 0.70, -6.0
                    );
                }

                // Ground Ice Spikes Cluster (5 sharp crystalline cones erupting from the ground for 0.75s)
                const spikeCluster = new THREE.Group();
                spikeCluster.position.set(targetPos.x, targetPos.y, targetPos.z);
                const spikeGeo = new THREE.ConeGeometry(0.32, 1.6, 6);
                const spikeMat = new THREE.MeshStandardMaterial({
                    color: 0xe0f7fa,
                    emissive: 0x00e5ff,
                    emissiveIntensity: 1.2,
                    transparent: true,
                    opacity: 0.90,
                    roughness: 0.1
                });
                for (let i = 0; i < 5; i++) {
                    const sm = new THREE.Mesh(spikeGeo, spikeMat);
                    const ang = (i / 5) * Math.PI * 2;
                    const dist = 0.9 + Math.random() * 0.8;
                    sm.position.set(Math.cos(ang) * dist, 0.7, Math.sin(ang) * dist);
                    sm.rotation.x = (Math.random() - 0.5) * 0.45;
                    sm.rotation.z = (Math.random() - 0.5) * 0.45;
                    spikeCluster.add(sm);
                }
                this.scene.add(spikeCluster);
                this.transientMeshes.push({
                    mesh: spikeCluster,
                    materials: [spikeMat],
                    life: 0.75,
                    maxLife: 0.75,
                    scaleSpeed: -0.8
                });

                if (onImpact) onImpact();
            }
        }, 16);
    }

    // ==========================================
    // ✨ HEALER / CELESTIAL: DRAMATIC LIGHT PILLAR
    // ==========================================
    spawnLightPillar(pos, colorHex = 0x00e676, radius = 2.0, height = 15.0, duration = 0.65) {
        const group = new THREE.Group();
        group.position.set(pos.x, pos.y + height / 2, pos.z);

        const pillarGeo = new THREE.CylinderGeometry(radius * 0.8, radius, height, 16, 1, true);
        const pillarMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        group.add(new THREE.Mesh(pillarGeo, pillarMat));

        const coreGeo = new THREE.CylinderGeometry(radius * 0.3, radius * 0.35, height, 16, 1, true);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        group.add(new THREE.Mesh(coreGeo, coreMat));

        this.scene.add(group);
        this.transientMeshes.push({
            mesh: group,
            materials: [pillarMat, coreMat],
            life: duration,
            maxLife: duration,
            scaleSpeed: 1.5,
            rotSpeedY: 3.0
        });

        this.spawnGroundShockwave(pos, colorHex, radius * 2.5);
        for (let i = 0; i < 35; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            this.emitParticle(
                pos.x + Math.cos(a) * r, pos.y + Math.random() * 2.0, pos.z + Math.sin(a) * r,
                Math.cos(a) * 0.8, 4.0 + Math.random() * 3.0, Math.sin(a) * 0.8,
                Math.random() < 0.5 ? 0xffffff : colorHex,
                0.35, 0.70, -1.0
            );
        }
    }

    // ==========================================
    // 🔥 BERSERKER: ROARING INFERNO FIRE PILLAR
    // ==========================================
    spawnFirePillar(pos, duration = 0.85) {
        const group = new THREE.Group();
        group.position.set(pos.x, pos.y + 3.5, pos.z);

        const fireGeo = new THREE.CylinderGeometry(1.6, 2.2, 7.0, 16, 1, true);
        const fireMat = new THREE.MeshBasicMaterial({
            color: 0xff3d00,
            transparent: true,
            opacity: 0.90,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        group.add(new THREE.Mesh(fireGeo, fireMat));

        const coreGeo = new THREE.CylinderGeometry(0.8, 1.2, 7.0, 16, 1, true);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffea00,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        group.add(new THREE.Mesh(coreGeo, coreMat));

        this.scene.add(group);
        this.transientMeshes.push({
            mesh: group,
            materials: [fireMat, coreMat],
            life: duration,
            maxLife: duration,
            scaleSpeed: 1.8,
            rotSpeedY: 6.0
        });

        this.spawnGroundShockwave(pos, 0xff1744, 7.0);
        for (let i = 0; i < 40; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 2.0;
            this.emitParticle(
                pos.x + Math.cos(a) * r, pos.y + Math.random() * 3.0, pos.z + Math.sin(a) * r,
                Math.cos(a) * 1.5, 6.0 + Math.random() * 4.0, Math.sin(a) * 1.5,
                Math.random() < 0.5 ? 0xffea00 : 0xff1744,
                0.40, 0.80, -2.0
            );
        }
    }

    // ==========================================
    // 🎯 SNIPER: PIERCING HIGH-POWER LASER BEAM
    // ==========================================
    spawnSniperBeam(startPos, endPos, colorHex = 0xffffff, width = 0.35, duration = 0.24) {
        const dist = startPos.distanceTo(endPos);
        if (dist < 0.1) return;

        const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        const group = new THREE.Group();
        group.position.copy(mid);
        group.lookAt(endPos);

        const coreGeo = new THREE.CylinderGeometry(width * 0.4, width * 0.4, dist, 8);
        coreGeo.rotateX(Math.PI / 2);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.98,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(coreGeo, coreMat));

        const glowGeo = new THREE.CylinderGeometry(width * 1.6, width * 1.6, dist, 10);
        glowGeo.rotateX(Math.PI / 2);
        const glowMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.80,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        this.scene.add(group);
        this.transientMeshes.push({
            mesh: group,
            materials: [coreMat, glowMat],
            life: duration,
            maxLife: duration,
            scaleSpeed: 0
        });

        this.spawnHitSparks(endPos, colorHex, 28);
    }

    // ==========================================
    // 🌫️ NINJA ASSASSIN: 3D VOLUMETRIC SMOKE CLOUD
    // ==========================================
    spawnSmokeCloud(pos, durationSec = 10.0) {
        const group = new THREE.Group();
        group.position.set(pos.x, 0.15, pos.z);

        for (let i = 0; i < 4; i++) {
            const r = 2.4 + i * 0.7;
            const geo = new THREE.CircleGeometry(r, 20);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x424242,
                transparent: true,
                opacity: 0.35 - i * 0.06,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y = i * 0.08;
            group.add(mesh);
        }
        this.scene.add(group);

        const startTs = performance.now();
        const intervalId = setInterval(() => {
            const age = (performance.now() - startTs) / 1000;
            if (age >= durationSec) {
                clearInterval(intervalId);
                this.scene.remove(group);
            } else {
                group.rotation.y += 0.015;
                const scale = 1.0 + Math.sin(age * 2) * 0.12;
                group.scale.set(scale, 1, scale);
            }
        }, 32);
    }

    updateParticles(dt) {
        let activeCount = 0;
        for (let i = 0; i < MAX_PARTICLES; i++) {
            if (this.pLife[i] > 0) {
                this.pLife[i] -= dt;
                const i3 = i * 3;
                if (this.pLife[i] <= 0) {
                    this.pSizes[i] = 0;
                    this.pPositions[i3 + 1] = -9999;
                } else {
                    activeCount++;
                    this.pVelocities[i3 + 1] -= this.pGravity[i] * dt;
                    this.pPositions[i3] += this.pVelocities[i3] * dt;
                    this.pPositions[i3 + 1] += this.pVelocities[i3 + 1] * dt;
                    this.pPositions[i3 + 2] += this.pVelocities[i3 + 2] * dt;

                    if (this.pPositions[i3 + 1] < 0.05 && this.pGravity[i] > 0) {
                        this.pPositions[i3 + 1] = 0.05;
                        this.pVelocities[i3 + 1] *= -0.42;
                        this.pVelocities[i3] *= 0.75;
                        this.pVelocities[i3 + 2] *= 0.75;
                    }
                }
            }
        }
        if (activeCount > 0) {
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.color.needsUpdate = true;
            this.particleSystem.geometry.attributes.size.needsUpdate = true;
        }

        for (let i = this.transientMeshes.length - 1; i >= 0; i--) {
            const fx = this.transientMeshes[i];
            fx.life -= dt;
            if (fx.life <= 0) {
                this.scene.remove(fx.mesh);
                this.transientMeshes.splice(i, 1);
            } else {
                const ratio = fx.life / fx.maxLife;
                if (fx.scaleSpeed) {
                    const s = 1 + fx.scaleSpeed * dt;
                    fx.mesh.scale.x *= s;
                    fx.mesh.scale.y *= s;
                }
                if (fx.rotSpeedY) {
                    fx.mesh.rotation.y += fx.rotSpeedY * dt;
                }
                if (fx.materials) {
                    for (const m of fx.materials) m.opacity = ratio;
                }
            }
        }

        // Update Projectiles (Smooth 60 FPS interpolation, trails, and impact callbacks)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.elapsed += dt;
            const t = Math.min(1.0, p.elapsed / p.duration);

            if (p.isArc) {
                p.mesh.position.lerpVectors(p.startPos, p.endPos, t);
                p.mesh.position.y += Math.sin(t * Math.PI) * (p.arcHeight || 2.5);
            } else {
                p.mesh.position.lerpVectors(p.startPos, p.endPos, t);
            }

            if (p.onTick) p.onTick(dt, t);

            if (t >= 1.0) {
                this.scene.remove(p.mesh);
                if (p.geometries) p.geometries.forEach(g => g?.dispose?.());
                if (p.materials) p.materials.forEach(m => m?.dispose?.());
                this.projectiles.splice(i, 1);
                if (p.onImpact) p.onImpact();
            }
        }
    }

    updateCamera(targetPos, dt) {
        if (!targetPos) return;

        const desiredTarget = new THREE.Vector3(targetPos.x, targetPos.y + 1.45, targetPos.z);
        this.cameraTarget.lerp(desiredTarget, Math.min(1, dt * 14));

        const hDist = this.cameraDistance * Math.cos(this.cameraPitch);
        const vDist = this.cameraDistance * Math.sin(this.cameraPitch);

        const desiredCamPos = new THREE.Vector3(
            this.cameraTarget.x + Math.sin(this.cameraYaw) * hDist,
            Math.max(0.8, this.cameraTarget.y + vDist),
            this.cameraTarget.z + Math.cos(this.cameraYaw) * hDist
        );

        this.smoothCamPos.lerp(desiredCamPos, Math.min(1, dt * 16));
        this.camera.position.copy(this.smoothCamPos);

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const s = this.shakeIntensity * (this.shakeTimer / 0.22);
            this.camera.position.x += (Math.random() - 0.5) * s;
            this.camera.position.y += (Math.random() - 0.5) * s;
        }

        this.camera.lookAt(this.cameraTarget);

        // Keep directional light shadow frustum centered on player
        this.dirLight.position.set(targetPos.x + 28, targetPos.y + 48, targetPos.z + 24);
        this.dirLight.target.position.copy(targetPos);
        this.dirLight.target.updateMatrixWorld();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

window.Engine3D = Engine3D;
