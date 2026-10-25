#!/usr/bin/env python3
"""
src/data/cases.json üreticisi.

Pediatrik klinik ders defterindeki formüller (OGA, kcal/kg, g/kg, ml/kg) burada
parametre olarak tutulur; toplamlar kodla hesaplanır. Böylece JSON içindeki
aritmetik elle yazılmaz ve defterdeki el yazısı okuma hatalarından etkilenmez.

Çalıştırma: python3 scripts/generate-cases.py
"""
import json
import os


def r1(x):
    return round(x + 1e-9, 1)


def rg(a, b):
    return {"min": a, "max": b}


def times(r, w):
    return {"min": r1(r["min"] * w), "max": r1(r["max"] * w)}


def oga_infant(da_g, months):
    """OGA = DA + (ilk 6 ay × 800 g) + (sonraki aylar × 500 g)."""
    first = min(months, 6)
    rest = max(months - 6, 0)
    return (da_g + first * 800 + rest * 500) / 1000.0


def oga_child(age_years):
    """1 yaş üzeri: OGA = yaş × 2 + 8."""
    return age_years * 2 + 8


def energy_perkg(perkg, basis, w, formula_text):
    return {
        "weightBasis": basis,
        "basisWeightKg": w,
        "perKg": perkg,
        "totalKcal": times(perkg, w),
        "formula": formula_text,
    }


def energy_total(total, basis, w, formula_text):
    return {
        "weightBasis": basis,
        "basisWeightKg": w,
        "perKg": {"min": r1(total["min"] / w), "max": r1(total["max"] / w)},
        "totalKcal": total,
        "formula": formula_text,
    }


def protein_perkg(perkg, basis, w, formula_text):
    return {
        "weightBasis": basis,
        "basisWeightKg": w,
        "perKg": perkg,
        "totalG": times(perkg, w),
        "formula": formula_text,
    }


def fluid_perkg(perkg, basis, w, formula_text):
    return {
        "weightBasis": basis,
        "basisWeightKg": w,
        "perKg": perkg,
        "totalMl": times(perkg, w),
        "formula": formula_text,
    }


def facts(case_id, items):
    out = []
    for i, (tier, topic, text, nb) in enumerate(items, 1):
        out.append({"id": f"{case_id}-f{i}", "tier": tier, "topic": topic, "text": text, "notebookDerived": nb})
    return out


# Ortak güvenlik listeleri -------------------------------------------------
AVOID_INFANT = [
    "İnek sütü (içecek olarak, 12 ay altı)",
    "Bal (12 ay altı)",
    "Yemeğe tuz/şeker ilavesi",
    "Boğulma riski taşıyan bütün/sert besinler",
]
INCLUDE_INFANT = [
    "Anne sütü/formül devamı",
    "Öğün sayısı, porsiyon ve kıvam (püre → parça) planı",
    "Demir/protein kaynağı (et, yumurta sarısı, yoğurt) ekleme sırası",
]


def inf_case(cid, title, months, da_g, sa_kg, basis, energy_rng, protein_rng, fluid_rng, **kw):
    oga = oga_infant(da_g, months)
    w = oga if basis == "OGA" else sa_kg
    energy_formula = (
        f"Enerji = ({energy_rng['min']:g}-{energy_rng['max']:g}) kcal/kg × {w:g} kg ({basis})"
    )
    protein_formula = f"Protein = ({protein_rng['min']:g}-{protein_rng['max']:g}) g/kg × {w:g} kg ({basis})"
    fluid_formula = f"Sıvı = ({fluid_rng['min']:g}-{fluid_rng['max']:g}) ml/kg × {w:g} kg ({basis})"
    return {
        "id": cid,
        "title": title,
        "patient": {
            "ageLabel": kw.pop("age_label"),
            "ageMonths": months,
            "sex": "unspecified",
            "parentRef": kw.pop("parent_ref", "bebeğim"),
            "birthWeightG": da_g,
            "currentWeightKg": sa_kg,
            "heightCm": None,
        },
        "growth": {
            "idealWeightKg": r1(oga) if oga == round(oga, 1) else round(oga, 3),
            "idealWeightFormula": f"OGA = {da_g} g + (min({months:g},6) × 800 g) + (max({months:g}-6,0) × 500 g) = {oga:g} kg",
            "ogaApplicable": True,
            "ogaNote": "1 yaş altı: DA + (ilk 6 ay × 800 g) + (sonraki aylar × 500 g).",
            "weightLossPercent": None,
        },
        "energy": energy_perkg(energy_rng, basis, w, energy_formula),
        "protein": protein_perkg(protein_rng, basis, w, protein_formula),
        "fluid": fluid_perkg(fluid_rng, basis, w, fluid_formula),
        **kw,
    }


CASES = []

# 1) Tamamlayıcı beslenme 6 ay ----------------------------------------------
c = inf_case(
    "tb-06m", "Tamamlayıcı Beslenme – 6 aylık (anne sütü alan)", 6, 3200, 7.75, "OGA",
    rg(103, 105), rg(2.1, 2.5), rg(150, 175),
    age_label="6 aylık", domain="complementary_feeding", condition="healthy_complementary",
    stationBrief="6 aylık bebeğin annesiyle görüşünüz; anne sütüne ek olarak tamamlayıcı beslenme planı oluşturunuz.",
    formula=None,
    sampleMenu=[
        "Kahvaltı: 1,5 ÖB meyve püresi, 1 tam yumurta sarısı, 1 TK pekmez, 1 iD ekmek içi",
        "Ara: 1 ÖB meyve püresi",
        "Öğle/Akşam: 4-5 YK kıymalı (30 g kıyma) pirinçli sebze yemeği, 1/2 iD ekmek içi",
        "Ara: 150 ml yoğurt",
        "Gece boyu: anne sütü",
    ],
    mustInclude=INCLUDE_INFANT + ["Yoğurda 1 TK ile başlama, 3 gün sonunda 1 ÇB'ye çıkma"],
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Yoğurt asit nedeniyle bebek açken değil tok iken 1 TK ile başlanır; 3 gün sonunda 1 ÇB'ye ulaşılır.",
        "100 ml meyve suyu = 1 değişim meyve; meyve suyu yerine meyve püresi tercih edilir.",
        "Peynir ve yoğurt aynı gün verilirse doygunluk oluşur; ek besin olarak dengelenmelidir.",
        "Kaşık ve bardakla beslenme tercih edilir; tat duyusu oluşması için tuz/şeker eklenmez.",
        "İnek sütü ve bal 1 yaşa kadar önerilmez.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("tb-06m", [
        (1, "chief_complaint", "Bebeğim 6 aylık oldu, ek gıdaya başlama zamanı geldi diye geldim; neyi ne kadar vereceğimi bilmiyorum.", True),
        (2, "feeding", "Şu an sadece anne sütü alıyor; gündüz sık sık, geceleri iki üç kez emiyor. Henüz başka bir şey tatmadı.", True),
        (2, "growth", "Doğum kilosu 3 kilo 200 gramdı, en son tartıda 7 kilo 750 gram çıktı.", True),
        (3, "family_social", "Yemekleri evde ben pişiriyorum; eşimin ailesi bebeğe ne yedireceğim konusunda çok fikir veriyor, kafam karışıyor.", False),
    ]),
    sourceNote="Defter: Tamamlayıcı Beslenme 6/12 yaş, DA 3200 g, SA 7750 g, anne sütü alıyor.",
    verificationFlags=[],
)
CASES.append(c)

