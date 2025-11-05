/**
 * Input Manager - Handles all input events and key bindings
 * Extracted from GameManager for better organization
 */
class InputManager {
    constructor() {
        this.keyStates = {};
        this.mouseState = { x: 0, y: 0, buttons: 0 };
        this.gamepadState = null;
        this._listeners = [];
        
        // Input callbacks
        this.callbacks = {
            keyDown: [],
            keyUp: [],
            mouseMove: [],
            mouseDown: [],
            mouseUp: [],
            gamepadInput: []
        };
        
        // Key bindings configuration
        this.keyBindings = {
            // Movement
            moveUp: ['w', 'W', 'ArrowUp'],
            moveDown: ['s', 'S', 'ArrowDown'],
            moveLeft: ['a', 'A', 'ArrowLeft'],
            moveRight: ['d', 'D', 'ArrowRight'],

            // Actions
            dodge: [' ', 'Space'],
            pause: ['p', 'P', 'Escape'],
            mute: ['m', 'M'],
            lowQuality: ['l', 'L'],
            autoLevel: ['g', 'G'],

            // Upgrade selection
            upgrade1: ['1'],
            upgrade2: ['2'],
            upgrade3: ['3'],

            // Debug
            debug: ['F3'],
            performance: ['o', 'O']
        };
        
        this.initialize();
    }
    
    /**
     * Initialize input event listeners
     */
    initialize() {
        // Keyboard events
        this._attachListener(document, 'keydown', this.handleKeyDown.bind(this));
        this._attachListener(document, 'keyup', this.handleKeyUp.bind(this));

        // Mouse events
        this._attachListener(document, 'mousemove', this.handleMouseMove.bind(this));
        this._attachListener(document, 'mousedown', this.handleMouseDown.bind(this));
        this._attachListener(document, 'mouseup', this.handleMouseUp.bind(this));

        // Gamepad support
        this._attachListener(window, 'gamepadconnected', this.handleGamepadConnected.bind(this));
        this._attachListener(window, 'gamepaddisconnected', this.handleGamepadDisconnected.bind(this));

        // Input manager initialized successfully
    }

    _attachListener(target, type, handler) {
        target.addEventListener(type, handler);
        this._listeners.push({ target, type, handler });
    }

    destroy() {
        for (const listener of this._listeners) {
            listener.target.removeEventListener(listener.type, listener.handler);
        }
        this._listeners = [];

        // Clear callbacks to release references
        this.callbacks = {
            keyDown: [],
            keyUp: [],
            mouseMove: [],
            mouseDown: [],
            mouseUp: [],
            gamepadInput: []
        };
    }
    
    /**
     * Handle key down events
     * @param {KeyboardEvent} e - Key event
     */
    handleKeyDown(e) {
        const key = e.key;
        this.keyStates[key] = true;

        // Check for special key handling
        this.handleSpecialKeys(e);

        // Optimized: early exit if no callbacks, use for loop instead of forEach
        const callbacks = this.callbacks.keyDown;
        const length = callbacks.length;
        if (length === 0) return;

        for (let i = 0; i < length; i++) {
            try {
                callbacks[i](e, key);
            } catch (error) {
                console.error('Input callback error:', error);
            }
        }
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} e - Key event
     */
    handleKeyUp(e) {
        const key = e.key;
        this.keyStates[key] = false;

        // Optimized: early exit if no callbacks, use for loop instead of forEach
        const callbacks = this.callbacks.keyUp;
        const length = callbacks.length;
        if (length === 0) return;

        for (let i = 0; i < length; i++) {
            try {
                callbacks[i](e, key);
            } catch (error) {
                console.error('Input callback error:', error);
            }
        }
    }
    
