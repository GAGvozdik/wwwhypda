import React from 'react';

export interface ErrorMessageProps {
    error: string | null; // Позволяет передавать null, если нет ошибки
    isError: boolean;     // Флаг, который указывает, является ли это ошибкой
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, isError }) => {
    if (!error) return null; // Если нет ошибки, ничего не отображаем

    // Убедитесь, что error — это строка перед вызовом includes
    const errorMessage = typeof error === 'string' ? error : '';

    return (
        <div
            style={{
                color: isError ? 'var(--error-text)' : 'green',  // Используем isError для выбора цвета
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