# 2) Tamamlayıcı beslenme 7 ay ----------------------------------------------
c = inf_case(
    "tb-07m", "Tamamlayıcı Beslenme – 7 aylık", 7, 3000, 7.15, "OGA",
    rg(103, 105), rg(2.1, 2.5), rg(150, 175),
    age_label="7 aylık", domain="complementary_feeding", condition="healthy_complementary",
    stationBrief="7 aylık bebeğin annesiyle görüşünüz; beslenme planını gözden geçirip güncelleyiniz.",
    formula={
        "productName": "Aptamil 2 (devam sütü)",
        "scoopsPerBatch": 12,
        "batchWaterMl": 360,
        "servingsPerDay": 3,
        "mlPerServing": 120,
        "additives": [],
        "preparationSteps": "Temiz bir cezveye/tencereye 360 ml su alınıp kaynatılır, ılıtılır; 12 ölçek Aptamil 2 eklenip karıştırılır; 3 × 120 ml verilir.",
        "scenarioNote": "Anne sütünün yetersiz kaldığı öğünlerde (yatarken/gece) kullanılır.",
    },
    sampleMenu=[
        "Uyanınca: anne sütü",
        "Kahvaltı: ıhlamur, 1 tam yumurta sarısı, 1 TK pekmez (10 g), 1 iD ekmek içi",
        "Kuşluk: 150 ml yoğurt (1,5 ÇB)",
        "Öğle/Akşam: 4 YK kıymalı pirinçli sebze yemeği, 1/2 dilim ekmek içi",
        "İkindi: 1 ÖB meyve püresi",
        "Yatarken ve gece: anne sütü (veya 3 × 120 ml Aptamil 2)",
    ],
    mustInclude=INCLUDE_INFANT,
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Yoğurt ara öğünde tek başına verilir; mama verilirken öğün sayısının eşit olması önemlidir.",
        "Mide kapasitesi 180-210 ml; günde 4-6 beslenme.",
        "Yumurta sarısı tam pişmiş olarak verilir.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("tb-07m", [
        (1, "chief_complaint", "7 aylık bebeğimin beslenmesini düzenlemek istiyorum.", True),
        (2, "feeding", "Anne sütü alıyor, akşamları biberonla devam sütü de veriyorum; gündüz yoğurt ve püre yiyor.", True),
        (2, "growth", "Doğumda 3 kiloydu, şimdi 7 kilo 150 gram.", True),
        (3, "beliefs", "Yemeği reddedince tuz ve pekmezi biraz fazla ekliyorum ki lezzetli olsun.", False),
    ]),
    sourceNote="Defter: Tamamlayıcı Beslenme 7/12 yaş, DA 3000 g, SA 7150 g, anne sütü alıyor; Aptamil 2 12 ölçek 3×120 ml hazırlama notu.",
    verificationFlags=["Protein g/kg aralığı bu vakada defterde boş; 6. ay satırından (2,1-2,5) türetildi."],
)
CASES.append(c)

# 3) Tamamlayıcı beslenme 8,5 ay --------------------------------------------
c = inf_case(
    "tb-085m", "Tamamlayıcı Beslenme – 8,5 aylık", 8.5, 3100, 9.25, "SA",
    rg(103, 105), rg(2.0, 2.5), rg(150, 175),
    age_label="8,5 aylık", domain="complementary_feeding", condition="healthy_complementary",
    stationBrief="8,5 aylık bebeğin annesiyle görüşünüz; öğün düzeni ve miktarları planlayınız.",
    formula=None,
    sampleMenu=[
        "Sabah (uyanınca): anne sütü",
        "Kahvaltı-Kuşluk: 150 ml yoğurt",
        "Öğle/Akşam: 1/2 kase sebze çorbası (100 ml), ikinci olarak 10 ÖB şeftali? (bkz. doğrulama notu)",
        "Gece: anne sütü; uyurken 2 × anne sütü",
    ],
    mustInclude=INCLUDE_INFANT + ["Beslenme sayısı 6-8 kez/gün"],
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Defter tablosu toplamı yaklaşık 680 kcal + anne sütü; protein ≈ 24 g (≈ 2,7 g/kg).",
        "Günlük beslenme sayısı 6-8 kez.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("tb-085m", [
        (1, "chief_complaint", "8,5 aylık bebeğim; öğünleri düzenlemek ve yeterli yiyip yemediğini öğrenmek istiyorum.", True),
        (2, "feeding", "Sabahları anne sütü, kahvaltıda yoğurt, öğlen sebze çorbası, ikindi şeftali püresi; geceleri iki kez emiyor.", True),
        (2, "growth", "3 kilo 100 gramla doğdu, şimdi 9 kilo 250 gram.", True),
        (3, "medical", "Sebzeyi parça parça verince bazen öksürüyor, bu yüzden çok korkuyorum.", False),
    ]),
    sourceNote="Defter: Tamamlayıcı Beslenme 8,5/12 yaş, DA 3100 g, SA 9250 g, anne sütü alıyor.",
    verificationFlags=[
        "Defterde enerji/protein/sıvı SA (9,25 kg) üzerinden hesaplanmış; OGA = 9,15 kg. Hesap temeli SA olarak alındı.",
        "Öğle/akşam menüsündeki bir satır el yazısından okunamadı; menü doğrulanmalı.",
    ],
)
c["sampleMenu"][2] = "Öğle/Akşam: 1/2 kase sebze çorbası (100 ml)"
c["sampleMenu"].insert(3, "İkindi: 1 ÖB şeftali püresi")
c["verificationFlags"][1] = "Öğle/akşam ve ikindi menü satırları el yazısından kısmen okundu; menü doğrulanmalı."
CASES.append(c)

# 4) Tamamlayıcı beslenme 9 ay ----------------------------------------------
c = inf_case(
    "tb-09m", "Tamamlayıcı Beslenme – 9 aylık", 9, 3000, 11.2, "OGA",
    rg(103, 105), rg(2.5, 3.0), rg(150, 175),
    age_label="9 aylık", domain="complementary_feeding", condition="healthy_complementary",
    stationBrief="9 aylık bebeğin annesiyle görüşünüz; evde pişen yemeklere geçiş sürecini değerlendirip plan yapınız.",
    formula=None,
    sampleMenu=[
        "Anne sütü + evde pişen yemekler (kaşıkla)",
        "Yoğurt 150 ml, et 30 g, sebze, meyve, ekmek, pekmez, zeytinyağı",
        "Kavanoz/ev yapımı meyve püresi",
    ],
    mustInclude=INCLUDE_INFANT,
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Defter tablosu toplamı ≈ 737 kcal ve ≈ 24 g protein.",
        "Enerji ve protein OGA (9,3 kg) üzerinden hesaplanır; SA ile karşılaştırma büyüme izlemi için yapılır.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("tb-09m", [
        (1, "chief_complaint", "9 aylık bebeğim evdeki yemekleri yiyor, planı gözden geçirmek istiyorum.", True),
        (2, "feeding", "Anne sütü almaya devam ediyor; evde pişen yemekleri kaşıkla yiyor, meyveyi de kavanozdan veriyorum.", True),
        (2, "growth", "Doğum kilosu 3 kiloydu; son tartıda 11 kilo 200 gram çıktı.", True),
        (3, "family_social", "Geceleri sık uyanıyor, sakinleştirmek için hemen emziriyorum ve yanına meyve suyu koyuyorum.", False),
    ]),
    sourceNote="Defter: Klinik çocuk, tamamlayıcı beslenme 9/12 yaş, DA 3 kg, anne sütü alıyor.",
    verificationFlags=[
        "Defterde SA = 11,2 kg okundu; 9 aylık için olağandışı yüksek. Basamak doğrulanmalı (SA 9,2 olabilir).",
    ],
)
CASES.append(c)

# 5-6) Prematüre ------------------------------------------------------------
def prem(cid, title, wk, age_days, da_kg, formula, menu, points, flags, src, facts_items):
    return {
        "id": cid,
        "title": title,
        "domain": "neonatal",
        "condition": "premature",
        "stationBrief": f"{wk}. haftada doğan prematüre bebeğin annesiyle görüşünüz; beslenme planı oluşturunuz.",
        "patient": {
            "ageLabel": f"{age_days} günlük (doğum haftası {wk})",
            "ageMonths": round(age_days / 30.4, 2),
            "ageDays": age_days,
            "gestationalWeekAtBirth": wk,
            "sex": "unspecified",
            "parentRef": "bebeğim",
            "birthWeightG": int(da_kg * 1000),
            "currentWeightKg": da_kg,
            "heightCm": None,
        },
        "growth": {
            "idealWeightKg": None,
            "idealWeightFormula": "Prematürede OGA formülü uygulanmaz; hedefler doğum/güncel ağırlığa göre hesaplanır.",
            "ogaApplicable": False,
            "ogaNote": "Prematüre: OGA formülü kullanılmaz.",
            "weightLossPercent": None,
        },
        "energy": energy_perkg(rg(120, 130), "DA", da_kg, f"Enerji = (120-130) kcal/kg × {da_kg:g} kg (DA)"),
        "protein": protein_perkg(rg(3.0, 4.0) if wk == 28 else rg(3.0, 3.5), "DA", da_kg,
                                 f"Protein = ({'3-4' if wk == 28 else '3-3,5'}) g/kg × {da_kg:g} kg (DA)"),
        "fluid": fluid_perkg(rg(150, 175), "DA", da_kg, f"Sıvı = (150-175) ml/kg × {da_kg:g} kg (DA)"),
        "formula": formula,
        "sampleMenu": menu,
        "mustInclude": ["Küçük hacimli, sık beslenme", "Prematüreye özgü zenginleştirici/mama kullanımı"],
        "mustAvoid": ["Fantomalt ve protifar (prematürede kullanılmaz)", "İnek sütü", "Bal"],
        "keyClinicalPoints": points,
        "criticalRuleIds": ["INFANT_COW_MILK", "INFANT_HONEY"],
        "disclosureFacts": facts(cid, facts_items),
        "sourceNote": src,
        "verificationFlags": flags,
    }


