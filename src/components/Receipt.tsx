import { forwardRef } from 'react';
import type { Order, Payment } from '@/types/pos';

interface ReceiptProps {
  order: Order;
  payments?: Payment[];
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  waiterName?: string;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ order, payments = [], branchName = 'Restaurant POS', branchAddress, branchPhone, waiterName }, ref) => {
    const orderItems = (order as any).order_items || [];
    const tableNumber = (order as any).table?.table_number;
    const customerName = (order as any).customer_name;
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    
    const totalAmount = Number(order.total_amount) || 0;
    const discountAmount = Number(order.discount_amount) || 0;

    // Calculate items total (without tax)
    const itemsTotal = orderItems.reduce((sum: number, item: any) => 
      sum + (Number(item.total_price) || 0), 0);

    // Inline styles for print compatibility
    const styles = {
      container: {
        backgroundColor: 'white',
        color: 'black',
        padding: '24px',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '12px',
        width: '280px',
        margin: '0 auto',
        lineHeight: '1.4',
      },
      header: {
        textAlign: 'center' as const,
        borderBottom: '1px dashed #999',
        paddingBottom: '16px',
        marginBottom: '16px',
      },
      title: {
        fontSize: '16px',
        fontWeight: 'bold',
        margin: '0 0 4px 0',
      },
      subtitle: {
        fontSize: '10px',
        margin: '2px 0',
        color: '#444',
      },
      section: {
        borderBottom: '1px dashed #999',
        paddingBottom: '12px',
        marginBottom: '12px',
      },
      orderNumber: {
        fontSize: '14px',
        fontWeight: 'bold',
        textAlign: 'center' as const,
        marginBottom: '8px',
      },
      row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '11px',
      },
      itemRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '11px',
      },
      itemName: {
        flex: 1,
        marginRight: '8px',
      },
      totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontWeight: 'bold',
        fontSize: '14px',
        borderTop: '1px solid #333',
        paddingTop: '8px',
        marginTop: '8px',
      },
      discountRow: {
        display: 'flex',
        justifyContent: 'space-between',
        color: '#228B22',
        marginBottom: '4px',
        fontSize: '11px',
      },
      paymentSection: {
        borderTop: '1px dashed #999',
        marginTop: '16px',
        paddingTop: '12px',
      },
      footer: {
        textAlign: 'center' as const,
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px dashed #999',
        fontSize: '11px',
      },
      label: {
        fontWeight: 'bold',
      },
    };

    return (
      <div ref={ref} style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{branchName}</h1>
          {branchAddress && <p style={styles.subtitle}>{branchAddress}</p>}
          {branchPhone && <p style={styles.subtitle}>Tel: {branchPhone}</p>}
          <div style={{ marginTop: '8px' }}>
            <p style={styles.subtitle}>Date: {createdAt.toLocaleDateString()}</p>
            <p style={styles.subtitle}>Time: {createdAt.toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Order Info */}
        <div style={styles.section}>
          <p style={styles.orderNumber}>
            #{order.order_number || order.id.slice(-8).toUpperCase()}
          </p>
          {customerName && (
            <div style={styles.row}>
              <span style={styles.label}>Customer:</span>
              <span>{customerName}</span>
            </div>
          )}
          {tableNumber && (
            <div style={styles.row}>
              <span style={styles.label}>Table:</span>
              <span>{tableNumber}</span>
            </div>
          )}
          {waiterName && (
            <div style={styles.row}>
              <span style={styles.label}>Served by:</span>
              <span>{waiterName}</span>
            </div>
          )}
        </div>

        {/* Items Header */}
        <div style={{ ...styles.row, fontWeight: 'bold', marginBottom: '8px' }}>
          <span>Item</span>
          <span>Total</span>
        </div>

        {/* Items */}
        <div style={styles.section}>
          {orderItems.map((item: any) => (
            <div key={item.id} style={styles.itemRow}>
              <span style={styles.itemName}>
                {item.quantity}x {item.menu_item?.name || 'Item'}
              </span>
              <span>{Number(item.total_price).toFixed(3)} OMR</span>
            </div>
          ))}
        </div>

        {/* Totals - No tax display per user request */}
        <div>
          {discountAmount > 0 && (
            <>
              <div style={styles.row}>
                <span>Subtotal:</span>
                <span>{itemsTotal.toFixed(3)} OMR</span>
              </div>
              <div style={styles.discountRow}>
                <span>Discount:</span>
                <span>-{discountAmount.toFixed(3)} OMR</span>
              </div>
            </>
          )}
          <div style={styles.totalRow}>
            <span>TOTAL:</span>
            <span>{totalAmount.toFixed(3)} OMR</span>
          </div>
        </div>

        {/* Payment Info */}
        {payments.length > 0 && (
          <div style={styles.paymentSection}>
            <p style={{ ...styles.label, marginBottom: '8px', fontSize: '11px' }}>Payment Details:</p>
            {payments.map((payment) => (
              <div key={payment.id} style={styles.row}>
                <span style={{ textTransform: 'capitalize' }}>{payment.payment_method}</span>
                <span>{Number(payment.amount).toFixed(3)} OMR</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          {customerName && <p style={{ fontWeight: 500, marginBottom: '8px' }}>Thank you, {customerName}!</p>}
          <p>Thank you for your visit!</p>
          <p style={{ marginTop: '4px' }}>Please come again</p>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
