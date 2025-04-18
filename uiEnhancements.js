class UIEnhancements {
    constructor() {
        this.tooltips = new Map();
        this.damageNumbersEnabled = true;
        this.screenShakeIntensity = 1.0;
        this.colorblindMode = false;
        this.colorblindType = 'protanopia'; // Default to red-green colorblindness
        
        // Initialize UI elements
        this.initializeTooltips();
        this.initializeSettingsPanel();
        this.initializeDamageNumbers();
        this.initializeColorblindMode();
    }
    
    initializeTooltips() {
        // Add tooltips for upgrades
        const upgradeElements = document.querySelectorAll('.upgrade-option');
        upgradeElements.forEach(element => {
            const upgradeId = element.dataset.upgradeId;
            if (upgradeId) {
                const tooltip = this.createTooltip(element, upgradeId);
                this.tooltips.set(element, tooltip);
            }
        });
    }
    
    createTooltip(element, upgradeId) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        
        // Get upgrade data
        const upgrade = upgradeSystem.getUpgradeById(upgradeId);
        if (upgrade) {
            tooltip.innerHTML = `
                <div class="tooltip-header">
                    <span class="tooltip-icon">${upgrade.icon}</span>
                    <span class="tooltip-title">${upgrade.name}</span>
                </div>
                <div class="tooltip-description">${upgrade.description}</div>
                <div class="tooltip-rarity">Rarity: ${upgrade.rarity}</div>
            `;
        }
        
        // Position tooltip
        element.addEventListener('mouseenter', () => {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 5}px`;
            document.body.appendChild(tooltip);
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.remove();
        });
        
        return tooltip;
    }
    
    initializeSettingsPanel() {
        // Add new settings to the settings panel
        const settingsPanel = document.getElementById('settings-panel');
        if (settingsPanel) {
            const settingsContent = settingsPanel.querySelector('.settings-content');
            
            // Add damage numbers toggle
            const damageNumbersSetting = document.createElement('div');
            damageNumbersSetting.className = 'setting-item';
            damageNumbersSetting.innerHTML = `
                <label for="damage-numbers-checkbox">Damage Numbers</label>
                <input type="checkbox" id="damage-numbers-checkbox" checked>
            `;
            settingsContent.appendChild(damageNumbersSetting);
            
            // Add screen shake intensity slider
            const screenShakeSetting = document.createElement('div');
            screenShakeSetting.className = 'setting-item';
            screenShakeSetting.innerHTML = `
                <label for="screen-shake-range">Screen Shake Intensity</label>
                <input type="range" id="screen-shake-range" min="0" max="2" step="0.1" value="1">
            `;
            settingsContent.appendChild(screenShakeSetting);
            
            // Add colorblind mode selector
            const colorblindSetting = document.createElement('div');
            colorblindSetting.className = 'setting-item';
            colorblindSetting.innerHTML = `
                <label for="colorblind-select">Colorblind Mode</label>
                <select id="colorblind-select">
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Green)</option>
                    <option value="deuteranopia">Deuteranopia (Red-Green)</option>
                    <option value="tritanopia">Tritanopia (Blue-Yellow)</option>
                </select>
            `;
            settingsContent.appendChild(colorblindSetting);
            
            // Add event listeners
            document.getElementById('damage-numbers-checkbox').addEventListener('change', (e) => {
                this.damageNumbersEnabled = e.target.checked;
                localStorage.setItem('damageNumbers', this.damageNumbersEnabled);
            });
            
            document.getElementById('screen-shake-range').addEventListener('input', (e) => {
                this.screenShakeIntensity = parseFloat(e.target.value);
                localStorage.setItem('screenShakeIntensity', this.screenShakeIntensity);
            });
            
            document.getElementById('colorblind-select').addEventListener('change', (e) => {
                this.colorblindMode = e.target.value !== 'none';
                this.colorblindType = e.target.value;
                this.applyColorblindMode();
                localStorage.setItem('colorblindMode', this.colorblindMode);
                localStorage.setItem('colorblindType', this.colorblindType);
            });
            
            // Load saved settings
            this.loadSettings();
        }
    }
    
    loadSettings() {
        // Load damage numbers setting
        const damageNumbers = localStorage.getItem('damageNumbers');
        if (damageNumbers !== null) {
            this.damageNumbersEnabled = damageNumbers === 'true';
            document.getElementById('damage-numbers-checkbox').checked = this.damageNumbersEnabled;
        }
        
        // Load screen shake intensity
        const screenShake = localStorage.getItem('screenShakeIntensity');
        if (screenShake !== null) {
            this.screenShakeIntensity = parseFloat(screenShake);
            document.getElementById('screen-shake-range').value = this.screenShakeIntensity;
        }
        
        // Load colorblind mode
        const colorblindMode = localStorage.getItem('colorblindMode');
        const colorblindType = localStorage.getItem('colorblindType');
        if (colorblindMode !== null && colorblindType !== null) {
            this.colorblindMode = colorblindMode === 'true';
            this.colorblindType = colorblindType;
            document.getElementById('colorblind-select').value = this.colorblindType;
            this.applyColorblindMode();
        }
    }
    
    initializeDamageNumbers() {
        // Create container for damage numbers
        const container = document.createElement('div');
        container.id = 'damage-numbers-container';
        document.body.appendChild(container);
    }
    
    showDamageNumber(amount, x, y, isCrit = false) {
        if (!this.damageNumbersEnabled) return;
        
        const number = document.createElement('div');
        number.className = 'damage-number';
        if (isCrit) number.classList.add('crit');
        
        number.textContent = Math.round(amount);
        number.style.left = `${x}px`;
        number.style.top = `${y}px`;
        
        document.getElementById('damage-numbers-container').appendChild(number);
        
        // Animate and remove
        setTimeout(() => {
            number.style.opacity = '0';
            number.style.transform = 'translateY(-30px)';
            setTimeout(() => number.remove(), 500);
        }, 50);
    }
    
    initializeColorblindMode() {
        // Add colorblind mode styles
        const style = document.createElement('style');
        style.id = 'colorblind-styles';
        document.head.appendChild(style);
    }
    
    applyColorblindMode() {
        const style = document.getElementById('colorblind-styles');
        if (!style) return;
        
        if (!this.colorblindMode) {
            style.textContent = '';
            return;
        }
        
        // Apply color filters based on colorblind type
        let filter = '';
        switch (this.colorblindType) {
            case 'protanopia':
                filter = 'url(#protanopia)';
                break;
            case 'deuteranopia':
                filter = 'url(#deuteranopia)';
                break;
            case 'tritanopia':
                filter = 'url(#tritanopia)';
                break;
        }
        
        style.textContent = `
            #game-canvas {
                filter: ${filter};
            }
        `;
    }
    
    addScreenShake(amount, duration) {
        if (!gameManager) return;
        
        const intensity = amount * this.screenShakeIntensity;
        gameManager.addScreenShake(intensity, duration);
    }
}

// Create SVG filters for colorblind modes
const createColorblindFilters = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    
    // Protanopia filter
    const protanopia = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    protanopia.id = 'protanopia';
    protanopia.innerHTML = `
        <feColorMatrix type="matrix" values="
            0.567, 0.433, 0, 0, 0
            0.558, 0.442, 0, 0, 0
            0, 0.242, 0.758, 0, 0
            0, 0, 0, 1, 0
        "/>
    `;
    
    // Deuteranopia filter
    const deuteranopia = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    deuteranopia.id = 'deuteranopia';
    deuteranopia.innerHTML = `
        <feColorMatrix type="matrix" values="
            0.625, 0.375, 0, 0, 0
            0.7, 0.3, 0, 0, 0
            0, 0.3, 0.7, 0, 0
            0, 0, 0, 1, 0
        "/>
    `;
    
    // Tritanopia filter
    const tritanopia = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    tritanopia.id = 'tritanopia';
    tritanopia.innerHTML = `
        <feColorMatrix type="matrix" values="
            0.95, 0.05, 0, 0, 0
            0, 0.433, 0.567, 0, 0
            0, 0.475, 0.525, 0, 0
            0, 0, 0, 1, 0
        "/>
    `;
    
    svg.appendChild(protanopia);
    svg.appendChild(deuteranopia);
    svg.appendChild(tritanopia);
    document.body.appendChild(svg);
};

// Initialize colorblind filters
createColorblindFilters();

// Add styles for new UI elements
const style = document.createElement('style');
style.textContent = `
    .tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 1000;
        pointer-events: none;
        max-width: 300px;
    }
    
    .tooltip-header {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
    }
    
    .tooltip-icon {
        margin-right: 5px;
        font-size: 1.2em;
    }
    
    .tooltip-title {
        font-weight: bold;
    }
    
    .tooltip-rarity {
        margin-top: 5px;
        font-style: italic;
        color: #aaa;
    }
    
    .damage-number {
        position: absolute;
        color: white;
        font-weight: bold;
        text-shadow: 1px 1px 2px black;
        transition: all 0.5s ease-out;
        pointer-events: none;
        z-index: 100;
    }
    
    .damage-number.crit {
        color: #ff4444;
        font-size: 1.2em;
        animation: crit-pulse 0.5s ease-out;
    }
    
    @keyframes crit-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.5); }
        100% { transform: scale(1); }
    }
    
    .setting-item {
        margin: 10px 0;
    }
    
    .setting-item label {
        display: block;
        margin-bottom: 5px;
    }
    
    .setting-item input[type="range"] {
        width: 100%;
    }
`;
document.head.appendChild(style); 