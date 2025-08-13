'use client';
import { useState , useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
 const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

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




  const handleRegister = async () => {
    setMessage('');
    if (password !== confirmPassword) {
      setMessage("Passwords don't match!");
      setIsError(true);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
   

     if (error) {
      setMessage(error.message);
      setIsError(true);
      return
    } else if (!error) {
      setMessage(' Registration successful! Please check your email.');
      setIsError(false);
      setTimeout(() => router.push('/Login'), 2000);
    }
  };
  if (session){
    
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8 text-black">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Register
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

        <label className="block mb-4">
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

        <label className="block mb-6">
          <span className="text-gray-700 font-semibold">Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            required
            className="mt-1 w-full border border-gray-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

         {message && (
          <div className={`mb-4 text-sm text-center font-medium ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handleRegister}
        
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          
        </button>
         <p className="mt-4 text-center text-gray-700">
        Already registered?{' '}
      <a href="/Login" className="text-blue-600 hover:underline">
        Login here
      </a>
    </p>
      </div>
    </div>
  );
}
