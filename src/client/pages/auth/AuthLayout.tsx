import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full max-w-[480px] flex-col justify-center bg-[#0a0a0a] px-8 py-12 sm:px-12 lg:px-16">
        {children}
      </div>
      <div className="hidden flex-1 lg:block">
        <img
          src="https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80"
          alt="Landscape"
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default AuthLayout;
