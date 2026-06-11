package mobile

import "embed"

// spaFiles embeds the built frontend (frontend/dist), copied here by
// `make aar` before `gomobile bind` runs. //go:embed cannot reference paths
// outside this package directory, hence the copy.
//
// The "all:" prefix is required: Vite emits chunk files prefixed with "_"
// (e.g. _main-*.js, _roomId-*.js), which a plain "embed dist" would skip.
//
//go:embed all:dist
var spaFiles embed.FS
