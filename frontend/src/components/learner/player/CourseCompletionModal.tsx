/**
 * Shown when the course reaches 100% completion.
 * Congratulates the learner and offers certificate download + back to learning.
 */

import { useEffect, useState } from 'react';
import { Award, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CERTIFICATE_QUERY_KEYS } from '@/queries/admin/useCertificateQueries';

interface CourseCompletionModalProps {
  courseTitle: string;
  enrollmentId: number;
}

export const CourseCompletionModal = ({
  courseTitle,
  enrollmentId,
}: CourseCompletionModalProps) => {
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Invalidate My Certificates so the list refreshes when the learner
  // navigates there — the backend issues the certificate asynchronously
  // via signal, so we give it a short delay before invalidating.
  useEffect(() => {
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({
        queryKey: CERTIFICATE_QUERY_KEYS.myCertificates.list(),
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white border border-gray-200 rounded-xl w-full max-w-md mx-4 p-8 text-center">
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-5">
          <Award className="h-7 w-7 text-amber-500" />
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">Course Complete!</h2>
        <p className="text-sm text-gray-500 mb-1">You have successfully completed</p>
        <p className="text-sm font-semibold text-gray-800 mb-2">{courseTitle}</p>
        <p className="text-xs text-gray-400 mb-6">
          Your certificate has been issued and is ready to download.
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <Link
            to="/my-certificates"
            className="btn w-full"
          >
            <Award className="h-4 w-4" />
            View My Certificates
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="btn btn-secondary w-full"
          >
            Continue Reviewing
          </button>
        </div>

        <Link
          to="/my-learning"
          className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to My Learning
        </Link>
      </div>
    </div>
  );
};
