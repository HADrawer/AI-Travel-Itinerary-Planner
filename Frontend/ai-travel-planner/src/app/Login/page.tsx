'use client';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
 const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/'); 
      } else {
        setSession(null);
        
        setChecking(false);
        
      }
    });
  }, [router]);

  if (checking) return <p>Loading...</p>;


  const handleLogin = async () => {
     setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      router.push('/');
    } else {
      setErrorMsg(error.message);
    }
  };

  if(session){
          
        }

  return (
   <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 text-black">
  <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
    <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
      Login
    </h2>

    <label className="block mb-4">
      <span className="text-gray-700 font-semibold">Email</span>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="mt-1 w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>

    <label className="block mb-6">
      <span className="text-gray-700 font-semibold">Password</span>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="mt-1 w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>

      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

    <button
      onClick={handleLogin}
      className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition"
    >
      Login
    </button>
     <p className="mt-4 text-center text-gray-700">
      Don’t have an account?{' '}
      <a href="/Register" className="text-blue-600 hover:underline">
       Register here
  </a>
</p>

  </div>
</div>

  );
}
