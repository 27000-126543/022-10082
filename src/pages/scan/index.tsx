import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useAppStore } from '@/store';
import BatchItem from '@/components/BatchItem';
import type { BatchInfo } from '@/types';
import { formatDate, saveToOffline, checkNetwork, getOfflineCount } from '@/utils';

const ScanPage: React.FC = () => {
  const {
    batches,
    checkBatch,
    isOnline,
    currentUser,
    setOnline,
    setOfflineSyncCount,
    storeInspections
  } = useAppStore();

  const [manualCode, setManualCode] = useState('');
  const [currentBatch, setCurrentBatch] = useState<BatchInfo | null>(null);
  const [actualQty, setActualQty] = useState<number>(0);
  const [lastConfirmMsg, setLastConfirmMsg] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  useEffect(() => {
    const initNetwork = async () => {
      const online = await checkNetwork();
      setOnline(online);
      setOfflineSyncCount(getOfflineCount());
    };
    initNetwork();
  }, [setOnline, setOfflineSyncCount]);

  const loadBatchFromStorage = useCallback(() => {
    try {
      const batchId = Taro.getStorageSync('currentScanBatchId');
      if (batchId) {
        Taro.removeStorageSync('currentScanBatchId');
        const batch = batches.find((b) => b.id === batchId);
        if (batch) {
          console.log('[Scan] 从Storage加载批次:', batchId, batch.productName);
          setCurrentBatch(batch);
          setActualQty(batch.actualQty || batch.systemQty);
        }
      }
    } catch (e) {
      console.warn('[Scan] 读取Storage批次失败:', e);
    }
  }, [batches]);

  useEffect(() => {
    loadBatchFromStorage();
  }, [loadBatchFromStorage]);

  useEffect(() => {
    if (currentBatch) {
      const latest = batches.find((b) => b.id === currentBatch.id);
      if (latest && latest !== currentBatch) {
        setCurrentBatch(latest);
      }
    }
  }, [batches, currentBatch]);

  const locationOptions = useMemo(() => {
    const opts = [{ key: 'all', label: '全部区域' }];
    storeInspections.forEach((ins) => {
      opts.push({ key: ins.name, label: ins.name });
    });
    return opts;
  }, [storeInspections]);

  const pendingBatches = useMemo(() => {
    let list = batches.filter((b) => !b.isChecked);
    if (selectedLocation !== 'all') {
      list = list.filter((b) => b.location.startsWith(selectedLocation.replace('冷藏柜', '冷藏柜').replace('货架', '货架')));
    }
    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [batches, selectedLocation]);

  const allBatchesSorted = useMemo(() => {
    let list = [...batches];
    if (selectedLocation !== 'all') {
      list = list.filter((b) => b.location.startsWith(selectedLocation));
    }
    return list.sort((a, b) => (a.isChecked === b.isChecked ? a.daysLeft - b.daysLeft : a.isChecked ? 1 : -1));
  }, [batches, selectedLocation]);

  const findNextBatch = useCallback((currentId: string) => {
    const idx = pendingBatches.findIndex((b) => b.id === currentId);
    if (idx >= 0 && idx < pendingBatches.length - 1) {
      return pendingBatches[idx + 1];
    }
    if (pendingBatches.length > 0 && pendingBatches[0].id !== currentId) {
      return pendingBatches[0];
    }
    return null;
  }, [pendingBatches]);

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
      setActualQty(batch.actualQty ?? batch.systemQty);
      setLastConfirmMsg('');
      console.log('[Scan] 找到批次:', batch.productName, 'isChecked:', batch.isChecked);
      if (batch.isChecked) {
        Taro.showToast({ title: '此批次已巡检，可更新数据', icon: 'none' });
      }
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

    const wasChecked = currentBatch.isChecked;
    console.log('[Scan] 确认巡检:', currentBatch.id, 'wasChecked:', wasChecked, '实际数量:', actualQty, '连续模式:', continuousMode);

    const online = await checkNetwork();
    setOnline(online);

    const checkData = {
      batchId: currentBatch.id,
      actualQty,
      checkTime: new Date().toISOString(),
      operator: currentUser.name,
      isUpdate: wasChecked
    };

    if (!online) {
      saveToOffline(`check_${currentBatch.id}_${Date.now()}`, checkData);
      setOfflineSyncCount(getOfflineCount());
    }

    const isFirstTime = checkBatch(currentBatch.id, actualQty);

    if (!online) {
      const msg = wasChecked ? '数据已更新（待同步）' : '已完成巡检（待同步）';
      setLastConfirmMsg(msg);
      Taro.showToast({ title: msg, icon: 'none' });
      if (continuousMode) {
        setTimeout(() => goToNextBatch(currentBatch.id), 600);
      }
      return;
    }

    if (isFirstTime) {
      if (actualQty !== currentBatch.systemQty) {
        Taro.showModal({
          title: '账实不符',
          content: `系统记录${currentBatch.systemQty}支，实际${actualQty}支，是否立即上报异常？`,
          confirmText: '去上报',
          cancelText: '暂不上报',
          success: (res) => {
            if (res.confirm) {
              Taro.setStorageSync('reportBatch', currentBatch);
              Taro.switchTab({ url: '/pages/report/index' });
            } else if (continuousMode) {
              goToNextBatch(currentBatch.id);
            } else {
              setLastConfirmMsg('✓ 首次巡检完成');
              Taro.showToast({ title: '巡检完成 ✓', icon: 'success' });
            }
          }
        });
      } else if (continuousMode) {
        setLastConfirmMsg('✓ 已完成，跳下一个');
        Taro.showToast({ title: '巡检完成 ✓', icon: 'success' });
        setTimeout(() => goToNextBatch(currentBatch.id), 500);
      } else {
        setLastConfirmMsg('✓ 首次巡检完成');
        Taro.showToast({ title: '巡检完成 ✓', icon: 'success' });
      }
    } else {
      setLastConfirmMsg('数据已更新（不重复计数）');
      Taro.showToast({ title: '数据已更新', icon: 'none' });
      if (continuousMode) {
        setTimeout(() => goToNextBatch(currentBatch.id), 500);
      }
    }
  };

  const goToNextBatch = (currentId: string) => {
    const next = findNextBatch(currentId);
    if (next) {
      console.log('[Scan] 连续盘点，跳到下一个:', next.id, next.productName);
      setCurrentBatch(next);
      setActualQty(next.systemQty);
      setLastConfirmMsg('');
      Taro.vibrateShort?.({ type: 'light' });
    } else {
      console.log('[Scan] 没有更多待巡检批次');
      setLastConfirmMsg('🎉 本区域已全部盘完！');
      Taro.showToast({ title: '全部完成 🎉', icon: 'success' });
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
    setLastConfirmMsg('');
  };

  const hasQtyDiff = currentBatch && actualQty !== currentBatch.systemQty;

  const pendingInLocation = pendingBatches.length;
  const totalInLocation = allBatchesSorted.length;
  const completedInLocation = totalInLocation - pendingInLocation;

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

      <View className={styles.modeBar}>
        <View className={styles.modeLeft}>
          <Text
            className={classnames(styles.modeSwitch, continuousMode && styles.modeOn)}
            onClick={() => setContinuousMode(!continuousMode)}
          >
            <Text className={styles.modeDot}>{continuousMode ? '●' : '○'}</Text>
            连续盘点
          </Text>
          <Text className={styles.modeHint}>
            {continuousMode ? '确认后自动跳下一个' : '单条盘点模式'}
          </Text>
        </View>
        <View className={styles.progressMini}>
          <Text className={styles.progressMiniText}>
            {selectedLocation === 'all' ? '全部' : selectedLocation}
            : 已完成 <Text className={styles.progressMiniNum}>{completedInLocation}</Text>/{totalInLocation}
          </Text>
        </View>
      </View>

      <ScrollView scrollX className={styles.locationTabs}>
        {locationOptions.map((opt) => (
          <Button
            key={opt.key}
            className={classnames(styles.locationTab, selectedLocation === opt.key && styles.locationTabActive)}
            onClick={() => setSelectedLocation(opt.key)}
          >
            {opt.label}
          </Button>
        ))}
      </ScrollView>

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
            <View className={styles.detailHeaderLeft}>
              <Text className={styles.detailProductName}>{currentBatch.productName}</Text>
              <Text className={styles.detailSpec}>{currentBatch.spec} · {currentBatch.batchNo}</Text>
            </View>
            {currentBatch.isChecked && (
              <View className={styles.checkedTag}>已巡检</View>
            )}
          </View>

          {lastConfirmMsg && (
            <View className={styles.confirmMsg}>{lastConfirmMsg}</View>
          )}

          {continuousMode && (
            <View className={styles.continuousInfo}>
              <Text className={styles.continuousLabel}>连续盘点进度</Text>
              <Text className={styles.continuousValue}>
                第 {completedInLocation + (currentBatch.isChecked ? 0 : 1)} 个 / 共 {totalInLocation} 个
              </Text>
            </View>
          )}

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
            {currentBatch.actualQty !== undefined && currentBatch.isChecked && (
              <View className={styles.detailRow}>
                <Text className={styles.detailLabel}>上次实盘</Text>
                <Text className={styles.detailValue}>{currentBatch.actualQty}支
                  {currentBatch.actualQty !== currentBatch.systemQty && (
                    <Text className={styles.diffSmall}> （差{Math.abs(currentBatch.actualQty - currentBatch.systemQty)}）</Text>
                  )}
                </Text>
              </View>
            )}
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
              {currentBatch.isChecked ? '更新数据' : '确认巡检'}
            </Button>
          </View>

          {continuousMode && pendingInLocation > 0 && (
            <View className={styles.skipRow}>
              <Button className={styles.skipBtn} onClick={() => {
                const next = findNextBatch(currentBatch.id);
                if (next) {
                  setCurrentBatch(next);
                  setActualQty(next.systemQty);
                  setLastConfirmMsg('');
                }
              }}>
                跳过此批 →
              </Button>
            </View>
          )}

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

      {!currentBatch && allBatchesSorted.length > 0 && (
        <View className={styles.pendingList}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>
              {selectedLocation === 'all' ? '批次列表' : `${selectedLocation}批次`}
              （待巡检优先）
            </Text>
            <Text className={styles.sectionCount}>
              {pendingInLocation} 待 / {totalInLocation} 共
            </Text>
          </View>
          {allBatchesSorted.slice(0, 10).map((batch) => (
            <BatchItem
              key={batch.id}
              batch={batch}
              onClick={() => {
                setCurrentBatch(batch);
                setActualQty(batch.actualQty ?? batch.systemQty);
                setLastConfirmMsg('');
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ScanPage;
