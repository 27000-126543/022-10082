import { create } from 'zustand';
import type { BatchInfo, AbnormalReport, ProcessApplication, StoreInspection, StoreRanking, DailyStats } from '@/types';
import { mockBatches, mockAbnormalReports, mockProcessApplications, mockStoreInspections, mockStoreRankings, mockDailyStats } from '@/data/mock';

interface AppState {
  batches: BatchInfo[];
  abnormalReports: AbnormalReport[];
  processApplications: ProcessApplication[];
  storeInspections: StoreInspection[];
  storeRankings: StoreRanking[];
  dailyStats: DailyStats;
  isOnline: boolean;
  currentUser: { name: string; role: string };

  setBatches: (batches: BatchInfo[]) => void;
  checkBatch: (batchId: string, actualQty: number) => void;
  addAbnormalReport: (report: AbnormalReport) => void;
  addProcessApplication: (app: ProcessApplication) => void;
  updateProcessStatus: (id: string, status: ProcessApplication['status']) => void;
  setOnline: (online: boolean) => void;
  getPendingBatches: () => BatchInfo[];
  getBatchesByExpireLevel: (level: BatchInfo['expireLevel']) => BatchInfo[];
}

export const useAppStore = create<AppState>((set, get) => ({
  batches: mockBatches,
  abnormalReports: mockAbnormalReports,
  processApplications: mockProcessApplications,
  storeInspections: mockStoreInspections,
  storeRankings: mockStoreRankings,
  dailyStats: mockDailyStats,
  isOnline: true,
  currentUser: { name: '张护士', role: '库房值班护士' },

  setBatches: (batches) => set({ batches }),

  checkBatch: (batchId, actualQty) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId
          ? { ...b, isChecked: true, actualQty, hasAbnormal: actualQty !== b.systemQty }
          : b
      ),
      dailyStats: {
        ...state.dailyStats,
        checkedBatches: state.dailyStats.checkedBatches + 1,
        pendingBatches: state.dailyStats.pendingBatches - 1,
        abnormalBatches: actualQty !== state.batches.find((b) => b.id === batchId)?.systemQty
          ? state.dailyStats.abnormalBatches + 1
          : state.dailyStats.abnormalBatches
      }
    })),

  addAbnormalReport: (report) =>
    set((state) => ({
      abnormalReports: [report, ...state.abnormalReports]
    })),

  addProcessApplication: (app) =>
    set((state) => ({
      processApplications: [app, ...state.processApplications]
    })),

  updateProcessStatus: (id, status) =>
    set((state) => ({
      processApplications: state.processApplications.map((p) =>
        p.id === id ? { ...p, status } : p
      )
    })),

  setOnline: (online) => set({ isOnline: online }),

  getPendingBatches: () => get().batches.filter((b) => !b.isChecked),

  getBatchesByExpireLevel: (level) => get().batches.filter((b) => b.expireLevel === level)
}));
