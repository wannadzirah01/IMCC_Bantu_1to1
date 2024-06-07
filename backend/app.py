from urllib import response
from flask_mail import Mail, Message
from flask import Flask, request, jsonify, session, send_from_directory, render_template, make_response, current_app, Response
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_session import Session
from werkzeug.utils import secure_filename
import os
from config import ApplicationConfig
from models import db, User, Package, Admin, Client, Invoice, PackageRequest, RequestDetail, PackageDetail, Detail, Post, Reply, Category, Complaint, Like
from flask_login import login_user, LoginManager, login_required, logout_user, current_user
from datetime import datetime
from pytz import timezone
from functools import wraps
from flask import request, jsonify
import pytz
import plotly.graph_objs as go

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
        # matric_number = data.get("matricNumber")
        phone_number = data["phoneNumber"]
        # school = data["school"]
        # year_of_study = data["yearOfStudy"]

        if email.endswith("@usm.my"):
            role = "admin"
        else:
            role = "client"

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "User already exists"}), 400

        hashed_password = bcrypt.generate_password_hash(
            password).decode('utf-8')

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
                # matric_number=matric_number,
                phone_number=phone_number,
                # school=school,
                # year_of_study=year_of_study
            )

        db.session.add(new_user)
        db.session.commit()

        session["user_id"] = new_user.id

        return jsonify({
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            # "matric_number": getattr(new_user, 'matric_number', None),
            "phone_number": new_user.phone_number,
            # "school": getattr(new_user, 'school', None),
            # "year_of_study": getattr(new_user, 'year_of_study', None),
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
            # "matric_number": user.matric_number,
            "phone_number": user.phone_number,
            # "school": user.school,
            # "year_of_study": user.year_of_study
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

        malaysia_timezone = pytz.timezone('Asia/Kuala_Lumpur')
        current_time_malaysia = datetime.now(malaysia_timezone)

        invoice_id = request.form.get('invoice_id')

        if invoice_id:
            existing_invoice = Invoice.query.get(invoice_id)
            if not existing_invoice:
                return jsonify({'error': 'Invoice not found'}), 404

            existing_package_request = PackageRequest.query.filter_by(
                invoice_id=invoice_id).first()

            existing_invoice.file_name = filename
            existing_invoice.file_path = file_path
            existing_invoice.file_size = os.path.getsize(file_path)
            existing_invoice.invoice_status = "Pending Receipt Approval"
            existing_invoice.remarks = ""
            existing_package_request.status = "Pending Receipt Approval"

            db.session.commit()

            return jsonify({'success': True, 'message': 'File re-uploaded successfully', 'file_name': filename}), 200
        else:
            package_id = request.form.get('package_id')

            new_invoice = Invoice(
                file_name=filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                user_id=user.id,
                package_id=package_id,
                invoice_status="Pending Receipt Approval",
                remarks=""
            )
            db.session.add(new_invoice)
            db.session.commit()

            invoice_id = new_invoice.invoice_id

            # Create the PackageRequest record with the retrieved invoice_id
            new_package_request = PackageRequest(
                package_id=package_id,
                user_id=user.id,
                submitted_at=current_time_malaysia,
                status="Pending Receipt Approval",
                mentor_name="",
                mentor_email="",
                invoice_id=invoice_id
            )
            db.session.add(new_package_request)
            db.session.commit()

            return jsonify({'success': True, 'message': 'File uploaded successfully', 'file_name': filename}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/getUserTickets', methods=['GET'])
@login_required
def get_user_tickets():
    user = current_user
    user_id = user.id
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    tickets = PackageRequest.query.filter_by(user_id=user_id).order_by(
        PackageRequest.submitted_at.desc()).all()
    if not tickets:
        return jsonify({"message": "No ticket"}), 200

    ticket_list = []
    for ticket in tickets:
        malaysia_time = ticket.submitted_at.astimezone(
            timezone('Asia/Kuala_Lumpur'))
        
        # Fetch details for the current ticket
        details = RequestDetail.query.filter_by(request_id=ticket.request_id).all()

        ticket_list.append({
            "invoice_status": ticket.invoice.invoice_status,
            "package": ticket.package.title,
            "ticket_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": ticket.invoice.file_name,
            "user_name": ticket.user.name,
            "email": ticket.user.email,
            "remarks": ticket.invoice.remarks,
            "invoice_id": ticket.invoice.invoice_id,
            "package_request_status": ticket.status,
            "package_request_id": ticket.request_id,
            "details": [{"detail_name": detail.detail.detail_name, "detail_type": detail.detail.detail_type, "value": detail.value} for detail in details]
        })

    return jsonify(ticket_list)


@app.route('/getAllTickets', methods=['GET'])
@login_required
@admin_required
def get_all_tickets():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit

    tickets = PackageRequest.query.order_by(
        PackageRequest.submitted_at.desc()).offset(offset).limit(limit).all()
    total_tickets = PackageRequest.query.count()
    if not tickets:
        return jsonify({"message": "No tickets"}), 200

    ticket_list = []
    for ticket in tickets:
        malaysia_time = ticket.submitted_at.astimezone(
            timezone('Asia/Kuala_Lumpur'))
        
        # Fetch details for the current ticket
        details = RequestDetail.query.filter_by(request_id=ticket.request_id).all()

        ticket_list.append({
            "invoice_status": ticket.invoice.invoice_status,
            "package": ticket.package.title,
            "user_name": ticket.user.name,
            "uploaded_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": ticket.invoice.file_name,
            # "matric_number": ticket.user.matric_number,
            "email": ticket.user.email,
            "invoice_id": ticket.invoice.invoice_id,
            "remarks": ticket.invoice.remarks,
            "package_request_status": ticket.status,
            "package_request_id": ticket.request_id,
            "details": [{"detail_name": detail.detail.detail_name, "detail_type": detail.detail.detail_type, "value": detail.value} for detail in details]
        })

    return jsonify({'ticket_list': ticket_list, 'total_tickets': total_tickets})


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
    ticket_id = data.get('ticket_id')
    new_status = data.get('invoice_status')

    ticket = PackageRequest.query.get(ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket not found"}), 404

    if not ticket.invoice:
        return jsonify({"error": "Invoice not found for the given ticket"}), 404

    ticket.invoice.invoice_status = new_status
    ticket.status = new_status

    if new_status == 'Receipt Rejected':
        remarks = data.get('remarks')
        ticket.invoice.remarks = remarks
    else:
        ticket.invoice.remarks = None

    db.session.commit()

    client_email = ticket.user.email
    subject = 'IMCC Bantu 1-to-1 Notifications'

    if new_status == "Receipt Rejected":
        body = f"Dear {ticket.user.name},\n\nYour receipt status has been updated to: '{
            new_status}'\nPlease login into your account to upload the receipt again.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

    if new_status == "Receipt Approved":
        body = f"Dear {ticket.user.name},\n\nYour receipt status has been updated to: '{
            new_status}'\nPlease login into your account to submit the required details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

    msg = Message(subject, recipients=[client_email])
    msg.body = body
    mail.send(msg)

    return jsonify({"message": "Invoice status updated successfully"}), 200


@app.route('/getPackageDetails/<int:invoice_id>', methods=['GET'])
@login_required
def get_package_details(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    if invoice.invoice_status != "Receipt Approved":
        return jsonify({"error": "Invoice is not approved"}), 403

    package = Package.query.get_or_404(invoice.package_id)
    package_details = PackageDetail.query.filter_by(
        package_id=package.id).all()
    details = [{"detail_name": pd.detail.detail_name,
                "detail_type": pd.detail.detail_type} for pd in package_details]

    return jsonify({"package_details": details})


# @app.route('/submitPackageRequest', methods=['POST'])
# @login_required
# def submit_package_request():
#     data = request.get_json()
#     package_request_id = data.get('package_request_id')
#     details = data.get('details', [])

#     package_request = PackageRequest.query.filter_by(
#         invoice_id=package_request_id).first()
#     if not package_request:
#         return jsonify({"error": "Package request not found"}), 404

#     # if package_request.status == 'Pending Package Details Approval':
#     #     return jsonify({"error": "Package request has already been submitted"}), 400

#     package_request.status = 'Pending Package Details Approval'
#     db.session.add(package_request)
#     db.session.commit()

#     for detail in details:
#         detail_name = detail.get('detail_name')
#         detail_value = detail.get('value')
#         detail_entry = Detail.query.filter_by(detail_name=detail_name).first()
#         if detail_entry:
#             request_detail = RequestDetail(
#                 request_id=package_request.request_id,
#                 detail_id=detail_entry.detail_id,
#                 value=detail_value
#             )
#             db.session.add(request_detail)

#     db.session.commit()
#     return jsonify({"message": "Package request submitted successfully", "package_request": package_request.request_id}), 201

@app.route('/submitPackageRequest', methods=['POST'])
@login_required
def submit_package_request():
    try:
        data = request.get_json()
        package_request_id = data.get('package_request_id')
        details = data.get('details', [])

        package_request = PackageRequest.query.filter_by(
            invoice_id=package_request_id).first()
        if not package_request:
            response = make_response(jsonify({"error": "Package request not found"}), 404)
            response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
            response.headers.add("Access-Control-Allow-Credentials", "true")
            return response

        package_request.status = 'Pending Package Details Approval'
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

        response = make_response(jsonify({"message": "Package request submitted successfully", "package_request": package_request.request_id}), 201)
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response
    except Exception as e:
        db.session.rollback()
        response = make_response(jsonify({"error": str(e)}), 500)
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response


@app.route('/getPackageRequest/<int:request_id>', methods=['GET'])
@login_required
def get_package_request(request_id):
    userRole = current_user.discriminator
    package_request = PackageRequest.query.filter_by(
        request_id=request_id).first()

    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    if userRole == "client":
        mentor_name = package_request.mentor_name if package_request.mentor_name else "Not assigned yet. Please check again later."
        mentor_email = package_request.mentor_email if package_request.mentor_email else "Not assigned yet. Please check again later."

    if userRole == "admin":
        mentor_name = package_request.mentor_name if package_request.mentor_name else "Not assigned yet."
        mentor_email = package_request.mentor_email if package_request.mentor_email else "Not assigned yet."

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
        "details": details,
        "mentor_name": mentor_name,
        "mentor_email": mentor_email
    }

    return jsonify(response), 200


@app.route('/getUserPackageRequests', methods=['GET'])
@login_required
def get_user_package_requests():
    user_id = current_user.id
    package_requests = PackageRequest.query.filter_by(user_id=user_id).all()

    result = []
    for package_request in package_requests:
        mentor_name = package_request.mentor_name if package_request.mentor_name else "Not assigned yet. Please check again later."
        mentor_email = package_request.mentor_email if package_request.mentor_email else "Not assigned yet. Please check again later."

        details = RequestDetail.query.filter_by(
            request_id=package_request.request_id).all()
        detail_list = [{"detail_name": detail.detail.detail_name,
                        "value": detail.value} for detail in details]
        result.append({
            "request_id": package_request.request_id,
            "package_name": package_request.package.title,
            "submitted_at": package_request.submitted_at,
            "status": package_request.status,
            "details": detail_list,
            "mentor_name": mentor_name,
            "mentor_email": mentor_email
        })
    return jsonify(result)


@app.route('/getAllPackageRequests', methods=['GET'])
@login_required
@admin_required
def get_all_package_requests():
    package_requests = PackageRequest.query.all()
    result = []
    for package_request in package_requests:
        mentor_name = package_request.mentor_name if package_request.mentor_name else "Not assigned yet. Please check again later."
        mentor_email = package_request.mentor_email if package_request.mentor_email else "Not assigned yet. Please check again later."

        details = RequestDetail.query.filter_by(
            request_id=package_request.request_id).all()
        detail_list = [{"detail_name": detail.detail.detail_name,
                        "value": detail.value} for detail in details]
        result.append({
            "request_id": package_request.request_id,
            "package_name": package_request.package.title,
            "submitted_at": package_request.submitted_at,
            "status": package_request.status,
            "details": detail_list,
            "mentor_name": mentor_name,
            "mentor_email": mentor_email
        })
    return jsonify(result)


# @app.route('/updatePackageRequestStatus', methods=['POST'])
# @login_required
# def update_package_request_status():
#     # response = make_response()
#     # response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
#     # response.headers.add("Access-Control-Allow-Credentials", "true")
#     data = request.get_json()
#     request_id = data.get('request_id')
#     new_status = data.get('status')

#     package_request = PackageRequest.query.get(request_id)
#     if not package_request:
#         return jsonify({"message": "Package request not found"}), 404

#     package_request.status = new_status
#     db.session.commit()

#     if current_user.discriminator == "admin":
#         body = f"Dear {package_request.user.name},\n\nYour package details status has been updated to: '{
#             new_status}'\nPlease login into your account to view the subscribed Bantu 1-to-1 pakckage details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

#     client_email = package_request.user.email
#     subject = 'IMCC Bantu 1-to-1 Notifications'

#     msg = Message(subject, recipients=[client_email])
#     msg.body = body
#     mail.send(msg)

#     return jsonify({"message": "Package request status updated successfully"}), 200

@app.route('/updatePackageRequestStatus', methods=['POST'])
@login_required
def update_package_request_status():
    data = request.get_json()
    request_id = data.get('request_id')
    new_status = data.get('status')

    package_request = PackageRequest.query.get(request_id)
    if not package_request:
        return jsonify({"message": "Package request not found"}), 404

    package_request.status = new_status
    db.session.commit()

    if current_user.discriminator == "admin":
        body = f"Dear {package_request.user.name},\n\nYour package details status has been updated to: '{new_status}'\nPlease login into your account to view the subscribed Bantu 1-to-1 package details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

        client_email = package_request.user.email
        subject = 'IMCC Bantu 1-to-1 Notifications'

        msg = Message(subject, recipients=[client_email])
        msg.body = body
        mail.send(msg)

    response = jsonify({"message": "Package request status updated successfully"})
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
    response.headers.add("Access-Control-Allow-Credentials", "true")

    return response, 200


@app.route('/submitOrUpdatePackageRequest', methods=['POST'])
@login_required
def submit_or_update_package_request():
    try:
        response = make_response()  # Creating a response object
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        
        data = request.get_json()
        package_request_id = data.get('package_request_id')
        new_status = data.get('status')
        details = data.get('details', [])

        package_request = PackageRequest.query.filter_by(
            request_id=package_request_id).first()
        if not package_request:
            return jsonify({"error": "Package request not found"}), 404

        package_request.status = new_status
        db.session.add(package_request)
        db.session.commit()

        if new_status in ['Package Details Rejected. Waiting for client response.',
                          'Package Details Rejected. Waiting for admin response.']:
            if details:
                RequestDetail.query.filter_by(
                    request_id=package_request_id).delete()
                db.session.commit()
                for detail in details:
                    detail_name = detail.get('detail_name')
                    detail_value = detail.get('value')
                    detail_entry = Detail.query.filter_by(
                        detail_name=detail_name).first()
                    if detail_entry:
                        request_detail = RequestDetail(
                            request_id=package_request.request_id,
                            detail_id=detail_entry.detail_id,
                            value=detail_value
                        )
                        db.session.add(request_detail)
                db.session.commit()

        if current_user.discriminator == "admin":
            body = f"Dear {package_request.user.name},\n\nYour package details status has been updated to: '{
                new_status}'\nPlease login into your account to accept or reject the package request details suggested by IMCC.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

            client_email = package_request.user.email
            subject = 'IMCC Bantu 1-to-1 Notifications'

            msg = Message(subject, recipients=[client_email])
            msg.body = body
            mail.send(msg)

        return jsonify({"message": "Package request updated successfully", "package_request": package_request.request_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/addMentorDetails', methods=['POST'])
@login_required
@admin_required
def add_mentor_details():
    data = request.get_json()
    package_request_id = data.get('packageRequestId')
    mentor_name = data.get('mentorName')
    mentor_email = data.get('mentorEmail')

    package_request = PackageRequest.query.filter_by(
        request_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    package_request.mentor_name = mentor_name
    package_request.mentor_email = mentor_email

    db.session.commit()

    mentor_data = {
        'mentor_name': package_request.mentor_name,
        'mentor_email': package_request.mentor_email
    }

    return jsonify(mentor_data), 200


@app.route('/getComplaints', methods=['GET'])
@login_required
@admin_required
def get_complaints():
    try:
        complaints = Complaint.query.all()

        complaints = [{
            'complaint_id': complaint.complaint_id,
            "request_id": complaint.request_id,
            'complaint_details': complaint.complaint_detail,
            'complaint_status': complaint.complaint_status,
            'complaint_created': complaint.complaint_created
        } for complaint in complaints]

        return jsonify(complaints), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/getUserComplaints', methods=['GET'])
@login_required
def get_user_complaints():
    try:
        user = current_user
        user_id = user.id

        complaints = (db.session.query(Complaint)
                      .join(PackageRequest, Complaint.request_id == PackageRequest.request_id)
                      .filter(PackageRequest.user_id == user_id)
                      .all())

        complaints = [{
            'complaint_id': complaint.complaint_id,
            "request_id": complaint.request_id,
            'complaint_details': complaint.complaint_detail,
            'complaint_status': complaint.complaint_status,
            'complaint_created': complaint.complaint_created
        } for complaint in complaints]

        return jsonify(complaints), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/addComplaints', methods=['POST'])
@login_required
def add_complaints():
    data = request.get_json()
    package_request_id = data.get('packageRequestId')
    complaint_details = data.get('complaintDetails')

    package_request = PackageRequest.query.filter_by(
        request_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    package_request.has_complaint = True
    db.session.commit()

    malaysia_timezone = pytz.timezone('Asia/Kuala_Lumpur')
    current_time_malaysia = datetime.now(malaysia_timezone)

    new_complaint = Complaint(
        request_id=package_request_id,
        complaint_detail=complaint_details,
        complaint_created=current_time_malaysia,
        complaint_status="In Progress"
    )

    db.session.add(new_complaint)
    db.session.commit()

    complaint_data = {
        'complaint_id': new_complaint.complaint_id,
        'request_id': new_complaint.request_id,
        "complaint_details": new_complaint.complaint_detail,
        "complaint_status": new_complaint.complaint_status,
        "complaint_created": new_complaint.complaint_created
    }

    return jsonify(complaint_data), 200


@app.route('/getPosts', methods=['GET'])
def get_posts():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        offset = (page - 1) * limit

        # Query the posts with pagination
        posts = Post.query.order_by(Post.created_at.desc()).offset(
            offset).limit(limit).all()
        total_posts = Post.query.count()

        posts_data = [{
            'post_id': post.post_id,
            'title': post.title,
            'content': post.content,
            'category': post.category.name,
            'user': post.user.name,
            'total_likes': post.total_likes()
        } for post in posts]

        return jsonify({'posts': posts_data, 'totalPosts': total_posts}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/getCategories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    categories_list = [{'id': category.category_id,
                        'name': category.name} for category in categories]
    return jsonify(categories_list)


@app.route('/createPost', methods=['POST'])
@login_required
def create_post():
    data = request.json
    title = data.get('title')
    content = data.get('content')
    category_id = data.get('category_id')

    user_id = current_user.id

    new_post = Post(title=title, content=content,
                    category_id=category_id, user_id=user_id)
    db.session.add(new_post)
    db.session.commit()

    post_data = {
        'post_id': new_post.post_id,
        'title': new_post.title,
        'content': new_post.content,
        'name': new_post.user.name
    }

    return jsonify(post_data), 201


@app.route('/likePost/<int:post_id>', methods=['POST'])
@login_required  # Ensure the user is logged in
def like_post(post_id):
    try:
        post_id = post_id
        if not post_id:
            return jsonify({'error': 'Post ID is required'}), 400

        # Check if the post exists
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Check if the user has already liked the post
        like = Like.query.filter_by(
            post_id=post_id, user_id=current_user.id).first()

        if like:
            # If the like exists, remove it (unlike)
            db.session.delete(like)
            db.session.commit()
            total_likes = post.total_likes()
            return jsonify({'liked': False, 'totalLikes': total_likes}), 200
        else:
            # If the like does not exist, create it
            new_like = Like(post_id=post_id,
                            user_id=current_user.id, liked=True)
            db.session.add(new_like)
            db.session.commit()
            total_likes = post.total_likes()
            return jsonify({'liked': True, 'totalLikes': total_likes}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/getLikeStatus/<int:post_id>', methods=['GET'])
@login_required  # Ensure the user is logged in
def get_like_status(post_id):
    try:
        post_id = post_id
        if not post_id:
            return jsonify({'error': 'Post ID is required'}), 400

        # Check if the post exists
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Check if the user has already liked the post
        like = Like.query.filter_by(
            post_id=post_id, user_id=current_user.id).first()
        liked = like is not None

        # Get the total number of likes for the post
        total_likes = Like.query.filter_by(post_id=post_id, liked=True).count()

        return jsonify({'liked': liked, 'totalLikes': total_likes}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/toggleLike', methods=['POST'])
@login_required  # Ensure the user is logged in
def toggle_like():
    try:
        post_id = request.json.get('post_id')
        if not post_id:
            return jsonify({'error': 'Post ID is required'}), 400

        # Check if the post exists
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        # Check if the user has already liked the post
        like = Like.query.filter_by(
            post_id=post_id, user_id=current_user.id).first()

        if like:
            # If the like exists, remove it (unlike)
            db.session.delete(like)
            db.session.commit()
            total_likes = post.total_likes()
            return jsonify({'liked': False, 'totalLikes': total_likes}), 200
        else:
            # If the like does not exist, create it
            new_like = Like(post_id=post_id,
                            user_id=current_user.id, liked=True)
            db.session.add(new_like)
            db.session.commit()
            total_likes = post.total_likes()
            return jsonify({'liked': True, 'totalLikes': total_likes}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
        replies = Reply.query.filter_by(post_id=post_id).all()

        replies_data = [reply.to_dict() for reply in replies]

        return jsonify(replies_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/deletePost/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    try:
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        if post.user_id != current_user.id and not current_user.discriminator == "admin":
            return jsonify({'error': 'Unauthorized action'}), 403

        # Delete all associated replies
        Reply.query.filter_by(post_id=post_id).delete()
        db.session.delete(post)
        db.session.commit()
        return jsonify({'message': 'Post deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/editPost/<int:post_id>', methods=['PUT'])
@login_required
def edit_post(post_id):
    try:
        post = Post.query.get(post_id)
        if not post:
            return jsonify({'error': 'Post not found'}), 404

        if post.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized action'}), 403

        data = request.json
        post.title = data.get('title', post.title)
        post.content = data.get('content', post.content)
        post.category_id = data.get('category_id', post.category_id)

        db.session.commit()
        return jsonify({'message': 'Post updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/deleteReply/<int:reply_id>', methods=['DELETE'])
@login_required
def delete_reply(reply_id):
    try:
        reply = Reply.query.get(reply_id)
        if not reply:
            return jsonify({'error': 'Reply not found'}), 404

        if reply.user_id != current_user.id and not current_user.discriminator == "admin":
            return jsonify({'error': 'Unauthorized action'}), 403

        db.session.delete(reply)
        db.session.commit()

        return jsonify({'message': 'Reply deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/admin_dashboard')
def admin_dashboard():
    # Query to get the count of package requests for each package
    package_requests_count = db.session.query(Package.title, db.func.count(
        PackageRequest.request_id)).join(PackageRequest).group_by(Package.title).all()

    # Extract package titles and request counts
    package_titles = [row[0] for row in package_requests_count]
    request_counts = [row[1] for row in package_requests_count]

    # Create a Plotly bar chart
    bar_chart = go.Figure(data=[go.Bar(x=package_titles, y=request_counts)])

    # Configure the layout of the chart
    bar_chart.update_layout(
        title='Bantu 1-to-1 Package Statistics',
        xaxis=dict(title='Bantu 1-to-1 Package'),
        yaxis=dict(title='Number of Purchase')
    )

    # Convert the Plotly chart to JSON
    bar_chart_json = bar_chart.to_json()

    # Returning a JSON response
    return jsonify(bar_chart_json=bar_chart_json)


app.config.update(
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME='wannadzirahimccfyp@gmail.com',
    MAIL_PASSWORD='qminnnawxfzotlcx',
    MAIL_DEFAULT_SENDER='IMCC-Bantu@usm.my'
)

mail = Mail(app)

if __name__ == "__main__":
    app.run(debug=True)
