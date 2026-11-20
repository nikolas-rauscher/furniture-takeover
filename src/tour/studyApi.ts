import {
  STUDY_ROUTES,
  studyAnswerSchema,
  studyConfigSchema,
  studyContactSchema,
  studyStartSchema,
  type StudyAnswer,
  type StudyConfig,
  type StudyContact,
  type StudyStart,
} from "../../shared/study.ts";

async function failure(response: Response, what: string) {
  const detail = await response.text();
  return new Error(`Could not ${what} (${response.status}). ${detail}`.trim());
}

async function post(route: string, body: unknown, what: string) {
  const response = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await failure(response, what);
}

export async function readStudyConfig(): Promise<StudyConfig> {
  const response = await fetch(STUDY_ROUTES.config);
  if (!response.ok) throw await failure(response, "read the study's setup");
  return studyConfigSchema.parse(await response.json());
}

export function startSession(start: StudyStart) {
  return post(
    STUDY_ROUTES.sessions,
    studyStartSchema.parse(start),
    "start the session",
  );
}

export function saveAnswer(answer: StudyAnswer) {
  return post(
    STUDY_ROUTES.answers,
    studyAnswerSchema.parse(answer),
    `save the answer to ${answer.step}`,
  );
}

export function sendContact(contact: StudyContact) {
  return post(
    STUDY_ROUTES.contacts,
    studyContactSchema.parse(contact),
    "send the email address",
  );
}
