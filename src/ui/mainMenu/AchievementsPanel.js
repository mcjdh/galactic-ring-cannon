/**
 * AchievementsPanel - Manages achievements UI
 * 
 * Handles:
 * - Achievement listing with category filtering
 * - Progress display
 * - Pagination
 * - Achievement hints and unlock conditions
 */
(function () {
    const PanelBase = window.Game?.PanelBase;

    if (!PanelBase) {
        console.error('AchievementsPanel requires PanelBase to be loaded first');
        return;
    }

    class AchievementsPanel extends PanelBase {
        constructor(options = {}) {
            super(options);
            this.selectedCategory = 'All';

            // Use a shared formatter so huge progress numbers stay readable
            if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
                try {
                    this.achievementNumberFormatter = new Intl.NumberFormat('en-US');
                } catch (error) {
                    this.logger?.warn?.('Failed to initialize number formatter', error);
                    this.achievementNumberFormatter = null;
                }
            } else {
                this.achievementNumberFormatter = null;
            }

            // Override default items per page
            this.pagination.itemsPerPage = 50; // Large value to effectively disable pagination
        }

        /**
         * Select a category for filtering
         */
        selectCategory(category) {
            if (this.selectedCategory === category) return;

            this.selectedCategory = category;

            // Update active state of buttons
            const categoryBtns = this.dom.controls.achievementsSidebar?.querySelectorAll('.category-btn');
            categoryBtns?.forEach(btn => {
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Reset pagination
            this.pagination.currentPage = 1;

            // Refresh UI
            this.render();
        }

        /**
         * Render the achievements panel
         */
        render() {
            const controls = this.dom.controls || {};
            const countElement = controls.achievementsCount;
            const listElement = controls.achievementsList;
            const system = window.achievementSystem;

            if (!system) {
                return;
            }

            if (countElement) {
                const unlocked = system.getUnlockedCount?.() ?? 0;
                const total = system.getTotalCount?.() ?? 0;
                countElement.textContent = `${unlocked}/${total}`;
            }

            if (listElement) {
                const items = system.achievements || {};
                let allEntries = Object.entries(items);

                // Filter by category
                if (this.selectedCategory && this.selectedCategory !== 'All') {
                    allEntries = allEntries.filter(([_, achievement]) => achievement.category === this.selectedCategory);
                }

                const totalItems = allEntries.length;
                this.pagination.totalPages = Math.max(1, Math.ceil(totalItems / this.pagination.itemsPerPage));
                if (this.pagination.currentPage > this.pagination.totalPages) {
                    this.pagination.currentPage = this.pagination.totalPages;
                }
                const startIdx = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
                const endIdx = Math.min(startIdx + this.pagination.itemsPerPage, totalItems);
                const pageAchievements = allEntries.slice(startIdx, endIdx);
                const compactLayout = pageAchievements.length <= Math.min(3, this.pagination.itemsPerPage - 1);
                listElement.classList.toggle('achievements-list--compact', compactLayout);

                // OPTIMIZED: Use DocumentFragment to batch DOM updates (50-100ms faster)
                const fragment = document.createDocumentFragment();

                pageAchievements.forEach(([id, achievement]) => {
                    const entry = document.createElement('div');
                    entry.className = 'achievement-item';
                    entry.dataset.achievementId = id;

                    if (achievement.unlocked) {
                        entry.classList.add('unlocked');
                    } else {
                        entry.classList.add('locked');
                    }

                    // Build achievement card with structure
                    const icon = document.createElement('div');
                    icon.className = 'achievement-icon';
                    icon.textContent = achievement.icon || '?';

                    const info = document.createElement('div');
                    info.className = 'achievement-info';

                    const title = document.createElement('h3');
                    title.textContent = achievement.name;

                    const titleRow = document.createElement('div');
                    titleRow.className = 'achievement-title-row';
                    titleRow.appendChild(title);

                    const progressPercent = achievement.target > 0
                        ? Math.min(100, Math.floor((achievement.progress / achievement.target) * 100))
                        : 0;
                    const statusPill = document.createElement('span');
                    statusPill.className = 'achievement-status';
                    if (achievement.unlocked) {
                        statusPill.dataset.state = 'unlocked';
                        statusPill.textContent = 'Unlocked';
                    } else if (progressPercent > 0) {
                        statusPill.dataset.state = 'progress';
                        statusPill.textContent = `${progressPercent}%`;
                    } else {
                        statusPill.dataset.state = 'locked';
                        statusPill.textContent = 'Locked';
                    }
                    titleRow.appendChild(statusPill);

                    const desc = document.createElement('p');
                    desc.className = 'achievement-description';
                    desc.textContent = achievement.description;

                    // Add unlock hint for locked achievements
                    if (!achievement.unlocked) {
                        const hint = document.createElement('p');
                        hint.className = 'achievement-hint';
                        hint.textContent = this.getAchievementHint(id);
                        info.appendChild(titleRow);
                        info.appendChild(desc);
                        info.appendChild(hint);
                    } else {
                        info.appendChild(titleRow);
                        info.appendChild(desc);
                    }

                    if (achievement.unlocksCharacter) {
                        const unlockNote = document.createElement('p');
                        unlockNote.className = 'achievement-unlock-note';
                        unlockNote.textContent = this.getAchievementUnlockText(achievement.unlocksCharacter);
                        info.appendChild(unlockNote);
                    }

                    const metaRow = document.createElement('div');
                    metaRow.className = 'achievement-meta-row';
                    if (achievement.important) {
                        const chip = document.createElement('span');
                        chip.className = 'achievement-chip chip-important';
                        chip.textContent = 'Bonus Star';
                        metaRow.appendChild(chip);
                    }
                    if (achievement.unlocksCharacter) {
                        const chip = document.createElement('span');
                        chip.className = 'achievement-chip';
                        chip.textContent = this.getAchievementUnlockText(achievement.unlocksCharacter);
                        metaRow.appendChild(chip);
                    }
                    if (metaRow.childNodes.length > 0) {
                        info.appendChild(metaRow);
                    }

                    // Add progress bar if not unlocked and has progress
                    if (!achievement.unlocked && achievement.target > 1) {
                        const progress = document.createElement('div');
                        progress.className = 'achievement-progress';

                        const progressBar = document.createElement('div');
                        progressBar.className = 'progress-bar';

                        const progressFill = document.createElement('div');
                        progressFill.className = 'progress-fill';
                        const percent = Math.min(100, (achievement.progress / achievement.target) * 100);
                        progressFill.style.width = `${percent}%`;

                        const progressText = document.createElement('span');
                        progressText.textContent = this.formatAchievementProgressText(id, achievement);

                        progressBar.appendChild(progressFill);
                        progress.appendChild(progressBar);
                        progress.appendChild(progressText);
                        info.appendChild(progress);
                    }

                    entry.appendChild(icon);
                    entry.appendChild(info);
                    fragment.appendChild(entry);  // Add to fragment (no reflow)
                });

                listElement.innerHTML = '';
                listElement.appendChild(fragment);  // Single reflow

                listElement.style.removeProperty('min-height');
                listElement.style.removeProperty('max-height');

                // Update pagination controls
                const prevBtn = this.dom.buttons?.achievementsPrevPage;
                const nextBtn = this.dom.buttons?.achievementsNextPage;
                const indicator = this.dom.controls?.achievementsPageIndicator;
                this.updatePaginationButtons(prevBtn, nextBtn, indicator);
            }
        }

        /**
         * Navigate achievements pages with fade transition
         */
        navigatePage(direction) {
            const newPage = this.pagination.currentPage + direction;
            if (newPage < 1 || newPage > this.pagination.totalPages) {
                return;
            }

            this.pagination.currentPage = newPage;

            const container = this.dom.controls.achievementsList;
            if (!container) {
                this.render();
                return;
            }

            // Add fade out effect
            container.classList.add('page-transitioning');

            setTimeout(() => {
                this.render();
                container.classList.remove('page-transitioning');
            }, 150);
        }

        /**
         * Get helpful hint for an achievement
         */
        getAchievementHint(achievementId) {
            const hints = {
                'first_kill': '💡 Defeat any enemy to unlock',
                'combo_master': '💡 Keep killing enemies without stopping',
                'boss_slayer': '💡 Boss spawns every 3 minutes',
                'mega_boss_slayer': '💡 Survive to meet the ultimate challenge',
                'kill_streak': '💡 Focus on dense enemy groups',
                'level_up': '💡 Collect XP orbs to level up',
                'star_collector': '💡 Those green orbs count!',
                'meta_star_collector': '💡 Earn stars from completing runs',
                'max_upgrade': '💡 Visit the Star Vendor',
                'perfect_dodge': '💡 Dodge right before impact',
                'untouchable': '💡 Master the dodge timing',
                'tank_commander': '💡 Stay alive without dodging - defensive builds help!',
                'speed_runner': '💡 Choose damage and XP upgrades early',
                'elite_hunter': '💡 Yellow enemies are elites',
                'cosmic_veteran': '💡 Deal damage across all runs - persistent progress!',
                'galactic_explorer': '💡 Keep moving across all runs - persistent progress!',
                'trigger_happy': '💡 Fire often across all runs - persistent progress!',
                'nova_blitz': '💡 High attack speed builds excel here',
                'storm_surge': '💡 Chain Lightning with arc upgrades',
                'critical_master': '💡 Upgrade crit chance for more crits',
                'chain_reaction': '💡 Chain Lightning weapon required',
                'ricochet_master': '💡 Get Multi-Bounce upgrade for 3 hits',
                'orbital_master': '💡 Stack orbital upgrades until five are spinning',
                'split_shot_specialist': '💡 Keep drafting Split Shot every time it appears'
            };

            return hints[achievementId] || '💡 Keep playing to unlock';
        }

        /**
         * Get unlock text for character achievements
         */
        getAchievementUnlockText(characterId) {
            if (!characterId) {
                return '';
            }
            const definitions = Array.isArray(window.CHARACTER_DEFINITIONS) ? window.CHARACTER_DEFINITIONS : [];
            const character = definitions.find(def => def.id === characterId);
            const name = character?.name || characterId;
            return `Unlocks: ${name}`;
        }

        /**
         * Format achievement number with localization
         */
        formatAchievementNumber(value) {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return '0';
            }

            const floored = Math.max(0, Math.floor(value));
            if (this.achievementNumberFormatter) {
                try {
                    return this.achievementNumberFormatter.format(floored);
                } catch (_) {
                    // Formatter failed, fall through to default string conversion
                }
            }
            return floored.toString();
        }

        /**
         * Format seconds as M:SS
         */
        formatSeconds(totalSeconds) {
            if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds)) {
                totalSeconds = 0;
            }
            const clamped = Math.max(0, Math.floor(totalSeconds));
            const minutes = Math.floor(clamped / 60);
            const seconds = clamped % 60;
            if (minutes <= 0) {
                return `${seconds}s`;
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}s`;
        }

        /**
         * Format achievement progress text (handles special cases like time)
         */
        formatAchievementProgressText(id, achievement) {
            if (!achievement) {
                return '0/0';
            }
            const progress = Number.isFinite(achievement.progress) ? achievement.progress : 0;
            const target = Number.isFinite(achievement.target) ? achievement.target : 0;

            if (id === 'aegis_guardian') {
                return `${this.formatSeconds(progress)}/${this.formatSeconds(target)}`;
            }

            return `${this.formatAchievementNumber(progress)}/${this.formatAchievementNumber(target)}`;
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.AchievementsPanel = AchievementsPanel;
    }
})();
