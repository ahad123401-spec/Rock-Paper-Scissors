/**
 * Standalone Rock Paper Scissors Game Engine
 * Preserves AI heuristics (easy, normal, hard), statistics, streaks,
 * match configurations, history, and localStorage state.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Moves and Rules Mapping
    const MOVES = ['rock', 'paper', 'scissors'];
    const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
    const BEATEN_BY = { scissors: 'rock', rock: 'paper', paper: 'scissors' };

    // LocalStorage Keys
    const STORAGE_KEY_STATE = 'rps_game_state_v1';
    const STORAGE_KEY_STATS = 'rps_game_statistics_v1';
    const STORAGE_KEY_HISTORY = 'rps_game_history_v1';

    // DOM Elements
    const overlay = document.getElementById('match-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayScore = document.getElementById('overlay-score');
    const overlayNewMatchBtn = document.getElementById('overlay-new-match');
    const overlayResetBtn = document.getElementById('overlay-reset');

    const btnNewMatch = document.getElementById('btn-new-match');
    const btnReset = document.getElementById('btn-reset');

    const settingButtons = document.querySelectorAll('.toggle-btn');
    const infoMatchLength = document.getElementById('info-match-length');
    const infoTarget = document.getElementById('info-target');

    const scorePlayer = document.getElementById('score-player');
    const scoreComputer = document.getElementById('score-computer');
    const scoreDraws = document.getElementById('score-draws');

    const resultMessage = document.getElementById('result-message');
    const resultDetail = document.getElementById('result-detail');
    const moveButtons = document.querySelectorAll('.move-btn');

    const statRounds = document.getElementById('stat-rounds');
    const statWins = document.getElementById('stat-wins');
    const statLosses = document.getElementById('stat-losses');
    const statDraws = document.getElementById('stat-draws');
    const statWinrate = document.getElementById('stat-winrate');
    const statStreak = document.getElementById('stat-streak');
    const statBestStreak = document.getElementById('stat-best-streak');

    const historyList = document.getElementById('history-list');

    let isMatchOver = false;

    // Default State Initializers
    const getDefaultState = () => ({
        scores: { player: 0, computer: 0, draws: 0 },
        difficulty: 'normal',
        match_length: 5,
        match_over: false,
        match_winner: null
    });

    const getDefaultStats = () => ({
        rounds_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        win_rate: null,
        current_streak: 0,
        best_streak: 0
    });

    let gameState = getDefaultState();
    let statistics = getDefaultStats();
    let history = [];

    // LocalStorage Helpers
    const loadSavedData = () => {
        try {
            const rawState = localStorage.getItem(STORAGE_KEY_STATE);
            if (rawState) gameState = Object.assign(getDefaultState(), JSON.parse(rawState));

            const rawStats = localStorage.getItem(STORAGE_KEY_STATS);
            if (rawStats) statistics = Object.assign(getDefaultStats(), JSON.parse(rawStats));

            const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (rawHistory) history = JSON.parse(rawHistory);
        } catch (e) {
            console.warn('Error loading state from localStorage:', e);
        }
    };

    const saveCurrentData = () => {
        try {
            localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(gameState));
            localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(statistics));
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        } catch (e) {
            console.warn('Error saving state to localStorage:', e);
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
            const str = matchLength.toString();
            document.querySelectorAll('[data-setting="match_length"]').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-value') === str);
            });
            infoMatchLength.textContent = str;
            infoTarget.textContent = Math.floor(parseInt(str, 10) / 2) + 1;
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
            const p = capitalize(item.player);
            const c = capitalize(item.computer);
            let outcome = 'Draw';

            if (item.winner === 'player') outcome = 'Win';
            if (item.winner === 'computer') outcome = 'Loss';

            li.innerHTML = `
                <span>#${item.round} ${p} vs ${c}</span>
                <span>${outcome}</span>
            `;
            historyList.appendChild(li);
        });
    };

    const syncAchievements = () => {
        if (window.Achievements && typeof window.Achievements.check === 'function') {
            window.Achievements.check({
                statistics: statistics,
                scores: gameState.scores,
                match_over: gameState.match_over,
                match_winner: gameState.match_winner,
                match_length: gameState.match_length
            });
        }
    };

    const renderFullUI = () => {
        renderScores(gameState.scores, gameState.match_length);
        renderStatistics(statistics);
        renderSettings(gameState.difficulty, gameState.match_length);
        renderHistory(history);

        if (gameState.match_over) {
            showOverlay(gameState.match_winner, gameState.scores.player, gameState.scores.computer);
        } else {
            hideOverlay();
        }

        syncAchievements();
    };

    /**
     * Replicates the exact AI move logic from app.py:
     * - Easy: completely random.
     * - Normal: 25% chance to counter what player used last round; otherwise random.
     * - Hard: 50% chance to counter player's most frequent move; otherwise random.
     */
    const computeComputerMove = (diff) => {
        if (diff === 'easy') {
            return MOVES[Math.floor(Math.random() * MOVES.length)];
        }

        if (diff === 'normal') {
            if (history.length > 0 && Math.random() < 0.25) {
                return BEATS[history[0].player];
            }
            return MOVES[Math.floor(Math.random() * MOVES.length)];
        }

        if (diff === 'hard') {
            if (history.length > 0 && Math.random() < 0.5) {
                const cnt = { rock: 0, paper: 0, scissors: 0 };
                history.forEach(item => {
                    if (cnt[item.player] !== undefined) cnt[item.player]++;
                });

                let fav = 'rock';
                let maxCount = -1;
                MOVES.forEach(m => {
                    if (cnt[m] > maxCount) {
                        maxCount = cnt[m];
                        fav = m;
                    }
                });

                return BEATEN_BY[fav];
            }
            return MOVES[Math.floor(Math.random() * MOVES.length)];
        }

        return MOVES[Math.floor(Math.random() * MOVES.length)];
    };

    const playMove = (playerChoice) => {
        if (isMatchOver || gameState.match_over) return;
        if (!MOVES.includes(playerChoice)) return;

        const compChoice = computeComputerMove(gameState.difficulty);

        // Determine winner
        let result;
        if (playerChoice === compChoice) {
            result = 'draw';
        } else if (BEATS[playerChoice] === compChoice) {
            result = 'player';
        } else {
            result = 'computer';
        }

        // Update stats and current match scores
        statistics.rounds_played += 1;

        if (result === 'player') {
            gameState.scores.player += 1;
            statistics.wins += 1;
            statistics.current_streak += 1;
            if (statistics.current_streak > statistics.best_streak) {
                statistics.best_streak = statistics.current_streak;
            }
        } else if (result === 'computer') {
            gameState.scores.computer += 1;
            statistics.losses += 1;
            statistics.current_streak = 0;
        } else {
            gameState.scores.draws += 1;
            statistics.draws += 1;
        }

        const decisive = statistics.wins + statistics.losses;
        statistics.win_rate = decisive > 0
            ? Math.round((statistics.wins / decisive) * 1000) / 10
            : null;

        // Create round history record
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const roundInfo = {
            round: statistics.rounds_played,
            player: playerChoice,
            computer: compChoice,
            winner: result,
            time: timeStr
        };

        history.unshift(roundInfo);
        if (history.length > 50) history.pop();

        // Check Best-of Match completion
        const target = Math.floor(gameState.match_length / 2) + 1;
        if (gameState.scores.player >= target) {
            gameState.match_over = true;
            gameState.match_winner = 'player';
        } else if (gameState.scores.computer >= target) {
            gameState.match_over = true;
            gameState.match_winner = 'computer';
        }

        // Update round result text
        if (result === 'player') {
            resultMessage.textContent = 'You won this round!';
        } else if (result === 'computer') {
            resultMessage.textContent = 'Computer won this round.';
        } else {
            resultMessage.textContent = "It's a draw.";
        }

        resultDetail.textContent = `You chose ${capitalize(playerChoice)} — Computer chose ${capitalize(compChoice)}`;

        // Save and reflect updates
        saveCurrentData();
        renderScores(gameState.scores, gameState.match_length);
        renderStatistics(statistics);
        renderHistory(history);
        syncAchievements();

        if (gameState.match_over) {
            showOverlay(gameState.match_winner, gameState.scores.player, gameState.scores.computer);
        }
    };

    const startNewMatch = () => {
        gameState.scores = { player: 0, computer: 0, draws: 0 };
        gameState.match_over = false;
        gameState.match_winner = null;

        hideOverlay();
        resultMessage.textContent = 'New match started';
        resultDetail.textContent = 'Choose your move to begin.';

        saveCurrentData();
        renderScores(gameState.scores, gameState.match_length);
    };

    const resetGame = () => {
        const savedDifficulty = gameState.difficulty;
        const savedMatchLength = gameState.match_length;

        gameState = getDefaultState();
        gameState.difficulty = savedDifficulty;
        gameState.match_length = savedMatchLength;

        statistics = getDefaultStats();
        history = [];

        hideOverlay();
        resultMessage.textContent = 'Game reset';
        resultDetail.textContent = 'All stats and scores have been cleared.';

        saveCurrentData();
        renderFullUI();
    };

    const updateSetting = (settingName, value) => {
        if (settingName === 'difficulty') {
            if (['easy', 'normal', 'hard'].includes(value)) {
                gameState.difficulty = value;
            }
        } else if (settingName === 'match_length') {
            const parsed = parseInt(value, 10);
            if ([1, 3, 5, 7, 9].includes(parsed)) {
                gameState.match_length = parsed;
            }
        }

        // Reset current match when changing rules
        gameState.scores = { player: 0, computer: 0, draws: 0 };
        gameState.match_over = false;
        gameState.match_winner = null;

        hideOverlay();
        resultMessage.textContent = 'Setting updated';
        resultDetail.textContent = `${capitalize(settingName.replace('_', ' '))}: ${capitalize(value.toString())}`;

        saveCurrentData();
        renderScores(gameState.scores, gameState.match_length);
        renderSettings(gameState.difficulty, gameState.match_length);
    };

    // Attach Event Listeners
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

    // Initial Load
    loadSavedData();
    renderFullUI();
});

