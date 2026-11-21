# User study on the tour page

The tour page (`/tour`) has two uses. Without a tag it is the pitch: a hero and a short tour of takeover, and nothing is recorded. With a tag (`/tour?s=<channel>`) it is the study in version 3, described here. `/tour?s=<channel>&v=1` runs version 1 ([STUDY-v1.md](STUDY-v1.md)) unchanged, so both versions can be compared. Every session stores its version (`survey`), its wording version and its language.

This file is the protocol. The v3 script in `src/tour/` follows it, in English, French and German with equivalent meaning; the English wording below is the reference. The app screens inside the phone stay in English. The decision rules are frozen before launch (see [Pre-registration](#pre-registration)).

Setting: a course project. Dates, prices and the pilot are hypothetical; nothing is launched, sold or booked.

## Decisions the study informs

| # | Decision | Survey measure | Real observation that would change it |
| --- | --- | --- | --- |
| D1 | Launch place and timing: which FMEL house, February or June | Pilot volunteers per house, role and week | Confirmed matches and attendance in the first pilot week |
| D1b | Sorting: distance first or price first | `desk` | Which sort pilot users pick |
| D2 | Problem to test first in the pilot | `last-trouble` | What breaks down in real pilot exchanges |
| D3 | Transport help | `move-it`, helper option | Real bookings at a quoted price |
| D4 | Paid pack in the spring pilot | `pack` | Share of real movers who reach the free limit, and how many buy |
| D5a | Pako's draft as the default way to write an offer (delegation) | `draft`: sent as it is, changed, own message, not sent | Share of pilot offers sent from Pako's draft |
| D5b | Opt-in for short updates | `sending`: `short-updates` or `replies-too` | Opt-in uptake in the pilot |
| D6 | Poster lines | `headline` | Scans per line in the poster test |
| D7 | Which features the pilot and the onboarding lead with | `helped-find`, `helped-sell`, `helped-deal`, `try-first` | Which features pilot users open and finish |
| D8 | Barriers the pilot plan must answer | `stop` | Reasons pilot volunteers give for dropping out |

What the results cannot claim: shares for all EPFL/UNIL students; adoption or future use; real willingness to pay, a price or revenue; anything about the word "AI"; how carefully people read drafts in real use; differences between small subgroups; that the tour works.

## Participants and recruitment

- Everyone who agrees takes part. Nobody is filtered by student status, answers, move plans, time windows or response speed.
- Analysis exclusions, and only these: no consent (no session exists), duplicates (the browser marks a finished survey), sessions without any answer (counted as break-offs).
- No incentive.
- Pilot: 3–5 phone runs (iOS and Android) from Mon 23 to Fri 27 Nov 2026 with their own version label. Launch Mon 30 Nov 2026. Close Sun 13 Dec 2026, 23:59.

| Channel | Tag |
| --- | --- |
| FMEL Vortex, Atrium, Triaudes group chats | `fmel-vortex`, `fmel-atrium`, `fmel-triaudes` |
| Other FMEL houses | `fmel-other` |
| EPFL and UNIL programme groups | `epfl-programme`, `unil-programme` |
| Moodle Peer Support forum (with the demo link) | `moodle-peer` |
| Friends | `friends` |
| Posters with QR code: Rolex Learning Center, Unithèque | `poster-rlc`, `poster-unitheque` |
| Link shared from the end of the survey | `friend` |

Each QR code encodes the full `/tour?s=<tag>` link of the deployment.

Invitation (chat): "Hi all, we're EPFL students building takeover, an app for passing on used stuff around campus. Could you do our {measured}-minute phone survey? No sign-in, everyone welcome, also if you've never bought or sold anything used. {link}". For `moodle-peer`: "The app demo is at the end, or directly via 'Just show me the app'."

`{measured}` is 5 until the pilot measures the median time from start to the saved core; it is then rounded up.

## Script

Pako asks every question. Wording is neutral; on product questions (`headline` to `draft`) Pako keeps a neutral face and does not react to answers. All questions are single choice except `stop`. Shuffled options appear in random order, which is stored; options marked *last* stay at the bottom. A single-choice tap moves on after about 300 ms; Back is always visible. A section strip shows `You · Last time · The app · Situations`.

### Start

| Id | Text | Options |
| --- | --- | --- |
| `start` | "Hi, I'm Pako! We're EPFL students building takeover, an app for passing on used stuff around campus. Got {measured} minutes? No sign-in. Everyone's welcome, also if you've never bought or sold anything used." | `go` Let's go · `demo` Just show me the app |

Folded toggle "What we save" below the invitation: "Your answers, which screens you see, skip or go back to, the time per screen, the link you came from, your language and whether you use a phone or a computer. Your progress stays in this tab until you close it, and this browser remembers that you finished. An email at the end is optional and kept apart from your answers. Everything is deleted by {date}. Questions: {contact}."

`demo` opens the tour without a session; nothing is stored. `{date}` and `{contact}` come from `STUDY_DELETE_BY` and `STUDY_CONTACT`. A participant who wants their answers deleted writes to the contact.

Then one screen, `what-is`, before the first question. It says what the app does and names no problem, so the questions about the last attempt stay unprimed.

| Part | Text |
| --- | --- |
| Pako | "Here's what takeover does." |
| Title | "What is takeover?" |
| Three lines, with the intro's find, sell and handshake pictures | **Find** Describe what you need, and I look through listings from students nearby. · **Sell** Take a photo, and I write the listing with a suggested price. · **Agree** Settle the price and a pickup time in the chat, then meet on campus. |
| Card "What happens next" | 1. Your last experience with second-hand · 2. A quick look at the app · 3. A few short situations · "About {measured} minutes" |

Button Continue. Nothing is stored on this screen apart from its events.

### 1. You

| Id | Question | Options |
| --- | --- | --- |
| `who` | "First things first: are you a student?" | `epfl` Yes, at EPFL · `unil` Yes, at UNIL · `other-school` Yes, somewhere else · `no` No |

### 2. Last time

| Id | Question | Options | Shown to |
| --- | --- | --- | --- |
| `last-role` | "Think of the last time you tried to buy, get, sell or give away something used, even if it didn't work out. What were you trying to do?" | `buying` Buy something · `getting-free` Get something for free · `selling` Sell something · `giving-away` Give something away · `none` I can't think of a time | all |
| `last-item` | "What was it?" | `furniture` Furniture (desk, chair, shelf, bed) · `household` Small household things · `electronics` Electronics · `bike` Bike or scooter · `books` Books or course material · `clothes` Clothes or shoes · `other` Something else | tried |
| `last-occasion` | "Was it because of a move?" | `moving-in` Yes, moving in · `moving-out` Yes, moving out · `no-move` No · `cant-recall` Can't recall | tried |
| `last-story` | "In a sentence: how did it go?" (placeholder "Optional, a few words are enough") | Text up to 200 characters · Skip | tried |
| `last-trouble` | "Looking back, which part caused you the most trouble, if any?" | Shuffled: `finding` Finding the right item (buyers) / Finding someone who wanted it (sellers) · `listing` Writing the listing or taking photos · `price` Knowing or agreeing on a price · `replies` Slow or no replies · `timing` Agreeing on a time, or a pickup falling through · `transport` Getting it from A to B · `trust` Not sure I could trust the other person · *last:* `nothing` Nothing was difficult · `other` Something else · `cant-recall` Can't recall | tried |
| `why-not` | "What's the main reason?" | Shuffled: `no-need` Never needed to · `prefer-new` I prefer new things · `hassle` Seemed like too much hassle · `dont-know-where` Didn't know where to look · *last:* `other` Something else | `none` |
| `move` | "Two quick ones about now. Are you planning to move?" | In order: `move-feb` Yes, by end of February 2027 · `move-jun` Yes, March–June 2027 · `move-later` Yes, later · `no-plan` No plans · `not-sure` Not sure | all |
| `housing` | "Where do you live now?" | `fmel` FMEL residence · `other-res` Another student residence · `flat` A flat or studio · `family` With family · `elsewhere` Somewhere else | all |

"Tried" means `last-role` is not `none`. Obstacle to problem, fixed before launch: `finding` search (buyers) or reaching nearby buyers (sellers) · `listing` photo listing · `price` cited price · `replies` reply handling · `timing` pickup card and confirmations · `transport` D3 · `trust` university-only accounts.

### 3. The app

Pako: "Now a first look at takeover." The poster lines come before any app screen, so the scenes do not shape the first impression.

| Id | Question | Options |
| --- | --- | --- |
| `headline` | "Which of these, if any, would make you most likely to open the app?" | Shuffled: `h-move` "Sell your things before you move out." · `h-photo` "Snap a photo, get a ready listing with a fair price." · `h-ai` "An AI assistant writes your listing from a photo." · `h-nearby` "Find used things from people nearby, pickup on campus." · *last:* `none` None of these |

Then three features, in the same order for everyone: each a short scene in the phone, then one question. A short scene is the tour's scene at 0.35 of its pace, with every tap made by the scene itself; it reaches its last key moment after about 12 s. Next works from the start; Replay plays it again. Pako's line beside the phone says what the scene shows.

| Id | Content | Options |
| --- | --- | --- |
| `app-find` | Scene "Just say what you need": "Someone near Vortex needs a desk. I check student listings and draft the offer. Nothing is sent without their tap." | |
| `helped-find` | Title "Just say what you need". "Would this have helped you last time?" To those who never tried (`last-role` = `none`): "Would this help you?" | In this order: `yes` Yes · `partly` Partly · `no` No · `na` Doesn't apply to me |
| `app-sell` | Scene "Start with a photo": "Léa takes a photo of her desk. I write the listing and suggest a price. She picks her own and saves it." | |
| `helped-sell` | As `helped-find`, titled "Start with a photo" | As `helped-find` |
| `app-deal` | Scene "Agree and pick up": "Noah offers CHF 35 and Léa confirms, so the pickup is booked. At pickup time both of them confirm the handover." | |
| `helped-deal` | As `helped-find`, titled "Agree and pick up" | As `helped-find` |
| `stop` | "What would stop you from using takeover? Pick any." Multiple choice; Continue moves on. | Shuffled: `ai-mistakes` The AI could get things wrong · `nobody-nearby` Not enough people nearby use it · `prefer-groups` I prefer my WhatsApp or Telegram groups · `privacy` Worries about privacy · `too-long` It takes too long · *last:* `nothing` Nothing would stop me (clears the others) · `other` Something else (short text) |
| `try-first` | "For the next thing you buy or sell, which would you try first, if any?" | Shuffled: `describe-search` Searching by describing what I need · `photo-listing` A listing drafted from my photos, with a price and its sources · `offer-drafts` Offer drafts I can edit and send · `pickup-card` The pickup card with confirmations and reminders · *last:* `none` None of these · `need-more` I'd need to know more |
| `sending` | Card "How the app works": "Pako drafts your messages. Nothing is sent until you tap Send." Then: "Would you let Pako send some messages for you, without asking you first?" | In this order, from nothing to more: `myself` No, I'd send every message myself · `short-updates` Only short updates like "On my way" · `replies-too` Short updates and simple replies · `not-sure` Not sure |

Changed in `v3-2`: the scenes, the `helped-*` questions and `stop` are new; `try-first` moved here from the optional tour; `autonomy` and `who-sends` of `v3-1` became the single item `sending`, so the survey stays near five minutes.

### 4. Situations

Pako: "Four quick situations." Each situation opens with a context card: "Situation {n} of 4", one sentence on the scenario, and what to do ("Pick one."). Pako then asks the question.

| Id | Card | Question | Options | After the tap |
| --- | --- | --- | --- | --- |
| `move-it` | "Situation 1 of 4. You've found a desk you like, 4 km from where you live. Pick one." | "Before you agree to buy it: how would you most likely get it home?" | Shuffled: `carry-bike` Carry it or take it by bike · `public-transport` Public transport · `friend-car` Borrow a car, or ask a friend with one · `helper` A helper with a cargo bike, booked in the app: CHF 15 for the whole trip up to 4 km, carried to your door (ground floor or lift; stairs may cost extra) · *last:* `skip-desk` I'd look for one closer instead · `not-sure` Not sure | "The helper option doesn't exist yet." |
| `desk` | "Situation 2 of 4. You need a desk, and two in the app fit. Pick one." | "Which one would you go for?" Two cards in the phone, order shuffled, same desk and condition, pickup this week. | `nearer` CHF 45 · 200 m from where you live · `cheaper` CHF 30 · 4 km from where you live · *last:* `neither` Neither | |
| `pack` | "Situation 3 of 4. You're moving out in two weeks and still have three things to sell, a desk among them. You've used today's 3 free photo drafts in takeover. Pick one." | "What would you do?" | Shuffled: `manual` List them myself now, for free · `wait` Wait until tomorrow for new free drafts · `pack` Buy the move-out pack: CHF 5 once, five more photo drafts with price checks, valid 30 days · *last:* `other-way` Something else (another app, a group chat, give them away) · `not-sure` Not sure | "This pack doesn't exist yet." |

`draft`, the last core task, in a chat inside the phone. It measures delegation: whether people send Pako's draft as it is, change it, write their own or send nothing. The draft matches the participant's own choices; nothing in it is wrong on purpose.

1. Card: "Situation 4 of 4. You're buying a desk from Mia. The price and the place suit you. Answer Mia, then pick what to do with Pako's draft."
2. Pako: "Pick the day that suits you in the chat with Mia."
3. Listing card: "White desk · 120 × 60 cm · CHF 40 · Pickup: EPFL, Rolex Learning Center · Mia".
4. Mia: "Hi! The desk is still available. Which day could you pick it up? I'm free from 17:00."
5. `draft-day`, chips in shuffled order: `sat` Saturday · `sun` Sunday. The participant's bubble: "{Day} works for me, 17:30?"
6. Mia: "17:30 is fine. Send me an offer and I'll confirm."
7. Pako, after about 1 s of typing: "Here's your offer."
8. Draft: "Hi Mia! I'd like your white desk for CHF 40. I can pick it up on {Day} at 17:30 at the Rolex Learning Center."
9. "What would you do with this draft?" Four equal buttons: `send` Send as it is · `change` Change something first (the draft becomes editable, then Send) · `own` Write my own (an empty message, then Send) · `dont-send` Not send it. While writing, "Not send it" stays available.

Then Pako: "Done! Your answers are saved." (event `core-complete`).

Changed in `v3-3`: the `what-is` screen and the context cards are new; the draft no longer plants a wrong day, so the reveal screen and its "Remove my answers" link are gone.

### 5. About you (optional)

Pako: "Last bit, all optional: it helps us understand who answered." Two rows per screen, each with Skip.

| Id | Question | Options | Shown to |
| --- | --- | --- | --- |
| `age` | "Your age" | `18-20` · `21-23` · `24-26` · `27-30` · `31-plus` 31 or older · `na` Prefer not to say | all |
| `gender` | "Your gender" | `woman` Woman · `man` Man · `non-binary` Non-binary · `self-describe` Prefer to self-describe (short text) · `na` Prefer not to say | all |
| `level` | "What are you studying?" | `bachelor` Bachelor · `master` Master · `phd` PhD · `other` Other studies · `not-student` Not a student | students (`who` is not `no`) |
| `exchange` | "Are you an exchange student?" | `yes` Yes · `no` No · `na` Prefer not to say | students |

Then two equal buttons, saved as the answer to step `peek`: `finish` Finish · `tour` See the full scenes (optional).

### 6. Optional tour

| Id | Content |
| --- | --- |
| `scene-pick` | "What would you like to see first?" Shuffled: `sell` Sell from a photo · `deal` Agree on a pickup · `find` Find something. |
| `tour-sell`, `tour-deal`, `tour-find` | The full app scenes in the phone, with key moments the participant can tap. Next is available from the start; Replay; "Skip the rest". |

### 7. Pilot form (EPFL/UNIL students only)

Shown after Finish or after the tour to participants who answered `epfl` or `unil`. Stored in its own table without a session, so it cannot be linked to answers.

Pako: "We're testing takeover with real items in a few FMEL houses. Want a spot?"

| Field | Options |
| --- | --- |
| Email | required |
| "Would you sell, buy or both?" | `seller` Sell · `buyer` Buy · `both` Both |
| "What would you bring or look for?" | the `last-item` categories, any number |
| "Where do you live?" | `vortex` FMEL Vortex · `atrium` FMEL Atrium · `triaudes` FMEL Triaudes · `fmel-other` Another FMEL house · `not-fmel` Not in an FMEL house |
| "Which weeks would work?" | `2026-12-14` 14–18 Dec · `2026-12-21` 21–23 Dec · `2027-02-01` 1–5 Feb · `2027-02-08` 8–12 Feb, any number |
| Tick | "Sign me up for the pilot in these weeks" |
| Tick | "Email me about later tests or two or three follow-up questions" |

Send needs at least one tick. A sign-up counts only with the first tick, later-email permission only with the second. Strong interest: signed up, at least one week and one item. It sets the order of re-contact; everyone who signs up is contacted. Pilot capacity: up to 10 real exchanges of items a student can carry or move with a bike trailer.

One form per address: the first one stands, and a later form with the same address changes nothing. The page answers both the same way, so it does not show whether an address is already listed. Changes, such as other weeks or leaving the list, go through the contact address. Addresses are not verified: before the pilot, the team writes once to each address and contacts only the addresses that confirm.

### 8. End

Pako: "Thanks! That helps us decide what to build next."

"How others answered": the `desk` split and the `last-trouble` counts as bars with counts, over the sessions of the participant's own wording version, once 20 of them answered `desk`; before that "Results appear once 20 people have answered."

Share: "Every answer helps, also from people who never sell anything. Share it?" Share · Copy link · Show QR. Text: "I just did a {measured}-minute phone survey for an EPFL student project. No sign-in: {link}". The link carries the tag `friend`.

## What is stored

One session per participant, created on "Let's go": a random id, `survey = 'v3'`, the wording version (`v3-3` for the pilot, a raised label for the run), the language at the start (`en`, `fr`, `de`), the channel tag, phone or desktop. No name, no IP address, no browser details.

One answer per session and step, replaced when the participant goes back and answers again. When a change after Back takes a step off the participant's path, such as `last-role` changed to `none` after `last-trouble` was answered, that step's answer is saved again empty: `chosen` and `text` empty, `first_chosen` kept. An empty answer counts as not answered on the results page, in "How others answered" and in the queries below:

| Field | Content |
| --- | --- |
| `chosen` | The final answer; empty when skipped |
| `first_chosen` | The first answer; the server keeps the value it received first |
| `shown` | Option order on screen, for shuffled steps |
| `text` | `last-story`, the `gender` self-description, the `stop` "Something else" text, or the offer as sent |
| `elapsed_ms` | Time on screen |

`draft` is saved when a writing option is tapped, with `chosen` = that option, then again with the final code:

| `chosen` | Meaning |
| --- | --- |
| `sent-unchanged` | Sent as Pako drafted it, directly or after opening it for changes; `text` = the draft |
| `sent-changed` | Changed, then sent; `text` = the changed message |
| `sent-own` | Own message written and sent; `text` = the message |
| `not-sent` | Not sent, directly or after starting to write |
| `change`, `own` | Started writing, no decision yet (unfinished if it stays so) |

`first_chosen` holds the option picked first (`send`, `change`, `own` or `dont-send`); `draft-day` holds the chosen day.

Events, sent in batches and stored once per sequence number, at most 600 per session. A batch the server refuses for good is dropped, so events never hold back answers, the session or the pilot form:

| Kind | Step | Detail |
| --- | --- | --- |
| `shown`, `answered`, `skipped`, `changed` | question | |
| `back` | step left | step returned to |
| `scene-played`, `scene-skipped` | scene step (`app-*` in the core, `tour-*` in the tour) | scene |
| `moment-tapped`, `moment-auto` | tour step | key moment, tapped or advanced by itself (full scenes only, on their first play) |
| `core-complete`, `end` | | |
| `share` | | `native`, `copy` or `qr` |
| `language` | | language switched to |

Not recorded: touch paths, scroll depth, keystrokes, session replay.

In account mode the data is in Supabase, in tables that students cannot read; the server writes them through security-definer functions with its service key. In the local demo it is in the SQLite file. Without `STUDY_CONTACT` and `STUDY_DELETE_BY` the study is closed and only the pitch is available. From the deletion date on it collects nothing: the server still starts and logs one line that the study is closed, and the results page and `POST /api/study/withdrawals` keep working until the data is deleted. The owner deletes sessions, answers, events, pilot forms, contacts and exports by the deletion date.

## Analysis

Plausible range: two-sided 95% Wilson interval. For a network sample it only illustrates precision. Main figures use everyone who answered the item; subgroups are described next to them, never used to drop anyone.

| Subgroup | From | Used for |
| --- | --- | --- |
| Student status | `who` | Whether figures depend on non-users |
| Side of the last attempt | `last-role`: buying, getting-free vs selling, giving-away | D2 |
| Moving by June | `move` in `move-feb`, `move-jun` | D4, D1 |
| Housing | `housing` = `fmel` | D1b, D1 |
| Bulky item | `last-item` = `furniture` | D3 |
| Tried before | `last-role` is not `none` | D7: the `helped-*` wording differs, so the two groups are reported apart |
| Background | `age`, `gender`, `level`, `exchange` | Persona |
| Channel, language | session | Sample description |

Count cutoffs (unrounded Wilson bounds):

| Measure | D | Denominator | n = 40 | 60 | 100 | 200 |
| --- | --- | --- | --- | --- | --- | --- |
| `desk` nearer (or cheaper) > 50% | D1b | answered | 27 | 38 | 60 | 114 |
| `last-trouble` nothing ≥ 40% | D2 | tried | 16 | 24 | 40 | 80 |
| `last-trouble` top named ≥ 25% | D2 | tried | 10 | 15 | 25 | 50 |
| `move-it` helper: go ≥ / deprioritise ≤ | D3 | answered | 11 / 1 | 15 / 3 | 22 / 8 | 40 / 20 |
| `pack`: go ≥ / no payment ≤ | D4 | answered | 14 / 3 | 19 / 6 | 29 / 12 | 53 / 30 |
| `draft` sent as it is: keep ≥ / as it is + changed: optional ≤ | D5a | completed decisions | 27 / 13 | 38 / 22 | 60 / 40 | 114 / 86 |
| `sending` short-updates + replies-too: go ≥ / keep manual ≤ | D5b | answered | 27 / 13 | 38 / 22 | 60 / 40 | 114 / 86 |
| `helped-*` yes: keep ≥ / yes + partly: deprioritise ≤ | D7 | tried, answered | 23 / 6 | 32 / 11 | 50 / 21 | 94 / 47 |
| `try-first` top feature ≥ 25% | D7 | answered | 10 | 15 | 25 | 50 |
| `try-first` none + need-more ≥ 40% | D7 | answered | 16 | 24 | 40 | 80 |
| `stop` one barrier, lower bound ≥ 25% | D8 | answered | 16 | 22 | 34 | 63 |
| `stop` nothing ≥ 40% | D8 | answered | 16 | 24 | 40 | 80 |

Delegation, over completed decisions (`sent-unchanged`, `sent-changed`, `sent-own`, `not-sent`); unfinished drafts (`change` or `own` as final state) are reported over everyone shown the task.

Two team members code every `sent-changed` and `sent-own` text (what was changed or added) and `last-story` independently; agreement (% and Cohen's κ) is reported before disagreements are settled.

## Pre-registration

Frozen with a date before the first invitation, together with the script and the codebook; later changes are listed as deviations. The rules are pilot decisions, not confirmed findings. Rate rules apply only with at least 40 answers to the item (and in a subgroup, if shown with a range); below that, counts only.

| D | Success / inconclusive / fail | Also report |
| --- | --- | --- |
| D1 | A house with ≥ 3 distinct sellers and ≥ 3 distinct buyers (a "both" volunteer counted on one side), compatible items and one shared week → pilot there; a February week → February rehearsal. No house → pool nearby houses with one pickup point. Count rule, no floor. | Matches and attendance in the pilot |
| D1b | Nearer lower bound > 50% → test a second price–distance pair and nearby sorting. Cheaper lower bound > 50% → price sort first. Else open. "Neither" stays in the denominator. | FMEL, EPFL/UNIL |
| D2 | (1) Nothing ≥ 40% → problem weaker than believed, no nomination. (2) Else top named obstacle ≥ 25% and no tie → nominate it for the pilot. (3) Else open. | Buyers and sellers separately |
| D3 | Helper lower bound ≥ 15% → partner quote and a real booking offer in the pilot. Upper bound < 15% → deprioritise this offer. Else open. 15% is a team threshold. | Furniture subgroup |
| D4 | Pack lower bound > 20.6% (break-even: 33 packs from 160 movers) → offer a real paid pack in February. Upper bound < 20.6% → no student payment in the pilot. Else open. | Moving by June |
| D5a | `sent-unchanged` lower bound > 50% → keep Pako's draft as the default for offers and test one-tap sending in the pilot. `sent-unchanged` + `sent-changed` upper bound < 50% → make the draft optional; offers start from an empty message. Else open. | `sent-own` and `not-sent` separately; unfinished; first vs final choice |
| D5b | `short-updates` + `replies-too` lower bound > 50% → prototype the opt-in. Upper bound < 50% → keep "you tap every send". Else open. | Each option separately; by draft code |
| D5c | Dropped in `v3-2`: the comprehension item was merged into `sending`. The sentence stays as it is. | |
| D6 | The two most chosen lines go to the poster test; a tie for second sends all tied lines. `none` chosen most → no shortlist, rewrite the lines. | EPFL/UNIL counts |
| D7 | Per feature, over participants who tried (`na` stays in the denominator): `yes` lower bound ≥ 40% → keep the feature as shown in the pilot. `yes` + `partly` upper bound < 30% → deprioritise it in the pilot and the onboarding. Else open. `try-first`: the most chosen feature with ≥ 25% and no tie leads the onboarding; `none` + `need-more` ≥ 40% → rewrite how the features are introduced. 40% and 30% are team thresholds. | Never-tried answers ("Would this help you?") descriptively; scenes skipped vs played |
| D8 | Each barrier with a lower bound ≥ 25% gets a named counter-measure in the pilot plan (for example `nobody-nearby` → one house at a time, `ai-mistakes` → a check of the details before a draft is sent, `prefer-groups` → posting listings into existing groups). `nothing` ≥ 40% → no main barrier. Else open. Several barriers per participant; the denominator is participants who answered. | "Something else" texts, coded like `last-story` |

## Threats to validity

| Threat | Where | Mitigation | What remains |
| --- | --- | --- | --- |
| Pako asks the product questions | `headline`, `helped-*`, `stop`, `try-first`, `sending`, `move-it`, `pack` | Neutral wording, outside options, "the app" in questions, no reaction to product answers; real behaviour weighs more | Product answers likely lean positive; size unknown |
| Self-selection, course peers | Everything | Neutral invitation, channel tags, subgroups described | No campus-wide rates |
| No time window on the last attempt | `last-trouble`, `last-item` | `last-occasion` and side describe the episode | Older episodes recalled less precisely |
| Fixed section order | All | Shuffled options with stored order; headline before the scenes; helper before desk; `sending` before the draft | Same order for everyone; the features always run find, sell, deal |
| Short scenes as the stimulus | `helped-*`, `stop`, `try-first` | Pako's line says what each scene shows; Replay; skipped scenes are logged | A 12-second demo, not use: answers describe a first impression |
| Two wordings of one question | `helped-*` | Tried and never tried reported apart | The two groups' answers are not comparable |
| Imagined vs real behaviour | `draft`, `pack`, `move-it`, `desk` | Every "go" leads to a real test | Stated choices run high |
| Shown results | Later participants | Only after the core, two items, from 20 answers of the same wording version | |
| Three languages | All | One dictionary per language with equivalent meaning; language stored per session | Small wording differences between languages; report n per language |
| Two versions running | v1 and v3 | Each session stores its version; analysed separately | Channels may favour one link |
| Repeat answers | Counts | Browser marker | Private windows bypass it |

## Reporting template

One block per decision, same order and colours every time. Symbol and word always shown with the colour; bars in a neutral colour, outcome colour only on the badge.

| Outcome | Meaning | Colour | Symbol |
| --- | --- | --- | --- |
| Success | Threshold for the planned change met | green `#1E7B3A` | ✓ |
| Inconclusive | Between thresholds, or fewer than 40 answers | grey `#7A7F87` | – |
| Fail | Opposite threshold met | red `#B3261E` | ✗ |

```
D1b Sorting                                          [✓ Success]
Question   Nearer desk (CHF 45, 200 m), cheaper (CHF 30, 4 km), or neither?
Result     64 of 100 chose the nearer desk: 64% (plausible range 54–73%)
           cheaper 28 · neither 8
Rule       Success if the range starts above 50%  →  met
Action     Test a second price–distance pair and nearby sorting in the pilot
Subgroups  FMEL 30/42 · other 34/58 · EPFL/UNIL 51/80     descriptive
Limit      Imagined choice, one price/distance pair; self-selected sample
```

Every block: k of n with the denominator named, the range, the rule and its outcome, one line of limitation. The numbers above are placeholders.

## Before launch

1. Pilot done (it runs `v3-3`); wording and `{measured}` fixed; wording version raised for the run.
2. This protocol frozen with a date.
3. Pilot sessions deleted. "How others answered" counts one wording version, so pilot answers do not show there in any case.
4. `STUDY_CONTACT` and `STUDY_DELETE_BY` set on the deployment.
5. The migration reviewed and applied.
6. Server logs checked for request addresses.
7. QR codes generated per channel and tested at poster distance.

## Results page

Admins see the counts in the app under Admin → Study, read through `GET /api/study/report`. In account mode the server passes the signed-in user to `study_report_rows`, which refuses anyone not in `public.admins`; the server calls it with its service key. In the local demo the admin area opens in developer mode, as the rest of it does.

The page shows one wording version at a time, the newest first: sessions per UTC day and channel, how many sessions reached each core screen, the last screen of those who left before the core was saved, counts per option over the participants who answered (skips excluded), typed answers sorted alphabetically without session ids (offers sent as Pako drafted them are left out) and pilot sign-ups per house and week. Any breakdown count from 1 to 4 shows as "<5". Decision outcomes come from the queries below.

## Results queries

Run these in the Supabase SQL editor, which connects with the owner role and can read the study tables. Each query reads v3 sessions of one wording version: replace `v3-1` with the version of the real run. Intervals and rule outcomes are computed from the counts (`k` = `chosen`, `n` = `answered`).

Tables in `takeover_admin`: `study_sessions`, `study_answers`, `study_events`, `study_pilot`, and `study_contacts` (v1 only).

### R0 Completion funnel by channel and device

```sql
-- funnel
with run as (
  select id, source, device from takeover_admin.study_sessions
  where survey = 'v3' and version = 'v3-1'
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
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
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

For the descriptive steps (`who`, `last-occasion`, `why-not`, `move`, `housing`, `age`, `gender`, `level`, `exchange`, `scene-pick`). Change the step id. Skips are not counted.

```sql
-- split
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select option, count(*) as chosen, sum(count(*)) over () as answered
from takeover_admin.study_answers a
join run on run.id = a.session
cross join unnest(a.chosen) as option
where a.step = 'why-not'
group by option
order by chosen desc, option;
```

### D1 Pilot volunteers per house and week

A "both" volunteer counts once, on the side that needs them. Check that `offered` and `wanted` items overlap.

```sql
-- d1-houses
with volunteers as (
  select p.role, p.house, week, p.items
  from takeover_admin.study_pilot p cross join unnest(p.weeks) as week
  where p.join_pilot
), sides as (
  select house, week,
    count(*) filter (where role = 'seller') as sellers,
    count(*) filter (where role = 'buyer') as buyers,
    count(*) filter (where role = 'both') as both_roles
  from volunteers
  group by house, week
), items as (
  select house, week,
    array_agg(distinct item order by item) filter (where role <> 'buyer') as offered,
    array_agg(distinct item order by item) filter (where role <> 'seller') as wanted
  from volunteers cross join unnest(items) as item
  group by house, week
)
select s.house, s.week, s.sellers, s.buyers, s.both_roles,
  s.sellers + s.both_roles >= 3 and s.buyers + s.both_roles >= 3
    and s.sellers + s.buyers + s.both_roles >= 6 as meets_rule,
  i.offered, i.wanted
from sides s left join items i using (house, week)
order by meets_rule desc, s.house, s.week;
```

### D1 Sign-ups

Denominator: participants shown the pilot invitation.

```sql
-- d1-signups
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'pilot') as invitations_shown,
  count(*) filter (where join_pilot) as signed_up,
  count(*) filter (where join_pilot and cardinality(weeks) > 0 and cardinality(items) > 0) as strong_interest,
  count(*) filter (where later_email and not join_pilot) as later_email_only
from takeover_admin.study_pilot;
```

### D1 Move plans by housing

```sql
-- d1-move-housing
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), answers as (
  select a.session, a.step, a.chosen[1] as answer
  from takeover_admin.study_answers a join run on run.id = a.session
  where cardinality(a.chosen) > 0
)
select h.answer as housing, m.answer as move, count(*) as participants
from answers h join answers m on m.session = h.session and m.step = 'move'
where h.step = 'housing'
group by h.answer, m.answer
order by h.answer, m.answer;
```

### D1b Desk, with FMEL residents

```sql
-- d1b-desk
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'housing' and a.chosen && array['fmel']
), answers as (
  select option, case when a.session in (select session from subgroup) then 'fmel' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session cross join unnest(a.chosen) as option
  where a.step = 'desk'
)
select coalesce(part, 'all') as subgroup, option, count(*) as chosen,
  sum(count(*)) over (partition by coalesce(part, 'all')) as answered
