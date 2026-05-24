import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const EFFECTIVE_DATE = 'May 24, 2026';
const CONTACT_EMAIL = 'app.admin@xambridge.com';
const APP_URL = 'https://www.xambridge.com';

const SECTIONS: Section[] = [
  {
    id: 'overview',
    title: '1. Overview',
    content: (
      <p>
        Xam Bridge ("we", "us", or "our") operates the website at <strong>{APP_URL}</strong> and the Xam Bridge platform, including XamGeni. This Privacy Policy explains what personal information we collect, how we use it, and your rights in relation to it. By using our platform you agree to the practices described in this policy. If you have any questions, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'information-we-collect',
    title: '2. Information We Collect',
    content: (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Account information</h3>
          <p>When you register, we collect your name, email address, and a hashed password (or, if you sign in with Google, your Google profile information). We also record your role (Quiz Admin or Learner) and, optionally, your country and city.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Usage data</h3>
          <p>We collect information about how you interact with the platform: quizzes created, quiz attempts, scores, time taken, and AI quiz generation activity. This data is linked to your account and used to power your dashboard and our analytics.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Payment information</h3>
          <p>Paid subscriptions are processed by Stripe. We do not store your full card number, CVV, or bank details. We receive and store only non-sensitive billing information provided by Stripe (e.g. plan type, subscription status, last four digits of your card).</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Support enquiries</h3>
          <p>When you contact us via the Help & Support form, we collect your name, email address, and the content of your message so we can respond to you.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Technical data</h3>
          <p>Our hosting infrastructure (Google Cloud Run) may log standard server-side information such as IP addresses, browser type, request timestamps, and referring URLs. These logs are used for security monitoring and are retained for a short period.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'how-we-use',
    title: '3. How We Use Your Information',
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>To create and manage your account and authenticate your sessions.</li>
        <li>To provide, operate, and improve the Xam Bridge platform and XamGeni features.</li>
        <li>To process subscription payments via Stripe.</li>
        <li>To generate AI-powered quizzes on your behalf using Anthropic's API (your topic input is sent to the AI; no personal profile data is shared with the AI).</li>
        <li>To send transactional emails such as password resets and subscription receipts.</li>
        <li>To send platform update or promotional communications to registered users (you can opt out at any time by contacting <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>).</li>
        <li>To respond to your support enquiries.</li>
        <li>To detect and prevent fraud, abuse, or security incidents.</li>
        <li>To comply with legal obligations.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: '4. How We Share Your Information',
    content: (
      <div className="space-y-4">
        <p>We do not sell your personal data. We share information only in the following limited circumstances:</p>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Service providers</h3>
          <p>We use trusted third-party services to operate the platform — including Google Cloud (hosting and infrastructure), Stripe (payments), Anthropic (AI quiz generation), and our SMTP provider (transactional email). These providers process data only as needed to deliver their services and are bound by appropriate data protection agreements.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Quiz Admins and Learners</h3>
          <p>When a Learner takes a quiz created by a Quiz Admin, the Admin can see the Learner's name, email, score, and attempt details in their Reports dashboard. Learners are made aware of this when they register.</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 mb-1">Legal requirements</h3>
          <p>We may disclose your information if required by law, regulation, or valid legal process (e.g. a court order or government request).</p>
        </div>
      </div>
    ),
  },
  {
    id: 'cookies',
    title: '5. Cookies and Local Storage',
    content: (
      <p>
        Xam Bridge uses browser <strong>localStorage</strong> to store your authentication token and session preferences on your device. We do not use tracking or advertising cookies. If you clear your browser storage, you will be signed out of your session. Third-party services we embed (such as Stripe's payment widget) may set their own cookies governed by their respective privacy policies.
      </p>
    ),
  },
  {
    id: 'retention',
    title: '6. Data Retention',
    content: (
      <p>
        We retain your account data for as long as your account is active. If you delete your account, we remove your personal information from our live database within 30 days. Some anonymised or aggregated data may be retained for analytics purposes indefinitely. Payment records may be retained longer where required by financial regulations. To request account deletion, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'rights',
    title: '7. Your Rights',
    content: (
      <div className="space-y-3">
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data (you can update your name and profile via Account Settings).</li>
          <li><strong>Delete</strong> your account and personal data.</li>
          <li><strong>Object</strong> to or restrict certain processing activities.</li>
          <li><strong>Data portability</strong> — request a copy of your data in a structured, machine-readable format.</li>
          <li><strong>Withdraw consent</strong> for marketing communications at any time.</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
      </div>
    ),
  },
  {
    id: 'security',
    title: '8. Security',
    content: (
      <p>
        We take reasonable technical and organisational measures to protect your data — including encrypted data transmission (HTTPS/TLS), hashed password storage, and access controls on our infrastructure. No system is 100% secure; if you believe your account has been compromised, contact us immediately at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'children',
    title: "9. Children's Privacy",
    content: (
      <p>
        Xam Bridge is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a> and we will delete the information promptly.
      </p>
    ),
  },
  {
    id: 'changes',
    title: '10. Changes to This Policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. For material changes, we will notify registered users by email. Continued use of the platform after changes are posted constitutes acceptance of the updated policy. If you have questions about any changes, contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    id: 'contact',
    title: '11. Contact Us',
    content: (
      <div className="space-y-2">
        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please reach out:</p>
        <div className="mt-3 inline-block bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-1">
          <p className="font-semibold text-slate-800">Xam Bridge</p>
          <p className="text-sm text-slate-600">{APP_URL}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-blue-600 hover:underline">{CONTACT_EMAIL}</a>
        </div>
      </div>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-sm text-slate-500 mt-1">Last updated: {EFFECTIVE_DATE}</p>
          </div>
        </div>

        {/* Table of contents */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Contents</p>
          <ol className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="bg-white border border-slate-200 rounded-xl p-6 scroll-mt-6"
            >
              <h2 className="text-base font-bold text-slate-900 mb-4">{s.title}</h2>
              <div className="text-sm text-slate-600 leading-relaxed">{s.content}</div>
            </section>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10">
          &copy; {new Date().getFullYear()} Xam Bridge &middot; <Link to="/about" className="hover:text-slate-600 underline underline-offset-2">About Us</Link>
        </p>
      </div>
    </div>
  );
}
