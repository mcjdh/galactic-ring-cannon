(function() {
    const screen = {
        root: document.getElementById('result-screen'),
        title: document.getElementById('result-title'),
        subtitle: document.getElementById('result-subtitle'),
        stats: document.getElementById('result-stats'),
        buttonsContainer: document.getElementById('result-buttons')
    };

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
        if (!screen.buttonsContainer) return;
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
                    console.error('Result button handler error:', error);
                }
            });
            screen.buttonsContainer.appendChild(btn);
        });
    }

    function show(options = {}) {
        if (!screen.root) return;
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
    }

    window.resultScreen = { show, hide };
})();
