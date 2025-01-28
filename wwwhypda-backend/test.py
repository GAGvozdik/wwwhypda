import requests
import json

def search_sources(query):
    """Ищет источники по заданному поисковому запросу."""
    url = f"http://127.0.0.1:5000/api/search?q={query}" #Замените на ваш адрес API
    try:
        response = requests.get(url)
        response.raise_for_status() # Поднимает исключение для ошибок HTTP (4xx или 5xx)
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при запросе к API: {e}")
        return None

def get_latest_sources():
    """Получает последние источники."""
    url = "http://127.0.0.1:5000/api/anonce" #Замените на ваш адрес API
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Ошибка при запросе к API: {e}")
        return None

def login(username, password):
    url = "http://localhost:5000/login"
    data = {"username": username, "password": password}
    headers = {'Content-Type': 'application/json'} # Важно для отправки JSON данных

    try:
        response = requests.post(url, data=json.dumps(data), headers=headers)
        response.raise_for_status() # Проверка на ошибки HTTP (4xx или 5xx)
        return response.json() # Возвращает JSON ответ как Python словарь
    except requests.exceptions.RequestException as e:
        # Обработка ошибок (сетевые ошибки, таймауты и т.д.)
        print(f"Ошибка при отправке запроса: {e}")
        return None # или подходящее значение для ошибки

# Пример использования:
username = "your_username"
password = "your_password"
result = login(username, password)

if result:
    print(f"Успешный вход: {result}") #Обработайте полученный JSON
else:
    print("Ошибка входа.")



# if __name__ == "__main__":
#     # Пример поиска

#     search_results = search_sources("Python Flask")
#     if search_results:
#         print("Результаты поиска:")
#         print(json.dumps(search_results, indent=2)) #Вывод результатов в удобочитаемом JSON формате

#     # Пример получения последних источников
#     latest_sources = get_latest_sources()
#     if latest_sources:
#         print("\nПоследние источники:")
#         print(json.dumps(latest_sources, indent=2))


# from Models import Source, RockType, db
# results = RockType.get_tree_structure()
# print(results)