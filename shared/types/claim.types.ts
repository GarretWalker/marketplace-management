export interface ClaimRequest {
  id: string;
  chamberId: string;
  cmMemberId: string;
  requestedBy: string;
  
  // Claimant Info
  contactEmail: string;
  contactName?: string | null;
  contactPhone?: string | null;
  message?: string | null;
  
  // Resolution
  status: 'pending' | 'approved' | 'denied';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  denialReason?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimInput {
  chamberId: string;
  cmMemberId: string;
  contactEmail: string;
  contactName?: string;
  contactPhone?: string;
  message?: string;
}

export interface ApproveClaimInput {
  claimId: string;
  chamberId: string;
}

export interface DenyClaimInput {
  claimId: string;
  reason: string;
}

export interface ClaimWithMemberData extends ClaimRequest {
  memberData: {
    businessName: string;
    email?: string | null;
    phone?: string | null;
    address?: string;
    category?: string | null;
  };
}
