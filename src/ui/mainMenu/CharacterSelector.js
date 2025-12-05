/**
 * CharacterSelector - Manages character selection UI  
 * 
 * Handles:
 * - Character selection and loadout display
 * - Character unlock checking
 * - Weapon synchronization
 * - Character button state management
 */
(function () {
    const PanelBase = window.Game?.PanelBase;

    if (!PanelBase) {
        console.error('CharacterSelector requires PanelBase to be loaded first');
        return;
    }

    class CharacterSelector extends PanelBase {
        constructor(options = {}) {
            super(options);
            this.selectedCharacterId = null;
            this.selectedWeaponId = null;
            this.characterButtons = new Map();
        }

        /**
         * Initialize the character selector UI
         */
        initialize() {
            const container = this.dom.characterOptions;
            if (!container) return;

            const definitions = this.getCharacterDefinitions();
            if (!definitions.length) {
                if (this.dom.loadoutSelector) {
                    this.dom.loadoutSelector.classList.add('hidden');
                }
                this.selectedCharacterId = null;
                this.selectedWeaponId = null;
                this.characterButtons.clear();
                if (this.dom.loadoutDescription) {
                    this.dom.loadoutDescription.textContent = '';
                }
                return;
            }

            if (this.dom.loadoutSelector) {
                this.dom.loadoutSelector.classList.remove('hidden');
            }

            const initialCharacterId = this.resolveInitialCharacterId(definitions);
            let initialDefinition =
                definitions.find(def => def.id === initialCharacterId && this.isCharacterUnlocked(def)) ||
                definitions.find(def => this.isCharacterUnlocked(def)) ||
                definitions[0];

            // Validate final selection is unlocked, fallback to first if not
            if (initialDefinition && !this.isCharacterUnlocked(initialDefinition)) {
                const firstUnlocked = definitions.find(def => this.isCharacterUnlocked(def));
                if (firstUnlocked) {
                    initialDefinition = firstUnlocked;
                }
                // If no unlocked characters, keep initialDefinition as-is (edge case)
            }

            this.selectedCharacterId = initialDefinition?.id || initialCharacterId;
            this.selectedWeaponId = initialDefinition?.weaponId || this.selectedWeaponId;

            this.syncCharacterState(this.selectedCharacterId);
            if (this.selectedWeaponId) {
                this.syncWeaponState(this.selectedWeaponId);
            }

            const hasMatchingButtons =
                container.childElementCount === definitions.length &&
                definitions.every(def => this.characterButtons.has(def.id));

            if (!hasMatchingButtons) {
                container.innerHTML = '';
                this.characterButtons.clear();

                definitions.forEach(def => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'menu-button loadout-option';
                    button.dataset.characterId = def.id;
                    const icon = def.icon ? `<span class="button-icon">${def.icon}</span>` : '';
                    button.innerHTML = `${icon}<span class="button-text">${def.name || def.id}</span>`;
                    this.addListener(button, 'click', () => this.handleCharacterSelect(def.id));
                    container.appendChild(button);
                    this.characterButtons.set(def.id, button);
                });
            }

            // Ensure button state reflects latest unlock information
            definitions.forEach(def => {
                const button = this.characterButtons.get(def.id);
                this.updateCharacterButtonLockState(button, def);
            });

            this.highlightSelectedCharacter(this.selectedCharacterId);
            this.updateLoadoutDescription(this.selectedCharacterId);
        }

        /**
         * Handle character selection
         */
        handleCharacterSelect(characterId) {
            if (!characterId) {
                return;
            }
            const definitions = this.getCharacterDefinitions();
            const character = definitions.find(def => def.id === characterId);

            if (!character) {
                return;
            }

            if (this.selectedCharacterId === characterId) {
                // Refresh description/highlight even if selection didn't change
                this.highlightSelectedCharacter(characterId);
                this.updateLoadoutDescription(characterId);
                return;
            }

            if (!this.isCharacterUnlocked(character)) {
                this.updateLoadoutDescription(characterId);
                this.flashLockedCharacterButton(characterId);
                this.logger?.info?.(`Character ${characterId} is locked; selection ignored.`);
                return;
            }

            this.selectedCharacterId = characterId;
            this.syncCharacterState(characterId);

            if (character?.weaponId) {
                this.selectedWeaponId = character.weaponId;
                this.syncWeaponState(character.weaponId);
            }

            this.highlightSelectedCharacter(characterId);
            this.updateLoadoutDescription(characterId);
        }

        /**
         * Highlight the selected character button
         */
        highlightSelectedCharacter(selectedId) {
            this.characterButtons.forEach((button, id) => {
                if (!button) return;
                const isSelected = id === selectedId;
                button.classList.toggle('menu-button-primary', isSelected);
                button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
        }

        /**
         * Update the loadout description panel
         */
        updateLoadoutDescription(characterId) {
            const descriptionEl = this.dom.loadoutDescription;
            if (!descriptionEl) return;

            const definitions = this.getCharacterDefinitions();
            const character = definitions.find(item => item.id === characterId);

            if (!character) {
                descriptionEl.textContent = 'Select a pilot to tailor your run.';
                descriptionEl.classList.remove('is-locked');
                return;
            }

            const isUnlocked = this.isCharacterUnlocked(character);

            // IMPROVED: Structure description with HTML for better readability
            // SECURITY: Use DOM methods to prevent XSS instead of innerHTML
            const fragment = document.createDocumentFragment();

            // Character description (main flavor text)
            if (character.description) {
                const flavorDiv = document.createElement('div');
                flavorDiv.className = 'char-desc-flavor';
                flavorDiv.textContent = character.description; // Safe: uses textContent
                fragment.appendChild(flavorDiv);
            }

            // Weapon info (concise, on its own line)
            const weaponDef = this.getWeaponDefinition(character.weaponId);
            if (weaponDef) {
                const weaponDiv = document.createElement('div');
                weaponDiv.className = 'char-desc-weapon';
                weaponDiv.textContent = `⚡ ${weaponDef.name}`; // Safe: uses textContent
                fragment.appendChild(weaponDiv);
            }

            // Character highlights (stats/abilities)
            const highlights = this.formatCharacterHighlights(character);
            if (highlights) {
                const ul = document.createElement('ul');
                ul.className = 'char-desc-highlights';
                // Split multiple highlights into bullet points
                // IMPORTANT: This delimiter ' | ' must match formatCharacterHighlights()
                highlights.split(' | ').forEach(h => {
                    const li = document.createElement('li');
                    li.textContent = h.trim(); // Safe: uses textContent
                    ul.appendChild(li);
                });
                fragment.appendChild(ul);
            }

            if (!isUnlocked && character.unlockRequirement) {
                const lockedNotice = document.createElement('div');
                lockedNotice.className = 'char-desc-locked';
                lockedNotice.textContent = this.getUnlockRequirementText(character.unlockRequirement, character);
                fragment.appendChild(lockedNotice);
            }

            // Clear and append (single reflow)
            descriptionEl.textContent = '';
            descriptionEl.appendChild(fragment);
            descriptionEl.classList.toggle('is-locked', !isUnlocked);
        }

        /**
         * Update character button lock state
         */
        updateCharacterButtonLockState(button, definition) {
            if (!button || !definition) {
                return;
            }

            const isUnlocked = this.isCharacterUnlocked(definition);
            const baseTitle = definition.tagline || definition.description || definition.name || definition.id;
            const lockHint = (!isUnlocked && definition.unlockRequirement)
                ? this.getUnlockRequirementText(definition.unlockRequirement, definition)
                : '';
            button.title = lockHint ? `${baseTitle} • ${lockHint}` : baseTitle;

            button.dataset.locked = isUnlocked ? 'false' : 'true';
            button.setAttribute('aria-disabled', isUnlocked ? 'false' : 'true');
            button.classList.toggle('loadout-option-locked', !isUnlocked);

            let lockTag = button.querySelector(':scope > .loadout-lock-tag');
            if (!isUnlocked) {
                if (!lockTag) {
                    lockTag = document.createElement('span');
                    lockTag.className = 'loadout-lock-tag';
                    button.appendChild(lockTag);
                }
                lockTag.textContent = this.getLockBadgeText(definition.unlockRequirement);
            } else if (lockTag?.parentNode === button) {
                button.removeChild(lockTag);
            }
        }

        /**
         * Flash a locked character button for feedback
         */
        flashLockedCharacterButton(characterId) {
            const button = this.characterButtons.get(characterId);
            if (!button) {
                return;
            }
            button.classList.add('loadout-option-locked-flash');
            setTimeout(() => {
                button.classList.remove('loadout-option-locked-flash');
            }, 600);
        }

        /**
         * Format character highlights for display
         */
        formatCharacterHighlights(character) {
            if (!character) return '';
            if (Array.isArray(character.highlights) && character.highlights.length) {
                return character.highlights.join(' | ');
            }
            if (character.tagline) {
                return character.tagline;
            }
            return '';
        }

        /**
         * Get character definitions
         */
        getCharacterDefinitions() {
            if (!Array.isArray(window.CHARACTER_DEFINITIONS)) {
                return [];
            }
            return window.CHARACTER_DEFINITIONS.map(def => def);
        }

        /**
         * Get weapon definition by ID
         */
        getWeaponDefinition(weaponId) {
            if (!weaponId || typeof window === 'undefined' || !window.WEAPON_DEFINITIONS) {
                return null;
            }
            return window.WEAPON_DEFINITIONS[weaponId] || null;
        }

        /**
         * Resolve initial character ID from storage/state
         */
        resolveInitialCharacterId(definitions) {
            if (!Array.isArray(definitions) || definitions.length === 0) {
                return null;
            }

            const state = this.getGameState();
            const stored =
                state?.getSelectedCharacter?.() ||
                state?.flow?.selectedCharacter ||
                window.StorageManager.getItem('selectedCharacter');

            if (stored) {
                const storedDefinition = definitions.find(def => def.id === stored);
                if (storedDefinition && this.isCharacterUnlocked(storedDefinition)) {
                    return stored;
                }
            }

            const fallback = definitions.find(def => this.isCharacterUnlocked(def));
            if (fallback) {
                return fallback.id;
            }

            return definitions[0].id;
        }

        /**
         * Check if a character is unlocked
         */
        isCharacterUnlocked(definition) {
            if (!definition?.unlockRequirement) {
                return true;
            }
            return this.areRequirementsSatisfied(definition.unlockRequirement);
        }

        /**
         * Check if requirements are satisfied
         */
        areRequirementsSatisfied(requirement) {
            if (!requirement) {
                return true;
            }
            const ids = this.normalizeRequirementIds(requirement);
            if (!ids.length) {
                return true;
            }
            return ids.every(id => this.isAchievementUnlocked(id));
        }

        /**
         * Normalize requirement IDs to an array
         */
        normalizeRequirementIds(requirement) {
            if (!requirement) {
                return [];
            }
            if (Array.isArray(requirement.ids) && requirement.ids.length) {
                return requirement.ids.filter(Boolean);
            }
            if (typeof requirement.id === 'string' && requirement.id.trim()) {
                return [requirement.id.trim()];
            }
            return [];
        }

        /**
         * Check if an achievement is unlocked
         */
        isAchievementUnlocked(achievementId) {
            if (typeof achievementId !== 'string' || !achievementId.trim()) {
                return false;
            }
            const id = achievementId.trim();
            const state = this.getGameState();
            if (state?.isAchievementUnlocked?.(id)) {
                return true;
            }
            const achievementSet = state?.meta?.achievements;
            if (achievementSet instanceof Set && achievementSet.has(id)) {
                return true;
            }
            if (Array.isArray(achievementSet) && achievementSet.includes(id)) {
                return true;
            }
            const achievement = window.achievementSystem?.achievements?.[id];
            return Boolean(achievement?.unlocked);
        }

        /**
         * Get unlock requirement text
         */
        getUnlockRequirementText(requirement, character) {
            if (!requirement) {
                return 'Locked';
            }
            if (typeof requirement.hint === 'string' && requirement.hint.trim()) {
                return requirement.hint;
            }
            const ids = this.normalizeRequirementIds(requirement);
            if (!ids.length) {
                return 'Locked - Complete specific achievements.';
            }
            const achievementNames = ids.map(id => {
                const def = this.getAchievementDefinition(id);
                return def?.name || id;
            });
            const plural = achievementNames.length > 1 ? 'achievements' : 'achievement';
            const subject = character?.name || 'this pilot';
            return `Locked - Unlock ${plural} ${achievementNames.join(', ')} to recruit ${subject}.`;
        }

        /**
         * Get lock badge text
         */
        getLockBadgeText(requirement) {
            if (!requirement) {
                return '🔒 Locked';
            }
            if (typeof requirement.badge === 'string') {
                return requirement.badge;
            }
            const ids = this.normalizeRequirementIds(requirement);
            if (ids.length === 1) {
                const def = this.getAchievementDefinition(ids[0]);
                if (def?.name) {
                    return `🔒 ${def.name}`;
                }
            }
            return '🔒 Locked';
        }

        /**
         * Get achievement definition
         */
        getAchievementDefinition(id) {
            if (!id || typeof window === 'undefined') {
                return null;
            }
            const definitions = window.ACHIEVEMENT_DEFINITIONS || {};
            return definitions[id] || null;
        }

        /**
         * Get game state
         */
        getGameState() {
            return window.gameManager?.state || window.gameManager?.game?.state || null;
        }

        /**
         * Sync character state to GameState and storage
         */
        syncCharacterState(characterId) {
            if (!characterId) return;

            const state = this.getGameState();
            if (state?.setSelectedCharacter) {
                state.setSelectedCharacter(characterId);
            } else if (state) {
                state.flow = state.flow || {};
                state.flow.selectedCharacter = characterId;
            }

            if (!window.StorageManager.setItem('selectedCharacter', characterId)) {
                this.logger?.warn?.('Failed to persist selected character');
            }
        }

        /**
         * Sync weapon state to GameState and storage
         */
        syncWeaponState(weaponId) {
            if (!weaponId) return;

            const state = this.getGameState();
            if (state?.setSelectedWeapon) {
                state.setSelectedWeapon(weaponId);
            } else if (state) {
                state.flow = state.flow || {};
                state.flow.selectedWeapon = weaponId;
            }

            if (!window.StorageManager.setItem('selectedWeapon', weaponId)) {
                this.logger?.warn?.('Failed to persist selected weapon');
            }
        }

        /**
         * Get currently selected character ID
         */
        getSelectedCharacterId() {
            return this.selectedCharacterId;
        }

        /**
         * Get currently selected weapon ID
         */
        getSelectedWeaponId() {
            return this.selectedWeaponId;
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.CharacterSelector = CharacterSelector;
    }
})();
