import ChoiceList from "@/components/onboarding/ChoiceList";
import { LampDesk } from "@/components/icons";
import { useTourText } from "../i18n/TourLanguage";
import { orderOptions } from "../optionOrder";
import type { StepContext } from "./stepContext";
import type { V3Step } from "./v3Script";

type DeskStep = Extract<V3Step, { kind: "desk" }>;

/** Two listings of the same desk as the app would show them, then "Neither". */
export default function DeskTask({
  step,
  context,
}: {
  step: DeskStep;
  context: StepContext;
}) {
  const { v3 } = useTourText();
  const words = v3.steps.desk.options;
  const listings = step.options.map((id) => ({
    id,
    title: words[id as keyof typeof words],
    detail:
      id === "neither"
        ? undefined
        : v3.desk.distance[id as keyof typeof v3.desk.distance],
    tile:
      id === "neither" ? undefined : { icon: LampDesk, tint: "sand" as const },
  }));
  const order = context.progress.orders[step.id];
  const shown = order ? orderOptions(listings, order) : listings;
  return (
    <div className="tour-inworld" aria-label={v3.desk.listLabel} role="group">
      <p className="tour-inworld-bar" aria-hidden="true">
        {v3.desk.title}
      </p>
      <p className="ob-note">{v3.desk.sameTerms}</p>
      <ChoiceList
        label={v3.steps.desk.question}
        options={shown}
        selected={context.given[step.id].chosen}
        multiple={false}
        layout="list"
        onToggle={(id) => context.answer(step.id, { chosen: [id], text: "" })}
      />
    </div>
  );
}
