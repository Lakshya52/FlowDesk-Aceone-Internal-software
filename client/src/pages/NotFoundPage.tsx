import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)',
            padding: '24px',
            textAlign: 'center'
        }}>
            <div className="card animate-fade-in" style={{
                maxWidth: 480,
                width: '100%',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'var(--color-danger-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 24
                }}>
                    <AlertCircle size={40} color="var(--color-danger)" />
                </div>

                <h1 style={{
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    margin: 0,
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, var(--color-primary), #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.05em'
                }}>
                    404
                </h1>

                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginTop: 8,
                    marginBottom: 12,
                    color: 'var(--color-text)'
                }}>
                    Something went wrong
                </h2>

                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '1rem',
                    marginBottom: 32,
                    lineHeight: 1.6
                }}>
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate(-1)}
                        style={{ padding: '12px 24px' }}
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        style={{ padding: '12px 24px' }}
                    >
                        <Home size={18} />
                        Home Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
