export interface Chamber {
  id: string;
  name: string;
  slug: string;
  
  // ChamberMaster Integration
  chambermasterAssociationId?: string | null;
  chambermasterApiKey?: string | null;
  chambermasterBaseUrl?: string | null;
  chambermasterLastSyncAt?: string | null;
  chambermasterSyncEnabled: boolean;
  
  // Branding
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  tagline?: string | null;
  
  // Contact
  websiteUrl?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  
  // Platform
  isActive: boolean;
  launchedAt?: string | null;
  productThreshold: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateChamberInput {
  name: string;
  slug: string;
  contactEmail?: string;
  city?: string;
  state?: string;
}

export interface UpdateChamberInput {
  name?: string;
  tagline?: string;
  primaryColor?: string;
  accentColor?: string;
  websiteUrl?: string;
  contactEmail?: string;
  phone?: string;
}
