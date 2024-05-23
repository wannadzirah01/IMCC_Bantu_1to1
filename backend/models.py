from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_login import UserMixin
from datetime import datetime
import pytz

db = SQLAlchemy()
ma = Marshmallow()

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(345), nullable=True)
    email = db.Column(db.String(345), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)

    discriminator = db.Column('role', db.String(20))
    __mapper_args__ = {'polymorphic_on': discriminator}

    def __init__(self, name, email, password, phone_number):
        self.name = name
        self.email = email
        self.password = password
        self.phone_number = phone_number

class Admin(User):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    __mapper_args__ = {'polymorphic_identity': 'admin'}

    def __init__(self, name, email, password, phone_number):
        super().__init__(name, email, password, phone_number)

class Client(User):
    __tablename__ = 'clients'
    id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    matric_number = db.Column(db.String(20), nullable=True)
    school = db.Column(db.String(100), nullable=True)
    year_of_study = db.Column(db.String(5), nullable=True)
    __mapper_args__ = {'polymorphic_identity': 'client'}

    def __init__(self, name, email, password, phone_number, matric_number, school, year_of_study):
        super().__init__(name, email, password, phone_number)
        self.matric_number = matric_number
        self.school = school
        self.year_of_study = year_of_study

class Package(db.Model):
    __tablename__ = 'package'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(345), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    price = db.Column(db.Float, nullable=True)

malaysia_timezone = pytz.timezone('Asia/Kuala_Lumpur')

class Invoice(db.Model):
    __tablename__ = 'invoice'
    invoice_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User', backref=db.backref('invoices', lazy=True))
    package_id = db.Column(db.Integer, db.ForeignKey('package.id'))
    package = db.relationship('Package', backref=db.backref('invoices', lazy=True))
    invoice_status = db.Column(db.String(32), default="Pending Approval")
    uploaded_datetime = db.Column(db.DateTime, default=lambda: datetime.now(malaysia_timezone))
    remarks = db.Column(db.String(255))
    package_request_id = db.Column(db.Integer, db.ForeignKey('package_request.request_id'))  
    package_request = db.relationship('PackageRequest', backref=db.backref('invoices', lazy=True))  

    def __init__(self, file_name, file_path, file_size, user_id, package_id, package_request_id=None, invoice_status="Pending", remarks=None, uploaded_datetime=None):
        self.file_name = file_name
        self.file_path = file_path
        self.file_size = file_size
        self.user_id = user_id
        self.package_id = package_id
        self.package_request_id = package_request_id
        self.invoice_status = invoice_status
        self.remarks = remarks
        if uploaded_datetime is None:
            uploaded_datetime = datetime.now(malaysia_timezone)
        self.uploaded_datetime = uploaded_datetime

class Detail(db.Model):
    __tablename__ = 'detail'
    detail_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    detail_name = db.Column(db.String(255), nullable=False)
    detail_type = db.Column(db.String(50), nullable=False)

class PackageDetail(db.Model):
    __tablename__ = 'package_detail'
    package_detail_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    package_id = db.Column(db.Integer, db.ForeignKey('package.id'), nullable=False)
    detail_id = db.Column(db.Integer, db.ForeignKey('detail.detail_id'), nullable=False)
    detail = db.relationship('Detail', backref='package_details')
    package = db.relationship('Package', backref='package_details')

class PackageRequest(db.Model):
    __tablename__ = 'package_request'
    request_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    package_id = db.Column(db.Integer, db.ForeignKey('package.id'), nullable=False)
    package = db.relationship('Package', backref='package_requests', foreign_keys=[package_id])
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('users.id', lazy=True))
    submitted_at = db.Column(db.DateTime, default=lambda: datetime.now(malaysia_timezone))
    details = db.relationship('RequestDetail', backref='package_requests', lazy=True)
    status = db.Column(db.String(32), default="Pending Approval")

class RequestDetail(db.Model):
    __tablename__ = 'request_detail'
    request_detail_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    request_id = db.Column(db.Integer, db.ForeignKey('package_request.request_id'), nullable=False)
    detail_id = db.Column(db.Integer, db.ForeignKey('detail.detail_id'), nullable=False)
    value = db.Column(db.String(255), nullable=False)
    detail = db.relationship('Detail')
