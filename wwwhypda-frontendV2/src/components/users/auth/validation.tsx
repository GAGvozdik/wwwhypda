export const validateUsername = (username: string): string | null => {
    const messages: string[] = [];

    if (username === "") {
        messages.push("Please enter a username.");
    } 
    else {
        if (username.length < 4 || username.length > 20) {
            messages.push("Username must be between 4 and 20 characters long.");
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            messages.push("Username may contain only letters, numbers, and underscores (_).");
        }
    }
    return messages.length > 0 ? messages.join(" ") : null;
};

export const validateEmail = (email: string): string | null => {
    const messages: string[] = [];
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!email) {
        messages.push("Please enter an email address.");
    } else if (!emailRegex.test(email)) {
        messages.push("Invalid email format.");
    }

    return messages.length > 0 ? messages.join(" ") : null;
};

export const validatePassword = (password: string): string | null => {
    const messages: string[] = [];

    if (password === "") {
        messages.push("Please enter a password.");
    } 
    else {
        if (password.length < 8 || password.length > 64) {
            messages.push("Password must be at least 8 characters long.");
        } else {
            if (!/[A-Z]/.test(password)) {
                messages.push("Password must contain at least one uppercase letter.");
            }
            if (!/[a-z]/.test(password)) {
                messages.push("Password must contain at least one lowercase letter.");
            }
            if (!/[0-9]/.test(password)) {
                messages.push("Password must contain at least one number.");
            }
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
                messages.push("Password must contain at least one special character (e.g. !@#$%^&*).");
            }
        }
    }

    return messages.length > 0 ? messages.join(" ") : null;
};

export const validateRegistration = (username: string, email: string, password: string) => {
    const usernameMessages = validateUsername(username);
    const emailMessages = validateEmail(email);
    const passwordMessages = validatePassword(password);

    const messages = [usernameMessages, emailMessages, passwordMessages].filter(Boolean);

    return messages.length > 0 ? messages.join(" ") : null;
};

export const validateResetCode = (code: string): string | null => {
    const regex = /^[A-Za-z0-9]{12}$/;

    if (!code) {
        return "Please enter the confirmation code.";
    }

    if (!regex.test(code)) {
        return "Invalid confirmation code. It must be 12 characters long and contain only letters and numbers. Case-sensitive.";
    }

    return null;
};