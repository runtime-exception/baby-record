<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { NInput, NSelect, useDialog, useMessage } from 'naive-ui';
import { useRoute, useRouter } from 'vue-router';
import AppHeader from '@/components/AppHeader.vue';
import DateTimePicker from '@/components/form/DateTimePicker.vue';
import { foodApi } from '@/api/food';
import { foodAllergyApi } from '@/api/food-allergy';
import { useBabyStore } from '@/stores/baby';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import {
  ALLERGY_CONCLUSION_LABELS,
  ALLERGY_SYMPTOMS,
  OBSERVATION_STATE_LABELS,
  scoreAllergyObservations,
  type AllergyConclusion,
  type FoodAllergyObservations,
  type FoodAllergySymptom,
  type FoodVo,
  type ObservationState,
} from '@baby-record/shared';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const babyStore = useBabyStore();
const userStore = useUserStore();
const dashboardStore = useDashboardStore();
const editingId = computed(() => Number(route.params.id) || null);

const foods = ref<FoodVo[]>([]);
const foodId = ref<number | null>(null);
const originalFoodId = ref<number | null>(null);
const exposureTime = ref(Date.now());
const finalConclusion = ref<AllergyConclusion | null>(null);
const remark = ref('');
const submitting = ref(false);
const observations = reactive<FoodAllergyObservations>(
  Object.fromEntries(ALLERGY_SYMPTOMS.map((item) => [item.key, 'UNOBSERVED'])) as FoodAllergyObservations,
);

const windows = ['几分钟～2 小时', '约 1～4 小时', '数小时～3 天'] as const;
const stateOptions: ObservationState[] = ['YES', 'NO', 'UNOBSERVED'];
const conclusionOptions: AllergyConclusion[] = ['NOT_ALLERGIC', 'POSSIBLE', 'ALLERGIC'];
const scoreResult = computed(() => scoreAllergyObservations(observations));
const foodOptions = computed(() => foods.value.map((food) => ({ label: food.name, value: food.id })));

function symptomsFor(window: (typeof windows)[number]) {
  return ALLERGY_SYMPTOMS.filter((symptom) => symptom.window === window);
}

function setObservation(key: FoodAllergySymptom, state: ObservationState) {
  observations[key] = state;
}

async function load() {
  foods.value = await foodApi.list();
  if (!editingId.value) return;
  const record = await foodAllergyApi.detail(editingId.value);
  if (!foods.value.some((food) => food.id === record.food.id)) foods.value.push(record.food);
  foodId.value = record.foodId;
  originalFoodId.value = record.foodId;
  exposureTime.value = new Date(record.exposureTime).getTime();
  Object.assign(observations, record.observations);
  finalConclusion.value = record.finalConclusion;
  remark.value = record.remark || '';
}

async function save() {
  const baby = babyStore.currentBaby;
  const user = userStore.currentUser;
  if (!baby || !user) return message.error('请先选择宝宝与身份');
  const selectedFoodId = foodId.value;
  if (!selectedFoodId) return message.warning('请选择辅食');
  if (!finalConclusion.value) return message.warning('请确认最终结论');

  const run = async () => {
    submitting.value = true;
    try {
      const common = {
        exposureTime: new Date(exposureTime.value).toISOString(),
        observations: { ...observations },
        finalConclusion: finalConclusion.value!,
        remark: remark.value.trim() || undefined,
      };
      if (editingId.value) {
        await foodAllergyApi.update(editingId.value, {
          ...common,
          ...(selectedFoodId !== originalFoodId.value && { foodId: selectedFoodId }),
        });
      } else {
        await foodAllergyApi.create({
          ...common,
          babyId: baby.id,
          foodId: selectedFoodId,
          creatorId: user.id,
        });
      }
      await dashboardStore.fetch(baby.id);
      message.success(editingId.value ? '排敏记录已更新' : '排敏记录已保存');
      router.push(editingId.value ? '/history' : '/');
    } finally {
      submitting.value = false;
    }
  };

  if (finalConclusion.value !== scoreResult.value.conclusion) {
    dialog.warning({
      title: '结论与系统建议不同',
      content: `系统建议为“${ALLERGY_CONCLUSION_LABELS[scoreResult.value.conclusion]}”，仍按你的结论保存吗？`,
      positiveText: '按我的结论保存',
      negativeText: '返回检查',
      onPositiveClick: run,
    });
    return;
  }
  await run();
}

