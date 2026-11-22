import type { TourText } from "./en";

/**
 * The tour page in French. A narrow no-break space keeps « ? », « ! », « : » and « ; »
 * with their word and pads the inside of « »; a no-break space joins a number to its unit
 * and CHF to its amount.
 */

export const FR: TourText = {
  locale: "fr-CH",
  common: {
    language: "Langue",
    languageNames: { en: "English", fr: "Français", de: "Deutsch" },
    surveyHeading: "Sondage takeover",
    surveyUpdated:
      "Le sondage a été mis à jour, il recommence donc depuis le début.",
    back: "Retour",
    continue: "Continuer",
    skip: "Passer",
    send: "Envoyer",
    tryAgain: "Réessayer",
    openApp: "Ouvrir takeover",
    rank: (place) => `rang ${place}`,
    textCount: (count, max) => `${count} sur ${max} caractères`,
    optional: "Ta réponse (facultatif)",
    inAFewWords: (option) => `${option}\u202f: en quelques mots (facultatif)`,
    save: {
      saved: "Tes réponses sont enregistrées.",
      saving: "Enregistrement de tes réponses…",
      failed:
        "Certaines de tes réponses ne sont pas encore enregistrées. Vérifie ta connexion, puis réessaie.",
    },
  },
  notices: {
    loading: {
      title: "Un instant…",
      text: "Je prépare le sondage.",
    },
    invalidLink: {
      title: "Ce lien vers le sondage est incomplet.",
      text: "Tu peux quand même découvrir takeover.",
    },
    unreachable: {
      title: "Je n’arrive pas à ouvrir le sondage pour le moment.",
      text: "Vérifie ta connexion et réessaie, ou découvre plutôt takeover.",
    },
    closed: {
      title: "Le sondage est fermé pour le moment.",
      text: "Merci de ton passage. Tu peux quand même découvrir takeover.",
    },
    doneBefore: {
      title: "Tu as déjà participé.",
      text: "Merci\u202f! Ce navigateur se souvient que tu as terminé. Tu peux quand même découvrir takeover.",
    },
    showTour: "Découvrir takeover",
    loadFailed: {
      title: "Connexion indisponible",
      text: "La page n’a pas pu se charger. Vérifie ta connexion et recharge-la.",
    },
  },
  scenes: {
    find: {
      title: "Dis simplement ce qu’il te faut",
      text: "Quelqu’un près du Vortex cherche un bureau. Je parcours les annonces d’étudiant·es et je prépare l’offre. Rien ne part sans son feu vert.",
      label:
        "Exemple dans l’app\u202f: un·e étudiant·e tape «\u202fa desk under CHF\u00a080 near Vortex\u202f». Pako cherche dans les annonces d’étudiant·es et montre deux bureaux. L’étudiant·e ouvre l’annonce du bureau compact et envoie à Léa l’offre de CHF\u00a035 préparée par Pako.",
    },
    sell: {
      title: "Commence par une photo",
      text: "Léa prend son bureau en photo. J’écris l’annonce et je propose un prix. Elle choisit le sien et enregistre l’annonce.",
      label:
        "Exemple dans l’app\u202f: Léa ajoute une photo de son bureau. Pako rédige l’annonce, demande quand on peut venir chercher le bureau et propose CHF\u00a035. Léa fixe le prix à CHF\u00a040 et enregistre l’annonce sur son appareil.",
    },
    deal: {
      title: "S’accorder et récupérer l’objet",
      text: "Noah propose CHF\u00a035 et Léa confirme\u202f: le rendez-vous est fixé. À l’heure du rendez-vous, les deux confirment la remise.",
      label:
        "Exemple dans l’app\u202f: Noah propose CHF\u00a035 pour le bureau de Léa. Léa appuie sur «\u202fConfirm sale\u202f»\u202f: le rendez-vous est fixé et le compte à rebours démarre. Noah appuie sur «\u202fPicked up\u202f» et Léa indique que le bureau est vendu.",
    },
  },
  pitch: {
    title: "Des trouvailles d’occasion, entre étudiant·es.",
    lead: "Pako t’aide à trouver des objets, à rédiger des annonces et à fixer un rendez-vous avec des étudiant·es près de l’EPFL, de l’UNIL et des résidences FMEL. Tu décides ce qui est envoyé.",
    seeHow: "Voir comment ça marche",
    replay: "Rejouer",
    exampleScreen: (title) => `${title}, écran d’exemple`,
    sections: {
      find: {
        title: "Trouver",
        sentences: [
          "Écris ce qu’il te faut avec tes propres mots, comme un message à un ami.",
          "Pako parcourt les annonces d’étudiant·es près de chez toi et montre ce qui correspond et ce qu’il faut vérifier.",
        ],
      },
      sell: {
        title: "Vendre",
        sentences: [
          "Commence par une photo de l’objet.",
          "Pako prépare l’annonce et propose un prix d’après des offres semblables. Tu vérifies le tout avant de publier.",
        ],
      },
      agree: {
        title: "S’accorder et récupérer l’objet",
        sentences: [
          "Pako lit les réponses et te suggère quoi répondre. Tu choisis ce que tu envoies.",
          "Les deux étudiant·es doivent confirmer l’accord pour fixer le rendez-vous.",
        ],
      },
    },
    backAndForth: {
      title: "Pako s’occupe des allers-retours",
      sentences: [
        "Sans takeover, un bureau, c’est des annonces à plein d’endroits, beaucoup de messages et un rendez-vous à organiser.",
        "Pako trie les annonces et prépare l’offre. Tu l’envoies d’un geste, chacun confirme de son côté, et le jour J, tu donnes des nouvelles d’un geste.",
      ],
      chapters: { search: "Recherche", messages: "Messages", pickup: "Remise" },
      lines: {
        scattered:
          "Les bureaux sont mis en vente à plein d’endroits, et chaque vendeur reçoit les mêmes questions.",
        sorted:
          "Je parcours les annonces d’étudiant·es et je retiens deux bureaux à moins de CHF\u00a080 près du Vortex.",
        pile: "Puis les messages s’enchaînent\u202f: le prix, l’heure, le lieu, et quelqu’un qui a du retard.",
        offer:
          "Je mets le prix, l’heure et le point de rencontre dans une seule offre. Tu la vérifies.",
        sent: "C’est toi qui l’envoies. Je n’envoie jamais rien de moi-même.",
        booked: "Léa confirme de son côté, et le rendez-vous est fixé.",
        reminder: "Avant le rendez-vous, un rappel.",
        underway:
          "En chemin, un geste suffit pour dire à Léa\u202f: «\u202fJe suis en route\u202f» ou «\u202fJ’ai du retard\u202f».",
        done: "Après la remise, tu confirmes d’un geste. C’est fait.",
      },
      label:
        "Animation en trois parties. Recherche\u202f: parmi les bureaux mis en vente à plein d’endroits, Pako en retient deux qui conviennent. Messages\u202f: Pako réunit les questions en une seule offre avec le prix, l’heure et le point de rencontre, que l’étudiant·e envoie d’un geste. Remise\u202f: Léa confirme, le rendez-vous est fixé et un rappel arrive. En chemin, l’étudiant·e prévient Léa d’un geste, puis confirme la remise d’un geste.",
    },
    principlesTitle: "Ce qui reste vrai",
    principles: {
      send: {
        title: "Rien ne part sans ton feu vert",
        text: "Pako rédige les messages et les offres. C’est toi qui décides de ce qui part.",
      },
      students: {
        title: "Pour les étudiant·es de l’EPFL et de l’UNIL",
        text: "Un compte nécessite une adresse @epfl.ch ou @unil.ch.",
      },
      prices: {
        title: "Des prix avec leurs sources",
        text: "Pour chaque prix proposé, tu vois les offres qui servent de référence.",
      },
    },
    invite: {
      title: "Aide-nous à décider de la suite",
      text: (minutes) =>
        `Pako te pose des questions sur la dernière fois que tu as acheté, vendu ou donné quelque chose d’occasion, puis te montre quelques courtes situations. Ça prend environ ${minutes} minutes.`,
      action: "Participer",
    },
    footer: "takeover est un projet d’étudiant·es du cours CS-500 à l’EPFL.",
  },
  v1: {
    invitation:
      "Salut, je suis Pako\u202f! Je suis l’assistant de takeover, un projet d’étudiant·es à l’EPFL. J’aimerais te poser des questions sur la dernière fois que tu as acheté ou vendu quelque chose d’occasion, puis te montrer ce qu’on développe. Ça prend environ 4 minutes.",
    start: "Commencer",
    justTour: "Montre-moi juste la démo",
    consentTitle: "Avant de commencer",
    consent: {
      anonymous: "Tes réponses sont enregistrées sans ton nom.",
      extra:
        "J’enregistre aussi la durée de chaque étape, le lien que tu as suivi et le type d’appareil que tu utilises (téléphone ou ordinateur).",
      ip: "Ton adresse IP n’est pas enregistrée avec tes réponses.",
      email:
        "Tu peux laisser une adresse e-mail à la fin. Elle sera conservée séparément.",
      deleted: (date) => `Tout est supprimé d’ici au ${date}.`,
      questions: "Questions\u202f:",
    },
    agree: "J’accepte",
    decline: "Non merci, montre-moi juste la démo",
    progress: "Progression de l’étude",
    stepOf: (step, total) => `Étape ${step} sur ${total}`,
    steps: {
      student: {
        question: "Es-tu étudiant·e\u202f?",
        options: {
          "yes-epfl": "Oui, à l’EPFL",
          "yes-unil": "Oui, à l’UNIL",
          "yes-elsewhere": "Oui, ailleurs",
          no: "Non",
        },
      },
      housing: {
        question: "Où habites-tu en ce moment\u202f?",
        options: {
          fmel: "Résidence FMEL",
          "shared-flat": "Colocation",
          "own-flat": "Mon propre appartement ou studio",
          "with-family": "En famille",
          elsewhere: "Ailleurs",
        },
      },
      "last-role": {
        question:
          "Pense à la dernière fois que tu as essayé d’acheter, de vendre ou de donner un objet d’occasion. Que faisais-tu\u202f?",
        options: {
          buying: "J’achetais",
          selling: "Je vendais",
          "giving-away": "Je le donnais",
          "not-tried": "Je n’ai pas essayé ces 12 derniers mois",
        },
      },
      "last-occasion": {
        question: "C’était à quelle occasion\u202f?",
        options: {
          "moving-in": "Un emménagement",
          "moving-out": "Un départ de mon logement",
          "during-year": "Ni l’un ni l’autre, c’était en cours d’année",
        },
      },
      "last-outcome": {
        question: "Comment ça s’est terminé\u202f?",
        options: {
          "worked-out": "Ça a marché",
          "gave-up": "J’ai abandonné",
          "still-open": "C’est encore en cours",
        },
      },
      "last-hard": {
        question:
          "Qu’est-ce qui a été difficile\u202f? Choisis tout ce qui correspond.",
        options: {
          finding: "Trouver le bon objet ou un acheteur",
          listing: "Rédiger l’annonce",
          price: "Se mettre d’accord sur un prix",
          replies: "Des réponses tardives ou absentes",
          "pickup-fell-through": "Un rendez-vous qui est tombé à l’eau",
          timing: "Trouver un moment qui convenait",
          transport: "Amener l’objet d’un point A à un point B",
          trust: "Pas sûr·e de pouvoir faire confiance à l’autre personne",
          nothing: "Rien, c’était facile",
          "something-else": "Autre chose",
        },
      },
      "last-transport": {
        question: "Comment l’objet a-t-il été transporté\u202f?",
        options: {
          "on-foot": "À pied",
          bike: "À vélo",
          "public-transport": "En transports publics",
          car: "En voiture ou en camionnette",
          delivery: "Livraison ou poste",
          didnt: "Il n’a pas bougé",
        },
      },
      attempts: {
        question:
          "Combien de fois as-tu essayé d’acheter, de vendre ou de donner quelque chose d’occasion ces 12 derniers mois\u202f?",
        options: {
          once: "Une fois",
          "two-to-five": "2 à 5 fois",
          "more-than-five": "Plus de 5 fois",
        },
      },
      "nearer-or-cheaper": {
        question:
          "Il te faut un bureau. J’en ai trouvé deux qui conviennent. Lequel choisirais-tu\u202f?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Aucun des deux",
        },
      },
      "far-transport": {
        question: "Comment le ramènerais-tu chez toi\u202f?",
        options: {
          "on-foot": "À pied",
          bike: "À vélo",
          "public-transport": "En transports publics",
          car: "En voiture ou en camionnette",
          delivery: "Livraison ou poste",
          "not-sure": "Je ne sais pas encore",
        },
      },
      "would-use": {
        question:
          "Qu’est-ce que tu utiliserais\u202f? Choisis autant de réponses que tu veux.",
        options: {
          "describe-search": "Chercher en décrivant ce qu’il me faut",
          "photo-listing": "Une annonce rédigée à partir de mes photos",
          "price-suggestion": "Un prix proposé d’après des offres semblables",
          "offer-drafts":
            "Des brouillons d’offre que je peux modifier et envoyer",
          "pickup-reminders": "Un rendez-vous avec confirmations et rappels",
          none: "Rien de tout ça",
        },
      },
      autonomy: {
        question:
          "Qu’est-ce que je devrais pouvoir faire sans te demander d’abord\u202f?",
        options: {
          nothing: "Rien. J’envoie tout moi-même",
          "short-updates":
            "De courtes nouvelles comme «\u202fJe suis en route\u202f»",
          "simple-replies": "Répondre à des questions simples",
          negotiate: "Négocier dans des limites que je fixe",
        },
      },
      "need-soon": {
        question:
          "Dans les quatre prochaines semaines, as-tu quelque chose à vendre ou te faut-il quelque chose\u202f?",
        options: {
          sell: "Quelque chose à vendre",
          need: "Il me faut quelque chose",
          both: "Les deux",
          neither: "Ni l’un ni l’autre",
        },
      },
      age: {
        question: "Quel âge as-tu\u202f?",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-plus": "27 ou plus",
          "no-answer": "Je préfère ne pas répondre",
        },
      },
      gender: {
        question: "Ton genre\u202f?",
        options: {
          woman: "Femme",
          man: "Homme",
          "non-binary": "Non binaire",
          "no-answer": "Je préfère ne pas répondre",
        },
      },
      level: {
        question: "Quel diplôme prépares-tu\u202f?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doctorat",
          exchange: "Semestre d’échange",
          other: "Autre chose",
        },
      },
    },
    deskDetails: {
      nearer: "Dans ta résidence, 200\u00a0m",
      cheaper: "Centre de Lausanne, 4\u00a0km",
    },
    sameDesk: "Même bureau, même état.",
    lastStory: "En quelques mots, que s’est-il passé\u202f?",
    draftWhy: "Qu’est-ce qui t’a fait choisir ça\u202f?",
    missing:
      "Qu’est-ce qui manque, ou qu’est-ce qui t’empêcherait de l’utiliser\u202f?",
    tasksIntro:
      "Merci\u202f! Maintenant, deux courtes situations. Rien ici n’est réel et rien n’est envoyé.",
    tourIntro: "Place à la démo. Voici comment fonctionne takeover.",
    draft: {
      situation:
        "Tu aimerais le bureau de Mia. Tu lui as dit que tu ne peux venir le chercher que samedi.",
      prompt: "J’ai rédigé ton offre. Vérifie-la, puis décide.",
      draft:
        "Salut Mia\u202f! J’aimerais ton bureau blanc. CHF\u00a040, ça irait\u202f? Je pourrais venir le chercher vendredi à 17\u00a0h\u00a030 à la résidence FMEL Atrium.",
      explanation:
        "Une chose\u202f: le brouillon disait vendredi, alors que tu avais dit samedi. C’était voulu. Nous voulons voir comment les brouillons sont vérifiés.",
      situationTitle: "La situation",
      draftTitle: "Brouillon de Pako pour Mia",
      sent: "Tu as envoyé",
      notSent: "Tu n’as pas envoyé l’offre.",
      send: "Envoyer l’offre",
      edit: "Modifier",
      writeOwn: "Écrire la mienne",
      dontSend: "Ne pas envoyer",
      editLabel: "Ton offre à Mia",
      ownLabel: "Ta propre offre à Mia",
      ownPlaceholder: "Écris ton offre",
    },
    contact: {
      question:
        "Pouvons-nous t’envoyer par e-mail deux ou trois questions de suivi, ou une invitation quand nous testerons avec de vrais objets\u202f?",
      email: "Adresse e-mail (facultatif)",
      invalid: "Ça ne ressemble pas encore à une adresse e-mail.",
      note: "Conservée à part de tes réponses, sauf si tu coches la deuxième case.",
      pilot: "Invitez-moi au test avec de vrais objets",
      link: "Relier cette adresse à mes réponses",
    },
    end: {
      text: "Merci\u202f! Ça nous aide à décider de la suite.",
      share: "Partager l’étude",
      copied: "Lien de l’étude copié.",
      copyFailed: "Je n’ai pas pu copier le lien. Le voici\u202f:",
    },
  },
  v3: {
    sections: {
      "last-time": "Ton expérience",
      home: "Toi en ce moment",
      "the-app": "L’app",
      price: "Le prix, et toi",
    },
    progress: "Parties du sondage",
    lastPart: "Dernière partie",
    sectionState: {
      done: (name) => `${name}\u202f: terminé`,
      current: (name) => `${name}\u202f: en cours`,
      next: (name) => `${name}\u202f: à venir`,
    },
    start: {
      bubble: (minutes) =>
        `Salut, je suis Pako, l’assistant de l’app takeover. Des étudiant·es de l’EPFL la développent pour que les étudiant·es autour de l’EPFL et de l’UNIL puissent acheter, vendre et donner des objets d’occasion. Le sondage dure environ ${minutes}\u00a0minutes.`,
      saveTitle: "Ce que nous enregistrons",
      moreBelow: "La suite plus bas",
      save: (date) =>
        `Nous enregistrons tes réponses, les écrans que tu consultes, ceux que tu passes et ceux sur lesquels tu reviens, ainsi que le temps passé sur chacun. Nous relevons aussi le lien que tu as suivi, la langue que tu utilises et ton type d’appareil (téléphone ou ordinateur). Ta progression reste dans cet onglet jusqu’à ce que tu le fermes, et ce navigateur se souvient que tu as terminé. Si tu laisses ton adresse e\u2011mail à la fin, nous la conservons à part de tes réponses. Tout sera supprimé au plus tard le ${date}.`,
      questions: "Des questions sur le sondage\u202f?",
      go: "Commencer le sondage",
      demo: "Montre-moi juste l’app",
    },
    parts: {
      label: (current, total) => `Partie ${current} sur ${total}`,
      "last-time": {
        bubble: "D’abord, quelques questions sur ta propre expérience.",
        text: "Il n’y a pas de bonnes ou de mauvaises réponses.",
      },
      home: {
        bubble:
          "Ensuite, quelques questions sur toi en ce moment\u202f: l’occasion et les objets que tu as chez toi.",
        text: "Par exemple des meubles, des livres, des affaires de cuisine ou de l’électronique.",
      },
      "the-app": {
        bubble:
          "Léa vend son bureau et tu aimerais l’acheter. Vous avez chacun votre Pako. Les deux Pakos se parlent pour trouver un horaire qui vous convient à tous les deux. Tu peux aussi écrire directement à Léa.",
        text: "Deux courtes scènes, un chat et quelques questions sur l’histoire.",
      },
      price: {
        bubble:
          "Dernière partie\u202f: le prix, puis quelques questions sur toi.",
        text: "Ensuite, c’est fini.",
      },
    },
    cards: {
      lastTime: {
        text: "Pense à ta dernière tentative d’acheter, de vendre, de donner ou de recevoir gratuitement un objet d’occasion. Ça compte aussi si ça n’a pas marché.",
      },
      wanted: {
        title: "Une idée pour takeover\u202f: les demandes.",
        text: "Léa cherche encore une lampe de bureau pour sa nouvelle chambre. Si tu cherches quelque chose, tu peux publier ce dont tu as besoin, et les étudiant·es à proximité le voient.",
      },
      delegate: {
        text: "Imagine que tu vends le bureau de Léa. Pako pourrait écrire en ton nom. Tu verrais ses messages après l’envoi.",
      },
      price: {
        text: "Imagine que Pako rédige tes annonces et s’occupe des messages.",
      },
    },
    wantedPost: {
      label: "Exemple de demande dans l’app",
      text: "Léa, à 5\u00a0minutes de chez toi, cherche une lampe de bureau.",
    },
    scenes: {
      sell: {
        title: "Léa vend son bureau",
        text: "Léa déménage et vend son bureau avec takeover. Elle le prend en photo, Pako rédige l’annonce et propose un prix, et Léa fixe elle-même son prix\u202f: CHF\u00a040.",
      },
      deal: {
        title: "Le retrait est fixé",
        text: "Sur le téléphone de Léa, tu t’appelles Noah. Pako connaît l’heure du rendez-vous. Si quelqu’un est en retard ou ne répond plus, il prend de vos nouvelles à tous les deux. Chacun peut proposer un autre horaire ou confirmer le retrait. Léa voit tes dix minutes de retard. Si tu ne réponds plus, elle peut remettre le bureau en vente.",
        label:
          "Léa accepte CHF 40. Noah annonce dix minutes de retard et Pako indique sa nouvelle heure d’arrivée. Noah confirme le retrait et Léa marque le bureau comme vendu.",
      },
    },
    steps: {
      who: {
        question: "Es-tu étudiant·e\u202f?",
        options: {
          epfl: "Oui, à l’EPFL",
          unil: "Oui, à l’UNIL",
          "other-school": "Oui, dans une autre haute école",
          no: "Non",
        },
      },
      housing: {
        question: "Qu’est-ce qui décrit le mieux ton logement actuel\u202f?",
        options: {
          fmel: "Dans une résidence FMEL",
          "other-res": "Dans une autre résidence étudiante",
          flat: "Colocation, appartement ou studio (pas une résidence)",
          family: "Chez ma famille",
          elsewhere: "Ailleurs",
        },
      },
      "last-role": {
        question: "Qu’est-ce que tu voulais faire\u202f?",
        options: {
          buying: "Acheter quelque chose",
          "getting-free": "Recevoir quelque chose gratuitement",
          selling: "Vendre quelque chose",
          "giving-away": "Donner quelque chose",
          none: "Je n’ai jamais essayé",
        },
      },
      "last-item": {
        question: "C’était quoi\u202f?",
        options: {
          furniture: "Des meubles",
          household: "Des articles ménagers",
          electronics: "De l’électronique",
          bike: "Un vélo ou une trottinette",
          books: "Des livres",
          clothes: "Des vêtements",
          other: "Autre chose",
        },
      },
      "last-occasion": {
        question: "Était-ce lié à un déménagement\u202f?",
        options: {
          "moving-in": "Oui, j’emménageais",
          "moving-out": "Oui, je quittais mon logement",
          both: "Oui, les deux",
          "no-move": "Non",
        },
      },
      "last-how": {
        question: "Où as-tu essayé en premier\u202f?",
        options: {
          friends: "Auprès d’ami·es ou de connaissances",
          "chat-group": "Dans un groupe WhatsApp ou Telegram",
          facebook: "Sur Facebook Marketplace",
          anibis: "Sur Anibis, Tutti ou Ricardo",
          other: "Ailleurs",
        },
      },
      "last-outcome": {
        question: "Est-ce que ça a marché\u202f?",
        options: { yes: "Oui", no: "Non", ongoing: "C’est encore en cours" },
      },
      "last-trouble": {
        question: "Qu’est-ce qui a été difficile\u202f?",
        options: {
          nothing: "Rien n’a posé problème",
          finding: "Trouver quelque chose qui convient",
          gone: "L’objet était déjà parti",
          "agree-price": "Se mettre d’accord sur un prix",
          "finding-taker": "Trouver quelqu’un que ça intéresse",
          "deadline-pickup": "Organiser le retrait avant ma date limite",
          listing: "Rédiger l’annonce",
          "set-price": "Fixer le prix",
          replies: "Attendre les réponses",
          messages: "Les nombreux échanges de messages",
          timing: "Convenir d’un rendez\u2011vous",
          cancelled: "Les rendez\u2011vous annulés",
          transport: "Le transport",
          trust: "Faire confiance à l’autre personne",
          other: "Autre chose",
          "cant-recall": "Je ne sais plus",
        },
      },
      "last-transport": {
        question: "Comment l’objet a-t-il été transporté\u202f?",
        options: {
          foot: "À pied",
          bike: "À vélo",
          "public-transport": "En transports publics",
          car: "En voiture",
          delivery: "Livré",
          "not-yet": "Pas encore transporté",
          "dont-know": "Je ne sais pas",
        },
      },
      "last-messages": {
        question:
          "En tout, environ combien de messages as-tu échangés, toutes personnes confondues\u202f?",
        options: {
          none: "Aucun",
          "1-3": "1–3",
          "4-7": "4–7",
          "8-12": "8–12",
          "over-12": "Plus de 12",
          "dont-remember": "Je ne sais plus",
        },
      },
      "trade-frequency": {
        question:
          "À quelle fréquence achètes-tu, vends-tu ou donnes-tu quelque chose d’occasion\u202f?",
        options: {
          "monthly-plus": "Plusieurs fois par mois",
          monthly: "Environ une fois par mois",
          yearly: "Quelques fois par an",
          rarely: "Moins souvent",
          never: "Jamais",
        },
      },
      "idle-items": {
        question:
          "Combien d’objets utilisables as-tu chez toi sans t’en servir en ce moment\u202f?",
        options: {
          none: "Aucun",
          "1-3": "1–3",
          "4-10": "4–10",
          "over-10": "Plus de 10",
        },
      },
      "idle-release": {
        question:
          "Envisagerais-tu de vendre ou de donner au moins un de ces objets\u202f?",
        options: { yes: "Oui", no: "Non", unsure: "Je ne sais pas" },
      },
      "idle-why": {
        question: "Pourquoi les as-tu encore\u202f?",
        options: {
          "listing-hassle": "Publier une annonce, c’est trop pénible",
          "messages-hassle":
            "Les messages et les rendez\u2011vous, c’est trop pénible",
          transport: "Je ne peux pas les transporter",
          "not-worth": "Ça ne vaut pas la peine pour ce que ça rapporte",
          "dont-know-whom": "Je ne sais pas à qui je pourrais les proposer",
          "might-need": "J’en aurai peut-être encore besoin",
          keep: "Je préfère les garder",
          "not-yet": "Je n’ai pas encore pris le temps",
          other: "Autre chose",
        },
      },
      "wanted-react": {
        question:
          "Tu as une lampe de bureau en trop. Que ferais-tu le plus probablement\u202f?",
        options: {
          "offer-now": "La proposer maintenant",
          "offer-later": "La proposer plus tard",
          leave: "Ne pas répondre à la demande",
          "rather-not": "Je ne veux pas voir ce genre de demandes",
        },
      },
      seeking: {
        question: "Cherches-tu quelque chose d’occasion en ce moment\u202f?",
        options: { yes: "Oui", no: "Non" },
      },
      delegate: {
        question: "Que laisserais-tu Pako faire sans te demander\u202f?",
        options: {
          none: "Rien de tout ça",
          "answer-questions": "Répondre aux questions sur l’objet",
          "suggest-time": "Proposer un des créneaux que j’ai donnés à Pako",
          remind: "Rappeler le rendez\u2011vous à l’autre personne",
          negotiate: "Négocier le prix",
          "accept-offer": "Accepter une offre",
        },
      },
      "pay-model": {
        question: "Comment classerais-tu ces formules\u202f?",
        options: {
          free: "Gratuit",
          "free-ads": "Gratuit avec pub",
          credits: "Pack de crédits",
          "seller-fee": "Commission par vente",
          monthly: "Abonnement mensuel",
        },
      },
      "check-listing": {
        question:
          "À la place de Léa, que vérifierais-tu avant la publication de l’annonce de Pako\u202f?",
        options: {
          price: "Le prix",
          description: "La description",
          photos: "Les photos",
          "pickup-times": "Les horaires de retrait",
          none: "Rien de tout ça",
        },
      },
      "max-distance": {
        question:
          "Jusqu’où irais-tu pour récupérer un bureau d’occasion\u202f?",
        options: {
          "under-1": "Moins de 1\u00a0km",
          "1-3": "1–3\u00a0km",
          "3-10": "3–10\u00a0km",
          "over-10": "Plus de 10\u00a0km",
        },
      },
      "trust-signals": {
        question:
          "Qu’est-ce qui t’aiderait à faire confiance à l’autre personne\u202f?",
        options: {
          verified: "Compte étudiant vérifié",
          reviews: "Des évaluations",
          "pako-rating":
            "Une note de fiabilité donnée par Pako à partir des ventes et retraits passés",
          "campus-meet": "Se retrouver sur le campus",
          chat: "Le chat jusqu’ici",
          none: "Rien de tout ça",
        },
      },
      "pay-for": {
        question: "Pour quoi serais-tu le plus prêt·e à payer\u202f?",
        options: {
          listings: "Faire rédiger mes annonces",
          replies: "Réponses et rendez-vous gérés par Pako",
          transport: "Transport ou livraison",
          visibility: "Plus de visibilité pour mon annonce",
          nothing: "Pour rien de tout ça",
        },
      },
      age: {
        question: "Quel âge as-tu\u202f?",
        options: {
          "under-18": "Moins de 18 ans",
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31+",
          na: "Je préfère ne pas répondre",
        },
      },
      gender: {
        question: "Ton genre\u202f?",
        options: {
          woman: "Femme",
          man: "Homme",
          "non-binary": "Non binaire",
          "self-describe": "Autre terme",
          na: "Je préfère ne pas répondre",
        },
      },
    },
    amounts: {
      "wtp-monthly": {
        question: "Combien paierais-tu par mois pour cette aide\u202f?",
        choose: "Fais glisser pour choisir",
        nothing: "Rien",
        amount: (francs) => `CHF ${francs} par mois`,
        top: (francs) => `CHF ${francs}`,
      },
    },
    seekingWhat: "Que cherches-tu\u202f? (facultatif)",
    chooseSeveral: "Tu peux en choisir plusieurs.",
    moreBelow: "Autres réponses plus bas",
    sceneInEnglish: "Exemple tiré de l’app (en anglais)",
    plans: {
      rankHint:
        "Touche les formules dans l’ordre, ta préférée d’abord. Touche à nouveau pour annuler.",
      idea: "Ton idée de tarif (facultatif)",
      label: "Exemples de prix, pas encore disponibles",
      help: "Aide de Pako",
      pay: "Tu paies",
      cards: {
        free: {
          price: "CHF\u00a00",
          help: "quelques fois par jour",
          pay: "rien",
        },
        "seller-fee": {
          price: "5\u00a0%",
          help: "illimitée",
          pay: "5\u00a0% du prix de vente, seulement si tu vends quelque chose (CHF\u00a02 sur CHF\u00a040)",
        },
        "free-ads": {
          price: "CHF\u00a00",
          help: "illimitée, avec pub",
          pay: "rien",
        },
        credits: {
          price: "CHF\u00a05",
          help: "50 crédits pour les annonces, les chats et les messages",
          pay: "CHF\u00a05 une fois",
        },
        monthly: {
          price: "CHF\u00a03/mois",
          help: "illimitée",
          pay: "CHF\u00a03 par mois",
        },
      },
    },
    draft: {
      intro:
        "Tu aimerais acheter le bureau de Léa. Pako lui a déjà écrit pour toi.",
      scenario:
        "Tu as dit à Pako que tu es libre le week-end en soirée. Léa a donné ses disponibilités à son propre Pako.",
      task: "Choisis un jour dans le chat ci-dessous.",
      chatLabel: "Chat d’essai avec Léa",
      listing: {
        title: "Bureau compact",
        size: "100\u00a0×\u00a050\u00a0cm",
        price: "CHF\u00a040",
        pickup: "Retrait\u202f: EPFL, Rolex Learning Center",
        seller: "Léa",
      },
      lea: "Léa",
      you: "Toi",
      pako: "Pako",
      sentByPako: "Toi · envoyé par Pako",
      opening: (price) =>
        `salut, le bureau est toujours dispo\u202f? je t’en propose CHF\u00a0${price}`,
      matchedTimes:
        "Avec le Pako de Léa, on a trouvé deux créneaux qui vous vont. Samedi ou dimanche à 17\u00a0h\u00a030\u202f?",
      revise: "Changer de jour ou de réponse",
      askDay: "oui, toujours dispo\u202f! tu pourrais passer quand\u202f?",
      pickDay: "Ta réponse à Léa",
      days: { sat: "Samedi", sun: "Dimanche" },
      yourDay: (day) =>
        `${day.toLowerCase()} vers 17\u00a0h\u00a030, ça joue\u202f?`,
      confirm: (day) =>
        `ça marche pour ${day.toLowerCase()}\u202f! devant le Rolex\u202f?`,
      typing: (name) => `${name} écrit…`,
      offerReady: "Tu pourrais confirmer comme ça.",
      offer: (day, price) =>
        `à ${day.toLowerCase()} à 17\u00a0h\u00a030 devant le Rolex\u202f! je prends les CHF\u00a0${price}`,
      offerTitle: "Brouillon de Pako",
      question: "Que ferais-tu de ce brouillon\u202f?",
      sendAsIs: "Envoyer tel quel",
      change: "Le modifier",
      own: "Écrire le mien",
      ownLabel: "Ton message à Léa",
      send: "Envoyer",
      dontSend: "Ne rien envoyer",
      editLabel: "Ta réponse à Léa",
      notSent: "Tu n’as rien envoyé.",
    },
    scene: { next: "Suivant", replay: "Rejouer" },
    pilot: {
      invite: "Veux-tu avoir de nos nouvelles\u202f?",
      email: "Adresse e\u2011mail",
      ticksLegend: "Qu’est-ce qui t’intéresse\u202f?",
      ticks: {
        launchNews: "Prévenez-moi quand takeover sera lancé",
        tryEarly: "J’aimerais essayer takeover avant le lancement",
        interview: "Je veux bien participer à un entretien de 15\u00a0minutes",
        futureSurveys: "Invitez-moi à de futurs sondages",
      },
      role: "Qu’aimerais-tu essayer\u202f?",
      roles: {
        buy: "Acheter",
        "get-free": "Recevoir gratuitement",
        sell: "Vendre",
        "give-away": "Donner",
        "not-sure": "Je ne sais pas encore",
      },
      place: "Où habites-tu\u202f?",
      places: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Une autre résidence FMEL",
        "other-res": "Une autre résidence étudiante",
        flat: "Un appartement ou un studio",
        elsewhere: "Ailleurs",
      },
      note: "Facultatif. Conservé séparément de tes réponses au sondage.",
      send: "Envoyer",
      sent: "Nous avons enregistré ton adresse e\u2011mail et te recontacterons.",
      errors: {
        emailMissing: "Saisis ton adresse e\u2011mail.",
        emailInvalid: "Ça ne ressemble pas à une adresse e\u2011mail.",
        ticks: "Coche au moins une case.",
        role: "Choisis ce que tu aimerais essayer.",
        place: "Choisis où tu habites.",
      },
    },
    end: {
      title: "Merci\u202f!",
      shareTitle:
        "Chaque réponse compte, y compris celles des personnes qui ne vendent jamais rien. Veux-tu partager le sondage\u202f?",
      share: "Partager",
      copy: "Copier le lien",
      showQr: "Afficher le code QR",
      hideQr: "Masquer le code QR",
      qrLabel: "Code QR du lien vers le sondage",
      copied: "Lien copié.",
      copyFailed: "Le lien n’a pas pu être copié. Le voici\u202f:",
      shareText: (minutes, link) =>
        `Je viens de répondre à un sondage de ${minutes}\u00a0minutes pour un projet étudiant de l’EPFL. Pas d’inscription\u202f: ${link}`,
    },
  },
};
