class AudioSystem {
    constructor() {
        // Check for Web Audio API support
        this.isWebAudioSupported = typeof window.AudioContext !== 'undefined' ||
            typeof window.webkitAudioContext !== 'undefined';

        // Initialize audio context with error handling
        try {
            this.audioContext = null;
            this.masterGain = null;
            this.compressor = null;
            this.reverb = null;
            this.isMuted = false;

            // Volume categories (0-1)
            this.volumes = {
                master: 0.5,
                music: 0.22, // Bumped for better presence with SFX
                sfx: 0.35,   // Lowered to compensate for lo-fi saturation gain
                ui: 0.5
            };

            // Initialize audio context on first user interaction
            this.initialized = false;
            this.hasUserInteracted = false;
            this.pendingSounds = [];
            this.maxPendingSounds = 8;

            // Music system state - FILE BASED
            // Track 01 always plays first, then shuffle remaining for variety
            this.playlist = [
                'assets/audio/music/track_01.wav',  // Always first on load
                'assets/audio/music/track_02.wav',
                'assets/audio/music/track_03.wav',
                'assets/audio/music/track_04.wav',
                'assets/audio/music/track_05.wav',
                'assets/audio/music/track_06.wav',
                'assets/audio/music/track_07.wav',
                'assets/audio/music/track_08.wav',
                'assets/audio/music/track_09.wav',
                'assets/audio/music/track_10.wav',
                'assets/audio/music/track_11.wav',
                'assets/audio/music/track_12.wav',
                'assets/audio/music/track_13.wav',
                'assets/audio/music/track_14.wav',
                'assets/audio/music/track_15.wav'
            ];

            // Crossfade duration between tracks (in seconds)
            this.crossfadeDuration = 2.0;

            // Shuffle only tracks 2-15 (keep track_01 first)
            for (let i = this.playlist.length - 1; i > 1; i--) {
                const j = 1 + Math.floor(Math.random() * i); // Start from index 1
                [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
            }

            this.currentTrackIndex = -1;
            this.currentSource = null;
            this.musicBufferCache = new Map();
            this.isLoadingMusic = false;

            this.musicEnabled = false;
            this.currentIntensity = 0; // 0-1 scale

            // Add hotkey listener for skipping tracks (N key)
            if (typeof window !== 'undefined') {
                this._boundHandleKeyDown = (e) => {
                    if ((e.key === 'n' || e.key === 'N') && !e.repeat && this.initialized) {
                        this.playNextTrack();
                    }
                };
                window.addEventListener('keydown', this._boundHandleKeyDown);
            }

            // Add fallback for browsers without Web Audio API
            if (!this.isWebAudioSupported) {
                window.logger?.warn?.('Web Audio API not supported, using fallback audio system');
                this.initializeFallbackAudio();
            }
        } catch (error) {
            window.logger?.error?.('Error initializing audio system:', error);
            this.isWebAudioSupported = false;
        }
    }

    // Provide simple HTMLAudioElement-based fallback so callers don't crash
    initializeFallbackAudio() {
        this.play = (/* soundName, volume, position */) => { };
        this.toggleMute = () => {
            this.isMuted = !this.isMuted;
            return this.isMuted;
        };
        this.setEnabled = (enabled) => {
            this.isMuted = !enabled;
        };
        this.playBossBeat = () => { };
        this.playBossTheme = () => { };
        this.stopBossTheme = () => { };
        this.startAmbientMusic = () => { };
        this.stopAmbientMusic = () => { };
        this.setMusicIntensity = () => { };
        this.handleUserInteraction = () => { };
        this.initializeAudioContext = () => { };
        this.resumeAudioContext = () => { };
        this.destroy = () => { };
        this.masterGain = { gain: { value: 0.5 } };
        this.masterGainNode = { gain: { value: 0.5 } };
    }

    /**
     * Clean up audio system resources
     * Call this when the game is shutting down to prevent memory leaks
     */
    destroy() {
        // Remove hotkey listener
        if (typeof window !== 'undefined' && this._boundHandleKeyDown) {
            window.removeEventListener('keydown', this._boundHandleKeyDown);
        }

        // Stop any active music
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (e) { }
            this.currentSource = null;
        }

        // Clear music cache
        if (this.musicBufferCache) {
            this.musicBufferCache.clear();
        }

        // Stop boss theme
        this.stopBossTheme();

        // Stop ambient music (calls our updated method)
        this.stopAmbientMusic();

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                this.audioContext.close();
            } catch (error) {
                window.logger?.warn('Error closing audio context:', error);
            }
        }

        // Clear references
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.reverb = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.uiGain = null;
        this.pendingSounds = [];
        this.initialized = false;

        this.isLoadingMusic = false;
    }


    // Initialize audio context with error handling
    initializeAudioContext() {
        if (this.initialized || !this.isWebAudioSupported) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Create master audio chain: compressor -> reverb -> master gain -> destination
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
            this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

            // Create reverb (we'll use a simple convolver with impulse response)
            this.reverb = this.audioContext.createConvolver();
            this.reverb.buffer = this.createReverbImpulse(2, 2, false);

            // Create dry/wet mix for reverb
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.value = 0.15; // Subtle reverb

            this.dryGain = this.audioContext.createGain();
            this.dryGain.gain.value = 0.85;

            // Create master gain nodes for each category
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.volumes.music;

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.volumes.sfx;

            this.uiGain = this.audioContext.createGain();
            this.uiGain.gain.value = this.volumes.ui;

            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volumes.master;

            // === MASTER EQ CHAIN ===
            // Creates cohesive "warm arcade" feel across all tracks (Galaga/Polybius inspired)

            // Low shelf: +3dB at 100Hz - adds weight and warmth
            this.lowShelf = this.audioContext.createBiquadFilter();
            this.lowShelf.type = 'lowshelf';
            this.lowShelf.frequency.value = 100;
            this.lowShelf.gain.value = 3;

            // High shelf: -4dB at 6kHz - tames harshness, reduces ear fatigue
            this.highShelf = this.audioContext.createBiquadFilter();
            this.highShelf.type = 'highshelf';
            this.highShelf.frequency.value = 6000;
            this.highShelf.gain.value = -4;

            // Gentle low-pass at 14kHz - analog warmth, glues tracks together
            this.masterLowPass = this.audioContext.createBiquadFilter();
            this.masterLowPass.type = 'lowpass';
            this.masterLowPass.frequency.value = 14000;
            this.masterLowPass.Q.value = 0.5;

            // Music-specific EQ chain (more aggressive filtering for cohesion)
            this.musicLowPass = this.audioContext.createBiquadFilter();
            this.musicLowPass.type = 'lowpass';
            this.musicLowPass.frequency.value = 12000;
            this.musicLowPass.Q.value = 0.7;

            // === RETRO POLYBIUS EFFECTS (Music Only) ===
            // Adds gritty, vintage arcade character to the music

            // 1. Tape Saturation / Soft Clipping via WaveShaper
            // Creates warm harmonic distortion like vintage arcade hardware
            this.musicSaturation = this.audioContext.createWaveShaper();
            this.musicSaturation.curve = this.createSaturationCurve(0.65); // Heavier vintage distortion
            this.musicSaturation.oversample = '2x'; // Reduce aliasing artifacts

            // 2. Lo-Fi Filter - simulates reduced sample rate / bit depth
            // Aggressive low-pass to cut high frequencies (like 8-bit DACs)
            this.lofiFilter = this.audioContext.createBiquadFilter();
            this.lofiFilter.type = 'lowpass';
            this.lofiFilter.frequency.value = 6000; // Aggressive lo-fi, like old arcade DACs
            this.lofiFilter.Q.value = 0.8;

            // 3. Subtle high-pass to remove rumble (old speaker simulation)
            this.lofiHighPass = this.audioContext.createBiquadFilter();
            this.lofiHighPass.type = 'highpass';
            this.lofiHighPass.frequency.value = 60; // Cut sub-bass rumble
            this.lofiHighPass.Q.value = 0.5;

            // 4. Bit-crusher resonance - adds gritty "digital" character
            // Narrow band boost at 2-3kHz mimics quantization noise
            this.bitcrushResonance = this.audioContext.createBiquadFilter();
            this.bitcrushResonance.type = 'peaking';
            this.bitcrushResonance.frequency.value = 2500;
            this.bitcrushResonance.Q.value = 1.5;
            this.bitcrushResonance.gain.value = 1.5; // Subtle grit, avoids adding too much level

            // 5. Music Output Limiter - compensates for gain added by effects chain
            // This is the final volume control after all processing
            this.musicOutputGain = this.audioContext.createGain();
            this.musicOutputGain.gain.value = 0.08; // Bumped slightly for presence

            // Connect audio chain
            // Music goes through: Gain -> Saturation -> LoFi -> EQ -> Output Limiter -> reverb/dry mix
            this.musicGain.connect(this.musicSaturation);
            this.musicSaturation.connect(this.lofiHighPass);
            this.lofiHighPass.connect(this.lofiFilter);
            this.lofiFilter.connect(this.bitcrushResonance);
            this.bitcrushResonance.connect(this.musicLowPass);
            this.musicLowPass.connect(this.musicOutputGain);
            this.musicOutputGain.connect(this.dryGain);
            this.musicOutputGain.connect(this.reverb);

            // === SFX LO-FI CHAIN (Lighter treatment for unified sound) ===
            // Subtle vintage character to match music's retro vibe

            // SFX Saturation - very light, just adds warmth
            this.sfxSaturation = this.audioContext.createWaveShaper();
            this.sfxSaturation.curve = this.createSaturationCurve(0.25); // Light saturation
            this.sfxSaturation.oversample = '2x';

            // SFX Lo-Fi Filter - gentle rolloff for that arcade speaker sound
            this.sfxLofiFilter = this.audioContext.createBiquadFilter();
            this.sfxLofiFilter.type = 'lowpass';
            this.sfxLofiFilter.frequency.value = 10000; // Less aggressive than music
            this.sfxLofiFilter.Q.value = 0.5;

            // SFX Output Gain - compensates for saturation gain
            this.sfxOutputGain = this.audioContext.createGain();
            this.sfxOutputGain.gain.value = 0.4; // Attenuate after effects

            // Connect SFX through lo-fi chain
            this.sfxGain.connect(this.sfxSaturation);
            this.sfxSaturation.connect(this.sfxLofiFilter);
            this.sfxLofiFilter.connect(this.sfxOutputGain);
            this.sfxOutputGain.connect(this.dryGain);
            this.sfxOutputGain.connect(this.reverb);

            // UI sounds stay clean (menus should be crisp)
            this.uiGain.connect(this.dryGain);

            this.reverb.connect(this.reverbGain);

            this.dryGain.connect(this.compressor);
            this.reverbGain.connect(this.compressor);

            // Route through master EQ chain for cohesive sound
            this.compressor.connect(this.lowShelf);
            this.lowShelf.connect(this.highShelf);
            this.highShelf.connect(this.masterLowPass);
            this.masterLowPass.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            // Compatibility alias for UI code expecting masterGainNode
            this.masterGainNode = this.masterGain;

            this.initialized = true;

            // Start ambient music after initialization
            this.startAmbientMusic();
        } catch (error) {
            window.logger?.error?.('Error initializing audio context:', error);
            this.isWebAudioSupported = false;
        }
    }

    // Create a simple reverb impulse response
    createReverbImpulse(duration, decay, reverse) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }

        return impulse;
    }

    // Create saturation/soft-clipping curve for vintage arcade distortion
    // Uses tanh-based soft clipping for warm, analog-style harmonics
    // Amount: 0.0 = clean, 1.0 = heavy distortion
    createSaturationCurve(amount = 0.4) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const k = amount * 50; // Drive amount (higher = more aggressive)

        for (let i = 0; i < samples; i++) {
            // Normalize input to -1 to 1 range
            const x = (i * 2) / samples - 1;

            // Soft clipping using tanh (smooth saturation)
            // This adds even harmonics like tube/tape distortion
            curve[i] = Math.tanh(k * x) / Math.tanh(k);
        }

        return curve;
    }

    // Resume audio context with error handling
    resumeAudioContext() {
        if (!this.audioContext || !this.isWebAudioSupported) return;

        try {
            if (this.audioContext.state === 'suspended') {
                return this.audioContext.resume();
            }
        } catch (error) {
            window.logger?.error?.('Error resuming audio context:', error);
        }
    }

    // Set volume for specific category
    setVolume(category, value) {
        value = Math.max(0, Math.min(1, value));
        this.volumes[category] = value;

        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        switch (category) {
            case 'master':
                if (this.masterGain) {
                    this.masterGain.gain.setValueAtTime(value, now);
                }
                break;
            case 'music':
                if (this.musicGain) {
                    this.musicGain.gain.setValueAtTime(value, now);
                }
                break;
            case 'sfx':
                if (this.sfxGain) {
                    this.sfxGain.gain.setValueAtTime(value, now);
                }
                break;
            case 'ui':
                if (this.uiGain) {
                    this.uiGain.gain.setValueAtTime(value, now);
                }
                break;
        }
    }

    // Play sound with error handling and spatial audio support
    play(soundName, volume = 0.5, position = null) {
        if (this.isMuted || !soundName) {
            return;
        }

        if (!this.isWebAudioSupported) {
            return;
        }

        try {
            if (!this.audioContext) {
                this.initializeAudioContext();
            }

            const contextState = this.audioContext?.state;
            const awaitingGesture = contextState === 'suspended' && !this.hasUserInteracted;
            if (awaitingGesture) {
                this.queuePendingSound(soundName, volume, position);
                return;
            }

            const resumeResult = this.resumeAudioContext();
            if (resumeResult && typeof resumeResult.then === 'function') {
                resumeResult.then(() => this.flushPendingSounds()).catch(() => { });
            }

            if (this.audioContext?.state === 'suspended') {
                this.queuePendingSound(soundName, volume, position);
                return;
            }

            this.playWithWebAudio(soundName, volume, position);
        } catch (error) {
            window.logger?.error?.("Error playing sound with Web Audio API:", error);
            this.isWebAudioSupported = false;
        }
    }

    queuePendingSound(soundName, volume, position) {
        if (!this.pendingSounds) {
            this.pendingSounds = [];
        }
        this.pendingSounds.push({ soundName, volume, position });
        if (this.pendingSounds.length > this.maxPendingSounds) {
            this.pendingSounds.shift();
        }
    }

    flushPendingSounds() {
        if (!Array.isArray(this.pendingSounds) || this.pendingSounds.length === 0) {
            return;
        }
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            return;
        }

        const queue = this.pendingSounds.splice(0, this.pendingSounds.length);
        queue.forEach(({ soundName, volume, position }) => {
            try {
                this.playWithWebAudio(soundName, volume, position);
            } catch (error) {
                window.logger?.warn?.('Failed to flush queued sound:', error);
            }
        });
    }

    // Calculate pan value from position (-1 left, 0 center, +1 right)
    calculatePan(position) {
        if (!position || !position.x) return 0;

        // Get actual canvas width from game or fall back to reasonable default
        const canvas = window.gameManager?.game?.canvas ||
            document.getElementById('game-canvas') ||
            document.querySelector('canvas');
        const canvasWidth = canvas?.width || 800;
        const centerX = canvasWidth / 2;

        // Normalize position to -1 to 1 range
        const pan = (position.x - centerX) / centerX;

        // Clamp to valid range
        return Math.max(-1, Math.min(1, pan));
    }

    // Play sound using Web Audio API with error handling
    playWithWebAudio(soundName, volume, position = null) {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }

        // Resume context if suspended
        this.resumeAudioContext();

        // Adjust volume (don't exceed 1.0)
        const adjustedVolume = Math.min(volume, 1.0);

        // Calculate spatial pan if position provided
        const pan = this.calculatePan(position);

        try {
            // Create different sounds based on sound name
            switch (soundName) {
                case 'shoot':
                    this.playShootSound(adjustedVolume, pan);
                    break;
                case 'hit':
                    this.playHitSound(adjustedVolume, pan);
                    break;
                case 'levelUp':
                    this.playLevelUpSound(adjustedVolume);
                    break;
                case 'upgrade':
                    this.playPickupSound(adjustedVolume);
                    break;
                case 'dodge':
                    this.playDodgeSound(adjustedVolume);
                    break;
                case 'enemyDeath':
                case 'enemyKilled':
                    this.playEnemyDeathSound(adjustedVolume, pan);
                    break;
                case 'pickup':
                    this.playPickupSound(adjustedVolume);
                    break;
                case 'boss':
                case 'bossKilled':
                    this.playBossSound(adjustedVolume);
                    break;
                case 'bossMode':
                case 'boss_spawn':
                case 'bossPhase':  // Boss phase change sound
                    this.playBossSound(adjustedVolume);
                    break;
                case 'boss_attack':
                    this.playBossAttackSound(adjustedVolume, pan);
                    break;
                case 'boss_charge':
                    this.playBossChargeSound(adjustedVolume, pan);
                    break;
                case 'playerHit':
                    this.playPlayerHitSound(adjustedVolume);
                    break;
                case 'aoeAttack':
                    this.playAOEAttackSound(adjustedVolume);
                    break;
                case 'shieldHit':
                    this.playShieldHitSound(adjustedVolume, pan);
                    break;
                case 'shieldBreak':
                    this.playShieldBreakSound(adjustedVolume);
                    break;
                case 'shieldRecharge':
                    this.playShieldRechargeSound(adjustedVolume);
                    break;
                case 'explosion':
                    this.playEnemyDeathSound(adjustedVolume, pan);
                    break;
                case 'gameOver':
                    this.playGameOverSound(adjustedVolume);
                    break;
                case 'victory':
                    this.playVictorySound(adjustedVolume);
                    break;
                case 'buttonClick':
                    this.playButtonClickSound(adjustedVolume);
                    break;
                case 'buttonHover':
                    this.playButtonHoverSound(adjustedVolume);
                    break;
                case 'notification':
                    this.playNotificationSound(adjustedVolume);
                    break;
                case 'achievement':
                    this.playAchievementSound(adjustedVolume);
                    break;
                case 'formationForm':
                    this.playFormationFormSound(adjustedVolume);
                    break;
                case 'formationMerge':
                    this.playFormationMergeSound(adjustedVolume);
                    break;
                case 'formationBreak':
                    this.playFormationBreakSound(adjustedVolume);
                    break;
                default:
                    window.logger?.warn?.(`Unknown sound name: ${soundName}`);
            }
        } catch (error) {
            window.logger?.error?.(`Error playing sound ${soundName}:`, error);
        }
    }

    // Enable/disable audio explicitly (used by UI)
    setEnabled(enabled) {
        try {
            if (!this.audioContext && this.isWebAudioSupported) {
                this.initializeAudioContext();
            }
            this.isMuted = !enabled;
            const target = enabled ? this.volumes.master : 0;
            if (this.masterGain) {
                this.masterGain.gain.value = target;
            }
            if (this.masterGainNode) {
                this.masterGainNode.gain.value = target;
            }
            // Resume audio context if enabling and it's suspended
            if (enabled && this.audioContext && this.audioContext.state === 'suspended') {
                this.resumeAudioContext();
            }
        } catch (error) {
            window.logger?.error?.('Error setting audio enabled state:', error);
        }
    }

    // Initialize audio context on user interaction with error handling
    handleUserInteraction() {
        try {
            this.hasUserInteracted = true;
            if (!this.audioContext) {
                this.initializeAudioContext();
            }
            if (this.audioContext?.state === 'suspended') {
                const resumeResult = this.audioContext.resume();
                if (resumeResult?.then) {
                    resumeResult.then(() => this.flushPendingSounds()).catch(() => { });
                } else {
                    this.flushPendingSounds();
                }
            } else {
                this.flushPendingSounds();
            }
        } catch (error) {
            window.logger?.error?.('Error handling user interaction:', error);
        }
    }

    // Toggle mute with error handling
    toggleMute() {
        try {
            this.isMuted = !this.isMuted;
            const target = this.isMuted ? 0 : this.volumes.master;
            if (this.masterGain) {
                this.masterGain.gain.value = target;
            }
            if (this.masterGainNode) {
                this.masterGainNode.gain.value = target;
            }
            return this.isMuted;
        } catch (error) {
            window.logger?.error?.('Error toggling mute:', error);
            return this.isMuted;
        }
    }

    // Soft projectile sound - warm and ear-friendly like formation sounds
    // Pleasant low tones with gentle variance for organic feel
    playShootSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Random variance for organic feel
        const pitchVar = 0.9 + Math.random() * 0.2;     // 90-110% pitch (tighter range)
        const volVar = 0.85 + Math.random() * 0.3;     // 85-115% volume
        const decayVar = 0.9 + Math.random() * 0.2;

        // Layer 1: Warm low-mid tone (softer than before)
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        osc1.type = 'sine';  // Pure sine = softest
        osc1.frequency.setValueAtTime(380 * pitchVar, now);  // Lower base freq
        osc1.frequency.exponentialRampToValueAtTime(180 * pitchVar, now + 0.1 * decayVar);
        gain1.gain.setValueAtTime(volume * 0.15 * volVar, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12 * decayVar);

        // Layer 2: Sub bass punch (felt more than heard)
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(120 * pitchVar, now);
        osc2.frequency.exponentialRampToValueAtTime(60 * pitchVar, now + 0.08 * decayVar);
        gain2.gain.setValueAtTime(volume * 0.12 * volVar, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1 * decayVar);

        // Layer 3: Soft filtered noise puff (not harsh attack)
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.04);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';  // Bandpass = softer than highpass
        noiseFilter.frequency.value = 600 + Math.random() * 400;  // 600-1000Hz (much lower)
        noiseFilter.Q.value = 1.5;
        noiseGain.gain.setValueAtTime(volume * 0.06 * volVar, now);  // Much quieter noise
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04 * decayVar);

        // Connect
        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        gain1.connect(panner);
        gain2.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);

        // Play
        osc1.start(now);
        osc2.start(now);
        noise.start(now);
        osc1.stop(now + 0.15 * decayVar);
        osc2.stop(now + 0.12 * decayVar);
        noise.stop(now + 0.05 * decayVar);
    }

    // Hit sound - impactful with variance
    playHitSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Random variance for organic feel
        const pitchVar = 0.85 + Math.random() * 0.3;
        const volVar = 0.8 + Math.random() * 0.4;

        // Impact transient (with variance)
        const impact = this.audioContext.createOscillator();
        const impactGain = this.audioContext.createGain();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(250 * pitchVar, now);
        impact.frequency.exponentialRampToValueAtTime(50 * pitchVar, now + 0.08);
        impactGain.gain.setValueAtTime(volume * 0.3 * volVar, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Noise burst (with filter variance)
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.12);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200 + Math.random() * 400, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        noiseGain.gain.setValueAtTime(volume * 0.35 * volVar, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        // Connect
        impact.connect(impactGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        impactGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);

        // Play
        impact.start(now);
        noise.start(now);
        impact.stop(now + 0.1);
        noise.stop(now + 0.12);
    }

    // Level up sound - Classic arcade inspired (Mario power-up / Galaga style)
    // Warm, snappy, satisfying - no shrill high frequencies
    playLevelUpSound(volume) {
        const now = this.audioContext.currentTime;

        // Sub-bass punch for weight (like Galaga capture)
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, now);
        sub.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        subGain.gain.setValueAtTime(volume * 0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.25);

        // Classic Mario-style dual tone rise (but warmer frequencies)
        // First tone: quick ascending blip
        const tone1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        tone1.type = 'triangle'; // Softer than square
        tone1.frequency.setValueAtTime(330, now); // E4
        tone1.frequency.setValueAtTime(440, now + 0.06); // A4
        gain1.gain.setValueAtTime(volume * 0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        tone1.connect(gain1);
        gain1.connect(this.sfxGain);
        tone1.start(now);
        tone1.stop(now + 0.15);

        // Second tone: confirmation note (higher, satisfying)
        const tone2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        tone2.type = 'triangle';
        tone2.frequency.setValueAtTime(523, now + 0.08); // C5
        gain2.gain.setValueAtTime(0.001, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(volume * 0.3, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        tone2.connect(gain2);
        gain2.connect(this.sfxGain);
        tone2.start(now + 0.08);
        tone2.stop(now + 0.4);

        // Soft harmonic shimmer (much lower than before - C5 range, not C7-C8)
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        const shimmerFilter = this.audioContext.createBiquadFilter();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(659, now + 0.1); // E5
        shimmer.frequency.linearRampToValueAtTime(784, now + 0.25); // G5
        shimmerFilter.type = 'lowpass';
        shimmerFilter.frequency.value = 2000; // Cut highs
        shimmerGain.gain.setValueAtTime(0.001, now + 0.1);
        shimmerGain.gain.exponentialRampToValueAtTime(volume * 0.12, now + 0.15);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        shimmer.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(now + 0.1);
        shimmer.stop(now + 0.35);
    }

    // Dodge sound - soft whoosh (ear-friendly version)
    playDodgeSound(volume) {
        const now = this.audioContext.currentTime;

        // Soft filtered noise whoosh (lower frequency ceiling)
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);  // Much lower ceiling
        filter.Q.value = 1.0;  // Lower Q = smoother

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(volume * 0.05, now);
        gain.gain.exponentialRampToValueAtTime(volume * 0.12, now + 0.06);  // Gentler peak
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        // Softer doppler-like oscillator (lower range)
        const doppler = this.audioContext.createOscillator();
        const dopplerGain = this.audioContext.createGain();
        doppler.type = 'sine';
        doppler.frequency.setValueAtTime(80, now);
        doppler.frequency.exponentialRampToValueAtTime(300, now + 0.12);  // Lower range
        dopplerGain.gain.setValueAtTime(volume * 0.08, now);
        dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        doppler.connect(dopplerGain);
        dopplerGain.connect(this.sfxGain);

        noise.start(now);
        doppler.start(now);
        noise.stop(now + 0.2);
        doppler.stop(now + 0.15);
    }

    // Enemy death sound - explosion with variance
    playEnemyDeathSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Random variance for organic late-game mass deaths
        const pitchVar = 0.8 + Math.random() * 0.4;
        const volVar = 0.7 + Math.random() * 0.6;

        // Layer 1: Sub-bass rumble
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80 * pitchVar, now);
        sub.frequency.exponentialRampToValueAtTime(30 * pitchVar, now + 0.35);
        subGain.gain.setValueAtTime(volume * 0.3 * volVar, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        // Layer 2: Mid explosion tone (triangle instead of harsh sawtooth)
        const mid = this.audioContext.createOscillator();
        const midGain = this.audioContext.createGain();
        mid.type = 'triangle';  // Softer than sawtooth
        mid.frequency.setValueAtTime(180 * pitchVar, now);
        mid.frequency.exponentialRampToValueAtTime(40 * pitchVar, now + 0.3);
        midGain.gain.setValueAtTime(volume * 0.2 * volVar, now);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        // Layer 3: Noise explosion (with variance)
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.35);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1500 + Math.random() * 500, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
        noiseGain.gain.setValueAtTime(volume * 0.35 * volVar, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        // Connect
        sub.connect(subGain);
        mid.connect(midGain);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        subGain.connect(panner);
        midGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);

        // Play
        sub.start(now);
        mid.start(now);
        noise.start(now);
        sub.stop(now + 0.4);
        mid.stop(now + 0.35);
        noise.stop(now + 0.35);
    }

    // Pickup sound - coin with variance
    playPickupSound(volume) {
        const now = this.audioContext.currentTime;

        // Random variance for organic feel
        const pitchVar = 0.9 + Math.random() * 0.2;
        const volVar = 0.85 + Math.random() * 0.3;

        // Sub-bass thump (with variance)
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(100 * pitchVar, now);
        sub.frequency.exponentialRampToValueAtTime(60 * pitchVar, now + 0.08);
        subGain.gain.setValueAtTime(volume * 0.15 * volVar, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        sub.connect(subGain);
        subGain.connect(this.uiGain);
        sub.start(now);
        sub.stop(now + 0.12);

        // Classic coin dual-tone with variance
        const baseFreqs = [523, 659]; // C5, E5
        baseFreqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * pitchVar, now + i * 0.05);

            gain.gain.setValueAtTime(volume * 0.18 * volVar, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.uiGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.18);
        });
    }

    // Boss sound - menacing and powerful
    playBossSound(volume) {
        const now = this.audioContext.currentTime;

        // Deep rumble layers
        [40, 60, 80].forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = i === 0 ? 'sawtooth' : 'square';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.setValueAtTime(freq * 0.9, now + 0.2);
            osc.frequency.setValueAtTime(freq * 0.7, now + 0.5);

            gain.gain.setValueAtTime(volume * 0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.7);
        });

        // Alarm siren
        const siren = this.audioContext.createOscillator();
        const sirenGain = this.audioContext.createGain();
        siren.type = 'square';
        siren.frequency.setValueAtTime(440, now);
        siren.frequency.setValueAtTime(554, now + 0.15);
        siren.frequency.setValueAtTime(415, now + 0.3);
        siren.frequency.setValueAtTime(523, now + 0.45);
        sirenGain.gain.setValueAtTime(0.001, now);
        sirenGain.gain.exponentialRampToValueAtTime(volume * 0.15, now + 0.05);
        sirenGain.gain.setValueAtTime(0.001, now + 0.12);
        sirenGain.gain.exponentialRampToValueAtTime(volume * 0.15, now + 0.17);
        sirenGain.gain.setValueAtTime(0.001, now + 0.27);
        sirenGain.gain.exponentialRampToValueAtTime(volume * 0.15, now + 0.32);
        sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        siren.connect(sirenGain);
        sirenGain.connect(this.sfxGain);
        siren.start(now);
        siren.stop(now + 0.7);

        // Noise layer
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.7);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 250;
        noiseFilter.Q.value = 1.5;
        noiseGain.gain.setValueAtTime(volume * 0.12, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.7);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.7);
    }

    // Boss attack - deep, powerful (softened version)
    playBossAttackSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Deep impact (softer waveform)
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.type = 'triangle';  // Softer than sawtooth
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        oscGain.gain.setValueAtTime(volume * 0.2, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        // Low rumble element (replaces harsh square laser)
        const rumble = this.audioContext.createOscillator();
        const rumbleGain = this.audioContext.createGain();
        rumble.type = 'sine';  // Pure sine = softest
        rumble.frequency.setValueAtTime(200, now);
        rumble.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        rumbleGain.gain.setValueAtTime(volume * 0.15, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Connect
        osc.connect(oscGain);
        oscGain.connect(panner);

        rumble.connect(rumbleGain);
        rumbleGain.connect(panner);

        panner.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
        rumble.start(now);
        rumble.stop(now + 0.2);
    }

    // Boss charge - low rumble energy (softened version)
    playBossChargeSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();

        osc.type = 'sine';  // Softest waveform
        osc.frequency.setValueAtTime(60, now);  // Lower start
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.6);  // Lower ceiling

        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.5);  // Quieter
        oscGain.gain.linearRampToValueAtTime(0.001, now + 0.6);

        osc.connect(oscGain);
        oscGain.connect(panner);
        panner.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.6);
    }



    // Player hit sound - painful impact
    playPlayerHitSound(volume) {
        const now = this.audioContext.currentTime;

        // Deep impact
        const impact = this.audioContext.createOscillator();
        const impactGain = this.audioContext.createGain();
        impact.type = 'square';
        impact.frequency.setValueAtTime(150, now);
        impact.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        impactGain.gain.setValueAtTime(volume * 0.35, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        // Harsh noise
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        noiseGain.gain.setValueAtTime(volume * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        impact.connect(impactGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        impactGain.connect(this.sfxGain);
        noiseGain.connect(this.sfxGain);

        impact.start(now);
        noise.start(now);
        impact.stop(now + 0.3);
        noise.stop(now + 0.2);
    }

    // AOE attack sound - powerful shockwave
    playAOEAttackSound(volume) {
        const now = this.audioContext.currentTime;

        // Expanding wave
        const wave = this.audioContext.createOscillator();
        const waveGain = this.audioContext.createGain();
        wave.type = 'sine';
        wave.frequency.setValueAtTime(300, now);
        wave.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        waveGain.gain.setValueAtTime(volume * 0.35, now);
        waveGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        // Noise burst
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.5);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.4);
        filter.Q.value = 1.5;
        noiseGain.gain.setValueAtTime(volume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        wave.connect(waveGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        waveGain.connect(this.sfxGain);
        noiseGain.connect(this.sfxGain);

        wave.start(now);
        noise.start(now);
        wave.stop(now + 0.5);
        noise.stop(now + 0.5);
    }

    // Shield hit sound - crystalline deflect (softened for late game)
    playShieldHitSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Metallic ping (lowered from 2400Hz to 1600Hz for warmth)
        const ping = this.audioContext.createOscillator();
        const pingGain = this.audioContext.createGain();
        const pingFilter = this.audioContext.createBiquadFilter();
        ping.type = 'triangle'; // Softer than sine
        ping.frequency.setValueAtTime(1600, now);
        ping.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        pingFilter.type = 'lowpass';
        pingFilter.frequency.value = 3000; // Cut harsh highs
        pingGain.gain.setValueAtTime(volume * 0.18, now); // Reduced from 0.25
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Subtle noise burst (reduced)
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.06);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass'; // Changed from highpass
        filter.frequency.value = 1500;
        filter.Q.value = 1.5;
        noiseGain.gain.setValueAtTime(volume * 0.1, now); // Reduced from 0.15
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        ping.connect(pingFilter);
        pingFilter.connect(pingGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        pingGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);

        ping.start(now);
        noise.start(now);
        ping.stop(now + 0.12);
        noise.stop(now + 0.06);
    }

    // Shield break sound - dramatic glass shatter
    playShieldBreakSound(volume) {
        const now = this.audioContext.currentTime;

        // Glass shatter (multi-frequency noise bursts)
        for (let i = 0; i < 3; i++) {
            const noise = this.audioContext.createBufferSource();
            noise.buffer = this.createNoiseBuffer(0.15);
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 1500 + i * 500;
            gain.gain.setValueAtTime(volume * 0.2, now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.15);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
            noise.start(now + i * 0.03);
            noise.stop(now + i * 0.03 + 0.15);
        }

        // Descending power failure
        const descent = this.audioContext.createOscillator();
        const descentGain = this.audioContext.createGain();
        descent.type = 'sawtooth';
        descent.frequency.setValueAtTime(1000, now);
        descent.frequency.exponentialRampToValueAtTime(80, now + 0.4);
        descentGain.gain.setValueAtTime(volume * 0.3, now);
        descentGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        descent.connect(descentGain);
        descentGain.connect(this.sfxGain);
        descent.start(now);
        descent.stop(now + 0.5);

        // Whoosh
        const whoosh = this.audioContext.createBufferSource();
        whoosh.buffer = this.createNoiseBuffer(0.5);
        const whooshGain = this.audioContext.createGain();
        const whooshFilter = this.audioContext.createBiquadFilter();
        whooshFilter.type = 'bandpass';
        whooshFilter.frequency.setValueAtTime(300, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(1500, now + 0.5);
        whooshFilter.Q.value = 1.2;
        whooshGain.gain.setValueAtTime(volume * 0.2, now);
        whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        whoosh.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(this.sfxGain);
        whoosh.start(now);
        whoosh.stop(now + 0.5);
    }

    // Shield recharge sound - warm power-up (no harsh high frequencies)
    playShieldRechargeSound(volume) {
        const now = this.audioContext.currentTime;

        // Sub-bass energy pulse
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60, now);
        sub.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        subGain.gain.setValueAtTime(volume * 0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.4);

        // Ascending arpeggio (warmer frequencies)
        const frequencies = [330, 392, 494, 587]; // E4, G4, B4, D5

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle'; // Warmer than sine
            osc.frequency.setValueAtTime(freq, now + i * 0.06);

            gain.gain.setValueAtTime(0.001, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(volume * 0.18, now + i * 0.06 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.25);
        });

        // Soft filtered shimmer (C5-G5 range with low-pass, not E7-C8)
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        const shimmerFilter = this.audioContext.createBiquadFilter();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(523, now + 0.15); // C5
        shimmer.frequency.linearRampToValueAtTime(784, now + 0.35); // G5
        shimmerFilter.type = 'lowpass';
        shimmerFilter.frequency.value = 1800;
        shimmerGain.gain.setValueAtTime(0.001, now + 0.15);
        shimmerGain.gain.exponentialRampToValueAtTime(volume * 0.1, now + 0.2);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        shimmer.connect(shimmerFilter);
        shimmerFilter.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(now + 0.15);
        shimmer.stop(now + 0.45);
    }

    // Game over sound - somber and final
    playGameOverSound(volume) {
        const now = this.audioContext.currentTime;

        // Descending minor chord
        const frequencies = [
            440,   // A4
            349.23, // F4
            329.63, // E4
            261.63  // C4
        ];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.2);

            gain.gain.setValueAtTime(0.001, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(volume * 0.25, now + i * 0.2 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.6);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.7);
        });
    }

    // Victory sound - triumphant fanfare
    playVictorySound(volume) {
        const now = this.audioContext.currentTime;

        // Triumphant ascending sequence
        const sequence = [
            [261.63, 329.63, 392.00], // C major (0.0s)
            [293.66, 369.99, 440.00], // D major (0.15s)
            [329.63, 415.30, 493.88], // E major (0.3s)
            [392.00, 493.88, 587.33]  // G major (0.45s)
        ];

        sequence.forEach((chord, i) => {
            chord.forEach(freq => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.15);

                gain.gain.setValueAtTime(0.001, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(volume * 0.15, now + i * 0.15 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);

                osc.connect(gain);
                gain.connect(this.sfxGain);

                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.5);
            });
        });

        // High octave finale
        const finale = this.audioContext.createOscillator();
        const finaleGain = this.audioContext.createGain();
        finale.type = 'sine';
        finale.frequency.setValueAtTime(1046.5, now + 0.6); // C6
        finaleGain.gain.setValueAtTime(0.001, now + 0.6);
        finaleGain.gain.exponentialRampToValueAtTime(volume * 0.25, now + 0.65);
        finaleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        finale.connect(finaleGain);
        finaleGain.connect(this.sfxGain);
        finale.start(now + 0.6);
        finale.stop(now + 1.3);
    }

    // UI Sounds

    // Button click - satisfying tactile feedback
    playButtonClickSound(volume) {
        const now = this.audioContext.currentTime;

        const click = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();

        click.type = 'sine';
        click.frequency.setValueAtTime(800, now);
        click.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        clickGain.gain.setValueAtTime(volume * 0.15, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        click.connect(clickGain);
        clickGain.connect(this.uiGain);

        click.start(now);
        click.stop(now + 0.08);
    }

    // Button hover - subtle feedback
    playButtonHoverSound(volume) {
        const now = this.audioContext.currentTime;

        const hover = this.audioContext.createOscillator();
        const hoverGain = this.audioContext.createGain();

        hover.type = 'sine';
        hover.frequency.setValueAtTime(600, now);

        hoverGain.gain.setValueAtTime(volume * 0.08, now);
        hoverGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        hover.connect(hoverGain);
        hoverGain.connect(this.uiGain);

        hover.start(now);
        hover.stop(now + 0.05);
    }

    // Notification sound - attention getter
    playNotificationSound(volume) {
        const now = this.audioContext.currentTime;

        [0, 0.1].forEach((offset, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(i === 0 ? 880 : 1047, now + offset);

            gain.gain.setValueAtTime(volume * 0.15, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);

            osc.connect(gain);
            gain.connect(this.uiGain);

            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
        });
    }

    // Achievement sound - Classic arcade fanfare (Galaga style, warmer)
    playAchievementSound(volume) {
        const now = this.audioContext.currentTime;

        // Sub-bass punch for weight
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, now);
        sub.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        subGain.gain.setValueAtTime(volume * 0.25, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        sub.connect(subGain);
        subGain.connect(this.uiGain);
        sub.start(now);
        sub.stop(now + 0.25);

        // Warmer ascending fanfare (C4-G4-C5 range instead of C5-C6)
        const notes = [262, 330, 392, 523]; // C4, E4, G4, C5

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'triangle'; // Warmer than sine
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.001, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(volume * 0.2, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(this.uiGain);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }

    // === FORMATION AMBIENT SOUNDS ===
    // Subtle background sounds for constellation/formation events
    // All have random variance to sound organic with high-frequency late-game events

    // Formation/constellation created - ethereal rising chord
    // Very subtle, Polybius-style mystical hum
    playFormationFormSound(volume) {
        const now = this.audioContext.currentTime;

        // Random variance for organic feel when many play near each other
        const pitchVar = 0.9 + Math.random() * 0.2;   // 90-110% pitch
        const volVar = 0.7 + Math.random() * 0.6;     // 70-130% volume for subtle variation

        // Base frequencies for a mysterious minor chord (Am7 voicing)
        const baseFreqs = [220, 261, 329, 392]; // A3, C4, E4, G4

        // Pick 2-3 random notes from the chord for variety
        const noteCount = 2 + Math.floor(Math.random() * 2);
        const selectedFreqs = baseFreqs
            .sort(() => Math.random() - 0.5)
            .slice(0, noteCount);

        selectedFreqs.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = Math.random() < 0.3 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq * pitchVar * 0.5, now);
            osc.frequency.exponentialRampToValueAtTime(freq * pitchVar, now + 0.3);

            // Slow fade in, hold, fade out
            const attackTime = 0.1 + Math.random() * 0.1;
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.exponentialRampToValueAtTime(volume * 0.08 * volVar, now + attackTime);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.03);
            osc.stop(now + 0.6);
        });
    }

    // Formations merge - harmonic crystallization (two tones sliding to unison)
    // Galaga power-up inspiration, very subtle
    playFormationMergeSound(volume) {
        const now = this.audioContext.currentTime;

        // Random variance
        const pitchVar = 0.85 + Math.random() * 0.3;
        const volVar = 0.8 + Math.random() * 0.4;

        // Two oscillators that slide together
        const targetFreq = (300 + Math.random() * 100) * pitchVar; // 300-400Hz base
        const spread = 30 + Math.random() * 40; // How far apart they start

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        // Start apart, slide to unison
        osc1.frequency.setValueAtTime(targetFreq - spread, now);
        osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.25);
        osc2.frequency.setValueAtTime(targetFreq + spread, now);
        osc2.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.25);

        const peakVol = volume * 0.06 * volVar;
        gain1.gain.setValueAtTime(0.001, now);
        gain1.gain.exponentialRampToValueAtTime(peakVol, now + 0.1);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.exponentialRampToValueAtTime(peakVol, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(this.sfxGain);
        gain2.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
    }

    // Formation breaks - quick falling shatter
    // Reverse of form sound with noise burst
    playFormationBreakSound(volume) {
        const now = this.audioContext.currentTime;

        // Random variance for late-game variety
        const pitchVar = 0.8 + Math.random() * 0.4;
        const volVar = 0.7 + Math.random() * 0.6;

        // Falling tone
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.type = Math.random() < 0.5 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(400 * pitchVar, now);
        osc.frequency.exponentialRampToValueAtTime(80 * pitchVar, now + 0.15);

        oscGain.gain.setValueAtTime(volume * 0.1 * volVar, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);

        // Short noise burst for scatter/shatter
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.08);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 800 + Math.random() * 600;
        noiseFilter.Q.value = 1;

        noiseGain.gain.setValueAtTime(volume * 0.08 * volVar, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.25);
        noise.stop(now + 0.12);
    }

    // === CONTINUOUS AMBIENT MUSIC SYSTEM ===

    // Start ambient background music
    startAmbientMusic() {
        this.musicEnabled = true;
        if (!this.currentSource && this.initialized) {
            this.playNextTrack();
        } else if (this.currentSource && this.audioContext.state === 'suspended') {
            this.resumeAudioContext();
        }
    }

    // Stop ambient music
    stopAmbientMusic() {
        this.musicEnabled = false;
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) { }
            this.currentSource = null;
        }
    }

    async loadTrack(url) {
        if (this.musicBufferCache.has(url)) {
            return this.musicBufferCache.get(url);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.musicBufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            window.logger?.error?.(`Failed to load music track: ${url}`, error);
            return null;
        }
    }

    playNextTrack() {
        if (!this.musicEnabled && this.currentTrackIndex !== -1) return;

        // Advance index
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.playTrack(this.playlist[this.currentTrackIndex]);
    }

    async playTrack(url) {
        if (!this.audioContext || this.isLoadingMusic) return;
        this.isLoadingMusic = true;

        const buffer = await this.loadTrack(url);
        if (!buffer) {
            this.isLoadingMusic = false;
            // Try next one on error
            this.playNextTrack();
            return;
        }

        if (!this.musicEnabled) {
            this.isLoadingMusic = false;
            return;
        }

        const now = this.audioContext.currentTime;
        const fadeDuration = this.crossfadeDuration || 2.0;

        // Fade out current track if playing
        if (this.currentSource && this.currentSourceGain) {
            try {
                // Smooth fade out
                this.currentSourceGain.gain.setValueAtTime(this.currentSourceGain.gain.value, now);
                this.currentSourceGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

                // Schedule stop after fade
                const oldSource = this.currentSource;
                setTimeout(() => {
                    try {
                        oldSource.stop();
                        oldSource.disconnect();
                    } catch (e) { }
                }, fadeDuration * 1000 + 100);
            } catch (e) { }
        }

        // Create new source with its own gain for fade-in
        const source = this.audioContext.createBufferSource();
        const sourceGain = this.audioContext.createGain();

        source.buffer = buffer;
        source.loop = false;

        // Connect: source -> sourceGain -> musicGain (effects chain)
        source.connect(sourceGain);
        sourceGain.connect(this.musicGain);

        // Fade in new track
        sourceGain.gain.setValueAtTime(0, now);
        sourceGain.gain.linearRampToValueAtTime(1, now + fadeDuration);

        // When track ends, play next
        source.onended = () => {
            if (this.currentSource === source) {
                this.playNextTrack();
            }
        };

        source.start(0);

        this.currentSource = source;
        this.currentSourceGain = sourceGain;
        this.isLoadingMusic = false;
    }

    setMusicIntensity(intensity) {
        this.currentIntensity = Math.max(0, Math.min(1, intensity));

        // Adjust reverb based on intensity
        if (this.reverbGain && this.dryGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            const reverbAmount = 0.1 + (this.currentIntensity * 0.15);

            try {
                this.reverbGain.gain.linearRampToValueAtTime(reverbAmount, now + 0.5);
                this.dryGain.gain.linearRampToValueAtTime(1 - reverbAmount, now + 0.5);
            } catch (e) { }
        }
    }




    // Utility function to create noise
    createNoiseBuffer(duration) {
        const sampleRate = this.audioContext.sampleRate;
        const bufferSize = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }
}

