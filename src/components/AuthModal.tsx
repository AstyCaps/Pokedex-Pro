import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setErrorMsg('');
  setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Cadastro realizado! Se o Supabase exigir, confirme o e-mail enviado.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      closeAuthModal();
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 md:p-8 shadow-2xl relative border border-slate-100">

        <button 
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
        >
          ✕
        </button>

        <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">
          {isSignUp ? 'Criar Nova Conta' : 'Acessar Treinador'}
        </h2>
        <p className="text-sm text-slate-400 text-center mb-6">
          {isSignUp ? 'Cadastre-se para salvar seus times e favoritos' : 'Faça login para gerenciar seu perfil de Pokémons'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
            <input 
              type="email" 
              required
              placeholder="exemplo@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 transition-colors text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-500 text-white font-bold rounded-xl shadow-md hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 text-sm"
          >
            {loading ? 'Processando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="border-t border-slate-100 mt-6 pt-4 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Cadastre-se aqui'}
          </button>
        </div>

      </div>
    </div>
  );
};