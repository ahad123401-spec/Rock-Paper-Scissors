from flask import Flask, render_template, request, jsonify, session
import random
from datetime import datetime

app = Flask(__name__)
app.secret_key = "lkasjdf908234jlkasdf_asdf_lol_99"

# rps stuff
m = ['rock', 'paper', 'scissors']
w_map = {'rock': 'scissors', 'paper': 'rock', 'scissors': 'paper'}

def init_bag():
    return {
        'player_score': 0, 
        'computer_score': 0, 
        'draws': 0,
        'rounds_played': 0, 
        'player_streak': 0, 
        'best_player_streak': 0,
        'computer_streak': 0, 
        'wins': 0, 
        'losses': 0, 
        'win_rate': 0, 
        'history': [],
        'difficulty': 'normal', 
        'match_length': 5, 
        'match_over': False, 
        'match_winner': None
    }

def get_g():
    if 'game' not in session: 
        session['game'] = init_bag()
    return session['game']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/state')
def st():
    g = get_g()
    return jsonify({
        'scores': {'player': g['player_score'], 'computer': g['computer_score'], 'draws': g['draws']},
        'statistics': {
            'rounds_played': g['rounds_played'], 'wins': g['wins'], 'losses': g['losses'],
            'win_rate': g['win_rate'], 'current_streak': g['player_streak'], 'best_streak': g['best_player_streak']
        },
        'difficulty': g['difficulty'],
        'match_length': g['match_length'],
        'match_over': g['match_over'],
        'match_winner': g['match_winner'],
        'history': g['history']
    })

@app.route('/api/play', methods=['POST'])
def play():
    g = get_g()
    if g['match_over']: 
        return jsonify({'error': 'game over already dude'}), 400
    
    d = request.json or {}
    choice = d.get('choice', '')
    if not isinstance(choice, str): 
        return jsonify({'error': 'bad input'}), 400
    choice = choice.lower().strip()
    
    if choice not in m: 
        return jsonify({'error': 'pick rock paper scissors'}), 400

    # AI move calculation - hacked logic
    diff = g['difficulty']
    if diff == 'easy':
        comp = random.choice(m)
    elif diff == 'normal':
        if g['history'] and random.random() < 0.25:
            comp = w_map[g['history'][0]['player']]
        else:
            comp = random.choice(m)
    else: # hard mode lol
        if g['history'] and random.random() < 0.5:
            cnt = {'rock': 0, 'paper': 0, 'scissors': 0}
            for x in g['history']: 
                cnt[x['player']] += 1
            fav = max(cnt, key=cnt.get)
            comp = [k for k, v in w_map.items() if v == fav][0]
        else:
            comp = random.choice(m)

    # winner check
    if choice == comp:
        res = 'draw'
    elif w_map[choice] == comp:
        res = 'player'
    else:
        res = 'computer'

    # update stats
    g['rounds_played'] += 1
    if res == 'player':
        g['player_score'] += 1
        g['wins'] += 1
        g['player_streak'] += 1
        g['computer_streak'] = 0
        if g['player_streak'] > g['best_player_streak']:
            g['best_player_streak'] = g['player_streak']
    elif res == 'computer':
        g['computer_score'] += 1
        g['losses'] += 1
        g['computer_streak'] += 1
        g['player_streak'] = 0
    else:
        g['draws'] += 1

    decisive = g['wins'] + g['losses']
    g['win_rate'] = round(g['wins'] / decisive * 100, 1) if decisive else 0

    r_info = {
        'round': g['rounds_played'],
        'player': choice,
        'computer': comp,
        'winner': res,
        'time': datetime.now().strftime('%H:%M:%S')
    }
    
    g['history'].insert(0, r_info)
    g['history'] = g['history'][:50]

    target = g['match_length'] // 2 + 1
    if g['player_score'] >= target:
        g['match_over'] = True
        g['match_winner'] = 'player'
    elif g['computer_score'] >= target:
        g['match_over'] = True
        g['match_winner'] = 'computer'

    session.modified = True
    return jsonify({
        'round': r_info,
        'scores': {'player': g['player_score'], 'computer': g['computer_score'], 'draws': g['draws']},
        'statistics': {
            'rounds_played': g['rounds_played'], 'wins': g['wins'], 'losses': g['losses'],
            'win_rate': g['win_rate'], 'current_streak': g['player_streak'], 'best_streak': g['best_player_streak']
        },
        'match_over': g['match_over'],
        'match_winner': g['match_winner']
    })

@app.route('/api/new-match', methods=['POST'])
def nm():
    g = get_g()
    g['player_score'] = 0
    g['computer_score'] = 0
    g['draws'] = 0
    g['rounds_played'] = 0
    g['player_streak'] = 0
    g['computer_streak'] = 0
    g['match_over'] = False
    g['match_winner'] = None
    session.modified = True
    return jsonify({'message': 'ok', 'scores': {'player': 0, 'computer': 0, 'draws': 0}})

@app.route('/api/reset', methods=['POST'])
def rst():
    g = get_g()
    d, l = g['difficulty'], g['match_length']
    session['game'] = init_bag()
    session['game']['difficulty'] = d
    session['game']['match_length'] = l
    session.modified = True
    return jsonify({'message': 'reset done', 'scores': {'player': 0, 'computer': 0, 'draws': 0}})

@app.route('/api/settings', methods=['POST'])
def sets():
    g = get_g()
    payload = request.json or {}
    if 'difficulty' in payload and payload['difficulty'] in ['easy', 'normal', 'hard']:
        g['difficulty'] = payload['difficulty']
    if 'match_length' in payload and payload['match_length'] in [1, 3, 5, 7, 9]:
        g['match_length'] = payload['match_length']
    g['player_score'] = 0
    g['computer_score'] = 0
    g['draws'] = 0
    g['rounds_played'] = 0
    g['player_streak'] = 0
    g['computer_streak'] = 0
    g['match_over'] = False
    g['match_winner'] = None
    session.modified = True
    return jsonify({'message': 'updated settings', 'difficulty': g['difficulty'], 'match_length': g['match_length']})

@app.route('/api/history')
def hist():
    return jsonify({'history': get_g()['history']})

@app.errorhandler(404)
def e404(e):
    return jsonify({'error': 'not found bruh'}), 404

if __name__ == '__main__':
    app.run(debug=True)