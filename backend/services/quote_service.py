"""
Quote number generation service.
Generates auto-incrementing quote numbers in format: QTN/TEST/YYYY/INC
where INC is zero-padded to 3 digits and increments per quote per year.
Example: QTN/TEST/2025/001, QTN/TEST/2025/002
"""
from datetime import datetime
from database import get_db_session
from models import Metadata, Engine, EnginePart, Part


def generate_quote_number():
    """
    Generate next quote number for the current year.
    Format: QTN/TEST/YYYY/INC (INC zero-padded to 3 digits)
    """
    session = get_db_session()
    
    try:
        year = datetime.now().year
        key = f'last_quote_increment_{year}'
        
        # Fetch or create metadata entry for this year
        metadata = session.query(Metadata).filter_by(key=key).first()
        
        if metadata:
            # Increment existing counter
            current_inc = int(metadata.value)
            new_inc = current_inc + 1
            metadata.value = str(new_inc)
        else:
            # First quote of the year
            new_inc = 1
            metadata = Metadata(key=key, value='1')
            session.add(metadata)
        
        session.commit()
        
        # Format: QTN/TEST/2025/001
        quote_no = f'QTN/TEST/{year}/{str(new_inc).zfill(3)}'
        return quote_no
        
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def get_categories():
    """Get all unique categories from engines table."""
    session = get_db_session()
    try:
        categories = session.query(Engine.category).distinct().all()
        return [cat[0] for cat in categories]
    finally:
        session.close()


def get_models_by_category(category):
    """Get all engine models for a given category."""
    session = get_db_session()
    try:
        models = session.query(Engine).filter_by(category=category).all()
        return [{'id': m.id, 'name': m.engine_name} for m in models]
    finally:
        session.close()


def get_parts_by_engine(engine_id):
    """Get all parts for a given engine model."""
    session = get_db_session()
    try:
        parts_data = session.query(Part).join(
            EnginePart, EnginePart.part_id == Part.id
        ).filter(EnginePart.engine_id == engine_id).all()
        
        return [
            {'id': p.id, 'part_no': p.part_no, 'part_name': p.part_name, 'price': p.price}
            for p in parts_data
        ]
    finally:
        session.close()
