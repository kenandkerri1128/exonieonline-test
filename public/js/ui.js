import { CLASSES, getItemSellPrice } from './game_data.js';

export class UIManager {
    constructor(game) {
        this.game = game;

        // Player HUD Elements
        this.hpFill = document.querySelector('.bar-hp');
        this.mpFill = document.querySelector('.bar-mp');
        this.expFill = document.querySelector('.bar-exp');
        this.hpText = document.getElementById('hp-text');
        this.mpText = document.getElementById('mp-text');
        this.levelBadge = document.querySelector('.player-level-badge');
        this.nameText = document.querySelector('.player-name-text');
        this.classBadge = document.querySelector('.player-class-badge');
        this.floorTitle = document.querySelector('.floor-title');
        this.floorSubtitle = document.querySelector('.floor-subtitle');
        this.goldCounter = document.getElementById('gold-val');

        // Boss Health Bar
        this.bossBarContainer = document.getElementById('boss-health-bar');
        this.bossName = document.getElementById('boss-name');
        this.bossHpFill = document.getElementById('boss-hp-fill');
        this.bossHpText = document.getElementById('boss-hp-text');

        // Modals
        this.statsModal = document.getElementById('stats-modal');
        this.inventoryModal = document.getElementById('inventory-modal');
        this.skillModal = document.getElementById('skill-modal');
        this.confirmModal = document.getElementById('confirm-modal');
        this.settingsModal = document.getElementById('settings-modal');
        this.marketplaceModal = document.getElementById('marketplace-modal');
        this.storageModal = document.getElementById('storage-modal');
        this.dailyMissionsModal = document.getElementById('daily-missions-modal');
        this.tavernModal = document.getElementById('tavern-modal');
        this.leaderboardModal = document.getElementById('leaderboard-modal');
        this.dungeonModal = document.getElementById('dungeon-modal');
        this.mazeGuideModal = document.getElementById('maze-guide-modal');
        this.deathScreen = document.getElementById('death-screen');
        this.toastEl = document.getElementById('system-toast');
        this.lootBroadcastEl = document.getElementById('loot-broadcast');
        this.tavernTimerEl = document.getElementById('tavern-timer-ui');
        this.floorClearedBanner = document.getElementById('floor-cleared-banner');
        this.listeningBindAction = null;
        this.activeLeaderboardTab = 'floor';
        this.pendingDungeonMapId = 'dungeon1';

        // Minimap
        this.minimapCanvas = document.getElementById('minimap-canvas');
        if (this.minimapCanvas) {
            this.minimapCtx = this.minimapCanvas.getContext('2d');
            this.minimapCanvas.width = 110;
            this.minimapCanvas.height = 110;
        }

        // Virtual Touch Joystick State
        this.joystick = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            deltaX: 0,
            deltaY: 0,
            vectorX: 0,
            vectorY: 0
        };

        this.selectedInventoryIndex = null;
        this.pendingClassToChoose = null;

