import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import StatCard from '@/components/StatCard';
import BatchItem from '@/components/BatchItem';
import { checkNetwork } from '@/utils';

type FilterType = 'all' | 'pending' | 'checked' | '30days' | '60days' | '90days';

const TasksPage: React.FC = () => {
  const {
    batches,
    dailyStats,
    storeInspections,
    isOnline,
    currentUser,
    setOnline
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    const initNetwork = async () => {
      const online = await checkNetwork();
      setOnline(online);
    };
    initNetwork();

    const unsubscribe = Taro.onNetworkStatusChange((res) => {
      setOnline(res.isConnected);
    });

    return () => {
      unsubscribe?.();
    };
  }, [setOnline]);

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待巡检' },
    { key: '30days', label: '30天内' },
    { key: '60days', label: '60天内' },
    { key: '90days', label: '90天内' },
    { key: 'checked', label: '已完成' }
  ];

  const filteredBatches = batches.filter((b) => {
    switch (activeFilter) {
      case 'pending':
        return !b.isChecked;
      case 'checked':
        return b.isChecked;
      case '30days':
        return b.expireLevel === '30days';
      case '60days':
        return b.expireLevel === '60days';
      case '90days':
        return b.expireLevel === '90days';
      default:
        return true;
    }
  });

  const overallCompletionRate = dailyStats.totalBatches > 0
    ? Math.round((dailyStats.checkedBatches / dailyStats.totalBatches) * 100)
    : 0;

  const handleBatchClick = (batchId: string) => {
    console.log('[Tasks] 点击批次:', batchId);
    Taro.switchTab({ url: '/pages/scan/index' });
  };

  const handlePullDownRefresh = () => {
    console.log('[Tasks] 下拉刷新');
    setTimeout(() => {
      Taro.stopPullDownRefresh();
      Taro.showToast({ title: '数据已更新', icon: 'success' });
    }, 1000);
  };

  useEffect(() => {
    Taro.onPullDownRefresh(handlePullDownRefresh);
  }, []);

  const getInspectionFillClass = (rate: number) => {
    if (rate >= 90) return styles.fillGreen;
    if (rate >= 70) return styles.fillYellow;
    return styles.fillRed;
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.greeting}>
          <View className={styles.greetingText}>
            <Text className={styles.hello}>早上好 👋</Text>
            <Text className={styles.userName}>{currentUser.name}</Text>
          </View>
          <View className={styles.onlineStatus}>
            <Text className={classnames(styles.statusDot, isOnline ? styles.online : styles.offline)} />
            <Text>{isOnline ? '在线' : '离线模式'}</Text>
          </View>
        </View>
        <Text className={styles.todayInfo}>
          {dayjs().format('YYYY年MM月DD日 dddd')} · 今日巡检任务
        </Text>
      </View>

      <View className={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <StatCard
            value={`${overallCompletionRate}%`}
            label="今日完成率"
            color="normal"
          />
        </View>
      </View>

      <View className={styles.statsGrid}>
        <StatCard value={dailyStats.totalBatches} label="待查批次" color="normal" />
        <StatCard value={dailyStats.expire30Days} label="30天内" color="red" />
        <StatCard value={dailyStats.expire60Days} label="60天内" color="yellow" />
        <StatCard value={dailyStats.abnormalBatches} label="异常数" color="red" />
      </View>

      <View className={styles.progressBarWrap}>
        <View className={styles.progressHeader}>
          <Text className={styles.progressTitle}>整体巡检进度</Text>
          <Text className={styles.progressValue}>{overallCompletionRate}%</Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${overallCompletionRate}%` }} />
        </View>
        <View className={styles.progressStats}>
          <Text className={styles.progressStat}>
            已巡检 <Text className={styles.progressStatNum}>{dailyStats.checkedBatches}</Text> 个
          </Text>
          <Text className={styles.progressStat}>
            待巡检 <Text className={styles.progressStatNum}>{dailyStats.pendingBatches}</Text> 个
          </Text>
          <Text className={styles.progressStat}>
            异常 <Text className={styles.progressStatNum}>{dailyStats.abnormalBatches}</Text> 个
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>库房巡检情况</Text>
        </View>
        <View className={styles.inspectionList}>
          {storeInspections.map((item) => (
            <View key={item.id} className={styles.inspectionItem}>
              <View className={styles.inspectionHeader}>
                <Text className={styles.inspectionName}>
                  {item.name}
                  <Text className={styles.inspectionType}>
                    {item.type === 'fridge' ? '冷藏' : '常温'}
                  </Text>
                </Text>
                <Text className={styles.progressValue}>{item.completionRate}%</Text>
              </View>
              <View className={styles.inspectionBar}>
                <View
                  className={classnames(styles.inspectionFill, getInspectionFillClass(item.completionRate))}
                  style={{ width: `${item.completionRate}%` }}
                />
              </View>
              <View className={styles.inspectionFooter}>
                <Text>已完成 {item.checkedBatches}/{item.totalBatches} 批次</Text>
                <Text>{item.totalBatches - item.checkedBatches > 0 ? `剩余 ${item.totalBatches - item.checkedBatches} 个待查` : '全部完成 ✓'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>批次清单</Text>
          <Text
            className={styles.sectionAction}
            onClick={() => Taro.switchTab({ url: '/pages/scan/index' })}
          >
            扫码巡检 →
          </Text>
        </View>

        <ScrollView scrollX className={styles.filterTabs}>
          {filterOptions.map((opt) => (
            <Button
              key={opt.key}
              className={classnames(styles.filterTab, activeFilter === opt.key && styles.filterTabActive)}
              onClick={() => setActiveFilter(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </ScrollView>

        <View className={styles.batchList}>
          {filteredBatches.length > 0 ? (
            filteredBatches.map((batch) => (
              <BatchItem
                key={batch.id}
                batch={batch}
                onClick={() => handleBatchClick(batch.id)}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无符合条件的批次</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default TasksPage;
