import { Fragment, useId, useRef, type ReactNode } from "react";
import { useScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import {
  emptyAgentRunState,
  type AgentRunState,
  type AgentRunTurn,
} from "../hooks/useAgentRun";
import { motionBehavior } from "../uiMotion";
import { PageTransitionShared } from "./animate-ui/components/page-transition";
import { ChevronDown } from "./icons";
import Pako from "./onboarding/Pako";
import { Bubble, BubbleContent } from "./ui/bubble";
import { Message, MessageContent } from "./ui/message";
import {
  MessageScroller,
  MessageScrollerProvider,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "./ui/message-scroller";
import { Empty, EmptyHeader, EmptyMedia, EmptyDescription } from "./ui/empty";
import "./search-conversation.css";
import "./ai-elements.css";

/** Keeps focus in the conversation when the control that had it is about to go away. */
export function focusConversation(from: Element) {
  from
    .closest(".chat-workspace")
    ?.querySelector<HTMLElement>('[aria-label="Conversation messages"]')
    ?.focus({ preventScroll: true });
}

type AgentConversationProps = {
  state: AgentRunState;
  /** What the latest turn tells a screen reader; the messages themselves stay quiet. */
  announcement: string;
  /** What the student's bubble shows for a turn; its request text by default. */
  renderRequest?: (turn: AgentRunTurn, index: number) => ReactNode;
  children: (turn: AgentRunState, archived: boolean) => ReactNode;
  footer?: ReactNode;
  context?: ReactNode;
  /** Names the newest request bubble, so text typed elsewhere can morph into it. */
  requestTransitionName?: string;
  /** The composer has text, so the waiting Pako listens. */
  typing?: boolean;
  /** The photo the conversation started from; it rides in the first request bubble. */
  startPhoto?: string;
};

export default function AgentConversation({
  state,
  announcement,
  renderRequest = (turn) => <p>{turn.request}</p>,
  children,
  footer,
  context,
  requestTransitionName,
  typing = false,
  startPhoto,
}: AgentConversationProps) {
  const headingId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  // Messages dissolve into the header and the composer instead of being cut off there; the
  // jump-to-latest pill rests inside the lower fade. No shrink or blur: a whole message
  // still in view looked out of focus.
  useScrollFade(viewport, { size: 48, shrink: 0, blur: 0 });
  const turns = state.id ? [...state.history, state] : [];
  return (
    <section
      className="search-conversation chat-workspace"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="sr-only">
        Your conversation
      </h2>
      {/* One polite voice for the whole conversation: streamed words are not read one by one. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {context && <div className="chat-context">{context}</div>}
      {/* The question stays anchored while the answer grows below it; following the
          stream as well made the view jump down and back up. */}
      <MessageScrollerProvider defaultScrollPosition="last-anchor">
        <MessageScroller className="agent-message-scroller">
          <MessageScrollerViewport
            ref={viewport}
            className="chat-scroll-viewport"
            aria-label="Conversation messages"
          >
            <MessageScrollerContent
              className="search-conversation-messages"
              role="group"
              aria-label="Conversation"
            >
              {turns.map((turn, index) => {
                const archived = turn.id !== state.id;
                const photo = index === 0 ? startPhoto : undefined;
                const response = {
                  ...emptyAgentRunState(),
                  ...turn,
                  history: [],
                };
                const requestBubble = (
                  <Bubble
                    align="end"
                    variant="muted"
                    className="agent-user-bubble"
                  >
                    <BubbleContent className="search-message user-message">
                      <span className="sr-only">You</span>
                      {photo && (
                        <figure className="user-message-photo">
                          <img src={photo} alt="Your photo" />
                          <figcaption>From your photo</figcaption>
                        </figure>
                      )}
                      {renderRequest(turn, index)}
                    </BubbleContent>
                  </Bubble>
                );
                return (
                  <Fragment key={turn.turnKey || turn.id}>
                    <MessageScrollerItem
                      className={`search-conversation-turn${archived ? " is-archived" : ""}`}
                      messageId={`${turn.turnKey || turn.id}-user`}
                      scrollAnchor
                    >
                      <Message align="end">
                        <MessageContent>
                          {requestTransitionName && !archived ? (
                            <PageTransitionShared name={requestTransitionName}>
                              {requestBubble}
                            </PageTransitionShared>
                          ) : (
                            requestBubble
                          )}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                    <MessageScrollerItem
                      className={`search-conversation-turn${archived ? " is-archived" : ""}`}
                      messageId={`${turn.turnKey || turn.id}-agent`}
                    >
                      <Message className="agent-response-message">
                        <MessageContent>
                          <Bubble
                            variant="outline"
                            className="agent-response-bubble"
                          >
                            <BubbleContent className="agent-response-content">
                              {children(response, archived)}
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  </Fragment>
                );
              })}
              {!state.id && (
                <Empty className="agent-conversation-empty">
                  <EmptyHeader>
                    <EmptyMedia className="agent-conversation-pako">
                      <Pako size={64} mood={typing ? "listen" : "wave"} />
                    </EmptyMedia>
                    <EmptyDescription>
                      Tell Pako what you’d like to change.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
        <div className="chat-composer-dock">
          <div className="chat-composer-content">
            {footer || (
              <span className="quiet-caption">
                Choose an option or reply above.
              </span>
            )}
          </div>
          <MessageScrollerButton
            className="chat-jump-latest"
            size="sm"
            variant="outline"
            aria-label="Scroll to the latest messages"
            behavior={motionBehavior()}
            onClick={(event) => focusConversation(event.currentTarget)}
          >
            <ChevronDown size={16} aria-hidden="true" />
            Latest
          </MessageScrollerButton>
        </div>
      </MessageScrollerProvider>
    </section>
  );
}
