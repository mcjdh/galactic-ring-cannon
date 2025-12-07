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

                if (volumeRange && window.audioSystem) {
                    let volumeValue = Number(volumeRange.value);
                    if (!Number.isFinite(volumeValue) || volumeValue < 0 || volumeValue > 1) {
                        volumeValue = 0.5;
                        volumeRange.value = '0.5';
                    }
                    // Use setVolume method to properly sync internal state
                    if (typeof window.audioSystem.setVolume === 'function') {
                        window.audioSystem.setVolume('master', volumeValue);
                    } else if (window.audioSystem.masterGain) {
                        window.audioSystem.masterGain.gain.value = volumeValue;
                    }
                    window.StorageManager.setItem('volume', volumeValue.toString());
                    // Sync pause menu slider if it exists
                    const pauseVolumeRange = document.getElementById('pause-volume-range');
                    if (pauseVolumeRange) {
                        pauseVolumeRange.value = volumeValue.toString();
                    }
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

                    // Bind live 'change' event for instant mute toggle
                    if (!muteCheckbox._liveChangeBound) {
                        muteCheckbox._liveChangeBound = true;
                        muteCheckbox.addEventListener('change', () => {
                            const enabled = !muteCheckbox.checked;
                            if (window.audioSystem && typeof window.audioSystem.setEnabled === 'function') {
                                window.audioSystem.setEnabled(enabled);
                            }
                            window.StorageManager?.setItem?.('soundEnabled', enabled ? 'true' : 'false');
                        });
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
                    // Use setVolume method for proper audio chain sync
                    if (window.audioSystem) {
                        if (typeof window.audioSystem.setVolume === 'function') {
                            window.audioSystem.setVolume('master', volumeValue);
                        } else if (window.audioSystem.masterGain) {
                            window.audioSystem.masterGain.gain.value = volumeValue;
                        }
                    }

                    // Bind live 'input' event for real-time feedback while dragging
                    if (!volumeRange._liveInputBound) {
                        volumeRange._liveInputBound = true;
                        volumeRange.addEventListener('input', () => {
                            let val = Number(volumeRange.value);
                            if (!Number.isFinite(val) || val < 0 || val > 1) val = 0.5;
                            if (window.audioSystem) {
                                if (typeof window.audioSystem.setVolume === 'function') {
                                    window.audioSystem.setVolume('master', val);
                                } else if (window.audioSystem.masterGain) {
                                    window.audioSystem.masterGain.gain.value = val;
                                }
                            }
                            window.StorageManager?.setItem?.('volume', val.toString());
                            // Sync pause menu slider
                            const pauseVolumeRange = document.getElementById('pause-volume-range');
                            if (pauseVolumeRange) {
                                pauseVolumeRange.value = val.toString();
                            }
                        });
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

                    // Bind live 'change' event for instant quality toggle
                    if (!lowQualityCheckbox._liveChangeBound) {
                        lowQualityCheckbox._liveChangeBound = true;
                        lowQualityCheckbox.addEventListener('change', () => {
                            const enabled = lowQualityCheckbox.checked;
                            if (window.gameManager) {
                                window.gameManager.lowQuality = enabled;
                            }
                            window.StorageManager?.setItem?.('lowQuality', enabled ? 'true' : 'false');
                        });
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
