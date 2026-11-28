<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppFeedback } from '@/design-system/feedback';
import AppInput from '@/design-system/AppInput.vue';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import WheelPicker from '@/components/form/WheelPicker.vue';
import ExerciseRecordFields from '@/components/form/ExerciseRecordFields.vue';
import type { ExerciseUnit } from '@baby-record/shared';
import SupplementPickerGrid from '@/components/form/SupplementPickerGrid.vue';
import { supplementApi } from '@/api/supplement';
import { supplementConfigApi } from '@/api/supplement-config';
import { activityApi } from '@/api/activity';
import { growthApi } from '@/api/growth';
import { applySupplementDefaults } from '@/design-system/supplement-config';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import type { SupplementConfigVo } from '@baby-record/shared';

type Category = 'supplement' | 'allergy' | 'exercise' | 'bath' | 'other' | 'height' | 'weight';

const router = useRouter();
const message = useAppFeedback();
const babyStore = useBabyStore();
const userStore = useUserStore();

const category = ref<Category>('supplement');
const categoryOptions: { label: string; value: Category; icon: string }[] = [
  { label: '补剂', value: 'supplement', icon: '💊' },
  { label: '辅食排敏', value: 'allergy', icon: '🔎' },
  { label: '运动', value: 'exercise', icon: '🤸' },
  { label: '洗澡', value: 'bath', icon: '🛁' },
  { label: '其他', value: 'other', icon: '✨' },
  { label: '身高', value: 'height', icon: '📏' },
  { label: '体重', value: 'weight', icon: '⚖️' },
];

const isSupplement = computed(() => category.value === 'supplement');
const isExercise = computed(() => category.value === 'exercise');
const exerciseTypes = ref<string[]>([]);
const exerciseAmount = ref<string | null>(null);
const exerciseUnit = ref<ExerciseUnit | null>(null);
const isGrowth = computed(() => category.value === 'height' || category.value === 'weight');
const isHeight = computed(() => category.value === 'height');

// 补剂表单
const supplements = ref<SupplementConfigVo[]>([]);
const selectedSupplementIds = ref<number[]>([]);
const selectedSupplement = computed(() =>
  supplements.value.find((item) => item.id === selectedSupplementIds.value[0]) ?? null,
);
const amount = ref('');
const unit = ref('');
const supplementTime = ref(Date.now());

watch(selectedSupplement, (config) => {
  if (!config) {
    amount.value = '';
    unit.value = '';
    return;
  }
  const defaults = applySupplementDefaults(config);
  amount.value = defaults.amount ?? '';
  unit.value = defaults.unit ?? '';
});

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

const heightIntegerOptions = Array.from({ length: 141 }, (_, offset) => ({
  label: String(20 + offset),
  value: 20 + offset,
}));
const weightIntegerOptions = Array.from({ length: 61 }, (_, value) => ({
  label: String(value),
  value,
}));
const digitOptions = Array.from({ length: 10 }, (_, value) => ({ label: String(value), value }));

const heightCm = computed(() => Number(`${heightInteger.value}.${heightDecimal.value}`));
const weightKg = computed(() => Number(`${weightInteger.value}.${weightDecimal.value}`));
const heightConfirmed = ref(false);
const weightConfirmed = ref(false);
const growthConfirmed = computed(() => isHeight.value ? heightConfirmed.value : weightConfirmed.value);
const growthValid = computed(() => isHeight.value ? heightCm.value >= 20 && heightCm.value <= 160 : weightKg.value >= 0.5 && weightKg.value <= 60);

const activityEventLabel: Record<Exclude<Category, 'supplement' | 'allergy' | 'height' | 'weight'>, string> = {
  exercise: '运动',
  bath: '洗澡',
  other: '其他',
};

const submitting = ref(false);
const saved = ref(false);

function selectCategory(value: Category) {
  if (value === 'allergy') router.push('/record/food-allergy');
  else category.value = value;
}

onMounted(async () => {
  try {
    supplements.value = await supplementConfigApi.list();
  } catch {
    supplements.value = [];
  }
});

