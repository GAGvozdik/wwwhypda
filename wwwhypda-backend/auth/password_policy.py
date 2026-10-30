"""New-password policy only. Existing credentials are compared exactly, without this policy."""
import json
from pathlib import Path

_POLICY_PATH = Path(__file__).resolve().parent.parent.parent / 'common' / 'passwordPolicy.json'
POLICY = json.loads(_POLICY_PATH.read_text(encoding='utf-8'))
_BLOCKED = frozenset(POLICY['blockedPasswords'])


def password_error(password):
    if not isinstance(password, str):
        return 'password_invalid'
    if not password:
        return 'password_required'
    if not POLICY['minLength'] <= len(password) <= POLICY['maxLength']:
        return 'password_invalid'
    # Reject malformed Unicode before UTF-8 hashing; preserve every valid character verbatim.
    if any(0xD800 <= ord(char) <= 0xDFFF for char in password):
        return 'password_unicode_invalid'
    if password.lower() in _BLOCKED or len(set(password)) == 1:
        return 'password_common'
    return None