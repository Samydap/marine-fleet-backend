import { normalizarNombre } from '../../../../modules/criminales/domain/services/normalizador-nombre';

/**
 * Datos de prueba del universo One Piece. Separados del script del seed para
 * que agregar un criminal sea tocar una lista, no la logica de insercion.
 *
 * Los ids son legibles a proposito (`c-luffy`, `b-loguetown`): facilitan probar
 * la API a mano desde Swagger o Postman.
 */
export const MARES = [
  { id: 'm-east-blue', nombre: 'East Blue', tipo: 'CUATRO_MARES' },
  { id: 'm-west-blue', nombre: 'West Blue', tipo: 'CUATRO_MARES' },
  { id: 'm-north-blue', nombre: 'North Blue', tipo: 'CUATRO_MARES' },
  { id: 'm-south-blue', nombre: 'South Blue', tipo: 'CUATRO_MARES' },
  { id: 'm-grand-line', nombre: 'Grand Line', tipo: 'GRAND_LINE' },
] as const;

export const ZONAS = [
  { id: 'z-foosha', marId: 'm-east-blue', nombre: 'Villa Foosha', descripcion: 'Isla Dawn' },
  { id: 'z-loguetown', marId: 'm-east-blue', nombre: 'Loguetown', descripcion: 'Ciudad del principio y del fin' },
  { id: 'z-shells', marId: 'm-east-blue', nombre: 'Shells Town', descripcion: 'Sede de la Base 153' },
  { id: 'z-cocoyasi', marId: 'm-east-blue', nombre: 'Villa Cocoyasi', descripcion: 'Isla Conomi' },
  { id: 'z-ohara', marId: 'm-west-blue', nombre: 'Ohara', descripcion: 'Isla de los arqueologos' },
  { id: 'z-flevance', marId: 'm-north-blue', nombre: 'Flevance', descripcion: 'El pueblo blanco' },
  { id: 'z-baterilla', marId: 'm-south-blue', nombre: 'Baterilla', descripcion: null },
  { id: 'z-alabasta', marId: 'm-grand-line', nombre: 'Alabasta', descripcion: 'Reino del desierto' },
  { id: 'z-sabaody', marId: 'm-grand-line', nombre: 'Archipielago Sabaody', descripcion: 'Antesala del Nuevo Mundo' },
  { id: 'z-marineford', marId: 'm-grand-line', nombre: 'Marineford', descripcion: 'Cuartel General de la Marina' },
  { id: 'z-water7', marId: 'm-grand-line', nombre: 'Water 7', descripcion: 'Ciudad de los astilleros' },
  { id: 'z-dressrosa', marId: 'm-grand-line', nombre: 'Dressrosa', descripcion: 'Nuevo Mundo' },
  { id: 'z-wano', marId: 'm-grand-line', nombre: 'Wano', descripcion: 'Nuevo Mundo' },
] as const;

export const BASES = [
  { id: 'b-153', nombre: 'Base 153', zonaId: 'z-shells', ubicacion: 'Shells Town, East Blue', comandante: 'Capitan Ripper' },
  { id: 'b-loguetown', nombre: 'Base de Loguetown', zonaId: 'z-loguetown', ubicacion: 'Loguetown, East Blue', comandante: 'Capitan Smoker' },
  { id: 'b-16', nombre: 'Base 16', zonaId: 'z-alabasta', ubicacion: 'Nanohana, Alabasta', comandante: 'Capitana Hina' },
  { id: 'b-g1', nombre: 'Base G-1', zonaId: 'z-sabaody', ubicacion: 'Archipielago Sabaody', comandante: 'Vicealmirante Momonga' },
  { id: 'b-marineford', nombre: 'Cuartel General', zonaId: 'z-marineford', ubicacion: 'Marineford', comandante: 'Almirante de Flota Sengoku' },
  { id: 'b-g5', nombre: 'Base G-5', zonaId: 'z-dressrosa', ubicacion: 'Nuevo Mundo', comandante: 'Vicealmirante Vergo' },
] as const;

export const ORGANIZACIONES = [
  { id: 'org-sombrero-paja', nombre: 'Piratas del Sombrero de Paja', tipo: 'TRIPULACION', categoria: 'PIRATA', zonaId: 'z-wano', descripcion: 'Tripulacion liderada por Monkey D. Luffy' },
  { id: 'org-barbanegra', nombre: 'Piratas de Barbanegra', tipo: 'TRIPULACION', categoria: 'PIRATA', zonaId: 'z-sabaody', descripcion: null },
  { id: 'org-buggy', nombre: 'Piratas de Buggy', tipo: 'TRIPULACION', categoria: 'PIRATA', zonaId: 'z-foosha', descripcion: null },
  { id: 'org-arlong', nombre: 'Piratas de Arlong', tipo: 'BANDA', categoria: 'PIRATA', zonaId: 'z-cocoyasi', descripcion: 'Banda de hombres pez' },
  { id: 'org-revolucionario', nombre: 'Ejercito Revolucionario', tipo: 'ORGANIZACION', categoria: 'REVOLUCIONARIO', zonaId: null, descripcion: 'Organizacion politica opuesta al Gobierno Mundial' },
  { id: 'org-baroque', nombre: 'Baroque Works', tipo: 'ORGANIZACION', categoria: 'CRIMINAL_INDEPENDIENTE', zonaId: 'z-alabasta', descripcion: 'Sindicato criminal secreto' },
  { id: 'org-donquixote', nombre: 'Familia Donquixote', tipo: 'ORGANIZACION', categoria: 'CRIMINAL_INDEPENDIENTE', zonaId: 'z-dressrosa', descripcion: 'Red de trafico de armas' },
] as const;