watch(category, async (metric, _, onCleanup) => {
  if (metric !== 'height' && metric !== 'weight') return;
  const baby = babyStore.currentBaby;
  if (!baby || growthConfirmed.value) return;
  let active = true;
  onCleanup(() => { active = false; });
  try {
    const latest = await growthApi.latest(baby.id, metric);
    const value = latest?.[metric];
    if (!active || growthConfirmed.value || value == null) return;
    const [whole, decimal] = value.toFixed(1).split('.').map(Number);
    if (metric === 'height') {
      heightInteger.value = whole;
      heightDecimal.value = decimal;
    } else {
      weightInteger.value = whole;
      weightDecimal.value = decimal;
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
  if (submitting.value || saved.value) return;
  submitting.value = true;
  try {
    if (isSupplement.value) {
      if (!selectedSupplement.value) {
        message.warning('请先选择补剂');
        submitting.value = false;
        return;
      }
      await supplementApi.create({
        babyId: baby.id,
        name: selectedSupplement.value.name,
        amount: amount.value.trim() || undefined,
        unit: unit.value.trim() || undefined,
        takeTime: new Date(supplementTime.value).toISOString(),
        creatorId: user.id,
      });
    } else if (isGrowth.value) {
      if (!growthConfirmed.value || !growthValid.value) {
        message.warning(`请先确认本次${isHeight.value ? '身高' : '体重'}数值`);
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
    } else {
      await activityApi.create({
        babyId: baby.id,
        eventType: activityEventLabel[category.value as Exclude<Category, 'supplement' | 'allergy' | 'height' | 'weight'>],
        ...(isExercise.value && { exerciseTypes: exerciseTypes.value, amount: exerciseAmount.value, unit: exerciseUnit.value }),
        eventTime: new Date(activityTime.value).toISOString(),
        description: description.value || undefined,
        creatorId: user.id,
      });
    }
    saved.value = true;
    message.success('记录已保存');
    await router.push('/');
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
            @click="selectCategory(c.value)"
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
          <SupplementPickerGrid
            v-model="selectedSupplementIds"
            :supplements="supplements"
            :multiple="false"
            class="mt-3"
          />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">剂量</label>
          <div class="mt-2 grid grid-cols-2 gap-2 items-center">
            <AppInput v-model:value="amount" placeholder="剂量" />
            <AppInput v-model:value="unit" placeholder="单位" />
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
            <WheelPicker v-model="heightInteger" :options="heightIntegerOptions" @update:model-value="heightConfirmed = true" />
            <WheelPicker v-model="heightDecimal" :options="digitOptions" @update:model-value="heightConfirmed = true" />
          </div>
          <p class="text-xs text-ios-secondary text-center mt-3">有效范围 20.0 - 160.0 cm</p>
          <button v-if="!heightConfirmed" class="mt-3 w-full text-sm text-ios-blue" @click="heightConfirmed = true">确认当前身高</button>
        </div>
        <div v-else class="bg-ios-card rounded-3xl p-5 shadow-card">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-ios-secondary">⚖️ 体重</p>
            <p class="num-display text-xl font-bold text-ios-label">{{ weightKg.toFixed(1) }}<span class="text-xs font-normal text-ios-secondary ml-1">kg</span></p>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <WheelPicker v-model="weightInteger" :options="weightIntegerOptions" @update:model-value="weightConfirmed = true" />
            <WheelPicker v-model="weightDecimal" :options="digitOptions" @update:model-value="weightConfirmed = true" />
          </div>
          <p class="text-xs text-ios-secondary text-center mt-3">有效范围 0.5 - 60.0 kg</p>
          <button v-if="!weightConfirmed" class="mt-3 w-full text-sm text-ios-blue" @click="weightConfirmed = true">确认当前体重</button>
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">测量时间</label>
          <DateTimePicker v-model="growthTime" class="mt-2 w-full" />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">备注</label>
          <AppInput
            v-model:value="growthRemark"
            textarea
            :rows="2"
            placeholder="如：社区医院体检时测量"
            class="mt-2"
          />
        </div>
      </template>

      <!-- 活动表单 -->
      <template v-else>
        <ExerciseRecordFields v-if="isExercise" v-model:exercise-types="exerciseTypes" v-model:amount="exerciseAmount" v-model:unit="exerciseUnit" />
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">时间</label>
          <DateTimePicker v-model="activityTime" class="mt-2 w-full" />
        </div>
        <div class="bg-ios-card rounded-3xl p-4 shadow-card">
          <label class="text-sm font-medium text-ios-secondary">描述</label>
          <AppInput
            v-model:value="description"
            textarea
            :rows="2"
            placeholder="如：抬头坚持了 10 秒"
            class="mt-2"
          />
        </div>
      </template>

      <button
        data-testid="save-record"
        class="w-full py-3.5 rounded-2xl bg-ios-green text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting || saved || (isGrowth && (!growthConfirmed || !growthValid)) || (isSupplement && !selectedSupplement) || (isExercise && (!exerciseTypes.length || !exerciseAmount))"
        @click="onSubmit"
      >
        {{ saved ? '已保存' : submitting ? '保存中…' : '保存记录' }}
      </button>
    </div>
  </div>
</template>
