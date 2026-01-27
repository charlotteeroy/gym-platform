export interface PassBalance {
  passId: string;
  productName: string;
  creditsRemaining: number;
  creditsTotal: number;
  expiresAt: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';
}

export interface MemberAccessSummary {
  hasActiveSubscription: boolean;
  activePasses: PassBalance[];
  totalCreditsAvailable: number;
  canCheckIn: boolean;
  accessType: 'subscription' | 'pass' | 'none';
}
