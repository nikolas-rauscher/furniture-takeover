import type { TourText } from "./en";

/**
 * The tour page in German, in Swiss spelling (ss for ß). A no-break space joins a number
 * to its unit and CHF to its amount.
 */

export const DE: TourText = {
  locale: "de-CH",
  common: {
    language: "Sprache",
    languageNames: { en: "English", fr: "Français", de: "Deutsch" },
    surveyHeading: "Umfrage zu takeover",
    surveyUpdated:
      "Die Umfrage wurde aktualisiert und beginnt deshalb von vorn.",
    back: "Zurück",
    continue: "Weiter",
    skip: "Überspringen",
    send: "Senden",
    tryAgain: "Nochmals versuchen",
    openApp: "takeover öffnen",
    rank: (place) => `Platz ${place}`,
    textCount: (count, max) => `${count} von ${max} Zeichen`,
    optional: "Deine Antwort (optional)",
    inAFewWords: (option) => `${option}: in ein paar Worten (optional)`,
    save: {
      saved: "Deine Antworten sind gespeichert.",
      saving: "Deine Antworten werden gespeichert…",
      failed:
        "Einige Antworten sind noch nicht gespeichert. Prüfe deine Verbindung und versuch es nochmals.",
    },
  },
  notices: {
    loading: {
      title: "Einen Moment…",
      text: "Ich bereite die Umfrage vor.",
    },
    invalidLink: {
      title: "Dieser Link zur Umfrage ist unvollständig.",
      text: "Du kannst dir trotzdem die Demo von takeover ansehen.",
    },
    unreachable: {
      title: "Ich kann die Umfrage gerade nicht laden.",
      text: "Prüfe deine Verbindung und versuch es nochmals. Oder sieh dir die Demo an.",
    },
    closed: {
      title: "Die Umfrage ist im Moment geschlossen.",
      text: "Danke fürs Vorbeischauen. Du kannst dir trotzdem die Demo von takeover ansehen.",
    },
    doneBefore: {
      title: "Du hast schon teilgenommen.",
      text: "Danke fürs Mitmachen. Wenn du von uns hören möchtest, kannst du unten deine E-Mail-Adresse hinterlassen.",
    },
    showTour: "Demo ansehen",
    loadFailed: {
      title: "Keine Verbindung",
      text: "Die Seite konnte nicht geladen werden. Prüfe deine Verbindung und lade sie neu.",
    },
  },
  scenes: {
    find: {
      title: "Sag einfach, was du brauchst",
      text: "Jemand beim Vortex braucht einen Schreibtisch. Ich prüfe Inserate von Studierenden und bereite das Angebot vor. Gesendet wird erst, wenn die Person tippt.",
      label:
        "Beispiel in der App: Eine studierende Person tippt «a desk under CHF\u00a080 near Vortex». Pako durchsucht Inserate von Studierenden und zeigt zwei Schreibtische. Die Person öffnet das Inserat für den kompakten Schreibtisch und sendet Léa Pakos Angebot über CHF\u00a035.",
    },
    sell: {
      title: "Fang mit einem Foto an",
      text: "Léa fotografiert ihren Schreibtisch. Ich schreibe das Inserat und schlage einen Preis vor. Sie wählt ihren eigenen und speichert das Inserat.",
      label:
        "Beispiel in der App: Léa fügt ein Foto ihres Schreibtischs hinzu. Pako schreibt das Inserat, fragt nach der Abholzeit und schlägt CHF\u00a035 vor. Léa setzt den Preis auf CHF\u00a040 und speichert das Inserat auf ihrem Gerät.",
    },
    deal: {
      title: "Sich einigen und abholen",
      text: "Noah bietet CHF\u00a035 und Léa bestätigt. Damit steht der Abholtermin. Zum Termin bestätigen beide die Übergabe.",
      label:
        "Beispiel in der App: Noah bietet CHF\u00a035 für Léas Schreibtisch. Léa tippt auf «Confirm sale», der Abholtermin steht und der Countdown beginnt. Noah tippt auf «Picked up» und Léa markiert den Schreibtisch als verkauft.",
    },
  },
  pitch: {
    title: "Secondhand-Funde von Studierenden.",
    lead: "Pako hilft dir, Dinge zu finden, Inserate zu schreiben und eine Abholung mit Studierenden rund um EPFL, UNIL und die FMEL-Wohnheime zu vereinbaren. Du entscheidest, was gesendet wird.",
    seeHow: "So funktioniert es",
    replay: "Nochmals abspielen",
    exampleScreen: (title) => `${title}, Beispielbildschirm`,
    sections: {
      find: {
        title: "Finden",
        sentences: [
          "Schreib in eigenen Worten, was du brauchst, wie in einer Nachricht an Freunde.",
          "Pako prüft Inserate von Studierenden in deiner Nähe und zeigt, was passt und was du prüfen solltest.",
        ],
      },
      sell: {
        title: "Verkaufen",
        sentences: [
          "Fang mit einem Foto des Gegenstands an.",
          "Pako bereitet das Inserat vor und schlägt anhand ähnlicher Angebote einen Preis vor. Du prüfst beides vor dem Veröffentlichen.",
        ],
      },
      agree: {
        title: "Sich einigen und abholen",
        sentences: [
          "Pako liest die Antworten und schlägt dir vor, was du schreiben kannst. Du entscheidest, was du sendest.",
          "Beide müssen den Verkauf bestätigen. Dann steht der Abholtermin.",
        ],
      },
    },
    backAndForth: {
      title: "Pako übernimmt das Hin und Her",
      sentences: [
        "Ohne takeover heisst ein Schreibtisch: Inserate an vielen Orten, viele Nachrichten und eine Abholung, die organisiert werden muss.",
        "Pako sortiert die Inserate und bereitet das Angebot vor. Du sendest es mit einem Tippen, beide bestätigen, und am Abholtag gibst du mit einem Tippen Bescheid.",
      ],
      chapters: {
        search: "Suche",
        messages: "Nachrichten",
        pickup: "Abholung",
      },
      lines: {
        scattered:
          "Schreibtische werden an vielen Orten inseriert. Wer etwas verkauft, bekommt immer wieder dieselben Fragen.",
        sorted:
          "Ich prüfe Inserate von Studierenden und finde zwei passende Schreibtische unter CHF\u00a080 beim Vortex.",
        pile: "Dann geht das Hin und Her los: Preis, Uhrzeit, Ort, und jemand verspätet sich.",
        offer:
          "Ich fasse Preis, Uhrzeit und Treffpunkt in einem Angebot zusammen. Du prüfst es.",
        sent: "Gesendet wird nur, wenn du tippst. Ich sende nie etwas von mir aus.",
        booked: "Léa bestätigt, damit steht der Abholtermin.",
        reminder: "Vor der Abholung kommt eine Erinnerung.",
        underway:
          "Unterwegs gibst du Léa mit einem Tippen Bescheid: «Bin unterwegs» oder «Bin spät dran».",
        done: "Nach der Übergabe bestätigst du mit einem Tippen. Fertig.",
      },
      label:
        "Animation in drei Teilen. Suche: Aus Inseraten an vielen Orten wählt Pako zwei passende Schreibtische aus. Nachrichten: Aus vielen Fragen wird ein Angebot mit Preis, Uhrzeit und Treffpunkt, das die Person mit einem Tippen sendet. Abholung: Léa bestätigt, der Abholtermin steht und eine Erinnerung erscheint. Unterwegs gibt die Person Léa mit einem Tippen Bescheid und bestätigt nach der Übergabe die Abholung.",
    },
    principlesTitle: "Was gilt",
    principles: {
      send: {
        title: "Nichts wird gesendet, bis du tippst",
        text: "Pako entwirft Nachrichten und Angebote. Du entscheidest, was rausgeht.",
      },
      students: {
        title: "Für Studierende der EPFL und der UNIL",
        text: "Ein Konto braucht eine Adresse mit @epfl.ch oder @unil.ch.",
      },
      prices: {
        title: "Preise mit ihren Quellen",
        text: "Zu jedem Preisvorschlag siehst du die Angebote, auf denen er beruht.",
      },
    },
    invite: {
      title: "Hilf uns, die nächsten Funktionen zu planen",
      text: (minutes) =>
        `Pako fragt nach dem letzten Mal, als du etwas Gebrauchtes gekauft, verkauft oder verschenkt hast, und zeigt dann ein paar kurze Situationen. Es dauert etwa ${minutes} Minuten.`,
      action: "Mitmachen",
    },
    footer:
      "takeover ist ein Studierendenprojekt des Kurses CS-500 an der EPFL.",
  },
  v1: {
    invitation:
      "Hallo, ich bin Pako! Ich helfe dir in takeover, einem Studierendenprojekt an der EPFL. Ich möchte dich fragen, wann du zuletzt etwas Gebrauchtes gekauft oder verkauft hast, und dir dann zeigen, was wir entwickeln. Es dauert etwa 4 Minuten.",
    start: "Starten",
    justTour: "Zeig mir nur die Demo",
    consentTitle: "Bevor wir anfangen",
    consent: {
      anonymous: "Deine Antworten werden ohne deinen Namen gespeichert.",
      extra:
        "Ich speichere auch, wie lange jeder Schritt dauert, welcher Link dich hergebracht hat und ob du ein Handy oder einen Computer benutzt.",
      ip: "Deine IP-Adresse wird nicht mit deinen Antworten gespeichert.",
      email:
        "Am Schluss kannst du eine E-Mail-Adresse angeben. Sie wird separat gespeichert.",
      deleted: (date) => `Alles wird bis zum ${date} gelöscht.`,
      questions: "Fragen:",
    },
    agree: "Einverstanden",
    decline: "Nein danke, zeig mir nur die Demo",
    progress: "Fortschritt der Studie",
    stepOf: (step, total) => `Schritt ${step} von ${total}`,
    steps: {
      student: {
        question: "Studierst du?",
        options: {
          "yes-epfl": "Ja, an der EPFL",
          "yes-unil": "Ja, an der UNIL",
          "yes-elsewhere": "Ja, anderswo",
          no: "Nein",
        },
      },
      housing: {
        question: "Wo wohnst du im Moment?",
        options: {
          fmel: "FMEL-Wohnheim",
          "shared-flat": "Wohngemeinschaft",
          "own-flat": "Eigene Wohnung oder eigenes Studio",
          "with-family": "Bei der Familie",
          elsewhere: "Anderswo",
        },
      },
      "last-role": {
        question:
          "Denk an das letzte Mal, als du versucht hast, etwas Gebrauchtes zu kaufen, zu verkaufen oder zu verschenken. Was wolltest du tun?",
        options: {
          buying: "Kaufen",
          selling: "Verkaufen",
          "giving-away": "Verschenken",
          "not-tried": "Ich habe es in den letzten 12 Monaten nicht versucht",
        },
      },
      "last-occasion": {
        question: "Was war der Anlass?",
        options: {
          "moving-in": "Einzug",
          "moving-out": "Auszug",
          "during-year": "Keins von beiden, es war im Laufe des Jahres",
        },
      },
      "last-outcome": {
        question: "Wie ist es ausgegangen?",
        options: {
          "worked-out": "Es hat geklappt",
          "gave-up": "Ich habe aufgegeben",
          "still-open": "Es ist noch offen",
        },
      },
      "last-hard": {
        question: "Was war schwierig? Wähle alles Zutreffende.",
        options: {
          finding: "Den richtigen Gegenstand oder Käufer finden",
          listing: "Das Inserat schreiben",
          price: "Sich auf einen Preis einigen",
          replies: "Späte oder keine Antworten",
          "pickup-fell-through": "Eine Abholung, die geplatzt ist",
          timing: "Eine passende Zeit finden",
          transport: "Den Gegenstand von A nach B bringen",
          trust: "Nicht sicher, ob ich der anderen Person trauen konnte",
          nothing: "Nichts, es war einfach",
          "something-else": "Etwas anderes",
        },
      },
      "last-transport": {
        question: "Wie kam der Gegenstand von A nach B?",
        options: {
          "on-foot": "Zu Fuss",
          bike: "Mit dem Velo",
          "public-transport": "Mit dem ÖV",
          car: "Mit Auto oder Lieferwagen",
          delivery: "Lieferung oder Post",
          didnt: "Gar nicht",
        },
      },
      attempts: {
        question:
          "Wie oft hast du in den letzten 12 Monaten versucht, etwas Gebrauchtes zu kaufen, zu verkaufen oder zu verschenken?",
        options: {
          once: "Einmal",
          "two-to-five": "2 bis 5 Mal",
          "more-than-five": "Mehr als 5 Mal",
        },
      },
      "nearer-or-cheaper": {
        question:
          "Du brauchst einen Schreibtisch. Ich habe zwei passende gefunden. Welchen würdest du nehmen?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Keinen",
        },
      },
      "far-transport": {
        question: "Wie würdest du ihn nach Hause bringen?",
        options: {
          "on-foot": "Zu Fuss",
          bike: "Mit dem Velo",
          "public-transport": "Mit dem ÖV",
          car: "Mit Auto oder Lieferwagen",
          delivery: "Lieferung oder Post",
          "not-sure": "Weiss ich noch nicht",
        },
      },
      "would-use": {
        question: "Was davon würdest du nutzen? Wähle beliebig viele.",
        options: {
          "describe-search": "Suchen, indem ich beschreibe, was ich brauche",
          "photo-listing": "Ein Inseratentwurf anhand meiner Fotos",
          "price-suggestion": "Ein Preisvorschlag aus ähnlichen Angeboten",
          "offer-drafts": "Angebotsentwürfe zum Bearbeiten und Senden",
          "pickup-reminders": "Abholung mit Bestätigungen und Erinnerungen",
          none: "Nichts davon",
        },
      },
      autonomy: {
        question: "Was sollte ich tun dürfen, ohne dich vorher zu fragen?",
        options: {
          nothing: "Nichts. Ich sende alles selbst",
          "short-updates": "Kurze Statusmeldungen wie «Bin unterwegs»",
          "simple-replies": "Antworten auf einfache Fragen",
          negotiate: "Verhandeln in dem Rahmen, den ich vorgebe",
        },
      },
      "need-soon": {
        question:
          "Hast du in den nächsten vier Wochen etwas zu verkaufen oder brauchst du etwas?",
        options: {
          sell: "Etwas zu verkaufen",
          need: "Ich brauche etwas",
          both: "Beides",
          neither: "Keins von beiden",
        },
      },
      age: {
        question: "Wie alt bist du?",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-plus": "27 oder älter",
          "no-answer": "Möchte ich nicht sagen",
        },
      },
      gender: {
        question: "Dein Geschlecht?",
        options: {
          woman: "Frau",
          man: "Mann",
          "non-binary": "Nichtbinär",
          "no-answer": "Möchte ich nicht sagen",
        },
      },
      level: {
        question: "Welchen Abschluss strebst du an?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doktorat",
          exchange: "Austauschsemester",
          other: "Etwas anderes",
        },
      },
    },
    deskDetails: {
      nearer: "In deinem Wohnheim, 200\u00a0m",
      cheaper: "Zentrum von Lausanne, 4\u00a0km",
    },
    sameDesk: "Gleicher Schreibtisch, gleicher Zustand.",
    lastStory: "In ein paar Worten: Was ist passiert?",
    draftWhy: "Warum hast du dich so entschieden?",
    missing: "Was fehlt, oder was würde dich davon abhalten, es zu nutzen?",
    tasksIntro:
      "Danke! Jetzt zwei kurze Situationen. Nichts hier ist echt und nichts wird gesendet.",
    tourIntro: "Jetzt kommt die kurze Demo. So funktioniert takeover.",
    draft: {
      situation:
        "Du möchtest Mias Schreibtisch. Du hast ihr gesagt, dass du ihn nur am Samstag abholen kannst.",
      prompt: "Ich habe dein Angebot vorbereitet. Prüf es und entscheide dann.",
      draft:
        "Hallo Mia! Ich hätte gern deinen weissen Schreibtisch. Wären CHF\u00a040 okay? Ich könnte ihn am Freitag um 17:30 beim FMEL-Wohnheim Atrium abholen.",
      explanation:
        "Eine Sache: Im Entwurf stand Freitag, du hattest aber Samstag gesagt. Das war Absicht. Wir möchten sehen, wie Entwürfe geprüft werden.",
      situationTitle: "Die Situation",
      draftTitle: "Pakos Entwurf an Mia",
      sent: "Du hast gesendet",
      notSent: "Du hast das Angebot nicht gesendet.",
      send: "Angebot senden",
      edit: "Bearbeiten",
      writeOwn: "Selbst schreiben",
      dontSend: "Nicht senden",
      editLabel: "Dein Angebot an Mia",
      ownLabel: "Dein eigenes Angebot an Mia",
      ownPlaceholder: "Schreib dein Angebot",
    },
    contact: {
      question:
        "Dürfen wir dir per E-Mail zwei oder drei Folgefragen stellen oder dich einladen, wenn wir mit echten Gegenständen testen?",
      email: "E-Mail-Adresse (optional)",
      invalid: "Das sieht noch nicht wie eine E-Mail-Adresse aus.",
      note: "Getrennt von deinen Antworten gespeichert, ausser du kreuzt das zweite Feld an.",
      pilot: "Mich zum Test mit echten Gegenständen einladen",
      link: "Diese Adresse mit meinen Antworten verknüpfen",
    },
    end: {
      text: "Danke! Das hilft uns, die nächsten Funktionen zu planen.",
      share: "Studie teilen",
      copied: "Link zur Studie kopiert.",
      copyFailed: "Ich konnte den Link nicht kopieren. Hier ist er:",
    },
  },
  v3: {
    sections: {
      "last-time": "Deine Erfahrung",
      home: "Du im Moment",
      "the-app": "Die App",
      price: "Preis und Angaben zu dir",
    },
    progress: "Teile der Umfrage",
    lastPart: "Letzter Teil",
    sectionState: {
      done: (name) => `${name}: erledigt`,
      current: (name) => `${name}: aktuell`,
      next: (name) => `${name}: kommt noch`,
    },
    start: {
      bubble: (minutes) =>
        `Hallo, ich bin Pako, der Assistent der App takeover. Studierende der EPFL entwickeln sie, damit Studierende rund um die EPFL und die UNIL gebrauchte Sachen kaufen, verkaufen und verschenken können. Die Umfrage dauert etwa ${minutes}\u00a0Minuten.`,
      saveTitle: "Was wir speichern",
      moreBelow: "Weiter unten geht es weiter",
      save: (date) =>
        `Wir speichern deine Antworten und erfassen, welche Seiten du ansiehst, überspringst oder erneut öffnest und wie lange du auf jeder Seite bleibst. Ausserdem erfassen wir, über welchen Link du zur Umfrage gekommen bist, welche Sprache du verwendest und ob du ein Handy oder einen Computer nutzt. Während der Umfrage bleibt dein Fortschritt in diesem Tab. Nach dem Abschluss speichert dieser Browser deine Antworten, damit du sie später ändern kannst. Wenn du am Schluss deine E-Mail-Adresse angibst, speichern wir sie getrennt von deinen Antworten. Wir löschen die erhobenen Studiendaten bis zum ${date}.`,
      questions: "Fragen zur Umfrage:",
      go: "Umfrage starten",
      demo: "Zeig mir nur die App",
    },
    parts: {
      label: (current, total) => `Teil ${current} von ${total}`,
      "last-time": {
        bubble: "Zuerst ein paar Fragen zu deiner eigenen Erfahrung.",
        text: "Es gibt keine richtigen oder falschen Antworten.",
      },
      home: {
        bubble:
          "Jetzt ein paar Fragen zu dir im Moment: zu Gebrauchtem und zu Sachen, die du zu Hause hast.",
        text: "Zum Beispiel Möbel, Bücher, Küchensachen oder Elektronik.",
      },
      "the-app": {
        bubble:
          "Léa verkauft ihren Schreibtisch und du möchtest ihn kaufen. Ihr habt beide einen eigenen Pako. Die beiden Pakos sprechen miteinander und suchen einen Abholtermin, der euch beiden passt. Du kannst Léa auch selbst schreiben.",
        text: "Zwei kurze Szenen, ein Chat und ein paar Fragen zur Geschichte.",
      },
      price: {
        bubble: "Letzter Teil: der Preis, dann ein paar Fragen zu dir.",
        text: "Dann bist du fertig.",
      },
    },
    cards: {
      lastTime: {
        text: "Denk an deinen letzten Versuch, etwas Gebrauchtes zu kaufen, zu verkaufen, zu verschenken oder gratis zu bekommen. Es zählt auch, wenn es nicht geklappt hat.",
      },
      wanted: {
        title: "Eine Idee für takeover: Suchanfragen.",
        text: "Léa braucht noch eine Schreibtischlampe für ihr neues Zimmer. Wer etwas sucht, kann es in der App posten, und Studierende in der Nähe sehen es.",
      },
      delegate: {
        text: "Stell dir vor, du verkaufst Léas Tisch. Pako könnte für dich schreiben. Die Nachrichten siehst du erst danach.",
      },
      price: {
        text: "Stell dir vor, Pako schreibt deine Inserate und kümmert sich um die Nachrichten.",
      },
    },
    wantedPost: {
      label: "Beispiel einer Suchanfrage in der App",
      text: "Léa, 5\u00a0Minuten von dir entfernt, sucht eine Schreibtischlampe.",
    },
    scenes: {
      sell: {
        title: "Léa verkauft ihren Schreibtisch",
        text: "Léa zieht aus und verkauft ihren Schreibtisch mit takeover. Sie macht ein Foto, Pako schreibt das Inserat und schlägt einen Preis vor, und Léa legt ihren eigenen Preis fest: CHF\u00a040.",
      },
      deal: {
        title: "Die Abholung steht",
        text: "Auf Léas Handy heisst du Noah. Pako kennt den Termin. Wenn sich jemand verspätet oder nicht mehr antwortet, fragt Pako bei euch beiden nach. Ihr könnt die Zeit ändern oder die Abholung bestätigen. Léa sieht, dass du zehn Minuten später kommst. Antwortest du nicht mehr, kann sie den Tisch wieder freigeben.",
        label:
          "Léa nimmt CHF 40 an. Noah meldet zehn Minuten Verspätung, Pako zeigt die neue Ankunftszeit. Noah bestätigt die Abholung und Léa markiert den Tisch als verkauft.",
      },
    },
    steps: {
      who: {
        question: "Studierst du?",
        options: {
          epfl: "Ja, an der EPFL",
          unil: "Ja, an der UNIL",
          "other-school": "Ja, an einer anderen Hochschule",
          no: "Nein",
        },
      },
      housing: {
        question: "Wo wohnst du im Moment?",
        options: {
          fmel: "In einem FMEL-Wohnheim",
          "other-res": "In einem anderen Studierendenwohnheim",
          flat: "WG, Wohnung oder Studio (kein Wohnheim)",
          family: "Bei meiner Familie",
          elsewhere: "Woanders",
        },
      },
      "last-role": {
        question: "Was wolltest du tun?",
        options: {
          buying: "Etwas kaufen",
          "getting-free": "Etwas gratis bekommen",
          selling: "Etwas verkaufen",
          "giving-away": "Etwas verschenken",
          none: "Das habe ich noch nie versucht",
        },
      },
      "last-item": {
        question: "Worum ging es?",
        options: {
          furniture: "Möbel",
          household: "Haushaltssachen",
          electronics: "Elektronik",
          bike: "Velo oder Trottinett",
          books: "Bücher",
          clothes: "Kleider",
          other: "Anderes",
        },
      },
      "last-occasion": {
        question: "Hatte das mit einem Umzug zu tun?",
        options: {
          "moving-in": "Ja, mit dem Einzug",
          "moving-out": "Ja, mit dem Auszug",
          both: "Ja, beides (Aus- und Einzug)",
          "no-move": "Nein",
        },
      },
      "last-how": {
        question: "Wo hast du es zuerst versucht?",
        options: {
          friends: "Bei Freunden oder Bekannten",
          "chat-group": "In einer WhatsApp- oder Telegram-Gruppe",
          facebook: "Auf Facebook Marketplace",
          anibis: "Auf Anibis, Tutti oder Ricardo",
          other: "Woanders",
        },
      },
      "last-outcome": {
        question: "Hat es geklappt?",
        options: { yes: "Ja", no: "Nein", ongoing: "Ist noch offen" },
      },
      "last-trouble": {
        question: "Was war daran schwierig?",
        options: {
          nothing: "Nichts war schwierig",
          finding: "Etwas Passendes finden",
          gone: "Dass es schon weg war",
          "agree-price": "Sich auf einen Preis einigen",
          "finding-taker": "Jemanden finden, den es interessiert",
          "deadline-pickup": "Die Abholung vor meiner Frist organisieren",
          listing: "Das Inserat schreiben",
          "set-price": "Den Preis festlegen",
          replies: "Auf Antworten warten",
          messages: "Viele Nachrichten hin und her",
          timing: "Einen Abholtermin vereinbaren",
          cancelled: "Abgesagte Abholungen",
          transport: "Der Transport",
          trust: "Der anderen Person vertrauen",
          other: "Etwas anderes",
          "cant-recall": "Weiss nicht mehr",
        },
      },
      "last-transport": {
        question: "Wie wurde es transportiert?",
        options: {
          foot: "Zu Fuss",
          bike: "Mit dem Velo",
          "public-transport": "Mit dem ÖV",
          car: "Mit dem Auto",
          delivery: "Per Lieferung",
          "not-yet": "Noch nicht transportiert",
          "dont-know": "Weiss nicht",
        },
      },
      "last-messages": {
        question:
          "Wie viele Nachrichten gingen dafür ungefähr hin und her, mit allen zusammen?",
        options: {
          none: "Keine",
          "1-3": "1–3",
          "4-7": "4–7",
          "8-12": "8–12",
          "over-12": "Mehr als 12",
          "dont-remember": "Weiss nicht mehr",
        },
      },
      "trade-frequency": {
        question:
          "Wie oft kaufst, verkaufst oder verschenkst du etwas Gebrauchtes?",
        options: {
          "monthly-plus": "Mehrmals im Monat",
          monthly: "Etwa einmal im Monat",
          yearly: "Ein paar Mal im Jahr",
          rarely: "Seltener",
          never: "Nie",
        },
      },
      "idle-items": {
        question:
          "Wie viele brauchbare Sachen hast du zu Hause, die du gerade nicht benutzt?",
        options: {
          none: "Keine",
          "1-3": "1–3",
          "4-10": "4–10",
          "over-10": "Mehr als 10",
        },
      },
      "idle-release": {
        question:
          "Käme es für dich infrage, etwas davon zu verkaufen oder zu verschenken?",
        options: { yes: "Ja", no: "Nein", unsure: "Unsicher" },
      },
      "idle-why": {
        question: "Warum hast du sie noch?",
        options: {
          "listing-hassle": "Inserieren ist mir zu mühsam",
          "messages-hassle": "Nachrichten und Termine sind mir zu mühsam",
          transport: "Ich kann sie nicht transportieren",
          "not-worth": "Für das Geld lohnt sich der Aufwand nicht",
          "dont-know-whom": "Ich weiss nicht, wem ich sie anbieten könnte",
          "might-need": "Ich brauche sie vielleicht noch",
          keep: "Ich will sie behalten",
          "not-yet": "Ich bin noch nicht dazu gekommen",
          other: "Anderes",
        },
      },
      "wanted-react": {
        question:
          "Du hast eine Schreibtischlampe übrig. Was würdest du am ehesten tun?",
        options: {
          "offer-now": "Sie jetzt anbieten",
          "offer-later": "Sie später anbieten",
          leave: "Die Anfrage nicht beantworten",
          "rather-not": "Ich will solche Suchanfragen nicht sehen",
        },
      },
      seeking: {
        question: "Suchst du gerade etwas Gebrauchtes?",
        options: { yes: "Ja", no: "Nein" },
      },
      delegate: {
        question: "Was dürfte Pako ohne Rückfrage erledigen?",
        options: {
          none: "Nichts davon",
          "answer-questions": "Fragen zum Gegenstand beantworten",
          "suggest-time":
            "Eine meiner bei Pako hinterlegten Abholzeiten vorschlagen",
          remind: "Die andere Person an den Termin erinnern",
          negotiate: "Über den Preis verhandeln",
          "accept-offer": "Ein Angebot annehmen",
        },
      },
      "pay-model": {
        question:
          "In welcher Reihenfolge würdest du diese Preismodelle wählen?",
        options: {
          free: "Gratis",
          "free-ads": "Gratis mit Werbung",
          credits: "Guthabenpaket",
          "seller-fee": "Gebühr pro Verkauf",
          monthly: "Monatsabo",
        },
      },
      "check-listing": {
        question:
          "Was würdest du an Léas Stelle prüfen, bevor Pakos Inserat online geht?",
        options: {
          price: "Den Preis",
          description: "Die Beschreibung",
          photos: "Die Fotos",
          "pickup-times": "Die Abholzeiten",
          none: "Nichts davon",
        },
      },
      "max-distance": {
        question:
          "Wie weit würdest du höchstens gehen oder fahren, um einen gebrauchten Schreibtisch abzuholen?",
        options: {
          "under-1": "Unter 1\u00a0km",
          "1-3": "1–3\u00a0km",
          "3-10": "3–10\u00a0km",
          "over-10": "Mehr als 10\u00a0km",
        },
      },
      "trust-signals": {
        question: "Was würde dir helfen, der anderen Person zu vertrauen?",
        options: {
          verified: "Bestätigtes Studierendenkonto",
          reviews: "Bewertungen",
          "pako-rating":
            "Pakos Einschätzung der Zuverlässigkeit anhand früherer Verkäufe und Abholungen",
          "campus-meet": "Treffen auf dem Campus",
          chat: "Der bisherige Chat",
          none: "Nichts davon",
        },
      },
      "pay-for": {
        question: "Wofür würdest du am ehesten zahlen?",
        options: {
          listings: "Inserate schreiben lassen",
          replies: "Antworten und Termine von Pako",
          transport: "Transport oder Lieferung",
          visibility: "Mehr Sichtbarkeit für mein Inserat",
          nothing: "Für nichts davon",
        },
      },
      age: {
        question: "Wie alt bist du?",
        options: {
          "under-18": "Unter 18",
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31+",
          na: "Keine Angabe",
        },
      },
      gender: {
        question: "Dein Geschlecht?",
        options: {
          woman: "Frau",
          man: "Mann",
          "non-binary": "Nichtbinär",
          "self-describe": "Andere Bezeichnung",
          na: "Keine Angabe",
        },
      },
    },
    amounts: {
      "wtp-monthly": {
        question: "Wie viel würdest du dafür pro Monat zahlen?",
        choose: "Zum Auswählen ziehen",
        nothing: "Nichts",
        amount: (francs) => `CHF ${francs} pro Monat`,
        top: (francs) => `CHF ${francs}`,
      },
    },
    seekingWhat: "Was suchst du? (freiwillig)",
    chooseSeveral: "Du kannst mehrere wählen.",
    moreBelow: "Weitere Antworten unten",
    sceneInEnglish: "Beispiel aus der App (auf Englisch)",
    plans: {
      rankHint:
        "Tippe zuerst auf deinen Favoriten, dann auf die weiteren. Erneutes Antippen hebt die Auswahl auf.",
      idea: "Dein eigenes Preismodell (optional)",
      label: "Beispielpreise, noch nicht erhältlich",
      help: "Pakos Hilfe",
      pay: "Du zahlst",
      cards: {
        free: {
          price: "CHF\u00a00",
          help: "ein paar Mal pro Tag",
          pay: "nichts",
        },
        "seller-fee": {
          price: "5\u00a0%",
          help: "unbegrenzt",
          pay: "5\u00a0% des Verkaufspreises, nur wenn du etwas verkaufst (CHF\u00a02 bei CHF\u00a040)",
        },
        "free-ads": {
          price: "CHF\u00a00",
          help: "unbegrenzt, mit Werbung",
          pay: "nichts",
        },
        credits: {
          price: "CHF\u00a05",
          help: "50 Credits für Inserate, Chats und Nachrichten",
          pay: "CHF\u00a05 einmalig",
        },
        monthly: {
          price: "CHF\u00a03/Monat",
          help: "unbegrenzt",
          pay: "CHF\u00a03 pro Monat",
        },
      },
    },
    draft: {
      intro:
        "Du möchtest Léas Schreibtisch kaufen. Pako hat ihr schon für dich geschrieben.",
      scenario:
        "Du hast Pako gesagt, dass du am Wochenende abends Zeit hast. Léa hat ihrem Pako ihre freien Zeiten genannt.",
      task: "Wähle unten im Chat einen Tag.",
      chatLabel: "Übungschat mit Léa",
      listing: {
        title: "Kompakter Schreibtisch",
        size: "100\u00a0×\u00a050\u00a0cm",
        price: "CHF\u00a040",
        pickup: "Abholung: EPFL, Rolex Learning Center",
        seller: "Léa",
      },
      lea: "Léa",
      you: "Du",
      pako: "Pako",
      sentByPako: "Du · von Pako gesendet",
      opening: (price) =>
        `hey, ist der Tisch noch da? ich könnte dir CHF\u00a0${price} geben`,
      matchedTimes:
        "Léas Pako und ich haben zwei Termine gefunden, die euch beiden passen. Samstag oder Sonntag um 17.30 Uhr?",
      revise: "Tag oder Antwort ändern",
      askDay: "ja, ist noch da! wann könntest du ihn abholen?",
      pickDay: "Deine Antwort an Léa",
      days: { sat: "Samstag", sun: "Sonntag" },
      yourDay: (day) => `geht ${day} um 17.30?`,
      confirm: (day) => `${day} passt! vorm Rolex?`,
      typing: (name) => `${name} schreibt`,
      offerReady: "So könntest du den Termin bestätigen.",
      offer: (day, price) =>
        `bis ${day} um 17.30 vorm Rolex! ich bring die CHF\u00a0${price} mit`,
      offerTitle: "Pakos Entwurf",
      question: "Was würdest du mit diesem Entwurf machen?",
      sendAsIs: "So senden",
      change: "Bearbeiten",
      own: "Selbst schreiben",
      ownLabel: "Deine Nachricht an Léa",
      send: "Senden",
      dontSend: "Nichts senden",
      editLabel: "Deine Antwort an Léa",
      notSent: "Du hast nichts gesendet.",
    },
    scene: { next: "Weiter", replay: "Nochmals abspielen" },
    pilot: {
      sending: "Deine E-Mail-Adresse wird gesendet…",
      failed:
        "Deine E-Mail-Adresse wurde nicht gespeichert. Prüfe deine Verbindung und versuch es nochmals.",
      invite: "Möchtest du wieder von uns hören?",
      email: "E-Mail-Adresse",
      ticksLegend: "Was möchtest du?",
      ticks: {
        launchNews: "Sagt mir Bescheid, wenn takeover startet",
        tryEarly: "Ich möchte takeover vorher ausprobieren",
        interview: "Ich mache bei einem 15-minütigen Gespräch mit",
        futureSurveys: "Ladet mich zu späteren Umfragen ein",
      },
      role: "Was möchtest du ausprobieren?",
      roles: {
        buy: "Kaufen",
        "get-free": "Gratis bekommen",
        sell: "Verkaufen",
        "give-away": "Verschenken",
        "not-sure": "Weiss noch nicht",
      },
      place: "Wo wohnst du?",
      places: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Ein anderes FMEL-Wohnheim",
        "other-res": "Ein anderes Studierendenwohnheim",
        flat: "Eine Wohnung oder ein Studio",
        elsewhere: "Woanders",
      },
      note: "Freiwillig. Wird getrennt von deinen Antworten aufbewahrt.",
      send: "Senden",
      sent: "Wir haben deine E-Mail-Adresse gespeichert und melden uns.",
      errors: {
        emailMissing: "Gib deine E-Mail-Adresse ein.",
        emailInvalid: "Das sieht nicht wie eine E-Mail-Adresse aus.",
        ticks: "Kreuze mindestens ein Feld an.",
        role: "Wähle, was du ausprobieren möchtest.",
        place: "Wähle, wo du wohnst.",
      },
    },
    end: {
      edit: "Meine Antworten ändern",
      title: "Danke!",
      shareTitle:
        "Jede Antwort hilft, auch von Leuten, die nie etwas verkaufen. Magst du die Umfrage teilen?",
      share: "Teilen",
      copy: "Link kopieren",
      showQr: "QR-Code zeigen",
      hideQr: "QR-Code ausblenden",
      qrLabel: "QR-Code für den Link zur Umfrage",
      copied: "Link kopiert.",
      copyFailed: "Der Link konnte nicht kopiert werden. Hier ist er:",
      shareText: (minutes, link) =>
        `Ich habe gerade bei einer ${minutes}-minütigen Umfrage für ein Studierendenprojekt der EPFL mitgemacht. Ohne Anmeldung: ${link}`,
    },
  },
};
