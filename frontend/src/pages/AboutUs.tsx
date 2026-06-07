import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react';

const OFFICIAL_SITES = [
  { exam: 'CBSE', url: 'https://www.cbse.gov.in' },
  { exam: 'NEET', url: 'https://neet.nta.nic.in' },
  { exam: 'CUET', url: 'https://cuet.nta.nic.in' },
  { exam: 'JEE Main', url: 'https://jeemain.nta.nic.in' },
  { exam: 'UPSC', url: 'https://www.upsc.gov.in' },
  { exam: 'Bank Exams (IBPS)', url: 'https://www.ibps.in' },
  { exam: 'RRB NTPC', url: 'https://www.indianrailways.gov.in', note: 'Regional RRB sites: rrbcdg.gov.in, rrbchennai.gov.in, etc.' },
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

        {/* About card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

          {/* Header band */}
          <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-600" />

          <div className="px-8 pb-8">
            {/* Avatar + name */}
            <div className="-mt-10 mb-5 flex items-end gap-4">
              <img
                src="/about_avatar.png"
                alt="Developer avatar"
                className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-slate-100"
              />
              <div className="pb-1">
                <div className="inline-flex items-center px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700 mb-1">
                  Founder & Developer
                </div>
                <h1 className="text-lg font-bold text-slate-900">Xam Bridge</h1>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              XamBridge is a solo-built quiz platform designed to make exam preparation simple and effective.
              Built by a software and data professional with 25+ years of industry experience, the app covers
              major Indian competitive exams — NEET, JEE, CUET, UPSC, CBSE, Bank Exams, and more.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              We leverage AI agents to curate and moderate questions based on the board or governing body's
              syllabus, eliminating irrelevant or low-quality content, while providing students with a
              realistic, timed CBT experience.
            </p>

            {/* Contact */}
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                Got questions or partnership ideas? Drop us an email —{' '}
                <a
                  href="mailto:contact@xambridge.com"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  contact@xambridge.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer card */}
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Disclaimer</h2>
            </div>

            <div className="space-y-3 text-sm text-slate-600 leading-relaxed mb-6">
              <p>
                <span className="font-semibold text-slate-800">"XamBridge"</span> does not represent a government entity.
                This app is not affiliated with, endorsed by, or authorized by any government agency or department.
              </p>
              <p>
                All information provided is for informational purposes only. Users are encouraged to verify all data
                with official government sources directly.
              </p>
            </div>

            {/* Official websites table */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Official Exam Websites</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-2/5">Exam</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Official Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {OFFICIAL_SITES.map(({ exam, url, note }) => (
                    <tr key={exam} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 align-top">{exam}</td>
                      <td className="px-4 py-3 align-top">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          {url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} Xam Bridge &middot; Independent platform for exam preparation.
        </p>
      </div>
    </div>
  );
}
