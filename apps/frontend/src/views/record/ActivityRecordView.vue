<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NInput } from 'naive-ui';
import AppHeader from '@/components/AppHeader.vue';
import TypeSegment from '@/components/form/TypeSegment.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import { supplementApi } from '@/api/supplement';
import { activityApi } from '@/api/activity';
import { growthApi } from '@/api/growth';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';

type Category = 'supplement' | 'play' | 'headup' | 'turn' | 'bath' | 'other' | 'height' | 'weight';

const router = useRouter();
const message = useMessage();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashboardStore = useDashboardStore();

const category = ref<Category>('supplement');
const categoryOptions: { label: string; value: Category; icon: string }[] = [
  { label: '补剂', value: 'supplement', icon: '💊' },
  { label: '玩耍', value: 'play', icon: '🎮' },
  { label: '抬头', value: 'headup', icon: '👶' },
  { label: '翻身', value: 'turn', icon: '🔄' },
  { label: '洗澡', value: 'bath', icon: '🛁' },
  { label: '其他', value: 'other', icon: '✨' },
  { label: '身高', value: 'height', icon: '📏' },
  { label: '体重', value: 'weight', icon: '⚖️' },
];

const isSupplement = computed(() => category.value === 'supplement');
const isGrowth = computed(() => category.value === 'height' || category.value === 'weight');
const isHeight = computed(() => category.value === 'height');

// 补剂表单
const supplementName = ref('维生素D');
const supplementNameOptions = ['维生素D', 'DHA', '钙', '其他'].map((v) => ({ label: v, value: v }));
const customName = ref('');
const amount = ref(1);
const unit = ref('滴');
const supplementTime = ref(Date.now());

// 活动表单
const activityTime = ref(Date.now());
const description = ref('');

// 身高体重表单
const growthTime = ref(Date.now());
const heightInteger = ref(50);
const heightDecimal = ref(0);
const weightInteger = ref(3);
const weightDecimal = ref(5);
const growthRemark = ref('');

const heightIntegerOptions = Array.from({ length: 121 }, (_, offset) => ({
  label: String(30 + offset),
  value: 30 + offset,
}));
const weightIntegerOptions = Array.from({ length: 29 }, (_, offset) => ({
  label: String(2 + offset),
  value: 2 + offset,
}));
const digitOptions = Array.from({ length: 10 }, (_, value) => ({ label: String(value), value }));

const heightCm = computed(() => Number(`${heightInteger.value}.${heightDecimal.value}`));
const weightKg = computed(() => Number(`${weightInteger.value}.${weightDecimal.value}`));
/** 是否有历史测量回填了默认值 */
const prefilled = ref(false);
/** 滚轮是否被改动过（避免误存 50.0cm / 3.5kg 的初始占位） */
const growthTouched = ref(false);

const activityEventLabel: Record<Exclude<Category, 'supplement' | 'height' | 'weight'>, string> = {
  play: '玩耍',
  headup: '抬头',
  turn: '翻身',
  bath: '洗澡',
  other: '其他',
};

const submitting = ref(false);

// 进入页面时用最近一次测量回填默认值（与体温页一致）
onMounted(async () => {
  const baby = babyStore.currentBaby;
  if (!baby) return;
  try {
    const latest = await growthApi.latest(baby.id);
    if (latest) {
      prefilled.value = true;
      if (latest.height != null) {
        const [i, d] = latest.height.toFixed(1).split('.');
        heightInteger.value = Number(i);
        heightDecimal.value = Number(d);
      }
      if (latest.weight != null) {
        const [i, d] = latest.weight.toFixed(1).split('.');
        weightInteger.value = Number(i);
        weightDecimal.value = Number(d);
      }
    }
  } catch {
    // 网络异常时保留默认值
  }
});

