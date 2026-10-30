import policy from './passwordPolicy.json';
import messages from './error_messages.json';

const blocked = new Set(policy.blockedPasswords);

// Count Unicode code points like Python, not UTF-16 units. Never trim or truncate credentials.
export function validateNewPassword(password: string): string | null {
    if (!password) return messages.password_required;
    const characters = Array.from(password);
    if (characters.length < policy.minLength || characters.length > policy.maxLength) return messages.password_invalid;
    if (characters.some(character => {
        const point = character.codePointAt(0)!;
        return point >= 0xD800 && point <= 0xDFFF;
    })) return messages.password_unicode_invalid;
    if (blocked.has(password.toLowerCase()) || new Set(characters).size === 1) return messages.password_common;
    return null;
}