import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { HelpCircle, Mail, Send, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import api from '../services/api';

interface EnquiryForm {
  name: string;
  type: string;
  location: string;
  email: string;
  phone: string;
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
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-blue-600" /> Help & Support
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Get help with your account, billing, or any other questions.</p>
      </div>

      {/* FAQ callout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Looking for quick answers?</p>
            <p className="text-xs text-slate-500 mt-0.5">Check our FAQ — it covers plans, AI generation, languages, and more.</p>
          </div>
        </div>
        <Link
          to="/faq"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          View FAQ
        </Link>
      </div>

      {/* Contact info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-blue-900">Contact Us</h2>
        <p className="text-sm text-blue-800 leading-relaxed">
          For any technical issues, billing, payment, cancellation, or other enquiries, please reach out to our support team:
        </p>
        <a
          href="mailto:cs.admin@xambridge.com"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
        >
          <Mail className="w-4 h-4" />
          cs.admin@xambridge.com
        </a>
        <div className="pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-700 font-medium mb-1">We can help with:</p>
          <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
            <li>Technical issues & troubleshooting</li>
            <li>Billing & payment queries</li>
            <li>Subscription cancellation</li>
            <li>Account management</li>
            <li>General product questions</li>
          </ul>
        </div>
      </div>

      {/* Contact form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">General Enquiry</h2>
        <p className="text-sm text-slate-500 mb-6">Fill in the form below and we'll get back to you as soon as possible.</p>

        {submitStatus === 'success' && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Enquiry sent successfully!</p>
              <p className="text-xs text-emerald-700 mt-0.5">We'll get back to you at the email you provided.</p>
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
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Your full name"
                {...register('name', { required: 'Name is required' })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Business or Individual */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business or Individual</label>
              <select
                {...register('type')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select —</option>
                <option value="Individual">Individual</option>
                <option value="Business">Business</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="City, Country"
                {...register('location')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
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

            {/* Phone */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 234 567 8900"
                {...register('phone')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Message */}
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
              rows={6}
              placeholder="Please describe your enquiry in detail..."
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
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Sending...' : 'Send Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
}
