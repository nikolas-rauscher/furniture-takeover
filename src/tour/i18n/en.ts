/**
 * Every word of the tour page in English, the reference for the other languages.
 * The app's own screens inside the phones stay in English and are not listed here.
 */
const helped = {
  question: "Would this have helped you last time?",
  options: {
    yes: "Yes",
    partly: "Partly",
    no: "No",
    na: "Doesn't apply to me",
  },
};

export const EN = {
  locale: "en-GB",
  common: {
    language: "Language",
    languageNames: { en: "English", fr: "Français", de: "Deutsch" },
    surveyHeading: "takeover survey",
    surveyUpdated: "The survey was updated, so it starts again.",
    back: "Back",
    continue: "Continue",
    skip: "Skip",
    send: "Send",
    tryAgain: "Try again",
    openApp: "Open takeover",
    textCount: (count: number, max: number) => `${count} of ${max} characters`,
    optional: "Your answer (optional)",
    inAFewWords: (option: string) => `${option}: in a few words (optional)`,
    save: {
      saved: "Your answers are saved.",
      saving: "Saving your answers…",
      failed:
        "Some of your answers aren't saved yet. Check your connection, then try again.",
    },
  },
  notices: {
    loading: {
      title: "One moment…",
      text: "I'm getting the survey ready.",
    },
    invalidLink: {
      title: "This survey link isn't complete.",
      text: "You can still see the tour of takeover.",
    },
    unreachable: {
      title: "I can't reach the survey right now.",
      text: "Check your connection and try again, or see the tour instead.",
    },
    closed: {
      title: "The survey is closed at the moment.",
      text: "Thanks for stopping by. You can still see the tour of takeover.",
    },
    doneBefore: {
      title: "You've already taken part.",
      text: "Thanks! This browser remembers that you finished. You can still see the tour of takeover.",
    },
    showTour: "Show me the tour",
    loadFailed: {
      title: "Connection unavailable",
      text: "The tour could not load. Check your connection and reload the page.",
    },
  },
  scenes: {
    find: {
      title: "Just say what you need",
      text: "Someone near Vortex needs a desk. I check student listings and draft the offer. Nothing is sent without their tap.",
      label:
        "Example in the app: a student types “a desk under CHF 80 near Vortex”, Pako searches student listings and shows two desks, and the student opens the compact study desk and sends Pako's offer of CHF 35 to Léa.",
    },
    sell: {
      title: "Start with a photo",
      text: "Léa takes a photo of her desk. I write the listing and suggest a price. She picks her own and saves it.",
      label:
        "Example in the app: Léa adds a photo of her desk, Pako writes the listing and asks when buyers can pick it up, suggests CHF 35, and Léa sets CHF 40 and saves the listing on her device.",
    },
    deal: {
      title: "Agree and pick up",
      text: "Noah offers CHF 35 and Léa confirms, so the pickup is booked. At pickup time both of them confirm the handover.",
      label:
        "Example in the app: Noah offers CHF 35 for Léa's desk, Léa taps Confirm sale, the pickup is booked and counts down, Noah taps Picked up and Léa marks the desk sold.",
    },
  },
  pitch: {
    title: "Second-hand finds from students.",
    lead: "Pako helps you find items, write listings and agree on a pickup with students around EPFL, UNIL and the FMEL residences. You decide what gets sent.",
    seeHow: "See how it works",
    replay: "Replay",
    exampleScreen: (title: string) => `${title}, example screen`,
    sections: {
      find: {
        title: "Find",
        sentences: [
          "Write what you need in your own words, like a message to a friend.",
          "Pako checks student listings near you and shows what fits and what to check.",
        ] as [string, string],
      },
      sell: {
        title: "Sell",
        sentences: [
          "Start with a photo of the item.",
          "Pako drafts the listing and a price from similar offers, and you check it before you publish.",
        ] as [string, string],
      },
      agree: {
        title: "Agree and pick up",
        sentences: [
          "Pako reads replies and suggests what to say. You choose what to send.",
          "A deal needs both students to confirm, and then the pickup is booked.",
        ] as [string, string],
      },
    },
    backAndForth: {
      title: "Pako handles the back-and-forth",
      sentences: [
        "Without takeover, one desk means posts in many places, many messages and a pickup to arrange.",
        "Pako sorts the listings and drafts the offer. Your tap sends it, both of you confirm, and updates on the day are one tap.",
      ] as [string, string],
      chapters: { search: "Search", messages: "Messages", pickup: "Pickup" },
      lines: {
        scattered:
          "Desks are posted in many places, and every seller gets the same questions.",
        sorted:
          "I check student listings and keep what fits: two desks under CHF 80 near Vortex.",
        pile: "Then the messages start: the price, the time, the place, and someone running late.",
        offer:
          "I put the price, the time and the meeting point into one offer. You check it.",
        sent: "Only your tap sends it. I never send anything myself.",
        booked: "Léa confirms on her side, so the pickup is booked.",
        reminder: "Before the pickup, a reminder.",
        underway: "On the way, one tap tells Léa: On my way, or Running late.",
        done: "After the handover you tap Picked up. Done.",
      },
      label:
        "Animation in three parts. Search: desks posted in many places shrink into Pako's short list of two that fit. Messages: a pile of questions becomes one offer with price, time and meeting point, which the student sends with a tap. Pickup: Léa confirms, the pickup is booked, a reminder arrives, the student taps On my way and, after the handover, Picked up.",
    },
    principlesTitle: "What stays true",
    principles: {
      send: {
        title: "Nothing is sent without your tap",
        text: "Pako drafts messages and offers. You decide what goes out.",
      },
      students: {
        title: "For EPFL and UNIL students",
        text: "Accounts need an @epfl.ch or @unil.ch address.",
      },
      prices: {
        title: "Prices with their sources",
        text: "A suggested price shows the offers it is based on.",
      },
    },
    invite: {
      title: "Help us decide what to build next",
      text: (minutes: number) =>
        `Pako asks about the last time you bought, sold or gave away something used, then shows a few short situations. It takes about ${minutes} minutes.`,
      action: "Take part",
    },
    footer: "takeover is a student project of the course CS-500 at EPFL.",
  },
  v1: {
    invitation:
      "Hi, I'm Pako! I'm the helper in takeover, a student project at EPFL. I'd like to ask about the last time you bought or sold something second-hand, then show you what we're building. It takes about 4 minutes.",
    start: "Start",
    justTour: "Just show me the tour",
    consentTitle: "Before we start",
    consent: {
      anonymous: "Your answers are saved without your name.",
      extra:
        "I also save how long each step takes, which link brought you here and whether you're on a phone or a computer.",
      ip: "Your IP address isn't saved with your answers.",
      email: "An email address is optional, at the end, and stored separately.",
      deleted: (date: string) => `Everything is deleted by ${date}.`,
      questions: "Questions:",
    },
    agree: "I agree",
    decline: "No thanks, just show me the tour",
    progress: "Study progress",
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    steps: {
      student: {
        question: "Are you a student?",
        options: {
          "yes-epfl": "Yes, at EPFL",
          "yes-unil": "Yes, at UNIL",
          "yes-elsewhere": "Yes, somewhere else",
          no: "No",
        },
      },
      housing: {
        question: "Where do you live at the moment?",
        options: {
          fmel: "FMEL residence",
          "shared-flat": "Shared flat",
          "own-flat": "My own flat or studio",
          "with-family": "With family",
          elsewhere: "Somewhere else",
        },
      },
      "last-role": {
        question:
          "Think of the last time you tried to buy, sell or give away a used item. What were you doing?",
        options: {
          buying: "Buying",
          selling: "Selling",
          "giving-away": "Giving it away",
          "not-tried": "I haven't tried in the last 12 months",
        },
      },
      "last-occasion": {
        question: "What was the occasion?",
        options: {
          "moving-in": "Moving in",
          "moving-out": "Moving out",
          "during-year": "Neither, it was during the year",
        },
      },
      "last-outcome": {
        question: "How did it end?",
        options: {
          "worked-out": "It worked out",
          "gave-up": "I gave up",
          "still-open": "It's still open",
        },
      },
      "last-hard": {
        question: "What made it hard? Pick all that apply.",
        options: {
          finding: "Finding the right item or a buyer",
          listing: "Writing the listing",
          price: "Agreeing on a price",
          replies: "Slow or no replies",
          "pickup-fell-through": "A pickup that fell through",
          timing: "Finding a time that worked",
          transport: "Getting the item from A to B",
          trust: "Not sure I could trust the other person",
          nothing: "Nothing, it was easy",
          "something-else": "Something else",
        },
      },
      "last-transport": {
        question: "How did the item get from A to B?",
        options: {
          "on-foot": "On foot",
          bike: "By bike",
          "public-transport": "Public transport",
          car: "Car or van",
          delivery: "Delivery or post",
          didnt: "It didn't",
        },
      },
      attempts: {
        question:
          "How often did you try to buy, sell or give away something used in the last 12 months?",
        options: {
          once: "Once",
          "two-to-five": "2 to 5 times",
          "more-than-five": "More than 5 times",
        },
      },
      "nearer-or-cheaper": {
        question:
          "You need a desk. I found two that fit. Which one would you go for?",
        options: {
          nearer: "CHF 45",
          cheaper: "CHF 30",
          neither: "Neither",
        },
      },
      "far-transport": {
        question: "How would you get it home?",
        options: {
          "on-foot": "On foot",
          bike: "By bike",
          "public-transport": "Public transport",
          car: "Car or van",
          delivery: "Delivery or post",
          "not-sure": "Not sure yet",
        },
      },
      "would-use": {
        question: "Which of these would you use? Pick any.",
        options: {
          "describe-search": "Search by describing what I need",
          "photo-listing": "A listing drafted from my photos",
          "price-suggestion": "A price suggestion from similar offers",
          "offer-drafts": "Offer drafts I can edit and send",
          "pickup-reminders": "Pickup with confirmations and reminders",
          none: "None of these",
        },
      },
      autonomy: {
        question: "What should I be allowed to do without asking you first?",
        options: {
          nothing: "Nothing. I send everything myself",
          "short-updates": "Short updates like “On my way”",
          "simple-replies": "Replies to simple questions",
          negotiate: "Negotiate within limits I set",
        },
      },
      "need-soon": {
        question:
          "In the next four weeks, do you have something to sell or do you need something?",
        options: {
          sell: "Something to sell",
          need: "I need something",
          both: "Both",
          neither: "Neither",
        },
      },
      age: {
        question: "How old are you?",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-plus": "27 or older",
          "no-answer": "Prefer not to say",
        },
      },
      gender: {
        question: "Your gender?",
        options: {
          woman: "Woman",
          man: "Man",
          "non-binary": "Non-binary",
          "no-answer": "Prefer not to say",
        },
      },
      level: {
        question: "What are you studying towards?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "PhD",
          exchange: "Exchange semester",
          other: "Something else",
        },
      },
    },
    deskDetails: {
      nearer: "In your residence, 200 m",
      cheaper: "Lausanne centre, 4 km",
    },
    sameDesk: "Same desk, same condition.",
    lastStory: "In a few words, what happened?",
    draftWhy: "What made you choose that?",
    missing: "What's missing, or what would stop you from using it?",
    tasksIntro:
      "Thanks! Now two short situations. Nothing here is real and nothing gets sent.",
    tourIntro: "Now the short tour. This is how takeover works.",
    draft: {
      situation:
        "You'd like Mia's desk. You told her you can only pick it up on Saturday.",
      prompt: "I drafted your offer. Check it, then decide.",
      draft:
        "Hi Mia! I'd like your white work desk. Would CHF 40 work? I could pick it up on Friday at 17:30 at FMEL Atrium.",
      explanation:
        "One thing: the draft said Friday, but you'd said Saturday. That was on purpose. We want to see how drafts get checked.",
      situationTitle: "The situation",
      draftTitle: "Pako's draft to Mia",
      sent: "You sent",
      notSent: "You didn't send the offer.",
      send: "Send offer",
      edit: "Edit",
      writeOwn: "Write my own",
      dontSend: "Don't send",
      editLabel: "Your offer to Mia",
      ownLabel: "Your own offer to Mia",
      ownPlaceholder: "Write your offer",
    },
    contact: {
      question:
        "Can we email you two or three follow-up questions, or an invitation when we test with real items?",
      email: "Email address (optional)",
      invalid: "This doesn't look like an email address yet.",
      note: "Stored apart from your answers unless you tick the second box.",
      pilot: "Invite me to the test with real items",
      link: "Link this address to my answers",
    },
    end: {
      text: "Thanks! That helps us decide what to build next.",
      share: "Share the study",
      copied: "Study link copied.",
      copyFailed: "I couldn't copy the link. Here it is:",
    },
  },
  v3: {
    sections: {
      you: "You",
      "last-time": "Last time",
      "the-app": "The app",
      situations: "Situations",
      price: "Price & delivery",
    },
    progress: "Survey sections",
    sectionState: {
      done: (name: string) => `${name}: done`,
      current: (name: string) => `${name}: current`,
      next: (name: string) => `${name}: still to come`,
    },
    start: {
      bubble: (minutes: number) =>
        `Hi, I'm Pako! We're EPFL students building takeover, an app for passing on used stuff around campus. Got ${minutes} minutes? No sign-in. Everyone's welcome, also if you've never bought or sold anything used.`,
      saveTitle: "What we save",
      save: (date: string) =>
        `Your answers, which screens you see, skip or go back to, the time per screen, the link you came from, your language and whether you use a phone or a computer. Your progress stays in this tab until you close it, and this browser remembers that you finished. An email at the end is optional and kept apart from your answers. Everything is deleted by ${date}.`,
      questions: "Questions:",
      go: "Let's go",
      demo: "Just show me the app",
    },
    whatIs: {
      bubble: "Here's what takeover does.",
      title: "What is takeover?",
      find: {
        title: "Find",
        text: "Describe what you need, and I look through listings from students nearby.",
      },
      sell: {
        title: "Sell",
        text: "Take a photo, and I write the listing with a suggested price.",
      },
      agree: {
        title: "Agree",
        text: "Settle the price and a pickup time in the chat, then meet on campus.",
      },
      nextTitle: "What happens next",
      next: [
        "Your last experience with second-hand",
        "A quick look at the app",
        "A few short situations",
      ],
      duration: (minutes: number) => `About ${minutes} minutes`,
    },
    situations: {
      label: (current: number, total: number) =>
        `Situation ${current} of ${total}`,
      pickOne: "Pick one.",
      "move-it": "You've found a desk you like, 4 km from where you live.",
      desk: "You need a desk, and two in the app fit.",
      draft: "You're buying a desk from Mia. The price and the place suit you.",
      draftTask: "Answer Mia, then pick what to do with Pako's draft.",
    },
    steps: {
      "wanted-react": {
        question: "If takeover showed you this, what would you do?",
        options: {
          snap: "Snap a photo and list it",
          look: "Have a look, maybe later",
          ignore: "Ignore it",
          "rather-not": "I'd rather not see these",
        },
      },
      "wanted-share": {
        question:
          "When you look for something, would you let students nearby see your request? Only the item and your area are shown, never your name.",
        options: { yes: "Yes", maybe: "Maybe", no: "No" },
      },
      "last-cost": {
        question: "What did getting it there cost you, roughly?",
        options: {
          nothing: "Nothing",
          "under-10": "Under CHF 10",
          "10-30": "CHF 10–30",
          "over-30": "More than CHF 30",
          "dont-remember": "Don't remember",
        },
      },
      "pay-model": {
        question:
          "The basics of takeover stay free. If something had to cost money, which would you pick?",
        options: {
          "seller-fee":
            "A small fee when your item sells (5%, paid by the seller)",
          "move-pack":
            "A one-off move-out pack (CHF 5: extra photo drafts and price checks for 30 days)",
          monthly: "A monthly plan (CHF 3/month: unlimited help from Pako)",
          institution: "Free for students, paid by the residence or university",
          none: "None of these, I wouldn't pay",
        },
      },
      "delivery-pref": {
        question:
          "When you buy something bulky second-hand, how would you rather get it?",
        options: {
          "pick-up": "I pick it up myself to save money",
          "if-priced": "Delivery, if the price is right",
          always: "Always delivery",
          depends: "Depends on the item",
        },
      },
      "delivery-worth": {
        question:
          "What would delivery to your door within Lausanne (up to about 5 km) be worth to you?",
        options: {
          "only-free": "Nothing, only if free",
          "up-to-5": "Up to CHF 5",
          "5-10": "CHF 5–10",
          "10-20": "CHF 10–20",
          "over-20": "More than CHF 20",
          "not-sure": "Not sure",
        },
      },
      who: {
        question: "First things first: are you a student?",
        options: {
          epfl: "Yes, at EPFL",
          unil: "Yes, at UNIL",
          "other-school": "Yes, somewhere else",
          no: "No",
        },
      },
      "last-role": {
        question:
          "Think of the last time you tried to buy, get, sell or give away something used, even if it didn't work out. What were you trying to do?",
        options: {
          buying: "Buy something",
          "getting-free": "Get something for free",
          selling: "Sell something",
          "giving-away": "Give something away",
          none: "I can't think of a time",
        },
      },
      "last-item": {
        question: "What was it?",
        options: {
          furniture: "Furniture (desk, chair, shelf, bed)",
          household: "Small household things",
          electronics: "Electronics",
          bike: "Bike or scooter",
          books: "Books or course material",
          clothes: "Clothes or shoes",
          other: "Something else",
        },
      },
      "last-occasion": {
        question: "Was it because of a move?",
        options: {
          "moving-in": "Yes, moving in",
          "moving-out": "Yes, moving out",
          "no-move": "No",
          "cant-recall": "Can't recall",
        },
      },
      "last-trouble": {
        question:
          "Looking back, which part caused you the most trouble, if any?",
        options: {
          finding: "Finding the right item",
          listing: "Writing the listing or taking photos",
          price: "Knowing or agreeing on a price",
          replies: "Slow or no replies",
          timing: "Agreeing on a time, or a pickup falling through",
          transport: "Getting it from A to B",
          trust: "Not sure I could trust the other person",
          nothing: "Nothing was difficult",
          other: "Something else",
          "cant-recall": "Can't recall",
        },
      },
      "why-not": {
        question: "What's the main reason?",
        options: {
          "no-need": "Never needed to",
          "prefer-new": "I prefer new things",
          hassle: "Seemed like too much hassle",
          "dont-know-where": "Didn't know where to look",
          other: "Something else",
        },
      },
      move: {
        question: "Are you planning to move?",
        options: {
          "move-feb": "Yes, by end of February 2027",
          "move-jun": "Yes, March–June 2027",
          "move-later": "Yes, later",
          "no-plan": "No plans",
          "not-sure": "Not sure",
        },
      },
      housing: {
        question: "Where do you live now?",
        options: {
          fmel: "FMEL residence",
          "other-res": "Another student residence",
          flat: "A flat or studio",
          family: "With family",
          elsewhere: "Somewhere else",
        },
      },
      headline: {
        question:
          "Which of these, if any, would make you most likely to open the app?",
        options: {
          "h-move": "“Sell your things before you move out.”",
          "h-photo": "“Snap a photo, get a ready listing with a fair price.”",
          "h-ai": "“An AI assistant writes your listing from a photo.”",
          "h-nearby":
            "“Find used things from people nearby, pickup on campus.”",
          none: "None of these",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question: "What would stop you from using takeover? Pick any.",
        options: {
          "ai-mistakes": "The AI could get things wrong",
          "nobody-nearby": "Not enough people nearby use it",
          "prefer-groups": "I prefer my WhatsApp or Telegram groups",
          privacy: "Worries about privacy",
          "too-long": "It takes too long",
          nothing: "Nothing would stop me",
          other: "Something else",
        },
      },
      sending: {
        question:
          "Would you let Pako send some messages for you, without asking you first?",
        options: {
          myself: "No, I'd send every message myself",
          "short-updates": "Only short updates like “On my way”",
          "replies-too": "Short updates and simple replies",
          "not-sure": "Not sure",
        },
      },
      "move-it": {
        question:
          "Before you agree to buy it: how would you most likely get it home?",
        options: {
          "carry-bike": "Carry it or take it by bike",
          "public-transport": "Public transport",
          "friend-car": "Borrow a car, or ask a friend with one",
          helper:
            "A helper with a cargo bike, booked in the app: CHF 15 for the whole trip up to 4 km, carried to your door (ground floor or lift; stairs may cost extra)",
          "skip-desk": "I'd look for one closer instead",
          "not-sure": "Not sure",
        },
      },
      desk: {
        question: "Which one would you go for?",
        options: { nearer: "CHF 45", cheaper: "CHF 30", neither: "Neither" },
      },
      "scene-pick": {
        question: "What would you like to see first?",
        options: {
          sell: "Sell from a photo",
          deal: "Agree on a pickup",
          find: "Find something",
        },
      },
      "try-first": {
        question:
          "For the next thing you buy or sell, which would you try first, if any?",
        options: {
          "describe-search": "Searching by describing what I need",
          "photo-listing":
            "A listing drafted from my photos, with a price and its sources",
          "offer-drafts": "Offer drafts I can edit and send",
          "pickup-card": "The pickup card with confirmations and reminders",
          none: "None of these",
          "need-more": "I'd need to know more",
        },
      },
      age: {
        question: "Your age",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31 or older",
          na: "Prefer not to say",
        },
      },
      gender: {
        question: "Your gender",
        options: {
          woman: "Woman",
          man: "Man",
          "non-binary": "Non-binary",
          "self-describe": "Prefer to self-describe",
          na: "Prefer not to say",
        },
      },
      level: {
        question: "What are you studying?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "PhD",
          other: "Other studies",
          "not-student": "Not a student",
        },
      },
      exchange: {
        question: "Are you an exchange student?",
        options: { yes: "Yes", no: "No", na: "Prefer not to say" },
      },
    },
    helpedNeverTried: "Would this help you?",
    findingBySeller: "Finding someone who wanted it",
    moveIntro: "Two quick ones about now.",
    firstLookIntro: "Now a first look at takeover.",
    situationsIntro: "Three quick situations.",
    priceIntro: "Last part: price and delivery.",
    packLadder: {
      bubble: "One more about the move-out pack.",
      title: "Move-out pack",
      text: "Five more photo drafts with price checks, valid for 30 days, paid once.",
      question: (price: number) =>
        `Would you spend your own CHF ${price} on this pack for your next move?`,
      options: { yes: "Yes", no: "No", "not-sure": "Not sure" },
    },
    lastStory: {
      question: "In a sentence: how did it go?",
      label: "Your sentence",
      placeholder: "Optional, a few words are enough",
    },
    wantedCard: {
      label: "Example request in the app, with a Snap it button",
      text: "Someone near Vortex is looking for a desk lamp. Got one lying around?",
      button: "Snap it",
    },
    whoSendsCard: {
      title: "How the app works",
      sentence:
        "Pako drafts your messages. Nothing is sent until you tap Send.",
    },
    helperMissing: "The helper option doesn't exist yet.",
    packMissing: "This pack doesn't exist yet.",
    desk: {
      sameTerms: "Same desk, same condition, pickup this week",
      distance: {
        nearer: "200 m from where you live",
        cheaper: "4 km from where you live",
      },
      title: "Desk",
      listLabel: "Two desks in the app",
    },
    draft: {
      intro: "Pick the day that suits you in the chat with Mia.",
      chatLabel: "Practice chat with Mia",
      listing: {
        title: "White desk",
        size: "120 × 60 cm",
        price: "CHF 40",
        pickup: "Pickup: EPFL, Rolex Learning Center",
        seller: "Mia",
      },
      mia: "Mia",
      you: "You",
      pako: "Pako",
      askDay:
        "Hi! The desk is still available. Which day could you pick it up? I'm free from 17:00.",
      pickDay: "Your answer to Mia",
      days: { sat: "Saturday", sun: "Sunday" },
      yourDay: (day: string) => `${day} works for me, 17:30?`,
      confirm: "17:30 is fine. Send me an offer and I'll confirm.",
      typing: (name: string) => `${name} is typing`,
      offerReady: "Here's your offer.",
      offer: (day: string) =>
        `Hi Mia! I'd like your white desk for CHF 40. I can pick it up on ${day} at 17:30 at the Rolex Learning Center.`,
      offerTitle: "Offer draft",
      question: "What would you do with this draft?",
      sendAsIs: "Send as it is",
      change: "Change something first",
      own: "Write my own",
      ownLabel: "Your message to Mia",
      send: "Send",
      dontSend: "Not send it",
      editLabel: "Your offer to Mia",
      notSent: "You didn't send the offer.",
    },
    saved: "Done! Your answers are saved.",
    savedSaving: "Done! I'm saving your last answers.",
    about: {
      intro: "Last bit, all optional: it helps us understand who answered.",
      finish: "Finish",
      peek: "See the full scenes (optional)",
    },
    tour: {
      next: "Next",
      replay: "Replay",
      skipRest: "Skip the rest",
    },
    pilot: {
      invite:
        "We're testing takeover with real items in a few FMEL houses. Want a spot?",
      email: "Email address",
      role: "Would you sell, buy or both?",
      roles: { seller: "Sell", buyer: "Buy", both: "Both" },
      items: "What would you bring or look for?",
      house: "Where do you live?",
      houses: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Another FMEL house",
        "not-fmel": "Not in an FMEL house",
      },
      weeks: "Which weeks would work?",
      weekLabels: {
        "2026-12-14": "14–18 December",
        "2026-12-21": "21–23 December",
        "2027-02-01": "1–5 February",
        "2027-02-08": "8–12 February",
      },
      consentLegend: "What may we use your address for?",
      joinPilot: "Sign me up for the pilot in these weeks",
      laterEmail:
        "Email me about later tests or two or three follow-up questions",
      note: "Kept apart from your survey answers.",
      send: "Send",
      noThanks: "No thanks",
      errors: {
        emailMissing: "Enter your email address.",
        emailInvalid: "This doesn't look like an email address.",
        role: "Choose whether you'd sell, buy or both.",
        house: "Choose where you live.",
        ticks: "Tick at least one of the two boxes.",
      },
    },
    end: {
      title: "Thanks! That helps us decide what to build next.",
      resultsTitle: "How others answered",
      resultsWaiting: (minimum: number) =>
        `Results appear once ${minimum} people have answered.`,
      resultsLoading: "Loading the results…",
      resultsFailed: "The results couldn't be loaded.",
      deskTitle: "Two desks: which one?",
      deskOptions: {
        nearer: "Nearer: CHF 45, 200 m",
        cheaper: "Cheaper: CHF 30, 4 km",
        neither: "Neither",
      },
      troubleTitle: "What caused the most trouble last time",
      troubleFinding: "Finding the right item or someone who wanted it",
      ofAnswers: (count: number, total: number) => `${count} of ${total}`,
      shareTitle:
        "Every answer helps, also from people who never sell anything. Share it?",
      share: "Share",
      copy: "Copy link",
      showQr: "Show QR code",
      hideQr: "Hide QR code",
      qrLabel: "QR code for the survey link",
      copied: "Link copied.",
      copyFailed: "The link couldn't be copied. Here it is:",
      shareText: (minutes: number, link: string) =>
        `I just did a ${minutes}-minute phone survey for an EPFL student project. No sign-in: ${link}`,
    },
  },
};

export type TourText = typeof EN;
