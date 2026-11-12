// Los 7 tipos de negocio de SiuMax Nego (visión en siumax/TIPOS-DE-NEGOCIO.md, listas aprobadas por el dueño el 12/11/2026).
// Se construyen como 4 partes: Comercio · Talleres y servicios · Restaurantes · Agenda y reservas (citas, membresías,
// alquileres y hospedaje usan el mismo calendario). Un negocio puede elegir varios tipos (Ajustes → Tipo de negocio).
// `disponible`: ya tiene sus secciones en Nego; los demás salen como "Próximamente" y no se pueden elegir.

export type IdTipoNegocio = 'comercio' | 'restaurantes' | 'servicios' | 'citas' | 'membresias' | 'alquileres' | 'hospedaje';

export interface TipoNegocio {
  id: IdTipoNegocio;
  numero: number;
  nombre: string;
  queHace: string;
  negocios: string[];
  parte: string;          // de las 4 partes que se construyen
  disponible: boolean;
  nota?: string;          // aviso cuando todavía no se puede elegir
}

export const TIPOS_NEGOCIO: TipoNegocio[] = [
  {
    id: 'comercio', numero: 1, nombre: 'Comercio', parte: 'Comercio', disponible: true,
    queHace: 'Compra mercadería y la vende.',
    negocios: [
      'Bodega, minimarket, abarrotes, market, puesto de mercado',
      'Panadería, pastelería en mostrador, licorería, distribuidora de bebidas, frutería, carnicería, pollería en crudo',
      'Farmacia, botica, perfumería, cosméticos, naturista',
      'Ferretería, materiales de construcción, pinturas, eléctricos, gasfitería, vidriería',
      'Librería, bazar, juguetería, regalos, celulares y accesorios, ropa, zapatería, mascotas, agropecuaria, repuestos de autos y motos',
      'Venta a empresas: mayoristas, distribuidoras y cualquiera que venda con RUC, cotizaciones, factura y crédito',
    ],
  },
  {
    id: 'restaurantes', numero: 2, nombre: 'Restaurantes', parte: 'Restaurantes', disponible: false,
    queHace: 'Prepara y sirve comida: mesas, comandas a cocina, carta y recetas.',
    negocios: [
      'Restaurante, menú del día, pollería, chifa, cevichería, pizzería, hamburguesería, parrilla',
      'Cafetería, juguería, heladería, panadería con mesas',
      'Bar, karaoke, discoteca',
      'Comida para llevar o delivery, food truck, cocina solo para delivery',
    ],
  },
  {
    id: 'servicios', numero: 3, nombre: 'Talleres y servicios', parte: 'Talleres y servicios', disponible: false,
    nota: 'Se está trayendo desde SiuMax Servic.',
    queHace: 'Recibe algo o sale a trabajar y lo entrega; la orden pasa por estados (recibido → en proceso → listo → entregado).',
    negocios: [
      'Taller mecánico, mototaller, llantería, lavado de autos',
      'Servicio técnico de celulares, computadoras y electrodomésticos',
      'Lavandería, sastrería y costura, zapatería de reparación, relojería',
      'Imprenta, gráfica, carpintería y metalmecánica a pedido, óptica',
      'Trabajo de campo: mantenimiento de riego y piscinas, instalaciones (materiales a la obra, herramientas que vuelven, vehículos con SOAT, cobro por período)',
    ],
  },
  {
    id: 'citas', numero: 4, nombre: 'Servicios con citas', parte: 'Agenda y reservas', disponible: false,
    queHace: 'Atiende a una persona a una hora: agenda con horarios y profesional asignado.',
    negocios: [
      'Peluquería, barbería, salón de belleza, uñas, spa, masajes',
      'Consultorio médico, dental, psicología, nutrición, fisioterapia',
      'Veterinaria (consultas), estudio de tatuajes, estudio de fotografía',
      'Abogados, contadores y otros asesores',
    ],
  },
  {
    id: 'membresias', numero: 5, nombre: 'Membresías y mensualidades', parte: 'Agenda y reservas', disponible: false,
    queHace: 'Cobra cada mes: alumnos o socios, pagos mensuales, vencimientos y asistencia.',
    negocios: [
      'Gimnasio, crossfit, artes marciales, piscina',
      'Academias de danza, música, idiomas o preuniversitarias, escuela de fútbol',
      'Nido, colegio pequeño (pensiones), talleres de vacaciones',
      'Cochera mensual, internet o cable de barrio, asociaciones y clubes',
    ],
  },
  {
    id: 'alquileres', numero: 6, nombre: 'Alquileres por tiempo', parte: 'Agenda y reservas', disponible: false,
    queHace: 'Alquila algo por horas o días: disponibilidad, reservas, devolución y garantía.',
    negocios: [
      'Canchas de fútbol o vóley, billar, consolas de videojuegos',
      'Alquiler de herramientas, maquinaria y andamios',
      'Trajes, vestidos y disfraces; sillas, mesas y toldos para eventos',
      'Bicicletas, motos y autos; salones de eventos; cochera por hora',
    ],
  },
  {
    id: 'hospedaje', numero: 7, nombre: 'Hospedaje', parte: 'Agenda y reservas', disponible: false,
    queHace: 'La gente duerme ahí: habitaciones, entrada y salida, noches y huéspedes.',
    negocios: [
      'Hotel, hostal, hospedaje, albergue',
      'Casa de playa o de campo, departamentos por día',
      'Glamping, camping, bungalows',
    ],
  },
];

// Los tipos guardados en empresa_config.tipos_negocio (si no hay nada guardado, es Comercio)
export const leerTiposNegocio = (valor: unknown): IdTipoNegocio[] => {
  const ids = new Set(TIPOS_NEGOCIO.map((t) => t.id));
  const lista = Array.isArray(valor) ? valor.filter((v): v is IdTipoNegocio => ids.has(v as IdTipoNegocio)) : [];
  return lista.length ? lista : ['comercio'];
};
