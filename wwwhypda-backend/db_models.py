from flask_sqlalchemy import SQLAlchemy
import datetime
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import relationship
import random
from werkzeug.security import generate_password_hash, check_password_hash
from flask import Flask, jsonify, session, request, redirect, url_for

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

    @classmethod
    def get_all_samples():
        try:
            results = db.session.query(Sample).all()
            return [sample.to_dict() for sample in results]
        except Exception as e:
            print(f"get_all_samples error: {e}")
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

class Country(db.Model):
    __tablename__ = 'Country'
    
    ISO_code = db.Column(db.String(3), primary_key=True, nullable=False, default='AAA')
    country_name = db.Column(db.String(50), unique=True, nullable=False)

    def __repr__(self):
        return f"<Country(ISO_code='{self.ISO_code}', country_name='{self.country_name}')>"

    @classmethod
    def get_all_countries(cls):
        try:
            countries = cls.query.all()
            return jsonify([{ 'ISO_code': country.ISO_code, 'country_name': country.country_name } for country in countries])
        except Exception as e:
            return jsonify({
                'error': 'Error in Country.get_all_countries',
                'details': str(e)
            }), 500


class Review(db.Model):
    __tablename__ = 'Review'
    
    id_Review = db.Column(db.Integer, primary_key=True, nullable=False)
    review_level = db.Column(db.String(70), unique=True, nullable=False)

    def __repr__(self):
        return f"<Review(id_Review='{self.id_Review}', review_level='{self.review_level}')>"

    @classmethod
    def get_all_reviews(cls):
        try:
            reviews = cls.query.all()
            return jsonify([{ 'id_Review': review.id_Review, 'review_level': review.review_level } for review in reviews])
        except Exception as e:
            return jsonify({
                'error': 'Error in Review.get_all_reviews',
                'details': str(e)
            }), 500
        
class Environment(db.Model):
    __tablename__ = 'Environment'
    
    env_id = db.Column(db.Integer, primary_key=True, autoincrement=True, nullable=False)
    env_name = db.Column(db.String(100), nullable=False)
    env_description = db.Column(db.String(500), nullable=False)
    env_wiki_link = db.Column(db.String(500), nullable=True)
    env_id_parent = db.Column(db.Integer, db.ForeignKey('Environment.env_id', ondelete='CASCADE', onupdate='CASCADE'), nullable=False)
    UID = db.Column(db.String(50), unique=True, nullable=True)
    PARENTUID = db.Column(db.String(50), nullable=True)
    env_Status = db.Column(db.Integer, db.ForeignKey('status.id_Status', onupdate='CASCADE'), nullable=False, default=0)

    def __repr__(self):
        return f"<Environment(env_id='{self.env_id}', env_name='{self.env_name}')>"

    @classmethod
    def get_all_environments(cls):
        try:
            environments = cls.query.all()
            return jsonify([{ 
                'env_id': env.env_id, 
                'env_name': env.env_name, 
                'env_description': env.env_description,
                'env_wiki_link': env.env_wiki_link,
                'env_id_parent': env.env_id_parent,
                'UID': env.UID,
                'PARENTUID': env.PARENTUID,
                'env_Status': env.env_Status
            } for env in environments])
        except Exception as e:
            return jsonify({
                'error': 'Error in Environment.get_all_environments',
                'details': str(e)
            }), 500


class Fracturation(db.Model):
    __tablename__ = 'Fracturation'

    id_fracturation = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fracturation_degree = db.Column(db.String(20), nullable=False)

    @staticmethod
    def get_all_fracturations():
        try:
            fracturations = Fracturation.query.all()
            return jsonify([{"id_fracturation": f.id_fracturation, "fracturation_degree": f.fracturation_degree} for f in fracturations]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        

class Scale(db.Model):
    __tablename__ = 'Scale'

    id_Scale = db.Column(db.Integer, primary_key=True)
    scale_value = db.Column(db.String(50), nullable=False, unique=True)
    scale_descr = db.Column(db.String(125), nullable=True)

    @staticmethod
    def get_all_scales():
        try:
            scales = Scale.query.all()
            return jsonify([{"id_Scale": s.id_Scale, "scale_value": s.scale_value, "scale_descr": s.scale_descr} for s in scales]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

class Quality(db.Model):
    __tablename__ = 'Quality'

    id_Quality = db.Column(db.Integer, primary_key=True)
    quality_level = db.Column(db.String(20), nullable=False, unique=True)

    @staticmethod
    def get_all_qualities():
        try:
            qualities = Quality.query.all()
            return jsonify([{
                "id_Quality": q.id_Quality,
                "quality_level": q.quality_level
            } for q in qualities]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

class ExperimentType(db.Model):
    __tablename__ = 'Experiment_type'

    id_Exp_type = db.Column(db.Integer, primary_key=True, autoincrement=True)
    exp_name = db.Column(db.String(100), nullable=False)
    exp_description = db.Column(db.String(500), nullable=False)
    exp_status = db.Column(db.Integer, db.ForeignKey('status.id_Status'), nullable=False, default=0)

    @staticmethod
    def get_all_experiment_types():
        try:
            experiment_types = ExperimentType.query.all()
            return jsonify([{
                "id_Exp_type": e.id_Exp_type,
                "exp_name": e.exp_name,
                "exp_description": e.exp_description,
                "exp_status": e.exp_status
            } for e in experiment_types]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

class InterpretationMethod(db.Model):
    __tablename__ = 'Interpretation_method'

    id_Int_meth = db.Column(db.Integer, primary_key=True, autoincrement=True)
    int_meth_name = db.Column(db.String(100), nullable=False)
    int_meth_desc = db.Column(db.String(500), nullable=False)
    id_Exp_ty = db.Column(db.Integer, db.ForeignKey('Experiment_type.id_Exp_type'), nullable=False)
    int_meth_status = db.Column(db.Integer, db.ForeignKey('status.id_Status'), nullable=False, default=0)

    @staticmethod
    def get_all_interpretation_methods():
        try:
            methods = InterpretationMethod.query.all()
            return jsonify([{
                "id_Int_meth": m.id_Int_meth,
                "int_meth_name": m.int_meth_name,
                "int_meth_desc": m.int_meth_desc,
                "id_Exp_ty": m.id_Exp_ty,
                "int_meth_status": m.int_meth_status
            } for m in methods]), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500





