from mainApp import app
from common_defenitions import db
from rocks.rocks_models import RockType, Sample, Measure, Parameter

with app.app_context():
    print(f"RockTypes: {db.session.query(RockType).count()}")
    print(f"Samples: {db.session.query(Sample).count()}")
    print(f"Measures: {db.session.query(Measure).count()}")
    print(f"Parameters: {db.session.query(Parameter).count()}")
    
    # Проверка конкретного запроса
    rt_id, p_id = 0, 5
    samples = db.session.query(Sample).filter_by(key_rt=rt_id).all()
    print(f"Samples for rt_id={rt_id}: {len(samples)}")
    if samples:
        s_ids = [s.id_Sample for s in samples]
        measures = db.session.query(Measure).filter(Measure.id_smpl.in_(s_ids), Measure.id_par_msr == p_id).count()
        print(f"Measures for rt_id={rt_id} and param_id={p_id}: {measures}")
