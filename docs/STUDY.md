# User study on the tour page

The tour page (`/tour`) has two uses. Without a tag it is the pitch: a hero and a short tour of takeover, and nothing is recorded. With a tag (`/tour?s=<channel>`) it is the study, described here. `/tour?s=<channel>&v=1` runs version 1 ([STUDY-v1.md](STUDY-v1.md)) unchanged, so both versions can be compared. Every session stores its questionnaire (`survey`), its wording version and its language.

This file is the protocol of survey version 4, wording version `v4-1`. In code and in the database it still runs as questionnaire `v3` (`survey = 'v3'`); only the wording version tells v3 and v4 sessions apart. The script in `src/tour/v3/` follows this file, in English, French and German with equivalent meaning; the English wording below is the live reference. The app screens inside the phone stay in English. The decision rules are frozen before launch (see [Pre-registration](#pre-registration)).

Setting: a course project (CS-500). Prices are hypothetical; nothing is launched, sold or booked.

## Changed in v4

User test 1 (one participant who did not know the app, German, wording `v3-8`, observed by the owner) showed:

- The progress bar made the participant feel far from the end: finished parts shrank to small boxes and the current part had a fixed 40% fill.
- The price cards were cut off by the footer, had uneven heights, and it was not visible that more answers followed. The four plans described different things, so they could not be compared.
- The German of several questions did not fit their options (`last-role`), and the move-out pack sentences were not natural German.
- Product terms ("Auszugspaket", "Wanted nearby") were used before they were explained, and the part screens mixed topics.
- The end screen's title was a long sentence placed left of centre.

What v4 changes:

- Research questions first. Every item serves one of five research questions (RQ1–RQ5) with one rule each; the v3 decisions D1–D11 are replaced. The target is about 80 completes and 6–6.5 minutes on a phone.
- Questions are short and direct; the context sits in Pako's line before the question, and the question stands right above its answers.
- Four parts, each opened by a part screen "Part n of 4". The progress strip has four equal bars: finished parts are full, the current one fills with the steps done in it (at least 15%), and the last part is labelled "Last part".
- `last-trouble` offers each side its own obstacles (see [Script](#script)); the shared obstacles keep their ids across sides.
- New items: `last-how`, `last-outcome`, `last-transport`, `last-messages`, `idle-items`, `idle-why`, `seeking`, `delegate`.
- The draft task: Mia confirms price and time first; the wrong variant drafts CHF 45 instead of the agreed CHF 40 (v3: CHF 35), two in three participants get it, and the price named in the sent message is stored as `draft-price`.
- Price cards in one column, each with its price on the right and the same two rows, "Pako's help" and "You pay". A pill "More options below" shows while the end of a step is out of view.
- End: "Thank you!" with Pako, centred; the save status shows once saving is done; the form at the end has a fourth tick, "I'm up for a 15-minute chat" (`study_pilot.interview`, migration `202611220002_study_v4.sql`).

Round-1 review of `v4-1` before launch (screenshots in EN, DE and FR; the version label stays `v4-1`, since nothing has gone live):

- Wording: the `last-role` card, `housing`, `last-occasion` (new option `both`), `last-how` ("first"), `last-transport` (new options, shown only after `last-outcome` yes or ongoing), `last-messages`, `idle-items` ("usable things you don't currently use"), `idle-why` (visible "You can choose several."), `wanted-react`, the `seeking` field, `delegate` card and question, the `pay-model` card and rows, the part 4 name, and the draft intro and card.
- `last-trouble`: sellers and givers get `finding-taker` ("Finding someone interested", counted as finding) and the new `deadline-pickup` ("Arranging pickup before my deadline", counted as coordination); `agree-price` is for buyers only. Option lists may hold up to 16 ids (sellers see 13).
- `wanted-react` ids are now `offer-now`, `offer-later`, `leave`, `rather-not`, shuffled; RQ3 counts `offer-now` only.
- The form: one role became a multiple choice of what to try (`roles`: `buy`, `get-free`, `sell`, `give-away`, `not-sure`); the "Open takeover" link is gone; after Send the form card disappears; participants who saw the wrong draft read a short debrief.
- Analysis: `delegate` is read by draft variant, `seller-fee` by side of the last attempt.
- UI: the draft decision is in view as a whole with a 2×2 button grid; the hover tint no longer looks like a selection; the "More options below" cue sits in the footer instead of over the answers; the progress strip counts the longest path of part 1, so it never moves back; scenes go straight to their final frame with reduced motion and are captioned "Example from the app (in English)".

Cut: the slogans (`headline`), `helped-*`, `try-first`, `stop`, `sending` (replaced by `delegate`), the desk trade-off (`desk`), `move-it`, `delivery-*`, `institution-pay`, the pack price ladder (`pack-chf-*`), the find scene, `level`, `exchange`, `last-cost`, `last-story`, `why-not`, the `what-is` screen (the start screen now says what the app is), the optional full tour after the core (`peek`, `scene-pick`, `tour-*`), the "How others answered" counts at the end with their endpoint `GET /api/study/results`, and the database function `study_results`, which the v4 migration drops.

## Research questions

| RQ  | Question                                          | Hypothesis                                                                                                    | Measure                                                       | Decision it informs                                         |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| RQ1 | What makes passing on used things hard?           | Coordination (replies, back-and-forth, timing, cancelled pickups, a pickup deadline) matters more than finding or listing. | `last-trouble`; `last-how`, `last-outcome`, `last-transport`, `last-messages` describe | Which pain the pilot and onboarding lead with               |
| RQ2 | Is there untapped supply?                         | Many students have usable things they don't currently use; effort, not attachment, is why they keep them.     | `idle-items`, `idle-why`, crossed with `move`                 | Whether "pass on what's lying around" is the core message   |
| RQ3 | Does local matching work?                         | Students would answer a nearby request, and some are looking for something now.                               | `wanted-react`, `seeking` and its text                        | Build or drop "Wanted nearby"                               |
| RQ4 | Which steps would students hand to an agent?      | Students hand over chores but keep price; many send a wrong draft unchanged.                                  | `draft` by `draft-variant`, `draft-price`; `delegate` by `draft-variant` | Which tasks Pako may do alone; whether a check step is needed |
| RQ5 | Would anyone pay, and how?                        | A minority would pay for extra help; one model is preferred.                                                  | `pay-model`; `seller-fee` by side                             | Which payment model to test first (exploratory)             |

Primary risk this cycle: value (RQ1, RQ2). RQ3 and RQ4 are secondary; RQ5 is exploratory. Behavioural value metric: submitted forms with "I'd like to try takeover early" ticked, divided by the participants who reached the end.

What the results cannot claim: shares for all EPFL/UNIL students; adoption or future use; real willingness to pay, a price or revenue; how carefully people read drafts in real use; differences between small subgroups; that the scenes or the app work.

## Participants and recruitment

- Everyone who agrees takes part. Nobody is filtered by student status, answers, move plans, time windows or response speed.
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

`{measured}` is 6 (`V3_MINUTES`) until the pretest measures the median time from start to the end screen; it is then rounded up.

## Script

Pako asks every question. On a step with context, Pako's line gives the context and the question stands as a heading right above the answers; otherwise Pako's line is the question. On product questions (`wanted-react`, `seeking`, `delegate`, `pay-model`) Pako keeps a neutral face; on questions about the participant it smiles briefly after a pick. A single-choice tap moves on after about 300 ms; multiple choices and steps with a text field move on with Continue. Back is visible on every step but the first and the end. Shuffled options appear in an order drawn once per participant and stored; options marked _last_ stay at the bottom in the order listed.

Progress strip: four equal bars, `Your experience · Things at home · The app · Price, and about you`. A finished part is full and shows a small taped box; the current part fills with the share of its steps before the current one, at least 15%. Part 1 is counted along its longest path (an attempt that worked out), so the bar never moves back; someone who never tried jumps forward. The label under the strip names the part, in the last part as "Last part · Price, and about you".

### Start screen

Pako: "Hi, I'm Pako, the assistant in the takeover app. EPFL students are building it so students around EPFL and UNIL can buy, sell and give away used things. The survey takes about {measured} minutes."

Buttons: Start the survey · Just show me the app.

Folded toggle "What we save": "We save your answers and record which screens you visit, skip or return to and how long you spend on each one. We also record which link you followed, your language and whether you're using a phone or a computer. Your progress stays in this tab until you close it, and this browser remembers that you finished. If you leave your email at the end, we store it separately from your answers. Everything is deleted by {date}." Then "Questions about the survey: {contact}".

"Just show me the app" opens the tour without a session; nothing is stored. `{date}` and `{contact}` come from `STUDY_DELETE_BY` and `STUDY_CONTACT`. A session starts with "Start the survey".

### Part 1 of 4: Your experience (RQ1)

`part-last-time`. Pako: "First, a few questions about you and your experience." Card: "Part 1 of 4" · Your experience · "There are no right or wrong answers."

| Id               | Shown to                          | Pako's context                                                                                                                       | Question                                                         | Options                                                                                                                                                                                                  |
| ---------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `who`            | everyone                          |                                                                                                                                      | "Are you a student?"                                             | `epfl` Yes, at EPFL · `unil` Yes, at UNIL · `other-school` Yes, at another university · `no` No                                                                                                          |
| `housing`        | everyone                          |                                                                                                                                      | "Which best describes where you live now?"                      | `fmel` In an FMEL residence · `other-res` In another student residence · `flat` Shared or own flat or studio (not a residence) · `family` With my family · `elsewhere` Somewhere else                    |
| `last-role`      | everyone                          | "Think of the last time you tried to buy, sell, give away or get a used item for free. It counts even if it didn't work out."       | "What were you trying to do?"                                    | `buying` Buy something · `getting-free` Get something for free · `selling` Sell something · `giving-away` Give something away · `none` I've never tried any of these                                      |
| `last-item`      | tried                             |                                                                                                                                      | "What was it?"                                                   | `furniture` Furniture · `household` Household items · `electronics` Electronics · `bike` Bike or scooter · `books` Books · `clothes` Clothes · `other` Other                                              |
| `last-occasion`  | tried                             |                                                                                                                                      | "Was it connected with a move?"                                  | `moving-in` Yes, moving in · `moving-out` Yes, moving out · `both` Both moving out and in · `no-move` No                                                                                                  |
| `last-how`       | tried                             |                                                                                                                                      | "Where did you try first?"                                       | `friends` Friends or people I know · `chat-group` WhatsApp or Telegram group · `facebook` Facebook Marketplace · `anibis` Anibis, Tutti or Ricardo · `other` Other                                       |
| `last-outcome`   | tried                             |                                                                                                                                      | "Did it work out?"                                               | `yes` Yes · `no` No · `ongoing` Still in progress                                                                                                                                                         |
| `last-trouble`   | tried                             |                                                                                                                                      | "What was the most annoying part?"                               | See below; shuffled, the last three _last_                                                                                                                                                                |
| `last-transport` | `last-outcome` is `yes` or `ongoing` |                                                                                                                                   | "How was it transported?"                                        | `foot` On foot · `bike` By bike · `public-transport` By public transport · `car` By car · `delivery` Delivered · `not-yet` Not moved yet · `dont-know` Don't know                                         |
| `last-messages`  | tried                             |                                                                                                                                      | "Roughly how many messages did it take in total, with everyone?" | `none` None · `1-5` 1–5 · `6-15` 6–15 · `over-15` More than 15 · `dont-remember` Can't remember                                                                                                           |

"Tried" means `last-role` is `buying`, `getting-free`, `selling` or `giving-away`. Someone who never tried goes on to part 2.

`last-trouble` is single choice. Its options depend on `last-role`; the last column says how RQ1 counts each one:

| Id                | Words                               | Offered to                 | RQ1 group    |
| ----------------- | ----------------------------------- | -------------------------- | ------------ |
| `finding`         | Finding something suitable          | buying, getting-free       | finding      |
| `gone`            | The item was already gone           | buying, getting-free       |              |
| `agree-price`     | Agreeing on a price                 | buying only                |              |
| `finding-taker`   | Finding someone interested          | selling, giving-away       | finding      |
| `deadline-pickup` | Arranging pickup before my deadline | selling, giving-away       | coordination |
| `listing`         | Writing the listing                 | selling, giving-away       | listing      |
| `set-price`       | Setting the price                   | selling only               |              |
| `replies`         | Waiting for replies                 | everyone who tried         | coordination |
| `messages`        | Lots of messages back and forth     | everyone who tried         | coordination |
| `timing`          | Agreeing on a pickup time           | everyone who tried         | coordination |
| `cancelled`       | Cancelled pickups                   | everyone who tried         | coordination |
| `transport`       | Transport                           | everyone who tried         |              |
| `trust`           | Trusting the other person           | everyone who tried         |              |
| `other`           | Something else                      | everyone who tried, _last_ |              |
| `nothing`         | Nothing was annoying                | everyone who tried, _last_ |              |
| `cant-recall`     | Can't remember                      | everyone who tried, _last_ |              |

Buyers see 12 options, people getting something for free 11, sellers 13, givers 12. `agree-price` is for buyers only and `set-price` for sellers only, since nothing is paid when something is given away or got for free. The shuffle runs over the options of the participant's side; going back and changing `last-role` to another side draws a new order and empties the answer (see [What is stored](#what-is-stored)).

### Part 2 of 4: Things at home (RQ2)

`part-home`. Pako: "Next, a few questions about things you have at home." Card: "Part 2 of 4" · Things at home · "For example furniture, books, kitchen things or electronics."

| Id           | Shown to                                 | Question                                                                       | Options                                                                                                                                                                                                                                                                                                                                                |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `idle-items` | everyone                                 | "How many usable things do you have at home that you don't currently use?"    | `none` None · `1-3` 1–3 · `4-10` 4–10 · `over-10` More than 10                                                                                                                                                                                                                                                                                          |
| `idle-why`   | `idle-items` is `1-3`, `4-10`, `over-10` | "Why do you still have them?" with "You can choose several." above the options; multiple choice, shuffled, `other` _last_ | `listing-hassle` Listing is too much hassle · `messages-hassle` Messages and scheduling are too much hassle · `transport` I can't transport them · `not-worth` Not worth the effort for the money · `dont-know-where` I don't know who I could offer them to · `might-need` I might still need them · `not-yet` I haven't got round to it · `other` Other |
| `move`       | everyone                                 | "Will you move out by the end of June 2027?"                                   | `move-feb` Yes, by the end of February · `move-jun` Yes, between March and June · `no-or-later` No, or later · `not-sure` Not sure                                                                                                                                                                                                                       |

### Part 3 of 4: The app (RQ3, RQ4)

`part-the-app`. Pako: "Now a quick look at the app. I draft listings and messages in it. You decide what gets sent." Card: "Part 3 of 4" · The app · "Two short scenes, an idea for the app and a short chat."

Two short scenes in a phone frame, captioned "Example from the app (in English)", each with Next and Replay; a scene left before it ends logs `scene-skipped`. With reduced motion a scene shows its final frame at once.

| Id         | Pako                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-sell` | "Selling with a photo" · "Léa takes a photo of her desk. Pako writes the listing and suggests a price. Léa sets her own price and saves the listing."  |
| `app-deal` | "Agreeing on a pickup" · "Noah offers CHF 35 for the desk and Léa accepts, so the pickup is booked. At pickup time, both of them confirm the handover." |

`wanted-react`. Pako: "An idea for takeover: requests." · "If you're looking for something, you post what you need. All students nearby who use takeover can see it." Below it an example post without a button: "Someone 5 minutes from you is looking for a desk lamp." Question: "You have a spare desk lamp like the one requested. What would you most likely do?" Options, shuffled: `offer-now` Offer it now · `offer-later` Offer it later · `leave` Leave the request unanswered · `rather-not` I don't want to see requests like this.

`seeking`. "Are you looking for something used right now?" `yes` Yes · `no` No. `yes` opens a one-line field, "What are you looking for? (optional)", stored as the answer's `text`.

`draft`, the practice chat. Pako: "You want to buy Mia's desk. Mia asks when you could pick it up: choose a day in the chat below." Card above the chat: "Mia is another student. The price and the pickup place work for you." and, in bold, "First, answer Mia in the chat. Pako then drafts a reply for you, and you decide what to do with it."

1. Listing: "White desk · 120 × 60 cm", "CHF 40 · Pickup: EPFL, Rolex Learning Center · Mia".
2. Mia: "Hi! The desk is still available. Which day could you pick it up? I'm free from 5 pm." Two chips, Saturday and Sunday, in random order (stored as the order of `draft-day`).
3. You: "{day} works for me. How about 5:30 pm?"
4. Mia: "Agreed: CHF 40, on {day} at 5:30 pm at the Rolex Learning Center."
5. Pako: "I've drafted a reply for you." Card "Pako's draft": "Great, thanks! So CHF {price}, on {day} at 5:30 pm at the Rolex Learning Center. See you then!"
6. "What would you do with this draft?" Four equal buttons in a 2×2 grid: Send as written · Edit it · Write my own · Send nothing. Mia's agreement, the draft and the four buttons are in view together. "Edit it" opens the draft in a text field ("Your reply to Mia"), "Write my own" an empty one ("Your message to Mia"), each with Send and Send nothing. Not sent: "You didn't send anything."

`{price}` depends on the variant, drawn once per participant when the task is first shown: `exact` drafts CHF 40, `wrong-price` drafts CHF 45, against the participant's interest. The draw takes one of `exact`, `wrong-price`, `wrong-price` with equal chance (`DRAFT_ALLOCATION`), so two in three participants get the wrong price. Participants in `wrong-price` are told at the end that the mistake was deliberate.

`delegate`. Pako: "Now imagine a different setting: Pako acts in your name. You see the messages only after they're sent." Question: "What would you let Pako do without checking with you first? You can choose several." Multiple choice, shuffled, `none` _last_ and exclusive: `answer-questions` Answer questions about the item · `suggest-time` Suggest a pickup time · `remind` Remind the other person about the pickup · `negotiate` Negotiate the price · `accept-offer` Accept an offer · `none` None of these.

### Part 4 of 4: Price, and about you (RQ5, background)

`part-price`. Pako: "Last part: price, and two questions about you." Card: "Part 4 of 4" · Price, and about you · "Then you're done."

`pay-model`. Pako: "Searching, listing and messaging are free. Pako helps you a few times a day for free. One help = Pako drafts one listing or message. Only extra help from Pako would cost something." Question: "Which option would you choose?" Small label above the cards: "Example prices, not available yet". One column, shuffled, `not-sure` _last_ without a card:

| Id           | Title                | Price       | Pako's help                  | You pay                                                          |
| ------------ | -------------------- | ----------- | ---------------------------- | ---------------------------------------------------------------- |
| `free`       | Free                 | CHF 0       | a few times a day            | nothing                                                          |
| `seller-fee` | Fee per sale         | 5%          | unlimited                    | 5% of the sale price, only if you sell something (CHF 2 on CHF 40) |
| `pay-once`   | Pack of 5            | CHF 5       | Pako drafts 5 extra listings | CHF 5 once                                                       |
| `monthly`    | Monthly subscription | CHF 3/month | unlimited                    | CHF 3 a month                                                    |
| `not-sure`   | Not sure             |             |                              |                                                                  |

No note follows the pick.

| Id       | Question           | Options                                                                                                                                    |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `age`    | "How old are you?" | `under-18` Under 18 · `18-20` 18–20 · `21-23` 21–23 · `24-26` 24–26 · `27-30` 27–30 · `31-plus` 31+ · `na` Prefer not to say             |
| `gender` | "Your gender?"     | `woman` Woman · `man` Man · `non-binary` Non-binary · `self-describe` Another term (opens an optional text field) · `na` Prefer not to say |

### End

Reaching the end records `core-complete` and `end`, marks the browser as finished and blocks Back. Pako and "Thank you!" centred; below them "Your answers are saved." once every save is confirmed, nothing while saving is under way, and the failure note with "Try again" if saving stopped. Participants in `wrong-price` then read: "By the way: the CHF 45 draft was a deliberate mistake to see whether people check drafts."

Form "Would you like to hear from us again?", shown to everyone who reaches the end, optional: Email address ("Optional. Kept separately from your survey answers."), then "What would you like?" with four ticks, at least one required:

| Field           | Tick                               |
| --------------- | ---------------------------------- |
| `launchNews`    | Let me know when takeover launches |
| `tryEarly`      | I'd like to try takeover early     |
| `interview`     | I'm up for a 15-minute chat        |
| `futureSurveys` | Invite me to future surveys        |

`tryEarly` reveals "What would you like to try?", multiple choice (`buy` Buy · `get-free` Get for free · `sell` Sell · `give-away` Give away · `not-sure` Not sure yet; `not-sure` stands alone), and "Where do you live?" (`vortex` FMEL Vortex · `atrium` FMEL Atrium · `triaudes` FMEL Triaudes · `fmel-other` Another FMEL residence · `other-res` Another student residence · `flat` A flat or studio · `elsewhere` Somewhere else), both required then. After Send the form card disappears, the page scrolls to the top and "We've saved your email. We'll be in touch." shows under the thank-you.

Share: "Every answer helps, including from people who never sell anything. Would you share the survey?" Share · Copy link · Show QR code. Text: "I just did a {measured}-minute survey for an EPFL student project. No sign-in: {link}". The link carries the tag `friend`. The end screen has no other link.

## What is stored

One session per participant, created on "Start the survey": a random id, `survey = 'v3'`, the wording version (`v4-1`), the language at the start (`en`, `fr`, `de`), the channel tag, phone or desktop. No name, no IP address, no browser details.

The tab keeps the participant's progress with the wording version the session started in. A reload continues the session only in that version: after a new version is deployed, the progress is set aside and the survey starts again with a new session and the line "The survey was updated, so it starts again."

One answer per session and step, replaced when the participant goes back and answers again. When a change after Back takes a step off the participant's path, such as `last-role` changed to `none` after `last-trouble` was answered, that step's answer is saved again empty: `chosen` and `text` empty, `first_chosen` kept. The same happens to `last-trouble` when a change of `last-role` changes the options it offers, for example from `buying` to `selling`. Every save carries a `revision` that the client raises; the server keeps the newest and ignores an older write. An empty answer counts as not answered on the results page and in the queries below.

| Field          | Content                                                                          |
| -------------- | -------------------------------------------------------------------------------- |
| `chosen`       | The final answer; empty when skipped or emptied                                  |
| `first_chosen` | The first answer; the server keeps the value it received first                   |
| `shown`        | Option order on screen, for shuffled steps                                       |
| `text`         | The `seeking` line, the `gender` self-description, or the message sent to Mia    |

`chosen`, `first_chosen` and `shown` hold at most 16 ids.
| `elapsed_ms`   | Time on screen                                                                   |

The draft task stores four answers:

| Step            | `chosen`                                                                                                                                                                         | Saved when                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `draft-day`     | `sat` or `sun`                                                                                                                                                                   | the day is picked          |
| `draft-variant` | `exact` or `wrong-price`                                                                                                                                                         | the day is picked          |
| `draft`         | `sent-unchanged` (sent as Pako drafted it, directly or after opening it), `sent-changed`, `sent-own`, `not-sent`; `change` or `own` while writing and undecided; `text` = the message sent | a writing option is tapped, and at the decision |
| `draft-price`   | The price named in the sent message: `chf-40`, `chf-45` or another `chf-N`; `several` when it names different prices; `no-price` when it names none                              | a message is sent          |

`first_chosen` of `draft` holds the option picked first (`send`, `change`, `own` or `dont-send`). `sent-unchanged` means the message equals the draft of the participant's own variant, so in `wrong-price` it is a reply sent at CHF 45. `draft-price` reads amounts next to "CHF", "Fr." or "francs", or followed by ".-"; a time such as 17:30 is not a price.

The form at the end goes to `study_pilot` without a session, so it cannot be linked to answers: email, `launch_news`, `try_early`, `interview`, `future_surveys`, `roles` (what the person wants to try, empty unless `try_early`), `place`. The v4 migration replaces the column `role` with `roles`: an earlier seller becomes `{sell}`, a buyer `{buy}`, both `{buy,sell}`; earlier forms have `interview = false`. One form per address; the first one stands.

Events, sent in batches and stored once per sequence number, at most 600 per session. A batch the server refuses for good is dropped, so events never hold back answers or the form:

| Kind                                      | Step                         | Detail                   |
| ----------------------------------------- | ---------------------------- | ------------------------ |
| `shown`, `answered`, `skipped`, `changed` | question                     |                          |
| `back`                                    | step left                    | step returned to         |
| `scene-played`, `scene-skipped`           | scene step (`app-sell`, `app-deal`) | scene             |
| `core-complete`, `end`                    |                              |                          |
| `share`                                   |                              | `native`, `copy` or `qr` |
| `language`                                |                              | language switched to     |

Not recorded: touch paths, scroll depth, keystrokes, session replay. The survey shows no counts of other participants; v4 has no results endpoint for participants.

In account mode the data is in Supabase, in tables that students cannot read; the server writes them through security-definer functions with its service key. In the local demo it is in the SQLite file. Without `STUDY_CONTACT` and `STUDY_DELETE_BY` the study is closed and only the pitch is available. From the deletion date on it collects nothing.

## Analysis

Plausible range: two-sided 95% Wilson interval. For a network sample it only illustrates precision. Main figures use everyone who answered the item; subgroups are described next to them, never used to drop anyone.

| Subgroup                 | From                                                       | Used for                                    |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------- |
| Tried before             | `last-role` is not `none`                                  | RQ1 denominator                             |
| Side of the last attempt | `last-role`: buying, getting-free vs selling, giving-away  | RQ1 and `seller-fee` (RQ5), described per side |
| Moving by June           | `move` in `move-feb`, `move-jun`                           | RQ2: "wider than moving out"                |
| Housing                  | `housing` = `fmel`                                         | RQ3, sample description                     |
| Student status           | `who`                                                      | Whether figures depend on non-students      |
| Background               | `age`, `gender`                                            | Sample description for the course           |
| Channel, language        | session                                                    | Sample description                          |

Coordination obstacles (RQ1): `replies`, `messages`, `timing`, `cancelled` and `deadline-pickup`. Finding: `finding` and `finding-taker`. Listing: `listing`. The rule compares coordination with finding + listing.

Delegation (RQ4) is counted over completed decisions (`sent-unchanged`, `sent-changed`, `sent-own`, `not-sent`) per variant; unfinished drafts are reported over everyone shown the task. `delegate` is counted per task over the participants who answered, separately per draft variant, since seeing the wrong draft may lower trust in Pako. `pay-model` is also reported per side of the last attempt, since only sellers would pay `seller-fee`.

Count cutoffs (unrounded Wilson bounds):

| Measure                                                   | RQ  | Denominator                          | n = 40  | 53      | 60      | 80      |
| --------------------------------------------------------- | --- | ------------------------------------ | ------- | ------- | ------- | ------- |
| coordination share ≥ 40% / ≤ 20%                          | RQ1 | tried, answered `last-trouble`       | 16 / 8  | 22 / 10 | 24 / 12 | 32 / 16 |
| ≥ 1 unused item ≥ 50% / ≤ 30%                             | RQ2 | answered `idle-items`                | 20 / 12 | 27 / 15 | 30 / 18 | 40 / 24 |
| `offer-now`, lower bound ≥ 25% / upper bound < 15%        | RQ3 | answered                             | 16 / 1  | 20 / 2  | 22 / 3  | 28 / 5  |
| `sent-unchanged`, lower bound ≥ 15% / upper bound < 15%   | RQ4 | completed decisions in `wrong-price` | 11 / 1  | 14 / 2  | 15 / 3  | 19 / 5  |

With 80 completes and the 2:1 allocation, about 53 participants see the wrong price.

The `sent-changed` and `sent-own` texts in `wrong-price` are coded by two team members for whether the price was corrected; `draft-price` gives a first automatic reading. Agreement (% and Cohen's κ) is reported before disagreements are settled. The `seeking` texts are listed as seeds for the pilot.

## Pre-registration

Frozen with a date before the first invitation, together with the script and the codebook; later changes are listed as deviations. The rules are decisions for the next build, not confirmed findings. Rate rules apply only with at least 40 answers to the item; below that, counts only. Each rule has three outcomes: success, fail, inconclusive (neither threshold met, or fewer than 40 answers).

| RQ  | Rule                                                                                                                                                                                                                                                                                                 | Success →                                         | Fail →                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| RQ1 | Coordination share of `last-trouble` among those who tried: `replies`, `messages`, `timing`, `cancelled`, `deadline-pickup`. Success if it is ≥ 40% **and** larger than the share of finding (`finding`, `finding-taker`) + `listing` combined. Fail if it is ≤ 20%.                                                                                                                             | Pilot and onboarding lead with coordination       | Lead with finding or listing                 |
| RQ2 | Success if ≥ 50% of those who answered `idle-items` report at least one usable thing they don't currently use **and**, among those who answered `idle-why`, more name at least one of `listing-hassle`, `messages-hassle`, `transport` than name `might-need`. Fail if ≤ 30% report an item, or `might-need` is named by more. Crossed with `move` to check whether supply goes beyond moving out. | "Pass on what's lying around" as the core message | Message around moving out only               |
| RQ3 | `wanted-react` `offer-now` among those who answered; `offer-later` does not count. Success if its lower bound is ≥ 25%. Fail if its upper bound is below 15%. The share `seeking` = `yes` and the typed requests are reported with it.                                                                                                     | Build a first version of requests                 | Drop requests for now                        |
| RQ4 | `sent-unchanged` among completed decisions in `wrong-price`. Success if its lower bound is ≥ 15%. Fail if its upper bound is below 15%. `delegate` is reported per task and per draft variant.                                                                                                                           | Add a check step before Pako's drafts are sent    | No check step; review again after launch     |
| RQ5 | `pay-model`: descriptive only, counts with ranges, paid options also among those who chose a paid one; `seller-fee` also per side of the last attempt.                                                                                                                                                                                               |                                                   |                                              |

Behavioural value metric: submitted forms with `try_early` divided by sessions that reached the end, with its range. It has no threshold; it is compared with the next cycle.

The RQ2 fail threshold and the RQ3 and RQ4 fail thresholds are set in this protocol; the spec gave the success sides.

## Threats to validity

| Threat                                | Where                                     | Mitigation                                                                                                                         |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pako asks the product questions       | `wanted-react`, `seeking`, `delegate`, `pay-model`, `draft` | Neutral wording, outside options, no reaction to product answers                                              |
| The draft task frames `delegate`      | `delegate`                                | The card says the setting is different; `delegate` is read per draft variant; the debrief comes only at the end                     |
| Self-selection, course peers          | Everything                                | Neutral invitation, channel tags, subgroups described                                                                              |
| Recall of the last attempt            | Part 1                                    | No time window; `last-outcome` and `last-occasion` describe the episode; "Can't remember" offered                                 |
| One answer for the most annoying part | `last-trouble`                            | Single choice forces a ranking; several pains per episode are lost. `last-messages` and `last-transport` describe the episode      |
| Option lists per side                 | `last-trouble`                            | Buyers and sellers see different lists (11 to 13 options), so a share depends on the mix of sides; reported per side next to the pooled share. Shared obstacles keep one id; finding and coordination each have one id per side |
| Imagined vs real behaviour            | `draft`, `wanted-react`, `delegate`       | Practice chat, not real money; every "go" is checked against real use                                                              |
| One planted error, uneven allocation  | `draft`                                   | Variant drawn at random and stored; 2:1 towards `wrong-price` for precision there; the two variants are read apart, never pooled    |
| Hypothetical prices                   | `pay-model`                               | "Example prices, not available yet"; "one help" defined on the card; same two facts on every card; descriptive only                |
| Short scenes as context               | Part 3                                    | Pako's line says what each scene shows; the scenes are in English and captioned so; Replay; skipped scenes logged; no question about the scenes themselves |
| Fixed section order                   | All                                       | Shuffled options with stored order where order would bias; `delegate` after the draft so it does not frame the task               |
| Three languages                       | All                                       | One dictionary per language with equivalent meaning; language stored per session                                                  |
| Two versions running                  | v1 and v4                                 | Each session stores questionnaire and wording version; analysed separately                                                         |
| Repeat answers                        | Counts                                    | Browser marker                                                                                                                     |

## Reporting template

One block per research question, same order and colours every time. Symbol and word always shown with the colour; bars in a neutral colour, outcome colour only on the badge.

| Outcome      | Meaning                                      | Colour          | Symbol |
| ------------ | -------------------------------------------- | --------------- | ------ |
| Success      | Threshold for the planned change met         | green `#1E7B3A` | ✓      |
| Inconclusive | Between thresholds, or fewer than 40 answers | grey `#7A7F87`  | –      |
| Fail         | Opposite threshold met                       | red `#B3261E`   | ✗      |

```
RQ1 What makes passing on used things hard?          [✓ Success]
Question   What was the most annoying part? (those who tried)
Result     27 of 60 named a coordination obstacle: 45% (plausible range 33–58%)
           finding + listing 12 · transport 8 · nothing 6
Rule       Success if ≥ 40% and above finding + listing  →  met
Action     Lead the pilot and onboarding with Pako handling replies and pickups
Sides      buying 13/30 · passing on 14/30     descriptive
Limit      One answer per person, recall, self-selected sample
```

Every block: k of n with the denominator named, the range, the rule and its outcome, one line of limitation. The numbers above are placeholders.

### Build-to-Learn card

| Cycle       | Build                                                                     | Measure                                                                 | Learn                                                                                                   | Next                                                    |
| ----------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| v1          | Tour page with a short survey and two tasks ([STUDY-v1.md](STUDY-v1.md))  | Answers and task results of the first participants                      | Questions about features drew polite yeses; the tasks were more telling                                 | A longer protocol around decisions                      |
| v3          | Five parts, scenes with "would it have helped", desk and draft tasks, price ladder, slogans | Pretest runs and decision rules D1–D11                     | Too long for a phone, many items without a decision behind them                                         | User test with someone new to the app                   |
| User test 1 | `v3-8` in German, observed                                                | Where the participant hesitated or was confused                         | Progress felt slow; price cards cut off and not comparable; unclear German; unexplained product terms   | Fewer items, one rule per research question             |
| v4          | Four parts, 20 items, role-specific obstacles, wrong-price draft at 2:1, four-tick form; revised after a screenshot review (round 1) | RQ1–RQ5 rules, try-early sign-up rate, about 80 completes   | To be filled in after the run                                                                           | To be filled in after the run                           |

## Before launch

1. Pretest done; wording and `{measured}` fixed; wording version raised for the run if the wording changed.
2. This protocol frozen with a date.
3. Pretest sessions deleted.
4. `STUDY_CONTACT` and `STUDY_DELETE_BY` set on the deployment.
5. Migration `202611220002_study_v4.sql` reviewed and applied, and the server deployed right after it: the migration replaces `study_save_pilot`, the column `role` and `study_results`, which the previous server still uses.
6. Server logs checked for request addresses.
7. QR codes generated per channel and tested at poster distance.

## Results page

Admins see the counts in the app under Admin → Study, read through `GET /api/study/report`. In account mode the server passes the signed-in user to `study_report_rows`, which refuses anyone not in `public.admins`; the server calls it with its service key. In the local demo the admin area opens in developer mode, as the rest of it does.

The page shows one wording version at a time, the newest first: sessions per UTC day and channel, how many sessions reached each screen of the survey (the part screens included), the last screen of those who left before the end, counts per option over the participants who answered (skips excluded), typed answers sorted alphabetically without session ids (replies sent as Pako drafted them are left out), and the forms at the end: each of the four ticks, and those who want to try takeover early per place, as sellers (sell or give away), buyers (buy or get for free) and undecided (not sure yet); one form may count on both sides. Any breakdown count from 1 to 4 shows as "<5". Older wording versions keep their pack ladder panel. Rule outcomes come from the queries below.

## Results queries

Run these in the Supabase SQL editor, which connects with the owner role and can read the study tables. Each query reads the v3-questionnaire sessions of one wording version: replace `v4-1` with the version of the real run. Intervals and rule outcomes are computed from the counts (`k` = `chosen`, `n` = `answered`); where a rule uses a bound, the query gives the Wilson lower bound (`z` = 1.96).

Tables in `takeover_admin`: `study_sessions`, `study_answers`, `study_events`, `study_pilot` (the form at the end), and `study_contacts` (v1 only).

### R0 Completion funnel by channel and device

`core_complete` and `end_reached` are both recorded on reaching the end screen.

```sql
-- funnel
with run as (
  select id, source, device from takeover_admin.study_sessions
  where survey = 'v3' and version = 'v4-1'
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
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
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

For the descriptive steps (`who`, `housing`, `last-item`, `last-occasion`, `move`, `age`, `gender`). Change the step id. Skips are not counted. For a multiple choice, `answered` counts choices, not people; use the step's own query.

```sql
-- split
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select option, count(*) as chosen, sum(count(*)) over () as answered
from takeover_admin.study_answers a
join run on run.id = a.session
cross join unnest(a.chosen) as option
where a.step = 'who'
group by option
order by chosen desc, option;
```

### RQ1 Coordination among those who tried

Per side and pooled (`all`, the row the rule reads). Coordination: `replies`, `messages`, `timing`, `cancelled`, `deadline-pickup`; finding: `finding`, `finding-taker`. `coordination_low` is the Wilson lower bound of the coordination share.

```sql
-- rq1-coordination
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), trouble as (
  select case when r.chosen[1] in ('buying', 'getting-free') then 'buying' else 'passing-on' end as side,
    a.chosen[1] as obstacle
  from takeover_admin.study_answers a join run on run.id = a.session
  join takeover_admin.study_answers r on r.session = a.session and r.step = 'last-role'
  where a.step = 'last-trouble' and cardinality(a.chosen) > 0
), counts as (
  select coalesce(side, 'all') as side, count(*) as answered,
    count(*) filter (where obstacle in ('replies', 'messages', 'timing', 'cancelled', 'deadline-pickup')) as coordination,
    count(*) filter (where obstacle in ('finding', 'finding-taker', 'listing')) as finding_listing
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

### RQ1 The last attempt in context

```sql
-- rq1-context
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select a.step, a.chosen[1] as answer, count(*) as chosen,
  sum(count(*)) over (partition by a.step) as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step in ('last-how', 'last-outcome', 'last-transport', 'last-messages')
  and cardinality(a.chosen) > 0
group by a.step, answer
order by a.step, chosen desc, answer;
```

### RQ2 Things at home, by move plans

`with_idle`: answered `1-3`, `4-10` or `over-10`. `moving-by-june`: `move` in `move-feb`, `move-jun`.

```sql
-- rq2-idle
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), idle as (
  select a.chosen[1] as count_band,
    case when m.chosen && array['move-feb', 'move-jun'] then 'moving-by-june' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers m on m.session = a.session and m.step = 'move'
  where a.step = 'idle-items' and cardinality(a.chosen) > 0
)
select coalesce(part, 'all') as subgroup, count(*) as answered,
  count(*) filter (where count_band <> 'none') as with_idle
from idle
group by grouping sets ((), (part))
order by subgroup;
```

### RQ2 Why things stay at home

Multiple choice: `participants` is the number who answered `idle-why`. `effort_or_transport` counts participants naming at least one of `listing-hassle`, `messages-hassle`, `transport`; the rule compares it with `might-need`.

```sql
-- rq2-reasons
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), why as (
  select a.session, a.chosen from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'idle-why' and cardinality(a.chosen) > 0
)
select option, count(*) as chosen,
  (select count(*) from why) as participants,
  (select count(*) from why where chosen && array['listing-hassle', 'messages-hassle', 'transport']) as effort_or_transport
from why cross join unnest(why.chosen) as option
group by option
order by chosen desc, option;
```

### RQ3 Requests nearby

The rule reads `offer-now` in `wanted-react`.

```sql
-- rq3-wanted
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select a.step, a.chosen[1] as answer, count(*) as chosen,
  sum(count(*)) over (partition by a.step) as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step in ('wanted-react', 'seeking') and cardinality(a.chosen) > 0
group by a.step, answer
order by a.step, chosen desc, answer;
```

### RQ3 What participants are looking for

```sql
-- rq3-seeking-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select a.text
from takeover_admin.study_answers a join run on run.id = a.session
where a.step = 'seeking' and a.chosen && array['yes'] and a.text <> ''
order by a.text;
```

### RQ4 The draft by variant

```sql
-- rq4-draft
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), draft as (
  select v.chosen[1] as variant, a.chosen[1] as final, a.first_chosen[1] as first
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers v on v.session = a.session and v.step = 'draft-variant'
  where a.step = 'draft'
)
select variant, final, first, count(*) as participants,
  (select count(*) from draft d where d.variant is not distinct from draft.variant
    and d.final in ('sent-unchanged', 'sent-changed', 'sent-own', 'not-sent')) as completed_decisions,
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'draft') as shown_task
from draft
group by variant, final, first
order by variant, final, first;
```

### RQ4 Unchanged sends per variant

The rule reads the `wrong-price` row: `unchanged_low` is the Wilson lower bound of `sent_unchanged` over `completed`.

```sql
-- rq4-unchanged
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), counts as (
  select v.chosen[1] as variant, count(*) as completed,
    count(*) filter (where a.chosen[1] = 'sent-unchanged') as sent_unchanged
  from takeover_admin.study_answers a join run on run.id = a.session
  join takeover_admin.study_answers v on v.session = a.session and v.step = 'draft-variant'
  where a.step = 'draft' and a.chosen[1] in ('sent-unchanged', 'sent-changed', 'sent-own', 'not-sent')
  group by variant
)
select variant, completed, sent_unchanged,
  round(((sent_unchanged + 1.9208) / (completed + 3.8416)
    - 1.96 * sqrt(sent_unchanged::numeric * (completed - sent_unchanged) / completed + 0.9604)
      / (completed + 3.8416))::numeric, 3) as unchanged_low
from counts
order by variant;
```

### RQ4 Price named in the sent message

```sql
-- rq4-price
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select v.chosen[1] as variant, p.chosen[1] as price, count(*) as participants
from takeover_admin.study_answers p join run on run.id = p.session
left join takeover_admin.study_answers v on v.session = p.session and v.step = 'draft-variant'
where p.step = 'draft-price' and cardinality(p.chosen) > 0
group by variant, price
order by variant, price;
```

### RQ4 Changed and own replies to code

```sql
-- rq4-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select a.session, v.chosen[1] as variant, a.chosen[1] as final, p.chosen[1] as price, a.text
from takeover_admin.study_answers a
join run on run.id = a.session
left join takeover_admin.study_answers v on v.session = a.session and v.step = 'draft-variant'
left join takeover_admin.study_answers p on p.session = a.session and p.step = 'draft-price'
where a.step = 'draft' and a.chosen[1] in ('sent-changed', 'sent-own')
order by a.saved_at;
```

### RQ4 What Pako may do alone, by draft variant

Multiple choice: `participants` is the number in the variant who answered `delegate`; `all` pools both variants.

```sql
-- rq4-delegate
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), answers as (
  select coalesce(v.chosen[1], 'none-drawn') as variant, a.chosen
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers v on v.session = a.session and v.step = 'draft-variant'
  where a.step = 'delegate' and cardinality(a.chosen) > 0
), tasks as (
  select variant, task from answers cross join unnest(answers.chosen) as task
)
select coalesce(variant, 'all') as variant, task, count(*) as chosen,
  (select count(*) from answers a where tasks.variant is null or a.variant = tasks.variant) as participants
from tasks
group by grouping sets ((task), (variant, task))
order by variant, chosen desc, task;
```

### RQ5 Pay model, by side of the last attempt

`side`: `buying` (buying, getting-free), `passing-on` (selling, giving-away), `none` (never tried or not answered); `all` pools them. `paid_answered`: participants in the row's group who chose one of the three paid options.

```sql
-- rq5-pay-model
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
), models as (
  select a.chosen[1] as model,
    case when r.chosen[1] in ('buying', 'getting-free') then 'buying'
      when r.chosen[1] in ('selling', 'giving-away') then 'passing-on' else 'none' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  left join takeover_admin.study_answers r on r.session = a.session and r.step = 'last-role'
  where a.step = 'pay-model' and cardinality(a.chosen) > 0
), counts as (
  select coalesce(part, 'all') as side, model, count(*) as chosen
  from models
  group by grouping sets ((model), (part, model))
)
select side, model, model in ('seller-fee', 'pay-once', 'monthly') as paid, chosen,
  sum(chosen) over (partition by side) as answered,
  sum(chosen) filter (where model in ('seller-fee', 'pay-once', 'monthly')) over (partition by side) as paid_answered
from counts
order by side, chosen desc, model;
```

### Forms at the end and the try-early rate

The forms carry no session, so they count over the whole table; the behavioural value metric is `try_early` / `end_reached` for the named version.

```sql
-- forms
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v4-1'
)
select
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'end') as end_reached,
  count(*) as forms,
  count(*) filter (where launch_news) as launch_news,
  count(*) filter (where try_early) as try_early,
  count(*) filter (where interview) as interview,
  count(*) filter (where future_surveys) as future_surveys
from takeover_admin.study_pilot;
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
where try_early
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
