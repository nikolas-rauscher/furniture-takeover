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
| D5a | Check step for drafts | `draft`: sent offers with a wrong day | Wrong details in real pilot messages |
| D5b | Opt-in for short updates | `autonomy` | Opt-in uptake in the pilot |
| D5c | Copy for who sends | `who-sends`, first answer | Quick test of a rewritten sentence |
| D6 | Poster lines | `headline` | Scans per line in the poster test |

What the results cannot claim: shares for all EPFL/UNIL students; adoption or future use; real willingness to pay, a price or revenue; anything about the word "AI"; how much a check step would help; real-world draft error rates; differences between small subgroups; that the tour works.

## Participants and recruitment

- Everyone who confirms being 18 or older and agrees takes part. Nobody is filtered by student status, answers, move plans, time windows or response speed.
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

`{measured}` is 4 until the pilot measures the median time from start to reveal; it is then rounded up.

## Script

Pako asks every question. Wording is neutral; on product questions (`headline` to `draft`) Pako keeps a neutral face and does not react to answers. All questions are single choice. Shuffled options appear in random order, which is stored; options marked *last* stay at the bottom. A single-choice tap moves on after about 300 ms; Back is always visible. A section strip shows `You · Last time · First look · Situations`.

### Start

| Id | Text | Options |
| --- | --- | --- |
| `start` | "Hi, I'm Pako! We're EPFL students building takeover, an app for passing on used stuff around campus. Got {measured} minutes? No sign-in. Everyone's welcome, also if you've never bought or sold anything used." | `go` Let's go (I'm 18+ and OK with this) · `demo` Just show me the app |

Consent card "What we save": "Your taps, which screens you see, skip or go back to, and the time per screen, so we can see which questions are unclear. What you type: the optional sentence about your last exchange and the message in the practice chat. The link you came from, your language and whether you use a phone or a computer. No name, no IP address. Deleted by {date}." "More": "Your progress stays in this browser tab until you close it. This browser remembers that you finished, so you aren't asked twice. An email at the end is optional and kept apart from your answers. Questions: {contact}."

`demo` opens the tour without a session; nothing is stored. `{date}` and `{contact}` come from `STUDY_DELETE_BY` and `STUDY_CONTACT`.

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

### 3. First look

Pako: "Now a first look at takeover."

| Id | Question | Options |
| --- | --- | --- |
| `headline` | "Which of these, if any, would make you most likely to open the app?" | Shuffled: `h-move` "Sell your things before you move out." · `h-photo` "Snap a photo, get a ready listing with a fair price." · `h-ai` "An AI assistant writes your listing from a photo." · `h-nearby` "Find used things from people nearby, pickup on campus." · *last:* `none` None of these |
| `autonomy` | "Would you let the app send a short update like 'On my way' for you, without checking with you first?" | Shuffled: `yes` Yes · `no` No · *last:* `unsure` Not sure |
| `who-sends` | Card: "Pako drafts your messages. Nothing is sent until you tap Send." Then: "Say Pako drafted a message and you close the app without sending it. What happens to the message?" | Shuffled: `stays` It stays unsent until I send it · `sent-later` Pako sends it after a while · `sent-now` Pako sends it right away · *last:* `not-sure` Not sure |

### 4. Situations

Pako: "Four quick situations. Nothing here is real. Nothing gets sent or charged."

| Id | Question | Options | After the tap |
| --- | --- | --- | --- |
| `move-it` | "You've found a desk you like, 4 km from where you live. Before you agree to buy it: how would you most likely get it home?" | Shuffled: `carry-bike` Carry it or take it by bike · `public-transport` Public transport · `friend-car` Borrow a car, or ask a friend with one · `helper` A helper with a cargo bike, booked in the app: CHF 15 for the whole trip up to 4 km, carried to your door (ground floor or lift; stairs may cost extra) · *last:* `skip-desk` I'd look for one closer instead · `not-sure` Not sure | "The helper option doesn't exist yet." |
| `desk` | "You need a desk. Here are two that fit. Which one would you go for?" Two cards in the phone, order shuffled, same desk and condition, pickup this week. | `nearer` CHF 45 · 200 m from where you live · `cheaper` CHF 30 · 4 km from where you live · *last:* `neither` Neither | |
| `pack` | "Imagine you're moving out in two weeks and still have three things to sell, a desk among them. You've used today's 3 free photo drafts in takeover. What would you do?" | Shuffled: `manual` List them myself now, for free · `wait` Wait until tomorrow for new free drafts · `pack` Buy the move-out pack: CHF 5 once, five more photo drafts with price checks, valid 30 days · *last:* `other-way` Something else (another app, a group chat, give them away) · `not-sure` Not sure | "This pack doesn't exist yet. Nothing is charged." |

