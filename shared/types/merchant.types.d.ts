import { MerchantStatus } from '../enums/merchant-status.enum';
export interface Merchant {
    id: string;
    chamberId: string;
    cmMemberId?: string | null;
    businessName: string;
    slug: string;
    description?: string | null;
    logoUrl?: string | null;
    coverImageUrl?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    websiteUrl?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    status: MerchantStatus;
    approvedAt?: string | null;
    approvedBy?: string | null;
    deactivatedAt?: string | null;
    deactivationReason?: string | null;
    stripeAccountId?: string | null;
    stripeOnboardingComplete: boolean;
    stripePayoutsEnabled: boolean;
    offersLocalPickup: boolean;
    offersFlatRate: boolean;
    flatRateAmount?: number | null;
    offersStandardShipping: boolean;
    shippingNotes?: string | null;
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
//# sourceMappingURL=merchant.types.d.ts.map