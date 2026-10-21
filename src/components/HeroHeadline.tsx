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
  let character = 0;
  return (
    <h1 id="agent-title" aria-label={compact ? "Your search" : text}>
      {compact ? (
        "Your search"
      ) : (
        <span aria-hidden="true" className="hero-written-headline">
          {text.split(" ").map((word, index) => (
            <span key={index} className="hero-headline-word">
              {[...(index ? " " : ""), ...word].map((letter, letterIndex) => (
                <span
                  key={letterIndex}
                  style={{ animationDelay: `${character++ * 14}ms` }}
                >
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </span>
      )}
    </h1>
  );
}
