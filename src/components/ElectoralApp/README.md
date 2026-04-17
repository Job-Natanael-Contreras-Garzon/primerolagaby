# Estructura de Componentes ElectoralApp

## 📋 Descripción

La aplicación electoral ha sido refactorizada del monolito original (`main.ts`) en una arquitectura modular y escalable basada en componentes organizados por **roles** y **responsabilidades**.

## 🏗️ Estructura

```
ElectoralApp/
├── index.ts                 ← RoleRouter (enrutador principal)
├── views/                   ← Vistas completas por rol (máx 300 líneas c/u)
│   ├── LoginView.ts
│   ├── VeedorView.ts
│   ├── LectorView.ts
│   ├── ColegioView.ts
│   ├── DistritoView.ts
│   └── AdminView.ts
├── admin/                   ← Subcomponentes atómicos del admin (máx 200 líneas c/u)
│   ├── AdminDashboard.ts
│   ├── UserManagement.ts
│   ├── DistritoManagement.ts
│   ├── RecintoManagement.ts
│   ├── MesaMonitoring.ts
│   ├── ImageGallery.ts
│   ├── SystemConfig.ts
│   └── ImportExport.ts
└── shared/                  ← Código reutilizable
    ├── types.ts             ← Tipos TypeScript globales
    ├── hooks/               ← Hooks reutilizables
    │   ├── useAuthSession.ts
    │   ├── useCatalogos.ts
    │   ├── useRealtimeChannel.ts
    │   └── index.ts
    └── utils/               ← Funciones utilidad
        ├── roleLabels.ts
        └── index.ts
```

## 🎯 Principios de Arquitectura

### 1. **RoleRouter (index.ts)**
- ✅ Máximo 50 líneas
- ✅ Solo lógica de enrutamiento por rol
- ✅ Delega la renderización a vistas específicas

### 2. **Vistas por Rol (views/)**
- ✅ Máximo 300 líneas por vista
- ✅ Responsables de toda la UI de ese rol
- ✅ No conocen la existencia de otros roles
- ✅ Importan subcomponentes según necesidad

### 3. **Subcomponentes Admin (admin/)**
- ✅ Máximo 200 líneas por archivo
- ✅ Funcionalidad especializada y **atómica**
- ✅ Props específicos (no `any` o `object`)
- ✅ Responsabilidad única

### 4. **Hooks Compartidos (shared/hooks/)**
- ✅ Lógica reutilizable entre múltiples vistas
- ✅ Encapsulan llamadas a Supabase
- ✅ Manejan estado y efectos secundarios
- ✅ Convención: `use[Nombre].ts`

### 5. **Utilidades Compartidas (shared/utils/)**
- ✅ Funciones puras sin estado
- ✅ Formatters, validadores, helpers
- ✅ Reutilizables entre roles
- ✅ Nombrado en camelCase

## 🔄 Flujo de Rendering

```
main.ts
  ↓
loadCatalogos() [Hook: useCatalogos]
  ↓
RoleRouter { route, role }
  ├─ login → LoginView
  ├─ home + veedor → VeedorView
  ├─ carrasco + lector → LectorView
  ├─ panel + colegio → ColegioView
  ├─ panel + distrito/admin → DistritoView
  └─ admin + admin → AdminView
       ├─ AdminDashboard
       ├─ UserManagement
       ├─ DistritoManagement
       └─ ... (otros subcomponentes)
```

## 📝 Convenciones de Nombrado

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Vista por rol | `[Rol]View.ts` | `AdminView.ts` |
| Subcomp. admin | `[Funcionalidad].ts` | `UserManagement.ts` |
| Hook | `use[Nombre].ts` | `useAuthSession.ts` |
| Tipo/Interfaz | PascalCase en `types.ts` | `RoleId`, `Mesa` |
| Utilidad | camelCase en `utils/` | `getRoleLabel.ts` |

## ⚡ Mejoras Introducidas

### Antes (main.ts - 3,500 líneas)
- ❌ Monolito sin separación de responsabilidades
- ❌ Lógica de múltiples roles entrelazada
- ❌ Difícil de mantener y debuguear
- ❌ Riesgo alto de breaking changes

### Después (ElectoralApp)
- ✅ Separación clara por rol y funcionalidad
- ✅ Componentes independientes y testables
- ✅ Hooks reutilizables para lógica compartida
- ✅ Escalabilidad: agregar un nuevo rol = crear un nuevo archivo
- ✅ Ciclo de desarrollo más rápido

## 🔧 Cómo Agregar Nuevos Roles

1. **Crear la vista**: `src/components/ElectoralApp/views/[Rol]View.ts`
2. **Actualizar RoleRouter**: Agregar caso en switch
3. **Importar la vista** en el RoleRouter
4. **Crear subcomponentes** en `admin/` si es complejo

## 📚 Recursos Compartidos Disponibles

### Hooks
```typescript
import { useAuthSession, useCatalogos, useRealtimeChannel } from './shared/hooks'

// Ejemplo de uso
const { isLoggedIn, role, user } = await useAuthSession()
const catalogs = await useCatalogos()
const { subscribe, unsubscribe } = useRealtimeChannel('panel', [/* listeners */])
```

### Utilidades
```typescript
import { getRoleLabel, getSupervisorDistrict, getRoleColor } from './shared/utils'

const label = getRoleLabel('admin') // → "Administrador"
const color = getRoleColor('veedor') // → "#ffc107"
```

### Tipos
```typescript
import { RoleId, Mesa, Usuario, CatalogosData } from './shared/types'
```

## 🚀 Próximos Pasos (Fases 2-6)

- [ ] **Fase 2**: Crear LoginView y extraer bindLogin()
- [ ] **Fase 3**: Extraer VeedorView, LectorView, ColegioView, DistritoView
- [ ] **Fase 4**: Extraer AdminView y sus 7 subcomponentes
- [ ] **Fase 5**: Migrar toda la lógica de binding a hooks
- [ ] **Fase 6**: Actualizar main.ts para usar RoleRouter

---

**Última actualización**: 2026-03-21  
**Responsables de la arquitectura**: Sistema Electoral