// Create global audio system instance with error handling


let audioSystem;
try {
    if (typeof window !== 'undefined') {
        if (!window.audioSystem) {
            window.audioSystem = new AudioSystem();
        }
        audioSystem = window.audioSystem;
    } else {
        audioSystem = new AudioSystem();
    }

    // Add event listeners for user interactions to initialize audio
    if (typeof document !== 'undefined') {
        const unlockAudio = () => audioSystem.handleUserInteraction();
        ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(eventName => {
            document.addEventListener(eventName, unlockAudio, { once: true, passive: true });
        });
    }
} catch (error) {
    window.logger?.error?.('Error creating audio system:', error);
    // Create a dummy audio system
    audioSystem = {
        play: () => { },
        playBossBeat: () => { },
        playBossTheme: () => { },
        stopBossTheme: () => { },
        startAmbientMusic: () => { },
        stopAmbientMusic: () => { },
        setMusicIntensity: () => { },
        toggleMute: () => false,
        setEnabled: () => { },
        setVolume: () => { },
        handleUserInteraction: () => { },
        resumeAudioContext: () => { },
        initializeAudioContext: () => { },
        isMuted: false,
        masterGain: { gain: { value: 0.5 } }
    };
    if (typeof window !== 'undefined') {
        window.audioSystem = audioSystem;
    }
}

