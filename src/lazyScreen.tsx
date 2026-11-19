import { use, type ComponentType } from "react";

type ScreenModule<Props> = { default: ComponentType<Props> };

/** A screen whose code loads on first use or on `prefetch`. */
export type LazyScreen<Props> = ComponentType<Props> & {
  prefetch: () => Promise<unknown>;
};

/** Screens whose code failed to load; they keep their failure until a retry. */
const failedScreens = new Set<() => void>();

/** Lets every screen whose code failed to load try again, as the retry button asks. */
export function retryFailedScreens() {
  for (const reset of failedScreens) reset();
  failedScreens.clear();
}

/**
 * Like `React.lazy`, but a screen that has already loaded renders at once, so a
 * prefetched screen never flashes its placeholder, and a failed load can be retried.
 */
export function lazyScreen<Props extends object>(
  load: () => Promise<ScreenModule<Props>>,
): LazyScreen<Props> {
  let loaded: ComponentType<Props> | null = null;
  let pending: Promise<ScreenModule<Props>> | null = null;
  let failed = false;
  function reset() {
    pending = null;
    failed = false;
  }
  /** Renders reuse a failed load, so the failure reaches the error boundary once. */
  function start() {
    pending ??= load().then(
      (module) => {
        loaded = module.default;
        return module;
      },
      (error: unknown) => {
        failed = true;
        failedScreens.add(reset);
        throw error;
      },
    );
    return pending;
  }
  /** A new sign of intent tries a failed load again. */
  function prefetch() {
    if (failed) reset();
    return start();
  }
  function Screen(props: Props) {
    const Component = loaded ?? use(start()).default;
    return <Component {...props} />;
  }
  return Object.assign(Screen, { prefetch });
}
