import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BookOpen, Check, X, Zap, Crown, Users, BarChart3, Mail,
  Brain, Globe, Upload, ShieldCheck, Star, ArrowRight, Sparkles,
  GraduationCap, ChevronRight,
} from 'lucide-react';

const FREE_FEATURES = [
  { label: '5 quizzes', ok: true },
  { label: '10 questions per quiz', ok: true },
  { label: '3 AI generations / month', ok: true },
  { label: '10 contacts', ok: true },
  { label: '50 emails / month', ok: true },
  { label: '50 quiz responses (lifetime)', ok: true },
  { label: 'CSV import', ok: false },
  { label: 'Quiz translation', ok: false },
  { label: 'Study mode', ok: false },
  { label: 'Advanced analytics', ok: false },
];

const PAID_FEATURES = [
  { label: '50 quizzes', ok: true },
  { label: '100 questions per quiz', ok: true },
  { label: '25 AI generations / month', ok: true },
  { label: '500 contacts', ok: true },
  { label: '500 emails / month', ok: true },
  { label: '2,000 quiz responses / month', ok: true },
  { label: 'Custom email composer', ok: true },
  { label: 'CSV / Excel import', ok: true },
  { label: 'Quiz translation (6 languages)', ok: true },
  { label: 'Study mode for participants', ok: true },
  { label: 'Advanced analytics & reports', ok: true },
];

const HOW_IT_WORKS = [
  {
    icon: BookOpen,
    title: 'Create your quiz',
    desc: 'Build quizzes with multiple question types  - MCQ, True/False, Free Text, or let AI generate them for you.',
  },
  {
    icon: Mail,
    title: 'Invite participants',
    desc: 'Share a link or email your contact list directly. No sign-up required for learners to take a quiz.',
  },
  {
    icon: BarChart3,
    title: 'Track results',
    desc: 'Review detailed reports, scores, and responses. See who passed and where learners struggled.',
  },
];

