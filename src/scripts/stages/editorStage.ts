// Etapa de editor. Por ahora (Hito 4) solo pinta la lista de segmentos
// transcritos en la barra lateral. La edición real (timeline, undo/redo,
// estilos) llega en el Hito 5.

import { session } from "@/scripts/session";
import { formatTimecode } from "@/scripts/subtitles";

export function renderSegments(): void {
  const list = document.querySelector<HTMLElement>('[data-editor="segments"]');
  const empty = document.querySelector<HTMLElement>('[data-editor="empty"]');
  if (!list) return;

  list.replaceChildren();

  if (session.segments.length === 0) {
    if (empty) {
      empty.textContent = window.__I18N__.editor.empty;
      empty.hidden = false;
    }
    return;
  }
  if (empty) empty.hidden = true;

  for (const seg of session.segments) {
    const li = document.createElement("li");
    li.className = "rounded-lg bg-on-deep-soft/10 px-3 py-2.5";

    const time = document.createElement("span");
    time.className = "block font-mono text-xs text-aqua";
    time.textContent = formatTimecode(seg.start);

    const text = document.createElement("p");
    text.className = "mt-1 text-sm leading-snug text-on-deep";
    text.textContent = seg.text;

    li.append(time, text);
    list.appendChild(li);
  }
}
