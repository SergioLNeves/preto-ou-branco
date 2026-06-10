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

aar: aar-deps
	@mkdir -p build
	CGO_ENABLED=1 gomobile bind \
		-target=android/arm64,android/arm \
		-androidapi 24 \
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