// Boss theme: play bass beat in sync with player shots
AudioSystem.prototype.playBossTheme = function (volume = 0.4) {
    this.isBossThemePlaying = true;
    this._bossBeat = { notes: [82.41, 98.00, 61.74, 65.41], idx: 0, volume };
};

AudioSystem.prototype.stopBossTheme = function () {
    this.isBossThemePlaying = false;
    delete this._bossBeat;
};

// Play a single boss beat note (invoke on each player shot)
AudioSystem.prototype.playBossBeat = function () {
    if (!this.isBossThemePlaying || !this._bossBeat || !this.audioContext || !this.masterGain || this.isMuted) return;

    try {
        const now = this.audioContext.currentTime;
        const beat = this._bossBeat;
        const freq = beat.notes[beat.idx];
        beat.idx = (beat.idx + 1) % beat.notes.length;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gainNode.gain.setValueAtTime(beat.volume || 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gainNode);
        gainNode.connect(this.musicGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);

        // Cleanup
        setTimeout(() => {
            osc.disconnect();
            gainNode.disconnect();
        }, 450);
    } catch (error) {
        window.logger?.error?.('Error playing boss beat:', error);
    }
};

// Make globally available
if (typeof window !== 'undefined') {
    window.Game = window.Game || {};
    window.Game.AudioSystem = AudioSystem;
}
