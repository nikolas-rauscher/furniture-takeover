# User study on the tour page

The tour page (`/tour`) has two uses. Without a tag it is the pitch: a hero and a short tour of takeover, and nothing is recorded. With a tag (`/tour?s=<channel>`) it is the study in version 3, described here. `/tour?s=<channel>&v=1` runs version 1 ([STUDY-v1.md](STUDY-v1.md)) unchanged, so both versions can be compared. Every session stores its version (`survey`), its wording version and its language.

This file is the protocol. The v3 script in `src/tour/` follows it, in English, French and German with equivalent meaning; the English wording below is the reference. The app screens inside the phone stay in English. The decision rules are frozen before launch (see [Pre-registration](#pre-registration)).

Changed in `v3-8`, after two methodology reviews:

- Order. `what-is` says in one sentence what the app is and lists the survey's parts, without the feature list that could prime `last-trouble`. In "The app", `headline` moved to the end, after `wanted-share`. The situations run `desk`, `move-it`, `draft`, so the desk prices no longer follow the CHF 15 helper; `sending` follows `draft`. In "Price & delivery", `pack-price` comes before `pay-model`.
- Pricing. The pack ladder starts at CHF 5 for everyone; `pack-start` is no longer stored. Its card states that writing listings yourself stays free. `pay-model` asks for a personal choice between the free version (`free`) and three paid options, plus `not-sure`; `institution` and `none` are gone. The new descriptive item `institution-pay` asks whether a university or residence paying would change use. `delivery-pref` is dropped; `delivery-worth` is asked of everyone, with bands that do not overlap.
- Tasks. Pako's draft comes in two variants, drawn once per participant and stored as `draft-variant`: `exact` (CHF 40) or `wrong-price` (CHF 35 although CHF 40 was agreed). `wanted-react` first asks the participant to imagine having a desk lamp they no longer need. The `last-role` option `none` reads "I've never tried".
- Form at the end. It is shown to everyone who finishes the core. It has three ticks: hearing when takeover is online, trying it early, and future surveys. Role and place are asked only of those who want to try it early; the items question is gone.
- Rules. D1 counts sellers and buyers per place among those who want to try takeover early. D3 and D10 are merged into one transport decision, D3, with `move-it` as its measure. D4 counts everyone who entered the ladder, with implied answers, and is decided among those moving by June. D5a adds a rule on the wrong-price variant. D9 is decided among the paid options only.

Changed in `v3-7`: pretest participants lacked context for many screens. Each part after the start now opens with a part screen that says what it asks (`part-last-time`, `part-the-app`, `part-situations`, `part-price`), replacing Pako's short intro lines; questions, intros, situations and many options are full sentences that stand on their own; `what-is` has a lead sentence and lists the four parts; `pay-model` shows the ways of paying as price cards with a price, a detail and two advantages each; the price ladder's card shows the price asked; `wanted-react` first explains the idea; the three short scenes have their own survey texts. Apart from the part screens, the steps, the option ids and the decision rules are unchanged.

Changed in `v3-6`: the French and German wording was revised after a translation review, so that each question and option says what the English says, for example moving out rather than moving in general, a transport helper rather than a courier, and short status updates rather than any message. The English wording, the steps and the option ids are unchanged.

Setting: a course project. Prices are hypothetical; nothing is launched, sold or booked.

## Decisions the study informs

| #   | Decision                                                                      | Survey measure                                                            | Real observation that would change it                                       |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D1  | Where to try takeover first                                                   | Form at the end: those who want to try it early, per place and role       | Exchanges that actually happen where it is tried first                      |
| D1b | Sorting: distance first or price first                                        | `desk`                                                                    | Which sort users pick                                                       |
| D2  | Problem to address first                                                      | `last-trouble`                                                            | What breaks down in real exchanges                                          |
| D3  | Transport help: a helper or delivery offer, or local pickup only              | `move-it`, helper option; `delivery-worth` and `last-cost` describe       | Bookings of a transport offer at a quoted price                             |
| D4  | Paid move-out pack                                                            | `pack-chf-5`, `pack-chf-2`, `pack-chf-8` (price ladder)                   | Share of movers who reach the free limit, and how many buy                  |
| D5a | Pako's draft as the default way to write an offer, and a check before sending | `draft` by `draft-variant`: sent as it is, changed, own message, not sent | Share of offers sent from Pako's draft, and offers sent with a wrong detail |
| D5b | Opt-in for short updates                                                      | `sending`: `short-updates` or `replies-too`                               | Opt-in uptake after launch                                                  |
| D6  | Poster lines                                                                  | `headline`                                                                | Scans per line in the poster test                                           |
| D7  | Which features the onboarding leads with                                      | `helped-find`, `helped-sell`, `helped-deal`, `try-first`                  | Which features users open and finish                                        |
| D8  | Barriers the launch plan must answer                                          | `stop`                                                                    | Reasons people give for dropping out                                        |
| D9  | Which way of paying to test first                                             | `pay-model`, among the paid options; `institution-pay` describes          | Uptake of the model offered                                                 |
| D11 | Build "Wanted nearby"                                                         | `wanted-react`, `wanted-share`                                            | Requests posted and items listed in answer to them                          |

D10 (delivery) was merged into D3 in `v3-8`.

What the results cannot claim: shares for all EPFL/UNIL students; adoption or future use; real willingness to pay, a price or revenue; anything about the word "AI"; how carefully people read drafts in real use; differences between small subgroups; that the tour works.

## Participants and recruitment

- Everyone who agrees takes part. Nobody is filtered by student status, answers, move plans, time windows or response speed.
- Analysis exclusions, and only these: no consent (no session exists), duplicates (the browser marks a finished survey), sessions without any answer (counted as break-offs).
- No incentive.
- Pretest: 3–5 phone runs (iOS and Android) from Mon 23 to Fri 27 Nov 2026 with their own version label. Launch Mon 30 Nov 2026. Close Sun 13 Dec 2026, 23:59.

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

Invitation (chat): "Hi all, we're EPFL students building takeover, an app for passing on used stuff around campus. Could you do our {measured}-minute phone survey? No sign-in, everyone welcome, also if you've never bought or sold anything used. {link}". For `moodle-peer`: "The app demo is at the end, or directly via 'Just show me the app'."

`{measured}` is 5 until the pretest measures the median time from start to the saved core; it is then rounded up.

## Script

Pako asks every question. Wording is neutral; on questions about the app, its prices and delivery Pako keeps a neutral face and does not react to answers. All questions are single choice except `stop`. Shuffled options appear in random order, which is stored; options marked _last_ stay at the bottom. A single-choice tap moves on after about 300 ms; Back is always visible. A section strip shows `Start · Your experience · The app · Situations · Price & delivery`.

Each part after the start opens with a part screen without an answer: Pako's line, a card with "Part {n} of 5", the part's name from the section strip and a short text on what the part asks, then Continue. Nothing is stored on these screens apart from their events; the results funnel lists them with the core screens.

| Id                | Before       | Pako                                                       | Card                                                                                                                                                                                                                                                                            |
| ----------------- | ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `part-last-time`  | `last-role`  | "This part is about your own experience with used things." | "Part 2 of 5" · Your experience · "We'd like to hear about the last time you tried to buy, sell, give away or get a second-hand item, whether or not it worked out. There are no right or wrong answers."                                                                       |
| `part-the-app`    | `app-find`   | "This part is about takeover itself."                      | "Part 3 of 5" · The app · "You'll see three short scenes and tell us whether each feature would help you. Then a few questions about the app as a whole follow, and at the end you compare some slogans."                                                                       |
| `part-situations` | `desk`       | "This part has three everyday situations."                 | "Part 4 of 5" · Situations · "Imagine you're in each situation and choose what you would really do. In the last one, you chat with a seller. One question about sending messages follows."                                                                                      |
| `part-price`      | `pack-price` | "This last part is about money and delivery."              | "Part 5 of 5" · Price & delivery · "First, we ask what you'd pay for a move-out pack. Then you choose between the free version and three ways of paying, and we ask about delivery. Searching, listing and messaging would stay free, along with some help from Pako each day." |

### Start screen

| Id      | Text                                                                                                                                                                                                                                                                                                                                                                                                                        | Options                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `start` | "Hi, I'm Pako, the assistant in the takeover app. A team of EPFL students is building the app so students around EPFL and UNIL can buy, sell and give away second-hand items. In this survey, we'd like to learn how you deal with used things and what you think of the app. It takes about {measured} minutes, and you don't need an account. Everyone can take part, even if you've never bought or sold anything used." | `go` Start the survey · `demo` Just show me the app |

Folded toggle "What we save" below the invitation: "We save your answers and record which screens you visit, skip or return to and how long you spend on each one. We also record which link you followed, your language and whether you're using a phone or a computer. Your progress stays in this tab until you close it, and this browser remembers that you finished. You can leave an email address at the end. We store it separately from your answers. Everything is deleted by {date}." Then "Questions about the survey: {contact}".

`demo` opens the tour without a session; nothing is stored. `{date}` and `{contact}` come from `STUDY_DELETE_BY` and `STUDY_CONTACT`. Answers carry no name or email, so the answers of one participant cannot be found later; the whole data set is deleted by the deletion date. Questions about the optional email go to the contact address.

Then one screen, `what-is`, before the first question. It says in one sentence what the app is and lists the survey's parts. It names no feature and no problem, so the questions about the last attempt stay unprimed.

| Part                         | Text                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pako                         | "Before the first question, here's what takeover does and what this survey asks."                                                                                                                                                                                                                     |
| Title                        | "What is takeover?"                                                                                                                                                                                                                                                                                   |
| Lead                         | "An app for students around EPFL, UNIL and the FMEL residences to buy, sell and give away second-hand items."                                                                                                                                                                                         |
| Card "What this survey asks" | 1. Your last experience with buying, selling or giving away something used · 2. Three short scenes from the app, then a few questions about it · 3. Three everyday situations in which you choose what you would do · 4. What you would pay for the app and for delivery · "About {measured} minutes" |

Button Continue. Nothing is stored on this screen apart from its events.

### 1. Start

| Id    | Question             | Options                                                                                     |
| ----- | -------------------- | ------------------------------------------------------------------------------------------- |
| `who` | "Are you a student?" | `epfl` Yes, at EPFL · `unil` Yes, at UNIL · `other-school` Yes, at another school · `no` No |

### 2. Your experience

Opens with `part-last-time`.

| Id              | Question                                                                                                                     | Options                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Shown to |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `last-role`     | "Think of your last experience with a second-hand item. What were you trying to do?"                                         | `buying` Buy something · `getting-free` Get something for free · `selling` Sell something · `giving-away` Give something away · `none` I've never tried                                                                                                                                                                                                                                                                                                                                         | all      |
| `last-item`     | "What kind of second-hand item was involved last time?"                                                                      | `furniture` Furniture (desk, chair, shelf, bed) · `household` Small household items · `electronics` Electronics · `bike` Bike or scooter · `books` Books or course material · `clothes` Clothes or shoes · `other` Something else                                                                                                                                                                                                                                                               | tried    |
| `last-occasion` | "Was this related to moving in or moving out?"                                                                               | `moving-in` Yes, I was moving in · `moving-out` Yes, I was moving out · `no-move` No · `cant-recall` I can't remember                                                                                                                                                                                                                                                                                                                                                                           | tried    |
| `last-story`    | "In one sentence, how did your last experience with a second-hand item go?" (placeholder "Optional, a few words are enough") | Text up to 200 characters · Skip                                                                                                                                                                                                                                                                                                                                                                                                                                                                | tried    |
| `last-trouble`  | "Which part was hardest for you last time, if any?"                                                                          | Shuffled: `finding` Finding the right item (buyers) / Finding someone who wanted it (sellers) · `listing` Writing the listing or taking photos · `price` Knowing or agreeing on a price · `replies` Slow replies or no replies · `timing` Agreeing on a time, or a pickup falling through · `transport` Getting it from A to B · `trust` Not knowing whether I could trust the other person · _last:_ `nothing` Nothing was difficult · `other` Something else · `cant-recall` I can't remember | tried    |
| `last-cost`     | "Roughly how much did you spend on transporting the item?"                                                                   | In order: `nothing` Nothing · `under-10` Under CHF 10 · `10-30` CHF 10–30 · `over-30` More than CHF 30 · `dont-remember` I don't remember                                                                                                                                                                                                                                                                                                                                                       | tried    |
| `why-not`       | "What is the main reason you haven't bought, sold or given away anything used?"                                              | Shuffled: `no-need` I never needed to · `prefer-new` I prefer new things · `hassle` It seemed like too much hassle · `dont-know-where` I didn't know where to look · _last:_ `other` Something else                                                                                                                                                                                                                                                                                             | `none`   |
| `move`          | Pako's title "Next, two questions about where you live now." Then "Are you planning to move out of your current home?"       | In order: `move-feb` Yes, by the end of February 2027 · `move-jun` Yes, between March and June 2027 · `move-later` Yes, later · `no-plan` No, I have no plans to move · `not-sure` Not sure                                                                                                                                                                                                                                                                                                     | all      |
| `housing`       | "Where do you live at the moment?"                                                                                           | `fmel` In an FMEL residence · `other-res` In another student residence · `flat` In a flat or studio · `family` With my family · `elsewhere` Somewhere else                                                                                                                                                                                                                                                                                                                                      | all      |

"Tried" means `last-role` is not `none`. Obstacle to problem, fixed before launch: `finding` search (buyers) or reaching nearby buyers (sellers) · `listing` photo listing · `price` cited price · `replies` reply handling · `timing` pickup card and confirmations · `transport` D3 · `trust` university-only accounts.

### 3. The app

Opens with `part-the-app`. Three features come first, in the same order for everyone: each a short scene in the phone, then one question. A short scene is the tour's scene at 0.35 of its pace, with every tap made by the scene itself; it reaches its last key moment after about 12 s. Next works from the start; Replay plays it again. Pako's line beside the phone gives the scene's title and says what it shows. These survey texts (`v3.scenes`) are separate from the pitch's scene texts, which the pitch and version 1 keep.

| Id             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Options                                                                                                                                                                                                                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-find`     | Scene "Finding something": "A student near Vortex needs a desk and describes what they're looking for. Pako searches listings posted by students nearby and drafts an offer. Nothing is sent until the student taps Send."                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                     |
| `helped-find`  | Title "Finding something". "Would this feature have helped you last time?" To those who never tried (`last-role` = `none`): "Would this feature help you if you wanted to buy or sell something used?"                                                                                                                                                                                                                                                                                                                           | In this order: `yes` Yes · `partly` Partly · `no` No · `na` That doesn't apply to me                                                                                                                                                                                                                                                                |
| `app-sell`     | Scene "Selling with a photo": "Léa takes a photo of her desk. Pako writes the listing and suggests a price. Léa sets her own price and saves the listing."                                                                                                                                                                                                                                                                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                     |
| `helped-sell`  | As `helped-find`, titled "Selling with a photo"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | As `helped-find`                                                                                                                                                                                                                                                                                                                                    |
| `app-deal`     | Scene "Agreeing on a pickup": "Noah offers CHF 35 for the desk and Léa accepts, so the pickup is booked. At pickup time, both of them confirm the handover."                                                                                                                                                                                                                                                                                                                                                                     |                                                                                                                                                                                                                                                                                                                                                     |
| `helped-deal`  | As `helped-find`, titled "Agreeing on a pickup"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | As `helped-find`                                                                                                                                                                                                                                                                                                                                    |
| `stop`         | "What could stop you from using takeover? You can choose several answers." Multiple choice; Continue moves on.                                                                                                                                                                                                                                                                                                                                                                                                                   | Shuffled: `ai-mistakes` The AI could make mistakes · `nobody-nearby` Too few people nearby use it · `prefer-groups` I prefer my WhatsApp or Telegram groups · `privacy` Privacy concerns · `too-long` It takes too long · _last:_ `nothing` Nothing would stop me (clears the others) · `other` Something else (short text)                         |
| `try-first`    | "Which feature would you try first the next time you buy or sell something?"                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Shuffled: `describe-search` Describe what I need to search the listings · `photo-listing` Draft a listing from photos, with a suggested price and sources · `offer-drafts` Edit and send a draft offer · `pickup-card` Use the pickup card for confirmations and reminders · _last:_ `none` None of these · `need-more` I'd need to know more first |
| `wanted-react` | Card "An idea for the app": "Students can share what they're looking for. Others nearby see the request, but never the name of the person asking." Then a drawn request card in the app's style, labelled for screen readers "Example of a request in the app, with an I have one button": "Someone near Vortex is looking for a desk lamp. Got one lying around?" with an "I have one" button that does nothing. Pako's title "Imagine you have a desk lamp you no longer need." Then: "How would you respond to this request?" | Shuffled: `snap` Take a photo and list my item · `look` Look at the request and decide later · `ignore` Ignore it · _last:_ `rather-not` I'd rather not see requests like this                                                                                                                                                                      |
| `wanted-share` | "Would you share a request with students nearby? They’d see the item and your area, but not your name."                                                                                                                                                                                                                                                                                                                                                                                                                          | In order: `yes` Yes · `maybe` Maybe · `no` No                                                                                                                                                                                                                                                                                                       |
| `headline`     | "Which slogan would make you most likely to open takeover?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Shuffled: `h-move` “Sell your things before you move out.” · `h-photo` “Take a photo and get a listing with a fair price, ready to post.” · `h-ai` “An AI assistant writes your listing from a photo.” · `h-nearby` “Find second-hand items nearby and pick them up on campus.” · _last:_ `none` None of these                                      |

Changed in `v3-8`: `headline` moved from the start of this part to its end, and `sending` moved to after the draft task.

Changed in `v3-5`: `wanted-react` and `wanted-share` test the "Wanted nearby" idea: a student's anonymous request is shown to students nearby, who can photo-list a matching item with one tap.

Changed in `v3-2`: the scenes, the `helped-*` questions and `stop` are new; `try-first` moved here from the optional tour; `autonomy` and `who-sends` of `v3-1` became the single item `sending`, so the survey stays near five minutes.

### 4. Situations

Opens with `part-situations`. Each situation opens with a context card: "Situation {n} of 3", the scenario, and what to do ("Choose the answer that fits you best."). Pako then asks the question.

| Id        | Card                                                                                                                                                                                                               | Question                                                                                                                                        | Options                                                                                                                                                                                                                                                                                                                                                                                                         | After the tap                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `desk`    | "Situation 1 of 3" · "You need a desk, and the app shows two that would suit you. They're the same model in the same condition; only the price and the distance differ." · "Choose the answer that fits you best." | "Which of the two desks would you choose?" Two cards in the phone, order shuffled, with the note "Same desk, same condition, pickup this week". | `nearer` CHF 45 · 200 m from where you live · `cheaper` CHF 30 · 4 km from where you live · _last:_ `neither` Neither                                                                                                                                                                                                                                                                                           |                                                |
| `move-it` | "Situation 2 of 3" · "You've found a desk you like in the app. The seller lives 4 km away from you." · "Choose the answer that fits you best."                                                                     | "How would you get the desk home?"                                                                                                              | Shuffled: `carry-bike` Carry it or take it by bike · `public-transport` Take it on public transport · `friend-car` Borrow a car, or ask a friend who has one · `helper` Book a helper with a cargo bike in the app: CHF 15 for the whole trip up to 4 km, carried to your door (ground floor or lift; stairs may cost extra) · _last:_ `skip-desk` Look for a desk closer to home instead · `not-sure` Not sure | "Note: this helper service doesn't exist yet." |

`draft`, the third situation, in a chat inside the phone. It measures delegation: whether people send Pako's draft as it is, change it, write their own or send nothing. It comes in two variants, drawn once per participant when the task is first shown: in `exact` the draft names the agreed CHF 40; in `wrong-price` it names CHF 35 although the listing and the agreed price are CHF 40. Everything else is the same.

1. Card: "Situation 3 of 3" · "You want to buy a desk from Mia, another student. The price and the pickup place suit you." · "First, answer Mia in the chat. Pako then writes an offer for you, and you decide what to do with it."
2. Pako: "Mia asks when you could pick up the desk. Choose a day in the chat below."
3. Listing card: "White desk · 120 × 60 cm · CHF 40 · Pickup: EPFL, Rolex Learning Center · Mia".
4. Mia: "Hi! The desk is still available. Which day could you pick it up? I'm free from 17:00."
5. `draft-day`, chips in shuffled order: `sat` Saturday · `sun` Sunday. The participant's bubble: "{Day} works for me. How about 17:30?"
6. Mia: "17:30 is fine. Send me an offer and I'll confirm."
7. Pako, after about 1 s of typing: "I've written an offer for you."
8. Draft, headed "Offer draft": "Hi Mia! I'd like your white desk for CHF {price}. I can pick it up on {Day} at 17:30 at the Rolex Learning Center." `{price}` is 40 in `exact` and 35 in `wrong-price`.
9. "What would you do with this draft?" Four equal buttons: `send` Send it as it is · `change` Change something first (the draft becomes editable, then Send) · `own` Write my own message (an empty message, then Send) · `dont-send` Don't send it. While writing, "Don't send it" stays available; after it the chat shows "You didn't send the offer."

Then `sending`, with the card "How the app works": "Pako, the app's assistant, drafts your messages. Nothing is sent until you tap Send." Then: "Would you let Pako send messages without checking with you first?" In this order, from nothing to more: `myself` No, I'd send every message myself · `short-updates` Only short updates like “On my way” · `replies-too` Short updates and simple replies · `not-sure` Not sure.

Changed in `v3-3`: the `what-is` screen and the context cards are new; the draft no longer plants a wrong day, so the reveal screen and its "Remove my answers" link are gone.

### 5. Price & delivery

Opens with `part-price`. Pako does not react to these answers.

| Id                | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Options                                                                                                                                                           | Shown to |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `pack-price`      | One screen, the price ladder (Gabor–Granger). Pako's title "First, one way of paying: a move-out pack." Card "Move-out pack", the price asked "CHF {price}, paid once", and "Writing listings yourself stays free. The pack adds five extra photo drafts with price checks, valid for 30 days." Then "Would you pay CHF {price} of your own money for this pack when you next move?" Everyone is asked CHF 5 first. After `yes` CHF 8 is asked, after `no` CHF 2; `not-sure` ends it. Two questions at most; each answer is stored as `pack-chf-{price}`. Then the card without a price, "Note: this pack doesn't exist yet." and Continue. The answers are final: a participant who comes back sees the note. | `yes` Yes · `no` No · `not-sure` Not sure                                                                                                                         | all      |
| `pay-model`       | "If you paid yourself, which would you choose?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Four price cards of equal weight, shuffled (see below) · _last:_ `not-sure` Not sure, as a plain answer                                                           | all      |
| `institution-pay` | "Would you use takeover more if your university or residence paid for it?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | In order: `yes` Yes · `no-difference` It wouldn't make a difference · `not-sure` Not sure                                                                         | all      |
| `delivery-worth`  | "What is the most you would pay to have a bulky item brought to your door in Lausanne (about 5 km)?"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | In order: `nothing` Nothing, I'd fetch it myself · `up-to-5` Up to CHF 5 · `6-10` CHF 6–10 · `11-20` CHF 11–20 · `over-20` More than CHF 20 · `not-sure` Not sure | all      |

The `pay-model` cards: the option's name, its price, a one-line detail and two advantages.

| Option       | Name          | Price                 | Detail                                                          | Advantages                                                                       |
| ------------ | ------------- | --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `free`       | Free version  | CHF 0                 | Keep using the free version, with some help from Pako each day. | Nothing to pay · Searching, listing and messaging included                       |
| `seller-fee` | Fee per sale  | 5% when an item sells | Paid by the seller, only when an item sells.                    | Listing and buying stay free · Nothing to pay if nothing sells                   |
| `move-pack`  | Move-out pack | CHF 5, paid once      | Five extra photo drafts with price checks, valid for 30 days.   | No subscription · Made for the weeks around a move                               |
| `monthly`    | Monthly plan  | CHF 3 a month         | Unlimited help from Pako, the app's assistant.                  | As many drafts and price checks as you like · Covers frequent buying and selling |

Then Pako: "Done! Your answers are saved." (event `core-complete`).

Changed in `v3-4`: `last-cost` and this part are new; the pack situation of `v3-3` is replaced by the price ladder, so part 4 holds three situations. The helper situation (`move-it`) stays as the behavioural choice about transport.

### 6. About you (optional)

Pako: "Finally, a few optional questions about you. They help us understand who took part." Two rows per screen, each with Skip.

| Id         | Question                             | Options                                                                                                                             | Shown to                     |
| ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `age`      | "How old are you?"                   | `18-20` 18–20 · `21-23` 21–23 · `24-26` 24–26 · `27-30` 27–30 · `31-plus` 31 or older · `na` Prefer not to say                      | all                          |
| `gender`   | "What is your gender?"               | `woman` Woman · `man` Man · `non-binary` Non-binary · `self-describe` Prefer to self-describe (short text) · `na` Prefer not to say | all                          |
| `level`    | "Which degree are you studying for?" | `bachelor` Bachelor · `master` Master · `phd` PhD · `other` Other studies · `not-student` I'm not a student                         | students (`who` is not `no`) |
| `exchange` | "Are you an exchange student?"       | `yes` Yes · `no` No · `na` Prefer not to say                                                                                        | students                     |

Then two equal buttons, saved as the answer to step `peek`: `finish` Finish · `tour` See the full scenes (optional).

### 7. Optional tour

| Id                                    | Content                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scene-pick`                          | "Which scene would you like to see first?" Shuffled: `sell` Sell from a photo · `deal` Agree on a pickup · `find` Find something.                                                                                                                |
| `tour-sell`, `tour-deal`, `tour-find` | The full app scenes in the phone, with Pako's line as in the short scenes and key moments the participant can tap. Next is available from the start; Replay; "Skip the rest". Back after "Skip the rest" returns to the scene it was pressed on. |

### 8. Form at the end (optional)

Shown after Finish or after the tour to everyone who finished the core. Stored in its own table without a session, so it cannot be linked to answers.

Pako: "Want to hear when takeover is online, try it early, or join a future survey?"

| Field                          | Options                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Email address"                | required                                                                                                                                                                                                                                         |
| Ticks, "What would you like?"  | `launchNews` "Tell me when takeover is online" · `tryEarly` "I'd like to try takeover early" · `futureSurveys` "Invite me to future surveys"                                                                                                     |
| "Would you sell, buy or both?" | only with `tryEarly`, required then: `seller` Sell · `buyer` Buy · `both` Both                                                                                                                                                                   |
| "Where do you live?"           | only with `tryEarly`, required then: `vortex` FMEL Vortex · `atrium` FMEL Atrium · `triaudes` FMEL Triaudes · `fmel-other` Another FMEL residence · `other-res` Another student residence · `flat` A flat or studio · `elsewhere` Somewhere else |

The form notes "Kept separately from your survey answers." Buttons Send · No thanks.

Send needs at least one tick. Role and place are stored only with `tryEarly`; without it they are not asked and stay empty. Each tick is its own permission: an address is written to only for what was ticked. Trying takeover early means up to 10 real exchanges of items a student can carry or move with a bike trailer.

One form per address: the first one stands, and a later form with the same address changes nothing. The page answers both the same way, so it does not show whether an address is already listed. Changes, such as leaving the list, go through the contact address. Addresses are not verified: the first email asks each address to confirm, and only confirmed addresses are written to again.

### 9. End

Title: "Thank you! Your answers help us decide what to build next."

"How others answered": the `desk` split ("Two desks: which one?") and the `last-trouble` counts ("What was most difficult last time") as bars with counts, over the sessions of the participant's own wording version, once 20 of them answered `desk`; before that "Results appear once 20 people have answered."

Share: "Every answer helps, including from people who never sell anything. Would you share the survey?" Share · Copy link · Show QR code. Text: "I just did a {measured}-minute phone survey for an EPFL student project. No sign-in: {link}". The link carries the tag `friend`.

## What is stored

One session per participant, created on "Start the survey": a random id, `survey = 'v3'`, the wording version (`v3-8` for the pretest, a raised label for the run), the language at the start (`en`, `fr`, `de`), the channel tag, phone or desktop. No name, no IP address, no browser details.

The tab keeps the participant's progress with the wording version the session started in. A reload continues the session only in that version: after a new version is deployed, the progress is set aside and the survey starts again with a new session and the line "The survey was updated, so it starts again."

One answer per session and step, replaced when the participant goes back and answers again. When a change after Back takes a step off the participant's path, such as `last-role` changed to `none` after `last-trouble` was answered, that step's answer is saved again empty: `chosen` and `text` empty, `first_chosen` kept. The same happens when such a change alters the wording an answer was given under: the `helped-*` answers when `last-role` changes between an attempt and `none`, and a `last-trouble` answer holding `finding` when the side changes between buying or getting and selling or giving away. Every save carries a `revision` that the client raises; the server keeps the newest and ignores an older write, such as one still in flight from before a reload. An empty answer counts as not answered on the results page, in "How others answered" and in the queries below:

| Field          | Content                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `chosen`       | The final answer; empty when skipped                                                                |
| `first_chosen` | The first answer; the server keeps the value it received first                                      |
| `shown`        | Option order on screen, for shuffled steps                                                          |
| `text`         | `last-story`, the `gender` self-description, the `stop` "Something else" text, or the offer as sent |
| `elapsed_ms`   | Time on screen                                                                                      |

`draft` is saved when a writing option is tapped, with `chosen` = that option, then again with the final code at the tap that decides; the sent message stays in view for about a second before the next screen, and after a reload the decision is shown again, not asked again:

| `chosen`         | Meaning                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| `sent-unchanged` | Sent as Pako drafted it, directly or after opening it for changes; `text` = the draft |
| `sent-changed`   | Changed, then sent; `text` = the changed message                                      |
| `sent-own`       | Own message written and sent; `text` = the message                                    |
| `not-sent`       | Not sent, directly or after starting to write                                         |
| `change`, `own`  | Started writing, no decision yet (unfinished if it stays so)                          |

`first_chosen` holds the option picked first (`send`, `change`, `own` or `dont-send`); `draft-day` holds the chosen day and `draft-variant` the variant (`exact` or `wrong-price`), both saved when the day is picked, since the offer shows only after it. `sent-unchanged` means the message equals the draft of the participant's own variant, so in `wrong-price` it is an offer sent at CHF 35.

The price ladder records each price once when it is shown, as a `shown` event with step `pack-chf-2`, `pack-chf-5` or `pack-chf-8`; `pack-chf-5` is always the first. It stores one answer per price answered: `pack-chf-2`, `pack-chf-5`, `pack-chf-8`, each `yes`, `no` or `not-sure`. The analysis counts a price as asked when it was shown, and a participant as entering the ladder when CHF 5 was shown.

Events, sent in batches and stored once per sequence number, at most 600 per session. A batch the server refuses for good is dropped, so events never hold back answers, the session or the form at the end:

| Kind                                      | Step                                                   | Detail                                                                           |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `shown`, `answered`, `skipped`, `changed` | question                                               |                                                                                  |
| `back`                                    | step left                                              | step returned to                                                                 |
| `scene-played`, `scene-skipped`           | scene step (`app-*` in the core, `tour-*` in the tour) | scene                                                                            |
| `moment-tapped`, `moment-auto`            | tour step                                              | key moment, tapped or advanced by itself (full scenes only, on their first play) |
| `core-complete`, `end`                    |                                                        |                                                                                  |
| `share`                                   |                                                        | `native`, `copy` or `qr`                                                         |
| `language`                                |                                                        | language switched to                                                             |

Not recorded: touch paths, scroll depth, keystrokes, session replay.

In account mode the data is in Supabase, in tables that students cannot read; the server writes them through security-definer functions with its service key. In the local demo it is in the SQLite file. Without `STUDY_CONTACT` and `STUDY_DELETE_BY` the study is closed and only the pitch is available. From the deletion date on it collects nothing: the server still starts and logs one line that the study is closed, and the results page and `POST /api/study/withdrawals` keep working until the data is deleted. The owner deletes sessions, answers, events, end forms, contacts and exports by the deletion date.

## Analysis

Plausible range: two-sided 95% Wilson interval. For a network sample it only illustrates precision. Main figures use everyone who answered the item; subgroups are described next to them, never used to drop anyone.

| Subgroup                 | From                                                      | Used for                                                                 |
| ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Student status           | `who`                                                     | Whether figures depend on non-users                                      |
| Side of the last attempt | `last-role`: buying, getting-free vs selling, giving-away | D2                                                                       |
| Moving by June           | `move` in `move-feb`, `move-jun`                          | D4, its primary group                                                    |
| Draft variant            | `draft-variant`                                           | D5a: each of its rules reads one variant                                 |
| Housing                  | `housing` = `fmel`                                        | D1b, D11                                                                 |
| Bulky item               | `last-item` = `furniture`                                 | D3                                                                       |
| Tried before             | `last-role` is not `none`                                 | D7: the `helped-*` wording differs, so the two groups are reported apart |
| Background               | `age`, `gender`, `level`, `exchange`                      | Persona                                                                  |
| Channel, language        | session                                                   | Sample description                                                       |

The price ladder is counted with implied answers. Everyone who entered the ladder (shown CHF 5) counts at every price. Yes at CHF 8 was yes at CHF 5, and no at CHF 2 was no at CHF 5, so: yes at CHF 5 is `pack-chf-5` `yes`; yes at CHF 8 is `pack-chf-8` `yes`; yes at CHF 2 is `pack-chf-5` `yes` or `pack-chf-2` `yes`. `not-sure`, and leaving while a price was on screen, count as not yes.

Count cutoffs (unrounded Wilson bounds):

| Measure                                                                     | D   | Denominator                           | n = 40  | 60      | 100     | 200      |
| --------------------------------------------------------------------------- | --- | ------------------------------------- | ------- | ------- | ------- | -------- |
| `desk` nearer (or cheaper) > 50%                                            | D1b | answered                              | 27      | 38      | 60      | 114      |
| `last-trouble` nothing ≥ 40%                                                | D2  | tried                                 | 16      | 24      | 40      | 80       |
| `last-trouble` top named ≥ 25%                                              | D2  | tried                                 | 10      | 15      | 25      | 50       |
| `move-it` helper: go ≥ / deprioritise ≤                                     | D3  | answered                              | 11 / 1  | 15 / 3  | 22 / 8  | 40 / 20  |
| yes at CHF 5 ≥ (lower bound ≥ 20%)                                          | D4  | moving by June and entered the ladder | 13      | 19      | 28      | 52       |
| `draft` sent as it is: keep ≥ / as it is + changed: optional ≤              | D5a | completed decisions in `exact`        | 27 / 13 | 38 / 22 | 60 / 40 | 114 / 86 |
| `draft` sent as it is: check step ≥ / no check step ≤                       | D5a | completed decisions in `wrong-price`  | 11 / 1  | 15 / 3  | 22 / 8  | 40 / 20  |
| `sending` short-updates + replies-too: go ≥ / keep manual ≤                 | D5b | answered                              | 27 / 13 | 38 / 22 | 60 / 40 | 114 / 86 |
| `helped-*` yes: keep ≥ / yes + partly: deprioritise ≤                       | D7  | tried, answered                       | 23 / 6  | 32 / 11 | 50 / 21 | 94 / 47  |
| `try-first` top feature ≥ 25%                                               | D7  | answered                              | 10      | 15      | 25      | 50       |
| `try-first` none + need-more ≥ 40%                                          | D7  | answered                              | 16      | 24      | 40      | 80       |
| `stop` one barrier, lower bound ≥ 25%                                       | D8  | answered                              | 16      | 22      | 34      | 63       |
| `stop` nothing ≥ 40%                                                        | D8  | answered                              | 16      | 24      | 40      | 80       |
| `pay-model` leading paid model ≥ (lower bound ≥ 40%), and ≥ 10 points ahead | D9  | chose a paid model                    | 23      | 32      | 50      | 94       |
| `wanted-react` snap ≥ (lower bound ≥ 25%)                                   | D11 | answered                              | 16      | 22      | 34      | 63       |
| `wanted-share` yes ≥ (lower bound ≥ 30%)                                    | D11 | answered                              | 18      | 25      | 39      | 73       |
| `wanted-react` rather-not ≥ (lower bound ≥ 40%)                             | D11 | answered                              | 23      | 32      | 50      | 94       |

Delegation is counted over completed decisions (`sent-unchanged`, `sent-changed`, `sent-own`, `not-sent`) per variant; unfinished drafts (`change` or `own` as final state) are reported over everyone shown the task.

Two team members code every `sent-changed` and `sent-own` text (what was changed or added, and in `wrong-price` whether the price was corrected to CHF 40) and `last-story` independently; agreement (% and Cohen's κ) is reported before disagreements are settled.

## Pre-registration

Frozen with a date before the first invitation, together with the script and the codebook; later changes are listed as deviations. The rules are decisions for the first version of the app, not confirmed findings. Rate rules apply only with at least 40 answers to the item (and in a subgroup, if shown with a range); below that, counts only.

| D   | Success / inconclusive / fail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Also report                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Among forms with "I'd like to try takeover early", per place: a place with ≥ 3 sellers and ≥ 3 buyers and at least 6 people in all (a "both" volunteer can fill either side but counts once) → try takeover there first. Several such places → the one with the most people. No such place → pool nearby places with one pickup point. Count rule, no floor.                                                                                                                                                                                     | Forms per tick; counts per place and role                                                                                                                                                    |
| D1b | Nearer lower bound > 50% → test a second price–distance pair and nearby sorting. Cheaper lower bound > 50% → price sort first. Else open. "Neither" stays in the denominator.                                                                                                                                                                                                                                                                                                                                                                    | FMEL, EPFL/UNIL                                                                                                                                                                              |
| D2  | (1) Nothing ≥ 40% → problem weaker than believed, no nomination. (2) Else top named obstacle ≥ 25% and no tie → nominate it as the first problem to address. (3) Else open.                                                                                                                                                                                                                                                                                                                                                                      | Buyers and sellers separately                                                                                                                                                                |
| D3  | Transport, decided on `move-it`: helper lower bound ≥ 15% → ask a partner for a quote and offer real bookings of a transport helper. Upper bound < 15% → no transport offer; focus on local pickup. Else open. 15% is a team threshold. `delivery-worth` is descriptive: its distribution and its median band (`not-sure` left out) set the price range a partner is asked to quote for, and `nothing` shows how many would fetch a bulky item themselves.                                                                                       | Furniture subgroup; `delivery-worth`, with `not-sure` separately; `last-cost`                                                                                                                |
| D4  | Yes at CHF 5, among those moving by June who entered the ladder, with implied answers and `not-sure` counted as not yes: lower bound ≥ 20% → keep the move-out pack as a paid option. Else no paid pack in the first version. Below 40 movers who entered, counts only.                                                                                                                                                                                                                                                                          | Yes at CHF 2, 5 and 8 over everyone who entered, and over those moving by June                                                                                                               |
| D5a | Delegation, in `exact`: `sent-unchanged` lower bound > 50% → keep Pako's draft as the default for offers and test one-tap sending. `sent-unchanged` + `sent-changed` upper bound < 50% → make the draft optional; offers start from an empty message. Else open. Check step, in `wrong-price`: `sent-unchanged` lower bound ≥ 15% → the app adds a check of the price and details before an offer is sent. Upper bound < 15% → no check step for now. Else open. 15% is a team threshold. Each rule needs 40 completed decisions in its variant. | `sent-unchanged` per variant and the difference between them (Newcombe interval); `sent-own` and `not-sent` separately; unfinished; first vs final choice; corrected prices in `wrong-price` |
| D5b | `short-updates` + `replies-too` lower bound > 50% → prototype the opt-in. Upper bound < 50% → keep "you tap every send". Else open.                                                                                                                                                                                                                                                                                                                                                                                                              | Each option separately; by draft code                                                                                                                                                        |
| D5c | Dropped in `v3-2`: the comprehension item was merged into `sending`. The sentence stays as it is.                                                                                                                                                                                                                                                                                                                                                                                                                                                |                                                                                                                                                                                              |
| D6  | The two most chosen lines go to the poster test; a tie for second sends all tied lines. `none` chosen most → no shortlist, rewrite the lines.                                                                                                                                                                                                                                                                                                                                                                                                    | EPFL/UNIL counts                                                                                                                                                                             |
| D7  | Per feature, over participants who tried (`na` stays in the denominator): `yes` lower bound ≥ 40% → keep the feature as shown. `yes` + `partly` upper bound < 30% → deprioritise it in the onboarding. Else open. `try-first`: the most chosen feature with ≥ 25% and no tie leads the onboarding; `none` + `need-more` ≥ 40% → rewrite how the features are introduced. 40% and 30% are team thresholds.                                                                                                                                        | Never-tried answers ("Would this feature help you if you wanted to buy or sell something used?") descriptively; scenes skipped vs played                                                     |
| D9  | First `free` against the paid options, over everyone who chose a card: `free` chosen more often than `seller-fee`, `move-pack` and `monthly` together → no paid model is tested yet; the paid shares are reported descriptively. Otherwise, among those who chose a paid model: a model leads if its share's lower bound ≥ 40% and it is at least 10 percentage points ahead of the next paid model; it is tested first. Else no model leads. `not-sure` is left out of both steps.                                                              | `free` and `not-sure` shares; EPFL/UNIL; `institution-pay`                                                                                                                                   |
| D11 | `snap` lower bound ≥ 25% and `wanted-share` `yes` lower bound ≥ 30% → build "Wanted nearby" into the first version. `rather-not` lower bound ≥ 40% → drop it. Else open. If both the build and the drop condition hold, it stays open.                                                                                                                                                                                                                                                                                                           | `look` and `maybe` separately; FMEL residents                                                                                                                                                |
| D8  | Each barrier with a lower bound ≥ 25% gets a named counter-measure in the launch plan (for example `nobody-nearby` → one residence at a time, `ai-mistakes` → a check of the details before a draft is sent, `prefer-groups` → posting listings into existing groups). `nothing` ≥ 40% → no main barrier. Else open. Several barriers per participant; the denominator is participants who answered.                                                                                                                                             | "Something else" texts, coded like `last-story`                                                                                                                                              |

`institution-pay` has no decision rule; it is reported as counts with ranges.

## Threats to validity

| Threat                             | Where                                                                                                                                                             | Mitigation                                                                                                                                                                                                                                                                     | What remains                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pako asks the product questions    | `helped-*`, `stop`, `try-first`, `wanted-react`, `wanted-share`, `headline`, `move-it`, `sending`, `pack-chf-*`, `pay-model`, `institution-pay`, `delivery-worth` | Neutral wording, outside options, "the app" in questions, no reaction to product answers; real behaviour weighs more                                                                                                                                                           | Product answers likely lean positive; size unknown                                                                                                    |
| Self-selection, course peers       | Everything                                                                                                                                                        | Neutral invitation, channel tags, subgroups described                                                                                                                                                                                                                          | No campus-wide rates                                                                                                                                  |
| No time window on the last attempt | `last-trouble`, `last-item`                                                                                                                                       | `last-occasion` and side describe the episode                                                                                                                                                                                                                                  | Older episodes recalled less precisely                                                                                                                |
| Fixed section order                | All                                                                                                                                                               | Shuffled options with stored order; `what-is` lists no features before `last-trouble`; the scenes before the slogans; the desk before the helper, so its prices do not follow the CHF 15 helper; `sending` after the draft task, so it does not frame the task                 | Same order for everyone; the features always run find, sell, deal; the slogans are read after the scenes; `sending` is answered right after the draft |
| Short scenes as the stimulus       | `helped-*`, `stop`, `try-first`, `headline`                                                                                                                       | Pako's line says what each scene shows; Replay; skipped scenes are logged                                                                                                                                                                                                      | A 12-second demo, not use: answers describe a first impression                                                                                        |
| Two wordings of one question       | `helped-*`                                                                                                                                                        | Tried and never tried reported apart                                                                                                                                                                                                                                           | The two groups' answers are not comparable                                                                                                            |
| One planted error in the draft     | `draft`                                                                                                                                                           | The variant is drawn at random and stored; delegation is read in `exact`, the check step in `wrong-price`                                                                                                                                                                      | One kind of error of one size (CHF 5 too little); each rule rests on about half the sample                                                            |
| Imagined vs real behaviour         | `draft`, `move-it`, `desk`                                                                                                                                        | Every "go" is checked against real use after launch                                                                                                                                                                                                                            | Stated choices run high                                                                                                                               |
| Hypothetical bias in prices        | `pack-chf-*`, `pay-model`, `delivery-worth`                                                                                                                       | Real money named ("CHF {price} of your own money"), the free alternative stated on the pack card, outside options (`free`, `not-sure`, `no`, `nothing`); across 77 studies stated willingness to pay averaged about 21% above real willingness to pay (Schmidt & Bijmolt 2020) | No numeric correction is applied: on this sample it would add false precision. Real purchases after launch decide                                     |
| Anchoring on prices                | `pack-chf-*`, `pay-model`                                                                                                                                         | Everyone starts the ladder at CHF 5, so all answers share one anchor; the ladder comes before `pay-model`                                                                                                                                                                      | The effect of the start price cannot be measured; the `pay-model` card for the pack repeats CHF 5 just after the ladder                               |
| Shown results                      | Later participants                                                                                                                                                | Only after the core, two items, from 20 answers of the same wording version                                                                                                                                                                                                    |                                                                                                                                                       |
| Three languages                    | All                                                                                                                                                               | One dictionary per language with equivalent meaning; language stored per session                                                                                                                                                                                               | Small wording differences between languages; report n per language                                                                                    |
| Two versions running               | v1 and v3                                                                                                                                                         | Each session stores its version; analysed separately                                                                                                                                                                                                                           | Channels may favour one link                                                                                                                          |
| Repeat answers                     | Counts                                                                                                                                                            | Browser marker                                                                                                                                                                                                                                                                 | Private windows bypass it                                                                                                                             |

## Reporting template

One block per decision, same order and colours every time. Symbol and word always shown with the colour; bars in a neutral colour, outcome colour only on the badge.

| Outcome      | Meaning                                      | Colour          | Symbol |
| ------------ | -------------------------------------------- | --------------- | ------ |
| Success      | Threshold for the planned change met         | green `#1E7B3A` | ✓      |
| Inconclusive | Between thresholds, or fewer than 40 answers | grey `#7A7F87`  | –      |
| Fail         | Opposite threshold met                       | red `#B3261E`   | ✗      |

```
D1b Sorting                                          [✓ Success]
Question   Nearer desk (CHF 45, 200 m), cheaper (CHF 30, 4 km), or neither?
Result     64 of 100 chose the nearer desk: 64% (plausible range 54–73%)
           cheaper 28 · neither 8
Rule       Success if the range starts above 50%  →  met
Action     Test a second price–distance pair and nearby sorting
Subgroups  FMEL 30/42 · other 34/58 · EPFL/UNIL 51/80     descriptive
Limit      Imagined choice, one price/distance pair; self-selected sample
```

Every block: k of n with the denominator named, the range, the rule and its outcome, one line of limitation. The numbers above are placeholders.

## Before launch

1. Pretest done (it runs `v3-8`); wording and `{measured}` fixed; wording version raised for the run.
2. This protocol frozen with a date.
3. Pretest sessions deleted. "How others answered" counts one wording version, so pretest answers do not show there in any case.
4. `STUDY_CONTACT` and `STUDY_DELETE_BY` set on the deployment.
5. The migration reviewed and applied.
6. Server logs checked for request addresses.
7. QR codes generated per channel and tested at poster distance.

## Results page

Admins see the counts in the app under Admin → Study, read through `GET /api/study/report`. In account mode the server passes the signed-in user to `study_report_rows`, which refuses anyone not in `public.admins`; the server calls it with its service key. In the local demo the admin area opens in developer mode, as the rest of it does.

The page shows one wording version at a time, the newest first: sessions per UTC day and channel, how many sessions reached each core screen (the part screens included), the last screen of those who left before the core was saved, counts per option over the participants who answered (skips excluded), typed answers sorted alphabetically without session ids (offers sent as Pako drafted them are left out), the move-out pack's acceptance per price over everyone who entered the ladder, with implied answers, the two "Wanted nearby" questions together, and the forms at the end: each tick, and those who want to try takeover early per place and role. Any breakdown count from 1 to 4 shows as "<5". Decision outcomes come from the queries below.

## Results queries

Run these in the Supabase SQL editor, which connects with the owner role and can read the study tables. Each query reads v3 sessions of one wording version: replace `v3-1` with the version of the real run. Intervals and rule outcomes are computed from the counts (`k` = `chosen`, `n` = `answered`).

Tables in `takeover_admin`: `study_sessions`, `study_answers`, `study_events`, `study_pilot` (the form at the end), and `study_contacts` (v1 only).

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

For the descriptive steps (`who`, `last-occasion`, `why-not`, `move`, `housing`, `age`, `gender`, `level`, `exchange`, `scene-pick`, `last-cost`, `institution-pay`). Change the step id. Skips are not counted.

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

### D1 Those who want to try takeover early, per place

A "both" volunteer can fill either side but counts once.

```sql
-- d1-places
with sides as (
  select place,
    count(*) filter (where role = 'seller') as sellers,
    count(*) filter (where role = 'buyer') as buyers,
    count(*) filter (where role = 'both') as both_roles
  from takeover_admin.study_pilot
  where try_early
  group by place
)
select place, sellers, buyers, both_roles, sellers + buyers + both_roles as people,
  sellers + both_roles >= 3 and buyers + both_roles >= 3
    and sellers + buyers + both_roles >= 6 as meets_rule
from sides
order by meets_rule desc, people desc, place;
```

### D1 Forms at the end

Denominator: participants shown the form.

```sql
-- d1-forms
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select
  (select count(distinct e.session) from takeover_admin.study_events e join run on run.id = e.session
    where e.kind = 'shown' and e.step = 'pilot') as form_shown,
  count(*) as forms,
  count(*) filter (where launch_news) as launch_news,
  count(*) filter (where try_early) as try_early,
  count(*) filter (where future_surveys) as future_surveys
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

`move-it` decides; `delivery-worth` describes. Its median band is read from the counts with `not-sure` left out.

```sql
-- d3-transport
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'last-item' and a.chosen && array['furniture']
), answers as (
  select a.step, option,
    case when a.session in (select session from subgroup) then 'furniture' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session cross join unnest(a.chosen) as option
  where a.step in ('move-it', 'delivery-worth')
)
select step as item, coalesce(part, 'all') as subgroup, option, count(*) as chosen,
  sum(count(*)) over (partition by step, coalesce(part, 'all')) as answered
from answers
group by grouping sets ((step, option), (step, part, option))
order by item, subgroup, chosen desc, option;
```

### D4 Pack price ladder

Everyone who entered the ladder (shown CHF 5), with implied answers: yes at CHF 2 includes yes at CHF 5. A participant who left while a price was on screen, or was not sure, counts as not yes. In total and for those moving by June against the rest.

```sql
-- d4-ladder
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), entered as (
  select distinct e.session from takeover_admin.study_events e join run on run.id = e.session
  where e.kind = 'shown' and e.step = 'pack-chf-5'
), moving as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'move' and a.chosen && array['move-feb', 'move-jun']
), ladder as (
  select x.session,
    case when x.session in (select session from moving) then 'moving-by-june' else 'rest' end as part,
    (select a.chosen[1] from takeover_admin.study_answers a
      where a.session = x.session and a.step = 'pack-chf-2') as at_2,
    (select a.chosen[1] from takeover_admin.study_answers a
      where a.session = x.session and a.step = 'pack-chf-5') as at_5,
    (select a.chosen[1] from takeover_admin.study_answers a
      where a.session = x.session and a.step = 'pack-chf-8') as at_8
  from entered x
)
select coalesce(part, 'all') as subgroup, count(*) as entered,
  count(*) filter (where at_5 = 'yes' or at_2 = 'yes') as yes_2,
  count(*) filter (where at_5 = 'yes') as yes_5,
  count(*) filter (where at_8 = 'yes') as yes_8
