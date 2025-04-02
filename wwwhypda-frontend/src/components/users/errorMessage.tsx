import React from 'react';

export interface ErrorMessageProps {
    error: string | null; // Позволяет передавать null, если нет ошибки
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
    if (!error) return null; // Если нет ошибки, ничего не отображаем

    // Убедитесь, что error — это строка перед вызовом includes
    const errorMessage = typeof error === 'string' ? error : '';

    return (
        <div
            style={{
                color: errorMessage.includes('failed') || errorMessage.includes('do not match') ? 'red' : 'green',
                fontSize: '60%',
                width: '80%',
                marginLeft: '10%',
                textAlign: 'center',
                marginBottom: '1vh',
            }}
        >
            {errorMessage}
        </div>
    );
}

export default ErrorMessage;
