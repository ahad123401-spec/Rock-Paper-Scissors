/**
 * Achievements Module
 * Handles achievement tracking, UI panel generation, unlock toast notifications,
 * and localStorage persistence for Rock Paper Scissors.
 */
(function () {
    const STORAGE_KEY = 'rps_achievements_v1';

    const ACHIEVEMENTS = [
        {
            id: 'first_victory',
            name: 'First Victory',
            description: 'Win your first round.',
            check: (data) => (data.statistics?.wins ?? 0) >= 1
        },
        {
            id: 'getting_started',
            name: 'Getting Started',
            description: 'Play 10 rounds.',
            check: (data) => (data.statistics?.rounds_played ?? 0) >= 10
        },
        {
            id: 'winning_streak',
            name: 'Winning Streak',
            description: 'Win 5 consecutive rounds.',
            check: (data) => {
                const cur = data.statistics?.current_streak ?? 0;
                const best = data.statistics?.best_streak ?? 0;
                return cur >= 5 || best >= 5;
            }
        },
        {
            id: 'unstoppable',
            name: 'Unstoppable',
            description: 'Win 10 consecutive rounds.',
            check: (data) => {
                const cur = data.statistics?.current_streak ?? 0;
                const best = data.statistics?.best_streak ?? 0;
                return cur >= 10 || best >= 10;
            }
        },
        {
            id: 'experienced',
            name: 'Experienced',
            description: 'Play 50 rounds.',
            check: (data) => (data.statistics?.rounds_played ?? 0) >= 50
        },
        {
            id: 'champion',
            name: 'Champion',
            description: 'Win a Best of 9 match.',
            check: (data) => {
                const isOver = Boolean(data.match_over);
                const winner = data.match_winner;
                const length = parseInt(data.match_length, 10);
                return isOver && winner === 'player' && length === 9;
            }
        }
    ];

    const notificationQueue = [];
    let isToastActive = false;

    const injectStyles = () => {
        if (document.getElementById('injected-achievement-styles')) return;
        const style = document.createElement('style');
        style.id = 'injected-achievement-styles';
        style.textContent = `
            .achievements-panel {
                background-color: var(--bg-panel, #090909);
                border: 1px solid var(--border-subtle, #242424);
                border-radius: 4px;
                padding: 18px 20px;
                margin-top: 16px;
                margin-bottom: 32px;
            }
            .achievements-list {
                list-style: none;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .achievement-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 12px;
                border: 1px solid var(--border-subtle, #242424);
                border-radius: 3px;
                background-color: var(--bg-subtle, #141414);
                transition: border-color var(--transition-fast, 0.15s ease);
            }
            .achievement-item.unlocked {
                border-color: var(--border-hover, #454545);
            }
            .achievement-item.locked {
                opacity: 0.4;
            }
            .achievement-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .achievement-name {
                font-size: 0.8125rem;
                font-weight: 600;
                color: var(--text-primary, #ffffff);
                letter-spacing: 0.02em;
            }
            .achievement-desc {
                font-size: 0.75rem;
                color: var(--text-muted, #737373);
            }
            .achievement-status {
                text-align: right;
                flex-shrink: 0;
            }
            .achievement-date {
                font-family: var(--font-mono, monospace);
                font-size: 0.6875rem;
                color: var(--text-muted, #737373);
                text-transform: uppercase;
                letter-spacing: 0.04em;
            }

            .achievement-toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background-color: var(--bg-page, #000000);
                border: 1px solid var(--text-primary, #ffffff);
                border-radius: 4px;
                padding: 14px 18px;
                max-width: 320px;
                z-index: 2000;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.9);
                opacity: 0;
                transform: translateY(12px);
                transition: opacity 0.25s ease, transform 0.25s ease;
                pointer-events: none;
            }
            .achievement-toast.visible {
                opacity: 1;
                transform: translateY(0);
            }
            .toast-label {
                font-size: 0.6875rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--text-muted, #737373);
                margin-bottom: 4px;
            }
            .toast-title {
                font-size: 0.875rem;
                font-weight: 700;
                color: var(--text-primary, #ffffff);
                margin-bottom: 2px;
            }
            .toast-desc {
                font-size: 0.75rem;
                color: var(--text-muted, #737373);
                line-height: 1.4;
            }
            @media (max-width: 620px) {
                .achievement-toast {
                    left: 16px;
                    right: 16px;
                    bottom: 16px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    };

    const injectDOM = () => {
        if (!document.getElementById('achievement-toast')) {
            const toast = document.createElement('div');
            toast.id = 'achievement-toast';
            toast.className = 'achievement-toast hidden';
            toast.innerHTML = `
                <div class="toast-label">Achievement Unlocked</div>
                <div class="toast-title" id="achievement-toast-title"></div>
                <div class="toast-desc" id="achievement-toast-desc"></div>
            `;
            document.body.appendChild(toast);
        }

        if (!document.getElementById('achievements-panel')) {
            const lowerSection = document.querySelector('.lower-section');
            if (lowerSection) {
                const panel = document.createElement('div');
                panel.id = 'achievements-panel';
                panel.className = 'achievements-panel';
                panel.innerHTML = `
                    <h3 class="panel-title">Achievements</h3>
                    <ul class="achievements-list" id="achievements-list"></ul>
                `;
                lowerSection.insertAdjacentElement('afterend', panel);
            }
        }
    };

    const loadAchievements = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };

    const saveAchievements = (map) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (e) {
            console.warn('Could not save achievements:', e);
        }
    };

    const formatDate = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    };

    const renderAchievements = () => {
        const achievementsList = document.getElementById('achievements-list');
        if (!achievementsList) return;
        const unlockedMap = loadAchievements();
        achievementsList.innerHTML = '';

        ACHIEVEMENTS.forEach(ach => {
            const isUnlocked = Boolean(unlockedMap[ach.id]);
            const li = document.createElement('li');
            li.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;

            const dateStr = isUnlocked
                ? `Unlocked ${formatDate(unlockedMap[ach.id].unlockedAt)}`
                : 'Locked';

            li.innerHTML = `
                <div class="achievement-info">
                    <span class="achievement-name">${ach.name}</span>
                    <span class="achievement-desc">${ach.description}</span>
                </div>
                <div class="achievement-status">
                    <span class="achievement-date">${dateStr}</span>
                </div>
            `;
            achievementsList.appendChild(li);
        });
    };

    const processToastQueue = () => {
        if (isToastActive || notificationQueue.length === 0) return;

        const toast = document.getElementById('achievement-toast');
        const title = document.getElementById('achievement-toast-title');
        const desc = document.getElementById('achievement-toast-desc');
        if (!toast || !title || !desc) return;

        isToastActive = true;
        const current = notificationQueue.shift();

        title.textContent = current.name;
        desc.textContent = current.description;

        toast.classList.remove('hidden');
        toast.classList.add('visible');

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.classList.add('hidden');
                isToastActive = false;
                processToastQueue();
            }, 300);
        }, 3500);
    };

    const triggerToast = (ach) => {
        notificationQueue.push(ach);
        processToastQueue();
    };

    const checkAchievements = (data) => {
        if (!data) return;
        const unlockedMap = loadAchievements();
        let updated = false;

        ACHIEVEMENTS.forEach(ach => {
            if (unlockedMap[ach.id]) return;

            try {
                if (ach.check(data)) {
                    unlockedMap[ach.id] = { unlockedAt: new Date().toISOString() };
                    updated = true;
                    triggerToast(ach);
                }
            } catch (err) {
                console.error('Error evaluating achievement:', err);
            }
        });

        if (updated) {
            saveAchievements(unlockedMap);
            renderAchievements();
        }
    };

    const init = () => {
        injectStyles();
        injectDOM();
        renderAchievements();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose public API for script.js
    window.Achievements = {
        check: checkAchievements,
        render: renderAchievements,
        getUnlocked: loadAchievements
    };
})();






