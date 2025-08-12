"""Validator Module"""
import re
import json
import os

# Construct the absolute path to the JSON file
# This goes up two directories from validate.py (auth -> wwwhypda-backend -> root) and then into common/
json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'common', 'error_messages.json'))

# Load error messages from the JSON file
with open(json_path, 'r') as f:
    messages = json.load(f)

def validate(data, regex):
    """Custom Validator"""
    return bool(re.match(regex, data))

def validate_password(password: str):
    """Password Validator"""
    reg = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$"
    if not validate(password, reg):
        return messages['password_invalid']
    return True

def validate_email(email: str):
    """Email Validator"""
    regex = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    if not validate(email, regex):
        return messages['email_invalid']
    return True

def validate_name(name: str):
    """Name Validator"""
    if not isinstance(name, str):
        return messages['name_must_be_string']
    if not (3 <= len(name) <= 30):
        return messages['name_length']
    if not re.match(r"^[A-Za-z0-9\s'-]+$", name):
        return messages['name_invalid_format']
    return True

def validate_user(**args):
    """User Validator"""
    errors = {}

    if not args.get("email"):
        errors["email"] = messages['email_required']
    else:
        email_validation = validate_email(args["email"])
        if email_validation is not True:
            errors["email"] = email_validation

    if not args.get("password"):
        errors["password"] = messages['password_required']
    else:
        password_validation = validate_password(args["password"])
        if password_validation is not True:
            errors["password"] = password_validation

    if not args.get("name"):
        errors["name"] = messages['name_required']
    else:
        name_validation = validate_name(args["name"])
        if name_validation is not True:
            errors["name"] = name_validation

    return errors if errors else True

def validate_email_and_password(email, password):
    """Email and Password Validator"""
    errors = {}
    
    if not email:
        errors['email'] = messages['email_required']
    else:
        email_validation = validate_email(email)
        if email_validation is not True:
            errors['email'] = email_validation
    
    if not password:
        errors['password'] = messages['password_required']
    else:
        password_validation = validate_password(password)
        if password_validation is not True:
            errors['password'] = password_validation
    
    return errors if errors else True