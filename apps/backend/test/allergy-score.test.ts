import assert from 'node:assert/strict';
import { FoodAllergyObservations, scoreAllergyObservations } from '../src/modules/food-allergy/allergy-score';

const all = (state: FoodAllergyObservations[keyof FoodAllergyObservations]): FoodAllergyObservations => ({
  hives: state,
  facialSwelling: state,
  immediateVomiting: state,
  persistentCough: state,
  breathingAbnormal: state,
  repetitiveVomiting: state,
  pallor: state,
  lethargy: state,
  eczemaWorsened: state,
  delayedVomiting: state,
  diarrhea: state,
});

assert.deepEqual(scoreAllergyObservations(all('NO')), {
  score: 0,
  conclusion: 'NOT_ALLERGIC',
  urgent: false,
});
assert.equal(scoreAllergyObservations(all('UNOBSERVED')).conclusion, 'POSSIBLE');

const breathing = all('NO');
breathing.breathingAbnormal = 'YES';
assert.deepEqual(scoreAllergyObservations(breathing), { score: 10, conclusion: 'ALLERGIC', urgent: true });

const combined = all('NO');
combined.hives = 'YES';
combined.immediateVomiting = 'YES';
assert.deepEqual(scoreAllergyObservations(combined), { score: 8, conclusion: 'ALLERGIC', urgent: false });

const fpies = all('NO');
fpies.repetitiveVomiting = 'YES';
fpies.pallor = 'YES';
assert.deepEqual(scoreAllergyObservations(fpies), { score: 9, conclusion: 'ALLERGIC', urgent: true });

console.log('allergy score tests passed');
