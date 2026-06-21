import { create } from 'zustand';
import type { BatchInfo, AbnormalReport, ProcessApplication, StoreInspection, StoreRanking, DailyStats } from '@/types';
import { mockBatches, mockAbnormalReports, mockProcessApplications, mockStoreInspections, mockStoreRankings } from '@/data/mock';

const calcDailyStats = (batches: BatchInfo[]): DailyStats => {
  const checkedBatches = batches.filter((b) => b.isChecked).length;
  const pendingBatches = batches.length - checkedBatches;
  const abnormalBatches = batches.filter((b) => b.hasAbnormal).length;
  return {
    totalBatches: batches.length,
    checkedBatches,
    pendingBatches,
    abnormalBatches,
    expire30Days: batches.filter((b) => b.expireLevel === '30days').length,
    expire60Days: batches.filter((b) => b.expireLevel === '60days').length,
    expire90Days: batches.filter((b) => b.expireLevel === '90days').length
  };
};

const updateInspectionsByBatches = (
  batches: BatchInfo[],
  inspections: StoreInspection[]
): StoreInspection[] => {
  const fridgeLetterRegex = /冷藏柜([A-Z])/;
  const shelfLetterRegex = /货架([A-Z])/;

  return inspections.map((ins) => {
    const prefix = ins.type === 'fridge' ? '冷藏柜' : '货架';
    const letterMatch = ins.name.match(ins.type === 'fridge' ? fridgeLetterRegex : shelfLetterRegex);
    const letter = letterMatch ? letterMatch[1] : '';
    const locationPrefix = `${prefix}${letter}`;

    const relatedBatches = batches.filter((b) => b.location.startsWith(locationPrefix));
    const total = relatedBatches.length;
    const checked = relatedBatches.filter((b) => b.isChecked).length;
    const rate = total > 0 ? Math.round((checked / total) * 100) : 0;

    return {
      ...ins,
      totalBatches: total,
      checkedBatches: checked,
      completionRate: rate
    };
  });
};

interface AppState {
  batches: BatchInfo[];
  abnormalReports: AbnormalReport[];
  processApplications: ProcessApplication[];
  storeInspections: StoreInspection[];
  storeRankings: StoreRanking[];
  dailyStats: DailyStats;
  isOnline: boolean;
  offlineSyncCount: number;
  currentUser: { name: string; role: string };

  recalcDailyStats: () => void;
  recalcStoreInspections: () => void;
  checkBatch: (batchId: string, actualQty: number) => boolean;
  addAbnormalReport: (report: AbnormalReport) => void;
  addProcessApplication: (app: ProcessApplication, fromReportId?: string) => void;
  updateProcessStatus: (
    id: string,
    status: ProcessApplication['status'],
    approver?: string
  ) => void;
  linkAbnormalToProcess: (reportId: string, processId: string, action: ProcessApplication['action']) => void;
  setOnline: (online: boolean) => void;
  setOfflineSyncCount: (count: number) => void;
  setCurrentUser: (user: { name: string; role: string }) => void;
  getPendingBatches: () => BatchInfo[];
  getBatchesByExpireLevel: (level: BatchInfo['expireLevel']) => BatchInfo[];
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: mockBatches,
  abnormalReports: mockAbnormalReports,
  processApplications: mockProcessApplications,
  storeInspections: updateInspectionsByBatches(mockBatches, mockStoreInspections),
  storeRankings: mockStoreRankings,
  dailyStats: calcDailyStats(mockBatches),
  isOnline: true,
  offlineSyncCount: 0,
  currentUser: { name: '张护士', role: '库房值班护士' },

  recalcDailyStats: () => {
    const stats = calcDailyStats(get().batches);
    set({ dailyStats: stats });
    console.log('[Store] 重新计算 dailyStats:', stats);
  },

  recalcStoreInspections: () => {
    const { batches, storeInspections } = get();
    const updated = updateInspectionsByBatches(batches, storeInspections);
    set({ storeInspections: updated });
    console.log('[Store] 重新计算 storeInspections:', updated.map((i) => ({ name: i.name, rate: i.completionRate })));
  },

