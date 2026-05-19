import { useNavigate } from 'react-router-dom';
import { XCircle, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-9 h-9 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Checkout cancelled</h2>
        <p className="text-slate-500 mb-8 text-sm">No charges were made. You can upgrade whenever you're ready.</p>
        <div className="flex flex-col gap-3">
          <Button className="w-full justify-center" size="lg" onClick={() => navigate('/payment')}>
            Try Again
          </Button>
          <button
            onClick={() => navigate('/admin')}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
