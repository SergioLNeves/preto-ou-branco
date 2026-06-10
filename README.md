# Preto ou Branco

Jogo multiplayer de perguntas onde os jogadores votam **preto** ou **branco** em situações do cotidiano e descobrem o que o grupo pensa.

O host inicia uma sala, compartilha o link (ou QR code), e os convidados entram pelo browser — sem instalar nada. O jogo roda inteiramente no dispositivo do host: sem servidor externo, sem nuvem.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│  Host (desktop Wails  ou  Android Capacitor)        │
│                                                     │
│  React/Vite ─── HTTP/WS ──► Echo (Go, :8080)       │
│                              │                      │
│                         SQLite (GORM)               │
│                              │                      │
│                    Cloudflare Quick Tunnel           │
│                         https://*.trycloudflare.com │
└──────────────────────────┬──────────────────────────┘
                           │  URL pública
                    ┌──────▼──────┐
                    │  Convidados │  (qualquer browser)
                    └─────────────┘
```

- **Desktop**: app Wails — binário único para Linux/macOS/Windows.
- **Android**: app Capacitor com o servidor Go embutido como AAR (gomobile).
- **Convidados**: abrem o link ou escaneiam o QR code — nenhum app necessário.

---

## Pré-requisitos

### Todos os targets

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Go | 1.22+ | https://go.dev/dl |
| Node | 18+ | https://nodejs.org |
| pnpm | 8+ | `npm i -g pnpm` |

### Somente desktop (Wails)

| Ferramenta | Instalação |
|---|---|
| Wails CLI | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |
| Dependências do sistema | `wails doctor` lista o que falta |

### Somente Android (Capacitor + gomobile)

| Ferramenta | Instalação |
|---|---|
| Android Studio + SDK | https://developer.android.com/studio |
| Android NDK r25c+ | Android Studio → SDK Manager → SDK Tools → NDK |
| gomobile | `go install golang.org/x/mobile/cmd/gomobile@latest && gomobile init` |
| `ANDROID_NDK_HOME` | variável de ambiente apontando para o NDK |

---

## Desktop (Wails)

### Desenvolvimento

```bash
# Instala dependências do frontend
cd frontend && pnpm install && cd ..

# Inicia com hot-reload (frontend Vite + backend Go)
wails dev
```

A janela do app abre automaticamente. Qualquer mudança em `frontend/src/` recarrega na hora; mudanças em arquivos Go reiniciam o binário.

### Build de produção

```bash
wails build
# Binário gerado em: build/bin/preto-ou-branco (Linux/macOS) ou .exe (Windows)
```

---

## Android (Capacitor + gomobile)

O build mobile tem três etapas independentes que podem ser feitas na ordem abaixo.

### Etapa 1 — Baixar o binário cloudflared para Android (build local)

O tunnel Cloudflare roda como processo nativo dentro do app. O binário precisa estar em `mobile/android/app/src/main/assets/` antes de compilar o APK.

```bash
# ARM64 (a grande maioria dos Android modernos)
curl -L -o mobile/android/app/src/main/assets/cloudflared-android-arm64 \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# ARMv7 (dispositivos mais antigos — opcional)
curl -L -o mobile/android/app/src/main/assets/cloudflared-android-arm \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm
```

> **Por que isso não é automático?** Android tem restrições de SELinux sobre quais diretórios permitem execução de binários. O Kotlin extrai o arquivo de `assets/` para `filesDir` (executável) em tempo de execução via `MobilePlugin.extractCloudflaredBinary()`. O Go só recebe o caminho depois da extração.

### Jeito mais simples — GitHub Actions + Releases

Se você quer evitar Android Studio, use o workflow `.github/workflows/android-release.yml`.

1. Crie uma tag de release, por exemplo `android-v1.0.0`, e faça push.
2. O GitHub Actions baixa o `cloudflared`, gera `preto.aar`, monta o APK e publica o arquivo em **Releases**.
3. Baixe o `.apk` da release no celular e instale.

Se preferir rodar pela interface do GitHub, use **Actions → Android Release → Run workflow** e informe a tag da release.

### Etapa 2 — Gerar o AAR (biblioteca Go para Android)

O código Go em `pkg/mobile/` é compilado para um AAR via gomobile e copiado para os `libs` do projeto Android.

```bash
# Compila o AAR (requer NDK configurado)
make aar
# Saída: build/preto.aar

# Copia para o projeto Android
cp build/preto.aar mobile/android/app/libs/preto.aar
```

Se der erro de NDK não encontrado:

```bash
export ANDROID_NDK_HOME=$HOME/Android/Sdk/ndk/<versão>
make aar
```

O que o AAR exporta (chamado pelo Kotlin via `mobile.Mobile.*`):

| Função Go | Assinatura Kotlin |
|---|---|
| `StartServer(dbPath, port)` | `Mobile.startServer(dbPath: String, port: Long)` |
| `StopServer()` | `Mobile.stopServer()` |
| `StartTunnel(cloudflaredPath)` | `Mobile.startTunnel(path: String): String` |
| `StopTunnel()` | `Mobile.stopTunnel()` |
| `GetServerStatus()` | `Mobile.getServerStatus(): String` (JSON) |

### Etapa 3 — Build do frontend e sincronização Capacitor

```bash
# Build do React/Vite
cd frontend && pnpm build && cd ..

