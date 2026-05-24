import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Layers, Database, Code2, BarChart3, FlaskConical } from 'lucide-react';

const DOMAINS = [
  { icon: Code2, label: 'Software Development', desc: 'Full-stack application design and delivery across enterprise and product environments' },
  { icon: Database, label: 'Data Engineering', desc: 'Data pipelines, warehousing, ETL architecture, and large-scale data platform builds' },
  { icon: BarChart3, label: 'Data Analytics', desc: 'Business intelligence, reporting systems, and insights-driven decision support' },
  { icon: Layers, label: 'IT & Systems', desc: 'Enterprise IT strategy, infrastructure, and cross-domain technical leadership' },
  { icon: FlaskConical, label: 'Chemical Engineering', desc: 'Foundation discipline — Annamalai University, India, Class of 1997' },
];

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Header band */}
          <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600" />

          {/* Avatar + name */}
          <div className="px-8 pb-8">
            <div className="-mt-12 mb-5 flex items-end gap-5">
              <img
                src="/about_avatar.png"
                alt="Developer avatar"
                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover bg-slate-100"
              />
              <div className="pb-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700 mb-1.5">
                  Founder & Developer
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Xam Bridge</h1>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed mb-8">
              <p>
                I'm a Chemical Engineer from <span className="font-medium text-slate-800">Annamalai University, India</span> (Class of 1997) who found a deeper calling in software. What started as curiosity about technology turned into a 25-year career spanning the full breadth of the IT industry.
              </p>
              <p>
                Over those years I've worked across software development, data engineering, data analytics, and enterprise IT — building systems, leading teams, and shipping products in domains that range from manufacturing to finance to education technology.
              </p>
              <p>
                Xam Bridge was born from a simple belief: that creating and taking quizzes should be effortless for anyone — teachers, trainers, students, or self-learners. I built it as a solo developer, applying everything I've learned across two and a half decades in the industry.
              </p>
            </div>

            {/* Domain expertise */}
            <div className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Background & Expertise</h2>
              <div className="space-y-3">
                {DOMAINS.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Get in Touch</h2>
              <p className="text-sm text-slate-600 mb-3">
                Have a feature idea, partnership enquiry, or just want to say hello? I'd love to hear from you.
              </p>
              <a
                href="mailto:appdeveloper@xambridge.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                appdeveloper@xambridge.com
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} Xam Bridge &middot; Built with passion by a developer who still remembers thermodynamics.
        </p>
      </div>
    </div>
  );
}
