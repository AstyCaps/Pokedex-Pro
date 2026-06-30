import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { user, openAuthModal, logout } = useAuth();
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-bold transition-colors ${
      pathname === path ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
    }`;

  return (
    <>
      <AuthModal />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-extrabold text-red-500 tracking-tight shrink-0">
              Pokédex
            </Link>
            <nav className="flex items-center gap-5">
              <Link to="/" className={linkClass('/')}>Início</Link>
              <Link to="/favorites" className={linkClass('/favorites')}>Favoritos</Link>
              <Link to="/team-builder" className={linkClass('/team-builder')}>Team Builder</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!user ? (
              <button
                onClick={openAuthModal}
                className="px-4 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Login / Cadastrar
              </button>
            ) : (
              <>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md max-w-40 truncate hidden sm:block">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Sair
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
