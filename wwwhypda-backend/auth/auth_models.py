from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
import hmac
from flask import current_app

# Initialize SQLAlchemy instance (assuming `db` is imported from `auth.mail`)
from common_defenitions import db

class User(db.Model):
    __bind_key__ = 'users_db'
    """
    Represents a user in the system.
    Includes authentication, activation, and password management functionalities.
    """
    __tablename__ = 'users'

    terms_accepted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    terms_version = db.Column(db.String(64), nullable=True)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)  # Hashed password
    active = db.Column(db.Boolean, default=False)  # User must be activated manually
    is_superuser = db.Column(db.Boolean, default=False)  # User must be activated manually



    @classmethod
    def get_by_id(cls, user_id: int):
        """
        Retrieves a user by their ID if they are active.
        Returns a dictionary or None if not found.
        """
        user = cls.query.filter_by(id=user_id, active=True).first()
        return {"id": user.id, "name": user.name, "email": user.email, "active": user.active, "is_superuser": user.is_superuser} if user else None


    def set_password(self, password):
        """Хэширует пароль и сохраняет его"""
        self.password = generate_password_hash(password)

    def session_version(self):
        """Привязывает JWT к аккаунту, защищая от повторного использования id после удаления."""
        return hmac.new(current_app.config["JWT_SECRET_KEY"].encode(),
            f"{self.id}:{self.email}:{self.password}".encode(), hashlib.sha256).hexdigest()

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
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.active = False
            db.session.commit()
            return True
        return False
    
    @classmethod
    def activate_user_by_id(cls, user_id: int) -> bool:
        user = cls.query.filter_by(id=user_id).first()
        if user:
            user.active = True
            db.session.commit()
            return True
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
                "active": user.active, "account_version": user.session_version()}
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
    __bind_key__ = 'users_db'

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
    def create_code(cls, email: str, type: str, commit=True):
        """
        Generates a 6-digit confirmation code and stores it in the database.
        Returns the created confirmation code object.
        """
        user = User.query.filter_by(email=email).populate_existing().with_for_update().first()
        if type == "password_reset" and (not user or not user.active):
            return None
        code = str((secrets.randbelow(900000) + 100000))
        confirmation_code = cls(email=email, code=code, type=type)
        db.session.add(confirmation_code)
        if commit:
            db.session.commit()
        return confirmation_code

    @classmethod
    def verify_code(cls, email: str, code: str, type: str):
        """
        Проверяет код в течение настроенного срока действия (цель — 2 минуты).
        Returns True if valid, otherwise False.
        """
        user = User.query.filter_by(email=email).populate_existing().with_for_update().first()
        if not user:
            return False
        confirmation_code = cls.query.filter_by(email=email, code=code, type=type).with_for_update().first()
        if not confirmation_code:
            return False
        
        # Ensure created_at is timezone-aware
        created_at = confirmation_code.created_at
        ttl = cls.ttl_seconds(type)
        if created_at is None or ttl is None:
            return False
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        return created_at <= now < created_at + timedelta(seconds=ttl)

    @classmethod
    def ttl_seconds(cls, code_type):
        """Возвращает срок типа кода; неизвестный тип не считается действующим."""
        setting = {"registration": "CONFIRMATION_CODE_TTL_SECONDS",
                   "password_reset": "PASSWORD_RESET_CODE_TTL_SECONDS"}.get(code_type)
        return current_app.config[setting] if setting else None

    @classmethod
    def cleanup_expired(cls, now=None):
        """Удаляет истёкшие/некорректные коды одной транзакцией, без удаления аккаунтов."""
        from sqlalchemy import and_, or_
        now = now or datetime.now(timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        cutoff = now.astimezone(timezone.utc).replace(tzinfo=None)
        expired = or_(
            cls.created_at.is_(None),
            cls.type.notin_(["registration", "password_reset"]),
            cls.type.is_(None),
            and_(cls.type == "registration", cls.created_at <= cutoff - timedelta(
                seconds=cls.ttl_seconds("registration"))),
            and_(cls.type == "password_reset", cls.created_at <= cutoff - timedelta(
                seconds=cls.ttl_seconds("password_reset"))),
        )
        try:
            count = cls.query.filter(expired).delete(synchronize_session=False)
            db.session.commit()
            return count
        except Exception:
            db.session.rollback()
            raise

    @classmethod
    def delete_code(cls, email: str, code: str, type: str):
        """
        Deletes a confirmation code after successful verification.
        Returns True if successful, otherwise False.
        """
        confirmation_code = cls.query.filter_by(email=email, code=code, type=type).with_for_update().first()
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