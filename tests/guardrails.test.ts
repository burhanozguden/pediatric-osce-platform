import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyScoreCeiling, buildGuardrailReport } from '../src/lib/clinicalGuardrails';
import { getCase, listCases } from '../src/lib/data';
import { RUBRIC, RUBRIC_TOTAL, normalizeEvaluatorOutput } from '../src/lib/rubric';
import { analyzeRapport } from '../src/lib/rapport';
import { buildScorecard } from '../src/lib/scoring';
import type { ClinicalCase, TranscriptMessage } from '../src/types';

function student(...texts: string[]): TranscriptMessage[] {
  return texts.map((content) => ({ role: 'student', content }));
}
function must(id: string): ClinicalCase {
  const c = getCase(id);
  if (!c) throw new Error(`vaka yok: ${id}`);
  return c;
}
function fatalIds(caseId: string, ...texts: string[]): string[] {
  return buildGuardrailReport(must(caseId), student(...texts)).fatalErrors.map((f) => f.id);
}

/* ---------------- İnek sütü ---------------- */
test('1 yaş altına inek sütü önerisi → hayati hata', () => {
  assert.deepEqual(fatalIds('tb-09m', 'Bebeğe günde iki bardak inek sütü verebilirsiniz.'), ['INFANT_COW_MILK']);
  assert.deepEqual(fatalIds('tb-07m', 'Akşamları sütü ekleyebilirsiniz'), ['INFANT_COW_MILK']);
  assert.deepEqual(fatalIds('tb-07m', 'İnek sütüyle pekmezi karıştırıp içirin.'), ['INFANT_COW_MILK']);
});

test('inek sütü: olumsuzlama, soru, erteleme, anne sütü/formül hata sayılmaz', () => {
  assert.deepEqual(fatalIds('tb-09m', 'Bebeğe inek sütü vermeyin.'), []);
  assert.deepEqual(fatalIds('tb-09m', 'İnek sütü bir yaşından önce verilmemeli.'), []);
  assert.deepEqual(fatalIds('tb-09m', 'İnek sütü verdiniz mi?'), []);
  assert.deepEqual(fatalIds('tb-09m', 'Bebeğiniz bir yaşını doldurduktan sonra inek sütü verebilirsiniz.'), []);
  assert.deepEqual(fatalIds('tb-09m', 'Anne sütüne devam edin, gece formül sütü verebilirsiniz.'), []);
  assert.deepEqual(fatalIds('tb-09m', 'Yoğurt verebilirsiniz ama inek sütü olmasın.'), []);
  assert.deepEqual(fatalIds('tb-09m', 'Süt ürünleri arasında yoğurt verebilirsiniz.'), []);
});

/* ---------------- Bal ---------------- */
test('1 yaş altına bal önerisi → hayati hata; bal kabağı/olumsuz değil', () => {
  assert.deepEqual(fatalIds('tb-07m', 'Pekmez yerine bal ekleyebilirsiniz.'), ['INFANT_HONEY']);
  assert.deepEqual(fatalIds('tb-07m', 'Bal vermeyin, botulizm riski var.'), []);
  assert.deepEqual(fatalIds('tb-07m', 'Bal kabağı püresi verebilirsiniz.'), []);
  assert.deepEqual(fatalIds('tb-07m', 'Balık da verebilirsiniz.'), []);
});

/* ---------------- Kwashiorkor ---------------- */
test('Kwashiorkorda OGA ile enerji hesabı → hayati hata', () => {
  assert.deepEqual(
    fatalIds('kwashiorkor-10m', 'OGA 8,6 kg, enerjiyi OGA üzerinden 100 kcal/kg ile hesaplayalım.'),
    ['KWASHIORKOR_OGA_OVERFEEDING'],
  );
  assert.deepEqual(fatalIds('kwashiorkor-10m', 'Bugün 150 kcal/kg ile başlayalım.'), ['KWASHIORKOR_OGA_OVERFEEDING']);
});

