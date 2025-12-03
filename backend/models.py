"""
SQLAlchemy ORM models for the Quotation Management System.
Define: User, Engine, Part, EnginePart, Quotation, QuotationItem, Metadata
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User table for authentication."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default='staff')  # 'admin' or 'staff'


class Engine(Base):
    """Engine/Product table."""
    __tablename__ = 'engines'
    
    id = Column(Integer, primary_key=True)
    category = Column(String(100), nullable=False)  # e.g., 'Industrial Engine', 'Power Generator'
    engine_name = Column(String(100), nullable=False)  # e.g., 'Monito', '2R1040'
    parent_id = Column(Integer, ForeignKey('engines.id'), nullable=True)  # For hierarchy if needed


class Part(Base):
    """Parts/Components table."""
    __tablename__ = 'parts'
    
    id = Column(Integer, primary_key=True)
    part_no = Column(String(50), unique=True, nullable=False)  # e.g., 'P001'
    part_name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)  # Default price (not modified during quote)


class EnginePart(Base):
    """Mapping between Engine and Part (many-to-many)."""
    __tablename__ = 'engine_parts'
    
    id = Column(Integer, primary_key=True)
    engine_id = Column(Integer, ForeignKey('engines.id'), nullable=False)
    part_id = Column(Integer, ForeignKey('parts.id'), nullable=False)


class Quotation(Base):
    """Quotation header table."""
    __tablename__ = 'quotations'
    
    id = Column(Integer, primary_key=True)
    quote_no = Column(String(50), unique=True, nullable=False)  # e.g., 'QTN/TEST/2025/001'
    customer = Column(String(200), nullable=False)
    address = Column(Text, nullable=False)
    date = Column(DateTime, nullable=False, default=datetime.now)
    labour = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)
    total = Column(Float, default=0.0)  # Net total after labour & discount
    created_by = Column(String(50), nullable=False)  # Username who created it


class QuotationItem(Base):
    """Line items in a quotation."""
    __tablename__ = 'quotation_items'
    
    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey('quotations.id'), nullable=False)
    part_id = Column(Integer, ForeignKey('parts.id'), nullable=True)
    qty = Column(Float, nullable=False)
    price = Column(Float, nullable=False)  # Overridden price for this quotation only
    # For ad-hoc/custom parts added during quotation (not present in `parts` table)
    part_no = Column(String(50), nullable=True)
    part_name = Column(String(200), nullable=True)


class Metadata(Base):
    """Key-value store for system metadata (e.g., last quote increment)."""
    __tablename__ = 'metadata'
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)  # e.g., 'last_quote_increment_2025'
    value = Column(String(255), nullable=False)
