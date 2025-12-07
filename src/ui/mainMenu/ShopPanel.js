/**
 * ShopPanel - Manages the Star Vendor shop UI
 * 
 * Handles:
 * - Tier-based tab navigation (Foundation, Specialization, Fortune)
 * - Exponential pricing formula (baseCost × 1.8^level)
 * - Purchase logic with proper cost calculation
 * - Geometric wireframe-themed item display
 */
(function () {
    const PanelBase = window.Game?.PanelBase;

    if (!PanelBase) {
        console.error('ShopPanel requires PanelBase to be loaded first');
        return;
    }

    class ShopPanel extends PanelBase {
        constructor(options = {}) {
            super(options);
            this.metaUpgrades = Array.isArray(options.metaUpgrades) ? options.metaUpgrades : [];
            this.currentTier = 'foundation';
            this.tierTabListeners = [];
        }

        /**
         * Calculate upgrade cost using exponential formula
         * Cost = baseCost × 1.8^currentLevel
         */
        calculateCost(upgrade, currentLevel) {
            // Support both old 'cost' and new 'baseCost' format
            const baseCost = upgrade.baseCost ?? upgrade.cost ?? 10;
            const calculateFn = window.calculateUpgradeCost;
            if (typeof calculateFn === 'function') {
                return calculateFn(baseCost, currentLevel);
            }
            // Fallback calculation
            return Math.ceil(baseCost * Math.pow(1.8, currentLevel));
        }

        /**
         * Initialize tier tab event listeners
         */
        initTierTabs() {
            // Clean up old listeners
            this.tierTabListeners.forEach(({ element, handler }) => {
                element.removeEventListener('click', handler);
            });
            this.tierTabListeners = [];

            const tabs = document.querySelectorAll('.tier-tab');
            tabs.forEach(tab => {
                const handler = () => {
                    const tier = tab.dataset.tier;
                    if (tier && tier !== this.currentTier) {
                        this.switchTier(tier);
                    }
                };
                tab.addEventListener('click', handler);
                this.tierTabListeners.push({ element: tab, handler });
            });
        }

        /**
         * Switch to a different tier tab
         */
        switchTier(tier) {
            this.currentTier = tier;

            // Update tab active states
            const tabs = document.querySelectorAll('.tier-tab');
            tabs.forEach(tab => {
                if (tab.dataset.tier === tier) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            // Fade transition
            const container = this.dom.shopItems;
            if (container) {
                container.classList.add('page-transitioning');
                setTimeout(() => {
                    this.render();
                    container.classList.remove('page-transitioning');
                }, 150);
            } else {
                this.render();
            }
        }

        /**
         * Get tier color for styling
         */
        getTierColor(tier) {
            const tiers = window.META_UPGRADE_TIERS || {};
            return tiers[tier]?.color || '#00ffff';
        }

        /**
         * Render the shop with current tier items
         */
        render() {
            const container = this.dom.shopItems;
            if (!container) {
                return;
            }

            this.clearDynamicListeners();
            this.initTierTabs();

            // Filter upgrades by current tier
            const tierUpgrades = this.metaUpgrades.filter(u =>
                (u.tier || 'foundation') === this.currentTier
            );

            // Create fragment for efficient DOM updates
            const fragment = document.createDocumentFragment();
            const tierColor = this.getTierColor(this.currentTier);

            tierUpgrades.forEach((upgrade) => {
                const currentLevel = this.getMetaUpgradeLevel(upgrade.id);
                const isMaxed = currentLevel >= upgrade.maxLevel;
                const cost = this.calculateCost(upgrade, currentLevel);
                const currentStars = window.gameManager?.metaStars ?? 0;
                const canAfford = currentStars >= cost;

                const item = document.createElement('div');
                item.className = 'shop-item';
                item.style.borderColor = `${tierColor}40`; // 25% opacity border

                item.innerHTML = `
                    <div class="shop-item-header">
                        <span class="shop-item-icon" style="color: ${tierColor}">${upgrade.icon}</span>
                        <span class="shop-item-name" style="color: ${tierColor}">${upgrade.name}</span>
                        <span class="shop-item-level">${currentLevel}/${upgrade.maxLevel}</span>
                    </div>
                    <div class="shop-item-description">${upgrade.description}</div>
                `;

                const footer = document.createElement('div');
                footer.className = 'shop-item-footer';

                if (isMaxed) {
                    const maxed = document.createElement('span');
                    maxed.className = 'shop-item-maxed';
                    maxed.textContent = 'MAXED';
                    maxed.style.color = tierColor;
                    maxed.style.textShadow = `0 0 10px ${tierColor}80`;
                    footer.appendChild(maxed);
                } else {
                    const button = document.createElement('button');
                    button.className = `shop-buy-btn${canAfford ? '' : ' disabled'}`;
                    button.disabled = !canAfford;
                    button.textContent = canAfford ? `Buy for ${cost} \u2B50` : `Need ${cost} \u2B50`;

                    if (canAfford) {
                        this.addDynamicListener(button, 'click', () => this.purchaseUpgrade(upgrade.id));
                    }

                    footer.appendChild(button);
                }

                item.appendChild(footer);
                fragment.appendChild(item);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }

        /**
         * Handle purchase of a meta upgrade
         */
        purchaseUpgrade(upgradeId) {
            const upgrade = this.metaUpgrades.find((entry) => entry.id === upgradeId);
            if (!upgrade || !window.gameManager) {
                return;
            }

            const currentLevel = this.getMetaUpgradeLevel(upgradeId);
            if (currentLevel >= upgrade.maxLevel) {
                return;
            }

            const cost = this.calculateCost(upgrade, currentLevel);
            if ((window.gameManager.metaStars ?? 0) < cost) {
                return;
            }

            window.gameManager.metaStars -= cost;
            this.setMetaUpgradeLevel(upgradeId, currentLevel + 1);

            this.refreshStarDisplay();
            window.gameManager.saveStarTokens?.();

            // Audio feedback
            window.audioSystem?.play?.('levelUp', 0.4);

            // Re-render to update display
            this.render();

            this.logger?.log?.(`Purchased ${upgrade.name} level ${currentLevel + 1} for ${cost} stars`);

            if (currentLevel + 1 >= upgrade.maxLevel) {
                window.gameManager.onUpgradeMaxed?.(upgradeId);
            }
        }

        /**
         * Get the current level of a meta upgrade
         */
        getMetaUpgradeLevel(id) {
            return window.StorageManager.getInt(`meta_${id}`, 0);
        }

        /**
         * Set the level of a meta upgrade
         */
        setMetaUpgradeLevel(id, level) {
            window.StorageManager.setItem(`meta_${id}`, level.toString());
        }

        /**
         * Refresh star token display
         */
        refreshStarDisplay() {
            if (window.gameManager?.updateStarDisplay) {
                window.gameManager.updateStarDisplay();
                return;
            }

            const stars = this.safeStarBalance();
            if (this.dom.starMenuDisplay) {
                this.dom.starMenuDisplay.textContent = `\u2B50 ${stars}`;
            }
            if (this.dom.vendorStarDisplay) {
                this.dom.vendorStarDisplay.textContent = `\u2B50 ${stars}`;
            }
        }

        /**
         * Safely get current star token balance
         */
        safeStarBalance() {
            if (typeof window.gameManager?.getStarTokenBalance === 'function') {
                return window.gameManager.getStarTokenBalance();
            }
            if (typeof window.gameManager?.metaStars === 'number') {
                return window.gameManager.metaStars;
            }
            if (typeof window.gameManagerBridge?.metaStars === 'number') {
                return window.gameManagerBridge.metaStars;
            }
            return window.StorageManager.getInt('starTokens', 0);
        }

        /**
         * Clean up event listeners
         */
        destroy() {
            this.tierTabListeners.forEach(({ element, handler }) => {
                element.removeEventListener('click', handler);
            });
            this.tierTabListeners = [];
            this.clearDynamicListeners();
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.ShopPanel = ShopPanel;
    }
})();
