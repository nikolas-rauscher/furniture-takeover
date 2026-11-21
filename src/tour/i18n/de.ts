import type { TourText } from "./en";

/** The tour page in German, in Swiss spelling (ss for ß). */
export const DE: TourText = {
  locale: "de-CH",
  common: {
    language: "Sprache",
    languageNames: { en: "English", fr: "Français", de: "Deutsch" },
    surveyHeading: "Umfrage zu takeover",
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
        "Einige deiner Antworten sind noch nicht gespeichert. Prüfe deine Verbindung und versuche es dann nochmals.",
    },
  },
  notices: {
    loading: {
      title: "Einen Moment…",
      text: "Ich bereite die Umfrage vor.",
    },
    invalidLink: {
      title: "Dieser Link zur Umfrage ist unvollständig.",
      text: "Du kannst dir trotzdem die Tour durch takeover ansehen.",
    },
    unreachable: {
      title: "Ich erreiche die Umfrage gerade nicht.",
      text: "Prüfe deine Verbindung und versuche es nochmals, oder sieh dir stattdessen die Tour an.",
    },
    closed: {
      title: "Die Umfrage ist im Moment geschlossen.",
      text: "Danke für deinen Besuch. Du kannst dir trotzdem die Tour durch takeover ansehen.",
    },
    doneBefore: {
      title: "Du hast schon teilgenommen.",
      text: "Danke! Dieser Browser merkt sich, dass du fertig bist. Du kannst dir trotzdem die Tour durch takeover ansehen.",
    },
    showTour: "Tour ansehen",
    loadFailed: {
      title: "Keine Verbindung",
      text: "Die Tour konnte nicht laden. Prüfe deine Verbindung und lade die Seite neu.",
    },
  },
  scenes: {
    find: {
      title: "Sag einfach, was du brauchst",
      text: "Jemand in der Nähe von Vortex braucht einen Schreibtisch. Ich prüfe Inserate von Studierenden und entwerfe das Angebot. Nichts wird ohne Tippen gesendet.",
      label:
        "Beispiel in der App: Eine Person tippt «a desk under CHF 80 near Vortex», Pako sucht in Inseraten von Studierenden und zeigt zwei Schreibtische, dann öffnet die Person den kompakten Lernschreibtisch und sendet Léa Pakos Angebot von CHF 35.",
    },
    sell: {
      title: "Fang mit einem Foto an",
      text: "Léa fotografiert ihren Schreibtisch. Ich schreibe das Inserat und schlage einen Preis vor. Sie wählt ihren eigenen und speichert es.",
      label:
        "Beispiel in der App: Léa fügt ein Foto ihres Schreibtischs hinzu, Pako schreibt das Inserat und fragt, wann man ihn abholen kann, schlägt CHF 35 vor, und Léa setzt CHF 40 und speichert das Inserat auf ihrem Gerät.",
    },
    deal: {
      title: "Einigen und abholen",
      text: "Noah bietet CHF 35 und Léa bestätigt, damit ist die Abholung gebucht. Bei der Abholung bestätigen beide die Übergabe.",
      label:
        "Beispiel in der App: Noah bietet CHF 35 für Léas Schreibtisch, Léa tippt auf Confirm sale, die Abholung ist gebucht und zählt herunter, Noah tippt auf Picked up und Léa markiert den Schreibtisch als verkauft.",
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
          "Schreib in eigenen Worten, was du brauchst, wie eine Nachricht an eine Freundin.",
          "Pako prüft Inserate von Studierenden in deiner Nähe und zeigt, was passt und was du prüfen solltest.",
        ],
      },
      sell: {
        title: "Verkaufen",
        sentences: [
          "Fang mit einem Foto des Gegenstands an.",
          "Pako entwirft das Inserat und einen Preis aus ähnlichen Angeboten, und du prüfst es, bevor du es veröffentlichst.",
        ],
      },
      agree: {
        title: "Einigen und abholen",
        sentences: [
          "Pako liest Antworten und schlägt vor, was du sagen kannst. Du wählst, was du sendest.",
          "Ein Handel braucht die Bestätigung beider Studierenden, dann ist die Abholung gebucht.",
        ],
      },
    },
    backAndForth: {
      title: "Pako übernimmt das Hin und Her",
      sentences: [
        "Ohne takeover heisst ein Schreibtisch: Inserate an vielen Orten, viele Nachrichten und eine Abholung, die organisiert werden muss.",
        "Pako sortiert die Inserate und entwirft das Angebot. Dein Tippen sendet es, ihr bestätigt beide, und Nachrichten am Tag selbst sind ein Tippen.",
      ],
      chapters: {
        search: "Suche",
        messages: "Nachrichten",
        pickup: "Abholung",
      },
      lines: {
        scattered:
          "Schreibtische werden an vielen Orten inseriert, und jede Verkäuferin bekommt dieselben Fragen.",
        sorted:
          "Ich prüfe Inserate von Studierenden und behalte, was passt: zwei Schreibtische unter CHF 80 in der Nähe von Vortex.",
        pile: "Dann fangen die Nachrichten an: der Preis, die Zeit, der Ort, und jemand verspätet sich.",
        offer:
          "Ich fasse Preis, Zeit und Treffpunkt in einem Angebot zusammen. Du prüfst es.",
        sent: "Nur dein Tippen sendet es. Ich sende nie selbst etwas.",
        booked:
          "Léa bestätigt auf ihrer Seite, damit ist die Abholung gebucht.",
        reminder: "Vor der Abholung kommt eine Erinnerung.",
        underway:
          "Unterwegs sagt ein Tippen Léa: Bin unterwegs, oder Komme später.",
        done: "Nach der Übergabe tippst du auf Abgeholt. Fertig.",
      },
      label:
        "Animation in drei Teilen. Suche: An vielen Orten inserierte Schreibtische schrumpfen auf Pakos kurze Liste mit zwei passenden. Nachrichten: Ein Stapel Fragen wird zu einem Angebot mit Preis, Zeit und Treffpunkt, das die Person mit einem Tippen sendet. Abholung: Léa bestätigt, die Abholung ist gebucht, eine Erinnerung kommt, die Person tippt auf Bin unterwegs und nach der Übergabe auf Abgeholt.",
    },
    principlesTitle: "Was gilt",
    principles: {
      send: {
        title: "Nichts wird ohne dein Tippen gesendet",
        text: "Pako entwirft Nachrichten und Angebote. Du entscheidest, was rausgeht.",
      },
      students: {
        title: "Für Studierende von EPFL und UNIL",
        text: "Ein Konto braucht eine Adresse mit @epfl.ch oder @unil.ch.",
      },
      prices: {
        title: "Preise mit ihren Quellen",
        text: "Ein vorgeschlagener Preis zeigt die Angebote, auf denen er beruht.",
      },
    },
    invite: {
      title: "Hilf uns zu entscheiden, was wir als Nächstes bauen",
      text: (minutes) =>
        `Pako fragt nach dem letzten Mal, als du etwas Gebrauchtes gekauft, verkauft oder verschenkt hast, und zeigt dann ein paar kurze Situationen. Es dauert etwa ${minutes} Minuten.`,
      action: "Mitmachen",
    },
    footer:
      "takeover ist ein Studierendenprojekt des Kurses CS-500 an der EPFL.",
  },
  v1: {
    invitation:
      "Hallo, ich bin Pako! Ich bin der Helfer in takeover, einem Studierendenprojekt an der EPFL. Ich möchte dich fragen, wann du zuletzt etwas Gebrauchtes gekauft oder verkauft hast, und dir dann zeigen, was wir bauen. Es dauert etwa 4 Minuten.",
    start: "Starten",
    justTour: "Zeig mir nur die Tour",
    consentTitle: "Bevor wir anfangen",
    consent: {
      anonymous: "Deine Antworten werden ohne deinen Namen gespeichert.",
      extra:
        "Ich speichere auch, wie lange jeder Schritt dauert, welcher Link dich hergebracht hat und ob du ein Handy oder einen Computer benutzt.",
      ip: "Deine IP-Adresse wird nicht mit deinen Antworten gespeichert.",
      email:
        "Eine E-Mail-Adresse ist optional, am Schluss, und wird getrennt gespeichert.",
      deleted: (date) => `Alles wird bis zum ${date} gelöscht.`,
      questions: "Fragen:",
    },
    agree: "Einverstanden",
    decline: "Nein danke, zeig mir nur die Tour",
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
          "Denk an das letzte Mal, als du versucht hast, einen gebrauchten Gegenstand zu kaufen, zu verkaufen oder zu verschenken. Was hast du gemacht?",
        options: {
          buying: "Gekauft",
          selling: "Verkauft",
          "giving-away": "Verschenkt",
          "not-tried": "Ich habe es in den letzten 12 Monaten nicht versucht",
        },
      },
      "last-occasion": {
        question: "Was war der Anlass?",
        options: {
          "moving-in": "Einzug",
          "moving-out": "Auszug",
          "during-year": "Keins von beiden, es war während des Jahres",
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
          replies: "Langsame oder keine Antworten",
          "pickup-fell-through": "Eine Abholung, die geplatzt ist",
          timing: "Eine passende Zeit finden",
          transport: "Den Gegenstand von A nach B bringen",
          trust: "Nicht sicher, ob ich der anderen Person trauen kann",
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
          nearer: "CHF 45",
          cheaper: "CHF 30",
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
          "photo-listing": "Ein Inserat, das aus meinen Fotos entworfen wird",
          "price-suggestion": "Ein Preisvorschlag aus ähnlichen Angeboten",
          "offer-drafts":
            "Angebotsentwürfe, die ich bearbeiten und senden kann",
          "pickup-reminders": "Abholung mit Bestätigungen und Erinnerungen",
          none: "Nichts davon",
        },
      },
      autonomy: {
        question: "Was sollte ich tun dürfen, ohne dich vorher zu fragen?",
        options: {
          nothing: "Nichts. Ich sende alles selbst",
          "short-updates": "Kurze Nachrichten wie «Bin unterwegs»",
          "simple-replies": "Antworten auf einfache Fragen",
          negotiate: "Verhandeln innerhalb von Grenzen, die ich setze",
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
        question: "Auf welchen Abschluss studierst du hin?",
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
      nearer: "In deinem Wohnheim, 200 m",
      cheaper: "Lausanne Zentrum, 4 km",
    },
    sameDesk: "Gleicher Schreibtisch, gleicher Zustand.",
    lastStory: "In ein paar Worten: Was ist passiert?",
    draftWhy: "Warum hast du dich so entschieden?",
    missing: "Was fehlt, oder was würde dich davon abhalten, es zu nutzen?",
    tasksIntro:
      "Danke! Jetzt zwei kurze Situationen. Nichts hier ist echt und nichts wird gesendet.",
    tourIntro: "Jetzt die kurze Tour. So funktioniert takeover.",
    draft: {
      situation:
        "Du möchtest Mias Schreibtisch. Du hast ihr gesagt, dass du ihn nur am Samstag abholen kannst.",
      prompt: "Ich habe dein Angebot entworfen. Prüf es und entscheide dann.",
      draft:
        "Hallo Mia! Ich hätte gern deinen weissen Arbeitstisch. Wären CHF 40 okay? Ich könnte ihn am Freitag um 17:30 beim FMEL Atrium abholen.",
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
        "Dürfen wir dir per E-Mail zwei oder drei Folgefragen schicken, oder eine Einladung, wenn wir mit echten Gegenständen testen?",
      email: "E-Mail-Adresse (optional)",
      invalid: "Das sieht noch nicht wie eine E-Mail-Adresse aus.",
      note: "Getrennt von deinen Antworten gespeichert, ausser du kreuzt das zweite Feld an.",
      pilot: "Ladet mich zum Test mit echten Gegenständen ein",
      link: "Diese Adresse mit meinen Antworten verknüpfen",
    },
    end: {
      text: "Danke! Das hilft uns zu entscheiden, was wir als Nächstes bauen.",
      share: "Studie teilen",
      copied: "Link zur Studie kopiert.",
      copyFailed: "Ich konnte den Link nicht kopieren. Hier ist er:",
    },
  },
  v3: {
    sections: {
      you: "Du",
      "last-time": "Letztes Mal",
      "first-look": "Erster Blick",
      situations: "Situationen",
    },
    progress: "Teile der Umfrage",
    sectionState: {
      done: (name) => `${name}: erledigt`,
      current: (name) => `${name}: aktuell`,
      next: (name) => `${name}: kommt noch`,
    },
    start: {
      bubble: (minutes) =>
        `Hallo, ich bin Pako! Wir sind Studierende der EPFL und bauen takeover, eine App, um gebrauchte Sachen rund um den Campus weiterzugeben. Hast du ${minutes} Minuten? Ohne Anmeldung. Alle sind willkommen, auch wenn du noch nie etwas Gebrauchtes gekauft oder verkauft hast.`,
      saveTitle: "Was wir speichern",
      save: (date) =>
        `Deine Antworten, welche Bildschirme du siehst, überspringst oder zu denen du zurückgehst, die Zeit pro Bildschirm, den Link, über den du gekommen bist, deine Sprache und ob du ein Handy oder einen Computer benutzt. Dein Fortschritt bleibt in diesem Tab, bis du ihn schliesst, und dieser Browser merkt sich, dass du fertig bist. Eine E-Mail-Adresse am Schluss ist optional und wird getrennt von deinen Antworten aufbewahrt. Alles wird bis zum ${date} gelöscht.`,
      questions: "Fragen:",
      go: "Los geht's",
      demo: "Zeig mir nur die App",
    },
    steps: {
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
          none: "Mir fällt kein Mal ein",
        },
      },
      "last-item": {
        question: "Was war es?",
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
          "Rückblickend: Welcher Teil hat dir am meisten Mühe gemacht, falls einer?",
        options: {
          finding: "Den richtigen Gegenstand finden",
          listing: "Das Inserat schreiben oder Fotos machen",
          price: "Den Preis kennen oder sich darauf einigen",
          replies: "Langsame oder keine Antworten",
          timing: "Eine Zeit vereinbaren, oder eine Abholung, die platzt",
          transport: "Es von A nach B bringen",
          trust: "Nicht sicher, ob ich der anderen Person trauen kann",
          nothing: "Nichts war schwierig",
          other: "Etwas anderes",
          "cant-recall": "Weiss ich nicht mehr",
        },
      },
      "why-not": {
        question: "Was ist der Hauptgrund?",
        options: {
          "no-need": "Ich habe es nie gebraucht",
          "prefer-new": "Ich habe lieber neue Sachen",
          hassle: "Schien mir zu umständlich",
          "dont-know-where": "Ich wusste nicht, wo ich suchen soll",
          other: "Etwas anderes",
        },
      },
      move: {
        question: "Planst du umzuziehen?",
        options: {
          "move-feb": "Ja, bis Ende Februar 2027",
          "move-jun": "Ja, März–Juni 2027",
          "move-later": "Ja, später",
          "no-plan": "Keine Pläne",
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
          "Welcher dieser Sätze würde dich am ehesten dazu bringen, die App zu öffnen, falls einer?",
        options: {
          "h-move": "«Verkauf deine Sachen, bevor du ausziehst.»",
          "h-photo":
            "«Mach ein Foto, bekomm ein fertiges Inserat mit fairem Preis.»",
          "h-ai": "«Ein KI-Assistent schreibt dein Inserat aus einem Foto.»",
          "h-nearby":
            "«Finde gebrauchte Sachen von Leuten in der Nähe, Abholung auf dem Campus.»",
          none: "Keiner davon",
        },
      },
      autonomy: {
        question:
          "Würdest du die App eine kurze Nachricht wie «Bin unterwegs» für dich senden lassen, ohne dich vorher zu fragen?",
        options: { yes: "Ja", no: "Nein", unsure: "Weiss nicht" },
      },
      "who-sends": {
        question:
          "Angenommen, Pako hat eine Nachricht entworfen und du schliesst die App, ohne sie zu senden. Was passiert mit der Nachricht?",
        options: {
          stays: "Sie bleibt ungesendet, bis ich sie sende",
          "sent-later": "Pako sendet sie nach einer Weile",
          "sent-now": "Pako sendet sie sofort",
          "not-sure": "Weiss nicht",
        },
      },
      "move-it": {
        question:
          "Du hast einen Schreibtisch gefunden, der dir gefällt, 4 km von deinem Wohnort entfernt. Bevor du zusagst: Wie würdest du ihn am ehesten nach Hause bringen?",
        options: {
          "carry-bike": "Tragen oder mit dem Velo",
          "public-transport": "Mit dem ÖV",
          "friend-car": "Ein Auto leihen oder jemanden mit Auto fragen",
          helper:
            "Ein Kurier mit Cargo-Velo, in der App gebucht: CHF 15 für die ganze Fahrt bis 4 km, bis vor deine Tür getragen (Erdgeschoss oder Lift; Treppen können mehr kosten)",
          "skip-desk": "Ich würde stattdessen einen näheren suchen",
          "not-sure": "Weiss nicht",
        },
      },
      desk: {
        question:
          "Du brauchst einen Schreibtisch. Hier sind zwei passende. Welchen würdest du nehmen?",
        options: { nearer: "CHF 45", cheaper: "CHF 30", neither: "Keinen" },
      },
      pack: {
        question: (free) =>
          `Stell dir vor, du ziehst in zwei Wochen aus und hast noch drei Sachen zu verkaufen, darunter einen Schreibtisch. Du hast die ${free} kostenlosen Fotoentwürfe von heute in takeover aufgebraucht. Was würdest du tun?`,
        options: {
          manual: "Sie jetzt selbst inserieren, kostenlos",
          wait: "Bis morgen auf neue kostenlose Entwürfe warten",
          pack: "Das Auszugspaket kaufen: einmalig CHF 5, fünf weitere Fotoentwürfe mit Preisprüfung, 30 Tage gültig",
          "other-way":
            "Etwas anderes (eine andere App, ein Gruppenchat, verschenken)",
          "not-sure": "Weiss nicht",
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
          "Was würdest du beim nächsten Kauf oder Verkauf zuerst ausprobieren, falls etwas?",
        options: {
          "describe-search": "Suchen, indem ich beschreibe, was ich brauche",
          "photo-listing":
            "Ein Inserat aus meinen Fotos, mit einem Preis und seinen Quellen",
          "offer-drafts":
            "Angebotsentwürfe, die ich bearbeiten und senden kann",
          "pickup-card": "Die Abholkarte mit Bestätigungen und Erinnerungen",
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
        question: "Was studierst du?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doktorat",
          other: "Anderes Studium",
          "not-student": "Ich studiere nicht",
        },
      },
      exchange: {
        question: "Bist du Austauschstudent:in?",
        options: { yes: "Ja", no: "Nein", na: "Möchte ich nicht sagen" },
      },
    },
    findingBySeller: "Jemanden finden, der es wollte",
    moveIntro: "Zwei kurze Fragen zu jetzt.",
    firstLookIntro: "Jetzt ein erster Blick auf takeover.",
    situationsIntro: "Vier kurze Situationen.",
    lastStory: {
      question: "In einem Satz: Wie ist es gelaufen?",
      label: "Dein Satz",
      placeholder: "Optional, ein paar Worte reichen",
    },
    whoSendsCard: {
      title: "So sagt es die App",
      sentence:
        "Pako entwirft deine Nachrichten. Nichts wird gesendet, bis du auf Senden tippst.",
    },
    helperMissing: "Den Kurier gibt es noch nicht.",
    packMissing: "Dieses Paket gibt es noch nicht.",
    desk: {
      sameTerms:
        "Gleicher Schreibtisch, gleicher Zustand, Abholung diese Woche",
      distance: {
        nearer: "200 m von deinem Wohnort",
        cheaper: "4 km von deinem Wohnort",
      },
      title: "Schreibtisch",
      listLabel: "Zwei Schreibtische in der App",
    },
    draft: {
      intro:
        "Die letzte. Stell dir vor, du kaufst diesen Schreibtisch. Preis und Ort passen dir.",
      chatLabel: "Übungschat mit Mia",
      listing: {
        title: "Weisser Schreibtisch",
        size: "120 × 60 cm",
        price: "CHF 40",
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
      yourDay: (day) => `${day} passt mir, 17:30?`,
      confirm: "17:30 passt. Schick mir ein Angebot, dann bestätige ich.",
      typing: (name) => `${name} schreibt`,
      offerReady: "Hier ist dein Angebot.",
      offer:
        "Hallo Mia! Ich hätte gern deinen weissen Schreibtisch für CHF 40. Ich kann ihn am Freitag um 17:30 beim Rolex Learning Center abholen.",
      offerTitle: "Angebotsentwurf",
      send: "Angebot senden",
      edit: "Bearbeiten",
      dontSend: "Nicht senden",
      editLabel: "Dein Angebot an Mia",
      notSent: "Du hast das Angebot nicht gesendet.",
    },
    reveal: {
      text: (date) =>
        `Eine Sache zum Angebot: Wir haben absichtlich Freitag in den Entwurf geschrieben, nachdem du einen anderen Tag gewählt hattest, um zu sehen, wie Leute vorgeschlagene Nachrichten nutzen. Bitte erzähl es anderen nicht vor dem ${date}, damit es fair bleibt.`,
      remove: "Meine Antworten löschen",
      confirmTitle: "Alle deine Antworten löschen?",
      confirmText:
        "Alles, was du in dieser Umfrage beantwortet hast, wird gelöscht. Das lässt sich nicht rückgängig machen.",
      keep: "Behalten",
      removing: "Deine Antworten werden gelöscht…",
      removeFailed:
        "Deine Antworten konnten nicht gelöscht werden. Prüfe deine Verbindung und versuche es nochmals.",
      removedTitle: "Deine Antworten sind gelöscht.",
      removedText:
        "Danke, dass du die Umfrage ausprobiert hast. Du kannst dir die App trotzdem ansehen.",
    },
    saved: "Fertig! Deine Antworten sind gespeichert.",
    savedSaving: "Fertig! Ich speichere deine letzten Antworten.",
    about: {
      intro:
        "Zum Schluss, alles optional: Es hilft uns zu verstehen, wer geantwortet hat.",
      finish: "Abschliessen",
      peek: "Einen Blick auf die App werfen (1 Min., optional)",
    },
    tour: {
      next: "Weiter",
      replay: "Nochmals abspielen",
      skipRest: "Den Rest überspringen",
    },
    pilot: {
      invite:
        "Wir testen takeover mit echten Gegenständen in einigen FMEL-Häusern. Möchtest du einen Platz?",
      email: "E-Mail-Adresse",
      role: "Würdest du verkaufen, kaufen oder beides?",
      roles: { seller: "Verkaufen", buyer: "Kaufen", both: "Beides" },
      items: "Was würdest du mitbringen oder suchen?",
      house: "Wo wohnst du?",
      houses: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Ein anderes FMEL-Haus",
        "not-fmel": "Nicht in einem FMEL-Haus",
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
        role: "Wähle, ob du verkaufen, kaufen oder beides würdest.",
        house: "Wähle, wo du wohnst.",
        ticks: "Kreuze mindestens eines der beiden Felder an.",
      },
    },
    end: {
      title: "Danke! Das hilft uns zu entscheiden, was wir als Nächstes bauen.",
      resultsTitle: "Wie andere geantwortet haben",
      resultsWaiting: (minimum) =>
        `Ergebnisse erscheinen, sobald ${minimum} Personen geantwortet haben.`,
      resultsLoading: "Ergebnisse werden geladen…",
      resultsFailed: "Die Ergebnisse konnten nicht geladen werden.",
      deskTitle: "Zwei Schreibtische: welcher?",
      deskOptions: {
        nearer: "Näher: CHF 45, 200 m",
        cheaper: "Günstiger: CHF 30, 4 km",
        neither: "Keiner",
      },
      troubleTitle: "Was beim letzten Mal am meisten Mühe gemacht hat",
      troubleFinding:
        "Den richtigen Gegenstand finden oder jemanden, der es wollte",
      ofAnswers: (count, total) => `${count} von ${total}`,
      shareTitle:
        "Jede Antwort hilft, auch von Leuten, die nie etwas verkaufen. Teilst du die Umfrage?",
      share: "Teilen",
      copy: "Link kopieren",
      showQr: "QR-Code zeigen",
      hideQr: "QR-Code ausblenden",
      qrLabel: "QR-Code für den Link zur Umfrage",
      copied: "Link kopiert.",
      copyFailed: "Der Link konnte nicht kopiert werden. Hier ist er:",
      shareText: (minutes, link) =>
        `Ich habe gerade eine ${minutes}-minütige Handy-Umfrage für ein Studierendenprojekt der EPFL gemacht. Ohne Anmeldung: ${link}`,
    },
  },
};
