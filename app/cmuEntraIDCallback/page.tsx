"use client";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type SignInResponse = {
  ok: boolean;
  message?: string;
};

export default function CmuEntraIDCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Wait for code to be ready
    if (!code) {
      setMessage("❌ No authorization code received from CMU OAuth");
      return;
    }

    console.log("🔵 [Callback] Received authorization code:", code.substring(0, 20) + "...");
    console.log("🔵 [Callback] Sending POST to /api/entraid/signin");

    axios
      .post<SignInResponse>("/api/entraid/signin", { authorizationCode: code })
      .then((resp) => {
        console.log("✅ [Callback] Login successful:", resp.data);
        if (resp.data.ok) {
          // Redirect to appropriate dashboard
          // For now, redirect to home and let middleware handle routing
          router.push("/");
        }
      })
      .catch((error: AxiosError<SignInResponse>) => {
        console.error("❌ [Callback] Login error:", error);
        
        if (!error.response) {
          const msg = "Cannot connect to server. Please try again later.";
          console.error("❌ [Callback] No response from server");
          setMessage(msg);
        } else {
          const status = error.response.status;
          const data = error.response.data;
          
          console.error(`❌ [Callback] HTTP ${status}:`, data);
          
          if (data && !data.ok) {
            setMessage(`HTTP ${status}: ${data.message || "Login failed"}`);
          } else {
            setMessage(`HTTP ${status}: ${error.message || "Unknown error occurred"}`);
          }
        }
      });
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        {message ? (
          <div>
            <h1 className="text-2xl font-bold mb-4">❌ Login Failed</h1>
            <p className="text-red-400">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-4">🔄 Signing in...</h1>
            <p className="text-gray-400">Please wait while we log you in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
