import time
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Armazenamento em memória para dados da sessão de teste
registered_users = {
    's002_cmu': {
        'target_password': '.tie5Roanl',
        'enrolled': True,
        'average_hold_ms': 120.0,
        'samples': []
    }
}


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'Keystroke Dynamics Biometrics Mock API',
        'timestamp': time.time()
    }), 200


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    target_password = data.get('targetPassword')
    confirm_password = data.get('confirmPassword')

    if not username or not target_password:
        return jsonify({
            'success': False,
            'message': 'Campos obrigatórios ausentes: username e targetPassword.'
        }), 400

    if target_password != confirm_password:
        return jsonify({
            'success': False,
            'message': 'A confirmação de senha não confere.'
        }), 400

    registered_users[username] = {
        'target_password': target_password,
        'enrolled': False,
        'average_hold_ms': 120.0,
        'samples': []
    }

    return jsonify({
        'success': True,
        'message': f"Usuário '{username}' cadastrado com sucesso."
    }), 201


@app.route('/api/enrollment', methods=['POST'])
def enrollment():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    samples = data.get('samples', [])
    password_length = data.get('passwordLength', 0)

    if not username:
        return jsonify({
            'success': False,
            'message': 'Identificador de usuário não informado.'
        }), 400

    if len(samples) < 5:
        return jsonify({
            'success': False,
            'message': f"Número insuficiente de amostras: recebidas {len(samples)}, necessárias 5."
        }), 400

    # Calcula tempo médio de Hold Time das amostras coletadas
    all_holds = []
    for sample in samples:
        features = sample.get('features', {})
        for key, val in features.items():
            if key.startswith('H.'):
                all_holds.append(val * 1000)  # converte de segundos para ms

    avg_hold = sum(all_holds) / len(all_holds) if all_holds else 120.0

    if username not in registered_users:
        registered_users[username] = {
            'target_password': '',
            'enrolled': True,
            'average_hold_ms': avg_hold,
            'samples': samples
        }
    else:
        registered_users[username]['enrolled'] = True
        registered_users[username]['average_hold_ms'] = avg_hold
        registered_users[username]['samples'] = samples

    return jsonify({
        'success': True,
        'message': f"Lote com {len(samples)} amostras biométricas recebido e modelo calibrado para '{username}'.",
        'samplesRegistered': len(samples),
        'calculatedAverageHoldMs': round(avg_hold, 1)
    }), 200


@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '')
    password_attempt = data.get('passwordAttempt', '')
    sample = data.get('sample', {})
    selected_algorithm = data.get('selectedAlgorithm', 'RANDOM_FOREST_HPO')

    user_info = registered_users.get(username, {
        'target_password': '.tie5Roanl',
        'average_hold_ms': 120.0
    })

    # Validação da senha textual
    target_pwd = user_info.get('target_password')
    if target_pwd and password_attempt != target_pwd:
        return jsonify({
            'decision': 'INVALID_CREDENTIALS',
            'confidenceScore': 0.0,
            'thresholdScore': 0.75,
            'algorithm': selected_algorithm,
            'inferenceTimeMs': 2.0,
            'message': 'A senha textual digitada está incorreta.',
            'userAverageHoldTimeMs': int(user_info.get('average_hold_ms', 120)),
            'attemptAverageHoldTimeMs': 0
        }), 200

    # Extrai o Hold Time médio da tentativa atual
    raw_timings = sample.get('rawTimings', [])
    holds = []
    for item in raw_timings:
        press = item.get('pressTime', 0)
        release = item.get('releaseTime', press)
        holds.append(release - press)

    attempt_avg_hold = sum(holds) / len(holds) if holds else 120.0
    user_avg_hold = user_info.get('average_hold_ms', 120.0)

    # Heurística biométrica para a Mock API:
    # Se a diferença entre a média de hold da tentativa e a média calibrada for pequena (<= 75 ms)
    # e dentro da faixa fisiológica humana padrão (45ms a 280ms) -> Genuíno.
    hold_diff = abs(attempt_avg_hold - user_avg_hold)
    is_genuine = (hold_diff <= 75.0) and (45.0 <= attempt_avg_hold <= 280.0)

    if is_genuine:
        decision = 'GENUINE'
        confidence_score = round(max(0.85, 0.98 - (hold_diff / 500.0)), 3)
        message = 'Padrão biométrico compatível com o perfil legítimo cadastrado.'
    else:
        decision = 'IMPOSTOR'
        confidence_score = round(min(0.60, max(0.20, 0.60 - (hold_diff / 400.0))), 3)
        message = 'Acesso bloqueado: o ritmo temporal de digitação diverge significativamente do perfil legítimo.'

    return jsonify({
        'decision': decision,
        'confidenceScore': confidence_score,
        'thresholdScore': 0.75,
        'algorithm': selected_algorithm,
        'inferenceTimeMs': 12.8,
        'message': message,
        'userAverageHoldTimeMs': int(round(user_avg_hold)),
        'attemptAverageHoldTimeMs': int(round(attempt_avg_hold))
    }), 200


if __name__ == '__main__':
    print("Mock API de Biometria por Dinâmica de Digitação ativa em http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
