import type { TourText } from "./en";

/**
 * The tour page in French. A narrow no-break space keeps « ? », « ! », « : » and « ; »
 * with their word and pads the inside of « »; a no-break space joins a number to its unit
 * and CHF to its amount.
 */
const helped = {
  question: "Est-ce que ça t’aurait été utile la dernière fois\u202f?",
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
      you: "Toi",
      "last-time": "La dernière fois",
      "the-app": "L’app",
      situations: "Situations",
      price: "Prix et livraison",
    },
    progress: "Parties du sondage",
    sectionState: {
      done: (name) => `${name}\u202f: terminé`,
      current: (name) => `${name}\u202f: en cours`,
      next: (name) => `${name}\u202f: à venir`,
    },
    start: {
      bubble: (minutes) =>
        `Salut, je suis Pako\u202f! On étudie à l’EPFL et on développe takeover, une app pour faire circuler des objets d’occasion autour du campus. Tu as ${minutes} minutes\u202f? Pas d’inscription. Tout le monde est bienvenu, même si tu n’as jamais acheté ni vendu d’occasion.`,
      saveTitle: "Ce que nous enregistrons",
      save: (date) =>
        `Tes réponses, les écrans que tu vois, que tu passes ou sur lesquels tu reviens, le temps passé sur chaque écran, le lien que tu as suivi, ta langue et le type d’appareil (téléphone ou ordinateur). Ta progression reste dans cet onglet jusqu’à ce que tu le fermes, et ce navigateur se souvient que tu as terminé. Si tu laisses une adresse e-mail à la fin, elle est conservée à part de tes réponses. Tout sera supprimé au plus tard le ${date}.`,
      questions: "Questions\u202f:",
      go: "C’est parti",
      demo: "Montre-moi juste l’app",
    },
    whatIs: {
      bubble: "Voici ce que fait takeover.",
      title: "Qu’est-ce que takeover\u202f?",
      find: {
        title: "Trouver",
        text: "Décris ce qu’il te faut, et je cherche parmi les annonces d’étudiant·es près de chez toi.",
      },
      sell: {
        title: "Vendre",
        text: "Prends une photo, et j’écris l’annonce avec un prix suggéré.",
      },
      agree: {
        title: "Se mettre d’accord",
        text: "Fixe le prix et l’heure du rendez-vous dans le chat, puis retrouve l’autre personne sur le campus.",
      },
      nextTitle: "Ce qui suit",
      next: [
        "Ta dernière expérience avec l’occasion",
        "Un rapide coup d’œil à l’app",
        "Quelques courtes situations",
      ],
      duration: (minutes) => `Environ ${minutes} minutes`,
    },
    situations: {
      label: (current, total) => `Situation ${current} sur ${total}`,
      pickOne: "Choisis une réponse.",
      "move-it":
        "Tu as trouvé un bureau qui te plaît, à 4\u00a0km de chez toi.",
      desk: "Il te faut un bureau. Dans l’app, deux te conviennent.",
      draft: "Tu achètes un bureau à Mia. Le prix et le lieu te conviennent.",
      draftTask: "Réponds à Mia, puis décide quoi faire du brouillon de Pako.",
    },
    steps: {
      "wanted-react": {
        question: "Si takeover te montrait ceci, que ferais-tu\u202f?",
        options: {
          snap: "Prendre une photo et publier une annonce",
          look: "Jeter un œil, peut-être plus tard",
          ignore: "L’ignorer",
          "rather-not": "Je préfère ne pas voir ça",
        },
      },
      "wanted-share": {
        question:
          "Quand tu cherches quelque chose, laisserais-tu les étudiant·es près de chez toi voir ta demande\u202f? Seuls l’objet et ton quartier sont affichés, jamais ton nom.",
        options: { yes: "Oui", maybe: "Peut-être", no: "Non" },
      },
      "last-cost": {
        question: "Combien t’a coûté le transport, à peu près\u202f?",
        options: {
          nothing: "Rien",
          "under-10": "Moins de CHF\u00a010",
          "10-30": "CHF\u00a010–30",
          "over-30": "Plus de CHF\u00a030",
          "dont-remember": "Je ne sais plus",
        },
      },
      "pay-model": {
        question:
          "Les fonctions de base de takeover restent gratuites. Si quelque chose devait être payant, que choisirais-tu\u202f?",
        options: {
          "seller-fee":
            "Une petite commission quand ton objet se vend (5\u00a0%, payée par le vendeur)",
          "move-pack":
            "Un pack déménagement unique (CHF\u00a05\u202f: brouillons d’annonce par photo et vérifications de prix en plus pendant 30 jours)",
          monthly:
            "Un abonnement mensuel (CHF\u00a03/mois\u202f: aide illimitée de Pako)",
          institution:
            "Gratuit pour les étudiant·es, payé par la résidence ou l’université",
          none: "Rien de tout ça, je ne paierais pas",
        },
      },
      "delivery-pref": {
        question:
          "Quand tu achètes un objet encombrant d’occasion, comment préfères-tu le récupérer\u202f?",
        options: {
          "pick-up": "Je vais le chercher moi-même pour économiser",
          "if-priced": "Livraison, si le prix est correct",
          always: "Toujours la livraison",
          depends: "Ça dépend de l’objet",
        },
      },
      "delivery-worth": {
        question:
          "Combien vaudrait pour toi une livraison à ta porte dans Lausanne (jusqu’à environ 5\u00a0km)\u202f?",
        options: {
          "only-free": "Rien, seulement si c’est gratuit",
          "up-to-5": "Jusqu’à CHF\u00a05",
          "5-10": "CHF\u00a05–10",
          "10-20": "CHF\u00a010–20",
          "over-20": "Plus de CHF\u00a020",
          "not-sure": "Je ne sais pas",
        },
      },
      who: {
        question: "Pour commencer\u202f: es-tu étudiant·e\u202f?",
        options: {
          epfl: "Oui, à l’EPFL",
          unil: "Oui, à l’UNIL",
          "other-school": "Oui, ailleurs",
          no: "Non",
        },
      },
      "last-role": {
        question:
          "Pense à la dernière fois que tu as essayé d’acheter, de récupérer, de vendre ou de donner quelque chose d’occasion, même si ça n’a pas marché. Qu’est-ce que tu essayais de faire\u202f?",
        options: {
          buying: "Acheter quelque chose",
          "getting-free": "Récupérer quelque chose gratuitement",
          selling: "Vendre quelque chose",
          "giving-away": "Donner quelque chose",
          none: "Rien ne me vient à l’esprit",
        },
      },
      "last-item": {
        question: "C’était quoi\u202f?",
        options: {
          furniture: "Un meuble (bureau, chaise, étagère, lit)",
          household: "Des petites choses pour la maison",
          electronics: "De l’électronique",
          bike: "Un vélo ou une trottinette",
          books: "Des livres ou du matériel de cours",
          clothes: "Des vêtements ou des chaussures",
          other: "Autre chose",
        },
      },
      "last-occasion": {
        question: "C’était à cause d’un déménagement\u202f?",
        options: {
          "moving-in": "Oui, en emménageant",
          "moving-out": "Oui, en quittant mon logement",
          "no-move": "Non",
          "cant-recall": "Je ne m’en souviens pas",
        },
      },
      "last-trouble": {
        question:
          "Avec le recul, quelle étape t’a posé le plus de problèmes, s’il y en a eu\u202f?",
        options: {
          finding: "Trouver le bon objet",
          listing: "Rédiger l’annonce ou prendre les photos",
          price: "Trouver le bon prix ou se mettre d’accord dessus",
          replies: "Des réponses tardives ou absentes",
          timing: "Convenir d’une heure, ou un rendez-vous qui tombe à l’eau",
          transport: "L’amener d’un point A à un point B",
          trust: "Pas sûr·e de pouvoir faire confiance à l’autre personne",
          nothing: "Rien n’a été difficile",
          other: "Autre chose",
          "cant-recall": "Je ne m’en souviens pas",
        },
      },
      "why-not": {
        question: "Quelle est la raison principale\u202f?",
        options: {
          "no-need": "Je n’en ai jamais eu besoin",
          "prefer-new": "Je préfère les objets neufs",
          hassle: "Ça avait l’air trop contraignant",
          "dont-know-where": "Je ne savais pas où chercher",
          other: "Autre chose",
        },
      },
      move: {
        question: "Prévois-tu de déménager\u202f?",
        options: {
          "move-feb": "Oui, d’ici fin février 2027",
          "move-jun": "Oui, entre mars et juin 2027",
          "move-later": "Oui, plus tard",
          "no-plan": "Non, pas prévu",
          "not-sure": "Je ne sais pas encore",
        },
      },
      housing: {
        question: "Où habites-tu actuellement\u202f?",
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
          "Laquelle de ces phrases, s’il y en a une, te donnerait le plus envie d’ouvrir l’app\u202f?",
        options: {
          "h-move": "«\u202fVends tes affaires avant de déménager.\u202f»",
          "h-photo":
            "«\u202fPrends une photo, reçois une annonce prête avec un prix juste.\u202f»",
          "h-ai":
            "«\u202fUn assistant IA rédige ton annonce à partir d’une photo.\u202f»",
          "h-nearby":
            "«\u202fTrouve des objets d’occasion chez des gens du coin, à récupérer sur le campus.\u202f»",
          none: "Aucune de ces phrases",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question:
          "Qu’est-ce qui t’empêcherait d’utiliser takeover\u202f? Choisis-en autant que tu veux.",
        options: {
          "ai-mistakes": "L’IA pourrait se tromper",
          "nobody-nearby": "Pas assez de gens l’utilisent près de chez moi",
          "prefer-groups": "Je préfère mes groupes WhatsApp ou Telegram",
          privacy: "Des craintes pour ma vie privée",
          "too-long": "Ça prend trop de temps",
          nothing: "Rien ne m’en empêcherait",
          other: "Autre chose",
        },
      },
      sending: {
        question:
          "Laisserais-tu Pako envoyer certains messages pour toi, sans te demander d’abord\u202f?",
        options: {
          myself: "Non, j’enverrais chaque message moi-même",
          "short-updates":
            "Seulement de courtes nouvelles comme «\u202fJe suis en route\u202f»",
          "replies-too": "De courtes nouvelles et des réponses simples",
          "not-sure": "Je ne sais pas",
        },
      },
      "move-it": {
        question:
          "Avant de dire oui à l’achat\u202f: comment penses-tu le ramener chez toi\u202f?",
        options: {
          "carry-bike": "Le porter ou le ramener à vélo",
          "public-transport": "En transports publics",
          "friend-car":
            "Emprunter une voiture ou demander à un·e ami·e qui en a une",
          helper:
            "Quelqu’un avec un vélo-cargo, à réserver dans l’app\u202f: CHF\u00a015 pour tout le trajet jusqu’à 4\u00a0km, livraison à ta porte (rez-de-chaussée ou ascenseur\u202f; supplément possible pour les escaliers)",
          "skip-desk": "J’en chercherais plutôt un plus proche",
          "not-sure": "Je ne sais pas",
        },
      },
      desk: {
        question: "Lequel choisirais-tu\u202f?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Aucun des deux",
        },
      },
      "scene-pick": {
        question: "Qu’aimerais-tu voir en premier\u202f?",
        options: {
          sell: "Vendre à partir d’une photo",
          deal: "Fixer un rendez-vous",
          find: "Trouver quelque chose",
        },
      },
      "try-first": {
        question:
          "Pour ton prochain achat ou ta prochaine vente, qu’est-ce que tu essaierais en premier, si quelque chose te tente\u202f?",
        options: {
          "describe-search": "Chercher en décrivant ce qu’il me faut",
          "photo-listing":
            "Une annonce rédigée à partir de mes photos, avec un prix et ses sources",
          "offer-drafts":
            "Des brouillons d’offre que je peux modifier et envoyer",
          "pickup-card":
            "La fiche de rendez-vous avec confirmations et rappels",
          none: "Rien de tout ça",
          "need-more": "J’aurais besoin d’en savoir plus",
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
        question: "Quel type d’études fais-tu\u202f?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doctorat",
          other: "Autres études",
          "not-student": "Pas étudiant·e",
        },
      },
      exchange: {
        question: "Es-tu en échange\u202f?",
        options: { yes: "Oui", no: "Non", na: "Je préfère ne pas répondre" },
      },
    },
    helpedNeverTried: "Est-ce que ça t’aiderait\u202f?",
    findingBySeller: "Trouver quelqu’un qui voulait l’objet",
    moveIntro: "Deux petites questions sur ta situation actuelle.",
    firstLookIntro: "Voici un premier aperçu de takeover.",
    situationsIntro: "Trois courtes situations.",
    priceIntro: "Dernière partie\u202f: prix et livraison.",
    packLadder: {
      bubble: "Encore une question sur le pack déménagement.",
      title: "Pack déménagement",
      text: "Cinq brouillons d’annonce par photo en plus, avec vérification du prix, valables 30 jours, paiement unique.",
      question: (price) =>
        `Dépenserais-tu CHF\u00a0${price} de ta poche pour ce pack lors de ton prochain déménagement\u202f?`,
      options: { yes: "Oui", no: "Non", "not-sure": "Je ne sais pas" },
    },
    lastStory: {
      question: "En une phrase\u202f: comment ça s’est passé\u202f?",
      label: "Ta phrase",
      placeholder: "Facultatif, quelques mots suffisent",
    },
    wantedCard: {
      label:
        "Exemple de demande dans l’app, avec un bouton «\u202fPrendre en photo\u202f»",
      text: "Quelqu’un près du Vortex cherche une lampe de bureau. Tu en as une qui traîne\u202f?",
      button: "Prendre en photo",
    },
    whoSendsCard: {
      title: "Comment fonctionne l’app",
      sentence:
        "Pako prépare tes messages. Rien ne part tant que tu n’appuies pas sur «\u202fEnvoyer\u202f».",
    },
    helperMissing: "Cette aide au transport n’existe pas encore.",
    packMissing: "Ce pack n’existe pas encore.",
    desk: {
      sameTerms: "Même bureau, même état, à récupérer cette semaine",
      distance: {
        nearer: "À 200\u00a0m de chez toi",
        cheaper: "À 4\u00a0km de chez toi",
      },
      title: "Bureau",
      listLabel: "Deux bureaux dans l’app",
    },
    draft: {
      intro: "Choisis le jour qui te convient dans le chat avec Mia.",
      chatLabel: "Chat d’essai avec Mia",
      listing: {
        title: "Bureau blanc",
        size: "120\u00a0×\u00a060\u00a0cm",
        price: "CHF\u00a040",
        pickup: "Retrait\u202f: EPFL, Rolex Learning Center",
        seller: "Mia",
      },
      mia: "Mia",
      you: "Toi",
      pako: "Pako",
      askDay:
        "Salut\u202f! Le bureau est encore disponible. Quel jour pourrais-tu venir le chercher\u202f? Je suis libre dès 17\u00a0h.",
      pickDay: "Ta réponse à Mia",
      days: { sat: "Samedi", sun: "Dimanche" },
      yourDay: (day) => `${day}, ça me va. À 17\u00a0h\u00a030\u202f?`,
      confirm:
        "17\u00a0h\u00a030, c’est bon. Envoie-moi une offre et je confirme.",
      typing: (name) => `${name} écrit…`,
      offerReady: "Voici ton offre.",
      offer: (day) =>
        `Salut Mia\u202f! J’aimerais ton bureau blanc pour CHF\u00a040. Je peux venir le chercher ${day.toLowerCase()} à 17\u00a0h\u00a030 au Rolex Learning Center.`,
      offerTitle: "Brouillon d’offre",
      question: "Que ferais-tu de ce brouillon\u202f?",
      sendAsIs: "L’envoyer tel quel",
      change: "Modifier quelque chose d’abord",
      own: "Écrire le mien",
      ownLabel: "Ton message à Mia",
      send: "Envoyer",
      dontSend: "Ne pas l’envoyer",
      editLabel: "Ton offre à Mia",
      notSent: "Tu n’as pas envoyé l’offre.",
    },
    saved: "C’est fait\u202f! Tes réponses sont enregistrées.",
    savedSaving: "C’est fait\u202f! J’enregistre tes dernières réponses.",
    about: {
      intro:
        "Dernière partie, entièrement facultative\u202f: elle nous aide à comprendre qui a répondu.",
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
        "On teste takeover avec de vrais objets dans quelques résidences FMEL. Tu veux participer\u202f?",
      email: "Adresse e-mail",
      role: "Tu voudrais vendre, acheter ou les deux\u202f?",
      roles: { seller: "Vendre", buyer: "Acheter", both: "Les deux" },
      items: "Qu’apporterais-tu ou que chercherais-tu\u202f?",
      house: "Où habites-tu\u202f?",
      houses: {
        vortex: "FMEL Vortex",
        atrium: "FMEL Atrium",
        triaudes: "FMEL Triaudes",
        "fmel-other": "Une autre résidence FMEL",
        "not-fmel": "Pas dans une résidence FMEL",
      },
      weeks: "Quelles semaines te conviendraient\u202f?",
      weekLabels: {
        "2026-12-14": "14–18 décembre",
        "2026-12-21": "21–23 décembre",
        "2027-02-01": "1er–5 février",
        "2027-02-08": "8–12 février",
      },
      consentLegend: "À quoi peut servir ton adresse e-mail\u202f?",
      joinPilot: "Inscris-moi au test pilote pendant ces semaines",
      laterEmail:
        "Écris-moi pour de futurs tests ou pour deux ou trois questions de suivi",
      note: "Conservée à part de tes réponses au sondage.",
      send: "Envoyer",
      noThanks: "Non merci",
      errors: {
        emailMissing: "Saisis ton adresse e-mail.",
        emailInvalid: "Ça ne ressemble pas à une adresse e-mail.",
        role: "Indique si tu voudrais vendre, acheter ou les deux.",
        house: "Choisis où tu habites.",
        ticks: "Coche au moins une des deux cases.",
      },
    },
    end: {
      title: "Merci\u202f! Ça nous aide à décider de la suite.",
      resultsTitle: "Les réponses des autres",
      resultsWaiting: (minimum) =>
        `Les résultats apparaissent dès que ${minimum} personnes ont répondu.`,
      resultsLoading: "Chargement des résultats…",
      resultsFailed: "Les résultats n’ont pas pu être chargés.",
      deskTitle: "Deux bureaux\u202f: lequel\u202f?",
      deskOptions: {
        nearer: "Plus proche\u202f: CHF\u00a045, 200\u00a0m",
        cheaper: "Moins cher\u202f: CHF\u00a030, 4\u00a0km",
        neither: "Aucun des deux",
      },
      troubleTitle: "Ce qui a posé le plus de problèmes la dernière fois",
      troubleFinding: "Trouver le bon objet ou quelqu’un qui le voulait",
      ofAnswers: (count, total) => `${count} sur ${total}`,
      shareTitle:
        "Toutes les réponses comptent, même si tu ne vends jamais rien. Tu partages le sondage\u202f?",
      share: "Partager",
      copy: "Copier le lien",
      showQr: "Afficher le code QR",
      hideQr: "Masquer le code QR",
      qrLabel: "Code QR du lien vers le sondage",
      copied: "Lien copié.",
      copyFailed: "Le lien n’a pas pu être copié. Le voici\u202f:",
      shareText: (minutes, link) =>
        `Je viens de répondre sur mon téléphone à un sondage de ${minutes} minutes pour un projet étudiant de l’EPFL. Pas d’inscription\u202f: ${link}`,
    },
  },
};
