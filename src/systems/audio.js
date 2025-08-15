class AudioSystem {
    constructor() {
        // Check for Web Audio API support
        this.isWebAudioSupported = typeof window.AudioContext !== 'undefined' || 
                                  typeof window.webkitAudioContext !== 'undefined';
        
        // Initialize audio context with error handling
        try {
            this.audioContext = null;
            this.masterGain = null;
            this.isMuted = false;
            
            // Initialize audio context on first user interaction
            this.initialized = false;
            
            // Add fallback for browsers without Web Audio API
            if (!this.isWebAudioSupported) {
                // Use logger instead of console.warn
                (window.logger?.warn || (() => {}))('Web Audio API not supported, using fallback audio system');
                this.initializeFallbackAudio();
            }
        } catch (error) {
            console.error('Error initializing audio system:', error);
            this.isWebAudioSupported = false;
        }
    }
    
    // Provide simple HTMLAudioElement-based fallback so callers don't crash
    initializeFallbackAudio() {
        // Minimal shim to avoid errors; actual SFX are WebAudio-only in this project
        this.play = (/* soundName, volume */) => {};
        this.toggleMute = () => {
            this.isMuted = !this.isMuted;
            return this.isMuted;
        };
        this.initializeAudioContext = () => {};
        this.resumeAudioContext = () => {};
        this.masterGain = null;
        this.masterGainNode = null;
    }
    
    // Initialize audio context with error handling
    initializeAudioContext() {
        if (this.initialized || !this.isWebAudioSupported) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            // Compatibility alias for UI code expecting masterGainNode
            this.masterGainNode = this.masterGain;
            
            // Set initial volume
            this.masterGain.gain.value = 0.5;
            
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing audio context:', error);
            this.isWebAudioSupported = false;
        }
    }
    
    // Resume audio context with error handling
    resumeAudioContext() {
        if (!this.audioContext) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (error) {
            console.error('Error resuming audio context:', error);
        }
    }
    
    // Play sound with error handling
    play(soundName, volume = 0.5) {
        if (this.isMuted) return;
        
        // Try Web Audio API first
        if (this.isWebAudioSupported) {
            try {
                this.playWithWebAudio(soundName, volume);
            } catch (error) {
                console.error("Error playing sound with Web Audio API:", error);
                this.isWebAudioSupported = false;
            }
        }
    }
    
    // Play sound using Web Audio API with error handling
    playWithWebAudio(soundName, volume) {
        if (!this.audioContext) {
            this.initializeAudioContext();
        }
        
        // Resume context if suspended
        this.resumeAudioContext();
        
        // Adjust volume (don't exceed 1.0)
        const adjustedVolume = Math.min(volume, 1.0);
        
        try {
            // Create different sounds based on sound name
            switch (soundName) {
                case 'shoot':
                    this.playShootSound(adjustedVolume);
                    break;
                case 'hit':
                    this.playHitSound(adjustedVolume);
                    break;
                case 'levelUp':
                    this.playLevelUpSound(adjustedVolume);
                    break;
                case 'dodge':
                    this.playDodgeSound(adjustedVolume);
                    break;
                case 'enemyDeath':
                case 'enemyKilled':
                    this.playEnemyDeathSound(adjustedVolume);
                    break;
                case 'pickup':
                    this.playPickupSound(adjustedVolume);
                    break;
                case 'boss':
                case 'bossKilled':
                    this.playBossSound(adjustedVolume);
                    break;
                case 'playerHit':
                    this.playPlayerHitSound(adjustedVolume);
                    break;
                case 'aoeAttack':
                    this.playAOEAttackSound(adjustedVolume);
                    break;
                default:
                    // Use logger instead of console.warn
                    (window.logger?.warn || (() => {}))(`Unknown sound name: ${soundName}`);
            }
        } catch (error) {
            console.error(`Error playing sound ${soundName}:`, error);
        }
    }
    
    // Initialize audio context on user interaction with error handling
    handleUserInteraction() {
        try {
            if (!this.audioContext) {
                this.initializeAudioContext();
            } else if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (error) {
            console.error('Error handling user interaction:', error);
        }
    }
    
    // Toggle mute with error handling
    toggleMute() {
        try {
            this.isMuted = !this.isMuted;
            if (this.masterGain) {
                this.masterGain.gain.value = this.isMuted ? 0 : 0.5;
            }
            // Keep alias in sync
            if (this.masterGainNode) {
                this.masterGainNode.gain.value = this.isMuted ? 0 : 0.5;
            }
            return this.isMuted;
        } catch (error) {
            console.error('Error toggling mute:', error);
            return this.isMuted;
        }
    }
    
    // Shoot sound - quick high-pitched blip
    playShootSound(volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }
    
    // Hit sound - impact noise
    playHitSound(volume) {
        const oscillator = this.audioContext.createOscillator();
        const noiseBuffer = this.createNoiseBuffer(0.1);
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Configure noise
        noise.buffer = noiseBuffer;
        
        // Configure filter
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        // Configure gain
        gainNode.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        
        // Connect nodes
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Play sound
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.1);
    }
    
    // Level up sound - ascending tone sequence
    playLevelUpSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create chord
        for (let i = 0; i < 3; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = i % 2 ? 'sine' : 'triangle';
            
            // Ascending notes
            const baseFreq = 220 * (i + 1);
            oscillator.frequency.setValueAtTime(baseFreq, now + i * 0.1);
            oscillator.frequency.setValueAtTime(baseFreq * 1.2, now + i * 0.1 + 0.1);
            
            gainNode.gain.setValueAtTime(0.001, now + i * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, now + i * 0.1 + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start(now + i * 0.1);
            oscillator.stop(now + i * 0.1 + 0.4);
        }
    }
    
    // Dodge sound - whoosh effect
    playDodgeSound(volume) {
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.createNoiseBuffer(0.3);
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Configure noise
        noise.buffer = noiseBuffer;
        
        // Configure filter for whoosh effect
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(100, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.2);
        filter.Q.value = 1.0;
        
        // Configure gain
        gainNode.gain.setValueAtTime(volume * 0.05, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        // Connect nodes
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Play sound
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.3);
    }
    
    // Enemy death sound - explosion-like effect
    playEnemyDeathSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create noise for explosion
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.3);
        
        // Create oscillator for low tone
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        
        // Configure gain nodes
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(volume * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        // Configure filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        // Connect nodes
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        oscillator.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        // Play sound
        noise.start();
        oscillator.start();
        noise.stop(now + 0.3);
        oscillator.stop(now + 0.4);
    }
    
    // Pickup sound - coin-like sound
    playPickupSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create oscillators
        const oscillator1 = this.audioContext.createOscillator();
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(880, now);
        
        const oscillator2 = this.audioContext.createOscillator();
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(1320, now + 0.03);
        
        // Configure gain nodes
        const gain1 = this.audioContext.createGain();
        gain1.gain.setValueAtTime(volume * 0.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.setValueAtTime(volume * 0.2, now + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        // Connect nodes
        oscillator1.connect(gain1);
        gain1.connect(this.masterGain);
        
        oscillator2.connect(gain2);
        gain2.connect(this.masterGain);
        
        // Play sound
        oscillator1.start(now);
        oscillator2.start(now + 0.03);
        oscillator1.stop(now + 0.15);
        oscillator2.stop(now + 0.2);
    }
    
    // Boss sound - powerful and menacing
    playBossSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create deep oscillator for rumble
        const oscillator1 = this.audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(80, now);
        oscillator1.frequency.setValueAtTime(60, now + 0.2);
        oscillator1.frequency.setValueAtTime(40, now + 0.4);
        
        // Create higher oscillator for alarm-like effect
        const oscillator2 = this.audioContext.createOscillator();
        oscillator2.type = 'square';
        oscillator2.frequency.setValueAtTime(440, now);
        oscillator2.frequency.setValueAtTime(466, now + 0.2);
        oscillator2.frequency.setValueAtTime(415, now + 0.4);
        
        // Create noise for texture
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.6);
        
        // Configure gain nodes
        const gain1 = this.audioContext.createGain();
        gain1.gain.setValueAtTime(volume * 0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.exponentialRampToValueAtTime(volume * 0.15, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        gain2.gain.exponentialRampToValueAtTime(volume * 0.15, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.1, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.6);
        
        // Configure filter for noise
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 200;
        filter.Q.value = 1.0;
        
        // Connect nodes
        oscillator1.connect(gain1);
        gain1.connect(this.masterGain);
        
        oscillator2.connect(gain2);
        gain2.connect(this.masterGain);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        // Play sound
        oscillator1.start(now);
        oscillator2.start(now);
        noise.start(now);
        oscillator1.stop(now + 0.6);
        oscillator2.stop(now + 0.6);
        noise.stop(now + 0.6);
    }
    
    // Player hit sound - impact with player feedback
    playPlayerHitSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create oscillator for the impact sound
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        
        // Create noise for impact texture
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.2);
        
        // Configure gain nodes
        const gainOsc = this.audioContext.createGain();
        gainOsc.gain.setValueAtTime(volume * 0.3, now);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        const gainNoise = this.audioContext.createGain();
        gainNoise.gain.setValueAtTime(volume * 0.3, now);
        gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        // Configure filter for noise
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        
        // Connect nodes
        oscillator.connect(gainOsc);
        gainOsc.connect(this.masterGain);
        
        noise.connect(filter);
        filter.connect(gainNoise);
        gainNoise.connect(this.masterGain);
        
        // Play sound
        oscillator.start(now);
        noise.start(now);
        oscillator.stop(now + 0.2);
        noise.stop(now + 0.2);
    }
    
    // AOE attack sound - powerful wave/pulse effect
    playAOEAttackSound(volume) {
        const now = this.audioContext.currentTime;
        
        // Create oscillator for the wave sound
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.exponentialRampToValueAtTime(110, now + 0.3);
        
        // Create noise for the pulse texture
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.4);
        
        // Configure gain nodes
        const gainOsc = this.audioContext.createGain();
        gainOsc.gain.setValueAtTime(volume * 0.3, now);
        gainOsc.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        const gainNoise = this.audioContext.createGain();
        gainNoise.gain.setValueAtTime(volume * 0.2, now);
        gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // Configure filter for noise
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300;
        filter.Q.value = 0.7;
        
        // Connect nodes
        oscillator.connect(gainOsc);
        gainOsc.connect(this.masterGain);
        
        noise.connect(filter);
        filter.connect(gainNoise);
        gainNoise.connect(this.masterGain);
        
        // Play sound
        oscillator.start(now);
        noise.start(now);
        oscillator.stop(now + 0.4);
        noise.stop(now + 0.4);
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