CASES.append(prem(
    "prem-28w", "Prematüre – 28. hafta, 5 günlük", 28, 5, 1.52, None,
    ["Anne sütü + zenginleştirici (Eoprotin), 24 × 10 cc (≈ 240-250 ml/gün)"],
    [
        "Saat başı 10-15 cc olacak şekilde beslenir.",
        "Prematüre vakalarda fantomalt ve protifar kullanılmaz.",
        "Defter planı: ≈ 184 kcal (≈ 121 kcal/kg) ve ≈ 3,4 g protein (≈ 2,25 g/kg).",
    ],
    [
        "Defterde Eoprotin oranı 'her 100 cc anne sütüne 3 ölçek' yazıyor; tablodaki 2,5 ölçek/250 ml ile uyuşmuyor. Doğrulayın.",
        "Defterde enerji/protein 1,5 kg ile hesaplanmış; burada 1,52 kg (DA) kullanıldı.",
        "28. hafta için sıvı hedefi defterde net değil; 24 × 10 cc plan ve 150-175 ml/kg aralığı varsayıldı.",
    ],
    "Defter: Prematüre, yaş 5/365, hafta 28, DA 1520 g; AS + zenginleştirici.",
    [
        (1, "chief_complaint", "Bebeğim 28 haftada doğdu, şu an 5 günlük; yenidoğan ünitesinde, sütümü sağıyorum.", True),
        (2, "feeding", "Sağdığım sütü hemşireler küçük miktarlarda sık sık veriyor; miktarı tam bilmiyorum.", True),
        (2, "growth", "Doğum ağırlığı 1520 gramdı.", True),
        (3, "family_social", "Sütümün yetmeyeceğinden çok korkuyorum; bazıları 'mama ver' diyor.", False),
    ],
))
CASES.append(prem(
    "prem-30w", "Prematüre – 30. hafta, 41 günlük", 30, 41, 1.6,
    {
        "productName": "Prematüre mama",
        "scoopsPerBatch": 8,
        "batchWaterMl": 240,
        "servingsPerDay": 24,
        "mlPerServing": 10,
        "additives": [],
        "preparationSteps": "Temiz bir tencerede 240 cc su kaynatılıp ocaktan alındıktan sonra 8 ölçek prematüre mama eklenir; günde 24 kez 10 cc verilir.",
        "scenarioNote": "Sade mama (anne sütü yok).",
    },
    ["Sade prematüre mama: 24 × 10 cc (saat başı 10 cc), 240 cc/gün"],
    [
        "İlk gün sıvı 60-80 ml/kg; 10-20 ml/kg artışlarla 150-175 ml/kg'a çıkılır.",
        "Defter planı: ≈ 172,8 kcal (≈ 108 kcal/kg) ve protein ≈ 4,35 g/kg.",
        "Prematüre vakalarda fantomalt ve protifar kullanılmaz.",
    ],
    ["Defterdeki protein toplamı (6,36 mi 6,96 mı) okunamadı; 4,35 g/kg değeri 6,96 g ile uyumlu."],
    "Defter: Prematüre, yaş 41/365, hafta 30, DA 1600 g; sade mama.",
    [
        (1, "chief_complaint", "Bebeğim 30 haftalık doğdu, 41 günlük oldu; taburculuğa hazırlanıyoruz.", True),
        (2, "feeding", "Şu an sadece prematüre mamasıyla besleniyor, saat başı küçük miktarlar.", True),
        (2, "growth", "Doğum ağırlığı 1 kilo 600 gramdı.", True),
        (3, "family_social", "Evde bu mamayı doğru hazırlayabilecek miyim diye çok endişeliyim.", False),
    ],
))

# 7) Marasmus ---------------------------------------------------------------
sa = 5.9
oga = oga_infant(3200, 11)
loss = round((oga - sa) / oga * 100, 1)
CASES.append({
    "id": "marasmus-11m",
    "title": "Marasmus – 11 aylık",
    "domain": "malnutrition",
    "condition": "marasmus",
    "stationBrief": "11 aylık, belirgin zayıflamış bebeğin annesiyle görüşünüz; ilk gün beslenme planını oluşturunuz.",
    "patient": {"ageLabel": "11 aylık", "ageMonths": 11, "sex": "unspecified", "parentRef": "bebeğim",
                "birthWeightG": 3200, "currentWeightKg": sa, "heightCm": None},
    "growth": {
        "idealWeightKg": oga,
        "idealWeightFormula": f"OGA = 3200 g + (6 × 800 g) + (5 × 500 g) = {oga:g} kg",
        "ogaApplicable": True,
        "ogaNote": "Marasmusta ödem yoktur; OGA hesaplanır ve ağırlık kaybı yüzdesi çıkarılır.",
        "weightLossPercent": loss,
    },
    "energy": energy_perkg(rg(70, 80), "SA", sa, "1. gün: Enerji = (70-80) kcal/kg × 5,9 kg (SA)"),
    "protein": protein_perkg(rg(1.0, 1.0), "SA", sa, "1. gün: Protein = 1 g/kg × 5,9 kg (SA)"),
    "fluid": fluid_perkg(rg(90, 125), "SA", sa, "1. gün: Sıvı = (90-125) ml/kg × 5,9 kg (SA)"),
    "refeedingPhases": [
        {"label": "1. gün", "weightKg": 5.9, "energyPerKg": rg(70, 80), "energyTotalKcal": times(rg(70, 80), 5.9),
         "proteinGPerKg": rg(1.0, 1.0), "proteinTotalG": times(rg(1.0, 1.0), 5.9),
         "fluidPerKg": rg(90, 125), "fluidTotalMl": times(rg(90, 125), 5.9),
         "referencePlan": "Bebelac LF 9 ölçek + 20 g pirinç unu + 20 g şeker + 3 ölçek fantomalt; 640 ml su; 8 × 80 cc. Defter toplamı ≈ 408 kcal (≈ 69 kcal/kg)."},
        {"label": "4. gün", "weightKg": 6.1, "energyPerKg": rg(80, 100), "energyTotalKcal": times(rg(80, 100), 6.1),
         "proteinGPerKg": rg(1.5, 1.5), "proteinTotalG": times(rg(1.5, 1.5), 6.1),
         "fluidPerKg": rg(125, 150), "fluidTotalMl": times(rg(125, 150), 6.1),
         "referencePlan": "Bebelac LF 18 ölçek + 10 g pirinç unu + 15 g şeker + 5 g yağ; 630 ml su; 7 × 90 cc. Defter toplamı ≈ 78 kcal/kg."},
        {"label": "10. gün", "weightKg": 6.5, "energyPerKg": rg(150, 175), "energyTotalKcal": times(rg(150, 175), 6.5),
         "proteinGPerKg": rg(3.0, 3.5), "proteinTotalG": times(rg(3.0, 3.5), 6.5),
         "fluidPerKg": rg(150, 175), "fluidTotalMl": times(rg(150, 175), 6.5),
         "referencePlan": "Mama + yumurta, et, sebze, meyve, ekmek, yoğurt; defter toplamı ≈ 986 kcal (≈ 151 kcal/kg), ≈ 22,6 g protein (≈ 3,4 g/kg)."},
    ],
    "formula": {
        "productName": "Bebelac LF",
        "scoopsPerBatch": 9,
        "batchWaterMl": 640,
        "servingsPerDay": 8,
        "mlPerServing": 80,
        "additives": ["20 g pirinç unu", "20 g şeker", "3 ölçek fantomalt"],
        "preparationSteps": "640 ml kaynatılmış ılıtılmış suya 20 g pirinç unu eklenip pişirilir; ocaktan alındıktan sonra 9 ölçek Bebelac LF, 20 g şeker ve 3 ölçek fantomalt karıştırılır; günde 8 × 80 cc.",
        "scenarioNote": "Laktoz intoleransı bulguları nedeniyle laktozsuz formül.",
    },
    "sampleMenu": ["1. gün: yalnızca mama 8 × 80 cc", "4. gün: mama 7 × 90 cc + 1 değişim meyve", "10. gün: mama + yumurta sarısı, et, sebze, meyve, ekmek, yoğurt"],
    "mustInclude": ["Yeniden besleme (refeeding) basamakları", "Ağırlık kaybı yüzdesi", "Dehidratasyon ve laktoz intoleransı değerlendirmesi"],
    "mustAvoid": ["İnek sütü", "Bal", "İlk günlerde 150 kcal/kg gibi hızlı enerji yüklemesi"],
    "keyClinicalPoints": [
        f"Ağırlık kaybı = (OGA {oga:g} − SA {sa:g}) / OGA = %{loss}.",
        "Marasmusta kilo alınır; kwashiorkorda ödem düştükçe kilo kaybı görülür.",
        "Fantomalt 4. günden başlanır, en fazla 6 ölçek (her 100 cc için 1 ölçek).",
        "Aşırı ozmotik yük gastroenterit/ozmotik diyare riski taşır.",
        "Bulgular: albümin/globülin ve total protein düşük, laktoz intoleransı (+), ağır dehidratasyon.",
    ],
    "criticalRuleIds": ["INFANT_COW_MILK", "INFANT_HONEY"],
    "disclosureFacts": facts("marasmus-11m", [
        (1, "chief_complaint", "Bebeğim 11 aylık, çok zayıfladı, kilo alamıyor; gözleri çökük.", True),
        (2, "feeding", "İki ay anne sütü aldı; şimdi muhallebi, yemek suları ve meyve suyu veriyorum.", True),
        (2, "growth", "Doğumda 3 kilo 200 gramdı, şimdi 5 kilo 900 gram.", True),
        (3, "family_social", "Ekonomik durumumuz kötü; et, yumurta ve süt ürünlerini alamıyoruz, sık ishal oluyor.", False),
    ]),
    "sourceNote": "Defter: Malnütrisyon, yaş 11/12, DA 3200 g, SA 5900 g, marasmus, laktoz intoleransı (+), ağır dehidrate.",
    "verificationFlags": [
        "Defterdeki kazanım toplamları (g/kg) el yazısından kısmen okundu; faz toplamları 'referencePlan' içinde yaklaşık verildi.",
        "4. ve 10. gün ağırlıkları (6,1 ve 6,5 kg) defterde 'olsun' şeklinde varsayımdır.",
    ],
})