    /**
     * Handle special key combinations and system keys
     * @param {KeyboardEvent} e - Key event
     */
    handleSpecialKeys(e) {
        const key = e.key;
        
        // Prevent spacebar from scrolling page or triggering when menus active
        if (key === ' ') {
            e.preventDefault();
            
            // Check if any UI menus are active
            if (this.isMenuActive()) {
                return; // Don't process dodge when menus are open
            }
        }
        
        // Toggle sound with M key
        if (key === 'm' || key === 'M') {
            if (window.audioSystem) {
                const isMuted = window.audioSystem.toggleMute();
                // Update UI checkbox if settings panel is open
                const muteCheckbox = document.getElementById('mute-checkbox');
                if (muteCheckbox) {
                    muteCheckbox.checked = isMuted;
                }
            }
        }
        
        // Toggle low quality with L key
        if (key === 'l' || key === 'L') {
            if (window.gameManager) {
                window.gameManager.lowQuality = !window.gameManager.lowQuality;
                try {
                    localStorage.setItem('lowQuality', window.gameManager.lowQuality);
                } catch (error) {
                    console.warn('Failed to save low quality setting:', error);
                }
                // Low quality mode toggled
            }
        }

        // Toggle auto-level with G key
        if (key === 'g' || key === 'G') {
            if (window.upgradeSystem) {
                // Use setter method for clean encapsulation
                const newState = !window.upgradeSystem.isAutoLevelEnabled();
                window.upgradeSystem.setAutoLevel(newState);

                // Show notification
                const message = newState ? 'Auto-Level: ON' : 'Auto-Level: OFF';
                const color = newState ? '#2ecc71' : '#e74c3c';

                if (window.gameManager?.showFloatingText && window.gameManager?.game?.player) {
                    window.gameManager.showFloatingText(
                        message,
                        window.gameManager.game.player.x,
                        window.gameManager.game.player.y - 30,
                        color,
                        20
                    );
                }
            }
        }

        // Debug mode toggle
        if (key === 'F3') {
            e.preventDefault();
            if (window.debugManager) {
                window.debugManager.toggle();
            }
        }
        
        // Performance mode toggle
        if (key === 'o' || key === 'O') {
            if (window.gameManager?.game && typeof window.gameManager.game.togglePerformanceMode === 'function') {
                window.gameManager.game.togglePerformanceMode();
            }
        }
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        this.mouseState.x = e.clientX;
        this.mouseState.y = e.clientY;

        // Optimized: early exit if no callbacks, use for loop instead of forEach
        const callbacks = this.callbacks.mouseMove;
        const length = callbacks.length;
        if (length === 0) return;

        for (let i = 0; i < length; i++) {
            try {
                callbacks[i](e);
            } catch (error) {
                console.error('Mouse move callback error:', error);
            }
        }
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        this.mouseState.buttons |= (1 << e.button);

        // Optimized: early exit if no callbacks, use for loop instead of forEach
        const callbacks = this.callbacks.mouseDown;
        const length = callbacks.length;
        if (length === 0) return;

        for (let i = 0; i < length; i++) {
            try {
                callbacks[i](e);
            } catch (error) {
                console.error('Mouse down callback error:', error);
            }
        }
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        this.mouseState.buttons &= ~(1 << e.button);

        // Optimized: early exit if no callbacks, use for loop instead of forEach
        const callbacks = this.callbacks.mouseUp;
        const length = callbacks.length;
        if (length === 0) return;

        for (let i = 0; i < length; i++) {
            try {
                callbacks[i](e);
            } catch (error) {
                console.error('Mouse up callback error:', error);
            }
        }
    }
    
    /**
     * Handle gamepad connected
     * @param {GamepadEvent} e - Gamepad event
     */
    handleGamepadConnected(e) {
        // Gamepad connected
        this.gamepadState = e.gamepad;
    }
    
    /**
     * Handle gamepad disconnected
     * @param {GamepadEvent} e - Gamepad event
     */
    handleGamepadDisconnected(e) {
        // Gamepad disconnected
        this.gamepadState = null;
    }
    
    /**
     * Update gamepad input (call each frame)
     */
    updateGamepad() {
        if (!this.gamepadState) return;

        // Get fresh gamepad state
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadState.index];

