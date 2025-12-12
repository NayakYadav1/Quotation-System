from flask import Blueprint, request, session, jsonify
from werkzeug.security import check_password_hash
from database import get_db_session
from models import User
from werkzeug.security import generate_password_hash

def require_login_username():
    username = session.get('username')
    return username

def require_admin():
    if session.get('role') == 'admin':
        return True
    return False

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


@auth_bp.route('/users', methods=['GET'])
def list_users():
    """Admin-only: List all users."""
    if not require_admin():
        return jsonify({'error': 'forbidden'}), 403
    db = get_db_session()
    try:
        users = db.query(User).all()
        result = [{'username': u.username, 'role': u.role} for u in users]
        return jsonify({'users': result}), 200
    finally:
        db.close()


@auth_bp.route('/users', methods=['POST'])
def create_user():
    """Admin-only: Create a new staff/admin user.
    Body: {username, password, role}
    """
    if not require_admin():
        return jsonify({'error': 'forbidden'}), 403
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'staff')
    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400
    db = get_db_session()
    try:
        if db.query(User).filter_by(username=username).first():
            return jsonify({'error': 'username already exists'}), 400
        user = User(username=username, password_hash=generate_password_hash(password), role=role)
        db.add(user)
        db.commit()
        return jsonify({'message': 'user created', 'username': username}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@auth_bp.route('/users/<username>', methods=['PUT'])
def edit_user(username):
    """Admin-only: Edit user's role or password. Body may include `role` and/or `password`."""
    if not require_admin():
        return jsonify({'error': 'forbidden'}), 403
    data = request.json or {}
    role = data.get('role')
    password = data.get('password')
    db = get_db_session()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'user not found'}), 404
        if role:
            user.role = role
        if password:
            user.password_hash = generate_password_hash(password)
        db.commit()
        return jsonify({'message': 'user updated', 'username': username}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@auth_bp.route('/users/<username>', methods=['DELETE'])
def delete_user(username):
    """Admin-only: Delete a user."""
    if not require_admin():
        return jsonify({'error': 'forbidden'}), 403
    db = get_db_session()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'user not found'}), 404
        db.delete(user)
        db.commit()
        return jsonify({'message': 'user deleted'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@auth_bp.route('/users/<username>/set-password', methods=['POST'])
def admin_set_password(username):
    """Admin-only: Set a user's password. Body: {new_password}
    Only admin can set/reset staff passwords per requirements.
    """
    if not require_admin():
        return jsonify({'error': 'forbidden'}), 403
    data = request.json or {}
    new = data.get('new_password')
    if not new:
        return jsonify({'error': 'new_password required'}), 400
    db = get_db_session()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'user not found'}), 404
        user.password_hash = generate_password_hash(new)
        db.commit()
        return jsonify({'message': 'password set'}), 200
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
