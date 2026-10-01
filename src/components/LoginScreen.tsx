import React, { useState } from 'react';
import { Package, Lock, Mail, User as UserIcon, Eye, EyeOff, Database, ArrowRight, CheckCircle2, ShieldCheck, Code } from 'lucide-react';
import { User } from '../types/inventory';
import { isSupabaseConfigured, SUPABASE_SQL_SCHEMA, supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail.');
      return;
    }
    if (!password || password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (isRegistering && !name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    setIsLoading(true);

    try {
      // If Supabase is active, we can authenticate via Supabase Auth
      if (isSupabaseConfigured && supabase) {
        if (isRegistering) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { full_name: name.trim() }
            }
          });
          if (signUpError) throw signUpError;
          if (data.user) {
            const loggedUser: User = {
              id: data.user.id,
              name: name.trim() || data.user.email?.split('@')[0] || 'Usuário',
              email: data.user.email || cleanEmail,
            };
            onLogin(loggedUser);
            return;
          }
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInError) throw signInError;
          if (data.user) {
            const loggedUser: User = {
              id: data.user.id,
              name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Usuário',
              email: data.user.email || cleanEmail,
            };
            onLogin(loggedUser);
            return;
          }
        }
      }

      // Local Authentication Fallback
      await new Promise(res => setTimeout(res, 400));
      const registeredUsers = JSON.parse(localStorage.getItem('cadastreprod_registered_users') || '[]');

      if (isRegistering) {
        const userExists = registeredUsers.some((u: any) => u.email.toLowerCase() === cleanEmail.toLowerCase());
        if (userExists) {
          setError('Este e-mail já está cadastrado. Por favor, acesse sua conta.');
          setIsLoading(false);
          return;
        }

        const newUser: User = {
          id: `usr-${Date.now()}`,
          name: name.trim(),
          email: cleanEmail,
        };
        registeredUsers.push({ ...newUser, password });
        localStorage.setItem('cadastreprod_registered_users', JSON.stringify(registeredUsers));
        onLogin(newUser);
      } else {
        const matched = registeredUsers.find(
          (u: any) => u.email.toLowerCase() === cleanEmail.toLowerCase() && u.password === password
        );

        if (!matched && cleanEmail !== 'admin@cadastreprod.com') {
          // Allow first sign in or prompt
          const newUser: User = {
            id: `usr-${Date.now()}`,
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
          };
          registeredUsers.push({ ...newUser, password });
          localStorage.setItem('cadastreprod_registered_users', JSON.stringify(registeredUsers));
          onLogin(newUser);
        } else {
          onLogin({
            id: matched?.id || 'usr-admin',
            name: matched?.name || 'Administrador',
            email: matched?.email || cleanEmail,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = () => {
    onLogin({
      id: 'usr-admin-demo',
      name: 'Gestor de Estoque',
      email: 'admin@cadastreprod.com',
    });
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Lockup */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 shadow-sm text-emerald-400 mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            cadastreprod
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Sistema de Gestão de Estoque, Cadastro Manual & IA Groq
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-850 py-8 px-6 sm:px-8 border border-slate-800 rounded-xl shadow-xl">
          {/* Tabs: Entrar / Criar Conta */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                !isRegistering
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError(null);
              }}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                isRegistering
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-950/50 border border-red-800/80 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Nome (Apenas ao Cadastrar) */}
            {isRegistering && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Campo E-mail */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Lembrar minhas credenciais</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isRegistering ? 'Cadastrar e Acessar' : 'Entrar no cadastreprod'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-2xs text-slate-400 mb-2.5">
              Deseja testar o sistema imediatamente?
            </p>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Entrar com Acesso Rápido de Demonstração</span>
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-3xs text-slate-500">
          cadastreprod · Cadastro manual por categoria e preço com estoque inicial limpo
        </p>
      </div>
    </div>
  );
};
