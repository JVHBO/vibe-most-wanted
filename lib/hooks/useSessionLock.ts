"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePrimaryAddress } from "./usePrimaryAddress";

// Generate a unique session ID for this browser tab
const generateSessionId = (): string => {
  // Try to get from sessionStorage first (persists across page refreshes in same tab)
  if (typeof window !== "undefined") {
    const existing = sessionStorage.getItem("vmw_session_id");
    if (existing) return existing;

    const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem("vmw_session_id", newId);
    return newId;
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Heartbeat interval: 10 seconds (faster detection of session invalidation)
const HEARTBEAT_INTERVAL = 10 * 1000;

export interface SessionLockState {
  isSessionValid: boolean;
  isSessionLocked: boolean;
  isLoading: boolean;
  sessionId: string | null;
  lockReason: string | null;
  forceReconnect: () => void;
}

/**
 * 🔒 SESSION LOCK HOOK
 *
 * Manages single-device session for a profile.
 * Prevents using the same account on multiple devices.
 *
 * Usage:
 * ```tsx
 * const { isSessionLocked, lockReason, forceReconnect } = useSessionLock();
 *
 * if (isSessionLocked) {
 *   return <SessionLockedModal reason={lockReason} onReconnect={forceReconnect} />;
 * }
 * ```
 */
export function useSessionLock(): SessionLockState {
  const { primaryAddress, isLoading: isAddressLoading } = usePrimaryAddress();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 🔧 FIX: Use state instead of ref to trigger heartbeat effect
  const [isRegistered, setIsRegistered] = useState(false);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convex mutations
  const registerSession = useMutation(api.sessions.registerSession);
  const heartbeat = useMutation(api.sessions.heartbeat);
  const endSession = useMutation(api.sessions.endSession);

  // Initialize session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSessionId(generateSessionId());
    }
  }, []);

  // Register session when address is available
  useEffect(() => {
    if (!primaryAddress || !sessionId || isAddressLoading) {
      setIsLoading(true);
      return;
    }

    const register = async () => {
      try {
        console.log('🔒 [Session] Registering session for', primaryAddress.slice(0, 8));
        const result = await registerSession({
          profileAddress: primaryAddress,
          sessionId,
          deviceInfo: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });

        if (result.success) {
          console.log('✅ [Session] Registered successfully');
          setIsSessionValid(true);
          setIsSessionLocked(false);
          setLockReason(null);
          setIsRegistered(true); // 🔧 FIX: Use state to trigger heartbeat effect
        }
      } catch (err) {
        console.error("Failed to register session:", err);
      } finally {
        setIsLoading(false);
      }
    };

    register();

    // Cleanup on unmount
    return () => {
      if (isRegistered && primaryAddress && sessionId) {
        endSession({ profileAddress: primaryAddress, sessionId }).catch(() => {});
      }
    };
  }, [primaryAddress, sessionId, isAddressLoading, registerSession, endSession, isRegistered]);

  // Heartbeat interval - 🔧 FIX: Use isRegistered state in dependencies
  useEffect(() => {
    if (!primaryAddress || !sessionId || !isRegistered) {
      return;
    }

    console.log('💓 [Session] Starting heartbeat for', primaryAddress.slice(0, 8));

    const doHeartbeat = async () => {
      try {
        const result = await heartbeat({
          profileAddress: primaryAddress,
          sessionId,
        });

        if (!result.valid) {
          console.log('🔒 [Session] Session invalidated:', result.reason);
          setIsSessionValid(false);
          setIsSessionLocked(true);
          setLockReason(result.reason || "session_invalidated");

          // Stop heartbeat when locked
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    // Initial heartbeat
    doHeartbeat();

    // Start interval
    heartbeatIntervalRef.current = setInterval(doHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [primaryAddress, sessionId, heartbeat, isRegistered]);

  // Force reconnect (generates new session ID and re-registers)
  const forceReconnect = useCallback(() => {
    if (typeof window !== "undefined") {
      console.log('🔄 [Session] Force reconnect - clearing session');
      // Reset state
      setIsRegistered(false);
      setIsSessionLocked(false);
      setIsSessionValid(true);
      // Clear session storage and reload
      sessionStorage.removeItem("vmw_session_id");
      window.location.reload();
    }
  }, []);

  return {
    isSessionValid,
    isSessionLocked,
    isLoading: isLoading || isAddressLoading,
    sessionId,
    lockReason,
    forceReconnect,
  };
}
