# 📂 GRINDTRACKER - ESTRUTURA DO PROJETO

## 🏗️ Arquitetura Geral

GrindTracker é uma aplicação React + Firebase para tracking de produtividade com:

- Atividades diárias com timer
- Hábitos mensais com tracking
- Estatísticas e níveis de progresso
- Comparação entre usuários

---

## 📁 Estrutura de Pastas

```
/src
├── assets/              # Imagens das atividades
├── components/
│   ├── activities/      # Lista e cards de atividades
│   ├── auth/           # Login/Logout
│   ├── audio/          # AudioPlayer
│   ├── charts/         # Gráficos (WeeklyAreaChart)
│   ├── habits/         # Tabela de hábitos mensal
│   ├── header/         # Header da aplicação
│   ├── profile/        # Perfil do usuário
│   ├── timer/          # Timer para atividades
│   ├── dashboard/      # Dashboard principal
│   ├── Footer.jsx
│   └── ErrorBoundary.jsx
├── contexts/
│   ├── AuthContext.jsx          # Autenticação Firebase
│   ├── TimerContext.jsx         # Estado global do timer
│   └── ActivitiesContext.jsx    # Estado centralizado de atividades
├── hooks/
│   ├── useHabitsTracking.js     # Lógica de hábitos
│   ├── useUserStats.js          # Cálculo de estatísticas
│   └── useWeeklyData.js         # Dados semanais para gráfico
├── services/
│   ├── firebase.js              # Configuração Firebase
│   ├── activitiesService.js     # CRUD de atividades customizadas
│   ├── habitsService.js         # CRUD de hábitos
│   ├── descriptionsService.js   # CRUD de descrições
│   └── timerService.js          # Operações do timer
├── utils/
│   ├── formatters/
│   │   ├── dateFormatters.js    # Formatação de datas
│   │   ├── timeFormatters.js    # Formatação de tempo
│   │   └── numberFormatters.js  # Formatação de números
│   ├── aggregators/
│   │   └── activityAggregator.js # Agregação de atividades
│   ├── validators/
│   │   └── timeValidator.js     # Validação de tempo
│   ├── constants/
│   │   ├── activityImages.js    # Mapa de imagens
│   │   └── colors.js            # Cores e levels
│   ├── dateHelpers.js           # Helper legado (re-exports)
│   ├── calendarHelpers.js
│   └── activityListHelpers.js   # Helper legado (re-exports)
├── App.jsx
└── main.jsx
```

---

## 🔥 Firestore - Estrutura de Dados

### Collections:

#### `/activities/{userId}/entries/{entryId}`

```javascript
{
  userId: string,
  userEmail: string,
  activity: string,           // Nome da atividade
  type: 'timed' | 'binary',  // Tipo
  minutes: number,            // Minutos (se timed)
  targetMinutes: number?,     // Meta opcional
  completed: boolean?,        // Se binary
  date: 'YYYY-MM-DD',        // Data
  createdAt: Timestamp
}
```

#### `/activityDescriptions/{docId}`

```javascript
{
  userId: string,
  activity: string,
  date: 'YYYY-MM-DD',
  description: string,
  updatedAt: Timestamp
}
```

#### `/habits/{userId}/tracking/{yearMonth}`

```javascript
{
  userId: string,
  year: number,
  month: number,
  data: {
    'HabitName': {
      '01': true,  // Dia 1 checado
      '02': false,
      // ...
    }
  }
}
```

#### `/users/{userId}/customActivities/{templateId}`

```javascript
{
  name: string,
  type: 'timed' | 'binary',
  time: 'HH:MM',       // Duração padrão
  target: 'HH:MM',     // Meta opcional
  order: number        // Ordem de exibição
}
```

#### `/users/{userId}/habits/{habitId}`

```javascript
{
  name: string,
  duration: 'HH:MM',
  order: number
}
```

---

## 🎯 Fluxo de Dados

### 1. Login

- `AuthContext` gerencia autenticação via Firebase Auth
- Redireciona para Dashboard se autenticado

### 2. Carregamento Inicial

- `ActivitiesContext` cria listeners para:
  - `customActivities` (templates)
  - `dailyActivities` (atividades do dia atual)
- Dashboard renderiza componentes filhos

### 3. Adicionar Atividade

- `ActivityForm` → `ActivitiesContext.addActivity()`
- Listener atualiza `dailyActivities` automaticamente
- `ActivityList` recebe novos dados e re-renderiza

### 4. Hábitos

