import { AlertCircle, Camera } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import type { PhotoSearchNotice } from "../photoSearchFeedback";

export default function PhotoSearchFeedback({
  notice,
}: {
  notice: PhotoSearchNotice;
}) {
  const failed = notice.kind === "error";
  const Icon = failed ? AlertCircle : Camera;
  return (
    <Alert
      variant={failed ? "destructive" : "default"}
      role={failed ? "alert" : "status"}
      className="my-3 min-w-0 border-solid border-border [overflow-wrap:anywhere]"
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.description}</AlertDescription>
    </Alert>
  );
}
