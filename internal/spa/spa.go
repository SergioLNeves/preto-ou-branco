// Package spa serves the embedded frontend build over an Echo instance —
// shared by the desktop HTTP server (app.go) and the Android server
// (internal/mobile) so route, caching and fallback behavior cannot drift
// between the two.
package spa

import (
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"preto-ou-branco/frontend"
)

// Assets returns the built web app rooted at its index.html. It fails when
// the embed has no index.html — i.e. the frontend was not built before this
// binary was compiled — so callers surface the problem at startup instead of
// serving "not found" to every guest.
func Assets() (fs.FS, error) {
	staticFS, err := fs.Sub(frontend.Dist, "dist")
	if err != nil {
		return nil, fmt.Errorf("frontend assets: %w", err)
	}
	if _, err := fs.Stat(staticFS, "index.html"); err != nil {
		return nil, fmt.Errorf("frontend assets: index.html ausente do embed — rode 'cd frontend && pnpm build' e recompile: %w", err)
	}
	return staticFS, nil
}

// Register mounts the SPA on e:
//
//   - /assets/* — content-hashed Vite output, cached as immutable for a year
//   - /         — index.html with no-cache (its asset names change per build)
//   - /*        — root-level build files (favicon etc.) served as-is;
//     unknown /v1 paths keep returning real 404s instead of HTML;
//     anything else redirects to its hash-route form ("/sala/x" → "/#/sala/x"),
//     because index.html references assets relative to "./" (Vite base) and
//     serving it at a deep path would MIME-block every script
//
// GET and HEAD are registered explicitly — Echo does not route HEAD through
// GET handlers, and link unfurlers probe shared URLs with HEAD.
func Register(e *echo.Echo, staticFS fs.FS) {
	fileServer := http.FileServer(http.FS(staticFS))

	index := func(c echo.Context) error {
		data, err := fs.ReadFile(staticFS, "index.html")
		if err != nil {
			return echo.ErrNotFound
		}
		c.Response().Header().Set("Cache-Control", "no-cache")
		return c.HTMLBlob(http.StatusOK, data)
	}

	assets := func(c echo.Context) error {
		if !fileExists(staticFS, c.Request().URL.Path) {
			return echo.ErrNotFound
		}
		c.Response().Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		fileServer.ServeHTTP(c.Response(), c.Request())
		return nil
	}

	fallback := func(c echo.Context) error {
		if m := c.Request().Method; m != http.MethodGet && m != http.MethodHead {
			return echo.ErrNotFound
		}
		path := c.Request().URL.Path
		if path == "/v1" || strings.HasPrefix(path, "/v1/") {
			return echo.ErrNotFound
		}
		if fileExists(staticFS, path) {
			fileServer.ServeHTTP(c.Response(), c.Request())
			return nil
		}
		return c.Redirect(http.StatusFound, "/#"+path)
	}

	for _, method := range []string{http.MethodGet, http.MethodHead} {
		e.Add(method, "/assets/*", assets)
		e.Add(method, "/", index)
	}
	// Any (not just GET): a POST to an unknown path should be a 404, not the
	// 405 Echo produces when the path matches "/*" without that method.
	e.Any("/*", fallback)
}

func fileExists(fsys fs.FS, urlPath string) bool {
	name := strings.TrimPrefix(urlPath, "/")
	if name == "" {
		return false
	}
	info, err := fs.Stat(fsys, name)
	return err == nil && !info.IsDir()
}
