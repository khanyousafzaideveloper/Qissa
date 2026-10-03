import React from 'react';
import { Logo, Button, Card, SectionBadge, FloatingDecor } from './ui';
import { MountainScene, VillageScene, BazaarScene, EidScene, StarTwinkle } from './Illustrations';
import { Sparkles, BookOpen, Globe, Mic, ShieldCheck, MapPin, Heart, Star, Download, Moon, School, Settings as SettingsIcon } from 'lucide-react';

interface LandingProps {
  onCreate: () => void;
  onParentMode: () => void;
  onMyStories: () => void;
  onSettings: () => void;
}

const FEATURES = [
  { icon: Globe, title: 'Urdu, Pashto & English', desc: 'Every story comes alive in three languages with beautiful bilingual reading mode.', color: 'sky2' },
  { icon: Mic, title: 'Read-Along Narration', desc: 'Words light up as the story is read aloud, helping your child read with confidence.', color: 'sky2' },
  { icon: Sparkles, title: 'What Happens Next?', desc: 'Your child chooses the path — every story becomes their own unique adventure.', color: 'rose2' },
  { icon: Star, title: 'Mini Quiz & Star Rewards', desc: 'A gentle 2-3 question quiz at the end celebrates learning with shining stars.', color: 'amber2' },
  { icon: Download, title: 'Download as PDF', desc: 'Keep forever! Save your child\'s story as a beautiful PDF picture book.', color: 'emerald2' },
  { icon: ShieldCheck, title: '100% Safe & Private', desc: 'We never collect children\'s photos. Just a name and an avatar — nothing more.', color: 'rose2' },
];

const SETTINGS_PREVIEW = [
  { label: 'Peshawar Bazaar', emoji: '🕌', Scene: BazaarScene },
  { label: 'Swat Valley', emoji: '🏔️', Scene: MountainScene },
  { label: 'Punjabi Village', emoji: '🏡', Scene: VillageScene },
  { label: 'Eid Celebration', emoji: '🌙', Scene: EidScene },
];

const PARENT_TOPICS = [
  { icon: Moon, title: 'Fear of the Dark', desc: 'A gentle story about a brave child who discovers the night is full of friends.' },
  { icon: School, title: 'Starting New School', desc: 'Turn first-day jitters into excitement with a story about courage and new friends.' },
  { icon: Heart, title: 'Learning to Share', desc: 'A warm tale about the joy that comes from sharing with others.' },
  { icon: ShieldCheck, title: 'Dealing with Unkindness', desc: 'Stories that build resilience and teach kind, strong responses.' },
];