# Copia o dist para os assets Android
cd mobile && npx cap sync android
```

### Abrir no Android Studio

```bash
cd mobile && npx cap open android
```

No Android Studio: **Run ▶** (emulador API 30+ ou dispositivo físico com USB debugging ativo).

### Build do APK direto pela linha de comando

```bash
cd mobile/android
./gradlew assembleDebug
# APK em: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Fluxo do host mobile (como funciona em runtime)

1. App abre → tela inicial "Hospedar / Entrar"
2. "Hospedar" → `MobilePlugin.startServer()` dispara o `HostService` (Foreground Service com notificação persistente)
3. `HostService.onStartCommand` chama `Mobile.startServer(filesDir + "/app.db", 8080)` — Go sobe Echo + SQLite + WebSocket hub
4. Dashboard → "Multiplayer" → `hostBridge.startTunnel()` → `MobilePlugin.startTunnel()` → Kotlin extrai `cloudflared-android-arm64` de assets para `filesDir`, passa o path para `Mobile.startTunnel(path)` — Go executa o binário e aguarda a URL Cloudflare (até 45s)
5. URL retornada → lobby da sala exibe QR code + link copiável
6. Convidados escaneiam o QR ou abrem o link no browser
7. Ao fechar a sala: `stopTunnel()` → `stopServer()` → `stopService()`

---

## Estrutura do projeto

```
preto-ou-branco/
├── main.go                    # Entry point Wails
├── app.go                     # Bootstrap desktop (Echo + SQLite + tunnel bindings)
├── Makefile                   # make dev | make build | make aar
├── wails.json                 # Config Wails
│
├── internal/
│   ├── domain/                # Interfaces e tipos de domínio
│   ├── service/               # Lógica de negócio (room, game, auth)
│   ├── repository/            # Acesso ao banco (GORM)
│   ├── handler/               # Handlers HTTP Echo (room, auth)
│   ├── middleware/            # BearerAuth, RoomIdentity
│   ├── realtime/              # Hub WebSocket (broadcast de eventos)
│   ├── storage/sqlite/        # Open, OpenAt, migrations, seed
│   ├── bindings/              # Bindings Wails (AuthApp, GameApp, ServerApp)
│   └── mobile/                # Implementação do host mobile (server + tunnel)
│
├── pkg/                       # Pacotes públicos
│   └── mobile/                # Fachada gomobile (StartServer, StartTunnel…)
│
├── frontend/                  # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── lib/
│       │   ├── host-bridge.ts # Abstração Wails / Capacitor / browser
│       │   └── server-url.ts  # Base URL do backend
│       ├── routes/            # TanStack Router (dashboard, sala, settings…)
│       ├── components/        # UI (RoomLobby, QuestionCard, QR modal…)
│       └── infra/             # Queries e mutations (TanStack Query)
│
└── mobile/                    # App Capacitor (Android)
    ├── capacitor.config.ts
    └── android/
        └── app/src/main/
            ├── assets/        # ← colocar cloudflared-android-arm64 aqui
            ├── java/com/pretoobranco/app/
            │   ├── MainActivity.kt
            │   ├── MobilePlugin.kt   # Plugin Capacitor → Go AAR
            │   └── HostService.kt    # Foreground Service
            └── libs/          # ← copiar preto.aar aqui (make aar)
```

---

## Variáveis de ambiente relevantes

| Variável | Quando usar |
|---|---|
| `ANDROID_NDK_HOME` | Caminho para o NDK ao rodar `make aar` |
| `CGO_ENABLED=1` | Já setado pelo gomobile; necessário para `mattn/go-sqlite3` |

---

## Troubleshooting

**`make aar` falha com "NDK not found"**
```bash
# Verifique o caminho do NDK instalado no Android Studio
ls $HOME/Android/Sdk/ndk/
export ANDROID_NDK_HOME=$HOME/Android/Sdk/ndk/25.2.9519653
make aar
```

**SQLite não compila para Android**
Troque o driver CGO por puro Go em `go.mod`:
```bash
go get modernc.org/sqlite
# Em internal/storage/sqlite/sqlite.go, troque o import:
# "gorm.io/driver/sqlite" → "gorm.io/driver/sqlite" (modernc)
```

**App fecha a sala quando a tela trava**
O `HostService` precisa da notificação persistente para sobreviver. Se o Android matar o processo mesmo assim, ative "Ignorar otimizações de bateria" nas configurações do sistema para o app.

**Tunnel demora ou falha**
O cloudflared faz uma requisição de saída na porta 443. Redes corporativas ou hotspots com firewall restritivo podem bloquear. Teste com dados móveis.

**`wails dev` abre janela em branco**
```bash
cd frontend && pnpm install
wails dev
```
