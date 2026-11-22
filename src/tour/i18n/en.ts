/**
 * Every word of the tour page in English, the reference for the other languages.
 * The app's own screens inside the phones stay in English and are not listed here.
 */
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
    rank: (place: number) => `rank ${place}`,
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
      text: "Thanks! If you'd like to hear from us, you can still leave your email.",
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
      "last-time": "Your experience",
      home: "You right now",
      "the-app": "The app",
      price: "Price, and about you",
    },
    progress: "Survey parts",
    lastPart: "Last part",
    sectionState: {
      done: (name: string) => `${name}: done`,
      current: (name: string) => `${name}: current`,
      next: (name: string) => `${name}: still to come`,
    },
    start: {
      bubble: (minutes: number) =>
        `Hi, I'm Pako, the assistant in the takeover app. EPFL students are building it so students around EPFL and UNIL can buy, sell and give away used things. The survey takes about ${minutes} minutes.`,
      saveTitle: "What we save",
      moreBelow: "Continues below",
      save: (date: string) =>
        `We save your answers and record which screens you visit, skip or return to and how long you spend on each one. We also record which link you followed, your language and whether you're using a phone or a computer. While you answer, your progress stays in this tab. Once you finish, this browser keeps your answers so you can change them later. If you leave your email at the end, we store it separately from your answers. We delete the study data we collect by ${date}.`,
      questions: "Questions about the survey:",
      go: "Start the survey",
      demo: "Just show me the app",
    },
    parts: {
      label: (current: number, total: number) => `Part ${current} of ${total}`,
      "last-time": {
        bubble: "First, a few questions about your own experience.",
        text: "There are no right or wrong answers.",
      },
      home: {
        bubble:
          "Next, a few questions about you right now: used things and what you have at home.",
        text: "For example furniture, books, kitchen things or electronics.",
      },
      "the-app": {
        bubble:
          "Léa is selling her desk and you'd like to buy it. You each have a Pako. The two Pakos talk to each other to find a pickup time that works for both of you. You can also write to Léa yourself.",
        text: "Two short scenes, a chat and a few questions about the story.",
      },
      price: {
        bubble: "Last part: price, then a few questions about you.",
        text: "Then you're done.",
      },
    },
    cards: {
      lastTime: {
        text: "Think of the last time you tried to buy, sell, give away or get a used item for free. It counts even if it didn't work out.",
      },
      wanted: {
        title: "An idea for takeover: requests.",
        text: "Léa still needs a desk lamp for her new room. Anyone looking for something can post what they need, and students nearby see it.",
      },
      delegate: {
        text: "Imagine you're selling Léa's desk. Pako could send messages for you. You'd see them afterwards.",
      },
      price: {
        text: "Think about using Pako to write listings and handle messages.",
      },
    },
    wantedPost: {
      label: "Example of a request in the app",
      text: "Léa, 5 minutes from you, is looking for a desk lamp.",
    },
    scenes: {
      sell: {
        title: "Léa sells her desk",
        text: "Léa is moving out and sells her desk with takeover. She takes a photo, Pako writes the listing and suggests a price, and Léa sets her own price of CHF 40.",
      },
      deal: {
        title: "The pickup is booked",
        text: "On Léa's phone, you're Noah. Pako knows the pickup time and checks in with both of you if someone runs late or goes quiet. If a buyer stops replying, Léa can offer the desk to someone else.",
        label:
          "Léa accepts CHF 40. Noah reports a ten-minute delay, Pako shows the new arrival time, Noah confirms pickup and Léa marks the desk sold.",
      },
    },
    steps: {
      who: {
        question: "Are you a student?",
        options: {
          epfl: "Yes, at EPFL",
          unil: "Yes, at UNIL",
          "other-school": "Yes, at another university",
          no: "No",
        },
      },
      housing: {
        question: "Which best describes where you live now?",
        options: {
          fmel: "In an FMEL residence",
          "other-res": "In another student residence",
          flat: "Flat, flat-share or studio (not a student residence)",
          family: "With my family",
          elsewhere: "Somewhere else",
        },
      },
      "last-role": {
        question: "What were you trying to do?",
        options: {
          buying: "Buy something",
          "getting-free": "Get something for free",
          selling: "Sell something",
          "giving-away": "Give something away",
          none: "I've never tried any of these",
        },
      },
      "last-item": {
        question: "What was it?",
        options: {
          furniture: "Furniture",
          household: "Household items",
          electronics: "Electronics",
          bike: "Bike or scooter",
          books: "Books",
          clothes: "Clothes",
          other: "Other",
        },
      },
      "last-occasion": {
        question: "Was it connected with a move?",
        options: {
          "moving-in": "Yes, moving in",
          "moving-out": "Yes, moving out",
          both: "Yes, both (moving out and in)",
          "no-move": "No",
        },
      },
      "last-how": {
        question: "Where did you try first?",
        options: {
          friends: "Friends or people I know",
          "chat-group": "WhatsApp or Telegram group",
          facebook: "Facebook Marketplace",
          anibis: "Anibis, Tutti or Ricardo",
          other: "Somewhere else",
        },
      },
      "last-outcome": {
        question: "Did it work out?",
        options: { yes: "Yes", no: "No", ongoing: "Still in progress" },
      },
      "last-trouble": {
        question: "What was hard about it?",
        options: {
          nothing: "Nothing was difficult",
          finding: "Finding something suitable",
          gone: "The item was already gone",
          "agree-price": "Agreeing on a price",
          "finding-taker": "Finding someone interested",
          "deadline-pickup": "Arranging pickup before my deadline",
          listing: "Writing the listing",
          "set-price": "Setting the price",
          replies: "Waiting for replies",
          messages: "Lots of messages back and forth",
          timing: "Agreeing on a pickup time",
          cancelled: "Cancelled pickups",
          transport: "Transport",
          trust: "Trusting the other person",
          other: "Something else",
          "cant-recall": "Can't remember",
        },
      },
      "last-transport": {
        question: "How was it transported?",
        options: {
          foot: "On foot",
          bike: "By bike",
          "public-transport": "By public transport",
          car: "By car",
          delivery: "Delivered",
          "not-yet": "Not moved yet",
          "dont-know": "Don't know",
        },
      },
      "last-messages": {
        question:
          "Roughly how many messages did it take in total, with everyone?",
        options: {
          none: "None",
          "1-3": "1–3",
          "4-7": "4–7",
          "8-12": "8–12",
          "over-12": "More than 12",
          "dont-remember": "Can't remember",
        },
      },
      "trade-frequency": {
        question: "How often do you buy, sell or give away something used?",
        options: {
          "monthly-plus": "Several times a month",
          monthly: "About once a month",
          yearly: "A few times a year",
          rarely: "Less often",
          never: "Never",
        },
      },
      "idle-items": {
        question:
          "How many usable things do you have at home that you don't currently use?",
        options: {
          none: "None",
          "1-3": "1–3",
          "4-10": "4–10",
          "over-10": "More than 10",
        },
      },
      "idle-release": {
        question: "Would you consider selling or giving away any of these?",
        options: { yes: "Yes", no: "No", unsure: "Unsure" },
      },
      "idle-why": {
        question: "Why do you still have them?",
        options: {
          "listing-hassle": "Listing is too much hassle",
          "messages-hassle": "Messages and scheduling are too much hassle",
          transport: "I can't transport them",
          "not-worth": "Not worth the effort for the money",
          "dont-know-whom": "I don't know who I could offer them to",
          "might-need": "I might still need them",
          keep: "I'd rather keep them",
          "not-yet": "I haven't got round to it",
          other: "Other",
        },
      },
      "wanted-react": {
        question: "You have a spare desk lamp. What would you most likely do?",
        options: {
          "offer-now": "Offer it now",
          "offer-later": "Offer it later",
          leave: "Leave the request unanswered",
          "rather-not": "I don't want to see requests like this",
        },
      },
      seeking: {
        question: "Are you looking for something used right now?",
        options: { yes: "Yes", no: "No" },
      },
      delegate: {
        question: "What would you let Pako do without checking with you first?",
        options: {
          none: "None of these",
          "answer-questions": "Answer questions about the item",
          "suggest-time": "Suggest one of the pickup times I gave Pako",
          remind: "Remind the other person about the pickup",
          negotiate: "Negotiate the price",
          "accept-offer": "Accept an offer",
        },
      },
      "pay-model": {
        question: "How would you rank these pricing options?",
        options: {
          free: "Free",
          "free-ads": "Free with ads",
          credits: "Credit pack",
          "seller-fee": "Fee per sale",
          monthly: "Monthly subscription",
        },
      },
      "check-listing": {
        question:
          "If you were Léa, what would you check before Pako's listing goes online?",
        options: {
          price: "The price",
          description: "The description",
          photos: "The photos",
          "pickup-times": "The pickup times",
          none: "None of these",
        },
      },
      "max-distance": {
        question: "How far would you go at most to pick up a used desk?",
        options: {
          "under-1": "Under 1 km",
          "1-3": "1–3 km",
          "3-10": "3–10 km",
          "over-10": "More than 10 km",
        },
      },
      "trust-signals": {
        question: "What would help you trust the other person?",
        options: {
          verified: "Verified student account",
          reviews: "Reviews",
          "pako-rating": "Pako's rating from past sales and pickups",
          "campus-meet": "Meeting on campus",
          chat: "The chat so far",
          none: "None of these",
        },
      },
      "pay-for": {
        question: "What would you most likely pay for?",
        options: {
          listings: "Having my listings written",
          replies: "Replies and appointments handled by Pako",
          transport: "Transport or delivery",
          visibility: "More visibility for my listing",
          nothing: "None of these",
        },
      },
      age: {
        question: "How old are you?",
        options: {
          "under-18": "Under 18",
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31+",
          na: "Prefer not to say",
        },
      },
      gender: {
        question: "Your gender?",
        options: {
          woman: "Woman",
          man: "Man",
          "non-binary": "Non-binary",
          "self-describe": "Another term",
          na: "Prefer not to say",
        },
      },
    },
    amounts: {
      "wtp-monthly": {
        question: "How much would you pay per month for that help?",
        choose: "Drag to choose",
        nothing: "Nothing",
        amount: (francs: string) => `CHF ${francs} a month`,
        top: (francs: string) => `CHF ${francs}`,
      },
    },
    seekingWhat: "What are you looking for? (optional)",
    chooseSeveral: "You can choose several.",
    moreBelow: "More options below",
    sceneInEnglish: "Example from the app (in English)",
    plans: {
      rankHint: "Tap in order, favourite first. Tap again to undo.",
      idea: "Your own pricing idea (optional)",
      label: "Example prices, not available yet",
      help: "Pako's help",
      pay: "You pay",
      cards: {
        free: { price: "CHF 0", help: "a few times a day", pay: "nothing" },
        "seller-fee": {
          price: "5%",
          help: "unlimited",
          pay: "5% of the sale price, only if you sell something (CHF\u00a02 on CHF\u00a040)",
        },
        "free-ads": {
          price: "CHF 0",
          help: "unlimited, with ads",
          pay: "nothing",
        },
        credits: {
          price: "CHF 5",
          help: "50 credits for listings, chats and messages",
          pay: "CHF 5 once",
        },
        monthly: {
          price: "CHF 3/month",
          help: "unlimited",
          pay: "CHF 3 a month",
        },
      },
    },
    draft: {
      intro: "You want Léa's desk. Pako sent the first message for you.",
      scenario:
        "You told Pako you're free on weekend evenings. Léa gave her times to her own Pako.",
      task: "Pick a day in the chat below.",
      chatLabel: "Practice chat with Léa",
      listing: {
        title: "Compact study desk",
        size: "100\u00a0×\u00a050\u00a0cm",
        price: "CHF 40",
        pickup: "Pickup: EPFL, Rolex Learning Center",
        seller: "Léa",
      },
      lea: "Léa",
      you: "You",
      pako: "Pako",
      sentByPako: "Sent by Pako",
      opening: (price: number) =>
        `hey, is the desk still available? I can do CHF ${price}`,
      matchedTimes:
        "Léa's Pako and I found two times you're both free. Saturday or Sunday at 5:30?",
      revise: "Choose a different day or reply",
      askDay: "yeah, still got it! when could you pick it up?",
      pickDay: "Your answer to Léa",
      days: { sat: "Saturday", sun: "Sunday" },
      yourDay: (day: string) => `how about ${day.toLowerCase()} at 5:30?`,
      confirm: (day: string) =>
        `${day.toLowerCase()} works! meet by the Rolex?`,
      typing: (name: string) => `${name} is typing`,
      offerReady: "Here's a confirmation you could send.",
      offer: (day: string, price: number) =>
        `see you ${day.toLowerCase()} at 5:30 by the Rolex! I'll bring CHF ${price}`,
      offerTitle: "Pako's draft",
      question: "What would you do with this draft?",
      sendAsIs: "Send as written",
      change: "Edit it",
      own: "Write my own",
      ownLabel: "Your message to Léa",
      send: "Send",
      dontSend: "Send nothing",
      editLabel: "Your reply to Léa",
      notSent: "You didn't send anything.",
    },
    scene: { next: "Next", replay: "Replay" },
    pilot: {
      sending: "Sending your email…",
      failed:
        "Your email hasn't been saved. Check your connection and try again.",
      invite: "Would you like to hear from us again?",
      email: "Email address",
      ticksLegend: "What would you like?",
      ticks: {
        launchNews: "Let me know when takeover launches",
        tryEarly: "I'd like to try takeover early",
        interview: "I'm up for a 15-minute chat",
        futureSurveys: "Invite me to future surveys",
      },
      role: "What would you like to try?",
      roles: {
        buy: "Buy",
        "get-free": "Get for free",
        sell: "Sell",
        "give-away": "Give away",
        "not-sure": "Not sure yet",
      },
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
      note: "Optional. Kept separately from your survey answers.",
      send: "Send",
      sent: "We've saved your email. We'll be in touch.",
      errors: {
        emailMissing: "Enter your email address.",
        emailInvalid: "This doesn't look like an email address.",
        ticks: "Tick at least one box.",
        role: "Choose what you would like to try.",
        place: "Choose where you live.",
      },
    },
    end: {
      edit: "Change my answers",
      title: "Thank you!",
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
        `I just did a ${minutes}-minute survey for an EPFL student project. No sign-in: ${link}`,
    },
  },
};

export type TourText = typeof EN;
