import * as THREE from 'three';
import { Character3D } from './character3d.js';

export class FlowManager {
    constructor(callbacks = {}) {
        this.onComplete = callbacks.onComplete;
        this.charData = {
            name: 'Aria',
            gender: 'female',
            hairStyle: '1',
            hairColor: '#111111',
            skinColor: '#f5c6a5',
            className: 'Blademaster',
            weaponType: 'sword'
        };

        this.dialogueIndex = 0;
        this.previewChar = null;

        this.initDOM();
        this.init3DPreview();
    }

    initDOM() {
        // Screens
        this.scrSplash = document.getElementById('scr-splash');
        this.splashStudio = document.getElementById('splash-studio');
        this.splashCredits = document.getElementById('splash-credits');
        this.btnSplashSkip = document.getElementById('splash-skip');

        this.scrAuth = document.getElementById('auth-screen');
        this.btnLogin = document.getElementById('btn-login');
        this.btnGuest = document.getElementById('btn-guest');
        this.btnRegister = document.getElementById('btn-register');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.linkToReg = document.getElementById('link-to-register');
        this.linkToLog = document.getElementById('link-to-login');
        this.inputUser = document.getElementById('login-user');

        this.scrCreation = document.getElementById('creation-screen');
        this.btnFinishCreation = document.getElementById('btn-finish-creation');
        this.inputCharName = document.getElementById('input-char-name');

        this.scrPrologue = document.getElementById('prologue-screen');
        this.prologueBg = document.getElementById('prologue-bg');
        this.bedroomVfx = document.getElementById('prologue-bedroom-vfx');
        this.voidVfx = document.getElementById('prologue-void-vfx');
        this.prologueBox = document.getElementById('prologue-dialogue-box');
        this.prologueSpeaker = document.getElementById('prologue-speaker');
        this.prologueText = document.getElementById('prologue-text');
        this.btnPrologueNext = document.getElementById('btn-prologue-next');
        this.btnPrologueSkip = document.getElementById('btn-prologue-skip');

        this.bindEvents();
    }

    init3DPreview() {
        const previewCol = document.querySelector('.customizer-preview-col');
        if (!previewCol) return;

        this.previewScene = new THREE.Scene();
        this.previewScene.background = new THREE.Color(0x0c1020);

        this.previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        this.previewCamera.position.set(0, 1.3, 3.8);

        this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.previewRenderer.setSize(280, 340);
        this.previewRenderer.shadowMap.enabled = true;
        this.previewRenderer.domElement.id = 'char-preview-canvas';
        previewCol.appendChild(this.previewRenderer.domElement);

        const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.previewScene.add(ambLight);

        const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
        dirLight.position.set(3, 5, 4);
        this.previewScene.add(dirLight);

        this.previewChar = new Character3D(this.charData);
        this.previewScene.add(this.previewChar.group);

        const animate = () => {
            requestAnimationFrame(animate);
            if (this.previewChar) {
                this.previewChar.update(0.016, false);
                this.previewChar.group.rotation.y += 0.008;
            }
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        };
        animate();
    }

