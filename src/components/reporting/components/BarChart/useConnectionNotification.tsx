import React, { useRef, useCallback } from 'react';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { Link2, Link2Off } from 'lucide-react';

const NOTIFICATION_DEBOUNCE_MS = 2000;

interface UseConnectionNotificationProps {
  isConnected: boolean;
  isManualReconnecting: boolean;
}

/**
 * Custom hook to manage connection/disconnection notifications
 * Prevents duplicate notifications and handles debouncing
 */
export const useConnectionNotification = ({
  isConnected,
  isManualReconnecting
}: UseConnectionNotificationProps): {
  showConnectedNotification: (isCurrentlyConnected: boolean) => void;
  checkAndShowDisconnectNotification: (reportState: any, mainState: any, compareStates: (s1: any, s2: any) => boolean) => boolean;
  prevIsConnected: React.MutableRefObject<boolean | undefined>;
} => {
  const { showNotification } = useNotification();
  
  // Track previous connection state to detect changes
  const prevIsConnected = useRef<boolean | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastNotificationType = useRef<'connected' | 'disconnected' | null>(null);
  const notificationShownForState = useRef<string | null>(null);
  const isShowingNotification = useRef<boolean>(false);
  const notificationPending = useRef<boolean>(false);

  /**
   * Show connected notification (called manually when user clicks reconnect)
   */
  const showConnectedNotification = useCallback((isCurrentlyConnected: boolean) => {
    const now = Date.now();
    
    // Set notification tracking BEFORE sync to prevent useEffect from showing duplicate
    isShowingNotification.current = true;
    lastNotificationTime.current = now;
    lastNotificationType.current = 'connected';
    const currentStateId = `${isCurrentlyConnected}_true`;
    notificationShownForState.current = currentStateId;

    showNotification({
      title: 'Filters Connected',
      message: 'Bar chart filters are now connected to the main chart.',
      type: 'success',
      icon: <Link2 size={18} style={{ color: '#166534' }} />
    });

    // Reset flags after a delay
    setTimeout(() => {
      isShowingNotification.current = false;
      setTimeout(() => {
        lastNotificationType.current = null;
        notificationShownForState.current = null;
      }, NOTIFICATION_DEBOUNCE_MS);
    }, 100);
  }, [showNotification]);

  /**
   * Check if disconnect notification should be shown and show it if needed
   * Returns true if notification was shown, false otherwise
   */
  const checkAndShowDisconnectNotification = useCallback((
    reportState: any,
    mainState: any,
    compareStates: (s1: any, s2: any) => boolean
  ): boolean => {
    // Skip entirely if this is a manual reconnect
    if (isManualReconnecting) {
      prevIsConnected.current = isConnected;
      return false;
    }

    // Skip if states haven't actually changed
    if (prevIsConnected.current === isConnected) {
      return false;
    }

    // Create a stable identifier for this specific state change
    const stateChangeId = `${prevIsConnected.current}_${isConnected}`;

    // Check if we've already shown notification for this exact state change
    const alreadyNotified = notificationShownForState.current === stateChangeId;
    const isCurrentlyShowing = isShowingNotification.current;
    const isPending = notificationPending.current;

    if (alreadyNotified || isCurrentlyShowing || isPending) {
      console.log(`🔔 [ConnectionNotification] DUPLICATE PREVENTED: Already shown notification for ${stateChangeId}`);
      prevIsConnected.current = isConnected;
      return false;
    }

    const now = Date.now();

    // ONLY automatic disconnect: connected -> disconnected
    const shouldShowDisconnect = (
      prevIsConnected.current === true &&
      isConnected === false &&
      !isShowingNotification.current &&
      (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS &&
      lastNotificationType.current !== 'disconnected'
    );

    if (shouldShowDisconnect) {
      // Only show notification if report state actually differs from main state
      const statesDiffer = reportState && !compareStates(reportState, mainState);

      if (statesDiffer) {
        // Set ALL flags IMMEDIATELY and SYNCHRONOUSLY before showing notification
        notificationPending.current = true;
        notificationShownForState.current = stateChangeId;
        isShowingNotification.current = true;
        lastNotificationTime.current = now;
        lastNotificationType.current = 'disconnected';

        console.log(`🔔 [ConnectionNotification] Showing DISCONNECT notification for state change: ${stateChangeId}`);
        showNotification({
          title: 'Filters Disconnected',
          message: 'Bar chart filters are now independent from the main chart.',
          type: 'success',
          icon: <Link2Off size={18} style={{ color: '#166534' }} />
        });

        // Reset flags after showing notification
        setTimeout(() => {
          isShowingNotification.current = false;
          notificationPending.current = false;
        }, 500);

        prevIsConnected.current = isConnected;
        return true;
      }
    }

    prevIsConnected.current = isConnected;
    return false;
  }, [isConnected, isManualReconnecting, showNotification]);

  return {
    showConnectedNotification,
    checkAndShowDisconnectNotification,
    prevIsConnected: prevIsConnected
  };
};

