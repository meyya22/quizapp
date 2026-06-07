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
    heading: 'About Xam Bridge',
    items: [
      {
        question: 'What is Xam Bridge?',
        answer:
          'Xam Bridge is a free exam preparation platform offering mock tests for NEET, UPSC, CUET, SSC, Banking, CBSE and more. Students can practise with real-style questions, review answers with explanations, and track their progress. The platform also includes XamGeni — an AI tool that generates personalised practice quizzes on any topic.',
      },
      {
        question: 'Who is Xam Bridge for?',
        answer:
          'Xam Bridge is for students preparing for competitive and board exams in India — including NEET, UPSC, CUET, SSC CGL, IBPS, RRB, CBSE Class 10 & 12, and more. It is also used by educators and corporate trainers who create and share quizzes for their students or teams.',
      },
      {
        question: 'Is Xam Bridge free to use?',
        answer:
          'Yes. You can access a set of free mock tests without signing up. Creating a free learner account gives you access to AI-generated practice quizzes (XamGeni) and lets you save your progress. Full access to all mock test papers for a specific exam category can be unlocked for a one-time payment of ₹299 per category.',
      },
      {
        question: 'Do I need to install anything?',
        answer:
          'No. Xam Bridge is fully web-based and works in any modern browser on desktop or mobile. No app download or installation is required.',
      },
    ],
  },
  {
    heading: 'Mock Tests & Exam Prep',
    items: [
      {
        question: 'Which exams are covered?',
        answer:
          'Xam Bridge currently covers CBSE Class 10, CBSE Class 12, NEET, UPSC, CUET, SSC CGL, IBPS Bank PO, and more categories are being added regularly. Check the Exam Prep Hub on the homepage to see the latest available categories and subjects.',
      },
      {
        question: 'How many free mock tests can I access without paying?',
        answer:
          'You can access the first few questions of any mock test without signing up. When you sign in with a free account, you get access to 3 questions per paper. To unlock full papers (all questions) for a category, a one-time payment of ₹299 applies.',
      },
      {
        question: 'How do I unlock full mock test papers?',
        answer:
          'Sign in (or register free), then go to the Unlock Exams page. Choose the exam category you want, and pay ₹299 one-time via Razorpay. Once the payment is confirmed, all mock test papers in that category are immediately unlocked for your account — no expiry.',
      },
      {
        question: 'How long does my access last after paying?',
        answer:
          'Your access is permanent — it is a one-time payment with no subscription or renewal. New papers added to the category in the future are also automatically available to you.',
      },
      {
        question: 'Can I retake a mock test?',
        answer:
          'Yes. You can retake each mock test paper up to 10 times. This allows you to practise until you are confident without any time pressure.',
      },
      {
        question: 'Are explanations provided for answers?',
        answer:
          'Yes. After submitting a mock test, you can review each question with the correct answer and a detailed explanation to understand where you went wrong and why.',
      },
    ],
  },
  {
    heading: 'XamGeni — AI Quiz Prep',
    items: [
      {
        question: 'What is XamGeni?',
        answer:
          'XamGeni is Xam Bridge\'s AI-powered quiz generator. Type any topic — for example "NEET Biology: Cell Division" or "UPSC Polity: Fundamental Rights" — and XamGeni instantly creates a personalised practice quiz. No sign-up needed for a 5-question preview; free accounts get 5 AI quiz slots per month.',
      },
      {
        question: 'Is XamGeni free to use?',
        answer:
          'Yes. You can try XamGeni without signing up (5 free preview questions). With a free learner account you get 5 AI quiz generations per month. Upgraded plans offer 35+ monthly slots, harder difficulty levels, and up to 15 questions per quiz.',
      },
      {
        question: 'What subjects can XamGeni cover?',
        answer:
          'XamGeni can generate quiz questions on virtually any topic — NEET Biology, Chemistry, and Physics; UPSC History, Polity, and Economy; CUET subjects; SSC Reasoning and English; Banking Quant; CBSE subjects; and general knowledge. If you can name a topic, XamGeni can quiz you on it.',
      },
      {
        question: 'Can I translate XamGeni quizzes into Indian languages?',
        answer:
          'Yes. On upgraded plans, you can translate your AI quiz into Hindi, Bengali, Telugu, Marathi, Tamil, and Gujarati — useful if you prefer to study in your regional language.',
      },
    ],
  },
  {
    heading: 'Payments & Pricing',
    items: [
      {
        question: 'What is the pricing for full mock test access?',
        answer:
          'Each exam category is ₹299 — a one-time payment. There are no monthly fees or renewals. Pay once and access all papers in that category forever.',
      },
      {
        question: 'Which payment methods are accepted?',
        answer:
          'Payments are processed securely via Razorpay, which supports UPI, net banking, credit/debit cards, and popular wallets like Paytm and PhonePe.',
      },
      {
        question: 'Is my payment information safe?',
        answer:
          'Yes. We use Razorpay for all payments. Xam Bridge does not store your card number, UPI ID, or bank details. Razorpay is PCI-DSS compliant and widely used across India.',
      },
      {
        question: 'What if my payment fails or I do not get access?',
        answer:
          'If payment is deducted but access is not granted within a few minutes, please contact us at app.admin@xambridge.com with your registered email and payment reference. We will resolve it promptly.',
      },
    ],
  },
  {
    heading: 'For Educators & Quiz Creators',
    items: [
      {
        question: 'Can I create my own quizzes for students?',
        answer:
          'Yes. Register a free Quiz Admin account to create quizzes, organise them by category, share a link with students, and view detailed attempt reports and analytics.',
      },
      {
        question: 'What question types are supported for custom quizzes?',
        answer:
          'Custom quizzes support Multiple Choice (MCQ), Multiple Response (select all that apply), True/False, and Free Text questions. You can mix types within a single quiz.',
      },
      {
        question: 'Can I use AI to generate quiz questions for my students?',
        answer:
          'Yes. The Quiz Admin account includes AI question generation via XamGeni. Describe the topic and question style, and the AI generates a ready-to-use question set for your quiz.',
      },
    ],
  },
  {
    heading: 'Privacy & Security',
    items: [
      {
        question: 'Is my data secure?',
        answer:
          'Yes. Xam Bridge is hosted on Google Cloud Run with HTTPS encryption. Passwords are hashed and never stored in plain text. We do not sell your personal data to third parties.',
      },
      {
        question: 'Do you track anonymous visitors?',
        answer:
          'We record anonymised usage events — such as when an anonymous visitor clicks "Unlock Full Paper" — to understand how students engage with our platform. This includes approximate city/country (derived from IP address) and device type. No personal identity is collected for anonymous visitors.',
      },
      {
        question: 'Can quiz creators see my answers?',
        answer:
          'If you take a quiz shared by an educator or trainer, that admin can see your submitted answers, score, and time taken for the purpose of tracking your learning progress. Mock test results on the Xam Bridge exam prep platform are private to you.',
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
        <title>FAQ — Xam Bridge Mock Tests &amp; Exam Prep</title>
        <meta
          name="description"
          content="Frequently asked questions about Xam Bridge — free mock tests for NEET, UPSC, CUET, SSC, Banking, CBSE, XamGeni AI quiz prep, pricing, and account help."
        />
        <meta name="keywords" content="Xam Bridge FAQ, mock test help, NEET mock test questions, UPSC exam prep FAQ, CUET mock test, unlock exams Razorpay, XamGeni AI quiz, free exam preparation India" />
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
            <Link to="/unlock-exams" className="text-sm text-blue-600 font-semibold hover:underline">
              Unlock Mock Tests
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Frequently Asked Questions</h1>
            <p className="text-slate-500">
              Everything you need to know about Xam Bridge mock tests and exam prep. Can't find your answer?{' '}
              <a href="mailto:app.admin@xambridge.com" className="text-blue-600 hover:underline font-medium">
                Contact us
              </a>.
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
            <h2 className="text-xl font-bold mb-2">Start practising for free</h2>
            <p className="text-blue-200 text-sm mb-5">Free mock tests available — no sign-up needed to begin.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                to="/"
                className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors"
              >
                Browse Mock Tests
              </Link>
              <Link
                to="/register/learner"
                className="border border-white/40 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-100 py-8 px-6 text-center mt-8">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-3 flex-wrap">
            <span>© {new Date().getFullYear()} Xam Bridge</span>
            <Link to="/" className="hover:text-slate-600 underline underline-offset-2">Home</Link>
            <Link to="/privacy" className="hover:text-slate-600 underline underline-offset-2">Privacy Policy</Link>
            <Link to="/about" className="hover:text-slate-600 underline underline-offset-2">About Us</Link>
          </p>
        </footer>
      </div>
    </>
  );
}
