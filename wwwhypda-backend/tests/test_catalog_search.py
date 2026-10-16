"""Synthetic SQLite catalog, real SQLAlchemy joins; no mainApp/env/working DB."""
import unittest
from unittest.mock import patch
from flask import Flask
from sqlalchemy import event, text
from sqlalchemy.exc import SQLAlchemyError
from common_defenitions import db, limiter
from rocks.rocks_bp import rocks_bp
from rocks.rocks_models import RockType, Parameter, Sample, Measure


class CatalogSearchTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, APP_ENV="development", SQLALCHEMY_DATABASE_URI="sqlite://",
                               RATELIMIT_ENABLED=False, RECAPTCHA_ENABLED=True)
        db.init_app(self.app)
        from flask_jwt_extended import JWTManager
        JWTManager(self.app)
        limiter.init_app(self.app)
        self.app.register_blueprint(rocks_bp)
        self.context = self.app.app_context(); self.context.push()
        db.create_all(bind_key=None)
        db.session.add_all([
            RockType(rt_id=73, rt_name="-- generic earth material --", rt_id_parent=-1, rt_left=1, rt_right=10),
            RockType(rt_id=11, rt_name="Parent", rt_id_parent=73, rt_left=2, rt_right=7),
            RockType(rt_id=21, rt_name="Child", rt_id_parent=11, rt_left=3, rt_right=4),
            RockType(rt_id=31, rt_name="Empty", rt_id_parent=73, rt_left=8, rt_right=9),
            Parameter(id_Parameter=4, code="A", param_name="Alpha", units="m", html_code="A", html_units="m", MaxValue=100, MinValue=0),
            Parameter(id_Parameter=8, code="B", param_name="Beta", units="s", html_code="B", html_units="s", MaxValue=100, MinValue=0),
        ])
        for number, rock in [(101,11), (102,21), (103,11)]:
            db.session.add(Sample(id_Sample=number,key_rt=rock,key_Fract=1,key_Scale=1,key_Mgroup=1,sample_name=f"Sample {number}"))
        for number, sample, parameter, value, error in [(1,101,4,0,0),(2,101,4,0,None),(3,101,8,3,.2),(4,102,4,7,None)]:
            db.session.add(Measure(id_Measure=number,id_smpl=sample,id_par_msr=parameter,msr_value=value,error=error,id_ex_ty=1,id_int_mtd=1,id_qlt=1))
        db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove(); db.drop_all(bind_key=None); self.context.pop()

    def search(self, rock=73, parameter="all"):
        return self.client.get(f"/rocks/search?rock_type_id={rock}&parameter_id={parameter}",headers={"X-Recaptcha-Token":"test-token"})

    def test_four_combinations_and_no_implicit_descendants(self):
        for rock, par, expected in [(11,4,["measure:1","measure:2"]),(11,"all",["measure:1","measure:2","measure:3","sample:103:no-measure"]),
                                   (73,4,["measure:1","measure:2","measure:4"]),(73,"all",["measure:1","measure:2","measure:3","measure:4","sample:103:no-measure"])]:
            with self.subTest(rock=rock,parameter=par):
                response=self.search(rock,par); self.assertEqual(response.status_code,200)
                self.assertEqual([r["row_id"] for r in response.json],expected)

    def test_uniform_fields_zero_error_null_and_repeated_measures(self):
        rows=self.search().json
        self.assertTrue(all(set(row)==set(rows[0]) for row in rows))
        self.assertEqual(rows[0]["msr_value"],0); self.assertEqual(rows[0]["error"],0)
        self.assertIsNone(rows[1]["error"]); self.assertEqual(rows[2]["units"],"s")
        self.assertEqual(rows[0]["sample_name"],"Sample 101")
        for key in Measure().to_dict(): self.assertIsNone(rows[-1][key],key)

    def test_invalid_missing_duplicate_and_unknown_filters(self):
        for query in ["", "rock_type_id=11", "rock_type_id=11&parameter_id=ALL", "rock_type_id=-1&parameter_id=all",
                      "rock_type_id=11&parameter_id=4x", "rock_type_id=1.5&parameter_id=all", "rock_type_id=11&parameter_id=",
                      "rock_type_id=11&rock_type_id=73&parameter_id=all", "rock_type_id=11&parameter_id=4&parameter_id=8",
                      "rock_type_id=11&parameter_id=all&extra=1", "rock_type_id=99999999999999999999&parameter_id=all"]:
            self.assertEqual(self.client.get('/rocks/search?'+query,headers={"X-Recaptcha-Token":"test-token"}).status_code,400,query)
        self.assertEqual(self.search(999).status_code,404)
        self.assertEqual(self.search(11,999).status_code,404)
        self.assertEqual(self.search(31).json,[])

    def test_zero_is_valid_id_and_root_normalization_is_exact(self):
        from rocks.catalog_search import is_catalog_root, parse_id
        self.assertEqual(parse_id("0"),0)
        self.assertTrue(is_catalog_root(RockType(rt_name="  -- GENERIC   EARTH MATERIAL --  ",rt_id_parent=-1)))
        self.assertFalse(is_catalog_root(RockType(rt_name="generic earth material extra",rt_id_parent=-1)))
        self.assertFalse(is_catalog_root(RockType(rt_name="-- generic earth material --",rt_id_parent=73)))

    def test_failure_is_safe_500_and_ambiguous_root_is_not_broad_search(self):
        with patch('rocks.catalog_search.search_catalog',side_effect=SQLAlchemyError("private SQL")):
            response=self.search(); self.assertEqual(response.status_code,500)
            self.assertNotIn("private",response.get_data(as_text=True))
        db.session.add(RockType(rt_id=99,rt_name="GENERIC EARTH MATERIAL",rt_id_parent=-1,rt_left=1,rt_right=2));db.session.commit()
        self.assertEqual(self.search().status_code,500)

    def test_legacy_shape_and_protected_whole_catalog_endpoint(self):
        response=self.client.get('/rocks/samples/11/4',headers={"X-Recaptcha-Token":"test-token"})
        self.assertEqual(response.status_code,200);self.assertEqual(len(response.json),2)
        self.assertEqual(set(response.json[0]),set(Measure().to_dict()))
        self.assertNotEqual(self.client.get('/rocks/samples').status_code,200)

    def test_real_verifier_expected_action_host_and_token_rejection(self):
        self.app.config.update(TESTING=False,RECAPTCHA_SECRET_KEY="synthetic-secret",RECAPTCHA_MIN_SCORE=.5,
            RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({"localhost"}),RECAPTCHA_RETRIES=1,
            RECAPTCHA_VERIFY_URL="https://www.google.com/recaptcha/api/siteverify",RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0)
        with patch('common_defenitions.requests.post') as post:
            self.assertEqual(self.search().status_code,400)
            self.assertEqual(self.client.get('/rocks/search?rock_type_id=73&parameter_id=all').status_code,400)
            for changes, status in [({},200),({"action":"login"},400),({"hostname":"foreign.test"},400),({"score":.1},400),({"success":False},400)]:
                post.return_value.json.return_value={"success":True,"score":.9,"action":"search","hostname":"localhost",**changes}
                response=self.client.get('/rocks/search?rock_type_id=73&parameter_id=all',headers={"X-Recaptcha-Token":"synthetic-token"})
                self.assertEqual(response.status_code,status)

    def test_global_rate_limit_still_applies(self):
        # A separate app/limiter fixture uses the same global default mechanism as runtime.
        app=Flask('rate-test');app.config.update(TESTING=True,RATELIMIT_DEFAULT="2 per minute",RATELIMIT_STORAGE_URI="memory://")
        from flask_limiter import Limiter
        from flask_limiter.util import get_remote_address
        test_limiter=Limiter(key_func=get_remote_address);test_limiter.init_app(app)
        app.register_blueprint(rocks_bp)
        client=app.test_client()
        with patch('rocks.rocks_bp.verify_recaptcha',return_value=(False,({"message":"Verification failed"},400))):
            self.assertEqual(client.get('/rocks/search').status_code,400)
            self.assertEqual(client.get('/rocks/search').status_code,400)
            self.assertEqual(client.get('/rocks/search').status_code,429)

    def test_larger_catalog_has_constant_query_count_and_query_plan(self):
        for number in range(200,1200):
            db.session.add(Sample(id_Sample=number,key_rt=21,key_Fract=1,key_Scale=1,key_Mgroup=1,sample_name=f"Synthetic {number}"))
        db.session.commit();db.session.remove()
        queries=[]
        def count(conn,cursor,statement,parameters,context,executemany): queries.append(statement)
        event.listen(db.engine,'before_cursor_execute',count)
        try:
            response=self.search();self.assertEqual(response.status_code,200)
            self.assertEqual(len(response.json),1005);self.assertLessEqual(len(queries),4)
        finally: event.remove(db.engine,'before_cursor_execute',count)
        plan=db.session.execute(text('EXPLAIN QUERY PLAN SELECT s."id_Sample" FROM "Sample" s LEFT JOIN "Measure" m ON m.id_smpl=s."id_Sample" ORDER BY s."id_Sample",m.id_par_msr,m."id_Measure"')).all()
        self.assertTrue(plan)


if __name__ == '__main__': unittest.main()
