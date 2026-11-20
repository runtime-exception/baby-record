import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
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
        path: 'profile/exercises',
        name: 'profile-exercises',
        component: () => import('@/views/ExerciseManagementView.vue'),
        meta: { tab: 'profile' },
      },
      {
        path: 'profile/supplements',
        name: 'profile-supplements',
        component: () => import('@/views/SupplementManagementView.vue'),
        meta: { tab: 'profile' },
      },
      {
        path: 'family/members',
        name: 'family-members',
        component: () => import('@/views/FamilyMembersView.vue'),
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
    path: '/baby/new',
    name: 'baby-new',
    component: () => import('@/views/BabyFormView.vue'),
  },
  {
    path: '/family/bind',
    name: 'family-bind',
    component: () => import('@/views/FamilyBindingView.vue'),
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

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!await auth.ensureChecked()) {
    return to.name === 'login' ? true : { name: 'login', query: { redirect: to.fullPath } };
  }

  const babies = useBabyStore();
  const guestRoutes = ['onboarding', 'baby-new', 'family-bind'];
  try {
    await babies.loadBabies();
  } catch {
    return false;
  }
  if (to.name === 'login') return { name: babies.currentBaby ? 'dashboard' : 'onboarding' };
  if (!babies.currentBaby && !guestRoutes.includes(String(to.name))) return { name: 'onboarding' };
  if (babies.currentBaby && to.name === 'onboarding') return { name: 'dashboard' };
  if (to.name === 'baby-edit' && !babies.currentBaby?.membership.isAdmin) return { name: 'profile' };
  return true;
});

export default router;
