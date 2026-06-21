import dayjs from 'dayjs';
import type { ExpireLevel, HealthLevel, ProcessStatus, AbnormalType, ProcessAction } from '@/types';

export const getExpireLevel = (daysLeft: number): ExpireLevel => {
  if (daysLeft <= 30) return '30days';
  if (daysLeft <= 60) return '60days';
  if (daysLeft <= 90) return '90days';
  return 'normal';
};

export const getExpireLevelText = (level: ExpireLevel): string => {
  const map: Record<ExpireLevel, string> = {
    '30days': '临期紧急',
    '60days': '近效预警',
    '90days': '关注提醒',
    'normal': '正常'
  };
  return map[level];
};

export const getHealthLevelText = (level: HealthLevel): string => {
  const map: Record<HealthLevel, string> = {
    green: '健康',
    yellow: '关注',
    red: '预警'
  };
  return map[level];
};

export const getStatusText = (status: ProcessStatus): string => {
  const map: Record<ProcessStatus, string> = {
    pending: '待审批',
    approved: '已批准',
    rejected: '已驳回',
    processing: '处理中',
    done: '已完成'
  };
  return map[status];
};

export const getAbnormalTypeText = (type: AbnormalType): string => {
  const map: Record<AbnormalType, string> = {
    label_blur: '标签模糊',
    box_damaged: '外盒破损',
    storage_wrong: '冷藏位置不符',
    quantity_diff: '账实不符'
  };
  return map[type];
};

export const getActionText = (action: ProcessAction): string => {
  const map: Record<ProcessAction, string> = {
    transfer: '调拨',
    promotion: '促销消耗',
    loss: '报损'
  };
  return map[action];
};

export const formatDate = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatDateTime = (date: string): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

export const calculateHealthLevel = (completionRate: number, abnormalRate: number): HealthLevel => {
  if (completionRate >= 95 && abnormalRate <= 5) return 'green';
  if (completionRate >= 80 && abnormalRate <= 15) return 'yellow';
  return 'red';
};

export const saveToOffline = (key: string, data: unknown): void => {
  try {
    const offlineData = Taro.getStorageSync('offline_queue') || {};
    offlineData[key] = {
      data,
      timestamp: Date.now()
    };
    Taro.setStorageSync('offline_queue', offlineData);
    console.log('[Offline] 数据已暂存:', key);
  } catch (error) {
    console.error('[Offline] 暂存失败:', error);
  }
};

export const getOfflineData = (key: string): unknown | null => {
  try {
    const offlineData = Taro.getStorageSync('offline_queue') || {};
    return offlineData[key]?.data || null;
  } catch (error) {
    console.error('[Offline] 读取失败:', error);
    return null;
  }
};

export const clearOfflineData = (key: string): void => {
  try {
    const offlineData = Taro.getStorageSync('offline_queue') || {};
    delete offlineData[key];
    Taro.setStorageSync('offline_queue', offlineData);
    console.log('[Offline] 数据已清除:', key);
  } catch (error) {
    console.error('[Offline] 清除失败:', error);
  }
};

export const checkNetwork = async (): Promise<boolean> => {
  try {
    const res = await Taro.getNetworkType();
    return res.networkType !== 'none';
  } catch (error) {
    console.error('[Network] 检测失败:', error);
    return false;
  }
};

export const getAllOfflineKeys = (): string[] => {
  try {
    const offlineData = Taro.getStorageSync('offline_queue') || {};
    return Object.keys(offlineData);
  } catch (error) {
    console.error('[Offline] 获取待同步列表失败:', error);
    return [];
  }
};

export const getOfflineCount = (): number => {
  return getAllOfflineKeys().length;
};

export const getAllOfflineQueue = (): Record<string, { data: unknown; timestamp: number }> => {
  try {
    return Taro.getStorageSync('offline_queue') || {};
  } catch (error) {
    console.error('[Offline] 读取队列失败:', error);
    return {};
  }
};

export const clearAllOffline = (): void => {
  try {
    Taro.setStorageSync('offline_queue', {});
    console.log('[Offline] 所有待同步数据已清空');
  } catch (error) {
    console.error('[Offline] 清空队列失败:', error);
  }
};

export const processOfflineQueue = async (
  onItem: (key: string, data: unknown) => Promise<boolean> | boolean
): Promise<{ total: number; success: number; failed: number }> => {
  const queue = getAllOfflineQueue();
  const keys = Object.keys(queue);
  let success = 0;
  let failed = 0;

  console.log(`[Offline] 开始同步 ${keys.length} 条待补传数据`);

  for (const key of keys) {
    try {
      const item = queue[key];
      const result = await onItem(key, item.data);
      if (result !== false) {
        clearOfflineData(key);
        success++;
        console.log(`[Offline] 同步成功: ${key}`);
      } else {
        failed++;
        console.log(`[Offline] 同步跳过: ${key}`);
      }
    } catch (error) {
      failed++;
      console.error(`[Offline] 同步失败: ${key}`, error);
    }
  }

  console.log(`[Offline] 同步结束，共 ${keys.length} 条，成功 ${success}，失败 ${failed}`);
  return { total: keys.length, success, failed };
};
