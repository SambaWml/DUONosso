# Sistema CTFL Smart Prep — Modelo Duolingo

---

## 1. Filosofia do Sistema

O sistema funciona como o Duolingo: o usuário aprende em pequenas sessões diárias, acumula pontos, mantém sequências e sente progresso visual constante. O conteúdo é a certificação CTFL 4.0 — mas a mecânica é a do jogo.

**Princípios:**
- Cada sessão dura no máximo 5–10 minutos
- Progresso é visual, imediato e recompensador
- Errar tem custo (corações), acertar tem recompensa (XP + gems)
- A IA adapta a ordem e dificuldade pelo desempenho real do usuário
- Uma trilha única, organizada pelos pontos fracos do simulado diagnóstico

---

## 2. Estrutura da Trilha CTFL

A trilha é composta por **6 capítulos oficiais** (skills), cada um com **5 níveis de coroa**.

```
TRILHA CTFL 4.0
│
├── 🔵 Cap 1 — Fundamentos de Teste          (26% da prova)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
├── 🔵 Cap 2 — Testes ao Longo do SDLC       (17%)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
├── 🔵 Cap 3 — Teste Estático                (11%)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
├── 🔵 Cap 4 — Análise e Modelagem de Testes (25%)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
├── 🔵 Cap 5 — Gerenciamento de Testes       (14%)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
├── 🔵 Cap 6 — Ferramentas de Suporte        (7%)
│     Coroa 1 → 2 → 3 → 4 → 5 🏆
│
└── 🎓 Simulado Oficial CTFL (40 questões) — desbloqueado ao atingir Coroa 3 em todos
```

Capítulos marcados como **área fraca** pelo simulado diagnóstico aparecem **primeiro** na trilha e têm ícone laranja de prioridade.

---

## 3. Sistema de Coroas (Crown Levels)

Cada capítulo tem 5 coroas. Cada coroa representa um nível de domínio crescente.

| Coroa | Nome       | Cor     | Questões/sessão | Acerto mínimo | Tipo de questão       |
|-------|------------|---------|-----------------|---------------|-----------------------|
| 1     | Iniciante  | Cinza   | 5               | 60%           | K1 — lembrar/definir  |
| 2     | Básico     | Verde   | 5               | 70%           | K1 + K2               |
| 3     | Intermediário | Azul | 7               | 75%           | K2 — compreender      |
| 4     | Avançado   | Roxo    | 7               | 80%           | K2 + K3               |
| 5     | Mestre     | Dourado | 10              | 100%          | K3 — cenários reais   |

### Regras de progressão
- Completar a sessão com o acerto mínimo → **+1 coroa**
- Falhar → coroa não avança, perde corações (ver seção 5)
- Coroa 5 Dourada = **módulo dominado** (ícone troféu dourado)
- Módulos na coroa 5 **decaem** para coroa 4 após 7 dias sem praticar (spaced repetition)

---

## 4. XP — Pontos de Experiência

XP é a moeda de progresso do usuário. Aparece em destaque na tela principal.

### Como ganhar XP

| Evento                                    | XP     |
|-------------------------------------------|--------|
| Questão correta (K1)                      | +5     |
| Questão correta (K2)                      | +8     |
| Questão correta (K3)                      | +12    |
| Sessão concluída sem erros (perfect)      | +20 bônus |
| Coroa nova desbloqueada                   | +30    |
| Coroa 5 (ouro) conquistada               | +100   |
| Meta diária atingida                      | +15    |
| Sequência de 7 dias (streak)              | +50    |
| Simulado oficial aprovado (≥65%)          | +200   |

### XP não se perde — só acumula

O XP total define o **nível do usuário** (1–50). Cada 500 XP = 1 nível.

---

## 5. Corações (Lives)

O usuário começa cada sessão com **5 corações ❤️**.

- Erra uma questão → perde 1 coração
- Chega a 0 corações → **sessão encerrada**, precisa esperar ou usar gems
- Corações se regeneram: **1 coração a cada 2 horas**
- Coroa 5 (mestre): sem limite de corações — é revisão livre

