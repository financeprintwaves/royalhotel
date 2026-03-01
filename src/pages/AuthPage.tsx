import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Loader2 } from 'lucide-react';
import TouchKeypad from '@/components/TouchKeypad';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const { signIn, signInWithPin, signUp } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const { error } = await signIn(formData.get('email') as string, formData.get('password') as string);
    if (error) toast({ variant: 'destructive', title: 'Sign in failed', description: error.message });
    setIsLoading(false);
  };

  const handlePinSignIn = async () => {
    if (pin.length !== 5) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 5-digit PIN' });
      return;
    }
    setIsLoading(true);
    const { error } = await signInWithPin(pin);
    if (error) {
      toast({ variant: 'destructive', title: 'PIN login failed', description: error.message });
      setPin('');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    if (password.length < 6) { toast({ variant: 'destructive', title: 'Invalid password', description: 'Password must be at least 6 characters.' }); setIsLoading(false); return; }
    const { error } = await signUp(formData.get('email') as string, password, formData.get('fullName') as string);
    if (error) toast({ variant: 'destructive', title: 'Sign up failed', description: error.message });
    else toast({ title: 'Account created!', description: 'You can now sign in.' });
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 max-md:mobile-gradient-indigo max-md:from-transparent max-md:via-transparent max-md:to-transparent">
      <Card className="w-full max-w-md shadow-xl max-md:rounded-2xl max-md:mobile-card-shadow max-md:border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Utensils className="h-8 w-8 text-primary" />
          </div>
          <div><CardTitle className="text-2xl font-bold">Restaurant POS</CardTitle><CardDescription>Sign in to access your dashboard</CardDescription></div>
        </CardHeader>
        <Tabs defaultValue="pin" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-4" style={{ width: 'calc(100% - 32px)' }}>
            <TabsTrigger value="pin">PIN</TabsTrigger>
            <TabsTrigger value="signin">Email</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          {/* PIN Login Tab with Touch Keypad */}
          <TabsContent value="pin">
            <CardContent className="pt-6">
              <TouchKeypad
                value={pin}
                onChange={setPin}
                onSubmit={handlePinSignIn}
                maxLength={5}
                disabled={isLoading}
              />
              {isLoading && (
                <div className="flex items-center justify-center mt-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Signing in...</span>
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* Email/Password Login Tab */}
          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="signin-email">Email</Label><Input id="signin-email" name="email" type="email" required disabled={isLoading} /></div>
                <div className="space-y-2"><Label htmlFor="signin-password">Password</Label><Input id="signin-password" name="password" type="password" required disabled={isLoading} /></div>
              </CardContent>
              <CardFooter><Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In</Button></CardFooter>
            </form>
          </TabsContent>

          {/* Sign Up Tab */}
          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="signup-name">Full Name</Label><Input id="signup-name" name="fullName" type="text" required disabled={isLoading} /></div>
                <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" name="email" type="email" required disabled={isLoading} /></div>
                <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password" name="password" type="password" required minLength={6} disabled={isLoading} /></div>
              </CardContent>
              <CardFooter><Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Account</Button></CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}