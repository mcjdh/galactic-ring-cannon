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
                music: 0.6,
                sfx: 0.7,
                ui: 0.5
            };

            // Initialize audio context on first user interaction
            this.initialized = false;
            this.hasUserInteracted = false;
            this.pendingSounds = [];
            this.maxPendingSounds = 8;

            // Music system state
            this.musicLayers = {
                ambient: null,
                bass: null,
                melody: null,
                intensity: null
            };
            this.currentIntensity = 0; // 0-1 scale
            this.musicEnabled = false;
            this._musicTimeouts = []; // Track setTimeout IDs for cleanup

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
        // Clear all music timeouts
        if (this._musicTimeouts) {
            for (const timeoutId of this._musicTimeouts) {
                clearTimeout(timeoutId);
            }
            this._musicTimeouts = [];
        }

        // Stop boss theme
        this.stopBossTheme();

        // Stop ambient music
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

            // Connect audio chain
            // Each category goes through reverb and compressor
            this.musicGain.connect(this.dryGain);
            this.musicGain.connect(this.reverb);

            this.sfxGain.connect(this.dryGain);
            this.sfxGain.connect(this.reverb);

            this.uiGain.connect(this.dryGain);

            this.reverb.connect(this.reverbGain);

            this.dryGain.connect(this.compressor);
            this.reverbGain.connect(this.compressor);

            this.compressor.connect(this.masterGain);
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

    // Enhanced shoot sound - layered for richness
    playShootSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Layer 1: High frequency pulse
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.exponentialRampToValueAtTime(600, now + 0.08);
        gain1.gain.setValueAtTime(volume * 0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Layer 2: Mid frequency body
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(440, now);
        osc2.frequency.exponentialRampToValueAtTime(220, now + 0.12);
        gain2.gain.setValueAtTime(volume * 0.25, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Layer 3: Noise burst for attack
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.05);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;
        noiseGain.gain.setValueAtTime(volume * 0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        // Connect everything
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
        osc1.stop(now + 0.15);
        osc2.stop(now + 0.15);
        noise.stop(now + 0.05);
    }

    // Enhanced hit sound - more impactful
    playHitSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Impact transient
        const impact = this.audioContext.createOscillator();
        const impactGain = this.audioContext.createGain();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(250, now);
        impact.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        impactGain.gain.setValueAtTime(volume * 0.4, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        // Noise burst
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.15);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        noiseGain.gain.setValueAtTime(volume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

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
        noise.stop(now + 0.15);
    }

    // Enhanced level up sound - triumphant and satisfying
    playLevelUpSound(volume) {
        const now = this.audioContext.currentTime;

        // Major chord arpeggio
        const frequencies = [
            261.63, // C4
            329.63, // E4
            392.00, // G4
            523.25, // C5
            659.25  // E5
        ];

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = i % 2 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.001, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(volume * 0.2, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.5);
        });

        // Add shimmer
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(2093, now + 0.2); // C7
        shimmer.frequency.exponentialRampToValueAtTime(4186, now + 0.6); // C8
        shimmerGain.gain.setValueAtTime(0.001, now + 0.2);
        shimmerGain.gain.exponentialRampToValueAtTime(volume * 0.1, now + 0.3);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(now + 0.2);
        shimmer.stop(now + 0.7);
    }

    // Dodge sound - improved whoosh
    playDodgeSound(volume) {
        const now = this.audioContext.currentTime;

        // Multi-band whoosh
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.25);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
        filter.Q.value = 2.0;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(volume * 0.08, now);
        gain.gain.exponentialRampToValueAtTime(volume * 0.25, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        // Add doppler-like oscillator
        const doppler = this.audioContext.createOscillator();
        const dopplerGain = this.audioContext.createGain();
        doppler.type = 'sine';
        doppler.frequency.setValueAtTime(100, now);
        doppler.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        dopplerGain.gain.setValueAtTime(volume * 0.15, now);
        dopplerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        doppler.connect(dopplerGain);
        dopplerGain.connect(this.sfxGain);

        noise.start(now);
        doppler.start(now);
        noise.stop(now + 0.25);
        doppler.stop(now + 0.2);
    }

    // Enhanced enemy death sound - bigger explosion
    playEnemyDeathSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Layer 1: Sub-bass rumble
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(80, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        subGain.gain.setValueAtTime(volume * 0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        // Layer 2: Mid explosion tone
        const mid = this.audioContext.createOscillator();
        const midGain = this.audioContext.createGain();
        mid.type = 'sawtooth';
        mid.frequency.setValueAtTime(200, now);
        mid.frequency.exponentialRampToValueAtTime(40, now + 0.35);
        midGain.gain.setValueAtTime(volume * 0.3, now);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        // Layer 3: Noise explosion
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.4);
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.4);
        noiseGain.gain.setValueAtTime(volume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

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
        sub.stop(now + 0.5);
        mid.stop(now + 0.4);
        noise.stop(now + 0.4);
    }

    // Pickup sound - satisfying coin/gem sound
    playPickupSound(volume) {
        const now = this.audioContext.currentTime;

        // Dual tone chime
        [1, 2].forEach((mult, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1047 * mult, now + i * 0.04); // C6, C7

            gain.gain.setValueAtTime(volume * 0.2, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2);

            osc.connect(gain);
            gain.connect(this.uiGain);

            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.25);
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

    // Boss attack - sharp, aggressive mechanical sound
    playBossAttackSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // Metallic impact
        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        oscGain.gain.setValueAtTime(volume * 0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        // Zap/Laser element
        const lazer = this.audioContext.createOscillator();
        const lazerGain = this.audioContext.createGain();
        lazer.type = 'square';
        lazer.frequency.setValueAtTime(800, now);
        lazer.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        lazerGain.gain.setValueAtTime(volume * 0.2, now);
        lazerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        // Connect
        osc.connect(oscGain);
        oscGain.connect(panner);

        lazer.connect(lazerGain);
        lazerGain.connect(panner);

        panner.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
        lazer.start(now);
        lazer.stop(now + 0.2);
    }

    // Boss charge - rising energy sound
    playBossChargeSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.8);

        oscGain.gain.setValueAtTime(0.001, now);
        oscGain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.7);
        oscGain.gain.linearRampToValueAtTime(0.001, now + 0.8);

        osc.connect(oscGain);
        oscGain.connect(panner);
        panner.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.8);
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

    // Shield hit sound - crystalline deflect
    playShieldHitSound(volume, pan = 0) {
        const now = this.audioContext.currentTime;
        const panner = this.audioContext.createStereoPanner();
        panner.pan.value = pan;

        // High metallic ping
        const ping = this.audioContext.createOscillator();
        const pingGain = this.audioContext.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(2400, now);
        ping.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
        pingGain.gain.setValueAtTime(volume * 0.25, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        // Bright noise
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.08);
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1200;
        noiseGain.gain.setValueAtTime(volume * 0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        ping.connect(pingGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        pingGain.connect(panner);
        noiseGain.connect(panner);
        panner.connect(this.sfxGain);

        ping.start(now);
        noise.start(now);
        ping.stop(now + 0.12);
        noise.stop(now + 0.08);
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

    // Shield recharge sound - magical power-up
    playShieldRechargeSound(volume) {
        const now = this.audioContext.currentTime;

        // Ascending arpeggio
        const frequencies = [440, 554, 659, 880]; // A major chord

        frequencies.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0.001, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(volume * 0.18, now + i * 0.08 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.35);
        });

        // Sparkle shimmer
        const shimmer = this.audioContext.createOscillator();
        const shimmerGain = this.audioContext.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(2637, now); // E7
        shimmer.frequency.exponentialRampToValueAtTime(4186, now + 0.4); // C8
        shimmerGain.gain.setValueAtTime(0.001, now);
        shimmerGain.gain.exponentialRampToValueAtTime(volume * 0.1, now + 0.1);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(now);
        shimmer.stop(now + 0.5);
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

    // Achievement sound - celebratory
    playAchievementSound(volume) {
        const now = this.audioContext.currentTime;

        // Bright ascending notes
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);

            gain.gain.setValueAtTime(0.001, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(volume * 0.2, now + i * 0.07 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.3);

            osc.connect(gain);
            gain.connect(this.uiGain);

            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.35);
        });
    }

    // === CONTINUOUS AMBIENT MUSIC SYSTEM ===

    // Start ambient background music
    startAmbientMusic() {
        if (!this.audioContext || this.musicEnabled) return;

        this.musicEnabled = true;
        this.createAmbientLayer();
        this.createBassLayer();

        // Start melody and intensity layers based on gameplay
        this.updateMusicLayers();
    }

    // Stop ambient music
    stopAmbientMusic() {
        if (!this.musicEnabled) return;

        this.musicEnabled = false;

        // Clear all music-related timeouts to prevent memory leaks
        if (this._musicTimeouts) {
            this._musicTimeouts.forEach(id => clearTimeout(id));
            this._musicTimeouts = [];
        }

        // Stop all music layers
        Object.keys(this.musicLayers).forEach(key => {
            if (this.musicLayers[key]) {
                try {
                    this.musicLayers[key].forEach(node => {
                        if (node.stop) node.stop();
                        if (node.disconnect) node.disconnect();
                    });
                } catch (e) {
                    // Layer might already be stopped
                }
                this.musicLayers[key] = null;
            }
        });
    }

    // Create ambient pad layer (always playing)
    createAmbientLayer() {
        if (!this.audioContext || !this.musicEnabled) return;

        const now = this.audioContext.currentTime;
        this.musicLayers.ambient = [];

        // Ambient pad using filtered noise and low oscillators
        const createPad = (freq, delay = 0) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.value = 1.0;

            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.08, now + delay + 2);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(now + delay);

            return { osc, gain, filter };
        };

        // Create ambient drone (A minor tonality)
        const pad1 = createPad(110, 0);    // A2
        const pad2 = createPad(164.81, 0.5); // E3
        const pad3 = createPad(220, 1);    // A3

        this.musicLayers.ambient.push(pad1, pad2, pad3);

        // Schedule next ambient layer refresh (every 30 seconds for variety)
        const timeoutId = setTimeout(() => {
            // Remove from tracking array
            const idx = this._musicTimeouts.indexOf(timeoutId);
            if (idx !== -1) this._musicTimeouts.splice(idx, 1);

            if (this.musicEnabled) {
                this.refreshAmbientLayer();
            }
        }, 30000);
        this._musicTimeouts.push(timeoutId);
    }

    // Refresh ambient layer for variety
    refreshAmbientLayer() {
        if (!this.audioContext || !this.musicEnabled) return;

        const now = this.audioContext.currentTime;

        // Fade out old layer
        if (this.musicLayers.ambient) {
            this.musicLayers.ambient.forEach(({ osc, gain }) => {
                if (gain && gain.gain) {
                    gain.gain.linearRampToValueAtTime(0, now + 3);
                }
                if (osc && osc.stop) {
                    try {
                        osc.stop(now + 3.5);
                    } catch (e) { }
                }
            });
        }

        // Create new layer
        const timeoutId = setTimeout(() => {
            // Remove from tracking array
            const idx = this._musicTimeouts.indexOf(timeoutId);
            if (idx !== -1) this._musicTimeouts.splice(idx, 1);

            this.createAmbientLayer();
        }, 3000);
        this._musicTimeouts.push(timeoutId);
    }

    // Create bass layer (rhythmic foundation)
    createBassLayer() {
        if (!this.audioContext || !this.musicEnabled) return;

        const now = this.audioContext.currentTime;
        const beatInterval = 1.2; // Slower, ambient tempo

        // Bass note sequence (A minor: A, C, E, D)
        const bassNotes = [110, 130.81, 164.81, 146.83];
        let currentBeat = 0;

        const playBassNote = () => {
            if (!this.musicEnabled) return;

            const noteNow = this.audioContext.currentTime;
            const freq = bassNotes[currentBeat % bassNotes.length];

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteNow);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, noteNow);

            gain.gain.setValueAtTime(0.12, noteNow);
            gain.gain.exponentialRampToValueAtTime(0.001, noteNow + beatInterval * 0.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(noteNow);
            osc.stop(noteNow + beatInterval);

            currentBeat++;

            // Schedule next beat (track timeout for cleanup)
            const nextTimeoutId = setTimeout(playBassNote, beatInterval * 1000);
            if (this._musicTimeouts) {
                this._musicTimeouts.push(nextTimeoutId);
            }
        };

        // Start bass pattern
        playBassNote();
    }

    // Update music layers based on intensity (0-1 scale)
    updateMusicLayers() {
        if (!this.audioContext || !this.musicEnabled) return;

        const now = this.audioContext.currentTime;

        // Adjust reverb based on intensity
        if (this.reverbGain) {
            const reverbAmount = 0.1 + (this.currentIntensity * 0.15);
            this.reverbGain.gain.linearRampToValueAtTime(reverbAmount, now + 0.5);
            this.dryGain.gain.linearRampToValueAtTime(1 - reverbAmount, now + 0.5);
        }

        // Add melody layer at medium intensity
        if (this.currentIntensity > 0.4 && !this.musicLayers.melody) {
            this.createMelodyLayer();
        } else if (this.currentIntensity <= 0.4 && this.musicLayers.melody) {
            this.fadeMelodyLayer();
        }

        // Add intensity layer at high intensity
        if (this.currentIntensity > 0.7 && !this.musicLayers.intensity) {
            this.createIntensityLayer();
        } else if (this.currentIntensity <= 0.7 && this.musicLayers.intensity) {
            this.fadeIntensityLayer();
        }
    }

    // Set music intensity (called from game based on enemy count, boss mode, health, etc.)
    setMusicIntensity(intensity) {
        this.currentIntensity = Math.max(0, Math.min(1, intensity));
        this.updateMusicLayers();
    }

    // Create melody layer for medium intensity
    createMelodyLayer() {
        if (!this.audioContext || !this.musicEnabled) return;

        this.musicLayers.melody = [];

        // Simple melodic sequence
        const melodyNotes = [440, 493.88, 523.25, 587.33, 523.25, 493.88]; // A, B, C, D, C, B
        const noteDuration = 2.0;
        let currentNote = 0;

        const playMelodyNote = () => {
            if (!this.musicEnabled || this.currentIntensity <= 0.4) return;

            const noteNow = this.audioContext.currentTime;
            const freq = melodyNotes[currentNote % melodyNotes.length];

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteNow);

            gain.gain.setValueAtTime(0.001, noteNow);
            gain.gain.exponentialRampToValueAtTime(0.06, noteNow + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, noteNow + noteDuration * 0.9);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(noteNow);
            osc.stop(noteNow + noteDuration);

            currentNote++;

            // Track timeout for cleanup to prevent memory leak
            const timeoutId = setTimeout(playMelodyNote, noteDuration * 1000);
            if (this._musicTimeouts) {
                this._musicTimeouts.push(timeoutId);
            }
        };

        playMelodyNote();
    }

    // Fade out melody layer
    fadeMelodyLayer() {
        this.musicLayers.melody = null;
    }

    // Create intensity layer for high action
    createIntensityLayer() {
        if (!this.audioContext || !this.musicEnabled) return;

        this.musicLayers.intensity = [];

        // Fast rhythmic pulse
        const pulseDuration = 0.6;

        const playPulse = () => {
            if (!this.musicEnabled || this.currentIntensity <= 0.7) return;

            const pulseNow = this.audioContext.currentTime;

            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, pulseNow);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, pulseNow);
            filter.frequency.exponentialRampToValueAtTime(200, pulseNow + pulseDuration);

            gain.gain.setValueAtTime(0.1, pulseNow);
            gain.gain.exponentialRampToValueAtTime(0.001, pulseNow + pulseDuration * 0.7);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(pulseNow);
            osc.stop(pulseNow + pulseDuration);

            // Track timeout for cleanup to prevent memory leak
            const timeoutId = setTimeout(playPulse, pulseDuration * 1000);
            if (this._musicTimeouts) {
                this._musicTimeouts.push(timeoutId);
            }
        };

        playPulse();
    }

    // Fade out intensity layer
    fadeIntensityLayer() {
        this.musicLayers.intensity = null;
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
