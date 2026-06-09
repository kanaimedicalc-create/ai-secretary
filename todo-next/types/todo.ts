export type Priority = 'high' | 'medium' | 'low';
export type Filter = 'all' | 'pending' | 'done';

export interface Todo {
  id: string;
  title: string;
  memo: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}
