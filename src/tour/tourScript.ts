/**
 * The study's questions as data, in the order of docs/STUDY.md. Step and option ids are
 * what the server stores, so they change only together with `STUDY_VERSION`.
 */

import type { StudyLanguage } from "../../shared/study.ts";
import type { TourScene } from "./device/sceneMessages.ts";
import type { TourText } from "./i18n/en.ts";
import { TOUR_TEXT } from "./i18n/tourText.ts";
import { isShown, type StepCondition } from "./stepConditions.ts";

/** Raised whenever a question, an option or its wording changes. */
export const STUDY_VERSION = "pilot-2";

export type StudyOption = {
  id: string;
  label: string;
  detail?: string;
  /** Stays below the shuffled options, in the order listed. */
  last?: boolean;
  /** Clears every other option when picked, and is cleared by them. */
  exclusive?: boolean;
  /** Asks for a few words once picked. */
  withText?: boolean;
};

type BaseStep = { id: string; when?: StepCondition };

type ChoiceStep = BaseStep & {
  kind: "single" | "multiple";
  question: string;
  options: StudyOption[];
  shuffle: boolean;
  skippable: boolean;
};

type TextStep = BaseStep & {
  kind: "text";
  question: string;
  skippable: true;
};

/** A line of Pako's between parts of the study, answered with Continue. */
type LineStep = BaseStep & { kind: "line"; text: string };

/** Task C1: two desk cards in random order, then "Neither". */
type DeskTaskStep = BaseStep & {
  kind: "nearer-or-cheaper";
  question: string;
  options: StudyOption[];
};

/** Task C2: an offer draft with one wrong detail. */
export type DraftTaskStep = BaseStep & {
  kind: "draft-check";
  situation: string;
  prompt: string;
  draft: string;
  explanation: string;
};

export const DRAFT_ACTIONS = {
  send: "send",
  edit: "edit",
  writeOwn: "write-own",
  dontSend: "dont-send",
} as const;
export const DRAFT_RESULTS = {
  fridayKept: "friday-kept",
  fridayFixed: "friday-fixed",
  notSent: "not-sent",
} as const;
export type DraftAction = (typeof DRAFT_ACTIONS)[keyof typeof DRAFT_ACTIONS];
export type DraftResult = (typeof DRAFT_RESULTS)[keyof typeof DRAFT_RESULTS];

export type StudyStep =
  | ChoiceStep
  | TextStep
  | LineStep
  | DeskTaskStep
  | DraftTaskStep
  | (BaseStep & { kind: "scene"; scene: TourScene })
  | (BaseStep & { kind: "contact"; question: string })
  | (BaseStep & { kind: "end"; text: string });

const STUDENT_ANSWERS = ["yes-epfl", "yes-unil", "yes-elsewhere"];
/** Everything in part B after `last-role` follows only an attempt in the last 12 months. */
const TRIED: StepCondition = {
  step: "last-role",
  anyOf: ["buying", "selling", "giving-away"],
};

type V1Text = TourText["v1"];
type V1StepText = V1Text["steps"];

/** Options in the order listed, with their words from the dictionary. */
function choices<Id extends string>(
  labels: Record<Id, string>,
  ids: readonly Id[],
): StudyOption[] {
  return ids.map((id) => ({ id, label: labels[id] }));
}

function single<Id extends keyof V1StepText>(
  text: V1Text,
  id: Id,
  ids: readonly (keyof V1StepText[Id]["options"] & string)[],
  extra: Partial<ChoiceStep> = {},
): ChoiceStep {
  const { question, options } = text.steps[id];
  return {
    kind: "single",
    id,
    question,
    options: choices(options as Record<string, string>, ids),
    shuffle: false,
    skippable: false,
    ...extra,
  };
}

function textStep(
  id: string,
  question: string,
  when?: StepCondition,
): TextStep {
  return { kind: "text", id, question, skippable: true, when };
}

const TRANSPORT = [
  "on-foot",
  "bike",
  "public-transport",
  "car",
  "delivery",
] as const;