`draft`, the last core task, in a chat inside the phone:

1. Pako: "Last one. Imagine you're buying this desk. The price and the place suit you."
2. Listing card: "White desk · 120 × 60 cm · CHF 40 · Pickup: EPFL, Rolex Learning Center · Mia".
3. Mia: "Hi! The desk is still available. Which day could you pick it up? I'm free from 17:00."
4. `draft-day`, chips in shuffled order: `sat` Saturday · `sun` Sunday. The participant's bubble: "{Day} works for me, 17:30?"
5. Mia: "17:30 is fine. Send me an offer and I'll confirm."
6. Pako, after about 1 s of typing: "Here's your offer."
7. Draft: "Hi Mia! I'd like your white desk for CHF 40. I can pick it up on Friday at 17:30 at the Rolex Learning Center."
8. Three equal buttons: `send` Send offer · `edit` Edit (the text becomes editable, then Send offer) · `dont-send` Don't send.

Price, place and time match the chat; only the day is wrong.

### 5. Reveal

Right after the draft decision. Pako: "One thing about the offer: we deliberately put Friday in the draft after you chose a different day, to see how people use suggested messages. Please don't tell others before 13 December, so it stays fair." Link "Remove my answers" (deletes the session). Button Continue. Then Pako: "Done! Your answers are saved." (event `core-complete`).

### 6. About you (optional)

Pako: "Last bit, all optional: it helps us understand who answered." Two rows per screen, each with Skip.

| Id | Question | Options | Shown to |
| --- | --- | --- | --- |
| `age` | "Your age" | `18-20` · `21-23` · `24-26` · `27-30` · `31-plus` 31 or older · `na` Prefer not to say | all |
| `gender` | "Your gender" | `woman` Woman · `man` Man · `non-binary` Non-binary · `self-describe` Prefer to self-describe (short text) · `na` Prefer not to say | all |
| `level` | "What are you studying?" | `bachelor` Bachelor · `master` Master · `phd` PhD · `other` Other studies · `not-student` Not a student | students (`who` is not `no`) |
| `exchange` | "Are you an exchange student?" | `yes` Yes · `no` No · `na` Prefer not to say | students |

Then two equal buttons, saved as the answer to step `peek`: `finish` Finish · `tour` Peek at the app (1 min, optional).

### 7. Optional tour

| Id | Content |
| --- | --- |
| `scene-pick` | "What would you like to see first?" Shuffled: `sell` Sell from a photo · `deal` Agree on a pickup · `find` Find something. |
| `tour-sell`, `tour-deal`, `tour-find` | The app scenes in the phone. Next is available from the start; Replay; "Skip the rest". |
| `try-first` | "For the next thing you buy or sell, which would you try first, if any?" Shuffled: `describe-search` Searching by describing what I need · `photo-listing` A listing drafted from my photos, with a price and its sources · `offer-drafts` Offer drafts I can edit and send · `pickup-card` The pickup card with confirmations and reminders · *last:* `none` None of these · `need-more` I'd need to know more |

### 8. Pilot form (EPFL/UNIL students only)

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

### 9. End

Pako: "Thanks! That helps us decide what to build next."

"How others answered": the `desk` split and the `last-trouble` counts as bars with counts, once 20 v3 participants answered `desk`; before that "Results appear once 20 people have answered."

Share: "Every answer helps, also from people who never sell anything. Share it?" Share · Copy link · Show QR. Text: "I just did a {measured}-minute phone survey for an EPFL student project. No sign-in: {link}". The link carries the tag `friend`.

## What is stored

One session per participant, created on "Let's go": a random id, `survey = 'v3'`, the wording version (`v3-1` for the run, another label for the pilot), the language at the start (`en`, `fr`, `de`), the channel tag, phone or desktop. No name, no IP address, no browser details.

One answer per session and step, replaced when the participant goes back and answers again:

| Field | Content |
| --- | --- |
| `chosen` | The final answer; empty when skipped |
| `first_chosen` | The first answer; the server keeps the value it received first |
| `shown` | Option order on screen, for shuffled steps |
| `text` | `last-story`, the `gender` self-description, or the offer as sent |
| `elapsed_ms` | Time on screen |

`draft` is saved at the first button tap with `chosen` = the action, then again with the final code:

