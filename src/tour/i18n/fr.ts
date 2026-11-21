import type { TourText } from "./en";

/** The tour page in French. A no-break space keeps « ? », « : » and « ! » with their word. */
const helped = {
  question: "Est-ce que ça t'aurait aidé·e la dernière fois\u00a0?",
  options: {
    yes: "Oui",
    partly: "En partie",
    no: "Non",
    na: "Ça ne me concerne pas",
  },
};

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
    textCount: (count, max) => `${count} sur ${max} caractères`,
    optional: "Ta réponse (facultatif)",
    inAFewWords: (option) => `${option}\u00a0: en quelques mots (facultatif)`,
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
      text: "Tu peux quand même voir la visite de takeover.",
    },
    unreachable: {
      title: "Je n'arrive pas à joindre le sondage pour le moment.",
      text: "Vérifie ta connexion et réessaie, ou regarde plutôt la visite.",
    },
    closed: {
      title: "Le sondage est fermé pour le moment.",
      text: "Merci de ton passage. Tu peux quand même voir la visite de takeover.",
    },
    doneBefore: {
      title: "Tu as déjà participé.",
      text: "Merci\u00a0! Ce navigateur se souvient que tu as terminé. Tu peux quand même voir la visite de takeover.",
    },
    showTour: "Voir la visite",
    loadFailed: {
      title: "Connexion indisponible",
      text: "La visite n'a pas pu se charger. Vérifie ta connexion et recharge la page.",
    },
  },
  scenes: {
    find: {
      title: "Dis simplement ce qu'il te faut",
      text: "Quelqu'un près de Vortex cherche un bureau. Je parcours les annonces d'étudiant·es et je rédige l'offre. Rien n'est envoyé sans son geste.",
      label:
        "Exemple dans l'app\u00a0: un·e étudiant·e tape «\u00a0a desk under CHF 80 near Vortex\u00a0», Pako cherche dans les annonces d'étudiant·es et montre deux bureaux, puis l'étudiant·e ouvre le petit bureau d'étude et envoie à Léa l'offre de CHF 35 préparée par Pako.",
    },
    sell: {
      title: "Commence par une photo",
      text: "Léa prend son bureau en photo. J'écris l'annonce et je propose un prix. Elle choisit le sien et l'enregistre.",
      label:
        "Exemple dans l'app\u00a0: Léa ajoute une photo de son bureau, Pako écrit l'annonce et demande quand on peut venir le chercher, propose CHF 35, puis Léa fixe CHF 40 et enregistre l'annonce sur son appareil.",
    },
    deal: {
      title: "Se mettre d'accord et récupérer",
      text: "Noah propose CHF 35 et Léa confirme\u00a0: le rendez-vous est fixé. Au moment de la remise, les deux confirment l'échange.",
      label:
        "Exemple dans l'app\u00a0: Noah propose CHF 35 pour le bureau de Léa, Léa touche Confirm sale, le rendez-vous est fixé avec un compte à rebours, Noah touche Picked up et Léa marque le bureau comme vendu.",
    },
  },
  pitch: {
    title: "Des trouvailles de seconde main, entre étudiant·es.",
    lead: "Pako t'aide à trouver des objets, à rédiger des annonces et à fixer un rendez-vous avec des étudiant·es autour de l'EPFL, de l'UNIL et des résidences FMEL. C'est toi qui décides ce qui est envoyé.",
    seeHow: "Voir comment ça marche",
    replay: "Rejouer",
    exampleScreen: (title) => `${title}, écran d'exemple`,
    sections: {
      find: {
        title: "Trouver",
        sentences: [
          "Écris ce qu'il te faut avec tes propres mots, comme un message à un ami.",
          "Pako parcourt les annonces d'étudiant·es près de chez toi et montre ce qui correspond et ce qu'il faut vérifier.",
        ],
      },
      sell: {
        title: "Vendre",
        sentences: [
          "Commence par une photo de l'objet.",
          "Pako rédige l'annonce et un prix d'après des offres semblables, et tu vérifies avant de publier.",
        ],
      },
      agree: {
        title: "Se mettre d'accord et récupérer",
        sentences: [
          "Pako lit les réponses et propose quoi dire. C'est toi qui choisis ce que tu envoies.",
          "Une affaire demande la confirmation des deux étudiant·es, puis le rendez-vous est fixé.",
        ],
      },
    },
    backAndForth: {
      title: "Pako s'occupe des allers-retours",
      sentences: [
        "Sans takeover, un bureau, c'est des annonces à plein d'endroits, beaucoup de messages et un rendez-vous à organiser.",
        "Pako trie les annonces et rédige l'offre. Ton geste l'envoie, vous confirmez tous les deux, et les nouvelles du jour J se donnent en un geste.",
      ],
      chapters: { search: "Recherche", messages: "Messages", pickup: "Remise" },
      lines: {
        scattered:
          "Les bureaux sont publiés à plein d'endroits, et chaque vendeur reçoit les mêmes questions.",
        sorted:
          "Je parcours les annonces d'étudiant·es et je garde ce qui convient\u00a0: deux bureaux à moins de CHF 80 près de Vortex.",
        pile: "Puis les messages commencent\u00a0: le prix, l'heure, le lieu, et quelqu'un qui est en retard.",
        offer:
          "Je mets le prix, l'heure et le point de rencontre dans une seule offre. Tu la vérifies.",
        sent: "Seul ton geste l'envoie. Je n'envoie jamais rien moi-même.",
        booked: "Léa confirme de son côté, et le rendez-vous est fixé.",
        reminder: "Avant le rendez-vous, un rappel.",
        underway:
          "En route, un geste suffit pour dire à Léa\u00a0: j'arrive, ou je suis en retard.",
        done: "Après la remise, tu touches Récupéré. C'est fait.",
      },
      label:
        "Animation en trois parties. Recherche\u00a0: des bureaux publiés à plein d'endroits se réduisent à la courte liste de Pako, deux qui conviennent. Messages\u00a0: une pile de questions devient une seule offre avec le prix, l'heure et le point de rencontre, que l'étudiant·e envoie d'un geste. Remise\u00a0: Léa confirme, le rendez-vous est fixé, un rappel arrive, l'étudiant·e touche J'arrive puis, après la remise, Récupéré.",
    },
    principlesTitle: "Ce qui reste vrai",
    principles: {
      send: {
        title: "Rien n'est envoyé sans ton geste",
        text: "Pako rédige les messages et les offres. C'est toi qui décides de ce qui part.",
      },
      students: {
        title: "Pour les étudiant·es de l'EPFL et de l'UNIL",
        text: "Un compte demande une adresse @epfl.ch ou @unil.ch.",
      },
      prices: {
        title: "Des prix avec leurs sources",
        text: "Un prix proposé montre les offres sur lesquelles il se base.",
      },
    },
    invite: {
      title: "Aide-nous à décider quoi construire ensuite",
      text: (minutes) =>
        `Pako te pose des questions sur la dernière fois que tu as acheté, vendu ou donné quelque chose d'occasion, puis te montre quelques courtes situations. Ça prend environ ${minutes} minutes.`,
      action: "Participer",
    },
    footer: "takeover est un projet d'étudiant·es du cours CS-500 à l'EPFL.",
  },
  v1: {
    invitation:
      "Salut, je suis Pako\u00a0! Je suis l'assistant de takeover, un projet d'étudiant·es à l'EPFL. J'aimerais te poser des questions sur la dernière fois que tu as acheté ou vendu quelque chose d'occasion, puis te montrer ce que nous construisons. Ça prend environ 4 minutes.",
    start: "Commencer",
    justTour: "Montre-moi juste la visite",
    consentTitle: "Avant de commencer",
    consent: {
      anonymous: "Tes réponses sont enregistrées sans ton nom.",
      extra:
        "J'enregistre aussi le temps passé sur chaque étape, le lien qui t'a amené·e ici et si tu utilises un téléphone ou un ordinateur.",
      ip: "Ton adresse IP n'est pas enregistrée avec tes réponses.",
      email:
        "Une adresse e-mail est facultative, à la fin, et conservée séparément.",
      deleted: (date) => `Tout est supprimé d'ici au ${date}.`,
      questions: "Questions\u00a0:",
    },
    agree: "J'accepte",
    decline: "Non merci, montre-moi juste la visite",
    progress: "Progression de l'étude",
    stepOf: (step, total) => `Étape ${step} sur ${total}`,
    steps: {
      student: {
        question: "Es-tu étudiant·e\u00a0?",
        options: {
          "yes-epfl": "Oui, à l'EPFL",
          "yes-unil": "Oui, à l'UNIL",
          "yes-elsewhere": "Oui, ailleurs",
          no: "Non",
        },
      },
      housing: {
        question: "Où habites-tu en ce moment\u00a0?",
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
          "Pense à la dernière fois que tu as essayé d'acheter, de vendre ou de donner un objet d'occasion. Que faisais-tu\u00a0?",
        options: {
          buying: "J'achetais",
          selling: "Je vendais",
          "giving-away": "Je le donnais",
          "not-tried": "Je n'ai pas essayé ces 12 derniers mois",
        },
      },
      "last-occasion": {
        question: "C'était à quelle occasion\u00a0?",
        options: {
          "moving-in": "Un emménagement",
          "moving-out": "Un déménagement",
          "during-year": "Ni l'un ni l'autre, c'était en cours d'année",
        },
      },
      "last-outcome": {
        question: "Comment ça s'est terminé\u00a0?",
        options: {
          "worked-out": "Ça a marché",
          "gave-up": "J'ai abandonné",
          "still-open": "C'est encore en cours",
        },
      },
      "last-hard": {
        question:
          "Qu'est-ce qui a été difficile\u00a0? Choisis tout ce qui s'applique.",
        options: {
          finding: "Trouver le bon objet ou un acheteur",
          listing: "Rédiger l'annonce",
          price: "Se mettre d'accord sur un prix",
          replies: "Des réponses lentes ou absentes",
          "pickup-fell-through": "Un rendez-vous qui est tombé à l'eau",
          timing: "Trouver un moment qui convenait",
          transport: "Amener l'objet d'un point A à un point B",
          trust: "Pas sûr·e de pouvoir faire confiance à l'autre personne",
          nothing: "Rien, c'était facile",
          "something-else": "Autre chose",
        },
      },
      "last-transport": {
        question:
          "Comment l'objet est-il allé d'un point A à un point B\u00a0?",
        options: {
          "on-foot": "À pied",
          bike: "À vélo",
          "public-transport": "En transports publics",
          car: "En voiture ou en camionnette",
          delivery: "Livraison ou poste",
          didnt: "Il n'a pas bougé",
        },
      },
      attempts: {
        question:
          "Combien de fois as-tu essayé d'acheter, de vendre ou de donner quelque chose d'occasion ces 12 derniers mois\u00a0?",
        options: {
          once: "Une fois",
          "two-to-five": "2 à 5 fois",
          "more-than-five": "Plus de 5 fois",
        },
      },
      "nearer-or-cheaper": {
        question:
          "Il te faut un bureau. J'en ai trouvé deux qui conviennent. Lequel choisirais-tu\u00a0?",
        options: {
          nearer: "CHF 45",
          cheaper: "CHF 30",
          neither: "Aucun des deux",
        },
      },
      "far-transport": {
        question: "Comment le ramènerais-tu chez toi\u00a0?",
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
          "Lesquels de ces éléments utiliserais-tu\u00a0? Choisis-en autant que tu veux.",
        options: {
          "describe-search": "Chercher en décrivant ce qu'il me faut",
          "photo-listing": "Une annonce rédigée à partir de mes photos",
          "price-suggestion": "Un prix proposé d'après des offres semblables",
          "offer-drafts":
            "Des brouillons d'offre que je peux modifier et envoyer",
          "pickup-reminders": "Un rendez-vous avec confirmations et rappels",
          none: "Aucun de ceux-ci",
        },
      },
      autonomy: {
        question:
          "Qu'est-ce que je devrais pouvoir faire sans te demander d'abord\u00a0?",
        options: {
          nothing: "Rien. J'envoie tout moi-même",
          "short-updates": "De courtes nouvelles comme «\u00a0J'arrive\u00a0»",
          "simple-replies": "Répondre à des questions simples",
          negotiate: "Négocier dans des limites que je fixe",
        },
      },
      "need-soon": {
        question:
          "Dans les quatre prochaines semaines, as-tu quelque chose à vendre ou te faut-il quelque chose\u00a0?",
        options: {
          sell: "Quelque chose à vendre",
          need: "Il me faut quelque chose",
          both: "Les deux",
          neither: "Ni l'un ni l'autre",
        },
      },
      age: {
        question: "Quel âge as-tu\u00a0?",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-plus": "27 ou plus",
          "no-answer": "Je préfère ne pas répondre",
        },
      },
      gender: {
        question: "Ton genre\u00a0?",
        options: {
          woman: "Femme",
          man: "Homme",
          "non-binary": "Non binaire",
          "no-answer": "Je préfère ne pas répondre",
        },
      },
      level: {
        question: "Quel diplôme prépares-tu\u00a0?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doctorat",
          exchange: "Semestre d'échange",
          other: "Autre chose",
        },
      },
    },
    deskDetails: {
      nearer: "Dans ta résidence, 200 m",
      cheaper: "Centre de Lausanne, 4 km",
    },
    sameDesk: "Même bureau, même état.",
    lastStory: "En quelques mots, que s'est-il passé\u00a0?",
    draftWhy: "Qu'est-ce qui t'a fait choisir ça\u00a0?",
    missing:
      "Qu'est-ce qui manque, ou qu'est-ce qui t'empêcherait de l'utiliser\u00a0?",
    tasksIntro:
      "Merci\u00a0! Maintenant, deux courtes situations. Rien ici n'est réel et rien n'est envoyé.",
    tourIntro:
      "Maintenant, la courte visite. Voici comment fonctionne takeover.",
    draft: {
      situation:
        "Tu aimerais le bureau de Mia. Tu lui as dit que tu ne peux venir le chercher que samedi.",
      prompt: "J'ai rédigé ton offre. Vérifie-la, puis décide.",
      draft:
        "Salut Mia\u00a0! J'aimerais ton bureau de travail blanc. CHF 40, ça irait\u00a0? Je pourrais venir le chercher vendredi à 17h30 à la FMEL Atrium.",
      explanation:
        "Une chose\u00a0: le brouillon disait vendredi, alors que tu avais dit samedi. C'était voulu. Nous voulons voir comment les brouillons sont vérifiés.",
      situationTitle: "La situation",
      draftTitle: "Brouillon de Pako pour Mia",
      sent: "Tu as envoyé",
      notSent: "Tu n'as pas envoyé l'offre.",
      send: "Envoyer l'offre",
      edit: "Modifier",
      writeOwn: "Écrire la mienne",
      dontSend: "Ne pas envoyer",
      editLabel: "Ton offre à Mia",
      ownLabel: "Ta propre offre à Mia",
      ownPlaceholder: "Écris ton offre",
    },
    contact: {
      question:
        "Pouvons-nous t'envoyer par e-mail deux ou trois questions de suivi, ou une invitation quand nous testerons avec de vrais objets\u00a0?",
      email: "Adresse e-mail (facultatif)",
      invalid: "Ça ne ressemble pas encore à une adresse e-mail.",
      note: "Conservée à part de tes réponses, sauf si tu coches la deuxième case.",
      pilot: "Invitez-moi au test avec de vrais objets",
      link: "Relier cette adresse à mes réponses",
    },
    end: {
      text: "Merci\u00a0! Ça nous aide à décider quoi construire ensuite.",
      share: "Partager l'étude",
      copied: "Lien de l'étude copié.",
      copyFailed: "Je n'ai pas pu copier le lien. Le voici\u00a0:",
    },
  },
  v3: {
    sections: {
      you: "Toi",
      "last-time": "La dernière fois",
      "the-app": "L'app",
      situations: "Situations",
      price: "Prix et livraison",
    },
    progress: "Parties du sondage",
    sectionState: {
      done: (name) => `${name}\u00a0: terminé`,
      current: (name) => `${name}\u00a0: en cours`,
      next: (name) => `${name}\u00a0: à venir`,
    },
    start: {
      bubble: (minutes) =>
        `Salut, je suis Pako\u00a0! Nous sommes des étudiant·es de l'EPFL et nous construisons takeover, une app pour faire passer des objets d'occasion autour du campus. Tu as ${minutes} minutes\u00a0? Pas d'inscription. Tout le monde est bienvenu, aussi si tu n'as jamais acheté ni vendu d'occasion.`,
      saveTitle: "Ce que nous enregistrons",
      save: (date) =>
        `Tes réponses, les écrans que tu vois, passes ou sur lesquels tu reviens, le temps par écran, le lien par lequel tu es venu·e, ta langue et si tu utilises un téléphone ou un ordinateur. Ta progression reste dans cet onglet jusqu'à ce que tu le fermes, et ce navigateur se souvient que tu as terminé. Une adresse e-mail à la fin est facultative et conservée à part de tes réponses. Tout est supprimé d'ici au ${date}.`,
      questions: "Questions\u00a0:",
      go: "C'est parti",
      demo: "Montre-moi juste l'app",
    },
    whatIs: {
      bubble: "Voici ce que fait takeover.",
      title: "Qu'est-ce que takeover\u00a0?",
      find: {
        title: "Trouver",
        text: "Décris ce qu'il te faut, et je cherche parmi les annonces d'étudiant·es près de chez toi.",
      },
      sell: {
        title: "Vendre",
        text: "Prends une photo, et j'écris l'annonce avec un prix suggéré.",
      },
      agree: {
        title: "Se mettre d'accord",
        text: "Fixez le prix et l'heure du retrait dans le chat, puis retrouvez-vous sur le campus.",
      },
      nextTitle: "Ce qui suit",
      next: [
        "Ta dernière expérience avec l'occasion",
        "Un rapide coup d'œil à l'app",
        "Quelques courtes situations",
      ],
      duration: (minutes) => `Environ ${minutes} minutes`,
    },
    situations: {
      label: (current, total) => `Situation ${current} sur ${total}`,
      pickOne: "Choisis une réponse.",
      "move-it": "Tu as trouvé un bureau qui te plaît, à 4 km de chez toi.",
      desk: "Il te faut un bureau, et deux conviennent dans l'app.",
      draft: "Tu achètes un bureau à Mia. Le prix et le lieu te conviennent.",
      draftTask: "Réponds à Mia, puis choisis quoi faire du brouillon de Pako.",
    },
    steps: {
      "wanted-react": {
        question: "Si takeover te montrait ceci, que ferais-tu\u00a0?",
        options: {
          snap: "Prendre une photo et le mettre en vente",
          look: "Jeter un œil, peut-être plus tard",
          ignore: "L'ignorer",
          "rather-not": "Je préfère ne pas voir ça",
        },
      },
      "wanted-share": {
        question:
          "Quand tu cherches quelque chose, laisserais-tu les étudiant·es près de chez toi voir ta demande\u00a0? Seuls l'objet et ton quartier sont affichés, jamais ton nom.",
        options: { yes: "Oui", maybe: "Peut-être", no: "Non" },
      },
      "last-cost": {
        question: "Combien t'a coûté le transport, à peu près\u00a0?",
        options: {
          nothing: "Rien",
          "under-10": "Moins de CHF 10",
          "10-30": "CHF 10–30",
          "over-30": "Plus de CHF 30",
          "dont-remember": "Je ne sais plus",
        },
      },
      "pay-model": {
        question:
          "Les bases de takeover restent gratuites. Si quelque chose devait être payant, que choisirais-tu\u00a0?",
        options: {
          "seller-fee":
            "Une petite commission quand ton objet se vend (5\u00a0%, payée par le vendeur)",
          "move-pack":
            "Un pack déménagement unique (CHF 5\u00a0: brouillons photo et vérifications de prix en plus pendant 30 jours)",
          monthly:
            "Un abonnement mensuel (CHF 3/mois\u00a0: aide illimitée de Pako)",
          institution:
            "Gratuit pour les étudiant·es, payé par la résidence ou l'université",
          none: "Rien de tout ça, je ne paierais pas",
        },
      },
      "delivery-pref": {
        question:
          "Quand tu achètes un objet encombrant d'occasion, comment préfères-tu le récupérer\u00a0?",
        options: {
          "pick-up": "Je vais le chercher moi-même pour économiser",
          "if-priced": "Livraison, si le prix est correct",
          always: "Toujours la livraison",
          depends: "Ça dépend de l'objet",
        },
      },
      "delivery-worth": {
        question:
          "Combien vaudrait pour toi une livraison jusqu'à ta porte dans Lausanne (jusqu'à environ 5 km)\u00a0?",
        options: {
          "only-free": "Rien, seulement si c'est gratuit",
          "up-to-5": "Jusqu'à CHF 5",
          "5-10": "CHF 5–10",
          "10-20": "CHF 10–20",
          "over-20": "Plus de CHF 20",
          "not-sure": "Je ne sais pas",
        },
      },
      who: {
        question: "Pour commencer\u00a0: es-tu étudiant·e\u00a0?",
        options: {
          epfl: "Oui, à l'EPFL",
          unil: "Oui, à l'UNIL",
          "other-school": "Oui, ailleurs",
          no: "Non",
        },
      },
      "last-role": {
        question:
          "Pense à la dernière fois que tu as essayé d'acheter, d'obtenir, de vendre ou de donner quelque chose d'occasion, même si ça n'a pas marché. Qu'est-ce que tu essayais de faire\u00a0?",
        options: {
          buying: "Acheter quelque chose",
          "getting-free": "Obtenir quelque chose gratuitement",
          selling: "Vendre quelque chose",
          "giving-away": "Donner quelque chose",
          none: "Aucune occasion ne me vient à l'esprit",
        },
      },
      "last-item": {
        question: "C'était quoi\u00a0?",
        options: {
          furniture: "Un meuble (bureau, chaise, étagère, lit)",
          household: "Des petites choses pour la maison",
          electronics: "De l'électronique",
          bike: "Un vélo ou une trottinette",
          books: "Des livres ou du matériel de cours",
          clothes: "Des vêtements ou des chaussures",
          other: "Autre chose",
        },
      },
      "last-occasion": {
        question: "C'était à cause d'un déménagement\u00a0?",
        options: {
          "moving-in": "Oui, en emménageant",
          "moving-out": "Oui, en partant",
          "no-move": "Non",
          "cant-recall": "Je ne m'en souviens pas",
        },
      },
      "last-trouble": {
        question:
          "Avec le recul, quelle étape t'a posé le plus de problèmes, s'il y en a eu\u00a0?",
        options: {
          finding: "Trouver le bon objet",
          listing: "Rédiger l'annonce ou prendre les photos",
          price: "Connaître le prix ou se mettre d'accord dessus",
          replies: "Des réponses lentes ou absentes",
          timing: "Trouver un moment, ou un rendez-vous qui tombe à l'eau",
          transport: "L'amener d'un point A à un point B",
          trust: "Pas sûr·e de pouvoir faire confiance à l'autre personne",
          nothing: "Rien n'a été difficile",
          other: "Autre chose",
          "cant-recall": "Je ne m'en souviens pas",
        },
      },
      "why-not": {
        question: "Quelle est la raison principale\u00a0?",
        options: {
          "no-need": "Je n'en ai jamais eu besoin",
          "prefer-new": "Je préfère les objets neufs",
          hassle: "Ça semblait trop compliqué",
          "dont-know-where": "Je ne savais pas où chercher",
          other: "Autre chose",
        },
      },
      move: {
        question: "Prévois-tu de déménager\u00a0?",
        options: {
          "move-feb": "Oui, d'ici fin février 2027",
          "move-jun": "Oui, entre mars et juin 2027",
          "move-later": "Oui, plus tard",
          "no-plan": "Pas de projet",
          "not-sure": "Je ne sais pas",
        },
      },
      housing: {
        question: "Où habites-tu actuellement\u00a0?",
        options: {
          fmel: "Résidence FMEL",
          "other-res": "Une autre résidence étudiante",
          flat: "Un appartement ou un studio",
          family: "En famille",
          elsewhere: "Ailleurs",
        },
      },
      headline: {
        question:
          "Laquelle de ces phrases, s'il y en a une, te donnerait le plus envie d'ouvrir l'app\u00a0?",
        options: {
          "h-move": "«\u00a0Vends tes affaires avant de déménager.\u00a0»",
          "h-photo":
            "«\u00a0Prends une photo, reçois une annonce prête avec un prix juste.\u00a0»",
          "h-ai":
            "«\u00a0Un assistant IA rédige ton annonce à partir d'une photo.\u00a0»",
          "h-nearby":
            "«\u00a0Trouve des objets d'occasion près de chez toi, à récupérer sur le campus.\u00a0»",
          none: "Aucune de celles-ci",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question:
          "Qu'est-ce qui t'empêcherait d'utiliser takeover\u00a0? Choisis-en autant que tu veux.",
        options: {
          "ai-mistakes": "L'IA pourrait se tromper",
          "nobody-nearby": "Pas assez de gens l'utilisent près de chez moi",
          "prefer-groups": "Je préfère mes groupes WhatsApp ou Telegram",
          privacy: "Des inquiétudes sur la vie privée",
          "too-long": "Ça prend trop de temps",
          nothing: "Rien ne m'en empêcherait",
          other: "Autre chose",
        },
      },
      sending: {
        question:
          "Laisserais-tu Pako envoyer certains messages pour toi, sans te demander d'abord\u00a0?",
        options: {
          myself: "Non, j'enverrais chaque message moi-même",
          "short-updates":
            "Seulement de courtes nouvelles comme «\u00a0J'arrive\u00a0»",
          "replies-too": "De courtes nouvelles et des réponses simples",
          "not-sure": "Je ne sais pas",
        },
      },
      "move-it": {
        question:
          "Avant d'accepter de l'acheter\u00a0: comment le ramènerais-tu probablement chez toi\u00a0?",
        options: {
          "carry-bike": "Je le porte ou je le prends à vélo",
          "public-transport": "En transports publics",
          "friend-car":
            "J'emprunte une voiture, ou je demande à quelqu'un qui en a une",
          helper:
            "Un coursier à vélo-cargo, réservé dans l'app\u00a0: CHF 15 pour tout le trajet jusqu'à 4 km, livré jusqu'à ta porte (rez-de-chaussée ou ascenseur\u00a0; les escaliers peuvent coûter plus)",
          "skip-desk": "J'en chercherais plutôt un plus proche",
          "not-sure": "Je ne sais pas",
        },
      },
      desk: {
        question: "Lequel choisirais-tu\u00a0?",
        options: {
          nearer: "CHF 45",
          cheaper: "CHF 30",
          neither: "Aucun des deux",
        },
      },
      "scene-pick": {
        question: "Qu'aimerais-tu voir en premier\u00a0?",
        options: {
          sell: "Vendre à partir d'une photo",
          deal: "Fixer un rendez-vous",
          find: "Trouver quelque chose",
        },
      },
      "try-first": {
        question:
          "Pour la prochaine chose que tu achètes ou vends, laquelle essaierais-tu en premier, s'il y en a une\u00a0?",
        options: {
          "describe-search": "Chercher en décrivant ce qu'il me faut",
          "photo-listing":
            "Une annonce rédigée à partir de mes photos, avec un prix et ses sources",
          "offer-drafts":
            "Des brouillons d'offre que je peux modifier et envoyer",
          "pickup-card":
            "La fiche de rendez-vous avec confirmations et rappels",
          none: "Aucune de celles-ci",
          "need-more": "J'aurais besoin d'en savoir plus",
        },
      },
      age: {
        question: "Ton âge",
        options: {
          "18-20": "18–20",
          "21-23": "21–23",
          "24-26": "24–26",
          "27-30": "27–30",
          "31-plus": "31 ou plus",
          na: "Je préfère ne pas répondre",
        },
      },
      gender: {
        question: "Ton genre",
        options: {
          woman: "Femme",
          man: "Homme",
          "non-binary": "Non binaire",
          "self-describe": "Je préfère me décrire moi-même",
          na: "Je préfère ne pas répondre",
        },
      },
      level: {
        question: "Qu'étudies-tu\u00a0?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doctorat",
          other: "Autres études",
          "not-student": "Pas étudiant·e",
        },
      },
      exchange: {
        question: "Es-tu étudiant·e en échange\u00a0?",
        options: { yes: "Oui", no: "Non", na: "Je préfère ne pas répondre" },
      },
    },
    helpedNeverTried: "Est-ce que ça t'aiderait\u00a0?",
    findingBySeller: "Trouver quelqu'un que ça intéressait",
    moveIntro: "Deux petites questions sur maintenant.",
    firstLookIntro: "Maintenant, un premier aperçu de takeover.",
    situationsIntro: "Trois courtes situations.",
    priceIntro: "Dernière partie\u00a0: prix et livraison.",
    packLadder: {
      bubble: "Encore une question sur le pack déménagement.",
      title: "Pack déménagement",
      text: "Cinq brouillons photo de plus avec vérification du prix, valables 30 jours, payés une fois.",
      question: (price) =>
        `Dépenserais-tu CHF ${price} de ta poche pour ce pack lors de ton prochain déménagement\u00a0?`,
      options: { yes: "Oui", no: "Non", "not-sure": "Je ne sais pas" },
    },
    lastStory: {
      question: "En une phrase\u00a0: comment ça s'est passé\u00a0?",
      label: "Ta phrase",
      placeholder: "Facultatif, quelques mots suffisent",
    },
    wantedCard: {
      label: "Exemple de demande dans l'app, avec un bouton Prendre en photo",
      text: "Quelqu'un près de Vortex cherche une lampe de bureau. Tu en as une qui traîne\u00a0?",
      button: "Prendre en photo",
    },
    whoSendsCard: {
      title: "Comment fonctionne l'app",
      sentence:
        "Pako rédige tes messages. Rien n'est envoyé tant que tu ne touches pas Envoyer.",
    },
    helperMissing: "L'option coursier n'existe pas encore.",
    packMissing: "Ce pack n'existe pas encore.",
    desk: {
      sameTerms: "Même bureau, même état, à récupérer cette semaine",
      distance: {
        nearer: "À 200 m de chez toi",
        cheaper: "À 4 km de chez toi",
      },
      title: "Bureau",
      listLabel: "Deux bureaux dans l'app",
    },
    draft: {
      intro: "Choisis le jour qui te convient dans le chat avec Mia.",
      chatLabel: "Chat d'essai avec Mia",
      listing: {
        title: "Bureau blanc",
        size: "120 × 60 cm",
        price: "CHF 40",
        pickup: "Retrait\u00a0: EPFL, Rolex Learning Center",
        seller: "Mia",
      },
      mia: "Mia",
      you: "Toi",
      pako: "Pako",
      askDay:
        "Salut\u00a0! Le bureau est encore disponible. Quel jour pourrais-tu venir le chercher\u00a0? Je suis libre dès 17h00.",
      pickDay: "Ta réponse à Mia",
      days: { sat: "Samedi", sun: "Dimanche" },
      yourDay: (day) => `${day}, ça me va, 17h30\u00a0?`,
      confirm: "17h30, c'est bon. Envoie-moi une offre et je confirme.",
      typing: (name) => `${name} est en train d'écrire`,
      offerReady: "Voici ton offre.",
      offer: (day) =>
        `Salut Mia\u00a0! J'aimerais ton bureau blanc pour CHF 40. Je peux venir le chercher ${day.toLowerCase()} à 17h30 au Rolex Learning Center.`,
      offerTitle: "Brouillon d'offre",
      question: "Que ferais-tu de ce brouillon\u00a0?",
      sendAsIs: "L'envoyer tel quel",
      change: "Modifier quelque chose d'abord",
      own: "Écrire le mien",
      ownLabel: "Ton message à Mia",
      send: "Envoyer",
      dontSend: "Ne pas l'envoyer",
      editLabel: "Ton offre à Mia",
      notSent: "Tu n'as pas envoyé l'offre.",
    },
    saved: "C'est fait\u00a0! Tes réponses sont enregistrées.",
    savedSaving: "C'est fait\u00a0! J'enregistre tes dernières réponses.",
    about: {
      intro:
        "Dernière partie, entièrement facultative\u00a0: elle nous aide à comprendre qui a répondu.",
      finish: "Terminer",
      peek: "Voir les scènes en entier (facultatif)",
    },
    tour: {
      next: "Suivant",
      replay: "Rejouer",
      skipRest: "Passer le reste",
    },
    pilot: {
      invite:
        "Nous testons takeover avec de vrais objets dans quelques maisons FMEL. Tu veux une place\u00a0?",
      email: "Adresse e-mail",
      role: "Tu vendrais, achèterais ou les deux\u00a0?",
      roles: { seller: "Vendre", buyer: "Acheter", both: "Les deux" },
      items: "Qu'apporterais-tu ou que chercherais-tu\u00a0?",
      house: "Où habites-tu\u00a0?",
      houses: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Une autre maison FMEL",
        "not-fmel": "Pas dans une maison FMEL",
      },
      weeks: "Quelles semaines te conviendraient\u00a0?",
      weekLabels: {
        "2026-12-14": "14–18 décembre",
        "2026-12-21": "21–23 décembre",
        "2027-02-01": "1er–5 février",
        "2027-02-08": "8–12 février",
      },
      consentLegend: "Pour quoi pouvons-nous utiliser ton adresse\u00a0?",
      joinPilot: "Inscris-moi au test pilote pendant ces semaines",
      laterEmail:
        "Écris-moi pour des tests ultérieurs ou deux ou trois questions de suivi",
      note: "Conservé à part de tes réponses au sondage.",
      send: "Envoyer",
      noThanks: "Non merci",
      errors: {
        emailMissing: "Saisis ton adresse e-mail.",
        emailInvalid: "Ça ne ressemble pas à une adresse e-mail.",
        role: "Choisis si tu vendrais, achèterais ou les deux.",
        house: "Choisis où tu habites.",
        ticks: "Coche au moins une des deux cases.",
      },
    },
    end: {
      title: "Merci\u00a0! Ça nous aide à décider quoi construire ensuite.",
      resultsTitle: "Ce que les autres ont répondu",
      resultsWaiting: (minimum) =>
        `Les résultats apparaissent dès que ${minimum} personnes ont répondu.`,
      resultsLoading: "Chargement des résultats…",
      resultsFailed: "Les résultats n'ont pas pu être chargés.",
      deskTitle: "Deux bureaux\u00a0: lequel\u00a0?",
      deskOptions: {
        nearer: "Plus proche\u00a0: CHF 45, 200 m",
        cheaper: "Moins cher\u00a0: CHF 30, 4 km",
        neither: "Aucun des deux",
      },
      troubleTitle: "Ce qui a posé le plus de problèmes la dernière fois",
      troubleFinding: "Trouver le bon objet ou quelqu'un que ça intéressait",
      ofAnswers: (count, total) => `${count} sur ${total}`,
      shareTitle:
        "Chaque réponse aide, aussi celles de personnes qui ne vendent jamais rien. Tu le partages\u00a0?",
      share: "Partager",
      copy: "Copier le lien",
      showQr: "Afficher le code QR",
      hideQr: "Masquer le code QR",
      qrLabel: "Code QR du lien vers le sondage",
      copied: "Lien copié.",
      copyFailed: "Le lien n'a pas pu être copié. Le voici\u00a0:",
      shareText: (minutes, link) =>
        `Je viens de répondre à un sondage de ${minutes} minutes sur téléphone pour un projet d'étudiant·es de l'EPFL. Pas d'inscription\u00a0: ${link}`,
    },
  },
};
