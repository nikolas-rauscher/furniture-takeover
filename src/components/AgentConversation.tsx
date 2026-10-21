import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { emptyAgentRunState, type AgentRunState } from "../hooks/useAgentRun";
import { motionBehavior } from "../uiMotion";
import "./search-conversation.css";

type AgentConversationProps = {
  state: AgentRunState;
  requestLabel?: (request: string) => string;
  children: (turn: AgentRunState, archived: boolean) => ReactNode;
  footer?: ReactNode;
  context?: ReactNode;
};

/** Each turn keeps its DOM; only this viewport follows new messages. */
export default function AgentConversation({
  state,
  requestLabel = (request) => request,
  children,
  footer,
  context,
}: AgentConversationProps) {
  const headingId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLOListElement>(null);
  const anchor = useRef<{ element: HTMLElement; offset: number } | null>(null);
  const rememberPosition = () => {
    const el = viewport.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const firstVisible = Array.from(
      el.querySelectorAll<HTMLElement>(
        ".user-message, .agent-run-question, .agent-run-answer > *, .product-card",
      ),
    ).find((node) => node.getBoundingClientRect().bottom > top);
    anchor.current = firstVisible
      ? {
          element: firstVisible,
          offset: firstVisible.getBoundingClientRect().top - top,
        }
      : null;
  };
  const restorePosition = () => {
    const el = viewport.current;
    const saved = anchor.current;
    if (!el || !saved?.element.isConnected) return;
    el.scrollTop +=
      saved.element.getBoundingClientRect().top -
      el.getBoundingClientRect().top -
      saved.offset;
  };
  const follow = useRef(true);
  const moving = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const previousTurn = useRef<string | undefined>(undefined);
  const [following, setFollowing] = useState(true);
  const setFollow = (value: boolean) => {
    follow.current = value;
    setFollowing(value);
  };
  const scrollDown = () => {
    const el = viewport.current;
    if (!el) return;
    if (scrollFrame.current !== null) return;
    if (motionBehavior() === "auto") {
      el.scrollTop = el.scrollHeight;
      return;
    }
    moving.current = true;
    let previous = performance.now();
    const advance = (now: number) => {
      const target = Math.max(0, el.scrollHeight - el.clientHeight);
      const distance = target - el.scrollTop;
      const elapsed = Math.min(now - previous, 64);
      previous = now;
      if (Math.abs(distance) < 2 || motionBehavior() === "auto") {
        el.scrollTop = target;
        scrollFrame.current = null;
        moving.current = false;
        return;
      }
      el.scrollTop +=
        Math.sign(distance) *
        Math.max(1, Math.abs(distance) * (1 - Math.exp(-elapsed / 95)));
      scrollFrame.current = requestAnimationFrame(advance);
    };
    scrollFrame.current = requestAnimationFrame(advance);
  };
  const turnKey = state.turnKey || state.id || "";
  useLayoutEffect(() => {
    if (previousTurn.current !== turnKey) {
      previousTurn.current = turnKey;
      setFollow(true);
    }
    if (follow.current) scrollDown();
    else restorePosition();
  }, [state, turnKey]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (follow.current) scrollDown();
      else restorePosition();
    });
    if (content.current) observer.observe(content.current);
    if (viewport.current) observer.observe(viewport.current);
    return () => {
      observer.disconnect();
      if (scrollFrame.current !== null)
        cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = null;
    };
  }, []);
  const pauseFollow = () => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    moving.current = false;
    setFollow(false);
  };
  const turns = state.id ? [...state.history, state] : [];
  return (
    <section
      className="search-conversation chat-workspace"
      aria-labelledby={headingId}
    >
      <div className="search-conversation-heading">
        <h2 id={headingId}>Your conversation</h2>
      </div>
      {context && <div className="chat-context">{context}</div>}
      <div
        className="chat-scroll-viewport"
        ref={viewport}
        tabIndex={0}
        aria-label="Conversation messages"
        onWheel={(event) => {
          if (event.deltaY < 0) pauseFollow();
        }}
        onTouchStart={pauseFollow}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) pauseFollow();
        }}
        onKeyDown={(event) => {
          if (["ArrowUp", "PageUp", "Home"].includes(event.key)) pauseFollow();
        }}
        onScrollEnd={() => {
          if (scrollFrame.current === null) moving.current = false;
        }}
        onScroll={() => {
          const el = viewport.current;
          if (!el) return;
          rememberPosition();
          const atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 8;
          if (atBottom) setFollow(true);
          else if (!moving.current) setFollow(false);
        }}
      >
        <ol className="search-conversation-messages" ref={content}>
          {turns.map((turn) => {
            const archived = turn.id !== state.id;
            const response = { ...emptyAgentRunState(), ...turn, history: [] };
            return (
              <li
                className={`search-conversation-turn${archived ? " is-archived" : ""}`}
                key={turn.turnKey || turn.id}
              >
                <div className="search-message user-message">
                  <span>You</span>
                  <p>{requestLabel(turn.request)}</p>
                </div>
                {children(response, archived)}
              </li>
            );
          })}
        </ol>
        {!state.id && (
          <p className="quiet-caption">
            Tell your agent what you’d like to change.
          </p>
        )}
      </div>
      {!following && (
        <button
          type="button"
          className="chat-jump-latest"
          onClick={() => {
            setFollow(true);
            scrollDown();
          }}
        >
          Latest messages ↓
        </button>
      )}
      <div className="chat-composer-dock">
        {footer || (
          <span className="quiet-caption">
            Choose an option or reply above.
          </span>
        )}
      </div>
    </section>
  );
}
