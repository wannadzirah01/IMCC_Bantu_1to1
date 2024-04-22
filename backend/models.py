from flask_sqlalchemy import SQLAlchemy
from uuid import uuid4
from flask_marshmallow import Marshmallow

db = SQLAlchemy()
ma = Marshmallow()

def get_uuid():
    return uuid4().hex

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(32), primary_key=True, unique=True, default=get_uuid)
    name = db.Column(db.String(345), nullable=True)
    email = db.Column(db.String(345), unique=True)
    password = db.Column(db.Text, nullable=False)
    matric_number = db.Column(db.String(20), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    school = db.Column(db.String(100), nullable=True)
    year_of_study = db.Column(db.String(5), nullable=True)
