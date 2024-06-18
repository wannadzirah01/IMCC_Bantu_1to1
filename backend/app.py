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
from sqlalchemy.sql import func

app = Flask(__name__)
app.config.from_object(ApplicationConfig)
app.config['UPLOAD_FOLDER'] = 'C:\\Users\\wanna\\IMCC_Bantu_1to1\\upload\\invoice'

bcrypt = Bcrypt(app)
CORS(app, origins="https://imcc-bantu-1to1.onrender.com", supports_credentials=True)
# CORS(app, origins="http://localhost:3000", supports_credentials=True)
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
        details = RequestDetail.query.filter_by(
            request_id=ticket.request_id).all()

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
            "has_complaint": ticket.has_complaint,
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
    # Get the status filter from the query parameters
    status_filter = request.args.getlist('status')

    # Mapping frontend status categories to database statuses
    status_mapping = {
        "Pending": [
            "Pending Receipt Approval",
            "Receipt Approved",
            "Receipt Rejected",
            "Pending Package Details Approval",
            "Package Details Rejected",
            "Package Details Rejected. Waiting for admin response.",
            "Package Details Rejected. Waiting for client response."
        ],
        "Active": ["Active", "Package Details Approved"],
        "Completed": ["Completed"]
    }

    # Flatten the status filters into the actual database status values
    if status_filter and status_filter[0] != "All":
        db_statuses = []
        for status in status_filter:
            db_statuses.extend(status_mapping.get(status, []))
        query = PackageRequest.query.filter(
            PackageRequest.status.in_(db_statuses))
    else:
        query = PackageRequest.query

    total_tickets = query.count()
    tickets = query.order_by(PackageRequest.submitted_at.desc()).offset(
        offset).limit(limit).all()

    if not tickets:
        return jsonify({"message": "No tickets"}), 200

    ticket_list = []
    for ticket in tickets:
        malaysia_time = ticket.submitted_at.astimezone(
            timezone('Asia/Kuala_Lumpur'))

        # Fetch details for the current ticket
        details = RequestDetail.query.filter_by(
            request_id=ticket.request_id).all()

        ticket_list.append({
            "invoice_status": ticket.invoice.invoice_status,
            "package": ticket.package.title,
            "user_name": ticket.user.name,
            "uploaded_datetime": malaysia_time.strftime('%Y-%m-%d %H:%M:%S'),
            "file_name": ticket.invoice.file_name,
            "email": ticket.user.email,
            "invoice_id": ticket.invoice.invoice_id,
            "remarks": ticket.invoice.remarks,
            "package_request_status": ticket.status,
            "package_request_id": ticket.request_id,
            "has_complaint": ticket.has_complaint,
            "details": [{"detail_name": detail.detail.detail_name, "detail_type": detail.detail.detail_type, "value": detail.value} for detail in details]
        })

    return jsonify({'ticket_list': ticket_list, 'total_tickets': total_tickets})


@app.route('/getTicketCounts', methods=['GET'])
@login_required
@admin_required
def get_ticket_counts():
    # Mapping frontend status categories to database statuses
    status_mapping = {
        "Pending": [
            "Pending Receipt Approval",
            "Receipt Approved",
            "Receipt Rejected",
            "Pending Package Details Approval",
            "Package Details Rejected",
            "Package Details Rejected. Waiting for admin response.",
            "Package Details Rejected. Waiting for client response."
        ],
        "Active": ["Active", "Package Details Approved"],
        "Completed": ["Completed"]
    }

    # Get the total count of all package requests
    total_tickets = PackageRequest.query.count()

    # Get the counts for each status category
    status_counts = {key: 0 for key in status_mapping.keys()}
    for category, statuses in status_mapping.items():
        status_counts[category] = PackageRequest.query.filter(
            PackageRequest.status.in_(statuses)).count()

    return jsonify({
        'total_tickets': total_tickets,
        'status_counts': status_counts
    })


@app.route('/viewInvoiceFile/<filename>', methods=['GET'])
@login_required
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
        body = f"Dear {ticket.user.name},\n\nYour receipt status has been updated to: '{new_status}'\nPlease login into your account to upload the receipt again.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

    if new_status == "Receipt Approved":
        body = f"Dear {ticket.user.name},\n\nYour receipt status has been updated to: '{new_status}'\nPlease login into your account to submit the required details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

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