| `chosen` | Meaning |
| --- | --- |
| `sent-unchanged` | Sent without editing; `text` = the draft |
| `sent-edited` | Edited, then sent; `text` = the edited message |
| `not-sent` | Don't send, directly or after editing |
| `edit` | Edit tapped, no decision yet (unfinished if it stays so) |

`first_chosen` holds the first action (`send`, `edit` or `dont-send`); `draft-day` holds the chosen day.

Events, sent in batches and stored once per sequence number:

| Kind | Step | Detail |
| --- | --- | --- |
| `shown`, `answered`, `skipped`, `changed` | question | |
| `back` | step left | step returned to |
| `scene-played`, `scene-skipped` | tour step | scene |
| `moment-tapped`, `moment-auto` | tour step | key moment, tapped or advanced by itself |
| `core-complete`, `end` | | |
| `share` | | `native`, `copy` or `qr` |
| `language` | | language switched to |

Not recorded: touch paths, scroll depth, keystrokes, session replay.

In account mode the data is in Supabase, in tables that students cannot read; the server writes them through security-definer functions with its service key. In the local demo it is in the SQLite file. Without `STUDY_CONTACT` and `STUDY_DELETE_BY` the study is closed and only the pitch is available. The owner deletes sessions, answers, events, pilot forms, contacts and exports by the deletion date.

## Analysis

Plausible range: two-sided 95% Wilson interval. For a network sample it only illustrates precision. Main figures use everyone who answered the item; subgroups are described next to them, never used to drop anyone.

| Subgroup | From | Used for |
| --- | --- | --- |
| Student status | `who` | Whether figures depend on non-users |
| Side of the last attempt | `last-role`: buying, getting-free vs selling, giving-away | D2 |
| Moving by June | `move` in `move-feb`, `move-jun` | D4, D1 |
| Housing | `housing` = `fmel` | D1b, D1 |
| Bulky item | `last-item` = `furniture` | D3 |
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
| `draft` wrong day ≥ | D5a | completed decisions | 5 | 7 | 10 | 17 |
| `autonomy` yes: go ≥ / keep manual ≤ | D5b | answered | 27 / 13 | 38 / 22 | 60 / 40 | 114 / 86 |
| `who-sends` wrong + unsure ≥ | D5c | answered | 8 | 12 | 20 | 40 |

Draft coding, over completed decisions (`sent-unchanged`, `sent-edited`, `not-sent`):

| Code | Meaning |
| --- | --- |
| `day-correct` | Sent; proposes the chosen day and no other |
| `day-wrong` | Sent; proposes another day. Every `sent-unchanged` |
| `day-missing` | Sent; no day, or unclear |
| `not-sent` | `not-sent` |
| `unfinished` | `edit` as final state; reported over everyone shown the task |

