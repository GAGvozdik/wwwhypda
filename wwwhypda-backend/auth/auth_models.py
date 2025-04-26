from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
import random

# Initialize SQLAlchemy instance (assuming `db` is imported from `auth.mail`)
from common_defenitions import db

class User(db.Model):
    """
    Represents a user in the system.
    Includes authentication, activation, and password management functionalities.
    """
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Hashed password
    active = db.Column(db.Boolean, default=False)  # User must be activated manually
    is_superuser = db.Column(db.Boolean, default=False)  # User must be activated manually

    def set_password(self, password):
        """Хэширует пароль и сохраняет его"""
        self.password = generate_password_hash(password)

    def check_password(self, password):
        """Проверяет пароль на соответствие хэшу"""
        return check_password_hash(self.password, password)

    def is_super(self) -> bool:
        """
        Returns True if the user is a superuser.
        """
        return self.is_superuser

    
    @classmethod
    def deactivate_user(cls, user_id: int) -> bool:
        """
        Deactivates a user account.
        Returns True if successful, otherwise False.
        """
        print('fdsf')
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.active = False
            db.session.commit()
            return True
        return False
    
    @classmethod
    def activate_user_by_id(cls, user_id: int) -> bool:
        print('+')
        user = cls.query.filter_by(id=user_id).first()
        print('++')
        if user:
            user.active = True
            db.session.commit()
            print('+++')
            return True
        print('++++')
        return False

    @classmethod
    def remove_superuser(cls, user_id: int) -> bool:
        """
        Removes superuser status from a user.
        Returns True if successful, otherwise False.
        """
        user = cls.query.filter_by(id=user_id).first()
        if user and user.is_superuser:
            user.is_superuser = False
            db.session.commit()
            return True
        return False

    @classmethod
    def make_superuser(cls, user_id: int) -> bool:
        """
        Promotes a user to superuser status.
        Returns True if successful, otherwise False.
        """
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.is_superuser = True
            db.session.commit()
            return True
        return False

    @classmethod
    def get_all_users(cls):
        """
        Retrieves all users regardless of status.
        Returns a list of user dictionaries.
        """
        users = cls.query.all()
        return [{
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "active": user.active,
            "is_superuser": user.is_superuser
        } for user in users]
        
    @classmethod
    def create(cls, name: str, email: str, password: str):
        """
        Creates a new user with a hashed password.
        Returns the created user as a dictionary or None if the email is already taken.
        """
        if cls.query.filter_by(email=email).first():
            return None  # Email already in use

        new_user = cls(
            name=name,
            email=email,
            password=generate_password_hash(password),
            active=False  # User is inactive until activated
        )
        db.session.add(new_user)
        db.session.commit()
        return cls.get_by_id(new_user.id)

    @classmethod
    def get_all(cls):
        """
        Retrieves all active users.
        Returns a list of user dictionaries.
        """
        users = cls.query.filter_by(active=True).all()
        return [{"id": user.id, "name": user.name, "email": user.email} for user in users]

    @classmethod
    def get_by_id(cls, user_id: int):
        """
        Retrieves a user by their ID if they are active.
        Returns a dictionary or None if not found.
        """
        user = cls.query.filter_by(id=user_id, active=True).first()
        return {"id": user.id, "name": user.name, "email": user.email, "active": user.active} if user else None

    @classmethod
    def get_by_email(cls, email: str):
        """
        Retrieves an active user by their email.
        Returns a dictionary or None if not found.
        """
        user = cls.query.filter_by(email=email, active=True).first()
        return {"id": user.id, "name": user.name, "email": user.email, "password": user.password} if user else None

    @classmethod
    def update(cls, user_id: int, name: str):
        """
        Updates a user's name.
        Returns the updated user as a dictionary or None if the user is not found.
        """
        user = cls.query.filter_by(id=user_id, active=True).first()
        if user:
            user.name = name
            db.session.commit()
            return cls.get_by_id(user_id)
        return None

    @classmethod
    def disable_account(cls, user_id: int):
        """
        Deactivates a user account, preventing further access.
        Returns True if successful, otherwise False.
        """
        user = cls.query.filter_by(id=user_id, active=True).first()
        if user:
            user.active = False
            db.session.commit()
            return True
        return False

    @classmethod
    def login(cls, email: str, password: str):
        """
        Authenticates a user by verifying email and password.
        Returns user data as a dictionary if successful, otherwise None.
        """
        user = cls.query.filter_by(email=email, active=True).first()
        if user and check_password_hash(user.password, password):
            return {"id": user.id, "name": user.name, "email": user.email,"is_superuser": user.is_superuser,  # 👈 обязательно добавь это!
                "active": user.active}
        return None


    @classmethod
    def change_password(cls, email: str, new_password: str):
        """
        Updates a user's password.
        Returns True if successful, otherwise False.
        """
        user = cls.query.filter_by(email=email).first()
        if user:
            user.password = generate_password_hash(new_password)
            db.session.commit()
            return True
        return False

    @classmethod
    def activate_user(cls, email: str):
        """
        Activates a user account.
        Returns True if successful, otherwise False.
        """
        user = cls.query.filter_by(email=email, active=False).first()
        if user:
            user.active = True
            db.session.commit()
            return True
        return False

class ConfirmationCode(db.Model):
    """
    Represents a confirmation code for user activation or password reset.
    """
    __tablename__ = 'confirmation_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(10), nullable=False)  # 6-digit confirmation code
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))  # Timezone-aware timestamp
    type = db.Column(db.String(50), nullable=False)  # Either "registration" or "password_reset"
    
    @classmethod
    def create_code(cls, email: str, type: str):
        """
        Generates a 6-digit confirmation code and stores it in the database.
        Returns the created confirmation code object.
        """
        code = str(random.randint(100000, 999999))
        confirmation_code = cls(email=email, code=code, type=type)
        db.session.add(confirmation_code)
        db.session.commit()
        return confirmation_code

    @classmethod
    def verify_code(cls, email: str, code: str, type: str):
        """
        Validates a confirmation code within a 10-minute expiry window.
        Returns True if valid, otherwise False.
        """
        confirmation_code = cls.query.filter_by(email=email, code=code, type=type).first()
        if not confirmation_code:
            return False
        
        # Ensure created_at is timezone-aware
        if confirmation_code.created_at.tzinfo is None:
            confirmation_code.created_at = confirmation_code.created_at.replace(tzinfo=timezone.utc)
        
        if datetime.now(timezone.utc) - confirmation_code.created_at > timedelta(minutes=10):
            return False
        
        return True

    @classmethod
    def delete_code(cls, email: str, code: str, type: str):
        """
        Deletes a confirmation code after successful verification.
        Returns True if successful, otherwise False.
        """
        confirmation_code = cls.query.filter_by(email=email, code=code, type=type).first()
        if confirmation_code:
            db.session.delete(confirmation_code)
            db.session.commit()
            return True
        return False

    def to_dict(self):
        """
        Converts the confirmation code instance into a dictionary.
        """
        return {
            'id': self.id,
            'email': self.email,
            'code': self.code,
            'created_at': self.created_at,
            'type': self.type
        }
    
