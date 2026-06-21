export type ExpireLevel = '30days' | '60days' | '90days' | 'normal';

export type HealthLevel = 'green' | 'yellow' | 'red';

export type AbnormalType = 'label_blur' | 'box_damaged' | 'storage_wrong' | 'quantity_diff';

export type ProcessAction = 'transfer' | 'promotion' | 'loss';

export type ProcessStatus = 'pending' | 'approved' | 'rejected' | 'processing' | 'done';

export interface BatchInfo {
  id: string;
  productName: string;
  spec: string;
  batchNo: string;
  expireDate: string;
  daysLeft: number;
  expireLevel: ExpireLevel;
  systemQty: number;
  actualQty?: number;
  location: string;
  storageType: 'refrigerated' | 'normal';
  isChecked: boolean;
  hasAbnormal: boolean;
}

export interface AbnormalReport {
  id: string;
  batchId: string;
  productName: string;
  batchNo: string;
  type: AbnormalType;
  description: string;
  photos: string[];
  reporter: string;
  reportTime: string;
  status: ProcessStatus;
  processId?: string;
  processAction?: ProcessAction;
}

export interface ProcessApplication {
  id: string;
  batchId: string;
  productName: string;
  batchNo: string;
  action: ProcessAction;
  quantity: number;
  reason: string;
  applicant: string;
  applyTime: string;
  approver?: string;
  approveTime?: string;
  status: ProcessStatus;
}

export interface StoreInspection {
  id: string;
  name: string;
  type: 'fridge' | 'shelf';
  totalBatches: number;
  checkedBatches: number;
  completionRate: number;
}

export interface StoreRanking {
  id: string;
  storeName: string;
  healthLevel: HealthLevel;
  completionRate: number;
  abnormalCount: number;
  pendingCount: number;
  score: number;
  rank: number;
}

export interface DailyStats {
  totalBatches: number;
  checkedBatches: number;
  pendingBatches: number;
  abnormalBatches: number;
  expire30Days: number;
  expire60Days: number;
  expire90Days: number;
}
