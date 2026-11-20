export const PASSWORD_MIN_LENGTH = 8;

/** Exactly @epfl.ch or @unil.ch; the database refuses any other address. */
const UNIVERSITY_EMAIL = /^[^@\s]+@(epfl|unil)\.ch$/i;

export const universityEmail = (email: string) =>
  UNIVERSITY_EMAIL.test(email.trim());

const DOMAIN_PROBLEM =
  "Use your @epfl.ch or @unil.ch address. Other addresses can't sign up.";

/**
 * Why an email can't sign up, in the student's words; empty while it can.
 * While the student is still typing, an address without its domain yet is
 * left alone; on submit, it gets its next step too.
 */
export function signupEmailProblem(email: string, submitting: boolean): string {
  const typed = email.trim();
  if (universityEmail(typed)) return "";
  if (!typed)
    return submitting ? "Enter your @epfl.ch or @unil.ch address." : "";
  if (!typed.includes("@") && !submitting) return "";
  return DOMAIN_PROBLEM;
}

/** A failed sign-up in the student's words, from the auth provider's error code. */
export function signupFailure(code: string | undefined): string {
  switch (code) {
    case "over_email_send_rate_limit":
      return "I've sent a few emails already. Wait a minute, then try again.";
    case "weak_password":
      return `Choose a stronger password with at least ${PASSWORD_MIN_LENGTH} characters.`;
    case "email_address_invalid":
      return DOMAIN_PROBLEM;
    case "signup_disabled":
      return "Sign-up is closed right now. Try again later.";
    default:
      return "I couldn't create your account. Check your university email and try again.";
  }
}

/** A failed resend of the confirmation email, in the student's words. */
export function resendFailure(code: string | undefined): string {
  return code === "over_email_send_rate_limit"
    ? signupFailure(code)
    : "I couldn't send the email again. Wait a minute, then try again.";
}
