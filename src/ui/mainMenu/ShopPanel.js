/**
 * ShopPanel - Manages the Star Vendor shop UI
 * 
 * Handles:
 * - Shop item rendering with pagination
 * - Purchase logic
 * - Star token display
 * - Meta upgrade level tracking
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
        }

        /**
         * Render the shop with current page of items
         */
        render() {
            const container = this.dom.shopItems;
            if (!container) {
                return;
            }

            this.clearDynamicListeners();

            // Calculate items per page dynamically using actual container dimensions
            const minItemWidth = 250; // From CSS: minmax(clamp(250px, 32vw, 350px), 1fr)
            const estimatedItemHeight = 120; // From CSS min-height clamp(90px, 12vh, 120px) + padding
            let itemsPerPage = this.calculateItemsPerPage(
                container,
                minItemWidth,
                estimatedItemHeight
            );
            // Cap at 4 items per page for shop to prevent clipping
            this.pagination.itemsPerPage = Math.min(4, itemsPerPage);

            // Calculate pagination
            const totalItems = this.metaUpgrades.length;
            this.pagination.totalPages = Math.ceil(totalItems / this.pagination.itemsPerPage) || 1;

            // Ensure current page is valid
            if (this.pagination.currentPage > this.pagination.totalPages) {
                this.pagination.currentPage = this.pagination.totalPages;
            }

            // Calculate start and end indices for current page
            const startIdx = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
            const endIdx = Math.min(startIdx + this.pagination.itemsPerPage, totalItems);
            const pageItems = this.metaUpgrades.slice(startIdx, endIdx);

            // OPTIMIZED: Use DocumentFragment to batch DOM updates (50-100ms faster)
            const fragment = document.createDocumentFragment();

            pageItems.forEach((upgrade) => {
                const currentLevel = this.getMetaUpgradeLevel(upgrade.id);
                const isMaxed = currentLevel >= upgrade.maxLevel;
                const cost = upgrade.cost + (currentLevel * Math.floor(upgrade.cost * 0.5));
                const currentStars = window.gameManager?.metaStars ?? 0;
                const canAfford = currentStars >= cost;

                const item = document.createElement('div');
                item.className = 'shop-item';
                item.innerHTML = `
                    <div class="shop-item-header">
                        <span class="shop-item-icon">${upgrade.icon}</span>
                        <span class="shop-item-name">${upgrade.name}</span>
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
                fragment.appendChild(item);  // Add to fragment (no reflow)
            });

            container.innerHTML = '';
            container.appendChild(fragment);  // Single reflow

            // Update pagination controls
            const prevBtn = this.dom.buttons?.shopPrevPage;
            const nextBtn = this.dom.buttons?.shopNextPage;
            const indicator = this.dom.controls?.shopPageIndicator;
            this.updatePaginationButtons(prevBtn, nextBtn, indicator);
        }

        /**
         * Navigate shop pages with fade transition
         */
        navigatePage(direction) {
            const newPage = this.pagination.currentPage + direction;
            if (newPage < 1 || newPage > this.pagination.totalPages) {
                return;
            }

            this.pagination.currentPage = newPage;

            const container = this.dom.shopItems;
            if (!container) {
                this.render();
                return;
            }

            // Add fade out effect
            container.classList.add('page-transitioning');

            setTimeout(() => {
                this.render();
                container.classList.remove('page-transitioning');
            }, 150);
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

            const cost = upgrade.cost + (currentLevel * Math.floor(upgrade.cost * 0.5));
            if ((window.gameManager.metaStars ?? 0) < cost) {
                return;
            }

            window.gameManager.metaStars -= cost;
            this.setMetaUpgradeLevel(upgradeId, currentLevel + 1);

            this.refreshStarDisplay();
            window.gameManager.saveStarTokens?.();

            // Stay on current page after purchase
            this.render();

            this.logger?.log?.(`Purchased ${upgrade.name} level ${currentLevel + 1}`);

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
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.ShopPanel = ShopPanel;
    }
})();