### Proteção de corações
- **Modo Treino** (sem coroa em jogo): não consome corações, sem XP bônus
- **Escudo de sessão** (item da loja): sessão sem perder corações por 1 uso

---

## 6. Gems — Moeda Virtual 💎

Gems são ganhas estudando e podem ser gastas na loja.

### Como ganhar Gems

| Evento                              | Gems |
|-------------------------------------|------|
| Concluir sessão                     | +5   |
| Sequência diária mantida            | +3   |
| Perfect session (sem erros)         | +10  |
| Coroa 5 conquistada                 | +20  |

### Loja de Gems

| Item                        | Custo | Efeito                                         |
|-----------------------------|-------|------------------------------------------------|
| Refill de corações (5x)     | 20 💎 | Restaura todos os corações imediatamente       |
| Freeze de sequência         | 10 💎 | Protege a streak por 1 dia sem estudar         |
| Escudo de sessão            | 15 💎 | Próxima sessão sem perder corações             |
| Dica de questão             | 5 💎  | Elimina 2 alternativas erradas na questão atual|

---

## 7. Streak — Sequência Diária 🔥

O streak conta **dias consecutivos** com a meta diária atingida.

- Meta padrão: **10 XP/dia** (ajustável para 20, 30 ou 50)
- Streak aparece no topo da tela principal com chama animada
- Quebrar o streak zera o contador
- **Freeze de sequência**: item da loja que permite perder 1 dia sem quebrar
- **Streak Record**: maior sequência histórica fica salva no perfil

---

## 8. Liga Semanal 🏆

Todo domingo reseta. O usuário compete com outros estudantes CTFL pelo XP da semana.

```
Liga de Bronze   → Liga de Prata → Liga de Ouro → Liga de Diamante
Top 10 da semana sobem de liga. Bottom 5 descem.
```

- Cada liga tem até 30 participantes
- Ranking ao vivo atualizado em tempo real
- Recompensa de fim de semana: gems extras para o top 3

---

## 9. Conquistas (Badges) 🎖️

| Badge                   | Condição                                         |
|-------------------------|--------------------------------------------------|
| Primeira Sessão         | Completar a primeira sessão de estudo            |
| Sequência de Fogo       | 7 dias seguidos                                  |
| Mestre da Fundação      | Cap 1 na coroa 5                                 |
| Perfeccionista          | 3 sessões perfect seguidas                       |
| CTFL Ready              | Todos os capítulos na coroa 3+                   |
| Aprovado                | Simulado oficial com ≥65%                        |
| Mestre CTFL             | Todos os capítulos na coroa 5                    |
| Maratonista             | 30 dias seguidos                                 |

---

## 10. Tela Principal — Home

```
┌─────────────────────────────────────────┐
│  🔥 12   💎 85   ❤️❤️❤️❤️❤️   Nível 7  │
│         [barra de XP: 340/500]          │
├─────────────────────────────────────────┤
│                                         │
│  Meta de hoje    ████████░░  8/10 XP    │
│                                         │
├─────────────────────────────────────────┤
│  TRILHA CTFL 4.0                        │
│                                         │
│  ⚡ CAP 1 — Fundamentos    ██████░ 4/5  │
│  ⚡ CAP 4 — Modelagem      ████░░░ 3/5  │  ← fraco (prioridade)
│  🔵 CAP 2 — SDLC           ██░░░░ 2/5   │
│  🔵 CAP 5 — Gerenciamento  █░░░░░ 1/5   │
│  🔒 CAP 3 — Teste Estático  bloqueado   │
│  🔒 CAP 6 — Ferramentas     bloqueado   │
│  🔒 🎓 Simulado Oficial      bloqueado  │
│                                         │
│         [ CONTINUAR → ]                 │
└─────────────────────────────────────────┘
```

