"""Module for initializing global Flask extensions.

This module defines global instances of Flask extensions (Flask-Mail and SQLAlchemy)
to be initialized separately from the main application. 

By defining these instances here and initializing them in the main application, 
we avoid circular imports when splitting the application into multiple modules.
"""

from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy

# Create instances of Flask extensions without binding them to the app.
# This allows importing these objects across different modules without 
# causing circular dependency issues.

mail = Mail()  # Mail instance for handling email-related functionality.
db = SQLAlchemy()  # SQLAlchemy instance for database interactions.
