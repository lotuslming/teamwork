from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

# Association tables
project_members = db.Table('project_members',
    db.Column('project_id', db.Integer, db.ForeignKey('projects.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role', db.String(20), default='member'),  # 'owner' or 'member'
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)

card_assignees = db.Table('card_assignees',
    db.Column('card_id', db.Integer, db.ForeignKey('cards.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

card_categories = db.Table('card_categories',
    db.Column('card_id', db.Integer, db.ForeignKey('cards.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('categories.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    avatar_color = db.Column(db.String(7), default='#00d4ff')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    owned_projects = db.relationship('Project', backref='owner', lazy='dynamic')
    cards_assigned = db.relationship('Card', secondary=card_assignees, back_populates='assignees')
    messages = db.relationship('ChatMessage', backref='author', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'avatar_color': self.avatar_color,
            'created_at': self.created_at.isoformat()
        }

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    columns = db.Column(db.JSON, default=['待办', '进行中', '已完成'])
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cards = db.relationship('Card', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    categories = db.relationship('Category', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    messages = db.relationship('ChatMessage', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    members = db.relationship('User', secondary=project_members, backref=db.backref('projects', lazy='dynamic'))
    
    def to_dict(self, include_cards=False):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'owner_id': self.owner_id,
            'owner': self.owner.to_dict() if self.owner else None,
            'columns': self.columns or ['待办', '进行中', '已完成'],
            'members': [m.to_dict() for m in self.members],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        if include_cards:
            data['cards'] = [c.to_dict() for c in self.cards]
            data['categories'] = [cat.to_dict() for cat in self.categories]
        return data

class UnreadStatus(db.Model):
    __tablename__ = 'unread_status'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    last_read_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='_user_project_uc'),)

class Card(db.Model):
    __tablename__ = 'cards'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    content = db.Column(db.Text, default='')
    content_type = db.Column(db.String(20), default='markdown')  # 'markdown' or 'html'
    column = db.Column(db.String(100), default='待办')
    position = db.Column(db.Integer, default=0)
    due_date = db.Column(db.DateTime, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignees = db.relationship('User', secondary=card_assignees, back_populates='cards_assigned')
    categories = db.relationship('Category', secondary=card_categories, back_populates='cards')
    attachments = db.relationship('Attachment', backref='card', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'content': self.content,
            'content_type': self.content_type,
            'column': self.column,
            'position': self.position,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed': self.completed,
            'assignees': [u.to_dict() for u in self.assignees],
            'categories': [c.to_dict() for c in self.categories],
            'attachments': [a.to_dict() for a in self.attachments],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    color = db.Column(db.String(7), default='#00d4ff')
    
    # Relationships
    cards = db.relationship('Card', secondary=card_categories, back_populates='categories')
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'color': self.color
        }

class Attachment(db.Model):
    __tablename__ = 'attachments'
    
    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey('cards.id'), nullable=False)
    filename = db.Column(db.String(300), nullable=False)
    original_filename = db.Column(db.String(300), nullable=False)
    file_type = db.Column(db.String(50))
    file_size = db.Column(db.Integer)
    content = db.Column(db.Text, nullable=True)  # Extracted text content for search
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'card_id': self.card_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'uploaded_at': self.uploaded_at.isoformat()
        }

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text)
    file_path = db.Column(db.String(500), nullable=True)
    file_name = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'user': self.author.to_dict() if self.author else None,
            'content': self.content,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'created_at': self.created_at.isoformat()
        }

class FileVersion(db.Model):
    """Track version history for file attachments with OnlyOffice integration"""
    __tablename__ = 'file_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    attachment_id = db.Column(db.Integer, db.ForeignKey('attachments.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(500), nullable=False)  # Path to version file
    file_size = db.Column(db.Integer)
    edited_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    change_summary = db.Column(db.String(500))  # Optional description of changes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attachment = db.relationship('Attachment', backref=db.backref('versions', lazy='dynamic', cascade='all, delete-orphan'))
    edited_by = db.relationship('User', backref='file_edits')
    
    def to_dict(self):
        return {
            'id': self.id,
            'attachment_id': self.attachment_id,
            'version_number': self.version_number,
            'file_size': self.file_size,
            'edited_by': self.edited_by.to_dict() if self.edited_by else None,
            'change_summary': self.change_summary,
            'created_at': self.created_at.isoformat()
        }