**Botão CONTINUAR** retoma de onde o usuário parou (próximo capítulo não dominado).

---

## 11. Tela do Capítulo (Skill Detail)

```
┌─────────────────────────────────────────┐
│  ← Cap 4 — Análise e Modelagem          │
│     ⚡ PRIORIDADE — área fraca           │
├─────────────────────────────────────────┤
│                                         │
│   Coroa Atual: ████ (3/5)               │
│   Melhor sessão: 80% · 7 tentativas     │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌───┐ │
│  │  ✓  │ │  ✓  │ │  ►  │ │  🔒 │ │🔒 │ │
│  │ C1  │ │ C2  │ │ C3  │ │ C4  │ │C5 │ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └───┘ │
│                                         │
│  Próxima sessão:                        │
│  7 questões K2 · acerto mín. 75%        │
│  ❤️❤️❤️❤️❤️                             │
│                                         │
│         [ INICIAR SESSÃO ]              │
└─────────────────────────────────────────┘
```

---

## 12. Fluxo de uma Sessão

```
SESSÃO
│
├── 1. Fase ESTUDO (nova coroa ou review)
│     → Mostra conteúdo do capítulo
│     → Botão "Pronto — Iniciar Questões →"
│
├── 2. Fase QUIZ
│     → Questões uma a uma
│     → Feedback imediato por questão:
│         ✅ Correto → "+8 XP" animado
│         ❌ Errado  → explicação + "-1 ❤️"
│         → Mostra alternativa correta
│     → Barra de progresso no topo
│
└── 3. Fase RESULTADO
      ┌──────────────────────────────┐
      │  ✅ Sessão Concluída!         │
      │  Score: 6/7 (85%)            │
      │  +45 XP  +5 💎               │
      │  ❤️❤️❤️❤️ (perdeu 1)          │
      │  Coroa 3 → 4 desbloqueada!   │
      │  [VER ERROS]  [CONTINUAR →]  │
      └──────────────────────────────┘
```

### Feedback por questão (inline, não modal)

```
┌─────────────────────────────────────────┐
│  ❌ Resposta incorreta                   │
│                                         │
│  Você marcou: B) Verificação            │
│  Correto era: A) Validação              │
│                                         │
│  Validação confirma que o produto       │
│  atende às necessidades do usuário.     │
│  Verificação checa conformidade com     │
│  especificações.  (FL-1.1.2)            │
│                                         │
│            [ CONTINUAR ]               │
└─────────────────────────────────────────┘
```

---

## 13. Simulado Oficial

Desbloqueado quando todos os 6 capítulos atingem **Coroa 3 ou mais**.

- **40 questões** seguindo distribuição oficial CTFL:
  - Cap 1: 10-11 questões (26%)
  - Cap 2: 6-7 questões (17%)
  - Cap 3: 4-5 questões (11%)
  - Cap 4: 10 questões (25%)
  - Cap 5: 5-6 questões (14%)
  - Cap 6: 2-3 questões (7%)
- Tempo: **65 minutos** (cronômetro visível)
- Aprovação: **65% (≥26 acertos)**
- Sem corações — é simulado real
- Resultado detalhado por capítulo com análise de pontos fracos

---

## 14. Novo Modelo de Dados (Prisma)