onMounted(load);
</script>

<template>
  <div>
    <AppHeader :title="editingId ? '编辑辅食排敏' : '辅食排敏'" subtitle="系统提示不替代医生诊断" show-back />
    <div class="px-5 mt-4 space-y-3">
      <section class="bg-ios-card rounded-3xl p-4 shadow-card space-y-4">
        <div>
          <label class="text-sm font-medium text-ios-secondary">辅食</label>
          <NSelect v-model:value="foodId" :options="foodOptions" filterable placeholder="请选择本次排敏的辅食" class="mt-2" />
        </div>
        <div>
          <label class="text-sm font-medium text-ios-secondary">进食时间</label>
          <DateTimePicker v-model="exposureTime" class="mt-2 w-full" />
        </div>
      </section>

      <section v-for="window in windows" :key="window" class="bg-ios-card rounded-3xl p-4 shadow-card">
        <h2 class="text-sm font-semibold text-ios-label">{{ window }}</h2>
        <div class="mt-3 space-y-4">
          <div v-for="symptom in symptomsFor(window)" :key="symptom.key">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-ios-label">{{ symptom.label }}</span>
              <span class="text-xs text-ios-secondary">是 = {{ symptom.score }} 分</span>
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2">
              <button
                v-for="state in stateOptions"
                :key="state"
                type="button"
                class="rounded-xl py-2 text-xs font-medium"
                :class="observations[symptom.key] === state ? (state === 'YES' ? 'bg-ios-pink text-white' : state === 'NO' ? 'bg-ios-green text-white' : 'bg-ios-orange text-white') : 'bg-ios-fill/60 text-ios-secondary'"
                @click="setObservation(symptom.key, state)"
              >{{ OBSERVATION_STATE_LABELS[state] }}</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="scoreResult.urgent" class="rounded-3xl bg-ios-pink/15 p-4 text-ios-pink shadow-card">
        <p class="font-bold">出现需要立即关注的症状</p>
        <p class="mt-1 text-sm leading-5">请停止继续喂食并立即寻求医疗帮助；如有呼吸异常等紧急情况，请拨打当地急救电话。</p>
      </section>

      <section class="bg-ios-card rounded-3xl p-4 shadow-card">
        <p class="text-sm text-ios-secondary">系统风险提示</p>
        <div class="mt-1 flex items-baseline justify-between">
          <span class="text-2xl font-bold text-ios-label">{{ scoreResult.score }} 分</span>
          <span class="font-bold" :class="scoreResult.conclusion === 'ALLERGIC' ? 'text-ios-pink' : scoreResult.conclusion === 'POSSIBLE' ? 'text-ios-orange' : 'text-ios-green'">建议：{{ ALLERGY_CONCLUSION_LABELS[scoreResult.conclusion] }}</span>
        </div>
        <p class="mt-2 text-xs leading-5 text-ios-secondary">该分数是应用内风险提示，不是临床诊断。湿疹或稀便等单次迟发表现也可能有其他原因。</p>
      </section>

      <section class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">你的最终结论（必选）</label>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button v-for="item in conclusionOptions" :key="item" type="button" class="rounded-2xl py-3 text-sm font-semibold" :class="finalConclusion === item ? (item === 'ALLERGIC' ? 'bg-ios-pink text-white' : item === 'POSSIBLE' ? 'bg-ios-orange text-white' : 'bg-ios-green text-white') : 'bg-ios-fill/60 text-ios-secondary'" @click="finalConclusion = item">{{ ALLERGY_CONCLUSION_LABELS[item] }}</button>
        </div>
      </section>

      <section class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">备注</label>
        <NInput v-model:value="remark" type="textarea" :autosize="{ minRows: 2 }" placeholder="选填，如进食量、照片位置、就医情况" class="mt-2" />
      </section>

      <button class="w-full rounded-2xl bg-ios-orange py-3.5 font-semibold text-white disabled:opacity-60" :disabled="submitting" @click="save">{{ submitting ? '保存中…' : '保存排敏记录' }}</button>
    </div>
  </div>
</template>
