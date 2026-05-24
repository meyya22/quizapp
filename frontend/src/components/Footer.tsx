import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full text-center py-3 px-4 text-[10px] text-slate-400 border-t border-slate-100 bg-white/50 flex items-center justify-center gap-3 flex-wrap">
      <span>2026 — This app is built using an AI platform and is guided and supervised by a human developer</span>
      <span className="text-slate-300">·</span>
      <Link to="/about" className="hover:text-slate-600 transition-colors underline underline-offset-2">
        About Us
      </Link>
      <span className="text-slate-300">·</span>
      <Link to="/privacy" className="hover:text-slate-600 transition-colors underline underline-offset-2">
        Privacy Policy
      </Link>
    </footer>
  );
}
