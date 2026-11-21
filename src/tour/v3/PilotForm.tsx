import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  STUDY_PILOT_PLACES,
  STUDY_PILOT_ROLES,
  studyPilotSchema,
  type StudyPilot,
} from "../../../shared/study.ts";
import { useTourText } from "../i18n/TourLanguage";
import { toggleOption } from "../optionOrder";
import type { StepContext } from "./stepContext";

type Role = (typeof STUDY_PILOT_ROLES)[number];
type Place = (typeof STUDY_PILOT_PLACES)[number];
const isRole = (id: string): id is Role =>
  STUDY_PILOT_ROLES.some((role) => role === id);
type Tick = "launchNews" | "tryEarly" | "interview" | "futureSurveys";
const TICKS: readonly Tick[] = [
  "launchNews",
  "tryEarly",
  "interview",
  "futureSurveys",
];

type Draft = Record<Tick, boolean> & {
  email: string;
  roles: Role[];
  place: Place | null;
};

type Field = "email" | "ticks" | "role" | "place";
type Errors = Partial<Record<Field, string>>;

const EMPTY: Draft = {
  email: "",
  launchNews: false,
  tryEarly: false,
  interview: false,
  futureSurveys: false,
  roles: [],
  place: null,
};

/** "Not sure yet" clears the other roles and is cleared by them. */
const ROLE_OPTIONS = STUDY_PILOT_ROLES.map((id) => ({
  id,
  label: id,
  exclusive: id === "not-sure",
}));

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

function TickBox({
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

/**
 * The optional form at the end, stored without the session. Roles and place are asked
 * only of those who want to try takeover early.
 */
export default function PilotForm({ context }: { context: StepContext }) {
  const { pilot } = useTourText().v3;
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
    if (!TICKS.some((tick) => current[tick])) found.ticks = pilot.errors.ticks;
    if (current.tryEarly && current.roles.length === 0)
      found.role = pilot.errors.role;
    if (current.tryEarly && !current.place) found.place = pilot.errors.place;
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
      // The follow-up questions are answered only by those who want to try early.
      roles: draft.tryEarly ? draft.roles : [],
      place: draft.tryEarly ? draft.place : null,
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
      <div data-field="ticks">
        <Group
          id={`${id}-ticks`}
          legend={pilot.ticksLegend}
          error={errors.ticks}
        >
          {TICKS.map((tick) => (
            <TickBox
              key={tick}
              type="checkbox"
              name={`${id}-${tick}`}
              label={pilot.ticks[tick]}
              checked={draft[tick]}
              onChange={() => change({ [tick]: !draft[tick] })}
            />
          ))}
        </Group>
      </div>
      {draft.tryEarly && (
        <>
          <div data-field="role">
            <Group id={`${id}-role`} legend={pilot.role} error={errors.role}>
              {STUDY_PILOT_ROLES.map((role) => (
                <TickBox
                  key={role}
                  type="checkbox"
                  name={`${id}-role-${role}`}
                  label={pilot.roles[role]}
                  checked={draft.roles.includes(role)}
                  onChange={() =>
                    change({
                      roles: toggleOption(
                        ROLE_OPTIONS,
                        draft.roles,
                        role,
                      ).filter(isRole),
                    })
                  }
                />
              ))}
            </Group>
          </div>
          <div data-field="place">
            <Group id={`${id}-place`} legend={pilot.place} error={errors.place}>
              {STUDY_PILOT_PLACES.map((place) => (
                <TickBox
                  key={place}
                  type="radio"
                  name={`${id}-place`}
                  label={pilot.places[place]}
                  checked={draft.place === place}
                  onChange={() => change({ place })}
                />
              ))}
            </Group>
          </div>
        </>
      )}
      <div className="tour-form-actions">
        <Button type="submit" className="button primary large">
          {pilot.send}
        </Button>
      </div>
    </form>
  );
}