async function onSubmit() {
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user) {
    message.error('请先选择宝宝与身份');
    return;
  }
  submitting.value = true;
  try {
    if (isSupplement.value) {
      const name = supplementName.value === '其他' ? customName.value.trim() : supplementName.value;
      if (!name) {
        message.warning('请输入补剂名称');
        submitting.value = false;
        return;
      }
      await supplementApi.create({
        babyId: baby.id,
        name,
        amount: String(amount.value),
        unit: unit.value || undefined,
        takeTime: new Date(supplementTime.value).toISOString(),
        creatorId: user.id,
      });
    } else if (isGrowth.value) {
      if (!prefilled.value && !growthTouched.value) {
        message.warning(`请先调整${isHeight.value ? '身高' : '体重'}数值`);
        submitting.value = false;
        return;
      }
      await growthApi.create({
        babyId: baby.id,
        ...(isHeight.value ? { height: heightCm.value } : { weight: weightKg.value }),
        measureTime: new Date(growthTime.value).toISOString(),
        remark: growthRemark.value.trim() || undefined,
        creatorId: user.id,
      });
      // 首页月龄旁会展示最新身高体重
      await dashboardStore.fetch(baby.id);
    } else {
      await activityApi.create({
        babyId: baby.id,
        eventType: activityEventLabel[category.value as Exclude<Category, 'supplement' | 'height' | 'weight'>],
        eventTime: new Date(activityTime.value).toISOString(),
        description: description.value || undefined,
        creatorId: user.id,
      });
    }
    message.success('记录已保存');
    router.push('/');
  } catch {
    // 错误已由拦截器提示
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <AppHeader title="其他记录" show-back />
    <div class="px-5 mt-4 space-y-3">
      <!-- 类型选择 -->
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">记录类型</label>
        <div class="mt-3 grid grid-cols-4 gap-2">
          <button
            v-for="c in categoryOptions"
            :key="c.value"
            type="button"
            class="py-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-200"
            :class="
              category === c.value
                ? 'bg-ios-green text-white shadow-card'
                : 'bg-ios-fill/50 text-ios-secondary'
            "
            @click="category = c.value"
          >
            <span class="text-xl">{{ c.icon }}</span>
            <span class="text-xs font-medium">{{ c.label }}</span>
          </button>
        </div>
      </div>

      <!-- 补剂表单 -->
      <template v-if="isSupplement">
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">补剂名称</label>
          <TypeSegment v-model="supplementName" :options="supplementNameOptions" class="mt-2" />
          <NInput
            v-if="supplementName === '其他'"
            v-model:value="customName"
            placeholder="请输入补剂名称"
            class="mt-2"
          />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">剂量</label>
          <div class="mt-2 grid grid-cols-3 gap-2 items-center">
            <WheelPicker v-model="amount" :options="Array.from({ length: 11 }, (_, value) => ({ label: String(value), value }))" class="col-span-2" />
            <NInput v-model:value="unit" placeholder="单位" />
          </div>
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">时间</label>
          <DateTimePicker v-model="supplementTime" class="mt-2 w-full" />
        </div>
      </template>

      <!-- 身高/体重表单 -->
      <template v-else-if="isGrowth">
        <div v-if="isHeight" class="bg-ios-card rounded-3xl p-5 shadow-card">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-ios-secondary">📏 身高</p>
            <p class="num-display text-xl font-bold text-ios-label">{{ heightCm.toFixed(1) }}<span class="text-xs font-normal text-ios-secondary ml-1">cm</span></p>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <WheelPicker v-model="heightInteger" :options="heightIntegerOptions" @update:model-value="growthTouched = true" />
            <WheelPicker v-model="heightDecimal" :options="digitOptions" @update:model-value="growthTouched = true" />
          </div>
          <p class="text-xs text-ios-secondary text-center mt-3">有效范围 30.0 - 150.0 cm</p>
        </div>
        <div v-else class="bg-ios-card rounded-3xl p-5 shadow-card">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-ios-secondary">⚖️ 体重</p>
            <p class="num-display text-xl font-bold text-ios-label">{{ weightKg.toFixed(1) }}<span class="text-xs font-normal text-ios-secondary ml-1">kg</span></p>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <WheelPicker v-model="weightInteger" :options="weightIntegerOptions" @update:model-value="growthTouched = true" />
            <WheelPicker v-model="weightDecimal" :options="digitOptions" @update:model-value="growthTouched = true" />
          </div>
          <p class="text-xs text-ios-secondary text-center mt-3">有效范围 2.0 - 30.0 kg</p>
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">测量时间</label>
          <DateTimePicker v-model="growthTime" class="mt-2 w-full" />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">备注</label>
          <NInput
            v-model:value="growthRemark"
            type="textarea"
            :autosize="{ minRows: 2 }"
            placeholder="如：社区医院体检时测量"
            class="mt-2"
          />
        </div>
      </template>

      <!-- 活动表单 -->
      <template v-else>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">时间</label>
          <DateTimePicker v-model="activityTime" class="mt-2 w-full" />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">描述</label>
          <NInput
            v-model:value="description"
            type="textarea"
            :autosize="{ minRows: 2 }"
            placeholder="如：抬头坚持了 10 秒"
            class="mt-2"
          />
        </div>
      </template>

      <button
        class="w-full py-3.5 rounded-2xl bg-ios-green text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ submitting ? '保存中…' : '保存记录' }}
      </button>
    </div>
  </div>
</template>
