import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type SelectOption = { value: string; label: ReactNode };
type SelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  "aria-label": string;
  "aria-controls"?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
};

export function SelectField({
  value,
  onValueChange,
  options,
  disabled,
  id,
  name,
  required,
  ...labels
}: SelectFieldProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
      items={options}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger id={id} className="ui-select-trigger" {...labels}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="ui-select-popup"
      >
        {options.map((option) => (
          <SelectItem value={option.value} key={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
