import { create } from 'zustand';

export type Toast = {
  id: string;
  title: string;
  message: string;
  variant: 'info' | 'route' | 'alert';
  createdAt: number;
};

type NotificationStore = {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  toasts: [],
  push: (t) =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { ...t, id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, createdAt: Date.now() },
      ],
    })),
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
