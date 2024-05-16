from flask_sqlalchemy import SQLAlchemy
from uuid import uuid4
from flask_marshmallow import Marshmallow
from flask_login import UserMixin

db = SQLAlchemy()
ma = Marshmallow()

def get_uuid():
    return uuid4().hex

class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.String(32), primary_key=True, unique=True, default=get_uuid)
    name = db.Column(db.String(345), nullable=True)
    email = db.Column(db.String(345), unique=True)
    password = db.Column(db.Text, nullable=False)
    matric_number = db.Column(db.String(20), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    school = db.Column(db.String(100), nullable=True)
    year_of_study = db.Column(db.String(5), nullable=True)
    role = db.Column(db.String(32), default="Client")

    def __repr__(self):
        return f'<User: {self.name}, Role: {self.role}>'
    
    def get_id(self):
        return self.id

class Package(db.Model):
    __tablename__ = "package"
    id = db.Column(db.String(32), primary_key=True)
    title = db.Column(db.String(345))
    description = db.Column(db.String(500))
    price = db.Column(db.Float, nullable=True)

class Invoice(db.Model):
    invoice_id = db.Column(db.String(32), primary_key=True, unique=True, default=get_uuid)
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.String(255))
    file_size = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship('User', backref=db.backref('files', lazy=True))
    package_id = db.Column(db.Integer, db.ForeignKey('package.id'))
    package = db.relationship('Package', backref=db.backref('files', lazy=True))
    invoice_status = db.Column(db.String(32), default="Pending Approval")