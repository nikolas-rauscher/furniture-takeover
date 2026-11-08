const headlines = [
  "Find your next thing.",
  "A new home for good things.",
  "Tell us what you need.",
  "Less searching. More finding.",
  "Your next find starts here.",
  "Good things deserve a second home.",
];

// One selection per page load, including React's development double render.
let pageHeadline: string | undefined;
function selectHeadline() {
  if (pageHeadline) return pageHeadline;
  let previous = "";
  try {
    previous = sessionStorage.getItem("takeover-last-headline") ?? "";
  } catch {
    // The headline still works when browser storage is unavailable.
  }
  const choices = headlines.filter((headline) => headline !== previous);
  pageHeadline = choices[Math.floor(Math.random() * choices.length)];
  try {
    sessionStorage.setItem("takeover-last-headline", pageHeadline);
  } catch {
    // No persistence is needed for the rest of the interface.
  }
  return pageHeadline;
}

export function HeroHeadline({ compact }: { compact: boolean }) {
  const text = selectHeadline();
  return <h1 id="agent-title">{compact ? "Your search" : text}</h1>;
}
