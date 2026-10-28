import { CLASSES, getItemSellPrice, CASH_SHOP_ITEMS } from './game_data.js';

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
        this.inspectModal = document.getElementById('inspect-modal');
        this.dailyMissionsModal = document.getElementById('daily-missions-modal');
        this.tavernModal = document.getElementById('tavern-modal');
        this.leaderboardModal = document.getElementById('leaderboard-modal');
        this.friendsModal = document.getElementById('friends-modal');
        this.partyHud = document.getElementById('party-hud');
        this.partyMembersList = document.getElementById('party-members-list');
        this.partyInvitePrompt = document.getElementById('party-invite-prompt');
        this.pendingPartyInviteFrom = null;
        this.dungeonModal = document.getElementById('dungeon-modal');
        this.mazeGuideModal = document.getElementById('maze-guide-modal');
        this.hauntedHouseModal = document.getElementById('haunted-house-modal');
        this.cashShopModal = document.getElementById('cash-shop-modal');
        this.tradeDialog = document.getElementById('trade-dialog');
        this.tradeScreen = document.getElementById('trade-screen');
        this.isTradeOpen = false;
        this.currentShopCategory = 'all';
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

        // Unequip items by clicking equipped slot (All 8 slots: weapon, armor, leggings, necklace, ring, earrings, aura, pet)
        ['weapon', 'armor', 'leggings', 'necklace', 'ring', 'earrings', 'aura', 'pet'].forEach(slotKey => {
            const slotEl = document.getElementById('slot-' + slotKey);
            if (slotEl) {
                slotEl.onclick = () => this.game.unequipItem(slotKey);
            }
        });

        // Inspect Modal Close Button
        const btnCloseInspect = document.getElementById('btn-close-inspect');
        if (btnCloseInspect) {
            btnCloseInspect.onclick = () => this.closeInspectModal();
        }

        // Player Interaction Context Popup Buttons (Inspect, Add Friend, Invite Party, Trade, Invite Raid)
        const btnCtxInspect = document.getElementById('btn-ctx-inspect');
        if (btnCtxInspect) {
            btnCtxInspect.onclick = (e) => {
                e.stopPropagation();
                const target = this.selectedTargetPlayer;
                this.closePlayerInteractionMenu();
                if (target && this.game) {
                    const lookup = target.socketId || target.id || target.name;
                    this.game.inspectPlayer(lookup);
                }
            };
        }
        const btnCtxFriend = document.getElementById('btn-ctx-friend');
        if (btnCtxFriend) {
            btnCtxFriend.onclick = (e) => {
                e.stopPropagation();
                const target = this.selectedTargetPlayer;
                this.closePlayerInteractionMenu();
                if (target && this.game) {
                    const lookup = target.name || target.character_name || target.socketId;
                    this.game.addFriend(lookup);
                }
            };
        }
        const btnCtxParty = document.getElementById('btn-ctx-party');
        if (btnCtxParty) {
            btnCtxParty.onclick = (e) => {
                e.stopPropagation();
                const target = this.selectedTargetPlayer;
                this.closePlayerInteractionMenu();
                if (target && this.game) {
                    const lookup = target.name || target.character_name || target.socketId;
                    this.game.inviteParty(lookup);
                }
            };
        }
        const btnCtxTrade = document.getElementById('btn-ctx-trade');
        if (btnCtxTrade) {
            btnCtxTrade.onclick = (e) => {
                e.stopPropagation();
                const target = this.selectedTargetPlayer;
                this.closePlayerInteractionMenu();
                if (target && this.game) {
                    const lookup = target.name || target.character_name || target.socketId;
                    this.game.requestTrade(lookup);
                }
            };
        }
        const btnCtxRaid = document.getElementById('btn-ctx-raid');
        if (btnCtxRaid) {
            btnCtxRaid.onclick = (e) => {
                e.stopPropagation();
                const target = this.selectedTargetPlayer;
                this.closePlayerInteractionMenu();
                if (target && this.game) {
                    const lookup = target.name || target.character_name || target.socketId;
                    this.game.inviteRaid(lookup);
                }
            };
        }
        const btnCloseCtx = document.getElementById('btn-close-player-ctx');
        if (btnCloseCtx) {
            btnCloseCtx.onclick = (e) => {
                e.stopPropagation();
                this.closePlayerInteractionMenu();
            };
        }

        // Trade Modal & Dialog Handlers
        const btnTradeAccept = document.getElementById('btn-trade-accept');
        if (btnTradeAccept) btnTradeAccept.onclick = () => this.game?.respondTrade(true);

        const btnTradeDecline = document.getElementById('btn-trade-decline');
        if (btnTradeDecline) btnTradeDecline.onclick = () => this.game?.respondTrade(false);

        const btnCloseTrade = document.getElementById('btn-close-trade');
        if (btnCloseTrade) btnCloseTrade.onclick = () => this.game?.cancelTrade();

        const btnTradeCancel = document.getElementById('btn-trade-cancel');
        if (btnTradeCancel) btnTradeCancel.onclick = () => this.game?.cancelTrade();

        const btnTradeConfirm = document.getElementById('btn-trade-confirm');
        if (btnTradeConfirm) btnTradeConfirm.onclick = () => this.game?.confirmTrade();

        const tradeMyGold = document.getElementById('trade-my-gold');
        if (tradeMyGold) {
            tradeMyGold.oninput = (e) => this.game?.setTradeGold(e.target.value);
            tradeMyGold.onchange = (e) => this.game?.setTradeGold(e.target.value);
        }

        // Cash Shop Buttons (Keybind 'C' + HUD Button)
        const btnCashShop = document.getElementById('btn-cash-shop');
        if (btnCashShop) btnCashShop.onclick = () => this.toggleCashShop();

        const mBtnShop = document.getElementById('m-btn-shop');
        if (mBtnShop) mBtnShop.onclick = () => this.toggleCashShop();

        const btnCloseCashShop = document.getElementById('btn-close-cash-shop');
        if (btnCloseCashShop) btnCloseCashShop.onclick = () => this.toggleCashShop();

        // Cash Shop Filter Tabs
        ['all', 'pet', 'aura', 'utility'].forEach(cat => {
            const tabBtn = document.getElementById(`shop-tab-${cat}`);
            if (tabBtn) {
                tabBtn.onclick = () => {
                    document.querySelectorAll('.shop-filter-tabs .pill-btn').forEach(b => b.classList.remove('active'));
                    tabBtn.classList.add('active');
                    this.renderCashShop(cat);
                };
            }
        });

        window.addEventListener('click', (e) => {
            const menu = document.getElementById('player-interaction-menu');
            if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && e.target.id !== 'canvas-3d') {
                this.closePlayerInteractionMenu();
            }
        });

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

        const btnCloseHaunted = document.getElementById('btn-close-haunted-house');
        if (btnCloseHaunted) btnCloseHaunted.onclick = () => {
            if (this.hauntedHouseModal) this.hauntedHouseModal.style.display = 'none';
            if (this.game) this.game.portalCooldown = 4.0;
        };

        window.enterHauntedHouseChallenge = (difficulty) => {
            if (this.hauntedHouseModal) this.hauntedHouseModal.style.display = 'none';
            if (this.game) this.game.enterHauntedHouse(difficulty);
        };

        // 🤝 Friends List [F] & Party Event Listeners
        const btnCloseFriends = document.getElementById('btn-close-friends');
        if (btnCloseFriends) btnCloseFriends.onclick = () => this.closeFriendsModal();

        const btnSendAddFriend = document.getElementById('btn-send-add-friend');
        const inputAddFriend = document.getElementById('input-add-friend');
        if (btnSendAddFriend) {
            btnSendAddFriend.onclick = () => {
                const targetName = inputAddFriend ? inputAddFriend.value.trim() : '';
                if (!targetName) return;
                if (this.game) this.game.addFriend(targetName);
                if (inputAddFriend) inputAddFriend.value = '';
            };
        }
        if (inputAddFriend) {
            inputAddFriend.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (btnSendAddFriend) btnSendAddFriend.click();
                }
            });
        }

        const btnPartyAccept = document.getElementById('btn-party-accept');
        if (btnPartyAccept) btnPartyAccept.onclick = () => this.respondPartyInvite(true);

        const btnPartyDecline = document.getElementById('btn-party-decline');
        if (btnPartyDecline) btnPartyDecline.onclick = () => this.respondPartyInvite(false);

        const btnLeaveParty = document.getElementById('btn-leave-party');
        if (btnLeaveParty) btnLeaveParty.onclick = () => this.leaveParty();
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

        // Player Title Tag with Tier Colors & Glow
        const titleTag = document.getElementById('player-title-tag');
        if (titleTag) {
            if (player.title) {
                titleTag.style.display = 'block';
                titleTag.textContent = `<${player.title}>`;
                const tUpper = String(player.title).toUpperCase();
                if (tUpper.includes('FLOOR MASTER')) {
                    titleTag.style.color = '#ff4444';
                    titleTag.style.textShadow = '0 0 10px rgba(255, 68, 68, 0.7)';
                } else if (tUpper.includes('FLOOR DOMINATOR')) {
                    titleTag.style.color = '#e040fb';
                    titleTag.style.textShadow = '0 0 10px rgba(224, 64, 251, 0.7)';
                } else if (tUpper.includes('FLOOR CONQUEROR')) {
                    titleTag.style.color = '#ffd700';
                    titleTag.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
                } else {
                    titleTag.style.color = '#00e5ff';
                    titleTag.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.7)';
                }
            } else {
                titleTag.style.display = 'none';
            }
        }

        // 🛡️ Distinct Class Logo & Themed Aura Glow in Player Profile Avatar Frame
        const classLogos = {
            'Blademaster':       { icon: '🗡️', color: '#00e5ff', glow: 'rgba(0, 229, 255, 0.45)' },
            'Berserker':         { icon: '⚔️', color: '#ff1744', glow: 'rgba(255, 23, 68, 0.45)' },
            'Healer':            { icon: '🌿', color: '#00e676', glow: 'rgba(0, 230, 118, 0.45)' },
            'Summoner':          { icon: '🔮', color: '#2979ff', glow: 'rgba(41, 121, 255, 0.45)' },
            'Ice Master':        { icon: '❄️', color: '#00b0ff', glow: 'rgba(0, 176, 255, 0.45)' },
            'Sniper':            { icon: '🎯', color: '#ffd600', glow: 'rgba(255, 214, 0, 0.45)' },
            'Explosives Expert': { icon: '💣', color: '#ff6d00', glow: 'rgba(255, 109, 0, 0.45)' },
            'Phantom Striker':   { icon: '🌘', color: '#d500f9', glow: 'rgba(213, 0, 249, 0.45)' },
            'Ninja Assassin':    { icon: '⚡', color: '#ffea00', glow: 'rgba(255, 234, 0, 0.45)' },
            'Tech Genius':       { icon: '🤖', color: '#1de9b6', glow: 'rgba(29, 233, 182, 0.45)' },
            'Novice':            { icon: '🛡️', color: '#94a3b8', glow: 'rgba(148, 163, 184, 0.3)' }
        };
        const logoInfo = classLogos[pClass] || classLogos['Novice'];
        const avatarIcon = document.querySelector('.player-avatar-icon');
        const avatarFrame = document.querySelector('.player-avatar-frame');
        if (avatarIcon) avatarIcon.textContent = logoInfo.icon;
        if (avatarFrame) {
            avatarFrame.style.borderColor = logoInfo.color;
            avatarFrame.style.boxShadow = `0 0 14px ${logoInfo.glow}`;
        }

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

        const reqLevel = Number(item.level || item.levelReq || item.minLevel) || 1;
        const pLevel = Number(this.game?.player?.level) || 1;

        let html = `<div class="tip-title" style="color:${rColor}; text-shadow:0 0 10px ${rColor};">${item.name}</div>`;
        html += `<div class="tip-subtitle">Lv.${reqLevel} ${item.rarity || 'Basic'} ${String(item.type).toUpperCase()}`;
        if (pLevel < reqLevel) {
            html += ` <span style="color:#f87171; font-weight:bold;">(Requires Lv.${reqLevel})</span>`;
        }
        html += `</div>`;

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

        // 1. Render Equipped Slots (All 8 Slots: Weapon, Armor, Leggings, Necklace, Ring, Earrings, Aura, Pet)
        const equipConfig = [
            { key: 'weapon', label: 'WEAPON', defaultText: 'Empty', icon: '⚔️' },
            { key: 'armor', label: 'ARMOR', defaultText: 'Empty', icon: '🛡️' },
            { key: 'leggings', label: 'LEGGINGS', defaultText: 'Empty', icon: '👖' },
            { key: 'necklace', label: 'NECKLACE', defaultText: 'Empty', icon: '📿' },
            { key: 'ring', label: 'RING', defaultText: 'Empty', icon: '💍' },
            { key: 'earrings', label: 'EARRINGS', defaultText: 'Empty', icon: '✨' },
            { key: 'aura', label: 'AURA', defaultText: 'Empty', icon: '✨' },
            { key: 'pet', label: 'PET', defaultText: 'Empty', icon: '🐾' }
        ];

        equipConfig.forEach(cfg => {
            const slotEl = document.getElementById(`slot-${cfg.key}`);
            const viewEl = document.getElementById(`equip-view-${cfg.key}`);
            const item = player.equips && player.equips[cfg.key];

            if (item) {
                let statBonus = '';
                if (item.fixedStat) {
                    const firstStat = Object.entries(item.fixedStat)[0];
                    if (firstStat) statBonus = ` (+${firstStat[1]} ${firstStat[0].toUpperCase()})`;
                }
                if (viewEl) {
                    viewEl.innerHTML = `<span style="color:${item.color || '#38bdf8'}; font-weight:800;">${cfg.icon} ${item.name}${statBonus}</span>`;
                }
                if (slotEl) {
                    slotEl.classList.add('filled');
                    slotEl.onmouseenter = (e) => {
                        if (this.selectedInventoryIndex === null) this.showItemDetail(item, -1);
                        this.showTooltip(item, e);
                    };
                    slotEl.onmousemove = (e) => this.showTooltip(item, e);
                    slotEl.onmouseleave = () => this.hideTooltip();
                }
            } else {
                if (viewEl) viewEl.textContent = cfg.defaultText;
                if (slotEl) {
                    slotEl.classList.remove('filled');
                    slotEl.onmouseenter = null;
                    slotEl.onmousemove = null;
                    slotEl.onmouseleave = null;
                }
            }
        });

        // 2. Render Bag Grid (30 slots)
        const grid = document.getElementById('inventory-slots-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < 30; i++) {
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

                // LEFT CLICK: Locks this item in the inspector or toggles into active Trade offer!
                slotEl.onclick = () => {
                    if (this.isTradeOpen) {
                        this.game?.addOrRemoveTradeItem(i);
                        this.renderInventory();
                        return;
                    }
                    this.selectedInventoryIndex = i;
                    this.renderInventory();
                    this.showItemDetail(item, i);
                };

                // DOUBLE CLICK: Instant Equip or Use!
                slotEl.ondblclick = () => {
                    if (['weapon', 'armor', 'leggings', 'necklace', 'ring', 'earrings', 'aura', 'pet'].includes(item.type)) {
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
        if (s.includes('staff')) return `<svg viewBox="0 0 24 24" width="22" height="22" style="display:inline-block; vertical-align:middle; filter:drop-shadow(0 0 3px #00e5ff);"><line x1="5" y1="21" x2="16" y2="7" stroke="#c084fc" stroke-width="2.2" stroke-linecap="round"/><line x1="4.5" y1="21.5" x2="6.5" y2="19.5" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/><path d="M13 10 C14 6, 18 4, 21 6 C19 9, 17 11, 13 10 Z" fill="#a855f7" stroke="#e9d5ff" stroke-width="1"/><circle cx="17.5" cy="5.5" r="2.5" fill="#00e5ff" stroke="#ffffff" stroke-width="1"/><circle cx="21" cy="3" r="0.8" fill="#ffd700"/><circle cx="14" cy="2" r="0.8" fill="#ffd700"/></svg>`;
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
        if (type === 'necklace' || s.includes('necklace')) return '📿';
        if (type === 'ring' || s.includes('ring')) return '💍';
        if (type === 'earrings' || s.includes('earring')) return '✨';
        if (type === 'aura' || s.includes('aura')) return '✨';
        if (type === 'pet' || s.includes('pet')) return '🐾';
        if (type === 'ticket' || s.includes('ticket')) return '🎫';
        return '📦';
    }

    showItemDetail(item, index) {
        const titleEl = document.getElementById('detail-item-title');
        const descEl = document.getElementById('detail-item-desc');
        const actionsEl = document.getElementById('detail-item-actions');
        if (!titleEl || !descEl || !actionsEl) return;

        const reqLevel = Number(item.level || item.levelReq || item.minLevel) || 1;
        const playerLevel = Number(this.game?.player?.level) || 1;
        const canEquip = playerLevel >= reqLevel;
        const levelBadge = `<span style="font-size:0.75rem; color:${canEquip ? '#4ade80' : '#f87171'}; margin-left:6px; font-weight:bold;">[Lv.${reqLevel}${!canEquip ? ' - REQ LV.' + reqLevel : ''}]</span>`;

        titleEl.innerHTML = `<span style="color:${item.color || '#38bdf8'}; font-weight:900;">${item.name}</span> <span style="font-size:0.75rem; color:#94a3b8;">[${item.rarity || 'Basic'}]</span> ${levelBadge}`;

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

        // If Trade Window is currently open, show Trade Offer Action
        if (this.isTradeOpen && index >= 0) {
            const btnTrade = document.createElement('button');
            btnTrade.className = 'btn-item-action';
            const isOffered = this.game.myTradeItems && this.game.myTradeItems.some(it => it && it.id === item.id);
            btnTrade.textContent = isOffered ? '➖ Remove from Trade' : '➕ Add to Trade';
            btnTrade.style.background = isOffered ? '#dc2626' : '#0284c7';
            btnTrade.style.borderColor = isOffered ? '#ef4444' : '#38bdf8';
            btnTrade.onclick = () => {
                this.game.addOrRemoveTradeItem(index);
                this.renderInventory();
            };
            actionsEl.appendChild(btnTrade);
        }

        if (['weapon', 'armor', 'leggings', 'necklace', 'ring', 'earrings', 'aura', 'pet'].includes(item.type)) {
            const btnEquip = document.createElement('button');
            btnEquip.className = 'btn-item-action';
            if (canEquip) {
                btnEquip.textContent = `⚔️ Equip ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`;
                btnEquip.onclick = () => {
                    this.game.equipItemFromInventory(index);
                    this.selectedInventoryIndex = null;
                    this.renderInventory();
                };
            } else {
                btnEquip.textContent = `🔒 Requires Lv.${reqLevel}`;
                btnEquip.style.opacity = '0.75';
                btnEquip.style.background = '#450a0a';
                btnEquip.style.border = '1px solid #ef4444';
                btnEquip.style.color = '#fca5a5';
                btnEquip.style.cursor = 'not-allowed';
                btnEquip.onclick = () => {
                    this.game.audio.playSfx('bump');
                    this.showToast(`⛔ Level ${reqLevel} required to equip ${item.name}! (You are Lv.${playerLevel})`);
                };
            }
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
        if (this.cashShopModal && this.cashShopModal.style.display === 'flex') {
            this.cashShopModal.style.display = 'none';
            return;
        }
        if (this.tradeScreen && this.tradeScreen.style.display === 'flex') {
            this.game?.cancelTrade();
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
            this.inventoryModal, this.skillsModal, this.inspectModal,
            this.cashShopModal, this.tradeScreen
        ];
        return modals.some(m => m && (m.style.display === 'flex' || m.style.display === 'block'));
    }

    openInspectModal(data) {
        if (!data) return;
        const modal = this.inspectModal || document.getElementById('inspect-modal');
        if (!modal) return;

        const titleEl = document.getElementById('inspect-modal-title');
        if (titleEl) {
            titleEl.textContent = `🔍 Inspect: ${data.name || 'Hero'}`;
        }

        const vitalsEl = document.getElementById('inspect-vitals-header');
        if (vitalsEl) {
            const pClass = data.playerClass || 'Novice';
            const lvl = data.level || 1;
            const hpStr = (data.currentHp !== undefined && data.maxHp !== undefined) ? `HP ${data.currentHp} / ${data.maxHp}` : `Level ${lvl}`;
            const titleHtml = data.title ? ` &nbsp;|&nbsp; <strong style="color:#ffd700; text-shadow:0 0 6px rgba(255,215,0,0.5);">&lt;${data.title}&gt;</strong>` : '';
            vitalsEl.innerHTML = `<strong>Level ${lvl}</strong> &nbsp;|&nbsp; <strong style="color:#38bdf8;">${pClass}</strong>${titleHtml} &nbsp;|&nbsp; <strong style="color:#4ade80;">${hpStr}</strong>`;
        }

        const gridEl = document.getElementById('inspect-equips-grid');
        if (gridEl) {
            gridEl.innerHTML = '';
            const equips = data.equips || {};
            const slots = [
                { key: 'weapon', label: 'Weapon', icon: '⚔️' },
                { key: 'armor', label: 'Armor', icon: '🛡️' },
                { key: 'leggings', label: 'Leggings', icon: '👖' },
                { key: 'necklace', label: 'Necklace', icon: '📿' },
                { key: 'ring', label: 'Ring', icon: '💍' },
                { key: 'earrings', label: 'Earrings', icon: '✨' },
                { key: 'aura', label: 'Aura', icon: '✨' },
                { key: 'pet', label: 'Pet', icon: '🐾' }
            ];

            slots.forEach(s => {
                const item = equips[s.key];
                const card = document.createElement('div');
                card.className = 'inspect-equip-card';

                if (!item) {
                    card.innerHTML = `
                        <div class="inspect-equip-slot-name">${s.icon} ${s.label}</div>
                        <div class="inspect-empty">Empty (None)</div>
                    `;
                } else {
                    const rarityColor = item.color || RARITY_COLORS[item.rarity] || '#ffffff';
                    const displayName = item.enhanceLevel ? `${item.name} +${item.enhanceLevel}` : item.name;

                    let socketsHtml = '';
                    if (['necklace', 'ring', 'earrings'].includes(item.type)) {
                        const maxGems = { Basic: 1, Rare: 1, Unique: 2, Legendary: 3, Godly: 4, Divine: 5 }[item.rarity] || 0;
                        if (maxGems > 0) {
                            const count = item.gemCount || 0;
                            let sockets = '';
                            for (let i = 0; i < maxGems; i++) {
                                sockets += (i < count) ? '◆ ' : '◇ ';
                            }
                            socketsHtml = `<div class="inspect-sockets">Sockets: ${sockets.trim()}</div>`;
                        }
                    }

                    let statsHtml = '';
                    if (item.fixedStat) {
                        for (const k in item.fixedStat) {
                            statsHtml += `<div><b>Fixed:</b> +${item.fixedStat[k]} ${k.toUpperCase()}</div>`;
                        }
                    }
                    if (item.randomStat) {
                        for (const k in item.randomStat) {
                            statsHtml += `<div><b>Random:</b> +${item.randomStat[k]} ${k.toUpperCase()}</div>`;
                        }
                    }

                    card.innerHTML = `
                        <div class="inspect-equip-slot-name">${s.icon} ${s.label}</div>
                        <div class="inspect-item-name" style="color:${rarityColor};">${displayName}</div>
                        <div class="inspect-item-sub">Lv.${item.level || 1} [${item.rarity || 'Basic'}]</div>
                        ${socketsHtml}
                        <div class="inspect-item-stat">${statsHtml || '<div style="color:#64748b;">No extra stats</div>'}</div>
                    `;
                }

                gridEl.appendChild(card);
            });
        }

        document.exitPointerLock?.();
        modal.style.display = 'flex';
    }

    closeInspectModal() {
        const modal = this.inspectModal || document.getElementById('inspect-modal');
        if (modal) modal.style.display = 'none';
    }

    openPlayerInteractionMenu(targetPlayer, clientX, clientY) {
        if (!targetPlayer) return;
        this.selectedTargetPlayer = targetPlayer;
        const menu = document.getElementById('player-interaction-menu');
        if (!menu) return;

        const nameEl = document.getElementById('player-ctx-name');
        const lvlEl = document.getElementById('player-ctx-level');
        const charName = targetPlayer.name || targetPlayer.character_name || 'Exonian';
        if (nameEl) nameEl.textContent = charName;
        if (lvlEl) {
            const pClass = targetPlayer.className || targetPlayer.playerClass || 'Novice';
            lvlEl.textContent = `Lv.${targetPlayer.level || 1} • ${pClass}`;
        }

        menu.style.display = 'flex';

        const menuWidth = 210;
        const menuHeight = 220;
        const maxX = window.innerWidth - menuWidth - 10;
        const maxY = window.innerHeight - menuHeight - 10;
        const left = Math.max(10, Math.min((clientX || window.innerWidth / 2) + 10, maxX));
        const top = Math.max(10, Math.min((clientY || window.innerHeight / 2) - 30, maxY));

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }

    closePlayerInteractionMenu() {
        const menu = document.getElementById('player-interaction-menu');
        if (menu) menu.style.display = 'none';
        this.selectedTargetPlayer = null;
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
        ['floor', 'mini', 'common'].forEach(t => {
            const btn = document.getElementById(`lb-tab-${t}`);
            if (btn) btn.classList.toggle('active', t === tab);
        });
        const tbody = document.getElementById('leaderboard-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:22px; color:#94a3b8;">Loading Supabase Tavern Rankings...</td></tr>';
        }
        if (this.game && this.game.socket) {
            this.game.socket.emit('getTavernLeaderboard');
        }
        this.leaderboardModal.style.display = 'flex';
    }

    renderLeaderboard(tab = 'floor') {
        this.openLeaderboardModal(tab);
    }

    renderLeaderboardData(rows) {
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!Array.isArray(rows) || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:22px; color:#94a3b8;">No Tavern Speedruns recorded yet in Supabase!</td></tr>';
            return;
        }

        const classLogos = {
            'Blademaster': '🗡️', 'Berserker': '⚔️', 'Healer': '🌿',
            'Summoner': '🔮', 'Ice Master': '❄️', 'Sniper': '🎯',
            'Explosives Expert': '💣', 'Phantom Striker': '🌘',
            'Ninja Assassin': '⚡', 'Tech Genius': '🤖', 'Novice': '🛡️'
        };

        const catLabels = {
            'floor_boss': '👑 Floor Boss',
            'mini_boss': '⭐ Mini Boss',
            'common_mobs': '👾 Common'
        };

        const myName = (this.game && this.game.player && this.game.player.name) || '';

        rows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            const isTop3 = idx < 3;
            const rankMedal = idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : `${idx + 1}`));
            const pName = r.character_name || r.name || 'Hero';
            const isSelf = myName && (pName === myName);
            const pClass = r.player_class || r.playerClass || 'Novice';
            const icon = classLogos[pClass] || '🛡️';
            const pLvl = r.player_level || r.level || 1;
            const mobLvl = r.mob_level || 1;
            const oppStr = `${catLabels[r.mob_type] || 'Boss'} (Lv.${mobLvl})`;

            const rawVal = Number(r.time_taken !== undefined ? r.time_taken : (r.timeMs / 1000 || 0));
            const sec = (rawVal > 500) ? (rawVal / 1000) : rawVal;
            const mins = Math.floor(sec / 60);
            const remainSec = (sec % 60).toFixed(2);
            const timeFormatted = mins > 0 ? `${mins}m ${remainSec}s` : `${remainSec}s`;

            tr.style.borderBottom = '1px solid rgba(51,65,85,0.6)';
            if (isSelf) {
                tr.style.background = 'rgba(0, 229, 255, 0.15)';
            }
            tr.innerHTML = `
                <td style="padding:7px 8px; font-weight:900; color:${isTop3 ? '#ffd700' : '#94a3b8'};">${rankMedal}</td>
                <td style="padding:7px 8px; font-weight:800; color:${isSelf ? '#00e5ff' : '#fff'};">${pName} <span style="font-size:0.75rem; color:#ffd700; font-weight:normal;">Lv.${pLvl}</span></td>
                <td style="padding:7px 8px; color:#4ade80;">${icon} ${pClass}</td>
                <td style="padding:7px 8px; color:#fbbf24; font-weight:700;">${oppStr}</td>
                <td style="padding:7px 8px; text-align:right; font-family:var(--font-pixel); color:#38bdf8; font-weight:900;">${timeFormatted}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ==========================================
    // 🤝 FRIENDS SYSTEM (HOTKEY 'F')
    // ==========================================
    openFriendsModal() {
        if (!this.friendsModal) return;
        document.exitPointerLock?.();
        this.friendsModal.style.display = 'flex';
        if (this.game && this.game.socket) {
            this.game.socket.emit('getFriendsList');
        }
    }

    closeFriendsModal() {
        if (this.friendsModal) this.friendsModal.style.display = 'none';
    }

    toggleFriendsModal() {
        if (!this.friendsModal) return;
        if (this.friendsModal.style.display === 'flex') {
            this.closeFriendsModal();
        } else {
            this.openFriendsModal();
        }
    }

    renderFriendsList(friendsList) {
        const container = document.getElementById('friends-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (!Array.isArray(friendsList) || friendsList.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:20px; margin:0;">Your friends list is empty. Add friends by name above!</p>';
            return;
        }

        const classLogos = {
            'Blademaster': '🗡️', 'Berserker': '⚔️', 'Healer': '🌿',
            'Summoner': '🔮', 'Ice Master': '❄️', 'Sniper': '🎯',
            'Explosives Expert': '💣', 'Phantom Striker': '🌘',
            'Ninja Assassin': '⚡', 'Tech Genius': '🤖', 'Novice': '🛡️'
        };

        friendsList.forEach(f => {
            const row = document.createElement('div');
            row.className = 'friend-item-row';
            const isOnline = !!f.online;
            const pClass = f.pClass || 'Novice';
            const icon = classLogos[pClass] || '🛡️';
            const mapStr = isOnline ? `[${f.mapId || 'Town'}]` : '(Offline)';

            row.innerHTML = `
                <div class="friend-meta-left">
                    <div class="friend-status-dot ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></div>
                    <div class="friend-name-col">
                        <span class="friend-name-text">${f.id} <span style="font-size:0.75rem; color:#ffd700; font-weight:normal;">Lv.${f.level || 1}</span></span>
                        <span class="friend-sub-text">${icon} ${pClass} • ${mapStr}</span>
                    </div>
                </div>
                <div class="friend-actions-right">
                    ${isOnline ? `<button type="button" class="friend-act-btn friend-party-btn" onclick="window.game && window.game.inviteParty('${f.id}')">Party</button>` : ''}
                    <button type="button" class="friend-act-btn friend-remove-btn" onclick="window.game && window.game.removeFriend('${f.id}')">Remove</button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    // ==========================================
    // ⚔️ PARTY SYSTEM (PROMPT & HUD)
    // ==========================================
    showPartyInvitePrompt(data) {
        if (!data || !this.partyInvitePrompt) return;
        this.pendingPartyInviteFrom = data.fromId || data.from || 'Adventurer';
        const txt = document.getElementById('party-invite-text');
        if (txt) txt.textContent = `${this.pendingPartyInviteFrom} has invited you to join their party!`;
        this.partyInvitePrompt.style.display = 'block';
    }

    closePartyInvitePrompt() {
        if (this.partyInvitePrompt) this.partyInvitePrompt.style.display = 'none';
        this.pendingPartyInviteFrom = null;
    }

    respondPartyInvite(accept) {
        if (this.pendingPartyInviteFrom && this.game && this.game.socket) {
            this.game.socket.emit('partyInviteResponse', { fromId: this.pendingPartyInviteFrom, accept });
        }
        this.closePartyInvitePrompt();
    }

    leaveParty() {
        if (this.game && this.game.socket) {
            this.game.socket.emit('leaveParty');
        }
        this.updatePartyHUD(null);
    }

    updatePartyHUD(partyData) {
        const hud = this.partyHud || document.getElementById('party-hud');
        const list = this.partyMembersList || document.getElementById('party-members-list');
        const title = document.getElementById('party-hud-title');
        if (!hud || !list) return;

        if (!partyData || !Array.isArray(partyData.members) || partyData.members.length <= 1) {
            hud.style.display = 'none';
            list.innerHTML = '';
            return;
        }

        hud.style.display = 'block';
        if (title) title.textContent = `⚔️ Party (${partyData.members.length}/4)`;
        list.innerHTML = '';

        const classLogos = {
            'Blademaster': '🗡️', 'Berserker': '⚔️', 'Healer': '🌿',
            'Summoner': '🔮', 'Ice Master': '❄️', 'Sniper': '🎯',
            'Explosives Expert': '💣', 'Phantom Striker': '🌘',
            'Ninja Assassin': '⚡', 'Tech Genius': '🤖', 'Novice': '🛡️'
        };

        const myName = (this.game && this.game.player && this.game.player.name) || '';

        partyData.members.forEach(m => {
            const card = document.createElement('div');
            card.className = 'party-member-card';

            const isLeader = partyData.leaderId === m.id;
            const isMe = m.name === myName || m.id === myName;
            const pClass = m.playerClass || 'Novice';
            const icon = classLogos[pClass] || '🛡️';

            const maxHp = Number(m.maxHp) || 100;
            const curHp = (typeof m.currentHp === 'number') ? m.currentHp : maxHp;
            const hpPct = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
            const isGhost = !!m.isGhost;
            const barBg = isGhost ? '#64748b' : (hpPct < 30 ? '#ef4444' : '#22c55e');

            card.innerHTML = `
                <div class="party-member-row">
                    <span class="party-member-name" style="color:${isMe ? '#38bdf8' : '#f8fafc'};">
                        ${isLeader ? '<span class="party-member-leader" title="Party Leader">👑</span>' : ''}
                        ${m.name || m.id}
                        <span style="font-size:0.68rem; color:#ffd700; font-weight:normal;">Lv.${m.level || 1}</span>
                        ${isGhost ? '<span style="color:#ef4444; font-size:0.65rem;">(DEAD)</span>' : ''}
                    </span>
                    <span class="party-member-class">${icon} ${pClass}</span>
                </div>
                <div class="party-hp-bar">
                    <div class="party-hp-fill" style="width:${hpPct}%; background:${barBg};"></div>
                </div>
            `;
            list.appendChild(card);
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

    openHauntedHouseModal() {
        if (!this.hauntedHouseModal) {
            this.hauntedHouseModal = document.getElementById('haunted-house-modal');
        }
        if (!this.hauntedHouseModal) return;
        document.exitPointerLock?.();

        // 2D Solo-only check
        if (this.game && this.game.partyMembers && this.game.partyMembers.length > 0) {
            this.showToast('👻 The Haunted House is a solo challenge. Please leave your party.');
            return;
        }

        this.hauntedHouseModal.style.display = 'flex';
    }

    showHauntedHouseClear() {
        const vText = document.createElement('div');
        vText.innerHTML = `
            <h1 style="font-size:70px; margin:0; text-shadow:0 0 35px #E040FB, 0 0 70px #9c27b0, 4px 4px 0 #000; letter-spacing: 6px; font-weight:900; animation: pulseText 1s infinite alternate; font-family:'Cinzel Decorative', 'Cinzel', serif;">HOUSE CLEAR!</h1>
        `;
        vText.style.position = 'fixed';
        vText.style.top = '40%';
        vText.style.left = '50%';
        vText.style.transform = 'translate(-50%, -50%)';
        vText.style.textAlign = 'center';
        vText.style.color = '#E040FB';
        vText.style.zIndex = '9999';
        vText.style.pointerEvents = 'none';
        document.body.appendChild(vText);
        setTimeout(() => {
            if (vText.parentNode) vText.parentNode.removeChild(vText);
        }, 4000);
    }

    openMazeGuideModal() {
        if (!this.mazeGuideModal) return;
        document.exitPointerLock?.();

        const titleStr = String((this.game && this.game.player && this.game.player.title) || '').toUpperCase();
        const match = titleStr.match(/(?:FLOOR CONQUEROR|FLOOR DOMINATOR|FLOOR MASTER)\s+(\d+)/);
        const maxConqueredFloor = match ? parseInt(match[1], 10) : 0;

        const grid = document.getElementById('maze-guide-floors-grid');
        if (grid) {
            grid.innerHTML = '';
            const floorNames = [
                'Floor 1: Verdant Labyrinth',
                'Floor 2: Mossy Ruins',
                'Floor 3: Shadow Cavern',
                'Floor 4: Abyssal Grotto',
                'Floor 5: Infernal Core',
                'Floor 6: Magma Sanctum',
                'Floor 7: Monolith Depths',
                'Floor 8: Obsidian Vault',
                'Floor 9: Astral Nexus',
                'Floor 10: The Void Throne'
            ];
            for (let f = 1; f <= 10; f++) {
                const isUnlocked = (f === 1) || (f <= maxConqueredFloor);
                const btn = document.createElement('button');
                btn.className = 'btn-item-action';

                if (isUnlocked) {
                    btn.style.background = '#1e293b';
                    btn.style.border = '1px solid #38bdf8';
                    btn.style.padding = '10px';
                    btn.style.textAlign = 'left';
                    btn.style.cursor = 'pointer';
                    btn.innerHTML = `<strong style="color:#00e5ff;">🌀 ${floorNames[f - 1]}</strong> <span style="font-size:11px; color:#4ade80; float:right;">[CONQUERED]</span>`;
                    btn.onclick = () => {
                        // Party Leader verification
                        if (this.game && this.game.partyMembers && this.game.partyMembers.length > 0 && !this.game.isPartyLeader()) {
                            this.showToast('⚠️ Only the Party Leader can use the Maze Guide for the team!');
                            return;
                        }
                        this.mazeGuideModal.style.display = 'none';
                        this.game.teleportToFloor(`floor${f}`, floorNames[f - 1]);
                    };
                } else {
                    btn.style.background = '#0f172a';
                    btn.style.border = '1px dashed #475569';
                    btn.style.opacity = '0.55';
                    btn.style.padding = '10px';
                    btn.style.textAlign = 'left';
                    btn.style.cursor = 'not-allowed';
                    btn.innerHTML = `<strong style="color:#94a3b8;">🔒 ${floorNames[f - 1]}</strong> <span style="font-size:11px; color:#f87171; float:right;">Requires Floor ${f} Conqueror</span>`;
                    btn.onclick = () => {
                        this.showToast(`🔒 You must conquer Floor ${f} first to fast-travel here!`);
                    };
                }
                grid.appendChild(btn);
            }
        }
        this.mazeGuideModal.style.display = 'flex';
    }

    updateFloorBossTimer(remainingMs, customLabel = null) {
        const el = document.getElementById('floor-boss-timer-ui');
        const valEl = document.getElementById('floor-boss-timer-val');
        const lblEl = document.getElementById('floor-boss-timer-lbl');
        if (!el || !valEl) return;
        if (remainingMs <= 0) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'inline-flex';
        if (lblEl) {
            lblEl.textContent = customLabel || 'Floor Boss Respawns in:';
        }
        const hrs = Math.floor(remainingMs / 3600000);
        const mins = Math.floor((remainingMs % 3600000) / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        let timeStr = '';
        if (hrs > 0) timeStr += `${hrs}h `;
        timeStr += `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
        valEl.textContent = timeStr;
    }

    // ==========================================
    // WORLD ANNOUNCEMENTS & TAVERN SPEEDRUN TIMER
    // ==========================================
    showWorldAnnouncement(messageHtml, borderColor = '#ffd700', broadcast = true) {
        if (this.lootBroadcastEl) {
            this.lootBroadcastEl.innerHTML = messageHtml;
            this.lootBroadcastEl.style.borderColor = borderColor;
            this.lootBroadcastEl.style.display = 'block';
            clearTimeout(this.broadcastTimer);
            this.broadcastTimer = setTimeout(() => {
                if (this.lootBroadcastEl) this.lootBroadcastEl.style.display = 'none';
            }, 5500);
        }

        // Mirror to World Chat tab
        if (this.game && this.game.appendChatLine) {
            this.game.appendChatLine('world', `📢 ${messageHtml}`);
            if (this.game.activeChatTab !== 'world') {
                const dot = document.getElementById('world-unread-dot');
                if (dot) dot.style.display = 'inline-block';
            }
        }

        // Broadcast to other players via socket
        if (broadcast && this.game?.socket?.connected) {
            this.game.socket.emit('broadcastWorldAnnouncement', { html: messageHtml, color: borderColor });
        }
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

    // ==========================================
    // 💎 CASH SHOP (EXO EMPORIUM) UI METHODS
    // ==========================================
    toggleCashShop() {
        if (!this.cashShopModal) this.cashShopModal = document.getElementById('cash-shop-modal');
        if (!this.cashShopModal) return;

        const isHidden = this.cashShopModal.style.display === 'none' || !this.cashShopModal.style.display;
        this.cashShopModal.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            document.exitPointerLock?.();
            this.renderCashShop(this.currentShopCategory || 'all');
        }
    }

    renderCashShop(category = 'all') {
        this.currentShopCategory = category;
        const grid = document.getElementById('cash-shop-items-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const catalog = CASH_SHOP_ITEMS || [];
        const filtered = catalog.filter(it => {
            if (category === 'all') return true;
            if (category === 'pet') return it.type === 'pet';
            if (category === 'aura') return it.type === 'aura';
            if (category === 'utility') return ['material', 'potion', 'ticket'].includes(it.type);
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:20px; grid-column:1/-1;">No items in this category.</p>`;
            return;
        }

        filtered.forEach(it => {
            const card = document.createElement('div');
            card.className = 'cash-shop-card';
            const icon = this.getItemIcon(it.type, it.sprite);
            const rColor = it.color || '#e040fb';

            card.innerHTML = `
                <div class="cash-shop-card-header">
                    <div class="cash-shop-icon-box" style="border-color:${rColor}; box-shadow:0 0 10px ${rColor}33;">
                        ${icon}
                    </div>
                    <div class="cash-shop-info">
                        <div class="cash-shop-name" style="color:${rColor};">${it.name}</div>
                        <span class="cash-shop-badge" style="background:${rColor}22; color:${rColor}; border:1px solid ${rColor}44;">${it.rarity || it.type.toUpperCase()}</span>
                    </div>
                </div>
                <div class="cash-shop-desc">${it.desc || 'Exclusive cosmetic / utility item.'}</div>
                <div class="cash-shop-footer">
                    <div class="cash-shop-price">💎 FREE TRIAL (0 Gems)</div>
                    <button class="btn-shop-claim" id="btn-claim-${it.id}">Claim / Test ✨</button>
                </div>
            `;

            const btnClaim = card.querySelector(`#btn-claim-${it.id}`);
            if (btnClaim) {
                btnClaim.onclick = () => this.claimCashShopItem(it.id);
            }

            grid.appendChild(card);
        });
    }

    claimCashShopItem(itemId) {
        if (!this.game) return;
        this.game.claimCashShopItem(itemId);
    }

    // ==========================================
    // 🔄 TRADE UI METHODS (2D EXONIE REPLICATED)
    // ==========================================
    showTradeDialog(fromName) {
        if (!this.tradeDialog) this.tradeDialog = document.getElementById('trade-dialog');
        if (!this.tradeDialog) return;
        document.exitPointerLock?.();

        const textEl = document.getElementById('trade-dialog-text');
        if (textEl) textEl.innerHTML = `🤝 <strong>${fromName}</strong> wants to trade with you!`;
        this.tradeDialog.style.display = 'flex';
        this.pendingTradeFrom = fromName;
    }

    hideTradeDialog() {
        if (this.tradeDialog) this.tradeDialog.style.display = 'none';
        this.pendingTradeFrom = null;
    }

    openTradeModal(targetName) {
        this.isTradeOpen = true;
        this.hideTradeDialog();
        if (!this.tradeScreen) this.tradeScreen = document.getElementById('trade-screen');
        if (!this.tradeScreen) return;
        document.exitPointerLock?.();

        const targetEl = document.getElementById('trade-target-name');
        if (targetEl) targetEl.textContent = targetName;

        const myGoldInp = document.getElementById('trade-my-gold');
        if (myGoldInp) myGoldInp.value = 0;

        const theirGoldEl = document.getElementById('trade-their-gold');
        if (theirGoldEl) theirGoldEl.textContent = '0';

        const statusEl = document.getElementById('trade-status-indicator');
        if (statusEl) {
            statusEl.textContent = 'Waiting for offers...';
            statusEl.style.color = '#94a3b8';
        }

        const confirmBtn = document.getElementById('btn-trade-confirm');
        if (confirmBtn) {
            confirmBtn.textContent = 'Confirm Trade';
            confirmBtn.style.background = '#0284c7';
        }

        this.tradeScreen.style.display = 'flex';

        // Auto open inventory bag for smooth trading experience
        if (this.inventoryModal && this.inventoryModal.style.display !== 'flex') {
            this.toggleInventory();
        }

        this.renderTradeSlots();
    }

    closeTradeModal() {
        this.isTradeOpen = false;
        if (this.tradeScreen) this.tradeScreen.style.display = 'none';
        this.renderInventory();
    }

    renderTradeSlots() {
        // My Offer Slots (3 Slots)
        const myGrid = document.getElementById('trade-my-items');
        if (myGrid && this.game) {
            myGrid.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const item = this.game.myTradeItems ? this.game.myTradeItems[i] : null;
                const slotEl = document.createElement('div');
                slotEl.className = `trade-slot-card ${item ? 'filled' : ''}`;

                if (item) {
                    slotEl.innerHTML = `
                        <div class="trade-slot-icon">${this.getItemIcon(item.type, item.sprite)}</div>
                        <div class="trade-slot-name" style="color:${item.color || '#fff'}">${item.name}</div>
                    `;
                    slotEl.title = 'Click to remove from trade';
                    slotEl.onclick = () => {
                        this.game.removeTradeItemAt(i);
                        this.renderTradeSlots();
                        this.renderInventory();
                    };
                } else {
                    slotEl.innerHTML = `<span style="font-size:0.72rem; color:#475569;">+ Item ${i + 1}</span>`;
                    slotEl.title = 'Click an item in your bag to offer';
                }
                myGrid.appendChild(slotEl);
            }
        }

        // Their Offer Slots (3 Slots)
        const theirGrid = document.getElementById('trade-their-items');
        if (theirGrid && this.game) {
            theirGrid.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                const item = this.game.theirTradeItems ? this.game.theirTradeItems[i] : null;
                const slotEl = document.createElement('div');
                slotEl.className = `trade-slot-card ${item ? 'filled' : ''}`;

                if (item) {
                    slotEl.innerHTML = `
                        <div class="trade-slot-icon">${this.getItemIcon(item.type, item.sprite)}</div>
                        <div class="trade-slot-name" style="color:${item.color || '#fff'}">${item.name}</div>
                    `;
                    slotEl.onmouseenter = (e) => this.showTooltip(item, e);
                    slotEl.onmousemove = (e) => this.showTooltip(item, e);
                    slotEl.onmouseleave = () => this.hideTooltip();
                } else {
                    slotEl.innerHTML = `<span style="font-size:0.72rem; color:#475569;">Empty</span>`;
                }
                theirGrid.appendChild(slotEl);
            }
        }
    }

    updateTradeRemoteOffer(gold, items) {
        const theirGoldEl = document.getElementById('trade-their-gold');
        if (theirGoldEl) theirGoldEl.textContent = Number(gold || 0).toLocaleString();
        this.renderTradeSlots();
    }

    setTradeConfirmState(meConfirmed, otherConfirmed) {
        const confirmBtn = document.getElementById('btn-trade-confirm');
        const statusEl = document.getElementById('trade-status-indicator');

        if (confirmBtn) {
            if (meConfirmed) {
                confirmBtn.textContent = 'Waiting for Other Player...';
                confirmBtn.style.background = '#eab308';
            } else {
                confirmBtn.textContent = 'Confirm Trade';
                confirmBtn.style.background = '#0284c7';
            }
        }

        if (statusEl) {
            if (meConfirmed && otherConfirmed) {
                statusEl.textContent = '✅ Both players confirmed! Finalizing...';
                statusEl.style.color = '#4ade80';
            } else if (meConfirmed) {
                statusEl.textContent = '⏳ Waiting for other player to confirm...';
                statusEl.style.color = '#fbbf24';
            } else if (otherConfirmed) {
                statusEl.textContent = '⚡ Other player has confirmed their offer!';
                statusEl.style.color = '#38bdf8';
            } else {
                statusEl.textContent = 'Reviewing trade offers...';
                statusEl.style.color = '#94a3b8';
            }
        }
    }
}

// ============================================================
// TOWN MARKETPLACE SYSTEM (AUTHENTIC 2D EXONIE INTEGRATION)
// Tabs: Wandering Shop, Auction House, Divine Forge, Consumables, Cosmetics
// ============================================================

window.switchMarketTab = function(tabId) {
    const tabs = ['shop', 'ah', 'forge', 'craft', 'pets'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const view = document.getElementById(`market-view-${t}`);
        if (btn) {
            if (t === tabId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        if (view) {
            view.style.display = (t === tabId) ? 'flex' : 'none';
        }
    });

    if (tabId === 'ah') {
        window.switchAhSubtab('browse');
    } else if (tabId === 'forge') {
        window.populateForgeSelect();
        window.updateForgeMaterialCheck();
    } else if (tabId === 'pets') {
        window.updatePetsCraftCheck();
    }
};

window.switchAhSubtab = function(subId) {
    const subtabs = ['browse', 'my', 'list'];
    subtabs.forEach(s => {
        const btn = document.getElementById(`ah-subtab-${s}-btn`);
        const sec = document.getElementById(`ah-subtab-${s}`);
        if (btn) {
            if (s === subId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        if (sec) {
            sec.style.display = (s === subId) ? 'flex' : 'none';
        }
    });

    const socket = window.game?.socket;
    if (subId === 'browse') {
        const query = document.getElementById('ah-search-input')?.value || '';
        if (socket?.connected) socket.emit('ah_search', query);
    } else if (subId === 'my') {
        if (socket?.connected) socket.emit('ah_getMyAuctions');
    } else if (subId === 'list') {
        window.populateAhListSelect();
    }
};

window.ahSearch = function(query) {
    const socket = window.game?.socket;
    if (socket?.connected) {
        socket.emit('ah_search', String(query || '').trim());
    }
};

window.populateAhListSelect = function() {
    const sel = document.getElementById('ah-list-item-select');
    if (!sel) return;
    sel.innerHTML = '';
    const inv = window.game?.player?.inventory || [];
    let found = false;

    inv.forEach((item, idx) => {
        if (!item) return;
        // Rules from 2D: do not auction normal pets/auras or bound enhanced Godly/Divine
        if (item.type === 'aura' && !item.isSeasonal) return;
        if ((item.rarity === 'Godly' || item.rarity === 'Divine') && item.enhanceLevel > 0) return;

        found = true;
        const opt = document.createElement('option');
        opt.value = idx;
        const qtyStr = (item.quantity && item.quantity > 1) ? ` (x${item.quantity})` : '';
        opt.textContent = `[${item.rarity || 'Common'}] ${item.name}${qtyStr} — Slot ${idx + 1}`;
        sel.appendChild(opt);
    });

    if (!found) {
        const opt = document.createElement('option');
        opt.value = -1;
        opt.textContent = 'No tradeable items in inventory';
        sel.appendChild(opt);
    }
};

window.ahList = function() {
    const sel = document.getElementById('ah-list-item-select');
    const priceInput = document.getElementById('ah-list-price');
    const invIdx = parseInt(sel?.value, 10);
    const price = parseInt(priceInput?.value, 10);

    if (isNaN(invIdx) || invIdx < 0) {
        alert('Please select an item from your bag to list.');
        return;
    }
    if (isNaN(price) || price < 1) {
        alert('Please specify a valid asking price greater than 0.');
        return;
    }

    const socket = window.game?.socket;
    if (socket?.connected) {
        socket.emit('ah_list', { invIndex: invIdx, price: price });
    } else {
        alert('Not connected to game server.');
    }
};

window.ahBuy = function(auctionId, price, itemName) {
    if (!confirm(`Buy ${itemName} for ${Number(price).toLocaleString()} Gold?`)) return;
    const socket = window.game?.socket;
    if (socket?.connected) {
        socket.emit('ah_buy', { auctionId: auctionId });
    } else {
        alert('Not connected to game server.');
    }
};

window.ahCancel = function(auctionId) {
    if (!confirm(`Cancel this listing? The item will be returned to your bag.`)) return;
    const socket = window.game?.socket;
    if (socket?.connected) {
        socket.emit('ah_cancel', { auctionId: auctionId });
    } else {
        alert('Not connected to game server.');
    }
};

// ==========================================
// DIVINE FORGE (AUTHENTIC 2D BLACKSMITH ASCENSION)
// ==========================================

window.populateForgeSelect = function() {
    const sel = document.getElementById('forge-godly-select');
    if (!sel) return;
    sel.innerHTML = '';
    const player = window.game?.player;
    if (!player) return;

    let candidates = [];
    if (player.equips?.weapon && player.equips.weapon.rarity === 'Godly') {
        candidates.push({ loc: 'equip', slot: 'weapon', item: player.equips.weapon });
    }
    if (player.equips?.armor && player.equips.armor.rarity === 'Godly') {
        candidates.push({ loc: 'equip', slot: 'armor', item: player.equips.armor });
    }
    (player.inventory || []).forEach((item, idx) => {
        if (item && item.rarity === 'Godly' && ['weapon', 'armor', 'leggings'].includes(item.type)) {
            candidates.push({ loc: 'inv', slot: idx, item: item });
        }
    });

    if (candidates.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No Godly equipment found in bag or equipped';
        sel.appendChild(opt);
    } else {
        candidates.forEach((c) => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ loc: c.loc, slot: c.slot });
            const locName = c.loc === 'equip' ? `[Equipped ${c.slot.toUpperCase()}]` : `[Bag Slot ${c.slot + 1}]`;
            opt.textContent = `${locName} ${c.item.name} (Lv.${c.item.level || 1})`;
            sel.appendChild(opt);
        });
    }
};

window.updateForgeMaterialCheck = function() {
    const player = window.game?.player;
    if (!player) return;

    let countEssence = 0, countRed = 0, countGreen = 0, countBlue = 0;
    (player.inventory || []).forEach(i => {
        if (!i || !i.name) return;
        const n = String(i.name).trim();
        const qty = Number(i.quantity) || 1;
        if (n.includes('Divine Essence')) countEssence += qty;
        if (n.includes('Red Exo Metal')) countRed += qty;
        if (n.includes('Green Exo Metal')) countGreen += qty;
        if (n.includes('Blue Exo Metal')) countBlue += qty;
    });

    const sel = document.getElementById('forge-godly-select');
    let isWeapon = true;
    try {
        const parsed = JSON.parse(sel?.value || '{}');
        if (parsed.loc === 'equip') isWeapon = parsed.slot === 'weapon';
        else if (parsed.loc === 'inv') {
            const itm = player.inventory[parsed.slot];
            isWeapon = itm?.type === 'weapon';
        }
    } catch(e) {}

    const reqGold = isWeapon ? 3000000 : 1000000;
    const reqEssence = isWeapon ? 3 : 1;

    const elEss = document.getElementById('forge-chk-essence');
    if (elEss) {
        elEss.textContent = `(${countEssence}/${reqEssence})`;
        elEss.style.color = countEssence >= reqEssence ? '#22c55e' : '#ef4444';
    }

    const elRed = document.getElementById('forge-chk-red');
    if (elRed) {
        elRed.textContent = `(${countRed}/1)`;
        elRed.style.color = countRed >= 1 ? '#22c55e' : '#ef4444';
    }

    const elGrn = document.getElementById('forge-chk-green');
    if (elGrn) {
        elGrn.textContent = `(${countGreen}/1)`;
        elGrn.style.color = countGreen >= 1 ? '#22c55e' : '#ef4444';
    }

    const elBlu = document.getElementById('forge-chk-blue');
    if (elBlu) {
        elBlu.textContent = `(${countBlue}/1)`;
        elBlu.style.color = countBlue >= 1 ? '#22c55e' : '#ef4444';
    }

    const reqGoldEl = document.getElementById('forge-req-gold');
    if (reqGoldEl) reqGoldEl.textContent = `${reqGold.toLocaleString()} G`;

    const elGold = document.getElementById('forge-chk-gold');
    if (elGold) {
        const hasGold = (player.gold || 0) >= reqGold;
        elGold.textContent = hasGold ? `(${player.gold.toLocaleString()} G Available)` : `(Insufficient: ${player.gold.toLocaleString()} G)`;
        elGold.style.color = hasGold ? '#22c55e' : '#ef4444';
    }
};

window.attemptDivineForge = function() {
    const game = window.game;
    const player = game?.player;
    if (!player) return;

    const sel = document.getElementById('forge-godly-select');
    if (!sel || !sel.value) {
        alert('Please select a Godly equipment piece to ascend.');
        return;
    }

    let targetInfo;
    try {
        targetInfo = JSON.parse(sel.value);
    } catch(e) {
        alert('Invalid item selection.');
        return;
    }

    let targetItem = null;
    if (targetInfo.loc === 'equip') {
        targetItem = player.equips[targetInfo.slot];
    } else if (targetInfo.loc === 'inv') {
        targetItem = player.inventory[targetInfo.slot];
    }

    if (!targetItem || targetItem.rarity !== 'Godly') {
        alert('You need a Godly equipment base to ascend to Divine.');
        return;
    }

    const isWeapon = targetItem.type === 'weapon';
    const reqGold = isWeapon ? 3000000 : 1000000;
    const reqEssence = isWeapon ? 3 : 1;

    let countEssence = 0, countRed = 0, countGreen = 0, countBlue = 0;
    (player.inventory || []).forEach(i => {
        if (!i || !i.name) return;
        const n = String(i.name).trim();
        const qty = Number(i.quantity) || 1;
        if (n.includes('Divine Essence')) countEssence += qty;
        if (n.includes('Red Exo Metal')) countRed += qty;
        if (n.includes('Green Exo Metal')) countGreen += qty;
        if (n.includes('Blue Exo Metal')) countBlue += qty;
    });

    if (countEssence < reqEssence || countRed < 1 || countGreen < 1 || countBlue < 1) {
        alert(`You need ${reqEssence}x Divine Essence, and 1x Red, Green, and Blue Exo Metals.`);
        return;
    }

    if ((player.gold || 0) < reqGold) {
        alert(`You need ${reqGold.toLocaleString()} Gold to forge this ascension.`);
        return;
    }

    // Deduct Materials
    const deduct = (namePart, amount) => {
        let needed = amount;
        for (let i = 0; i < player.inventory.length; i++) {
            if (needed <= 0) break;
            const it = player.inventory[i];
            if (it && it.name && String(it.name).includes(namePart)) {
                const q = it.quantity || 1;
                if (q > needed) {
                    it.quantity -= needed;
                    needed = 0;
                } else {
                    needed -= q;
                    player.inventory[i] = null;
                }
            }
        }
    };

    deduct('Divine Essence', reqEssence);
    deduct('Red Exo Metal', 1);
    deduct('Green Exo Metal', 1);
    deduct('Blue Exo Metal', 1);
    player.gold -= reqGold;

    // Transform to Divine
    targetItem.rarity = 'Divine';
    targetItem.color = '#ffea00';
    targetItem.name = targetItem.name.replace('Godly', 'Divine');
    if (!targetItem.name.includes('Divine')) targetItem.name = `Divine ${targetItem.name}`;
    targetItem.enhanceLevel = 0;

    if (targetItem.fixedStat) {
        for (const k in targetItem.fixedStat) {
            targetItem.fixedStat[k] = Math.floor(targetItem.fixedStat[k] * 2);
        }
    }

    game.audio?.playSfx('lightning');
    game.engine?.addScreenshake(1.2);
    game.engine?.spawnLevelUpVFX(player.pos);
    game.combat?.spawnFloatingDamage(player.pos, '✨ DIVINE ASCENSION COMPLETE! ✨', true, true);

    game.ui?.showWorldAnnouncement(
        `⚡ <strong style="color:#00e5ff;">[DIVINE FORGE] ${player.name}</strong> has ascended <strong style="color:#ffd700;">[Divine] ${targetItem.name}</strong>!`,
        '#ffd700'
    );

    game.recalculateStats();
    game.ui?.updatePlayerHUD(player);
    game.ui?.renderInventory();
    game.saveCharacterToAccountSlot();

    if (game.socket?.connected) {
        game.socket.emit('requestCraftDivine', { baseIndex: targetInfo.loc === 'inv' ? targetInfo.slot : -1 });
    }

    window.populateForgeSelect();
    window.updateForgeMaterialCheck();
};

// ==========================================
// CONSUMABLES & COSMETICS CRAFTING
// ==========================================

window.craftStatForger = function() {
    const game = window.game;
    const player = game?.player;
    if (!player) return;

    if ((player.gold || 0) < 300000) {
        alert('You need 300,000 Gold to craft a Stat Forger.');
        return;
    }

    const freeSlot = player.inventory.findIndex(i => i === null);
    if (freeSlot === -1) {
        alert('Your bag is full! Free up a slot first.');
        return;
    }

    player.gold -= 300000;
    player.inventory[freeSlot] = {
        id: `forger_${Date.now()}`,
        name: 'Unique Stat Forger',
        type: 'material',
        rarity: 'Unique',
        color: '#c084fc',
        desc: 'Reforges random sub-stats (STR / INT) on equipment of matching rarity.',
        quantity: 1
    };

    game.audio?.playSfx('splash');
    game.ui?.showToast('🧪 Successfully crafted 1x Unique Stat Forger!');
    game.ui?.updatePlayerHUD(player);
    game.ui?.renderInventory();
    game.saveCharacterToAccountSlot();
};

window.updatePetsCraftCheck = function() {
    const player = window.game?.player;
    if (!player) return;
    let soulCount = 0;
    (player.inventory || []).forEach(i => {
        if (i && (i.name === 'Soul Piece' || i.name === 'Divine ID Piece')) {
            soulCount += (i.quantity || 1);
        }
    });
    const el = document.getElementById('pets-soul-count');
    if (el) {
        el.textContent = soulCount;
        el.style.color = soulCount >= 10 ? '#4ade80' : '#f472b6';
    }
};

window.craftVoidPet = function() {
    const game = window.game;
    const player = game?.player;
    if (!player) return;

    let soulCount = 0;
    (player.inventory || []).forEach(i => {
        if (i && (i.name === 'Soul Piece' || i.name === 'Divine ID Piece')) {
            soulCount += (i.quantity || 1);
        }
    });

    if (soulCount < 10) {
        alert(`You need 10 Soul Pieces to craft the Void Pet (Current: ${soulCount}/10). Defeat the Wraith King in the Haunted House!`);
        return;
    }

    const freeSlot = player.inventory.findIndex(i => i === null);
    if (freeSlot === -1) {
        alert('Your bag is full! Free up a slot first.');
        return;
    }

    let needed = 10;
    for (let i = 0; i < player.inventory.length; i++) {
        if (needed <= 0) break;
        const it = player.inventory[i];
        if (it && (it.name === 'Soul Piece' || it.name === 'Divine ID Piece')) {
            const q = it.quantity || 1;
            if (q > needed) {
                it.quantity -= needed;
                needed = 0;
            } else {
                needed -= q;
                player.inventory[i] = null;
            }
        }
    }

    player.inventory[freeSlot] = {
        id: `void_pet_${Date.now()}`,
        name: 'Void Pet',
        type: 'aura',
        aura: 'void',
        rarity: 'Godly',
        color: '#e040fb',
        desc: 'A floating spectral void companion that channels dark energy beside you.',
        quantity: 1
    };

    game.audio?.playSfx('lightning');
    game.engine?.spawnGroundShockwave(player.pos, 0x9c27b0, 5.0);
    game.ui?.showWorldAnnouncement(
        `👻 <strong style="color:#00e5ff;">${player.name}</strong> has awakened the mystical <strong style="color:#e040fb;">[Godly] Void Pet</strong>!`,
        '#e040fb'
    );

    game.ui?.updatePlayerHUD(player);
    game.ui?.renderInventory();
    game.saveCharacterToAccountSlot();
    window.updatePetsCraftCheck();
};

// ==========================================
// AUCTION HOUSE SOCKET LISTENERS
// ==========================================
setTimeout(() => {
    const socket = window.game?.socket;
    if (!socket) return;

    socket.on('ah_searchResults', (results) => {
        const grid = document.getElementById('ah-listings-grid');
        if (!grid) return;
        if (!Array.isArray(results) || results.length === 0) {
            grid.innerHTML = '<p style="color:#94a3b8; font-size:0.83rem; grid-column:span 2; text-align:center; padding:20px;">No items currently listed on the Auction House.</p>';
            return;
        }

        let html = '';
        results.forEach(r => {
            const it = r.item_data || {};
            const rCol = it.color || '#38bdf8';
            html += `
                <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:800; color:${rCol}; font-size:0.86rem;">${it.name || r.item_name}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">Seller: ${r.seller_name} | Price: <strong style="color:#ffd700;">${Number(r.price).toLocaleString()} G</strong></div>
                    </div>
                    <button class="btn-item-action" onclick="window.ahBuy('${r.id}', ${r.price}, '${(it.name || r.item_name).replace(/'/g, "\\'")}')" style="background:#22c55e; color:#000; font-weight:800; padding:6px 12px; font-size:0.78rem;">Buy</button>
                </div>
            `;
        });
        grid.innerHTML = html;
    });

    socket.on('ah_myAuctions', (data) => {
        const countEl = document.getElementById('ah-my-count');
        const grid = document.getElementById('ah-my-grid');
        if (countEl) countEl.textContent = data?.count || 0;
        if (!grid) return;

        const auctions = data?.auctions || [];
        if (auctions.length === 0) {
            grid.innerHTML = '<p style="color:#94a3b8; font-size:0.83rem; grid-column:span 2; text-align:center; padding:20px;">You have no active listings.</p>';
            return;
        }

        let html = '';
        auctions.forEach(r => {
            const it = r.item_data || {};
            const rCol = it.color || '#38bdf8';
            html += `
                <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:800; color:${rCol}; font-size:0.86rem;">${it.name || r.item_name}</div>
                        <div style="font-size:0.75rem; color:#ffd700; font-weight:800;">Price: ${Number(r.price).toLocaleString()} Gold</div>
                    </div>
                    <button class="btn-item-action" onclick="window.ahCancel('${r.id}')" style="background:#ef4444; color:#fff; font-weight:800; padding:6px 12px; font-size:0.78rem;">Cancel</button>
                </div>
            `;
        });
        grid.innerHTML = html;
    });

    socket.on('ah_listSuccess', () => {
        window.game?.ui?.showToast('✅ Item successfully listed on the Auction House!');
        window.switchAhSubtab('my');
    });
}, 1200);
