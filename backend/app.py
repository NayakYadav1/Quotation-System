"""
Flask main application entry point.
Initialize Flask, register blueprints, configure session.
Run with: .\venv\Scripts\python.exe app.py
"""
from flask import Flask
from flask_session import Session
from config import Config
from database import init_db

# Create Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize session management
Session(app)

# Initialize database
init_db()

# Register blueprints
from routes.auth import auth_bp
from routes.quotations import quotations_bp
app.register_blueprint(auth_bp)
app.register_blueprint(quotations_bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return {'status': 'OK'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
