import { useState } from 'react';
import { Check, X, Zap, Crown, Clock, CreditCard, ArrowRight, Shield, Star, ChevronRight } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

const PLANS = [
  {
    id: 'FREE_TRIAL',
    name: 'Free Trial',
    price: 'Free',
    period: '2 Days',
    description: 'Explore the platform risk-free',
    color: 'var(--cyan)',
    glow: 'var(--cyan-glow)',
    icon: Clock,
    features: [
      { text: '10 lead views', included: true },
      { text: '1 property claim', included: true },
      { text: 'Basic CRM access', included: true },
      { text: 'Masked property data', included: true },
      { text: 'Unlimited leads', included: false },
      { text: 'Market Intelligence', included: false },
      { text: 'Lead exports', included: false },
      { text: 'Full data access', included: false },
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for new wholesalers',
    color: 'var(--purple)',
    glow: 'var(--purple-glow)',
    icon: Zap,
    features: [
      { text: '100 lead views/month', included: true },
      { text: '10 property claims', included: true },
      { text: 'Basic CRM access', included: true },
      { text: 'Masked property data', included: true },
      { text: 'Unlimited leads', included: false },
      { text: 'Market Intelligence', included: false },
      { text: 'Lead exports', included: false },
      { text: 'Full data access', included: false },
    ],
    cta: 'Subscribe Now',
    popular: false,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: '$149',
    period: '/month',
    description: 'For serious investors & wholesalers',
    color: 'var(--emerald)',
    glow: 'var(--emerald-glow)',
    icon: Crown,
    features: [
      { text: 'Unlimited lead views', included: true },
      { text: 'Unlimited claims', included: true },
      { text: 'Full CRM access', included: true },
      { text: 'Full data access (unmasked)', included: true },
      { text: 'Market Intelligence', included: true },
      { text: 'Lead exports (CSV)', included: true },
      { text: 'Property tracking', included: true },
      { text: 'Cash Buyer network', included: true },
    ],
    cta: 'Go Professional',
    popular: true,
  },
];

export default function PricingLandingPage({ user, onSubscriptionComplete, onContinueTrial, embedded = false }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [cashappRef, setCashappRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const currentPlan = user?.subscription_plan || 'FREE_TRIAL';
  const isExpired = currentPlan === 'EXPIRED';
  const trialExpiresAt = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const trialTimeLeft = trialExpiresAt ? Math.max(0, trialExpiresAt - new Date()) : 0;
  const trialHoursLeft = Math.floor(trialTimeLeft / (1000 * 60 * 60));
  const trialMinutesLeft = Math.floor((trialTimeLeft % (1000 * 60 * 60)) / (1000 * 60));

  function handleSelectPlan(plan) {
    if (plan.id === 'FREE_TRIAL') return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
    setError('');
    setCashappRef('');
    setSuccess(false);
  }

  async function handleSubmitPayment() {
    if (!cashappRef.trim() || cashappRef.trim().length < 3) {
      setError('Please enter a valid CashApp transaction reference.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/subscription/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan.id, cashapp_reference: cashappRef.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed.');
      setSuccess(true);
      // Don't change the user's plan yet — it stays as-is until admin confirms.
      // After a delay, close the modal and return to the current view.
      setTimeout(() => {
        setShowPaymentModal(false);
        setSuccess(false);
      }, 3500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={embedded ? { ...styles.wrapper, position: 'relative', inset: 'auto', zIndex: 1, minHeight: '100%' } : styles.wrapper}>
      {/* Animated background */}
      <div style={embedded ? { ...styles.bgOrbs, position: 'absolute' } : styles.bgOrbs}>
        <div style={{ ...styles.orb, ...styles.orb1 }} />
        <div style={{ ...styles.orb, ...styles.orb2 }} />
        <div style={{ ...styles.orb, ...styles.orb3 }} />
      </div>

      <div style={styles.container}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.logoBadge}>
            <div style={styles.logoIcon}>FF</div>
            <span style={styles.logoText}>ForeclosureFinder</span>
            <span style={styles.aiBadge}>AI</span>
          </div>
          <h1 style={styles.heroTitle}>
            Unlock <span style={styles.gradientText}>Distressed Property</span> Intelligence
          </h1>
          <p style={styles.heroSubtitle}>
            Choose the plan that fits your wholesale business. Access real-time foreclosure data,
            AI-powered scoring, and CRM tools to close more deals.
          </p>

          {/* Trial status banner */}
          {currentPlan === 'FREE_TRIAL' && trialTimeLeft > 0 && (
            <div style={styles.trialBanner}>
              <Clock size={16} style={{ color: 'var(--cyan)' }} />
              <span>Free trial active — <strong>{trialHoursLeft}h {trialMinutesLeft}m</strong> remaining</span>
              <button style={styles.trialContinueBtn} onClick={onContinueTrial}>
                Continue Exploring <ChevronRight size={14} />
              </button>
            </div>
          )}

          {isExpired && (
            <div style={styles.expiredBanner}>
              <Shield size={16} style={{ color: 'var(--rose)' }} />
              <span>Your free trial has expired. Subscribe below to continue.</span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div style={styles.cardsRow}>
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = plan.id === currentPlan || (plan.id === 'FREE_TRIAL' && isExpired);

            return (
              <div
                key={plan.id}
                style={{
                  ...styles.card,
                  ...(plan.popular ? styles.cardPopular : {}),
                  borderColor: plan.popular ? plan.color : 'var(--border-color)',
                }}
              >
                {plan.popular && (
                  <div style={{ ...styles.popularBadge, background: plan.color }}>
                    <Star size={12} /> Most Popular
                  </div>
                )}

                <div style={{ ...styles.cardIconWrap, background: plan.glow }}>
                  <Icon size={24} style={{ color: plan.color }} />
                </div>

                <h3 style={styles.cardName}>{plan.name}</h3>
                <p style={styles.cardDesc}>{plan.description}</p>

                <div style={styles.priceRow}>
                  <span style={{ ...styles.price, color: plan.color }}>{plan.price}</span>
                  <span style={styles.pricePeriod}>{plan.period}</span>
                </div>

                <div style={styles.featuresList}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={styles.featureItem}>
                      {f.included ? (
                        <Check size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                      ) : (
                        <X size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                      <span style={{ color: f.included ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  style={{
                    ...styles.ctaBtn,
                    background: plan.disabled || isCurrentPlan ? 'var(--bg-tertiary)' : plan.color,
                    cursor: plan.disabled || isCurrentPlan ? 'default' : 'pointer',
                    opacity: plan.disabled && !isExpired ? 0.6 : 1,
                  }}
                  disabled={plan.disabled && !isExpired}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isCurrentPlan && plan.id === 'FREE_TRIAL'
                    ? isExpired
                      ? 'Expired'
                      : 'Current Plan'
                    : plan.cta}
                  {!plan.disabled && <ArrowRight size={16} />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div style={styles.trustRow}>
          <div style={styles.trustItem}>
            <Shield size={18} style={{ color: 'var(--cyan)' }} />
            <span>Secure Platform</span>
          </div>
          <div style={styles.trustItem}>
            <CreditCard size={18} style={{ color: 'var(--emerald)' }} />
            <span>CashApp Payments</span>
          </div>
          <div style={styles.trustItem}>
            <Zap size={18} style={{ color: 'var(--purple)' }} />
            <span>Instant Access</span>
          </div>
        </div>
      </div>

      {/* CashApp Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div style={styles.modalOverlay} onClick={() => !submitting && setShowPaymentModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {success ? (
              <div style={styles.successContent}>
                <div style={styles.successIcon}>✓</div>
                <h3 style={styles.modalTitle}>Subscription Submitted!</h3>
                <p style={styles.modalSubtitle}>
                  Your <strong>{selectedPlan.name}</strong> plan request has been submitted.
                  Our admin will confirm your payment shortly.
                </p>
                <div style={styles.successNote}>
                  You'll receive full access once your payment is verified.
                </div>
              </div>
            ) : (
              <>
                <div style={styles.modalHeader}>
                  <div style={{ ...styles.cardIconWrap, background: selectedPlan.glow }}>
                    {(() => {
                      const PIcon = selectedPlan.icon;
                      return <PIcon size={24} style={{ color: selectedPlan.color }} />;
                    })()}
                  </div>
                  <div>
                    <h3 style={styles.modalTitle}>Subscribe to {selectedPlan.name}</h3>
                    <p style={styles.modalSubtitle}>
                      {selectedPlan.price}{selectedPlan.period}
                    </p>
                  </div>
                </div>

                <div style={styles.paymentInstructions}>
                  <h4 style={styles.instructionsTitle}>
                    <CreditCard size={18} style={{ color: 'var(--emerald)' }} />
                    CashApp Payment Instructions
                  </h4>
                  <div style={styles.cashAppTag}>
                    <span style={styles.cashAppLabel}>Send to:</span>
                    <span style={styles.cashAppValue}>$PaidProperties</span>
                  </div>
                  <div style={styles.cashAppTag}>
                    <span style={styles.cashAppLabel}>Amount:</span>
                    <span style={{ ...styles.cashAppValue, color: selectedPlan.color }}>
                      {selectedPlan.price}
                    </span>
                  </div>
                  <div style={styles.cashAppNote}>
                    Open your CashApp, send the exact amount to <strong>$PaidProperties</strong>,
                    then enter your transaction reference below.
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>CashApp Transaction Reference</label>
                  <input
                    type="text"
                    placeholder="e.g., #abc123xyz or confirmation number"
                    value={cashappRef}
                    onChange={(e) => setCashappRef(e.target.value)}
                    style={styles.input}
                    disabled={submitting}
                  />
                </div>

                {error && <div style={styles.errorMsg}>{error}</div>}

                <div style={styles.modalActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowPaymentModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    style={{
                      ...styles.confirmBtn,
                      background: selectedPlan.color,
                      opacity: submitting ? 0.7 : 1,
                    }}
                    onClick={handleSubmitPayment}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Payment'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.1); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.15); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, 20px) scale(0.9); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); }
        }
        @keyframes successCheck {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    background: 'var(--bg-primary)',
    overflow: 'auto',
    zIndex: 1000,
  },
  bgOrbs: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: '50%',
    filter: 'blur(80px)',
    opacity: 0.3,
  },
  orb1: {
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
    top: '-10%',
    right: '-5%',
    animation: 'orbFloat1 12s ease-in-out infinite',
  },
  orb2: {
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
    bottom: '5%',
    left: '-5%',
    animation: 'orbFloat2 15s ease-in-out infinite',
  },
  orb3: {
    width: '300px',
    height: '300px',
    background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
    top: '40%',
    left: '50%',
    animation: 'orbFloat3 10s ease-in-out infinite',
  },
  container: {
    position: 'relative',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '60px 24px 80px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '60px',
    animation: 'fadeInUp 0.8s ease-out',
  },
  logoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
    padding: '8px 20px',
    background: 'rgba(23, 29, 49, 0.6)',
    border: '1px solid var(--border-color)',
    borderRadius: '40px',
    backdropFilter: 'blur(10px)',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '0.8rem',
    color: '#fff',
  },
  logoText: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--text-primary)',
  },
  aiBadge: {
    background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.65rem',
    padding: '2px 8px',
    borderRadius: '6px',
    letterSpacing: '0.5px',
  },
  heroTitle: {
    fontSize: 'clamp(1.8rem, 4vw, 3rem)',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
    marginBottom: '16px',
    fontFamily: 'var(--font-sans)',
  },
  gradientText: {
    background: 'linear-gradient(135deg, var(--cyan), var(--emerald))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    maxWidth: '640px',
    margin: '0 auto 24px',
    lineHeight: 1.6,
  },
  trialBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--cyan-glow)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '12px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  trialContinueBtn: {
    background: 'rgba(6, 182, 212, 0.2)',
    border: '1px solid rgba(6, 182, 212, 0.4)',
    color: 'var(--cyan)',
    padding: '4px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  expiredBanner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--rose-glow)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '10px 20px',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '50px',
    animation: 'fadeInUp 0.8s ease-out 0.2s both',
  },
  card: {
    position: 'relative',
    background: 'rgba(15, 20, 34, 0.65)',
    backdropFilter: 'blur(14px)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
  },
  cardPopular: {
    background: 'rgba(15, 20, 34, 0.85)',
    animation: 'pulseGlow 3s ease-in-out infinite',
    transform: 'scale(1.02)',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 16px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  cardIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  cardName: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '24px',
  },
  price: {
    fontSize: '2.4rem',
    fontWeight: 800,
  },
  pricePeriod: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  featuresList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '28px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.88rem',
  },
  ctaBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#fff',
    transition: 'all 0.2s ease',
  },
  trustRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    flexWrap: 'wrap',
    animation: 'fadeInUp 0.8s ease-out 0.4s both',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px',
  },
  modal: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '20px',
    padding: '36px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: 'var(--shadow-premium)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  modalSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  paymentInstructions: {
    background: 'rgba(16, 185, 129, 0.06)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '14px',
    padding: '20px',
    marginBottom: '24px',
  },
  instructionsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '14px',
  },
  cashAppTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    marginBottom: '8px',
  },
  cashAppLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  cashAppValue: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--emerald)',
    letterSpacing: '0.5px',
  },
  cashAppNote: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '10px',
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  },
  errorMsg: {
    background: 'var(--rose-glow)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--rose)',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  confirmBtn: {
    flex: 2,
    padding: '12px',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },

  // Success
  successContent: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--emerald-glow)',
    border: '2px solid var(--emerald)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    fontSize: '1.8rem',
    color: 'var(--emerald)',
    fontWeight: 700,
    animation: 'successCheck 0.5s ease-out',
  },
  successNote: {
    background: 'var(--emerald-glow)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '10px',
    padding: '12px',
    fontSize: '0.85rem',
    color: 'var(--emerald)',
    marginTop: '16px',
  },
};
