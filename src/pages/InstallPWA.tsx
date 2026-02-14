import { useState, useEffect } from "react";
import { Download, CheckCircle, Smartphone, Monitor, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>App Installed!</CardTitle>
            <CardDescription>
              Royal Hotel POS is installed and ready to use. You can launch it from your home screen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            RH
          </div>
          <CardTitle>Install Royal Hotel POS</CardTitle>
          <CardDescription>
            Install as a standalone app for faster loading, offline access, and a full-screen experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deferredPrompt && (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          )}

          {isIOS && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Install on iPhone / iPad
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li className="flex items-start gap-2">
                  <span>Tap the <Share className="inline h-4 w-4" /> Share button in Safari</span>
                </li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to confirm</li>
              </ol>
            </div>
          )}

          {!isIOS && !deferredPrompt && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Monitor className="h-4 w-4" /> Install on Desktop / Android
              </h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Open browser menu (⋮ or ⋯)</li>
                <li>Look for <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
                <li>Confirm the installation</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
