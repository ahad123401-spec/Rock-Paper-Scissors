document.addEventListener('DOMContentLoaded', () => {
   

    const injectStyles = () => {
        if (document.getElementById('injected-achievement-styles')) return;
        const style = document.createElement('style');
        style.id = 'injected-achievement-styles';
        style.textContent = `
            /* Achievements Panel */
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

            /* Achievement Toast Popup */
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
        // 1. Inject Toast Notification container if not present
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

        // 2. Inject Achievements Panel below the lower section
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

    injectStyles();
    injectDOM();

   

    // Overlay Elements
    const overlay = document.getElementById('match-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayScore = document.getElementById('overlay-score');
    const overlayNewMatchBtn = document.getElementById('overlay-new-match');
    const overlayResetBtn = document.getElementById('overlay-reset');

    // Header Controls
    const btnNewMatch = document.getElementById('btn-new-match');
    const btnReset = document.getElementById('btn-reset');

    // Settings
    const settingButtons = document.querySelectorAll('.toggle-btn');
    const infoMatchLength = document.getElementById('info-match-length');
    const infoTarget = document.getElementById('info-target');

    // Scoreboard
    const scorePlayer = document.getElementById('score-player');
    const scoreComputer = document.getElementById('score-computer');
    const scoreDraws = document.getElementById('score-draws');

    // Results
    const resultMessage = document.getElementById('result-message');
    const resultDetail = document.getElementById('result-detail');

    // Game Action Buttons
    const moveButtons = document.querySelectorAll('.move-btn');

    // Statistics
    const statRounds = document.getElementById('stat-rounds');
    const statWins = document.getElementById('stat-wins');
    const statLosses = document.getElementById('stat-losses');
    const statDraws = document.getElementById('stat-draws');
    const statWinrate = document.getElementById('stat-winrate');
    const statStreak = document.getElementById('stat-streak');
    const statBestStreak = document.getElementById('stat-best-streak');

    // History & Achievements
    const historyList = document.getElementById('history-list');
    const achievementsList = document.getElementById('achievements-list');

    let isRequestPending = false;
    let isMatchOver = false;

    
    

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

    const triggerToast = (ach) => {
        notificationQueue.push(ach);
        processToastQueue();
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

    const checkAchievements = (data) => {
        if (!data) return;
        const unlockedMap = loadAchievements();
        let updated = false;

        ACHIEVEMENTS.forEach(ach => {
            if (unlockedMap[ach.id]) return; // Already unlocked

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

    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const setButtonsDisabled = (disabled) => {
        moveButtons.forEach(btn => {
            btn.disabled = disabled;
            btn.style.opacity = disabled ? '0.4' : '1';
            btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
        });
    };

    const showOverlay = (winner, pScore, cScore) => {
        isMatchOver = true;
        setButtonsDisabled(true);

        if (winner === 'player') {
            overlayTitle.textContent = 'YOU WON!';
        } else if (winner === 'computer') {
            overlayTitle.textContent = 'COMPUTER WON';
        } else {
            overlayTitle.textContent = 'MATCH OVER';
        }

        overlayScore.textContent = `You: ${pScore} — Computer: ${cScore}`;
        overlay.classList.remove('hidden');
    };

    const hideOverlay = () => {
        overlay.classList.add('hidden');
        isMatchOver = false;
        setButtonsDisabled(false);
    };

    const renderScores = (scores, matchLength) => {
        if (!scores) return;

        scorePlayer.textContent = scores.player ?? 0;
        scoreComputer.textContent = scores.computer ?? 0;
        scoreDraws.textContent = `${scores.draws ?? 0} draws`;

        const length = matchLength || parseInt(infoMatchLength.textContent, 10) || 5;
        const target = Math.floor(length / 2) + 1;

        infoMatchLength.textContent = length;
        infoTarget.textContent = target;
    };

    const renderStatistics = (stats) => {
        if (!stats) return;

        statRounds.textContent = stats.rounds_played ?? 0;
        statWins.textContent = stats.wins ?? 0;
        statLosses.textContent = stats.losses ?? 0;
        statDraws.textContent = stats.draws ?? 0;
        statWinrate.textContent = (stats.win_rate !== undefined && stats.win_rate !== null)
            ? `${stats.win_rate}%`
            : '—';
        statStreak.textContent = stats.current_streak ?? 0;
        statBestStreak.textContent = stats.best_streak ?? 0;
    };

    const renderSettings = (difficulty, matchLength) => {
        if (difficulty) {
            document.querySelectorAll('[data-setting="difficulty"]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-value') === difficulty);
            });
        }

        if (matchLength !== undefined && matchLength !== null) {
            const matchLenStr = matchLength.toString();
            document.querySelectorAll('[data-setting="match_length"]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-value') === matchLenStr);
            });
            infoMatchLength.textContent = matchLenStr;
            infoTarget.textContent = Math.floor(parseInt(matchLenStr, 10) / 2) + 1;
        }
    };

    const renderHistory = (historyItems) => {
        if (!historyItems || historyItems.length === 0) {
            historyList.innerHTML = '<li class="history-empty">No rounds played yet</li>';
            return;
        }

        historyList.innerHTML = '';
        historyItems.forEach(item => {
            const li = document.createElement('li');
            const pChoice = capitalize(item.player);
            const cChoice = capitalize(item.computer);
            let outcome = 'Draw';

            if (item.winner === 'player') outcome = 'Win';
            if (item.winner === 'computer') outcome = 'Loss';

            li.innerHTML = `
                <span>#${item.round} ${pChoice} vs ${cChoice}</span>
                <span>${outcome}</span>
            `;
            historyList.appendChild(li);
        });
    };

    const renderFullState = (state) => {
        if (!state) return;

        renderScores(state.scores, state.match_length);
        renderStatistics(state.statistics || state.ststistics);
        renderSettings(state.difficulty, state.match_length);
        renderHistory(state.history);

        if (state.match_over) {
            showOverlay(state.match_winner, state.scores.player, state.scores.computer);
        } else {
            hideOverlay();
        }

      
        checkAchievements({
            statistics: state.statistics || state.ststistics,
            scores: state.scores,
            match_over: state.match_over,
            match_winner: state.match_winner,
            match_length: state.match_length
        });
    };

    

    const loadInitialState = async () => {
        try {
            const res = await fetch('/api/state');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const state = await res.json();
            renderFullState(state);
        } catch (err) {
            resultMessage.textContent = 'Failed to connect to backend';
            resultDetail.textContent = 'Make sure your Flask server is running.';
        }
    };

    const playMove = async (choice) => {
        if (isRequestPending || isMatchOver) return;

        isRequestPending = true;
        setButtonsDisabled(true);

        try {
            const res = await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice })
            });

            const data = await res.json();

            if (!res.ok) {
                resultMessage.textContent = data.error || 'Move could not be played';
                resultDetail.textContent = '';
                return;
            }

            const { round, scores, statistics, match_over, match_winner } = data;

            // Result readout
            if (round.winner === 'player') {
                resultMessage.textContent = 'You won this round!';
            } else if (round.winner === 'computer') {
                resultMessage.textContent = 'Computer won this round.';
            } else {
                resultMessage.textContent = "It's a draw.";
            }

            resultDetail.textContent = `You chose ${capitalize(round.player)} — Computer chose ${capitalize(round.computer)}`;

            renderScores(scores);
            renderStatistics(statistics);
            fetchHistory();

            // Evaluate achievements after round
            checkAchievements({
                statistics: statistics,
                scores: scores,
                match_over: match_over,
                match_winner: match_winner,
                match_length: infoMatchLength.textContent
            });

            if (match_over) {
                showOverlay(match_winner, scores.player, scores.computer);
            }
        } catch (err) {
            resultMessage.textContent = 'Error processing move';
            resultDetail.textContent = 'Check your network connection and server console.';
        } finally {
            isRequestPending = false;
            if (!isMatchOver) {
                setButtonsDisabled(false);
            }
        }
    };

    const startNewMatch = async () => {
        try {
            const res = await fetch('/api/new-match', { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            hideOverlay();
            resultMessage.textContent = 'New match started';
            resultDetail.textContent = 'Choose your move to begin.';

            await loadInitialState();
        } catch (err) {
            resultMessage.textContent = 'Failed to start new match';
            resultDetail.textContent = '';
        }
    };

    const resetGame = async () => {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            hideOverlay();
            resultMessage.textContent = 'Game reset';
            resultDetail.textContent = 'All stats and scores have been cleared.';

            await loadInitialState();
        } catch (err) {
            resultMessage.textContent = 'Failed to reset game';
            resultDetail.textContent = '';
        }
    };

    const updateSetting = async (settingName, value) => {
        try {
            const payload = {};
            payload[settingName] = settingName === 'match_length' ? parseInt(value, 10) : value;

            const res = await fetch('/api/setting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            hideOverlay();
            resultMessage.textContent = 'Setting updated';
            resultDetail.textContent = `${capitalize(settingName.replace('_', ' '))}: ${capitalize(value.toString())}`;

            await loadInitialState();
        } catch (err) {
            resultMessage.textContent = 'Failed to update setting';
            resultDetail.textContent = '';
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history');
            if (res.ok) {
                const data = await res.json();
                renderHistory(data.history);
            }
        } catch {
          
        }
    };

    

    moveButtons.forEach(button => {
        button.addEventListener('click', () => {
            const choice = button.getAttribute('data-choice');
            playMove(choice);
        });
    });

    settingButtons.forEach(button => {
        button.addEventListener('click', () => {
            const setting = button.getAttribute('data-setting');
            const value = button.getAttribute('data-value');
            if (setting && value) {
                updateSetting(setting, value);
            }
        });
    });

    btnNewMatch.addEventListener('click', startNewMatch);
    overlayNewMatchBtn.addEventListener('click', startNewMatch);

    btnReset.addEventListener('click', resetGame);
    overlayResetBtn.addEventListener('click', resetGame);

    
   
    renderAchievements();
    loadInitialState();
});

















