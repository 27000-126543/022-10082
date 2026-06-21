import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import type { HealthLevel } from '@/types';
import { getHealthLevelText } from '@/utils';

interface HealthCardProps {
  storeName: string;
  healthLevel: HealthLevel;
  score: number;
  completionRate: number;
  onClick?: () => void;
}

const HealthCard: React.FC<HealthCardProps> = ({ storeName, healthLevel, score, completionRate, onClick }) => {
  return (
    <View className={classnames(styles.healthCard, styles[healthLevel])} onClick={onClick}>
      <View className={styles.decorCircle} />
      <View className={styles.decorCircle2} />
      <View className={styles.header}>
        <Text className={styles.levelText}>{getHealthLevelText(healthLevel)}</Text>
        <Text className={styles.levelBadge}>完成率 {completionRate}%</Text>
      </View>
      <View className={styles.content}>
        <Text className={styles.storeName}>{storeName}</Text>
        <View className={styles.scoreWrap}>
          <Text className={styles.score}>{score}</Text>
          <Text className={styles.scoreLabel}>健康分</Text>
        </View>
      </View>
    </View>
  );
};

export default HealthCard;
