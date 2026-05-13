# QA Duolingo — Plataforma de Aprendizado em TI

> Aprender tecnologia do jeito que você aprende um idioma.

---

## Visão geral

O **QA Duolingo** é uma plataforma de aprendizado gamificado inspirada no Duolingo, voltada para profissionais e estudantes de Tecnologia da Informação. A ideia central é simples: transformar qualquer certificação ou área de TI em uma trilha interativa, com questões práticas, simulados reais e progressão por módulos — do zero até a certificação.

A plataforma é construída para crescer em módulos independentes, cada um representando uma área de conhecimento ou certificação. O primeiro módulo já está em produção.

---

## Roadmap de módulos

```
Fase 1 — QA (em andamento)
│
├── ✅ CTFL Smart Prep       → Certificação ISTQB CTFL Foundation Level
├── 🔜 CTFL Advanced         → ISTQB Advanced Level (Test Analyst, Manager...)
├── 🔜 Automação de Testes   → Selenium, Cypress, Playwright
└── 🔜 API Testing           → Postman, REST Assured, contratos

Fase 2 — TI completa (planejado)
│
├── 🔜 Agile & Scrum         → PSM, PSPO, SAFe
├── 🔜 DevOps                → CI/CD, Docker, Kubernetes
├── 🔜 Cloud                 → AWS, Azure, GCP (fundamentos)
├── 🔜 SQL & Dados           → consultas, modelagem, análise
└── 🔜 Segurança             → OWASP, pentest, ISO 27001
```

---

## Módulo atual: CTFL Smart Prep

O primeiro módulo da plataforma prepara o usuário para a prova de certificação **ISTQB CTFL (Certified Tester Foundation Level)** — a certificação de QA mais reconhecida do mundo.

### Como funciona

```
1. Simulado diagnóstico (40 questões · 65 min · formato real da prova)
        ↓
2. Plano de estudos gerado por IA com base nos erros
        ↓
3. Trilha personalizada criada automaticamente por capítulo
        ↓
4. Estuda módulo por módulo:
   Resumo do conteúdo → Quiz 10 questões → 70% para avançar
        ↓
5. Conclui a trilha → Simulado final → Aprovado na prova
```

### Funcionalidades do módulo CTFL

| Área | Funcionalidade |
|---|---|
| **Simulado** | 40 questões cronometradas (65 min), mesmo formato da prova ISTQB real |
| **Trilha de estudos** | Módulos sequenciais desbloqueados conforme o progresso |
| **Quiz por módulo** | 10 questões por capítulo, suporte a múltiplas respostas corretas |
| **Plano de estudos** | Gerado por IA identificando áreas de fraqueza |
| **Histórico** | Todos os simulados realizados com revisão detalhada de cada resposta |
| **Resultado detalhado** | Acertos por capítulo, explicação de cada alternativa |
| **Painel admin** | Gerenciamento de módulos, questões, usuários e configurações do sistema |

---

## Arquitetura da plataforma

A plataforma foi desenhada para ser modular desde o início. Cada curso/certificação é um conjunto de `AdminModule` + `AdminQuestion` no banco, com sua própria trilha e simulado.

```
Plataforma
├── Auth (usuários, papéis)
├── Módulo CTFL ──────────────── AdminModule[] + AdminQuestion[]
├── Módulo Scrum (futuro) ─────── AdminModule[] + AdminQuestion[]
├── Módulo AWS (futuro) ────────── AdminModule[] + AdminQuestion[]
│
├── Motor de Trilha ──────────── LearningPath → LearningModule[]
├── Motor de Simulado ────────── Simulation → SimulationAnswer[]
├── Motor de IA ──────────────── OpenAI GPT (plano de estudos)
└── Config dinâmica ──────────── SystemConfig (sem redeploy)
```

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, SSR + RSC) |
| Banco de dados | PostgreSQL via Prisma ORM |
| Autenticação | NextAuth v5 (email/senha, extensível para OAuth) |
| IA | OpenAI GPT (plano de estudos personalizado) |
| UI | Tailwind CSS v4 + Lucide icons |
| Gráficos | Recharts |
| Hospedagem | Railway |

---

## Modelo de dados (resumo)

```
User
 ├── Simulation[]          → simulados realizados (qualquer módulo)
 ├── LearningPath[]        → trilha personalizada por módulo
 │    └── LearningModule[] → LOCKED / UNLOCKED / COMPLETED
 │         └── ModuleAttempt[]
 └── StudyPlan[]           → plano gerado por IA

AdminModule              → unidade de conteúdo (capítulo / tema)
 └── AdminQuestion[]     → questões do banco oficial

SystemConfig             → configurações ajustáveis em tempo real
```

---

## Configurações ajustáveis pelo painel (sem deploy)

| Configuração | Padrão | Descrição |
|---|---|---|
| `MODULE_PASS_THRESHOLD` | 70% | Nota mínima para avançar no módulo |
| `MODULE_QUIZ_QUESTION_COUNT` | 10 | Questões por quiz de módulo |
| `ESTIMATED_MODULE_DURATION_MINUTES` | 30 min | Estimativa de tempo por módulo |
| `SIMULATION_PASS_THRESHOLD` | 65% | Nota mínima de aprovação no simulado |
| `SIMULATION_QUESTION_COUNT` | 40 | Questões por simulado |
| `SIMULATION_TIME_LIMIT_MINUTES` | 65 min | Tempo limite do simulado |
| `MIN_QUESTIONS_FOR_SIMULATION` | 10 | Mínimo de questões para gerar um simulado |

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/           → login, cadastro
│   ├── (dashboard)/      → área do aluno
│   │   ├── dashboard/    → visão geral + gráfico de progresso
│   │   ├── simulation/   → simulado cronometrado
│   │   ├── trilha/       → trilha de estudos personalizada
│   │   ├── results/      → resultado detalhado do simulado
│   │   ├── history/      → histórico de simulados
│   │   ├── study-plan/   → plano de estudos gerado por IA
│   │   └── logs/         → logs do sistema (admin)
│   ├── admin/            → painel administrativo
│   │   ├── modules/      → gestão de módulos + detecção de duplicatas
│   │   ├── questions/    → gestão de questões + importação em massa
│   │   ├── users/        → gestão de usuários e papéis
│   │   └── settings/     → configurações do sistema
│   └── api/              → rotas REST (Next.js Route Handlers)
├── components/
│   ├── admin/            → componentes do painel admin
│   └── ...               → componentes compartilhados (nav, header)
└── lib/
    ├── auth.ts           → NextAuth config
    ├── prisma.ts         → Prisma client singleton
    └── settings.ts       → configurações com cache 60s
```

---

## Próximos passos para expansão

Para adicionar um novo curso/certificação à plataforma basta:

1. **Criar os módulos** no painel admin (`/admin/modules`) com os capítulos do conteúdo
2. **Importar as questões** via planilha (`/admin/questions/import`)
3. **Configurar os parâmetros** no painel de configurações (nota de aprovação, nº de questões, tempo)
4. O motor de trilha, simulado e IA já funcionam automaticamente para o novo conteúdo

Sem alteração de código. Só conteúdo.
