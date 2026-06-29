// Alterna la visibilidad de las etapas de la app (upload → config → editor) y
// el cambio de modo papel ⇄ agua profunda. La lógica pesada de cada etapa vive
// en scripts/stages/*; aquí solo va la navegación.

export type StageName = "upload" | "config" | "editor";

const ORDER: StageName[] = ["upload", "config", "editor"];

interface Refs {
  landing: HTMLElement;
  app: HTMLElement;
  stages: Map<StageName, HTMLElement>;
  steps: Map<StageName, HTMLElement>;
}

let refs: Refs | null = null;
let current: StageName | null = null;

export function init(): void {
  const stages = new Map<StageName, HTMLElement>();
  const steps = new Map<StageName, HTMLElement>();
  for (const name of ORDER) {
    stages.set(name, document.querySelector<HTMLElement>(`[data-stage="${name}"]`)!);
    steps.set(name, document.querySelector<HTMLElement>(`[data-step="${name}"]`)!);
  }
  refs = {
    landing: document.querySelector<HTMLElement>("#landing")!,
    app: document.querySelector<HTMLElement>("#app")!,
    stages,
    steps,
  };
}

export function goTo(stage: StageName): void {
  if (!refs) return;
  for (const [name, el] of refs.stages) el.hidden = name !== stage;
  const reached = ORDER.indexOf(stage);
  for (const [name, el] of refs.steps) {
    const index = ORDER.indexOf(name);
    el.classList.toggle("is-active", index === reached);
    el.classList.toggle("is-done", index < reached);
    if (index === reached) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  }
  current = stage;
  refs.stages.get(stage)!.querySelector<HTMLElement>("[data-stage-heading]")?.focus();
  window.scrollTo({ top: 0 });
}

export function enterApp(): void {
  if (!refs) return;
  refs.landing.hidden = true;
  refs.app.hidden = false;
  document.body.classList.replace("landing", "editor");
  goTo("upload");
}

export function exitApp(): void {
  if (!refs) return;
  refs.app.hidden = true;
  refs.landing.hidden = false;
  document.body.classList.replace("editor", "landing");
  current = null;
  refs.landing.querySelector<HTMLElement>("[data-landing-heading]")?.focus();
  window.scrollTo({ top: 0 });
}

export function next(): void {
  if (!current) return;
  const i = ORDER.indexOf(current);
  if (i < ORDER.length - 1) goTo(ORDER[i + 1]);
}

export function back(): void {
  if (!current) return;
  const i = ORDER.indexOf(current);
  if (i > 0) goTo(ORDER[i - 1]);
  else exitApp();
}

export function getCurrent(): StageName | null {
  return current;
}
