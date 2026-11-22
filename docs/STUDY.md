# User study on the tour page

The tour page (`/tour`) has two uses. Without a tag it is the pitch: a hero and a short tour of takeover, and nothing is recorded. With a tag (`/tour?s=<channel>`) it is the study, described here. `/tour?s=<channel>&v=1` runs version 1 ([STUDY-v1.md](STUDY-v1.md)) unchanged, so both versions can be compared. Every session stores its questionnaire (`survey`), its wording version and its language.

This file is the protocol of survey version 4, wording version `v4-3`. In code and in the database it still runs as questionnaire `v3` (`survey = 'v3'`); only the wording version tells v3 and v4 sessions apart. The script in `src/tour/v3/` follows this file, in English, French and German with equivalent meaning; the English wording below is the live reference. The app screens inside the phone stay in English. The decision rules are frozen before launch (see [Pre-registration](#pre-registration)).

Setting: a course project (CS-500). Prices are hypothetical; nothing is launched, sold or booked.

## What we test

Five hypotheses, one per research question (H1 = RQ1, and so on). Each is read off the questions named here; the exact rules and cutoffs are in [Pre-registration](#pre-registration). A rule is read only with at least 40 answers to its item; below that the result is inconclusive and only counts are reported.

| H   | Hypothesis                                                                                                                                    | Questions                                                                                                           | Support                                                                                                                                             | No support                                                       | Inconclusive                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| H1  | The problem is coordination: replies, back-and-forth, timing and pickups are harder than finding or listing.                                  | `last-trouble`; `last-how`, `last-outcome`, `last-transport`, `last-messages` describe the attempt                  | Coordination ≥ 40% of those who tried, and more than finding + listing                                                                              | Coordination ≤ 20%                                               | Between the two, or fewer than 40       |
| H2  | There is supply of idle things: many students have usable things they don't use and would let go; effort, not attachment, keeps them at home. | `idle-items`, `idle-release`, `idle-why`; `trade-frequency` (market size and segments) and `last-occasion` describe | ≥ 50% have an idle thing and would release it, and effort reasons outnumber keeping reasons                                                         | ≤ 30% would release, or keeping reasons outnumber effort reasons | Between the two, or fewer than 40       |
| H3  | Local matching works: students would answer a nearby request.                                                                                 | `wanted-react`; `seeking`, `max-distance`, `trust-signals` describe                                                 | `offer-now` lower bound ≥ 25%                                                                                                                       | `offer-now` upper bound < 15%                                    | Between the two, or fewer than 40       |
| H4  | Students delegate to Pako: they use its drafts and let it do chores alone.                                                                    | `draft` (what they do with Pako's correct draft), `delegate`; `check-listing` describes                             | ≥ 50% send Pako's draft (as written or edited) **and** ≥ 50% let Pako do at least one task alone                                                    | Either share ≤ 25%                                               | Neither threshold met, or fewer than 40 |
| H5  | Some students would pay for Pako's help.                                                                                                      | `wtp-monthly`, `pay-model`, `pay-for`                                                                               | Descriptive only; no threshold. Reported: median and distribution of `wtp-monthly` by side, plan ranks and pricing ideas, what people would pay for | –                                                                | –                                       |

What the survey measures: stated answers, plus behaviour-like tasks in the practice chat (`draft`, `draft-day`). Stated intentions overstate what people later do, especially for prices and for answering a request; the chat task is closer to behaviour but has no real stakes, no real person and no time pressure. So the results can rank problems and options and rule ideas out; they cannot show adoption, real willingness to pay or how carefully people check drafts in real use.

## Changed in v4-3

- Roles, items and difficulties allow several answers. The obstacle list combines the selected roles. Message counts use 1–3, 4–7, 8–12 and over 12. Pickup distance ends part 2.
- Part 3 shows both Pakos matching availability, a confirmation in the chat, a ten-minute delay and the two pickup confirmations. The listing question takes Léa’s perspective. Trust options include Pako’s reliability rating.
- Five price cards are ranked from favourite to least favourite. Free with ads and a 50-credit pack join the comparison. An optional line accepts a pricing idea. This replaces `pay-model-not`.
- This browser keeps finished answers for revision in the same session. Both completion screens offer the separate email form.

## Changed in v4-2

Owner review of the live `v4-1`:

- Removed `move` ("Will you move out by the end of June 2027?"); personal plans are not needed. "Wider than moving out" (H2) is read off `last-occasion`.
- Removed the planted error: no `wrong-price` variant, no `draft-variant`, no `draft-price`, no CHF 45 debrief at the end. Everyone gets the correct draft (CHF 40, their day, 17:30). In a survey nobody proofreads carefully, and a planted mistake works against trust in Pako. H4 is now read off what people do with the correct draft and off `delegate`.
- One storyline in part 3 with the same people and the same desk: Léa sells her desk, the participant buys it (Mia is now Léa), then takes Léa's place for `delegate`, and Léa posts the lamp request for `wanted-react`. In the deal scene the offer is CHF 40 in the survey (the tour keeps CHF 35); the caption says the buyer in the example is called Noah.
- Parts by topic: part 1 is the last attempt only (`who` and `housing` moved to part 4); part 2 is "You right now" (new `trade-frequency` first, `seeking` moved here from part 3); part 3 is the story; part 4 is price, then about you.
- New items: `trade-frequency` (part 2), `check-listing`, `max-distance`, `trust-signals` (part 3), `wtp-monthly`, `pay-model-not`, `pay-for` (part 4).
- Price part: Pako's long card above the price cards is replaced by one neutral line on the first price screen, "Finally, a few questions about possible prices."; the free unit is no longer defined in words, the cards are unchanged. `pay-model` asks "Which of these options would you like best?".
- `last-trouble` asks "What was difficult about this attempt, if anything was?".
- Answer options may contain a decimal point (`chf-3.5`); event details keep the old pattern.
- About 33 screens on the longest path; estimated 8–9 minutes, `V3_MINUTES` = 9.

## Changed in v4

User test 1 (one participant who did not know the app, German, wording `v3-8`, observed by the owner) showed:

- The progress bar made the participant feel far from the end: finished parts shrank to small boxes and the current part had a fixed 40% fill.
- The price cards were cut off by the footer, had uneven heights, and it was not visible that more answers followed. The four plans described different things, so they could not be compared.
- The German of several questions did not fit their options (`last-role`), and the move-out pack sentences were not natural German.
- Product terms ("Auszugspaket", "Wanted nearby") were used before they were explained, and the part screens mixed topics.
- The end screen's title was a long sentence placed left of centre.

What v4 changed:

- Research questions first. Every item serves one of five research questions (RQ1–RQ5) with one rule each; the v3 decisions D1–D11 are replaced.
- Questions are short and direct; the context sits in Pako's line before the question, and the question stands right above its answers.
- Four parts, each opened by a part screen "Part n of 4". The progress strip has four equal bars: finished parts are full, the current one fills with the steps done in it (at least 15%), and the last part is labelled "Last part".
- `last-trouble` offers each side its own obstacles (see [Script](#script)); the shared obstacles keep their ids across sides.
- Price cards in one column, each with its price on the right and the same two rows, "Pako's help" and "You pay". A pill "More options below" shows while the end of a step is out of view.
- End: "Thank you!" with Pako, centred; the save status shows once saving is done; the form at the end has a fourth tick, "I'm up for a 15-minute chat" (`study_pilot.interview`, migration `202611220002_study_v4.sql`).
- Two screenshot reviews before launch fixed wording in all three languages, added `idle-release` before `idle-why`, put `nothing` first in `last-trouble` and "None of these" first in `delegate`, hid the form from anyone under 18, and stored the wording version on form rows.

Cut over the versions: the slogans (`headline`), `helped-*`, `try-first`, `stop`, `sending`, the desk trade-off (`desk`), `move-it`, `delivery-*`, `institution-pay`, the pack price ladder (`pack-chf-*`), the find scene, `level`, `exchange`, `last-cost`, `last-story`, `why-not`, the `what-is` screen, the optional full tour after the core, the "How others answered" counts at the end with `GET /api/study/results` and `study_results`, `move`, `draft-variant`, `draft-price`.

## Research questions

| RQ  | Question                                     | Measure                                                                                | Decision it informs                                       |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| RQ1 | What makes passing on used things hard?      | `last-trouble`; `last-how`, `last-outcome`, `last-transport`, `last-messages` describe | Which pain the pilot and onboarding lead with             |
| RQ2 | Is there untapped supply, and how big?       | `idle-items`, `idle-release`, `idle-why`; `trade-frequency` by segment                 | Whether "pass on what's lying around" is the core message |
| RQ3 | Does local matching work?                    | `wanted-react`; `seeking` and its text, `max-distance`, `trust-signals`                | Build or drop requests; how near "nearby" must be         |
| RQ4 | Which steps would students hand to an agent? | `draft` with the correct draft; `delegate`; `check-listing`                            | Which tasks Pako may do alone; what users want to check   |
| RQ5 | Would anyone pay, how much and for what?     | `wtp-monthly`, `pay-model`, `pay-for`; by side of the last attempt                     | Which payment model to test first (exploratory)           |

Primary risk this cycle: value (RQ1, RQ2). RQ3 and RQ4 are secondary; RQ5 is exploratory. Behavioural value metric: submitted forms with "I'd like to try takeover early" ticked, divided by the participants who reached the end.

What the results cannot claim: shares for all EPFL/UNIL students; adoption or future use; real willingness to pay, a price or revenue; how carefully people read drafts in real use; differences between small subgroups; that the scenes or the app work.

## Participants and recruitment

- Everyone who agrees takes part. Nobody is filtered by student status, answers, time windows or response speed.
- Analysis exclusions, and only these: no consent (no session exists), duplicates (the browser marks a finished survey), sessions without any answer (counted as break-offs).
- No incentive. Target: about 80 completes.
- Pretest: 3–5 phone runs (iOS and Android) with their own wording version, then deleted. Launch and close dates are set when the protocol is frozen.

| Channel                                                | Tag                                           |
| ------------------------------------------------------ | --------------------------------------------- |
| FMEL Vortex, Atrium, Triaudes group chats              | `fmel-vortex`, `fmel-atrium`, `fmel-triaudes` |
| Other FMEL houses                                      | `fmel-other`                                  |
| EPFL and UNIL programme groups                         | `epfl-programme`, `unil-programme`            |
| Moodle Peer Support forum (with the demo link)         | `moodle-peer`                                 |
| Friends                                                | `friends`                                     |
| Posters with QR code: Rolex Learning Center, Unithèque | `poster-rlc`, `poster-unitheque`              |
| Link shared from the end of the survey                 | `friend`                                      |

Each QR code encodes the full `/tour?s=<tag>` link of the deployment.

Invitation (chat): "Hi all, we're EPFL students building takeover, an app for passing on used stuff around campus. Could you do our {measured}-minute phone survey? No sign-in, everyone welcome, also if you've never bought or sold anything used. {link}". For `moodle-peer`: "The app demo is directly via 'Just show me the app'."

`{measured}` is 9 (`V3_MINUTES`), an estimate for 32 screens before the end on the longest path, until the pretest measures the median time from start to the end screen; it is then rounded up.

## Script

Pako asks every question. On a step with context, Pako's line gives the context and the question stands as a heading right above the answers; otherwise Pako's line is the question. On product questions (all of part 3 after the part screen, and the price questions) Pako keeps a neutral face; on questions about the participant it smiles briefly after a pick. A single-choice tap moves on after about 300 ms; multiple choices, the slider and steps with a text field move on with Continue. Multiple choices show “You can choose several.” above the options. Price cards have separate ranking instructions. Back is visible on every step but the first and the end. Shuffled options appear in an order drawn once per participant and stored; options marked _first_ or _last_ keep their place. An exclusive option clears the others and is cleared by them.

Progress strip: four equal bars, `Your experience · You right now · The app · Price, and about you`. A finished part is full and shows a small taped box; the current part fills with the share of its steps before the current one, at least 15%. Part 1 is counted along its longest path (an attempt that worked out), so the bar never moves back; someone who never tried jumps forward. The label under the strip names the part, in the last part as "Last part · Price, and about you".

### Start screen

Pako: "Hi, I'm Pako, the assistant in the takeover app. EPFL students are building it so students around EPFL and UNIL can buy, sell and give away used things. The survey takes about {measured} minutes."

Buttons: Start the survey · Just show me the app.

Folded toggle "What we save": "We save your answers and record which screens you visit, skip or return to and how long you spend on each one. We also record which link you followed, your language and whether you're using a phone or a computer. While you answer, your progress stays in this tab. Once you finish, this browser keeps your answers so you can change them later. If you leave your email at the end, we store it separately from your answers. We delete the study data we collect by {date}." Then "Questions about the survey: {contact}".

"Just show me the app" opens the tour without a session; nothing is stored. `{date}` and `{contact}` come from `STUDY_DELETE_BY` and `STUDY_CONTACT`. A session starts with "Start the survey".

### Part 1 of 4: Your experience (H1)

The last attempt only. `part-last-time`. Pako: "First, a few questions about your own experience." Card: "Part 1 of 4" · Your experience · "There are no right or wrong answers."

| Id               | Shown to                             | Pako's context                                                                                                                | Question                                                         | Options                                                                                                                                                                     |
| ---------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `last-role`      | everyone                             | "Think of the last time you tried to buy, sell, give away or get a used item for free. It counts even if it didn't work out." | "What were you trying to do?"                                    | `buying` Buy something · `getting-free` Get something for free · `selling` Sell something · `giving-away` Give something away · `none` I've never tried any of these        |
| `last-item`      | tried                                |                                                                                                                               | "What was it?"                                                   | `furniture` Furniture · `household` Household items · `electronics` Electronics · `bike` Bike or scooter · `books` Books · `clothes` Clothes · `other` Other                |
| `last-occasion`  | tried                                |                                                                                                                               | "Was it connected with a move?"                                  | `moving-in` Yes, moving in · `moving-out` Yes, moving out · `both` Yes, both (moving out and in) · `no-move` No                                                             |
| `last-how`       | tried                                |                                                                                                                               | "Where did you try first?"                                       | `friends` Friends or people I know · `chat-group` WhatsApp or Telegram group · `facebook` Facebook Marketplace · `anibis` Anibis, Tutti or Ricardo · `other` Somewhere else |
| `last-outcome`   | tried                                |                                                                                                                               | "Did it work out?"                                               | `yes` Yes · `no` No · `ongoing` Still in progress                                                                                                                           |
| `last-trouble`   | tried                                |                                                                                                                               | "What was hard about it?"                                        | See below; `nothing` _first_, the obstacles shuffled, `other` and `cant-recall` _last_                                                                                      |
| `last-transport` | `last-outcome` is `yes` or `ongoing` |                                                                                                                               | "How was it transported?"                                        | `foot` On foot · `bike` By bike · `public-transport` By public transport · `car` By car · `delivery` Delivered · `not-yet` Not moved yet · `dont-know` Don't know           |
| `last-messages`  | tried                                |                                                                                                                               | "Roughly how many messages did it take in total, with everyone?" | `none` None · `1-3` 1–3 · `4-7` 4–7 · `8-12` 8–12 · `over-12` More than 12 · `dont-remember` Can't remember                                                                 |

"Tried" means `last-role` is `buying`, `getting-free`, `selling` or `giving-away`. Someone who never tried goes on to part 2.

`last-role`, `last-item` and `last-trouble` allow several picks, including difficulties after a successful attempt. The options `none` on role and `nothing` on difficulty are exclusive. Obstacles are the union for all roles picked; the last column says how H1 counts each one:

| Id                | Words                               | Offered to                  | H1 group     |
| ----------------- | ----------------------------------- | --------------------------- | ------------ |
| `nothing`         | Nothing was difficult               | everyone who tried, _first_ |              |
| `finding`         | Finding something suitable          | buying, getting-free        | finding      |
| `gone`            | The item was already gone           | buying, getting-free        |              |
| `agree-price`     | Agreeing on a price                 | buying only                 |              |
| `finding-taker`   | Finding someone interested          | selling, giving-away        | finding      |
| `deadline-pickup` | Arranging pickup before my deadline | selling, giving-away        | coordination |
| `listing`         | Writing the listing                 | selling, giving-away        | listing      |
| `set-price`       | Setting the price                   | selling only                |              |
| `replies`         | Waiting for replies                 | everyone who tried          | coordination |
| `messages`        | Lots of messages back and forth     | everyone who tried          | coordination |
| `timing`          | Agreeing on a pickup time           | everyone who tried          | coordination |
| `cancelled`       | Cancelled pickups                   | everyone who tried          | coordination |
| `transport`       | Transport                           | everyone who tried          |              |
| `trust`           | Trusting the other person           | everyone who tried          |              |
| `other`           | Something else                      | everyone who tried, _last_  |              |
| `cant-recall`     | Can't remember                      | everyone who tried, _last_  |              |

Buyers see 12 options, people getting something for free 11, sellers 13, givers 12. `agree-price` is for buyers only and `set-price` for sellers only, since nothing is paid when something is given away or got for free. The shuffle runs over the options of all selected roles (up to 16 options); changing the offered options draws a new order and empties the answer (see [What is stored](#what-is-stored)).

### Part 2 of 4: You right now (H2, H3)

Personal and current. `part-home`. Pako: "Next, a few questions about you right now: used things and what you have at home." Card: "Part 2 of 4" · You right now · "For example furniture, books, kitchen things or electronics."

| Id                | Shown to                                 | Question                                                                   | Options                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ---------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trade-frequency` | everyone                                 | "How often do you buy, sell or give away something used?"                  | `monthly-plus` Several times a month · `monthly` About once a month · `yearly` A few times a year · `rarely` Less often · `never` Never                                                                                                                                                                                                                                                |
| `idle-items`      | everyone                                 | "How many usable things do you have at home that you don't currently use?" | `none` None · `1-3` 1–3 · `4-10` 4–10 · `over-10` More than 10                                                                                                                                                                                                                                                                                                                         |
| `idle-release`    | `idle-items` is `1-3`, `4-10`, `over-10` | "Would you consider selling or giving away any of these?"                  | `yes` Yes · `no` No · `unsure` Unsure                                                                                                                                                                                                                                                                                                                                                  |
| `idle-why`        | `idle-release` is `yes` or `unsure`      | "Why do you still have them?"; multiple choice, shuffled, `other` _last_   | `listing-hassle` Listing is too much hassle · `messages-hassle` Messages and scheduling are too much hassle · `transport` I can't transport them · `not-worth` Not worth the effort for the money · `dont-know-whom` I don't know who I could offer them to · `might-need` I might still need them · `keep` I'd rather keep them · `not-yet` I haven't got round to it · `other` Other |
| `seeking`         | everyone                                 | "Are you looking for something used right now?"                            | `yes` Yes · `no` No. `yes` opens a one-line field, "What are you looking for? (optional)", stored as the answer's `text`                                                                                                                                                                                                                                                               |
| `max-distance`    | everyone                                 | "How far would you go at most to pick up a used desk?"                     | `under-1` Under 1 km · `1-3` 1–3 km · `3-10` 3–10 km · `over-10` More than 10 km                                                                                                                                                                                                                                                                                                       |

### Part 3 of 4: The app (H3, H4)

One story with the same people and the same desk. `part-the-app`. Pako: "Léa is selling her desk and you’d like to buy it. You each have a Pako. The two Pakos talk to each other to find a pickup time that works for both of you. You can also write to Léa yourself." Card: "Part 3 of 4" · The app · "Two short scenes, a chat and a few questions about the story."

The scenes play in a phone frame, captioned "Example from the app (in English)", each with Next and Replay; a scene left before it ends logs `scene-skipped`. With reduced motion a scene opens directly on its outcome.

1. `app-sell`, scene. Pako: "Léa sells her desk" · "Léa is moving out and sells her desk with takeover. She takes a photo, Pako writes the listing and suggests a price, and Léa sets her own price of CHF 40."
2. `check-listing`. "If you were Léa, what would you check before Pako’s listing goes online?" Multiple choice, shuffled, `none` _last_ and exclusive: `price` The price · `description` The description · `photos` The photos · `pickup-times` The pickup times · `none` None of these.
3. `draft`, the practice chat (below).
4. `app-deal`, “The pickup is booked”. Léa accepts Noah’s CHF 40 offer (CHF 35 in the standalone tour). On the selected day the pickup is booked for 17:30. At 17:05 Noah reports a ten-minute delay; Léa sees the update and the 17:40 ETA. At 17:40 Noah confirms pickup and Léa marks the desk sold. The caption explains the follow-up with both people, time changes and releasing the desk if the buyer stops replying.
5. `trust-signals`. "What would help you trust the other person?" Multiple choice, shuffled, `none` _last_ and exclusive: `verified` Verified student account · `reviews` Reviews · `pako-rating` Pako's rating from past sales and pickups · `campus-meet` Meeting on campus · `chat` The chat so far · `none` None of these.
6. `delegate`. Pako: "Imagine you’re selling Léa’s desk. Pako could send messages for you. You’d see them afterwards." Question: "What would you let Pako do without checking with you first?" Multiple choice; `none` _first_ and exclusive, the five permissions shuffled below it: `none` None of these · `answer-questions` Answer questions about the item · `suggest-time` Suggest one of the pickup times I gave Pako · `remind` Remind the other person about the pickup · `negotiate` Negotiate the price · `accept-offer` Accept an offer.
7. `wanted-react`. Pako: "An idea for takeover: requests." · "Léa still needs a desk lamp for her new room. Anyone looking for something can post what they need, and students nearby see it." Below it an example post without a button: "Léa, 5 minutes from you, is looking for a desk lamp." Question: "You have a spare desk lamp. What would you most likely do?" Options, shuffled: `offer-now` Offer it now · `offer-later` Offer it later · `leave` Leave the request unanswered · `rather-not` I don't want to see requests like this.

`draft`. The participant wants Léa’s CHF 40 desk. The scenario says they gave Pako their free weekend evenings and Léa gave her own Pako her availability.

1. The listing identifies the desk and pickup point (EPFL, Rolex Learning Center).
2. The first outgoing message is labelled “You · sent by Pako”. It asks whether the desk is available and offers CHF 40.
3. Léa says it is still available and asks when the participant can pick it up. Pako offers the two times both Pakos matched: Saturday or Sunday at 17:30.
4. The participant picks a day. Léa agrees and suggests meeting by the Rolex.
5. Pako drafts a confirmation with that day, 17:30, the place and CHF 40.
6. "What would you do with this draft?" Four equal buttons in a 2×2 grid: Send as written · Edit it · Write my own · Send nothing. Léa's agreement, the draft and the four buttons are in view together. "Edit it" opens the draft in a text field ("Your reply to Léa"), "Write my own" an empty one ("Your message to Léa"), each with Send and Send nothing. Not sent: "You didn't send anything."

The draft is correct for everyone: it repeats the agreed price, the day picked and the time.

### Part 4 of 4: Price, and about you (H5, background)

Price first, then the participant. `part-price`. Pako: "Last part: price, then a few questions about you." Card: "Part 4 of 4" · Price, and about you · "Then you're done."

`wtp-monthly`. Pako: “Think about using Pako to write listings and handle messages.” Question above the slider: “How much would you pay per month for that help?” A native range input from CHF 0 to 10 in steps of 0.50, with the arrow keys, Home and End. The value shows large above the track: "CHF 3.50 a month", and "Nothing" at 0; the ends read "Nothing" and "CHF 10". Stored as `chf-<amount>` (`chf-0`, `chf-3.5`, `chf-10`).

The readout starts at “Drag to choose”. A muted handle at the midpoint nudges gently unless reduced motion is enabled. Continue requires an explicit choice, including a tap on the midpoint.

`pay-model`. “How would you rank these pricing options?” The five example cards are shuffled once and labelled “Example prices, not available yet”. Taps assign ranks 1–5, favourite first. Tapping a selected card removes its rank and closes the gap. Continue requires all five. The optional one-line pricing idea is stored as `text`.

| Id           | Title                | Price       | Pako's help                                 | You pay                                |
| ------------ | -------------------- | ----------- | ------------------------------------------- | -------------------------------------- |
| `free`       | Free                 | CHF 0       | a few times a day                           | nothing                                |
| `free-ads`   | Free with ads        | CHF 0       | unlimited, with ads                         | nothing                                |
| `credits`    | Credit pack          | CHF 5       | 50 credits for listings, chats and messages | CHF 5 once                             |
| `seller-fee` | Fee per sale         | 5%          | unlimited                                   | 5% of the sale price (CHF 2 on CHF 40) |
| `monthly`    | Monthly subscription | CHF 3/month | unlimited                                   | CHF 3 a month                          |

`pay-for`. "What would you most likely pay for?" Multiple choice, shuffled, `nothing` _last_ and exclusive: `listings` Having my listings written · `replies` Replies and appointments handled by Pako · `transport` Transport or delivery · `visibility` More visibility for my listing · `nothing` None of these.

| Id        | Question                                   | Options                                                                                                                                                                                     |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `who`     | "Are you a student?"                       | `epfl` Yes, at EPFL · `unil` Yes, at UNIL · `other-school` Yes, at another university · `no` No                                                                                             |
| `housing` | "Which best describes where you live now?" | `fmel` In an FMEL residence · `other-res` In another student residence · `flat` Flat, flat-share or studio (not a student residence) · `family` With my family · `elsewhere` Somewhere else |
| `age`     | "How old are you?"                         | `under-18` Under 18 · `18-20` 18–20 · `21-23` 21–23 · `24-26` 24–26 · `27-30` 27–30 · `31-plus` 31+ · `na` Prefer not to say                                                                |
| `gender`  | "Your gender?"                             | `woman` Woman · `man` Man · `non-binary` Non-binary · `self-describe` Another term (opens an optional text field) · `na` Prefer not to say                                                  |

### End

Reaching the end records `core-complete` and `end`, marks the browser as finished and blocks Back. Pako and "Thank you!" centred; below them "Your answers are saved." once every save is confirmed, nothing while saving is under way, and the failure note with "Try again" if saving stopped.

Form "Would you like to hear from us again?", shown to everyone who reaches the end and on the already-participated notice, optional: Email address ("Optional. Kept separately from your survey answers."), then "What would you like?" with four ticks, at least one required:

| Field           | Tick                               |
| --------------- | ---------------------------------- |
| `launchNews`    | Let me know when takeover launches |
| `tryEarly`      | I'd like to try takeover early     |
| `interview`     | I'm up for a 15-minute chat        |
| `futureSurveys` | Invite me to future surveys        |

`tryEarly` reveals "What would you like to try?", multiple choice (`buy` Buy · `get-free` Get for free · `sell` Sell · `give-away` Give away · `not-sure` Not sure yet; `not-sure` stands alone), and "Where do you live?" (`vortex` FMEL Vortex · `atrium` FMEL Atrium · `triaudes` FMEL Triaudes · `fmel-other` Another FMEL residence · `other-res` Another student residence · `flat` A flat or studio · `elsewhere` Somewhere else), both required then. After Send the form card disappears, the page scrolls to the top and "We've saved your email. We'll be in touch." shows under the thank-you.

Share: "Every answer helps, including from people who never sell anything. Would you share the survey?" Share · Copy link · Show QR code. Text: "I just did a {measured}-minute survey for an EPFL student project. No sign-in: {link}". The link carries the tag `friend`. Both completion screens offer “Change my answers” when this wording’s finished answers are available.

## What is stored

One session per participant, created on "Start the survey": a random id, `survey = 'v3'`, the wording version (`v4-3`), the language at the start (`en`, `fr`, `de`), the channel tag, phone or desktop. No name, no IP address, no browser details.

The tab keeps in-progress answers. After completion this browser also keeps the answers, option orders, revisions and pending survey saves. Reopening starts at `last-role` in the same session and keeps its recruitment source. The persistent copy excludes the email form and unsent chat text. A returning participant can edit a finished session only in its original wording version. A tab with unfinished answers from an older wording starts a new session and shows "The survey was updated, so it starts again."

One answer per session and step, replaced when the participant goes back and answers again. When a change after Back takes a step off the participant's path, such as `last-role` changed to `none` after `last-trouble` was answered, that step's answer is saved again empty: `chosen` and `text` empty, `first_chosen` kept. The same happens to `last-trouble` when a change of `last-role` changes the options it offers, for example from `buying` to `selling`. Every save carries a `revision` that the client raises; the server keeps the newest and ignores an older write. An empty answer counts as not answered on the results page and in the queries below.

| Field          | Content                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `chosen`       | The final answer; for `pay-model`, all five ids in preference order                |
| `first_chosen` | The first answer; the server keeps the value it received first                     |
| `shown`        | Option order on screen, for shuffled steps                                         |
| `text`         | The `seeking` line, pricing idea, `gender` self-description or message sent to Léa |
| `elapsed_ms`   | Time on screen                                                                     |

`chosen`, `first_chosen` and `shown` hold at most 16 ids. An option id is lower case with digits, hyphens and dots, such as `chf-3.5`.

The draft task stores two answers:

| Step        | `chosen`                                                                                                                                                                                   | Saved when                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `draft-day` | `sat` or `sun`                                                                                                                                                                             | the day is picked                               |
| `draft`     | `sent-unchanged` (sent as Pako drafted it, directly or after opening it), `sent-changed`, `sent-own`, `not-sent`; `change` or `own` while writing and undecided; `text` = the message sent | a writing option is tapped, and at the decision |

`first_chosen` of `draft` holds the option picked first (`send`, `change`, `own` or `dont-send`). `sent-unchanged` means the message equals Pako's draft.

The form at the end goes to `study_pilot` without a session, so it cannot be linked to answers: email, `launch_news`, `try_early`, `interview`, `future_surveys`, `roles` (what the person wants to try, empty unless `try_early`), `place`, and `version`, the wording version of the survey it ends. The version is the same for everyone in a run, so it does not identify anyone; forms from before v4 have none. A return visit with only a legacy completion timestamp uses form version `unknown` and is excluded from wording-specific results. The v4 migration replaces the column `role` with `roles`: an earlier seller becomes `{sell}`, a buyer `{buy}`, both `{buy,sell}`; earlier forms have `interview = false`. One form per address; the first one stands.

Events, sent in batches and stored once per sequence number, at most 600 per session. A batch the server refuses for good is dropped, so events never hold back answers or the form:

| Kind                                      | Step                                | Detail                   |
| ----------------------------------------- | ----------------------------------- | ------------------------ |
| `shown`, `answered`, `skipped`, `changed` | question                            |                          |
| `back`                                    | step left                           | step returned to         |
| `scene-played`, `scene-skipped`           | scene step (`app-sell`, `app-deal`) | scene                    |
| `core-complete`, `end`                    |                                     |                          |
| `share`                                   |                                     | `native`, `copy` or `qr` |
| `language`                                |                                     | language switched to     |

Not recorded: touch paths, scroll depth, keystrokes, slider movements before Continue, session replay. The survey shows no counts of other participants; v4 has no results endpoint for participants.

In account mode the data is in Supabase, in tables that students cannot read; the server writes them through security-definer functions with its service key. In the local demo it is in the SQLite file. Without `STUDY_CONTACT` and `STUDY_DELETE_BY` the study is closed and only the pitch is available. From the deletion date on it collects nothing.

## Analysis

Plausible range: two-sided 95% Wilson interval. For a network sample it only illustrates precision. Main figures use everyone who answered the item; subgroups are described next to them, never used to drop anyone.

| Subgroup                 | From                                                      | Used for                                                                  |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Tried before             | `last-role` is not `none`                                 | H1 denominator                                                            |
| Side of the last attempt | `last-role`: buying, getting-free vs selling, giving-away | H1, and H5 (`wtp-monthly`, `seller-fee`), described per side              |
| Trade frequency          | `trade-frequency`                                         | H2: segments and market size                                              |
| Linked to a move         | `last-occasion`                                           | H2: whether passing things on goes beyond moving out                      |
| Would let go             | `idle-release`                                            | H2: supply counts `yes` only; `idle-why` is asked after `yes` or `unsure` |
| Housing                  | `housing` = `fmel`                                        | H3, sample description                                                    |
| Student status           | `who`                                                     | Whether figures depend on non-students                                    |
| Background               | `age`, `gender`                                           | Sample description for the course                                         |
| Channel, language        | session                                                   | Sample description                                                        |

Coordination obstacles (H1): `replies`, `messages`, `timing`, `cancelled` and `deadline-pickup`. Finding: `finding` and `finding-taker`. Listing: `listing`. Each participant counts once per group they selected, even if they named several obstacles in it. The rule compares coordination with the union of finding and listing.

Delegation (H4) is counted over completed decisions (`sent-unchanged`, `sent-changed`, `sent-own`, `not-sent`); unfinished drafts are reported over everyone shown the task. "Sends Pako's draft" means `sent-unchanged` or `sent-changed`. `delegate` is counted over the participants who answered: "at least one task" means any option but `none`; each task is also reported on its own. `check-listing` and `trust-signals` are multiple choices, reported per option over the participants who answered.

Price (H5) is descriptive. `wtp-monthly`: median, quartiles, the share at CHF 0 and the full distribution, overall and per side of the last attempt. Since the slider runs from 0 to 10, answers are bounded by that range and may lean towards its middle; amounts are read as a ranking of interest, not as a price. `pay-model` counts each plan at each rank, overall and by side, and reports pricing ideas. `pay-for` is counted per option over the participants who answered.

Count cutoffs (unrounded Wilson bounds for H3; shares for the others):

| Measure                                            | H   | Denominator                    | n = 40  | 60      | 80      |
| -------------------------------------------------- | --- | ------------------------------ | ------- | ------- | ------- |
| coordination share ≥ 40% / ≤ 20%                   | H1  | tried, answered `last-trouble` | 16 / 8  | 24 / 12 | 32 / 16 |
| ≥ 1 unused item and release yes ≥ 50% / ≤ 30%      | H2  | answered `idle-items`          | 20 / 12 | 30 / 18 | 40 / 24 |
| `offer-now`, lower bound ≥ 25% / upper bound < 15% | H3  | answered                       | 16 / 1  | 22 / 3  | 28 / 5  |
| sends Pako's draft ≥ 50% / ≤ 25%                   | H4  | completed decisions            | 20 / 10 | 30 / 15 | 40 / 20 |
| `delegate` at least one task ≥ 50% / ≤ 25%         | H4  | answered `delegate`            | 20 / 10 | 30 / 15 | 40 / 20 |

The `sent-changed` and `sent-own` texts are coded by two team members for what was changed (price, day, time, place, tone); agreement (% and Cohen's κ) is reported before disagreements are settled. The `seeking` texts are listed as seeds for the pilot.

## Pre-registration

Frozen with a date before the first invitation, together with the script and the codebook; later changes are listed as deviations. The rules are decisions for the next build, not confirmed findings. Rate rules apply only with at least 40 answers to the item; below that, counts only. Each rule has three outcomes: success, fail, inconclusive (neither threshold met, or fewer than 40 answers).

| H   | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Success →                                                | Fail →                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| H1  | Coordination share of `last-trouble` among those who tried: `replies`, `messages`, `timing`, `cancelled`, `deadline-pickup`. Success if it is ≥ 40% **and** larger than the share of finding (`finding`, `finding-taker`) + `listing` combined. Fail if it is ≤ 20%.                                                                                                                                                                                                                                          | Pilot and onboarding lead with coordination              | Lead with finding or listing                  |
| H2  | Supply: the share of those who answered `idle-items` who report at least one usable thing they don't currently use **and** answer `idle-release` = `yes`. Success if supply is ≥ 50% **and**, among those who answered `idle-why` (release yes or unsure), more name at least one of `listing-hassle`, `messages-hassle`, `transport` than name at least one of `might-need`, `keep`. Fail if supply is ≤ 30%, or `might-need` + `keep` is named by more. Supply is also reported per `trade-frequency` band. | "Pass on what's lying around" as the core message        | Message around moving out only                |
| H3  | `wanted-react` `offer-now` among those who answered; `offer-later` does not count. Success if its lower bound is ≥ 25%. Fail if its upper bound is below 15%. `seeking` = `yes`, the typed requests, `max-distance` and `trust-signals` are reported with it.                                                                                                                                                                                                                                                 | Build a first version of requests                        | Drop requests for now                         |
| H4  | Among completed decisions on the correct draft, the share that sends Pako's draft (`sent-unchanged` or `sent-changed`); among those who answered `delegate`, the share naming at least one task. Success if both are ≥ 50%. Fail if either is ≤ 25%. `sent-unchanged` alone, each `delegate` task and `check-listing` are reported with it.                                                                                                                                                                   | Pako drafts by default; let it do the chosen tasks alone | Keep Pako to suggestions the user writes over |
| H5  | Descriptive only: `wtp-monthly` median, quartiles, share at CHF 0 and distribution, overall and per side; `pay-model` ranks overall and by side, optional pricing ideas and `pay-for` per option.                                                                                                                                                                                                                                                                                                             |                                                          |                                               |

Behavioural value metric: submitted forms with `try_early` divided by sessions that reached the end, with its range. It has no threshold; it is compared with the next cycle.

The H2, H3 fail thresholds were set in this protocol; the spec gave the success sides. The H4 rule was set in `v4-2`, when the planted error was removed, before any `v4-2` data.

## Threats to validity

| Threat                            | Where                                 | Mitigation                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stated intentions                 | Parts 3 and 4                         | Short neutral questions with outside options; read as rankings and as reasons to drop ideas, not as forecasts of use                                                                                                            |
| Pako asks the product questions   | Part 3, price questions               | Neutral wording, outside options, no reaction to product answers                                                                                                                                                                |
| A correct draft is easy to send   | `draft`                               | H4 also needs `delegate`; `sent-unchanged` is reported apart; no planted error, so nobody is misled about Pako                                                                                                                  |
| The story frames the answers      | Part 3                                | One consistent story so questions are clear; `delegate` comes after the draft and says the setting changed; personal questions sit in parts 1, 2 and 4, apart from the story                                                    |
| Self-selection, course peers      | Everything                            | Neutral invitation, channel tags, subgroups described                                                                                                                                                                           |
| Recall of the last attempt        | Part 1                                | No time window; `last-outcome` and `last-occasion` describe the episode; "Can't remember" offered                                                                                                                               |
| Multiple difficulties per attempt | `last-trouble`                        | Count people selecting any obstacle in a category once per category. `nothing` comes first so "none" is easy to say. `last-messages` and `last-transport` describe the episode                                                  |
| Contact details                   | End form                              | The optional contact form is separate from age and all other answers                                                                                                                                                            |
| Option lists per side             | `last-trouble`                        | Buyers and sellers see different lists (11 to 16 options), so a share depends on the mix of sides; reported per side next to the pooled share. Shared obstacles keep one id; finding and coordination each have one id per side |
| Anchoring on the slider           | `wtp-monthly`                         | No preset value; a muted midpoint handle invites dragging; Continue only after a move; the range 0–10 still frames answers, stated in the analysis; descriptive only                                                            |
| Hypothetical prices               | `wtp-monthly`, `pay-model`, `pay-for` | "Example prices, not available yet"; same two facts on every card; descriptive only                                                                                                                                             |
| Short scenes as context           | Part 3                                | Pako's line says what each scene shows; the scenes are in English and captioned so; the deal scene's buyer name is explained; Replay; skipped scenes logged                                                                     |
| Fixed section order               | All                                   | Shuffled options with stored order where order would bias                                                                                                                                                                       |
| Three languages                   | All                                   | One dictionary per language with equivalent meaning; language stored per session                                                                                                                                                |
| Two versions running              | v1 and v4                             | Each session stores questionnaire and wording version; analysed separately                                                                                                                                                      |
| Repeat answers                    | Counts                                | Saved session and latest answer revision                                                                                                                                                                                        |

## Reporting template

One block per hypothesis, same order and colours every time. Symbol and word always shown with the colour; bars in a neutral colour, outcome colour only on the badge.

| Outcome      | Meaning                                      | Colour          | Symbol |
| ------------ | -------------------------------------------- | --------------- | ------ |
| Success      | Threshold for the planned change met         | green `#1E7B3A` | ✓      |
| Inconclusive | Between thresholds, or fewer than 40 answers | grey `#7A7F87`  | –      |
| Fail         | Opposite threshold met                       | red `#B3261E`   | ✗      |

```
H1 The problem is coordination                         [✓ Success]
Question   What was hard about it? (those who tried)
Result     27 of 60 named a coordination obstacle: 45% (plausible range 33–58%)
           finding + listing 12 · transport 8 · nothing 6
Rule       Success if ≥ 40% and above finding + listing  →  met
Action     Lead the pilot and onboarding with Pako handling replies and pickups
Sides      buying 13/30 · passing on 14/30     descriptive
Limit      One response per session, recall, self-selected sample
```

Every block: k of n with the denominator named, the range, the rule and its outcome, one line of limitation. The numbers above are placeholders.

### Build-to-Learn card

| Cycle       | Build                                                                                                                                                | Measure                                                 | Learn                                                                                                 | Next                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| v1          | Tour page with a short survey and two tasks ([STUDY-v1.md](STUDY-v1.md))                                                                             | Answers and task results of the first participants      | Questions about features drew polite yeses; the tasks were more telling                               | A longer protocol around decisions          |
| v3          | Five parts, scenes with "would it have helped", desk and draft tasks, price ladder, slogans                                                          | Pretest runs and decision rules D1–D11                  | Too long for a phone, many items without a decision behind them                                       | User test with someone new to the app       |
| User test 1 | `v3-8` in German, observed                                                                                                                           | Where the participant hesitated or was confused         | Progress felt slow; price cards cut off and not comparable; unclear German; unexplained product terms | Fewer items, one rule per research question |
| v4          | Four parts, role-specific obstacles, four-tick form; `v4-2`: one story in part 3, correct draft for everyone, price slider, personal questions apart | H1–H5 rules, try-early sign-up rate, about 80 completes | To be filled in after the run                                                                         | To be filled in after the run               |

## Before launch

1. Pretest done; wording and `{measured}` fixed; wording version raised for the run if the wording changed.
2. This protocol frozen with a date.
3. Pretest sessions deleted.
4. `STUDY_CONTACT` and `STUDY_DELETE_BY` set on the deployment.
5. Migration `202611220002_study_v4.sql` applied before the server that needs it (done for `v4-1`). `v4-2` needs no migration: option ids with a dot are checked only by the server.
6. Server logs checked for request addresses.
7. QR codes generated per channel and tested at poster distance.

## Results page

Admins see the counts in the app under Admin → Study, read through `GET /api/study/report`. In account mode the server passes the signed-in user to `study_report_rows`, which refuses anyone not in `public.admins`; the server calls it with its service key. In the local demo the admin area opens in developer mode, as the rest of it does.

The page shows one wording version at a time, the newest first: sessions per UTC day and channel, how many sessions reached each screen of the survey (the part screens included), the last screen of those who left before the end, counts per option over the participants who answered (skips excluded), counts by rank for the five pricing cards, typed answers sorted alphabetically without session ids (replies sent as Pako drafted them are left out), and the forms at the end of the same wording version: each of the four ticks, and those who want to try takeover early per place, as sellers (sell or give away), buyers (buy or get for free) and undecided (not sure yet); one form may count on both sides. Any breakdown count from 1 to 4 shows as "<5". Older wording versions keep their pack ladder panel. Rule outcomes come from the queries below.

## Results queries

Run these in the Supabase SQL editor, which connects with the owner role and can read the study tables. Each query reads the v3-questionnaire sessions of one wording version: replace `v4-3` with the version of the real run. Intervals and rule outcomes are computed from the counts (`k` = `chosen`, `n` = `answered`); where a rule uses a bound, the query gives the Wilson lower bound (`z` = 1.96).

Tables in `takeover_admin`: `study_sessions`, `study_answers`, `study_events`, `study_pilot` (the form at the end), and `study_contacts` (v1 only).

### R0 Completion funnel by channel and device

`core_complete` and `end_reached` are both recorded on reaching the end screen.

```sql
-- funnel
with run as (
  select id, source, device from takeover_admin.study_sessions
  where survey = 'v3' and version = 'v4-3'
), reached as (
  select e.session, e.kind from takeover_admin.study_events e join run on run.id = e.session
)
select run.source, run.device,
  count(*) as started,
  count(*) filter (where exists (select 1 from takeover_admin.study_answers a
    where a.session = run.id and (cardinality(a.chosen) > 0 or a.text <> ''))) as answered_any,
  count(*) filter (where exists (select 1 from reached r where r.session = run.id and r.kind = 'core-complete')) as core_complete,
  count(*) filter (where exists (select 1 from reached r where r.session = run.id and r.kind = 'end')) as end_reached,
  count(*) filter (where exists (select 1 from reached r where r.session = run.id and r.kind = 'share')) as shared
from run
group by run.source, run.device
order by started desc;
```

### R0 Drop-off per screen

`stopped_here`: participants without `core-complete` whose last shown screen this was.

```sql
-- drop-off
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), shown as (
  select e.session, e.step, e.seq from takeover_admin.study_events e join run on run.id = e.session
  where e.kind = 'shown'
), stopped as (
  select distinct on (session) session, step from shown
  where session not in (select session from takeover_admin.study_events where kind = 'core-complete')
  order by session, seq desc
)
select shown.step, count(distinct shown.session) as shown,
  (select count(*) from stopped where stopped.step = shown.step) as stopped_here
from shown
group by shown.step
order by shown desc, shown.step;
```

### Counts per option for one step

For the single-choice descriptive steps (`trade-frequency`, `who`, `housing`, `last-occasion`, `max-distance`, `wtp-monthly` as a distribution, `age`, `gender`). Change the step id. Skips are not counted. For a multiple choice, `answered` counts choices, not people; use the step's own query.

```sql
-- split
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select option, count(*) as chosen, sum(count(*)) over () as answered
from takeover_admin.study_answers a
join run on run.id = a.session
cross join unnest(a.chosen) as option
where a.step = 'who'
group by option
order by chosen desc, option;
```

### H1 Coordination among those who tried

Per side and pooled (`all`, the row the rule reads). Coordination: `replies`, `messages`, `timing`, `cancelled`, `deadline-pickup`; finding: `finding`, `finding-taker`. `coordination_low` is the Wilson lower bound of the coordination share.

```sql
-- rq1-coordination
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), trouble as (
  select case when r.chosen && array['buying','getting-free'] and r.chosen && array['selling','giving-away'] then 'both'
      when r.chosen && array['buying','getting-free'] then 'buying'
      when r.chosen && array['selling','giving-away'] then 'passing-on' else 'none' end as side,
    a.chosen as obstacles
  from takeover_admin.study_answers a join run on run.id = a.session
  join takeover_admin.study_answers r on r.session = a.session and r.step = 'last-role'
  where a.step = 'last-trouble' and cardinality(a.chosen) > 0
), counts as (
  select coalesce(side, 'all') as side, count(*) as answered,
    count(*) filter (where obstacles && array['replies', 'messages', 'timing', 'cancelled', 'deadline-pickup']) as coordination,
    count(*) filter (where obstacles && array['finding', 'finding-taker', 'listing']) as finding_listing
  from trouble
  group by grouping sets ((), (side))
)
select side, answered, coordination, finding_listing,
  round(((coordination + 1.9208) / (answered + 3.8416)
    - 1.96 * sqrt(coordination::numeric * (answered - coordination) / nullif(answered, 0) + 0.9604)
      / (answered + 3.8416))::numeric, 3) as coordination_low
from counts
order by side;
```

### H1 The last attempt in context

```sql
-- rq1-context
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select a.step, a.chosen[1] as answer, count(*) as chosen,
  sum(count(*)) over (partition by a.step) as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step in ('last-how', 'last-outcome', 'last-transport', 'last-messages')
  and cardinality(a.chosen) > 0
group by a.step, answer
order by a.step, chosen desc, answer;
```

### H2 Supply, by trade frequency

`with_idle`: answered `1-3`, `4-10` or `over-10`. `supply`: with idle things **and** `idle-release` = `yes`, the share the rule reads (row `all`). The other rows split by `trade-frequency` (`not-answered` when it was skipped).

```sql
-- rq2-idle
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), idle as (
  select a.chosen[1] as count_band, r.chosen[1] as release,
    coalesce(f.chosen[1], 'not-answered') as frequency
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers f on f.session = a.session and f.step = 'trade-frequency'
  left join takeover_admin.study_answers r on r.session = a.session and r.step = 'idle-release'
  where a.step = 'idle-items' and cardinality(a.chosen) > 0
)
select coalesce(frequency, 'all') as subgroup, count(*) as answered,
  count(*) filter (where count_band <> 'none') as with_idle,
  count(*) filter (where count_band <> 'none' and release = 'yes') as supply
from idle
group by grouping sets ((), (frequency))
order by subgroup;
```

### H2 Why things stay at home

Asked after `idle-release` yes or unsure. Multiple choice: `participants` is the number who answered `idle-why`. `effort_or_transport` counts participants naming at least one of `listing-hassle`, `messages-hassle`, `transport`; `keeping` those naming at least one of `might-need`, `keep`. The rule compares the two.

```sql
-- rq2-reasons
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), why as (
  select a.session, a.chosen from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'idle-why' and cardinality(a.chosen) > 0
)
select option, count(*) as chosen,
  (select count(*) from why) as participants,
  (select count(*) from why where chosen && array['listing-hassle', 'messages-hassle', 'transport']) as effort_or_transport,
  (select count(*) from why where chosen && array['might-need', 'keep']) as keeping
from why cross join unnest(why.chosen) as option
group by option
order by chosen desc, option;
```

### H3 Requests nearby and distance

The rule reads `offer-now` in `wanted-react`.

```sql
-- rq3-wanted
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select a.step, a.chosen[1] as answer, count(*) as chosen,
  sum(count(*)) over (partition by a.step) as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step in ('wanted-react', 'seeking', 'max-distance') and cardinality(a.chosen) > 0
group by a.step, answer
order by a.step, chosen desc, answer;
```

### H3 What participants are looking for

```sql
-- rq3-seeking-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select a.text
from takeover_admin.study_answers a join run on run.id = a.session
where a.step = 'seeking' and a.chosen && array['yes'] and a.text <> ''
order by a.text;
```

### H4 The correct draft

One row per final and first answer. `completed` counts the completed decisions; `sends_draft` those that sent Pako's draft as written or edited, the share the rule reads; `sends_draft_low` is its Wilson lower bound. `shown_task`: sessions shown the task.

```sql
-- rq4-draft
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), draft as (
  select a.chosen[1] as final, a.first_chosen[1] as first
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'draft'
), totals as (
  select count(*) filter (where final in ('sent-unchanged', 'sent-changed', 'sent-own', 'not-sent')) as completed,
    count(*) filter (where final in ('sent-unchanged', 'sent-changed')) as sends_draft
  from draft
)
select final, first, count(*) as participants, totals.completed, totals.sends_draft,
  round(((totals.sends_draft + 1.9208) / (totals.completed + 3.8416)
    - 1.96 * sqrt(totals.sends_draft::numeric * (totals.completed - totals.sends_draft) / nullif(totals.completed, 0) + 0.9604)
      / (totals.completed + 3.8416))::numeric, 3) as sends_draft_low,
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'draft') as shown_task
from draft cross join totals
group by final, first, totals.completed, totals.sends_draft
order by final, first;
```

### H4 Changed and own replies to code

```sql
-- rq4-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select a.session, a.chosen[1] as final, a.text
from takeover_admin.study_answers a
join run on run.id = a.session
where a.step = 'draft' and a.chosen[1] in ('sent-changed', 'sent-own')
order by a.saved_at;
```

### Multiple choices per option

For `last-role`, `last-item`, `last-trouble`, `delegate`, `check-listing`, `trust-signals`, `idle-why` and `pay-for`. `participants` is the number who answered the step (empty answers excluded); `any_but_exclusive` counts those who picked at least one option other than the exclusive one (`none`, `nothing`), the share the H4 rule reads for `delegate`.

```sql
-- multi
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), answers as (
  select a.step, a.chosen
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step in ('last-role', 'last-item', 'last-trouble', 'delegate', 'check-listing', 'trust-signals', 'idle-why', 'pay-for')
    and cardinality(a.chosen) > 0
)
select answers.step, option, count(*) as chosen,
  (select count(*) from answers a where a.step = answers.step) as participants,
  (select count(*) from answers a where a.step = answers.step
    and not a.chosen <@ array['none', 'nothing']) as any_but_exclusive
from answers cross join unnest(answers.chosen) as option
group by answers.step, option
order by answers.step, chosen desc, option;
```

### H5 Monthly amount, by side of the last attempt

`side` as in the pay-model query below; `all` pools them. Amounts in CHF; `nothing` counts `chf-0`. The distribution per amount comes from the counts query above with `wtp-monthly`.

```sql
-- rq5-wtp
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), amounts as (
  select replace(a.chosen[1], 'chf-', '')::numeric as amount,
    case when r.chosen && array['buying','getting-free'] and r.chosen && array['selling','giving-away'] then 'both'
      when r.chosen && array['buying','getting-free'] then 'buying'
      when r.chosen && array['selling','giving-away'] then 'passing-on' else 'none' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers r on r.session = a.session and r.step = 'last-role'
  where a.step = 'wtp-monthly' and cardinality(a.chosen) > 0
)
select coalesce(part, 'all') as side, count(*) as answered,
  percentile_cont(0.5) within group (order by amount) as median,
  percentile_cont(0.25) within group (order by amount) as q1,
  percentile_cont(0.75) within group (order by amount) as q3,
  count(*) filter (where amount = 0) as nothing
from amounts
group by grouping sets ((), (part))
order by side;
```

### H5 Pay model, by side of the last attempt

`side`: `buying` (buying, getting-free), `passing-on` (selling, giving-away), `both` (at least one role from each side), `none` (never tried or not answered); `all` counts each participant once. Each position has its own denominator.

```sql
-- rq5-pay-model
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
), models as (
  select model, rank,
    case when r.chosen && array['buying','getting-free'] and r.chosen && array['selling','giving-away'] then 'both'
      when r.chosen && array['buying','getting-free'] then 'buying'
      when r.chosen && array['selling','giving-away'] then 'passing-on' else 'none' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers r on r.session = a.session and r.step = 'last-role'
  cross join unnest(a.chosen) with ordinality as ranked(model, rank)
  where a.step = 'pay-model' and cardinality(a.chosen) = 5
), counts as (
  select coalesce(part, 'all') as side, rank, model, count(*) as chosen
  from models
  group by grouping sets ((rank, model), (part, rank, model))
)
select side, rank, model, chosen, sum(chosen) over (partition by side, rank) as answered
from counts
order by side, rank, chosen desc, model;
```

### Forms at the end and the try-early rate

The forms carry no session but name the wording version they end, so both counts read the same version; the behavioural value metric is `try_early` / `end_reached`.

```sql
-- forms
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-3'
)
select
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'end') as end_reached,
  count(*) as forms,
  count(*) filter (where launch_news) as launch_news,
  count(*) filter (where try_early) as try_early,
  count(*) filter (where interview) as interview,
  count(*) filter (where future_surveys) as future_surveys
from takeover_admin.study_pilot
where version = 'v4-3';
```

### Those who want to try takeover early, per place

Sellers want to sell or give away, buyers to buy or get for free; one form may count on both sides. `undecided`: not sure yet.

```sql
-- forms-places
select place,
  count(*) filter (where roles && array['sell', 'give-away']) as sellers,
  count(*) filter (where roles && array['buy', 'get-free']) as buyers,
  count(*) filter (where roles = array['not-sure']) as undecided,
  count(*) as people
from takeover_admin.study_pilot
where try_early and version = 'v4-3'
group by place
order by people desc, place;
```

### Deleting the data

Run this by the deletion date. It removes the forms at the end, the v1 contacts and all sessions of both versions with their answers and events. Delete any exports as well.

```sql
delete from takeover_admin.study_pilot;
delete from takeover_admin.study_contacts;
delete from takeover_admin.study_sessions;
```