# 8) Kwashiorkor ------------------------------------------------------------
sa = 7.9
CASES.append({
    "id": "kwashiorkor-10m",
    "title": "Kwashiorkor – 10 aylık",
    "domain": "malnutrition",
    "condition": "kwashiorkor",
    "stationBrief": "10 aylık, ödemli bebeğin annesiyle görüşünüz; ilk gün beslenme ve sıvı planını oluşturunuz.",
    "patient": {"ageLabel": "10 aylık", "ageMonths": 10, "sex": "unspecified", "parentRef": "bebeğim",
                "birthWeightG": 3200, "currentWeightKg": sa, "heightCm": None},
    "growth": {
        "idealWeightKg": None,
        "idealWeightFormula": "Kwashiorkorda ödem nedeniyle OGA HESAPLANMAZ; hesap mevcut (ödemli) ağırlıktan başlangıç düşük enerjiyle yapılır.",
        "ogaApplicable": False,
        "ogaNote": "ÖDEM VAR → OGA hesaplanmaz. Başlangıç 70-80 kcal/kg/gün.",
        "weightLossPercent": None,
    },
    "energy": energy_perkg(rg(70, 80), "SA", sa, "1. gün: Enerji = (70-80) kcal/kg × 7,9 kg (SA)"),
    "protein": protein_perkg(rg(1.0, 1.0), "SA", sa, "1. gün: Protein = 1 g/kg × 7,9 kg (SA)"),
    "fluid": fluid_perkg(rg(90, 125), "SA", sa, "1. gün: Sıvı = (90-125) ml/kg × 7,9 kg (SA)"),
    "rehydration": {
        "dehydration": "ağır",
        "orsMlPerKg": rg(100, 150),
        "hours": rg(4, 4),
        "totalOrsMl": times(rg(100, 150), sa),
        "escalation": "Defter ORS hacmi verir; ağır dehidratasyonda IV sıvı kararı hekime aittir.",
    },
    "refeedingPhases": [
        {"label": "1. gün", "weightKg": 7.9, "energyPerKg": rg(70, 80), "energyTotalKcal": times(rg(70, 80), 7.9),
         "proteinGPerKg": rg(1.0, 1.0), "proteinTotalG": times(rg(1.0, 1.0), 7.9),
         "fluidPerKg": rg(90, 125), "fluidTotalMl": times(rg(90, 125), 7.9),
         "referencePlan": "Peptijunior 13 ölçek + 10 g pirinç unu + 25 g şeker + 15 g yağ; 3 × 100 ml (300 ml su). Defter toplamı ≈ 561 kcal (≈ 71 kcal/kg), ≈ 8,5 g protein (≈ 1 g/kg)."},
        {"label": "7. gün", "weightKg": 7.5, "energyPerKg": rg(100, 100), "energyTotalKcal": times(rg(100, 100), 7.5),
         "proteinGPerKg": rg(1.5, 1.5), "proteinTotalG": times(rg(1.5, 1.5), 7.5),
         "fluidPerKg": rg(125, 125), "fluidTotalMl": times(rg(125, 125), 7.5),
         "referencePlan": "Neocate 16 ölçek + 25 g pirinç unu + 20 g şeker + 20 g yağ + 100 ml meyve suyu; 7 × 100 cc. Defter toplamı ≈ 762 kcal (≈ 101 kcal/kg)."},
        {"label": "10. gün", "weightKg": 6.7, "energyPerKg": rg(150, 150), "energyTotalKcal": times(rg(150, 150), 6.7),
         "proteinGPerKg": rg(3.5, 3.5), "proteinTotalG": times(rg(3.5, 3.5), 6.7),
         "fluidPerKg": None, "fluidTotalMl": None,
         "referencePlan": "Mama + yoğurt, yumurta sarısı, et, sebze, meyve, ekmek; defter toplamı ≈ 1040 kcal (≈ 153 kcal/kg), ≈ 24,9 g protein (≈ 3,7 g/kg). Ödem düştükçe ağırlık 7,9 → 6,7 kg."},
    ],
    "formula": {
        "productName": "Peptijunior",
        "scoopsPerBatch": 13,
        "batchWaterMl": 300,
        "servingsPerDay": 3,
        "mlPerServing": 100,
        "additives": ["10 g pirinç unu", "25 g şeker", "15 g sıvı yağ"],
        "preparationSteps": "Temiz bir tencerede 300 ml su kaynatılır, pirinç unu eklenip pişirilir; ocaktan alındıktan sonra 13 ölçek Peptijunior, şeker ve yağ eklenip karıştırılır; günde 3 × 100 ml.",
        "scenarioNote": "Laktoz intoleransı nedeniyle hidrolizat formül.",
    },
    "sampleMenu": ["1. gün: yalnızca mama 3 × 100 ml", "7. gün: mama 7 × 100 cc", "10. gün: mama + yemek"],
    "mustInclude": ["OGA'nın ödem nedeniyle HESAPLANMADIĞI belirtilmeli", "Başlangıç enerji 70-80 kcal/kg/gün", "Dehidratasyon düzeltmesi"],
    "mustAvoid": ["OGA üzerinden enerji hesabı", "Başlangıçta yüksek enerji (>100 kcal/kg)", "İnek sütü", "Bal"],
    "keyClinicalPoints": [
        "Kwashiorkorda ödem nedeniyle OGA hesaplanmaz; enerji mevcut ağırlıkla 70-80 kcal/kg/gün ile başlanır.",
        "Ödem çözüldükçe ağırlık düşer (7,9 → 7,5 → 6,7 kg); enerji ve protein basamaklı artırılır.",
        "Laktoz intoleransı (+): laktozsuz/hidrolizat formül.",
        "Hata: OGA'ya göre hesaplanıp aşırı beslenmek refeeding komplikasyonlarına yol açar (karnede ölümcül hata).",
    ],
    "criticalRuleIds": ["INFANT_COW_MILK", "INFANT_HONEY", "KWASHIORKOR_OGA_OVERFEEDING"],
    "disclosureFacts": facts("kwashiorkor-10m", [
        (1, "chief_complaint", "Bebeğimin ayakları ve yüzü şişti, ishali var, hiçbir şey yemek istemiyor.", True),
        (2, "feeding", "İki ay anne sütü aldı; şimdi muhallebi, unlu çorbalar ve nişastalı şeyler yiyor; süt içince ishali artıyor.", True),
        (2, "growth", "Doğumda 3 kilo 200 gramdı; tartıda 7 kilo 900 gram çıktı ama doktor şiştiği için gerçek kilosu bu değil dedi.", False),
        (3, "family_social", "Et ve yumurta pahalı olduğu için sürekli un ve nişasta verdim, şimdi çok suçlu hissediyorum.", False),
    ]),
    "sourceNote": "Defter: Malnütrisyon, yaş 10/12, DA 3200 g, SA 7900 g, kwashiorkor, laktoz intoleransı, ağır dehidrate; OGA hesaplanmaz.",
    "verificationFlags": [
        "7. ve 10. gün ağırlıkları (7,5 ve 6,7 kg) defterde 'olsun' ile verilen varsayımdır.",
        "10. gün protein 3,5 g/kg × 6,7 = 23,45 g; defterdeki yazılan toplam okunamadı.",
        "Ağır dehidratasyonda ORS 100-150 ml/kg/4 saat defter değeridir; IV sıvı kararı hekimdedir.",
    ],
})

