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
import { SceneDirector } from "../device/sceneDirector";
import type { TourScene } from "../device/sceneMessages";
import LanguageSwitch from "../i18n/LanguageSwitch";
import { useTourText } from "../i18n/TourLanguage";
import type { TourText } from "../i18n/en";
import type { TourLook } from "../tourLook";
import { V3_MINUTES } from "../v3/v3Script";
import BackAndForth from "./BackAndForth";
import { HERO_ANSWERS, ILLUSTRATED_SCENES } from "./illustratedScenes";
import PhoneFrame from "./PhoneFrame";
import PitchScene, { type ScenePlay } from "./PitchScene";

/** Channel tag of the study link on this page, so its visitors can be told apart. */
const PITCH_STUDY_LINK = "/tour?s=pitch";
const HOW_ID = "how-it-works";
/** From this width the drawn hero shows its phone frame beside the text; phones show Pako alone. */
const WIDE_SCREEN = "(min-width: 761px)";

type SectionId = keyof TourText["pitch"]["sections"];

const SECTIONS: { id: SectionId; scene: TourScene }[] = [
  { id: "find", scene: "find" },
  { id: "sell", scene: "sell" },
  { id: "agree", scene: "deal" },
];

const PRINCIPLES: {
  id: keyof TourText["pitch"]["principles"];
  Icon: IntroIcon;
}[] = [
  { id: "send", Icon: Send },
  { id: "students", Icon: GraduationCap },
  { id: "prices", Icon: Banknote },
];

function scrollToTour() {
  document
    .getElementById(HOW_ID)
    ?.scrollIntoView({ behavior: motionBehavior(), block: "start" });
}

/** The hero's drawn search ends on the visitor's pick; nothing follows it. */
const NOTHING_FOLLOWS = () => undefined;

/** The search playing in a phone, with Pako beside it following the scene. */
function HeroDevice({ look }: { look: TourLook }) {
  const text = useTourText();
  const [mood, setMood] = useState<PakoMood>("wave");
  const { Scene } = ILLUSTRATED_SCENES.find;
  return (
    <div className="tour-hero-device">
      {look === "app" ? (
        <DeviceFrame
          scene="find"
          label={text.scenes.find.label}
          onMood={setMood}
        />
      ) : (
        <PhoneFrame
          label={text.pitch.exampleScreen(text.pitch.sections.find.title)}
        >
          <Scene
            answers={HERO_ANSWERS}
            onMood={setMood}
            onDone={NOTHING_FOLLOWS}
          />
        </PhoneFrame>
      )}
      <Pako className="tour-hero-pako" mood={mood} size={148} />
    </div>
  );
}

/** A section's example in the chosen look: the app's screens or the intro's drawn scene. */
function SectionFrame({
  look,
  title,
  scene,
  play,
}: {
  look: TourLook;
  title: string;
  scene: TourScene;
  play: ScenePlay;
}) {
  const text = useTourText();
  if (look === "app")
    return (
      <DeviceFrame
        scene={scene}
        label={text.scenes[scene].label}
        replay={play.replay}
        onMood={play.onMood}
        onDone={play.onDone}
      />
    );
  const { Scene, answers } = ILLUSTRATED_SCENES[scene];
  return (
    <PhoneFrame label={text.pitch.exampleScreen(title)}>
      <Scene
        key={play.replay}
        answers={answers}
        onMood={play.onMood}
        onDone={play.onDone}
      />
    </PhoneFrame>
  );
}

/** Pako's part in a deal, drawn: what is tedious without takeover and what he takes over. */
function BackAndForthSection() {
  const words = useTourText().pitch.backAndForth;
  return (
    <PitchScene
      id="back-and-forth"
      title={words.title}
      sentences={words.sentences}
      waitingClass="baf-waiting"
      frame={(play) => (
        <figure className="baf-figure">
          <BackAndForth key={play.replay} onEnd={play.onDone} />
          <figcaption className="sr-only">{words.label}</figcaption>
        </figure>
      )}
    />
  );
}

function Hero({ look }: { look: TourLook }) {
  const { pitch, common } = useTourText();
  const wide = useMediaQuery(WIDE_SCREEN);
  return (
    <header className="tour-hero">
      <div className="tour-page-language">
        <LanguageSwitch />
      </div>
      <div className="tour-hero-text">
        <p className="ob-wordmark">takeover</p>
        <h1 className="ob-title tour-hero-title">{pitch.title}</h1>
        <p className="ob-lead">{pitch.lead}</p>
        <div className="tour-actions">
          <Button className="button primary large" onClick={scrollToTour}>
            {pitch.seeHow}
          </Button>
          <a className="button secondary large" href="/">
            {common.openApp}
          </a>
        </div>
      </div>
      {wide || look === "app" ? (
        <HeroDevice look={look} />
      ) : (
        <div className="tour-hero-screen">
          <Guide mood="wave" layout="hero" burst={<WelcomeBurst />} />
        </div>
      )}
    </header>
  );
}

function Principles() {
  const { pitch } = useTourText();
  return (
    <section className="tour-principles" aria-labelledby="principles-title">
      <h2 id="principles-title" className="tour-section-title">
        {pitch.principlesTitle}
      </h2>
      <ul className="tour-principle-list">
        {PRINCIPLES.map(({ id, Icon }) => (
          <li key={id} className="tour-card tour-principle">
            <span className="tour-principle-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={2} />
            </span>
            <h3 className="tour-principle-title">
              {pitch.principles[id].title}
            </h3>
            <p className="tour-principle-text">{pitch.principles[id].text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StudyInvite() {
  const { invite } = useTourText().pitch;
  return (
    <section className="tour-card tour-invite" aria-labelledby="study-title">
      <h2 id="study-title" className="tour-section-title">
        {invite.title}
      </h2>
      <p className="ob-lead">{invite.text(V3_MINUTES)}</p>
      <a className="button primary large" href={PITCH_STUDY_LINK}>
        {invite.action}
        <ArrowRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}

/** The tour without a channel tag: the pitch, in the look the address asks for. */
export default function Pitch({
  studyOpen,
  look,
}: {
  studyOpen: boolean;
  look: TourLook;
}) {
  const { pitch } = useTourText();
  return (
    <MotionConfig reducedMotion="user">
      <SceneDirector>
        <div className="tour-page">
          <Hero look={look} />
          <main className="tour-main">
            <div id={HOW_ID} className="tour-sections">
              <BackAndForthSection />
              {SECTIONS.map(({ id, scene }) => (
                <PitchScene
                  key={id}
                  id={id}
                  title={pitch.sections[id].title}
                  sentences={pitch.sections[id].sentences}
                  waitingClass={
                    look === "app" ? "tour-device-slot" : "tour-phone-waiting"
                  }
                  frame={(play) => (
                    <SectionFrame
                      look={look}
                      title={pitch.sections[id].title}
                      scene={scene}
                      play={play}
                    />
                  )}
                />
              ))}
            </div>
            <Principles />
            {studyOpen && <StudyInvite />}
          </main>
          <footer className="tour-footer">
            <p>{pitch.footer}</p>
          </footer>
        </div>
      </SceneDirector>
    </MotionConfig>
  );
}