@app.route('/submitPackageRequest', methods=['POST'])
@login_required
def submit_package_request():
    data = request.get_json()
    package_request_id = data.get('package_request_id')
    details = data.get('details', [])

    package_request = PackageRequest.query.filter_by(
        invoice_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    # if package_request.status == 'Pending Package Details Approval':
    #     return jsonify({"error": "Package request has already been submitted"}), 400

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
    return jsonify({"message": "Package request submitted successfully", "package_request": package_request.request_id}), 201


# @app.route('/submitPackageRequest', methods=['POST'])
# @login_required
# def submit_package_request():
#     try:
#         data = request.get_json()
#         package_request_id = data.get('package_request_id')
#         details = data.get('details', [])

#         package_request = PackageRequest.query.filter_by(
#             invoice_id=package_request_id).first()
#         if not package_request:
#             response = make_response(
#                 jsonify({"error": "Package request not found"}), 404)
#             response.headers.add(
#                 "Access-Control-Allow-Origin", "http://localhost:3000")
#             response.headers.add("Access-Control-Allow-Credentials", "true")
#             return response

#         package_request.status = 'Pending Package Details Approval'
#         db.session.add(package_request)
#         db.session.commit()

#         for detail in details:
#             detail_name = detail.get('detail_name')
#             detail_value = detail.get('value')
#             detail_entry = Detail.query.filter_by(
#                 detail_name=detail_name).first()
#             if detail_entry:
#                 request_detail = RequestDetail(
#                     request_id=package_request.request_id,
#                     detail_id=detail_entry.detail_id,
#                     value=detail_value
#                 )
#                 db.session.add(request_detail)

#         db.session.commit()

#         response = make_response(jsonify(
#             {"message": "Package request submitted successfully", "package_request": package_request.request_id}), 201)
#         response.headers.add("Access-Control-Allow-Origin",
#                              "http://localhost:3000")
#         response.headers.add("Access-Control-Allow-Credentials", "true")
#         return response
#     except Exception as e:
#         db.session.rollback()
#         response = make_response(jsonify({"error": str(e)}), 500)
#         response.headers.add("Access-Control-Allow-Origin",
#                              "http://localhost:3000")
#         response.headers.add("Access-Control-Allow-Credentials", "true")
#         return response


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
        "mentor_email": mentor_email,
        "has_complaint": package_request.has_complaint
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

@app.route('/updatePackageRequestStatus', methods=['POST'])
@login_required
def update_package_request_status():
    # response = make_response()
    # response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
    # response.headers.add("Access-Control-Allow-Credentials", "true")
    data = request.get_json()
    request_id = data.get('request_id')
    new_status = data.get('status')

    package_request = PackageRequest.query.get(request_id)
    if not package_request:
        return jsonify({"message": "Package request not found"}), 404

    package_request.status = new_status
    db.session.commit()

    if current_user.discriminator == "admin":
        body = f"Dear {package_request.user.name},\n\nYour package details status has been updated to: '{new_status}'\nPlease login into your account to view the subscribed Bantu 1-to-1 pakckage details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

    client_email = package_request.user.email
    subject = 'IMCC Bantu 1-to-1 Notifications'

    msg = Message(subject, recipients=[client_email])
    msg.body = body
    mail.send(msg)

    return jsonify({"message": "Package request status updated successfully"}), 200


# @app.route('/updatePackageRequestStatus', methods=['POST'])
# @login_required
# def update_package_request_status():
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
#             new_status}'\nPlease login into your account to view the subscribed Bantu 1-to-1 package details.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

#         client_email = package_request.user.email
#         subject = 'IMCC Bantu 1-to-1 Notifications'

#         msg = Message(subject, recipients=[client_email])
#         msg.body = body
#         mail.send(msg)

#     response = jsonify(
#         {"message": "Package request status updated successfully"})
#     response.headers.add("Access-Control-Allow-Origin",
#                          "http://localhost:3000")
#     response.headers.add("Access-Control-Allow-Credentials", "true")

#     return response, 200


@app.route('/submitOrUpdatePackageRequest', methods=['POST'])
@login_required
def submit_or_update_package_request():
    try:
        response = make_response()  # Creating a response object
        response.headers.add("Access-Control-Allow-Origin",
                             "http://localhost:3000")
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
            body = f"Dear {package_request.user.name},\n\nYour package details status has been updated to: '{new_status}'\nPlease login into your account to accept or reject the package request details suggested by IMCC.\n\nBest regards,\nIMCC Bantu 1-to-1 Admin"

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


@app.route('/get_complaint/<int:request_id>', methods=['GET'])
# @login_required
def get_complaint(request_id):
    complaint = Complaint.query.filter_by(request_id=request_id).first()

    if not complaint:
        return jsonify({"error": "No complaint found for this package request"}), 404

    return jsonify({
        "complaint_detail": complaint.complaint_detail,
        "complaint_status": complaint.complaint_status,
        "complaint_created": complaint.complaint_created
    })


@app.route('/addComplaints', methods=['POST'])
@login_required
def add_complaints():
    data = request.get_json()
    package_request_id = data.get('packageRequestId')
    complaint_details = data.get('complaintDetails')

    package_request = PackageRequest.query.filter_by(
        invoice_id=package_request_id).first()
    if not package_request:
        return jsonify({"error": "Package request not found"}), 404

    request_id = package_request.request_id

    package_request.has_complaint = True
    db.session.commit()

    malaysia_timezone = pytz.timezone('Asia/Kuala_Lumpur')
    current_time_malaysia = datetime.now(malaysia_timezone)

    new_complaint = Complaint(
        request_id=request_id,
        complaint_detail=complaint_details,
        complaint_created=current_time_malaysia,
        complaint_status="Not Resolved Yet"
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


@app.route('/api/update_complaint_status/<int:request_id>', methods=['POST'])
def update_complaint_status(request_id):
    complaint = Complaint.query.filter_by(request_id=request_id).first()

    if not complaint:
        return jsonify({"error": "No complaint found for this package request"}), 404

    new_status = request.json.get('complaint_status')

    if new_status not in ['Not Resolved Yet', 'Resolved']:
        return jsonify({"error": "Invalid status"}), 400

    complaint.complaint_status = new_status

    ticket = PackageRequest.query.filter_by(request_id=request_id).first()
    ticket.has_complaint = False

    db.session.commit()

    return jsonify({"message": "Complaint status updated successfully"})


@app.route('/getPosts', methods=['GET'])
def get_posts():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5))
        offset = (page - 1) * limit
        category = request.args.get('category', None)

        query = Post.query

        if category:
            query = query.join(Category).filter(Category.name == category)

        total_posts = query.count()

        posts = query.order_by(Post.created_at.desc()).offset(
            offset).limit(limit).all()

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


