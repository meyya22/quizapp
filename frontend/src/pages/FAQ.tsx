import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const SECTIONS: { heading: string; items: FAQItem[] }[] = [
  {
    heading: 'General',
    items: [
      {
        question: 'What is Xam Bridge?',
        answer:
          'Xam Bridge is a free online quiz platform for educators, corporate trainers, and HR teams. You can create quizzes, share them with students or employees via a link, and track results with built-in analytics.',
      },
      {
        question: 'Who is Xam Bridge designed for?',
        answer:
          'Xam Bridge is built for two types of users: Quiz Admins (teachers, trainers, employers who create and share quizzes) and Learners (students, employees, or participants who take quizzes). Both account types are free to sign up.',
      },
      {
        question: 'Do I need to install anything?',
        answer:
          'No. Xam Bridge is fully web-based. It works in any modern browser on desktop or mobile — no app download or installation required.',
      },
    ],
  },
  {
    heading: 'Plans & Pricing',
    items: [
      {
        question: 'Is Xam Bridge really free?',
        answer:
          'Yes. The Free plan is completely free — no credit card required, no time limit. It includes 5 quizzes, 10 questions per quiz, AI question generation, audience management, and 50 quiz responses (lifetime).',
      },
      {
        question: 'What does the Paid plan include?',
        answer:
          'The Paid plan unlocks 50 quizzes, 100 questions per quiz, 25 AI generations per month, 500 contacts, 500 broadcast emails per month, 2,000 quiz responses per month, quiz translation into 6 languages, study mode, CSV import, and advanced analytics.',
      },
      {
        question: 'How much does the Paid plan cost?',
        answer:
          'The Paid plan is available on a monthly or yearly subscription. Visit the Pricing page for current rates.',
      },
      {
        question: 'Can I upgrade or downgrade at any time?',
        answer:
          'Yes. You can upgrade from Free to Paid at any time. If you cancel a Paid subscription, your account reverts to the Free plan at the end of the billing period and your data is preserved.',
      },
    ],
  },
  {
    heading: 'Creating Quizzes',
    items: [
      {
        question: 'What question types does Xam Bridge support?',
        answer:
          'Xam Bridge supports four question types: Multiple Choice (MCQ), Multiple Response (select all that apply), True/False, and Free Text. You can mix types within a single quiz.',
      },
      {
        question: 'Can I generate questions with AI?',
        answer:
          'Yes. Xam Bridge uses Claude AI to generate quiz questions from a topic prompt. Just describe what you want — for example, "5 MCQ questions on photosynthesis for high school students" — and the AI will produce a ready-to-use question set. Free accounts get 3 generations per month; Paid accounts get 25.',
      },
      {
        question: 'Can I add explanations to answers?',
        answer:
          'Yes. Each question supports an optional explanation field. Explanations are shown to participants after they submit their quiz, or in Study Mode as they answer each question.',
      },
      {
        question: 'How do I share a quiz with participants?',
        answer:
          'Every published quiz gets a unique public link. You can copy and share it via email, WhatsApp, or any messaging platform. Participants can take the quiz directly from the link — they just need to create a free Learner account.',
      },
    ],
  },
  {
    heading: 'Languages & Translation',
    items: [
      {
        question: 'Does Xam Bridge support languages other than English?',
        answer:
          'Yes. Xam Bridge supports quiz translation into Hindi (हिन्दी), Bengali (বাংলা), Telugu (తెలుగు), Marathi (मराठी), Tamil (தமிழ்), and Gujarati (ગુજરાતી). This feature is available on the Paid plan.',
      },
      {
        question: 'How does quiz translation work?',
        answer:
          'Participants can choose their preferred language before starting a quiz. The question text, answer options, and explanations are all translated in real time. Quiz creators write quizzes in English and translation is handled automatically.',
      },
    ],
  },
  {
    heading: 'For Learners',
    items: [
      {
        question: 'Is it free to take quizzes as a learner?',
        answer:
          'Yes. Learner accounts are always free, with no limitations. You can take as many quizzes as you are invited to, review your results, and track your history.',
      },
      {
        question: 'What is Study Mode?',
        answer:
          'Study Mode lets you go through a quiz at your own pace without a time constraint. After each question, you see whether your answer was correct and the explanation (if provided). It is ideal for self-study and exam preparation.',
      },
      {
        question: 'Can I review my past quiz attempts?',
        answer:
          'Yes. Your Learner dashboard shows all your past attempts with scores, time taken, pass/fail status, and a full answer review for each attempt.',
      },
    ],
  },
  {
    heading: 'Privacy & Security',
    items: [
      {
        question: 'Is my data secure?',
        answer:
          'Yes. Xam Bridge is hosted on Google Cloud Run with encrypted HTTPS connections. Passwords are hashed and never stored in plain text. We do not sell or share your personal data with third parties.',
      },
      {
        question: 'Can quiz creators see my answers?',
        answer:
          'Quiz admins (your teacher or trainer) can see your submitted answers, score, and time taken for quizzes in their account. This is by design so they can track learning progress.',
      },
    ],
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between text-left py-4 gap-4"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-slate-900 font-medium text-sm">{item.question}</span>
            {open === i
              ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          </button>
          {open === i && (
            <p className="text-slate-600 text-sm pb-4 leading-relaxed">{item.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const schemaFAQ = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SECTIONS.flatMap((s) =>
    s.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    }))
  ),
};

export default function FAQ() {
  return (
    <>
      <Helmet>
        <title>FAQ — Xam Bridge</title>
        <meta
          name="description"
          content="Answers to common questions about Xam Bridge — free quiz creation, AI question generation, multilingual support, plans, and more."
        />
        <meta name="keywords" content="quiz maker FAQ, online quiz questions, Xam Bridge help, AI quiz generation, multilingual quiz, free quiz platform, quiz pricing, quiz for teachers FAQ" />
        <link rel="canonical" href="https://www.xambridge.com/faq" />
        <script type="application/ld+json">{JSON.stringify(schemaFAQ)}</script>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Nav */}
        <nav className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Xam Bridge</span>
            </Link>
            <Link to="/register/admin" className="text-sm text-blue-600 font-semibold hover:underline">
              Get started free
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Frequently Asked Questions</h1>
            <p className="text-slate-500">
              Everything you need to know about Xam Bridge. Can't find your answer?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Contact us
              </Link>.
            </p>
          </div>

          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.heading} className="bg-white rounded-xl border border-slate-200 px-6">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-5 pb-1">
                  {section.heading}
                </h2>
                <FAQAccordion items={section.items} />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-blue-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-xl font-bold mb-2">Ready to get started?</h2>
            <p className="text-blue-200 text-sm mb-5">Free forever — no credit card required.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/register/admin"
                className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors"
              >
                Create Quiz Admin Account
              </Link>
              <Link
                to="/register/learner"
                className="border border-white/40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                Join as Learner
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-100 py-8 px-6 text-center mt-8">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Xam Bridge · <Link to="/" className="hover:text-slate-600">Home</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
