"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user dismissed the prompt before
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show again for 7 days
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 30 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border-default text-ink-primary p-4 shadow-raised z-50 animate-slide-up">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1 text-ink-primary">Install Spendly</h3>
          <p className="text-sm text-ink-secondary">
            Add to your home screen for quick access and offline use
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="bg-accent text-accent-foreground px-6 py-2 rounded-lg font-semibold hover:bg-accent-hover transition-colors whitespace-nowrap"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="bg-surface-hover text-ink-primary px-4 py-2 rounded-lg hover:bg-surface-active transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
