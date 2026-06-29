// Idiomas soportados: código corto (el que usan los modelos OPUS-MT) y etiqueta.

export interface LangOption {
  code: string;
  label: string;
}

export const languageOptions: LangOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
];

export function langLabel(code: string): string {
  return languageOptions.find((l) => l.code === code)?.label ?? code;
}
