/**
 * SettingsPanel - Manages game settings UI
 * 
 * Handles:
 * - Audio settings (mute, volume)
 * - Quality settings (low quality mode)
 * - Difficulty selection
 * - Persistence to localStorage
 */
(function () {
    const PanelBase = window.Game?.PanelBase;

    if (!PanelBase) {
        console.error('SettingsPanel requires PanelBase to be loaded first');
        return;
    }

    class SettingsPanel extends PanelBase {
        constructor(options = {}) {
            super(options);
        }

        /**
         * Apply settings from UI controls to game systems
         */
        applySettings() {
            const controls = this.dom.controls || {};
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = controls;

            try {
                if (muteCheckbox && window.audioSystem && typeof window.audioSystem.setEnabled === 'function') {
                    const enabled = !muteCheckbox.checked;
                    window.audioSystem.setEnabled(enabled);
                    window.StorageManager.setItem('soundEnabled', enabled ? 'true' : 'false');
                }

                if (volumeRange && window.audioSystem?.masterGain) {
                    let volumeValue = Number(volumeRange.value);
                    if (!Number.isFinite(volumeValue) || volumeValue < 0 || volumeValue > 1) {
                        volumeValue = 0.5;
                        volumeRange.value = '0.5';
                    }
                    window.audioSystem.masterGain.gain.value = volumeValue;
                    window.StorageManager.setItem('volume', volumeValue.toString());
                }

                if (lowQualityCheckbox && window.gameManager) {
                    const lowQualityEnabled = Boolean(lowQualityCheckbox.checked);
                    window.gameManager.lowQuality = lowQualityEnabled;
                    window.StorageManager.setItem('lowQuality', lowQualityEnabled ? 'true' : 'false');
                }

                if (difficultySelect) {
                    const valid = ['easy', 'normal', 'hard'];
                    const selected = difficultySelect.value;
                    if (valid.includes(selected)) {
                        window.StorageManager.setItem('difficulty', selected);
                    } else {
                        difficultySelect.value = 'normal';
                        window.StorageManager.setItem('difficulty', 'normal');
                    }
                }
            } catch (error) {
                this.logger?.error?.('Error applying settings', error);
            }
        }

        /**
         * Load stored settings into UI controls
         */
        loadSettings() {
            const controls = this.dom.controls || {};
            const {
                muteCheckbox,
                volumeRange,
                lowQualityCheckbox,
                difficultySelect
            } = controls;

            try {
                if (muteCheckbox) {
                    const stored = window.StorageManager.getItem('soundEnabled');
                    if (stored === 'true' || stored === 'false') {
                        muteCheckbox.checked = stored !== 'true';
                    } else {
                        muteCheckbox.checked = false;
                        window.StorageManager.setItem('soundEnabled', 'true');
                    }
                }

                if (volumeRange) {
                    let volumeValue = 0.5;
                    const storedVolume = window.StorageManager.getItem('volume');
                    if (storedVolume !== null) {
                        const parsed = Number(storedVolume);
                        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
                            volumeValue = parsed;
                        }
                    }
                    volumeRange.value = volumeValue.toString();
                    if (window.audioSystem?.masterGain) {
                        window.audioSystem.masterGain.gain.value = volumeValue;
                    }
                }

                if (lowQualityCheckbox) {
                    const storedLowQ = window.StorageManager.getItem('lowQuality');
                    if (storedLowQ === 'true' || storedLowQ === 'false') {
                        const enabled = storedLowQ === 'true';
                        lowQualityCheckbox.checked = enabled;
                        if (window.gameManager) {
                            window.gameManager.lowQuality = enabled;
                        }
                    } else {
                        lowQualityCheckbox.checked = false;
                        window.StorageManager.setItem('lowQuality', 'false');
                    }
                }

                if (difficultySelect) {
                    const storedDifficulty = window.StorageManager.getItem('difficulty');
                    const valid = ['easy', 'normal', 'hard'];
                    if (valid.includes(storedDifficulty)) {
                        difficultySelect.value = storedDifficulty;
                    } else {
                        difficultySelect.value = 'normal';
                        window.StorageManager.setItem('difficulty', 'normal');
                    }
                }
            } catch (error) {
                this.logger?.error?.('Error loading settings', error);
            }
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.SettingsPanel = SettingsPanel;
    }
})();
