// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

const Spinner = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const AppLogo = () => (
    <svg height="60" width="60" viewBox="0 0 100 100" className="mx-auto mb-3">
        <circle cx="50" cy="50" r="45" fill="#202938" stroke="#374151" strokeWidth="3" />
        <path d="M35 65 L45 65 L55 35 L65 35" stroke="#60A5FA" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 50 L70 50" stroke="#34D399" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M40 30 Q50 20 60 30" stroke="#F472B6" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M40 70 Q50 80 60 70" stroke="#F472B6" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
);

// Cookie helper function
const setCookie = (name, value, days) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof document !== 'undefined') {
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
};


function LoginPage({ setUser }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setErrorMsg('');
    console.log("Google login success (ID Token flow), credentialResponse:", credentialResponse);

    if (!credentialResponse.credential) {
        console.error("ID Token (credential) not found in Google response.");
        setErrorMsg("Failed to get ID Token from Google. Please try again.");
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/google/verify_id_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
        credentials: 'include',
      });

      if (!response.ok) {
        let backendError = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          backendError = errorData.detail || errorData.message || backendError;
        } catch (parseError) {
          try {
            const textError = await response.text();
            backendError = `${backendError}. Response: ${textError.substring(0, 200)}`;
          } catch (textParseError) {
             backendError = `${backendError}. Could not parse error response.`;
          }
        }
        throw new Error(backendError);
      }

      const userData = await response.json();
      console.log("Backend ID Token verification successful, userData:", userData);

      // MODIFICATION: Set the access_token cookie from backend response
      if (userData.access_token) {
        setCookie('access_token', userData.access_token, 1); // Set cookie for 1 day
      } else {
        console.error("CRITICAL: access_token not found in backend response!");
        setErrorMsg("Login session incomplete. Please try again or contact support.");
        setIsLoading(false);
        return; // Do not proceed with login
      }

      if (userData.picture) {
        const img = new Image();
        img.onload = () => {
          console.log("User profile image pre-loaded successfully.");
          completeLogin(userData);
        };
        img.onerror = () => {
          console.warn('User profile image failed to pre-load. Using URL directly.');
          completeLogin(userData);
        };
        img.src = userData.picture;
      } else {
        completeLogin(userData);
      }

    } catch (error) {
      console.error('Error during ID Token verification or login completion:', error);
      setErrorMsg(error.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const completeLogin = (dataForUser) => {
    // setUser updates localStorage via App.jsx's handleSetUser
    setUser({
      email: dataForUser.email,
      name: dataForUser.name,
      picture: dataForUser.picture
      // The access_token is now in a cookie, not directly part of the 'user' object in localStorage
    });
    navigate('/chat');
  };

  const handleLoginFailure = (error) => {
    console.error('Google Login (ID Token flow) failed:', error);
    setErrorMsg('Google login failed. Please ensure popups are allowed and try again.');
    setIsLoading(false);
  };

   return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="w-full max-w-md text-center p-8 bg-slate-800 bg-opacity-50 backdrop-blur-md rounded-xl shadow-2xl">
        
        <div className="mb-8">
           <AppLogo />
           <h1 className="text-3xl font-bold mb-2 text-white">
             Code Review Assistant
           </h1>
           <p className="text-slate-400 text-sm">Sign in to get AI-powered code insights.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-200 border border-red-500 text-red-800 px-4 py-3 rounded relative mb-6 text-sm max-w-xs mx-auto" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        )}

        <div className={`flex justify-center items-center my-8 h-[50px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center bg-blue-600 text-white font-medium py-2 px-6 rounded-lg h-[50px] w-[240px] shadow-lg">
              <Spinner />
              <span className="ml-3 text-base">Verifying...</span>
            </div>
          ) : (
            <div id="google-login-button-container">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginFailure}
                type="standard"
                theme="filled_black"
                text="signin_with"
                shape="pill"
                logo_alignment="left"
                size="large"
                width="240px"
              />
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-10 text-gray-500">
          Dayananda Sagar University &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;