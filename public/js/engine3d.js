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
