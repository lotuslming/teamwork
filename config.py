import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///teamwork.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY') or ''
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL') or 'gpt-3.5-turbo'
    
    # OnlyOffice Document Server settings
    ONLYOFFICE_URL = os.environ.get('ONLYOFFICE_URL') or 'http://localhost:8080'
    ONLYOFFICE_JWT_SECRET = os.environ.get('ONLYOFFICE_JWT_SECRET') or 'teamwork-onlyoffice-secret-key'
    # Internal URL for OnlyOffice to access Flask (Docker bridge IP or host.docker.internal)
    INTERNAL_URL = os.environ.get('INTERNAL_URL') or 'http://172.17.0.1:5000'
    
    # SQLAlchemy connection pool settings for concurrent access
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,  # Check connection validity before using
        'pool_recycle': 300,    # Recycle connections after 5 minutes
    }

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
    
    # Production SQLAlchemy settings with connection pooling
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,        # Number of connections to keep open
        'max_overflow': 20,     # Additional connections allowed beyond pool_size
        'pool_timeout': 30,     # Seconds to wait for a connection from pool
    }

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