/** The v1 questionnaire in one language; ids, order and conditions are the same in all. */
function buildStudySteps(text: V1Text): StudyStep[] {
  const { steps } = text;
  return [
    single(text, "student", ["yes-epfl", "yes-unil", "yes-elsewhere", "no"]),
    single(text, "housing", [
      "fmel",
      "shared-flat",
      "own-flat",
      "with-family",
      "elsewhere",
    ]),
    single(text, "last-role", [
      "buying",
      "selling",
      "giving-away",
      "not-tried",
    ]),
    single(text, "last-occasion", ["moving-in", "moving-out", "during-year"], {
      when: TRIED,
    }),
    single(text, "last-outcome", ["worked-out", "gave-up", "still-open"], {
      when: TRIED,
    }),
    textStep("last-story", text.lastStory, TRIED),
    {
      kind: "multiple",
      id: "last-hard",
      question: steps["last-hard"].question,
      options: [
        ...choices(steps["last-hard"].options, [
          "finding",
          "listing",
          "price",
          "replies",
          "pickup-fell-through",
          "timing",
          "transport",
          "trust",
        ]),
        {
          id: "nothing",
          label: steps["last-hard"].options.nothing,
          last: true,
          exclusive: true,
        },
        {
          id: "something-else",
          label: steps["last-hard"].options["something-else"],
          last: true,
          withText: true,
        },
      ],
      shuffle: true,
      skippable: false,
      when: TRIED,
    },
    single(text, "last-transport", [...TRANSPORT, "didnt"], { when: TRIED }),
    single(text, "attempts", ["once", "two-to-five", "more-than-five"], {
      when: TRIED,
    }),
    { kind: "line", id: "tasks-intro", text: text.tasksIntro },
    {
      kind: "nearer-or-cheaper",
      id: "nearer-or-cheaper",
      question: steps["nearer-or-cheaper"].question,
      options: [
        {
          id: "nearer",
          label: steps["nearer-or-cheaper"].options.nearer,
          detail: text.deskDetails.nearer,
        },
        {
          id: "cheaper",
          label: steps["nearer-or-cheaper"].options.cheaper,
          detail: text.deskDetails.cheaper,
        },
        {
          id: "neither",
          label: steps["nearer-or-cheaper"].options.neither,
          last: true,
        },
      ],
    },
    single(text, "far-transport", [...TRANSPORT, "not-sure"], {
      when: { step: "nearer-or-cheaper", anyOf: ["cheaper"] },
    }),
    {
      kind: "draft-check",
      id: "draft-check",
      situation: text.draft.situation,
      prompt: text.draft.prompt,
      draft: text.draft.draft,
      explanation: text.draft.explanation,
    },
    textStep("draft-why", text.draftWhy),
    { kind: "line", id: "tour-intro", text: text.tourIntro },
    { kind: "scene", id: "tour-snap", scene: "sell" },
    { kind: "scene", id: "tour-chat", scene: "deal" },
    { kind: "scene", id: "tour-ask", scene: "find" },
    {
      kind: "multiple",
      id: "would-use",
      question: steps["would-use"].question,
      options: [
        ...choices(steps["would-use"].options, [
          "describe-search",
          "photo-listing",
          "price-suggestion",
          "offer-drafts",
          "pickup-reminders",
        ]),
        {
          id: "none",
          label: steps["would-use"].options.none,
          last: true,
          exclusive: true,
        },
      ],
      shuffle: true,
      skippable: false,
    },
    textStep("missing", text.missing),
    single(text, "autonomy", [
      "nothing",
      "short-updates",
      "simple-replies",
      "negotiate",
    ]),
    single(text, "need-soon", ["sell", "need", "both", "neither"]),
    { kind: "contact", id: "contact", question: text.contact.question },
    single(text, "age", ["18-20", "21-23", "24-26", "27-plus", "no-answer"], {
      skippable: true,
    }),
    single(text, "gender", ["woman", "man", "non-binary", "no-answer"], {
      skippable: true,
    }),
    single(text, "level", ["bachelor", "master", "phd", "exchange", "other"], {
      skippable: true,
      when: { step: "student", anyOf: STUDENT_ANSWERS },
    }),
    { kind: "end", id: "end", text: text.end.text },
  ];
}

/** The v1 steps in every language the page speaks. */
export const STUDY_SCRIPTS: Record<StudyLanguage, StudyStep[]> = {
  en: buildStudySteps(TOUR_TEXT.en.v1),
  fr: buildStudySteps(TOUR_TEXT.fr.v1),
  de: buildStudySteps(TOUR_TEXT.de.v1),
};

/** Steps whose answers are stored; lines, scenes, the contact and the end are not. */
export function isQuestion(step: StudyStep): boolean {
  return (
    step.kind === "single" ||
    step.kind === "multiple" ||
    step.kind === "text" ||
    step.kind === "nearer-or-cheaper" ||
    step.kind === "draft-check"
  );
}

export type StepAnswer = { chosen: string[]; shown: string[]; text: string };
export type AnswerSheet = Record<string, StepAnswer>;

/** The steps this participant sees, given their answers so far. */
export function visibleSteps(
  steps: readonly StudyStep[],
  answers: AnswerSheet,
): StudyStep[] {
  return steps.filter((step) => isShown(step, answers));
}

export function stepById(steps: readonly StudyStep[], id: string): StudyStep {
  const step = steps.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`The study has no step ${id}.`);
  return step;
}