        this.setupEventListeners();
        this.setupMobileControls();
    }

    setupEventListeners() {
        // Player Stats [P] Buttons
        const btnStats = document.getElementById('btn-stats');
        if (btnStats) btnStats.onclick = () => this.toggleStats();

        const mBtnStats = document.getElementById('m-btn-stats');
        if (mBtnStats) mBtnStats.onclick = () => this.toggleStats();

        const btnCloseStats = document.getElementById('btn-close-stats');
        if (btnCloseStats) btnCloseStats.onclick = () => { if (this.statsModal) this.statsModal.style.display = 'none'; };

        const btnStatsClose2 = document.getElementById('btn-stats-close');
        if (btnStatsClose2) btnStatsClose2.onclick = () => { if (this.statsModal) this.statsModal.style.display = 'none'; };

        const btnStatsSwitch = document.getElementById('btn-stats-switch-char');
        if (btnStatsSwitch) btnStatsSwitch.onclick = () => {
            if (this.statsModal) this.statsModal.style.display = 'none';
            if (window.ExonieFlow && window.ExonieFlow.openCharSelectFromGame) {
                window.ExonieFlow.openCharSelectFromGame();
            }
        };

        // Inventory / Bag Buttons
        const btnInv = document.getElementById('btn-inventory');
        if (btnInv) btnInv.onclick = () => this.toggleInventory();

        const mBtnInv = document.getElementById('m-btn-inventory');
        if (mBtnInv) mBtnInv.onclick = () => this.toggleInventory();

        const btnCloseInv = document.getElementById('btn-close-inventory');
        if (btnCloseInv) btnCloseInv.onclick = () => { if (this.inventoryModal) this.inventoryModal.style.display = 'none'; };

        // Skills Buttons
        const btnSkills = document.getElementById('btn-skills');
        if (btnSkills) btnSkills.onclick = () => this.toggleSkills();

        const mBtnSkills = document.getElementById('m-btn-skills');
        if (mBtnSkills) mBtnSkills.onclick = () => this.toggleSkills();

        const btnCloseSkills = document.getElementById('btn-close-skills');
        if (btnCloseSkills) btnCloseSkills.onclick = () => { if (this.skillModal) this.skillModal.style.display = 'none'; };

        // Potion Shortcut Buttons
        const mBtnPot = document.getElementById('m-btn-potion');
        if (mBtnPot) mBtnPot.onclick = () => this.game.useHealthPotion();

        const hb3 = document.getElementById('hotbar-3');
        if (hb3) hb3.onclick = () => this.game.useHealthPotion();

        // Hotbar Skill Click
        const hb1 = document.getElementById('hotbar-1');
        if (hb1) hb1.onclick = () => this.game.onSkillTrigger(1);

        const hb2 = document.getElementById('hotbar-2');
        if (hb2) hb2.onclick = () => this.game.onSkillTrigger(2);

        // Confirm Modal Buttons
        const btnNo = document.getElementById('btn-confirm-no');
        if (btnNo) btnNo.onclick = () => { if (this.confirmModal) this.confirmModal.style.display = 'none'; };

        const btnYes = document.getElementById('btn-confirm-yes');
        if (btnYes) btnYes.onclick = () => {
            if (this.confirmModal) this.confirmModal.style.display = 'none';
            if (this.pendingClassToChoose) {
                this.game.chooseClass(this.pendingClassToChoose);
                this.pendingClassToChoose = null;
            }
        };

        // Unequip Weapon by clicking equipped slot
        const slotWeapon = document.getElementById('slot-weapon');
        if (slotWeapon) {
            slotWeapon.onclick = () => this.game.unequipWeapon();
        }

        // Settings Modal Buttons (ESC Menu)
        const btnSettings = document.getElementById('btn-settings');
        if (btnSettings) btnSettings.onclick = () => this.toggleSettings();

        const btnCloseSettings = document.getElementById('btn-close-settings');
        if (btnCloseSettings) btnCloseSettings.onclick = () => { if (this.settingsModal) this.settingsModal.style.display = 'none'; };

        const btnResume = document.getElementById('btn-settings-resume');
        if (btnResume) btnResume.onclick = () => { if (this.settingsModal) this.settingsModal.style.display = 'none'; };

        const btnUnstuck = document.getElementById('btn-settings-unstuck');
        if (btnUnstuck) btnUnstuck.onclick = () => {
            if (this.settingsModal) this.settingsModal.style.display = 'none';
            this.game.respawnInTown();
        };

        const btnSwitchChar = document.getElementById('btn-settings-switch-char');
        if (btnSwitchChar) btnSwitchChar.onclick = () => {
            if (this.settingsModal) this.settingsModal.style.display = 'none';
            if (window.ExonieFlow && window.ExonieFlow.openCharSelectFromGame) {
                window.ExonieFlow.openCharSelectFromGame();
            }
        };

        const btnToggleSky = document.getElementById('btn-toggle-sky-time');
        if (btnToggleSky) {
            btnToggleSky.onclick = () => {
                if (this.game.world && this.game.world.toggleSkyTime) {
                    const isNight = this.game.world.toggleSkyTime();
                    btnToggleSky.textContent = isNight ? '🌙 Starry Night' : '☀️ Morning / Day';
                    this.showToast(isNight ? '🌙 Switched Town Sky to Starry Night & Moon!' : '☀️ Switched Town Sky to Morning Sun & Clouds!');
                }
            };
        }

        // Interactive Keybind Customizer Buttons in Settings
        document.querySelectorAll('.keybind-btn').forEach(btn => {
            btn.onclick = () => {
                const action = btn.getAttribute('data-bind');
                if (!action) return;
                document.querySelectorAll('.keybind-btn').forEach(b => b.classList.remove('listening'));
                this.listeningBindAction = action;
                btn.classList.add('listening');
                btn.textContent = 'Press Key...';
            };
        });

        const btnResetBinds = document.getElementById('btn-reset-keybinds');
        if (btnResetBinds) {
            btnResetBinds.onclick = () => {
                if (this.game && this.game.resetKeybinds) {
                    this.game.resetKeybinds();
                    this.refreshKeybindLabels();
                    this.showToast('⌨️ Keybinds reset to default!');
                }
            };
        }

        const chkFullscreen = document.getElementById('chk-fullscreen');
        if (chkFullscreen) {
            chkFullscreen.onchange = (e) => {
                if (e.target.checked) {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                } else {
                    document.exitFullscreen?.().catch(() => {});
                }
            };
        }

        const chkHighQuality = document.getElementById('chk-high-quality');
        if (chkHighQuality) {
            chkHighQuality.onchange = (e) => {
                if (this.game.engine && this.game.engine.setGraphicsQuality) {
                    this.game.engine.setGraphicsQuality(e.target.checked);
                }
                this.showToast(e.target.checked ? "✨ High Quality 3D Graphics Enabled" : "⚡ Performance Graphics Mode Enabled");
            };
        }

        const rngVol = document.getElementById('rng-master-volume');
        const lblVol = document.getElementById('lbl-volume-pct');
        if (rngVol) {
            rngVol.oninput = (e) => {
                const v = Number(e.target.value);
                if (lblVol) lblVol.textContent = `${v}%`;
                if (this.game.audio) {
                    this.game.audio.setMasterVolume(v / 100);
                }
            };
        }

        // Marketplace & Forge Modal Buttons
        const btnCloseMarket = document.getElementById('btn-close-marketplace');
        if (btnCloseMarket) btnCloseMarket.onclick = () => {
            if (this.marketplaceModal) this.marketplaceModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        const btnBuyPot = document.getElementById('btn-buy-potions');
        if (btnBuyPot) btnBuyPot.onclick = () => this.game.buyMarketplaceItem('potions');

        const btnBuyRev = document.getElementById('btn-buy-revival');
        if (btnBuyRev) btnBuyRev.onclick = () => this.game.buyMarketplaceItem('revival');

        const btnBuyStone = document.getElementById('btn-buy-stone');
        if (btnBuyStone) btnBuyStone.onclick = () => this.game.buyMarketplaceItem('stone');

        const btnBuyGem = document.getElementById('btn-buy-gem');
        if (btnBuyGem) btnBuyGem.onclick = () => this.game.buyMarketplaceItem('gem');

        // Death Screen Buttons
        const btnDeathRespawn = document.getElementById('btn-death-respawn');
        if (btnDeathRespawn) btnDeathRespawn.onclick = () => this.game.respawnInTown();

        const btnDeathRevive = document.getElementById('btn-death-revive');
        if (btnDeathRevive) btnDeathRevive.onclick = () => this.game.useRevivalJuice();

        // Home Storage Modal Buttons
        const btnCloseStorage = document.getElementById('btn-close-storage');
        if (btnCloseStorage) btnCloseStorage.onclick = () => this.closeStorageUI();

        const btnCloseStorage2 = document.getElementById('btn-storage-close-2');
        if (btnCloseStorage2) btnCloseStorage2.onclick = () => this.closeStorageUI();

        const btnStorageOpenBag = document.getElementById('btn-storage-open-bag');
        if (btnStorageOpenBag) {
            btnStorageOpenBag.onclick = () => {
                this.closeStorageUI();
                this.toggleInventory();
            };
        }

        // Daily Missions / Quest Board Modal Buttons
        const btnCloseMissions = document.getElementById('btn-close-daily-missions');
        if (btnCloseMissions) btnCloseMissions.onclick = () => {
            if (this.dailyMissionsModal) this.dailyMissionsModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        const btnAbandonMission = document.getElementById('btn-abandon-mission');
        if (btnAbandonMission) {
            btnAbandonMission.onclick = () => {
                if (this.game && this.game.player) {
                    this.game.player.dailyMission = null;
                    this.game.saveCharacterToAccountSlot();
                    this.renderDailyMissions();
                    this.showToast('✖ Abandoned active Quest Board contract.');
                }
            };
        }

        window.acceptDailyMission = (difficulty) => {
            if (this.game && this.game.acceptDailyMission) {
                this.game.acceptDailyMission(difficulty);
            }
        };

        // Training Tavern & Leaderboard Modal Buttons
        const btnCloseTavern = document.getElementById('btn-close-tavern');
        if (btnCloseTavern) btnCloseTavern.onclick = () => {
            if (this.tavernModal) this.tavernModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        const btnEnterTavern = document.getElementById('btn-enter-tavern');
        if (btnEnterTavern) {
            btnEnterTavern.onclick = () => {
                const typeSel = document.getElementById('tavern-boss-type');
                const lvlInp = document.getElementById('tavern-boss-level');
                const bType = typeSel ? typeSel.value : 'floor';
                const bLvl = lvlInp ? Math.max(1, Math.min(50, parseInt(lvlInp.value, 10) || 10)) : 10;
                if (this.tavernModal) this.tavernModal.style.display = 'none';
                this.game.enterTrainingTavern(bType, bLvl);
            };
        }

        const btnTavernOpenRanks = document.getElementById('btn-tavern-open-ranks');
        if (btnTavernOpenRanks) {
            btnTavernOpenRanks.onclick = () => {
                if (this.tavernModal) this.tavernModal.style.display = 'none';
                this.openLeaderboardModal('floor');
            };
        }

        const btnCloseLb = document.getElementById('btn-close-leaderboard');
        if (btnCloseLb) btnCloseLb.onclick = () => {
            if (this.leaderboardModal) this.leaderboardModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        window.switchLeaderboardTab = (tab) => {
            this.activeLeaderboardTab = tab;
            this.renderLeaderboard(tab);
        };

        // Dungeon Difficulty & Maze Guide Modal Buttons
        const btnCloseDungeon = document.getElementById('btn-close-dungeon');
        if (btnCloseDungeon) btnCloseDungeon.onclick = () => {
            if (this.dungeonModal) this.dungeonModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        window.enterDungeonWithDifficulty = (diffName, mult) => {
            if (this.dungeonModal) this.dungeonModal.style.display = 'none';
            this.game.enterDungeon(this.pendingDungeonMapId, diffName, mult);
        };

        const btnCloseMazeGuide = document.getElementById('btn-close-maze-guide');
        if (btnCloseMazeGuide) btnCloseMazeGuide.onclick = () => {
            if (this.mazeGuideModal) this.mazeGuideModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };
    }

    setupMobileControls() {
        const joyZone = document.getElementById('joystick-zone');
        const joyThumb = document.getElementById('joystick-thumb');

        if (!joyZone || !joyThumb) return;

        const maxRadius = 45;

        // Joystick Touch Start
        joyZone.addEventListener('touchstart', (e) => {
            const touch = e.changedTouches[0];
            this.joystick.active = true;
            this.joystick.touchId = touch.identifier;
            const rect = joyZone.getBoundingClientRect();
            this.joystick.startX = rect.left + rect.width / 2;
            this.joystick.startY = rect.top + rect.height / 2;
        }, { passive: true });

        // Joystick Touch Move
        window.addEventListener('touchmove', (e) => {
            if (!this.joystick.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.joystick.touchId) {
                    let dx = touch.clientX - this.joystick.startX;
                    let dy = touch.clientY - this.joystick.startY;
                    const dist = Math.hypot(dx, dy);

                    if (dist > maxRadius) {
                        dx = (dx / dist) * maxRadius;
                        dy = (dy / dist) * maxRadius;
                    }

                    joyThumb.style.transform = `translate(${dx}px, ${dy}px)`;
                    this.joystick.vectorX = dx / maxRadius;
                    this.joystick.vectorY = dy / maxRadius;
                }
            }
        }, { passive: true });

        // Joystick Touch End
        const resetJoy = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.joystick.touchId) {
                    this.joystick.active = false;
                    this.joystick.touchId = null;
                    this.joystick.vectorX = 0;
                    this.joystick.vectorY = 0;
                    joyThumb.style.transform = `translate(0px, 0px)`;
                }
            }
        };
        window.addEventListener('touchend', resetJoy);
        window.addEventListener('touchcancel', resetJoy);

        // Touch Combat Action Buttons
        const bindTouchBtn = (id, action) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                action();
            });
        };

        bindTouchBtn('btn-touch-attack', () => this.game.onAttackTrigger());
        bindTouchBtn('btn-touch-jump', () => this.game.onJumpTrigger());
        bindTouchBtn('btn-touch-dodge', () => this.game.onDodgeTrigger());
        bindTouchBtn('btn-touch-skill1', () => this.game.onSkillTrigger(1));
        bindTouchBtn('btn-touch-skill2', () => this.game.onSkillTrigger(2));
        bindTouchBtn('btn-touch-lock', () => this.game.toggleTargetLock());
    }

    showToast(message) {
        if (!this.toastEl) return;
        this.toastEl.textContent = message;
        this.toastEl.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toastEl.classList.remove('show');
        }, 2400);
    }

    updatePlayerHUD(player) {
        if (!player) return;

        // Health Bar
        const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
        if (this.hpFill) this.hpFill.style.width = `${hpPct}%`;
        if (this.hpText) this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

        // Mana Bar
        const mpPct = Math.max(0, Math.min(100, (player.mp / player.maxMp) * 100));
        if (this.mpFill) this.mpFill.style.width = `${mpPct}%`;
        if (this.mpText) this.mpText.textContent = `${Math.ceil(player.mp)} / ${player.maxMp}`;

        // Exp Bar
        const expPct = Math.max(0, Math.min(100, (player.exp / player.maxExp) * 100));
        if (this.expFill) this.expFill.style.width = `${expPct}%`;

        // Badges & Labels
        if (this.levelBadge) this.levelBadge.textContent = `Lv.${player.level}`;
        if (this.nameText) this.nameText.textContent = player.name;
        
        const pClass = (player.baseStats && player.baseStats.playerClass) || 'No Class';
        if (this.classBadge) this.classBadge.textContent = pClass;
        if (this.goldCounter) this.goldCounter.textContent = Number(player.gold || 0).toLocaleString();

        // Potion Quantity in Hotbar
        const potCount = this.game.getPotionCount();
        const potText = document.getElementById('potion-qty-text');
        if (potText) potText.textContent = `x${potCount}`;
        const mPotText = document.getElementById('m-potion-qty');
        if (mPotText) mPotText.textContent = potCount;

        // Update Active Skill Names on Hotbar 1 & 2 (Matching 2D Exonie!)
        const hbName1 = document.getElementById('hb-name-1');
        const hbName2 = document.getElementById('hb-name-2');
        const hbIcon1 = document.getElementById('hb-icon-1');
        const hbIcon2 = document.getElementById('hb-icon-2');
        if (pClass && CLASSES[pClass]) {
            const activeSkills = CLASSES[pClass].skills.filter(s => s.type === 'active');
            const s1 = activeSkills[0];
            const s2 = activeSkills[1];
            if (hbName1) {
                hbName1.textContent = s1 ? (player.level >= s1.unlock ? s1.name : `${s1.name} (Lv.${s1.unlock})`) : 'Passive';
                hbName1.style.color = (s1 && player.level >= s1.unlock) ? '#4ade80' : '#94a3b8';
            }
            if (hbName2) {
                hbName2.textContent = s2 ? (player.level >= s2.unlock ? s2.name : `${s2.name} (Lv.${s2.unlock})`) : 'Passive';
                hbName2.style.color = (s2 && player.level >= s2.unlock) ? '#38bdf8' : '#94a3b8';
            }
            if (hbIcon1) hbIcon1.textContent = pClass === 'Healer' ? '💚' : (pClass === 'Ice Master' ? '❄️' : '⚡');
            if (hbIcon2) hbIcon2.textContent = pClass === 'Healer' ? '✨' : (pClass === 'Ice Master' ? '🌨️' : '🔥');
        } else {
            if (hbName1) { hbName1.textContent = 'Skill 1'; hbName1.style.color = '#94a3b8'; }
            if (hbName2) { hbName2.textContent = 'Skill 2'; hbName2.style.color = '#94a3b8'; }
        }

        this.refreshKeybindLabels();
        if (this.statsModal && this.statsModal.style.display === 'flex') {
            this.renderStatsModal();
        }

        // Update Skill Cooldown Buttons Visuals
        this.updateSkillCooldowns();
    }

    formatKeyLabel(code) {
        if (!code) return '';
        return String(code)
            .replace(/^Key/, '')
            .replace(/^Digit/, '')
            .replace('ShiftLeft', 'SHIFT')
            .replace('ShiftRight', 'SHIFT')
            .replace('Space', 'SPACE');
    }

    refreshKeybindLabels() {
        const kb = this.game?.keybinds;
        if (!kb) return;
        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.textContent = txt;
        };
        const k1 = `${this.formatKeyLabel(kb.skill1)} / ${this.formatKeyLabel(kb.skill1Alt)}`;
        const k2 = `${this.formatKeyLabel(kb.skill2)} / ${this.formatKeyLabel(kb.skill2Alt)}`;
        const kPot = this.formatKeyLabel(kb.potion);

        setTxt('hb-key-1', k1);
        setTxt('hb-key-2', k2);
        setTxt('hb-key-3', kPot);

        setTxt('bind-btn-skill1', k1);
        setTxt('bind-btn-skill2', k2);
        setTxt('bind-btn-potion', kPot);
        setTxt('bind-btn-dodge', this.formatKeyLabel(kb.dodge));
        setTxt('bind-btn-stats', this.formatKeyLabel(kb.stats));
        setTxt('bind-btn-bag', this.formatKeyLabel(kb.bag));
        setTxt('bind-btn-skills', this.formatKeyLabel(kb.skills));
    }

    toggleStats() {
        if (!this.statsModal) return;
        const isHidden = this.statsModal.style.display === 'none' || !this.statsModal.style.display;
        this.statsModal.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.exitPointerLock?.();
            this.renderStatsModal();
        }
    }

    renderStatsModal() {
        const p = this.game?.player;
        if (!p) return;
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setTxt('stat-name', p.name || 'Hero');
        setTxt('stat-class', p.baseStats?.playerClass || 'Novice');
        setTxt('stat-lvl', p.level || 1);
        setTxt('stat-exp', `${Math.floor(p.exp || 0).toLocaleString()} / ${Math.floor(p.maxExp || 100).toLocaleString()}`);
        setTxt('stat-maxhp', (p.maxHp || 100).toLocaleString());
        setTxt('stat-atk', (p.atk || 5).toLocaleString());
        setTxt('stat-matk', (p.mag || 5).toLocaleString());
        setTxt('stat-def', (p.def || 2).toLocaleString());
        setTxt('stat-spd', p.equips?.weapon?.fixedStat?.speed ? (1 + p.equips.weapon.fixedStat.speed) : 1);
        setTxt('stat-str', (p.totalStr || p.baseStats?.str || 10).toLocaleString());
        setTxt('stat-int', (p.totalInt || p.baseStats?.int || 10).toLocaleString());
    }

    updateSkillCooldowns() {
        const combat = this.game.combat;
        if (!combat) return;

        let baseCd1 = (combat.maxCooldowns && combat.maxCooldowns.skill1) || 15;
        let baseCd2 = (combat.maxCooldowns && combat.maxCooldowns.skill2) || 35;
        const pClass = (this.game.player.baseStats && this.game.player.baseStats.playerClass);
        if (pClass && CLASSES[pClass]) {
            const activeSkills = CLASSES[pClass].skills.filter(s => s.type === 'active');
            if (activeSkills[0] && activeSkills[0].cd) baseCd1 = Math.round(activeSkills[0].cd / 1000);
            if (activeSkills[1] && activeSkills[1].cd) baseCd2 = Math.round(activeSkills[1].cd / 1000);
        }

        const updateSlot = (overlayId, txtId, mOverlayId, mTxtId, cdSec, baseCd = 10) => {
            const overlay = document.getElementById(overlayId);
            const txt = document.getElementById(txtId);
            const mOverlay = document.getElementById(mOverlayId);
            const mTxt = document.getElementById(mTxtId);

            if (cdSec > 0) {
                const pct = Math.min(100, (cdSec / Math.max(1, baseCd)) * 100);
                const ceil = Math.ceil(cdSec);
                if (overlay) { overlay.style.height = `${pct}%`; }
                if (txt) { txt.style.display = 'flex'; txt.textContent = ceil; }
                if (mOverlay) { mOverlay.style.display = 'block'; mOverlay.style.height = `${pct}%`; }
                if (mTxt) { mTxt.style.display = 'flex'; mTxt.textContent = ceil; }
            } else {
                if (overlay) { overlay.style.height = '0%'; }
                if (txt) { txt.style.display = 'none'; }
                if (mOverlay) { mOverlay.style.display = 'none'; }
                if (mTxt) { mTxt.style.display = 'none'; }
            }
        };

        updateSlot('cd-1', 'cdt-1', 'm-cd-skill1', 'm-cdt-skill1', combat.cooldowns.skill1, baseCd1);
        updateSlot('cd-2', 'cdt-2', 'm-cd-skill2', 'm-cdt-skill2', combat.cooldowns.skill2, baseCd2);
    }

    updateFloorIndicator(mapId, mapName) {
        if (!this.floorTitle) return;
        this.floorTitle.textContent = mapName || "Town of Exonie";
        if (this.floorSubtitle) {
            if (mapId === 'town') this.floorSubtitle.textContent = "Safe Haven";
            else if (mapId === 'floor10') this.floorSubtitle.textContent = "Tower Climax (Floor 10)";
            else if (mapId.startsWith('floor')) this.floorSubtitle.textContent = "Infinite Spire";
            else this.floorSubtitle.textContent = "Sacred Realm";
        }
    }

    updateBossHealth(boss) {
        if (!this.game.bossEngaged || !boss || !boss.isAlive) {
            if (this.bossBarContainer) this.bossBarContainer.style.display = 'none';
            return;
        }

        if (this.bossBarContainer) this.bossBarContainer.style.display = 'flex';
        if (this.bossName) this.bossName.textContent = `[BOSS] ${boss.name} (Lv.${boss.level})`;

        const pct = Math.max(0, Math.min(100, (boss.hp / (boss.maxHp || 1)) * 100));
        if (this.bossHpFill) this.bossHpFill.style.width = `${pct}%`;
        if (this.bossHpText) this.bossHpText.textContent = `${Math.ceil(boss.hp).toLocaleString()} / ${Math.ceil(boss.maxHp || 1).toLocaleString()}`;
    }

    updateDayNightIndicator(info) {
        let el = document.getElementById('day-night-indicator');
        if (!el) {
            const center = document.querySelector('.hud-top-center');
            if (center) {
                el = document.createElement('div');
                el.id = 'day-night-indicator';
                el.className = 'day-night-badge';
                center.appendChild(el);
            }
        }
        if (el && info) {
            el.textContent = info.label || (info.isDay ? '☀️ Morning' : '🌙 Night');
            el.style.borderColor = info.isDay ? 'rgba(250, 204, 21, 0.6)' : 'rgba(96, 165, 250, 0.6)';
            el.style.color = info.isDay ? '#fde047' : '#93c5fd';
        }
    }

    showFloorCleared(mapName) {
        if (!this.floorClearedBanner) return;
        const bannerTitle = document.getElementById('banner-title');
        const bannerSub = document.getElementById('banner-sub');
        if (bannerTitle) bannerTitle.textContent = "AREA CONQUERED!";
        if (bannerSub) bannerSub.textContent = `Gate to Next Area is Now Active!`;
        this.floorClearedBanner.classList.add('show');
        setTimeout(() => {
            this.floorClearedBanner.classList.remove('show');
        }, 3000);
    }

    // ==========================================
    // INVENTORY / BAG SCREEN
    // ==========================================
    toggleInventory() {
        if (!this.inventoryModal) return;
        const isHidden = this.inventoryModal.style.display === 'none' || !this.inventoryModal.style.display;
        this.inventoryModal.style.display = isHidden ? 'flex' : 'none';
        this.hideTooltip();
        if (isHidden) {
            document.exitPointerLock?.(); // Free cursor so user can click bag items
            this.renderInventory();
        }
    }

    // Rich Dragon Nest / Exonie Item Tooltip on Hover
    getItemTooltip(item) {
        if (!item) return '';
        const rarityColors = {
            Starter: '#aaaaaa',
            Basic: '#cd7f32',
            Rare: '#38bdf8',
            Unique: '#c084fc',
            Legendary: '#fb923c',
            Godly: '#f87171',
            Divine: '#facc15'
        };
        const rColor = rarityColors[item.rarity] || item.color || '#38bdf8';

        let html = `<div class="tip-title" style="color:${rColor}; text-shadow:0 0 10px ${rColor};">${item.name}</div>`;
        html += `<div class="tip-subtitle">Lv.${item.level || 1} ${item.rarity || 'Basic'} ${String(item.type).toUpperCase()}</div>`;

        // Fixed Stats
        if (item.fixedStat) {
            for (const [k, v] of Object.entries(item.fixedStat)) {
                let label = k.toUpperCase();
                if (k === 'hpHeal') label = 'HP RESTORE';
                html += `<div class="tip-stat-row">+${v} ${label}</div>`;
            }
        }

        // Random Bonus Stats
        if (item.randomStat) {
            for (const [k, v] of Object.entries(item.randomStat)) {
                html += `<div class="tip-stat-row" style="color:#22c55e;">+${v} ${k.toUpperCase()} (Bonus)</div>`;
            }
        }

        // Weapon Class Compatibility Info
        const sprite = String(item.sprite || item.name || '').toLowerCase();
        if (item.type === 'weapon') {
            let classComp = '';
            if (sprite.includes('touchpad')) classComp = 'Tech Genius (Commands Drone)';
            else if (sprite.includes('sword')) classComp = 'Berserker, Blademaster';
            else if (sprite.includes('gun')) classComp = 'Sniper, Explosives Expert';
            else if (sprite.includes('staff')) classComp = 'Summoner, Ice Master';
            else if (sprite.includes('pendant')) classComp = 'Healer';
            else if (sprite.includes('dagger')) classComp = 'Phantom Striker, Ninja Assassin';

            if (classComp) {
                html += `<div class="tip-class-row">⚡ Compatible: <strong style="color:#fff;">${classComp}</strong></div>`;
            }
        }

        // Description
        if (item.desc || item.description) {
            html += `<div class="tip-desc">"${item.desc || item.description}"</div>`;
        }

        const sellVal = getItemSellPrice(item);
        html += `<div class="tip-price">💰 Sell Price: ${sellVal.toLocaleString()} Gold</div>`;
        return html;
    }

    showTooltip(item, mouseEvent) {
        const tip = document.getElementById('item-hover-tooltip');
        if (!tip || !item) return;
        tip.innerHTML = this.getItemTooltip(item);
        tip.style.display = 'block';

        const tipWidth = 260;
        const tipHeight = 160;
        let x = mouseEvent.clientX + 16;
        let y = mouseEvent.clientY + 16;

        if (x + tipWidth > window.innerWidth) x = mouseEvent.clientX - tipWidth - 16;
        if (y + tipHeight > window.innerHeight) y = mouseEvent.clientY - tipHeight - 16;

        tip.style.left = `${Math.max(10, x)}px`;
        tip.style.top = `${Math.max(10, y)}px`;
    }

    hideTooltip() {
        const tip = document.getElementById('item-hover-tooltip');
        if (tip) tip.style.display = 'none';
    }

    renderInventory() {
        const player = this.game.player;
        if (!player) return;

        // 1. Render Equipped Slots
        const wpnView = document.getElementById('equip-view-weapon');
        const slotWpn = document.getElementById('slot-weapon');
        if (player.equips.weapon) {
            wpnView.textContent = `⚔️ ${player.equips.weapon.name}`;
            slotWpn.classList.add('filled');
            slotWpn.onmouseenter = (e) => {
                if (this.selectedInventoryIndex === null) this.showItemDetail(player.equips.weapon, -1);
                this.showTooltip(player.equips.weapon, e);
            };
            slotWpn.onmousemove = (e) => this.showTooltip(player.equips.weapon, e);
            slotWpn.onmouseleave = () => this.hideTooltip();
        } else {
            wpnView.textContent = "Empty (Click weapon in bag)";
            slotWpn.classList.remove('filled');
            slotWpn.onmouseenter = null;
            slotWpn.onmousemove = null;
            slotWpn.onmouseleave = null;
        }

        const armorView = document.getElementById('equip-view-armor');
        const slotArmor = document.getElementById('slot-armor');
        if (armorView && player.equips.armor) {
            armorView.textContent = `🛡️ ${player.equips.armor.name} (+${player.equips.armor.fixedStat?.defense || 2} DEF)`;
            if (slotArmor) {
                slotArmor.onmouseenter = (e) => {
                    if (this.selectedInventoryIndex === null) this.showItemDetail(player.equips.armor, -1);
                    this.showTooltip(player.equips.armor, e);
                };
                slotArmor.onmousemove = (e) => this.showTooltip(player.equips.armor, e);
                slotArmor.onmouseleave = () => this.hideTooltip();
            }
        }

        const legView = document.getElementById('equip-view-leggings');
        const slotLeg = document.getElementById('slot-leggings');
        if (legView && player.equips.leggings) {
            legView.textContent = `👖 ${player.equips.leggings.name} (+${player.equips.leggings.fixedStat?.hp || 5} HP)`;
            if (slotLeg) {
                slotLeg.onmouseenter = (e) => {
                    if (this.selectedInventoryIndex === null) this.showItemDetail(player.equips.leggings, -1);
                    this.showTooltip(player.equips.leggings, e);
                };
                slotLeg.onmousemove = (e) => this.showTooltip(player.equips.leggings, e);
                slotLeg.onmouseleave = () => this.hideTooltip();
            }
        }

        // 2. Render Bag Grid (20 slots)
        const grid = document.getElementById('inventory-slots-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 20; i++) {
            const item = player.inventory[i];
            const slotEl = document.createElement('div');
            slotEl.className = 'bag-slot';

            if (this.selectedInventoryIndex === i) {
                slotEl.classList.add('active');
            }

            if (item) {
                slotEl.innerHTML = `
                    <div class="bag-slot-icon">${this.getItemIcon(item.type, item.sprite)}</div>
                    ${item.quantity && item.quantity > 1 ? `<div class="bag-slot-qty">${item.quantity}</div>` : ''}
                `;

                // HOVER: Only update bottom inspector if NO slot is currently locked by left-click!
                slotEl.onmouseenter = (e) => {
                    if (this.selectedInventoryIndex === null) {
                        this.showItemDetail(item, i);
                    }
                    this.showTooltip(item, e);
                };
                slotEl.onmousemove = (e) => {
                    this.showTooltip(item, e);
                };
                slotEl.onmouseleave = () => {
                    this.hideTooltip();
                };

                // LEFT CLICK: Locks this item in the inspector so the Equip Weapon button stays locked!
                slotEl.onclick = () => {
                    this.selectedInventoryIndex = i;
                    this.renderInventory();
                    this.showItemDetail(item, i);
                };

                // DOUBLE CLICK: Instant Equip or Use!
                slotEl.ondblclick = () => {
                    if (['weapon', 'armor', 'leggings'].includes(item.type)) {
                        this.game.equipItemFromInventory(i);
                        this.selectedInventoryIndex = null;
                        this.renderInventory();
                    } else if (item.type === 'potion') {
                        this.game.useHealthPotion();
                        this.renderInventory();
                    }
                };
            } else {
                slotEl.innerHTML = `<span style="color:#475569; font-size:0.75rem;">${i + 1}</span>`;
                slotEl.onclick = () => {
                    this.selectedInventoryIndex = null;
                    this.renderInventory();
                    this.clearItemDetail();
                };
                slotEl.onmouseenter = () => this.hideTooltip();
            }

            grid.appendChild(slotEl);
        }

        // Keep locked item's Equip button visible at all times when selectedInventoryIndex is set
        if (this.selectedInventoryIndex !== null && player.inventory[this.selectedInventoryIndex]) {
            this.showItemDetail(player.inventory[this.selectedInventoryIndex], this.selectedInventoryIndex);
        }
    }

    getItemIcon(type, sprite = '') {
        const s = String(sprite).toLowerCase();
        if (s.includes('sword')) return '🗡️';
        if (s.includes('staff')) return '🪄';
        if (s.includes('pendant')) return '📿';
        if (s.includes('gun')) return '🔫';
        if (s.includes('dagger')) return '🗡️';
        if (s.includes('touchpad')) return '📱';
        if (s.includes('revival')) return '✨';
        if (s.includes('potion')) return '🧪';
        if (s.includes('refinement')) return '💠';
        if (s.includes('gem')) return '💎';
        if (s.includes('goldbar')) return '🪙';
        if (type === 'armor') return '🛡️';
        if (type === 'leggings') return '👖';
        return '📦';
    }

    showItemDetail(item, index) {
        const titleEl = document.getElementById('detail-item-title');
        const descEl = document.getElementById('detail-item-desc');
        const actionsEl = document.getElementById('detail-item-actions');
        if (!titleEl || !descEl || !actionsEl) return;

        titleEl.innerHTML = `<span style="color:${item.color || '#38bdf8'}; font-weight:900;">${item.name}</span> <span style="font-size:0.75rem; color:#94a3b8;">[${item.rarity || 'Basic'}]</span>`;

        let statsStr = '';
        if (item.fixedStat) {
            statsStr = Object.entries(item.fixedStat).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
        }
        if (item.randomStat) {
            const rndStr = Object.entries(item.randomStat).map(([k, v]) => `+${v} ${k.toUpperCase()} (Bonus)`).join(', ');
            statsStr = statsStr ? `${statsStr}, ${rndStr}` : rndStr;
        }
        descEl.innerHTML = `${item.desc || ''} ${statsStr ? `<br><strong style="color:#4ade80;">Stats: ${statsStr}</strong>` : ''}`;

        actionsEl.innerHTML = '';
        if (index < 0) return; // Viewing already-equipped item

        if (['weapon', 'armor', 'leggings'].includes(item.type)) {
            const btnEquip = document.createElement('button');
            btnEquip.className = 'btn-item-action';
            btnEquip.textContent = `⚔️ Equip ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;
            btnEquip.onclick = () => {
                this.game.equipItemFromInventory(index);
                this.selectedInventoryIndex = null;
                this.renderInventory();
            };
            actionsEl.appendChild(btnEquip);
        } else if (item.type === 'potion') {
            const btnUse = document.createElement('button');
            btnUse.className = 'btn-item-action';
            btnUse.textContent = `🧪 Drink ${item.name}`;
            btnUse.onclick = () => {
                this.game.useHealthPotion();
                this.renderInventory();
            };
            actionsEl.appendChild(btnUse);
        } else if (item.type === 'material' && (String(item.sprite).includes('refinement') || String(item.sprite).includes('gem'))) {
            const btnUseMat = document.createElement('button');
            btnUseMat.className = 'btn-item-action';
            btnUseMat.textContent = `✨ Use ${item.name} on Weapon`;
            btnUseMat.onclick = () => {
                this.game.useMaterialFromInventory(index);
            };
            actionsEl.appendChild(btnUseMat);
        }

        // Deposit to Home Storage Vault button (Available inside Home or when Storage is active)
        if (this.game.currentMapId === 'home' || window.isStorageOpen) {
            const btnStore = document.createElement('button');
            btnStore.className = 'btn-item-action';
            btnStore.style.marginLeft = '8px';
            btnStore.style.background = '#f59e0b';
            btnStore.style.color = '#000';
            btnStore.style.fontWeight = '900';
            btnStore.textContent = `📥 Store in Home Vault`;
            btnStore.onclick = () => {
                this.game.transferToStorage(index);
                this.selectedInventoryIndex = null;
                this.renderInventory();
                this.renderStorage();
            };
            actionsEl.appendChild(btnStore);
        }

        // Sell button for any bag item (Exact 2D Exonie Sell Price formula)
        const sellVal = getItemSellPrice(item);
        const btnSell = document.createElement('button');
        btnSell.className = 'btn-item-action';
        btnSell.style.marginLeft = '8px';
        btnSell.style.background = '#334155';
        btnSell.textContent = `💰 Sell (${sellVal.toLocaleString()}G)`;
        btnSell.onclick = () => {
            this.game.sellItemFromInventory(index);
            this.selectedInventoryIndex = null;
        };
        actionsEl.appendChild(btnSell);
    }

    clearItemDetail() {
        const titleEl = document.getElementById('detail-item-title');
        const descEl = document.getElementById('detail-item-desc');
        const actionsEl = document.getElementById('detail-item-actions');
        if (titleEl) titleEl.textContent = 'Select an item to view stats';
        if (descEl) descEl.textContent = 'Equipping a weapon allows you to choose your permanent class in the Skills menu (K).';
        if (actionsEl) actionsEl.innerHTML = '';
    }

    // ==========================================
    // SKILLS & CLASS CHOOSING SCREEN
    // ==========================================
    toggleSkills() {
        if (!this.skillModal) return;
        const isHidden = this.skillModal.style.display === 'none' || !this.skillModal.style.display;
        this.skillModal.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.exitPointerLock?.();
            this.renderSkills();
        }
    }

    // ==========================================
    // ESC SETTINGS MENU & MARKETPLACE MODAL
    // ==========================================
    toggleSettings() {
        // If another modal is open, pressing ESC closes that modal first
        if (this.statsModal && this.statsModal.style.display === 'flex') {
            this.statsModal.style.display = 'none';
            return;
        }
        if (this.inventoryModal && this.inventoryModal.style.display === 'flex') {
            this.inventoryModal.style.display = 'none';
            this.hideTooltip();
            return;
        }
        if (this.skillModal && this.skillModal.style.display === 'flex') {
            this.skillModal.style.display = 'none';
            return;
        }
        if (this.marketplaceModal && this.marketplaceModal.style.display === 'flex') {
            this.marketplaceModal.style.display = 'none';
            return;
        }
        if (this.confirmModal && this.confirmModal.style.display === 'flex') {
            this.confirmModal.style.display = 'none';
            return;
        }
        if (this.storageModal && this.storageModal.style.display === 'flex') {
            this.closeStorageUI();
            return;
        }
        if (this.dailyMissionsModal && this.dailyMissionsModal.style.display === 'flex') {
            this.dailyMissionsModal.style.display = 'none';
            return;
        }
        if (this.tavernModal && this.tavernModal.style.display === 'flex') {
            this.tavernModal.style.display = 'none';
            return;
        }
        if (this.leaderboardModal && this.leaderboardModal.style.display === 'flex') {
            this.leaderboardModal.style.display = 'none';
            return;
        }
        if (this.dungeonModal && this.dungeonModal.style.display === 'flex') {
            this.dungeonModal.style.display = 'none';
            return;
        }
        if (this.mazeGuideModal && this.mazeGuideModal.style.display === 'flex') {
            this.mazeGuideModal.style.display = 'none';
            return;
        }

        if (!this.settingsModal) return;
        const isHidden = this.settingsModal.style.display === 'none' || !this.settingsModal.style.display;
        this.settingsModal.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.exitPointerLock?.();
            const chkFs = document.getElementById('chk-fullscreen');
            if (chkFs) chkFs.checked = !!document.fullscreenElement;
        }
    }

    isAnyModalOpen() {
        const modals = [
            this.marketplaceModal, this.storageModal, this.dailyMissionsModal,
            this.tavernModal, this.leaderboardModal, this.dungeonModal,
            this.mazeGuideModal, this.settingsModal, this.statsModal,
            this.inventoryModal, this.skillsModal
        ];
        return modals.some(m => m && (m.style.display === 'flex' || m.style.display === 'block'));
    }

    toggleMarketplace(forceState = null) {
        if (!this.marketplaceModal) return;
        const isHidden = (forceState !== null)
            ? !forceState
            : (this.marketplaceModal.style.display === 'none' || !this.marketplaceModal.style.display);

        this.marketplaceModal.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.exitPointerLock?.();
        } else {
            if (this.game) this.game.portalCooldown = 4.0;
        }
    }

    // ==========================================
    // 2D HOME STORAGE VAULT (15 SLOTS)
    // ==========================================
    openStorageUI() {
        if (!this.storageModal) return;
        window.isStorageOpen = true;
        document.exitPointerLock?.();
        this.renderStorage();
        this.storageModal.style.display = 'flex';
    }

    closeStorageUI() {
        window.isStorageOpen = false;
        if (this.storageModal) this.storageModal.style.display = 'none';
        if (this.game) this.game.portalCooldown = 4.0;
        this.hideTooltip();
    }

    renderStorage() {
        const player = this.game?.player;
        if (!player) return;
        if (!Array.isArray(player.storage)) {
            player.storage = Array(15).fill(null);
        }
        const grid = document.getElementById('storage-slots-grid');
        const countLbl = document.getElementById('storage-count-label');
        if (!grid) return;
        grid.innerHTML = '';

        let usedCount = 0;
        for (let i = 0; i < 15; i++) {
            const item = player.storage[i];
            const slotEl = document.createElement('div');
            slotEl.className = 'bag-slot';
            if (item) {
                usedCount++;
                slotEl.innerHTML = `
                    <div class="bag-slot-icon">${this.getItemIcon(item.type, item.sprite)}</div>
                    ${item.quantity && item.quantity > 1 ? `<div class="bag-slot-qty">${item.quantity}</div>` : ''}
                `;
                slotEl.onmouseenter = (e) => this.showTooltip(item, e);
                slotEl.onmousemove = (e) => this.showTooltip(item, e);
                slotEl.onmouseleave = () => this.hideTooltip();
                slotEl.onclick = () => {
                    this.hideTooltip();
                    this.game.transferFromStorage(i);
                    this.renderStorage();
                    if (this.inventoryModal && this.inventoryModal.style.display === 'flex') {
                        this.renderInventory();
                    }
                };
            } else {
                slotEl.innerHTML = `<span style="color:#475569; font-size:0.75rem;">V${i + 1}</span>`;
                slotEl.onmouseenter = () => this.hideTooltip();
            }
            grid.appendChild(slotEl);
        }
        if (countLbl) {
            countLbl.textContent = `Stored: ${usedCount} / 15`;
        }
    }

    // ==========================================
    // 2D QUEST BOARD / DAILY GOLD MISSIONS
    // ==========================================
    openDailyMissionsUI() {
        if (!this.dailyMissionsModal) return;
        document.exitPointerLock?.();
        this.renderDailyMissions();
        this.dailyMissionsModal.style.display = 'flex';
    }

    renderDailyMissions() {
        const player = this.game?.player;
        if (!player) return;
        const activeBox = document.getElementById('active-mission-box');
        const selectBox = document.getElementById('mission-selection-box');
        if (!activeBox || !selectBox) return;

        const dm = player.dailyMission;
        if (dm && dm.active) {
            activeBox.style.display = 'block';
            selectBox.style.display = 'none';
            const nameEl = document.getElementById('active-mission-name');
            const rewEl = document.getElementById('active-mission-reward');
            const progEl = document.getElementById('active-mission-progress');
            const barEl = document.getElementById('active-mission-bar');
            if (nameEl) nameEl.textContent = dm.name;
            if (rewEl) rewEl.textContent = Number(dm.reward || 25000).toLocaleString();
            if (progEl) progEl.textContent = `${dm.progress || 0} / ${dm.targetCount || 15}`;
            if (barEl) {
                const pct = Math.min(100, Math.round(((dm.progress || 0) / (dm.targetCount || 15)) * 100));
                barEl.style.width = `${pct}%`;
            }
        } else {
            activeBox.style.display = 'none';
            selectBox.style.display = 'flex';
        }
    }

    // ==========================================
    // 2D TRAINING TAVERN & LEADERBOARD
    // ==========================================
    openTavernModal() {
        if (!this.tavernModal) return;
        document.exitPointerLock?.();
        const entEl = document.getElementById('tavern-entries-text');
        const entries = this.game?.player?.tavernEntries !== undefined ? this.game.player.tavernEntries : 5;
        if (entEl) {
            entEl.textContent = `${entries} / 5`;
            entEl.style.color = entries > 0 ? '#4ade80' : '#ef4444';
        }
        this.tavernModal.style.display = 'flex';
    }

    openLeaderboardModal(tab = 'floor') {
        if (!this.leaderboardModal) return;
        document.exitPointerLock?.();
        this.activeLeaderboardTab = tab;
        this.renderLeaderboard(tab);
        this.leaderboardModal.style.display = 'flex';
    }

    renderLeaderboard(tab = 'floor') {
        ['floor', 'mini', 'common'].forEach(t => {
            const btn = document.getElementById(`lb-tab-${t}`);
            if (btn) btn.classList.toggle('active', t === tab);
        });
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) return;
        const rows = this.game ? this.game.getTavernLeaderboard(tab) : [];
        tbody.innerHTML = '';

        rows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            const isTop3 = idx < 3;
            const rankMedal = idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `${idx + 1}`));
            tr.style.borderBottom = '1px solid rgba(51,65,85,0.6)';
            if (r.isSelf) {
                tr.style.background = 'rgba(0, 229, 255, 0.14)';
            }
            tr.innerHTML = `
                <td style="padding:7px 8px; font-weight:900; color:${isTop3 ? '#ffd700' : '#94a3b8'};">${rankMedal}</td>
                <td style="padding:7px 8px; font-weight:800; color:${r.isSelf ? '#00e5ff' : '#fff'};">${r.name}</td>
                <td style="padding:7px 8px; color:#4ade80;">${r.playerClass || 'Blademaster'}</td>
                <td style="padding:7px 8px; color:#fbbf24; font-weight:800;">Lv.${r.level}</td>
                <td style="padding:7px 8px; text-align:right; font-family:var(--font-pixel); color:#38bdf8; font-weight:900;">${(r.timeMs / 1000).toFixed(2)}s</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ==========================================
    // 2D DUNGEON DIFFICULTY & MAZE GUIDE MODALS
    // ==========================================
    openDungeonModal(targetMapId, label = 'Crystal Dungeon') {
        if (!this.dungeonModal) return;
        document.exitPointerLock?.();
        this.pendingDungeonMapId = targetMapId;
        const titleEl = document.getElementById('dungeon-modal-title');
        if (titleEl) titleEl.textContent = `🗝️ ${label} — Select Difficulty`;
        const entEl = document.getElementById('dungeon-entries-text');
        const entries = this.game?.player?.dungeonEntries !== undefined ? this.game.player.dungeonEntries : 7;
        if (entEl) {
            entEl.textContent = `${entries} / 7`;
            entEl.style.color = entries > 0 ? '#4ade80' : '#ef4444';
        }
        this.dungeonModal.style.display = 'flex';
    }

    openMazeGuideModal() {
        if (!this.mazeGuideModal) return;
        document.exitPointerLock?.();
        const grid = document.getElementById('maze-guide-floors-grid');
        if (grid) {
            grid.innerHTML = '';
            const floorNames = [
                'Floor 1: Verdant Labyrinth',
                'Floor 2: Mossy Ruins',
                'Floor 3: Shadow Cavern (🗝️ Dungeon 1)',
                'Floor 4: Abyssal Grotto',
                'Floor 5:Infernal Core',
                'Floor 6: Magma Sanctum',
                'Floor 7: Monolith Depths (🗝️ Dungeon 2)',
                'Floor 8: Obsidian Vault',
                'Floor 9: Astral Nexus',
                'Floor 10: The Void Throne'
            ];
            for (let f = 1; f <= 10; f++) {
                const btn = document.createElement('button');
                btn.className = 'btn-item-action';
                btn.style.background = (f === 3 || f === 7) ? '#0284c7' : '#1e293b';
                btn.style.border = '1px solid #38bdf8';
                btn.style.padding = '10px';
                btn.style.textAlign = 'left';
                btn.innerHTML = `<strong style="color:#00e5ff;">🌀 ${floorNames[f - 1]}</strong>`;
                btn.onclick = () => {
                    this.mazeGuideModal.style.display = 'none';
                    this.game.teleportToFloor(`floor${f}`, floorNames[f - 1]);
                };
                grid.appendChild(btn);
            }
        }
        this.mazeGuideModal.style.display = 'flex';
    }

    // ==========================================
    // WORLD ANNOUNCEMENTS & TAVERN SPEEDRUN TIMER
    // ==========================================
    showWorldAnnouncement(messageHtml, borderColor = '#ffd700') {
        if (!this.lootBroadcastEl) return;
        this.lootBroadcastEl.innerHTML = messageHtml;
        this.lootBroadcastEl.style.borderColor = borderColor;
        this.lootBroadcastEl.style.display = 'block';
        clearTimeout(this.broadcastTimer);
        this.broadcastTimer = setTimeout(() => {
            if (this.lootBroadcastEl) this.lootBroadcastEl.style.display = 'none';
        }, 5500);
    }

    updateTavernTimer(elapsedSec, visible = true) {
        if (!this.tavernTimerEl) return;
        if (!visible) {
            this.tavernTimerEl.style.display = 'none';
            return;
        }
        this.tavernTimerEl.style.display = 'inline-block';
        const mins = Math.floor(elapsedSec / 60);
        const secs = (elapsedSec % 60).toFixed(2).padStart(5, '0');
        this.tavernTimerEl.textContent = `⏱️ ${String(mins).padStart(2, '0')}:${secs}`;
    }

    showDeathScreen(hasRevivalJuice = false) {
        if (!this.deathScreen) return;
        document.exitPointerLock?.();
        const btnRevive = document.getElementById('btn-death-revive');
        if (btnRevive) {
            btnRevive.style.display = hasRevivalJuice ? 'inline-flex' : 'none';
        }
        this.deathScreen.style.display = 'flex';
    }

    hideDeathScreen() {
        if (this.deathScreen) {
            this.deathScreen.style.display = 'none';
        }
    }

    renderSkills() {
        const player = this.game.player;
        if (!player) return;

        const pClass = player.baseStats?.playerClass || null;
        const selArea = document.getElementById('class-selection-area');
        const activeArea = document.getElementById('active-class-area');
        const promptEl = document.getElementById('class-selection-prompt');
        const classGrid = document.getElementById('available-classes-grid');

        if (!pClass || !CLASSES[pClass]) {
            // Player has not chosen a class yet!
            selArea.style.display = 'block';
            activeArea.style.display = 'none';
            classGrid.innerHTML = '';

            const wpnType = this.game.getEquippedWeaponType();

            if (!wpnType) {
                promptEl.innerHTML = `<p style="color:#f43f5e; font-weight:800; font-size:1.05rem; text-align:center;">
                    ⚠️ Equip a weapon from your Bag (B) to view available classes.
                </p>`;
                return;
            }

            promptEl.innerHTML = `<p style="color:#38bdf8; font-size:1.0rem; text-align:center;">
                Equipped Weapon: <strong>${wpnType.toUpperCase()}</strong>. Choose your permanent class path:
            </p>`;

            for (const cName in CLASSES) {
                const cData = CLASSES[cName];
                if (cData.weapon === wpnType) {
                    const card = document.createElement('div');
                    card.className = 'skill-class-card';
                    card.innerHTML = `
                        <h3><span style="color:${this.getAuraHex(cData.aura)};">●</span> ${cName}</h3>
                        <div class="skill-class-card-desc">Weapon Specialization: <strong>${wpnType.charAt(0).toUpperCase() + wpnType.slice(1)}</strong></div>
                        <div style="font-size:0.8rem; color:#cbd5e1; margin-top:4px;">
                            ${cData.skills.map(s => `• <strong>${s.name}</strong> (${s.type === 'active' ? 'Active' : 'Passive'})`).join('<br>')}
                        </div>
                        <button class="btn-item-action" style="margin-top:8px; background:#f59e0b; color:#000; font-weight:900;">
                            AWAKEN AS ${cName.toUpperCase()} ⚔️
                        </button>
                    `;
                    card.onclick = () => {
                        this.promptChooseClass(cName);
                    };
                    classGrid.appendChild(card);
                }
            }
        } else {
            // Player already chose a class: Show 4 class skills!
            selArea.style.display = 'none';
            activeArea.style.display = 'block';

            document.getElementById('active-class-name').textContent = pClass;
            const auraEl = document.getElementById('active-class-aura');
            if (auraEl) {
                auraEl.textContent = `${CLASSES[pClass].aura.toUpperCase()} AURA`;
                auraEl.style.borderColor = this.getAuraHex(CLASSES[pClass].aura);
                auraEl.style.color = this.getAuraHex(CLASSES[pClass].aura);
            }
            document.getElementById('active-class-weapon').textContent = CLASSES[pClass].weapon.toUpperCase();

            const skillsList = document.getElementById('class-skills-list');
            skillsList.innerHTML = '';

            CLASSES[pClass].skills.forEach(s => {
                const unlocked = player.level >= s.unlock;
                const statusColor = unlocked ? '#22c55e' : '#f43f5e';

                const row = document.createElement('div');
                row.className = 'skill-row';
                row.innerHTML = `
                    <div class="skill-row-left">
                        <div class="skill-title-row">
                            <span class="skill-name-badge" style="color:${statusColor};">${s.name}</span>
                            <span class="skill-type-tag" style="background:${s.type === 'active' ? 'rgba(56,189,248,0.2)' : 'rgba(168,85,247,0.2)'}; color:${s.type === 'active' ? '#38bdf8' : '#c084fc'};">
                                ${s.type.toUpperCase()}
                            </span>
                        </div>
                        <div class="skill-desc-text">${s.desc}</div>
                    </div>
                    <div class="skill-row-right">
                        <div class="skill-unlock-tag" style="color:${statusColor};">Lv.${s.unlock}</div>
                        ${s.cd ? `<div class="skill-cd-tag">${s.cd / 1000}s CD</div>` : ''}
                    </div>
                `;
                skillsList.appendChild(row);
            });
        }
    }

    getAuraHex(aura) {
        const colors = {
            red: '#ef4444',
            blue: '#3b82f6',
            green: '#22c55e',
            white: '#f8fafc',
            orange: '#f97316',
            lightning: '#eab308'
        };
        return colors[aura] || '#38bdf8';
    }

    promptChooseClass(className) {
        this.pendingClassToChoose = className;
        const msgEl = document.getElementById('confirm-modal-msg');
        if (msgEl) {
            msgEl.innerHTML = `Are you sure you want to awaken as a <strong>${className}</strong>?<br><br><span style="color:#f59e0b; font-weight:800;">This choice is permanent!</span>`;
        }
        if (this.confirmModal) this.confirmModal.style.display = 'flex';
    }

    // Render 2D Minimap
    renderMinimap(playerPos, playerRotY, monsters, portals) {
        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const w = 110, h = 110;
        const cx = w / 2, cy = h / 2;
        const mapBound = this.game?.world?.mapBound || 128;
        const scale = Math.max(0.36, Math.min(1.35, 50 / mapBound)); // Auto-scales for 15x Town & 10x Maze!

        ctx.clearRect(0, 0, w, h);

        // Circular clip
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 52, 0, Math.PI * 2);
        ctx.clip();

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 20) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, x); ctx.lineTo(w, x); ctx.stroke();
        }

        // Draw Portals (Cyan dots)
        if (portals) {
            ctx.fillStyle = '#00e5ff';
            for (const p of portals) {
                const mx = cx + (p.x - playerPos.x) * scale;
                const my = cy + (p.z - playerPos.z) * scale;
                ctx.beginPath();
                ctx.arc(mx, my, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Monsters (Red / Yellow dots)
        if (monsters) {
            for (const m of monsters) {
                if (!m.isAlive) continue;
                const mx = cx + (m.group.position.x - playerPos.x) * scale;
                const my = cy + (m.group.position.z - playerPos.z) * scale;
                ctx.fillStyle = m.category === 'floor_boss' ? '#ffd600' : '#f43f5e';
                const r = m.category === 'floor_boss' ? 5 : 3;
                ctx.beginPath();
                ctx.arc(mx, my, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Player in Center (Green Arrow pointing forward)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-playerRotY);

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }
}
