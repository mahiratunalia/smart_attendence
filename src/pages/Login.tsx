import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login form submitted');
    
    if (!formData.email || !formData.password) {
      console.log('Validation failed: missing fields');
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    console.log('Attempting login with:', formData.email);
    
    try {
      const result = await login(formData.email, formData.password);
      console.log('Login result:', result);
      
      if (result.success) {
        toast.success('Login successful!');
        // Navigate immediately without delay
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Invalid email or password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(`Failed to log in: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Helper to fill test credentials
  const fillTestCredentials = (role: string) => {
    const password = '23101331'; // Standard password from seed
    let email = '';
    
    switch(role) {
      case 'teacher': email = 'dr.ahmed.khalid@university.edu'; break;
      case 'student': email = 'ahmed.hassan@university.edu'; break;
      case 'admin': email = 'admin@university.edu'; break;
    }
    
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="glass-card w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-heading font-bold gradient-text">
            SmartAttend
          </CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@university.edu"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground mb-4 uppercase tracking-wider">Quick Login</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials('teacher')}>Teacher</Button>
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials('student')}>Student</Button>
              <Button variant="outline" size="sm" onClick={() => fillTestCredentials('admin')}>Admin</Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
