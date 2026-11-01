document.addEventListener('DOMContentLoaded', function() {
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

    let locked = false;
    let gameOver = false;

    function cap(text) {
        if (!text) return '';
        return text[0].toUpperCase() + text.slice(1).toLowerCase();
    }

    function lockButtons(disabled) {
        moveButtons.forEach(b => {
            b.disabled = disabled;
            b.style.opacity = disabled ? '0.4' : '1';
            b.style.cursor = disabled ? 'not-allowed' : 'pointer';
        });
    }

    function displayModal(winner, pScore, cScore) {
        gameOver = true;
        lockButtons(true);
        if (winner === 'player') {
            overlayTitle.textContent = 'YOU WON!';
        } else if (winner === 'computer') {
            overlayTitle.textContent = 'COMPUTER WON';
        } else {
            overlayTitle.textContent = 'MATCH OVER';
        }
        overlayScore.textContent = 'You: ' + pScore + ' — Computer: ' + cScore;
        overlay.classList.remove('hidden');
    }

    function closeModal() {
        overlay.classList.add('hidden');
        gameOver = false;
        lockButtons(false);
    }

    function updateScores(scores, matchLen) {
        if (!scores) return;
        scorePlayer.textContent = scores.player ?? 0;
        scoreComputer.textContent = scores.computer ?? 0;
        scoreDraws.textContent = (scores.draws ?? 0) + ' draws';

        const len = matchLen || parseInt(infoMatchLength.textContent, 10) || 5;
        infoMatchLength.textContent = len;
        infoTarget.textContent = Math.floor(len / 2) + 1;
    }

    function updateStats(stats) {
        if (!stats) return;
        statRounds.textContent = stats.rounds_played ?? 0;
        statWins.textContent = stats.wins ?? 0;
        statLosses.textContent = stats.losses ?? 0;
        statDraws.textContent = stats.draws ?? 0;
        statWinrate.textContent = stats.win_rate != null ? stats.win_rate + '%' : '—';
        statStreak.textContent = stats.current_streak ?? 0;
        statBestStreak.textContent = stats.best_streak ?? 0;
    }

    function syncSettings(diff, matchLen) {
        if (diff) {
            document.querySelectorAll('[data-setting="difficulty"]').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-value') === diff);
            });
        }
        if (matchLen != null) {
            const str = matchLen.toString();
            document.querySelectorAll('[data-setting="match_length"]').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-value') === str);
            });
            infoMatchLength.textContent = str;
            infoTarget.textContent = Math.floor(parseInt(str, 10) / 2) + 1;
        }
    }

    function buildHistory(items) {
        if (!items || items.length === 0) {
            historyList.innerHTML = '<li class="history-empty">No rounds played yet</li>';
            return;
        }
        historyList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            const p = cap(item.player);
            const c = cap(item.computer);
            let outcome = 'Draw';
            if (item.winner === 'player') outcome = 'Win';
            if (item.winner === 'computer') outcome = 'Loss';

            li.innerHTML = '<span>#' + item.round + ' ' + p + ' vs ' + c + '</span><span>' + outcome + '</span>';
            historyList.appendChild(li);
        });
    }

    function refreshUI(state) {
        if (!state) return;
        updateScores(state.scores, state.match_length);
        updateStats(state.statistics || state.ststistics);
        syncSettings(state.difficulty, state.match_length);
        buildHistory(state.history);

        if (state.match_over) {
            displayModal(state.match_winner, state.scores.player, state.scores.computer);
        } else {
            closeModal();
        }
    }

    async function init() {
        try {
            const r = await fetch('/api/state');
            if (!r.ok) throw new Error();
            const data = await r.json();
            refreshUI(data);
        } catch (err) {
            resultMessage.textContent = 'Failed to connect to backend';
            resultDetail.textContent = 'Make sure your Flask server is running.';
        }
    }

    async function sendMove(choice) {
        if (locked || gameOver) return;
        locked = true;
        lockButtons(true);

        try {
            const res = await fetch('/api/play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ choice })
            });
            const json = await res.json();

            if (!res.ok) {
                resultMessage.textContent = json.error || 'Move could not be played';
                resultDetail.textContent = '';
                return;
            }

            const { round, scores, statistics, match_over, match_winner } = json;

            if (round.winner === 'player') {
                resultMessage.textContent = 'You won this round!';
            } else if (round.winner === 'computer') {
                resultMessage.textContent = 'Computer won this round.';
            } else {
                resultMessage.textContent = "It's a draw.";
            }

            resultDetail.textContent = 'You chose ' + cap(round.player) + ' — Computer chose ' + cap(round.computer);

            updateScores(scores);
            updateStats(statistics);
            
            fetch('/api/history').then(res => res.json()).then(d => buildHistory(d.history)).catch(() => {});

            if (match_over) {
                displayModal(match_winner, scores.player, scores.computer);
            }
        } catch (err) {
            resultMessage.textContent = 'Error processing move';
            resultDetail.textContent = 'Check your network connection and server console.';
        } finally {
            locked = false;
            if (!gameOver) lockButtons(false);
        }
    }

    async function newGame() {
        try {
            const res = await fetch('/api/new-match', { method: 'POST' });
            if (!res.ok) throw new Error();
            closeModal();
            resultMessage.textContent = 'New match started';
            resultDetail.textContent = 'Choose your move to begin.';
            await init();
        } catch (err) {
            resultMessage.textContent = 'Failed to start new match';
            resultDetail.textContent = '';
        }
    }

    async function wipeData() {
        try {
            const res = await fetch('/api/reset', { method: 'POST' });
            if (!res.ok) throw new Error();
            closeModal();
            resultMessage.textContent = 'Game reset';
            resultDetail.textContent = 'All stats and scores have been cleared.';
            await init();
        } catch (err) {
            resultMessage.textContent = 'Failed to reset game';
            resultDetail.textContent = '';
        }
    }

    async function changeSetting(name, val) {
        try {
            const payload = {};
            payload[name] = name === 'match_length' ? parseInt(val, 10) : val;

            const res = await fetch('/api/setting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();

            closeModal();
            resultMessage.textContent = 'Setting updated';
            resultDetail.textContent = cap(name.replace('_', ' ')) + ': ' + cap(val.toString());
            await init();
        } catch (err) {
            resultMessage.textContent = 'Failed to update setting';
            resultDetail.textContent = '';
        }
    }

    moveButtons.forEach(btn => {
        btn.addEventListener('click', () => sendMove(btn.getAttribute('data-choice')));
    });

    settingButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const s = btn.getAttribute('data-setting');
            const v = btn.getAttribute('data-value');
            if (s && v) changeSetting(s, v);
        });
    });

    btnNewMatch.addEventListener('click', newGame);
    overlayNewMatchBtn.addEventListener('click', newGame);

    btnReset.addEventListener('click', wipeData);
    overlayResetBtn.addEventListener('click', wipeData);

    init();
});


