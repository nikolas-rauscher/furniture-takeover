/**
 * Every word of the tour page in English, the reference for the other languages.
 * The app's own screens inside the phones stay in English and are not listed here.
 */
const helped = {
  question: "Would this feature have helped you last time?",
  options: {
    yes: "Yes",
    partly: "Partly",
    no: "No",
    na: "That doesn't apply to me",
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
      you: "Start",
      "last-time": "Your experience",
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
        `Hi, I'm Pako, the assistant in the takeover app. A team of EPFL students is building the app so students around EPFL and UNIL can buy, sell and give away second-hand items. In this survey, we'd like to learn how you deal with used things and what you think of the app. It takes about ${minutes} minutes, and you don't need an account. Everyone can take part, even if you've never bought or sold anything used.`,
      saveTitle: "What we save",
      save: (date: string) =>
        `We save your answers and record which screens you visit, skip or return to and how long you spend on each one. We also record which link you followed, your language and whether you're using a phone or a computer. Your progress stays in this tab until you close it, and this browser remembers that you finished. You can leave an email address at the end. We store it separately from your answers. Everything is deleted by ${date}.`,
      questions: "Questions about the survey:",
      go: "Start the survey",
      demo: "Just show me the app",
    },
    whatIs: {
      bubble:
        "Before the first question, here's what takeover does and what this survey asks.",
      title: "What is takeover?",
      lead: "An app for students around EPFL, UNIL and the FMEL residences to buy, sell and give away second-hand items.",
      nextTitle: "What this survey asks",
      next: [
        "Your last experience with buying, selling or giving away something used",
        "Three short scenes from the app, then a few questions about it",
        "Three everyday situations in which you choose what you would do",
        "What you would pay for the app and for delivery",
      ],
      duration: (minutes: number) => `About ${minutes} minutes`,
    },
    parts: {
      label: (current: number, total: number) => `Part ${current} of ${total}`,
      "last-time": {
        bubble: "This part is about your own experience with used things.",
        text: "We'd like to hear about the last time you tried to buy, sell, give away or get a second-hand item, whether or not it worked out. There are no right or wrong answers.",
      },
      "the-app": {
        bubble: "This part is about takeover itself.",
        text: "You'll see three short scenes and tell us whether each feature would help you. Then a few questions about the app as a whole follow, and at the end you compare some slogans.",
      },
      situations: {
        bubble: "This part has three everyday situations.",
        text: "Imagine you're in each situation and choose what you would really do. In the last one, you chat with a seller. One question about sending messages follows.",
      },
      price: {
        bubble: "This last part is about money and delivery.",
        text: "First, we ask what you'd pay for a move-out pack. Then you choose between the free version and three ways of paying, and we ask about delivery. Searching, listing and messaging would stay free, along with some help from Pako each day.",
      },
    },
    scenes: {
      find: {
        title: "Finding something",
        text: "A student near Vortex needs a desk and describes what they're looking for. Pako searches listings posted by students nearby and drafts an offer. Nothing is sent until the student taps Send.",
      },
      sell: {
        title: "Selling with a photo",
        text: "Léa takes a photo of her desk. Pako writes the listing and suggests a price. Léa sets her own price and saves the listing.",
      },
      deal: {
        title: "Agreeing on a pickup",
        text: "Noah offers CHF 35 for the desk and Léa accepts, so the pickup is booked. At pickup time, both of them confirm the handover.",
      },
    },
    situations: {
      label: (current: number, total: number) =>
        `Situation ${current} of ${total}`,
      pickOne: "Choose the answer that fits you best.",
      "move-it":
        "You've found a desk you like in the app. The seller lives 4 km away from you.",
      desk: "You need a desk, and the app shows two that would suit you. They're the same model in the same condition; only the price and the distance differ.",
      draft:
        "You want to buy a desk from Mia, another student. The price and the pickup place suit you.",
      draftTask:
        "First, answer Mia in the chat. Pako then writes an offer for you, and you decide what to do with it.",
    },
    steps: {
      "wanted-react": {
        question: "How would you respond to this request?",
        options: {
          snap: "Take a photo and list my item",
          look: "Look at the request and decide later",
          ignore: "Ignore it",
          "rather-not": "I'd rather not see requests like this",
        },
      },
      "wanted-share": {
        question:
          "Would you share a request with students nearby? They’d see the item and your area, but not your name.",
        options: { yes: "Yes", maybe: "Maybe", no: "No" },
      },
      "last-cost": {
        question: "Roughly how much did you spend on transporting the item?",
        options: {
          nothing: "Nothing",
          "under-10": "Under CHF 10",
          "10-30": "CHF 10–30",
          "over-30": "More than CHF 30",
          "dont-remember": "I don't remember",
        },
      },
      "pay-model": {
        question: "If you paid yourself, which would you choose?",
        options: {
          free: "Free version",
          "seller-fee": "Fee per sale",
          "move-pack": "Move-out pack",
          monthly: "Monthly plan",
          "not-sure": "Not sure",
        },
      },
      "institution-pay": {
        question:
          "Would you use takeover more if your university or residence paid for it?",
        options: {
          yes: "Yes",
          "no-difference": "It wouldn't make a difference",
          "not-sure": "Not sure",
        },
      },
      "delivery-worth": {
        question:
          "What is the most you would pay to have a bulky item brought to your door in Lausanne (about 5 km)?",
        options: {
          nothing: "Nothing, I'd fetch it myself",
          "up-to-5": "Up to CHF 5",
          "6-10": "CHF 6–10",
          "11-20": "CHF 11–20",
          "over-20": "More than CHF 20",
          "not-sure": "Not sure",
        },
      },
      who: {
        question: "Are you a student?",
        options: {
          epfl: "Yes, at EPFL",
          unil: "Yes, at UNIL",
          "other-school": "Yes, at another school",
          no: "No",
        },
      },
      "last-role": {
        question:
          "Think of your last experience with a second-hand item. What were you trying to do?",
        options: {
          buying: "Buy something",
          "getting-free": "Get something for free",
          selling: "Sell something",
          "giving-away": "Give something away",
          none: "I've never tried",
        },
      },
      "last-item": {
        question: "What kind of second-hand item was involved last time?",
        options: {
          furniture: "Furniture (desk, chair, shelf, bed)",
          household: "Small household items",
          electronics: "Electronics",
          bike: "Bike or scooter",
          books: "Books or course material",
          clothes: "Clothes or shoes",
          other: "Something else",
        },
      },
      "last-occasion": {
        question: "Was this related to moving in or moving out?",
        options: {
          "moving-in": "Yes, I was moving in",
          "moving-out": "Yes, I was moving out",
          "no-move": "No",
          "cant-recall": "I can't remember",
        },
      },
      "last-trouble": {
        question: "Which part was hardest for you last time, if any?",
        options: {
          finding: "Finding the right item",
          listing: "Writing the listing or taking photos",
          price: "Knowing or agreeing on a price",
          replies: "Slow replies or no replies",
          timing: "Agreeing on a time, or a pickup falling through",
          transport: "Getting it from A to B",
          trust: "Not knowing whether I could trust the other person",
          nothing: "Nothing was difficult",
          other: "Something else",
          "cant-recall": "I can't remember",
        },
      },
      "why-not": {
        question:
          "What is the main reason you haven't bought, sold or given away anything used?",
        options: {
          "no-need": "I never needed to",
          "prefer-new": "I prefer new things",
          hassle: "It seemed like too much hassle",
          "dont-know-where": "I didn't know where to look",
          other: "Something else",
        },
      },
      move: {
        question: "Are you planning to move out of your current home?",
        options: {
          "move-feb": "Yes, by the end of February 2027",
          "move-jun": "Yes, between March and June 2027",
          "move-later": "Yes, later",
          "no-plan": "No, I have no plans to move",
          "not-sure": "Not sure",
        },
      },
      housing: {
        question: "Where do you live at the moment?",
        options: {
          fmel: "In an FMEL residence",
          "other-res": "In another student residence",
          flat: "In a flat or studio",
          family: "With my family",
          elsewhere: "Somewhere else",
        },
      },
      headline: {
        question: "Which slogan would make you most likely to open takeover?",
        options: {
          "h-move": "“Sell your things before you move out.”",
          "h-photo":
            "“Take a photo and get a listing with a fair price, ready to post.”",
          "h-ai": "“An AI assistant writes your listing from a photo.”",
          "h-nearby":
            "“Find second-hand items nearby and pick them up on campus.”",
          none: "None of these",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question:
          "What could stop you from using takeover? You can choose several answers.",
        options: {
          "ai-mistakes": "The AI could make mistakes",
          "nobody-nearby": "Too few people nearby use it",
          "prefer-groups": "I prefer my WhatsApp or Telegram groups",
          privacy: "Privacy concerns",
          "too-long": "It takes too long",
          nothing: "Nothing would stop me",
          other: "Something else",
        },
      },
      sending: {
        question:
          "Would you let Pako send messages without checking with you first?",
        options: {
          myself: "No, I'd send every message myself",
          "short-updates": "Only short updates like “On my way”",
          "replies-too": "Short updates and simple replies",
          "not-sure": "Not sure",
        },
      },
      "move-it": {
        question: "How would you get the desk home?",
        options: {
          "carry-bike": "Carry it or take it by bike",
          "public-transport": "Take it on public transport",
          "friend-car": "Borrow a car, or ask a friend who has one",
          helper:
            "Book a helper with a cargo bike in the app: CHF 15 for the whole trip up to 4 km, carried to your door (ground floor or lift; stairs may cost extra)",
          "skip-desk": "Look for a desk closer to home instead",
          "not-sure": "Not sure",
        },
      },
      desk: {
        question: "Which of the two desks would you choose?",
        options: { nearer: "CHF 45", cheaper: "CHF 30", neither: "Neither" },
      },
      "scene-pick": {
        question: "Which scene would you like to see first?",
        options: {
          sell: "Sell from a photo",
          deal: "Agree on a pickup",
          find: "Find something",
        },
      },
      "try-first": {
        question:
          "Which feature would you try first the next time you buy or sell something?",
        options: {
          "describe-search": "Describe what I need to search the listings",
          "photo-listing":
            "Draft a listing from photos, with a suggested price and sources",
          "offer-drafts": "Edit and send a draft offer",
          "pickup-card": "Use the pickup card for confirmations and reminders",
          none: "None of these",
          "need-more": "I'd need to know more first",
        },
      },
      age: {
        question: "How old are you?",
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
        question: "What is your gender?",
        options: {
          woman: "Woman",
          man: "Man",
          "non-binary": "Non-binary",
          "self-describe": "Prefer to self-describe",
          na: "Prefer not to say",
        },
      },
      level: {
        question: "Which degree are you studying for?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "PhD",
          other: "Other studies",
          "not-student": "I'm not a student",
        },
      },
      exchange: {
        question: "Are you an exchange student?",
        options: { yes: "Yes", no: "No", na: "Prefer not to say" },
      },
    },
    helpedNeverTried:
      "Would this feature help you if you wanted to buy or sell something used?",
    findingBySeller: "Finding someone who wanted it",
    moveIntro: "Next, two questions about where you live now.",
    lampIntro: "Imagine you have a desk lamp you no longer need.",
    packLadder: {
      bubble: "First, one way of paying: a move-out pack.",
      title: "Move-out pack",
      price: (price: number) => `CHF ${price}, paid once`,
      text: "Writing listings yourself stays free. The pack adds five extra photo drafts with price checks, valid for 30 days.",
      question: (price: number) =>
        `Would you pay CHF ${price} of your own money for this pack when you next move?`,
      options: { yes: "Yes", no: "No", "not-sure": "Not sure" },
    },
    plans: {
      free: {
        price: "CHF 0",
        detail:
          "Keep using the free version, with some help from Pako each day.",
        benefits: [
          "Nothing to pay",
          "Searching, listing and messaging included",
        ],
      },
      "seller-fee": {
        price: "5% when an item sells",
        detail: "Paid by the seller, only when an item sells.",
        benefits: [
          "Listing and buying stay free",
          "Nothing to pay if nothing sells",
        ],
      },
      "move-pack": {
        price: "CHF 5, paid once",
        detail: "Five extra photo drafts with price checks, valid for 30 days.",
        benefits: ["No subscription", "Made for the weeks around a move"],
      },
      monthly: {
        price: "CHF 3 a month",
        detail: "Unlimited help from Pako, the app's assistant.",
        benefits: [
          "As many drafts and price checks as you like",
          "Covers frequent buying and selling",
        ],
      },
    },
    lastStory: {
      question:
        "In one sentence, how did your last experience with a second-hand item go?",
      label: "Your sentence",
      placeholder: "Optional, a few words are enough",
    },
    wantedCard: {
      idea: "An idea for the app",
      explanation:
        "Students can share what they're looking for. Others nearby see the request, but never the name of the person asking.",
      label: "Example of a request in the app, with an I have one button",
      text: "Someone near Vortex is looking for a desk lamp. Got one lying around?",
      button: "I have one",
    },
    whoSendsCard: {
      title: "How the app works",
      sentence:
        "Pako, the app's assistant, drafts your messages. Nothing is sent until you tap Send.",
    },
    helperMissing: "Note: this helper service doesn't exist yet.",
    packMissing: "Note: this pack doesn't exist yet.",
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
      intro:
        "Mia asks when you could pick up the desk. Choose a day in the chat below.",
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
      yourDay: (day: string) => `${day} works for me. How about 17:30?`,
      confirm: "17:30 is fine. Send me an offer and I'll confirm.",
      typing: (name: string) => `${name} is typing`,
      offerReady: "I've written an offer for you.",
      offer: (day: string, price: number) =>
        `Hi Mia! I'd like your white desk for CHF ${price}. I can pick it up on ${day} at 17:30 at the Rolex Learning Center.`,
      offerTitle: "Offer draft",
      question: "What would you do with this draft?",
      sendAsIs: "Send it as it is",
      change: "Change something first",
      own: "Write my own message",
      ownLabel: "Your message to Mia",
      send: "Send",
      dontSend: "Don't send it",
      editLabel: "Your offer to Mia",
      notSent: "You didn't send the offer.",
    },
    saved: "Done! Your answers are saved.",
    savedSaving: "Done! I'm saving your last answers.",
    about: {
      intro:
        "Finally, a few optional questions about you. They help us understand who took part.",
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
        "Want to hear when takeover is online, try it early, or join a future survey?",
      email: "Email address",
      ticksLegend: "What would you like?",
      ticks: {
        launchNews: "Tell me when takeover is online",
        tryEarly: "I'd like to try takeover early",
        futureSurveys: "Invite me to future surveys",
      },
      role: "Would you sell, buy or both?",
      roles: { seller: "Sell", buyer: "Buy", both: "Both" },
      place: "Where do you live?",
      places: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Another FMEL residence",
        "other-res": "Another student residence",
        flat: "A flat or studio",
        elsewhere: "Somewhere else",
      },
      note: "Kept separately from your survey answers.",
      send: "Send",
      noThanks: "No thanks",
      errors: {
        emailMissing: "Enter your email address.",
        emailInvalid: "This doesn't look like an email address.",
        ticks: "Tick at least one box.",
        role: "Choose whether you'd sell, buy or both.",
        place: "Choose where you live.",
      },
    },
    end: {
      title: "Thank you! Your answers help us decide what to build next.",
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
      troubleTitle: "What was most difficult last time",
      troubleFinding: "Finding the right item or someone who wanted it",
      ofAnswers: (count: number, total: number) => `${count} of ${total}`,
      shareTitle:
        "Every answer helps, including from people who never sell anything. Would you share the survey?",
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
