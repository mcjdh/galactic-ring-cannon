/**
 * MenuBackgroundRenderer - Handles all menu canvas backgrounds
 * 
 * Manages:
 * - Animated starfield for main menu
 * - Static backgrounds for panels
 * - Performance-optimized rendering
 * - Uses the new CosmicBackground system for consistent visuals
 */
(function () {
    class MenuBackgroundRenderer {
        constructor(options = {}) {
            this.logger = options.logger || console;
            this.menuAnimationFrame = null;
            this.menuResizeHandler = null;
            this.isVisible = false;
            this.cosmicBackground = null;
        }

        /**
         * Initialize and start animated background for main menu
         */
        initMenuBackground(canvas) {
            if (!canvas || !canvas.getContext) {
                return;
            }

            // Cancel any existing animation
            if (this.menuAnimationFrame) {
                cancelAnimationFrame(this.menuAnimationFrame);
            }

            // Initialize CosmicBackground
            if (!this.cosmicBackground) {
                // Ensure CosmicBackground is available
                if (window.Game && window.Game.CosmicBackground) {
                    this.cosmicBackground = new window.Game.CosmicBackground(canvas);
                } else {
                    this.logger.error('CosmicBackground not found');
                    return;
                }
            } else {
                this.cosmicBackground.canvas = canvas;
                this.cosmicBackground.ctx = canvas.getContext('2d');
            }

            // Handle resize
            const resizeCanvas = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                if (this.cosmicBackground) {
                    this.cosmicBackground.resize(canvas.width, canvas.height);
                }
            };
            resizeCanvas();

            if (!this.menuResizeHandler) {
                let resizeTimeout;
                this.menuResizeHandler = () => {
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(resizeCanvas, 150);
                };
                window.addEventListener('resize', this.menuResizeHandler);
            }

            // Animation loop
            const animate = () => {
                if (!this.isVisible) {
                    return;
                }

                // Render using CosmicBackground (pass null for player to use default camera)
                if (this.cosmicBackground) {
                    this.cosmicBackground.render(null);
                }

                this.menuAnimationFrame = requestAnimationFrame(animate);
            };

            // Start animation
            this.isVisible = true;
            animate();
        }

        /**
         * Initialize static background for a panel (no animation)
         */
        initPanelBackground(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !canvas.getContext) {
                return;
            }

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            if (window.Game && window.Game.CosmicBackground) {
                const bg = new window.Game.CosmicBackground(canvas);
                bg.render(null);
            }
        }

        /**
         * Stop the animation
         */
        stop() {
            this.isVisible = false;
            if (this.menuAnimationFrame) {
                cancelAnimationFrame(this.menuAnimationFrame);
                this.menuAnimationFrame = null;
            }
        }

        /**
         * Clean up all resources
         */
        cleanup() {
            this.stop();

            if (this.menuResizeHandler) {
                window.removeEventListener('resize', this.menuResizeHandler);
                this.menuResizeHandler = null;
            }
            
            this.cosmicBackground = null;
        }
    }

    // Export to global namespace
    if (typeof window !== 'undefined') {
        window.Game = window.Game || {};
        window.Game.MenuBackgroundRenderer = MenuBackgroundRenderer;
    }
})();
