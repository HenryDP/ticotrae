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
}

export const CATEGORIAS = [
  "Electrónica",
  "Computación",
  "Hogar y Cocina",
  "Ropa y Accesorios",
  "Salud y Belleza",
  "Juguetes",
  "Deportes",
  "Herramientas",
  "Otros"
] as const;

export type Categoria = typeof CATEGORIAS[number];

export interface Producto {
  id: string;
  sku?: string;
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
  categoria?: string;
  marca?: string;
  tienda_origen?: "amazon" | "ebay" | "otra";
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
  province?: string;
  canton?: string;
  district?: string;
  exactAddress?: string;
  postalCode?: string;
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
