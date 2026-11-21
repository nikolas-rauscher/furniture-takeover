import assert from "node:assert/strict";
import test from "node:test";
import {
  resendFailure,
  signupEmailProblem,
  signupFailure,
  universityEmail,
} from "./signup.ts";

test("only exact EPFL and UNIL addresses can sign up, in any case", () => {
  assert.ok(universityEmail(" Lea.Martin@EPFL.ch "));
  assert.ok(universityEmail("lea@unil.ch"));
  assert.equal(universityEmail("lea@student.epfl.ch"), false);
  assert.equal(universityEmail("lea@epfl.ch.example.com"), false);
  assert.equal(universityEmail("lea@gmail.com"), false);
});

test("the email hint waits for the domain before it says no, unless the student submits", () => {
  assert.equal(signupEmailProblem("lea", false), "");
  assert.equal(signupEmailProblem("lea@epfl.ch", true), "");
  assert.match(
    signupEmailProblem("lea@gmail.com", false),
    /@epfl\.ch or @unil\.ch/,
  );
  assert.match(signupEmailProblem("lea", true), /Other addresses/);
  assert.match(signupEmailProblem(" ", true), /^Enter your/);
});

test("sign-up failures give the student a next step", () => {
  assert.match(signupFailure("over_email_send_rate_limit"), /Wait a minute/);
  assert.match(signupFailure(undefined), /Check your university email/);
  assert.match(resendFailure(undefined), /couldn't send the email again/);
  assert.match(resendFailure("over_email_send_rate_limit"), /Wait a minute/);
});
