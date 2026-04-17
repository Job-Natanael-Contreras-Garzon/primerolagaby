# Rules — Refactor de componente monolítico por roles

## Contexto
El archivo objetivo tiene más de 3000 líneas en un solo componente React/Vue/Angular.
El objetivo es descomponerlo en vistas por rol y subcomponentes atómicos para el rol admin.

---

## Regla 1 — Análisis antes de tocar código
Antes de modificar cualquier archivo:
1. Leer el componente completo e identificar bloques lógicos por rol (admin, supervisor, usuario, etc.).
2. Listar los props, estados locales, hooks y funciones que usa cada bloque.
3. Identificar código compartido entre roles (utilidades, helpers, tipos).
4. Presentar el plan de división como lista antes de ejecutar cambios.

---

## Regla 2 — Estructura de carpetas obligatoria
Crear la siguiente estructura antes de mover código:
```
src/
  components/
    [NombreComponente]/
      index.tsx                  ← RoleRouter: enruta según rol
      views/
        AdminView.tsx            ← Vista completa del admin general
        SupervisorView.tsx
        UserView.tsx
        [OtroRol]View.tsx
      admin/                     ← Subcomponentes atómicos del admin
        UserManagement.tsx
        RolePermissions.tsx
        AuditLog.tsx
        Dashboard.tsx
        [OtroModulo].tsx
      shared/                    ← Código compartido entre roles
        types.ts
        hooks/
        utils/
```

---

## Regla 3 — RoleRouter primero
El `index.tsx` SOLO debe:
- Recibir el prop `role` (o leerlo del contexto/store).
- Hacer un switch/map de rol → componente view.
- No contener lógica de negocio ni JSX de UI directamente.
```tsx
// index.tsx — ejemplo mínimo
const views = {
  admin: AdminView,
  supervisor: SupervisorView,
  user: UserView,
};

export default function ComponentName({ role }: Props) {
  const View = views[role] ?? null;
  return View ? <View /> : null;
}
```

---

## Regla 4 — Vistas por rol: responsabilidad única
Cada `*View.tsx`:
- Solo renderiza lo que ese rol puede ver/hacer.
- No conoce la existencia de otros roles.
- Importa subcomponentes desde `../shared/` o `../admin/` según corresponda.
- Máximo 300 líneas. Si supera eso, extraer subcomponentes.

---

## Regla 5 — Subcomponentes admin: control atómico
Dentro de `admin/`, cada archivo:
- Representa una sola funcionalidad (usuarios, roles, logs, etc.).
- Recibe solo los props que necesita (no pasar el estado global completo).
- Tiene su propio estado local si la lógica no se comparte.
- Nombrar con sufijo descriptivo: `UserManagement`, `RolePermissions`, `AuditLog`.

---

## Regla 6 — Sin duplicación de lógica
- Si dos roles usan la misma función → moverla a `shared/utils/`.
- Si dos roles usan el mismo hook → moverlo a `shared/hooks/`.
- Si dos roles comparten tipos → definirlos en `shared/types.ts`.
- Prohibido copiar y pegar código entre vistas.

---

## Regla 7 — Migración incremental, sin romper
- Extraer un bloque a la vez, no todo en un paso.
- Después de cada extracción, verificar que el componente original sigue funcionando
  importando el nuevo archivo en su lugar.
- No eliminar código del monolito hasta confirmar que el nuevo archivo es funcional.
- Mantener las mismas firmas de props/eventos para no romper componentes padre.

---

## Regla 8 — Convenciones de nombrado
| Tipo              | Convención                      | Ejemplo                    |
|-------------------|---------------------------------|----------------------------|
| Vista por rol     | `[Rol]View.tsx`                 | `AdminView.tsx`            |
| Subcomp. admin    | `[Funcionalidad].tsx`           | `UserManagement.tsx`       |
| Hook compartido   | `use[Nombre].ts`                | `usePermissions.ts`        |
| Tipo/interfaz     | PascalCase en `types.ts`        | `UserRole`, `AdminProps`   |
| Util/helper       | camelCase en `utils/`           | `formatRoleLabel.ts`       |

---

## Regla 9 — Tamaño máximo por archivo
- `index.tsx` (RoleRouter): máximo 50 líneas.
- `*View.tsx`: máximo 300 líneas.
- Subcomponentes `admin/*`: máximo 200 líneas.
- Si se supera el límite → extraer subcomponente o hook.

---

## Regla 10 — No inventar props ni lógica
- Usar exactamente los tipos y props que ya existen en el componente original.
- No agregar nuevas funcionalidades durante el refactor.
- Si se detecta lógica confusa o duplicada, señalarla en un comentario `// TODO:` pero no refactorizarla en este paso.