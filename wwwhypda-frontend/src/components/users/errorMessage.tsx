import React from 'react';

export interface ErrorMessageProps {
    error: string | null; // Позволяет передавать null, если нет ошибки
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
    if (!error) return null; // Если нет ошибки, ничего не отображаем

    return (
        <div
            style={{
                color: error.includes('failed') || error.includes('do not match') ? 'red' : 'green',
                fontSize: '60%',
                width: '80%',
                marginLeft: '10%',
                textAlign: 'center',
                marginBottom: '1vh',
                // backgroundColor: error.includes('failed') ? '#f8d7da' : '#d4edda', // Красный фон для ошибок
            }}
        >
            {error}
        </div>
    );
}

export default ErrorMessage;
