import { Fragment, useId, type ReactNode } from "react";
import { emptyAgentRunState, type AgentRunState } from "../hooks/useAgentRun";
import { motionBehavior } from "../uiMotion";
import { ChevronDown, MessageCircle } from "./icons";
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
};

export default function AgentConversation({
  state,
  requestLabel = (request) => request,
  children,
  footer,
  context,
}: AgentConversationProps) {
  const headingId = useId();
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
      <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className="agent-message-scroller">
          <MessageScrollerViewport
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
                return (
                  <Fragment key={turn.turnKey || turn.id}>
                    <MessageScrollerItem
                      className={`search-conversation-turn${archived ? " is-archived" : ""}`}
                      messageId={`${turn.turnKey || turn.id}-user`}
                      scrollAnchor
                    >
                      <Message align="end">
                        <MessageContent>
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
                    <EmptyMedia variant="icon">
                      <MessageCircle />
                    </EmptyMedia>
                    <EmptyDescription>
                      Tell your agent what you’d like to change.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton
            className="chat-jump-latest"
            size="sm"
            variant="outline"
            behavior={motionBehavior()}
          >
            Latest messages <ChevronDown size={14} />
          </MessageScrollerButton>
        </MessageScroller>
      </MessageScrollerProvider>
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
