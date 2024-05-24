from flask import Flask, request, jsonify, session, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_session import Session
from werkzeug.utils import secure_filename
import os
from config import ApplicationConfig
from models import db, User, Package, Admin, Client, Invoice, PackageRequest, RequestDetail, PackageDetail, Detail, Post, Reply, Category 
from flask_login import login_user, LoginManager, login_required, logout_user, current_user
from datetime import datetime
from pytz import timezone
from functools import wraps
from flask import request, jsonify
import pytz

app = Flask(__name__)
app.config.from_object(ApplicationConfig)
app.config['UPLOAD_FOLDER'] = 'C:\\Users\\wanna\\IMCC_Bantu_1to1\\upload\\invoice'

bcrypt = Bcrypt(app)
CORS(app, origins="http://localhost:3000", supports_credentials=True)
server_session = Session(app)
db.init_app(app)

with app.app_context():
    db.create_all()

login_manager = LoginManager()
login_manager.init_app(app)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Unauthorized"}), 401
        if not isinstance(current_user, Admin):
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return decorated_function

@login_manager.user_loader
def load_user(user_id):
	return User.query.get(user_id)

@app.route('/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        email = data["email"]
        password = data["password"]
        name = data["name"]
        matric_number = data.get("matricNumber")  
        phone_number = data["phoneNumber"]
        school = data["school"]
        year_of_study = data["yearOfStudy"]
        
        if email.endswith("@usm.my"):
            role = "admin"
        else:
            role = "client"

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        if role == "admin":
            new_user = Admin(
                email=email, 
                password=hashed_password, 
                name=name, 
                phone_number=phone_number
            )
        else:
            new_user = Client(
                email=email, 
                password=hashed_password, 
                name=name, 
                matric_number=matric_number, 
                phone_number=phone_number, 
                school=school, 
                year_of_study=year_of_study
            )

        db.session.add(new_user)
        db.session.commit()

        session["user_id"] = new_user.id

        return jsonify({
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "matric_number": getattr(new_user, 'matric_number', None),  
            "phone_number": new_user.phone_number,
            "school": getattr(new_user, 'school', None),  
            "year_of_study": getattr(new_user, 'year_of_study', None),  
            "role": role  
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@app.route('/login', methods=['POST'])
def login_user_route():
    try:
        data = request.json
        email = data["email"]
        password = data["password"]

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        login_user(user)

        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "phone_number": user.phone_number
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/@me')
@login_required
def get_current_user():
    user = current_user
    if isinstance(user, Admin):
        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "phone_number": user.phone_number
        })
    elif isinstance(user, Client):
        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "matric_number": user.matric_number,
            "phone_number": user.phone_number,
            "school": user.school,
            "year_of_study": user.year_of_study
        })
    else:
        return jsonify({"error": "Unknown user type"}), 400

@app.route('/getUserRole', methods=['GET'])
@login_required
def get_user_role():
    user = current_user
    user_role = user.discriminator  
    return jsonify({"role": user_role})

@app.route("/logout", methods=["POST"])
@login_required
def logout_user_route():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/packageListing', methods=['GET'])
@login_required
def get_package_listing():
    packages = Package.query.all()
    user = current_user
    package_list = [{
        "id": package.id,
        "title": package.title,
        "description": package.description,
        "price": package.price,
        "user_id": user.id,  
    } for package in packages]

    return jsonify(package_list)

