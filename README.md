# Pediatrik Klinik Beslenme YZ OSCE Simülasyon Platformu (arka uç iskeleti)

BDB-UÇEP 2025 uyumlu, çift ajanlı (Sanal Ebeveyn + Akademik Değerlendirici) OSCE simülasyonu için
Next.js 14 (App Router) + TypeScript arka uç katmanı. **Arayüz (sohbet/karne ekranı, Tailwind) bu depoda yoktur.**

## Kurulum
```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY girin; model için ANTHROPIC_MODEL (varsayılan claude-sonnet-5-5)
npm run dev
npm test                     # guardrail, rubrik, rapport ve veri testleri
npm run generate:cases       # cases.json'u defter formüllerinden yeniden üretir (python3)
```

## GitHub Pages sürümü (sunucusuz web sitesi)
`docs/` klasörü, derlenmiş tek sayfalık bir sitedir (`docs/index.html` + `docs/app.js`). Kullanıcı kendi Anthropic API
anahtarını girer; istekler tarayıcıdan doğrudan Anthropic'e gider, bir sunucu ve gizli anahtar gerekmez.
Yayına almak için: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, Folder: `/docs`**.
Kod değiştirirseniz `npm run build:pages` ile `docs/app.js` yeniden üretilir ve depoya yüklenir.
Dikkat: vaka hedefleri sayfa kodunda yer aldığı için bu sürüm yalnızca alıştırma içindir, sınavda kullanılmaz.

## Uç noktalar (Next.js sunucu sürümü)
- `POST /api/chat` `{ caseId, personaId, messages[] }` → `{ reply, disclosureLevel, rapport }`
  Boş `messages` personanın açılış cümlesini döndürür. Son mesaj öğrenciye ait olmalıdır.
- `POST /api/evaluate` `{ caseId, personaId, transcript[] }` → `{ scorecard }`

## Mimari
| Dosya | Görev |
|---|---|
| `src/types/index.ts` | Tüm tipler |
| `src/data/cases.json` | 17 vaka (defter formüllerinden hesaplanmış hedefler) |
| `src/data/personas.json` | Kaygılı Anne, İhmalkâr Büyükanne, Uyumlu Ebeveyn |
| `src/lib/clinicalGuardrails.ts` | Deterministik hayati hata tarayıcı, ≤ 59 tavanı |
| `src/lib/rapport.ts` | OARS tabanlı kademeli bilgi açma (kodla) |
| `src/lib/rubric.ts` | 25/35/20/20 rubrik, JSON doğrulama, puan kırpma |
| `src/lib/prompts.ts` | Ajan 1 ve Ajan 2 sistem komutları |
| `src/lib/scoring.ts` | Nihai puan, mühür (PASSED/FAILED/RED_ALERT) |

İlkeler: toplam puan sunucuda kodla hesaplanır; LLM guardrail'i aşağı çekemez/yukarı itemez;
LLM'in hayati hata iddiası yalnızca öğrenci mesajından birebir alıntıyla ve olumsuzlama/soru/erteleme
filtresinden geçerse kabul edilir; izin verilmeyen vaka bilgisi ebeveyn komutuna hiç girmez.

## Sınırlar ve klinik uyarı
- **`cases.json` taslaktır** (`reviewStatus: draft_requires_dietitian_review`). El yazısı defterdeki
  tutarsızlıklar `verificationFlags` alanında işaretlidir; pilot kullanımdan önce uzman diyetisyen onayı gerekir.
- `notebookDerived: false` olgular (ebeveyn sosyal öyküleri) simülasyon için kurgudur.
- Guardrail Türkçe kural tabanlıdır; yeni ifade kalıpları için `tests/guardrails.test.ts` genişletilmelidir.
  Yakalanamayan paraphrase'ler yalnızca doğrulanmış LLM bayrağı ile yakalanır.
- Kimlik doğrulama, hız sınırlama ve kayıt tutma (KVKK) eklenmemiştir.