  checkBatch: (batchId, actualQty) => {
    const state = get();
    const targetBatch = state.batches.find((b) => b.id === batchId);
    if (!targetBatch) {
      console.error('[Store] checkBatch: 找不到批次', batchId);
      return false;
    }

    const wasChecked = targetBatch.isChecked;
    const wasAbnormal = targetBatch.hasAbnormal;
    const isNowAbnormal = actualQty !== targetBatch.systemQty;

    console.log('[Store] checkBatch:', {
      batchId,
      wasChecked,
      wasAbnormal,
      isNowAbnormal,
      actualQty,
      systemQty: targetBatch.systemQty
    });

    const newBatches = state.batches.map((b) =>
      b.id === batchId
        ? { ...b, isChecked: true, actualQty, hasAbnormal: isNowAbnormal }
        : b
    );

    const newDailyStats = calcDailyStats(newBatches);
    const newInspections = updateInspectionsByBatches(newBatches, state.storeInspections);

    set({
      batches: newBatches,
      dailyStats: newDailyStats,
      storeInspections: newInspections
    });

    return !wasChecked;
  },

  addAbnormalReport: (report) =>
    set((state) => {
      const exists = state.abnormalReports.some((r) => r.id === report.id);
      if (exists) {
        console.log('[Store] addAbnormalReport 跳过重复:', report.id);
        return state;
      }
      console.log('[Store] addAbnormalReport:', report.id, report.type);
      return {
        abnormalReports: [report, ...state.abnormalReports]
      };
    }),

  addProcessApplication: (app, fromReportId) =>
    set((state) => {
      const exists = state.processApplications.some((p) => p.id === app.id);
      if (exists) {
        console.log('[Store] addProcessApplication 跳过重复:', app.id);
        return state;
      }
      console.log('[Store] addProcessApplication:', app.id, app.action, 'fromReport:', fromReportId);

      let newAbnormalReports = state.abnormalReports;
      if (fromReportId) {
        newAbnormalReports = state.abnormalReports.map((r) =>
          r.id === fromReportId
            ? { ...r, status: 'processing', processId: app.id, processAction: app.action }
            : r
        );
        console.log('[Store] 已关联异常报告到处理申请:', fromReportId, '->', app.id);
      }

      return {
        processApplications: [app, ...state.processApplications],
        abnormalReports: newAbnormalReports
      };
    }),

  updateProcessStatus: (id, status, approver) =>
    set((state) => {
      console.log('[Store] updateProcessStatus:', id, status, '审批人:', approver);
      const now = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      const newApplications = state.processApplications.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              approver: approver || p.approver,
              approveTime: approver ? now : p.approveTime
            }
          : p
      );

      const newAbnormalReports = state.abnormalReports.map((r) =>
        r.processId === id ? { ...r, status } : r
      );

      console.log('[Store] 同步更新异常报告状态:', newAbnormalReports.filter((r) => r.processId === id).length, '条');

      return {
        processApplications: newApplications,
        abnormalReports: newAbnormalReports
      };
    }),

  linkAbnormalToProcess: (reportId, processId, action) =>
    set((state) => {
      console.log('[Store] linkAbnormalToProcess:', reportId, '->', processId, action);
      return {
        abnormalReports: state.abnormalReports.map((r) =>
          r.id === reportId
            ? { ...r, status: 'processing', processId, processAction: action }
            : r
        )
      };
    }),

  setOnline: (online) => {
    console.log('[Store] setOnline:', online);
    set({ isOnline: online });
  },

  setOfflineSyncCount: (count) => {
    console.log('[Store] setOfflineSyncCount:', count);
    set({ offlineSyncCount: count });
  },

  setCurrentUser: (user) => {
    console.log('[Store] setCurrentUser:', user);
    set({ currentUser: user });
  },

  getPendingBatches: () => get().batches.filter((b) => !b.isChecked),

  getBatchesByExpireLevel: (level) => get().batches.filter((b) => b.expireLevel === level)
}));
