import type { TourText } from "./en";

/**
 * The tour page in French. A narrow no-break space keeps « ? », « ! », « : » and « ; »
 * with their word and pads the inside of « »; a no-break space joins a number to its unit
 * and CHF to its amount.
 */
const helped = {
  question: "Cette fonction t’aurait-elle aidé·e la dernière fois\u202f?",
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
      you: "Début",
      "last-time": "Ton expérience",
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
        `Salut, je suis Pako, l’assistant de takeover, une app où les étudiant·es autour de l’EPFL et de l’UNIL achètent, vendent et donnent des objets d’occasion. Une équipe d’étudiant·es de l’EPFL développe cette app. Avec ce sondage, nous aimerions savoir quelle expérience tu as des objets d’occasion et ce que tu penses de l’app. Ça prend environ ${minutes}\u00a0minutes, et tu n’as pas besoin de compte. Tout le monde peut participer, même si tu n’as jamais rien acheté ni vendu d’occasion.`,
      saveTitle: "Ce que nous enregistrons",
      save: (date) =>
        `Nous enregistrons tes réponses, les écrans que tu consultes, ceux que tu passes et ceux sur lesquels tu reviens, ainsi que le temps passé sur chacun. Nous relevons aussi le lien que tu as suivi, la langue que tu utilises et ton type d’appareil (téléphone ou ordinateur). Ta progression reste dans cet onglet jusqu’à ce que tu le fermes, et ce navigateur se souvient que tu as terminé. Si tu laisses une adresse e-mail à la fin, elle est conservée à part de tes réponses. Tout sera supprimé au plus tard le ${date}.`,
      questions: "Des questions sur le sondage\u202f?",
      go: "Commencer le sondage",
      demo: "Montre-moi juste l’app",
    },
    whatIs: {
      bubble:
        "Avant la première question, voici ce que fait takeover et ce qui t’attend dans ce sondage.",
      title: "Qu’est-ce que takeover\u202f?",
      lead: "Une app pour acheter, vendre et donner des objets d’occasion entre étudiant·es des environs de l’EPFL, de l’UNIL et des résidences FMEL.",
      nextTitle: "Au programme du sondage",
      next: [
        "Ta dernière expérience d’achat, de vente ou de don d’un objet d’occasion",
        "Trois courtes scènes de l’app, puis quelques questions à son sujet",
        "Trois situations du quotidien, où tu choisis ce que tu ferais",
        "Le prix que tu paierais pour l’app et pour la livraison",
      ],
      duration: (minutes) => `Environ ${minutes}\u00a0minutes`,
    },
    parts: {
      label: (current, total) => `Partie ${current} sur ${total}`,
      "last-time": {
        bubble:
          "Cette partie porte sur ta propre expérience avec les objets d’occasion.",
        text: "Nous aimerions en savoir plus sur la dernière fois où tu as voulu acheter, vendre, donner ou récupérer gratuitement un objet d’occasion, même si ça n’a pas marché. Il n’y a ni bonne ni mauvaise réponse.",
      },
      "the-app": {
        bubble: "Cette partie porte sur l’app takeover elle-même.",
        text: "Tu verras trois courtes scènes. Après chacune, nous te demanderons si la fonction présentée te serait utile. Suivent quelques questions sur l’app dans son ensemble, et pour finir tu compareras des slogans.",
      },
      situations: {
        bubble: "Cette partie présente trois situations du quotidien.",
        text: "Imagine-toi dans chaque situation et choisis la réponse qui correspond le mieux à ce que tu ferais. Dans la dernière, tu échanges dans le chat avec une étudiante qui vend un bureau. Suit une question sur l’envoi des messages.",
      },
      price: {
        bubble: "Cette dernière partie porte sur l’argent et la livraison.",
        text: "D’abord, nous te demandons combien tu paierais pour un pack déménagement. Ensuite, tu choisis entre la version gratuite et trois façons de payer, puis nous te posons une question sur la livraison. Tu pourrais toujours chercher, publier une annonce et envoyer des messages gratuitement, avec un peu d’aide de Pako chaque jour.",
      },
    },
    scenes: {
      find: {
        title: "Trouver quelque chose",
        text: "Un·e étudiant·e près du Vortex cherche un bureau et décrit ce qu’il lui faut. Pako cherche parmi les annonces des étudiant·es à proximité et prépare une offre. Rien ne part tant que l’étudiant·e n’appuie pas sur «\u202fEnvoyer\u202f».",
      },
      sell: {
        title: "Vendre avec une photo",
        text: "Léa prend son bureau en photo. Pako rédige l’annonce et propose un prix. Léa fixe elle-même son prix et enregistre l’annonce.",
      },
      deal: {
        title: "Organiser le retrait d’un objet",
        text: "Noah propose CHF\u00a035 pour le bureau et Léa accepte\u202f: le rendez-vous est fixé. Au moment du retrait, tous les deux confirment la remise de l’objet.",
      },
    },
    situations: {
      label: (current, total) => `Situation ${current} sur ${total}`,
      pickOne: "Choisis la réponse qui te correspond le mieux.",
      "move-it":
        "Tu as trouvé dans l’app un bureau qui te plaît. La personne qui le vend habite à 4\u00a0km de chez toi.",
      desk: "Il te faut un bureau, et l’app t’en montre deux qui te conviendraient. C’est le même modèle, dans le même état\u202f; seuls le prix et la distance changent.",
      draft:
        "Tu veux acheter un bureau à Mia, une autre étudiante. Le prix et le lieu de retrait te conviennent.",
      draftTask:
        "Réponds d’abord à Mia dans le chat. Pako rédige ensuite une offre pour toi, et c’est toi qui décides ce que tu en fais.",
    },
    steps: {
      "wanted-react": {
        question: "Comment réagirais-tu à cette demande\u202f?",
        options: {
          snap: "Prendre une photo et publier mon annonce",
          look: "Jeter un œil, peut-être plus tard",
          ignore: "L’ignorer",
          "rather-not": "Je préfère ne pas voir ce genre de demandes",
        },
      },
      "wanted-share": {
        question:
          "Partagerais-tu une demande avec les étudiant·es près de chez toi\u202f? Seuls l’objet recherché et ton quartier seraient visibles, jamais ton nom.",
        options: { yes: "Oui", maybe: "Peut-être", no: "Non" },
      },
      "last-cost": {
        question:
          "Combien as-tu dépensé environ pour transporter l’objet\u202f?",
        options: {
          nothing: "Rien",
          "under-10": "Moins de CHF\u00a010",
          "10-30": "CHF\u00a010–30",
          "over-30": "Plus de CHF\u00a030",
          "dont-remember": "Je ne m’en souviens pas",
        },
      },
      "pay-model": {
        question: "Si tu payais toi-même, que choisirais-tu\u202f?",
        options: {
          free: "Version gratuite",
          "seller-fee": "Commission par vente",
          "move-pack": "Pack déménagement",
          monthly: "Abonnement mensuel",
          "not-sure": "Je ne sais pas",
        },
      },
      "institution-pay": {
        question:
          "Utiliserais-tu davantage takeover si ton université ou ta résidence payait pour toi\u202f?",
        options: {
          yes: "Oui",
          "no-difference": "Ça ne changerait rien",
          "not-sure": "Je ne sais pas",
        },
      },
      "delivery-worth": {
        question:
          "Combien paierais-tu au maximum pour qu’on t’apporte un objet encombrant jusqu’à ta porte à Lausanne (environ 5\u00a0km)\u202f?",
        options: {
          nothing: "Rien, j’irais le chercher moi-même",
          "up-to-5": "Jusqu’à CHF\u00a05",
          "6-10": "CHF\u00a06–10",
          "11-20": "CHF\u00a011–20",
          "over-20": "Plus de CHF\u00a020",
          "not-sure": "Je ne sais pas",
        },
      },
      who: {
        question: "Es-tu étudiant·e\u202f?",
        options: {
          epfl: "Oui, à l’EPFL",
          unil: "Oui, à l’UNIL",
          "other-school": "Oui, dans une autre école",
          no: "Non",
        },
      },
      "last-role": {
        question:
          "Repense à ta dernière expérience avec un objet d’occasion. Que voulais-tu faire\u202f?",
        options: {
          buying: "Acheter quelque chose",
          "getting-free": "Récupérer quelque chose gratuitement",
          selling: "Vendre quelque chose",
          "giving-away": "Donner quelque chose",
          none: "Je n’ai jamais essayé",
        },
      },
      "last-item": {
        question:
          "De quel type d’objet d’occasion s’agissait-il la dernière fois\u202f?",
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
        question:
          "Était-ce lié à ton arrivée dans un logement ou à ton départ\u202f?",
        options: {
          "moving-in": "Oui, j’emménageais",
          "moving-out": "Oui, je quittais mon logement",
          "no-move": "Non",
          "cant-recall": "Je ne m’en souviens pas",
        },
      },
      "last-trouble": {
        question:
          "Qu’est-ce qui t’a semblé le plus difficile la dernière fois\u202f?",
        options: {
          finding: "Trouver le bon objet",
          listing: "Rédiger l’annonce ou prendre les photos",
          price: "Connaître le bon prix ou se mettre d’accord dessus",
          replies: "Des réponses tardives ou absentes",
          timing: "Fixer une heure, ou un rendez-vous tombé à l’eau",
          transport: "Transporter l’objet d’un endroit à l’autre",
          trust:
            "Ne pas savoir si je pouvais faire confiance à l’autre personne",
          nothing: "Rien n’a été difficile",
          other: "Autre chose",
          "cant-recall": "Je ne m’en souviens pas",
        },
      },
      "why-not": {
        question:
          "Quelle est la raison principale pour laquelle tu n’as jamais rien acheté, vendu ni donné d’occasion\u202f?",
        options: {
          "no-need": "Je n’en ai jamais eu besoin",
          "prefer-new": "Je préfère les objets neufs",
          hassle: "Ça avait l’air trop contraignant",
          "dont-know-where": "Je ne savais pas où chercher",
          other: "Autre chose",
        },
      },
      move: {
        question: "Prévois-tu de quitter ton logement actuel\u202f?",
        options: {
          "move-feb": "Oui, d’ici fin février 2027",
          "move-jun": "Oui, entre mars et juin 2027",
          "move-later": "Oui, plus tard",
          "no-plan": "Non, je ne prévois pas de déménager",
          "not-sure": "Je ne sais pas encore",
        },
      },
      housing: {
        question: "Où habites-tu en ce moment\u202f?",
        options: {
          fmel: "Dans une résidence FMEL",
          "other-res": "Dans une autre résidence étudiante",
          flat: "Dans un appartement ou un studio",
          family: "En famille",
          elsewhere: "Ailleurs",
        },
      },
      headline: {
        question:
          "Quel slogan te donnerait le plus envie d’ouvrir l’app takeover\u202f?",
        options: {
          "h-move": "«\u202fVends tes affaires avant de déménager.\u202f»",
          "h-photo":
            "«\u202fPrends une photo et obtiens une annonce prête à publier avec un prix juste.\u202f»",
          "h-ai":
            "«\u202fUn assistant IA rédige ton annonce à partir d’une photo.\u202f»",
          "h-nearby":
            "«\u202fTrouve des objets d’occasion chez des gens du coin, à récupérer sur le campus.\u202f»",
          none: "Aucun de ces slogans",
        },
      },
      "helped-find": helped,
      "helped-sell": helped,
      "helped-deal": helped,
      stop: {
        question:
          "Qu’est-ce qui pourrait t’empêcher d’utiliser takeover\u202f? Tu peux choisir plusieurs réponses.",
        options: {
          "ai-mistakes": "L’IA pourrait faire des erreurs",
          "nobody-nearby": "Trop peu de gens l’utilisent près de chez moi",
          "prefer-groups": "Je préfère mes groupes WhatsApp ou Telegram",
          privacy: "Des craintes pour ma vie privée",
          "too-long": "Ça prend trop de temps",
          nothing: "Rien ne m’en empêcherait",
          other: "Autre chose",
        },
      },
      sending: {
        question:
          "Laisserais-tu Pako envoyer des messages sans te demander ton accord\u202f?",
        options: {
          myself: "Non, j’enverrais chaque message moi-même",
          "short-updates":
            "Seulement de courts messages comme «\u202fJe suis en route\u202f»",
          "replies-too": "De courts messages et des réponses simples",
          "not-sure": "Je ne sais pas",
        },
      },
      "move-it": {
        question: "Comment ramènerais-tu le bureau chez toi\u202f?",
        options: {
          "carry-bike": "Le porter ou le transporter à vélo",
          "public-transport": "Prendre les transports publics",
          "friend-car":
            "Emprunter une voiture ou demander à un·e ami·e qui en a une",
          helper:
            "Faire appel à quelqu’un via l’app pour le transporter à vélo-cargo\u202f: CHF\u00a015 pour tout le trajet jusqu’à 4\u00a0km, livraison jusqu’à ta porte (rez-de-chaussée ou ascenseur\u202f; supplément possible pour les escaliers)",
          "skip-desk": "Chercher plutôt un bureau plus près de chez moi",
          "not-sure": "Je ne sais pas",
        },
      },
      desk: {
        question: "Lequel des deux bureaux choisirais-tu\u202f?",
        options: {
          nearer: "CHF\u00a045",
          cheaper: "CHF\u00a030",
          neither: "Aucun des deux",
        },
      },
      "scene-pick": {
        question: "Quelle scène aimerais-tu voir en premier\u202f?",
        options: {
          sell: "Vendre à partir d’une photo",
          deal: "Organiser le retrait d’un objet",
          find: "Trouver quelque chose",
        },
      },
      "try-first": {
        question:
          "Quelle fonction essaierais-tu en premier lors de ton prochain achat ou de ta prochaine vente\u202f?",
        options: {
          "describe-search":
            "Décrire ce que je cherche pour trouver des annonces",
          "photo-listing":
            "Créer une annonce à partir de photos, avec un prix proposé et ses sources",
          "offer-drafts": "Modifier et envoyer un brouillon d’offre",
          "pickup-card":
            "Utiliser la fiche de retrait pour les confirmations et les rappels",
          none: "Aucune de ces fonctions",
          "need-more": "J’aurais d’abord besoin d’en savoir plus",
        },
      },
      age: {
        question: "Quel âge as-tu\u202f?",
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
        question: "Quel est ton genre\u202f?",
        options: {
          woman: "Femme",
          man: "Homme",
          "non-binary": "Non binaire",
          "self-describe": "Je préfère me décrire moi-même",
          na: "Je préfère ne pas répondre",
        },
      },
      level: {
        question: "Quel diplôme prépares-tu\u202f?",
        options: {
          bachelor: "Bachelor",
          master: "Master",
          phd: "Doctorat",
          other: "Autres études",
          "not-student": "Je ne suis pas étudiant·e",
        },
      },
      exchange: {
        question: "Es-tu étudiant·e en échange\u202f?",
        options: { yes: "Oui", no: "Non", na: "Je préfère ne pas répondre" },
      },
    },
    helpedNeverTried:
      "Cette fonction t’aiderait-elle si tu voulais acheter ou vendre quelque chose d’occasion\u202f?",
    findingBySeller: "Trouver quelqu’un qui voulait l’objet",
    moveIntro: "Ensuite, deux questions sur ton logement actuel.",
    lampIntro:
      "Imagine que tu as une lampe de bureau dont tu n’as plus besoin.",
    packLadder: {
      bubble: "D’abord, une façon de payer\u202f: un pack déménagement.",
      title: "Pack déménagement",
      price: (price) => `CHF\u00a0${price}, paiement unique`,
      text: "Rédiger tes annonces toi-même reste gratuit. Le pack ajoute cinq brouillons d’annonce supplémentaires à partir de tes photos, avec vérification du prix, valables 30\u00a0jours.",
      question: (price) =>
        `Paierais-tu CHF\u00a0${price} de ta poche pour ce pack lors de ton prochain déménagement\u202f?`,
      options: { yes: "Oui", no: "Non", "not-sure": "Je ne sais pas" },
    },
    plans: {
      free: {
        price: "CHF\u00a00",
        detail:
          "Tu continues avec la version gratuite, avec un peu d’aide de Pako chaque jour.",
        benefits: ["Rien à payer", "Recherche, annonces et messages inclus"],
      },
      "seller-fee": {
        price: "5\u00a0% quand un objet se vend",
        detail:
          "La personne qui vend l’objet paie la commission uniquement si la vente aboutit.",
        benefits: [
          "Publier une annonce et acheter restent gratuits",
          "Rien à payer si rien ne se vend",
        ],
      },
      "move-pack": {
        price: "CHF\u00a05, paiement unique",
        detail:
          "Cinq brouillons d’annonce supplémentaires à partir de photos, avec vérification du prix, valables 30\u00a0jours.",
        benefits: [
          "Pas d’abonnement",
          "Pensé pour les semaines autour d’un déménagement",
        ],
      },
      monthly: {
        price: "CHF\u00a03 par mois",
        detail: "Aide illimitée de Pako, l’assistant de l’app.",
        benefits: [
          "Autant de brouillons et de vérifications de prix que tu veux",
          "Couvre aussi les achats et les ventes fréquents",
        ],
      },
    },
    lastStory: {
      question:
        "Comment s’est passée ta dernière expérience avec un objet d’occasion\u202f? Une phrase suffit.",
      label: "Ta phrase",
      placeholder: "Facultatif, quelques mots suffisent",
    },
    wantedCard: {
      idea: "Une idée pour l’app",
      explanation:
        "Chaque étudiant·e peut partager ce qu’il lui faut. Les autres étudiant·es à proximité voient la demande, mais jamais le nom de la personne qui la publie.",
      label:
        "Exemple de demande dans l’app, avec un bouton «\u202fJ’en ai une\u202f»",
      text: "Quelqu’un près du Vortex cherche une lampe de bureau. Tu en as une qui traîne\u202f?",
      button: "J’en ai une",
    },
    whoSendsCard: {
      title: "Comment fonctionne l’app",
      sentence:
        "Pako, l’assistant de l’app, prépare tes messages. Rien ne part tant que tu n’appuies pas sur «\u202fEnvoyer\u202f».",
    },
    helperMissing:
      "Remarque\u202f: ce service de transport n’existe pas encore.",
    packMissing: "Remarque\u202f: ce pack n’existe pas encore.",
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
      intro:
        "Mia te demande quand tu pourrais venir chercher le bureau. Choisis un jour dans le chat ci-dessous.",
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
      offerReady: "J’ai rédigé une offre pour toi.",
      offer: (day, price) =>
        `Salut Mia\u202f! J’aimerais ton bureau blanc pour CHF\u00a0${price}. Je peux venir le chercher ${day.toLowerCase()} à 17\u00a0h\u00a030 au Rolex Learning Center.`,
      offerTitle: "Brouillon d’offre",
      question: "Que ferais-tu de ce brouillon\u202f?",
      sendAsIs: "L’envoyer tel quel",
      change: "Modifier quelque chose d’abord",
      own: "Écrire mon propre message",
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
        "Pour finir, quelques questions facultatives sur toi. Elles nous aident à comprendre qui a participé.",
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
        "Envie de savoir quand takeover sera en ligne, de l’essayer en avant-première ou de participer à un futur sondage\u202f?",
      email: "Adresse e-mail",
      ticksLegend: "Qu’est-ce qui t’intéresse\u202f?",
      ticks: {
        launchNews: "Préviens-moi quand takeover sera en ligne",
        tryEarly: "J’aimerais essayer takeover en avant-première",
        futureSurveys: "Invite-moi à de futurs sondages",
      },
      role: "Voudrais-tu vendre, acheter ou les deux\u202f?",
      roles: { seller: "Vendre", buyer: "Acheter", both: "Les deux" },
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
      note: "Nous conservons ton adresse e-mail séparément de tes réponses au sondage.",
      send: "Envoyer",
      noThanks: "Non merci",
      errors: {
        emailMissing: "Saisis ton adresse e-mail.",
        emailInvalid: "Ça ne ressemble pas à une adresse e-mail.",
        ticks: "Coche au moins une case.",
        role: "Indique si tu voudrais vendre, acheter ou les deux.",
        place: "Choisis où tu habites.",
      },
    },
    end: {
      title:
        "Merci\u202f! Tes réponses nous aident à décider ce que nous allons développer ensuite.",
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
      troubleTitle: "Ce qui a été le plus difficile la dernière fois",
      troubleFinding: "Trouver le bon objet ou quelqu’un qui le voulait",
      ofAnswers: (count, total) => `${count} sur ${total}`,
      shareTitle:
        "Chaque réponse compte, y compris celles des personnes qui ne vendent jamais rien. Partagerais-tu le sondage\u202f?",
      share: "Partager",
      copy: "Copier le lien",
      showQr: "Afficher le code QR",
      hideQr: "Masquer le code QR",
      qrLabel: "Code QR du lien vers le sondage",
      copied: "Lien copié.",
      copyFailed: "Le lien n’a pas pu être copié. Le voici\u202f:",
      shareText: (minutes, link) =>
        `Je viens de répondre sur mon téléphone à un sondage de ${minutes}\u00a0minutes pour un projet étudiant de l’EPFL. Pas d’inscription\u202f: ${link}`,
    },
  },
};
