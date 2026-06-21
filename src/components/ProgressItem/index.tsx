import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import type { ProcessApplication } from '@/types';
import { getActionText, getStatusText, formatDateTime } from '@/utils';

interface ProgressItemProps {
  app: ProcessApplication;
  showApprove?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onClick?: () => void;
}

const ProgressItem: React.FC<ProgressItemProps> = ({ app, showApprove, onApprove, onReject, onClick }) => {
  return (
    <View className={styles.progressItem} onClick={onClick}>
      <View className={styles.header}>
        <View className={styles.productInfo}>
          <Text className={styles.productName}>{app.productName}</Text>
          <Text className={styles.batchNo}>批号 {app.batchNo}</Text>
        </View>
        <Text className={classnames(styles.actionTag, styles[`action${app.action.charAt(0).toUpperCase() + app.action.slice(1)}`])}>
          {getActionText(app.action)}
        </Text>
      </View>

      <Text className={styles.reason}>{app.reason}</Text>

      <View className={styles.metaRow}>
        <Text className={styles.metaItem}>
          申请数量：<Text className={styles.metaValue}>{app.quantity}支</Text>
        </Text>
        <Text className={styles.metaItem}>
          申请人：<Text className={styles.metaValue}>{app.applicant}</Text>
        </Text>
        <Text className={styles.metaItem}>
          {formatDateTime(app.applyTime)}
        </Text>
        <Text className={classnames(styles.statusTag, styles[app.status])}>
          {getStatusText(app.status)}
        </Text>
      </View>

      {app.approver && (
        <View className={styles.metaRow} style={{ marginTop: '16rpx' }}>
          <Text className={styles.metaItem}>
            审批人：<Text className={styles.metaValue}>{app.approver}</Text>
          </Text>
          {app.approveTime && (
            <Text className={styles.metaItem}>
              审批时间：<Text className={styles.metaValue}>{formatDateTime(app.approveTime)}</Text>
            </Text>
          )}
        </View>
      )}

      {showApprove && app.status === 'pending' && (
        <View className={styles.footer}>
          <Button
            className={classnames(styles.actionBtn, styles.rejectBtn)}
            onClick={(e) => {
              e.stopPropagation();
              onReject?.(app.id);
            }}
          >
            驳回
          </Button>
          <Button
            className={classnames(styles.actionBtn, styles.approveBtn)}
            onClick={(e) => {
              e.stopPropagation();
              onApprove?.(app.id);
            }}
          >
            批准
          </Button>
        </View>
      )}
    </View>
  );
};

export default ProgressItem;
