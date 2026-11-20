# User study on the tour page, version 1

This is the first version of the questionnaire. It runs at `/tour?s=<tag>&v=1` next to version 3 (`/tour?s=<tag>`, protocol in [STUDY.md](STUDY.md)), so both can be compared. Its sessions are stored with `survey = 'v1'`.

Pako asks about the participant's last real purchase or sale, gives two short tasks, shows the tour and asks a few questions about it.

This file is the protocol. The questions in `src/tour/tourScript.ts` follow it. Decision rules are filled in before launch and not changed afterwards.

## What we want to learn

| # | Question | Measured by |
| --- | --- | --- |
| L1 | Which part of buying or selling second-hand is hard for students? | Part B: the last real attempt, how it ended, what made it hard, how the item was moved |
| L2 | Does nearness outweigh price? | Task C1: the nearer desk or the cheaper one further away |
| L3 | Do students check what Pako drafts for them? | Task C2: a draft with one wrong detail. Is it sent as written, corrected, replaced or not sent? |
| L4 | Who would take part in a test with real items? | Part F: something to sell or needed within four weeks, and a contact address |

Exploratory, reported without decision rules: which features participants say they would use (D1), what is missing (D2), how much Pako may do without asking (E1), and the optional questions about the participant (G).

What this study cannot show: whether students complete real transactions with takeover, or how well the model performs. The tasks are scripted. They show what participants choose in one described situation.

## Participants

- Eligible for the decision rules: students at EPFL or UNIL (A1) with at least one attempt in the last 12 months (B1). Everyone else is reported separately.
- Recruitment: Moodle Peer Support forum, QR code on slides, residence group chats, personal invitations. Each channel has its own tag in the link (`?s=moodle`, `?s=slides`, `?s=fmel`, `?s=friends`).
- The study link opens with a neutral invitation, not with the pitch, so the questions about past behaviour come before any product screen.
- A pilot with three to five people comes first. Pilot answers carry their own version label and are not counted.

## Script

Pako speaks in the first person. Single choice unless marked. "Shuffled" means the options appear in random order and the order is stored.

### Start and consent

| Step | Pako says | Options |
| --- | --- | --- |
| Invitation | "Hi, I'm Pako! I'm the helper in takeover, a student project at EPFL. I'd like to ask about the last time you bought or sold something second-hand, then show you what we're building. It takes about 4 minutes." | Start · Just show me the tour |
| Consent | "Before we start": your answers are saved without your name. I also save how long each step takes, which link brought you here and whether you're on a phone or a computer. Your IP address isn't saved with your answers. An email address is optional, at the end, and stored separately. Everything is deleted by {date}. Questions: {contact}. | I'm 18 or older and I agree · No thanks, just show me the tour |

Declining opens the pitch tour. No session is created and nothing is stored.

### Part A: about you

| Id | Question | Options |
| --- | --- | --- |
| `student` | Are you a student? | Yes, at EPFL · Yes, at UNIL · Yes, somewhere else · No |
| `housing` | Where do you live at the moment? | FMEL residence · Shared flat · My own flat or studio · With family · Somewhere else |

### Part B: your last time

| Id | Question | Options |
| --- | --- | --- |
| `last-role` | Think of the last time you tried to buy, sell or give away a used item. What were you doing? | Buying · Selling · Giving it away · I haven't tried in the last 12 months (skips to part C) |
| `last-occasion` | What was the occasion? | Moving in · Moving out · Neither, it was during the year |
| `last-outcome` | How did it end? | It worked out · I gave up · It's still open |
| `last-story` | In a few words, what happened? | Short text, can be skipped |
| `last-hard` | What made it hard? Pick all that apply. (multiple, shuffled) | Finding the right item or a buyer · Writing the listing · Agreeing on a price · Slow or no replies · A pickup that fell through · Finding a time that worked · Getting the item from A to B · Not sure I could trust the other person · then, always last: Nothing, it was easy · Something else (short text) |
| `last-transport` | How did the item get from A to B? | On foot · By bike · Public transport · Car or van · Delivery or post · It didn't |
| `attempts` | How often did you try to buy, sell or give away something used in the last 12 months? | Once · 2 to 5 times · More than 5 times |

### Part C: two tasks

Pako: "Thanks! Now two short situations. Nothing here is real and nothing gets sent."

**C1 `nearer-or-cheaper`.** "You need a desk. I found two that fit. Which one would you go for?" Two cards in random order, same desk and condition:

- CHF 45, in your residence, 200 m
- CHF 30, Lausanne centre, 4 km

