import React, { useState } from 'react';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import styles from './AuthPage.module.css';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <div className={styles.authContainer}>
            <div className={styles.authLogo}>
                <div className={styles.logoIcon}>T</div>
                <h1>Talkify</h1>
                <p>Real-time translation Chat</p>
            </div>

            <div className={styles.authCard}>
                <div className={styles.authTabs}>
                    <button
                        className={`${styles.tabBtn} ${isLogin ? styles.activeTab : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Sign In
                    </button>
                    <button
                        className={`${styles.tabBtn} ${!isLogin ? styles.activeTab : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </button>
                </div>

                <div className={styles.formContent}>
                    {isLogin ? <LoginForm /> : <RegisterForm />}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
