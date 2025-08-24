from flask_sqlalchemy import SQLAlchemy
import datetime
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
import random
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, jsonify, session, request, redirect, url_for
from common_defenitions import db
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
from auth.auth_models import User

class InputData(db.Model):
    __bind_key__ = 'users_db'

    __tablename__ = 'input_data'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='New')
    editing_by = db.Column(db.String(100), nullable=True)
    general_info = db.Column(JSON, nullable=False)
    measurements = db.Column(JSON, nullable=False)
    samples = db.Column(JSON, nullable=False)
    site_info = db.Column(JSON, nullable=False)
    source_info = db.Column(JSON, nullable=False)
    comment = db.Column(db.String(600))
    
    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "generalInfoData": self.general_info,
            "measurementsTableData": self.measurements,
            "sampleMeasurementTableData": self.samples,
            "siteInfoTableData": self.site_info,
            "sourceTableData": self.source_info,
            "status": self.status,
            "editing_by": self.editing_by,
            "comment": self.comment
        }

    @classmethod
    def save_submission(cls, user_id: int, data: dict):
        try:
            user = User.get_by_id(user_id)
            if user:
                name = user["name"]
            else:
                name = "Unknown"

            entry = cls(
                user_id=user_id,
                name=name,  
                general_info=data.get('generalInfoData', []),
                measurements=data.get('measurementsTableData', []),
                samples=data.get('sampleMeasurementTableData', []),
                site_info=data.get('siteInfoTableData', []),
                source_info=data.get('sourceTableData', []),
                status='New',
                comment= '-'
            )
            db.session.add(entry)
            db.session.commit()
            return entry.to_dict()
        except SQLAlchemyError as e:
            current_app.logger.error(f"[DB ERROR] Failed to save InputData: {e}")
            db.session.rollback()
            return None


    @classmethod
    def get_user_submissions(cls, user_id: int):
        try:
            results = cls.query.filter_by(user_id=user_id).order_by(cls.created_at.desc()).all()
            return [entry.to_dict() for entry in results]
        except SQLAlchemyError as e:
            current_app.logger.error(f"[DB ERROR] get_user_submissions: {e}")
            return []
        
    @classmethod
    def get_input_suggestions(cls):
        try:
            results = db.session.query(
                cls.id,
                User.name.label("username"),
                cls.created_at,
                cls.status,
                cls.editing_by,
                cls.comment
            ).join(User, User.id == cls.user_id) \
            .order_by(cls.created_at.desc()) \
            .all()

            return [
                {
                    "id": row.id,
                    "username": row.username,
                    "created_at": row.created_at.isoformat(),
                    "status": row.status,
                    "editing_by": row.editing_by,
                    "comment": row.comment
                }
                for row in results
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"[DB ERROR] get_input_suggestions error : {e}")
            return []


    @classmethod
    def delete_by_id_if_owned(cls, entry_id: int, user_id: int) -> bool:
        try:
            entry = cls.query.filter_by(id=entry_id, user_id=user_id).first()
            if not entry:
                return False

            db.session.delete(entry)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            current_app.logger.error(f"[DB ERROR] (delete_by_id_if_owned) Failed to delete InputData id={entry_id}: {e}")
            db.session.rollback()
            return False

    @classmethod
    def set_status(cls, id: int, status: str, editing_by: str = None):
        try:
            entry = cls.query.filter_by(id=id).first()
            if not entry:
                return None
            
            entry.status = status
            entry.editing_by = editing_by
            db.session.commit()
            return entry.to_dict()
        except SQLAlchemyError as e:
            current_app.logger.error(f"[DB ERROR] Failed to set status for InputData id={id}: {e}")
            db.session.rollback()
            return None
