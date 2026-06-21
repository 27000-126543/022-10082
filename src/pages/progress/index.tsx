import React, { useState, useEffect } from 'react';
import { View, Text, Button, Input, Textarea, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import ProgressItem from '@/components/ProgressItem';
import type { BatchInfo, ProcessAction, ProcessApplication } from '@/types';
import { saveToOffline, checkNetwork, getOfflineCount } from '@/utils';

type TabType = 'all' | 'pending' | 'mine';

const ProgressPage: React.FC = () => {
  const {
    batches,
    processApplications,
    addProcessApplication,
    updateProcessStatus,
    currentUser,
    isOnline,
    setOfflineSyncCount
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [selectedAction, setSelectedAction] = useState<ProcessAction | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');

  const isHeadNurse = currentUser.role === '护士长';

  useEffect(() => {
    setOfflineSyncCount(getOfflineCount());
  }, [setOfflineSyncCount]);

  useEffect(() => {
    const processBatch = Taro.getStorageSync('processBatch');
    if (processBatch) {
      setSelectedBatch(processBatch);
      setQuantity(processBatch.systemQty);
      Taro.removeStorageSync('processBatch');
    }
  }, []);

  const nearExpireBatches = batches.filter((b) => b.daysLeft <= 90);

  const stats = {
    pending: processApplications.filter((p) => p.status === 'pending').length,
    approved: processApplications.filter((p) => p.status === 'approved').length,
    processing: processApplications.filter((p) => p.status === 'processing').length,
    done: processApplications.filter((p) => p.status === 'done').length
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: `待审批(${stats.pending})` },
    { key: 'mine', label: '我发起的' }
  ];

  const actionOptions: { key: ProcessAction; label: string }[] = [
    { key: 'transfer', label: '调拨' },
    { key: 'promotion', label: '促销消耗' },
    { key: 'loss', label: '报损' }
  ];

  const filteredApps = processApplications.filter((app) => {
    switch (activeTab) {
      case 'pending':
        return app.status === 'pending';
      case 'mine':
        return app.applicant === currentUser.name;
      default:
        return true;
    }
  });

  const handleSelectBatch = () => {
    console.log('[Progress] 选择批次');
    const options = nearExpireBatches.map(
      (b) => `${b.productName} - 剩余${b.daysLeft}天`
    );
    if (options.length === 0) {
      Taro.showToast({ title: '暂无可处理批次', icon: 'none' });
      return;
    }
    Taro.showActionSheet({
      itemList: options,
      success: (res) => {
        const batch = nearExpireBatches[res.tapIndex];
        setSelectedBatch(batch);
        setQuantity(batch.systemQty);
      }
    });
  };

  const handleQtyChange = (value: string) => {
    const num = parseInt(value) || 0;
    setQuantity(Math.max(0, num));
  };

  const handleQtyMinus = () => setQuantity((prev) => Math.max(0, prev - 1));
  const handleQtyPlus = () => setQuantity((prev) => prev + 1);

  const handleSubmit = async () => {
    if (!selectedBatch) {
      Taro.showToast({ title: '请选择批次', icon: 'none' });
      return;
    }
    if (!selectedAction) {
      Taro.showToast({ title: '请选择处理方式', icon: 'none' });
      return;
    }
    if (quantity <= 0) {
      Taro.showToast({ title: '请输入处理数量', icon: 'none' });
      return;
    }
    if (!reason.trim()) {
      Taro.showToast({ title: '请填写处理原因', icon: 'none' });
      return;
    }

    console.log('[Progress] 提交申请:', {
      batch: selectedBatch.id,
      action: selectedAction,
      quantity,
      reason
    });

    const application: ProcessApplication = {
      id: `P${Date.now()}`,
      batchId: selectedBatch.id,
      productName: selectedBatch.productName,
      batchNo: selectedBatch.batchNo,
      action: selectedAction,
      quantity,
      reason: reason.trim(),
      applicant: currentUser.name,
      applyTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'pending'
    };

    const online = await checkNetwork();
    if (!online) {
      saveToOffline(`process_${application.id}`, application);
      setOfflineSyncCount(getOfflineCount());
    }

    addProcessApplication(application);

    Taro.showToast({ title: online ? '申请已提交' : '已暂存，待联网补传', icon: 'success' });

    setSelectedBatch(null);
    setSelectedAction(null);
    setQuantity(0);
    setReason('');
  };

  const handleApprove = (id: string) => {
    if (!isHeadNurse) {
      Taro.showToast({ title: '仅护士长可审批', icon: 'none' });
      return;
    }
    console.log('[Progress] 批准申请:', id, '审批人:', currentUser.name);
    Taro.showModal({
      title: '确认批准',
      content: `确定批准此处理申请吗？\n审批人：${currentUser.name}（护士长）`,
      success: (res) => {
        if (res.confirm) {
          updateProcessStatus(id, 'approved', currentUser.name);
          Taro.showToast({ title: '已批准', icon: 'success' });
        }
      }
    });
  };

  const handleReject = (id: string) => {
    if (!isHeadNurse) {
      Taro.showToast({ title: '仅护士长可审批', icon: 'none' });
      return;
    }
    console.log('[Progress] 驳回申请:', id, '审批人:', currentUser.name);
    Taro.showModal({
      title: '确认驳回',
      content: `确定驳回此处理申请吗？\n审批人：${currentUser.name}（护士长）`,
      success: (res) => {
        if (res.confirm) {
          updateProcessStatus(id, 'rejected', currentUser.name);
          Taro.showToast({ title: '已驳回', icon: 'none' });
        }
      }
    });
  };

  const canSubmit = selectedBatch && selectedAction && quantity > 0 && reason.trim();

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>处理进度</Text>
        <Text className={styles.headerSubtitle}>调拨 · 促销消耗 · 报损 一站式管理</Text>
        <View className={styles.headerRole}>
          <Text className={styles.roleText}>当前身份：{currentUser.name}（{currentUser.role}）</Text>
          {!isHeadNurse && (
            <Text className={styles.roleHint}>· 待审批内容仅护士长可操作</Text>
          )}
          {isHeadNurse && (
            <Text className={styles.roleHintPower}>✓ 您有审批权限</Text>
          )}
        </View>
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statItem}>
          <Text className={classnames(styles.statValue, styles.valuePending)}>{stats.pending}</Text>
          <Text className={styles.statLabel}>待审批</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={classnames(styles.statValue, styles.valueApproved)}>{stats.approved}</Text>
          <Text className={styles.statLabel}>已批准</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={classnames(styles.statValue, styles.valueProcessing)}>{stats.processing}</Text>
          <Text className={styles.statLabel}>处理中</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={classnames(styles.statValue, styles.valueDone)}>{stats.done}</Text>
          <Text className={styles.statLabel}>已完成</Text>
        </View>
      </View>

      <View className={styles.applySection}>
        <Text className={styles.sectionTitle}>发起处理申请</Text>

        {selectedBatch ? (
          <View
            className={classnames(styles.selectBatch, styles.selected)}
            onClick={handleSelectBatch}
          >
            <Text className={styles.batchName}>{selectedBatch.productName}</Text>
            <Text className={styles.batchInfo}>
              {selectedBatch.spec} · 批号 {selectedBatch.batchNo} · 剩余{selectedBatch.daysLeft}天 · 库存{selectedBatch.systemQty}支
            </Text>
          </View>
        ) : (
          <View className={styles.selectBatch} onClick={handleSelectBatch}>
            <Text className={styles.placeholder}>点击选择近效期产品批次 →</Text>
          </View>
        )}

        <View className={styles.actionOptions}>
          {actionOptions.map((opt) => (
            <Button
              key={opt.key}
              className={classnames(
                styles.actionOption,
                selectedAction === opt.key && styles.actionActive
              )}
              onClick={() => setSelectedAction(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </View>

        <View className={styles.qtyRow}>
          <Text className={styles.qtyLabel}>处理数量</Text>
          <View className={styles.qtyInputWrap}>
            <Button className={styles.qtyBtn} onClick={handleQtyMinus}>−</Button>
            <Input
              className={styles.qtyInput}
              type="number"
              value={String(quantity)}
              onInput={(e) => handleQtyChange(e.detail.value)}
            />
            <Button className={styles.qtyBtn} onClick={handleQtyPlus}>+</Button>
          </View>
        </View>

        <Text className={styles.descLabel}>处理原因</Text>
        <Textarea
          className={styles.descInput}
          placeholder="请详细说明处理原因，如调拨目标门店、促销方案、报损原因等..."
          value={reason}
          onInput={(e) => setReason(e.detail.value)}
          maxlength={300}
        />

        <Button
          className={styles.submitApplyBtn}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isOnline ? '提交申请' : '离线暂存，联网后补传'}
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
          </Button>
        ))}
      </View>

      <View className={styles.listSection}>
        <View className={styles.listTitle}>
          <Text className={styles.listTitleText}>处理记录</Text>
          <Text className={styles.listCount}>共 {filteredApps.length} 条</Text>
        </View>

        {activeTab === 'pending' && !isHeadNurse && (
          <View className={styles.permissionHint}>
            <Text className={styles.permissionIcon}>🔒</Text>
            <Text className={styles.permissionText}>您当前为值班护士，仅可查看状态，审批需护士长操作</Text>
          </View>
        )}

        <ScrollView>
          {filteredApps.length > 0 ? (
            filteredApps.map((app) => (
              <ProgressItem
                key={app.id}
                app={app}
                showApprove={activeTab === 'pending' && isHeadNurse}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>暂无处理记录</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default ProgressPage;
