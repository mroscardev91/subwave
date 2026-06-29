export const languages = {
  en: "English",
  es: "Español",
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = "en";

/** Path prefix for a locale: "" for the default, "/es" otherwise. */
export const localePath: Record<Lang, string> = {
  en: "",
  es: "/es",
};
