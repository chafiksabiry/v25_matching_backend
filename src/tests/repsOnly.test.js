// Run: node --test src/tests/repsOnly.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPS_ONLY, isNetworkRep, repsOnly } from '../utils/repsOnly.js';

test('REP du réseau : pas d’employeur', () => {
  assert.equal(isNetworkRep({ _id: 1 }), true);
  assert.equal(isNetworkRep({ _id: 2, employerCompanyId: null }), true);
  assert.equal(isNetworkRep({ _id: 3, employerCompanyId: '6aec6ce204be802031a73345' }), false);
});

test('filtre : la condition s’ajoute sans écraser les autres', () => {
  assert.deepEqual(REPS_ONLY, { employerCompanyId: null });
  assert.deepEqual(repsOnly(), { employerCompanyId: null });
  assert.deepEqual(repsOnly({ 'skills.technical': { $exists: true } }), { 'skills.technical': { $exists: true }, employerCompanyId: null });
});
