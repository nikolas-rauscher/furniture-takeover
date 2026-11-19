export type PhotoSearchNotice = {
  kind: "clarification" | "error";
  title: string;
  description: string;
};

export function photoSearchClarification(): PhotoSearchNotice {
  return {
    kind: "clarification",
    title: "Which item should I look for?",
    description: "Describe the item in the search box, or try a clearer photo.",
  };
}

export function photoSearchFailure(error: unknown): PhotoSearchNotice {
  return {
    kind: "error",
    title: "Photo search couldn't finish",
    description:
      error instanceof Error && error.message.trim()
        ? error.message
        : "Try uploading the photo again, or describe the item in the search box.",
  };
}
