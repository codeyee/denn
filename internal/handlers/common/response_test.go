package common

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestRespondError_EnvelopeShape locks the canonical error envelope shared
// with `core` (see docs/contracts/internal-http.md). If you need to break
// this shape, update the contract doc and the matching Django test in
// core/core/tests/test_error_envelope.py at the same time.
func TestRespondError_EnvelopeShape(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/x", nil)

	c.Set("request_id", "req-123")
	RespondError(c, http.StatusBadRequest, CodeInvalidParameter, "bad value")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d want %d", w.Code, http.StatusBadRequest)
	}

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}

	if body["error"] != CodeInvalidParameter {
		t.Errorf("error: got %v want %s", body["error"], CodeInvalidParameter)
	}
	if body["message"] != "bad value" {
		t.Errorf("message: got %v", body["message"])
	}
	if body["request_id"] != "req-123" {
		t.Errorf("request_id: got %v want req-123", body["request_id"])
	}
	if _, ok := body["code"]; ok {
		t.Errorf("legacy 'code' field must not appear in the envelope")
	}
}

func TestRespondError_OmitsRequestIDWhenAbsent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/x", nil)

	RespondError(c, http.StatusNotFound, CodeNotFound, "missing")

	var body map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if _, ok := body["request_id"]; ok {
		t.Errorf("request_id must be omitted when not set on the context, got %v", body["request_id"])
	}
}