        if (gamepad) {
            this.gamepadState = gamepad;

            // Optimized: early exit if no callbacks, use for loop instead of forEach
            const callbacks = this.callbacks.gamepadInput;
            const length = callbacks.length;
            if (length === 0) return;

            for (let i = 0; i < length; i++) {
                try {
                    callbacks[i](gamepad);
                } catch (error) {
                    console.error('Gamepad callback error:', error);
                }
            }
        }
    }
    
    /**
     * Check if a key is currently pressed
     * @param {string} key - Key to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(key) {
        return !!this.keyStates[key];
    }
    
    /**
     * Check if any key in an action is pressed
     * @param {string} action - Action name from keyBindings
     * @returns {boolean} True if any key for this action is pressed
     */
    isActionPressed(action) {
        const keys = this.keyBindings[action];
        if (!keys) return false;
        
        return keys.some(key => this.isKeyPressed(key));
    }
    
    /**
     * Get movement input as vector
     * @returns {Object} Movement vector {x, y}
     */
    getMovementVector() {
        const movement = { x: 0, y: 0 };
        
        if (this.isActionPressed('moveLeft')) movement.x -= 1;
        if (this.isActionPressed('moveRight')) movement.x += 1;
        if (this.isActionPressed('moveUp')) movement.y -= 1;
        if (this.isActionPressed('moveDown')) movement.y += 1;
        
        // Normalize diagonal movement using pre-computed constant (10x faster than sqrt)
        if (movement.x !== 0 && movement.y !== 0) {
            // FastMath.SQRT2_INV is 1/sqrt(2) = 0.7071067811865476
            const FastMath = window.Game?.FastMath;
            const SQRT2_INV = FastMath?.SQRT2_INV || 0.7071067811865476;
            movement.x *= SQRT2_INV;
            movement.y *= SQRT2_INV;
        }
        
        return movement;
    }

    /**
     * Backwards-compatible alias used by some components
     * @returns {Object} Movement vector {x, y}
     */
    getMovementInput() {
        return this.getMovementVector();
    }
    
    /**
     * Check if any UI menus are currently active
     * @returns {boolean} True if menus are active
     */
    isMenuActive() {
        // Check game pause state
        if (window.gameManager && window.gameManager.game && window.gameManager.game.isPaused) {
            return true;
        }
        
        // Check upgrade menu
        if (window.upgradeSystem && window.upgradeSystem.isLevelUpActive()) {
            return true;
        }
        
        // Check other UI panels
        const panels = [
            'settings-panel',
            'shop-panel', 
            'achievements-panel'
        ];
        
        return panels.some(id => {
            const panel = document.getElementById(id);
            return panel && !panel.classList.contains('hidden');
        });
    }
    
    /**
     * Register input callback
     * @param {string} type - Callback type
     * @param {Function} callback - Callback function
     */
    onInput(type, callback) {
        if (this.callbacks[type]) {
            this.callbacks[type].push(callback);
        }
    }
    
    /**
     * Remove input callback
     * @param {string} type - Callback type
     * @param {Function} callback - Callback function to remove
     */
    offInput(type, callback) {
        if (this.callbacks[type]) {
            const index = this.callbacks[type].indexOf(callback);
            if (index > -1) {
                this.callbacks[type].splice(index, 1);
            }
        }
    }
    
    /**
     * Get current input state summary
     * @returns {Object} Input state
     */
    getState() {
        return {
            keys: { ...this.keyStates },
            mouse: { ...this.mouseState },
            gamepad: this.gamepadState ? {
                id: this.gamepadState.id,
                connected: this.gamepadState.connected
            } : null,
            movement: this.getMovementVector(),
            menuActive: this.isMenuActive()
        };
    }
    
    /**
     * Clean up event listeners - removed duplicate destroy() method
     * Using the correct implementation at lines 74-89 that properly uses _listeners array
     */
}

// Export to window.Game namespace
if (typeof window !== 'undefined') {
    if (!window.Game) window.Game = {};
    window.Game.InputManager = InputManager;
}
