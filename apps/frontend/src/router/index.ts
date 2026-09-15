import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { tab: 'home' },
      },
      {
        path: 'history',
        name: 'history',
        component: () => import('@/views/HistoryView.vue'),
        meta: { tab: 'home' },
      },
      {
        path: 'record',
        name: 'record',
        component: () => import('@/views/RecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/feeding',
        name: 'record-feeding',
        component: () => import('@/views/record/FeedingRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/temperature',
        name: 'record-temperature',
        component: () => import('@/views/record/TemperatureRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/diaper',
        name: 'record-diaper',
        component: () => import('@/views/record/DiaperRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/sleep',
        name: 'record-sleep',
        component: () => import('@/views/record/SleepRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/activity',
        name: 'record-activity',
        component: () => import('@/views/record/ActivityRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'record/food-allergy/:id?',
        name: 'record-food-allergy',
        component: () => import('@/views/record/FoodAllergyRecordView.vue'),
        meta: { tab: 'record' },
      },
      {
        path: 'statistics',
        name: 'statistics',
        component: () => import('@/views/StatisticsView.vue'),
        meta: { tab: 'statistics' },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { tab: 'profile' },
      },
      {
        path: 'profile/foods',
        name: 'profile-foods',
        component: () => import('@/views/FoodManagementView.vue'),
        meta: { tab: 'profile' },
      },
      {
        path: 'baby/new',
        name: 'baby-new',
        component: () => import('@/views/BabyFormView.vue'),
        meta: { tab: 'profile' },
      },
      {
        path: 'baby/edit',
        name: 'baby-edit',
        component: () => import('@/views/BabyFormView.vue'),
        meta: { tab: 'profile' },
      },
    ],
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 先校验服务端访问会话，再处理本地记录人身份选择
router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const authenticated = await authStore.ensureChecked();

  if (!authenticated && to.name !== 'login') {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (authenticated && to.name === 'login') {
    return { name: userStore.hasIdentity ? 'dashboard' : 'onboarding' };
  }
  // 刷新或直接打开深层路由时，确保页面挂载前已有宝宝上下文。
  if (authenticated && userStore.hasIdentity) {
    const babyStore = useBabyStore();
    if (!babyStore.babies.length && !babyStore.loading) {
      await babyStore.loadBabies();
    }
  }
  if (!userStore.hasIdentity && to.name !== 'onboarding' && to.name !== 'login') {
    return { name: 'onboarding' };
  }
  if (userStore.hasIdentity && to.name === 'onboarding') {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
