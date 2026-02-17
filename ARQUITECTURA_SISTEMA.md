# ARQUITECTURA DEL SISTEMA - eZMacro
## Sistema Avanzado de Tracking Nutricional con IA

---

## STACK TECNOLÓGICO

### Frontend
- **Framework:** React 18+ con TypeScript
- **UI Framework:** shadcn/ui + Radix UI
- **Styling:** TailwindCSS
- **Animaciones:** Framer Motion
- **Gráficas:** Recharts + D3.js (para animaciones avanzadas)
- **Iconos:** Lucide React
- **Estado:** Zustand + React Query
- **Formularios:** React Hook Form + Zod

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Base de Datos:** PostgreSQL 16
- **ORM:** Prisma
- **Autenticación:** JWT + bcrypt
- **File Storage:** AWS S3 / Cloudflare R2
- **Cache:** Redis

### IA y APIs
- **Visión:** OpenAI GPT-4 Vision API
- **Nutrición:** USDA FoodData Central API
- **Procesamiento:** OpenAI GPT-4 API (análisis y recomendaciones)

### DevOps
- **Hosting:** Vercel (Frontend) + Railway/Render (Backend)
- **CI/CD:** GitHub Actions
- **Monitoreo:** Sentry
- **Analytics:** Plausible/PostHog

---

## ARQUITECTURA DE COMPONENTES

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │  Food Logger │  │   Analytics  │      │
│  │   Component  │  │   Component  │  │   Component  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Profile    │  │   Settings   │  │   Goals      │      │
│  │   Component  │  │   Component  │  │   Component  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Express)                       │
├─────────────────────────────────────────────────────────────┤
│  /auth     /users    /foods    /meals    /analytics         │
│  /weights  /photos   /goals    /recommendations             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  Redis Cache │  │  File Storage│
│   Database   │  │              │  │   (Images)   │
└──────────────┘  └──────────────┘  └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   GPT-4      │  │     USDA     │  │  Calculation │
│   Vision API │  │  FoodData API│  │    Engine    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## MODELO DE BASE DE DATOS

### Esquema Prisma

