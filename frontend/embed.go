// Package frontend embeds the built web app (dist/) so the desktop server
// (app.go) and the Android server (internal/mobile) serve the exact same
// build from a single embed directive.
//
// dist/ must exist at compile time: run `cd frontend && pnpm build` (or
// `make aar`, which does it) before any `go build`.
package frontend

import "embed"

// Dist holds the Vite build output. The "all:" prefix is required: Vite
// emits chunk files prefixed with "_" (e.g. _main-*.js, _roomId-*.js),
// which a plain "embed dist" would skip.
//
//go:embed all:dist
var Dist embed.FS
