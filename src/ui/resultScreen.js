(function() {
    let elements = null;
    let _dirty = false;

    function ensureElements() {
        if (elements) return elements;

        elements = {
            root: document.getElementById('result-screen'),
            title: document.getElementById('result-title'),
            subtitle: document.getElementById('result-subtitle'),
            stats: document.getElementById('result-stats'),
            buttonsContainer: document.getElementById('result-buttons')
        };

        if (!elements.root) {
            elements = null;
        }

        return elements;
    }

    function defaultRestart() {
        if (window.gameManager?.startGame) {
            window.gameManager.startGame();
        } else if (window.gameManagerBridge?.startGame) {
            window.gameManagerBridge.resetGameState?.();
            window.gameManagerBridge.startGame();
        }
    }

    function defaultMenu() {
        if (window.gameManager?.returnToMenu) {
            window.gameManager.returnToMenu();
        } else if (window.gameManagerBridge?.returnToMenu) {
            window.gameManagerBridge.returnToMenu();
        } else {
            const gameContainer = document.getElementById('game-container');
            const mainMenu = document.getElementById('main-menu');
            if (gameContainer) gameContainer.classList.add('hidden');
            if (mainMenu) mainMenu.classList.remove('hidden');
        }
    }

    function hide() {
        const screen = ensureElements();
        if (!screen) return;

        if (screen.root) {
            screen.root.classList.add('hidden');
            screen.root.removeAttribute('data-outcome');
        }
        if (screen.stats) {
            screen.stats.innerHTML = '';
        }
        if (screen.buttonsContainer) {
            screen.buttonsContainer.innerHTML = '';
        }
        _dirty = false;
    }

    function normalizeButtons(buttons) {
        if (!Array.isArray(buttons) || buttons.length === 0) {
            return [
                { label: 'Restart', action: defaultRestart },
                { label: 'Main Menu', action: defaultMenu }
            ];
        }
        return buttons.map(button => ({
            label: button?.label ?? 'Action',
            action: typeof button?.action === 'function' ? button.action : () => {}
        }));
    }

    function renderButtons(buttons) {
        const screen = ensureElements();
        if (!screen?.buttonsContainer) return;
        screen.buttonsContainer.innerHTML = '';
        normalizeButtons(buttons).forEach(button => {
            const btn = document.createElement('button');
            btn.className = 'menu-button';
            btn.textContent = button.label;
            btn.addEventListener('click', () => {
                hide();
                try {
                    button.action();
                } catch (error) {
                    window.logger.error('Result button handler error:', error);
                }
            });
            screen.buttonsContainer.appendChild(btn);
        });
    }

    function show(options = {}) {
        const screen = ensureElements();
        if (!screen?.root) return;
        const {
            title = 'Run Complete',
            subtitle = '',
            stats = [],
            outcome = 'summary',
            buttons = []
        } = options;

        screen.root.setAttribute('data-outcome', outcome);

        if (screen.title) screen.title.textContent = title;
        if (screen.subtitle) {
            if (subtitle) {
                screen.subtitle.textContent = subtitle;
                screen.subtitle.style.display = '';
            } else {
                screen.subtitle.textContent = '';
                screen.subtitle.style.display = 'none';
            }
        }

        if (screen.stats) {
            screen.stats.innerHTML = '';
            if (Array.isArray(stats) && stats.length > 0) {
                const list = document.createElement('ul');
                list.className = 'result-stats-list';
                stats.forEach(({ label, value }) => {
                    const item = document.createElement('li');
                    item.textContent = `${label}: ${value}`;
                    list.appendChild(item);
                });
                screen.stats.appendChild(list);
            }
        }

        renderButtons(buttons);
        screen.root.classList.remove('hidden');
        _dirty = true;
    }

    window.resultScreen = {
        show,
        hide,
        isVisible: () => {
            const screen = ensureElements();
            return screen?.root ? !screen.root.classList.contains('hidden') : false;
        },
        /**
         * Check if result screen has unsaved changes (e.g., for preventing navigation)
         * @returns {boolean} True if screen is visible and has been shown
         */
        isDirty: () => _dirty && ensureElements() !== null,
        /**
         * Reset dirty state (useful after explicit save or dismiss)
         */
        clearDirty: () => { _dirty = false; }
    };
})();
