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


class InputData(db.Model):
    __tablename__ = 'input_data'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    general_info = db.Column(JSON, nullable=False)
    measurements = db.Column(JSON, nullable=False)
    samples = db.Column(JSON, nullable=False)
    site_info = db.Column(JSON, nullable=False)
    source_info = db.Column(JSON, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "generalInfoData": self.general_info,
            "measurementsTableData": self.measurements,
            "sampleMeasurementTableData": self.samples,
            "siteInfoTableData": self.site_info,
            "sourceTableData": self.source_info
        }

    @classmethod
    def save_submission(cls, user_id: int, data: dict):
        try:
            entry = cls(
                user_id=user_id,
                general_info=data.get('generalInfoData', []),
                measurements=data.get('measurementsTableData', []),
                samples=data.get('sampleMeasurementTableData', []),
                site_info=data.get('siteInfoTableData', []),
                source_info=data.get('sourceTableData', [])
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
            current_app.logger.error(f"[DB ERROR] Failed to retrieve InputData: {e}")
            return []
        
    @classmethod
    def get_input_suggestions(cls):
        try:
            results = db.session.query(cls.id, cls.user_id, cls.created_at).order_by(cls.created_at.desc()).all()
            return [
                {
                    "id": row.id,
                    "user_id": row.user_id,
                    "created_at": row.created_at.isoformat()
                }
                for row in results
            ]
        except SQLAlchemyError as e:
            current_app.logger.error(f"get_input_suggestions error : {e}")
            return []