from answers
group by grouping sets ((option), (part, option))
order by subgroup, chosen desc, option;
```

### D2 Obstacles, all and by side

Participants who tried (`last-role` is not `none`). `named = false` rows stay in the denominator but out of the ranking.

```sql
-- d2-obstacles
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), sides as (
  select a.session,
    case when a.chosen && array['selling', 'giving-away'] then 'seller' else 'buyer' end as side
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'last-role' and cardinality(a.chosen) > 0 and not a.chosen && array['none']
), answers as (
  select option, s.side
  from takeover_admin.study_answers a join sides s on s.session = a.session
  cross join unnest(a.chosen) as option
  where a.step = 'last-trouble'
)
select coalesce(side, 'all') as side, option,
  option not in ('nothing', 'other', 'cant-recall') as named,
  count(*) as chosen,
  sum(count(*)) over (partition by coalesce(side, 'all')) as answered
from answers
group by grouping sets ((option), (side, option))
order by side, named desc, chosen desc, option;
```

### D3 Transport, with furniture as the last item

```sql
-- d3-transport
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'last-item' and a.chosen && array['furniture']
), answers as (
  select option, case when a.session in (select session from subgroup) then 'furniture' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session cross join unnest(a.chosen) as option
  where a.step = 'move-it'
)
select coalesce(part, 'all') as subgroup, option, count(*) as chosen,
  sum(count(*)) over (partition by coalesce(part, 'all')) as answered