- `HabitsTable` carrega hábitos do mês
- `useHabitsTracking` gerencia check/uncheck
- Ao marcar hábito → cria atividade automaticamente

### 5. Estatísticas

- `useUserStats` calcula ao abrir ProfileCard
- Busca TODAS as atividades do usuário
- Agrega por atividade e por dia

---

## ⚡ Otimizações Implementadas

### React.memo

- `ActivityCard`, `HabitRow`, `HabitCell`
- `ProfileHeader`, `ProfileStats`, `TopActivities`

### Lazy Loading

- Login, Dashboard (code splitting)
- Modals (Suspense)

### Memoização

- `useMemo`: Cálculos pesados (aggregated, stats)
- `useCallback`: Funções passadas como props

### ErrorBoundary

- Captura erros em componentes filhos
- Previne crash total da aplicação

---

## 🚀 Como Rodar

```bash
# Instalar dependências
npm install

# Dev
npm run dev

# Build
npm run build

# Preview do build
npm run preview
```

---

## 📝 Convenções

### Nomenclatura

- Componentes: PascalCase (`ActivityCard.jsx`)
- Hooks: camelCase com `use` prefix (`useUserStats.js`)
- Services: camelCase com `Service` suffix (`activitiesService.js`)
- Utils: camelCase (`timeFormatters.js`)

### Imports

- React primeiro
- Bibliotecas externas
- Contexts/Hooks
- Components
- Utils/Services
- Assets

### Comentários

- JSDoc para funções exportadas
- Comentários inline apenas quando necessário
- Seções marcadas com `// ===`

---

## 🔒 Regras de Segurança (Firestore)

```javascript
// UIDs permitidos
const ALLOWED_UIDS = [
  'esSKmDM9XuWycUR9PpDpOX7321q2',
  'L2II4ZwHwZNObqIi3MyxouYB6Cq1',
  'NzDVaejxMgQPO13ud1db1v2opqE2'
];

// Usuário só acessa seus próprios dados
match /activities/{userId}/entries/{entryId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 🎨 Design System

### Cores

- Primary: `#8b8b8b`
- Background: `#1a1a1a`, `#1e1e1e`, `#252525`
- Success: `#00C853`
- Error: `#EF4444`

### Fontes

- Títulos: `Cinzel Decorative`
- Corpo: `Inter`

### Níveis de Progresso

- 0-100h: Beginner 🌱
- 100-250h: Advanced 💪
- 250-500h: Expert 🔥
- 500-1000h: Master ⚡
- 1000h+: Legendary 👑

---

## 🐛 Debug

Console logs foram removidos, mas erros são capturados por:

- `ErrorBoundary` (UI)
- `try-catch` em operações async
- Logs de erro do Firebase

---

## 📦 Principais Dependências

- `react` - UI
- `firebase` - Backend
- `framer-motion` - Animações
- `lucide-react` - Ícones
- `@dnd-kit` - Drag and drop (hábitos)
- `recharts` - Gráficos

---

## ✅ Checklist de Qualidade

- [x] ErrorBoundary implementado
- [x] Console.logs removidos
- [x] React.memo em componentes puros
- [x] Lazy loading de rotas
- [x] Listeners otimizados (single source)
- [x] Código organizado por responsabilidade
- [x] Documentação atualizada

---

**Última atualização:** Fase 5 - Polimento Final

```

---

## 🎉 **FASE 5 COMPLETA!**

### ✅ **O QUE FOI FEITO:**

1. ✅ **ErrorBoundary** - Captura erros e previne crash
2. ✅ **Console.logs removidos** - Contexts e hooks limpos
3. ✅ **Documentação completa** - PROJECT_STRUCTURE.md
4. ✅ **App.jsx atualizado** - Com ErrorBoundary
5. ✅ **Código limpo** - Pronto para produção

---

## 🏆 **RESULTADO FINAL:**

### **Antes (início):**
```

❌ 3+ listeners duplicados
❌ Estado em 4+ lugares diferentes
❌ Componentes com 600+ linhas
❌ Hacks de scroll
❌ Utils bagunçados
❌ Sem error handling
❌ Console.logs por toda parte

```

### **Depois (agora):**
```

✅ 1 listener por recurso (otimizado)
✅ Estado centralizado em Contexts
✅ Componentes < 200 linhas
✅ Scroll nativo suave
✅ Utils organizados por responsabilidade
✅ ErrorBoundary capturando erros
✅ Código limpo e documentado
✅ Performance otimizada
✅ Pronto para produção
