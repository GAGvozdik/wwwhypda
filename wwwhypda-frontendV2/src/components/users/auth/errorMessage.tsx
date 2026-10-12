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
        <div role={isError ? "alert" : "status"}
            style={{
                color: isError ? 'var(--error-text)' : 'var(--success-text)',  // Используем isError для выбора цвета
                fontSize: 'var(--main-font-size)',
                width: '80%',
                marginLeft: '10%',
                textAlign: 'center',
                marginBottom: '0.5rem',
            }}
        >
            {errorMessage}
        </div>
    );
}

export default ErrorMessage;
