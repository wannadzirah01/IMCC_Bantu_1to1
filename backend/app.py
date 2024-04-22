from flask import Flask, request, jsonify, session
from flask_bcrypt import Bcrypt
from flask_cors import CORS, cross_origin
from flask_session import Session

from config import ApplicationConfig
from models import db, User

app = Flask(__name__)
app.config.from_object(ApplicationConfig)

bcrypt = Bcrypt(app)
CORS(app, origins="http://localhost:3000" , supports_credentials=True)
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
    email = request.json["email"]
    password = request.json["password"]
    name = request.json["name"]
    matric_number = request.json["matricNumber"]
    phone_number = request.json["phoneNumber"]
    school = request.json["school"]
    year_of_study = request.json["yearOfStudy"]

    user_exists = User.query.filter_by(email=email).first() is not None

    if user_exists:
        return jsonify({"error": "User already exist"}), 400
        
    hashed_password = bcrypt.generate_password_hash(password)
    new_user = User(email=email, password=hashed_password, name=name, matric_number=matric_number, phone_number=phone_number, school=school, year_of_study=year_of_study)
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

@app.route('/login', methods=['POST'])
def login_user():
    email = request.json["email"]
    password = request.json["password"]

    user = User.query.filter_by(email=email).first()

    if user is None:
        return jsonify({"error": "User with this email does not exist"}), 401
    
    if not bcrypt.check_password_hash(user.password, password):
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

@app.route("/logout", methods=["POST"])
def logout_user():
    session.pop("user_id")
    return "200"


if __name__ == "__main__":
    app.run(debug=True)