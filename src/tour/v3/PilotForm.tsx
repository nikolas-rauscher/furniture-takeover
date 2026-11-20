import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  STUDY_PILOT_HOUSES,
  STUDY_PILOT_ITEMS,
  STUDY_PILOT_ROLES,
  STUDY_PILOT_WEEKS,
  studyPilotSchema,
  type StudyPilot,
} from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";
import type { StepContext } from "./stepContext";

type Role = (typeof STUDY_PILOT_ROLES)[number];
type House = (typeof STUDY_PILOT_HOUSES)[number];
type Week = (typeof STUDY_PILOT_WEEKS)[number];
type Item = (typeof STUDY_PILOT_ITEMS)[number];

type Draft = {
  email: string;
  role: Role | null;
  house: House | null;
  weeks: Week[];
  items: Item[];
  joinPilot: boolean;
  laterEmail: boolean;
};

type Field = "email" | "role" | "house" | "ticks";
type Errors = Partial<Record<Field, string>>;

const EMPTY: Draft = {
  email: "",
  role: null,
  house: null,
  weeks: [],
  items: [],
  joinPilot: false,
  laterEmail: false,
};

const toggled = <Value,>(list: Value[], value: Value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

function Group({
  id,
  legend,
  error,
  children,
}: {
  id: string;
  legend: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset
      className="tour-fieldset"
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="tour-text-label">{legend}</legend>
      <div className="tour-chips">{children}</div>
      {error && (
        <p id={`${id}-error`} className="tour-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Tick({
  type,
  name,
  label,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="tour-tick">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

/** The separate pilot form for EPFL and UNIL students, stored without the session. */
export default function PilotForm({ context }: { context: StepContext }) {
  const text = useTourText();
  const { pilot } = text.v3;
  const itemWords = text.v3.steps["last-item"].options;
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  function check(current: Draft): Errors {
    const email = current.email.trim();
    const found: Errors = {};
    if (!email) found.email = pilot.errors.emailMissing;
    else if (!studyPilotSchema.shape.email.safeParse(email).success)
      found.email = pilot.errors.emailInvalid;
    if (!current.role) found.role = pilot.errors.role;
    if (!current.house) found.house = pilot.errors.house;
    if (!current.joinPilot && !current.laterEmail)
      found.ticks = pilot.errors.ticks;
    return found;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = check(draft);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      form.current
        ?.querySelector<HTMLElement>(`[data-field="${first}"] input`)
        ?.focus();
      return;
    }
    const sent: StudyPilot = studyPilotSchema.parse({
      ...draft,
      email: draft.email.trim(),
    });
    context.sendPilot(sent);
  }

  const change = (update: Partial<Draft>) => {
    const next = { ...draft, ...update };
    setDraft(next);
    // Errors already shown follow the fields as they are fixed.
    if (Object.keys(errors).length > 0) setErrors(check(next));
  };

  return (
    <form ref={form} className="tour-pilot" noValidate onSubmit={submit}>
      <div className="tour-text" data-field="email">
        <label htmlFor={`${id}-email`} className="tour-text-label">
          {pilot.email}
        </label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          value={draft.email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={`${id}-email-note${errors.email ? ` ${id}-email-error` : ""}`}
          onChange={(event) => change({ email: event.target.value })}
        />
        {errors.email && (
          <p id={`${id}-email-error`} className="tour-error">
            {errors.email}
          </p>
        )}
        <p id={`${id}-email-note`} className="tour-text-count">
          {pilot.note}
        </p>
      </div>
      <div data-field="role">
        <Group id={`${id}-role`} legend={pilot.role} error={errors.role}>
          {STUDY_PILOT_ROLES.map((role) => (
            <Tick
              key={role}
              type="radio"
              name={`${id}-role`}
              label={pilot.roles[role]}
              checked={draft.role === role}
              onChange={() => change({ role })}
            />
          ))}
        </Group>
      </div>
      <Group id={`${id}-items`} legend={pilot.items}>
        {STUDY_PILOT_ITEMS.map((item) => (
          <Tick
            key={item}
            type="checkbox"
            name={`${id}-items`}
            label={itemWords[item]}
            checked={draft.items.includes(item)}
            onChange={() => change({ items: toggled(draft.items, item) })}
          />
        ))}
      </Group>
      <div data-field="house">
        <Group id={`${id}-house`} legend={pilot.house} error={errors.house}>
          {STUDY_PILOT_HOUSES.map((house) => (
            <Tick
              key={house}
              type="radio"
              name={`${id}-house`}
              label={pilot.houses[house]}
              checked={draft.house === house}
              onChange={() => change({ house })}
            />
          ))}
        </Group>
      </div>
      <Group id={`${id}-weeks`} legend={pilot.weeks}>
        {STUDY_PILOT_WEEKS.map((week) => (
          <Tick
            key={week}
            type="checkbox"
            name={`${id}-weeks`}
            label={pilot.weekLabels[week]}
            checked={draft.weeks.includes(week)}
            onChange={() => change({ weeks: toggled(draft.weeks, week) })}
          />
        ))}
      </Group>
      <div data-field="ticks">
        <Group
          id={`${id}-ticks`}
          legend={pilot.consentLegend}
          error={errors.ticks}
        >
          <Tick
            type="checkbox"
            name={`${id}-join`}
            label={pilot.joinPilot}
            checked={draft.joinPilot}
            onChange={() => change({ joinPilot: !draft.joinPilot })}
          />
          <Tick
            type="checkbox"
            name={`${id}-later`}
            label={pilot.laterEmail}
            checked={draft.laterEmail}
            onChange={() => change({ laterEmail: !draft.laterEmail })}
          />
        </Group>
      </div>
      <div className="tour-form-actions">
        <Button type="submit" className="button primary large">
          {pilot.send}
        </Button>
        <Button
          type="button"
          className="button quiet large"
          onClick={context.moveOn}
        >
          {pilot.noThanks}
        </Button>
      </div>
    </form>
  );
}
