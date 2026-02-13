import { MerchantStatus } from '../enums/merchant-status.enum';

export interface Merchant {
  id: string;
  chamberId: string;
  cmMemberId?: string | null;
  
  // Business Info
  businessName: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  
  // Address
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  
  // Status
  status: MerchantStatus;
  approvedAt?: string | null;
  approvedBy?: string | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
  
  // Stripe
  stripeAccountId?: string | null;
  stripeOnboardingComplete: boolean;
  stripePayoutsEnabled: boolean;
  
  // Fulfillment
  offersLocalPickup: boolean;
  offersFlatRate: boolean;
  flatRateAmount?: number | null;
  offersStandardShipping: boolean;
  shippingNotes?: string | null;
  
  // Stats
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateMerchantInput {
  chamberId: string;
  cmMemberId?: string;
  businessName: string;
  contactEmail: string;
}

export interface UpdateMerchantInput {
  description?: string;
  logoUrl?: string;
  phone?: string;
  websiteUrl?: string;
  offersLocalPickup?: boolean;
  offersFlatRate?: boolean;
  flatRateAmount?: number;
  offersStandardShipping?: boolean;
  shippingNotes?: string;
}
