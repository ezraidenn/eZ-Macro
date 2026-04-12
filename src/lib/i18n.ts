export type Locale = "es" | "en";

const translations = {
  es: {
    // Nav
    "nav.home": "Inicio",
    "nav.log": "Registrar",
    "nav.weight": "Peso",
    "nav.analytics": "Análisis",
    "nav.profile": "Perfil",

    // Auth
    "auth.login": "Iniciar Sesión",
    "auth.register": "Crear Cuenta",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.confirmPassword": "Confirmar contraseña",
    "auth.noAccount": "¿No tienes cuenta?",
    "auth.hasAccount": "¿Ya tienes cuenta?",
    "auth.rememberMe": "Mantener sesión abierta",
    "auth.welcome": "Bienvenido a eZMacro",
    "auth.subtitle": "Seguimiento nutricional con precisión científica",
    "auth.logout": "Cerrar Sesión",
    "auth.loginError": "Correo o contraseña incorrectos",
    "auth.registerError": "Error al crear la cuenta",
    "auth.passwordMismatch": "Las contraseñas no coinciden",
    "auth.emailRequired": "El correo es obligatorio",
    "auth.passwordMin": "Mínimo 6 caracteres",
    "auth.passwordMinEight": "Mínimo 8 caracteres",
    "auth.forgotPassword": "¿Olvidaste tu contraseña?",
    "auth.forgotPasswordTitle": "Recuperar contraseña",
    "auth.forgotPasswordDesc": "Ingresa tu correo y te enviaremos un enlace para restablecerla.",
    "auth.sendInstructions": "Enviar instrucciones",
    "auth.checkEmail": "Revisa tu correo",
    "auth.checkEmailDesc": "Si el correo está registrado, recibirás un enlace en los próximos minutos. Revisa también spam.",
    "auth.backToLogin": "Volver al inicio de sesión",
    "auth.resetPassword": "Restablecer contraseña",
    "auth.resetPasswordDesc": "Elige una nueva contraseña para tu cuenta.",
    "auth.newPassword": "Nueva contraseña",
    "auth.passwordUpdated": "Contraseña actualizada",
    "auth.passwordUpdatedDesc": "Serás redirigido al inicio de sesión en un momento.",
    "auth.genericError": "Ocurrió un error. Intenta de nuevo.",

    // Onboarding
    "onboarding.title": "Comencemos",
    "onboarding.subtitle": "Necesitamos algunos datos para calcular tus objetivos con precisión.",
    "onboarding.name": "Nombre",
    "onboarding.namePlaceholder": "Tu nombre",
    "onboarding.gender": "Género",
    "onboarding.male": "Masculino",
    "onboarding.female": "Femenino",
    "onboarding.age": "Edad",
    "onboarding.height": "Altura (cm)",
    "onboarding.weight": "Peso (kg)",
    "onboarding.activityTitle": "Nivel de Actividad",
    "onboarding.activitySubtitle": "Esto determina tu multiplicador de gasto energético diario.",
    "onboarding.trainingExp": "Experiencia de Entrenamiento",
    "onboarding.goalTitle": "Tu Objetivo",
    "onboarding.goalSubtitle": "Esto define tu objetivo calórico y distribución de macros.",
    "onboarding.planTitle": "Tu Plan",
    "onboarding.planSubtitle": "Calculado con la ecuación Mifflin-St Jeor y ratios científicos de macros.",
    "onboarding.continue": "Continuar",
    "onboarding.startTracking": "Comenzar Seguimiento",
    "onboarding.weeklyChange": "Cambio semanal esperado",

    // Activity levels
    "activity.sedentary": "Sedentario",
    "activity.light": "Ligeramente Activo",
    "activity.moderate": "Moderadamente Activo",
    "activity.active": "Muy Activo",
    "activity.very_active": "Extremadamente Activo",
    "activity.sedentary.desc": "Poco o nada de ejercicio, trabajo de escritorio",
    "activity.light.desc": "Ejercicio ligero 1-3 días/semana",
    "activity.moderate.desc": "Ejercicio moderado 3-5 días/semana",
    "activity.active.desc": "Ejercicio intenso 6-7 días/semana",
    "activity.very_active.desc": "Ejercicio muy intenso + trabajo físico",

    // Goals
    "goal.cut": "Pérdida de Grasa",
    "goal.bulk": "Ganancia Muscular",
    "goal.maintain": "Mantenimiento",
    "goal.recomp": "Recomposición Corporal",
    "goal.cut.desc": "Perder grasa corporal preservando masa muscular",
    "goal.bulk.desc": "Ganar músculo con aumento de peso controlado",
    "goal.maintain.desc": "Mantener peso y composición corporal actual",
    "goal.recomp.desc": "Perder grasa y ganar músculo simultáneamente",

    // Training
    "training.beginner": "Principiante",
    "training.intermediate": "Intermedio",
    "training.advanced": "Avanzado",

    // Dashboard
    "dashboard.greeting.morning": "Buenos días",
    "dashboard.greeting.afternoon": "Buenas tardes",
    "dashboard.greeting.evening": "Buenas noches",
    "dashboard.today": "Hoy",
    "dashboard.remaining": "Restante Hoy",
    "dashboard.meals": "Comidas",
    "dashboard.addMeal": "Agregar Comida",
    "dashboard.noMeals": "No hay comidas registradas",
    "dashboard.noMealsHint": "Toca \"Agregar Comida\" o toma una foto",
    "dashboard.currentWeight": "Peso Actual",
    "dashboard.weeklyChange": "Cambio Semanal",
    "dashboard.last7days": "Últimos 7 días",
    "dashboard.noData": "Sin datos",
    "dashboard.deleteFailed": "Error al eliminar la comida",

    // Log
    "log.title": "Registrar Comida",
    "log.takePhoto": "Tomar Foto",
    "log.takePhotoDesc": "La IA analiza tu comida al instante",
    "log.uploadPhoto": "Subir Foto",
    "log.uploadPhotoDesc": "Seleccionar de la galería",
    "log.manualEntry": "Entrada Manual",
    "log.manualEntryDesc": "Agregar alimentos manualmente",
    "log.analyzing": "Analizando tu comida...",
    "log.analyzingDesc": "GPT-4 Vision está identificando alimentos y estimando porciones",
    "log.aiNotes": "Notas de la IA",
    "log.itemsDetected": "elementos detectados — ajusta si es necesario",
    "log.addManually": "Agregar alimentos manualmente",
    "log.mealTotal": "Total de la Comida",
    "log.saveMeal": "Guardar Comida",
    "log.mealSaved": "Comida registrada exitosamente",
    "log.saveError": "Error al guardar la comida. Intenta de nuevo.",
    "log.addContext": "Agregar contexto (opcional)",
    "log.contextPlaceholder": "💡 Para mayor precisión, incluye una referencia: lata de refresco, tarjeta INE, tu mano abierta, o cubiertos. También describe porciones: 'medio plato', '6 tortillas', 'con piel', etc.",
    "log.analyzePhoto": "Analizar Foto",
    "log.searchFood": "Buscar Alimento",
    "log.searchFoodDesc": "Base de datos + escáner de código de barras",
    "log.perServing": "Por porción",
    "log.saveTemplate": "Guardar como plantilla",
    "log.templateSaved": "Comida guardada como plantilla",
    "common.cancel": "Cancelar",

    // Meal types
    "meal.breakfast": "Desayuno",
    "meal.lunch": "Almuerzo",
    "meal.dinner": "Cena",
    "meal.snack": "Snack",

    // Weight
    "weight.title": "Seguimiento de Peso",
    "weight.todayWeight": "Peso de Hoy",
    "weight.alreadyLogged": "Ya registrado hoy",
    "weight.tip": "Pésate en la mañana, en ayunas",
    "weight.updateWeight": "Actualizar Peso",
    "weight.logWeight": "Registrar Peso",
    "weight.logged": "Peso registrado",
    "weight.invalidWeight": "Ingresa un peso válido (20-400 kg)",
    "weight.current": "Actual",
    "weight.7day": "7 Días",
    "weight.30day": "30 Días",
    "weight.trend": "Tendencia de Peso (Últimos 30 Días)",
    "weight.daily": "Diario",
    "weight.7dayAvg": "Promedio 7 Días",
    "weight.history": "Historial",

    // Analytics
    "analytics.title": "Análisis",
    "analytics.avgCalories": "Calorías Prom.",
    "analytics.adherence": "Adherencia",
    "analytics.adherenceDesc": "Dentro del 10% del objetivo",
    "analytics.adaptiveTDEE": "TDEE Adaptativo",
    "analytics.basedOnData": "Basado en datos reales",
    "analytics.needData": "Necesitas 7+ días de datos",
    "analytics.daysLogged": "Días Registrados",
    "analytics.thisWeek": "Esta semana",
    "analytics.dailyCalories": "Ingesta Calórica Diaria",
    "analytics.target": "Objetivo",
    "analytics.macroDistribution": "Distribución de Macros (Prom. 7 Días)",
    "analytics.dailyProtein": "Ingesta Diaria de Proteína",
    "analytics.tdeeComparison": "Comparación de TDEE",
    "analytics.estimated": "Estimado (Mifflin-St Jeor)",
    "analytics.adaptive": "Adaptativo (Datos Reales)",
    "analytics.difference": "Diferencia",
    "analytics.adaptiveNote": "— El TDEE adaptativo es más preciso ya que usa tus datos reales de ingesta y peso.",
    "analytics.onTarget": "En objetivo",
    "analytics.under": "Bajo",
    "analytics.over": "Exceso",

    // Profile
    "profile.title": "Perfil",
    "profile.currentTargets": "Objetivos Actuales",
    "profile.dailyCalories": "Calorías Diarias",
    "profile.save": "Guardar y Recalcular",
    "profile.reset": "Reiniciar",
    "profile.updated": "Perfil actualizado — objetivos recalculados",
    "profile.nameRequired": "El nombre es obligatorio",
    "profile.howCalculated": "Cómo se calculan los objetivos",
    "profile.sciNote1": "BMR: Ecuación Mifflin-St Jeor (82% precisión)",
    "profile.sciNote2": "TDEE: BMR x Multiplicador de actividad",
    "profile.sciNote3": "Proteína: 1.6-2.4 g/kg según objetivo (Morton et al. 2018)",
    "profile.sciNote4": "Grasa: Mín 0.6 g/kg para salud hormonal (ACSM)",
    "profile.sciNote5": "Carbohidratos: Calorías restantes después de P+G",
    "profile.sciNote6": "Déficit/Superávit: Según nivel de entrenamiento (Garthe et al. 2011)",

    // Settings
    "settings.title": "Configuración",
    "settings.appearance": "Apariencia",
    "settings.darkMode": "Modo Oscuro",
    "settings.lightMode": "Modo Claro",
    "settings.language": "Idioma",
    "settings.spanish": "Español",
    "settings.english": "English",
    "settings.account": "Cuenta",

    // Macros
    "macro.protein": "Proteína",
    "macro.carbs": "Carbohidratos",
    "macro.fat": "Grasa",
    "macro.fiber": "Fibra",
    "macro.calories": "Calorías",
    "macro.proteinShort": "Proteína",
    "macro.carbsShort": "Carbohidratos",
    "macro.fatShort": "Grasa",
    "macro.fiberShort": "Fibra",

    // Units
    "unit.g": "g",
    "unit.kg": "kg",
    "unit.kcal": "kcal",
    "unit.protein": "proteína",
    "unit.carbs": "carbohidratos",
    "unit.fat": "grasa",
    "unit.fiber": "fibra",
    "unit.left": "restante",
    "unit.remaining": "restante",

    // Common
    "common.deficit": "Déficit",
    "common.surplus": "Superávit",
    "common.balance": "Balance",
    "common.dailyTarget": "Objetivo Diario",
    "common.loading": "Cargando...",
    "common.protein": "Proteína",
    "common.carbs": "Carbohidratos",
    "common.fat": "Grasa",
    "common.fiber": "Fibra",
  },
  en: {
    // Nav
    "nav.home": "Home",
    "nav.log": "Log",
    "nav.weight": "Weight",
    "nav.analytics": "Analytics",
    "nav.profile": "Profile",

    // Auth
    "auth.login": "Log In",
    "auth.register": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm password",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.logout": "Log Out",
    "auth.welcome": "Welcome to eZMacro",
    "auth.subtitle": "Precision nutrition tracking with scientific accuracy",
    "auth.loginError": "Invalid email or password",
    "auth.registerError": "Failed to create account",
    "auth.passwordMismatch": "Passwords don't match",
    "auth.emailRequired": "Email is required",
    "auth.passwordMin": "Minimum 6 characters",
    "auth.passwordMinEight": "Minimum 8 characters",
    "auth.rememberMe": "Remember me",
    "auth.forgotPassword": "Forgot password?",
    "auth.forgotPasswordTitle": "Reset your password",
    "auth.forgotPasswordDesc": "Enter your email and we'll send you a reset link.",
    "auth.sendInstructions": "Send instructions",
    "auth.checkEmail": "Check your email",
    "auth.checkEmailDesc": "If the email is registered, you'll receive a link shortly. Check your spam folder too.",
    "auth.backToLogin": "Back to login",
    "auth.resetPassword": "Reset password",
    "auth.resetPasswordDesc": "Choose a new password for your account.",
    "auth.newPassword": "New password",
    "auth.passwordUpdated": "Password updated",
    "auth.passwordUpdatedDesc": "You'll be redirected to login shortly.",
    "auth.genericError": "Something went wrong. Please try again.",

    // Onboarding
    "onboarding.title": "Let's get started",
    "onboarding.subtitle": "We need some basics to calculate your targets precisely.",
    "onboarding.name": "Name",
    "onboarding.namePlaceholder": "Your name",
    "onboarding.gender": "Gender",
    "onboarding.male": "Male",
    "onboarding.female": "Female",
    "onboarding.age": "Age",
    "onboarding.height": "Height (cm)",
    "onboarding.weight": "Weight (kg)",
    "onboarding.activityTitle": "Activity Level",
    "onboarding.activitySubtitle": "This determines your daily energy expenditure multiplier.",
    "onboarding.trainingExp": "Training Experience",
    "onboarding.goalTitle": "Your Goal",
    "onboarding.goalSubtitle": "This shapes your calorie target and macro distribution.",
    "onboarding.planTitle": "Your Plan",
    "onboarding.planSubtitle": "Calculated using Mifflin-St Jeor equation with scientific macro ratios.",
    "onboarding.continue": "Continue",
    "onboarding.startTracking": "Start Tracking",
    "onboarding.weeklyChange": "Expected weekly change",

    // Activity levels
    "activity.sedentary": "Sedentary",
    "activity.light": "Lightly Active",
    "activity.moderate": "Moderately Active",
    "activity.active": "Very Active",
    "activity.very_active": "Extremely Active",
    "activity.sedentary.desc": "Little or no exercise, desk job",
    "activity.light.desc": "Light exercise 1-3 days/week",
    "activity.moderate.desc": "Moderate exercise 3-5 days/week",
    "activity.active.desc": "Hard exercise 6-7 days/week",
    "activity.very_active.desc": "Very hard exercise + physical job",

    // Goals
    "goal.cut": "Fat Loss",
    "goal.bulk": "Muscle Gain",
    "goal.maintain": "Maintenance",
    "goal.recomp": "Body Recomposition",
    "goal.cut.desc": "Lose body fat while preserving muscle mass",
    "goal.bulk.desc": "Build muscle with controlled weight gain",
    "goal.maintain.desc": "Maintain current weight and body composition",
    "goal.recomp.desc": "Lose fat and gain muscle simultaneously",

    // Training
    "training.beginner": "Beginner",
    "training.intermediate": "Intermediate",
    "training.advanced": "Advanced",

    // Dashboard
    "dashboard.greeting.morning": "Good morning",
    "dashboard.greeting.afternoon": "Good afternoon",
    "dashboard.greeting.evening": "Good evening",
    "dashboard.today": "Today",
    "dashboard.remaining": "Remaining Today",
    "dashboard.meals": "Meals",
    "dashboard.addMeal": "Add Meal",
    "dashboard.noMeals": "No meals logged yet",
    "dashboard.noMealsHint": "Tap \"Add Meal\" or take a photo",
    "dashboard.currentWeight": "Current Weight",
    "dashboard.weeklyChange": "Weekly Change",
    "dashboard.last7days": "Last 7 days",
    "dashboard.noData": "No data yet",
    "dashboard.deleteFailed": "Failed to delete meal",

    // Log
    "log.title": "Log Meal",
    "log.takePhoto": "Take Photo",
    "log.takePhotoDesc": "AI analyzes your food instantly",
    "log.uploadPhoto": "Upload Photo",
    "log.uploadPhotoDesc": "Select from gallery",
    "log.manualEntry": "Manual Entry",
    "log.manualEntryDesc": "Add foods manually",
    "log.analyzing": "Analyzing your meal...",
    "log.analyzingDesc": "GPT-4 Vision is identifying foods and estimating portions",
    "log.aiNotes": "AI Notes",
    "log.itemsDetected": "items detected — adjust if needed",
    "log.addManually": "Add foods manually",
    "log.mealTotal": "Meal Total",
    "log.saveMeal": "Save Meal",
    "log.mealSaved": "Meal logged successfully",
    "log.saveError": "Error saving meal. Please try again.",
    "log.addContext": "Add context (optional)",
    "log.contextPlaceholder": "💡 For better accuracy, include a reference: soda can, credit card, your open hand, or utensils. Also describe portions: 'half plate', '6 tortillas', 'with skin', etc.",
    "log.analyzePhoto": "Analyze Photo",
    "log.searchFood": "Search Food",
    "log.searchFoodDesc": "Food database + barcode scanner",
    "log.perServing": "Per serving",
    "log.saveTemplate": "Save as template",
    "log.templateSaved": "Meal saved as template",
    "common.cancel": "Cancel",

    // Meal types
    "meal.breakfast": "Breakfast",
    "meal.lunch": "Lunch",
    "meal.dinner": "Dinner",
    "meal.snack": "Snack",

    // Weight
    "weight.title": "Weight Tracking",
    "weight.todayWeight": "Today's Weight",
    "weight.alreadyLogged": "Already logged today",
    "weight.tip": "Weigh in the morning, fasted",
    "weight.updateWeight": "Update Weight",
    "weight.logWeight": "Log Weight",
    "weight.logged": "Weight logged",
    "weight.invalidWeight": "Enter a valid weight (20-400 kg)",
    "weight.current": "Current",
    "weight.7day": "7-Day",
    "weight.30day": "30-Day",
    "weight.trend": "Weight Trend (Last 30 Days)",
    "weight.daily": "Daily",
    "weight.7dayAvg": "7-Day Avg",
    "weight.history": "History",

    // Analytics
    "analytics.title": "Analytics",
    "analytics.avgCalories": "Avg Calories",
    "analytics.adherence": "Adherence",
    "analytics.adherenceDesc": "Within 10% of target",
    "analytics.adaptiveTDEE": "Adaptive TDEE",
    "analytics.basedOnData": "Based on real data",
    "analytics.needData": "Need 7+ days data",
    "analytics.daysLogged": "Days Logged",
    "analytics.thisWeek": "This week",
    "analytics.dailyCalories": "Daily Calorie Intake",
    "analytics.target": "Target",
    "analytics.macroDistribution": "Macro Distribution (7-Day Avg)",
    "analytics.dailyProtein": "Daily Protein Intake",
    "analytics.tdeeComparison": "TDEE Comparison",
    "analytics.estimated": "Estimated (Mifflin-St Jeor)",
    "analytics.adaptive": "Adaptive (Real Data)",
    "analytics.difference": "Difference",
    "analytics.adaptiveNote": "— Adaptive TDEE is more accurate as it uses your real intake and weight data.",
    "analytics.onTarget": "On target",
    "analytics.under": "Under",
    "analytics.over": "Over",

    // Profile
    "profile.title": "Profile",
    "profile.currentTargets": "Current Targets",
    "profile.dailyCalories": "Daily Calories",
    "profile.save": "Save & Recalculate",
    "profile.reset": "Reset",
    "profile.updated": "Profile updated — targets recalculated",
    "profile.nameRequired": "Name is required",
    "profile.howCalculated": "How targets are calculated",
    "profile.sciNote1": "BMR: Mifflin-St Jeor equation (82% accuracy)",
    "profile.sciNote2": "TDEE: BMR x Activity multiplier",
    "profile.sciNote3": "Protein: 1.6-2.4 g/kg based on goal (Morton et al. 2018)",
    "profile.sciNote4": "Fat: Min 0.6 g/kg for hormonal health (ACSM)",
    "profile.sciNote5": "Carbs: Remaining calories after P+F allocation",
    "profile.sciNote6": "Deficit/Surplus: Based on training level (Garthe et al. 2011)",

    // Settings
    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.darkMode": "Dark Mode",
    "settings.lightMode": "Light Mode",
    "settings.language": "Language",
    "settings.spanish": "Español",
    "settings.english": "English",
    "settings.account": "Account",

    // Macros
    "macro.protein": "Protein",
    "macro.carbs": "Carbs",
    "macro.fat": "Fat",
    "macro.fiber": "Fiber",
    "macro.calories": "Calories",
    "macro.proteinShort": "Protein",
    "macro.carbsShort": "Carbs",
    "macro.fatShort": "Fat",
    "macro.fiberShort": "Fiber",

    // Units
    "unit.g": "g",
    "unit.kg": "kg",
    "unit.kcal": "kcal",
    "unit.protein": "protein",
    "unit.carbs": "carbs",
    "unit.fat": "fat",
    "unit.fiber": "fiber",
    "unit.left": "left",
    "unit.remaining": "remaining",

    // Common
    "common.deficit": "Deficit",
    "common.surplus": "Surplus",
    "common.balance": "Balance",
    "common.dailyTarget": "Daily Target",
    "common.loading": "Loading...",
    "common.protein": "Protein",
    "common.carbs": "Carbs",
    "common.fat": "Fat",
    "common.fiber": "Fiber",
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

export function getActivityLabel(locale: Locale, level: string): string {
  return t(locale, `activity.${level}` as TranslationKey);
}

export function getActivityDesc(locale: Locale, level: string): string {
  return t(locale, `activity.${level}.desc` as TranslationKey);
}

export function getGoalLabel(locale: Locale, level: string): string {
  return t(locale, `goal.${level}` as TranslationKey);
}

export function getGoalDesc(locale: Locale, level: string): string {
  return t(locale, `goal.${level}.desc` as TranslationKey);
}

export function getTrainingLabel(locale: Locale, level: string): string {
  return t(locale, `training.${level}` as TranslationKey);
}

export function getMealLabel(locale: Locale, type: string): string {
  return t(locale, `meal.${type}` as TranslationKey);
}

export function getGreetingLocalized(locale: Locale): string {
  const hour = new Date().getHours();
  if (hour < 12) return t(locale, "dashboard.greeting.morning");
  if (hour < 18) return t(locale, "dashboard.greeting.afternoon");
  return t(locale, "dashboard.greeting.evening");
}
