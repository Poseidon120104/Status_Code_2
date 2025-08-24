import React, { useEffect } from "react";

interface GoogleSignInProps {
  onTokenReceived: (data: { email: string; token: string }) => void;
}

// Proper typing for Google Identity Services
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
      element: HTMLElement | null,
      options: {
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      }
    ) => void;
  };
}

interface GoogleGSI {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google?: GoogleGSI;
  }
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onTokenReceived }) => {
  useEffect(() => {
    const handleCredentialResponse = (response: GoogleCredentialResponse) => {
      const credential: string = response.credential;
      console.log("Google Credential JWT:", credential);

      try {
        // Decode JWT to extract email and other user info
        const base64Url = credential.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const decodedPayload = JSON.parse(window.atob(base64));
        const email: string = decodedPayload.email;

        console.log("User email:", email);
        console.log("Decoded payload:", decodedPayload);

        // Pass back token + email to parent
        onTokenReceived({ email, token: credential });
      } catch (error) {
        console.error("Error decoding JWT:", error);
      }
    };

    // Check if script is already loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Load Google Identity Services script
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = initializeGoogleSignIn;
      script.onerror = () => {
        console.error("Failed to load Google Sign-In script");
      };
      document.head.appendChild(script);

      // Cleanup script if component unmounts
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }

    function initializeGoogleSignIn() {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "<YOUR_GOOGLE_CLIENT_ID>",
          callback: handleCredentialResponse,
        });
        
        const buttonElement = document.getElementById("googleSignInDiv");
        if (buttonElement) {
          window.google.accounts.id.renderButton(
            buttonElement,
            { 
              theme: "outline", 
              size: "large",
              text: "signin_with",
              shape: "rectangular"
            }
          );
        }
      }
    }
  }, [onTokenReceived]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div id="googleSignInDiv"></div>
      <p className="text-sm text-gray-600">
        Sign in with your Google account to continue
      </p>
    </div>
  );
};

export default GoogleSignIn;