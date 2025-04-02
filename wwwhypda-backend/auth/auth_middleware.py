from functools import wraps
import jwt
from flask import request, abort, current_app
import auth.auth_models as auth_models
import time

def token_required(f):
    """
    Decorator to enforce authentication via JWT token.
    
    - Ensures that a valid 'Bearer' token is present in the request headers.
    - If the token is missing or incorrectly formatted, returns a 401 response.
    - If the token is expired or invalid, returns a 401 response.
    - If the user does not exist or is inactive, returns a 401 or 403 response.
    - If the token is valid, passes the authenticated user to the wrapped function.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or " " not in auth_header:
            return {
                "message": "Authentication Token is missing or malformed!",
                "data": None,
                "error": "Unauthorized"
            }, 401

        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0] != "Bearer":
            return {
                "message": "Invalid token format! Expected 'Bearer <token>'",
                "data": None,
                "error": "Unauthorized"
            }, 401

        token = parts[1]

        try:
            # Decode JWT token using the application's secret key
            data = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])

            # Ensure the token has not expired
            if "exp" in data and data["exp"] < time.time():
                return {
                    "message": "Token has expired!",
                    "data": None,
                    "error": "Unauthorized"
                }, 401

            # Fetch the user associated with the token
            current_user = auth_models.User().get_by_id(data["user_id"])

            if current_user is None:
                return {
                    "message": "Invalid Authentication token!",
                    "data": None,
                    "error": "Unauthorized"
                }, 401

            if not current_user["active"]:
                abort(403)  # Forbidden: User is inactive

        except jwt.ExpiredSignatureError:
            return {
                "message": "Token has expired!",
                "data": None,
                "error": "Unauthorized"
            }, 401

        except jwt.InvalidTokenError:
            return {
                "message": "Invalid token!",
                "data": None,
                "error": "Unauthorized"
            }, 401

        except Exception as e:
            return {
                "message": "Something went wrong",
                "data": None,
                "error": str(e)
            }, 500

        # Pass the authenticated user to the wrapped function
        return f(current_user, *args, **kwargs)

    return decorated

def optional_token(f):
    """
    Decorator to allow endpoints to accept optional JWT tokens.
    
    - If a valid token is provided, it passes the authenticated user.
    - If no token is provided, or it is invalid, the function still executes with `current_user=None`.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if auth_header and " " in auth_header:
            parts = auth_header.split(" ")
            if len(parts) == 2 and parts[0] == "Bearer":
                token = parts[1]

                try:
                    data = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])

                    # Ensure the token has not expired
                    if "exp" in data and data["exp"] < time.time():
                        return {
                            "message": "Token has expired!",
                            "data": None,
                            "error": "Unauthorized"
                        }, 401

                    current_user = auth_models.User().get_by_id(data["user_id"])

                    if current_user is not None and current_user["active"]:
                        return f(current_user, *args, **kwargs)

                except jwt.ExpiredSignatureError:
                    return {
                        "message": "Token has expired!",
                        "data": None,
                        "error": "Unauthorized"
                    }, 401

                except jwt.InvalidTokenError:
                    return {
                        "message": "Invalid token!",
                        "data": None,
                        "error": "Unauthorized"
                    }, 401

        return f(None, *args, **kwargs)  # Proceed with `current_user=None` if no valid token

    return decorated