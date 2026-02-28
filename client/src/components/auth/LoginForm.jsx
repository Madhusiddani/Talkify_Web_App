import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthForms.module.css';

const LoginForm = () => {
    const { login } = useAuth();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await login(formData.email, formData.password);
        if (!result.success) {
            setError(result.message);
        }
        setLoading(false);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.errorBanner}>{error}</div>}

            <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
    );
};

export default LoginForm;
