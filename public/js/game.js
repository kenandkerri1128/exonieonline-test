import * as THREE from 'three';
import { Engine3D } from './engine3d.js';
import { Character3D } from './character3d.js';
import { World3D } from './world3d.js';
import { Monster3D } from './monsters3d.js';
import { CombatSystem } from './combat.js';
import { UIManager } from './ui.js';
import { CLASSES, MONSTER_DATABASE, STARTER_ITEMS, DEFAULT_BASE_STATS, MAX_LEVEL, getExpForNextLevel, generateLoot, getItemSellPrice } from './game_data.js';
import { MAPS_DATA } from './maps_data.js';

// ==========================================
// AUDIO MANAGER (EXONIE SOUND EFFECTS & BGM)
// ==========================================
class AudioManager {
    constructor() {
        this.currentBgm = null;
        this.currentTrackName = null;
        this.pendingTrack = 'loginmenu';
        this.audioEnabled = false;
        this.masterVolume = 0.70;

        const enableAudio = () => {
            this.audioEnabled = true;
            if (this.pendingTrack && !this.currentBgm) {
                this.playBgm(this.pendingTrack);
            }
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('keydown', enableAudio);
            window.removeEventListener('touchstart', enableAudio);
        };
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);
        window.addEventListener('touchstart', enableAudio);
    }

    setMasterVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
        if (this.currentBgm) {
            this.currentBgm.volume = 0.45 * (this.masterVolume / 0.70);
        }
    }

    playBgm(trackName) {
        this.pendingTrack = trackName;
        if (window.ExonieFlow && window.ExonieFlow.menuBgm && trackName !== 'loginmenu') {
            window.ExonieFlow.stopMenuMusic();
        }
        const url = `music/${trackName}.mp3`;
        if (this.currentBgm && this.currentTrackName === trackName && !this.currentBgm.paused) return;

        if (this.currentBgm) {
            this.currentBgm.pause();
        }

        this.currentTrackName = trackName;
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = Math.min(1, 0.45 * (this.masterVolume / 0.70));
        audio.play().then(() => {
            this.audioEnabled = true;
        }).catch(() => {});
        this.currentBgm = audio;
    }

    playSfx(sfxName) {
        if (!this.audioEnabled) return;
        const url = `music/${sfxName}.mp3`;
        const audio = new Audio(url);
        audio.volume = Math.min(1, 0.65 * (this.masterVolume / 0.70));
        audio.play().catch(() => {});
    }

    // Play Authentic 2D Exonie Class Voice shout on skill activation
    playClassVoice(hairStyle, className) {
        if (!this.audioEnabled) return;
        const hairPrefix = (!hairStyle || hairStyle === 'none') ? 'none' : `hair${hairStyle}`;
        const formattedClass = String(className).replace(/\s+/g, '').toLowerCase();
        const url = `skills/${hairPrefix}_${formattedClass}.mp3`;
        const audio = new Audio(url);
        audio.volume = Math.min(1, 0.65 * (this.masterVolume / 0.70));
        audio.play().catch(() => {});
    }

    // Play weapon-specific attack sound (charge.mp3 is strictly reserved for Minotaur dash!)
    playWeaponSfx(weaponSprite) {
        if (!this.audioEnabled) return;
        const s = String(weaponSprite || '').toLowerCase();
        let sfx = 'bump';
        if (s.includes('staff')) sfx = 'lightning';
        else if (s.includes('gun')) sfx = 'gunshot';
        else if (s.includes('pendant')) sfx = 'splash';
        else if (s.includes('sword') || s.includes('dagger')) sfx = 'slash';
        else if (s.includes('touchpad')) sfx = 'lightning';
        this.playSfx(sfx);
    }
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// MAIN GAME CONTROLLER (EXONIE 3D REMASTERED)
// ==========================================
export class GameApp {
    constructor() {
        // Connect global launch hook from flow.js immediately
        window.launchExonieGame = (charData) => {
            this.onFlowComplete(charData);
        };

        // Initialize 3D Preview helper for Character Creation pedestal immediately
        this.setupCustomizer3DPreview();

        this.audio = new AudioManager();
        this.engine = new Engine3D('game-container');
        this.world = new World3D(this.engine.scene);
        this.combat = new CombatSystem(this.engine, this.audio);
        this.ui = new UIManager(this);

        // Connect Dragon Nest engine input callbacks
        this.engine.onAttackCallback = () => this.onAttackTrigger();
        this.engine.onDodgeCallback = () => this.onDodgeTrigger();

        this.monsters = [];
        this.currentFloor = 1;
        this.currentMapId = 'town';
        this.floorBoss = null;
        this.isGhost = false;
        this.portalCooldown = 0;
        this.potionCooldown = 0;
        this.bossCooldowns = {};
        this.playerShieldMesh = null;

        // Jump & Vertical Physics
        this.gravity = 26.0;
        this.jumpForce = 9.5;

        // Player State strictly conforming to 2D Exonie rules
        this.player = {
            name: 'Hero',
            gender: 'female',
            hairStyle: '1',
            hairColor: '#111111',
            skinColor: '#f5c6a5',
            level: 1,
            exp: 0,
            maxExp: 100,
            gold: 500,
            baseStats: JSON.parse(JSON.stringify(DEFAULT_BASE_STATS)),
            equips: JSON.parse(JSON.stringify(STARTER_ITEMS.equips)),
            inventory: (() => {
                const bag = Array(30).fill(null);
                (STARTER_ITEMS.inventory || []).forEach((item, idx) => {
                    if (idx < 30) bag[idx] = JSON.parse(JSON.stringify(item));
                });
                return bag;
            })(),
            storage: Array(15).fill(null),
            dailyMission: null,
            tavernEntries: 5,
            dungeonEntries: 7,
            hp: 105,
            maxHp: 105,
            mp: 100,
            maxMp: 100,
            atk: 10,
            mag: 10,
            def: 4,
            totalStr: 10,
            totalInt: 10,
            speed: 6.8,
            pos: new THREE.Vector3(0, 0, 0),
            rotY: 0,
            moveDir: new THREE.Vector3()
        };

        // Recalculate full player combat stats
        this.recalculateStats();

        // Key Input & Customizable Keybinds Tracking
        this.keys = {};
        this.loadKeybinds();
        this.setupKeyboardInput();

        // Socket.IO Setup (Multiplayer sync with offline simulation fallback)
        this.initSocket();

        // Authentic 2D Persistent Chat System (Local & World Tabs + Speech Bubbles)
        this.setupChatSystem();

        // Start Animation Loop
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    setupCustomizer3DPreview() {
        let previewScene, previewCamera, previewRenderer, previewChar;

        window.initCustomizer3D = (charData) => {
            const previewCol = document.querySelector('.customizer-preview-col');
            if (!previewCol) return;

            const existingCanvas = document.getElementById('char-preview-canvas') || previewCol.querySelector('canvas');

            const w = Math.max(300, previewCol.clientWidth || 360);
            const h = Math.max(360, previewCol.clientHeight || 480);

            if (previewRenderer && previewChar) {
                if (charData) {
                    previewChar.setCustomization({
                        gender: charData.gender || 'female',
                        hairStyle: charData.hairStyle || '1',
                        hairColor: charData.hairColor || '#111111',
                        skinColor: charData.skinColor || '#f5c6a5',
                        weaponType: null
                    });
                }
                const actualW = previewCol.clientWidth || w;
                const actualH = previewCol.clientHeight || h;
                previewCamera.aspect = actualW / actualH;
                previewCamera.updateProjectionMatrix();
                previewRenderer.setSize(actualW, actualH);
                if (previewScene) previewRenderer.render(previewScene, previewCamera);
                return;
            }

            previewScene = new THREE.Scene();
            // Transparent background so glowing pedestal ring and radial backdrop show through
            previewScene.background = null;

            previewCamera = new THREE.PerspectiveCamera(36, w / h, 0.1, 50);
            previewCamera.position.set(0, 0.88, 4.4);
            previewCamera.lookAt(0, 0.65, 0);

            previewRenderer = new THREE.WebGLRenderer({
                canvas: existingCanvas,
                antialias: true,
                alpha: true
            });
            previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            previewRenderer.setSize(w, h, false);
            previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
            previewRenderer.toneMappingExposure = 1.35;
            if (THREE.SRGBColorSpace) previewRenderer.outputColorSpace = THREE.SRGBColorSpace;

            // Pedestal platform disk under the avatar (scaled neatly to match avatar)
            const pedestalGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.07, 32);
            const pedestalMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                metalness: 0.85,
                roughness: 0.25
            });
            const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
            pedestalMesh.position.set(0, -0.04, 0);
            previewScene.add(pedestalMesh);

            const rimGeo = new THREE.TorusGeometry(0.70, 0.018, 12, 48);
            rimGeo.rotateX(Math.PI / 2);
            const rimMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
            const rimMesh = new THREE.Mesh(rimGeo, rimMat);
            rimMesh.position.set(0, 0.005, 0);
            previewScene.add(rimMesh);

            const ambLight = new THREE.AmbientLight(0xffffff, 2.0);
            previewScene.add(ambLight);

            const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
            keyLight.position.set(2, 4, 3);
            previewScene.add(keyLight);

            const fillLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
            fillLight.position.set(-2, 2, -2);
            previewScene.add(fillLight);

            const backLight = new THREE.DirectionalLight(0xfffaed, 0.9);
            backLight.position.set(0, 3, -3);
            previewScene.add(backLight);

            previewChar = new Character3D({
                name: (charData && charData.name) || 'Hero',
                gender: (charData && charData.gender) || 'female',
                hairStyle: (charData && charData.hairStyle) || '1',
                hairColor: (charData && charData.hairColor) || '#111111',
                skinColor: (charData && charData.skinColor) || '#f5c6a5',
                weaponType: null
            });
            previewChar.group.rotation.y = 0;
            // Neatly proportioned scale to comfortably fit with ample headroom
            previewChar.group.scale.set(0.66, 0.66, 0.66);
            if (previewChar.overheadGroup) {
                previewChar.overheadGroup.visible = false;
            }
            previewScene.add(previewChar.group);

            // Allow manual drag rotation on the preview canvas (mouse & touch)
            let isDraggingPreview = false;
            let lastPreviewX = 0;
            const startDrag = (clientX) => {
                isDraggingPreview = true;
                lastPreviewX = clientX;
            };
            const moveDrag = (clientX) => {
                if (isDraggingPreview && previewChar) {
                    const dx = clientX - lastPreviewX;
                    lastPreviewX = clientX;
                    previewChar.group.rotation.y += dx * 0.014;
                }
            };
            const endDrag = () => { isDraggingPreview = false; };

            const targetCanvas = previewRenderer.domElement;
            targetCanvas.addEventListener('mousedown', (e) => startDrag(e.clientX));
            window.addEventListener('mouseup', endDrag);
            window.addEventListener('mousemove', (e) => moveDrag(e.clientX));