export const Landing: React.FC<LandingProps> = ({ onCreate, onParentMode, onMyStories, onSettings }) => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky2-200 via-sky2-100 to-sky2-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky2-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="hidden md:flex items-center gap-6 text-sm font-bold text-gray-600">
            <a href="#how" className="hover:text-sky2-600 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-sky2-600 transition-colors">Features</a>
            <a href="#places" className="hover:text-sky2-600 transition-colors">Places</a>
            <a href="#parent" className="hover:text-sky2-600 transition-colors">Parent Mode</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSettings} aria-label="Settings" className="rounded-full bg-sky2-50 p-2.5 text-sky2-700 ring-2 ring-sky2-100 transition-colors hover:bg-sky2-100">
              <SettingsIcon className="w-4 h-4" />
            </button>
            <Button size="sm" variant="ghost" onClick={onMyStories} icon={<BookOpen className="w-4 h-4" />}><span className="hidden sm:inline">My Stories</span></Button>
            <Button size="sm" onClick={onCreate} icon={<Sparkles className="w-4 h-4" />}><span className="hidden sm:inline">Create Story</span></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky2-300 via-sky2-200 to-sky2-50 px-4 pt-16 pb-24">
        <FloatingDecor />
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="relative z-10 animate-fade-up">
              <SectionBadge>
                <Sparkles className="w-4 h-4" /> AI Storytelling for Kids
              </SectionBadge>
              <h1 className="mt-6 text-5xl font-extrabold leading-tight text-sky2-900 md:text-6xl">
                Stories Where
                <span className="block bg-gradient-to-r from-sky2-500 via-sky2-600 to-sky2-700 bg-clip-text text-transparent">
                  Your Child Is the Hero
                </span>
              </h1>
              <p className="mt-6 text-lg text-sky2-900/80 md:text-xl">
                Qissa creates magical, personalized picture books in <strong>Urdu</strong>, <strong>Pashto</strong>, and <strong>English</strong>. Set up your hero once, then just pick a place and a lesson — and your child becomes the hero of a brand-new adventure.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button size="lg" onClick={onCreate} icon={<Sparkles className="w-5 h-5" />}>
                  Create Your Story
                </Button>
                <Button size="lg" variant="ghost" onClick={onParentMode} icon={<Heart className="w-5 h-5" />}>
                  Parent Purpose Mode
                </Button>
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald2-600" /> No photos collected</span>
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-sky2-600" /> 3 languages</span>
              </div>
            </div>

            {/* Hero illustration card */}
            <div className="relative animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative rounded-[2rem] bg-white p-3 shadow-2xl shadow-sky2-300/50 ring-1 ring-sky2-100">
                <div className="overflow-hidden rounded-[1.5rem]">
                  <MountainScene className="w-full h-64" />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <div className="rounded-2xl bg-sky2-400 px-4 py-2 text-white font-bold shadow-lg text-sm">Urdu</div>
                  <div className="rounded-2xl bg-sky2-500 px-4 py-2 text-white font-bold shadow-lg text-sm">English</div>
                  <div className="rounded-2xl bg-emerald2-500 px-4 py-2 text-white font-bold shadow-lg text-sm">Pashto</div>
                </div>
              </div>
              {/* floating cards */}
              <div className="absolute -top-6 -left-4 animate-float rounded-2xl bg-white p-3 shadow-xl ring-1 ring-sky2-100">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber2-400 fill-amber2-400" />
                  <span className="text-sm font-bold text-gray-700">3 Stars!</span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-4 animate-float-slow rounded-2xl bg-white p-3 shadow-xl ring-1 ring-rose2-100">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-sky2-500" />
                  <span className="text-sm font-bold text-gray-700">Read-along</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <SectionBadge color="sky2"><BookOpen className="w-4 h-4" /> Simple & Fun</SectionBadge>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-800">How Qissa Works</h2>
            <p className="mt-3 text-lg text-gray-600">Three magical steps to a story your child will treasure.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { num: '1', title: 'Meet Your Hero', desc: 'Set a name, a cute avatar, and your language once — Urdu, Pashto, or English.', icon: Sparkles, color: 'sky2' },
              { num: '2', title: 'Pick Your Adventure', desc: 'Select a setting — Peshawar bazaar, Swat valley, a village, or Eid night — and a lesson to learn.', icon: MapPin, color: 'emerald2' },
              { num: '3', title: 'Read & Play', desc: 'Enjoy the illustrated story with narration, make choices, and earn star rewards in the quiz!', icon: Star, color: 'rose2' },
            ].map((step, i) => (
              <Card key={i} className="relative p-8 text-center">
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-2xl bg-${step.color}-500 text-2xl font-extrabold text-white shadow-lg`}>
                  {step.num}
                </div>
                <step.icon className={`mx-auto mt-4 w-10 h-10 text-${step.color}-500`} />
                <h3 className="mt-4 text-xl font-bold text-gray-800">{step.title}</h3>
                <p className="mt-2 text-gray-600">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <SectionBadge color="rose2"><Heart className="w-4 h-4" /> Made With Love</SectionBadge>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-800">Everything Qissa Does</h2>
            <p className="mt-3 text-lg text-gray-600">A complete storytelling experience designed for young minds.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Card key={i} className="group p-6">
                <div className={`inline-flex rounded-2xl bg-${f.color}-100 p-3`}>
                  <f.icon className={`w-7 h-7 text-${f.color}-600`} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-800">{f.title}</h3>
                <p className="mt-2 text-gray-600">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pakistani Settings */}
      <section id="places" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <SectionBadge color="emerald2"><MapPin className="w-4 h-4" /> Familiar & Cultural</SectionBadge>
            <h2 className="mt-4 text-4xl font-extrabold text-gray-800">Stories From Home</h2>
            <p className="mt-3 text-lg text-gray-600">Adventures set in the places and celebrations your child knows and loves.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SETTINGS_PREVIEW.map((s, i) => (
              <Card key={i} className="overflow-hidden group">
                <div className="relative h-40 overflow-hidden">
                  <s.Scene className="w-full h-full transition-transform duration-500 group-hover:scale-110" />
                  <span className="absolute bottom-2 left-2 text-3xl">{s.emoji}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800">{s.label}</h3>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Parent Purpose Mode */}
      <section id="parent" className="bg-gradient-to-br from-sky2-500 via-sky2-600 to-sky2-700 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm">
                <Heart className="w-4 h-4" /> For Parents
              </span>
              <h2 className="mt-4 text-4xl font-extrabold">Parent Purpose Mode</h2>
              <p className="mt-4 text-lg text-sky2-100">
                Sometimes a story can help with a big feeling. Choose a purpose — like fear of the dark, starting a new school, or learning to share — and Qissa will weave a gentle, encouraging tale around it.
              </p>
              <Button variant="white" size="lg" className="mt-6" onClick={onParentMode} icon={<Sparkles className="w-5 h-5" />}>
                Try Parent Mode
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {PARENT_TOPICS.map((t, i) => (
                <div key={i} className="rounded-2xl bg-white/15 p-5 backdrop-blur-sm ring-1 ring-white/20 transition-all hover:bg-white/25">
                  <t.icon className="w-8 h-8 text-white" />
                  <h3 className="mt-3 font-bold text-white">{t.title}</h3>
                  <p className="mt-1 text-sm text-sky2-100">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-6 p-8 text-center md:flex-row md:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-emerald2-100">
                <ShieldCheck className="w-8 h-8 text-emerald2-600" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-gray-800">We never collect children's photos.</h3>
                <p className="mt-2 text-gray-600">
                  Your child's privacy is sacred. Qissa only uses a first name and a fun cartoon avatar — no photos, no personal data, no tracking. Stories are created in the moment and saved only if you choose to download them.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="relative rounded-[2rem] bg-gradient-to-br from-sky2-400 via-sky2-500 to-sky2-600 p-12 shadow-2xl">
            <FloatingDecor />
            <StarTwinkle className="absolute top-6 left-8 animate-twinkle" size={28} />
            <StarTwinkle className="absolute top-10 right-10 animate-twinkle" size={20} style={{ animationDelay: '1s' } as React.CSSProperties} />
            <StarTwinkle className="absolute bottom-8 left-12 animate-twinkle" size={18} color="#fff" style={{ animationDelay: '2s' } as React.CSSProperties} />
            <h2 className="relative text-4xl font-extrabold text-white text-shadow-soft md:text-5xl">Ready for Magic?</h2>
            <p className="relative mt-4 text-lg text-white/90">Create a personalized story for your child in minutes.</p>
            <Button variant="white" size="lg" className="relative mt-6" onClick={onCreate} icon={<Sparkles className="w-5 h-5" />}>
              Create Your Story Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sky2-900 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo />
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <a href="#how" className="hover:text-sky2-400 transition-colors">How It Works</a>
              <a href="#features" className="hover:text-sky2-400 transition-colors">Features</a>
              <a href="#parent" className="hover:text-sky2-400 transition-colors">Parent Mode</a>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald2-400" /> Child-safe</span>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-6 text-center text-sm text-gray-500">
            <p>Made with <Heart className="inline w-4 h-4 text-rose2-500" /> for children everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