# 9-10) Kistik fibrozis -----------------------------------------------------
c = inf_case(
    "cf-075m", "Kistik Fibrozis – 7,5 aylık", 7.5, 2900, 5.75, "SA",
    rg(120, 150), rg(3.0, 3.5), rg(150, 175),
    age_label="7,5 aylık", domain="malabsorption", condition="cystic_fibrosis",
    stationBrief="Kistik fibrozis tanılı, kilo alamayan 7,5 aylık bebeğin annesiyle görüşünüz; beslenme planını oluşturunuz.",
    formula={
        "productName": "Peptijunior",
        "scoopsPerBatch": 21,
        "batchWaterMl": 630,
        "servingsPerDay": 6,
        "mlPerServing": 105,
        "additives": ["1 YK pirinç unu", "1 YK (9 g) yağ"],
        "preparationSteps": "Temiz bir kaba 630 ml su alınıp 1 YK pirinç unu eklenerek pişirilir; ocaktan alındıktan sonra 21 ölçek Peptijunior ve 1 YK yağ eklenip karıştırılır; günde 6 × 105 ml.",
        "scenarioNote": "MCT içeriği yüksek tam protein hidrolizatı; emilim ve biyoyararlanım artar.",
    },
    sampleMenu=[
        "Kahvaltı: 105 ml mama", "Ara: 1 ÖB meyve püresi", "Öğle/Akşam: 105 ml mama",
        "Ara: 1 ÇB yoğurt", "Gece: 3 × 105 ml mama",
    ],
    mustInclude=["Yüksek enerji/protein hedefi (120-150 kcal/kg)", "MCT içeren hidrolizat formül gerekçesi", "Büyüme izlemi"],
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Kistik fibrozis: artmış enerji gereksinimi ve malabsorpsiyon; enerji (120-150) kcal/kg.",
        "Peptijunior → MCT yüksek, emilim/biyoyararlanım artar; tam protein hidrolizatı.",
        "Hesap mevcut (düşük) ağırlık üzerinden yapıldı (defter): 690-862,5 kcal.",
        "(Defter dışı genel bilgi) Pankreas enzim replasmanı hekim tarafından düzenlenir; diyetisyen öğün-enzim zamanlaması bilmelidir.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("cf-075m", [
        (1, "chief_complaint", "Bebeğim kilo alamıyor, sürekli ishali ve iştahsızlığı var; kistik fibrozis tanısı kondu.", True),
        (2, "medical", "Doğunca üç gün bağırsak çıkışı olmamıştı; sonra günde 6-7 kez yeşilimsi sarımsı dışkısı oldu, emmesi azaldı.", True),
        (2, "feeding", "İlk altı ay anne sütü aldı, sonra tamamlayıcı beslenmeye geçtik; Aptamil 2, yoğurt ve pirinç unu veriyorduk.", True),
        (3, "family_social", "Hastane yatışlarından çok yoruldum; mama hazırlama ölçülerini karıştırmaktan korkuyorum.", False),
    ]),
    sourceNote="Defter: Kistik fibrozis, yaş 7,5/12, DA 2900 g, SA 5750 g; Peptijunior 21 ölçek, 6 × 105 ml.",
    verificationFlags=["Defter hesabı mevcut ağırlıkla (5,75 kg) yapılmıştır; OGA = 8,45 kg."],
)
CASES.append(c)

c = inf_case(
    "cf-08m", "Kistik Fibrozis (PLİ+) – 8 aylık", 8, 3200, 7.2, "OGA",
    rg(103, 105), rg(3.0, 3.5), rg(150, 175),
    age_label="8 aylık", domain="malabsorption", condition="cystic_fibrosis",
    stationBrief="Kistik fibrozis tanılı 8 aylık bebeğin annesiyle görüşünüz; formül ve ek gıda planı oluşturunuz.",
    formula={
        "productName": "Bebelac LF",
        "scoopsPerBatch": 20,
        "batchWaterMl": 600,
        "servingsPerDay": 5,
        "mlPerServing": 120,
        "additives": ["5 g yağ", "10 g şeker"],
        "preparationSteps": "600 ml kaynatılmış ılıtılmış suya 20 ölçek Bebelac LF, 5 g yağ ve 10 g şeker eklenip karıştırılır; 5 × 120 ml.",
        "scenarioNote": "Defterdeki plan; laktoz intoleransı eşlik ediyorsa uygundur.",
    },
    sampleMenu=["5 × 120 ml mama + yoğurt, kıymalı sebze yemeği, meyve püresi, ekmek ve yumurta sarısı"],
    mustInclude=["Mama + ek gıda enerji katkısı", "Büyüme izlemi"],
    mustAvoid=AVOID_INFANT,
    keyClinicalPoints=[
        "Defter planı: ≈ 927 kcal (≈ 128 kcal/kg SA), ≈ 23,2 g protein (≈ 3,2 g/kg).",
        "Hesap OGA (9,0 kg) üzerinden yapılmıştır; SA 7,2 kg.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("cf-08m", [
        (1, "chief_complaint", "8 aylık bebeğim kistik fibrozis nedeniyle takipte, kilo alımı çok yavaş.", True),
        (2, "feeding", "Şu an Bebelac LF ile besleniyor; yoğurt ve biraz püre veriyorum.", True),
        (2, "growth", "Doğum kilosu 3 kilo 200 gramdı, şimdi 7 kilo 200 gram.", True),
        (3, "medical", "Pankreas enzimini ne zaman vereceğimi karıştırıyorum.", False),
    ]),
    sourceNote="Defter: 'PLİ+' etiketli sayfa, yaş 8/12, DA 3,2 kg, SA 7,2 kg; Bebelac LF 20 ölçek.",
    verificationFlags=[
        "Defterde sayfa etiketi 'PLİ+' okundu; tanı kistik fibrozis olarak eşlendi, doğrulanmalı.",
        "Hazırlama notundaki 5 g/10 g katkı miktarları kısmen okundu.",
    ],
)
CASES.append(c)

# 11-12) KBY ----------------------------------------------------------------
def ckd(cid, title, age_years, kg, cm, energy_total, energy_formula, protein_rng, menu, points, flags, src, facts_items):
    k_max = 40 * kg
    p_max = 20 * kg
    return {
        "id": cid,
        "title": title,
        "domain": "renal",
        "condition": "ckd",
        "stationBrief": f"{age_years} yaşında kronik böbrek yetmezliği (KBY) tanılı çocuğun ebeveyniyle görüşünüz; diyet planı oluşturunuz.",
        "patient": {"ageLabel": f"{age_years} yaşında", "ageMonths": age_years * 12, "sex": "unspecified",
                    "parentRef": "çocuğum", "birthWeightG": None, "currentWeightKg": kg, "heightCm": cm},
        "growth": {"idealWeightKg": oga_child(age_years), "idealWeightFormula": f"OGA = {age_years} × 2 + 8 = {oga_child(age_years)} kg",
                   "ogaApplicable": True, "ogaNote": "1 yaş üzeri: yaş × 2 + 8.", "weightLossPercent": None},
        "energy": energy_total_case(energy_total, kg, energy_formula),
        "protein": protein_perkg(protein_rng, "SA", kg, f"Protein = ({protein_rng['min']:g}-{protein_rng['max']:g}) g/kg × {kg:g} kg"),
        "fluid": None,
        "renalLimits": {
            "proteinGPerKg": protein_rng,
            "potassiumMgPerKgMax": 40,
            "phosphorusMgPerKgMax": 20,
            "potassiumMgMax": k_max,
            "phosphorusMgMax": p_max,
            "note": "Düşük protein (0,8-1 g/kg), potasyum < 40 mg/kg, fosfor < 20 mg/kg, tuzsuz; özel nişasta/düşük proteinli ürünler kullanılır.",
        },
        "formula": None,
        "sampleMenu": menu,
        "mustInclude": ["Protein 0,8-1 g/kg", "Potasyum ve fosfor kısıtı", "Özel düşük proteinli ürünler", "Tuzsuz beslenme"],
        "mustAvoid": ["Yüksek proteinli diyet", "Potasyum/fosfor yönünden zengin besinler (kuru baklagil, kuruyemiş, süt ürünü fazlası)"],
        "keyClinicalPoints": points,
        "criticalRuleIds": [],
        "disclosureFacts": facts(cid, facts_items),
        "sourceNote": src,
        "verificationFlags": flags,
    }


