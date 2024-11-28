@echo off
echo Criando ambiente virtual Python...
python -m venv .venv

echo Ativando ambiente virtual...
call .venv\Scripts\activate

echo Instalando dependências...
pip install -r requirements.txt

echo Configuração concluída! Para iniciar o servidor, execute:
echo cd server
echo python main.py
pause
