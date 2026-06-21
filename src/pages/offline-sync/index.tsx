import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import type { AbnormalReport, ProcessApplication } from '@/types';
import {
  getAllOfflineQueue,
  clearOfflineData,
  clearAllOffline,
  checkNetwork,
  processOfflineQueue,
  getAbnormalTypeText,
  getActionText,
  formatDateTime
} from '@/utils';

type OfflineCategory = 'all' | 'check' | 'report' | 'process';

interface OfflineItem {
  key: string;
  category: 'check' | 'report' | 'process';
  timestamp: number;
  data: unknown;
  title: string;
  subtitle: string;
}

const OfflineSyncPage: React.FC = () => {
  const {
    isOnline,
    setOnline,
    setOfflineSyncCount,
    checkBatch,
    addAbnormalReport,
    addProcessApplication,
    recalcDailyStats,
    recalcStoreInspections
  } = useAppStore();

  const [items, setItems] = useState<OfflineItem[]>([]);
  const [activeTab, setActiveTab] = useState<OfflineCategory>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const loadOfflineItems = useCallback(() => {
    const queue = getAllOfflineQueue();
    const keys = Object.keys(queue);
    const list: OfflineItem[] = [];

    for (const key of keys) {
      const item = queue[key];
      let category: 'check' | 'report' | 'process' = 'check';
      let title = '';
      let subtitle = '';

      if (key.startsWith('check_')) {
        category = 'check';
        const d = item.data as { batchId: string; actualQty: number };
        title = `扫码确认 · 实际${d.actualQty}支`;
        subtitle = `批次ID: ${d.batchId}`;
      } else if (key.startsWith('report_')) {
        category = 'report';
        const d = item.data as AbnormalReport;
        title = `异常上报 · ${getAbnormalTypeText(d.type)}`;
        subtitle = `${d.productName} - 批号${d.batchNo}`;
      } else if (key.startsWith('process_')) {
        category = 'process';
        const d = item.data as ProcessApplication;
        title = `处理申请 · ${getActionText(d.action)}`;
        subtitle = `${d.productName} - ${d.quantity}支`;
      }

      list.push({
        key,
        category,
        timestamp: item.timestamp,
        data: item.data,
        title,
        subtitle
      });
    }

    list.sort((a, b) => b.timestamp - a.timestamp);
    setItems(list);
    setOfflineSyncCount(list.length);
    console.log('[OfflineSync] 加载待同步列表:', list.length, '条');
  }, [setOfflineSyncCount]);

  useEffect(() => {
    loadOfflineItems();
  }, [loadOfflineItems]);

  useEffect(() => {
    const initNetwork = async () => {
      const online = await checkNetwork();
      setOnline(online);
    };
    initNetwork();
  }, [setOnline]);

  const stats = {
    all: items.length,
    check: items.filter((i) => i.category === 'check').length,
    report: items.filter((i) => i.category === 'report').length,
    process: items.filter((i) => i.category === 'process').length
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'check': return '✅';
      case 'report': return '⚠️';
      case 'process': return '📋';
      default: return '📦';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'check': return '扫码确认';
      case 'report': return '异常上报';
      case 'process': return '处理申请';
      default: return '其他';
    }
  };

  const handleRetryOne = async (item: OfflineItem) => {
    if (!isOnline) {
      Taro.showToast({ title: '当前离线，无法同步', icon: 'none' });
      return;
    }
    console.log('[OfflineSync] 单条重试:', item.key);

    try {
      let success = false;
      if (item.category === 'check') {
        const d = item.data as { batchId: string; actualQty: number };
        checkBatch(d.batchId, d.actualQty);
        success = true;
      } else if (item.category === 'report') {
        addAbnormalReport(item.data as AbnormalReport);
        success = true;
      } else if (item.category === 'process') {
        const app = item.data as (ProcessApplication & { _fromReportId?: string });
        addProcessApplication(app, app._fromReportId);
        success = true;
      }

      if (success) {
        clearOfflineData(item.key);
        loadOfflineItems();
        recalcDailyStats();
        recalcStoreInspections();
        Taro.showToast({ title: '同步成功', icon: 'success' });
      }
    } catch (error) {
      console.error('[OfflineSync] 单条同步失败:', error);
      Taro.showToast({ title: '同步失败', icon: 'none' });
    }
  };

  const handleDeleteOne = (item: OfflineItem) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除这条本地草稿吗？\n${item.title}`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          clearOfflineData(item.key);
          loadOfflineItems();
          Taro.showToast({ title: '已删除', icon: 'none' });
        }
      }
    });
  };

  const handleRetryAll = async () => {
    if (!isOnline) {
      Taro.showToast({ title: '当前离线，无法同步', icon: 'none' });
      return;
    }
    if (items.length === 0) {
      Taro.showToast({ title: '暂无待同步数据', icon: 'none' });
      return;
    }

    setIsSyncing(true);
    console.log('[OfflineSync] 全部重试...');

    const result = await processOfflineQueue((key, data) => {
      if (key.startsWith('check_')) {
        const d = data as { batchId: string; actualQty: number };
        checkBatch(d.batchId, d.actualQty);
        return true;
      }
      if (key.startsWith('report_')) {
        addAbnormalReport(data as AbnormalReport);
        return true;
      }
      if (key.startsWith('process_')) {
        const app = data as (ProcessApplication & { _fromReportId?: string });
        addProcessApplication(app, app._fromReportId);
        return true;
      }
      return true;
    });

    setIsSyncing(false);
    loadOfflineItems();
    recalcDailyStats();
    recalcStoreInspections();

    Taro.showToast({
      title: `成功${result.success}条，失败${result.failed}条`,
      icon: result.success > 0 ? 'success' : 'none'
    });
  };

  const handleClearAll = () => {
    if (items.length === 0) {
      Taro.showToast({ title: '暂无待同步数据', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '清空所有草稿',
      content: `确定要清空 ${items.length} 条本地待同步数据吗？此操作不可恢复。`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          clearAllOffline();
          loadOfflineItems();
          Taro.showToast({ title: '已清空', icon: 'none' });
        }
      }
    });
  };

  const tabs: { key: OfflineCategory; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.all },
    { key: 'check', label: '扫码确认', count: stats.check },
    { key: 'report', label: '异常上报', count: stats.report },
    { key: 'process', label: '处理申请', count: stats.process }
  ];

  return (
    <View className={styles.page}>
      <View className={styles.statusBar}>
        <View className={styles.statusLeft}>
          <Text className={classnames(styles.statusDot, isOnline ? styles.online : styles.offline)} />
          <Text className={styles.statusText}>
            {isOnline ? '网络已连接' : '当前离线'}
          </Text>
        </View>
        <Text className={styles.statusCount}>
          待同步 <Text className={styles.countNum}>{items.length}</Text> 条
        </Text>
      </View>

      <View className={styles.actionBar}>
        <Button
          className={classnames(styles.actionBtn, styles.primaryBtn)}
          onClick={handleRetryAll}
          disabled={isSyncing || items.length === 0}
        >
          {isSyncing ? '同步中...' : '全部同步'}
        </Button>
        <Button
          className={classnames(styles.actionBtn, styles.dangerBtn)}
          onClick={handleClearAll}
          disabled={items.length === 0}
        >
          清空草稿
        </Button>
      </View>

      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            className={classnames(styles.tab, activeTab === tab.key && styles.tabActive)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <Text className={styles.tabCount}>({tab.count})</Text>
          </Button>
        ))}
      </View>

      <ScrollView scrollY className={styles.list}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <View key={item.key} className={styles.itemCard}>
              <View className={styles.itemHeader}>
                <View className={styles.itemIcon}>{getCategoryIcon(item.category)}</View>
                <View className={styles.itemInfo}>
                  <Text className={styles.itemTitle}>{item.title}</Text>
                  <Text className={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
                <View className={styles.itemTag}>{getCategoryLabel(item.category)}</View>
              </View>

              <View className={styles.itemFooter}>
                <Text className={styles.itemTime}>
                  保存时间：{formatDateTime(dayjs(item.timestamp).format('YYYY-MM-DD HH:mm:ss'))}
                </Text>
                <View className={styles.itemActions}>
                  <Button
                    className={classnames(styles.itemBtn, styles.itemRetry)}
                    onClick={() => handleRetryOne(item)}
                    disabled={!isOnline}
                  >
                    重试
                  </Button>
                  <Button
                    className={classnames(styles.itemBtn, styles.itemDelete)}
                    onClick={() => handleDeleteOne(item)}
                  >
                    删除
                  </Button>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎉</Text>
            <Text className={styles.emptyText}>暂无待同步数据</Text>
            <Text className={styles.emptySubtext}>所有本地草稿都已同步完成</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default OfflineSyncPage;
