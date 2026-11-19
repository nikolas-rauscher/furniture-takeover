import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import type { Resource } from "./useAdminResource";

/** An admin list while it loads, when it failed with a way to try again, or its rows. */
export default function AdminLoad<T>({
  resource,
  what,
  onRetry,
  children,
}: {
  resource: Resource<T>;
  /** What is loading, as in "Loading the overview". */
  what: string;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}) {
  if (resource.state === "ready") return children(resource.data);
  if (resource.state === "loading")
    return (
      <p className="admin-loading" role="status">
        <Spinner role="presentation" aria-hidden="true" /> Loading {what}…
      </p>
    );
  return (
    <div className="admin-load-failed" role="alert">
      <p>
        Couldn't load {what}. {resource.message}
      </p>
      <Button className="button secondary small" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