Third option: Neither. If the cheaper desk is chosen, `far-transport` asks "How would you get it home?" with the transport options from part B and "Not sure yet".

**C2 `draft-check`.** Situation: "You'd like Mia's desk. You told her you can only pick it up on Saturday." Pako: "I drafted your offer. Check it, then decide." The draft reads: "Hi Mia! I'd like your white work desk. Would CHF 40 work? I could pick it up on Friday at 17:30 at FMEL Atrium."

Actions: Send offer · Edit (the text becomes editable, then Send offer) · Write my own · Don't send.

Stored: the action, and whether the message that was sent still says Friday (`friday-kept`, `friday-fixed`) or nothing was sent (`not-sent`).

Afterwards Pako explains: "One thing: the draft said Friday, but you'd said Saturday. That was on purpose. We want to see how drafts get checked." `draft-why` then asks "What made you choose that?" (short text, can be skipped).

### Part D: the tour

Pako: "Now the short tour. This is how takeover works." Three scripted scenes from the app's intro play in a phone frame: a listing drafted from a photo, a deal both students confirm, a search.

| Id | Question | Options |
| --- | --- | --- |
| `would-use` | Which of these would you use? Pick any. (multiple, shuffled) | Search by describing what I need · A listing drafted from my photos · A price suggestion from similar offers · Offer drafts I can edit and send · Pickup with confirmations and reminders · then, always last: None of these |
| `missing` | What's missing, or what would stop you from using it? | Short text, can be skipped |

### Part E: Pako's limits

| Id | Question | Options |
| --- | --- | --- |
| `autonomy` | What should I be allowed to do without asking you first? | Nothing. I send everything myself · Short updates like "On my way" · Replies to simple questions · Negotiate within limits I set |

### Part F: staying in touch

| Id | Question | Options |
| --- | --- | --- |
| `need-soon` | In the next four weeks, do you have something to sell or do you need something? | Something to sell · I need something · Both · Neither |
| Contact | Can we email you two or three follow-up questions, or an invitation when we test with real items? | Email field, optional. Two ticks: "Invite me to the test with real items" and "Link this address to my answers". Send · Skip |

### Part G: about you (each can be skipped)

| Id | Question | Options |
| --- | --- | --- |
| `age` | How old are you? | 18–20 · 21–23 · 24–26 · 27 or older · Prefer not to say |
| `gender` | Your gender? | Woman · Man · Non-binary · Prefer not to say |
| `level` | What are you studying towards? (students only) | Bachelor · Master · PhD · Exchange semester · Something else |

### End

"Thanks! That helps us decide what to build next." Open takeover · Share the study (copies the link with the tag `friend`).

## Results and decision rules

Results are reported as counts with their denominators, split by channel and for eligible participants only. The open answers (`last-story`, `draft-why`, `missing`) are coded by two team members.

The team writes one rule per learning question before launch, in this form, and states why the numbers justify the next step:

| # | If | Then |
| --- | --- | --- |
| L1 | _to fill in: for example, transport is among the two most-named obstacles_ | _for example, the next test is about distance and transport, not listing creation_ |
| L2 | _to fill in: for example, at least X of Y eligible participants choose the nearer desk_ | _for example, launch in the residences first_ |
| L3 | _to fill in: for example, more than X of Y send the draft with the wrong day_ | _for example, drafts get a check step that shows what Pako assumed_ |
| L4 | _to fill in: for example, at least N eligible participants leave a contact and have something to sell or need_ | _run the test with real items with them_ |

With a sample of this size the results justify the next test. They are not adoption rates.

## Data handling

- Nothing is stored before the participant confirms being 18 or older and agrees.
- Stored per session: a random id, the script version, the channel tag, phone or desktop, and per step the chosen options, the order shown, a short text and the time on the step. No name, no IP address, no browser details.
- The email address is optional and kept in a separate table. It is linked to a session only if the participant ticks that box.
- In account mode the data is in Supabase, in tables that students cannot read. The server writes them with its service key. In the local demo they are in the SQLite file.
- The contact address and the deletion date come from the deployment (`STUDY_CONTACT`, `STUDY_DELETE_BY`). Without both, the study is closed and only the pitch tour is available.
- The owner deletes sessions, answers, contacts and any exports by the deletion date.

## Before launch

1. The team fills in the decision rules above.
2. `STUDY_CONTACT` and `STUDY_DELETE_BY` are set on the deployment.
3. The migration is reviewed and applied.
4. The pilot is done, wording is fixed and the script version is raised.
5. The server's logs are checked for request addresses before the consent text is used.
6. QR codes are generated per channel.

