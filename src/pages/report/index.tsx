import React, { useState, useEffect } from 'react';
import { View, Text, Button, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { useAppStore } from '@/store';
import type { BatchInfo, AbnormalType, AbnormalReport } from '@/types';
import { getAbnormalTypeText, getStatusText, saveToOffline, checkNetwork } from '@/utils';

const ReportPage: React.FC = () => {
  const { batches, abnormalReports, addAbnormalReport, currentUser, isOnline } = useAppStore();

  const [selectedBatch, setSelectedBatch] = useState<BatchInfo | null>(null);
  const [selectedType, setSelectedType] = useState<AbnormalType | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    const reportBatch = Taro.getStorageSync('reportBatch');
    if (reportBatch) {
      setSelectedBatch(reportBatch);
      Taro.removeStorageSync('reportBatch');
    }
  }, []);

  const abnormalTypes: { key: AbnormalType; label: string; icon: string }[] = [
    { key: 'label_blur', label: '标签模糊', icon: '🏷️' },
    { key: 'box_damaged', label: '外盒破损', icon: '📦' },
    { key: 'storage_wrong', label: '冷藏位置不符', icon: '🌡️' },
    { key: 'quantity_diff', label: '账实不符', icon: '📊' }
  ];

  const handleSelectBatch = () => {
    console.log('[Report] 选择批次');
    const batchOptions = batches.map((b) => `${b.productName} - ${b.batchNo}`);
    Taro.showActionSheet({
      itemList: batchOptions,
      success: (res) => {
        setSelectedBatch(batches[res.tapIndex]);
      }
    });
  };

  const handleChooseImage = async () => {
    if (photos.length >= 6) {
      Taro.showToast({ title: '最多上传6张图片', icon: 'none' });
      return;
    }
    console.log('[Report] 选择图片');
    try {
      const res = await Taro.chooseImage({
        count: 6 - photos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      setPhotos((prev) => [...prev, ...res.tempFilePaths]);
    } catch (error) {
      console.error('[Report] 选择图片失败:', error);
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      Taro.showToast({ title: '请选择批次', icon: 'none' });
      return;
    }
    if (!selectedType) {
      Taro.showToast({ title: '请选择异常类型', icon: 'none' });
      return;
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请描述异常情况', icon: 'none' });
      return;
    }

    console.log('[Report] 提交异常上报:', {
      batch: selectedBatch.id,
      type: selectedType,
      description,
      photos: photos.length
    });

    const report: AbnormalReport = {
      id: `R${Date.now()}`,
      batchId: selectedBatch.id,
      productName: selectedBatch.productName,
      batchNo: selectedBatch.batchNo,
      type: selectedType,
      description: description.trim(),
      photos,
      reporter: currentUser.name,
      reportTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      status: 'pending'
    };

    const online = await checkNetwork();
    if (!online) {
      saveToOffline(`report_${report.id}`, report);
    }

    addAbnormalReport(report);

    Taro.showToast({ title: '上报成功', icon: 'success' });

    setSelectedBatch(null);
    setSelectedType(null);
    setDescription('');
    setPhotos([]);
  };

  const canSubmit = selectedBatch && selectedType && description.trim();

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'processing':
        return styles.statusProcessing;
      case 'approved':
      case 'done':
        return styles.statusApproved;
      default:
        return styles.statusPending;
    }
  };

  return (
    <View className={styles.page}>
      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>选择批次</Text>
        {selectedBatch ? (
          <View
            className={classnames(styles.batchSelect, styles.selectedBatch)}
            onClick={handleSelectBatch}
          >
            <Text className={styles.batchProductName}>{selectedBatch.productName}</Text>
            <Text className={styles.batchMeta}>
              {selectedBatch.spec} · 批号 {selectedBatch.batchNo} · 剩余{selectedBatch.daysLeft}天
            </Text>
          </View>
        ) : (
          <View className={styles.batchSelect} onClick={handleSelectBatch}>
            <Text className={styles.selectPlaceholder}>点击选择出现异常的产品批次 →</Text>
          </View>
        )}
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>异常类型</Text>
        <View className={styles.typeGrid}>
          {abnormalTypes.map((type) => (
            <View
              key={type.key}
              className={classnames(
                styles.typeCard,
                selectedType === type.key && styles.typeCardActive
              )}
              onClick={() => setSelectedType(type.key)}
            >
              <Text className={styles.typeIcon}>{type.icon}</Text>
              <Text className={styles.typeName}>{type.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>详细描述</Text>
        <Text className={styles.textareaLabel}>请详细描述异常情况，包括数量、位置、发现时间等</Text>
        <Textarea
          className={styles.descInput}
          placeholder="例如：外盒有明显压痕，共3支包装破损，发现于冷藏柜A-01位置..."
          value={description}
          onInput={(e) => setDescription(e.detail.value)}
          maxlength={500}
        />
      </View>

      <View className={styles.photoSection}>
        <Text className={styles.sectionTitle}>拍照取证 ({photos.length}/6)</Text>
        <View className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <View key={index} className={styles.photoItem}>
              <Image className={styles.photoImg} src={photo} mode="aspectFill" />
              <View className={styles.photoDelete} onClick={() => handleDeletePhoto(index)}>
                ✕
              </View>
            </View>
          ))}
          {photos.length < 6 && (
            <View className={styles.addPhoto} onClick={handleChooseImage}>
              <Text className={styles.addIcon}>📷</Text>
              <Text className={styles.addText}>拍照/上传</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.historySection}>
        <Text className={styles.sectionTitle}>历史上报记录</Text>
        {abnormalReports.length > 0 ? (
          abnormalReports.map((report) => (
            <View key={report.id} className={styles.historyItem}>
              <View className={styles.historyHeader}>
                <View>
                  <Text className={styles.historyProduct}>{report.productName}</Text>
                  <Text className={styles.historyBatch}>批号 {report.batchNo}</Text>
                </View>
                <Text className={classnames(styles.statusBadge, getStatusClass(report.status))}>
                  {getStatusText(report.status)}
                </Text>
              </View>
              <View style={{ marginBottom: '16rpx' }}>
                <Text className={styles.typeBadge}>{getAbnormalTypeText(report.type)}</Text>
              </View>
              <Text className={styles.historyDesc}>{report.description}</Text>
              {report.photos.length > 0 && (
                <View className={styles.historyPhotos}>
                  {report.photos.slice(0, 4).map((photo, idx) => (
                    <Image
                      key={idx}
                      className={styles.historyPhoto}
                      src={photo}
                      mode="aspectFill"
                    />
                  ))}
                </View>
              )}
              <View className={styles.historyFooter}>
                <Text>上报人：{report.reporter}</Text>
                <Text>{report.reportTime}</Text>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyText}>暂无上报记录</Text>
          </View>
        )}
      </View>

      <Button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {isOnline ? '提交上报' : '离线暂存，联网后补传'}
      </Button>
    </View>
  );
};

export default ReportPage;
