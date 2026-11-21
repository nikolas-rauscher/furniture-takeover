import type { TourText } from "./en";

/**
 * The tour page in German, in Swiss spelling (ss for ß). A no-break space joins a number
 * to its unit and CHF to its amount.
 */
const helped = {
  question: "Hätte dir das letztes Mal geholfen?",
  options: {
    yes: "Ja",
    partly: "Teilweise",
    no: "Nein",
    na: "Trifft auf mich nicht zu",
  },
};

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
      text: "Danke! Dieser Browser merkt sich, dass du die Umfrage abgeschlossen hast. Du kannst dir trotzdem die Demo von takeover ansehen.",
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
      you: "Du",
      "last-time": "Letztes Mal",
      "the-app": "Die App",
      situations: "Situationen",
      price: "Preis und Lieferung",
    },
    progress: "Teile der Umfrage",
    sectionState: {
      done: (name) => `${name}: erledigt`,
      current: (name) => `${name}: aktuell`,
      next: (name) => `${name}: kommt noch`,
    },
    start: {
      bubble: (minutes) =>
        `Hallo, ich bin Pako! Wir studieren an der EPFL und entwickeln takeover, eine App, um gebrauchte Sachen rund um den Campus weiterzugeben. Hast du ${minutes} Minuten? Ohne Anmeldung. Alle sind willkommen, auch wenn du noch nie etwas Gebrauchtes gekauft oder verkauft hast.`,
      saveTitle: "Was wir speichern",
      save: (date) =>
        `Deine Antworten, welche Seiten der Umfrage du ansiehst, überspringst oder erneut öffnest, wie lange du auf jeder Seite bleibst, über welchen Link du gekommen bist, deine Sprache und ob du ein Handy oder einen Computer nutzt. Dein Fortschritt bleibt in diesem Tab, bis du ihn schliesst. Dein Browser merkt sich, dass du die Umfrage abgeschlossen hast. Am Schluss kannst du eine E-Mail-Adresse angeben. Sie wird getrennt von deinen Antworten gespeichert. Alles wird bis zum ${date} gelöscht.`,
      questions: "Fragen:",
      go: "Los geht's",
      demo: "Zeig mir nur die App",
    },
    whatIs: {
      bubble: "Das macht takeover.",
      title: "Was ist takeover?",
      find: {
        title: "Finden",
        text: "Beschreib, was du brauchst, und ich suche in Inseraten von Studierenden in deiner Nähe.",
      },
      sell: {
        title: "Verkaufen",
        text: "Mach ein Foto, und ich schreibe das Inserat mit einem Preisvorschlag.",
      },
      agree: {
        title: "Sich einigen",
        text: "Einige dich im Chat auf Preis und Abholzeit, dann trefft ihr euch auf dem Campus.",
      },
      nextTitle: "Wie es weitergeht",
      next: [
        "Deine letzte Erfahrung mit Gebrauchtem",
        "Ein kurzer Blick auf die App",
        "Ein paar kurze Situationen",
      ],
      duration: (minutes) => `Etwa ${minutes} Minuten`,
    },
    situations: {
      label: (current, total) => `Situation ${current} von ${total}`,
      pickOne: "Wähle eine Antwort.",
      "move-it":
        "Du hast einen Schreibtisch gefunden, der dir gefällt, 4\u00a0km von zu Hause entfernt.",
      desk: "Du brauchst einen Schreibtisch. Zwei in der App kommen infrage.",
      draft: "Du kaufst Mia einen Schreibtisch ab. Preis und Ort passen dir.",
      draftTask:
        "Antworte Mia und wähle dann, was du mit Pakos Entwurf machst.",
    },
    steps: {
      "wanted-react": {
        question: "Wenn takeover dir das zeigen würde, was würdest du tun?",
        options: {
          snap: "Ein Foto machen und inserieren",
          look: "Mal anschauen, vielleicht später",
          ignore: "Ignorieren",
          "rather-not": "Ich möchte so etwas lieber nicht sehen",
        },
      },
      "wanted-share": {
        question:
          "Wenn du etwas suchst, würdest du Studierende in der Nähe deine Anfrage sehen lassen? Gezeigt werden nur der Artikel und deine Gegend, nie dein Name.",
        options: { yes: "Ja", maybe: "Vielleicht", no: "Nein" },
      },
      "last-cost": {
        question: "Was hat dich der Transport ungefähr gekostet?",
        options: {
          nothing: "Nichts",
          "under-10": "Unter CHF\u00a010",
          "10-30": "CHF\u00a010–30",
          "over-30": "Mehr als CHF\u00a030",
          "dont-remember": "Weiss nicht mehr",
        },
      },
      "pay-model": {
        question:
          "Die Grundfunktionen von takeover bleiben gratis. Wenn etwas Geld kosten müsste, was würdest du wählen?",
        options: {
          "seller-fee":
            "Eine kleine Gebühr, wenn dein Artikel verkauft wird (5\u00a0%, zahlt der Verkäufer)",
          "move-pack":
            "Ein einmaliges Auszugspaket (CHF\u00a05: mehr Inseratentwürfe per Foto und Preisprüfungen für 30 Tage)",
          monthly:
            "Ein Monatsabo (CHF\u00a03/Monat: unbegrenzte Hilfe von Pako)",
          institution:
            "Gratis für Studierende, bezahlt vom Wohnheim oder von der Hochschule",
          none: "Nichts davon, ich würde nicht zahlen",
        },
      },
      "delivery-pref": {
        question:
          "Wenn du etwas Sperriges gebraucht kaufst, wie würdest du es lieber bekommen?",
        options: {
          "pick-up": "Ich hole es selbst ab, um Geld zu sparen",
          "if-priced": "Lieferung, wenn der Preis stimmt",
          always: "Immer Lieferung",
          depends: "Kommt auf den Artikel an",
        },
      },
      "delivery-worth": {
        question:
          "Was wäre dir eine Lieferung bis vor die Tür innerhalb von Lausanne (bis etwa 5\u00a0km) wert?",
        options: {
          "only-free": "Nichts, nur wenn gratis",
          "up-to-5": "Bis CHF\u00a05",
          "5-10": "CHF\u00a05–10",
          "10-20": "CHF\u00a010–20",
          "over-20": "Mehr als CHF\u00a020",
          "not-sure": "Weiss nicht",
        },
      },
      who: {
        question: "Zuerst: Studierst du?",
        options: {
          epfl: "Ja, an der EPFL",
          unil: "Ja, an der UNIL",
          "other-school": "Ja, anderswo",
          no: "Nein",
        },
      },
      "last-role": {
        question:
          "Denk an das letzte Mal, als du versucht hast, etwas Gebrauchtes zu kaufen, gratis zu bekommen, zu verkaufen oder zu verschenken, auch wenn es nicht geklappt hat. Was wolltest du tun?",
        options: {
          buying: "Etwas kaufen",
          "getting-free": "Etwas gratis bekommen",
          selling: "Etwas verkaufen",
          "giving-away": "Etwas verschenken",
          none: "Mir fällt nichts ein",
        },
      },
      "last-item": {
        question: "Was war es?",
        options: {
          furniture: "Möbel (Schreibtisch, Stuhl, Regal, Bett)",
          household: "Kleine Sachen für den Haushalt",
          electronics: "Elektronik",
          bike: "Velo oder Trottinett",
          books: "Bücher oder Kursmaterial",
          clothes: "Kleider oder Schuhe",
          other: "Etwas anderes",
        },
      },
      "last-occasion": {
        question: "War es wegen eines Umzugs?",
        options: {
          "moving-in": "Ja, beim Einzug",
          "moving-out": "Ja, beim Auszug",
          "no-move": "Nein",
          "cant-recall": "Weiss ich nicht mehr",
        },
      },
      "last-trouble": {
        question:
          "Rückblickend: Welcher Teil hat dir am meisten Mühe gemacht, falls überhaupt einer?",
        options: {
          finding: "Den richtigen Gegenstand finden",
          listing: "Das Inserat schreiben oder Fotos machen",
          price: "Den Preis kennen oder sich darauf einigen",
          replies: "Späte oder keine Antworten",
          timing: "Eine Zeit vereinbaren, oder eine Abholung, die platzt",
          transport: "Den Gegenstand von A nach B bringen",
          trust: "Nicht sicher, ob ich der anderen Person trauen konnte",
          nothing: "Nichts war schwierig",
          other: "Etwas anderes",
          "cant-recall": "Weiss ich nicht mehr",
        },
      },
      "why-not": {
        question: "Was ist der Hauptgrund?",
        options: {
          "no-need": "Ich hatte nie Bedarf",
          "prefer-new": "Ich habe lieber neue Sachen",
          hassle: "Schien mir zu umständlich",
          "dont-know-where": "Ich wusste nicht, wo ich suchen sollte",
          other: "Etwas anderes",
        },
      },
      move: {
        question: "Planst du umzuziehen?",
        options: {
          "move-feb": "Ja, bis Ende Februar 2027",
          "move-jun": "Ja, März–Juni 2027",
          "move-later": "Ja, später",
          "no-plan": "Nein, nicht geplant",
          "not-sure": "Weiss nicht",
        },
      },
      housing: {
        question: "Wo wohnst du jetzt?",
        options: {
          fmel: "FMEL-Wohnheim",
          "other-res": "Ein anderes Studierendenwohnheim",
          flat: "Eine Wohnung oder ein Studio",
          family: "Bei der Familie",
          elsewhere: "Anderswo",
        },
      },
      headline: {
        question:
          "Welcher Satz würde dich am ehesten dazu bringen, die App zu öffnen, wenn überhaupt einer?",
        options: {
          "h-move": "«Verkauf deine Sachen, bevor du ausziehst.»",
          "h-photo":
            "«Mach ein Foto, bekomm ein fertiges Inserat mit fairem Preis.»",
          "h-ai":
            "«Ein KI-Assistent schreibt dein Inserat anhand eines Fotos.»",
          "h-nearby":
            "«Finde Gebrauchtes von Leuten in deiner Nähe, mit Abholung auf dem Campus.»",
          none: "Keiner davon",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question:
          "Was würde dich davon abhalten, takeover zu nutzen? Wähle beliebig viele.",
        options: {
          "ai-mistakes": "Die KI könnte Fehler machen",
          "nobody-nearby": "Zu wenige Leute in der Nähe nutzen es",
          "prefer-groups":
            "Ich mag meine WhatsApp- oder Telegram-Gruppen lieber",
          privacy: "Sorgen um meine Privatsphäre",
          "too-long": "Es dauert zu lange",
          nothing: "Nichts würde mich abhalten",
          other: "Etwas anderes",
        },
      },
      sending: {
        question:
          "Würdest du Pako manche Nachrichten für dich senden lassen, ohne dich vorher zu fragen?",
        options: {
          myself: "Nein, ich würde jede Nachricht selbst senden",
          "short-updates": "Nur kurze Statusmeldungen wie «Bin unterwegs»",
          "replies-too": "Kurze Statusmeldungen und einfache Antworten",
          "not-sure": "Weiss nicht",
        },
      },
      "move-it": {
        question:
          "Bevor du zum Kauf Ja sagst: Wie würdest du ihn am ehesten nach Hause bringen?",
        options: {
          "carry-bike": "Tragen oder mit dem Velo",
          "public-transport": "Mit dem ÖV",
          "friend-car": "Ein Auto leihen oder Freunde mit Auto fragen",
          helper:
            "Eine Transporthilfe mit Lastenvelo, in der App buchbar: CHF\u00a015 für die ganze Fahrt bis 4\u00a0km, bis vor deine Tür getragen (Erdgeschoss oder Lift; bei Treppen eventuell Aufpreis)",
          "skip-desk": "Ich würde stattdessen einen näheren suchen",
          "not-sure": "Weiss nicht",
        },
      },
      desk: {
        question: "Welchen würdest du nehmen?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Keinen",
        },
      },
      "scene-pick": {
        question: "Was möchtest du zuerst sehen?",
        options: {
          sell: "Verkaufen mit einem Foto",
          deal: "Eine Abholung vereinbaren",
          find: "Etwas finden",
        },
      },
      "try-first": {
        question:
          "Was würdest du beim nächsten Kauf oder Verkauf zuerst ausprobieren, wenn überhaupt etwas?",
        options: {
          "describe-search": "Suchen, indem ich beschreibe, was ich brauche",
          "photo-listing":
            "Ein Inseratentwurf anhand meiner Fotos, mit einem Preis und seinen Quellen",
          "offer-drafts": "Angebotsentwürfe zum Bearbeiten und Senden",
          "pickup-card":
            "Die Karte zur Abholung mit Bestätigungen und Erinnerungen",
          none: "Nichts davon",
          "need-more": "Ich müsste mehr darüber wissen",
        },
      },
      age: {
        question: "Dein Alter",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31 oder älter",
          na: "Möchte ich nicht sagen",
        },
      },
      gender: {
        question: "Dein Geschlecht",
        options: {
          woman: "Frau",
          man: "Mann",
          "non-binary": "Nichtbinär",
          "self-describe": "Ich beschreibe es lieber selbst",
          na: "Möchte ich nicht sagen",
        },
      },
      level: {
        question: "Was für ein Studium machst du?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doktorat",
          other: "Anderes Studium",
          "not-student": "Ich studiere nicht",
        },
      },
      exchange: {
        question: "Bist du im Austausch hier?",
        options: { yes: "Ja", no: "Nein", na: "Möchte ich nicht sagen" },
      },
    },
    helpedNeverTried: "Würde dir das helfen?",
    findingBySeller: "Jemanden finden, der es wollte",
    moveIntro: "Zwei kurze Fragen zu deiner aktuellen Situation.",
    firstLookIntro: "Jetzt ein erster Blick auf takeover.",
    situationsIntro: "Drei kurze Situationen.",
    priceIntro: "Letzter Teil: Preis und Lieferung.",
    packLadder: {
      bubble: "Noch eine Frage zum Auszugspaket.",
      title: "Auszugspaket",
      text: "Fünf weitere Inseratentwürfe per Foto mit Preisprüfung, 30 Tage gültig, einmalig bezahlt.",
      question: (price) =>
        `Würdest du CHF\u00a0${price} aus eigener Tasche für dieses Paket bei deinem nächsten Umzug ausgeben?`,
      options: { yes: "Ja", no: "Nein", "not-sure": "Weiss nicht" },
    },
    lastStory: {
      question: "In einem Satz: Wie ist es gelaufen?",
      label: "Dein Satz",
      placeholder: "Optional, ein paar Worte reichen",
    },
    wantedCard: {
      label: "Beispiel einer Anfrage in der App, mit einem Knopf «Foto machen»",
      text: "Jemand beim Vortex sucht eine Schreibtischlampe. Liegt bei dir eine herum?",
      button: "Foto machen",
    },
    whoSendsCard: {
      title: "So funktioniert die App",
      sentence:
        "Pako bereitet deine Nachrichten vor. Nichts wird gesendet, bis du auf «Senden» tippst.",
    },
    helperMissing: "Diese Transporthilfe gibt es noch nicht.",
    packMissing: "Dieses Paket gibt es noch nicht.",
    desk: {
      sameTerms:
        "Gleicher Schreibtisch, gleicher Zustand, Abholung diese Woche",
      distance: {
        nearer: "200\u00a0m von zu Hause",
        cheaper: "4\u00a0km von zu Hause",
      },
      title: "Schreibtisch",
      listLabel: "Zwei Schreibtische in der App",
    },
    draft: {
      intro: "Wähle im Chat mit Mia den Tag, der dir passt.",
      chatLabel: "Übungschat mit Mia",
      listing: {
        title: "Weisser Schreibtisch",
        size: "120\u00a0×\u00a060\u00a0cm",
        price: "CHF\u00a040",
        pickup: "Abholung: EPFL, Rolex Learning Center",
        seller: "Mia",
      },
      mia: "Mia",
      you: "Du",
      pako: "Pako",
      askDay:
        "Hallo! Der Schreibtisch ist noch zu haben. An welchem Tag könntest du ihn abholen? Ich habe ab 17:00 Zeit.",
      pickDay: "Deine Antwort an Mia",
      days: { sat: "Samstag", sun: "Sonntag" },
      yourDay: (day) => `${day} passt mir. Um 17:30?`,
      confirm: "17:30 passt. Schick mir ein Angebot, dann bestätige ich.",
      typing: (name) => `${name} schreibt`,
      offerReady: "Hier ist dein Angebot.",
      offer: (day) =>
        `Hallo Mia! Ich hätte gern deinen weissen Schreibtisch für CHF\u00a040. Ich kann ihn am ${day} um 17:30 beim Rolex Learning Center abholen.`,
      offerTitle: "Angebotsentwurf",
      question: "Was würdest du mit diesem Entwurf machen?",
      sendAsIs: "So senden",
      change: "Erst etwas ändern",
      own: "Selbst schreiben",
      ownLabel: "Deine Nachricht an Mia",
      send: "Senden",
      dontSend: "Nicht senden",
      editLabel: "Dein Angebot an Mia",
      notSent: "Du hast das Angebot nicht gesendet.",
    },
    saved: "Fertig! Deine Antworten sind gespeichert.",
    savedSaving: "Fertig! Ich speichere deine letzten Antworten.",
    about: {
      intro:
        "Zum Schluss, alles optional: Es hilft uns zu verstehen, wer geantwortet hat.",
      finish: "Abschliessen",
      peek: "Die ganzen Szenen ansehen (optional)",
    },
    tour: {
      next: "Weiter",
      replay: "Nochmals abspielen",
      skipRest: "Den Rest überspringen",
    },
    pilot: {
      invite:
        "Wir testen takeover mit echten Gegenständen in einigen FMEL-Wohnheimen. Möchtest du mitmachen?",
      email: "E-Mail-Adresse",
      role: "Würdest du verkaufen, kaufen oder beides?",
      roles: { seller: "Verkaufen", buyer: "Kaufen", both: "Beides" },
      items: "Was würdest du mitbringen oder suchen?",
      house: "Wo wohnst du?",
      houses: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Ein anderes FMEL-Wohnheim",
        "not-fmel": "Nicht in einem FMEL-Wohnheim",
      },
      weeks: "Welche Wochen würden dir passen?",
      weekLabels: {
        "2026-12-14": "14.–18. Dezember",
        "2026-12-21": "21.–23. Dezember",
        "2027-02-01": "1.–5. Februar",
        "2027-02-08": "8.–12. Februar",
      },
      consentLegend: "Wofür dürfen wir deine Adresse nutzen?",
      joinPilot: "Meldet mich für den Pilottest in diesen Wochen an",
      laterEmail:
        "Schreibt mir wegen späterer Tests oder zwei, drei Folgefragen",
      note: "Getrennt von deinen Antworten in der Umfrage aufbewahrt.",
      send: "Senden",
      noThanks: "Nein danke",
      errors: {
        emailMissing: "Gib deine E-Mail-Adresse ein.",
        emailInvalid: "Das sieht nicht wie eine E-Mail-Adresse aus.",
        role: "Gib an, ob du verkaufen, kaufen oder beides machen würdest.",
        house: "Wähle, wo du wohnst.",
        ticks: "Kreuze mindestens eines der beiden Felder an.",
      },
    },
    end: {
      title: "Danke! Das hilft uns, die nächsten Funktionen zu planen.",
      resultsTitle: "Wie andere geantwortet haben",
      resultsWaiting: (minimum) =>
        `Ergebnisse erscheinen, sobald ${minimum} Personen geantwortet haben.`,
      resultsLoading: "Ergebnisse werden geladen…",
      resultsFailed: "Die Ergebnisse konnten nicht geladen werden.",
      deskTitle: "Zwei Schreibtische: welcher?",
      deskOptions: {
        nearer: "Näher: CHF\u00a045, 200\u00a0m",
        cheaper: "Günstiger: CHF\u00a030, 4\u00a0km",
        neither: "Keiner",
      },
      troubleTitle: "Was beim letzten Mal am meisten Mühe gemacht hat",
      troubleFinding:
        "Den richtigen Gegenstand finden oder jemanden, der ihn haben wollte",
      ofAnswers: (count, total) => `${count} von ${total}`,
      shareTitle:
        "Jede Antwort hilft, auch wenn du nie etwas verkaufst. Magst du die Umfrage teilen?",
      share: "Teilen",
      copy: "Link kopieren",
      showQr: "QR-Code zeigen",
      hideQr: "QR-Code ausblenden",
      qrLabel: "QR-Code für den Link zur Umfrage",
      copied: "Link kopiert.",
      copyFailed: "Der Link konnte nicht kopiert werden. Hier ist er:",
      shareText: (minutes, link) =>
        `Ich habe gerade am Handy bei einer ${minutes}-minütigen Umfrage für ein Studierendenprojekt der EPFL mitgemacht. Ohne Anmeldung: ${link}`,
    },
  },
};
