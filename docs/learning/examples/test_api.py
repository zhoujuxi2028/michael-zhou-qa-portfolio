import requests
from functools import wraps
from time import time


def rate_limit_check(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time()
        result = func(*args, **kwargs)
        elapsed = time() - start
        assert elapsed < 1.0, f"API call took {elapsed}s, exceeded 1s limit"
        return result

    return wrapper


class TestAPI:
    @rate_limit_check
    def test_get_user_success(self):
        response = requests.get("https://api.example.com/users/123")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"] == 123
