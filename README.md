<div align="center">

# 🖤 Preto ou Branco 🤍

**Multiplayer de perguntas para jogar com os amigos — sem cadastro, sem conta, sem nuvem.**

[📥 Baixar para Android](https://github.com/SergioLNeves/preto-ou-branco/releases/latest/download/preto-android.apk) · [🌐 Página do jogo](https://sergiolneves.github.io/preto-ou-branco/) · [📦 Ver releases](https://github.com/SergioLNeves/preto-ou-branco/releases/latest)

</div>

---

## O que é?

Preto ou Branco é um jogo de perguntas multiplayer onde **não existe resposta certa**.

Para cada situação do dia a dia, cada jogador decide: isso é coisa de **Preto** ou coisa de **Branco**? Pontua quem souber o que a maioria do grupo vai pensar. É um jogo de consenso, de conhecer os amigos, de descobrir que alguém do grupo acha que colocar abacaxi em pizza é coisa de Branco.

---

## 🎮 Como jogar

### 1 · Host cria a sala
Quem vai hospedar abre o app Android, toca em **Hospedar** e configura a sala: quantidade de perguntas (10, 20, 30 ou 50) e nível de dificuldade.

### 2 · Amigos entram pelo navegador
O app gera um **link** e um **QR code** na hora. Os outros jogadores escaneiam ou abrem o link no celular ou computador — **sem instalar nada, sem criar conta**. Qualquer navegador funciona.

### 3 · Todo mundo vota ao mesmo tempo
Todos recebem a mesma pergunta. Cada jogador vota:
- **Arrastar o card para cima** → Branco
- **Arrastar o card para baixo** → Preto
- No desktop: clicar na metade superior ou inferior da tela

A sala avança quando todo mundo votar.

### 4 · Pódio no final
Quando as perguntas acabam, a sala revela o placar com um pódio animado. Cada pergunta é exibida com os votos de cada um — a conversa rola sozinha.

---

## 📋 Regras de pontuação

Não existe gabarito. O que vale é **estar de acordo com a maioria do grupo**:

| Resultado da pergunta | Pontos |
|---|:---:|
| ✅ Você votou com a maioria | **+2** |
| 🤝 Empate (mesmo número de cada) | **+1 para todos** |
| ❌ Você votou com a minoria | **0** |

Quanto mais você conhece o grupo, mais você pontua.

**Banco de perguntas:** 480 perguntas divididas em 4 categorias — Moda, Música, Aventura e Comportamento — e 4 níveis de dificuldade: Leve, Médio, Ácido e Pesado. A cada rodada, as perguntas são sorteadas.

**Jogadores:** de 2 a 32 por sala.

---

## 📥 Baixar e instalar

Baixe o APK e instale diretamente no Android:

### **[⬇ Baixar APK (Android)](https://github.com/SergioLNeves/preto-ou-branco/releases/latest/download/preto-android.apk)**

> O Android pode pedir permissão para "instalar apps de fontes desconhecidas". Isso acontece porque o app não está na Play Store — é um projeto pessoal de código aberto. O código-fonte está todo aqui neste repositório para quem quiser conferir.

---

## 🔒 Privacidade — seus dados não saem do celular

Essa é a parte mais importante, então vou ser bem direto:

**Este jogo não tem servidor meu.** Não existe nenhuma máquina minha — ou de terceiros — guardando suas respostas, histórico de partidas, nome de usuário ou qualquer outra informação. Absolutamente nada é coletado.

Veja como funciona na prática:

**🏠 O celular do host vira o servidor do jogo**
Quando você toca em "Hospedar", o app cria um mini-servidor de jogo dentro do próprio celular. É temporário — quando o app fecha, o servidor para e a sala some. Funciona exatamente como qualquer jogo local, só que acessível por link.

**💾 O banco de dados fica no celular do host**
Os votos e pontuações são salvos num banco de dados local no celular de quem criou a sala. Não vai para a internet. Quando a sala é encerrada, aquele arquivo pode ser deletado normalmente com o app.

**🌐 O link funciona via Cloudflare Tunnel — mas sem guardar nada**
Para que os amigos acessem o servidor do celular host pela internet, o app usa uma tecnologia gratuita do Cloudflare chamada Quick Tunnel. Ela cria um endereço temporário (algo como `abc123.trycloudflare.com`) que funciona como uma "ponte" — os dados *passam* por ela durante o jogo, mas não ficam armazenados em lugar nenhum. Quando a sala fecha, esse endereço deixa de existir.

**🔍 O código é aberto e pode ser verificado**
Todo o código-fonte está neste repositório. Qualquer desenvolvedor pode ler e confirmar que não existe nenhuma chamada enviando dados para servidores externos. Não há analytics, não há rastreamento, não há nada além do jogo em si.

---

## 🛠 Como funciona por dentro

Para quem tem curiosidade técnica ou quer contribuir:

```
Celular do host
  ├── App Android  (Capacitor + React/Vite)
  │     └── A interface que o host vê e usa
  │
  ├── Servidor embutido  (Go + Echo, porta 8080)
  │     ├── API REST — cria salas, recebe votos, calcula pontuação
  │     ├── WebSocket — transmite eventos em tempo real para todos
  │     └── SQLite — guarda a partida localmente enquanto dura
  │
  └── Cloudflare Quick Tunnel
        └── Gera um link público temporário para o servidor do celular
              ↓
        Convidados abrem o link no navegador (qualquer dispositivo)
```

- **Go** cuida de toda a lógica do jogo no backend: criar salas, registrar votos, calcular quem está com a maioria, transmitir o placar em tempo real.
- **React** é a interface — tanto para o host (dentro do app Android) quanto para os convidados (no navegador deles, servida pelo próprio app host).
- **SQLite** guarda os dados da partida localmente. Nenhum banco de dados externo é usado.
- **gomobile** compila o código Go para uma biblioteca Android nativa (`.aar`), permitindo que o Kotlin inicie e pare o servidor de dentro do app.

### Estrutura

```
preto-ou-branco/
├── internal/
│   ├── domain/        # Tipos e regras (sala, fase, votação)
│   ├── service/       # Lógica de negócio
│   ├── repository/    # Acesso ao banco (GORM + SQLite)
│   ├── handler/       # Endpoints HTTP (Echo)
│   └── realtime/      # Hub WebSocket
├── frontend/          # React + Vite + Tailwind (interface)
├── mobile/android/    # App Capacitor (Kotlin)
├── pkg/mobile/        # API Go exposta via gomobile
├── docs/              # Landing page (GitHub Pages)
└── .github/workflows/ # CI/CD — build e publicação do APK
```

### Build

```bash
# Desktop (Wails)
wails dev        # desenvolvimento com hot-reload
wails build      # gera o binário final

# Android — via GitHub Actions (recomendado)
# Crie uma tag v* e faça push — o CI gera e publica o APK automaticamente.

# Android — build local
make aar         # compila frontend + gera preto.aar (requer NDK + gomobile)
cp build/preto.aar mobile/android/app/libs/preto.aar
cd mobile && npx cap sync android
cd mobile/android && ./gradlew assembleDebug
```

---

<div align="center">

Feito com Go, React e muita vontade de jogar com os amigos. 🖤🤍

</div>
