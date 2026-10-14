"""Separate retention worker; no mainApp import, env-file reading or SMTP."""
import argparse
import logging
import os
import signal
from threading import Event
from flask import Flask
from common_defenitions import db
from auth.migrate_terms_acceptance import configured_engine, SchemaError
from maintenance.retention import cleanup, check_schema, validate_interval


def create_app():
    engine = configured_engine()
    url = engine.url
    engine.dispose()
    app = Flask(__name__)
    app.config.update(SQLALCHEMY_DATABASE_URI="sqlite://",
        SQLALCHEMY_BINDS={"users_db": {"url": url,
            "hide_parameters": True, "connect_args": {"connect_timeout": 5}}},
        DATA_RETENTION_CLEANUP_INTERVAL_SECONDS=validate_interval(
            os.environ.get("DATA_RETENTION_CLEANUP_INTERVAL_SECONDS", "3600")))
    db.init_app(app)
    return app


def cleanup_once(app, execute=False):
    with app.app_context():
        try:
            counts = cleanup(execute=execute)
            app.logger.info("Retention %s: accounts=%s submissions=%s codes=%s unknown_accounts=%s "
                "unknown_submissions=%s protected_superusers=%s", "execute" if execute else "dry-run",
                counts["accounts"], counts["submissions"], counts["codes"], counts["unknown_accounts"],
                counts["unknown_submissions"], counts["protected_superusers"])
            return True
        except Exception:
            db.session.rollback()
            app.logger.error("Retention pass failed; retry required; earlier committed batches remain applied")
            return False
        finally:
            db.session.remove()


def run_worker(app, stop):
    interval = validate_interval(app.config["DATA_RETENTION_CLEANUP_INTERVAL_SECONDS"])
    while not stop.is_set():
        cleanup_once(app, execute=True)
        stop.wait(interval)


def run_until_stopped(app):
    stop = Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stop.set())
    run_worker(app, stop)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--once", action="store_true")
    modes.add_argument("--worker", action="store_true")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args(argv)
    if args.worker and not args.execute:
        parser.error("--worker requires --execute")
    logging.basicConfig(level=logging.INFO)
    try:
        app = create_app()
        with app.app_context():
            check_schema()
    except SchemaError:
        logging.error("Retention schema unavailable/incompatible; apply migration before startup")
        return 1
    except Exception:
        logging.error("Retention startup failed; check configuration/database/schema")
        return 1
    if args.once:
        return 0 if cleanup_once(app, execute=args.execute) else 1
    run_until_stopped(app)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