```prisma
// ─── GAMIFICAÇÃO ──────────────────────────────────────────────

model UserStats {
  id             String   @id @default(cuid())
  userId         String   @unique
  xpTotal        Int      @default(0)
  xpLevel        Int      @default(1)       // floor(xpTotal / 500) + 1
  gems           Int      @default(0)
  hearts         Int      @default(5)
  heartsLastFill DateTime @default(now())   // para regeneração 1/2h
  streakCurrent  Int      @default(0)
  streakRecord   Int      @default(0)
  streakLastDate DateTime?                  // data da última sessão
  streakFreezes  Int      @default(0)       // freezes disponíveis
  dailyGoalXp    Int      @default(10)      // meta diária em XP
  dailyXpToday   Int      @default(0)       // XP acumulado hoje
  dailyGoalDate  DateTime?                  // data do counter atual
  leagueId       String?
  updatedAt      DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  league       League?       @relation(fields: [leagueId], references: [id])
  achievements UserAchievement[]

  @@map("user_stats")
}

// ─── COROAS POR CAPÍTULO ──────────────────────────────────────

model ChapterProgress {
  id           String   @id @default(cuid())
  userId       String
  chapterId    String
  crownLevel   Int      @default(0)         // 0=locked, 1-5
  lastPractice DateTime?
  totalSessions Int     @default(0)
  bestScore    Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapter Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  @@unique([userId, chapterId])
  @@map("chapter_progress")
}

// ─── SESSÕES (substitui ModuleAttempt) ────────────────────────

model StudySession {
  id            String        @id @default(cuid())
  userId        String
  chapterId     String
  crownPlayed   Int           // coroa que estava sendo jogada (1-5)
  score         Int           // acertos
  total         Int           // total de questões
  percentage    Float
  passed        Boolean
  xpEarned      Int
  gemsEarned    Int
  heartsBefore  Int
  heartsAfter   Int
  isPerfect     Boolean       @default(false)
  durationSec   Int           @default(0)
  answers       Json
  createdAt     DateTime      @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapter Chapter @relation(fields: [chapterId], references: [id], onDelete: Cascade)

  @@map("study_sessions")
}

// ─── LIGA SEMANAL ─────────────────────────────────────────────

enum LeagueTier {
  BRONZE
  SILVER
  GOLD
  DIAMOND
}

model League {
  id        String      @id @default(cuid())
  tier      LeagueTier  @default(BRONZE)
  weekStart DateTime
  weekEnd   DateTime
  createdAt DateTime    @default(now())

  members   UserStats[]
  entries   LeagueEntry[]

  @@map("leagues")
}

model LeagueEntry {
  id        String   @id @default(cuid())
  leagueId  String
  userId    String
  xpWeek    Int      @default(0)
  rank      Int?
  updatedAt DateTime @updatedAt

  league League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([leagueId, userId])
  @@map("league_entries")
}

// ─── CONQUISTAS ───────────────────────────────────────────────

model Achievement {
  id          String  @id @default(cuid())
  key         String  @unique    // ex: "FIRST_SESSION", "STREAK_7", "CROWN5_CAP1"
  title       String
  description String
  icon        String
  xpReward    Int     @default(0)
  gemReward   Int     @default(0)

  users UserAchievement[]

  @@map("achievements")
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  statsId       String
  unlockedAt    DateTime @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id])
  stats       UserStats   @relation(fields: [statsId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@map("user_achievements")
}

// ─── LOJA / TRANSAÇÕES ────────────────────────────────────────

enum ShopItemKey {
  HEARTS_REFILL
  STREAK_FREEZE
  SESSION_SHIELD
  HINT
}

model GemTransaction {
  id        String      @id @default(cuid())
  userId    String
  item      ShopItemKey
  cost      Int
  createdAt DateTime    @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("gem_transactions")
}
```

---

## 15. Mudanças nos Modelos Existentes

```prisma
// Chapter — adicionar relação com ChapterProgress e StudySession
model Chapter {
  // ... campos existentes ...
  progress  ChapterProgress[]
  sessions  StudySession[]
}

// User — adicionar relações novas
model User {
  // ... campos existentes ...
  stats           UserStats?
  chapterProgress ChapterProgress[]
  studySessions   StudySession[]
  leagueEntries   LeagueEntry[]
  achievements    UserAchievement[]
  gemTransactions GemTransaction[]
}

// LearningModule — pode ser simplificado (crownLevel agora em ChapterProgress)
// Manter por compatibilidade com a trilha visual, mas status passa a derivar
// de ChapterProgress.crownLevel > 0
```

---

## 16. Lógica de Negócio Principal

### Desbloquear próximo capítulo
```
Cap N+1 é desbloqueado quando Cap N atinge crownLevel >= 1
```