test('Kwashiorkorda doğru yaklaşım hata değil', () => {
  assert.deepEqual(fatalIds('kwashiorkor-10m', 'Ödem olduğu için OGA hesaplanmaz.'), []);
  assert.deepEqual(fatalIds('kwashiorkor-10m', 'Başlangıçta 70-80 kcal/kg ile başlıyorum.'), []);
  assert.deepEqual(fatalIds('kwashiorkor-10m', '10. gün 150 kcal/kg hedefine ulaşırız.'), []);
  assert.deepEqual(fatalIds('kwashiorkor-10m', 'OGA ile mi hesaplayalım?'), []);
});

/* ---------------- İshalde yağ ---------------- */
test('İshalde yağ kısıtlaması → hayati hata; doğru öneri hata değil', () => {
  assert.deepEqual(fatalIds('gastro-9m', 'İshal olduğu için yağlı yemekleri vermeyin.'), ['DIARRHEA_FAT_RESTRICTION']);
  assert.deepEqual(fatalIds('gastro-2y', 'Birkaç gün yağsız beslenin.'), ['DIARRHEA_FAT_RESTRICTION']);
  assert.deepEqual(fatalIds('gastro-2y', 'Yağsız yemek vermeyin, yağı kısıtlamayın.'), []);
  assert.deepEqual(fatalIds('gastro-2y', 'Yağı kesmeyin.'), []);
  assert.deepEqual(fatalIds('gastro-2y', 'Yağlı yemekleri kestiniz mi?'), []);
});

/* ---------------- Kural kapsamı ---------------- */
test('Kural yalnızca vakanın criticalRuleIds listesindeyse uygulanır', () => {
  assert.deepEqual(fatalIds('ckd-9y', 'Bal ve inek sütü verebilirsiniz.'), []);
  assert.deepEqual(fatalIds('gastro-2y', 'İnek sütü verebilirsiniz.'), []);
});

test('Ebeveyn mesajları taranmaz', () => {
  const t: TranscriptMessage[] = [
    { role: 'parent', content: 'Ben ona inek sütü veriyorum, bal da yediriyorum.' },
    { role: 'student', content: 'Anlıyorum, bunları konuşalım.' },
  ];
  assert.equal(buildGuardrailReport(must('tb-09m'), t).fatalErrors.length, 0);
});

/* ---------------- Uyarılar ---------------- */
test('Uyarılar', () => {
  assert.deepEqual(
    buildGuardrailReport(must('gastro-2y'), student('Beslenmeye devam edin.')).warnings.map((w) => w.id),
    ['GASTRO_NO_ORS'],
  );
  assert.deepEqual(buildGuardrailReport(must('gastro-2y'), student('ORS verin.')).warnings, []);
  assert.deepEqual(
    buildGuardrailReport(must('ckd-9y'), student('Protein kısıtı yapalım.')).warnings.map((w) => w.id),
    ['CKD_NO_POTASSIUM_PHOSPHORUS'],
  );
  assert.deepEqual(
    buildGuardrailReport(must('cmpa-9m'), student('Bebelac LF laktozsuz mama verebilirsiniz.')).warnings.map((w) => w.id),
    ['CMPA_LACTOSE_FREE_FORMULA'],
  );
});

/* ---------------- LLM bayrağı doğrulaması ---------------- */
test('LLM bayrağı: birebir alıntı yoksa veya olumsuzsa reddedilir', () => {
  const c = must('tb-09m');
  const ok = buildGuardrailReport(c, student('Her akşam bir bardak süt içirin.'), [
    { id: 'INFANT_COW_MILK', evidenceQuote: 'bir bardak süt içirin', reasoning: 'x' },
  ]);
  assert.equal(ok.fatalErrors.length, 1);

  const fake = buildGuardrailReport(c, student('Anne sütüne devam edin.'), [
    { id: 'INFANT_COW_MILK', evidenceQuote: 'inek sütü verin', reasoning: 'uydurma' },
  ]);
  assert.equal(fake.fatalErrors.length, 0);

  const neg = buildGuardrailReport(c, student('İnek sütü vermeyin.'), [
    { id: 'INFANT_COW_MILK', evidenceQuote: 'İnek sütü vermeyin', reasoning: 'yanlış' },
  ]);
  assert.equal(neg.fatalErrors.length, 0);

  const wrongCase = buildGuardrailReport(must('ckd-9y'), student('Bir bardak süt içirin.'), [
    { id: 'INFANT_COW_MILK', evidenceQuote: 'Bir bardak süt içirin', reasoning: 'x' },
  ]);
  assert.equal(wrongCase.fatalErrors.length, 0);
});

