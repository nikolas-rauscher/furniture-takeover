export class AgentError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AgentError";
    this.status = status;
    this.code = code;
  }
}

export const invalidOutput = () =>
  new AgentError(
    502,
    "INVALID_AGENT_RESPONSE",
    "The agent returned an incomplete response. Please try again.",
  );

export class RunError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RunError";
    this.code = code;
  }
}
