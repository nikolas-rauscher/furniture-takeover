import { Fragment, useId, useRef, type ReactNode } from "react";
import { useScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade";
import { emptyAgentRunState, type AgentRunState } from "../hooks/useAgentRun";
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

type AgentConversationProps = {
  state: AgentRunState;
  requestLabel?: (request: string) => string;
  children: (turn: AgentRunState, archived: boolean) => ReactNode;
  footer?: ReactNode;
  context?: ReactNode;
  /** Names the newest request bubble, so text typed elsewhere can morph into it. */
  requestTransitionName?: string;
};

export default function AgentConversation({
  state,
  requestLabel = (request) => request,
  children,
  footer,
  context,
  requestTransitionName,
}: AgentConversationProps) {
  const headingId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  // Messages dissolve into the header and the composer instead of being cut off there.
  // No shrink or blur: a whole message still in view looked out of focus.
  useScrollFade(viewport, { size: 32, shrink: 0, blur: 0 });
  const turns = state.id ? [...state.history, state] : [];
  return (
    <section
      className="search-conversation chat-workspace"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="sr-only">
        Your conversation
      </h2>
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
              aria-label="Conversation"
            >
              {turns.map((turn) => {
                const archived = turn.id !== state.id;
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
                      <p>{requestLabel(turn.request)}</p>
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
                      <Pako size={64} mood="wave" />
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
            size="icon-sm"
            variant="outline"
            aria-label="Latest messages"
            title="Latest messages"
            behavior={motionBehavior()}
            onClick={(event) => {
              event.currentTarget
                .closest(".chat-workspace")
                ?.querySelector<HTMLElement>(
                  '[aria-label="Conversation messages"]',
                )
                ?.focus({ preventScroll: true });
            }}
          >
            <ChevronDown size={18} aria-hidden="true" />
          </MessageScrollerButton>
        </div>
      </MessageScrollerProvider>
    </section>
  );
}
