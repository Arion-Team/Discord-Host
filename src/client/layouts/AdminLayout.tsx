import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AdminSidebar />
      <main className="transition-all duration-300 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