const HIGHLIGHTS = [
  { icon: Brain, label: 'AI Question Generator', desc: 'Describe a topic and let Claude AI draft questions for you.' },
  { icon: Globe, label: 'Multi-language Quizzes', desc: 'Translate quizzes into 6 languages with one click.' },
  { icon: Upload, label: 'CSV / Excel Import', desc: 'Bulk-import questions from spreadsheets in seconds.' },
  { icon: Users, label: 'Audience Management', desc: 'Maintain contact lists and broadcast quizzes by email.' },
  { icon: BarChart3, label: 'Rich Analytics', desc: 'Score distributions, pass rates, and per-question insights.' },
  { icon: ShieldCheck, label: 'Secure & Private', desc: 'Your data is yours. No ads, no tracking, no nonsense.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <>
    <Helmet>
      <title>Xam Bridge  - Free Online Quiz Maker for Teachers &amp; Trainers</title>
      <meta name="description" content="Create quizzes for your students or team in minutes. AI-powered question generation, multilingual support (Hindi, Tamil, Bengali &amp; more), analytics, and free to start. No credit card required." />
      <link rel="canonical" href="https://www.xambridge.com/" />
      <meta property="og:title" content="Xam Bridge  - Free Online Quiz Maker for Teachers &amp; Trainers" />
      <meta property="og:description" content="Create quizzes for your students or team in minutes. AI-powered question generation, multilingual support, and free to start." />
      <meta property="og:url" content="https://www.xambridge.com/" />
      <meta property="og:image" content="https://www.xambridge.com/og-image.svg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.xambridge.com/og-image.svg" />
    </Helmet>
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* â"€â"€ Nav â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Xam Bridge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register/admin"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* â"€â"€ Hero â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="pt-32 pb-20 px-6 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-3xl mx-auto">
          {/* Free learner badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <GraduationCap className="w-4 h-4" />
            100% Free for every learner, at any age
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-5">
            Build, share&nbsp;&amp;&nbsp;track<br />
            <span className="text-blue-600">quizzes that matter</span>
          </h1>

          <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto">
            Xam Bridge is a modern quiz platform for educators, trainers, and teams.
            Create engaging assessments in minutes, invite learners with a single link,
            and gain instant insights  - no experience needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register/admin"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-md shadow-blue-100"
            >
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => navigate('/payment')}
              className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors text-base"
            >
              <Crown className="w-4 h-4 text-amber-500" /> See Paid Plan
            </button>
          </div>
        </div>
      </section>

      {/* â"€â"€ Learner Callout â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-10 bg-emerald-600 text-white text-center px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Star className="w-5 h-5 text-emerald-200" />
            <span className="text-xl font-bold">Learners always take quizzes for free</span>
            <Star className="w-5 h-5 text-emerald-200" />
          </div>
          <p className="text-emerald-100 text-sm mb-5">
            Just sign up to take a quiz. Students, employees, and curious minds of any age
            can jump in instantly with a shared link. Knowledge has no price.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register/learner"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors shadow text-sm"
            >
              Sign Up as Learner <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register/admin"
              className="inline-flex items-center gap-2 bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-900 transition-colors shadow text-sm"
            >
              Sign Up as Teacher / Admin <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* â"€â"€ How it works â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Step {i + 1}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â"€â"€ Feature highlights â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything you need to teach &amp; assess</h2>
            <p className="text-slate-500">Powerful tools for educators, trainers, and teams  - built to be simple.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HIGHLIGHTS.map((h) => (
              <div key={h.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <h.icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{h.label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â"€â"€ Pricing / Plan comparison â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-20 px-6 bg-white" id="pricing">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simple, honest pricing</h2>
            <p className="text-slate-500">Start free. Upgrade when you need more power.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Free Plan */}
            <div className="rounded-2xl border border-slate-200 p-7">
              <div className="mb-5">
                <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">Free Plan</div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">$0</span>
                  <span className="text-slate-400 mb-1.5">/ forever</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">Perfect for individuals getting started.</p>
              </div>
              <ul className="space-y-2.5 mb-7">
                {FREE_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    {f.ok
                      ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <X className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                    <span className={f.ok ? 'text-slate-700' : 'text-slate-400'}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register/admin"
                className="flex items-center justify-center gap-2 w-full border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Get Started Free <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Paid Plan */}
            <div className="rounded-2xl border-2 border-blue-600 p-7 relative shadow-lg shadow-blue-50">
              <div className="absolute -top-3 right-5 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Paid Plan</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-extrabold text-slate-900">$5</span>
                  <span className="text-slate-400 mb-1.5">/ month</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-0.5">or $50/year  - save 16%</p>
                <p className="text-sm text-slate-500 mt-2">For educators and teams who want full power.</p>
              </div>
              <ul className="space-y-2.5 mb-7">
                {PAID_FEATURES.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700">{f.label}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/payment')}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
              >
                <Zap className="w-4 h-4" /> Subscribe  - $5/month
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            <ShieldCheck className="w-3.5 h-3.5 inline-block mr-1" />
            Secure checkout via Stripe &nbsp;Â·&nbsp; Cancel anytime &nbsp;Â·&nbsp; No hidden fees
          </p>
        </div>
      </section>

      {/* â"€â"€ AI callout strip â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-16 px-6 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-violet-200" />
            <span className="text-2xl font-bold">AI-powered question generation</span>
          </div>
          <p className="text-blue-100 mb-6">
            Type a topic  - "Grade 5 Science", "JavaScript Basics", "Food Safety"  - and Claude AI
            drafts up to 10 ready-to-use questions with options and explanations in seconds.
          </p>
          <Link
            to="/register/admin"
            className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors shadow"
          >
            Try it free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* â"€â"€ Final CTA â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-3">Ready to bridge the knowledge gap?</h2>
          <p className="text-slate-500 mb-8">
            Join quiz creators who use Xam Bridge to educate, assess, and inspire  - for free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register/admin"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-md shadow-blue-100"
            >
              Create free admin account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-white transition-colors text-base"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* â"€â"€ Footer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <footer className="bg-white border-t border-slate-100 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-slate-800">Xam Bridge</span>
        </div>
        <p className="text-xs text-slate-400">
          Â© {new Date().getFullYear()} Xam Bridge Â· Empowering learners everywhere, free of charge.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
          <Link to="/login" className="hover:text-slate-700 transition-colors">Sign In</Link>
          <Link to="/register/admin" className="hover:text-slate-700 transition-colors">Register</Link>
          <Link to="/payment" className="hover:text-slate-700 transition-colors">Pricing</Link>
          <Link to="/faq" className="hover:text-slate-700 transition-colors">FAQ</Link>
        </div>
      </footer>

    </div>
    </>
  );
}

