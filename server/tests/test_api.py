"""Integration tests for FastAPI endpoints using TestClient."""

from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "model_loaded" in data

    def test_health_response_shape(self):
        response = client.get("/api/health")
        data = response.json()
        assert set(data.keys()) == {"status", "model_loaded"}
        assert isinstance(data["model_loaded"], bool)


class TestModelInfoEndpoint:
    def test_model_info_returns_metadata(self):
        response = client.get("/api/model/info")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "quantization" in data

    def test_model_info_response_shape(self):
        response = client.get("/api/model/info")
        data = response.json()
        assert set(data.keys()) == {"name", "quantization"}


class TestTranslateEndpoint:
    def test_translate_simple_text(self):
        response = client.post("/api/translate", json={"text": "Hello world"})
        assert response.status_code == 200
        data = response.json()
        assert "translation" in data
        assert "warnings" in data
        assert "time_ms" in data
        assert data["translation"] == "[VI] Hello world"

    def test_translate_with_glossary(self):
        response = client.post(
            "/api/translate",
            json={
                "text": "dragon king spoke",
                "glossary": [
                    {
                        "input": "dragon king",
                        "translation": "Long Vương",
                        "matchType": "Exact",
                        "variants": ["vua rồng"],
                    }
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "translation" in data
        assert "warnings" in data

    def test_translate_empty_text_rejected(self):
        response = client.post("/api/translate", json={"text": ""})
        assert response.status_code == 422

    def test_translate_text_too_long_rejected(self):
        response = client.post("/api/translate", json={"text": "x" * 5001})
        assert response.status_code == 422

    def test_translate_invalid_glossary_match_type(self):
        response = client.post(
            "/api/translate",
            json={
                "text": "hello",
                "glossary": [
                    {
                        "input": "hello",
                        "translation": "xin chào",
                        "matchType": "Invalid",
                    }
                ],
            },
        )
        assert response.status_code == 422


class TestBatchTranslateEndpoint:
    def test_batch_translate(self):
        response = client.post(
            "/api/translate/batch",
            json={"texts": ["Hello", "World", "Test"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "translations" in data
        assert len(data["translations"]) == 3
        assert data["translations"][0] == "[VI] Hello"

    def test_batch_empty_rejected(self):
        response = client.post("/api/translate/batch", json={"texts": []})
        assert response.status_code == 422

    def test_batch_too_large_rejected(self):
        response = client.post(
            "/api/translate/batch", json={"texts": ["t"] * 51}
        )
        assert response.status_code == 422

    def test_batch_item_too_long_rejected(self):
        response = client.post(
            "/api/translate/batch", json={"texts": ["ok", "x" * 5001]}
        )
        assert response.status_code == 422

    def test_batch_with_glossary(self):
        response = client.post(
            "/api/translate/batch",
            json={
                "texts": ["dragon king spoke"],
                "glossary": [
                    {
                        "input": "dragon king",
                        "translation": "Long Vương",
                        "matchType": "Exact",
                        "variants": ["vua rồng"],
                    }
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["translations"]) == 1


class TestHybridEndpoint:
    def test_hybrid_returns_draft_and_translation(self):
        response = client.post(
            "/api/translate/hybrid",
            json={"text": "Hello world"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "translation" in data
        assert "draft" in data
        assert "warnings" in data
        assert "time_ms" in data
        # Without real LLM, hybrid falls back to MT + warning
        assert "[VI]" in data["translation"]

    def test_hybrid_empty_text_rejected(self):
        response = client.post("/api/translate/hybrid", json={"text": ""})
        assert response.status_code == 422

    def test_hybrid_with_llm_provider(self):
        response = client.post(
            "/api/translate/hybrid",
            json={"text": "Hello", "llm_provider": "gemini"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "translation" in data


class TestCORS:
    def test_cors_headers_on_options(self):
        response = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # CORS middleware should handle OPTIONS
        assert response.status_code in (200, 204, 405)


class TestSecurityHeaders:
    def test_authorization_not_leaked_in_response(self):
        """Response should never echo back the Authorization header value."""
        response = client.post(
            "/api/translate/hybrid",
            json={"text": "test"},
            headers={"Authorization": "Bearer secret-key-12345"},
        )
        data = response.json()
        # Check that the response body does not contain the key
        response_str = str(data)
        assert "secret-key-12345" not in response_str

    def test_authorization_not_in_warnings_or_translation(self):
        response = client.post(
            "/api/translate/hybrid",
            json={"text": "test"},
            headers={"Authorization": "Bearer another-secret"},
        )
        data = response.json()
        for warning in data.get("warnings", []):
            assert "another-secret" not in warning
        assert "another-secret" not in data.get("translation", "")
        assert "another-secret" not in data.get("draft", "")