interface CriminalSemilla {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  alias: string[];
  edad: number | null;
  descripcion: string | null;
  estado: 'ACTIVO' | 'CAPTURADO' | 'MUERTO';
  zonaId: string;
  recompensa: number | null;
  baseOrigen: string | null;
  organizacionId: string | null;
  rolOrganizacion: 'LIDER' | 'OFICIAL' | 'MIEMBRO';
}

const criminal = (c: Omit<CriminalSemilla, 'nombreNormalizado'>): CriminalSemilla => ({
  ...c,
  nombreNormalizado: normalizarNombre(c.nombre),
});

export const CRIMINALES: CriminalSemilla[] = [
  criminal({ id: 'c-luffy', nombre: 'Monkey D. Luffy', alias: ['Sombrero de Paja', 'Quinto Emperador'], edad: 19, descripcion: 'Sombrero de paja, cicatriz bajo el ojo izquierdo', estado: 'ACTIVO', zonaId: 'z-wano', recompensa: 3_000_000_000, baseOrigen: 'b-loguetown', organizacionId: 'org-sombrero-paja', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-zoro', nombre: 'Roronoa Zoro', alias: ['Cazador de Piratas'], edad: 21, descripcion: 'Cabello verde, tres espadas', estado: 'ACTIVO', zonaId: 'z-wano', recompensa: 1_111_000_000, baseOrigen: 'b-153', organizacionId: 'org-sombrero-paja', rolOrganizacion: 'OFICIAL' }),
  criminal({ id: 'c-nami', nombre: 'Nami', alias: ['Gata Ladrona'], edad: 20, descripcion: 'Cabello naranja, tatuaje en el brazo', estado: 'ACTIVO', zonaId: 'z-cocoyasi', recompensa: 66_000_000, baseOrigen: null, organizacionId: 'org-sombrero-paja', rolOrganizacion: 'MIEMBRO' }),
  criminal({ id: 'c-usopp', nombre: 'Usopp', alias: ['Dios Usopp', 'Sogeking'], edad: 19, descripcion: 'Nariz larga', estado: 'ACTIVO', zonaId: 'z-water7', recompensa: 500_000_000, baseOrigen: null, organizacionId: 'org-sombrero-paja', rolOrganizacion: 'MIEMBRO' }),
  criminal({ id: 'c-sabo', nombre: 'Sabo', alias: ['Jefe del Estado Mayor'], edad: 22, descripcion: 'Sombrero de copa, cicatriz de quemadura', estado: 'ACTIVO', zonaId: 'z-baterilla', recompensa: 602_000_000, baseOrigen: null, organizacionId: 'org-revolucionario', rolOrganizacion: 'OFICIAL' }),
  criminal({ id: 'c-dragon', nombre: 'Monkey D. Dragon', alias: ['El Revolucionario'], edad: 55, descripcion: 'Tatuaje rojo en el rostro', estado: 'ACTIVO', zonaId: 'z-flevance', recompensa: null, baseOrigen: null, organizacionId: 'org-revolucionario', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-crocodile', nombre: 'Sir Crocodile', alias: ['Mr. 0'], edad: 46, descripcion: 'Garfio dorado, cicatriz en el rostro', estado: 'ACTIVO', zonaId: 'z-alabasta', recompensa: 1_965_000_000, baseOrigen: 'b-16', organizacionId: 'org-baroque', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-mr3', nombre: 'Galdino', alias: ['Mr. 3'], edad: 31, descripcion: 'Peinado en forma de 3', estado: 'ACTIVO', zonaId: 'z-ohara', recompensa: 24_000_000, baseOrigen: 'b-16', organizacionId: 'org-baroque', rolOrganizacion: 'MIEMBRO' }),
  criminal({ id: 'c-teach', nombre: 'Marshall D. Teach', alias: ['Barbanegra'], edad: 40, descripcion: 'Barba negra, falta de dientes', estado: 'ACTIVO', zonaId: 'z-sabaody', recompensa: 3_996_000_000, baseOrigen: 'b-g1', organizacionId: 'org-barbanegra', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-doflamingo', nombre: 'Donquixote Doflamingo', alias: ['Joker', 'Demonio Celestial'], edad: 41, descripcion: 'Abrigo de plumas rosado, gafas', estado: 'CAPTURADO', zonaId: 'z-dressrosa', recompensa: 340_000_000, baseOrigen: 'b-g5', organizacionId: 'org-donquixote', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-buggy', nombre: 'Buggy', alias: ['El Payaso', 'Buggy el Genial'], edad: 39, descripcion: 'Nariz roja de payaso', estado: 'ACTIVO', zonaId: 'z-foosha', recompensa: 15_000_000, baseOrigen: 'b-153', organizacionId: 'org-buggy', rolOrganizacion: 'LIDER' }),
  criminal({ id: 'c-arlong', nombre: 'Arlong', alias: ['Arlong el Sierra'], edad: 41, descripcion: 'Hombre pez, nariz de sierra', estado: 'CAPTURADO', zonaId: 'z-cocoyasi', recompensa: 20_000_000, baseOrigen: 'b-153', organizacionId: 'org-arlong', rolOrganizacion: 'LIDER' }),
];

/** Historial de recompensas (HISTORICA) y una solicitud pendiente de firma del Almirante. */
export const RECOMPENSAS_EXTRA = [
  { id: 'rc-luffy-1', criminalId: 'c-luffy', monto: 30_000_000, estado: 'HISTORICA', requiereValidacion: false, desde: new Date('2024-01-10T00:00:00Z'), hasta: new Date('2024-06-01T00:00:00Z'), motivo: 'Derroto a Arlong en East Blue' },
  { id: 'rc-luffy-2', criminalId: 'c-luffy', monto: 1_500_000_000, estado: 'HISTORICA', requiereValidacion: true, desde: new Date('2024-06-01T00:00:00Z'), hasta: new Date('2025-01-01T00:00:00Z'), motivo: 'Incidente de Whole Cake' },
  { id: 'rc-sabo-pend', criminalId: 'c-sabo', monto: 1_200_000_000, estado: 'PENDIENTE_VALIDACION', requiereValidacion: true, desde: null, hasta: null, motivo: 'Incidente de Mary Geoise: requiere firma del Almirante' },
];

export const ANTECEDENTES = [
  { id: 'a-luffy-1', criminalId: 'c-luffy', tipoDelito: 'Ataque a un Noble Mundial', descripcion: 'Golpeo a Saint Charlos en Sabaody', fecha: new Date('2024-08-15T00:00:00Z'), ubicacion: 'Archipielago Sabaody' },
  { id: 'a-luffy-2', criminalId: 'c-luffy', tipoDelito: 'Invasion de instalacion gubernamental', descripcion: 'Irrumpio en Impel Down y Marineford', fecha: new Date('2024-09-01T00:00:00Z'), ubicacion: 'Marineford' },
  { id: 'a-crocodile-1', criminalId: 'c-crocodile', tipoDelito: 'Intento de golpe de Estado', descripcion: 'Planeo derrocar al Reino de Alabasta', fecha: new Date('2024-05-01T00:00:00Z'), ubicacion: 'Alabasta' },
  { id: 'a-doflamingo-1', criminalId: 'c-doflamingo', tipoDelito: 'Trafico de armas', descripcion: 'Red de comercio de frutas artificiales SMILE', fecha: new Date('2025-02-01T00:00:00Z'), ubicacion: 'Dressrosa' },
];

export const AVISTAMIENTOS = [
  { id: 'av-1', criminalId: 'c-luffy', fecha: new Date('2026-10-20T14:30:00Z'), ubicacion: 'Costa este de Wano', testigo: 'Patrulla G-5', zonaId: 'z-wano', estado: 'VERIFICADO' },
  { id: 'av-2', criminalId: 'c-teach', fecha: new Date('2026-10-28T09:00:00Z'), ubicacion: 'Grove 41, Sabaody', testigo: 'Comerciante local', zonaId: 'z-sabaody', estado: 'PENDIENTE' },
  { id: 'av-3', criminalId: 'c-buggy', fecha: new Date('2026-11-02T18:15:00Z'), ubicacion: 'Puerto de Villa Foosha', testigo: 'Alcalde Woop Slap', zonaId: 'z-foosha', estado: 'VERIFICADO' },
];

export const REPORTES = [
  { id: 'rep-1', criminalId: 'c-zoro', descripcion: 'Un espadachin de cabello verde pregunto como llegar al puerto... tres veces.', fecha: new Date('2026-11-05T11:00:00Z'), ubicacion: 'Mercado de Loguetown', zonaId: 'z-loguetown', informante: { nombre: 'Vendedor de frutas', anonimo: false } },
  { id: 'rep-2', criminalId: 'c-mr3', descripcion: 'Vi esculturas de cera sospechosas en la plaza.', fecha: new Date('2026-11-07T16:00:00Z'), ubicacion: 'Nanohana', zonaId: 'z-alabasta', informante: { anonimo: true } },
];
