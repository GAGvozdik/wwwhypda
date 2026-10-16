"""Read-only long-format search of the public scientific catalog."""
import re
from common_defenitions import db
from rocks.rocks_models import RockType, Sample, Measure, Parameter


def is_catalog_root(rock):
    name = " ".join(rock.rt_name.strip().strip("-").strip().lower().split())
    return rock.rt_id_parent == -1 and name == "generic earth material"


def parse_id(value):
    # Zero is a real catalog ID; 'all' is handled separately, never a numeric sentinel.
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]+", value):
        raise ValueError("Invalid catalog filter")
    number = int(value)
    if number > 2147483647:
        raise ValueError("Invalid catalog filter")
    return number


def search_catalog(rock_id, parameter_id):
    rock = db.session.get(RockType, rock_id)
    if rock is None:
        raise LookupError("Unknown rock type")
    if parameter_id != "all" and db.session.get(Parameter, parameter_id) is None:
        raise LookupError("Unknown parameter")
    roots = [r for r in RockType.query.filter_by(rt_id_parent=-1).all() if is_catalog_root(r)]
    # Ambiguity must never accidentally broaden an ordinary filter.
    if len(roots) != 1:
        raise RuntimeError("Catalog root is not unique")
    query = db.session.query(Sample, RockType, Measure, Parameter).join(
        RockType, Sample.key_rt == RockType.rt_id).outerjoin(
        Measure, Measure.id_smpl == Sample.id_Sample).outerjoin(
        Parameter, Parameter.id_Parameter == Measure.id_par_msr)
    if rock_id != roots[0].rt_id:
        query = query.filter(Sample.key_rt == rock_id)
    if parameter_id != "all":
        query = query.filter(Measure.id_par_msr == parameter_id)
    query = query.order_by(Sample.id_Sample, Measure.id_par_msr, Measure.id_Measure)
    empty_measure = Measure().to_dict()
    rows = []
    for sample, rock_type, measure, parameter in query.all():
        rows.append({
            **(measure.to_dict() if measure else empty_measure),
            "id_Sample": sample.id_Sample, "sample_name": sample.sample_name,
            "rt_id": rock_type.rt_id, "rt_name": rock_type.rt_name,
            "param_name": parameter.param_name if parameter else None,
            "parameter_code": parameter.code if parameter else None,
            "units": parameter.units if parameter else None,
            "row_id": f"measure:{measure.id_Measure}" if measure else f"sample:{sample.id_Sample}:no-measure",
        })
    return rows
