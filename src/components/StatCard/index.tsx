import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface StatCardProps {
  value: number | string;
  label: string;
  color?: 'red' | 'yellow' | 'blue' | 'normal';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color = 'normal', onClick }) => {
  return (
    <View className={styles.statCard} onClick={onClick}>
      <Text className={classnames(styles.value, styles[color])}>{value}</Text>
      <Text className={styles.label}>{label}</Text>
    </View>
  );
};

export default StatCard;