## Results queries

Run these in the Supabase SQL editor, which connects with the owner role and can read the study tables. Students and the app's public keys cannot. Each query reads v1 sessions (`survey = 'v1'`) of one script version: replace `pilot-1` with the version of the real run, so pilot answers are left out. Option ids are the ones in `src/tour/tourScript.ts`.

The tables are `takeover_admin.study_sessions` (one row per participant), `takeover_admin.study_answers` (one row per participant and step) and `takeover_admin.study_contacts` (one row per address). A step the participant went back to keeps only its latest answer.

Eligible participants are students at EPFL or UNIL (`student`) with at least one attempt in the last 12 months (`last-role`). Each query that needs them starts with the same `eligible` block.

### Participants by channel and eligibility

```sql
with eligible as (
  select s.id from takeover_admin.study_sessions s
  where s.survey = 'v1' and s.version = 'pilot-1'
    and exists (select 1 from takeover_admin.study_answers a
      where a.session = s.id and a.step = 'student' and a.chosen && array['yes-epfl', 'yes-unil'])
    and exists (select 1 from takeover_admin.study_answers a
      where a.session = s.id and a.step = 'last-role' and a.chosen && array['buying', 'selling', 'giving-away'])
)
select s.source,
  count(*) as participants,
  count(*) filter (where s.id in (select id from eligible)) as eligible
from takeover_admin.study_sessions s
where s.survey = 'v1' and s.version = 'pilot-1'
group by s.source
order by participants desc;
```

### Last step reached

The step of each participant's most recent save. A participant who went back and changed an earlier step is counted at that step.

```sql
select last_step.step, count(*) as participants
from (
  select distinct on (session) session, step
  from takeover_admin.study_answers
  where session in (select id from takeover_admin.study_sessions where survey = 'v1' and version = 'pilot-1')
  order by session, saved_at desc
) last_step
group by last_step.step
order by participants desc;
```

### Counts per option for one step

Change the step id. `answered` is the denominator: participants who saved this step. Free text is not part of this query.

```sql
select option, count(*) as chosen,
  (select count(*) from takeover_admin.study_answers
    where step = 'last-hard'
      and session in (select id from takeover_admin.study_sessions where survey = 'v1' and version = 'pilot-1')) as answered
from takeover_admin.study_answers a, unnest(a.chosen) as option
where a.step = 'last-hard'
  and a.session in (select id from takeover_admin.study_sessions where survey = 'v1' and version = 'pilot-1')
group by option
order by chosen desc;
```

### C1 and C2 for eligible participants

`nearer-or-cheaper` stores `nearer`, `cheaper` or `neither`. `draft-check` stores the action together with `friday-kept`, `friday-fixed` or `not-sent`.

```sql
with eligible as (
  select s.id from takeover_admin.study_sessions s
  where s.survey = 'v1' and s.version = 'pilot-1'
    and exists (select 1 from takeover_admin.study_answers a
      where a.session = s.id and a.step = 'student' and a.chosen && array['yes-epfl', 'yes-unil'])
    and exists (select 1 from takeover_admin.study_answers a
      where a.session = s.id and a.step = 'last-role' and a.chosen && array['buying', 'selling', 'giving-away'])
)
select 'C1' as task, option as result, count(*) as participants,
  (select count(*) from eligible) as eligible
from takeover_admin.study_answers a, unnest(a.chosen) as option
where a.step = 'nearer-or-cheaper' and a.session in (select id from eligible)
group by option
union all
select 'C2', option, count(*), (select count(*) from eligible)
from takeover_admin.study_answers a, unnest(a.chosen) as option
where a.step = 'draft-check' and a.session in (select id from eligible)
  and option in ('friday-kept', 'friday-fixed', 'not-sent')
group by option
order by 1, 3 desc;
```

### Contacts with their pilot flag

`session` is set only when the participant agreed to link the address to their answers. The channel and the `need-soon` answer are shown for those rows only.

```sql
select c.email, c.pilot, c.created_at, s.source,
  (select a.chosen from takeover_admin.study_answers a
    where a.session = c.session and a.step = 'need-soon') as need_soon
from takeover_admin.study_contacts c
left join takeover_admin.study_sessions s on s.id = c.session
order by c.created_at;
```

### Deleting the data

The statements in [STUDY.md](STUDY.md#deleting-the-data) delete the data of both versions.
