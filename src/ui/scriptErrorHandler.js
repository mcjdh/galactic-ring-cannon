(function() {
    const errors = [];
    const state = {
        banner: null,
        message: null
    };

    function ensureBanner() {
        if (state.banner) {
            return state.banner;
        }

        const banner = document.createElement('div');
        banner.id = 'script-error-banner';
        banner.style.position = 'fixed';
        banner.style.top = '0';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.zIndex = '10000';
        banner.style.display = 'none';
        banner.style.alignItems = 'center';
        banner.style.gap = '12px';
        banner.style.padding = '10px 16px';
        banner.style.background = 'rgba(180, 40, 40, 0.95)';
        banner.style.color = '#fff';
        banner.style.fontFamily = 'system-ui, sans-serif';
        banner.style.fontSize = '14px';
        banner.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';

        const message = document.createElement('span');
        message.className = 'script-error-message';
        message.textContent = 'A script error occurred.';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Dismiss';
        close.style.background = 'rgba(255, 255, 255, 0.2)';
        close.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        close.style.borderRadius = '4px';
        close.style.color = '#fff';
        close.style.cursor = 'pointer';
        close.style.padding = '4px 8px';
        close.addEventListener('click', () => {
            banner.style.display = 'none';
        });

        banner.appendChild(message);
        banner.appendChild(close);

        const attach = () => {
            document.body.appendChild(banner);
        };

        if (document.body) {
            attach();
        } else {
            window.addEventListener('DOMContentLoaded', attach, { once: true });
        }

        state.banner = banner;
        state.message = message;
        return banner;
    }

    function updateBanner(latest) {
        const banner = ensureBanner();
        if (!banner || !state.message) return;

        const { file, message, line } = latest;
        state.message.textContent = `Script error: ${message} (${file}:${line})`;
        banner.style.display = 'flex';
    }

    window.scriptErrors = errors;

    window.addEventListener('error', (e) => {
        if (!e || !e.filename || (typeof e.filename.includes === 'function' && !e.filename.includes('.js'))) {
            return;
        }

        const errorInfo = {
            file: e.filename,
            message: e.message || 'Unknown error',
            line: e.lineno || 0
        };

        errors.push(errorInfo);
        window.LoggerUtils.error('Script error:', errorInfo.file, errorInfo.message, errorInfo.line);
        updateBanner(errorInfo);
    });
})();
