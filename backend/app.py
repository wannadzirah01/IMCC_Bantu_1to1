from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_session import Session
from werkzeug.utils import secure_filename
import os
from config import ApplicationConfig
from models import db, User, Package, Admin, Client, Invoice
from flask_login import login_user, LoginManager, login_required, logout_user, current_user
from datetime import datetime
from pytz import timezone
from functools import wraps
from flask import request, jsonify

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
        matric_number = data.get("matricNumber")  # Use get to avoid KeyError
        phone_number = data["phoneNumber"]
        school = data["school"]
        year_of_study = data["yearOfStudy"]
        
        # Determine the role based on the email domain
        if email.endswith("@usm.my"):
            role = "admin"
        else:
            role = "client"

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # Create either an Admin or Client based on the determined role
        if role == "admin":
            new_user = Admin(
                email=email, password=hashed_password, name=name, 
                phone_number=phone_number
            )
        else:
            new_user = Client(
                email=email, password=hashed_password, name=name, 
                matric_number=matric_number, phone_number=phone_number, 
                school=school, year_of_study=year_of_study
            )

        db.session.add(new_user)
        db.session.commit()

        session["user_id"] = new_user.id

        return jsonify({
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "matric_number": getattr(new_user, 'matric_number', None),  # Safely get matric_number attribute
            "phone_number": new_user.phone_number,
            "school": getattr(new_user, 'school', None),  # Safely get school attribute
            "year_of_study": getattr(new_user, 'year_of_study', None),  # Safely get year_of_study attribute
            "role": role  # Include role in response
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
        # For Admin, only display email, name, and phone number
        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "phone_number": user.phone_number
        })
    elif isinstance(user, Client):
        # For Client, display all attributes
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
        # Handle other user types if needed
        return jsonify({"error": "Unknown user type"}), 400

@app.route('/getUserRole', methods=['GET'])
@login_required
def get_user_role():
    user = current_user
    user_role = user.discriminator  # Access the discriminator field
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
        # Check if 'file' exists in request files
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']

        # Check if filename is empty (no file selected)
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        invoice_id = request.form.get('invoice_id')  # Get the invoice_id from the form data

        try:
            if invoice_id:  # If invoice_id is provided, it's a re-upload
                existing_invoice = Invoice.query.get(invoice_id)
                if existing_invoice:
                    # Update the existing invoice
                    existing_invoice.file_name = filename
                    existing_invoice.file_path = file_path
                    existing_invoice.file_size = os.path.getsize(file_path)
                    existing_invoice.invoice_status = "Pending Approval"
                    existing_invoice.remarks = ""
                else:
                    return jsonify({'error': 'Invoice not found'}), 404
            else:  # If invoice_id is not provided, it's a new upload
                new_invoice = Invoice(
                    file_name=filename,
                    file_path=file_path,
                    file_size=os.path.getsize(file_path),
                    user_id=user.id,
                    package_id=request.form['package_id'],
                    invoice_status="Pending Approval",
                    remarks=""
                )
                db.session.add(new_invoice)

            db.session.commit()
            return jsonify({'success': True, 'message': 'File uploaded successfully', 'file_name': filename}), 201
        except Exception as e:
            # Rollback if any error occurs during database operation
            db.session.rollback()
            # Delete the uploaded file if the database operation fails
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': str(e)}), 500
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
        # Convert uploaded_datetime to Malaysia time
        malaysia_time = invoice.uploaded_datetime.astimezone(timezone('Asia/Kuala_Lumpur'))
        invoice_list.append({
            "invoice_status": invoice.invoice_status,
            "package": invoice.package.title,
            "uploaded_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": invoice.file_name,
            "user_name": invoice.user.name,
            "remarks": invoice.remarks,
            "invoice_id": invoice.invoice_id
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
            "remarks": invoice.remarks
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

    # Update the status of the invoice
    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    invoice.invoice_status = new_status

    # If the status is "Rejected", include a message indicating the reason for rejection
    if new_status == 'Rejected':
        remarks = data.get('remarks')
        invoice.remarks = remarks
    else:
        invoice.remarks = None

    db.session.commit()

    return jsonify({"message": "Invoice status updated successfully"}), 200

if __name__ == "__main__":
    app.run(debug=True)