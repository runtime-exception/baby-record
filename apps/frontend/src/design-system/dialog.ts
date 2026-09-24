import type { VNodeChild } from 'vue';

export interface ConfirmOptions {
  title: string;
  content: string | (() => VNodeChild);
  positiveText?: string;
  negativeText?: string;
}

export interface AlertOptions {
  title: string;
  content: string | (() => VNodeChild);
  positiveText?: string;
}

export interface DialogRequest {
  id: number;
  kind: 'confirm' | 'alert';
  title: string;
  content: string | (() => VNodeChild);
  positiveText: string;
  negativeText?: string;
  resolve: (value: boolean) => void;
}

type DialogListener = (request: DialogRequest) => void;

const listeners = new Set<DialogListener>();
let nextId = 1;

function request(options: DialogRequest) {
  listeners.forEach((listener) => listener(options));
}

export const appDialog = {
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      request({
        id: nextId++,
        kind: 'confirm',
        title: options.title,
        content: options.content,
        positiveText: options.positiveText || '确定',
        negativeText: options.negativeText || '取消',
        resolve,
      });
    });
  },

  alert(options: AlertOptions): Promise<void> {
    return new Promise((resolve) => {
      request({
        id: nextId++,
        kind: 'alert',
        title: options.title,
        content: options.content,
        positiveText: options.positiveText || '知道了',
        resolve: () => resolve(),
      });
    });
  },
};

export function subscribeDialog(listener: DialogListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppDialog() {
  return appDialog;
}
