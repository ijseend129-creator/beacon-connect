import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BeaconLogo } from '@/components/BeaconLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('Voer een geldig e-mailadres in'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  username: z.string().min(3, 'Gebruikersnaam moet minimaal 3 tekens zijn').optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({
        email,
        password,
        username: isLogin ? undefined : username,
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof typeof errors] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Inloggen mislukt',
            description: error.message === 'Invalid login credentials' 
              ? 'Ongeldige e-mail of wachtwoord. Probeer opnieuw.'
              : error.message,
            variant: 'destructive',
          });
        }
      } else {
        const { error } = await signUp(email, password, username);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account bestaat al',
              description: 'Dit e-mailadres is al geregistreerd. Log in.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Registratie mislukt',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Welkom bij Beacon!',
            description: 'Je account is succesvol aangemaakt.',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        {/* Logo and title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <BeaconLogo size="lg" className="beacon-glow" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Beacon</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Welkom terug! Log in om verder te gaan.' : 'Maak een account aan om te beginnen.'}
          </p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-6 bg-card p-8 rounded-xl border border-border">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">Gebruikersnaam</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Kies een gebruikersnaam"
                className="bg-input border-border"
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-input border-border"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-input border-border"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-beacon-lime-glow beacon-glow-sm transition-all duration-300"
            disabled={loading}
          >
            {loading ? 'Even geduld...' : isLogin ? 'Inloggen' : 'Account aanmaken'}
          </Button>
        </form>

        {/* Toggle auth mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Heb je nog geen account? Registreren" : 'Heb je al een account? Inloggen'}
          </button>
        </div>
      </div>
    </div>
  );
}