    bindEvents() {
        // 1. Splash Screen Skip
        if (this.btnSplashSkip) {
            this.btnSplashSkip.addEventListener('click', () => this.endSplash());
        }

        // 2. Auth Login & Guest & Register Toggle
        if (this.btnLogin) {
            this.btnLogin.addEventListener('click', () => {
                const username = this.inputUser.value.trim() || 'Aria';
                this.onAuthSuccess(username);
            });
        }
        if (this.btnGuest) {
            this.btnGuest.addEventListener('click', () => {
                const guestName = 'Hero_' + Math.floor(1000 + Math.random() * 9000);
                this.onAuthSuccess(guestName);
            });
        }
        if (this.btnRegister) {
            this.btnRegister.addEventListener('click', () => {
                const regUser = document.getElementById('reg-user').value.trim() || 'HeroPlayer';
                this.onAuthSuccess(regUser);
            });
        }
        if (this.linkToReg) {
            this.linkToReg.addEventListener('click', () => {
                this.loginForm.style.display = 'none';
                this.registerForm.style.display = 'block';
            });
        }
        if (this.linkToLog) {
            this.linkToLog.addEventListener('click', () => {
                this.registerForm.style.display = 'none';
                this.loginForm.style.display = 'block';
            });
        }

        // 3. Character Creation Controls
        document.querySelectorAll('#gender-pills .pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#gender-pills .pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.charData.gender = btn.dataset.gender;
                this.updatePreview();
            });
        });

        document.querySelectorAll('#hair-pills .pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#hair-pills .pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.charData.hairStyle = btn.dataset.hair;
                this.updatePreview();
            });
        });

        document.querySelectorAll('#hair-swatches .swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                document.querySelectorAll('#hair-swatches .swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                this.charData.hairColor = sw.dataset.color;
                this.updatePreview();
            });
        });

        document.querySelectorAll('#skin-swatches .swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                document.querySelectorAll('#skin-swatches .swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                this.charData.skinColor = sw.dataset.color;
                this.updatePreview();
            });
        });

        document.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.class-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.charData.className = card.dataset.class;
                const weapons = {
                    Blademaster: 'sword',
                    Berserker: 'sword',
                    Icemaster: 'staff',
                    Healer: 'staff',
                    Summoner: 'touchpad'
                };
                this.charData.weaponType = weapons[this.charData.className] || 'sword';
                this.updatePreview();
            });
        });

        if (this.btnFinishCreation) {
            this.btnFinishCreation.addEventListener('click', () => {
                if (this.inputCharName && this.inputCharName.value.trim()) {
                    this.charData.name = this.inputCharName.value.trim();
                }
                this.onCreationFinished();
            });
        }

        // 4. Story Prologue Controls
        if (this.btnPrologueNext) {
            this.btnPrologueNext.addEventListener('click', (e) => {
                e.stopPropagation();
                this.advanceDialogue();
            });
        }
        if (this.btnPrologueSkip) {
            this.btnPrologueSkip.addEventListener('click', (e) => {
                e.stopPropagation();
                this.endPrologue();
            });
        }
        if (this.prologueBox) {
            this.prologueBox.addEventListener('click', () => {
                this.advanceDialogue();
            });
        }

        // Keyboard navigation (Space/Enter to advance dialogue)
        window.addEventListener('keydown', (e) => {
            if (!this.scrPrologue.classList.contains('hidden')) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.advanceDialogue();
                }
            }
        });
    }

    updatePreview() {
        if (!this.previewChar) return;
        this.previewChar.setCustomization(this.charData);
    }

    // ==========================================
    // STAGE 1: SPLASH SCREEN (CIRCUIT SIEGE STYLE)
    // ==========================================
    start() {
        this.scrSplash.classList.remove('hidden');

        // Stage 1a: Studio Logo & Presents for 2.2s
        this.splashTimer1 = setTimeout(() => {
            if (this.splashEnded) return;
            this.splashStudio.classList.remove('show');
            this.splashCredits.classList.add('show');

            // Stage 1b: Production Credits for 3.5s
            this.splashTimer2 = setTimeout(() => {
                this.endSplash();
            }, 3500);
        }, 2200);
    }

    endSplash() {
        if (this.splashEnded) return;
        this.splashEnded = true;
        clearTimeout(this.splashTimer1);
        clearTimeout(this.splashTimer2);

        this.scrSplash.classList.add('hidden');
        this.showAuth();
    }

    // ==========================================
    // STAGE 2: 2D EXONIE LOGIN SCREEN
    // ==========================================
    showAuth() {
        this.scrAuth.classList.remove('hidden');
    }

    onAuthSuccess(username) {
        this.scrAuth.classList.add('hidden');
        this.charData.name = username;
        if (this.inputCharName) this.inputCharName.value = username;
        this.showCharacterCreation();
    }

    // ==========================================
    // STAGE 3: CHARACTER CREATION (FORGING AVATAR)
    // ==========================================
    showCharacterCreation() {
        this.scrCreation.classList.remove('hidden');
        this.updatePreview();
    }

    onCreationFinished() {
        this.scrCreation.classList.add('hidden');
        this.startPrologue();
    }

    // ==========================================
    // STAGE 4: STORY PROLOGUE DIALOGUE
    // ==========================================
    startPrologue() {
        this.scrPrologue.classList.remove('hidden');

        this.dialogues = [
            // Bedroom scene
            {
                scene: 'bedroom',
                speaker: this.charData.name,
                text: "11:58 PM... Another exhausting day in the real world is finally over."
            },
            {
                scene: 'bedroom',
                speaker: this.charData.name,
                text: "I just shut down my work laptop. My head is throbbing, and my eyelids feel like lead..."
            },
            {
                scene: 'bedroom',
                speaker: this.charData.name,
                text: "I just want to rest... even if it's just a few hours of peace... *yawns*"
            },
            // Sleep transition
            {
                scene: 'sleep',
                speaker: 'Narrator',
                text: "*Your eyes close... The room fades to silence as you drift into a deep slumber... Zzz...*"
            },
            // Void awakening
            {
                scene: 'void',
                speaker: 'Mysterious Whisper',
                text: `Awaken, ${this.charData.name}... wandering soul from beyond the veil...`
            },
            {
                scene: 'void',
                speaker: 'Mysterious Whisper',
                text: "While you slumbered, your consciousness was pulled through the dimensional rift into the world of Exonie."
            },
            {
                scene: 'void',
                speaker: 'Mysterious Whisper',
                text: "The doorway back to your real world has been sealed shut at the pinnacle of the world: The 100th Floor of the Infinite Spire."
            },
            {
                scene: 'void',
                speaker: 'Mysterious Whisper',
                text: "In order to return home to the real world, you must conquer the 100th floor. Slay the guardian lords, claim the Gatekeeper's Key, and break the seal."
            },
            {
                scene: 'void',
                speaker: 'Mysterious Whisper',
                text: `Rise, ${this.charData.name}... Take up your weapon and conquer the Tower of Exonie!`
            }
        ];

        this.dialogueIndex = 0;
        this.renderDialogue();
    }

    renderDialogue() {
        const d = this.dialogues[this.dialogueIndex];
        if (!d) {
            this.endPrologue();
            return;
        }

        this.prologueSpeaker.textContent = d.speaker;
        this.prologueText.textContent = d.text;

        // Change background and elements based on scene
        if (d.scene === 'bedroom') {
            this.prologueBg.className = 'bg-bedroom';
            this.bedroomVfx.style.display = 'block';
            this.voidVfx.style.display = 'none';
        } else if (d.scene === 'sleep') {
            this.prologueBg.className = 'bg-sleep';
            this.bedroomVfx.style.display = 'none';
            this.voidVfx.style.display = 'none';
        } else if (d.scene === 'void') {
            this.prologueBg.className = 'bg-void';
            this.bedroomVfx.style.display = 'none';
            this.voidVfx.style.display = 'block';
        }
    }

    advanceDialogue() {
        this.dialogueIndex++;
        if (this.dialogueIndex < this.dialogues.length) {
            this.renderDialogue();
        } else {
            this.endPrologue();
        }
    }

    endPrologue() {
        this.scrPrologue.classList.add('hidden');
        if (this.onComplete) {
            this.onComplete(this.charData);
        }
    }
}
