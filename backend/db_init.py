"""
Database initialization script.
Create tables and insert sample data (users, engines, parts, engine_parts).
Run this script once to bootstrap the database:
    .\venv\Scripts\python.exe db_init.py
"""
from database import init_db, get_db_session
from models import User, Engine, Part, EnginePart
from werkzeug.security import generate_password_hash

def init_database():
    """Initialize database with schema and sample data."""
    # Create all tables
    init_db()
    print("✓ Database tables created")
    
    session = get_db_session()
    
    try:
        # Check if data already exists (avoid duplicate inserts)
        if session.query(User).count() > 0:
            print("✓ Database already seeded; skipping data insertion")
            return
        
        # Insert sample users
        admin_user = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            role='admin'
        )
        staff_user = User(
            username='staff1',
            password_hash=generate_password_hash('staff123'),
            role='staff'
        )
        session.add(admin_user)
        session.add(staff_user)
        print("✓ Inserted 2 users (admin, staff1)")
        
        # Insert engines (categories and hierarchical models)
        # Top-level product lines for Industrial Engine
        swing = Engine(category='Industrial Engine', engine_name='Swing')
        ajax = Engine(category='Industrial Engine', engine_name='AJax')
        session.add_all([swing, ajax])
        session.flush()

        # Models under Swing
        bull = Engine(category='Industrial Engine', engine_name='Bull', parent_id=swing.id)
        preet = Engine(category='Industrial Engine', engine_name='Preet', parent_id=swing.id)
        monito = Engine(category='Industrial Engine', engine_name='Monito', parent_id=swing.id)
        session.add_all([bull, preet, monito])

        # Power Generators (as direct models)
        gen1 = Engine(category='Power Generator', engine_name='2R1040')
        gen2 = Engine(category='Power Generator', engine_name='3R1040')
        session.add_all([gen1, gen2])
        session.flush()

        print("✓ Inserted hierarchical engines (product lines + models)")
        
        # Insert parts
        part1 = Part(part_no='P001', part_name='Engine Oil Filter', price=1200.00)
        part2 = Part(part_no='P002', part_name='Hydraulic Pump', price=7500.00)
        part3 = Part(part_no='P003', part_name='Fuel Injector', price=4300.00)
        session.add_all([part1, part2, part3])
        session.flush()
        print("✓ Inserted 3 parts")
        
        # Insert engine_parts mappings (map parts to models)
        model_engines = [bull, preet, monito, gen1, gen2]
        for engine in model_engines:
            for part in [part1, part2, part3]:
                ep = EnginePart(engine_id=engine.id, part_id=part.id)
                session.add(ep)
        print(f"✓ Inserted {len(model_engines)*3} engine_parts mappings")
        
        session.commit()
        print("\n✓✓✓ Database initialized successfully!")
        
    except Exception as e:
        session.rollback()
        print(f"✗ Error during initialization: {e}")
        raise
    finally:
        session.close()

if __name__ == '__main__':
    init_database()
