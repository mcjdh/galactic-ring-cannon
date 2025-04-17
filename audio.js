class AudioSystem {
    constructor() {
        // Initialize Web Audio API
        this.audioContext = null;
        this.masterGainNode = null;
        this.isMuted = false;
        
        // Don't initialize audio context right away
        // We'll initialize on first user interaction instead
    }
    
    initializeAudioContext() {
        // Only initialize if not already initialized
        if (this.audioContext) return;
        
        try {
            // Create audio context (with compatibility for older browsers)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node for volume control
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.gain.value = 0.5; // Set default volume to 50%
            this.masterGainNode.connect(this.audioContext.destination);
            
            console.log("Audio context initialized successfully");
        } catch (error) {
            console.error("Web Audio API is not supported in this browser", error);
        }
    }
    
    // Resume audio context on user interaction to handle autoplay policies
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    play(soundName, volume = 0.5) {
        if (this.isMuted || !this.audioContext) return;
        
        // Resume context if suspended
        this.resumeAudioContext();
        
        // Adjust volume (don't exceed 1.0)
        const adjustedVolume = Math.min(volume, 1.0);
        
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
                this.playEnemyDeathSound(adjustedVolume);
                break;
            case 'pickup':
                this.playPickupSound(adjustedVolume);
                break;
            case 'boss':
                this.playBossSound(adjustedVolume);
                break;
            case 'playerHit':
                this.playPlayerHitSound(adjustedVolume);
                break;
            case 'aoeAttack':
                this.playAOEAttackSound(adjustedVolume);
                break;
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
        gainNode.connect(this.masterGainNode);
        
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
        gainNode.connect(this.masterGainNode);
        
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
            gainNode.connect(this.masterGainNode);
            
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
        gainNode.connect(this.masterGainNode);
        
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
        noiseGain.connect(this.masterGainNode);
        
        oscillator.connect(oscGain);
        oscGain.connect(this.masterGainNode);
        
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
        gain1.connect(this.masterGainNode);
        
        oscillator2.connect(gain2);
        gain2.connect(this.masterGainNode);
        
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
        gain1.connect(this.masterGainNode);
        
        oscillator2.connect(gain2);
        gain2.connect(this.masterGainNode);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGainNode);
        
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
        gainOsc.connect(this.masterGainNode);
        
        noise.connect(filter);
        filter.connect(gainNoise);
        gainNoise.connect(this.masterGainNode);
        
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
        gainOsc.connect(this.masterGainNode);
        
        noise.connect(filter);
        filter.connect(gainNoise);
        gainNoise.connect(this.masterGainNode);
        
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
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.masterGainNode) {
            this.masterGainNode.gain.value = this.isMuted ? 0 : 0.5;
        }
        
        return this.isMuted;
    }
    
    // Initialize audio context on user interaction
    // Call this on first click/touch to address autoplay policies
    handleUserInteraction() {
        if (!this.audioContext) {
            this.initializeAudioContext();
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

// Add boss phase transition sound - more intense than regular boss sound
AudioSystem.prototype.playBossPhaseSound = function(volume) {
    const now = this.audioContext.currentTime;
    
    // Deep impact sound
    const oscillator1 = this.audioContext.createOscillator();
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(60, now);
    oscillator1.frequency.linearRampToValueAtTime(120, now + 0.2);
    oscillator1.frequency.linearRampToValueAtTime(40, now + 0.4);
    
    // Higher alarm sound
    const oscillator2 = this.audioContext.createOscillator();
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(880, now);
    oscillator2.frequency.setValueAtTime(660, now + 0.2);
    oscillator2.frequency.setValueAtTime(440, now + 0.3);
    
    // Noise component
    const noise = this.audioContext.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.8);
    
    // Configure gain nodes
    const gain1 = this.audioContext.createGain();
    gain1.gain.setValueAtTime(volume * 0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    const gain2 = this.audioContext.createGain();
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.exponentialRampToValueAtTime(volume * 0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    gain2.gain.exponentialRampToValueAtTime(volume * 0.3, now + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.15, now);
    noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
    
    // Configure filter for noise
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 300;
    filter.Q.value = 2.0;
    
    // Connect nodes
    oscillator1.connect(gain1);
    gain1.connect(this.masterGainNode);
    
    oscillator2.connect(gain2);
    gain2.connect(this.masterGainNode);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGainNode);
    
    // Play sound
    oscillator1.start(now);
    oscillator2.start(now);
    noise.start(now);
    oscillator1.stop(now + 0.8);
    oscillator2.stop(now + 0.8);
    noise.stop(now + 0.8);
};

// Create global audio system instance
const audioSystem = new AudioSystem();

// Add event listeners for user interactions to initialize audio
document.addEventListener('click', () => {
    audioSystem.handleUserInteraction();
});

document.addEventListener('keydown', () => {
    audioSystem.handleUserInteraction();
});

// Add event listener to initialize audio when the game starts
window.addEventListener('load', () => {
    // Add event listener for user interaction
    document.addEventListener('click', function initAudio() {
        audioSystem.initializeAudioContext();
        document.removeEventListener('click', initAudio);
    });
});
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
    gainNode.connect(this.masterGainNode);
    osc.start(now);
    osc.stop(now + 0.4);
};
