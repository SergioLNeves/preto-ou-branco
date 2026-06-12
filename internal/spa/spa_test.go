package spa

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func newTestServer(t *testing.T) (*echo.Echo, fs.FS) {
	t.Helper()
	staticFS, err := Assets()
	if err != nil {
		t.Fatalf("Assets(): %v", err)
	}
	e := echo.New()
	Register(e, staticFS)
	return e, staticFS
}

func doReq(e *echo.Echo, method, target string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, nil)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func TestIndexServedAtRoot(t *testing.T) {
	e, _ := newTestServer(t)
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		rec := doReq(e, method, "/")
		if rec.Code != http.StatusOK {
			t.Errorf("%s /: status = %d, want 200", method, rec.Code)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "no-cache" {
			t.Errorf("%s /: Cache-Control = %q, want no-cache", method, cc)
		}
	}
}

func TestDeepLinkRedirectsToHashRoute(t *testing.T) {
	e, _ := newTestServer(t)
	rec := doReq(e, http.MethodGet, "/sala/ABC123")
	if rec.Code != http.StatusFound {
		t.Fatalf("GET /sala/ABC123: status = %d, want 302", rec.Code)
	}
	if loc := rec.Header().Get("Location"); loc != "/#/sala/ABC123" {
		t.Errorf("Location = %q, want /#/sala/ABC123", loc)
	}
}

func TestUnknownAPIPathStays404(t *testing.T) {
	e, _ := newTestServer(t)
	for _, target := range []string{"/v1/nope", "/v1/rooms/XYZ/stats", "/v1"} {
		rec := doReq(e, http.MethodGet, target)
		if rec.Code != http.StatusNotFound {
			t.Errorf("GET %s: status = %d, want 404", target, rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); strings.Contains(ct, "text/html") {
			t.Errorf("GET %s: Content-Type = %q, must not be HTML", target, ct)
		}
	}
}

func TestNonGETUnknownPathIs404Not405(t *testing.T) {
	e, _ := newTestServer(t)
	rec := doReq(e, http.MethodPost, "/whatever")
	if rec.Code != http.StatusNotFound {
		t.Errorf("POST /whatever: status = %d, want 404", rec.Code)
	}
}

func TestHashedAssetsAreImmutable(t *testing.T) {
	e, staticFS := newTestServer(t)
	entries, err := fs.ReadDir(staticFS, "assets")
	if err != nil || len(entries) == 0 {
		t.Fatalf("embedded dist has no assets dir: %v", err)
	}
	rec := doReq(e, http.MethodGet, "/assets/"+entries[0].Name())
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /assets/%s: status = %d, want 200", entries[0].Name(), rec.Code)
	}
	if cc := rec.Header().Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Errorf("Cache-Control = %q, want immutable", cc)
	}
}

func TestMissingAssetIs404WithoutCacheHeader(t *testing.T) {
	e, _ := newTestServer(t)
	rec := doReq(e, http.MethodGet, "/assets/missing-deadbeef.js")
	if rec.Code != http.StatusNotFound {
		t.Errorf("GET missing asset: status = %d, want 404", rec.Code)
	}
	if cc := rec.Header().Get("Cache-Control"); strings.Contains(cc, "immutable") {
		t.Errorf("404 must not carry immutable Cache-Control, got %q", cc)
	}
}
