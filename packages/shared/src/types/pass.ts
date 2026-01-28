export interface PassBalance {
  passId: string;
  productName: string;
  bonusRemaining: number;
  bonusTotal: number;
  expiresAt: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';
}

export interface MemberAccessSummary {
  hasActiveSubscription: boolean;
  activePasses: PassBalance[];
  totalBonusAvailable: number;
  canCheckIn: boolean;
  accessType: 'subscription' | 'pass' | 'none';
}
