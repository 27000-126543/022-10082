import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import type { BatchInfo } from '@/types';
import { getExpireLevelText, formatDate } from '@/utils';

interface BatchItemProps {
  batch: BatchInfo;
  onClick?: () => void;
}

const BatchItem: React.FC<BatchItemProps> = ({ batch, onClick }) => {
  const getDaysColorClass = () => {
    if (batch.daysLeft <= 30) return styles.daysRed;
    if (batch.daysLeft <= 60) return styles.daysYellow;
    if (batch.daysLeft <= 90) return styles.daysBlue;
    return styles.daysGreen;
  };

  const getStatusClass = () => {
    if (batch.hasAbnormal) return styles.abnormal;
    if (batch.isChecked) return styles.checked;
    return styles.pending;
  };

  const getStatusText = () => {
    if (batch.hasAbnormal) return '异常';
    if (batch.isChecked) return '已巡检';
    return '待巡检';
  };

  return (
    <View
      className={classnames(styles.batchItem, styles[`level${batch.expireLevel}`])}
      onClick={onClick}
    >
      <View className={styles.header}>
        <View className={styles.productInfo}>
          <Text className={styles.productName}>{batch.productName}</Text>
          <Text className={styles.spec}>{batch.spec} · 批号 {batch.batchNo}</Text>
        </View>
        <Text className={classnames(styles.levelTag, styles[`tag${batch.expireLevel}`])}>
          {getExpireLevelText(batch.expireLevel)}
        </Text>
      </View>

      <View className={styles.metaRow}>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>有效期至</Text>
          <Text className={styles.metaValue}>{formatDate(batch.expireDate)}</Text>
        </View>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>剩余</Text>
          <Text className={classnames(styles.metaValue, styles.daysLeft, getDaysColorClass())}>
            {batch.daysLeft}天
          </Text>
        </View>
        <View className={styles.metaItem}>
          <Text className={styles.metaLabel}>系统库存</Text>
          <Text className={styles.metaValue}>{batch.systemQty}支</Text>
        </View>
        {batch.actualQty !== undefined && (
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>实盘</Text>
            <Text className={classnames(styles.metaValue, batch.actualQty !== batch.systemQty && styles.qtyDiff)}>
              {batch.actualQty}支
            </Text>
          </View>
        )}
      </View>

      <View className={styles.footer}>
        <Text className={styles.location}>
          <Text className={styles.locationIcon}>📍</Text>
          {batch.location}
          {batch.storageType === 'refrigerated' && ' · 冷藏'}
        </Text>
        <Text className={classnames(styles.statusTag, getStatusClass())}>
          {getStatusText()}
        </Text>
      </View>
    </View>
  );
};

export default BatchItem;
