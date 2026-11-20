import { Component, Suspense, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { retryFailedScreens } from "../lazyScreen";
import "./screen-placeholder.css";

/** Holds the screen's place while its code arrives, so nothing jumps when it renders. */
function ScreenPlaceholder({ label }: { label: string }) {
  return (
    <div className="screen-placeholder" role="status" aria-label={label}>
      <Skeleton className="screen-placeholder-title" />
      <Skeleton className="screen-placeholder-block" />
      <Skeleton className="screen-placeholder-block" />
    </div>
  );
}

function ScreenLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="screen-placeholder screen-load-error" role="alert">
      <p>This screen couldn't load. Check your connection and try again.</p>
      <Button className="button secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

type LazyBoundaryProps = {
  /** Announced while the screen loads, e.g. "Loading Messages". */
  label: string;
  /** Replaces the page-sized placeholder, e.g. none for a dialog over the page. */
  placeholder?: ReactNode;
  children: ReactNode;
};

/** Shows a placeholder while a lazy screen loads and a retry if its code fails to arrive. */
export default class LazyBoundary extends Component<
  LazyBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <ScreenLoadError
          onRetry={() => {
            retryFailedScreens();
            this.setState({ failed: false });
          }}
        />
      );
    const { label, placeholder, children } = this.props;
    return (
      <Suspense
        fallback={
          placeholder === undefined ? (
            <ScreenPlaceholder label={label} />
          ) : (
            placeholder
          )
        }
      >
        {children}
      </Suspense>
    );
  }
}
