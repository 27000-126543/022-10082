import React, { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppStore } from '@/store';
import BatchItem from '@/components/BatchItem';
import type { BatchInfo } from '@/types';
import { formatDate, saveToOffline, checkNetwork } from '@/utils';

const ScanPage: React.FC = () => {
  const { batches, checkBatch, isOnline, currentUser } = useAppStore();
  const [manualCode, setManualCode] = useState('');
  const [currentBatch, setCurrentBatch] = useState<BatchInfo | null>(null);
  const [actualQty, setActualQty] = useState<number>(0);

  const pendingBatches = batches.filter((b) => !b.isChecked);

  const handleScan = async () => {
    console.log('[Scan] 开始扫码');
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ['barCode', 'qrCode']
      });
      console.log('[Scan] 扫码结果:', res.result);
      findBatchByCode(res.result);
    } catch (error) {
      console.error('[Scan] 扫码失败:', error);
      Taro.showToast({ title: '扫码已取消', icon: 'none' });
    }
  };

  const findBatchByCode = (code: string) => {
    const batch = batches.find(
      (b) => b.batchNo.toLowerCase() === code.toLowerCase() || b.id === code
    );
    if (batch) {
      setCurrentBatch(batch);
      setActualQty(batch.systemQty);
      console.log('[Scan] 找到批次:', batch.productName);
    } else {
      Taro.showToast({ title: '未找到该批次信息', icon: 'none' });
    }
  };

  const handleManualConfirm = () => {
    if (!manualCode.trim()) {
      Taro.showToast({ title: '请输入批号', icon: 'none' });
      return;
    }
    findBatchByCode(manualCode.trim());
  };

  const handleQtyChange = (value: string) => {
    const num = parseInt(value) || 0;
    setActualQty(Math.max(0, num));
  };

  const handleQtyMinus = () => {
    setActualQty((prev) => Math.max(0, prev - 1));
  };

  const handleQtyPlus = () => {
    setActualQty((prev) => prev + 1);
  };

  const handleConfirmCheck = async () => {
    if (!currentBatch) return;

    console.log('[Scan] 确认巡检:', currentBatch.id, '实际数量:', actualQty);
    const online = await checkNetwork();

    const checkData = {
      batchId: currentBatch.id,
      actualQty,
      checkTime: new Date().toISOString(),
      operator: currentUser.name
    };

    if (!online) {
      saveToOffline(`check_${currentBatch.id}`, checkData);
      Taro.showToast({ title: '离线暂存，联网后补传', icon: 'none' });
    }

    checkBatch(currentBatch.id, actualQty);

    if (actualQty !== currentBatch.systemQty) {
      Taro.showModal({
        title: '账实不符',
        content: `系统记录${currentBatch.systemQty}支，实际${actualQty}支，是否立即上报异常？`,
        confirmText: '去上报',
        cancelText: '暂不上报',
        success: (res) => {
          if (res.confirm) {
            Taro.switchTab({ url: '/pages/report/index' });
          } else {
            resetState();
          }
        }
      });
    } else {
      Taro.showToast({ title: '巡检完成 ✓', icon: 'success' });
      resetState();
    }
  };

  const handleReportAbnormal = () => {
    if (!currentBatch) return;
    console.log('[Scan] 上报异常:', currentBatch.id);
    Taro.setStorageSync('reportBatch', currentBatch);
    Taro.switchTab({ url: '/pages/report/index' });
  };

  const handleApplyProcess = () => {
    if (!currentBatch) return;
    console.log('[Scan] 发起处理申请:', currentBatch.id);
    Taro.setStorageSync('processBatch', currentBatch);
    Taro.switchTab({ url: '/pages/progress/index' });
  };

  const resetState = () => {
    setCurrentBatch(null);
    setActualQty(0);
    setManualCode('');
  };

  const hasQtyDiff = currentBatch && actualQty !== currentBatch.systemQty;

  return (
    <View className={styles.page}>
      <View className={styles.scanSection}>
        <Text className={styles.scanTitle}>扫码确认实物在库</Text>
        <Text className={styles.scanSubtitle}>扫描产品包装码或批号进行巡检</Text>

        <Button className={styles.scanButton} onClick={handleScan}>
          <Text className={styles.scanIcon}>📷</Text>
          <Text className={styles.scanButtonText}>点击扫码</Text>
        </Button>

        <Text className={styles.scanHint}>
          {isOnline ? '✓ 网络已连接' : '⚠ 当前离线，数据将暂存本地'}
        </Text>
      </View>

      <View className={styles.inputSection}>
        <View className={styles.manualInput}>
          <Text className={styles.inputLabel}>或手动输入批号</Text>
          <View className={styles.inputRow}>
            <Input
              className={styles.codeInput}
              placeholder="请输入产品批号"
              value={manualCode}
              onInput={(e) => setManualCode(e.detail.value)}
            />
            <Button className={styles.confirmBtn} onClick={handleManualConfirm}>
              查询
            </Button>
          </View>
        </View>
      </View>

      {currentBatch && (
        <View className={styles.batchDetail}>
          <View className={styles.detailHeader}>
            <Text className={styles.detailProductName}>{currentBatch.productName}</Text>
            <Text className={styles.detailSpec}>{currentBatch.spec} · {currentBatch.batchNo}</Text>
          </View>

          <View className={styles.detailRows}>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>有效期至</Text>
              <Text className={styles.detailValue}>{formatDate(currentBatch.expireDate)}</Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>剩余天数</Text>
              <Text
                className={classnames(
                  styles.detailValue,
                  currentBatch.daysLeft <= 30 ? styles.daysUrgent : currentBatch.daysLeft <= 60 ? styles.daysWarning : ''
                )}
              >
                {currentBatch.daysLeft}天
              </Text>
            </View>
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>存放位置</Text>
              <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
                <Text className={styles.detailValue}>{currentBatch.location}</Text>
                <Text
                  className={classnames(
                    styles.storageTag,
                    currentBatch.storageType === 'refrigerated' ? styles.storageRefrigerated : styles.storageNormal
                  )}
                >
                  {currentBatch.storageType === 'refrigerated' ? '冷藏' : '常温'}
                </Text>
              </View>
            </View>
          </View>

          <View className={styles.qtySection}>
            <Text className={styles.qtyTitle}>数量核对</Text>

            <View className={styles.qtyRow}>
              <Text className={styles.qtyLabel}>系统库存</Text>
              <Text className={styles.qtyValue}>{currentBatch.systemQty}支</Text>
            </View>

            <View className={styles.qtyRow}>
              <Text className={styles.qtyLabel}>实际数量</Text>
              <View className={styles.qtyInputWrap}>
                <Button className={styles.qtyBtn} onClick={handleQtyMinus}>−</Button>
                <Input
                  className={styles.qtyInput}
                  type="number"
                  value={String(actualQty)}
                  onInput={(e) => handleQtyChange(e.detail.value)}
                />
                <Button className={styles.qtyBtn} onClick={handleQtyPlus}>+</Button>
              </View>
            </View>

            {hasQtyDiff && (
              <View className={styles.diffAlert}>
                <Text className={styles.diffAlertText}>
                  ⚠ 账实不符！系统{currentBatch.systemQty}支，实际{actualQty}支，差额{Math.abs(currentBatch.systemQty - actualQty)}支
                </Text>
              </View>
            )}
          </View>

          <View className={styles.actionRow}>
            <Button
              className={classnames(styles.actionBtn, styles.secondaryBtn)}
              onClick={handleReportAbnormal}
            >
              上报异常
            </Button>
            <Button
              className={classnames(styles.actionBtn, styles.primaryBtn)}
              onClick={handleConfirmCheck}
            >
              确认巡检
            </Button>
          </View>

          {currentBatch.daysLeft <= 90 && (
            <View className={styles.actionRow}>
              <Button
                className={classnames(styles.actionBtn, styles.dangerBtn)}
                onClick={handleApplyProcess}
              >
                发起处理（调拨/促销/报损）
              </Button>
            </View>
          )}
        </View>
      )}

      {!currentBatch && pendingBatches.length > 0 && (
        <View className={styles.pendingList}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>待巡检批次</Text>
            <Text className={styles.sectionCount}>{pendingBatches.length} 个待处理</Text>
          </View>
          {pendingBatches.slice(0, 5).map((batch) => (
            <BatchItem
              key={batch.id}
              batch={batch}
              onClick={() => {
                setCurrentBatch(batch);
                setActualQty(batch.systemQty);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ScanPage;
