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
from models import Quotation, QuotationItem, User, Part
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


@quotations_bp.route('/parts/search', methods=['GET'])
def search_parts():
    """Search parts across the entire parts DB by query string `q`.
    Returns JSON list of parts with id, part_no, part_name, price.
    """
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'parts': []}), 200
    db = get_db_session()
    try:
        # Case-insensitive partial match on part_no or part_name
        pattern = f"%{q}%"
        parts = db.query(Part).filter(
            (Part.part_no.ilike(pattern)) | (Part.part_name.ilike(pattern))
        ).limit(50).all()
        result = [
            {'id': p.id, 'part_no': p.part_no, 'part_name': p.part_name, 'price': round(p.price, 2)}
            for p in parts
        ]
        return jsonify({'parts': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


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
    # Labour is not collected from UI (not shown to customer). Keep internal 0.
    labour = 0.0
    discount_percent = float(data.get('discount_percent', 0))
    # Optionally accept date from frontend (YYYY-MM-DD)
    date_str = data.get('date')
    quote_date = None
    if date_str:
        try:
            quote_date = datetime.strptime(date_str, '%Y-%m-%d')
        except Exception:
            quote_date = None
    
    if not customer or not address:
        return jsonify({'error': 'customer and address required'}), 400
    # Validate items: qty >= 1 and price >= 0
    for it in items:
        try:
            q = float(it.get('qty', 0))
            p = float(it.get('price', 0))
        except Exception:
            return jsonify({'error': 'invalid item qty/price'}), 400
        if q < 1 or p < 0:
            return jsonify({'error': 'item qty must be >=1 and price >=0'}), 400
    
    db = get_db_session()
    try:
        # Generate quote number
        quote_no = generate_quote_number()
        
        # Calculate totals: apply discount first, then VAT(13%) on discounted subtotal
        subtotal = sum(float(item.get('qty', 0)) * float(item.get('price', 0)) for item in items)
        discount_amount = subtotal * (discount_percent / 100.0)
        discounted_subtotal = subtotal - discount_amount
        vat_amount = discounted_subtotal * 0.13
        total = discounted_subtotal + vat_amount
        
        # Create quotation
        quotation = Quotation(
            quote_no=quote_no,
            customer=customer,
            address=address,
            date=quote_date or datetime.now(),
            labour=labour,
            discount_percent=discount_percent,
            total=round(total, 2),
            created_by=username
        )
        db.add(quotation)
        db.flush()  # Get quotation ID
        
        # Add line items (support ad-hoc custom parts with part_no/part_name)
        for item in items:
            pid = item.get('part_id')
            # Normalize None/empty
            if pid in (None, '', 0):
                pid = None
            line = QuotationItem(
                quotation_id=quotation.id,
                part_id=pid,
                qty=float(item.get('qty', 0)),
                price=float(item.get('price', 0)),
                part_no=item.get('part_no'),
                part_name=item.get('part_name')
            )
            db.add(line)
        
        db.commit()
        
        return jsonify({
            'message': 'quotation created',
            'quote_no': quote_no,
            'id': quotation.id,
            'total': quotation.total,
            'subtotal': round(subtotal, 2),
            'vat': round(vat_amount, 2),
            'discount_amount': round(discount_amount, 2)
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
        # Pagination params
        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 20))
        except Exception:
            page = 1
            per_page = 20
        if per_page <= 0:
            per_page = 20

        # Return all quotations for admin users; staff see only their own
        user = db.query(User).filter_by(username=username).first()
        query = db.query(Quotation)
        if not (user and user.role == 'admin'):
            query = query.filter_by(created_by=username)
        total = query.count()
        quotations = query.order_by(Quotation.date.desc()).offset((page-1)*per_page).limit(per_page).all()

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
        return jsonify({'quotations': result, 'page': page, 'per_page': per_page, 'total': total}), 200
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
            # Labour is internal; still stored but not shown in UI by default
            'labour': round(quotation.labour, 2),
            'discount_percent': quotation.discount_percent,
            'total': round(quotation.total, 2),
            'created_by': quotation.created_by,
            'items': [
                {
                    'part_id': i.part_id,
                    'part_no': i.part_no,
                    'part_name': i.part_name,
                    'qty': i.qty,
                    'price': round(i.price, 2)
                }
                for i in items
            ]
        }
        # Enrich items: if part_name missing but part_id present, fetch from parts table
        for idx, it in enumerate(result['items']):
            if (not it.get('part_name')) and it.get('part_id'):
                try:
                    p = db.query(Part).filter_by(id=it.get('part_id')).first()
                    if p:
                        it['part_name'] = p.part_name
                        it['part_no'] = p.part_no
                except Exception:
                    pass
        # compute subtotal/discount/vat for the quotation detail response
        subtotal = sum((it.get('qty') or 0) * (it.get('price') or 0) for it in result['items'])
        discount_amount = subtotal * (quotation.discount_percent / 100.0)
        discounted_subtotal = subtotal - discount_amount
        vat_amount = discounted_subtotal * 0.13
        result['subtotal'] = round(subtotal, 2)
        result['discount_amount'] = round(discount_amount, 2)
        result['vat'] = round(vat_amount, 2)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
