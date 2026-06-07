import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { BookOpen, FileText, Lock, ChevronDown, ChevronUp, UserCircle, LogOut, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ExamQuiz {
  id: string;
  title: string;
  url: string | null;
  order: number;
}

interface ExamSubCategory {
  id: string;
  name: string;
  order: number;
  quizzes: ExamQuiz[];
}

interface ExamCategory {
  id: string;
  name: string;
  order: number;
  subCategories: ExamSubCategory[];
}

const CATEGORY_COLORS = [
  'bg-[#5c7691] hover:bg-[#1e4470]',
  'bg-[#5c7691] hover:bg-[#1e4470]',
  'bg-[#5c7691] hover:bg-[#1e4470]',
  'bg-[#5c7691] hover:bg-[#1e4470]',
  'bg-[#5c7691] hover:bg-[#1e4470]',
  'bg-[#5c7691] hover:bg-[#1e4470]',
];

const ACTIVE_COLOR = 'bg-[#0f2540]';

export default function AltLandingPage() {
  const { data: categories = [], isLoading } = useQuery<ExamCategory[]>({
    queryKey: ['exam-content-public'],
    queryFn: () => api.get('/exam-content/public').then((r) => r.data),
    staleTime: 60_000,
  });

  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/');
  }

  const { data: purchases = [] } = useQuery<{ examCategoryId: string }[]>({
    queryKey: ['category-purchases'],
    queryFn: () => api.get('/payment/razorpay/purchases').then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (activeCategory !== null || categories.length === 0 || purchases.length === 0) return;
    // purchases are newest-first; default to the first (oldest) purchased category
    for (const p of [...purchases].reverse()) {
      const match = categories.find((c) => c.id === p.examCategoryId);
      if (match) { setActiveCategory(match.id); return; }
    }
  }, [categories, purchases]);
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const activeCat = categories.find((c) => c.id === activeCategory) ?? categories[0] ?? null;

  function toggleSub(id: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      <Helmet>
        <title>Xam Bridge — Free Mock Tests for NEET, UPSC, CUET, SSC, Banking &amp; More</title>
        <meta name="description" content="Practice free mock tests for NEET, UPSC, CUET, SSC CGL, IBPS, RRB, CBSE Class 10 &amp; 12 and more. Detailed solutions, unlimited retakes — start free, no sign-up needed." />
        <meta name="keywords" content="free mock test India, NEET mock test 2025, UPSC mock test, CUET mock test, SSC CGL mock test, IBPS bank PO mock test, RRB NTPC mock test, CBSE mock test, online exam preparation India, competitive exam practice, government exam prep India" />
        <link rel="canonical" href="https://www.xambridge.com/" />
        <meta property="og:title" content="Xam Bridge — Free Mock Tests for NEET, UPSC, CUET, SSC, Banking &amp; More" />
        <meta property="og:description" content="Practice free mock tests for NEET, UPSC, CUET, SSC, Banking, CBSE &amp; more. Detailed solutions, unlimited retakes — start free." />
        <meta property="og:url" content="https://www.xambridge.com/" />
        <meta property="og:image" content="https://www.xambridge.com/og-image.svg" />
        <meta name="twitter:title" content="Xam Bridge — Free Mock Tests for NEET, UPSC, CUET, SSC &amp; More" />
        <meta name="twitter:description" content="Free mock tests for NEET, UPSC, CUET, SSC, Banking, CBSE &amp; more. Detailed solutions — start free." />
      </Helmet>

      <div className="min-h-screen bg-slate-50 font-sans flex flex-col">

        {/* Nav */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
            </Link>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/participant/help"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Help & Support"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </Link>
                <Link
                  to="/participant/account"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                  title={user?.name ?? 'My Account'}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">{user?.name ?? 'Account'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/register/learner" className="text-sm font-semibold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Free Sign Up</Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <div className="bg-[#5c7691] text-white py-3 px-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm sm:text-base font-semibold text-white/80">Practice smarter, score higher</p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">

          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && categories.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Content coming soon</p>
              <p className="text-sm mt-1">Check back shortly — we're loading exam materials.</p>
            </div>
          )}

          {!isLoading && categories.length > 0 && (
            <>
              {/* Category tabs */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat, i) => {
                    const isActive = (activeCategory ? activeCategory === cat.id : i === 0);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all whitespace-nowrap ${
                          isActive
                            ? `${ACTIVE_COLOR} shadow-lg scale-105`
                            : `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} opacity-80`
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop: table layout */}
              {activeCat && (
                <>
                  {/* Desktop view */}
                  <div className="hidden md:block bg-white border-2 border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#5c7691]">
                          <th className="text-left px-6 py-3 text-white font-bold text-sm w-1/4">Subject</th>
                          <th className="text-left px-6 py-3 text-white font-bold text-sm">Available Mock Test</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCat.subCategories.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-6 py-10 text-center text-slate-400 text-sm">
                              No subjects added yet for {activeCat.name}.
                            </td>
                          </tr>
                        )}
                        {activeCat.subCategories.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 align-top">
                              <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">({activeCat.name})</p>
                            </td>
                            <td className="px-6 py-4">
                              {sub.quizzes.length === 0 ? (
                                <span className="text-slate-400 text-xs">No papers added yet</span>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {sub.quizzes.map((quiz, quizIdx) => {
                                    const canAccess = isAuthenticated || quizIdx === 0;
                                    const quizIdFromUrl = quiz.url?.match(/\/quiz\/([^?/#]+)/)?.[1] ?? null;
                                    const isComplimentary = isAuthenticated && user?.tier === 'FREE' && !!quizIdFromUrl && !!user?.complimentaryQuizId && quizIdFromUrl === user.complimentaryQuizId;
                                    if (!canAccess) {
                                      return (
                                        <span key={quiz.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-400 cursor-not-allowed" title="Sign in to access">
                                          <Lock className="w-3 h-3" />
                                          {quiz.title}
                                        </span>
                                      );
                                    }
                                    return quiz.url ? (
                                      <a
                                        key={quiz.id}
                                        href={quiz.url}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                          isComplimentary
                                            ? 'bg-emerald-50 border border-emerald-400 hover:border-emerald-500 hover:bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-50 border border-slate-200 hover:border-violet-400 hover:bg-violet-50 text-slate-700 hover:text-violet-700'
                                        }`}
                                      >
                                        <FileText className="w-3 h-3" />
                                        {quiz.title}
                                      </a>
                                    ) : (
                                      <span
                                        key={quiz.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500"
                                      >
                                        <FileText className="w-3 h-3" />
                                        {quiz.title}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile view: accordion */}
                  <div className="md:hidden space-y-2">
                    {activeCat.subCategories.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
                        No subjects added yet for {activeCat.name}.
                      </div>
                    )}
                    {activeCat.subCategories.map((sub) => {
                      const isOpen = expandedSubs.has(sub.id);
                      return (
                        <div key={sub.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleSub(sub.id)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
                              <p className="text-xs text-slate-400">({activeCat.name})</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-slate-400">{sub.quizzes.length} paper{sub.quizzes.length !== 1 ? 's' : ''}</span>
                              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                              {sub.quizzes.length === 0 ? (
                                <p className="text-xs text-slate-400">No papers added yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {sub.quizzes.map((quiz, quizIdx) => {
                                    const canAccess = isAuthenticated || quizIdx === 0;
                                    const quizIdFromUrl = quiz.url?.match(/\/quiz\/([^?/#]+)/)?.[1] ?? null;
                                    const isComplimentary = isAuthenticated && user?.tier === 'FREE' && !!quizIdFromUrl && !!user?.complimentaryQuizId && quizIdFromUrl === user.complimentaryQuizId;
                                    if (!canAccess) {
                                      return (
                                        <div key={quiz.id} className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-400 cursor-not-allowed" title="Sign in to access">
                                          <Lock className="w-4 h-4 shrink-0" />
                                          <span className="flex-1">{quiz.title}</span>
                                        </div>
                                      );
                                    }
                                    return quiz.url ? (
                                      <a
                                        key={quiz.id}
                                        href={quiz.url}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                          isComplimentary
                                            ? 'bg-emerald-50 border border-emerald-400 hover:border-emerald-500 hover:bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-50 border border-slate-200 hover:border-violet-400 hover:bg-violet-50 text-slate-700 hover:text-violet-700'
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="flex-1">{quiz.title}</span>
                                      </a>
                                    ) : (
                                      <div key={quiz.id} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500">
                                        <FileText className="w-4 h-4 shrink-0" />
                                        {quiz.title}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

        </div>

        {/* Feature highlights */}
        <div className="py-10 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                emoji: '⏱️',
                iconBg: 'bg-teal-50',
                title: 'Real CBT experience',
                desc: 'Full computer-based test simulation with a live timer.',
              },
              {
                emoji: '🌐',
                iconBg: 'bg-amber-50',
                title: 'Multilingual support',
                desc: 'Hindi, Tamil, Bengali, Marathi, Telugu & more.',
              },
              {
                emoji: '💡',
                iconBg: 'bg-yellow-50',
                title: 'Study Mode',
                desc: 'Understand every question with detailed answer explanations.',
              },
              {
                emoji: '📱',
                iconBg: 'bg-blue-50',
                title: 'Web-based & mobile-friendly',
                desc: 'Practice anywhere — nothing to install.',
              },
            ].map(({ emoji, iconBg, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-5 flex items-start gap-4 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                  {emoji}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Xam Bridge</span>
          </div>
          <div className="flex items-center justify-center gap-5 mb-3">
            <a href="https://twitter.com/_topstudent" target="_blank" rel="noopener noreferrer" title="Twitter / X" className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/></svg>
            </a>
            <a href="https://instagram.com/xam.bridge" target="_blank" rel="noopener noreferrer" title="Instagram" className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://t.me/jeeneetexam" target="_blank" rel="noopener noreferrer" title="Telegram" className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a href="https://reddit.com/u/Ok_pick_8431" target="_blank" rel="noopener noreferrer" title="Reddit" className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
            </a>
          </div>
          © {new Date().getFullYear()} Xam Bridge · Empowering learners everywhere
        </footer>
      </div>
    </>
  );
}
