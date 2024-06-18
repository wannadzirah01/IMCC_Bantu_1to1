from dotenv import load_dotenv
import os
import redis

load_dotenv()

class ApplicationConfig:
    SECRET_KEY = os.environ["SECRET_KEY"]

    DB_HOST = 'sql12.freesqldatabase.com'
    DB_NAME = 'sql12714507'
    DB_USER = 'sql12714507'
    DB_PASS = 'SAij8Kfeha'
    DB_PORT = '3306'
    # Construct the SQLAlchemy database URI
    SQLALCHEMY_DATABASE_URI = f"mysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # SQLALCHEMY_DATABASE_URI = 'mysql://root:''@localhost/IMCC_Bantu_1To1'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = True

    SESSION_TYPE = "redis"
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    # SESSION_REDIS = redis.from_url("redis://127.0.0.1:6379")
    from redis import from_url

    SESSION_REDIS = from_url("redis://red-cpom6b6ehbks73em1sqg:6379")

    