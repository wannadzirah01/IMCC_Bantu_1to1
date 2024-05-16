from flask import Flask, request, jsonify, session, redirect, url_for
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_session import Session
from werkzeug.utils import secure_filename
import os
from config import ApplicationConfig
from models import db, User, Package, Invoice

app = Flask(__name__)
app.config.from_object(ApplicationConfig)
app.config['UPLOAD_FOLDER'] = 'C:\\Users\\wanna\\IMCC_Bantu_1to1\\upload\\invoice'

bcrypt = Bcrypt(app)
CORS(app, origins="http://localhost:3000", supports_credentials=True)
server_session = Session(app)
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/@me')
def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "matric_number": user.matric_number,
        "phone_number": user.phone_number,
        "school": user.school,
        "year_of_study": user.year_of_study
    })

@app.route('/register', methods=['POST'])
def register_user():
    try:
        data = request.json
        email = data["email"]
        password = data["password"]
        name = data["name"]
        matric_number = data["matricNumber"]
        phone_number = data["phoneNumber"]
        school = data["school"]
        year_of_study = data["yearOfStudy"]

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
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
            "matric_number": new_user.matric_number,
            "phone_number": new_user.phone_number,
            "school": new_user.school,
            "year_of_study": new_user.year_of_study
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login_user():
    try:
        data = request.json
        email = data["email"]
        password = data["password"]

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password, password):
            return jsonify({"error": "Invalid credentials"}), 401

        session["user_id"] = user.id

        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "matric_number": user.matric_number,
            "phone_number": user.phone_number,
            "school": user.school,
            "year_of_study": user.year_of_study
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/logout", methods=["POST"])
def logout_user():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/getUserID', methods=['GET'])
def get_user_id():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "User not logged in"}), 401
    return jsonify({"userID": user_id})

@app.route('/packageListing', methods=['GET'])
def get_package_listing():
    packages = Package.query.all()
    user_id = session.get("user_id")

    package_list = [{
        "id": package.id,
        "title": package.title,
        "description": package.description,
        "price": package.price,
        "user_id": user_id  # Include the user_id in the package data
    } for package in packages]

    return jsonify(package_list)

@app.route('/uploadInvoice', methods=['POST'])
def upload_invoice():
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

        try:
            new_invoice = Invoice(
                file_name=filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                user_id=request.form['user_id'],
                package_id=request.form['package_id'],
                invoice_status="Pending Approval"
            )
            db.session.add(new_invoice)
            db.session.commit()
            # Your code for creating new Invoice and adding to database
            return jsonify({'success': True, 'message': 'File uploaded successfully'}), 201
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
def get_invoice_status():
    user_id = session.get("user_id")
    if not user_id: 
        return jsonify({"error": "Unauthorized"}), 401
    
    invoices = Invoice.query.filter_by(user_id=user_id).all()
    if not invoices:
        return jsonify({"message": "No uploaded invoices"}), 200

    invoice_list = []
    for invoice in invoices:
        invoice_list.append({
            "status": invoice.invoice_status,
            "package": invoice.package.title
        })

    return jsonify(invoice_list)


if __name__ == "__main__":
    app.run(debug=True)