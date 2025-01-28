from flask_sqlalchemy import SQLAlchemy
import datetime
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
import random
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    is_active = db.Column(db.Boolean(), default=False)

    @staticmethod
    def find_by_username(username):
        return User.query.filter_by(username=username).first()

    @staticmethod
    def find_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(username, email, password):
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, email=email, password=hashed_password, is_active=False)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    def check_password(self, password):
        return check_password_hash(self.password, password)

class Source(db.Model):
    id_Source = db.Column(db.Integer, primary_key=True, autoincrement=True)
    authors = db.Column(db.String(200), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    year_Source = db.Column(db.Integer, nullable=False)
    doi = db.Column(db.String(500))
    publisher = db.Column(db.String(200), nullable=False)
    pages = db.Column(db.String(20))
    sou_link = db.Column(db.String(500))

    __table_args__ = (
        db.UniqueConstraint('authors', 'title', 'year_Source', 'publisher'),
    )

    def to_dict(self):
        return {
            "id_Source": self.id_Source,
            "authors": self.authors,
            "title": self.title,
            "year_Source": self.year_Source,
            "doi": self.doi,
            "publisher": self.publisher,
            "pages": self.pages,
            "sou_link": self.sou_link,
        }

    @staticmethod
    def getDataAnonce():
        try:
            results = db.session.query(Source).order_by(Source.id_Source.desc()).all()
            return [source.to_dict() for source in results]
        except Exception as e:
            print(f"getDataAnonce error: {e}")
            return []


class RockType(db.Model):
    __tablename__ = 'Rock_type'
    rt_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    rt_name = db.Column(db.String(100), nullable=False, unique=True)
    rt_description = db.Column(db.String(500))
    rt_wiki_link = db.Column(db.String(500))
    rt_left = db.Column(db.Integer, nullable=False)
    rt_right = db.Column(db.Integer, nullable=False)
    rt_id_parent = db.Column(db.Integer, db.ForeignKey('Rock_type.rt_id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    rt_USCS = db.Column(db.String(5))
    UID = db.Column(db.String(50), unique=True)
    PARENTUID = db.Column(db.String(50), db.ForeignKey('Rock_type.UID', onupdate='CASCADE'))
    rt_status = db.Column(db.Integer, db.ForeignKey('status.id_Status', onupdate='CASCADE'), default=0, nullable=False)

    def __repr__(self):
        return f'<RockType {self.rt_name}>'

    def to_dict(self):
        return {
            'rt_id': self.rt_id,
            'rt_name': self.rt_name,
            'rt_description': self.rt_description,
            'rt_wiki_link': self.rt_wiki_link,
            'rt_left': self.rt_left,
            'rt_right': self.rt_right,
            'rt_id_parent': self.rt_id_parent,
            'rt_USCS': self.rt_USCS,
            'UID': self.UID,
            'PARENTUID': self.PARENTUID,
            'rt_status': self.rt_status,
        }
    
    @staticmethod
    def getRockTypes():
        try:
            results = db.session.query(RockType).order_by(RockType.rt_id.desc()).all()
            return [rocktype.to_dict() for rocktype in results]
        except Exception as e:
            print(f"getRockTypes error: {e}")
            return []



# Модель для таблицы measure_group
class MeasureGroup(db.Model):
    id_Measure_group = db.Column(db.Integer, primary_key=True)
    mg_date = db.Column(db.DateTime, nullable=False, unique=True)
    mg_comment = db.Column(db.String(500))
    id_src = db.Column(db.Integer, db.ForeignKey('source.id_Source'), nullable=False)
    id_rew = db.Column(db.Integer, db.ForeignKey('review.id_Review'), nullable=False)
    id_env = db.Column(db.Integer, db.ForeignKey('environment.env_id'), nullable=False)
    id_cnt = db.Column(db.Integer, db.ForeignKey('contact.id_Contact'), nullable=False)
    id_pnt = db.Column(db.Integer, db.ForeignKey('site_info.site_id'), nullable=False)
    mgr_spreasheetID = db.Column(db.String(100))
    mgr_DuplicationWarning = db.Column(db.Integer, default=0, nullable=False)
    mgr_CoherenceWarning = db.Column(db.Integer, default=0, nullable=False)
    mgr_UpdateWarning = db.Column(db.Integer, default=0, nullable=False)

    # Отношение "один ко многим" с таблицей Sample
    # samples = relationship("Sample", backref="measure_group", lazy=True)

class Sample(db.Model):
    __tablename__ = 'Sample'
    id_Sample = db.Column(db.Integer, primary_key=True, autoincrement=True)
    key_Fract = db.Column(db.Integer, db.ForeignKey('fracturation.id_fracturation', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    key_rt = db.Column(db.Integer, db.ForeignKey('rock_type.rt_id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    key_Scale = db.Column(db.Integer, db.ForeignKey('scale.id_Scale', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    key_Mgroup = db.Column(db.Integer, db.ForeignKey('measure_group.id_Measure_group', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    sample_name = db.Column(db.String(30), nullable=False)
    sample_comment = db.Column(db.String(500))

    def __repr__(self):
        return f'<Sample {self.sample_name}>'

    def to_dict(self):
        return {
            'id_Sample': self.id_Sample,
            'key_Fract': self.key_Fract,
            'key_rt': self.key_rt,
            'key_Scale': self.key_Scale,
            'key_Mgroup': self.key_Mgroup,
            'sample_name': self.sample_name,
            'sample_comment': self.sample_comment,
        }

    @staticmethod
    def getSamplesByRockType(rt_id: int):
        try:
            # Получаем сессию базы данных
            session = db.session
            
            # Выполняем запрос к базе данных
            samples = session.query(Sample).filter(Sample.key_rt == rt_id).all()
            
            # Преобразуем результаты в словарь
            return [sample.to_dict() for sample in samples]
        
        except Exception as e:
            print(f"getSamplesByRockType error: {e}")
            return []
        
class Measure(db.Model):
    __tablename__ = 'Measure'
    id_Measure = db.Column(db.Integer, primary_key=True, autoincrement=True)
    msr_comment = db.Column(db.String(500), default=None)
    msr_value = db.Column(db.Float, nullable=False)
    error = db.Column(db.Float, default=None)
    coher_date = db.Column(db.DateTime, default=None)
    coher_n_val = db.Column(db.Integer, default=None)
    id_smpl = db.Column(db.Integer, db.ForeignKey('Sample.id_Sample', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    id_coh = db.Column(db.Integer, nullable=False, default=0)
    id_ex_ty = db.Column(db.Integer, nullable=False)
    id_par_msr = db.Column(db.Integer, nullable=False)
    id_int_mtd = db.Column(db.Integer, nullable=False)
    id_qlt = db.Column(db.Integer, nullable=False)

    def __repr__(self):
        return f'<Measure {self.id_Measure}>'

    def to_dict(self):
        return {
            'id_Measure': self.id_Measure,
            'msr_comment': self.msr_comment,
            'msr_value': self.msr_value,
            'error': self.error,
            'coher_date': self.coher_date,
            'coher_n_val': self.coher_n_val,
            'id_smpl': self.id_smpl,
            'id_coh': self.id_coh,
            'id_ex_ty': self.id_ex_ty,
            'id_par_msr': self.id_par_msr,
            'id_int_mtd': self.id_int_mtd,
            'id_qlt': self.id_qlt,
        }
    @staticmethod
    def getMeasuresBySampleIdAndParam(sample_ids, param_id):
        try:
            session = db.session
            measures = session.query(Measure).filter(
                Measure.id_smpl.in_(sample_ids),
                Measure.id_par_msr == param_id
            ).all()
            return [measure.to_dict() for measure in measures]
        except Exception as e:
            print(f"getMeasuresBySampleIdAndParam error: {e}")
            return []
        
class Parameter(db.Model):
    __tablename__ = 'Parameter'
    id_Parameter = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False)
    param_name = db.Column(db.String(30), unique=True, nullable=False)
    units = db.Column(db.String(10), nullable=False)
    html_code = db.Column(db.String(30), unique=True, nullable=False)
    html_units = db.Column(db.String(50), nullable=False)
    MaxValue = db.Column(db.Float, nullable=False)
    MinValue = db.Column(db.Float, nullable=False)

    __table_args__ = (db.UniqueConstraint('param_name', 'code', 'html_code', name='_param_code_html_uc'),)


    def to_dict(self):
        return {
            'id_Parameter': self.id_Parameter,
            'code': self.code,
            'param_name': self.param_name,
            'units': self.units,
            'html_code': self.html_code,
            'html_units': self.html_units,
            'MaxValue': self.MaxValue,
            'MinValue': self.MinValue
        }


    @staticmethod
    def getParameters():
        try:
            results = db.session.query(Parameter).order_by(Parameter.id_Parameter.desc()).all()
            return [parameter.to_dict() for parameter in results]
        except Exception as e:
            print(f"getParameters error: {e}")
            return []

# samples = Sample.getSamplesByRockType(3)
# print(samples)