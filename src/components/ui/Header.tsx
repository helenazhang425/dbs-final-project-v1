'use client';

import { UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <div className="text-2xl font-bold text-blue-600">Trio</div>
            <div className="ml-2 text-sm text-gray-600">Balanced Life</div>
          </Link>

          <div className="flex items-center space-x-4">
            {isSignedIn && (
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                Dashboard
              </Link>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