from answers
group by grouping sets ((option), (part, option))
order by subgroup, chosen desc, option;
```

### D4 Pack, with participants moving by June

```sql
-- d4-pack
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'move' and a.chosen && array['move-feb', 'move-jun']
), answers as (
  select option, case when a.session in (select session from subgroup) then 'moving-by-june' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session cross join unnest(a.chosen) as option
  where a.step = 'pack'
)
select coalesce(part, 'all') as subgroup, option, count(*) as chosen,
  sum(count(*)) over (partition by coalesce(part, 'all')) as answered
from answers
group by grouping sets ((option), (part, option))
order by subgroup, chosen desc, option;
```

### D5a Delegation

```sql
-- d5a-draft
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), draft as (
  select a.chosen[1] as final, a.first_chosen[1] as first
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'draft'
)
select final, first, count(*) as participants,
  (select count(*) from draft
    where final in ('sent-unchanged', 'sent-changed', 'sent-own', 'not-sent')) as completed_decisions,
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'draft') as shown_task
from draft
group by final, first
order by final, first;
```

### D5a Changed and own offers to code

```sql
-- d5a-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.session, a.chosen[1] as final, d.chosen[1] as chosen_day, a.text
from takeover_admin.study_answers a
join run on run.id = a.session
left join takeover_admin.study_answers d on d.session = a.session and d.step = 'draft-day'
where a.step = 'draft' and a.chosen[1] in ('sent-changed', 'sent-own')
order by a.saved_at;
```

### D5b Sending

```sql
-- d5b-sending
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.chosen[1] as answer, count(*) as chosen, sum(count(*)) over () as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step = 'sending' and cardinality(a.chosen) > 0
group by answer
order by chosen desc, answer;
```

### D6 Headlines, with EPFL/UNIL students

```sql
-- d6-headline
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'who' and a.chosen && array['epfl', 'unil']
), answers as (
  select option, case when a.session in (select session from subgroup) then 'epfl-unil' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session cross join unnest(a.chosen) as option
  where a.step = 'headline'
)
select coalesce(part, 'all') as subgroup, option, count(*) as chosen,
  sum(count(*)) over (partition by coalesce(part, 'all')) as answered
