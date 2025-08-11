
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from './registration';
import api from '../../api';

// Мокаем модуль API
jest.mock('../../api');
const mockedApi = api as jest.Mocked<typeof api>;

// Мокаем модуль react-router-dom
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // используем оригинальные реализации для всего, кроме useNavigate
  useNavigate: () => mockedNavigate,
  Link: ({ children, to }: { children: React.ReactNode, to: string }) => <a href={to}>{children}</a>
}));

// Мокаем дочерние компоненты, чтобы изолировать тест
jest.mock('./errorMessage', () => ({ error, isError }: { error: string | null, isError: boolean }) => error ? <div data-testid="error-message" style={{ color: isError ? 'red' : 'green' }}>{error}</div> : null);
jest.mock('./userButton', () => ({ text, isLoading }: { text: string, isLoading: boolean }) => <button type="submit" disabled={isLoading}>{isLoading ? 'Loading...' : text}</button>);


describe('Register Component', () => {
  beforeEach(() => {
    // Сбрасываем все моки перед каждым тестом
    jest.clearAllMocks();
  });

  it('should render step 1 form correctly', () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByText('Login here')).toBeInTheDocument();
  });

  it('should show an error if passwords do not match', async () => {
    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm Password'), 'password456');
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Используем findBy, чтобы дождаться появления элемента
    const errorMessage = await screen.findByTestId('error-message');
    expect(errorMessage).toHaveTextContent('Passwords do not match!');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('should proceed to step 2 on successful registration', async () => {
    // Мокаем успешный ответ от API для первого шага
    mockedApi.post.mockResolvedValue({
      status: 201,
      data: { message: 'Please check your email for the confirmation code.' }
    });

    render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );

    // Заполняем форму
    await userEvent.type(screen.getByPlaceholderText('Username'), 'testuser');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm Password'), 'password123');

    // Кликаем на кнопку регистрации
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Проверяем, что API был вызван с правильными данными
    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/users/', {
        name: 'testuser',
        password: 'password123',
        email: 'test@example.com',
      });
    });

    // Проверяем, что форма перешла на шаг 2
    expect(await screen.findByPlaceholderText('Confirmation Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    
    // Проверяем сообщение об успехе
    const successMessage = await screen.findByTestId('error-message');
    expect(successMessage).toHaveTextContent('Please check your email for the confirmation code.');
    expect(successMessage).toHaveStyle({ color: 'green' });
  });

  it('should navigate to /login on successful confirmation (step 2)', async () => {
    // Сначала проводим пользователя через шаг 1
    mockedApi.post.mockResolvedValueOnce({
        status: 201,
        data: { message: 'Success' }
    });
    render(<BrowserRouter><Register /></BrowserRouter>);
    await userEvent.type(screen.getByPlaceholderText('Password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Ждем появления шага 2
    await screen.findByPlaceholderText('Confirmation Code');

    // Мокаем успешный ответ для шага 2
    mockedApi.post.mockResolvedValueOnce({
        status: 200,
        data: { message: 'Confirmation successful!' }
    });

    // Вводим код и подтверждаем
    await userEvent.type(screen.getByPlaceholderText('Confirmation Code'), '123456');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // Проверяем, что был вызван API подтверждения
    await waitFor(() => {
        expect(mockedApi.post).toHaveBeenCalledWith('/users/confirm-registration', {
            email: '', // Email is empty because we didn't type it in this specific test
            code: '123456'
        });
    });

    // Проверяем, что произошел переход на страницу логина
    await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
