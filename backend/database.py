"""
Database initialization and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from config import Config

# Create SQLite engine
engine = create_engine(f'sqlite:///{Config.DATABASE}', connect_args={"check_same_thread": False})

# Create sessionmaker
SessionLocal = sessionmaker(bind=engine)

def init_db():
    """Create all tables if they don't exist."""
    Base.metadata.create_all(engine)

def get_db_session():
    """Get a new database session."""
    return SessionLocal()
