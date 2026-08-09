export interface GeneralSettings {
  appName: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutText: string;
  emailContact: string;
  phoneContact: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  tiktokUrl?: string;
  copyrightText: string;
  logoUrl?: string;
  primaryColor?: string;
  description?: string;
  termsConditions?: string;
  privacyPolicy?: string;
  shippingPolicy?: string;
  globalTc?: number;
  globalMargen?: number;
}

export const DEPARTAMENTOS = {
  "Mujer": ["Ropa", "Calzado", "Accesorios", "Joyas", "Belleza"],
  "Hombre": ["Ropa", "Calzado", "Accesorios", "Relojes", "Cuidado Personal"],
  "Niñ@s": ["Ropa de Niña", "Ropa de Niño", "Calzado", "Juguetes", "Bebés"],
  "Electrónica": ["Celulares y Accesorios", "Computadoras", "Audio", "Smartwatches", "Hogar Inteligente"],
  "Hogar y Cocina": ["Electrodomésticos", "Decoración", "Cocina", "Muebles"],
  "Salud y Deportes": ["Ejercicio", "Nutrición", "Deportes", "Cuidado Personal"]
};

export const CATEGORIAS = Object.entries(DEPARTAMENTOS).flatMap(([dep, subcats]) => 
  subcats.map(sub => `${dep} - ${sub}`)
);
CATEGORIAS.push("Otros");

export type Departamento = keyof typeof DEPARTAMENTOS;
export type Categoria = typeof CATEGORIAS[number];

export interface Producto {
  id: string;
  sku?: string;
  asin?: string;
  titulo: string;
  descripcion?: string;
  tallas?: string;
  url_original: string;
  imagen_url: string;
  imagenes?: string[];
  precio_usd: number;
  precio_cr?: number;
  peso_kg?: number;
  costo_por_kg?: number;
  envio_usa_miami?: number;
  porcentaje_garantia?: number;
  tarifa_envio_cr?: number;
  tarifa_correos_cr?: number;
  ganancia?: number;
  tipo_cambio?: number;
  categoria?: string;
  marca?: string;
  tienda_origen?: "amazon" | "ebay" | "otra";
  metodo_venta?: 'Afiliado' | 'Intermediario';
  isDailyDeal?: boolean;
  discountPercentage?: number;
  estado: "pendiente" | "publicado";
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  secondPhoneNumber?: string;
  province?: string;
  canton?: string;
  district?: string;
  exactAddress?: string;
  postalCode?: string;
  apartadoPostal?: string;
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
  razonSocial?: string;
  favorites?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Comentario {
  id: string;
  productoId: string;
  texto: string;
  autor: string;
  autorId: string;
  createdAt: any;
  rating?: number;
}