            targetCanvas.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) startDrag(e.touches[0].clientX);
            }, { passive: true });
            window.addEventListener('touchend', endDrag);
            window.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches[0]) moveDrag(e.touches[0].clientX);
            }, { passive: true });

            // Initial synchronous render
            try {
                previewRenderer.render(previewScene, previewCamera);
            } catch(e) {}

            const animPreview = () => {
                requestAnimationFrame(animPreview);
                if (previewCol && previewRenderer && previewCamera) {
                    const curW = previewCol.clientWidth;
                    const curH = previewCol.clientHeight;
                    if (curW > 50 && curH > 50) {
                        const canvas = previewRenderer.domElement;
                        const pr = previewRenderer.getPixelRatio() || 1;
                        if (canvas.width !== Math.round(curW * pr) || canvas.height !== Math.round(curH * pr)) {
                            previewCamera.aspect = curW / curH;
                            previewCamera.updateProjectionMatrix();
                            previewRenderer.setSize(curW, curH, false);
                        }
                    }
                }
                if (previewChar) {
                    try {
                        previewChar.update(0.016, false);
                    } catch(e) {}
                }
                if (previewRenderer && previewScene && previewCamera) {
                    try {
                        previewRenderer.render(previewScene, previewCamera);
                    } catch (e) {
                        console.error('Preview render error:', e);
                    }
                }
            };
            animPreview();
        };

        window.rotateCustomizerPreview = (delta, reset = false) => {
            if (!previewChar) return;
            if (reset) {
                previewChar.group.rotation.y = 0;
            } else {
                previewChar.group.rotation.y += delta;
            }
        };

        window.updateCustomizerPreview = (charData) => {
            if (!previewChar) {
                if (window.initCustomizer3D) window.initCustomizer3D(charData);
                return;
            }
            const previewCol = document.querySelector('.customizer-preview-col');
            if (previewRenderer && previewCamera && previewCol && previewCol.clientWidth > 50 && previewCol.clientHeight > 50) {
                const curW = previewCol.clientWidth;
                const curH = previewCol.clientHeight;
                previewCamera.aspect = curW / curH;
                previewCamera.updateProjectionMatrix();
                previewRenderer.setSize(curW, curH);
            }
            if (charData) {
                previewChar.setCustomization({
                    gender: charData.gender || 'female',
                    hairStyle: charData.hairStyle || '1',
                    hairColor: charData.hairColor || '#111111',
                    skinColor: charData.skinColor || '#f5c6a5',
                    weaponType: null
                });
            }
            if (previewRenderer && previewScene && previewCamera) {
                try {
                    previewRenderer.render(previewScene, previewCamera);
                } catch (e) {}
            }
        };
    }

    initSocket() {
        try {
            if (typeof io !== 'undefined') {
                // Reuse socket already created by flow.js or create unified connection
                this.socket = (window.ExonieFlow && window.ExonieFlow.getSocket()) || window.exonieSocket;
                if (!this.socket) {
                    const serverUrl = (window.ExonieFlow && window.ExonieFlow.getActiveServerUrl)
                        ? window.ExonieFlow.getActiveServerUrl()
                        : 'http://localhost:3003';
                    this.socket = io(serverUrl, {
                        transports: ['websocket', 'polling'],
                        reconnection: true,
                        timeout: 10000
                    });
                }
                window.socket = this.socket;
                window.exonieSocket = this.socket;

                this.socket.on('connect', () => {
                    const activeUrl = (window.ExonieFlow && window.ExonieFlow.getActiveServerUrl)
                        ? window.ExonieFlow.getActiveServerUrl()
                        : 'active server';
                    console.log(`[Socket] Connected to Exonie server (Socket ID: ${this.socket.id})`);
                    this.appendChatLine('system', `📡 Connected to Exonie Server (${activeUrl.replace(/https?:\/\//, '')})`);
                    if (this.player && this.player.name) {
                        this.sendEnterWorld();
                    }
                });

                this.socket.on('disconnect', (reason) => {
                    console.warn(`[Socket] Disconnected from server: ${reason}`);
                    this.appendChatLine('system', `⚠️ Connection lost. Attempting to reconnect...`);
                });

                this.remotePlayers = {};

                // Multiplayer Realtime Sync Listeners
                this.socket.on('gameState', (data) => {
                    console.log('📡 [Multiplayer] Received gameState:', data);
                    if (data && data.players) {
                        for (const [sid, pData] of Object.entries(data.players)) {
                            if (pData.name !== this.player.name && sid !== this.socket.id) {
                                this.addRemotePlayer(sid, pData);
                            }
                        }
                    }
                });

                this.socket.on('playerJoined', (pData) => {
                    if (!pData || pData.name === this.player.name || pData.socketId === this.socket.id) return;
                    console.log(`👋 [Multiplayer] Remote player joined: ${pData.name}`);
                    this.addRemotePlayer(pData.socketId || pData.id, pData);
                    this.appendChatLine('system', `👋 Player ${pData.name} joined the realm.`);
                });

                this.socket.on('playerMoved', (pData) => {
                    if (!pData || pData.name === this.player.name) return;
                    const sid = pData.socketId || pData.id;
                    const rp = this.remotePlayers[sid];
                    if (rp) {
                        rp.targetPos.set(pData.x || 0, pData.y || 0, pData.z || 0);
                        rp.targetRotY = pData.rotY || 0;
                        rp.anim = pData.anim || 'idle';
                        if (pData.hp !== undefined) rp.hp = pData.hp;
                        if (pData.maxHp !== undefined) rp.maxHp = pData.maxHp;
                    } else {
                        this.addRemotePlayer(sid, pData);
                    }
                });

                this.socket.on('playerLeft', (sid) => {
                    console.log(`[Multiplayer] Player left: ${sid}`);
                    this.removeRemotePlayer(sid);
                });

                // 2D Exonie Chat Message Listeners (server.js lines 4795-4799)
                this.socket.on('chatMessage', (data) => {
                    if (data && data.text) {
                        const name = data.id || 'Player';
                        if (name !== this.player.name) {
                            this.appendChatLine('local', `<b>${name}:</b> ${escapeHtml(data.text)}`);
                            this.showSpeechBubble(name, data.text);
                        }
                    }
                });

                this.socket.on('worldChatMessage', (data) => {
                    if (data && data.text) {
                        const name = data.id || 'Player';
                        // Do not duplicate self-sent messages
                        if (name !== this.player.name) {
                            this.appendChatLine('world', `<b>[W] ${name}:</b> ${escapeHtml(data.text)}`);
                            if (this.activeChatTab !== 'world') {
                                const dot = document.getElementById('world-unread-dot');
                                if (dot) dot.style.display = 'inline-block';
                            }
                        }
                    }
                });

                this.socket.on('worldAnnouncement', (data) => {
                    if (data && data.html) {
                        this.ui.showWorldAnnouncement(data.html, data.color || '#ffd700', false);
                    }
                });

                this.socket.on('bossCooldownSync', (cooldowns) => {
                    if (cooldowns && typeof cooldowns === 'object') {
                        this.bossCooldowns = Object.assign({}, this.bossCooldowns, cooldowns);
                    }
                });

                this.socket.on('bossCooldownActive', (data) => {
                    if (data && data.floorId) {
                        this.bossCooldowns[data.floorId] = Date.now() + (data.remaining || (24 * 60 * 60 * 1000));
                    }
                });

                this.socket.on('applyGammaShield', (data) => {
                    if (data && data.targetId === this.player.name) {
                        this.player.shieldHp = data.hp || 20;
                        this.createPlayerShieldVFX();
                    }
                });

                this.socket.on('breakGammaShield', (data) => {
                    if (data && data.targetId === this.player.name) {
                        this.destroyPlayerShieldVFX();
                    }
                });

                this.socket.on('syncInventory', (newInv) => {
                    if (Array.isArray(newInv)) {
                        while (newInv.length < 30) newInv.push(null);
                        this.player.inventory = newInv;
                        if (this.ui) this.ui.renderInventory();
                    }
                });
            }
        } catch (e) {
            console.log('Running in standalone local simulation mode', e);
        }
    }

    addRemotePlayer(id, data) {
        if (this.remotePlayers[id]) return;
        const char3D = new Character3D({
            name: data.name || 'Exonian',
            gender: data.gender || 'female',
            hairStyle: String(data.hairStyle || '1'),
            hairColor: data.hairColor || '#111111',
            skinColor: data.skinColor || '#f5c6a5',
            className: data.className || data.playerClass || 'Novice',
            weaponType: (data.equips && data.equips.weapon) ? (data.equips.weapon.weaponType || data.equips.weapon.sprite) : null
        });
        char3D.group.position.set(data.x || 0, data.y || 0, data.z || 0);
        char3D.group.rotation.y = data.rotY || 0;
        this.engine.scene.add(char3D.group);

        this.remotePlayers[id] = {
            id: id,
            name: data.name || 'Exonian',
            level: data.level || 1,
            hp: data.hp || 500,
            maxHp: data.maxHp || 500,
            char3D: char3D,
            currentPos: new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
            targetPos: new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0),
            targetRotY: data.rotY || 0
        };
        char3D.updateOverheadUI(data.name || 'Exonian', data.level || 1, data.hp || 500, data.maxHp || 500, false);
    }

    removeRemotePlayer(id) {
        const rp = this.remotePlayers[id];
        if (rp) {
            if (rp.char3D && rp.char3D.group) {
                this.engine.scene.remove(rp.char3D.group);
            }
            delete this.remotePlayers[id];
        }
    }

    updateRemotePlayers(delta) {
        if (!this.remotePlayers) return;
        for (const [id, rp] of Object.entries(this.remotePlayers)) {
            const dist = rp.currentPos.distanceTo(rp.targetPos);
            const isMoving = dist > 0.08;
            rp.currentPos.lerp(rp.targetPos, Math.min(1, delta * 10));
            rp.char3D.group.position.copy(rp.currentPos);
            rp.char3D.group.rotation.y = rp.targetRotY;
            rp.char3D.update(delta, isMoving, 1.0);
            rp.char3D.updateOverheadUI(rp.name, rp.level, rp.hp, rp.maxHp, false);
        }
    }

    sendEnterWorld() {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('enterWorld', {
            email: this.player.email || window.ExonieFlow?.accountEmail || '',
            slotIndex: this.player.slotIndex || 0,
            character_name: this.player.name,
            name: this.player.name,
            gender: this.player.gender || 'female',
            hairStyle: this.player.hairStyle || '1',
            hairColor: this.player.hairColor || '#111111',
            skinColor: this.player.skinColor || '#f5c6a5',
            level: this.player.level || 1,
            playerClass: this.player.baseStats?.playerClass || 'Novice',
            hp: this.player.hp || 100,
            maxHp: this.player.maxHp || 100,
            x: this.player.pos ? this.player.pos.x : 0,
            y: this.player.pos ? this.player.pos.y : 0,
            z: this.player.pos ? this.player.pos.z : 0,
            rotY: this.player.rotY || 0
        });
    }

    setupChatSystem() {
        this.activeChatTab = 'local';
        this.isChatting = false;
        this.lastChatTime = 0;
        const chatInput = document.getElementById('chat-input');

        window.switchChatTab = (tab) => {
            this.activeChatTab = tab;
            document.querySelectorAll('.chat-tab').forEach(b => b.classList.remove('active'));
            const tabBtn = document.getElementById(`chat-tab-${tab}`);
            if (tabBtn) tabBtn.classList.add('active');

            const localContent = document.getElementById('chat-tab-content-local');
            const worldContent = document.getElementById('chat-tab-content-world');
            if (tab === 'local') {
                if (localContent) localContent.style.display = 'flex';
                if (worldContent) worldContent.style.display = 'none';
            } else {
                if (localContent) localContent.style.display = 'none';
                if (worldContent) worldContent.style.display = 'flex';
                const unreadDot = document.getElementById('world-unread-dot');
                if (unreadDot) unreadDot.style.display = 'none';
            }
        };

        window.submitChat = () => this.submitChat();

        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.code === 'Enter') {
                    e.preventDefault();
                    this.submitChat();
                } else if (e.code === 'Escape') {
                    e.preventDefault();
                    chatInput.value = '';
                    chatInput.blur();
                    this.isChatting = false;
                }
            });
            chatInput.addEventListener('focus', () => {
                this.isChatting = true;
            });
            chatInput.addEventListener('blur', () => {
                this.isChatting = false;
            });
        }
    }

    submitChat() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (text.length > 0) {
            this.sendChatMessage(text);
        }
        chatInput.value = '';
        chatInput.blur();
        this.isChatting = false;
    }

    openChatInput() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.focus();
            this.isChatting = true;
        }
    }

    sendChatMessage(text) {
        if (!text) return;
        const now = performance.now();
        if (this.lastChatTime && (now - this.lastChatTime) < 2500) {
            this.appendChatLine('system', '⚠️ Please wait before sending another chat message (2.5s anti-spam limit).');
            return;
        }
        this.lastChatTime = now;

        const playerName = this.player.name || 'Hero';

        if (this.activeChatTab === 'world') {
            const formatted = `<b>[W] ${playerName}:</b> ${escapeHtml(text)}`;
            this.appendChatLine('world', formatted);
            if (this.socket) {
                this.socket.emit('worldChatMessage', { id: playerName, text });
            }
        } else {
            const formatted = `<b>${playerName}:</b> ${escapeHtml(text)}`;
            this.appendChatLine('local', formatted);
            this.showSpeechBubble(playerName, text);
            if (this.socket) {
                this.socket.emit('chatMessage', { id: playerName, text });
            }
        }
    }

    appendChatLine(channel, htmlContent) {
        const container = channel === 'world'
            ? document.getElementById('world-chat-content')
            : document.getElementById('persistent-chat-content');
        if (!container) return;

        const line = document.createElement('div');
        line.className = `chat-line ${channel}-line`;
        line.innerHTML = htmlContent;
        container.appendChild(line);

        const parent = container.parentElement;
        if (parent) {
            parent.scrollTop = parent.scrollHeight;
        }
    }

    showSpeechBubble(speakerName, text) {
        const bubble = document.createElement('div');
        bubble.className = 'overhead-chat-bubble';
        bubble.innerText = text;

        const updateBubblePos = () => {
            if (!this.player || !this.player.pos || !this.engine || !this.engine.camera) return;
            const p = this.player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
            p.project(this.engine.camera);
            const x = (p.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(p.y * 0.5) + 0.5) * window.innerHeight;
            bubble.style.left = `${x}px`;
            bubble.style.top = `${y}px`;
        };

        updateBubblePos();
        document.body.appendChild(bubble);

        const interval = setInterval(updateBubblePos, 16);
        setTimeout(() => {
            clearInterval(interval);
            if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }, 4000);
    }

    onFlowComplete(charData) {
        try {
            // Dismiss any pre-game screen overlays so 3D world is immediately visible
            ['scr-splash', 'auth-screen', 'char-select-screen', 'creation-screen', 'prologue-screen'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('hidden');
                    el.style.display = 'none';
                }
            });

            // Ensure loading screen is dismissed when map is ready
            setTimeout(() => {
                const ls = document.getElementById('loading-screen');
                if (ls) {
                    ls.classList.remove('active');
                    ls.style.display = 'none';
                }
            }, 800);

        // Remove previous 3D character mesh if switching characters
        if (this.player.char3D && this.player.char3D.group) {
            this.engine.scene.remove(this.player.char3D.group);
        }

        const isExisting = charData && charData.isNewCharacter === false;
        this.player.name = charData.name || 'Hero';
        this.player.gender = charData.gender === 'male' ? 'male' : 'female';
        let rawStyle = String(charData.hairStyle !== undefined ? charData.hairStyle : '1').trim();
        if (!['1', '2', '3', '4', '5'].includes(rawStyle)) rawStyle = '1';
        this.player.hairStyle = rawStyle;
        this.player.hairColor = charData.hairColor || '#111111';
        this.player.skinColor = charData.skinColor || '#f5c6a5';
        this.player.slotIndex = charData.slotIndex !== undefined ? Number(charData.slotIndex) || 0 : (window.ExonieFlow?.activeSlotIndex || 0);
        this.player.email = charData.email || window.ExonieFlow?.accountEmail || '';

        if (isExisting) {
            let baseStats = charData.baseStats || charData.base_stats;
            if (typeof baseStats === 'string') {
                try { baseStats = JSON.parse(baseStats); } catch(e) { baseStats = null; }
            }
            if (!baseStats || typeof baseStats !== 'object') {
                baseStats = JSON.parse(JSON.stringify(DEFAULT_BASE_STATS));
            }
            this.player.baseStats = baseStats;

            let equips = charData.equips;
            if (typeof equips === 'string') {
                try { equips = JSON.parse(equips); } catch(e) { equips = null; }
            }
            if (!equips || typeof equips !== 'object' || Array.isArray(equips)) {
                equips = JSON.parse(JSON.stringify(STARTER_ITEMS.equips));
            }
            this.player.equips = equips;

            let inventory = charData.inventory;
            if (typeof inventory === 'string') {
                try { inventory = JSON.parse(inventory); } catch(e) { inventory = null; }
            }
            if (!Array.isArray(inventory)) {
                inventory = JSON.parse(JSON.stringify(STARTER_ITEMS.inventory));
            }
            while (inventory.length < 30) inventory.push(null);
            this.player.inventory = inventory;

            this.player.level = Number(charData.level) || Number(baseStats.level) || 1;
            this.player.exp = Number(charData.exp) || 0;
            this.player.maxExp = Number(charData.maxExp) || getExpForNextLevel(this.player.level) || 100;
            this.player.gold = Number(charData.gold !== undefined ? charData.gold : (baseStats.gold !== undefined ? baseStats.gold : 500)) || 0;

            this.player.storage = Array.isArray(charData.storage) && charData.storage.length === 15
                ? JSON.parse(JSON.stringify(charData.storage))
                : Array(15).fill(null);
            this.player.dailyMission = charData.dailyMission || null;
            this.player.tavernEntries = charData.tavernEntries !== undefined ? Number(charData.tavernEntries) || 5 : 5;
            this.player.dungeonEntries = charData.dungeonEntries !== undefined ? Number(charData.dungeonEntries) || 7 : 7;
        } else {
            this.player.level = 1;
            this.player.exp = 0;
            this.player.maxExp = 100;
            this.player.gold = 500;
            this.player.baseStats = JSON.parse(JSON.stringify(DEFAULT_BASE_STATS));
            this.player.equips = JSON.parse(JSON.stringify(STARTER_ITEMS.equips));
            const starterBag = Array(30).fill(null);
            (STARTER_ITEMS.inventory || []).forEach((item, idx) => {
                if (idx < 30) starterBag[idx] = JSON.parse(JSON.stringify(item));
            });
            this.player.inventory = starterBag;
            this.player.storage = Array(15).fill(null);
            this.player.dailyMission = null;
            this.player.tavernEntries = 5;
            this.player.dungeonEntries = 7;
        }

        if (!this.player.pos || Number.isNaN(this.player.pos.x) || Number.isNaN(this.player.pos.z)) {
            this.player.pos = new THREE.Vector3(0, 0, 0);
        }
        this.player.speed = 6.8;

        this.recalculateStats();
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;

        // Show HUD (and Mobile Controls ONLY on touch devices)
        const hud = document.getElementById('game-hud');
        if (hud) hud.style.display = 'flex';
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const mobileCtrl = document.getElementById('mobile-controls');
        if (mobileCtrl) mobileCtrl.style.display = isTouch ? 'block' : 'none';

        // Blur any active input and clear keystrokes so movement is immediate
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        this.keys = {};
        this.isChatting = false;

        // Reveal persistent chat box ONLY inside the active game world
        const chatBox = document.getElementById('persistent-chat-box');
        if (chatBox) chatBox.classList.add('in-game');

        const equippedWpnType = this.getEquippedWeaponType();
        const equippedRarity = this.player.equips?.weapon?.rarity || 'Starter';
        const equippedArmorRarity = this.player.equips?.armor?.rarity || 'Starter';
        const equippedLeggingsRarity = this.player.equips?.leggings?.rarity || 'Starter';

        // Build 3D Player Character Model (Appearance changes by equipment rarity!)
        this.player.char3D = new Character3D({
            name: this.player.name,
            gender: this.player.gender,
            hairStyle: this.player.hairStyle,
            hairColor: this.player.hairColor,
            skinColor: this.player.skinColor,
            className: this.player.baseStats.playerClass || 'No Class',
            weaponType: equippedWpnType,
            weaponRarity: equippedRarity,
            armorRarity: equippedArmorRarity,
            leggingsRarity: equippedLeggingsRarity
        });

        this.engine.scene.add(this.player.char3D.group);
        this.saveCharacterToAccountSlot();

        // 🌐 Register with Multiplayer World
        if (this.socket && this.socket.connected) {
            this.socket.emit('enterWorld', {
                character_name: this.player.name,
                gender: this.player.gender,
                hairStyle: this.player.hairStyle,
                hairColor: this.player.hairColor,
                skinColor: this.player.skinColor,
                level: this.player.level,
                playerClass: this.player.baseStats?.playerClass || 'Novice',
                hp: this.player.hp,
                maxHp: this.player.maxHp,
                x: this.player.pos.x,
                y: this.player.pos.y,
                z: this.player.pos.z,
                rotY: this.player.rotY
            });
        }

        // Town of Exonie is ready; if a loading transition was already active (from flow.js), let it complete smoothly
        const loadingScreen = document.getElementById('loading-screen');
        const isTransitionActive = loadingScreen && (loadingScreen.classList.contains('active') || loadingScreen.style.display === 'flex');

        this.loadMap('town');
        this.audio.playBgm('town');
        this.ui.updatePlayerHUD(this.player);

        if (!isTransitionActive && window.showLoadingTransition) {
            window.showLoadingTransition('ENTERING EXONIE...', 'Town of Exonie (Safe Haven)', 1250);
        }

        this.ui.showToast(`Welcome to Exonie, ${this.player.name}! Press [P] for Stats or [B] for Bag.`);
        } catch (err) {
            console.error('❌ [CRITICAL] onFlowComplete error:', err);
            const ls = document.getElementById('loading-screen');
            if (ls) {
                ls.classList.remove('active');
                ls.style.display = 'none';
            }
        }
    }

    saveCharacterToAccountSlot() {
        if (!window.ExonieFlow || !window.ExonieFlow.saveActiveCharacterState) return;
        window.ExonieFlow.saveActiveCharacterState({
            name: this.player.name,
            slotIndex: this.player.slotIndex !== undefined ? this.player.slotIndex : (window.ExonieFlow.activeSlotIndex || 0),
            email: this.player.email || window.ExonieFlow.accountEmail || '',
            gender: this.player.gender,
            hairStyle: this.player.hairStyle,
            hairColor: this.player.hairColor,
            skinColor: this.player.skinColor,
            level: this.player.level,
            exp: this.player.exp,
            maxExp: this.player.maxExp,
            gold: this.player.gold,
            playerClass: this.player.baseStats?.playerClass || null,
            baseStats: this.player.baseStats,
            equips: this.player.equips,
            inventory: this.player.inventory,
            storage: this.player.storage || Array(15).fill(null),
            dailyMission: this.player.dailyMission || null,
            tavernEntries: this.player.tavernEntries !== undefined ? this.player.tavernEntries : 5,
            dungeonEntries: this.player.dungeonEntries !== undefined ? this.player.dungeonEntries : 7
        });
    }

    // ==========================================
    // 2D HOME STORAGE VAULT (15 SLOTS)
    // ==========================================
    transferToStorage(bagIdx) {
        if (!Array.isArray(this.player.storage)) {
            this.player.storage = Array(15).fill(null);
        }
        const item = this.player.inventory[bagIdx];
        if (!item) return;

        let emptyVaultIdx = -1;
        for (let i = 0; i < 15; i++) {
            if (!this.player.storage[i]) {
                emptyVaultIdx = i;
                break;
            }
        }
        if (emptyVaultIdx === -1) {
            this.audio.playSfx('bump');
            this.ui.showToast('⚠️ Your 15-Slot Home Storage Vault is full!');
            return;
        }

        this.player.storage[emptyVaultIdx] = item;
        this.player.inventory[bagIdx] = null;
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('splash');
        this.ui.showToast(`📥 Stored ${item.name} in Home Vault (Slot ${emptyVaultIdx + 1})!`);
    }

    transferFromStorage(vaultIdx) {
        if (!Array.isArray(this.player.storage)) return;
        const item = this.player.storage[vaultIdx];
        if (!item) return;

        if (!this.addItemToInventory(item)) {
            this.audio.playSfx('bump');
            this.ui.showToast('⚠️ Your Inventory Bag is full! Clear a slot first.');
            return;
        }

        this.player.storage[vaultIdx] = null;
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('splash');
        this.ui.showToast(`📤 Withdrew ${item.name} from Home Vault to Bag!`);
        this.ui.updatePlayerHUD(this.player);
    }

    // ==========================================
    // 2D QUEST BOARD / DAILY GOLD MISSIONS
    // ==========================================
    acceptDailyMission(difficulty) {
        if (this.player.dailyMission && this.player.dailyMission.active) {
            this.ui.showToast('⚠️ You already have an active Daily Mission!');
            return;
        }
        const configs = {
            easy: {
                id: 'easy',
                name: 'Defeat 15 Monsters in Floor 1–2',
                targetCount: 15,
                progress: 0,
                reward: 25000,
                active: true
            },
            medium: {
                id: 'medium',
                name: 'Defeat 20 Monsters in Floor 3–4',
                targetCount: 20,
                progress: 0,
                reward: 100000,
                active: true
            },
            hard: {
                id: 'hard',
                name: 'Defeat 25 Monsters in Floor 5–6+',
                targetCount: 25,
                progress: 0,
                reward: 250000,
                active: true
            }
        };
        const chosen = configs[difficulty] || configs.easy;
        this.player.dailyMission = chosen;
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('splash');
        this.ui.renderDailyMissions();
        this.ui.showToast(`📜 Accepted Contract: ${chosen.name} (+${chosen.reward.toLocaleString()} G)!`);
    }

    // ==========================================
    // 2D TRAINING TAVERN SOLO SPEEDRUN & RANKINGS
    // ==========================================
    enterTrainingTavern(bossType = 'floor', level = 10) {
        if ((this.player.tavernEntries || 0) <= 0) {
            this.audio.playSfx('bump');
            this.ui.showToast('⚠️ No Training Tavern entries remaining today (0/5)!');
            return;
        }
        this.player.tavernEntries = Math.max(0, (this.player.tavernEntries || 5) - 1);
        this.saveCharacterToAccountSlot();
        this.world.tavernChallengeConfig = { bossType, level };

        const labelMap = { common: 'Common Monster', mini: 'Mini Boss', floor: 'Floor Boss' };
        const subText = `Solo Speedrun vs Lv.${level} ${labelMap[bossType] || 'Boss'}`;

        if (window.showLoadingTransition) {
            window.showLoadingTransition('Training Tavern', subText, 1300, () => {
                this.loadMap('trainingtavern');
                this.tavernTimerActive = true;
                this.tavernStartTime = performance.now();
                this.ui.updateTavernTimer(0, true);
            });
        } else {
            this.loadMap('trainingtavern');
            this.tavernTimerActive = true;
            this.tavernStartTime = performance.now();
            this.ui.updateTavernTimer(0, true);
        }
    }

    getTavernLeaderboard(tab = 'floor') {
        const key = `exonie3d_tavern_lb_${tab}`;
        let list = [];
        try {
            const raw = localStorage.getItem(key);
            if (raw) list = JSON.parse(raw);
        } catch (e) {}

        if (!Array.isArray(list) || list.length === 0) {
            // Seed authentic Exonie champions so the Top 50 Leaderboard is lively immediately
            list = [
                { name: 'Xenie', playerClass: 'Blademaster', level: 50, timeMs: 14280 },
                { name: 'Kaelen', playerClass: 'Berserker', level: 45, timeMs: 16850 },
                { name: 'Lyra', playerClass: 'Ice Master', level: 40, timeMs: 18120 },
                { name: 'Vex', playerClass: 'Ninja Assassin', level: 35, timeMs: 19400 },
                { name: 'Nova', playerClass: 'Tech Genius', level: 30, timeMs: 21500 },
                { name: 'Seraph', playerClass: 'Summoner', level: 25, timeMs: 24100 },
                { name: 'Orion', playerClass: 'Sniper', level: 20, timeMs: 26300 },
                { name: 'Aegis', playerClass: 'Healer', level: 15, timeMs: 29800 }
            ];
        }
        list.sort((a, b) => (b.level - a.level) || (a.timeMs - b.timeMs));
        return list.slice(0, 50);
    }

    recordTavernRun(bossType, level, timeMs) {
        const key = `exonie3d_tavern_lb_${bossType}`;
        const list = this.getTavernLeaderboard(bossType);
        const pName = this.player.name || 'Hero';
        const pClass = this.player.baseStats?.playerClass || 'Blademaster';

        const existingIdx = list.findIndex(r => r.name === pName);
        if (existingIdx >= 0) {
            const prev = list[existingIdx];
            if (level > prev.level || (level === prev.level && timeMs < prev.timeMs)) {
                list[existingIdx] = { name: pName, playerClass: pClass, level, timeMs, isSelf: true };
            }
        } else {
            list.push({ name: pName, playerClass: pClass, level, timeMs, isSelf: true });
        }
        list.sort((a, b) => (b.level - a.level) || (a.timeMs - b.timeMs));
        try {
            localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
        } catch (e) {}
    }

    // ==========================================
    // 2D DUNGEON DIFFICULTY & MAZE GUIDE TELEPORT
    // ==========================================
    enterDungeon(mapId, diffName = 'easy', mult = 1.0) {
        if ((this.player.dungeonEntries || 0) <= 0) {
            this.audio.playSfx('bump');
            this.ui.showToast('⚠️ No Weekly Dungeon entries remaining (0/7)!');
            return;
        }
        this.player.dungeonEntries = Math.max(0, (this.player.dungeonEntries || 7) - 1);
        this.saveCharacterToAccountSlot();
        this.world.dungeonDifficultyMult = mult;

        const title = mapId === 'dungeon1' ? 'Crystal Dungeon 1' : 'Ancient Cave Dungeon 2';
        const sub = `Difficulty: ${diffName.toUpperCase()} (${mult}x Monster Power)`;
        if (window.showLoadingTransition) {
            window.showLoadingTransition(title, sub, 1350, () => {
                this.loadMap(mapId);
            });
        } else {
            this.loadMap(mapId);
        }
    }

    teleportToFloor(floorMapId, floorTitle) {
        if (window.showLoadingTransition) {
            window.showLoadingTransition(floorTitle, 'Maze Guide Fast Travel...', 1300, () => {
                this.loadMap(floorMapId);
            });
        } else {
            this.loadMap(floorMapId);
        }
    }

    // ==========================================
    // STATS CALCULATION (EXACT 2D EXONIE RULES)
    // ==========================================
    recalculateStats() {
        const base = this.player.baseStats || DEFAULT_BASE_STATS;
        const equips = this.player.equips || STARTER_ITEMS.equips;

        let totalHp = Number(base.hp) || 100;
        let totalAtk = Number(base.attack) || 5;
        let totalMag = Number(base.magic) || 5;
        let totalDef = Number(base.defense) || 2;
        let bonusStr = 0;
        let bonusInt = 0;

        // Equip stats (Fixed + Random Bonus Stats)
        for (const slot in equips) {
            const eq = equips[slot];
            if (eq) {
                if (eq.fixedStat) {
                    if (eq.fixedStat.hp) totalHp += Number(eq.fixedStat.hp) || 0;
                    if (eq.fixedStat.defense) totalDef += Number(eq.fixedStat.defense) || 0;
                    if (eq.fixedStat.attack) totalAtk += Number(eq.fixedStat.attack) || 0;
                    if (eq.fixedStat.magic) totalMag += Number(eq.fixedStat.magic) || 0;
                }
                if (eq.randomStat) {
                    if (eq.randomStat.hp) totalHp += Number(eq.randomStat.hp) || 0;
                    if (eq.randomStat.defense) totalDef += Number(eq.randomStat.defense) || 0;
                    if (eq.randomStat.attack) totalAtk += Number(eq.randomStat.attack) || 0;
                    if (eq.randomStat.magic) totalMag += Number(eq.randomStat.magic) || 0;
                    if (eq.randomStat.str) bonusStr += Number(eq.randomStat.str) || 0;
                    if (eq.randomStat.int) bonusInt += Number(eq.randomStat.int) || 0;
                }
            }
        }

        const pClass = base.playerClass;
        // Class specific 2D passives
        if (pClass === 'Berserker' && this.player.level >= 25) {
            // Bulk Up! (Lv.25): +25% Base DEF and HP
            totalHp = Math.floor(totalHp * 1.25);
            totalDef = Math.floor(totalDef * 1.25);
        } else if (pClass === 'Blademaster') {
            // Sharpen Up! (Lv.1): +25% Base Attack
            totalAtk = Math.floor(totalAtk * 1.25);
        }

        if (this.player.calloutActive) {
            totalDef *= 3;
        }

        this.player.maxHp = Math.max(1, totalHp);
        this.player.hp = Math.max(1, Math.min(Number(this.player.hp) || totalHp, totalHp));
        this.player.totalStr = (Number(base.str) || 10) + bonusStr;
        this.player.totalInt = (Number(base.int) || 10) + bonusInt;
        this.player.atk = totalAtk + Math.floor(this.player.totalStr / 2);
        this.player.mag = totalMag + Math.floor(this.player.totalInt / 2);
        this.player.def = totalDef;
        this.player.speed = 6.8;

        if (!this.player.pos || Number.isNaN(this.player.pos.x) || Number.isNaN(this.player.pos.z)) {
            this.player.pos = new THREE.Vector3(0, 0, 0);
        }

        this.ui.updatePlayerHUD(this.player);
    }

    getEquippedWeaponType() {
        if (!this.player.equips?.weapon) return null;
        if (this.player.equips.weapon.weaponType) return this.player.equips.weapon.weaponType;
        const spriteStr = String(this.player.equips.weapon.sprite || this.player.equips.weapon.name || '').toLowerCase();
        if (spriteStr.includes('sword')) return 'sword';
        if (spriteStr.includes('staff')) return 'staff';
        if (spriteStr.includes('pendant')) return 'pendant';
        if (spriteStr.includes('gun')) return 'gun';
        if (spriteStr.includes('dagger')) return 'dagger';
        if (spriteStr.includes('touchpad')) return 'touchpad';
        return null;
    }

    // Equip weapon, armor, or leggings from inventory slot
    equipWeaponFromInventory(slotIndex) {
        this.equipItemFromInventory(slotIndex);
    }

    equipItemFromInventory(slotIndex) {
        const item = this.player.inventory[slotIndex];
        if (!item || !['weapon', 'armor', 'leggings'].includes(item.type)) return;

        const slot = item.type;
        const oldEquip = this.player.equips[slot];
        this.player.equips[slot] = item;
        this.player.inventory[slotIndex] = oldEquip;

        // Update 3D Character Model Equipment Visuals based on Rarity (2D Exonie style)
        if (this.player.char3D) {
            const wpnType = this.getEquippedWeaponType();
            const wpnRarity = this.player.equips?.weapon?.rarity || 'Starter';
            const armRarity = this.player.equips?.armor?.rarity || 'Starter';
            const legRarity = this.player.equips?.leggings?.rarity || 'Starter';
            this.player.char3D.setEquipVisuals({
                weaponType: wpnType,
                weaponRarity: wpnRarity,
                armorRarity: armRarity,
                leggingsRarity: legRarity
            });
        }

        this.recalculateStats();
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('bump');
        this.ui.showToast(`Equipped ${item.name}!`);

        if (this.ui.skillModal && this.ui.skillModal.style.display !== 'none') {
            this.ui.renderSkills();
        }
    }

    // Use Refinement Stone or Power Gem on equipped weapon
    useMaterialFromInventory(slotIndex) {
        const item = this.player.inventory[slotIndex];
        if (!item) return;

        const wpn = this.player.equips.weapon;
        if (!wpn) {
            this.ui.showToast("⚠️ Equip a weapon first to refine or imbue it!");
            return;
        }

        const s = String(item.sprite || item.name).toLowerCase();
        if (s.includes('refinement')) {
            wpn.refineLevel = (wpn.refineLevel || 0) + 1;
            if (wpn.fixedStat) {
                for (const k of Object.keys(wpn.fixedStat)) {
                    wpn.fixedStat[k] = Math.max(wpn.fixedStat[k] + 2, Math.ceil(wpn.fixedStat[k] * 1.15));
                }
            }
            if (!wpn.name.includes('+')) wpn.name = `${wpn.name} +1`;
            else wpn.name = wpn.name.replace(/\+\d+$/, `+${wpn.refineLevel}`);
            this.ui.showToast(`✨ Refined ${wpn.name}!`);
        } else if (s.includes('gem')) {
            wpn.randomStat = wpn.randomStat || {};
            wpn.randomStat.str = (wpn.randomStat.str || 0) + Math.max(3, Math.floor(this.player.level * 0.6));
            wpn.randomStat.int = (wpn.randomStat.int || 0) + Math.max(3, Math.floor(this.player.level * 0.6));
            this.ui.showToast(`💎 Imbued ${wpn.name} with Power Gem!`);
        } else {
            return;
        }

        this.player.inventory[slotIndex] = null;
        this.recalculateStats();
        this.audio.playSfx('splash');
        this.engine.spawnHitSparks(this.player.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), 0x00e5ff, 22);
        this.ui.renderInventory();
    }

    // Sell item or Gold Bar for Gold (Exact 2D Exonie Sell Price formula)
    sellItemFromInventory(slotIndex) {
        const item = this.player.inventory[slotIndex];
        if (!item) return;
        const val = getItemSellPrice(item);
        this.player.gold += val;
        this.player.inventory[slotIndex] = null;
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('bump');
        this.ui.showToast(`💰 Sold ${item.name} for ${val.toLocaleString()} Gold!`);
        this.ui.updatePlayerHUD(this.player);
        this.ui.renderInventory();
    }

    addItemToInventory(newItem) {
        if (!newItem) return false;
        // Stack potions if possible
        if (newItem.type === 'potion') {
            for (let i = 0; i < 20; i++) {
                const it = this.player.inventory[i];
                if (it && it.type === 'potion' && it.name === newItem.name) {
                    it.quantity = (it.quantity || 1) + (newItem.quantity || 1);
                    return true;
                }
            }
        }
        for (let i = 0; i < 20; i++) {
            if (!this.player.inventory[i]) {
                this.player.inventory[i] = newItem;
                return true;
            }
        }
        return false;
    }

    // Unequip currently equipped weapon back into the bag
    unequipWeapon() {
        if (!this.player.equips.weapon) return;

        let emptyIdx = -1;
        for (let i = 0; i < 20; i++) {
            if (!this.player.inventory[i]) {
                emptyIdx = i;
                break;
            }
        }

        if (emptyIdx === -1) {
            this.ui.showToast("Your inventory bag is full!");
            return;
        }

        const unequipped = this.player.equips.weapon;
        this.player.inventory[emptyIdx] = unequipped;
        this.player.equips.weapon = null;

        if (this.player.char3D) {
            this.player.char3D.setWeapon(null);
        }

        this.recalculateStats();
        this.audio.playSfx('bump');
        this.ui.showToast(`Unequipped ${unequipped.name}`);
        this.ui.renderInventory();

        if (this.ui.skillModal && this.ui.skillModal.style.display !== 'none') {
            this.ui.renderSkills();
        }
    }

    // Use Health Potion from inventory or hotbar
    useHealthPotion() {
        if (this.potionCooldown > 0) {
            this.ui.showToast("Potion is on cooldown!");
            return;
        }

        let potItem = null;
        let potIndex = -1;

        for (let i = 0; i < 20; i++) {
            const it = this.player.inventory[i];
            if (it && it.type === 'potion') {
                potItem = it;
                potIndex = i;
                break;
            }
        }

        if (!potItem) {
            this.ui.showToast("No health potions remaining!");
            return;
        }

        const healAmt = Math.min(this.player.maxHp, potItem.fixedStat?.hpHeal || 50);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmt);
        this.combat.spawnFloatingDamage(this.player.pos, `+${healAmt} HP`, false, true);
        this.engine.spawnHitSparks(this.player.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x00e676, 20);
        this.audio.playSfx('splash');

        potItem.quantity = (potItem.quantity || 1) - 1;
        if (potItem.quantity <= 0) {
            this.player.inventory[potIndex] = null;
        }

        this.potionCooldown = 5.0;
        this.ui.showToast(`+${healAmt} HP restored!`);
        this.ui.updatePlayerHUD(this.player);
        this.ui.renderInventory();
    }

    getPotionCount() {
        let count = 0;
        for (let i = 0; i < 20; i++) {
            const it = this.player.inventory[i];
            if (it && it.type === 'potion') {
                count += it.quantity || 1;
            }
        }
        return count;
    }

    // Choose permanent class
    chooseClass(className) {
        if (!CLASSES[className]) return;

        this.player.baseStats.playerClass = className;
        if (this.player.char3D) {
            this.player.char3D.setJobClass(className);
        }
        this.recalculateStats();
        this.saveCharacterToAccountSlot();

        this.audio.playSfx('lightning');
        this.engine.spawnLevelUpVFX(this.player.pos);
        this.combat.spawnFloatingDamage(this.player.pos, `AWAKENED: ${className}!`, true);
        this.ui.showToast(`Congratulations! You are now a ${className}!`);

        this.ui.updatePlayerHUD(this.player);
        this.ui.renderSkills();
    }

    getDefaultKeybinds() {
        return {
            skill1: 'Digit1',
            skill1Alt: 'KeyQ',
            skill2: 'Digit2',
            skill2Alt: 'KeyE',
            potion: 'Digit3',
            dodge: 'ShiftLeft',
            stats: 'KeyP',
            bag: 'KeyB',
            skills: 'KeyK'
        };
    }

    loadKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        try {
            const raw = localStorage.getItem('exonie3d_keybinds');
            if (raw) {
                const parsed = JSON.parse(raw);
                this.keybinds = Object.assign(this.getDefaultKeybinds(), parsed);
            }
        } catch (e) {}
    }

    saveKeybinds() {
        try {
            localStorage.setItem('exonie3d_keybinds', JSON.stringify(this.keybinds));
        } catch (e) {}
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        this.saveKeybinds();
    }

    setupKeyboardInput() {
        window.addEventListener('keydown', (e) => {
            // Check if typing in an input box
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                if (e.target.id === 'chat-input') {
                    return; // let chat input handle keystrokes
                }
                const authScr = document.getElementById('auth-screen');
                const charScr = document.getElementById('creation-screen');
                const isAuthOpen = authScr && authScr.style.display !== 'none' && !authScr.classList.contains('hidden');
                const isCharOpen = charScr && charScr.style.display !== 'none' && !charScr.classList.contains('hidden');
                if (!isAuthOpen && !isCharOpen) {
                    // Unfocus lingering inputs from previous screens so movement keys register immediately!
                    e.target.blur();
                } else {
                    return;
                }
            }

            // If Settings Keybind Customizer is listening for a new key press:
            if (this.ui && this.ui.listeningBindAction) {
                e.preventDefault();
                const act = this.ui.listeningBindAction;
                this.ui.listeningBindAction = null;
                document.querySelectorAll('.keybind-btn').forEach(b => b.classList.remove('listening'));
                if (e.code !== 'Escape') {
                    this.keybinds[act] = e.code;
                    this.saveKeybinds();
                    this.ui.showToast(`⌨️ Bound ${act.toUpperCase()} to [${this.ui.formatKeyLabel(e.code)}]`);
                }
                this.ui.refreshKeybindLabels();
                return;
            }

            this.keys[e.code] = true;
            const kb = this.keybinds || this.getDefaultKeybinds();

            if (e.code === 'Escape') {
                e.preventDefault();
                this.ui.toggleSettings();
            } else if (e.code === kb.stats) {
                this.ui.toggleStats();
            } else if (e.code === kb.bag || e.code === 'KeyI') {
                this.ui.toggleInventory();
            } else if (e.code === kb.skills) {
                this.ui.toggleSkills();
            } else if (e.code === 'Space') {
                e.preventDefault();
                this.onJumpTrigger();
            } else if (e.code === kb.dodge || e.code === 'ShiftRight') {
                e.preventDefault();
                this.onDodgeTrigger();
            } else if (e.code === 'AltLeft' || e.code === 'AltRight') {
                e.preventDefault();
                this.engine.togglePointerLock();
            } else if (e.code === kb.skill1 || e.code === kb.skill1Alt) {
                this.onSkillTrigger(1);
            } else if (e.code === kb.skill2 || e.code === kb.skill2Alt) {
                this.onSkillTrigger(2);
            } else if (e.code === kb.potion) {
                this.useHealthPotion();
            } else if (e.code === 'Tab') {
                e.preventDefault();
                this.toggleTargetLock();
            } else if (e.code === 'Enter') {
                e.preventDefault();
                this.openChatInput();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Desktop mouse left-click primary attack combo (auto-aims nearest monster!)
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && e.target.id === 'canvas-3d') {
                this.onAttackTrigger();
            }
        });

        // Ensure clicking game canvas or HUD blurs any lingering inputs so keyboard controls are always responsive
        window.addEventListener('pointerdown', (e) => {
            if (e.target && e.target.id !== 'chat-input' && document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
            }
        });
    }

    onAttackTrigger() {
        if (!this.player.char3D || this.isGhost) return;
        if (this.player.char3D.isDodging) return; // Prevent attack during dodge roll
        this.combat.executePrimaryAttack(this.player, this.monsters, (deadMob) => {
            this.onMonsterDefeated(deadMob);
        });
    }

    onJumpTrigger() {
        if (!this.player.char3D || this.isGhost) return;
        if (this.player.pos.y <= 0.05 && !this.player.isJumping) {
            this.player.isJumping = true;
            this.player.velocityY = this.jumpForce;
            this.player.char3D.triggerJump();
            this.audio.playSfx('bump');
        }
    }

    onDodgeTrigger() {
        if (!this.player.char3D || this.isGhost || this.combat.cooldowns.dodge > 0) return;
        this.combat.cooldowns.dodge = 1.2;
        this.player.isInvulnerable = true;
        setTimeout(() => { this.player.isInvulnerable = false; }, 420);
        this.player.char3D.triggerDodge(this.player.moveDir);
        this.audio.playSfx('bump');
        this.engine.spawnHitSparks(this.player.pos, 0x00e5ff, 12);
    }

    onSkillTrigger(slot) {
        if (!this.player.char3D || this.isGhost) return;
        if (this.player.char3D.isDodging) return; // Prevent skills during dodge roll

        // 1. Weapon requirement
        if (!this.player.equips || !this.player.equips.weapon) {
            this.audio.playSfx('bump');
            this.ui.showToast("⚠️ Equip a weapon from your Bag (B) to use skills!");
            this.combat.spawnFloatingDamage(this.player.pos, "EQUIP WEAPON FIRST!", false);
            return;
        }

        // 2. Class awakening requirement
        const pClass = this.player.baseStats?.playerClass;
        if (!pClass || !CLASSES[pClass]) {
            this.audio.playSfx('bump');
            this.ui.showToast("⚠️ Awaken your class in the Skills menu (K) first!");
            this.combat.spawnFloatingDamage(this.player.pos, "AWAKEN CLASS IN SKILLS (K)!", false);
            return;
        }

        // 3. Class weapon type check (same as 2D Exonie: CLASSES[pClass].weapon)
        const reqWpn = CLASSES[pClass]?.weapon;
        const wpn = this.player.equips?.weapon;
        const wpnType = String(wpn?.weaponType || wpn?.sprite || wpn?.name || '').toLowerCase();
        if (reqWpn && !wpnType.includes(reqWpn)) {
            this.audio.playSfx('bump');
            this.ui.showToast(`⚠️ ${pClass} requires a ${reqWpn.toUpperCase()} to use class skills!`);
            this.combat.spawnFloatingDamage(this.player.pos, `WRONG WEAPON! (${reqWpn.toUpperCase()})`, false);
            return;
        }

        this.combat.executeSkill(slot, this.player, this.monsters, (deadMob) => {
            this.onMonsterDefeated(deadMob);
        });
    }

    toggleTargetLock() {
        if (this.combat.targetMonster) {
            this.combat.targetMonster = null;
        } else {
            this.combat.findTarget(this.player.pos, this.player.rotY, this.monsters, 16);
        }
    }

    // ==========================================
    // MAP LOADING & AUTHENTIC 2D DATA INGESTION
    // ==========================================
    loadMap(mapId, targetX, targetY) {
        // Clear old monsters
        for (const m of this.monsters) {
            this.engine.scene.remove(m.group);
        }
        this.monsters = [];
        this.floorBoss = null;

        // Clear map-specific minions and fire zones
        if (this.combat) {
            if (this.combat.alliedMinions) {
                for (const sm of this.combat.alliedMinions) {
                    this.engine.scene.remove(sm.group);
                }
                this.combat.alliedMinions = [];
            }
            if (this.combat.fireZones) {
                for (const f of this.combat.fireZones) {
                    this.engine.scene.remove(f.mesh);
                }
                this.combat.fireZones = [];
            }
        }
        this.currentMapId = mapId;

        // Build the 3D map from 2D Exonie dataset
        const data = this.world.loadMap(mapId, targetX, targetY);
        this.player.pos.copy(data.spawn);

        // Safety check: ensure player is never spawned inside a wall or pillar collider
        if (this.world.checkCollision(this.player.pos.x, this.player.pos.z, 0.7)) {
            const offsets = [[0, -4], [0, 4], [4, 0], [-4, 0], [0, -8], [0, 8]];
            for (const [ox, oz] of offsets) {
                if (!this.world.checkCollision(this.player.pos.x + ox, this.player.pos.z + oz, 0.7)) {
                    this.player.pos.x += ox;
                    this.player.pos.z += oz;
                    break;
                }
            }
        }

        // Adjust lighting theme based on environment
        if (mapId === 'hauntedhouse' || mapId.startsWith('dungeon') || mapId === 'event_cave') {
            this.engine.setEnvironmentTheme('dungeon');
        } else {
            this.engine.setEnvironmentTheme('daylight');
        }

        // BGM selection matching 2D Exonie tracks
        if (mapId !== 'trainingtavern') {
            this.tavernTimerActive = false;
            if (this.ui && this.ui.updateTavernTimer) {
                this.ui.updateTavernTimer(0, false);
            }
        }
        let bgmTrack = 'town';
        if (mapId === 'town') bgmTrack = 'town';
        else if (mapId === 'trainingtavern') bgmTrack = 'bossfight';
        else if (mapId === 'home') bgmTrack = 'home';
        else if (mapId === 'neutralzone') bgmTrack = 'floors';
        else if (mapId === 'battlefield') bgmTrack = 'battlefield';
        else if (mapId === 'hauntedhouse') bgmTrack = 'bossfight';
        else if (mapId === 'guildbase') bgmTrack = 'guild';
        else if (mapId === 'floor10') bgmTrack = 'bossfight2';
        else if (mapId.startsWith('floor')) bgmTrack = 'floors';
        else if (mapId.startsWith('dungeon') || mapId === 'event_cave') bgmTrack = 'bossfight';

        this.audio.playBgm(bgmTrack);
        this.ui.updateFloorIndicator(mapId, data.name);

        // Spawn monsters defined in this map's data (Dungeon monsters NEVER respawn, per 2D rules)
        const isDungeon = mapId.startsWith('dungeon');
        const now = Date.now();
        const bossRemaining = (this.bossCooldowns && this.bossCooldowns[mapId]) ? (this.bossCooldowns[mapId] - now) : 0;

        if (Array.isArray(data.monsterSpawns)) {
            for (const sp of data.monsterSpawns) {
                // If this is a floor boss and its 24h Supabase cooldown is active, skip spawning it
                if (sp.category === 'floor_boss' && mapId.startsWith('floor') && bossRemaining > 0) {
                    const hrs = Math.ceil(bossRemaining / 3600000);
                    this.ui.showToast(`⏳ [FLOOR BOSS COOLDOWN] ${sp.name} respawns in ~${hrs} hours.`);
                    continue;
                }

                const mob = new Monster3D(sp, sp.position);
                if (isDungeon) {
                    mob.noRespawn = true;
                }
                this.engine.scene.add(mob.group);
                this.monsters.push(mob);
                if (sp.category === 'floor_boss') {
                    this.floorBoss = mob;
                }
            }
        }

        if (this.player.char3D) {
            this.player.char3D.group.position.copy(this.player.pos);
        }

        // Do not auto-show Boss HP Bar on floor entry; only show when player has attacked it!
        this.bossEngaged = false;
        this.ui.updateBossHealth(null);

        this.portalCooldown = 3.0; // 3s cooldown to prevent double teleports
    }

    onMonsterDefeated(mob) {
        this.audio.playSfx('bump');
        this.engine.spawnHitSparks(mob.group.position, 0xffea00, 25);

        // EXP and Gold
        this.gainExp(mob.expYield);
        this.player.gold += mob.goldYield;
        this.combat.spawnFloatingDamage(mob.group.position, `+${mob.expYield} EXP`, false, true);

        // Authoritative 2D Loot Drop System + World Announcements for Rare/Boss Drops
        const drops = generateLoot(mob);
        for (const drop of drops) {
            const added = this.addItemToInventory(drop);
            if (added) {
                this.ui.showToast(`🎁 Looted [${drop.rarity}] ${drop.name}!`);
                this.combat.spawnFloatingDamage(
                    mob.group.position.clone().add(new THREE.Vector3(0, 0.7, 0)),
                    `🎁 ${drop.name}`,
                    drop.rarity === 'Legendary' || drop.rarity === 'Godly' || drop.rarity === 'Divine',
                    true
                );
                if (['Legendary', 'Godly', 'Divine'].includes(drop.rarity)) {
                    this.ui.showWorldAnnouncement(
                        `🌟 <strong style="color:#00e5ff;">${this.player.name}</strong> obtained <strong style="color:#ffd700;">[${drop.rarity}] ${drop.name}</strong> from <strong>${mob.name}</strong>!`,
                        '#ffd700'
                    );
                }
            } else {
                this.ui.showToast(`⚠️ Bag Full! Could not pick up ${drop.name}.`);
            }
        }

        // ============================================================
        // 2D QUEST BOARD / DAILY GOLD MISSION KILL TRACKING
        // ============================================================
        if (this.player.dailyMission && this.player.dailyMission.active) {
            const dm = this.player.dailyMission;
            const floorNum = parseInt(String(this.currentMapId).replace('floor', ''), 10) || 0;
            let countsForMission = false;
            if (dm.id === 'easy' && (floorNum === 1 || floorNum === 2 || mob.monsterKey.includes('slime'))) {
                countsForMission = true;
            } else if (dm.id === 'medium' && (floorNum === 3 || floorNum === 4 || mob.monsterKey.includes('bat'))) {
                countsForMission = true;
            } else if (dm.id === 'hard' && (floorNum >= 5 || this.currentMapId.startsWith('dungeon'))) {
                countsForMission = true;
            }
            if (countsForMission) {
                dm.progress = (dm.progress || 0) + 1;
                if (dm.progress >= dm.targetCount) {
                    const goldReward = dm.reward || 25000;
                    this.player.gold += goldReward;
                    this.player.dailyMission = null;
                    this.audio.playSfx('lightning');
                    this.combat.spawnFloatingDamage(this.player.pos, `📜 QUEST COMPLETE! +${goldReward.toLocaleString()}G!`, true, true);
                    this.ui.showWorldAnnouncement(
                        `📜 <strong style="color:#00e5ff;">${this.player.name}</strong> completed a <strong>Guild Quest Board Contract</strong> and earned <strong style="color:#ffd700;">+${goldReward.toLocaleString()} Gold</strong>!`,
                        '#4ade80'
                    );
                    this.ui.showToast(`🎉 Quest Complete! Earned +${goldReward.toLocaleString()} Gold!`);
                } else {
                    this.ui.showToast(`📜 Quest Progress: ${dm.progress} / ${dm.targetCount}`);
                }
                this.saveCharacterToAccountSlot();
            }
        }

        // ============================================================
        // 2D TRAINING TAVERN SOLO SPEEDRUN COMPLETION & RANKING
        // ============================================================
        if (mob.isTavernBoss) {
            this.tavernTimerActive = false;
            const elapsedMs = Math.max(500, Math.round(performance.now() - (this.tavernStartTime || performance.now())));
            const cfg = this.world.tavernChallengeConfig || { bossType: 'floor', level: mob.level };
            this.recordTavernRun(cfg.bossType, mob.level, elapsedMs);
            const secStr = (elapsedMs / 1000).toFixed(2);
            this.ui.showWorldAnnouncement(
                `🍺 <strong style="color:#00e5ff;">[TAVERN RANKING] ${this.player.name}</strong> defeated Lv.${mob.level} <strong>${mob.name}</strong> in <strong style="color:#fde047;">${secStr}s</strong>!`,
                '#ffab00'
            );
            // 50% chance to drop a special Tavern Champion Trophy / Gear
            if (Math.random() < 0.5) {
                const tavernItem = {
                    name: `Tavern Champion's Crest (Lv.${mob.level})`,
                    type: 'armor',
                    rarity: 'Legendary',
                    level: mob.level,
                    fixedStat: { defense: 18 + mob.level * 2, hp: 60 + mob.level * 5 },
                    randomStat: { str: 5 + Math.floor(mob.level * 0.4), int: 5 + Math.floor(mob.level * 0.4) },
                    sprite: 'armor3',
                    desc: 'Awarded to solo speedrun champions of the Training Tavern.'
                };
                if (this.addItemToInventory(tavernItem)) {
                    this.ui.showToast(`🏆 Bonus Tavern Drop: ${tavernItem.name}!`);
                }
            }
            setTimeout(() => {
                if (this.currentMapId === 'trainingtavern') {
                    this.ui.updateTavernTimer(0, false);
                    this.loadMap('town');
                    this.ui.openLeaderboardModal(cfg.bossType);
                }
            }, 3400);
        }

        // ============================================================
        // 2D BATTLEFIELD CO-OP RAID BOSS VICTORY (500,000 G OR LV.150 DIVINE)
        // ============================================================
        if (mob.isBattlefieldBoss) {
            this.audio.playSfx('lightning');
            if (Math.random() < 0.5) {
                this.player.gold += 500000;
                this.combat.spawnFloatingDamage(this.player.pos, `+500,000 GOLD (HUGE NUGGET)!`, true, true);
                this.ui.showWorldAnnouncement(
                    `🏰 <strong style="color:#ff1744;">[BATTLEFIELD RAID]</strong> <strong style="color:#00e5ff;">${this.player.name}</strong> slew the Lv.${mob.level} <strong>${mob.name}</strong> and claimed a <strong style="color:#ffd700;">Huge Gold Nugget (500,000 G)</strong>!`,
                    '#ff1744'
                );
            } else {
                const divineWpn = {
                    name: `Divine Sovereign Blade (Lv.150)`,
                    type: 'weapon',
                    weaponType: this.getEquippedWeaponType() || 'sword',
                    rarity: 'Divine',
                    level: 150,
                    fixedStat: { attack: 480, magic: 480 },
                    randomStat: { str: 45, int: 45 },
                    sprite: 'sword3',
                    desc: 'Forged in the Woods of the Battlefield from a Lv.500+ Raid Boss.'
                };
                this.addItemToInventory(divineWpn);
                this.ui.showWorldAnnouncement(
                    `🏰 <strong style="color:#ff1744;">[BATTLEFIELD RAID]</strong> <strong style="color:#00e5ff;">${this.player.name}</strong> slew the Lv.${mob.level} <strong>${mob.name}</strong> and obtained <strong style="color:#facc15;">[Divine] ${divineWpn.name}</strong>!`,
                    '#facc15'
                );
            }
            setTimeout(() => {
                if (this.currentMapId === 'battlefield') {
                    this.respawnInTown();
                }
            }, 4200);
        }

        // ============================================================
        // 2D NEUTRAL ZONE WORLD BOSS ANNOUNCEMENT
        // ============================================================
        if (mob.isNeutralBoss) {
            this.ui.showWorldAnnouncement(
                `🌲 <strong style="color:#4ade80;">[NEUTRAL ZONE]</strong> <strong style="color:#00e5ff;">${this.player.name}</strong> has defeated the Wild Woods World Boss <strong>${mob.name} (Lv.${mob.level})</strong>!`,
                '#4ade80'
            );
        }

        // Boss defeat check
        if (mob.category === 'floor_boss') {
            this.onFloorBossDefeated(mob);
        }

        this.ui.updatePlayerHUD(this.player);
        if (this.ui.inventoryModal && this.ui.inventoryModal.style.display !== 'none') {
            this.ui.renderInventory();
        }

        if (this.socket) {
            this.socket.emit('monsterKill', { monsterKey: mob.monsterKey, level: mob.level });
        }
    }

    onFloorBossDefeated(mob) {
        this.audio.playSfx('lightning');
        this.engine.addScreenshake(1.2);
        this.ui.showFloorCleared(this.currentMapId);
        if (!mob.isTavernBoss && !mob.isBattlefieldBoss && !mob.isNeutralBoss) {
            this.ui.showWorldAnnouncement(
                `⚔️ <strong style="color:#00e5ff;">[WORLD ANNOUNCEMENT] ${this.player.name}</strong> has defeated <strong>[BOSS] ${mob.name} (Lv.${mob.level})</strong> on <strong>${this.currentMapId.toUpperCase()}</strong>!`,
                '#00e5ff'
            );
            // 24-hour Floor Boss Cooldown matching 2D Exonie (persisted to Supabase boss_timers)
            const respawnAt = Date.now() + (24 * 60 * 60 * 1000);
            this.bossCooldowns[this.currentMapId] = respawnAt;
            if (this.socket) {
                this.socket.emit('floorBossKilled', { floorId: this.currentMapId, bossName: mob.name });
            }
        }

        if (this.currentMapId === 'floor10') {
            alert("🌟 CONGRATULATIONS! You have defeated The Void King on Floor 10! You have conquered the current pinnacle floor of Exonie Remastered!");
        }
    }

    // ==========================================
    // TECH GENIUS 3D GAMMA SHIELD & GOLEM SUMMON
    // ==========================================
    createPlayerShieldVFX() {
        if (this.playerShieldMesh && this.player.char3D?.group) {
            this.player.char3D.group.remove(this.playerShieldMesh);
            this.playerShieldMesh = null;
        }
        if (!this.player.char3D?.group) return;
        const geo = new THREE.SphereGeometry(1.35, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00e5ff,
            transparent: true,
            opacity: 0.38,
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.65
        });
        this.playerShieldMesh = new THREE.Mesh(geo, mat);
        this.playerShieldMesh.position.set(0, 0.9, 0);
        this.player.char3D.group.add(this.playerShieldMesh);
    }

    destroyPlayerShieldVFX() {
        if (this.playerShieldMesh && this.player.char3D?.group) {
            this.engine.spawnHitSparks(this.player.pos, 0x00e5ff, 28);
            this.engine.spawnGroundShockwave(this.player.pos, 0x00e5ff, 3.8);
            this.combat.spawnFloatingDamage(this.player.pos, '💥 SHIELD BROKEN!', true, true);
            this.audio.playSfx('bump');
            this.player.char3D.group.remove(this.playerShieldMesh);
            this.playerShieldMesh = null;
        }
        this.player.shieldHp = 0;
    }

    spawnGolemBusterMinion() {
        const intVal = this.player.baseStats?.int || 10;
        const matk = Math.max(15, Math.floor((this.player.baseStats?.int || 10) * 1.8) + (this.player.mag || 10));
        this.combat.spawnGolemBuster(this.player, intVal, matk);
    }

    onMonsterHitPlayer(rawDmg, attackType = 'Attack') {
        if (this.isGhost || this.player.isInvulnerable) return;

        let dmg = Math.max(1, rawDmg - this.player.def);

        // Tech Genius Gamma Shield absorption
        if ((this.player.shieldHp || 0) > 0) {
            const absorbed = Math.min(this.player.shieldHp, dmg);
            this.player.shieldHp -= absorbed;
            dmg -= absorbed;
            if (this.player.shieldHp <= 0) {
                this.destroyPlayerShieldVFX();
            } else {
                this.combat.spawnFloatingDamage(this.player.pos, `SHIELD (${this.player.shieldHp})`, false, true);
            }
            if (dmg <= 0) return;
        }

        this.player.hp = Math.max(this.player.isImmortal ? 1 : 0, this.player.hp - dmg);
        this.audio.playSfx('bump');
        this.combat.spawnFloatingDamage(this.player.pos, `-${dmg} (${attackType})`, false);
        this.engine.addScreenshake(0.4);
        this.ui.updatePlayerHUD(this.player);

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.isGhost = true;
            this.destroyPlayerShieldVFX();
            this.audio.playSfx('bump');
            this.ui.updatePlayerHUD(this.player);
            this.ui.showDeathScreen(this.hasRevivalJuice());
        }
    }

    // EXP and Leveling up matching 2D Exonie exactly
    gainExp(amt) {
        if (this.player.level >= MAX_LEVEL) return;
        this.player.exp += amt;

        while (this.player.exp >= this.player.maxExp && this.player.level < MAX_LEVEL) {
            this.player.exp -= this.player.maxExp;
            this.player.level++;
            this.player.maxExp += getExpForNextLevel(this.player.level);
            
            // 2D Exonie level up growth: +10 HP, +2 STR, +2 INT
            this.player.baseStats.hp += 10;
            this.player.baseStats.str += 2;
            this.player.baseStats.int += 2;

            this.recalculateStats();
            this.player.hp = this.player.maxHp;

            this.engine.spawnLevelUpVFX(this.player.pos);
            this.combat.spawnFloatingDamage(this.player.pos, "LEVEL UP!", true);
            this.audio.playSfx('splash');
            this.ui.showToast(`LEVEL UP! You are now Level ${this.player.level}!`);
            this.saveCharacterToAccountSlot();
        }
    }

    // Check if player stepped into any map teleport portal or interactive Town house doorway
    checkPortalCollision() {
        if (this.portalCooldown > 0 || this.isGhost) return;
        if (this.ui && this.ui.isAnyModalOpen()) return;

        const triggeredPortal = this.world.checkPortalTrigger(this.player.pos.x, this.player.pos.z);
        if (triggeredPortal) {
            const tid = triggeredPortal.targetMapId;
            if (tid === 'marketplace') {
                if (this.ui.marketplaceModal && this.ui.marketplaceModal.style.display === 'flex') return;
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.toggleMarketplace();
                return;
            }
            if (tid === 'storage') {
                if (this.ui.storageModal && this.ui.storageModal.style.display === 'flex') return;
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openStorageUI();
                return;
            }
            if (tid === 'daily_missions') {
                if (this.ui.dailyMissionsModal && this.ui.dailyMissionsModal.style.display === 'flex') return;
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openDailyMissionsUI();
                return;
            }
            if (tid === 'trainingtavern') {
                if (this.ui.tavernModal && this.ui.tavernModal.style.display === 'flex') return;
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openTavernModal();
                return;
            }
            if (tid === 'leaderboard') {
                if (this.ui.leaderboardModal && this.ui.leaderboardModal.style.display === 'flex') return;
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openLeaderboardModal('floor');
                return;
            }
            if (tid === 'maze_guide') {
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openMazeGuideModal();
                return;
            }
            if (tid === 'dungeon1' || tid === 'dungeon2a') {
                this.portalCooldown = 4.0;
                this.audio.playSfx('bump');
                this.ui.openDungeonModal(tid, triggeredPortal.label);
                return;
            }

            this.portalCooldown = 3.2;
            this.audio.playSfx('splash');
            this.ui.showToast(`Entering ${triggeredPortal.label}...`);
            if (window.showLoadingTransition) {
                window.showLoadingTransition(
                    triggeredPortal.label,
                    triggeredPortal.subtitle || 'Entering Realm...',
                    1350,
                    () => {
                        this.loadMap(triggeredPortal.targetMapId, triggeredPortal.targetX, triggeredPortal.targetY);
                    }
                );
            } else {
                this.loadMap(triggeredPortal.targetMapId, triggeredPortal.targetX, triggeredPortal.targetY);
            }
        }
    }

    // Check if player has Revival Juice in bag
    hasRevivalJuice() {
        for (let i = 0; i < 20; i++) {
            const it = this.player.inventory[i];
            if (it && (it.name === 'Revival Juice' || it.sprite === 'revival_juice')) {
                return true;
            }
        }
        return false;
    }

    // Use Revival Juice on Death Screen to revive on the spot with 100% HP
    useRevivalJuice() {
        for (let i = 0; i < 20; i++) {
            const it = this.player.inventory[i];
            if (it && (it.name === 'Revival Juice' || it.sprite === 'revival_juice')) {
                it.quantity = (it.quantity || 1) - 1;
                if (it.quantity <= 0) this.player.inventory[i] = null;
                this.isGhost = false;
                this.player.hp = this.player.maxHp;
                this.player.mp = this.player.maxMp;
                this.ui.hideDeathScreen();
                this.audio.playSfx('splash');
                this.engine.spawnLevelUpVFX(this.player.pos);
                this.combat.spawnFloatingDamage(this.player.pos, "REVIVED! FULL HP!", true, true);
                this.ui.updatePlayerHUD(this.player);
                return;
            }
        }
    }

    // Respawn in Town from Death Screen (or Settings Unstuck) with 100% FULL HP!
    respawnInTown() {
        this.ui.hideDeathScreen();
        if (window.showLoadingTransition) {
            window.showLoadingTransition(
                'Town of Exonie',
                'Restoring Life Force & Returning to Sanctuary...',
                950,
                () => {
                    this.isGhost = false;
                    this.recalculateStats();
                    this.player.hp = this.player.maxHp;
                    this.player.mp = this.player.maxMp;
                    this.loadMap('town');
                    this.ui.updatePlayerHUD(this.player);
                    this.combat.spawnFloatingDamage(this.player.pos, "HP FULLY RESTORED!", false, true);
                    this.ui.showToast("Returned to Town of Exonie with full HP!");
                }
            );
        } else {
            this.isGhost = false;
            this.recalculateStats();
            this.player.hp = this.player.maxHp;
            this.player.mp = this.player.maxMp;
            this.loadMap('town');
            this.ui.updatePlayerHUD(this.player);
        }
    }

    // Buy item from Town Marketplace House
    buyMarketplaceItem(kind) {
        const prices = {
            potion: 100,
            potions: 100,
            refinement: 800,
            stone: 800,
            gem: 1200,
            revival: 500
        };
        const cost = prices[kind] || 100;
        if (this.player.gold < cost) {
            this.audio.playSfx('bump');
            this.ui.showToast(`⚠️ Not enough Gold! Need ${cost} Gold.`);
            return;
        }

        let newItem = null;
        if (kind === 'potion' || kind === 'potions') {
            newItem = {
                name: 'Health Potion',
                type: 'potion',
                rarity: 'Basic',
                level: 1,
                quantity: 5,
                fixedStat: { hpHeal: 50 },
                sprite: 'potion1',
                desc: 'Restores 50 HP when consumed.'
            };
        } else if (kind === 'refinement' || kind === 'stone') {
            newItem = {
                name: 'Refinement Stone',
                type: 'material',
                rarity: 'Unique',
                level: 1,
                sprite: 'refinementstone',
                desc: 'Upgrades your equipped weapon (+1 Refinement Level & +15% stats).'
            };
        } else if (kind === 'gem') {
            newItem = {
                name: 'Power Gem',
                type: 'material',
                rarity: 'Legendary',
                level: 1,
                sprite: 'powergem',
                desc: 'Imbues your equipped weapon with bonus STR and INT.'
            };
        } else if (kind === 'revival') {
            newItem = {
                name: 'Revival Juice',
                type: 'potion',
                rarity: 'Unique',
                level: 1,
                quantity: 1,
                fixedStat: { hpHeal: 99999 },
                sprite: 'revivaljuice',
                desc: 'Allows instant revival on the spot if you fall in the Maze.'
            };
        }

        if (!this.addItemToInventory(newItem)) {
            this.ui.showToast("⚠️ Your inventory bag is full!");
            return;
        }

        this.player.gold -= cost;
        this.saveCharacterToAccountSlot();
        this.audio.playSfx('splash');
        this.ui.showToast(`🛒 Purchased ${newItem.name}!`);
        this.ui.updatePlayerHUD(this.player);
        const mGold = document.getElementById('market-gold-val');
        if (mGold) mGold.textContent = this.player.gold.toLocaleString();
    }

    // ==========================================
    // GAME LOOP (60 FPS FLUID ACTION)
    // ==========================================
    gameLoop(timestamp) {
        requestAnimationFrame((t) => this.gameLoop(t));

        const delta = Math.min(0.1, (timestamp - this.lastTime) * 0.001);
        this.lastTime = timestamp;

        if (this.portalCooldown > 0) this.portalCooldown -= delta;
        if (this.combat.cooldowns.dodge > 0) this.combat.cooldowns.dodge -= delta;

        // Sync Skill 1 & Skill 2 Frontend Hotbar Cooldown Overlays with actual Cooldowns
        const cd1 = this.combat.cooldowns.skill1;
        const maxCd1 = this.combat.maxCooldowns?.skill1 || 1;
        const cdEl1 = document.getElementById('cd-1');
        const cdtEl1 = document.getElementById('cdt-1');
        if (cd1 > 0) {
            const pct = Math.min(100, (cd1 / maxCd1) * 100);
            if (cdEl1) cdEl1.style.height = `${pct}%`;
            if (cdtEl1) { cdtEl1.style.display = 'flex'; cdtEl1.textContent = Math.ceil(cd1); }
        } else {
            if (cdEl1) cdEl1.style.height = '0%';
            if (cdtEl1) cdtEl1.style.display = 'none';
        }

        const cd2 = this.combat.cooldowns.skill2;
        const maxCd2 = this.combat.maxCooldowns?.skill2 || 1;
        const cdEl2 = document.getElementById('cd-2');
        const cdtEl2 = document.getElementById('cdt-2');
        if (cd2 > 0) {
            const pct = Math.min(100, (cd2 / maxCd2) * 100);
            if (cdEl2) cdEl2.style.height = `${pct}%`;
            if (cdtEl2) { cdtEl2.style.display = 'flex'; cdtEl2.textContent = Math.ceil(cd2); }
        } else {
            if (cdEl2) cdEl2.style.height = '0%';
            if (cdtEl2) cdtEl2.style.display = 'none';
        }

        if (this.potionCooldown > 0) {
            this.potionCooldown -= delta;
            const potOverlay = document.getElementById('cd-3');
            const potTxt = document.getElementById('cdt-3');
            if (this.potionCooldown > 0) {
                const pct = (this.potionCooldown / 5.0) * 100;
                if (potOverlay) potOverlay.style.height = `${pct}%`;
                if (potTxt) { potTxt.style.display = 'flex'; potTxt.textContent = Math.ceil(this.potionCooldown); }
            } else {
                if (potOverlay) potOverlay.style.height = '0%';
                if (potTxt) potTxt.style.display = 'none';
            }
        }

        if (!this.player.char3D) return;

        // If player is defeated (on Death Screen), render scene ambiance without movement/combat
        if (this.isGhost) {
            this.world.update(delta, this.player.pos);
            this.combat.update(delta);
            this.engine.updateParticles(delta);
            this.engine.updateCamera(this.player.pos, delta);
            this.engine.render();
            return;
        }

        // Tech Genius / Touchpad Auto-Proximity Gadget Drone (fires automatically every 1.0s when near monsters)
        this.combat.updateAutoDrone(delta, this.player, this.monsters, (deadMob) => {
            this.onMonsterDefeated(deadMob);
        });

        // Jump & Vertical Gravity Physics
        if (this.player.isJumping || this.player.pos.y > 0) {
            this.player.velocityY -= this.gravity * delta;
            this.player.pos.y += this.player.velocityY * delta;
            if (this.player.pos.y <= 0) {
                this.player.pos.y = 0;
                this.player.velocityY = 0;
                this.player.isJumping = false;
                if (this.player.char3D) this.player.char3D.onLand();
            }
        }

        // 1. Process Player Movement
        let inputX = 0;
        let inputZ = 0;

        if (!this.isChatting) {
            if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;
        }

        if (this.ui.joystick.active) {
            inputX = this.ui.joystick.vectorX;
            inputZ = this.ui.joystick.vectorY;
        }

        const isMoving = Math.hypot(inputX, inputZ) > 0.1;

        if (isMoving && !this.player.char3D.isAttacking) {
            const camYaw = this.engine.cameraYaw;
            const moveAngle = Math.atan2(inputX, inputZ) + camYaw;

            const speed = this.player.speed * (this.player.char3D.isDodging ? 2.2 : 1.0);
            const moveX = Math.sin(moveAngle) * speed * delta;
            const moveZ = Math.cos(moveAngle) * speed * delta;

            const nextX = this.player.pos.x + moveX;
            const nextZ = this.player.pos.z + moveZ;

            if (!this.world.checkCollision(nextX, this.player.pos.z, 0.6)) {
                this.player.pos.x = nextX;
            }
            if (!this.world.checkCollision(this.player.pos.x, nextZ, 0.6)) {
                this.player.pos.z = nextZ;
            }

            this.player.rotY = moveAngle;
            this.player.moveDir.set(Math.sin(moveAngle), 0, Math.cos(moveAngle));
        } else if (this.engine.isPointerLocked && !this.player.char3D.isDodging) {
            // In Dragon Nest pointer lock mode, player naturally faces crosshair direction when idle/aiming
            this.player.rotY = this.engine.cameraYaw + Math.PI;
            this.player.moveDir.set(Math.sin(this.player.rotY), 0, Math.cos(this.player.rotY));
        }

        // Update 3D Character Rig
        this.player.char3D.group.position.copy(this.player.pos);
        this.player.char3D.group.rotation.y = this.player.rotY;
        this.player.char3D.update(delta, isMoving, 1.0);

        // Tech Genius Lv.75 Passive: Advance Medicine (Heals shielded player for 10% INT/sec)
        const pClass = this.player.baseStats?.playerClass || '';
        if (pClass === 'Tech Genius' && this.player.level >= 75 && (this.player.shieldHp || 0) > 0) {
            this.medTimer = (this.medTimer || 0) + delta;
            if (this.medTimer >= 1.5) {
                this.medTimer = 0;
                const heal = Math.max(2, Math.floor((this.player.baseStats.int || 10) * 0.10));
                if (this.player.hp < this.player.maxHp) {
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                    this.combat.spawnFloatingDamage(this.player.pos, `+${heal} HP (Med)`, false, true);
                    this.ui.updatePlayerHUD(this.player);
                }
            }
        }

        // 2. Update Monsters AI, Respawn Timers & Combat
        if (this.tavernTimerActive && this.currentMapId === 'trainingtavern') {
            const elapsedSec = (performance.now() - (this.tavernStartTime || performance.now())) * 0.001;
            this.ui.updateTavernTimer(elapsedSec, true);
        }

        for (const m of this.monsters) {
            // Always update monster so dead monsters tick down their 2D respawn timer & floating countdown UI!
            m.update(delta, this.player.pos);
            if (!m.isAlive) continue;

            // Dynamic Boss BGM shift when approaching Floor Boss / World Boss
            if (m.category === 'floor_boss' && this.currentMapId.startsWith('floor') && this.currentMapId !== 'floor10') {
                const distToBoss = this.player.pos.distanceTo(m.group.position);
                if (distToBoss < 28 && this.audio.currentTrackName !== 'bossfight') {
                    this.audio.playBgm('bossfight');
                }
            }

            // Monster attacks player if in melee range
            if (m.state === 'attack') {
                m.attackCooldown -= delta;
                if (m.attackCooldown <= 0) {
                    m.attackCooldown = 1.4;
                    // 1. Dodge invulnerability check (i-frames)
                    if (this.player.isInvulnerable) {
                        this.combat.spawnFloatingDamage(this.player.pos, "DODGED!", false, true);
                        continue;
                    }
                    // 2. Ninja Assassin Smoke Bomb (75% miss) & Agility (25% / 35% dodge)
                    if (this.player.smokeBombActive && Math.random() < 0.75) {
                        this.combat.spawnFloatingDamage(this.player.pos, "MISS (SMOKE)!", false, true);
                        continue;
                    }
                    if (pClass === 'Ninja Assassin' && this.player.level >= 25) {
                        const dodgeChance = this.player.level >= 75 ? 0.35 : 0.25;
                        if (Math.random() < dodgeChance) {
                            this.combat.spawnFloatingDamage(this.player.pos, "AGILITY DODGE!", false, true);
                            continue;
                        }
                    }
                    // 3. Blademaster Parry (70% chance to parry incoming attack)
                    if (this.player.isParrying && Math.random() < 0.70) {
                        this.combat.spawnFloatingDamage(this.player.pos, "⚔️ PARRIED!", true, true);
                        this.engine.spawnHitSparks(this.player.pos, 0x00e5ff, 12);
                        continue;
                    }

                    let dmg = Math.max(1, m.atk - this.player.def);

                    // 4. Berserker Lv.75 Passive: I love PAIN (15% chance to heal 1/3 of incoming damage)
                    if (pClass === 'Berserker' && this.player.level >= 75 && Math.random() < 0.15) {
                        const painHeal = Math.max(2, Math.floor(dmg / 3));
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + painHeal);
                        this.combat.spawnFloatingDamage(this.player.pos, `+${painHeal} (I LOVE PAIN!)`, true, true);
                        this.ui.updatePlayerHUD(this.player);
                        continue;
                    }

                    // 5. Tech Genius Gamma Shield absorption
                    if ((this.player.shieldHp || 0) > 0) {
                        const absorbed = Math.min(this.player.shieldHp, dmg);
                        this.player.shieldHp -= absorbed;
                        dmg -= absorbed;
                        if (this.player.shieldHp <= 0) {
                            this.destroyPlayerShieldVFX();
                        } else {
                            this.combat.spawnFloatingDamage(this.player.pos, `SHIELD (${this.player.shieldHp})`, false, true);
                        }
                        if (dmg <= 0) {
                            continue;
                        }
                    }

                    this.player.hp = Math.max(this.player.isImmortal ? 1 : 0, this.player.hp - dmg);
                    this.audio.playSfx(m.getAttackSfx ? m.getAttackSfx() : 'bump');
                    this.combat.spawnFloatingDamage(this.player.pos, `-${dmg}`, false);
                    this.engine.addScreenshake(0.3);
                    this.ui.updatePlayerHUD(this.player);

                    if (this.player.hp <= 0) {
                        this.player.hp = 0;
                        this.isGhost = true;
                        this.audio.playSfx('bump');
                        this.ui.updatePlayerHUD(this.player);
                        this.ui.showDeathScreen(this.hasRevivalJuice());
                        break;
                    }
                }
            }
        }

        // 3. Update Boss Health Bar (Only show when boss has been attacked / engaged!)
        if (this.bossEngaged && this.floorBoss && this.floorBoss.isAlive) {
            this.ui.updateBossHealth(this.floorBoss);
        } else {
            this.ui.updateBossHealth(null);
        }

        // 4. Check World Portals
        this.checkPortalCollision();

        // 5. Update Local Player Overhead UI
        if (this.player.char3D && this.player.char3D.updateOverheadUI) {
            this.player.char3D.updateOverheadUI(this.player.name, this.player.level, this.player.hp, this.player.maxHp, true);
        }

        // 6. Update Remote Players & Multiplayer Sync
        this.updateRemotePlayers(delta);

        if (this.socket && this.socket.connected) {
            this._moveEmitTimer = (this._moveEmitTimer || 0) + delta;
            if (this._moveEmitTimer >= 0.05) {
                this._moveEmitTimer = 0;
                this.socket.emit('playerMove', {
                    x: this.player.pos.x,
                    y: this.player.pos.y,
                    z: this.player.pos.z,
                    rotY: this.player.rotY,
                    anim: isMoving ? 'walk' : 'idle',
                    hp: this.player.hp,
                    maxHp: this.player.maxHp
                });
            }
        }

        // 7. Update Systems & 15-Minute Day/Night Cycle Rotation
        const isTown = this.currentMapId === 'town';
        const dayNight = this.engine.updateDayNightCycle(delta, isTown);
        if (this.ui && this.ui.updateDayNightIndicator) {
            this.ui.updateDayNightIndicator(dayNight);
        }

        this.world.update(delta, this.player.pos);
        this.combat.update(delta, this.player, this.monsters, (deadMob) => {
            this.onMonsterDefeated(deadMob);
        });
        this.engine.updateParticles(delta);
        this.engine.updateCamera(this.player.pos, delta);

        // 8. Render Minimap
        this.ui.renderMinimap(this.player.pos, this.player.rotY, this.monsters, this.world.portals);

        // 9. Render 3D Scene
        this.engine.render();
    }
}

// Start Game reliably whether DOMContentLoaded has already fired or not
function initGame() {
    if (!window.game) {
        window.game = new GameApp();
        window.gameInstance = window.game;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
