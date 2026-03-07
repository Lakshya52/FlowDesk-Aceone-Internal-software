import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);
    const { login, isLoading } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
            padding: 24,
            position: 'relative'
        }}>
            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                className="btn btn-ghost"
                style={{
                    position: 'absolute',
                    top: 24,
                    left: 24,
                    gap: 8,
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500
                }}
            >
                <ArrowLeft size={18} /> Back
            </button>
            <div className="animate-fade-in" style={{ width: '100%', maxWidth: 400 }}>
                {/* Brand */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                    }}>
                        <Zap size={24} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>FlowDesk</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        Sign in to your workspace
                    </p>
                </div>

                {/* Form */}
                <div className="card" style={{ padding: 32 }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'var(--color-danger-light)',
                                color: 'var(--color-danger)',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                            }}>
                                {error}
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                Email address
                            </label>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                autoFocus
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 6, color: 'var(--color-text-secondary)' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{ paddingRight: 40 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute',
                                        right: 8,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 4,
                                        color: 'var(--color-text-tertiary)',
                                    }}
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{ width: '100%', padding: '10px 16px', fontSize: '0.875rem', marginTop: 4 }}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                </div>

            </div>
        </div>
    );
};

export default LoginPage;
