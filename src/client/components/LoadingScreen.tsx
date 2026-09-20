import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-lg font-bold text-black">
          D
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    </div>
  );
};

export default LoadingScreen;