from ladder
group by grouping sets ((), (part))
order by subgroup;
```

### D5a Delegation and the wrong price

Per variant; each rule of D5a reads its own variant's rows.

```sql
-- d5a-draft
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
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

### D5a Changed and own offers to code

```sql
-- d5a-texts
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
)
select a.session, v.chosen[1] as variant, a.chosen[1] as final, d.chosen[1] as chosen_day, a.text
from takeover_admin.study_answers a
join run on run.id = a.session
left join takeover_admin.study_answers d on d.session = a.session and d.step = 'draft-day'
left join takeover_admin.study_answers v on v.session = a.session and v.step = 'draft-variant'
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

### D9 Pay model

All participants, and EPFL/UNIL students against the rest. `paid_answered` is the denominator of the paid ranking; `free` is compared with the sum of the paid rows.

```sql
-- d9-pay-model
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), subgroup as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'who' and a.chosen && array['epfl', 'unil']
), answers as (
  select a.chosen[1] as model,
    case when a.session in (select session from subgroup) then 'epfl-unil' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'pay-model' and cardinality(a.chosen) > 0
)
select coalesce(part, 'all') as subgroup, model,
  model in ('seller-fee', 'move-pack', 'monthly') as paid,
  count(*) as chosen,
  sum(count(*)) over (partition by coalesce(part, 'all')) as answered,
  sum(count(*)) filter (where model in ('seller-fee', 'move-pack', 'monthly'))
    over (partition by coalesce(part, 'all')) as paid_answered
