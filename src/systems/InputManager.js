/**
 * Input Manager - Handles all input events and key bindings
 * Extracted from GameManager for better organization
 */
class InputManager {
    constructor() {
        this.keyStates = {};
        this.mouseState = { x: 0, y: 0, buttons: 0 };
        this.gamepadState = null;
        
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
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Mouse events
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Gamepad support
        window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
        window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
        
        // Input manager initialized successfully
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
        
        // Notify callbacks
        this.callbacks.keyDown.forEach(callback => {
            try {
                callback(e, key);
            } catch (error) {
                console.error('Input callback error:', error);
            }
        });
    }
    
    /**
     * Handle key up events
     * @param {KeyboardEvent} e - Key event
     */
    handleKeyUp(e) {
        const key = e.key;
        this.keyStates[key] = false;
        
        // Notify callbacks
        this.callbacks.keyUp.forEach(callback => {
            try {
                callback(e, key);
            } catch (error) {
                console.error('Input callback error:', error);
            }
        });
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
            const soundButton = document.getElementById('sound-button');
            if (soundButton) {
                soundButton.click();
            }
        }
        
        // Toggle low quality with L key
        if (key === 'l' || key === 'L') {
            if (window.gameManager) {
                window.gameManager.lowQuality = !window.gameManager.lowQuality;
                localStorage.setItem('lowQuality', window.gameManager.lowQuality);
                // Low quality mode toggled
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
            if (window.gameManager && window.gameManager.game) {
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
        
        this.callbacks.mouseMove.forEach(callback => {
            try {
                callback(e);
            } catch (error) {
                console.error('Mouse move callback error:', error);
            }
        });
    }
    
    /**
     * Handle mouse down events
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseDown(e) {
        this.mouseState.buttons |= (1 << e.button);
        
        this.callbacks.mouseDown.forEach(callback => {
            try {
                callback(e);
            } catch (error) {
                console.error('Mouse down callback error:', error);
            }
        });
    }
    
    /**
     * Handle mouse up events
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        this.mouseState.buttons &= ~(1 << e.button);
        
        this.callbacks.mouseUp.forEach(callback => {
            try {
                callback(e);
            } catch (error) {
                console.error('Mouse up callback error:', error);
            }
        });
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
            
            // Process gamepad input
            this.callbacks.gamepadInput.forEach(callback => {
                try {
                    callback(gamepad);
                } catch (error) {
                    console.error('Gamepad callback error:', error);
                }
            });
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
        
        // Normalize diagonal movement
        if (movement.x !== 0 && movement.y !== 0) {
            const length = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
            movement.x /= length;
            movement.y /= length;
        }
        
        return movement;
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
     * Clean up event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
        
        // Input manager cleanup completed
    }
}