```prisma
// Usuario
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  profile       Profile?
  weights       Weight[]
  meals         Meal[]
  goals         Goal[]
  photos        Photo[]
}

// Perfil de Usuario
model Profile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  
  // Datos Básicos
  gender            String   // "male" | "female"
  birthDate         DateTime
  height            Float    // cm
  
  // Nivel de Actividad
  activityLevel     Float    // 1.2 - 1.9
  
  // Experiencia de Entrenamiento
  trainingLevel     String   // "beginner" | "intermediate" | "advanced"
  trainingYears     Int
  
  // Preferencias
  measurementSystem String   @default("metric") // "metric" | "imperial"
  
  updatedAt         DateTime @updatedAt
}

// Peso Diario
model Weight {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  
  weight    Float    // kg
  date      DateTime
  notes     String?
  
  createdAt DateTime @default(now())
  
  @@unique([userId, date])
  @@index([userId, date])
}

// Comida/Alimento
model Food {
  id                String   @id @default(cuid())
  
  // Identificación
  name              String
  brand             String?
  usdaFdcId         String?  // ID de USDA FoodData Central
  
  // Macronutrientes (por 100g)
  calories          Float
  protein           Float
  carbs             Float
  fat               Float
  fiber             Float?
  sugar             Float?
  
  // Micronutrientes (opcionales)
  sodium            Float?
  cholesterol       Float?
  vitaminD          Float?
  calcium           Float?
  iron              Float?
  potassium         Float?
  
  // Metadata
  servingSize       Float?   // g
  servingUnit       String?  // "g", "ml", "unit"
  category          String?  // "protein", "carb", "vegetable", etc.
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  mealFoods         MealFood[]
  
  @@index([name])
  @@index([usdaFdcId])
}

// Comida (Meal)
model Meal {
  id          String     @id @default(cuid())
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  
  name        String?    // "Desayuno", "Almuerzo", etc.
  mealType    String     // "breakfast" | "lunch" | "dinner" | "snack"
  date        DateTime
  
  // Foto de la comida
  photoUrl    String?
  
  // Análisis GPT-4 Vision
  aiAnalysis  Json?      // Resultado del análisis de IA
  verified    Boolean    @default(false)
  
  // Totales calculados
  totalCalories Float
  totalProtein  Float
  totalCarbs    Float
  totalFat      Float
  
  foods       MealFood[]
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  @@index([userId, date])
}

// Relación Many-to-Many entre Meal y Food
model MealFood {
  id        String   @id @default(cuid())
  
  mealId    String
  meal      Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  
  foodId    String
  food      Food     @relation(fields: [foodId], references: [id])
  
  // Cantidad consumida
  amount    Float    // gramos o unidades
  unit      String   // "g", "ml", "unit"
  
  // Macros calculados para esta porción
  calories  Float
  protein   Float
  carbs     Float
  fat       Float
  
  createdAt DateTime @default(now())
  
  @@index([mealId])
  @@index([foodId])
}

// Objetivos del Usuario
model Goal {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // Tipo de Objetivo
  type            String   // "cut" | "bulk" | "maintain" | "recomp"
  
  // Peso Objetivo
  targetWeight    Float?   // kg
  targetDate      DateTime?
  
  // Calorías y Macros Objetivo
  targetCalories  Float
  targetProtein   Float    // g
  targetCarbs     Float    // g
  targetFat       Float    // g
  
  // TDEE Calculado
  bmr             Float
  tdee            Float
  activityFactor  Float
  
  // Estado
  isActive        Boolean  @default(true)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId, isActive])
}

// Fotos de Progreso
model Photo {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  url         String
  type        String   // "front" | "side" | "back"
  date        DateTime
  weight      Float?   // peso en el momento de la foto
  notes       String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId, date])
}

// Análisis y Métricas Calculadas (Cache)
model Analytics {
  id                    String   @id @default(cuid())
  userId                String   @unique
  
  // Promedios Móviles (7 días)
  weightMovingAvg7d     Float?
  caloriesMovingAvg7d   Float?
  proteinMovingAvg7d    Float?
  carbsMovingAvg7d      Float?
  fatMovingAvg7d        Float?
  
  // Promedios Móviles (30 días)
  weightMovingAvg30d    Float?
  caloriesMovingAvg30d  Float?
  
  // TDEE Real (calculado adaptativamente)
  adaptiveTdee          Float?
  tdeeConfidence        Float?   // 0-1
  
  // Velocidad de Cambio
  weeklyWeightChange    Float?   // kg/semana
  monthlyWeightChange   Float?   // kg/mes
  
  // Adherencia
  adherenceRate7d       Float?   // % (0-100)
  adherenceRate30d      Float?   // % (0-100)
  
  // Última actualización
  lastCalculated        DateTime @default(now())
  
  @@index([userId])
}
```

---

## MÓDULOS PRINCIPALES

### 1. Calculation Engine (Motor de Cálculos)

**Ubicación:** `/backend/src/services/calculations/`

**Funciones:**

```typescript
// BMR y TDEE
calculateBMR(weight: number, height: number, age: number, gender: string): number
calculateTDEE(bmr: number, activityFactor: number): number
calculateAdaptiveTDEE(userId: string, days: number): Promise<number>

// Macronutrientes
calculateMacros(tdee: number, goal: GoalType, bodyWeight: number): MacroTargets
calculateProteinRequirement(weight: number, goal: GoalType, trainingLevel: string): number

// Análisis de Progreso
calculateMovingAverage(values: number[], window: number): number
calculateWeightTrend(userId: string, days: number): Promise<TrendData>
calculateAdherence(userId: string, days: number): Promise<number>

// Ajustes
suggestCalorieAdjustment(userId: string): Promise<AdjustmentRecommendation>
```

### 2. AI Vision Service (Servicio de Visión IA)

**Ubicación:** `/backend/src/services/ai/`

**Funciones:**

