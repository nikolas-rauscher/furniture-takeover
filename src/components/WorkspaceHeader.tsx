import { useEffect, useState, type ReactNode, type Ref } from "react";
import type { AgentQuota } from "../../shared/agent";
import {
  ArrowLeft,
  Bookmark,
  Ellipsis,
  SlidersHorizontal,
  UserRound,
} from "./icons";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import "./workspace-header.css";

type WorkspaceHeaderProps = {
  title: string;
  subtitle?: string;
  backLabel: string;
  onBack: () => void;
  backIcon?: ReactNode;
  onAccount: () => void;
  preferences?: { summary: string; compactSummary: string; onOpen: () => void };
  save?: { disabled: boolean; onSave: () => void };
  quota?: AgentQuota;
  titleRef?: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
};

function QuotaDetails({ quota }: { quota: AgentQuota }) {
  return (
    <div className="workspace-quota-details">
      <p>
        <strong>
          {quota.remaining} of {quota.limit}
        </strong>{" "}
        AI requests left today
      </p>
      <p className="workspace-quota-reset">
        Resets{" "}
        <time dateTime={quota.resetAt}>
          {new Date(quota.resetAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </p>
    </div>
  );
}

export default function WorkspaceHeader({
  title,
  subtitle,
  backLabel,
  onBack,
  backIcon,
  onAccount,
  preferences,
  save,
  quota,
  titleRef,
  actions,
}: WorkspaceHeaderProps) {
  const [quotaOpen, setQuotaOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeQuota = () => setQuotaOpen(false);
    desktop.addEventListener("change", closeQuota);
    return () => desktop.removeEventListener("change", closeQuota);
  }, []);

  return (
    <header className="workspace-header">
      <div className="workspace-toolbar">
        <Button
          variant="ghost"
          className="workspace-back"
          aria-label={backLabel}
          title={backLabel}
          onClick={onBack}
        >
          {backIcon ?? <ArrowLeft size={20} aria-hidden="true" />}
          <span>{backLabel}</span>
        </Button>
        <div className="workspace-heading">
          <h1 ref={titleRef} tabIndex={titleRef ? -1 : undefined}>
            {title}
          </h1>
          {subtitle && <p className="workspace-subtitle">{subtitle}</p>}
          {preferences && (
            <p className="workspace-criteria" title={preferences.summary}>
              {preferences.compactSummary}
            </p>
          )}
        </div>
        {actions && <div className="workspace-extra-actions">{actions}</div>}
        {quota && (
          <div className="workspace-desktop-quota">
            <Popover open={quotaOpen} onOpenChange={setQuotaOpen}>
              <PopoverTrigger
                render={<Button variant="ghost" />}
                aria-label={`AI allowance: ${quota.remaining} of ${quota.limit} requests left today`}
              >
                AI
                <Badge
                  variant={quota.remaining <= 5 ? "destructive" : "secondary"}
                >
                  {quota.remaining} left
                </Badge>
              </PopoverTrigger>
              <PopoverContent align="end" className="workspace-quota-popover">
                <PopoverHeader>
                  <PopoverTitle>Daily AI allowance</PopoverTitle>
                </PopoverHeader>
                <QuotaDetails quota={quota} />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <div className="workspace-mobile-actions">
          {preferences && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search preferences"
              aria-haspopup="dialog"
              onClick={preferences.onOpen}
            >
              <SlidersHorizontal size={20} aria-hidden="true" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" />}
              aria-label="Workspace options"
            >
              <Ellipsis size={20} aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="workspace-options">
              {save && (
                <DropdownMenuItem
                  disabled={save.disabled}
                  onClick={save.onSave}
                >
                  <Bookmark size={16} aria-hidden="true" /> Save this search
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onAccount}>
                <UserRound size={16} aria-hidden="true" /> Account settings
              </DropdownMenuItem>
              {quota && (
                <>
                  <DropdownMenuSeparator />
                  <div className="workspace-quota-menu" role="status">
                    <strong>Daily AI allowance</strong>
                    <QuotaDetails quota={quota} />
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {preferences && (
        <div className="workspace-preferences">
          <Button
            variant="outline"
            size="sm"
            aria-haspopup="dialog"
            onClick={preferences.onOpen}
          >
            <SlidersHorizontal
              size={16}
              data-icon="inline-start"
              aria-hidden="true"
            />
            Search preferences
          </Button>
          {save && (
            <Button
              variant="outline"
              size="sm"
              animateIcon
              aria-haspopup="dialog"
              disabled={save.disabled}
              onClick={save.onSave}
            >
              <Bookmark size={16} data-icon="inline-start" aria-hidden="true" />
              Save search
            </Button>
          )}
          {preferences.summary && (
            <p className="quiet-caption">
              Active preferences: {preferences.summary}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
