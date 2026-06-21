import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppStore } from '@/store';
import BatchItem from '@/components/BatchItem';
import type { BatchInfo } from '@/types';
import { getExpireLevelText } from '@/utils';

type FilterTab = 'all' | 'pending' | 'checked' | 'abnormal';

const WarehouseDetailPage: React.FC = () => {
  const router = useRouter();
  const { batches, storeInspections, dailyStats } = useAppStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const warehouseName = router.params.name || '冷藏柜A';
  const warehouseType = (router.params.type as 'fridge' | 'shelf') || 'fridge';

  const inspection = storeInspections.find((ins) => ins.name === warehouseName);

  const locationBatches = useMemo(() => {
    const letter = warehouseName.replace(/[^\u4e00-\u9fa5]/g, '').length > 0
      ? warehouseName.charAt(warehouseName.length - 1)
      : 'A';
    const prefix = warehouseName;
    return batches.filter((b) => b.location.startsWith(prefix));
  }, [batches, warehouseName]);

  const stats = useMemo(() => {
    const total = locationBatches.length;
    const checked = locationBatches.filter((b) => b.isChecked).length;
    const pending = total - checked;
    const abnormal = locationBatches.filter((b) => b.hasAbnormal).length;
    const rate = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, pending, abnormal, rate };
  }, [locationBatches]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: stats.total },
    { key: 'pending', label: '待巡检', count: stats.pending },
    { key: 'checked', label: '已完成', count: stats.checked },
    { key: 'abnormal', label: '有异常', count: stats.abnormal }
  ];

  const filteredBatches = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return locationBatches.filter((b) => !b.isChecked);
      case 'checked':
        return locationBatches.filter((b) => b.isChecked);
      case 'abnormal':
        return locationBatches.filter((b) => b.hasAbnormal);
      default:
        return locationBatches;
    }
  }, [locationBatches, activeTab]);

  const pendingSorted = useMemo(
    () => [...filteredBatches].sort((a, b) => (a.isChecked === b.isChecked ? a.daysLeft - b.daysLeft : a.isChecked ? 1 : -1)),
    [filteredBatches]
  );

  const handleBatchClick = (batch: BatchInfo) => {
    console.log('[WarehouseDetail] 点击批次:', batch.id);
    Taro.setStorageSync('currentScanBatchId', batch.id);
    Taro.switchTab({ url: '/pages/scan/index' });
  };

  const handleStartInventory = () => {
    const firstPending = locationBatches.find((b) => !b.isChecked);
    if (firstPending) {
      Taro.setStorageSync('currentScanBatchId', firstPending.id);
    }
    Taro.switchTab({ url: '/pages/scan/index' });
  };

  const getRateColorClass = (rate: number) => {
    if (rate >= 90) return styles.rateGreen;
    if (rate >= 70) return styles.rateYellow;
    return styles.rateRed;
  };

  const getFillColorClass = (rate: number) => {
    if (rate >= 90) return styles.fillGreen;
    if (rate >= 70) return styles.fillYellow;
    return styles.fillRed;
  };

  const isAllDone = stats.pending === 0 && stats.total > 0;

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <View>
            <Text className={styles.warehouseName}>{warehouseName}</Text>
            <Text className={styles.warehouseType}>
              {warehouseType === 'fridge' ? '冷藏存储' : '常温存储'}
            </Text>
          </View>
          <View className={styles.rateBox}>
            <Text className={classnames(styles.rateNum, getRateColorClass(stats.rate))}>
              {stats.rate}%
            </Text>
            <Text className={styles.rateLabel}>完成率</Text>
          </View>
        </View>

        <View className={styles.progressBar}>
          <View
            className={classnames(styles.progressFill, getFillColorClass(stats.rate))}
            style={{ width: `${stats.rate}%` }}
          />
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statNum}>{stats.total}</Text>
            <Text className={styles.statLabel}>总批次</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, styles.numGreen)}>{stats.checked}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, styles.numYellow)}>{stats.pending}</Text>
            <Text className={styles.statLabel}>待巡检</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statNum, styles.numRed)}>{stats.abnormal}</Text>
            <Text className={styles.statLabel}>异常数</Text>
          </View>
        </View>

        {isAllDone ? (
          <View className={styles.allDoneBanner}>
            <Text className={styles.allDoneIcon}>✅</Text>
            <Text className={styles.allDoneText}>本区域已全部巡检完成！</Text>
          </View>
        ) : (
          <View className={styles.startBtnRow}>
            <View className={styles.startBtn} onClick={handleStartInventory}>
              <Text className={styles.startBtnText}>开始盘点</Text>
              <Text className={styles.startBtnSub}>
                还有 {stats.pending} 个待巡检，点击按顺序盘
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className={styles.tabs}>
        {tabs.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tab, activeTab === tab.key && styles.tabActive)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>{tab.label}</Text>
            <Text className={styles.tabCount}>({tab.count})</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.list}>
        {pendingSorted.length > 0 ? (
          pendingSorted.map((batch) => (
            <View key={batch.id} className={styles.batchCard}>
              <BatchItem batch={batch} onClick={() => handleBatchClick(batch)} />
              <View className={styles.batchMeta}>
                <View className={styles.metaItem}>
                  <Text className={styles.metaLabel}>位置：</Text>
                  <Text className={styles.metaValue}>{batch.location}</Text>
                </View>
                <View className={styles.metaItem}>
                  <Text className={styles.metaLabel}>效期：</Text>
                  <Text className={styles.metaValue}>
                    {getExpireLevelText(batch.expireLevel)}（{batch.daysLeft}天）
                  </Text>
                </View>
                {batch.actualQty !== undefined && batch.isChecked && (
                  <View className={styles.metaItem}>
                    <Text className={styles.metaLabel}>实盘：</Text>
                    <Text
                      className={classnames(
                        styles.metaValue,
                        batch.actualQty !== batch.systemQty && styles.valueRed
                      )}
                    >
                      {batch.actualQty}支
                      {batch.actualQty !== batch.systemQty &&
                        `（差${Math.abs(batch.actualQty! - batch.systemQty)}）`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📦</Text>
            <Text className={styles.emptyText}>该区域暂无批次</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default WarehouseDetailPage;