```typescript
// Análisis de Foto de Comida
async analyzeFoodPhoto(imageUrl: string): Promise<FoodAnalysis> {
  // 1. Enviar a GPT-4 Vision
  // 2. Parsear respuesta JSON
  // 3. Buscar alimentos en USDA
  // 4. Calcular macros
  // 5. Retornar análisis completo
}

// Validación y Corrección
async validateAndCorrect(
  analysis: FoodAnalysis, 
  userCorrections: UserCorrection[]
): Promise<FoodAnalysis>

// Aprendizaje
async saveFeedback(
  imageUrl: string, 
  originalAnalysis: FoodAnalysis, 
  correctedAnalysis: FoodAnalysis
): Promise<void>
```

### 3. USDA Integration Service

**Ubicación:** `/backend/src/services/usda/`

**Funciones:**

```typescript
// Búsqueda de Alimentos
async searchFood(query: string): Promise<USDAFood[]>
async getFoodDetails(fdcId: string): Promise<USDAFoodDetails>

// Cache
async getCachedFood(fdcId: string): Promise<Food | null>
async cacheFood(usdaFood: USDAFoodDetails): Promise<Food>
```

### 4. Analytics Engine (Motor de Analíticas)

**Ubicación:** `/backend/src/services/analytics/`

**Funciones:**

```typescript
// Métricas Diarias
async getDailyMetrics(userId: string, date: Date): Promise<DailyMetrics>

// Métricas Semanales
async getWeeklyMetrics(userId: string, startDate: Date): Promise<WeeklyMetrics>

// Métricas Mensuales
async getMonthlyMetrics(userId: string, month: number, year: number): Promise<MonthlyMetrics>

// Tendencias
async getTrends(userId: string, period: string): Promise<TrendData>

// Predicciones
async predictProgress(userId: string, weeks: number): Promise<ProgressPrediction>
```

### 5. Recommendation Engine (Motor de Recomendaciones)

**Ubicación:** `/backend/src/services/recommendations/`

**Funciones:**

```typescript
// Recomendaciones Personalizadas
async getPersonalizedRecommendations(userId: string): Promise<Recommendation[]>

// Sugerencias de Comidas
async suggestMeals(userId: string, mealType: string, remainingMacros: Macros): Promise<MealSuggestion[]>

// Ajustes de Plan
async suggestPlanAdjustments(userId: string): Promise<PlanAdjustment>

// Alertas
async checkAndGenerateAlerts(userId: string): Promise<Alert[]>
```

---