/* ---------------- Puanlama ---------------- */
test('Hayati hata → puan ≤ 59, başarısız, RED_ALERT', () => {
  const c = must('tb-09m');
  const report = buildGuardrailReport(c, student('İnek sütü verebilirsiniz.'));
  const perfect = normalizeEvaluatorOutput({
    categories: RUBRIC.map((cat) => ({
      id: cat.id,
      criteria: cat.criteria.map((k) => ({ id: k.id, score: k.maxPoints, justification: 'x', evidenceQuote: null })),
    })),
    criticalErrorFlags: [],
    strengths: [],
    improvements: [],
    summary: '',
  });
  const card = buildScorecard({ clinicalCase: c, personaId: 'anxious-mother', draft: perfect, report });
  assert.equal(card.uncappedScore, 100);
  assert.equal(card.overallScore, 59);
  assert.equal(card.passed, false);
  assert.equal(card.seal, 'RED_ALERT');
  assert.ok(card.redAlert);
  assert.equal(applyScoreCeiling(100, report), 59);
});

test('Hata yoksa 60 ve üzeri geçer; rubrik toplamı 100', () => {
  assert.equal(RUBRIC_TOTAL, 100);
  const c = must('tb-09m');
  const report = buildGuardrailReport(c, student('Merhaba, anlatır mısınız?'));
  const draft = normalizeEvaluatorOutput({
    categories: [{ id: 'anamnesis', criteria: [{ id: 'an-1', score: 99, justification: '', evidenceQuote: null }] }],
    criticalErrorFlags: [],
    strengths: [],
    improvements: [],
    summary: '',
  });
  // Puan kırpma: an-1 maks 6; diğerleri eksik → 0.
  assert.equal(draft.categories[0]?.score, 6);
  const card = buildScorecard({ clinicalCase: c, personaId: 'anxious-mother', draft, report });
  assert.equal(card.seal, 'FAILED');
});

/* ---------------- Rapport ---------------- */
test('Rapport seviyesi açık soru ve empatiyle yükselir', () => {
  assert.equal(analyzeRapport(student('Kilosu kaç?')).disclosureLevel, 0);
  assert.equal(analyzeRapport(student('Bana biraz anlatır mısınız?')).disclosureLevel, 1);
  const rich = analyzeRapport(
    student(
      'Merhaba, nasıl yardımcı olabilirim?',
      'Çok endişelendiğinizi anlıyorum.',
      'Yani gece sık uyanıyor, doğru mu anladım?',
      'Beslenmesini nasıl sürdürüyorsunuz?',
    ),
  );
  assert.equal(rich.disclosureLevel, 2);
});

/* ---------------- Veri bütünlüğü ---------------- */
test('cases.json: kimlikler benzersiz, hedefler tutarlı', () => {
  const cases = listCases();
  assert.ok(cases.length >= 16);
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const c of cases) {
    assert.ok(c.energy.totalKcal.min <= c.energy.totalKcal.max, c.id);
    assert.ok(c.protein.totalG.min <= c.protein.totalG.max, c.id);
    assert.ok(c.disclosureFacts.some((f) => f.tier === 1), `${c.id}: tier 1 olgu yok`);
  }
  const kwash = must('kwashiorkor-10m');
  assert.equal(kwash.growth.ogaApplicable, false);
  assert.equal(kwash.energy.perKg?.min, 70);
  assert.equal(kwash.energy.perKg?.max, 80);
  // OGA formülü: 3200 + 6×800 + 5×500 = 10.5 kg
  assert.equal(must('marasmus-11m').growth.idealWeightKg, 10.5);
});
