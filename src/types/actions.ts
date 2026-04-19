// src/types/actions.ts
// Shape uniforme de respuesta para todas las server actions.
// Discriminated union: TypeScript obliga a verificar `ok` antes de acceder a `data`.

export type ActionResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string }
