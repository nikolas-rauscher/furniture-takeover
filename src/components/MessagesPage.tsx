import { lazyScreen } from "../lazyScreen";
import type { InboxView } from "../api/inbox";
import Messages from "./Messages";
import type { MessagesPageProps, MessagesProps } from "./messagesProps";
import { useDemoMessages } from "./useDemoMessages";
import "./messages.css";

/** Only account inboxes need it, so the local demo never loads it. */
const AccountMessages = lazyScreen(() => import("../cloud/AccountMessages"));

export default function MessagesPage(props: MessagesPageProps) {
  if (props.mode === "account") return <AccountMessages {...props} />;
  if (props.mode === "signed-out") return <p>Sign in to open your messages.</p>;
  return <DemoMessages {...props} />;
}

function DemoMessages(
  props: MessagesProps & Extract<InboxView, { mode: "demo" }>,
) {
  const model = useDemoMessages(props);
  return <Messages app={props} model={model} />;
}
