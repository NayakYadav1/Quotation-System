"""
Flask main application entry point.
Initialize Flask, register blueprints, configure session.
Run with: .\venv\Scripts\python.exe app.py
"""
from flask import Flask
from flask_session import Session
from config import Config
from database import init_db
from werkzeug.exceptions import HTTPException
import logging

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


# Centralized error handlers to return JSON responses
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    response = e.get_response()
    # Use the description if available, otherwise the name
    message = getattr(e, 'description', None) or getattr(e, 'name', 'Error')
    return {'error': message}, e.code


@app.errorhandler(Exception)
def handle_exception(e):
    # Log the error
    logging.exception('Unhandled exception:')
    # In debug mode return the error string for easier local debugging
    if app.config.get('DEBUG'):
        return {'error': str(e)}, 500
    # Generic message for production
    return {'error': 'Internal server error'}, 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return {'status': 'OK'}, 200

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
