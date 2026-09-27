import { apiClient } from "./client";
import { INotification } from "@/types/complaint";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface NotificationsData {
  notifications: INotification[];
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(page = 1, limit = 20, unreadOnly = false): Promise<NotificationsData> {
    const res = await apiClient.get<ApiResponse<NotificationsData>>(
      `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`
    );
    return res.data.data || { notifications: [], unreadCount: 0 };
  },

  async markAsRead(id: string): Promise<INotification | undefined> {
    const res = await apiClient.patch<ApiResponse<INotification>>(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/notifications/read-all");
  },
};
