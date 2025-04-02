"""Validator Module"""
import re

"""Validator Module"""
import re

def validate(data, regex):
    """Custom Validator"""
    return bool(re.match(regex, data))

def validate_password(password: str):
    """Password Validator"""
    reg = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$"
    if not validate(password, reg):
        return "Password must be 8-20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
    return True

def validate_email(email: str):
    """Email Validator"""
    regex = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
    if not validate(email, regex):
        return "Email is invalid. Expected format: example@domain.com"
    return True

def validate_name(name: str):
    """Name Validator"""
    if not isinstance(name, str):
        return "Name must be a string."
    if not (3 <= len(name) <= 30):
        return "Name must be between 3 and 30 characters long."
    if not re.match(r"^[A-Za-z0-9\s'-]+$", name):
        return "Name can only contain letters, numbers, spaces, hyphens, and apostrophes."
    return True

def validate_user(**args):
    """User Validator"""
    errors = {}

    if not args.get("email"):
        errors["email"] = "Email is required."
    else:
        email_validation = validate_email(args["email"])
        if email_validation is not True:
            errors["email"] = email_validation

    if not args.get("password"):
        errors["password"] = "Password is required."
    else:
        password_validation = validate_password(args["password"])
        if password_validation is not True:
            errors["password"] = password_validation

    if not args.get("name"):
        errors["name"] = "Name is required."
    else:
        name_validation = validate_name(args["name"])
        if name_validation is not True:
            errors["name"] = name_validation

    return errors if errors else True

def validate_email_and_password(email, password):
    """Email and Password Validator"""
    errors = {}
    
    if not email:
        errors['email'] = 'Email is required.'
    else:
        email_validation = validate_email(email)
        if email_validation is not True:
            errors['email'] = email_validation
    
    if not password:
        errors['password'] = 'Password is required.'
    else:
        password_validation = validate_password(password)
        if password_validation is not True:
            errors['password'] = password_validation
    
    return errors if errors else True