from answers
group by grouping sets ((model), (part, model))
order by subgroup, paid desc, chosen desc, model;
```

### D11 Wanted nearby

All participants, and FMEL residents against the rest.

```sql
-- d11-wanted
with run as (
  select id from takeover_admin.study_sessions where survey = 'v3' and version = 'v3-1'
), fmel as (
  select a.session from takeover_admin.study_answers a join run on run.id = a.session
  where a.step = 'housing' and a.chosen && array['fmel']
), answers as (
  select a.step, a.chosen[1] as answer,
    case when a.session in (select session from fmel) then 'fmel' else 'rest' end as part
  from takeover_admin.study_answers a join run on run.id = a.session
  where a.step in ('wanted-react', 'wanted-share') and cardinality(a.chosen) > 0
)
select step, coalesce(part, 'all') as subgroup, answer, count(*) as chosen,
  sum(count(*)) over (partition by step, coalesce(part, 'all')) as answered
from answers
group by grouping sets ((step, answer), (step, part, answer))
order by step, subgroup, chosen desc, answer;
```

### Deleting the data

Run this by the deletion date. It removes the forms at the end, the v1 contacts and all sessions of both versions with their answers and events. Delete any exports as well.

```sql
delete from takeover_admin.study_pilot;
delete from takeover_admin.study_contacts;
delete from takeover_admin.study_sessions;
```
