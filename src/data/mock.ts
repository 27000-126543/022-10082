import type { BatchInfo, AbnormalReport, ProcessApplication, StoreInspection, StoreRanking, DailyStats } from '@/types';
import dayjs from 'dayjs';

export const mockBatches: BatchInfo[] = [
  {
    id: 'B001',
    productName: '乔雅登雅致玻尿酸',
    spec: '0.8ml/支',
    batchNo: 'JY2024031501',
    expireDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    daysLeft: 15,
    expireLevel: '30days',
    systemQty: 20,
    actualQty: 18,
    location: '冷藏柜A-01',
    storageType: 'refrigerated',
    isChecked: true,
    hasAbnormal: true
  },
  {
    id: 'B002',
    productName: '乔雅登极致玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'JY2024022003',
    expireDate: dayjs().add(25, 'day').format('YYYY-MM-DD'),
    daysLeft: 25,
    expireLevel: '30days',
    systemQty: 15,
    location: '冷藏柜A-02',
    storageType: 'refrigerated',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B003',
    productName: '瑞蓝2号玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'RL2024011002',
    expireDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
    daysLeft: 45,
    expireLevel: '60days',
    systemQty: 30,
    actualQty: 30,
    location: '冷藏柜A-01',
    storageType: 'refrigerated',
    isChecked: true,
    hasAbnormal: false
  },
  {
    id: 'B004',
    productName: '瑞蓝3号玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'RL2024020501',
    expireDate: dayjs().add(55, 'day').format('YYYY-MM-DD'),
    daysLeft: 55,
    expireLevel: '60days',
    systemQty: 25,
    location: '冷藏柜B-01',
    storageType: 'refrigerated',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B005',
    productName: '艾莉薇玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'AL2024030102',
    expireDate: dayjs().add(75, 'day').format('YYYY-MM-DD'),
    daysLeft: 75,
    expireLevel: '90days',
    systemQty: 18,
    actualQty: 18,
    location: '冷藏柜B-02',
    storageType: 'refrigerated',
    isChecked: true,
    hasAbnormal: false
  },
  {
    id: 'B006',
    productName: '艾莉薇风尚玻尿酸',
    spec: '1.1ml/支',
    batchNo: 'AL2024012004',
    expireDate: dayjs().add(85, 'day').format('YYYY-MM-DD'),
    daysLeft: 85,
    expireLevel: '90days',
    systemQty: 22,
    location: '冷藏柜A-03',
    storageType: 'refrigerated',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B007',
    productName: '伊婉C玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'YW2024040101',
    expireDate: dayjs().add(120, 'day').format('YYYY-MM-DD'),
    daysLeft: 120,
    expireLevel: 'normal',
    systemQty: 40,
    location: '货架C-01',
    storageType: 'normal',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B008',
    productName: '伊婉V玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'YW2024031503',
    expireDate: dayjs().add(150, 'day').format('YYYY-MM-DD'),
    daysLeft: 150,
    expireLevel: 'normal',
    systemQty: 35,
    location: '货架C-02',
    storageType: 'normal',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B009',
    productName: '海薇玻尿酸',
    spec: '1.0ml/支',
    batchNo: 'HW2024021002',
    expireDate: dayjs().add(200, 'day').format('YYYY-MM-DD'),
    daysLeft: 200,
    expireLevel: 'normal',
    systemQty: 50,
    location: '货架C-03',
    storageType: 'normal',
    isChecked: false,
    hasAbnormal: false
  },
  {
    id: 'B010',
    productName: '润百颜玻尿酸',
    spec: '1.5ml/支',
    batchNo: 'RB2024032001',
    expireDate: dayjs().add(8, 'day').format('YYYY-MM-DD'),
    daysLeft: 8,
    expireLevel: '30days',
    systemQty: 10,
    location: '冷藏柜A-04',
    storageType: 'refrigerated',
    isChecked: false,
    hasAbnormal: false
  }
];