// Create global audio system instance with error handling (guard against duplicates)
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
        document.addEventListener('click', () => {
            audioSystem.handleUserInteraction();
        });
    }
} catch (error) {
    console.error('Error creating audio system:', error);
    // Create a dummy audio system that does nothing
    audioSystem = {
        play: () => {},
        toggleMute: () => false,
        handleUserInteraction: () => {}
    };
    if (typeof window !== 'undefined') {
        window.audioSystem = audioSystem;
    }
}

// Boss theme: play bass beat in sync with player shots
AudioSystem.prototype.playBossTheme = function(volume = 0.4) {
    this.isBossThemePlaying = true;
    this._bossBeat = { notes: [82.41, 98.00, 61.74, 65.41], idx: 0, volume };
};

AudioSystem.prototype.stopBossTheme = function() {
    this.isBossThemePlaying = false;
    delete this._bossBeat;
};

// Play a single boss beat note (invoke on each player shot)
AudioSystem.prototype.playBossBeat = function() {
    if (!this.isBossThemePlaying || !this._bossBeat || !this.audioContext) return;
    const now = this.audioContext.currentTime;
    const beat = this._bossBeat;
    const freq = beat.notes[beat.idx];
    beat.idx = (beat.idx + 1) % beat.notes.length;
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    gainNode.gain.setValueAtTime(beat.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
};

// Make globally available
if (typeof window !== 'undefined') {
    window.AudioSystem = AudioSystem;
}
