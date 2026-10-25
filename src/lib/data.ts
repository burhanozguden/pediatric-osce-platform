/**
 * Veri yükleyiciler: cases.json ve personas.json tip güvenli biçimde okunur.
 * JSON dosyaları derleme zamanında pakete gömülür (resolveJsonModule).
 */
import casesJson from '@/data/cases.json';
import personasJson from '@/data/personas.json';
import type { CasesFile, ClinicalCase, Persona, PersonasFile } from '@/types';

// JSON literal tipleri sıkı arayüzlerle birebir uyuşmaz; veri üretici betik ve
// testler şemayı doğrular, bu yüzden burada tek noktada daraltıyoruz.
const casesFile = casesJson as unknown as CasesFile;
const personasFile = personasJson as unknown as PersonasFile;

export function getCasesFile(): CasesFile {
  return casesFile;
}

export function listCases(): ClinicalCase[] {
  return casesFile.cases;
}

export function getCase(id: string): ClinicalCase | undefined {
  return casesFile.cases.find((c) => c.id === id);
}

export function listPersonas(): Persona[] {
  return personasFile.personas;
}

export function getPersona(id: string): Persona | undefined {
  return personasFile.personas.find((p) => p.id === id);
}
