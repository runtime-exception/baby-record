import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import AppProvider from '../AppProvider.vue';
import { appDialog } from '../dialog';
import { appFeedback } from '../feedback';
import AppDialogHost from '../AppDialogHost.vue';
import AppFeedbackHost from '../AppFeedbackHost.vue';

describe('design system feedback and dialog hosts', () => {
  it('renders feedback dispatched outside a component context', async () => {
    const wrapper = mount(AppProvider, {
      global: { plugins: [createPinia()] },
      slots: { default: () => h(AppFeedbackHost) },
    });

    appFeedback.success('已保存');
    await nextTick();

    expect(wrapper.text()).toContain('已保存');
  });

  it('resolves confirmed dialogs with true', async () => {
    const wrapper = mount(AppProvider, {
      global: { plugins: [createPinia()] },
      slots: { default: () => h(AppDialogHost) },
    });

    const result = appDialog.confirm({
      title: '删除记录',
      content: '删除后无法恢复',
      positiveText: '删除',
      negativeText: '取消',
    });
    await nextTick();

    const button = wrapper
      .findAll('button')
      .find((item) => item.text().includes('删除'));
    expect(button).toBeTruthy();
    await button!.trigger('click');

    await expect(result).resolves.toBe(true);
  });
});