def energy_total_case(total, kg, formula):
    return energy_total(total, "SA", kg, formula)


CASES.append(ckd(
    "ckd-9y", "Kronik Böbrek Yetmezliği – 9 yaş", 9, 25, 127,
    rg(1900, 1900), "Enerji = 1000 + (yaş × 100) = 1000 + 900 = 1900 kcal", rg(0.8, 1.0),
    [
        "Sabah: açık çay (şekersiz), 1 tam yumurta, 1 küçük elma, 50 g özel ekmek, 1 adet özel kurabiye",
        "Kuşluk: 1 kase nişasta peltesi, 1 küçük elma",
        "Öğle: 2 YK sebze yemeği (susuz), 6 YK özel makarna, 75 g düşük proteinli ekmek",
        "Akşam: 2 YK sebze yemeği, 1 kase nişasta peltesi/özel makarna, 75 g düşük proteinli ekmek",
        "İkindi ve gece: 1 adet kurabiye + 1 küçük elma",
    ],
    ["Defter planı ≈ 1929 kcal, ≈ 22,1 g protein (≈ 0,8-0,9 g/kg).", "Protein hedefi 0,8 × 25 = 20 g/gün."],
    ["Defterde potasyum/fosfor toplamı 9 yaş vakası için verilmemiş; sınırlar 40/20 mg/kg kuralından türetildi."],
    "Defter: Kronik böbrek yetmezliği, 9 yaş, 25 kg, 127 cm; enerji 1000+9×100, protein 0,8×25.",
    [
        (1, "chief_complaint", "Çocuğumun böbrekleri yetersiz, doktor diyetini düzenlememizi istedi.", True),
        (2, "feeding", "Doktor protein, potasyum ve fosforu azaltmamızı söyledi; ama çocuk iştahsız, ekmek ve makarnadan başka yemiyor.", True),
        (2, "growth", "25 kilo, boyu 127 santim.", True),
        (3, "family_social", "Özel ürünler pahalı ve zor bulunuyor; bazen sıradan ekmek, süt ve kuruyemiş de veriyorum.", False),
    ],
))
CASES.append(ckd(
    "ckd-12y", "Kronik Böbrek Yetmezliği – 12 yaş", 12, 35, 137,
    rg(2000, 2500), "Enerji = 2000-2500 kcal/gün; defter hesabı: 36,5 × 35 × 1,75 ≈ 2235,6 kcal", rg(0.8, 1.0),
    [
        "Sabah: açık çay/ıhlamur (1 TK şeker), 1 adet yumurta, 2 TK pekmez, 50 g proteinsiz/özel ekmek",
        "Kuşluk: 2 adet nişastalı kurabiye, 1 çay bardağı süt",
        "Öğle: 1 sb yoğurt, 1/2 yumurta kadar et (15 g), 3 YK pilav/makarna, 5-6 YK susuz sebze yemeği, 50 g özel ekmek, 1/2 elma",
        "İkindi: 2 adet nişastalı kurabiye, 1/2 adet elma",
        "Akşam: özel sebze çorbası, 5-6 YK etli sebze yemeği, 3 YK makarna, 2 iD özel ekmek",
        "Gece: 1/2 kutu supleman (125 ml), 2 adet nişastalı kurabiye",
    ],
    [
        "Hedef protein: 0,8-1 g/kg → 28-35 g/gün.",
        "Potasyum ≈ 40 mg/kg (1400 mg), fosfor ≈ 20 mg/kg (700 mg) sınırı; defter planı K ≈ 1446 mg, P ≈ 720 mg.",
        "BKİ 18,6 kg/m² (normal persentil).",
    ],
    ["Defter planındaki K (1446 mg) ve P (720 mg) değerleri sınırın hafif üzerinde; eğitim amaçlı tartışma noktasıdır."],
    "Defter: KBY 12 yaş, 35 kg, 137 cm; potasyum ve fosfordan kısıtlı tuzsuz beslenme planı, 28 g proteinli diyet.",
    [
        (1, "chief_complaint", "Oğlumun böbrek yetmezliği var; diyetisyen yeni bir plan istedi.", True),
        (2, "feeding", "Okulda kantin yiyeceği, evde ise tuzlu yemekler yiyor; süt ve yoğurdu çok seviyor.", False),
        (2, "growth", "35 kilo, boyu 137 santim.", True),
        (3, "family_social", "Tuzsuz yemek yemiyor; arkadaşlarından farklı olmak istemiyor.", False),
    ],
))
CASES[-1]["patient"]["sex"] = "male"
CASES[-1]["patient"]["parentRef"] = "oğlum"

# 13) Tip 1 DM --------------------------------------------------------------
kg = 22
CASES.append({
    "id": "t1dm-7y",
    "title": "Tip 1 Diyabet – 7 yaş",
    "domain": "endocrine",
    "condition": "type1_diabetes",
    "stationBrief": "Tip 1 diyabetli (kristalize + NPH insülin) 7 yaşındaki çocuğun ebeveyniyle görüşünüz; 3 ana + 3 ara öğünlü diyet planı oluşturunuz.",
    "patient": {"ageLabel": "7 yaşında", "ageMonths": 84, "sex": "unspecified", "parentRef": "çocuğum",
                "birthWeightG": None, "currentWeightKg": kg, "heightCm": None},
    "growth": {"idealWeightKg": 22, "idealWeightFormula": "OGA = 7 × 2 + 8 = 22 kg", "ogaApplicable": True,
               "ogaNote": "1 yaş üzeri: yaş × 2 + 8.", "weightLossPercent": None},
    "energy": energy_total(rg(1700, 1700), "OGA", kg, "Enerji = 1000 + (7 × 100) = 1700 kcal"),
    "protein": {"weightBasis": "OGA", "basisWeightKg": kg, "perKg": rg(r1(51 / kg), r1(63.75 / kg)),
                "totalG": rg(51, 63.75), "formula": "Protein = 1700 kcal × %12-15 ÷ 4 = 51-63,75 g"},
    "fluid": None,
    "macroTargets": {
        "choPercent": rg(55, 60), "choG": rg(233.75, 255.0),
        "proteinPercent": rg(12, 15),
        "fatPercent": rg(25, 30), "fatG": rg(47.2, 56.7),
        "mealKcal": {"main": 420, "snack": 140, "note": "1700/12 ≈ 140 kcal ara öğün; ana öğün = 140 × 3 = 420 kcal (3 ana + 3 ara)."},
    },
    "formula": None,
    "sampleMenu": [
        "Sabah: 1 su bardağı süt, 1 haşlanmış yumurta, 1 ÖB elma, 1 iD tam buğday ekmeği",
        "Kuşluk: 2 parmak boyu beyaz peynir, 1 iD tam buğday ekmeği, 1 ÖB şeftali",
        "Öğle-Akşam: 5-6 YK sebze yemeği, 2-3 YK pilav/makarna, 75 ml yoğurt, 2 iD tam buğday ekmeği",
        "İkindi/Gece: 1 çay bardağı süt, 1 parmak boyu beyaz peynir, 1/2 iD ekmek, 1/2 ÖB elma",
    ],
    "mustInclude": ["Karbonhidrat %55-60 (233,75-255 g)", "3 ana + 3 ara öğün", "İnsülin-öğün zamanlaması", "Hipoglisemi önlemi"],
    "mustAvoid": ["Basit şeker ağırlıklı atıştırmalıklar", "Öğün atlama"],
    "keyClinicalPoints": [
        "Enerji 1000 + yaş×100 = 1700 kcal; CHO %55-60, protein %12-15, yağ %25-30.",
        "Defter menüsü: ≈ 1721 kcal, ≈ 249 g CHO (%57,9), ≈ 62 g protein (%14,4), ≈ 53 g yağ (%27,7).",
        "İnsülin: kristalize + NPH; ara öğünler insülin zirvesiyle uyumlu planlanır.",
    ],
    "criticalRuleIds": [],
    "disclosureFacts": facts("t1dm-7y", [
        (1, "chief_complaint", "Çocuğumun şeker hastalığı var, hızlı ve orta etkili insülin yapıyoruz; beslenme planı istiyoruz.", True),
        (2, "feeding", "Üç ana öğün ve arada üç ara öğün yiyor ama okulda saatler kayıyor.", True),
        (2, "growth", "22 kilo.", True),
        (3, "family_social", "Hipoglisemiden çok korkuyorum; geceleri yatmadan bol bisküvi ve meyve suyu veriyorum.", False),
    ]),
    "sourceNote": "Defter: Tip 1 DM, 7 yaş, 22 kg, kristalize + NPH; enerji 1000 + 7×100; ana/ara öğün dağılımı.",
    "verificationFlags": ["Sabah/öğle öğünlerinin kcal yüzdeleri defterde kısmen okundu; yalnızca günlük hedefler esas alındı."],
})

