/**
 * Corellux OS - PIN Entry Modal
 * Modal para inserção de PIN numérico do usuário.
 */

import React, { useEffect, useState } from 'react';
import { useCorelluxState } from '../store/corellux-state';
import { getUserAvatar } from '../utils/initial-data';
import { X, Delete } from 'lucide-react';

export default function PinModal({ isOpen, onClose }) {
    const [state, setKey, updatePartial] = useCorelluxState(['currentUser', 'pin']);
    const [shake, setShake] = useState(false);

    const handleNumberClick = (num) => {
        if (state.pin.length < 4) {
            setKey('pin', state.pin + num);
        }
    };

    const handleBackspace = () => {
        if (state.pin.length > 0) {
            setKey('pin', state.pin.slice(0, -1));
        }
    };

    const handleClear = () => {
        setKey('pin', '');
    };

    const handleConfirm = () => {
        if (!state.currentUser) return;
        const expectedPin = state.currentUser.pin || '1234';
        
        if (state.pin === expectedPin) {
            // Sucesso
            onClose();
            updatePartial({
                workstationAuthenticated: true,
                currentScreen: 'dashboard'
            });
        } else {
            // PIN Incorreto - efeito de tremer
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setKey('pin', '');
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key >= '0' && e.key <= '9') {
                handleNumberClick(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state.pin, isOpen, state.currentUser]);

    if (!isOpen || !state.currentUser) return null;

    return (
        <div className="pin-modal-overlay active">
            <div className="pin-modal-card">
                <button className="btn-close-modal" onClick={onClose} title="Voltar">
                    <X size={18} />
                </button>
                <div className="pin-container">
                    <div className="pin-user-info">
                        <img 
                            src={getUserAvatar(state.currentUser.img)} 
                            alt={state.currentUser.displayName || state.currentUser.name} 
                            id="pin-avatar" 
                        />
                        <h2>{state.currentUser.name}</h2>
                        <p>{state.currentUser.role}</p>
                    </div>
                    <div className="pin-entry-area">
                        <p className="pin-instruction">DIGITE SEU PIN PARA ACESSAR</p>
                        
                        <div className={`pin-dots ${shake ? 'shake' : ''}`} style={{
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '1rem',
                            transition: 'transform 0.1s ease-in-out',
                            transform: shake ? 'translateX(10px)' : 'none'
                        }}>
                            {[0, 1, 2, 3].map((index) => (
                                <div 
                                    key={index} 
                                    className={`dot ${index < state.pin.length ? 'filled' : ''}`}
                                />
                            ))}
                        </div>

                        <div className="numpad">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button 
                                    key={num} 
                                    className="num-key" 
                                    onClick={() => handleNumberClick(num.toString())}
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="empty-key"></div>
                            <button className="num-key" onClick={() => handleNumberClick('0')}>0</button>
                            <button className="num-key action-key" onClick={handleBackspace}>
                                <Delete size={20} />
                            </button>
                        </div>
                        
                        <div className="pin-actions">
                            <button className="btn-clear-modal" onClick={handleClear}>LIMPAR</button>
                            <button className="btn-confirm-modal" onClick={handleConfirm}>CONFIRMAR</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
