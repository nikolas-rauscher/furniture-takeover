import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ArrowRight, Banknote, GraduationCap, Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Guide from "@/components/onboarding/Guide";
import Pako from "@/components/onboarding/Pako";
import WelcomeBurst from "@/components/onboarding/WelcomeBurst";
import type { IntroIcon } from "@/components/onboarding/onboardingIcons";
import type { PakoMood } from "@/components/onboarding/storyTypes";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { motionBehavior } from "../../uiMotion";
import DeviceFrame from "../device/DeviceFrame";
import type { TourScene } from "../device/sceneMessages";
import { SCENE_COPY } from "../sceneCopy";
import BackAndForth from "./BackAndForth";
import { BACK_AND_FORTH_LABEL } from "./backAndForthScript";
import PitchScene, { type ScenePlay } from "./PitchScene";

/** Channel tag of the study link on this page, so its visitors can be told apart. */
const PITCH_STUDY_LINK = "/tour?s=pitch";
const HOW_ID = "how-it-works";
/** From this width the hero shows the app in a phone frame beside the text. */
const WIDE_SCREEN = "(min-width: 761px)";

type TourSection = {
  id: string;
  title: string;
  sentences: [string, string];
  scene: TourScene;
};

const SECTIONS: TourSection[] = [
  {
    id: "find",
    title: "Find",
    sentences: [
      "Write what you need in your own words, like a message to a friend.",
      "Pako checks student listings near you and shows what fits and what to check.",
    ],
    scene: "find",
  },
  {
    id: "sell",
    title: "Sell",
    sentences: [
      "Start with a photo of the item.",
      "Pako drafts the listing and a price from similar offers, and you check it before you publish.",
    ],
    scene: "sell",
  },
  {
    id: "agree",
    title: "Agree and pick up",
    sentences: [
      "Pako reads replies and suggests what to say. You choose what to send.",
      "A deal needs both students to confirm, and then the pickup is booked.",
    ],
    scene: "deal",
  },
];

const PRINCIPLES: { title: string; text: string; Icon: IntroIcon }[] = [
  {
    title: "Nothing is sent without your tap",
    text: "Pako drafts messages and offers. You decide what goes out.",
    Icon: Send,
  },
  {
    title: "For EPFL and UNIL students",
    text: "Accounts need an @epfl.ch or @unil.ch address.",
    Icon: GraduationCap,
  },
  {
    title: "Prices with their sources",
    text: "A suggested price shows the offers it is based on.",
    Icon: Banknote,
  },
];

function scrollToTour() {
  document
    .getElementById(HOW_ID)
    ?.scrollIntoView({ behavior: motionBehavior(), block: "start" });
}

/** The search scene playing in a phone, with Pako beside it following the scene. */
function HeroDevice() {
  const [mood, setMood] = useState<PakoMood>("wave");
  return (
    <div className="tour-hero-device">
      <DeviceFrame
        scene="find"
        label={SCENE_COPY.find.label}
        onMood={setMood}
      />
      <Pako className="tour-hero-pako" mood={mood} size={148} />
    </div>
  );
}

/** A section's example: the app's own screens in a phone. */
function SectionFrame({
  section,
  play,
}: {
  section: TourSection;
  play: ScenePlay;
}) {
  const { scene } = section;
  return (
    <DeviceFrame
      scene={scene}
      label={SCENE_COPY[scene].label}
      replay={play.replay}
      onMood={play.onMood}
      onDone={play.onDone}
    />
  );
}

/** Pako's part in a deal, drawn: what is tedious without takeover and what he takes over. */
function BackAndForthSection() {
  return (
    <PitchScene
      id="back-and-forth"
      title="Pako handles the back-and-forth"
      sentences={[
        "Without takeover, one desk means posts in many places, many messages and a pickup to arrange.",
        "Pako sorts the listings and drafts the offer. Your tap sends it, both of you confirm, and updates on the day are one tap.",
      ]}
      waitingClass="baf-waiting"
      frame={(play) => (
        <figure className="baf-figure">
          <BackAndForth key={play.replay} onEnd={play.onDone} />
          <figcaption className="sr-only">{BACK_AND_FORTH_LABEL}</figcaption>
        </figure>
      )}
    />
  );
}

function Hero() {
  const wide = useMediaQuery(WIDE_SCREEN);
  return (
    <header className="tour-hero">
      <div className="tour-hero-text">
        <p className="ob-wordmark">takeover</p>
        <h1 className="ob-title tour-hero-title">
          Second-hand finds from students.
        </h1>
        <p className="ob-lead">
          Pako helps you find items, write listings and agree on a pickup with
          students around EPFL, UNIL and the FMEL residences. You decide what
          gets sent.
        </p>
        <div className="tour-actions">
          <Button className="button primary large" onClick={scrollToTour}>
            See how it works
          </Button>
          <a className="button secondary large" href="/">
            Open takeover
          </a>
        </div>
      </div>
      {wide ? (
        <HeroDevice />
      ) : (
        <div className="tour-hero-screen">
          <Guide mood="wave" layout="hero" burst={<WelcomeBurst />} />
        </div>
      )}
    </header>
  );
}

function Principles() {
  return (
    <section className="tour-principles" aria-labelledby="principles-title">
      <h2 id="principles-title" className="tour-section-title">
        What stays true
      </h2>
      <ul className="tour-principle-list">
        {PRINCIPLES.map(({ title, text, Icon }) => (
          <li key={title} className="tour-card tour-principle">
            <span className="tour-principle-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2} />
            </span>
            <h3 className="tour-principle-title">{title}</h3>
            <p className="tour-principle-text">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudyInvite() {
  return (
    <section className="tour-card tour-invite" aria-labelledby="study-title">
      <h2 id="study-title" className="tour-section-title">
        Help us decide what to build next
      </h2>
      <p className="ob-lead">
        Pako asks about the last time you bought or sold something second-hand
        and shows two short situations. It takes about 4 minutes.
      </p>
      <a className="button primary large" href={PITCH_STUDY_LINK}>
        Take part
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}

/** The tour without a channel tag: the pitch. */
export default function Pitch({ studyOpen }: { studyOpen: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="tour-page">
        <Hero />
        <main className="tour-main">
          <div id={HOW_ID} className="tour-sections">
            <BackAndForthSection />
            {SECTIONS.map((section) => (
              <PitchScene
                key={section.id}
                id={section.id}
                title={section.title}
                sentences={section.sentences}
                waitingClass="tour-device-slot"
                frame={(play) => <SectionFrame section={section} play={play} />}
              />
            ))}
          </div>
          <Principles />
          {studyOpen && <StudyInvite />}
        </main>
        <footer className="tour-footer">
          <p>takeover is a student project of the course CS-500 at EPFL.</p>
        </footer>
      </div>
    </MotionConfig>
  );
}
