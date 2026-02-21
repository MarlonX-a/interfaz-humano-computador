// ─────────────────────────────────────────────────────────────
// Barrel re-export: todos los tipos separados en archivos individuales
// ─────────────────────────────────────────────────────────────
// Este archivo re-exporta todos los tipos para mantener compatibilidad
// con los imports existentes (from 'types/db').
//
// Archivos individuales:
//   media.ts      – MediaFile, ContentSlide
//   leccion.ts    – Leccion, LeccionInsert, LeccionUpdate
//   contenido.ts  – Contenido, ContenidoLeccion, ContenidoInsert, ContenidoUpdate
//   modelo.ts     – ModeloRA, ContenidoModelo y sus tipos CRUD
//   prueba.ts     – Prueba, Pregunta, Respuesta, ResultadoPrueba y compuestos
//   seccion.ts    – LeccionSeccion, ProgresoSeccion y compuestos
//   progreso.ts   – Progreso, ProgresoConLeccion
//   users.ts      – Profile, UserWithProfile, UserFilters, UserCreateInput, UserUpdateInput
//   dashboard.ts  – DashboardStats, RecentActivity, SystemTrends, PerformanceOverview
//   composites.ts – LeccionCompleta, ContenidoConLecciones, ContenidoLeccionConLeccion
// ─────────────────────────────────────────────────────────────

export * from './media';
export * from './leccion';
export * from './contenido';
export * from './modelo';
export * from './prueba';
export * from './seccion';
export * from './progreso';
export * from './users';
export * from './dashboard';
export * from './composites';