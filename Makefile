.PHONY: dev build aar aar-deps clean

# ── Desktop (Wails) ──────────────────────────────────────────────────────────
dev:
	wails dev

build:
	wails build

# ── Android AAR (gomobile) ───────────────────────────────────────────────────
# Prerequisites (run once):
#   go install golang.org/x/mobile/cmd/gomobile@latest
#   gomobile init
#
# Also requires Android NDK; set ANDROID_NDK_HOME if not on PATH.
# The generated AAR lands at build/preto.aar and should be copied to
# mobile/android/app/libs/ before running `npx cap sync android`.

AAR_OUT := build/preto.aar

# Targets do gomobile bind. Inclui android/amd64 para rodar em emuladores
# x86_64 do Android Studio. Para uma release enxuta (só dispositivos físicos),
# rode: AAR_TARGETS=android/arm64,android/arm make aar
AAR_TARGETS ?= android/arm64,android/arm,android/amd64

aar: aar-deps
	@test -f frontend/dist/index.html || { echo "frontend/dist ausente — rode 'cd frontend && pnpm build' antes"; exit 1; }
	@mkdir -p internal/mobile/dist
	@cp -r frontend/dist/. internal/mobile/dist/
	@mkdir -p build
	CGO_ENABLED=1 gomobile bind \
		-target=$(AAR_TARGETS) \
		-androidapi 24 \
		-ldflags '-extldflags "-Wl,-z,max-page-size=16384"' \
		-o $(AAR_OUT) \
		./pkg/mobile
	@echo "AAR gerado em $(AAR_OUT)"

aar-deps:
	@command -v gomobile >/dev/null 2>&1 || { \
		echo "gomobile não encontrado. Instale com:"; \
		echo "  go install golang.org/x/mobile/cmd/gomobile@latest && gomobile init"; \
		exit 1; \
	}

clean:
	rm -f build/preto.aar
	rm -f build/preto-sources.jar
	rm -rf frontend/dist
