import { useRef, useState, type FormEvent, type RefObject } from "react";
import { Bell } from "@/components/icons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Pako from "../components/onboarding/Pako";
import { useFocused } from "../hooks/useFocused";
import "./watch-form.css";

type WatchFormProps = {
  /** Receives focus when the student asks to watch for an item. */
  queryRef: RefObject<HTMLInputElement | null>;
  onWatch(query: string, maxPrice?: number): void;
};

/** The student names an item nobody has listed yet, and Pako keeps an eye out for it. */
export default function WatchForm({ queryRef, onWatch }: WatchFormProps) {
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("");
  const priceField = useRef<HTMLInputElement>(null);
  const queryFocused = useFocused(queryRef);
  const priceFocused = useFocused(priceField);
  const writing = queryFocused || priceFocused || query !== "";
  function submit(event: FormEvent) {
    event.preventDefault();
    const item = query.trim();
    if (!item) return;
    onWatch(item, price.trim() === "" ? undefined : Number(price));
    setQuery("");
    setPrice("");
  }
  return (
    <form
      className="watch-card"
      aria-label="New saved search"
      onSubmit={submit}
    >
      <Pako
        mood={writing ? "listen" : "idle"}
        size={36}
        className="watch-card-pako"
      />
      <label className="watch-card-query">
        Item
        <Input
          ref={queryRef}
          value={query}
          maxLength={120}
          placeholder="A desk, a bike, a lamp…"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label className="watch-card-price">
        Budget (CHF)
        <Input
          ref={priceField}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={1000000}
          value={price}
          placeholder="Any price"
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <Button
        className="button primary small watch-card-submit"
        type="submit"
        disabled={!query.trim()}
      >
        <Bell size={15} aria-hidden="true" />
        Save search
      </Button>
    </form>
  );
}