export const mockAbnormalReports: AbnormalReport[] = [
  {
    id: 'R001',
    batchId: 'B001',
    productName: '乔雅登雅致玻尿酸',
    batchNo: 'JY2024031501',
    type: 'quantity_diff',
    description: '系统记录20支，实际盘点18支，缺少2支',
    photos: [
      'https://picsum.photos/id/26/300/300',
      'https://picsum.photos/id/28/300/300'
    ],
    reporter: '张护士',
    reportTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'pending'
  },
  {
    id: 'R002',
    batchId: 'B003',
    productName: '瑞蓝2号玻尿酸',
    batchNo: 'RL2024011002',
    type: 'box_damaged',
    description: '外盒有压痕，3支包装破损',
    photos: [
      'https://picsum.photos/id/30/300/300'
    ],
    reporter: '李护士',
    reportTime: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'processing'
  },
  {
    id: 'R003',
    batchId: 'B005',
    productName: '艾莉薇玻尿酸',
    batchNo: 'AL2024030102',
    type: 'label_blur',
    description: '部分批号标签印刷模糊，难以辨认',
    photos: [
      'https://picsum.photos/id/32/300/300'
    ],
    reporter: '王护士',
    reportTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    status: 'approved'
  }
];

export const mockProcessApplications: ProcessApplication[] = [
  {
    id: 'P001',
    batchId: 'B001',
    productName: '乔雅登雅致玻尿酸',
    batchNo: 'JY2024031501',
    action: 'promotion',
    quantity: 18,
    reason: '剩余15天到期，建议促销消耗',
    applicant: '张护士',
    applyTime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'pending'
  },
  {
    id: 'P002',
    batchId: 'B002',
    productName: '乔雅登极致玻尿酸',
    batchNo: 'JY2024022003',
    action: 'transfer',
    quantity: 10,
    reason: '本店库存充足，调拨至朝阳门店',
    applicant: '李护士',
    applyTime: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    approver: '王护士长',
    approveTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    status: 'approved'
  },
  {
    id: 'P003',
    batchId: 'B010',
    productName: '润百颜玻尿酸',
    batchNo: 'RB2024032001',
    action: 'loss',
    quantity: 3,
    reason: '外盒破损严重，无法使用',
    applicant: '赵护士',
    applyTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    approver: '王护士长',
    approveTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    status: 'done'
  }
];

export const mockStoreInspections: StoreInspection[] = [
  {
    id: 'S001',
    name: '冷藏柜A',
    type: 'fridge',
    totalBatches: 15,
    checkedBatches: 12,
    completionRate: 80
  },
  {
    id: 'S002',
    name: '冷藏柜B',
    type: 'fridge',
    totalBatches: 10,
    checkedBatches: 10,
    completionRate: 100
  },
  {
    id: 'S003',
    name: '货架C',
    type: 'shelf',
    totalBatches: 20,
    checkedBatches: 15,
    completionRate: 75
  },
  {
    id: 'S004',
    name: '货架D',
    type: 'shelf',
    totalBatches: 8,
    checkedBatches: 8,
    completionRate: 100
  }
];

export const mockStoreRankings: StoreRanking[] = [
  {
    id: 'ST001',
    storeName: '旗舰店（国贸店）',
    healthLevel: 'green',
    completionRate: 98,
    abnormalCount: 1,
    pendingCount: 0,
    score: 98,
    rank: 1
  },
  {
    id: 'ST002',
    storeName: '朝阳门店',
    healthLevel: 'green',
    completionRate: 95,
    abnormalCount: 2,
    pendingCount: 1,
    score: 94,
    rank: 2
  },
  {
    id: 'ST003',
    storeName: '海淀门店',
    healthLevel: 'yellow',
    completionRate: 85,
    abnormalCount: 4,
    pendingCount: 2,
    score: 82,
    rank: 3
  },
  {
    id: 'ST004',
    storeName: '西城门店',
    healthLevel: 'yellow',
    completionRate: 82,
    abnormalCount: 5,
    pendingCount: 3,
    score: 78,
    rank: 4
  },
  {
    id: 'ST005',
    storeName: '丰台门店',
    healthLevel: 'red',
    completionRate: 65,
    abnormalCount: 8,
    pendingCount: 5,
    score: 60,
    rank: 5
  }
];

export const mockDailyStats: DailyStats = {
  totalBatches: 53,
  checkedBatches: 31,
  pendingBatches: 22,
  abnormalBatches: 3,
  expire30Days: 3,
  expire60Days: 2,
  expire90Days: 2
};