@app.route('/uploadInvoice', methods=['POST'])
@login_required
def upload_invoice():
    user = current_user
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        invoice_id = request.form.get('invoice_id')  

        if invoice_id:
            existing_invoice = Invoice.query.get(invoice_id)
            if not existing_invoice:
                return jsonify({'error': 'Invoice not found'}), 404

            existing_invoice.file_name = filename
            existing_invoice.file_path = file_path
            existing_invoice.file_size = os.path.getsize(file_path)
            existing_invoice.invoice_status = "Pending Payment"
            existing_invoice.remarks = ""
            
            db.session.commit()

            return jsonify({'success': True, 'message': 'File re-uploaded successfully', 'file_name': filename}), 200
        else:
            package_id = request.form.get('package_id')

            malaysia_timezone = pytz.timezone('Asia/Kuala_Lumpur')
            current_time_malaysia = datetime.now(malaysia_timezone)

            new_package_request = PackageRequest(
                package_id=package_id,
                user_id=user.id,
                submitted_at=current_time_malaysia,
                status="Created"
            )
            db.session.add(new_package_request)
            db.session.commit()

            new_invoice = Invoice(
                file_name=filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                user_id=user.id,
                package_id=package_id,
                package_request_id=new_package_request.request_id,
                invoice_status="Pending Payment",
                remarks=""
            )
            db.session.add(new_invoice)
            db.session.commit()

            return jsonify({'success': True, 'message': 'File uploaded successfully', 'file_name': filename}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/getInvoiceStatus', methods=['GET'])
@login_required
def get_invoice_status():
    user = current_user
    user_id = user.id
    if not user_id: 
        return jsonify({"error": "Unauthorized"}), 401
    
    invoices = Invoice.query.filter_by(user_id=user_id).order_by(Invoice.uploaded_datetime.desc()).all()
    if not invoices:
        return jsonify({"message": "No uploaded invoices"}), 200

    invoice_list = []
    for invoice in invoices:
        malaysia_time = invoice.uploaded_datetime.astimezone(timezone('Asia/Kuala_Lumpur'))
        invoice_list.append({
            "invoice_status": invoice.invoice_status,
            "package": invoice.package.title,
            "uploaded_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": invoice.file_name,
            "user_name": invoice.user.name,
            "remarks": invoice.remarks,
            "invoice_id": invoice.invoice_id,
            "package_request_id": invoice.package_request_id,
            "package_request_status": invoice.package_request.status if invoice.package_request else None  
        })

    return jsonify(invoice_list)

@app.route('/getAllInvoiceStatus', methods=['GET'])
@login_required
@admin_required
def get_all_invoice_status():
    invoices = Invoice.query.order_by(Invoice.uploaded_datetime.desc()).all()
    if not invoices:
        return jsonify({"message": "No uploaded invoices"}), 200

    invoice_list = []
    for invoice in invoices:
        malaysia_time = invoice.uploaded_datetime.astimezone(timezone('Asia/Kuala_Lumpur'))
        invoice_list.append({
            "invoice_status": invoice.invoice_status,
            "package": invoice.package.title,
            "user_name": invoice.user.name,
            "uploaded_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": invoice.file_name,
            "matric_number": invoice.user.matric_number,
            "invoice_id": invoice.invoice_id,
            "remarks": invoice.remarks,
            "package_request_id": invoice.package_request_id,
            "package_request_status": invoice.package_request.status if invoice.package_request else None
        })

    return jsonify(invoice_list)

@app.route('/viewInvoiceFile/<filename>', methods=['GET'])
@login_required
@admin_required
def view_invoice_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    
@app.route('/updateInvoiceStatus', methods=['POST'])
@login_required
@admin_required
def update_invoice_status():
    data = request.json
    invoice_id = data.get('invoice_id')
    new_status = data.get('invoice_status')

    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    invoice.invoice_status = new_status

    if new_status == 'Payment Rejected':
        remarks = data.get('remarks')
        invoice.remarks = remarks
    else:
        invoice.remarks = None

    db.session.commit()

    return jsonify({"message": "Invoice status updated successfully"}), 200

@app.route('/getPackageDetails/<int:invoice_id>', methods=['GET'])
@login_required
def get_package_details(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    if invoice.invoice_status != "Payment Received":
        return jsonify({"error": "Invoice is not approved"}), 403

    package = Package.query.get_or_404(invoice.package_id)
    package_details = PackageDetail.query.filter_by(package_id=package.id).all()
    details = [{"detail_name": pd.detail.detail_name, "detail_type": pd.detail.detail_type} for pd in package_details]

    return jsonify({"package_details": details})

@app.route('/submitPackageRequest', methods=['POST'])
@login_required
def submit_package_request():
    data = request.get_json()
    package_request_id = data.get('package_request_id')
    details = data.get('details', [])

    package_request = PackageRequest.query.filter_by(request_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    if package_request.status == 'Pending Approval':
        return jsonify({"error": "Package request has already been submitted"}), 400

    package_request.status = 'Pending Approval'
    db.session.add(package_request)
    db.session.commit()

    for detail in details:
        detail_name = detail.get('detail_name')
        detail_value = detail.get('value')
        detail_entry = Detail.query.filter_by(detail_name=detail_name).first()
        if detail_entry:
            request_detail = RequestDetail(
                request_id=package_request.request_id,
                detail_id=detail_entry.detail_id,
                value=detail_value
            )
            db.session.add(request_detail)

    db.session.commit()
    return jsonify({"message": "Package request submitted successfully", "package_request": package_request.request_id}), 201

@app.route('/getPackageRequest/<int:request_id>', methods=['GET'])
@login_required
def get_package_request(request_id):
    package_request = PackageRequest.query.filter_by(request_id=request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404
    
    details = [
        {
            "detail_name": detail.detail.detail_name,
            "value": detail.value
        }
        for detail in package_request.details
    ]

    response = {
        "package_id": package_request.package_id,
        "submitted_at": package_request.submitted_at,
        "status": package_request.status,
        "details": details
    }
    
    return jsonify(response), 200

@app.route('/getUserPackageRequests', methods=['GET'])
@login_required
def get_user_package_requests():
    user_id = current_user.id
    package_requests = PackageRequest.query.filter_by(user_id=user_id).all()
    result = []
    for request in package_requests:
        details = RequestDetail.query.filter_by(request_id=request.request_id).all()
        detail_list = [{"detail_name": detail.detail.detail_name, "value": detail.value} for detail in details]
        result.append({
            "request_id": request.request_id,
            "package_name": request.package.title,
            "submitted_at": request.submitted_at,
            "status": request.status,
            "details": detail_list
        })
    return jsonify(result)

@app.route('/getAllPackageRequests', methods=['GET'])
@login_required
@admin_required
def get_all_package_requests():
    package_requests = PackageRequest.query.all()
    result = []
    for request in package_requests:
        details = RequestDetail.query.filter_by(request_id=request.request_id).all()
        detail_list = [{"detail_name": detail.detail.detail_name, "value": detail.value} for detail in details]
        result.append({
            "request_id": request.request_id,
            "package_name": request.package.title,
            "user_name": request.user.name,
            "submitted_at": request.submitted_at,
            "status": request.status,
            "details": detail_list
        })
    return jsonify(result)

@app.route('/updatePackageRequestStatus', methods=['POST'])
@login_required
@admin_required  
def update_package_request_status():
    data = request.get_json()
    request_id = data.get('request_id')
    new_status = data.get('status')

    package_request = PackageRequest.query.get(request_id)
    if not package_request:
        return jsonify({"message": "Package request not found"}), 404

    if package_request.status != 'Pending Approval':
        return jsonify({"message": "Only 'Pending Approval' package requests can be updated by admin"}), 400

    package_request.status = new_status
    db.session.commit()

    return jsonify({"message": "Package request status updated successfully"}), 200

@app.route('/submitOrUpdatePackageRequest', methods=['POST'])
@login_required
def submit_or_update_package_request():
    data = request.get_json()
    package_request_id = data.get('package_request_id')
    new_status = data.get('status', 'Pending Approval')  
    details = data.get('details', [])

    package_request = PackageRequest.query.filter_by(request_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    package_request.status = new_status
    db.session.add(package_request)
    db.session.commit()

    if new_status == 'Rejected' and details:
        RequestDetail.query.filter_by(request_id=package_request_id).delete()
        db.session.commit()

    for detail in details:
        detail_name = detail.get('detail_name')
        detail_value = detail.get('value')
        detail_entry = Detail.query.filter_by(detail_name=detail_name).first()
        if detail_entry:
            request_detail = RequestDetail(
                request_id=package_request.request_id,
                detail_id=detail_entry.detail_id,
                value=detail_value
            )
            db.session.add(request_detail)

    db.session.commit()

    return jsonify({"message": "Package request updated successfully", "package_request": package_request.request_id}), 201

@app.route('/getPosts', methods=['GET'])
def get_posts():
    try:
        # Query all posts from the database
        posts = Post.query.all()

        # Serialize the posts to JSON format
        posts_data = [{
            'post_id': post.post_id,
            'title': post.title,
            'content': post.content,
            'category': post.category.name,  # Access category name through the relationship
            'user': post.user.name  # Access user name through the relationship
            # Add more fields as needed
        } for post in posts]

        # Return the JSON response
        return jsonify(posts_data), 200
    except Exception as e:
        # Handle any errors and return an appropriate response
        return jsonify({'error': str(e)}), 500

@app.route('/getCategories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    categories_list = [{'id': category.category_id, 'name': category.name} for category in categories]
    return jsonify(categories_list)

@app.route('/createPost', methods=['POST'])
@login_required
def create_post():
    data = request.json
    title = data.get('title')
    content = data.get('content')
    category_id = data.get('category_id')

    user_id = current_user.id

    new_post = Post(title=title, content=content, category_id=category_id, user_id=user_id)
    db.session.add(new_post)
    db.session.commit()

    post_data = {
        'post_id': new_post.post_id,
        'title': new_post.title,
        'content': new_post.content,
        'name': new_post.user.name  # Assuming the user relationship is set up correctly
        # Add more fields as needed
    }

    return jsonify(post_data), 201
    
@app.route('/createReply', methods=['POST'])
@login_required
def create_reply():
    data = request.json
    content = data.get('content')
    post_id = data.get('post_id')

    user_id = current_user.id

    new_reply = Reply(content=content, user_id=user_id, post_id=post_id)
    db.session.add(new_reply)
    db.session.commit()

    return jsonify(new_reply.to_dict()), 201

@app.route('/getReplies/<int:post_id>', methods=['GET'])
def get_replies(post_id):
    try:
        # Query replies for the specified post
        replies = Reply.query.filter_by(post_id=post_id).all()

        # Serialize the replies to JSON format
        replies_data = [reply.to_dict() for reply in replies]

        # Return the JSON response
        return jsonify(replies_data), 200
    except Exception as e:
        # Handle any errors and return an appropriate response
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)