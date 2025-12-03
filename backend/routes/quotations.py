"""
Quotation routes: Create, view, and manage quotations.
Endpoints:
  POST   /api/quotations/create     - Create new quotation header
  GET    /api/quotations            - List all quotations
  GET    /api/quotations/<id>       - Get quotation detail
  GET    /api/quotations/categories - Get all categories
  GET    /api/quotations/models/<category> - Get models for category
  GET    /api/quotations/parts/<engine_id> - Get parts for engine
"""
from flask import Blueprint, request, session, jsonify
from datetime import datetime
from database import get_db_session
from models import Quotation, QuotationItem, User
from services.quote_service import (
    generate_quote_number,
    get_categories,
    get_models_by_category,
    build_engine_tree_for_category,
    get_parts_by_engine
)

quotations_bp = Blueprint('quotations', __name__, url_prefix='/api/quotations')


# ========== PUBLIC ENDPOINTS (for dropdown data) ==========

@quotations_bp.route('/categories', methods=['GET'])
def get_all_categories():
    """Get all product categories."""
    try:
        categories = get_categories()
        return jsonify({'categories': categories}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quotations_bp.route('/models/<category>', methods=['GET'])
def get_models(category):
    """Get models for a given category."""
    try:
        models = get_models_by_category(category)
        return jsonify({'models': models}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quotations_bp.route('/tree/<category>', methods=['GET'])
def get_tree(category):
    """Return nested engine tree for the given category."""
    try:
        tree = build_engine_tree_for_category(category)
        return jsonify({'tree': tree}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@quotations_bp.route('/parts/<engine_id>', methods=['GET'])
def get_parts(engine_id):
    """Get parts for a given engine model."""
    try:
        parts = get_parts_by_engine(int(engine_id))
        return jsonify({'parts': parts}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========== PROTECTED ENDPOINTS (require session) ==========

def require_login():
    """Check if user is logged in."""
    if not session.get('username'):
        return None
    return session.get('username')


@quotations_bp.route('/create', methods=['POST'])
def create_quotation():
    """
    Create a new quotation.
    Body JSON:
    {
      "customer": "Customer Name",
      "address": "Customer Address",
      "items": [
        {"part_id": 1, "qty": 2, "price": 1200},
        ...
      ],
      "labour": 500,
      "discount_percent": 10
    }
    """
    username = require_login()
    if not username:
        return jsonify({'error': 'unauthorized'}), 401
    
    data = request.json or {}
    customer = data.get('customer')
    address = data.get('address')
    items = data.get('items', [])
    labour = float(data.get('labour', 0))
    discount_percent = float(data.get('discount_percent', 0))
    
    if not customer or not address:
        return jsonify({'error': 'customer and address required'}), 400
    
    db = get_db_session()
    try:
        # Generate quote number
        quote_no = generate_quote_number()
        
        # Calculate total
        subtotal = sum(item['qty'] * item['price'] for item in items)
        total = (subtotal + labour) * (1 - discount_percent / 100)
        
        # Create quotation
        quotation = Quotation(
            quote_no=quote_no,
            customer=customer,
            address=address,
            date=datetime.now(),
            labour=labour,
            discount_percent=discount_percent,
            total=round(total, 2),
            created_by=username
        )
        db.add(quotation)
        db.flush()  # Get quotation ID
        
        # Add line items
        for item in items:
            line = QuotationItem(
                quotation_id=quotation.id,
                part_id=item['part_id'],
                qty=float(item['qty']),
                price=float(item['price'])
            )
            db.add(line)
        
        db.commit()
        
        return jsonify({
            'message': 'quotation created',
            'quote_no': quote_no,
            'id': quotation.id,
            'total': quotation.total
        }), 201
        
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@quotations_bp.route('', methods=['GET'])
def list_quotations():
    """List all quotations (accessible to all logged-in users)."""
    username = require_login()
    if not username:
        return jsonify({'error': 'unauthorized'}), 401
    
    db = get_db_session()
    try:
        quotations = db.query(Quotation).order_by(Quotation.date.desc()).all()
        result = [
            {
                'id': q.id,
                'quote_no': q.quote_no,
                'customer': q.customer,
                'date': q.date.strftime('%Y-%m-%d'),
                'total': round(q.total, 2),
                'created_by': q.created_by
            }
            for q in quotations
        ]
        return jsonify({'quotations': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@quotations_bp.route('/<int:qid>', methods=['GET'])
def get_quotation(qid):
    """Get quotation detail with all line items."""
    username = require_login()
    if not username:
        return jsonify({'error': 'unauthorized'}), 401
    
    db = get_db_session()
    try:
        quotation = db.query(Quotation).filter_by(id=qid).first()
        if not quotation:
            return jsonify({'error': 'quotation not found'}), 404
        
        items = db.query(QuotationItem).filter_by(quotation_id=qid).all()
        
        result = {
            'id': quotation.id,
            'quote_no': quotation.quote_no,
            'customer': quotation.customer,
            'address': quotation.address,
            'date': quotation.date.strftime('%Y-%m-%d'),
            'labour': round(quotation.labour, 2),
            'discount_percent': quotation.discount_percent,
            'total': round(quotation.total, 2),
            'created_by': quotation.created_by,
            'items': [
                {
                    'part_id': i.part_id,
                    'qty': i.qty,
                    'price': round(i.price, 2)
                }
                for i in items
            ]
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
