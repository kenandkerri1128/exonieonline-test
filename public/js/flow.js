// ============================================================
// EXONIE 3D REMASTERED - BULLETPROOF FLOW MANAGER
// Handles Splash Credits -> Login -> Character Creation -> Story Prologue -> Game
// ============================================================

window.ExonieFlow = {
    step: 'splash_studio', // 'splash_studio', 'splash_credits', 'auth', 'char_select', 'creation', 'prologue', 'game'
    accountName: 'HeroPlayer',
    activeSlotIndex: 0,
    charData: {
        name: 'Aria',
        gender: 'female',
        hairStyle: '1',
        hairColor: '#111111',
        skinColor: '#f5c6a5',
        className: null,
        playerClass: null,
        weaponType: null
    },
    dialogueIndex: 0,
    splashTimer: null,
    previewInitialized: false,
    typewriterTimer: null,
    isTyping: false,
    currentFullText: '',
    audioCtx: null,
    menuBgm: null,

    init() {
        console.log('🛡️ [EXONIE 3D] Flow Manager initialized');
        this.cacheDOM();
        this.bindEvents();
        window.showLoadingTransition = (title, subtitle, durationMs, onMidpoint) => {
            this.showLoadingTransition(title, subtitle, durationMs, onMidpoint);
        };
        this.startSplash();
    },

    // ============================================================
    // AUTHENTIC 2D LOGIN / MENU MUSIC (music/loginmenu.mp3)
    // ============================================================
    playMenuMusic() {
        if (this.step === 'game') return;
        try {
            if (window.game && window.game.audio && window.game.audio.currentBgm) {
                window.game.audio.currentBgm.pause();
                window.game.audio.currentBgm = null;
            }
            if (!this.menuBgm) {
                this.menuBgm = new Audio('music/loginmenu.mp3');
                this.menuBgm.loop = true;
                this.menuBgm.volume = 0.42;
            }
            if (this.menuBgm.paused) {
                this.menuBgm.play().catch(() => {});
            }
        } catch (e) {}
    },

    stopMenuMusic() {
        try {
            if (this.menuBgm) {
                this.menuBgm.pause();
                this.menuBgm.currentTime = 0;
            }
        } catch (e) {}
    },

    // ============================================================
    // GLOBAL LOADING / MAP TRANSITION SCREEN (2D PICTURE LOADINGSCREEN.PNG)
    // ============================================================
    showLoadingTransition(title = 'Loading Realm...', subtitle = 'Preparing 3D World...', durationMs = 1350, onMidpoint = null) {
        const screen = document.getElementById('map-transition-screen');
        const titleEl = document.getElementById('transition-title');
        const subEl = document.getElementById('transition-subtitle');
        const fillEl = document.getElementById('transition-bar-fill');

        if (!screen) {
            if (onMidpoint) onMidpoint();
            return;
        }

        const effectiveDuration = Math.max(1250, durationMs || 1350);
        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (fillEl) {
            fillEl.style.transition = 'none';
            fillEl.style.width = '4%';
        }

        screen.style.display = 'flex';
        // Force synchronous reflow so the picture loading screen and progress bar animate smoothly
        void screen.offsetWidth;
        screen.classList.add('active');
        if (fillEl) {
            fillEl.style.transition = `width ${Math.floor(effectiveDuration * 0.82)}ms cubic-bezier(0.22, 1, 0.36, 1)`;
            fillEl.style.width = '100%';
        }

        clearTimeout(this._loadingMidTimer);
        clearTimeout(this._loadingEndTimer);

        this._loadingMidTimer = setTimeout(() => {
            if (onMidpoint) onMidpoint();
        }, Math.floor(effectiveDuration * 0.46));

        this._loadingEndTimer = setTimeout(() => {
            screen.classList.remove('active');
            setTimeout(() => {
                if (!screen.classList.contains('active')) {
                    screen.style.display = 'none';
                }
            }, 340);
        }, effectiveDuration);
    },

    // Synthesized RPG Dialogue Typing Sound Effect (Web Audio API)
    playTypingBlip(speaker = '') {
        try {
            if (!this.audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) return;
                this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            if (speaker.includes('Whisper')) {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(340 + (Math.random() * 60 - 30), now);
            } else if (speaker.includes('Narrator')) {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440 + (Math.random() * 40 - 20), now);
            } else {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(560 + (Math.random() * 70 - 35), now);
            }

            const masterVol = (window.game && window.game.audio) ? window.game.audio.masterVolume : 0.7;
            const vol = Math.max(0.01, 0.045 * masterVol);
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.036);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.038);
        } catch (e) {
            // Ignore audio context restrictions if not yet interacted
        }
    },

    cacheDOM() {
        this.scrSplash = document.getElementById('scr-splash');
        this.splashStudio = document.getElementById('splash-studio');
        this.splashCredits = document.getElementById('splash-credits');

        this.scrAuth = document.getElementById('auth-screen');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.inputUser = document.getElementById('login-user');

        this.scrCharSelect = document.getElementById('char-select-screen');
        this.charSlotsGrid = document.getElementById('char-slots-grid');
        this.charSelectAccountName = document.getElementById('char-select-account-name');

        this.scrCreation = document.getElementById('creation-screen');
        this.inputCharName = document.getElementById('input-char-name');

        this.scrPrologue = document.getElementById('prologue-screen');
        this.prologueBg = document.getElementById('prologue-bg');
        this.bedroomVfx = document.getElementById('prologue-bedroom-vfx');
        this.voidVfx = document.getElementById('prologue-void-vfx');
        this.prologueSpeaker = document.getElementById('prologue-speaker');
        this.prologueText = document.getElementById('prologue-text');
    },

    bindEvents() {
        // Start loginmenu.mp3 on first interaction while in menus
        const resumeMenuAudio = () => {
            if (this.step !== 'game') {
                this.playMenuMusic();
            }
        };
        window.addEventListener('click', resumeMenuAudio);
        window.addEventListener('keydown', resumeMenuAudio);
        window.addEventListener('touchstart', resumeMenuAudio);

        // Keyboard navigation for dialogue (Space/Enter)
        window.addEventListener('keydown', (e) => {
            if (this.step === 'splash_studio' || this.step === 'splash_credits') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.skipSplash();
                }
            } else if (this.step === 'prologue') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.advanceDialogue();
                }
            }
        });
    },

    // ============================================================
    // 1. AUTHENTIC 2D PICTURE LOADING SCREEN ON STARTUP
    // ============================================================
    startSplash() {
        if (!this.scrSplash) this.cacheDOM();
        if (this.scrSplash) {
            this.scrSplash.classList.add('hidden');
            this.scrSplash.style.display = 'none';
        }
        this.step = 'splash';
        this.showLoadingTransition('Exonie Online', 'Loading 3D Remastered...', 2200, () => {
            this.showAuth();
        });
    },

    showCredits() {
        this.skipSplash();
    },

    skipSplash() {
        clearTimeout(this.splashTimer);
        if (this.scrSplash) {
            this.scrSplash.classList.add('hidden');
            this.scrSplash.style.display = 'none';
        }
        this.showAuth();
    },

    // ============================================================
    // 2. 2D EXONIE LOGIN SCREEN
    // ============================================================
    showAuth() {
        this.step = 'auth';
        if (!this.scrAuth) this.cacheDOM();
        if (this.scrAuth) {
            this.scrAuth.style.display = 'flex';
            this.scrAuth.classList.remove('hidden');
        }
        this.playMenuMusic();
    },

    switchAuth(mode) {
        if (!this.loginForm || !this.registerForm) this.cacheDOM();
        if (mode === 'register') {
            this.loginForm.style.display = 'none';
            this.registerForm.style.display = 'block';
        } else {
            this.registerForm.style.display = 'none';
            this.loginForm.style.display = 'block';
        }
    },

    attemptLogin() {
        const username = (this.inputUser && this.inputUser.value.trim()) ? this.inputUser.value.trim() : 'Aria';
        this.onAuthSuccess(username);
    },

    loginAsGuest() {
        const guestName = 'Hero_' + Math.floor(1000 + Math.random() * 9000);
        this.onAuthSuccess(guestName);
    },

    attemptRegister() {
        const regInput = document.getElementById('reg-user');
        const username = (regInput && regInput.value.trim()) ? regInput.value.trim() : 'HeroPlayer';
        this.onAuthSuccess(username);
    },

    onAuthSuccess(username) {
        console.log(`🛡️ [EXONIE 3D] Logged in as: ${username}`);
        this.accountName = username;
        this.charData.name = username;
        if (this.inputCharName) this.inputCharName.value = username;

        this.showLoadingTransition('Character Selection', `Account: ${username} (3 Character Slots)`, 900, () => {
            if (this.scrAuth) {
                this.scrAuth.classList.add('hidden');
                this.scrAuth.style.display = 'none';
            }
            this.showCharSelect();
        });
    },

    // ============================================================
    // 2B. 3-SLOT ACCOUNT CHARACTER STORAGE & SELECTION
    // ============================================================
    getAccountStorageKey() {
        return `exonie3d_chars_${(this.accountName || 'HeroPlayer').toLowerCase()}`;
    },

    getAccountSlots() {
        try {
            const raw = localStorage.getItem(this.getAccountStorageKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length === 3) return parsed;
            }
        } catch (e) {}
        return [null, null, null];
    },

    saveAccountSlots(slots) {
        try {
            localStorage.setItem(this.getAccountStorageKey(), JSON.stringify(slots));
        } catch (e) {}
    },

    saveActiveCharacterState(stateObj) {
        if (!stateObj) return;
        const slots = this.getAccountSlots();
        const idx = Math.max(0, Math.min(2, Number(this.activeSlotIndex) || 0));
        slots[idx] = stateObj;
        this.saveAccountSlots(slots);
    },

    showCharSelect() {
        this.step = 'char_select';
        if (!this.scrCharSelect) this.cacheDOM();
        if (this.charSelectAccountName) this.charSelectAccountName.textContent = this.accountName;
        this.renderCharSlots();
        if (this.scrCharSelect) {
            this.scrCharSelect.style.display = 'flex';
            this.scrCharSelect.classList.remove('hidden');
        }
        this.playMenuMusic();
    },

    renderCharSlots() {
        if (!this.charSlotsGrid) this.cacheDOM();
        if (!this.charSlotsGrid) return;
        const slots = this.getAccountSlots();
        this.charSlotsGrid.innerHTML = '';

        for (let i = 0; i < 3; i++) {
            const c = slots[i];
            const card = document.createElement('div');
            card.className = 'char-slot-card';
            if (c) {
                const cls = c.playerClass || c.className || 'Novice';
                const lvl = c.level || 1;
                const gnd = (c.gender === 'male') ? 'Male' : 'Female';
                const gold = (c.gold !== undefined) ? c.gold : 500;
                card.innerHTML = `
                    <div class="char-slot-badge">CHARACTER SLOT ${i + 1}</div>
                    <div style="font-size:2.4rem; margin:4px 0;">${c.gender === 'male' ? '🗡️' : '⚔️'}</div>
                    <div class="char-slot-name">${c.name || 'Hero'}</div>
                    <div class="char-slot-meta">
                        <strong style="color:#ffd700;">Lv. ${lvl}</strong> · <span style="color:#4ade80;">${cls}</span><br>
                        <span>${gnd} · 🪙 ${Number(gold).toLocaleString()} Gold</span>
                    </div>
                    <div class="char-slot-actions">
                        <button class="btn-item-action" style="flex:1; background:#22c55e; color:#000; font-weight:900; padding:9px;" onclick="window.ExonieFlow.selectExistingCharacter(${i})">▶ Play</button>
                        <button class="btn-item-action" style="background:#ef4444; padding:9px 12px;" title="Delete Character" onclick="window.ExonieFlow.deleteCharacterSlot(${i})">🗑️</button>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="char-slot-badge">CHARACTER SLOT ${i + 1}</div>
                    <div style="font-size:2.5rem; opacity:0.45; margin:10px 0;">➕</div>
                    <div class="char-slot-name" style="color:#94a3b8;">Empty Slot</div>
                    <div class="char-slot-meta">Create a new character on this account slot.</div>
                    <div class="char-slot-actions">
                        <button class="btn-item-action" style="flex:1; background:#0284c7; font-weight:800; padding:10px;" onclick="window.ExonieFlow.startNewCharacterInSlot(${i})">+ Create Character</button>
                    </div>
                `;
            }
            this.charSlotsGrid.appendChild(card);
        }
    },

    startNewCharacterInSlot(slotIdx) {
        this.activeSlotIndex = slotIdx;
        this.charData = {
            name: slotIdx === 0 ? this.accountName : `${this.accountName}_${slotIdx + 1}`,
            gender: 'female',
            hairStyle: '1',
            hairColor: '#111111',
            skinColor: '#f5c6a5',
            className: null,
            playerClass: null,
            weaponType: null,
            slotIndex: slotIdx,
            isNewCharacter: true
        };
        if (this.inputCharName) this.inputCharName.value = this.charData.name;
        this.updateHairButtonsForGender('female');

        this.showLoadingTransition('Forging Avatar', `Slot ${slotIdx + 1} — Initializing 3D Character Studio...`, 900, () => {
            if (this.scrCharSelect) {
                this.scrCharSelect.classList.add('hidden');
                this.scrCharSelect.style.display = 'none';
            }
            this.showCreation();
        });
    },

    selectExistingCharacter(slotIdx) {
        const slots = this.getAccountSlots();
        const savedChar = slots[slotIdx];
        if (!savedChar) return;
        this.activeSlotIndex = slotIdx;
        this.charData = Object.assign({}, savedChar, { slotIndex: slotIdx, isNewCharacter: false });
        this.step = 'game';
        this.stopMenuMusic();

        this.showLoadingTransition('Town of Exonie', `Welcome back, ${savedChar.name} (Lv.${savedChar.level || 1})!`, 1350, () => {
            if (this.scrCharSelect) {
                this.scrCharSelect.classList.add('hidden');
                this.scrCharSelect.style.display = 'none';
            }
            const tryLaunch = () => {
                if (window.launchExonieGame) {
                    window.launchExonieGame(this.charData);
                } else {
                    setTimeout(tryLaunch, 100);
                }
            };
            tryLaunch();
        });
    },

    deleteCharacterSlot(slotIdx) {
        const slots = this.getAccountSlots();
        if (!slots[slotIdx]) return;
        slots[slotIdx] = null;
        this.saveAccountSlots(slots);
        this.renderCharSlots();
    },

    logoutToAuth() {
        if (this.scrCharSelect) {
            this.scrCharSelect.classList.add('hidden');
            this.scrCharSelect.style.display = 'none';
        }
        this.showAuth();
    },

    openCharSelectFromGame() {
        if (window.game && window.game.saveCharacterToAccountSlot) {
            window.game.saveCharacterToAccountSlot();
        }
        this.showLoadingTransition('Character Selection', 'Saving Progress & Returning to Character Slots...', 950, () => {
            const hud = document.getElementById('game-hud');
            if (hud) hud.style.display = 'none';
            document.querySelectorAll('.game-modal').forEach(m => { m.style.display = 'none'; });
            this.showCharSelect();
        });
    },

    // ============================================================
    // 3. CHARACTER CREATION SCREEN (FORGING AVATAR)
    // ============================================================
    showCreation() {
        this.step = 'creation';
        if (!this.scrCreation) this.cacheDOM();
        if (this.scrCreation) {
            this.scrCreation.style.display = 'flex';
            this.scrCreation.classList.remove('hidden');
        }

        this.updateHairButtonsForGender(this.charData.gender || 'female');
        // Lazy-load live 3D preview on the pedestal (with retry if game.js is still loading)
        this.initCharacterPreview();
        this.triggerPreviewUpdate();
    },

    updateHairButtonsForGender(gender) {
        const femaleLabels = [
            '1: Twin Tails',
            '2: Long Flowing',
            '3: Hime Bob',
            '4: High Ponytail',
            '5: Empress Buns'
        ];
        const maleLabels = [
            '1: Hero Spikes',
            '2: Royal Quiff',
            '3: Wolf-Tail',
            '4: Tactical Crop',
            '5: Parted Curtains'
        ];
        const labels = (gender === 'male') ? maleLabels : femaleLabels;
        for (let i = 1; i <= 5; i++) {
            const btn = document.getElementById(`hair-btn-${i}`);
            if (btn) btn.textContent = labels[i - 1];
        }
    },

    initCharacterPreview() {
        if (this.previewInitialized) return;

        try {
            if (window.initCustomizer3D) {
                this.previewInitialized = true;
                window.initCustomizer3D(this.charData);
            } else {
                // Retry every 100ms until ready
                setTimeout(() => this.initCharacterPreview(), 100);
            }
        } catch (e) {
            console.warn('3D preview retry:', e);
            setTimeout(() => this.initCharacterPreview(), 200);
        }
    },

    setGender(gender, element) {
        this.charData.gender = gender;
        document.querySelectorAll('#gender-pills .pill-btn').forEach(b => b.classList.remove('active'));
        if (element) element.classList.add('active');
        this.updateHairButtonsForGender(gender);
        this.triggerPreviewUpdate();
    },

    setHairStyle(style, element) {
        this.charData.hairStyle = style;
        document.querySelectorAll('#hair-pills .pill-btn').forEach(b => b.classList.remove('active'));
        if (element) element.classList.add('active');
        this.triggerPreviewUpdate();
    },

    setHairColor(color, element) {
        this.charData.hairColor = color;
        document.querySelectorAll('#hair-swatches .swatch').forEach(s => s.classList.remove('active'));
        if (element) element.classList.add('active');
        this.triggerPreviewUpdate();
    },

    setSkinColor(color, element) {
        this.charData.skinColor = color;
        document.querySelectorAll('#skin-swatches .swatch').forEach(s => s.classList.remove('active'));
        if (element) element.classList.add('active');
        this.triggerPreviewUpdate();
    },

    setClass(className, element) {
        this.charData.className = className;
        const weapons = {
            Blademaster: 'sword',
            Berserker: 'sword',
            Icemaster: 'staff',
            Healer: 'staff',
            Summoner: 'touchpad'
        };
        this.charData.weaponType = weapons[className] || 'sword';

        document.querySelectorAll('.class-card').forEach(c => c.classList.remove('active'));
        if (element) element.classList.add('active');
        this.triggerPreviewUpdate();
    },

    triggerPreviewUpdate() {
        if (window.updateCustomizerPreview) {
            window.updateCustomizerPreview(this.charData);
        }
    },

    finishCreation() {
        if (this.inputCharName && this.inputCharName.value.trim()) {
            this.charData.name = this.inputCharName.value.trim();
        }

        console.log('🛡️ [EXONIE 3D] Character creation finished:', this.charData);

        this.showLoadingTransition('Entering Story Prologue', '11:58 PM — The Night Before the Rift...', 950, () => {
            if (this.scrCreation) {
                this.scrCreation.classList.add('hidden');
                this.scrCreation.style.display = 'none';
            }
            this.startPrologue();
        });
    },

    // ============================================================
    // 4. STORY PROLOGUE DIALOGUE (BEDROOM -> SLEEP -> VOID)
    // ============================================================
    startPrologue() {
        this.step = 'prologue';
        if (!this.scrPrologue) this.cacheDOM();
        if (this.scrPrologue) {
            this.scrPrologue.style.display = 'flex';
            this.scrPrologue.classList.remove('hidden');
        }

        this.dialogues = [
            // Act 1: Real-World Bedroom
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
            // Act 2: Drifting into Sleep
            {
                scene: 'sleep',
                speaker: 'Narrator',
                text: "*Your eyes close... The room fades to silence as you drift into a deep slumber... Zzz...*"
            },
            // Act 3: The Void of Exonie & The 100th Floor Goal
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
    },

    renderDialogue() {
        clearInterval(this.typewriterTimer);
        const d = this.dialogues[this.dialogueIndex];
        if (!d) {
            this.skipPrologue();
            return;
        }

        if (this.prologueSpeaker) this.prologueSpeaker.textContent = d.speaker;
        this.currentFullText = d.text;
        this.isTyping = true;

        if (this.prologueText) {
            this.prologueText.textContent = '';
            let charIdx = 0;
            this.typewriterTimer = setInterval(() => {
                if (charIdx < this.currentFullText.length) {
                    const ch = this.currentFullText[charIdx];
                    this.prologueText.textContent += ch;
                    if (ch !== ' ' && charIdx % 2 === 0) {
                        this.playTypingBlip(d.speaker);
                    }
                    charIdx++;
                } else {
                    clearInterval(this.typewriterTimer);
                    this.isTyping = false;
                }
            }, 26);
        }

        // Switch visual scenes
        if (d.scene === 'bedroom') {
            if (this.prologueBg) this.prologueBg.className = 'bg-bedroom';
            if (this.bedroomVfx) this.bedroomVfx.style.display = 'block';
            if (this.voidVfx) this.voidVfx.style.display = 'none';
        } else if (d.scene === 'sleep') {
            if (this.prologueBg) this.prologueBg.className = 'bg-sleep';
            if (this.bedroomVfx) this.bedroomVfx.style.display = 'none';
            if (this.voidVfx) this.voidVfx.style.display = 'none';
        } else if (d.scene === 'void') {
            if (this.prologueBg) this.prologueBg.className = 'bg-void';
            if (this.bedroomVfx) this.bedroomVfx.style.display = 'none';
            if (this.voidVfx) this.voidVfx.style.display = 'block';
        }
    },

    advanceDialogue() {
        // If typewriter is still typing out the current line, finish it immediately on first click!
        if (this.isTyping) {
            clearInterval(this.typewriterTimer);
            this.isTyping = false;
            if (this.prologueText) {
                this.prologueText.textContent = this.currentFullText;
            }
            return;
        }

        this.dialogueIndex++;
        if (this.dialogueIndex < this.dialogues.length) {
            this.renderDialogue();
        } else {
            this.skipPrologue();
        }
    },

    skipPrologue() {
        clearInterval(this.typewriterTimer);
        this.isTyping = false;
        console.log('🛡️ [EXONIE 3D] Prologue finished -> Launching 3D Exonie World');
        this.step = 'game';
        this.stopMenuMusic();

        this.showLoadingTransition('Town of Exonie', 'Safe Haven — Entering the World of Exonie...', 1400, () => {
            if (this.scrPrologue) {
                this.scrPrologue.classList.add('hidden');
                this.scrPrologue.style.display = 'none';
            }

            const tryLaunch = () => {
                if (window.launchExonieGame) {
                    window.launchExonieGame(this.charData);
                } else {
                    setTimeout(tryLaunch, 100);
                }
            };
            tryLaunch();
        });
    }
};

// Immediate or DOMReady Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ExonieFlow.init());
} else {
    window.ExonieFlow.init();
}
