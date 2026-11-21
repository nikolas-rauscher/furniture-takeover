import type { TourText } from "./en";

/**
 * The tour page in German, in Swiss spelling (ss for ß). A no-break space joins a number
 * to its unit and CHF to its amount.
 */
const helped = {
  question: "Hätte dir diese Funktion beim letzten Mal geholfen?",
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
      you: "Start",
      "last-time": "Deine Erfahrung",
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
        `Hallo, ich bin Pako! Ich bin der Assistent der App takeover. Ein Team von Studierenden der EPFL entwickelt die App, damit Studierende rund um die EPFL und die UNIL gebrauchte Sachen kaufen, verkaufen und verschenken können. Mit dieser Umfrage möchten wir herausfinden, wie du mit gebrauchten Sachen umgehst und was du von der App hältst. Die Umfrage dauert etwa ${minutes}\u00a0Minuten, und du brauchst kein Konto. Du kannst auch mitmachen, wenn du noch nie etwas Gebrauchtes gekauft oder verkauft hast.`,
      saveTitle: "Was wir speichern",
      save: (date) =>
        `Wir speichern deine Antworten und erfassen, welche Seiten du ansiehst, überspringst oder erneut öffnest und wie lange du auf jeder Seite bleibst. Ausserdem erfassen wir, über welchen Link du zur Umfrage gekommen bist, welche Sprache du verwendest und ob du ein Handy oder einen Computer nutzt. Dein Fortschritt bleibt in diesem Tab, bis du ihn schliesst. Dein Browser merkt sich, dass du die Umfrage abgeschlossen hast. Am Schluss kannst du eine E-Mail-Adresse angeben. Sie wird getrennt von deinen Antworten gespeichert. Alles wird bis zum ${date} gelöscht.`,
      questions: "Fragen zur Umfrage:",
      go: "Umfrage starten",
      demo: "Zeig mir nur die App",
    },
    whatIs: {
      bubble:
        "Vor der ersten Frage: Hier siehst du, was takeover macht und worum es in dieser Umfrage geht.",
      title: "Was ist takeover?",
      lead: "Eine App, mit der Studierende rund um die EPFL, die UNIL und die FMEL-Wohnheime gebrauchte Sachen kaufen, verkaufen und verschenken.",
      nextTitle: "Worum es in dieser Umfrage geht",
      next: [
        "Deine letzte Erfahrung mit dem Kaufen, Verkaufen oder Verschenken von Gebrauchtem",
        "Drei kurze Szenen aus der App, danach ein paar Fragen dazu",
        "Drei Alltagssituationen, in denen du wählst, was du tun würdest",
        "Mögliche Preise für die App und Lieferung nach Hause",
      ],
      duration: (minutes) => `Etwa ${minutes}\u00a0Minuten`,
    },
    parts: {
      label: (current, total) => `Teil ${current} von ${total}`,
      "last-time": {
        bubble:
          "In diesem Teil geht es um deine eigene Erfahrung mit gebrauchten Sachen.",
        text: "Wir möchten wissen, wie es dir beim letzten Mal ergangen ist, als du etwas Gebrauchtes kaufen, verkaufen, verschenken oder gratis bekommen wolltest. Uns interessiert auch, was passiert ist, wenn es nicht geklappt hat. Es gibt keine richtigen oder falschen Antworten.",
      },
      "the-app": {
        bubble: "In diesem Teil geht es um takeover selbst.",
        text: "Du siehst drei kurze Szenen. Nach jeder Szene fragen wir dich, ob dir die gezeigte Funktion helfen würde. Danach folgen ein paar Fragen zur App insgesamt, und zum Schluss vergleichst du verschiedene Slogans.",
      },
      situations: {
        bubble: "In diesem Teil geht es um drei Situationen aus dem Alltag.",
        text: "Stell dir jede Situation vor und wähle die Antwort, die am ehesten zu dir passt. In der letzten schreibst du im Chat mit einer Verkäuferin. Danach folgt eine Frage zum Senden von Nachrichten.",
      },
      price: {
        bubble: "In diesem letzten Teil geht es um Geld und Lieferung.",
        text: "Zuerst fragen wir, was du für ein Auszugspaket bezahlen würdest. Dann wählst du zwischen der Gratisversion und drei Arten zu bezahlen, und wir fragen nach der Lieferung. Du kannst weiterhin gratis suchen, inserieren und Nachrichten schreiben. Etwas Hilfe von Pako ist jeden Tag inbegriffen.",
      },
    },
    scenes: {
      find: {
        title: "Etwas finden",
        text: "Jemand beim Vortex braucht einen Schreibtisch und beschreibt, wie der Schreibtisch sein soll. Pako durchsucht die Inserate von Studierenden in der Nähe und bereitet ein Angebot vor. Gesendet wird erst, wenn die Person auf «Senden» tippt.",
      },
      sell: {
        title: "Verkaufen mit einem Foto",
        text: "Léa fotografiert ihren Schreibtisch. Pako schreibt das Inserat und schlägt einen Preis vor. Léa legt ihren eigenen Preis fest und speichert das Inserat.",
      },
      deal: {
        title: "Eine Abholung vereinbaren",
        text: "Noah bietet CHF\u00a035 für den Schreibtisch, und Léa nimmt an. Damit steht der Abholtermin fest. Bei der Übergabe bestätigen beide, dass Noah den Schreibtisch abgeholt hat.",
      },
    },
    situations: {
      label: (current, total) => `Situation ${current} von ${total}`,
      pickOne: "Wähle die Antwort, die am besten auf dich zutrifft.",
      "move-it":
        "Du hast in der App einen Schreibtisch gefunden, der dir gefällt. Er steht 4\u00a0km von deinem Zuhause entfernt.",
      desk: "Du brauchst einen Schreibtisch, und die App zeigt dir zwei passende. Es ist dasselbe Modell im selben Zustand; nur Preis und Entfernung sind verschieden.",
      draft:
        "Du möchtest Mia, einer anderen Studentin, einen Schreibtisch abkaufen. Preis und Abholort passen dir.",
      draftTask:
        "Antworte zuerst Mia im Chat. Danach schreibt Pako ein Angebot für dich, und du entscheidest, was du damit machst.",
    },
    steps: {
      "wanted-react": {
        question: "Wie würdest du auf diese Anfrage reagieren?",
        options: {
          snap: "Ein Foto machen und meinen Gegenstand inserieren",
          look: "Die Anfrage anschauen und später entscheiden",
          ignore: "Ignorieren",
          "rather-not": "Solche Anfragen möchte ich lieber nicht sehen",
        },
      },
      "wanted-share": {
        question:
          "Würdest du eine Suchanfrage mit Studierenden in deiner Nähe teilen? Sie sehen, was du suchst und in welcher Gegend. Dein Name bleibt verborgen.",
        options: { yes: "Ja", maybe: "Vielleicht", no: "Nein" },
      },
      "last-cost": {
        question:
          "Wie viel hast du ungefähr für den Transport des Gegenstands ausgegeben?",
        options: {
          nothing: "Nichts",
          "under-10": "Unter CHF\u00a010",
          "10-30": "CHF\u00a010–30",
          "over-30": "Mehr als CHF\u00a030",
          "dont-remember": "Weiss ich nicht mehr",
        },
      },
      "pay-model": {
        question: "Wenn du selbst zahlen würdest: Was würdest du wählen?",
        options: {
          free: "Gratisversion",
          "seller-fee": "Gebühr pro Verkauf",
          "move-pack": "Auszugspaket",
          monthly: "Monatsabo",
          "not-sure": "Weiss nicht",
        },
      },
      "institution-pay": {
        question:
          "Würdest du takeover mehr nutzen, wenn deine Hochschule oder dein Wohnheim dafür zahlen würde?",
        options: {
          yes: "Ja",
          "no-difference": "Das würde nichts ändern",
          "not-sure": "Weiss nicht",
        },
      },
      "delivery-worth": {
        question:
          "Wie viel würdest du höchstens bezahlen, damit dir ein sperriger Gegenstand in Lausanne bis vor die Tür gebracht wird (etwa 5\u00a0km)?",
        options: {
          nothing: "Nichts, ich hole es selbst",
          "up-to-5": "Bis CHF\u00a05",
          "6-10": "CHF\u00a06–10",
          "11-20": "CHF\u00a011–20",
          "over-20": "Mehr als CHF\u00a020",
          "not-sure": "Weiss nicht",
        },
      },
      who: {
        question: "Studierst du?",
        options: {
          epfl: "Ja, an der EPFL",
          unil: "Ja, an der UNIL",
          "other-school": "Ja, an einer anderen Hochschule",
          no: "Nein",
        },
      },
      "last-role": {
        question:
          "Was hattest du beim letzten Mal mit einem gebrauchten Gegenstand vor?",
        options: {
          buying: "Etwas kaufen",
          "getting-free": "Etwas gratis bekommen",
          selling: "Etwas verkaufen",
          "giving-away": "Etwas verschenken",
          none: "Ich habe es nie versucht",
        },
      },
      "last-item": {
        question:
          "Um was für einen gebrauchten Gegenstand ging es beim letzten Mal?",
        options: {
          furniture: "Möbel (Schreibtisch, Stuhl, Regal, Bett)",
          household: "Kleine Haushaltssachen",
          electronics: "Elektronik",
          bike: "Velo oder Trottinett",
          books: "Bücher oder Kursmaterial",
          clothes: "Kleider oder Schuhe",
          other: "Etwas anderes",
        },
      },
      "last-occasion": {
        question: "Hatte das Ganze mit einem Einzug oder einem Auszug zu tun?",
        options: {
          "moving-in": "Ja, ich bin eingezogen",
          "moving-out": "Ja, ich bin ausgezogen",
          "no-move": "Nein",
          "cant-recall": "Weiss ich nicht mehr",
        },
      },
      "last-trouble": {
        question: "Was war beim letzten Mal für dich am schwierigsten?",
        options: {
          finding: "Den richtigen Gegenstand finden",
          listing: "Das Inserat schreiben oder Fotos machen",
          price: "Den Preis einschätzen oder sich darauf einigen",
          replies: "Späte oder gar keine Antworten",
          timing: "Einen Termin vereinbaren, oder eine Abholung, die platzt",
          transport: "Den Gegenstand von A nach B bringen",
          trust: "Unsicher, ob ich der anderen Person trauen kann",
          nothing: "Nichts war schwierig",
          other: "Etwas anderes",
          "cant-recall": "Weiss ich nicht mehr",
        },
      },
      "why-not": {
        question:
          "Was ist der Hauptgrund, weshalb du bisher nichts Gebrauchtes gekauft, verkauft oder verschenkt hast?",
        options: {
          "no-need": "Ich brauchte es nie",
          "prefer-new": "Ich habe lieber neue Sachen",
          hassle: "Es schien mir zu umständlich",
          "dont-know-where": "Ich wusste nicht, wo ich suchen soll",
          other: "Etwas anderes",
        },
      },
      move: {
        question: "Planst du, aus deinem jetzigen Zuhause auszuziehen?",
        options: {
          "move-feb": "Ja, bis Ende Februar 2027",
          "move-jun": "Ja, zwischen März und Juni 2027",
          "move-later": "Ja, später",
          "no-plan": "Nein, ich plane keinen Umzug",
          "not-sure": "Weiss nicht",
        },
      },
      housing: {
        question: "Wo wohnst du im Moment?",
        options: {
          fmel: "In einem FMEL-Wohnheim",
          "other-res": "In einem anderen Studierendenwohnheim",
          flat: "In einer Wohnung oder einem Studio",
          family: "Bei meiner Familie",
          elsewhere: "Woanders",
        },
      },
      headline: {
        question: "Bei welchem Slogan würdest du takeover am ehesten öffnen?",
        options: {
          "h-move": "«Verkauf deine Sachen, bevor du ausziehst.»",
          "h-photo":
            "«Mach ein Foto und erhalte ein fertiges Inserat mit einem fairen Preis.»",
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
          "Was könnte dich davon abhalten, takeover zu nutzen? Du kannst mehrere Antworten wählen.",
        options: {
          "ai-mistakes": "Die KI könnte Fehler machen",
          "nobody-nearby": "Zu wenige Leute in der Nähe nutzen die App",
          "prefer-groups":
            "Ich bleibe lieber bei meinen WhatsApp- oder Telegram-Gruppen",
          privacy: "Bedenken wegen meiner Privatsphäre",
          "too-long": "Es dauert zu lange",
          nothing: "Nichts würde mich abhalten",
          other: "Etwas anderes",
        },
      },
      sending: {
        question: "Dürfte Pako Nachrichten senden, ohne dich vorher zu fragen?",
        options: {
          myself: "Nein, ich würde jede Nachricht selbst senden",
          "short-updates": "Nur kurze Statusmeldungen wie «Bin unterwegs»",
          "replies-too": "Kurze Statusmeldungen und einfache Antworten",
          "not-sure": "Weiss nicht",
        },
      },
      "move-it": {
        question: "Wie würdest du den Schreibtisch nach Hause bringen?",
        options: {
          "carry-bike": "Ihn tragen oder mit dem Velo transportieren",
          "public-transport": "Ihn im ÖV mitnehmen",
          "friend-car": "Ein Auto leihen oder jemanden mit Auto fragen",
          helper:
            "In der App eine Transporthilfe mit Lastenvelo buchen: CHF\u00a015 für die ganze Fahrt bis 4\u00a0km, bis vor deine Tür getragen (Erdgeschoss oder Lift; Treppen können extra kosten)",
          "skip-desk": "Stattdessen einen Schreibtisch näher bei mir suchen",
          "not-sure": "Weiss nicht",
        },
      },
      desk: {
        question: "Welchen der beiden Schreibtische würdest du nehmen?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Keinen",
        },
      },
      "scene-pick": {
        question: "Welche Szene möchtest du zuerst sehen?",
        options: {
          sell: "Verkaufen mit einem Foto",
          deal: "Eine Abholung vereinbaren",
          find: "Etwas finden",
        },
      },
      "try-first": {
        question:
          "Welche Funktion würdest du beim nächsten Kauf oder Verkauf zuerst ausprobieren?",
        options: {
          "describe-search":
            "Beschreiben, was ich suche, um passende Inserate zu finden",
          "photo-listing":
            "Ein Inserat aus Fotos erstellen lassen, mit Preisvorschlag und Quellen",
          "offer-drafts": "Einen Angebotsentwurf bearbeiten und senden",
          "pickup-card":
            "Die Abholkarte für Bestätigungen und Erinnerungen nutzen",
          none: "Keine davon",
          "need-more": "Ich müsste zuerst mehr darüber wissen",
        },
      },
      age: {
        question: "Wie alt bist du?",
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
        question: "Welches Geschlecht hast du?",
        options: {
          woman: "Frau",
          man: "Mann",
          "non-binary": "Nichtbinär",
          "self-describe": "Ich beschreibe es lieber selbst",
          na: "Möchte ich nicht sagen",
        },
      },
      level: {
        question: "Welchen Abschluss strebst du an?",
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
    helpedNeverTried:
      "Würde dir diese Funktion helfen, wenn du etwas Gebrauchtes kaufen oder verkaufen wolltest?",
    findingBySeller: "Jemanden finden, der es haben wollte",
    moveIntro: "Als Nächstes zwei Fragen dazu, wo du jetzt wohnst.",
    lampIntro:
      "Stell dir vor, du hast eine Schreibtischlampe, die du nicht mehr brauchst.",
    packLadder: {
      bubble: "Zuerst eine Art zu bezahlen: ein Auszugspaket.",
      title: "Auszugspaket",
      price: (price) => `CHF\u00a0${price}, einmalig`,
      text: "Inserate selbst schreiben bleibt gratis. Das Paket bringt fünf zusätzliche Inseratentwürfe aus deinen Fotos mit Preisprüfung, gültig während 30\u00a0Tagen.",
      question: (price) =>
        `Würdest du für dieses Paket bei deinem nächsten Umzug CHF\u00a0${price} aus eigener Tasche bezahlen?`,
      options: { yes: "Ja", no: "Nein", "not-sure": "Weiss nicht" },
    },
    plans: {
      free: {
        price: "CHF\u00a00",
        detail:
          "Du nutzt weiter die Gratisversion, mit etwas Hilfe von Pako jeden Tag.",
        benefits: [
          "Nichts zu zahlen",
          "Suchen, Inserieren und Nachrichten inbegriffen",
        ],
      },
      "seller-fee": {
        price: "5\u00a0%, wenn etwas verkauft wird",
        detail:
          "Die Gebühr zahlt die Person, die den Gegenstand verkauft, sobald der Verkauf zustande kommt.",
        benefits: [
          "Inserieren und Kaufen bleiben gratis",
          "Nichts zu zahlen, solange nichts verkauft wird",
        ],
      },
      "move-pack": {
        price: "CHF\u00a05, einmalig",
        detail:
          "Fünf zusätzliche Inseratentwürfe aus Fotos mit Preisprüfung, gültig während 30\u00a0Tagen.",
        benefits: ["Kein Abo", "Gemacht für die Wochen rund um einen Umzug"],
      },
      monthly: {
        price: "CHF\u00a03 pro Monat",
        detail: "Unbegrenzte Hilfe von Pako, dem Assistenten der App.",
        benefits: [
          "So viele Entwürfe und Preisprüfungen, wie du willst",
          "Deckt auch häufige Käufe und Verkäufe ab",
        ],
      },
    },
    lastStory: {
      question: "Wie ist es beim letzten Mal gelaufen? Ein Satz genügt.",
      label: "Dein Satz",
      placeholder: "Optional, ein paar Worte reichen",
    },
    wantedCard: {
      idea: "Eine Idee für die App",
      explanation:
        "Studierende können teilen, was sie suchen. Andere in der Nähe sehen die Anfrage, aber nie den Namen der Person, die sucht.",
      label: "Beispiel einer Anfrage in der App, mit einem Knopf «Hab ich»",
      text: "Jemand beim Vortex sucht eine Schreibtischlampe. Liegt bei dir eine herum?",
      button: "Hab ich",
    },
    whoSendsCard: {
      title: "So funktioniert die App",
      sentence:
        "Pako, der Assistent der App, macht dir Vorschläge für deine Nachrichten. Gesendet wird erst, wenn du auf «Senden» tippst.",
    },
    helperMissing: "Hinweis: Diese Transporthilfe gibt es noch nicht.",
    packMissing: "Hinweis: Dieses Paket gibt es noch nicht.",
    desk: {
      sameTerms:
        "Gleicher Schreibtisch, gleicher Zustand, Abholung diese Woche",
      distance: {
        nearer: "200\u00a0m von dir entfernt",
        cheaper: "4\u00a0km von dir entfernt",
      },
      title: "Schreibtisch",
      listLabel: "Zwei Schreibtische in der App",
    },
    draft: {
      intro:
        "Mia fragt, wann du den Schreibtisch abholen könntest. Wähle unten im Chat einen Tag.",
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
        "Hallo! Der Schreibtisch ist noch zu haben. An welchem Tag könntest du ihn abholen? Ich habe ab 17\u00a0Uhr Zeit.",
      pickDay: "Deine Antwort an Mia",
      days: { sat: "Samstag", sun: "Sonntag" },
      yourDay: (day) => `${day} passt mir. Geht es um 17.30\u00a0Uhr?`,
      confirm:
        "17.30\u00a0Uhr passt. Schick mir ein Angebot, dann bestätige ich.",
      typing: (name) => `${name} schreibt`,
      offerReady: "Ich habe ein Angebot für dich geschrieben.",
      offer: (day, price) =>
        `Hallo Mia! Ich hätte gern deinen weissen Schreibtisch für CHF\u00a0${price}. Ich kann ihn am ${day} um 17.30\u00a0Uhr beim Rolex Learning Center abholen.`,
      offerTitle: "Angebotsentwurf",
      question: "Was würdest du mit diesem Entwurf machen?",
      sendAsIs: "So senden, wie er ist",
      change: "Zuerst etwas ändern",
      own: "Eine eigene Nachricht schreiben",
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
        "Zum Schluss ein paar freiwillige Fragen zu dir. Sie helfen uns zu verstehen, wer an der Umfrage teilgenommen hat.",
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
        "Möchtest du erfahren, wann takeover online ist, die App früh ausprobieren oder bei einer späteren Umfrage mitmachen?",
      email: "E-Mail-Adresse",
      ticksLegend: "Was möchtest du?",
      ticks: {
        launchNews: "Sagt mir, wann takeover online ist",
        tryEarly: "Ich möchte takeover früh ausprobieren",
        futureSurveys: "Ladet mich zu späteren Umfragen ein",
      },
      role: "Würdest du verkaufen, kaufen oder beides?",
      roles: { seller: "Verkaufen", buyer: "Kaufen", both: "Beides" },
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
      note: "Wird getrennt von deinen Antworten in der Umfrage aufbewahrt.",
      send: "Senden",
      noThanks: "Nein danke",
      errors: {
        emailMissing: "Gib deine E-Mail-Adresse ein.",
        emailInvalid: "Das sieht nicht wie eine E-Mail-Adresse aus.",
        ticks: "Kreuze mindestens ein Feld an.",
        role: "Gib an, ob du verkaufen, kaufen oder beides machen würdest.",
        place: "Wähle, wo du wohnst.",
      },
    },
    end: {
      title:
        "Danke! Deine Antworten helfen uns zu entscheiden, was wir als Nächstes entwickeln.",
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
      troubleTitle: "Was beim letzten Mal am schwierigsten war",
      troubleFinding:
        "Den richtigen Gegenstand finden oder jemanden, der ihn haben wollte",
      ofAnswers: (count, total) => `${count} von ${total}`,
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
        `Ich habe gerade am Handy bei einer ${minutes}-minütigen Umfrage für ein Studierendenprojekt der EPFL mitgemacht. Ohne Anmeldung: ${link}`,
    },
  },
};
