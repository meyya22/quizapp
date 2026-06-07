import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { HelpCircle, Mail, Send, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import api from '../services/api';

interface EnquiryForm {
  name: string;
  email: string;
  message: string;
}

export default function HelpSupport() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [charCount, setCharCount] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryForm>();

  async function onSubmit(data: EnquiryForm) {
    try {
      setSubmitStatus('idle');
      await api.post('/support/enquiry', data);
      setSubmitStatus('success');
      reset();
      setCharCount(0);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to send. Please try again.');
      setSubmitStatus('error');
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" /> Help &amp; Support
        </h1>
        <p className="text-slate-500 mt-1 text-sm">We're here to help. Check our FAQ or send us a message below.</p>
      </div>

      {/* Contact info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
        <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Email Support</p>
          <p className="text-xs text-blue-700 mt-0.5 mb-2">For account issues, payment queries, or anything else:</p>
          <a
            href="mailto:cs.admin@xambridge.com"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors"
          >
            cs.admin@xambridge.com
          </a>
        </div>
      </div>

      {/* FAQ callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Looking for quick answers?</p>
            <p className="text-xs text-slate-500 mt-0.5">Our FAQ covers mock tests, payments, accounts, and more.</p>
          </div>
        </div>
        <Link
          to="/faq"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          View FAQ
        </Link>
      </div>

      {/* Contact form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Send a Message</h2>
        <p className="text-sm text-slate-500 mb-5">We'll get back to you as soon as possible.</p>

        {submitStatus === 'success' && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Message sent!</p>
              <p className="text-xs text-emerald-700 mt-0.5">We'll reply to the email you provided.</p>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Your name"
                {...register('name', { required: 'Name is required' })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Message <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${charCount > 900 ? 'text-amber-600' : 'text-slate-400'}`}>
                {charCount} / 1000
              </span>
            </div>
            <textarea
              rows={5}
              placeholder="How can we help you?"
              {...register('message', {
                required: 'Message is required',
                maxLength: { value: 1000, message: 'Message must be 1000 characters or less' },
                onChange: (e) => setCharCount(e.target.value.length),
              })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
