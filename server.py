from flask import Flask, send_from_directory
import os

app = Flask(__name__)

# Rota principal que serve o index.html
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Rota para servir arquivos estáticos da pasta engine
@app.route('/engine/<path:path>')
def serve_engine_files(path):
    return send_from_directory('engine', path)

# Rota para servir qualquer outro arquivo estático
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    print("Servidor iniciado em http://localhost:5000")
    print("Pressione Ctrl+C para parar o servidor")
    app.run(host='0.0.0.0', port=5000, debug=True)
