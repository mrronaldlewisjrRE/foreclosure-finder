import { useEffect, useState } from 'react';
import { DollarSign, Landmark, TrendingUp, Calendar, FileText, Loader2, Sparkles } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '../config';

export default function SalesTrackingView() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/admin/sales`);
      if (!res.ok) throw new Error('Failed to load completed property sales.');
      const data = await res.json();
      setSales(data.sales || []);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error loading sales.');
    } finally {
      setLoading(false);
    }
  }

  // Aggregate stats calculations
  const totalSalesCount = sales.length;
  const totalAssignmentFees = sales.reduce((acc, sale) => acc + parseFloat(sale.assignmentFee || 0), 0);
  const totalProfit = sales.reduce((acc, sale) => acc + parseFloat(sale.profitAmount || 0), 0);
  const averageFee = totalSalesCount > 0 ? totalAssignmentFees / totalSalesCount : 0;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Panel */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-premium)'
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Closed Property Sales & Assignments</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Closed deals performance dashboard displaying captured assignment fees, wholesale profit margins, and sales velocity.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchSales} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={14} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--cyan)', margin: '0 auto 12px auto' }} />
          <span>Reconciling financial ledger databases...</span>
        </div>
      ) : (
        <>
          {/* Financial summary blocks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Sales Closed</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSalesCount} deals</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Assignment Fees</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyan)' }}>${totalAssignmentFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Wholesaler Net Profit</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--emerald)' }}>${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Fee Per Deal</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>${averageFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Sales ledger table */}
          <div className="leads-table-wrapper" style={{ boxShadow: 'var(--shadow-premium)' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Closed Property Address</th>
                  <th>Closing Wholesaler</th>
                  <th>Disposition Date</th>
                  <th style={{ textAlign: 'right' }}>Assignment Fee</th>
                  <th style={{ textAlign: 'right' }}>Net Profit Margin</th>
                  <th>Acquisition & Disposition Notes</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No properties have been closed and recorded in the sales ledger yet.
                    </td>
                  </tr>
                ) : (
                  sales.map(sale => (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {sale.propertyAddress}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {sale.userEmail}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--cyan)' }} />
                          {new Date(sale.saleDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--cyan)', fontSize: '0.9rem' }}>
                        ${parseFloat(sale.assignmentFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--emerald)', fontSize: '0.9rem' }}>
                        ${parseFloat(sale.profitAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sale.notes}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                          <span>{sale.notes || 'No closing notes logged.'}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
