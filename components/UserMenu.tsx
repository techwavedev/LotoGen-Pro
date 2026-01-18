import React, { useState, useEffect } from 'react';
import { User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/AuthContext';
import AuthModal from './AuthModal';

export default function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Listen for global event to open auth modal
  useEffect(() => {
    const handleOpenAuth = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm font-medium text-sm"
        >
          <User className="w-4 h-4" />
          <span>Entrar</span>
        </button>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all backdrop-blur-sm pr-4"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm shadow-inner">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-xs text-white/70 leading-none mb-0.5">Olá,</p>
          <p className="text-sm font-medium leading-none max-w-[100px] truncate">{user?.name?.split(' ')[0]}</p>
        </div>
      </button>

      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsMenuOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 animate-scale-in origin-top-right">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            
            <button
              onClick={() => {
                // Navigate to dashboard (implemented later via state in App)
                window.dispatchEvent(new CustomEvent('open-dashboard'));
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-purple-600" />
              Meus Jogos
            </button>

            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