# 14) İnek sütü alerjisi ----------------------------------------------------
c = inf_case(
    "cmpa-9m", "İnek Sütü Alerjisi – 9 aylık", 9, 3250, 8.8, "OGA",
    rg(103, 105), rg(2.0, 2.5), rg(150, 175),
    age_label="9 aylık", domain="allergy_intolerance", condition="cow_milk_allergy",
    stationBrief="İnek sütü alerjisi tanılı 9 aylık bebeğin annesiyle görüşünüz; uygun formül ve ek gıda planını oluşturunuz.",
    formula={
        "productName": "Similac Alimentum (ileri derecede hidrolize formül)",
        "scoopsPerBatch": 20,
        "batchWaterMl": 600,
        "servingsPerDay": 5,
        "mlPerServing": 120,
        "additives": ["10 g pirinç unu", "15 g yağ", "10 g şeker"],
        "preparationSteps": "600 ml suya 10 g pirinç unu eklenip pişirilir; ocaktan alındıktan sonra Similac Alimentum, 15 g yağ ve 10 g şeker karıştırılır; 5 × 120 ml.",
        "scenarioNote": "Laktozsuz inek sütü formülleri (ör. LF) alerjide UYGUN DEĞİLDİR; hidrolizat/amino asit formül gerekir.",
    },
    sampleMenu=[
        "Kahvaltı: 120 cc Alimentum", "Kuşluk: 1 ÖB meyve püresi",
        "Öğle/Akşam: 3 YK kıymalı (15 g) sebze yemeği, 1 dilim ekmek",
        "İkindi: 1 ÖB meyve püresi", "Gece: 120 cc Alimentum; gece boyu 3 × 120 cc",
    ],
    mustInclude=["İnek sütü proteini içermeyen (hidrolizat) formül", "Gizli süt proteini kaynakları (yoğurt, peynir, ekmek vb.) taraması", "Kalsiyum ve büyüme izlemi"],
    mustAvoid=["İnek sütü", "Yoğurt/peynir (alerji süresince)", "Laktozsuz inek sütü formülü (LF)", "Bal"],
    keyClinicalPoints=[
        "Defter 14 Mayıs versiyonu: Similac Alimentum 20 ölçek ≈ 442 kcal, 12 g protein; toplam ≈ 1056 kcal (≈ 120 kcal/kg), ≈ 24,7 g protein (≈ 2,8 g/kg).",
        "Laktozsuz formül (Bebelac LF) inek sütü proteini içerir; alerjide hata kabul edilir.",
        "Sıvı hedefi SA (8,8 kg) üzerinden 1320-1540 ml.",
    ],
    criticalRuleIds=["INFANT_COW_MILK", "INFANT_HONEY"],
    disclosureFacts=facts("cmpa-9m", [
        (1, "chief_complaint", "Bebeğimin inek sütü alerjisi var, ne yedireceğimi bilmiyorum.", True),
        (2, "feeding", "Önceden 'laktozsuz' yazan bir mama veriyorduk ama yine de kızarıklığı ve kusması oldu.", False),
        (2, "growth", "3 kilo 250 gramla doğdu, şimdi 8 kilo 800 gram.", True),
        (3, "family_social", "Yoğurt ve peynirin de olup olmayacağını bilmiyorum, bazen veriyorum.", False),
    ]),
    sourceNote="Defter: İnek sütü alerjisi, 9/12 yaş, DA 3250 g, SA 8800 g; 14 Mayıs revizyonunda Similac Alimentum.",
    verificationFlags=[
        "Defterde enerji hesabı 9,5 kg (OGA 9,55) ile yazılmış; burada 9,55 kg kullanıldı.",
        "Eski sayfada Bebelac LF yazıyordu; 14 Mayıs revizyonu (Alimentum) esas alındı.",
        "Alimentum ölçek sayısı (20 vs 25) iki sayfada farklı okundu; tablo değeri (20) alındı.",
    ],
)
c["fluid"] = fluid_perkg(rg(150, 175), "SA", 8.8, "Sıvı = (150-175) ml/kg × 8,8 kg (SA)")
CASES.append(c)

# 15) Çölyak ----------------------------------------------------------------
kg = 15
CASES.append({
    "id": "celiac-5y",
    "title": "Çölyak Hastalığı – 5 yaş",
    "domain": "malabsorption",
    "condition": "celiac",
    "stationBrief": "Çölyak tanılı 5 yaşındaki çocuğun ebeveyniyle görüşünüz; glutensiz beslenme planı oluşturunuz.",
    "patient": {"ageLabel": "5 yaşında", "ageMonths": 60, "sex": "unspecified", "parentRef": "çocuğum",
                "birthWeightG": None, "currentWeightKg": kg, "heightCm": None},
    "growth": {"idealWeightKg": 18, "idealWeightFormula": "OGA = 5 × 2 + 8 = 18 kg", "ogaApplicable": True,
               "ogaNote": "1 yaş üzeri: yaş × 2 + 8.", "weightLossPercent": None},
    "energy": energy_total(rg(1500, 1500), "SA", kg, "Enerji = 1000 + (5 × 100) = 1500 kcal"),
    "protein": protein_perkg(rg(1.5, 2.0), "SA", kg, "Protein = (1,5-2) g/kg × 15 kg"),
    "fluid": None,
    "formula": None,
    "sampleMenu": [
        "Sabah: ıhlamur, 1 ÖB meyve, 1 adet yumurta, 2 TK pekmez, 1 iD glutensiz ekmek",
        "Kuşluk: 2 adet glutensiz kraker, 1 çay bardağı süt (100 ml)",
        "Öğle: 1 kase unsuz çorba, 4-5 YK sebze yemeği (30 g kıyma), 2 iD glutensiz ekmek",
        "İkindi: 1 ÖB meyve, 1 adet glutensiz kraker",
        "Akşam: 4-5 YK sebze yemeği, 3 YK pirinç pilavı, 2 iD glutensiz ekmek",
        "Gece: 1 ÖB meyve, 1 çay bardağı (100 ml) yoğurt",
    ],
    "mustInclude": ["Tüm gluten kaynaklarının (buğday, arpa, çavdar) çıkarılması", "Glutensiz ürün seçimi ve çapraz bulaşma", "Büyüme izlemi"],
    "mustAvoid": ["Buğday/arpa/çavdar unlu ürünler", "Etiketsiz hazır gıda", "Çapraz bulaşma riski"],
    "keyClinicalPoints": [
        "Defter planı: ≈ 1454 kcal (≈ 97 kcal/kg), ≈ 28,2 g protein (≈ 1,88 g/kg).",
        "Protein hedefi 1,5-2 g/kg → 22,5-30 g.",
    ],
    "criticalRuleIds": [],
    "disclosureFacts": facts("celiac-5y", [
        (1, "chief_complaint", "Çocuğuma çölyak tanısı kondu, glutensiz beslenme planına ihtiyacımız var.", True),
        (2, "feeding", "Ekmek, makarna ve bisküviyi çok yiyor; yemeklerde un kullanıyorum.", True),
        (2, "growth", "5 yaşında, 15 kilo.", True),
        (3, "family_social", "Okulda arkadaşlarının yediklerini isteyince kıyamıyorum, bazen veriyorum.", False),
    ]),
    "sourceNote": "Defter: Çölyak, 5 yaş, 15 kg; enerji 5×100+1000, protein 1,5-2 g/kg.",
    "verificationFlags": ["Boy değeri defterde '130 cm' okundu; 5 yaş/15 kg ile uyumsuz, boş bırakıldı."],
})