from answers
group by grouping sets ((option), (part, option))
order by subgroup, chosen desc, option;
```

### D7 Features, by whether the participant tried before

```sql
-- d7-helped
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), tried as (
  select a.session, not a.chosen && array['none'] as tried
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'last-role' and cardinality(a.chosen) > 0
)
select a.step as feature, case when t.tried then 'tried' else 'never-tried' end as wording,
  a.chosen[1] as answer, count(*) as chosen,
  sum(count(*)) over (partition by a.step, t.tried) as answered
from takeover_admin.study_answers a join tried t on t.session = a.session
where a.step in ('helped-find', 'helped-sell', 'helped-deal') and cardinality(a.chosen) > 0
group by a.step, t.tried, answer
order by feature, wording desc, chosen desc, answer;
```

### D7 What participants would try first

`feature = false` rows stay in the denominator but out of the ranking.

```sql
-- d7-try-first
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select option, option not in ('none', 'need-more') as feature,
  count(*) as chosen, sum(count(*)) over () as answered
from takeover_admin.study_answers a join run on run.id = a.session
cross join unnest(a.chosen) as option
where a.step = 'try-first'
group by option
order by feature desc, chosen desc, option;
```

### D8 Barriers

A participant can name several barriers; `answered` counts participants, not choices.

```sql
-- d8-stop
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), answered as (
  select a.chosen from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'stop' and cardinality(a.chosen) > 0
)
select option, count(*) as chosen, (select count(*) from answered) as answered
from answered cross join unnest(answered.chosen) as option
group by option
order by chosen desc, option;
```

### Deleting the data

Run this by the deletion date. It removes the pilot forms, the v1 contacts and all sessions of both versions with their answers and events. Delete any exports as well.

```sql
delete from takeover_admin.study_pilot;
delete from takeover_admin.study_contacts;
delete from takeover_admin.study_sessions;
```