@app.route('/popularPosts', methods=['GET'])
def popular_posts():
    try:
        # Number of top posts to retrieve
        top_n = int(request.args.get('top', 10))
        popular_posts = Post.query.outerjoin(Like).group_by(Post.post_id).order_by(
            db.func.count(Like.id).desc()).limit(top_n).all()
        posts_data = [{
            'post_id': post.post_id,
            'title': post.title,
            'content': post.content,
            'total_likes': post.total_likes()
        } for post in popular_posts]
        return jsonify({'popular_posts': posts_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/categoryPopularity', methods=['GET'])
def category_popularity():
    try:
        category_data = db.session.query(
            Category.name, db.func.count(Post.post_id)
        ).join(Post).group_by(Category.name).all()

        categories = [{'category': name, 'post_count': count}
                      for name, count in category_data]
        return jsonify({'category_popularity': categories}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/revenueAnalysis', methods=['GET'])
def revenue_analysis():
    try:
        revenue_data = db.session.query(
            Package.title, db.func.sum(Invoice.package.price)
        ).join(Invoice).group_by(Package.title).all()

        revenue = [{'package': title, 'total_revenue': revenue}
                   for title, revenue in revenue_data]
        return jsonify({'revenue_analysis': revenue}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/postsByDate', methods=['GET'])
def posts_by_date():
    try:
        # Aggregating posts by day
        posts_by_day = db.session.query(
            func.date(Post.created_at).label('date'),
            func.count(Post.post_id).label('post_count')
        ).group_by(func.date(Post.created_at)).all()

        # Aggregating posts by month
        posts_by_month = db.session.query(
            func.date_format(Post.created_at, '%Y-%m').label('month'),
            func.count(Post.post_id).label('post_count')
        ).group_by(func.date_format(Post.created_at, '%Y-%m')).all()

        posts_by_day_data = [
            {'date': str(day[0]), 'post_count': day[1]} for day in posts_by_day]
        posts_by_month_data = [
            {'month': month[0], 'post_count': month[1]} for month in posts_by_month]

        return jsonify({'posts_by_day': posts_by_day_data, 'posts_by_month': posts_by_month_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/package_requests_count', methods=['GET'])
def get_package_requests_count():
    package_requests_count = db.session.query(
        Package.title,
        db.func.count(PackageRequest.request_id).label('request_count')
    ).join(PackageRequest).group_by(Package.title).all()

    results = [{'title': title, 'request_count': request_count}
               for title, request_count in package_requests_count]
    return jsonify(results)


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