export type ObservationState = 'YES' | 'NO' | 'UNOBSERVED';
export type FoodAllergySymptom =
  | 'hives'
  | 'facialSwelling'
  | 'immediateVomiting'
  | 'persistentCough'
  | 'breathingAbnormal'
  | 'repetitiveVomiting'
  | 'pallor'
  | 'lethargy'
  | 'eczemaWorsened'
  | 'delayedVomiting'
  | 'diarrhea';
export type FoodAllergyObservations = Record<FoodAllergySymptom, ObservationState>;

export const ALLERGY_SYMPTOMS: { key: FoodAllergySymptom; label: string; score: number }[] = [
  { key: 'hives', label: '荨麻疹', score: 4 },
  { key: 'facialSwelling', label: '嘴唇、眼睑或面部肿胀', score: 8 },
  { key: 'immediateVomiting', label: '呕吐', score: 4 },
  { key: 'persistentCough', label: '突然持续咳嗽', score: 8 },
  { key: 'breathingAbnormal', label: '喘鸣或呼吸异常', score: 10 },
  { key: 'repetitiveVomiting', label: '反复、大量呕吐', score: 6 },
  { key: 'pallor', label: '脸色苍白', score: 3 },
  { key: 'lethargy', label: '异常嗜睡或精神明显变差', score: 3 },
  { key: 'eczemaWorsened', label: '湿疹明显加重', score: 1 },
  { key: 'delayedVomiting', label: '反复呕吐', score: 2 },
  { key: 'diarrhea', label: '腹泻', score: 1 },
];

export function scoreAllergyObservations(observations: FoodAllergyObservations) {
  const score = ALLERGY_SYMPTOMS.reduce(
    (total, symptom) => total + (observations[symptom.key] === 'YES' ? symptom.score : 0),
    0,
  );
  const hasYes = ALLERGY_SYMPTOMS.some((symptom) => observations[symptom.key] === 'YES');
  const hasUnobserved = ALLERGY_SYMPTOMS.some((symptom) => observations[symptom.key] === 'UNOBSERVED');
  const fpiesRedFlag =
    observations.repetitiveVomiting === 'YES' &&
    (observations.pallor === 'YES' || observations.lethargy === 'YES');
  const urgent =
    observations.facialSwelling === 'YES' ||
    observations.persistentCough === 'YES' ||
    observations.breathingAbnormal === 'YES' ||
    fpiesRedFlag;
  const conclusion = score >= 8 ? 'ALLERGIC' : hasYes || hasUnobserved ? 'POSSIBLE' : 'NOT_ALLERGIC';
  return { score, conclusion, urgent } as const;
}

export function positiveSymptomLabels(observations: FoodAllergyObservations): string[] {
  return ALLERGY_SYMPTOMS.filter((symptom) => observations[symptom.key] === 'YES').map(
    (symptom) => symptom.label,
  );
}