## API ENDPOINTS

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/refresh
```

### Users & Profile
```
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/profile
PATCH  /api/users/:id/profile
```

### Weights
```
GET    /api/weights
POST   /api/weights
GET    /api/weights/:id
PATCH  /api/weights/:id
DELETE /api/weights/:id
GET    /api/weights/trend
GET    /api/weights/moving-average
```

### Foods
```
GET    /api/foods
POST   /api/foods
GET    /api/foods/:id
PATCH  /api/foods/:id
DELETE /api/foods/:id
GET    /api/foods/search?q=chicken
GET    /api/foods/usda/search?q=chicken
GET    /api/foods/usda/:fdcId
```

### Meals
```
GET    /api/meals
POST   /api/meals
GET    /api/meals/:id
PATCH  /api/meals/:id
DELETE /api/meals/:id
POST   /api/meals/analyze-photo
POST   /api/meals/:id/verify
POST   /api/meals/:id/correct
GET    /api/meals/daily?date=2024-01-15
GET    /api/meals/range?start=2024-01-01&end=2024-01-31
```

### Goals
```
GET    /api/goals
POST   /api/goals
GET    /api/goals/:id
PATCH  /api/goals/:id
DELETE /api/goals/:id
GET    /api/goals/active
POST   /api/goals/calculate
```

### Analytics
```
GET    /api/analytics/dashboard
GET    /api/analytics/daily?date=2024-01-15
GET    /api/analytics/weekly?week=3&year=2024
GET    /api/analytics/monthly?month=1&year=2024
GET    /api/analytics/trends?period=30d
GET    /api/analytics/adherence?days=7
GET    /api/analytics/predictions?weeks=4
```

### Photos
```
GET    /api/photos
POST   /api/photos
GET    /api/photos/:id
DELETE /api/photos/:id
GET    /api/photos/timeline
```

### Recommendations
```
GET    /api/recommendations
GET    /api/recommendations/meals?type=lunch
GET    /api/recommendations/adjustments
GET    /api/recommendations/alerts
```

---

## COMPONENTES DE FRONTEND

### 1. Dashboard Principal

**Componentes:**
- `DashboardLayout.tsx` - Layout principal
- `DailyOverview.tsx` - Resumen del día
- `MacroRings.tsx` - Anillos animados de macros
- `CalorieProgress.tsx` - Barra de progreso de calorías
- `WeightChart.tsx` - Gráfica de peso con promedio móvil
- `QuickActions.tsx` - Acciones rápidas (log meal, add weight)

### 2. Food Logger

**Componentes:**
- `FoodLogger.tsx` - Componente principal
- `PhotoCapture.tsx` - Captura de foto
- `AIAnalysisResult.tsx` - Resultado del análisis IA
- `FoodSearch.tsx` - Búsqueda manual de alimentos
- `PortionAdjuster.tsx` - Ajuste de porciones
- `MealSummary.tsx` - Resumen de la comida

### 3. Analytics Dashboard

**Componentes:**
- `AnalyticsLayout.tsx` - Layout de analytics
- `WeightTrendChart.tsx` - Tendencia de peso (línea)
- `MacroDistributionChart.tsx` - Distribución de macros (pie/donut)
- `CalorieIntakeChart.tsx` - Ingesta calórica (barras)
- `AdherenceChart.tsx` - Adherencia (heatmap)
- `ProgressPhotos.tsx` - Galería de fotos de progreso
- `MetricsCards.tsx` - Tarjetas de métricas clave
- `PredictionChart.tsx` - Predicción de progreso

### 4. Profile & Settings

**Componentes:**
- `ProfileForm.tsx` - Formulario de perfil
- `GoalCalculator.tsx` - Calculadora de objetivos
- `TDEECalculator.tsx` - Calculadora de TDEE
- `MacroCalculator.tsx` - Calculadora de macros
- `SettingsPanel.tsx` - Panel de configuración

---

## SISTEMA DE ANIMACIONES

### Librería: Framer Motion + Custom Hooks

**Animaciones Clave:**

1. **Macro Rings (Anillos de Macros)**
```typescript
// Animación circular con gradiente
- Transición suave de 0 a valor actual
- Efecto de "glow" al alcanzar objetivo
- Animación de rebote al actualizar
```

2. **Gráficas de Línea (Weight Trend)**
```typescript
// Animación de trazado de línea
- Path drawing animation
- Puntos aparecen secuencialmente
- Tooltip interactivo con hover
- Zoom y pan suaves
```

3. **Gráficas de Barras (Calorie Intake)**
```typescript
// Barras crecen desde abajo
- Stagger animation (secuencial)
- Color gradient basado en objetivo
- Hover effect con escala
```

4. **Cards de Métricas**
```typescript
// Flip animation al cambiar valor
- Number counter animation
- Icon pulse effect
- Background gradient shift
```

5. **Transiciones de Página**
```typescript
// Fade + slide animations
- Page transitions suaves
- Skeleton loading states
- Optimistic UI updates
```

---

## FLUJO DE USUARIO PRINCIPAL

### 1. Registro y Onboarding
```
1. Crear cuenta (email/password)
2. Completar perfil (edad, altura, peso, género)
3. Seleccionar objetivo (cut/bulk/maintain/recomp)
4. Calcular TDEE y macros
5. Tour guiado de la aplicación
```

### 2. Log de Comida con Foto
```
1. Usuario toma foto de comida
2. Foto se sube a storage
3. Backend envía a GPT-4 Vision
4. IA analiza y retorna alimentos + porciones
5. Backend consulta USDA para macros precisos
6. Usuario revisa y ajusta si necesario
7. Confirma y guarda comida
8. Dashboard se actualiza en tiempo real
```

### 3. Tracking Diario
```
1. Usuario pesa por la mañana
2. Ingresa peso en app
3. Sistema calcula promedio móvil
4. Actualiza gráficas de tendencia
5. Log de comidas durante el día
6. Dashboard muestra progreso en tiempo real
7. Notificaciones si se acerca a límites
```

### 4. Revisión Semanal
```
1. Sistema calcula métricas semanales
2. Compara con semana anterior
3. Evalúa si necesita ajustes
4. Genera recomendaciones personalizadas
5. Usuario revisa analytics dashboard
6. Toma foto de progreso (opcional)
```

---

## OPTIMIZACIONES DE RENDIMIENTO

### Frontend
- Code splitting por ruta
- Lazy loading de componentes pesados
- Memoization de cálculos complejos
- Virtual scrolling para listas largas
- Optimistic UI updates
- Service Worker para offline support

### Backend
- Redis cache para queries frecuentes
- Database indexing estratégico
- Connection pooling
- Rate limiting por usuario
- Batch processing para analytics
- CDN para imágenes

### IA
- Cache de análisis de fotos similares
- Batch requests a OpenAI cuando posible
- Fallback a análisis local si API falla
- Queue system para procesamiento asíncrono

---

## SEGURIDAD

### Autenticación
- JWT con refresh tokens
- Password hashing con bcrypt (12 rounds)
- Rate limiting en login
- Email verification
- 2FA opcional

### Autorización
- Role-based access control (RBAC)
- User can only access own data
- API key para servicios externos
- CORS configurado correctamente

### Datos
- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (DB)
- Sanitización de inputs
- SQL injection prevention (Prisma)
- XSS prevention
- CSRF tokens

---

## MONITOREO Y LOGGING

### Métricas Clave
- Response time de APIs
- Error rate
- User engagement
- AI accuracy rate
- Database query performance
- Cache hit rate

### Logging
- Structured logging (JSON)
- Log levels (error, warn, info, debug)
- Request/response logging
- Error tracking con Sentry
- Analytics con PostHog

---

## DEPLOYMENT

### Staging Environment
- Auto-deploy desde `develop` branch
- Testing environment
- Datos de prueba

### Production Environment
- Manual deploy desde `main` branch
- Blue-green deployment
- Automatic rollback on errors
- Database migrations con Prisma
- Environment variables seguras

---

## ROADMAP DE DESARROLLO

### Fase 1: MVP (4-6 semanas)
- ✅ Autenticación y perfil
- ✅ Calculadora de TDEE/macros
- ✅ Log manual de comidas
- ✅ Tracking de peso
- ✅ Dashboard básico
- ✅ Gráficas simples

### Fase 2: IA Integration (3-4 semanas)
- ✅ Integración GPT-4 Vision
- ✅ Análisis de fotos de comida
- ✅ Integración USDA API
- ✅ Sistema de correcciones
- ✅ Feedback loop

### Fase 3: Analytics Avanzado (3-4 semanas)
- ✅ Promedio móvil adaptativo
- ✅ TDEE adaptativo
- ✅ Predicciones de progreso
- ✅ Sistema de recomendaciones
- ✅ Alertas inteligentes

### Fase 4: Visualizaciones Premium (2-3 semanas)
- ✅ Animaciones avanzadas
- ✅ Gráficas interactivas estilo Power BI
- ✅ Heatmaps de adherencia
- ✅ Timeline de fotos de progreso
- ✅ Comparaciones antes/después

### Fase 5: Features Adicionales (Ongoing)
- Modo offline
- Exportación de datos
- Integración con wearables
- Recetas personalizadas
- Comunidad y social features
- App móvil nativa

---

**PRECISIÓN OBJETIVO DEL SISTEMA COMPLETO: 99%+**

*Arquitectura diseñada para escalabilidad, precisión y experiencia de usuario premium*