### Decaimento (spaced repetition)
```
Se ChapterProgress.crownLevel == 5
  E lastPractice < hoje - 7 dias
  → crownLevel = 4 (precisa revisar)
```

### Regeneração de corações
```
Quantidade de corações = min(5, floor((agora - heartsLastFill) / 2h) + hearts)
Se hearts < 5 E passou 2h → +1 coração, atualiza heartsLastFill
```

### Streak
```
Ao concluir sessão:
  Se dailyGoalDate != hoje:
    dailyXpToday = xpSessão
    dailyGoalDate = hoje
  Senão:
    dailyXpToday += xpSessão

  Se dailyXpToday >= dailyGoalXp:
    Se streakLastDate == ontem → streakCurrent += 1
    Se streakLastDate < ontem - 1:
      Se streakFreezes > 0 → streakFreezes -= 1 (mantém streak)
      Senão → streakCurrent = 1
    streakLastDate = hoje
    streakRecord = max(streakRecord, streakCurrent)
```

### XP e nível
```
xpTotal += xpSessão
xpLevel = floor(xpTotal / 500) + 1
```

---

## 17. Rotas de API Necessárias

| Método | Rota                              | Descrição                                 |
|--------|-----------------------------------|-------------------------------------------|
| GET    | `/api/stats`                      | Retorna UserStats + coroas + streak       |
| POST   | `/api/sessions`                   | Inicia sessão (retorna questões + hearts) |
| PUT    | `/api/sessions/:id/submit`        | Submete respostas, calcula XP/gems/coroa  |
| GET    | `/api/chapters/:id/progress`      | Progresso de coroas do capítulo           |
| POST   | `/api/shop/buy`                   | Compra item com gems                      |
| GET    | `/api/league`                     | Liga atual + ranking                      |
| GET    | `/api/achievements`               | Conquistas desbloqueadas                  |

---

## 18. Telas Necessárias

| Rota                     | Tela                              |
|--------------------------|-----------------------------------|
| `/`                      | Home — trilha + stats do dia      |
| `/capitulo/:id`          | Detalhe do capítulo (coroas)      |
| `/sessao/:chapterId`     | Sessão ativa (estudo + quiz)      |
| `/simulado`              | Simulado oficial CTFL 40q         |
| `/perfil`                | XP, streak, badges, histórico     |
| `/liga`                  | Liga semanal + ranking            |
| `/loja`                  | Gems → itens                      |

---

## 19. Diferenças em Relação ao Sistema Atual

| Atual                               | Novo                                          |
|-------------------------------------|-----------------------------------------------|
| 1 trilha com módulos LOCKED/DONE    | 6 skills com 5 coroas cada                    |
| 100% de acerto para avançar         | Acerto mínimo por coroa (60%→100%)            |
| Sem gamificação                     | XP, gems, corações, streak, liga, badges      |
| Sem decaimento                      | Coroa 5 decai após 7 dias sem revisar         |
| LearningModule como unidade         | ChapterProgress como unidade                  |
| ModuleAttempt sem XP                | StudySession com XP, gems, hearts             |
| Upload → trilha criada uma vez      | Upload → ChapterProgress criado (crown 0→1)   |

---

## 20. Próximas Implementações (Ordem Sugerida)

1. **Migração do schema** — criar tabelas novas, manter LearningModule por ora
2. **UserStats + ChapterProgress** — substituir LearningModule como unidade de progresso
3. **Tela Home Duolingo** — skill tree com ícones de coroa, barra de XP, streak, corações
4. **Sessão com feedback inline** — resposta correta/errada sem modal, XP animado
5. **Sistema de corações** — persistir no banco, regeneração por tempo
6. **Streak + meta diária** — banner no topo com chama
7. **Gems + Loja** — depois que XP/hearts estiverem funcionando
8. **Liga semanal** — fase final (depende de ter usuários)
9. **Conquistas** — paralelo à liga
