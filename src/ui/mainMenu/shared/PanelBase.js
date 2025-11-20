/**
 * PanelBase - Shared functionality for menu panels
 * 
 * Provides common behavior for panels:
 * - Event listener management
 * - Pagination helpers
 * - Visibility control
 */
(function () {
    class PanelBase {
        constructor(options = {}) {
            this.logger = options.logger || console;
            this.dom = options.dom || {};
            this.mainController = options.mainController || null;

            // Event listener tracking
            this.eventListeners = [];
            this.dynamicListeners = [];

            // Pagination state (override in subclasses if needed)
            this.pagination = {
                currentPage: 1,
                totalPages: 1,
                itemsPerPage: 10
            };
        }

        /**
         * Add a permanent event listener (cleaned up on panel destroy)
         */
        addListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return;
            }
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
        }

        /**
         * Add a dynamic event listener (cleaned up when content refreshes)
         */
        addDynamicListener(element, event, handler, options) {
            if (!element || typeof handler !== 'function') {
                return;
            }
            element.addEventListener(event, handler, options);
            this.dynamicListeners.push({ element, event, handler, options });
        }

        /**
         * Clear all dynamic listeners (call before re-rendering content)
         */
        clearDynamicListeners() {
            this.dynamicListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    this.logger?.warn?.('Failed to remove dynamic listener', error);
                }
            });
            this.dynamicListeners = [];
        }

        /**
         * Calculate how many items can fit per page based on container dimensions
         */
        calculateItemsPerPage(container, minItemWidth, estimatedItemHeight, fallbackHeight = null, minItems = 3, maxItems = 20) {
            if (!container && !fallbackHeight) return minItems;

            const viewportWidth = typeof window !== 'undefined' ? (window.innerWidth || 1024) : 1024;
            const fallbackWidth = container?.parentElement?.clientWidth || viewportWidth * 0.75;
            const containerWidth = container?.clientWidth || fallbackWidth || viewportWidth;
            const fallbackContainerHeight = fallbackHeight || Math.max(estimatedItemHeight * 2, 320);
            const containerHeight = container?.clientHeight || fallbackContainerHeight;

            const gap = 14;
            const effectiveWidth = containerWidth + gap;
            const itemWidthWithGap = minItemWidth + gap;
            const itemsPerRow = Math.max(1, Math.floor(effectiveWidth / itemWidthWithGap));

            const effectiveHeight = containerHeight - gap;
            const itemHeightWithGap = estimatedItemHeight + gap;
            const rowsPerPage = Math.max(1, Math.floor(effectiveHeight / itemHeightWithGap));

            const itemsPerPage = itemsPerRow * rowsPerPage;
            return Math.min(maxItems, Math.max(minItems, itemsPerPage));
        }

        /**
         * Navigate to a different page
         */
        navigatePage(direction) {
            const newPage = this.pagination.currentPage + direction;
            if (newPage < 1 || newPage > this.pagination.totalPages) {
                return;
            }

            this.pagination.currentPage = newPage;
            this.render();
        }

        /**
         * Update pagination button states
         */
        updatePaginationButtons(prevBtn, nextBtn, indicator) {
            if (prevBtn) {
                prevBtn.disabled = this.pagination.currentPage === 1;
            }
            if (nextBtn) {
                nextBtn.disabled = this.pagination.currentPage >= this.pagination.totalPages;
            }
            if (indicator) {
                indicator.textContent = `Page ${this.pagination.currentPage} of ${this.pagination.totalPages}`;
            }
        }

        /**
         * Show the panel (override in subclasses)
         */
        show() {
            // Override in subclasses
        }

        /**
         * Hide the panel (override in subclasses)
         */
        hide() {
            // Override in subclasses
        }

        /**
         * Render the panel content (override in subclasses)
         */
        render() {
            // Override in subclasses
        }

        /**
         * Cleanup all event listeners
         */
        cleanup() {
            this.clearDynamicListeners();
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    this.logger?.warn?.('Failed to remove listener', error);
                }
            });
            this.eventListeners = [];
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.PanelBase = PanelBase;
    }
})();
