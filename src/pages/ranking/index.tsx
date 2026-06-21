import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import HealthCard from '@/components/HealthCard';
import type { HealthLevel } from '@/types';
import { getHealthLevelText } from '@/utils';

const RankingPage: React.FC = () => {
  const { storeRankings, currentUser } = useAppStore();

  const myStore = storeRankings[1];

  const stats = {
    green: storeRankings.filter((s) => s.healthLevel === 'green').length,
    yellow: storeRankings.filter((s) => s.healthLevel === 'yellow').length,
    red: storeRankings.filter((s) => s.healthLevel === 'red').length
  };

  const getRankBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return styles.rank1;
      case 2:
        return styles.rank2;
      case 3:
        return styles.rank3;
      default:
        return styles.rankOther;
    }
  };

  const getScoreClass = (level: HealthLevel) => {
    switch (level) {
      case 'green':
        return styles.scoreGreen;
      case 'yellow':
        return styles.scoreYellow;
      case 'red':
        return styles.scoreRed;
    }
  };

  const getHealthBadgeClass = (level: HealthLevel) => {
    switch (level) {
      case 'green':
        return styles.healthGreen;
      case 'yellow':
        return styles.healthYellow;
      case 'red':
        return styles.healthRed;
    }
  };

  const getFillClass = (level: HealthLevel) => {
    switch (level) {
      case 'green':
        return styles.fillGreen;
      case 'yellow':
        return styles.fillYellow;
      case 'red':
        return styles.fillRed;
    }
  };

  const handleStoreClick = (storeId: string, storeName: string) => {
    console.log('[Ranking] 点击门店:', storeId, storeName);
    Taro.showToast({ title: `查看 ${storeName} 详情`, icon: 'none' });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>门店效期健康排行</Text>
        <Text className={styles.headerSubtitle}>红黄绿一眼识别风险，风险早处理</Text>
      </View>

      <View className={styles.myStoreCard}>
        <HealthCard
          storeName={`我的门店 - ${myStore.storeName}`}
          healthLevel={myStore.healthLevel}
          score={myStore.score}
          completionRate={myStore.completionRate}
          onClick={() => handleStoreClick(myStore.id, myStore.storeName)}
        />
      </View>

      <View className={styles.legendSection}>
        <Text className={styles.legendTitle}>健康等级说明</Text>
        <View className={styles.legendItems}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotGreen)} />
            <Text className={styles.legendLabel}>健康</Text>
            <Text className={styles.legendDesc}>完成率≥95%</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotYellow)} />
            <Text className={styles.legendLabel}>关注</Text>
            <Text className={styles.legendDesc}>完成率80-94%</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotRed)} />
            <Text className={styles.legendLabel}>预警</Text>
            <Text className={styles.legendDesc}>完成率<80%</Text>
          </View>
        </View>
      </View>

      <View className={styles.summaryStats}>
        <View className={styles.summaryItem}>
          <Text className={classnames(styles.summaryValue, styles.summaryGreen)}>{stats.green}</Text>
          <Text className={styles.summaryLabel}>健康门店</Text>
        </View>
        <View className={styles.summaryItem}>
          <Text className={classnames(styles.summaryValue, styles.summaryYellow)}>{stats.yellow}</Text>
          <Text className={styles.summaryLabel}>需关注</Text>
        </View>
        <View className={styles.summaryItem}>
          <Text className={classnames(styles.summaryValue, styles.summaryRed)}>{stats.red}</Text>
          <Text className={styles.summaryLabel}>预警门店</Text>
        </View>
      </View>

      <View className={styles.rankingSection}>
        <View className={styles.sectionTitle}>
          <Text className={styles.titleText}>全部门店排行</Text>
          <Text className={styles.updateTime}>更新于 {dayjs().format('HH:mm')}</Text>
        </View>

        <ScrollView scrollY>
          <View className={styles.rankingList}>
            {storeRankings.map((store) => (
              <View
                key={store.id}
                className={styles.rankingItem}
                onClick={() => handleStoreClick(store.id, store.storeName)}
              >
                <View className={classnames(styles.rankBadge, getRankBadgeClass(store.rank))}>
                  {store.rank}
                </View>

                <View className={styles.storeInfo}>
                  <Text className={styles.storeName}>{store.storeName}</Text>
                  <View className={styles.storeMeta}>
                    <Text
                      className={classnames(styles.healthBadge, getHealthBadgeClass(store.healthLevel))}
                    >
                      {getHealthLevelText(store.healthLevel)}
                    </Text>
                    <Text className={styles.metaItem}>
                      巡检完成率 <Text className={styles.metaValue}>{store.completionRate}%</Text>
                    </Text>
                  </View>
                  <View className={styles.storeMeta}>
                    <Text className={styles.metaItem}>
                      异常 <Text className={styles.metaValue}>{store.abnormalCount}</Text>
                    </Text>
                    <Text className={styles.metaItem}>
                      待处理 <Text className={styles.metaValue}>{store.pendingCount}</Text>
                    </Text>
                  </View>
                  <View className={styles.progressBarWrap}>
                    <View className={styles.progressBar}>
                      <View
                        className={classnames(styles.progressFill, getFillClass(store.healthLevel))}
                        style={{ width: `${store.completionRate}%` }}
                      />
                    </View>
                  </View>
                </View>

                <View className={styles.scoreWrap}>
                  <Text className={classnames(styles.scoreValue, getScoreClass(store.healthLevel))}>
                    {store.score}
                  </Text>
                  <Text className={styles.scoreLabel}>健康分</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className={styles.tipsCard}>
        <Text className={styles.tipsTitle}>
          <Text>💡</Text>
          闭店检查提示
        </Text>
        <Text className={styles.tipsContent}>
          每日闭店前请检查：
          {'\n'}1. 近效期批次是否全部巡检完成
          {'\n'}2. 异常上报是否均已发起处理申请
          {'\n'}3. 待审批事项是否已通知护士长
          {'\n'}4. 冷藏设备温度记录是否正常
        </Text>
      </View>
    </View>
  );
};

export default RankingPage;
