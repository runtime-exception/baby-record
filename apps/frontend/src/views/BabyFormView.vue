<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAppFeedback } from '@/design-system/feedback';
import AppDatePicker from '@/design-system/AppDatePicker.vue';
import AppInput from '@/design-system/AppInput.vue';
import AppNumberInput from '@/design-system/AppNumberInput.vue';
import AppHeader from '@/components/AppHeader.vue';
import TypeSegment from '@/components/form/TypeSegment.vue';
import { babyApi } from '@/api/baby';
import { useBabyStore } from '@/stores/baby';
import { isFutureDate } from '@/utils/date-picker';
import { GENDER_LABELS, USER_ROLE_LABELS, type Gender, type UserRole } from '@baby-record/shared';

const router = useRouter();
const route = useRoute();
const message = useAppFeedback();
const babyStore = useBabyStore();

const isEdit = computed(() => route.name === 'baby-edit');
const title = computed(() => (isEdit.value ? '编辑宝宝' : '新增宝宝'));

const name = ref('');
const memberName = ref('');
const role = ref<UserRole>('DAD');
const nickname = ref('');
const gender = ref<Gender>('MALE');
const birthday = ref(Date.now());
const birthWeight = ref<number | null>(null);
const birthHeight = ref<number | null>(null);
const headCircumference = ref<number | null>(null);
const birthHospital = ref('');
const remark = ref('');
const submitting = ref(false);

const genderOptions: { label: string; value: Gender }[] = [
  { label: GENDER_LABELS.MALE, value: 'MALE' },
  { label: GENDER_LABELS.FEMALE, value: 'FEMALE' },
];

onMounted(() => {
  if (isEdit.value && babyStore.currentBaby) {
    const b = babyStore.currentBaby;
    name.value = b.name;
    nickname.value = b.nickname || '';
    gender.value = b.gender;
    birthday.value = new Date(b.birthday + 'T00:00:00').getTime();
    birthWeight.value = b.birthWeight;
    birthHeight.value = b.birthHeight;
    headCircumference.value = b.headCircumference;
    birthHospital.value = b.birthHospital || '';
    remark.value = b.remark || '';
  }
});

function formatLocalDate(value: number) {
  const day = new Date(value);
  return [day.getFullYear(), day.getMonth() + 1, day.getDate()].map((part) => String(part).padStart(2, '0')).join('-');
}

async function onSubmit() {
  if (!name.value.trim()) {
    message.warning('请输入宝宝姓名');
    return;
  }
  if (!isEdit.value && !memberName.value.trim()) {
    message.warning('请输入你的显示名称');
    return;
  }
  const baby = babyStore.currentBaby;
  submitting.value = true;
  try {
    const payload = {
      name: name.value.trim(),
      nickname: nickname.value || undefined,
      gender: gender.value,
      birthday: formatLocalDate(birthday.value),
      birthWeight: birthWeight.value ?? undefined,
      birthHeight: birthHeight.value ?? undefined,
      headCircumference: headCircumference.value ?? undefined,
      birthHospital: birthHospital.value || undefined,
      remark: remark.value || undefined,
    };
    if (isEdit.value && baby) {
      await babyApi.update(baby.id, payload);
      message.success('宝宝信息已更新');
      await babyStore.loadBabies();
      router.push('/profile');
    } else {
      const created = await babyApi.create({ ...payload, memberName: memberName.value.trim(), role: role.value });
      await babyStore.loadBabies();
      babyStore.setCurrentBaby(created.id);
      message.success('宝宝已添加');
      router.push('/');
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div>
    <AppHeader :title="title" show-back />
    <div class="mx-auto max-w-app px-5 mt-4 space-y-3 pb-8">
      <div v-if="!isEdit" class="space-y-2 rounded-3xl bg-ios-card p-4 shadow-card">
        <label for="member-name" class="text-sm">你的显示名称</label>
        <input id="member-name" v-model="memberName" maxlength="40" class="block w-full rounded-xl bg-ios-bg p-2" />
        <label for="member-role" class="text-sm">你与宝宝的关系</label>
        <select id="member-role" v-model="role" class="block w-full rounded-xl bg-ios-bg p-2">
          <option v-for="(label, key) in USER_ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">姓名</label>
        <AppInput v-model:value="name" placeholder="请输入宝宝姓名" class="mt-2" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">昵称</label>
        <AppInput v-model:value="nickname" placeholder="选填" class="mt-2" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">性别</label>
        <TypeSegment v-model="gender" :options="genderOptions" class="mt-2" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">出生日期</label>
        <AppDatePicker
          v-model:value="birthday"
          type="date"
          class="mt-2 w-full"
          :is-date-disabled="isFutureDate"
        />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card grid grid-cols-3 gap-3">
        <div>
          <label class="text-sm font-medium text-ios-secondary">体重(kg)</label>
          <AppNumberInput v-model:value="birthWeight" :min="0" :step="0.1" placeholder="3.5" class="mt-2 w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-ios-secondary">身高(cm)</label>
          <AppNumberInput v-model:value="birthHeight" :min="0" :step="0.5" placeholder="50" class="mt-2 w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-ios-secondary">头围(cm)</label>
          <AppNumberInput v-model:value="headCircumference" :min="0" :step="0.5" placeholder="34" class="mt-2 w-full" />
        </div>
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">出生医院</label>
        <AppInput v-model:value="birthHospital" placeholder="选填" class="mt-2" />
      </div>

      <div class="bg-ios-card rounded-3xl p-4 shadow-card">
        <label class="text-sm font-medium text-ios-secondary">备注</label>
        <AppInput v-model:value="remark" textarea :rows="2" placeholder="选填" class="mt-2" />
      </div>

      <button
        class="w-full py-3.5 rounded-2xl bg-ios-blue text-white font-semibold active:scale-95 transition-transform duration-150 disabled:opacity-60"
        :disabled="submitting"
        @click="onSubmit"
      >
        {{ submitting ? '保存中…' : isEdit ? '保存修改' : '添加宝宝' }}
      </button>
    </div>
  </div>
</template>
