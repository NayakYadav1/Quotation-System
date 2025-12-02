from flask import Blueprint, request, session, jsonify
from werkzeug.security import check_password_hash
from database import get_db_session
from models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400

    db = get_db_session()
    user = db.query(User).filter_by(username=username).first()
    db.close()

    if not user:
        return jsonify({'error': 'invalid credentials'}), 401

    if not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'invalid credentials'}), 401

    # Set session
    session.clear()
    session['username'] = user.username
    session['role'] = user.role

    return jsonify({'message': 'login successful', 'username': user.username, 'role': user.role}), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'logged out'}), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    username = session.get('username')
    role = session.get('role')
    if not username:
        return jsonify({'user': None}), 200
    return jsonify({'user': {'username': username, 'role': role}}), 200