Two team members code every `sent-edited` text and `last-story` independently; agreement (% and Cohen's κ) is reported before disagreements are settled. Edits, refusals and missing days do not show that someone noticed the error.

## Pre-registration

Frozen with a date before the first invitation, together with the script and the codebook; later changes are listed as deviations. The rules are pilot decisions, not confirmed findings. Rate rules apply only with at least 40 answers to the item (and in a subgroup, if shown with a range); below that, counts only.

| D | Success / inconclusive / fail | Also report |
| --- | --- | --- |
| D1 | A house with ≥ 3 distinct sellers and ≥ 3 distinct buyers (a "both" volunteer counted on one side), compatible items and one shared week → pilot there; a February week → February rehearsal. No house → pool nearby houses with one pickup point. Count rule, no floor. | Matches and attendance in the pilot |
| D1b | Nearer lower bound > 50% → test a second price–distance pair and nearby sorting. Cheaper lower bound > 50% → price sort first. Else open. "Neither" stays in the denominator. | FMEL, EPFL/UNIL |
| D2 | (1) Nothing ≥ 40% → problem weaker than believed, no nomination. (2) Else top named obstacle ≥ 25% and no tie → nominate it for the pilot. (3) Else open. | Buyers and sellers separately |
| D3 | Helper lower bound ≥ 15% → partner quote and a real booking offer in the pilot. Upper bound < 15% → deprioritise this offer. Else open. 15% is a team threshold. | Furniture subgroup |
| D4 | Pack lower bound > 20.6% (break-even: 33 packs from 160 movers) → offer a real paid pack in February. Upper bound < 20.6% → no student payment in the pilot. Else open. | Moving by June |
| D5a | Wrong-day sends ÷ completed decisions, lower bound ≥ 5% → test a check step. Else open; report the upper bound. | Unfinished; first vs final action |
| D5b | Yes lower bound > 50% → prototype the opt-in. Upper bound < 50% → keep "you tap every send". Else open. | By draft code |
| D5c | First answer wrong or unsure ≥ 20% → rewrite the sentence. Else keep. | Wrong and unsure separately |
| D6 | The two most chosen lines go to the poster test; a tie for second sends all tied lines. `none` chosen most → no shortlist, rewrite the lines. | EPFL/UNIL counts |

## Threats to validity

| Threat | Where | Mitigation | What remains |
| --- | --- | --- | --- |
| Pako asks the product questions | `headline`, `autonomy`, `move-it`, `pack`, `try-first` | Neutral wording, outside options, "the app" in questions, no reaction to product answers; real behaviour weighs more | Product answers likely lean positive; size unknown |
| Self-selection, course peers | Everything | Neutral invitation, channel tags, subgroups described | No campus-wide rates |
| No time window on the last attempt | `last-trouble`, `last-item` | `last-occasion` and side describe the episode | Older episodes recalled less precisely |
| Fixed section order | All | Shuffled options with stored order; helper before desk; autonomy before the draft | Same order for everyone |
| Imagined vs real behaviour | `draft`, `pack`, `move-it`, `desk` | Every "go" leads to a real test | Stated choices run high |
| Planted error spreading | `draft` | Share text does not mention it; reveal asks for silence; leak check | If the rate drifts by day, report both |
| Shown results | Later participants | Only after the core, two items, from 20 answers | |
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

1. Pilot done; wording and `{measured}` fixed; wording version raised to `v3-1`.
2. This protocol frozen with a date.
3. Pilot sessions deleted, so they do not count in "How others answered".
4. `STUDY_CONTACT` and `STUDY_DELETE_BY` set on the deployment.
5. The migration reviewed and applied.
6. Server logs checked for request addresses.
7. QR codes generated per channel and tested at poster distance.

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
  count(*) filter (where exists (select 1 from takeover_admin.study_answers a where a.session = run.id)) as answered_any,
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

For the descriptive steps (`who`, `last-occasion`, `why-not`, `move`, `housing`, `age`, `gender`, `level`, `exchange`, `scene-pick`, `try-first`). Change the step id. Skips are not counted.

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

### D5a Draft decisions

Wrong-day sends = `sent-unchanged` plus the `sent-edited` texts coded `day-wrong`.

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
  (select count(*) from draft where final in ('sent-unchanged', 'sent-edited', 'not-sent')) as completed_decisions,
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'draft') as shown_task
from draft
group by final, first
order by final, first;
```

### D5a Edited offers to code

```sql
-- d5a-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.session, d.chosen[1] as chosen_day, a.text
from takeover_admin.study_answers a
join run on run.id = a.session
left join takeover_admin.study_answers d on d.session = a.session and d.step = 'draft-day'
where a.step = 'draft' and a.chosen[1] = 'sent-edited'
order by a.saved_at;
```

### D5b and D5c Autonomy and who sends

`autonomy` counts the final answer, `who-sends` the first.

```sql
-- d5bc
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.step,
  case when a.step = 'who-sends' then a.first_chosen[1] else a.chosen[1] end as answer,
  count(*) as chosen,
  sum(count(*)) over (partition by a.step) as answered
from takeover_admin.study_answers a join run on run.id = a.session
where a.step in ('autonomy', 'who-sends') and cardinality(a.chosen) > 0
group by a.step, answer
order by a.step, chosen desc, answer;
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

### S Leak check

Unchanged sends by fieldwork day (database time zone) and for shared links.

```sql
-- leak
with run as (
  select id, source from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.saved_at::date as day, run.source = 'friend' as shared_link,
  count(*) filter (where a.chosen[1] in ('sent-unchanged', 'sent-edited', 'not-sent')) as completed_decisions,
  count(*) filter (where a.chosen[1] = 'sent-unchanged') as sent_unchanged
from takeover_admin.study_answers a join run on run.id = a.session
where a.step = 'draft'
group by day, shared_link
order by day, shared_link;
```

### Deleting the data

Run this by the deletion date. It removes the pilot forms, the v1 contacts and all sessions of both versions with their answers and events. Delete any exports as well.

```sql
delete from takeover_admin.study_pilot;
delete from takeover_admin.study_contacts;
delete from takeover_admin.study_sessions;
```