# 16-17) Gastroenterit (guardrail için gerekli) -----------------------------
sa = 7.7
CASES.append({
    "id": "gastro-9m",
    "title": "Akut Gastroenterit – 9 aylık (hafif dehidratasyon)",
    "domain": "gastrointestinal",
    "condition": "gastroenteritis",
    "stationBrief": "Birkaç gündür ishal, kusma ve ateşi olan 9 aylık bebeğin annesiyle görüşünüz; sıvı ve beslenme planını oluşturunuz.",
    "patient": {"ageLabel": "9 aylık", "ageMonths": 9, "sex": "unspecified", "parentRef": "bebeğim",
                "birthWeightG": 3200, "currentWeightKg": sa, "heightCm": None},
    "growth": {"idealWeightKg": 9.5, "idealWeightFormula": "OGA = 3200 g + (6 × 800 g) + (3 × 500 g) = 9,5 kg",
               "ogaApplicable": True, "ogaNote": "Enerji/protein/sıvı defterde SA (7,7 kg) üzerinden hesaplandı.", "weightLossPercent": None},
    "energy": energy_perkg(rg(103, 105), "SA", sa, "Enerji = (103-105) kcal/kg × 7,7 kg (SA)"),
    "protein": protein_perkg(rg(2.0, 2.5), "SA", sa, "Protein = (2-2,5) g/kg × 7,7 kg (SA)"),
    "fluid": fluid_perkg(rg(150, 175), "SA", sa, "Sıvı = (150-175) ml/kg × 7,7 kg (SA)"),
    "rehydration": {
        "dehydration": "hafif",
        "orsMlPerKg": rg(50, 100),
        "hours": rg(4, 6),
        "totalOrsMl": times(rg(50, 100), sa),
        "afterEachLooseStoolMl": None,
        "escalation": "Düzelmezse +20 ml/kg/saat ORS (≈ 154 ml/saat, 2 saat).",
    },
    "formula": None,
    "sampleMenu": [
        "Uyanınca: anne sütü",
        "Kahvaltı: 100 ml elma suyu, 1 yumurta sarısı (1/2 yumurta), 1 TK pekmez, 1/2 iD ekmek içi",
        "Kuşluk: 100 ml yoğurt",
        "Öğle/Akşam: 1 kase çorba, 2 YK kıymalı patates yemeği",
        "İkindi: 100 ml elma suyu",
        "Gece: 150 ml Bebelac 2 (devam sütü)",
    ],
    "mustInclude": ["ORS ile rehidratasyon", "Anne sütü ve uygun beslenmeye devam", "Yağın kısıtlanmaması"],
    "mustAvoid": ["İshalde yağ kısıtlaması", "Uzun süreli açlık/yalnız su-çay", "İnek sütü", "Bal"],
    "keyClinicalPoints": [
        "İshal olsa da yağsız yemek verilmez; yağ KISITLANMAZ.",
        "Beslenmeye ara verilmez; anne sütü, yemek suları ve ekmek tüketimi sürer.",
        "Defter planı ≈ 803 kcal + anne sütü (≈ 104 kcal/kg), ≈ 21 g protein.",
    ],
    "criticalRuleIds": ["INFANT_COW_MILK", "INFANT_HONEY", "DIARRHEA_FAT_RESTRICTION"],
    "disclosureFacts": facts("gastro-9m", [
        (1, "chief_complaint", "Bebeğim birkaç gündür sulu kaka yapıyor, kusuyor ve ateşi var.", True),
        (2, "feeding", "Anne sütü alıyor; muhallebi, yemek suları, ekmek ve hazır meyve suyu da yiyor; iştahı azaldı.", True),
        (2, "growth", "Son tartıda 7 kilo 700 gramdı.", True),
        (3, "beliefs", "İshal artmasın diye yağlı şeyleri tamamen kestim, sadece su ve çay veriyorum; ORS'yi bilmiyorum.", False),
    ]),
    "sourceNote": "Defter: Gastroenterit, 9/12 yaş, DA 3200 g, SA 7700 g, ödem yok, iştah azalmış, hafif dehidrate.",
    "verificationFlags": ["ORS rehidratasyon süresi (4-6 saat) defterde 'ilk 4-6 saat' olarak okundu."],
})

sa = 12.5
CASES.append({
    "id": "gastro-2y",
    "title": "Akut Gastroenterit – 2 yaş (orta dehidratasyon)",
    "domain": "gastrointestinal",
    "condition": "gastroenteritis",
    "stationBrief": "Birkaç gündür ishal, kusma ve ateşi olan 2 yaşındaki çocuğun ebeveyniyle görüşünüz; sıvı ve beslenme planını oluşturunuz.",
    "patient": {"ageLabel": "2 yaşında", "ageMonths": 24, "sex": "unspecified", "parentRef": "çocuğum",
                "birthWeightG": None, "currentWeightKg": sa, "heightCm": 86},
    "growth": {"idealWeightKg": 12, "idealWeightFormula": "OGA = 2 × 2 + 8 = 12 kg", "ogaApplicable": True,
               "ogaNote": "Hesaplar mevcut ağırlık (12,5 kg) ile.", "weightLossPercent": None},
    "energy": energy_total(rg(1200, 1200), "SA", sa, "Enerji = (yaş × 100) + 1000 = 1200 kcal"),
    "protein": protein_perkg(rg(2.0, 2.5), "SA", sa, "Protein = (2-2,5) g/kg × 12,5 kg"),
    "fluid": None,
    "rehydration": {
        "dehydration": "orta",
        "orsMlPerKg": rg(50, 100),
        "hours": rg(4, 6),
        "totalOrsMl": times(rg(50, 100), sa),
        "afterEachLooseStoolMl": rg(100, 200),
        "escalation": "Düzelirse tedavi A; düzelmezse +20 ml/kg/saat ORS; yine düzelmezse tedavi C (IV, hekim).",
    },
    "formula": None,
    "sampleMenu": [
        "Kahvaltı: 1 tam yumurta, 1 TK pekmez, 1 iD beyaz ekmek, 1 ÇB elma suyu",
        "Ara: 1 KB muz, 1 kase yoğurt",
        "Öğle: 5-6 YK sebze yemeği, 1 iD beyaz ekmek, 1 kase yağlı çorba",
        "Ara: 1 ÖB şeftali",
        "Akşam: 3 YK pirinç pilavı, 1 adet köfte",
    ],
    "mustInclude": ["ORS ile rehidratasyon", "Her sulu dışkıdan sonra 100-200 ml ORS", "Yağın kısıtlanmaması", "Enerji ≥ 70 kcal/kg"],
    "mustAvoid": ["İshalde yağ kısıtlaması", "Uzun süreli açlık"],
    "keyClinicalPoints": [
        "İshal olsa da yağsız yemek verilmez; yağ KISITLANMAZ.",
        "1 yaştan sonra kg başına enerji 70 kcal'in altına düşmemelidir (70-80 kcal/kg).",
        "Defter planı ≈ 1068 kcal (≈ 85 kcal/kg), ≈ 32,5 g protein (≈ 2,6 g/kg).",
    ],
    "criticalRuleIds": ["DIARRHEA_FAT_RESTRICTION"],
    "disclosureFacts": facts("gastro-2y", [
        (1, "chief_complaint", "Çocuğum birkaç gündür günde 4-5 kez sulu kaka yapıyor, kusuyor ve ateşi var.", True),
        (2, "feeding", "İştahı yok, çok halsiz; gözleri çökük, ağzı kuru.", True),
        (2, "growth", "12 kilo 500 gram, boyu 86 santim.", True),
        (3, "beliefs", "Yağlı yemek ishali artırır diye yemeklerden yağı tamamen çıkardım.", False),
    ]),
    "sourceNote": "Defter: Gastroenterit, 2 yaş, 12,5 kg, 86 cm; son birkaç gündür günde 4-5 sulu dışkı, ateş (+), orta dehidrate.",
    "verificationFlags": ["Defterdeki protein aralığı '2-2,15 g/kg' yazıyor; 2-2,5 g/kg (25-31,25 g) olarak yorumlandı."],
})

# Çıktı ---------------------------------------------------------------------
out = {
    "meta": {
        "version": "0.1.0",
        "generatedBy": "scripts/generate-cases.py",
        "reviewStatus": "draft_requires_dietitian_review",
        "notes": [
            "Toplamlar defterdeki formüllerden kodla yeniden hesaplanmıştır; el yazısı değerlerle küçük farklar olabilir.",
            "notebookDerived=false olan ebeveyn ifadeleri simülasyon için kurgulanmıştır, defterde yer almaz.",
            "verificationFlags bir diyetisyen/öğretim üyesi tarafından kapatılmadan pilot kullanıma alınmamalıdır.",
        ],
    },
    "cases": CASES,
}

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(base, "src", "data", "cases.json")
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"{len(CASES)} vaka yazıldı -> {path}")
