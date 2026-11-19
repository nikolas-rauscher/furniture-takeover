const headlines = [
  "Find your next thing.",
  "A new home for good things.",
  "From one student room to the next.",
  "Less searching. More finding.",
  "Your next find starts here.",
  "Good things deserve a second home.",
];
const STORAGE_KEY = "takeover-last-headline";

/**
 * The headline of this browser session: chosen on its first visit and kept
 * across reloads, so a reload shows the same home page.
 */
function sessionHeadline(): string {
  const fresh = headlines[Math.floor(Math.random() * headlines.length)];
  try {
    const kept = sessionStorage.getItem(STORAGE_KEY);
    if (kept !== null && headlines.includes(kept)) return kept;
    sessionStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Where the browser blocks storage, the headline holds for this page load:
    // a decoration is no reason to fail the home page.
    return fresh;
  }
}

// Chosen once per page load, React's development double render included.
let pageHeadline: string | undefined;

export function HeroHeadline({ compact }: { compact: boolean }) {
  pageHeadline ??= sessionHeadline();
  return <h1 id="agent-title">{compact ? "Your search" : pageHeadline}</h1>;
}
