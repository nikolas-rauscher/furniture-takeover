export class AgentError extends Error {
  status: number;
  code: string;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AgentError";
    this.status = status;
    this.code = code;
  }
}

export const agentNotConfigured = () =>
  new AgentError(
    503,
    "AGENT_NOT_CONFIGURED",
    "Add the model API key to the server .env to enable the agent.",
  );

export const invalidOutput = (cause?: unknown) =>
  new AgentError(
    502,
    "INVALID_AGENT_RESPONSE",
    "The agent returned an incomplete response. Please try again.",
    { cause },
  );

export class RunError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RunError";
    this.code = code;
  }
}
