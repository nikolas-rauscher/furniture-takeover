import type { ReactNode, Ref } from "react";
import {
  ArrowLeft,
  Bookmark,
  Ellipsis,
  SlidersHorizontal,
  UserRound,
} from "./icons";
import { Button } from "./ui/button";
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
  backLabel: string;
  onBack: () => void;
  backIcon?: ReactNode;
  onAccount: () => void;
  preferences?: { summary: string; compactSummary: string; onOpen: () => void };
  save?: { disabled: boolean; onSave: () => void };
  quota?: { remaining: number; limit: number };
  titleRef?: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
};

export default function WorkspaceHeader({
  title,
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
          {preferences && (
            <p className="workspace-criteria" title={preferences.summary}>
              {preferences.compactSummary}
            </p>
          )}
        </div>
        {actions && <div className="workspace-extra-actions">{actions}</div>}
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
                  <p className="workspace-quota" role="status">
                    {quota.remaining} of {quota.limit} AI requests left today
                  </p>
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
