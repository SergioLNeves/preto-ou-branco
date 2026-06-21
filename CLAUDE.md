# CLAUDE.md

Orientações para o Claude Code ao trabalhar neste repositório.

## Visão geral

**Preto ou Branco** é um jogo multiplayer de perguntas: o host roda um servidor Go
embutido (desktop via Wails ou Android via gomobile/Capacitor) e os convidados
entram pelo browser via LAN ou Cloudflare Quick Tunnel — sem instalar nada.

```
Host (Wails desktop ou Android Capacitor)
  React/Vite ── HTTP/WS ──► Echo (Go, :8080) ── SQLite (GORM)
                              │
                    Cloudflare Quick Tunnel ──► convidados (qualquer browser)
```

## Stack

- **Backend**: Go, Echo, SQLite (GORM, `_pragma=foreign_keys(1)`), WebSocket (`internal/realtime`)
- **Frontend**: React + Vite + TanStack Query/Router, Tailwind
- **Desktop**: Wails (`app.go`, `main.go`, `wails.json`) — `wails dev` / `wails build`
- **Android**: Capacitor (`mobile/android`) + servidor Go embutido via AAR gomobile
  (`pkg/mobile`, gerado com `make aar`), tunnel cloudflared como lib nativa
  (`jniLibs/<abi>/libcloudflared.so`, compilado no CI)

## Estrutura

```
internal/
  domain/       tipos e regras de domínio (Room, Phase, etc.)
  service/      regras de negócio (room.go: lobby → playing → finished)
  repository/   acesso a dados (GORM), transições atômicas/idempotentes
  handler/      handlers HTTP (Echo)
  realtime/     hub de WebSocket (broadcast de eventos de sala)
  storage/sqlite/  models GORM + abertura do DB
  mobile/       servidor HTTP embutido (mobile.go) + tunnel manager (tunnel.go)
  bindings/     bindings expostos ao frontend Wails
  spa/          serve o frontend embutido (embed.go)
pkg/mobile/      API exposta via gomobile bind (consumida pelo Android/Kotlin)
frontend/        app React/Vite (rotas em src/routes, hooks, infra/*)
mobile/android/  projeto Capacitor/Android (Kotlin: MainActivity, HostService, MobilePlugin)
```

## Comandos

```bash
# Desktop
wails dev                # dev server
wails build              # build do binário desktop

# Frontend
cd frontend && pnpm install && pnpm build

# Android AAR (gomobile) — requer NDK e gomobile init
make aar                 # builda frontend + gera build/preto.aar
cp build/preto.aar mobile/android/app/libs/preto.aar
cd mobile && npx cap sync android
cd mobile/android && ./gradlew assembleDebug   # ou assembleRelease (ver assinatura abaixo)

# Backend
go build ./... && go vet ./... && go test ./...
gofmt -l .
golangci-lint run ./...
```

## Convenções de código

- Go: `gofmt`/`golangci-lint` limpos antes de finalizar; transições de estado de
  sala devem ser atômicas e idempotentes (ver `internal/repository/room.go`,
  testes em `internal/repository/room_test.go`).
- Frontend: TanStack Query — invalidar `roomKeys.state` só em eventos de fase
  (`phase_changed`, `game_finished`, `room_closed`), não em todo evento WS.
- Mobile (Kotlin): `HostService` é iniciado/parado **somente** pela
  `MainActivity` (ponto único de start, evita corrida com APIs não usadas do
  plugin Capacitor). `START_NOT_STICKY` — hospedar exige o app em foreground.

## Commit Messages

Conventional Commits 1.0.0: `<type>(<scope>): <description>`, imperativo,
< 50 chars, lowercase, sem ponto final.
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

## Release Android assinado (CI)

`.github/workflows/android-release.yml` builda e publica `preto-android.apk`
assinado em pushes de tag `v*`/`android-v*` (e via `workflow_dispatch`).

- Assinatura lida de env vars em `mobile/android/app/build.gradle`
  (`RELEASE_KEYSTORE_PATH/PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`);
  sem elas, cai no keystore debug (build local continua funcionando).
- CI decodifica o keystore a partir do secret `RELEASE_KEYSTORE_BASE64` e
  popula as demais env vars a partir dos secrets `RELEASE_KEYSTORE_PASSWORD`,
  `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD` (configurados no repo via `gh secret set`).
- **Importante**: o contexto `secrets` não pode ser usado em `if:` de
  step/job — a checagem de "secret configurado?" deve ser feita dentro do
  `run:` via variável de ambiente (`if [ -n "$VAR" ]`), senão o workflow
  falha instantaneamente com "Invalid workflow file".
- Backup do keystore de release (`~/secrets/preto-ou-branco-release/`, fora
  do repo) é a **única cópia** das credenciais de assinatura — perdê-lo
  impede publicar atualizações com a mesma identidade do app. Manter backup
  externo seguro.
- `GOMOBILE_VERSION` no workflow é pinado deliberadamente (não `@latest`) —
  atualizar junto com a versão do Go em `go.mod`.
