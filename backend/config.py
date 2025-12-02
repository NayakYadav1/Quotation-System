"""
Configuration for the Quotation Management System.
Define debug mode, session settings, and database path.
"""
import os

class Config:
    """Base configuration."""
    DEBUG = True
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DATABASE = os.path.join(os.path.dirname(__file__), 'quotation.db')
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
