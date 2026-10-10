import React, { useState } from 'react';
import { IMSProvider, useIMS } from './context/IMSContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ToastContainer from './components/common/ToastContainer';

// Dashboard
import DashboardView from './components/dashboard/DashboardView';

// Inventory
import ProductsView from './components/inventory/ProductsView';
import StockOverviewView from './components/inventory/StockOverviewView';
import StockSummaryView from './components/inventory/StockSummaryView';
import StockLedgerView from './components/inventory/StockLedgerView';

// Purchase
import PurchaseRequestsView from './components/purchase/PurchaseRequestsView';
import PurchaseOrdersView from './components/purchase/PurchaseOrdersView';
import GoodsReceiptsView from './components/purchase/GoodsReceiptsView';
import SupplierBillsView from './components/purchase/SupplierBillsView';
import PurchaseReturnsView from './components/purchase/PurchaseReturnsView';
import SuppliersView from './components/purchase/SuppliersView';

// Sales
import QuotationsView from './components/sales/QuotationsView';
import SalesOrdersView from './components/sales/SalesOrdersView';
import DeliveriesView from './components/sales/DeliveriesView';
import InvoicesView from './components/sales/InvoicesView';
import SalesReturnsView from './components/sales/SalesReturnsView';
import CustomersView from './components/sales/CustomersView';

// Reports
import ReportsView from './components/reports/ReportsView';

// Modals
import OrderModal from './components/modals/OrderModal';
import DocumentModal from './components/modals/DocumentModal';
import QuotationPreviewModal from './components/modals/QuotationPreviewModal';
import ReceiveGoodsModal from './components/modals/ReceiveGoodsModal';
import PaymentModal from './components/modals/PaymentModal';
import ReturnModal from './components/modals/ReturnModal';
import ProductModal from './components/modals/ProductModal';
import PartyModal from './components/modals/PartyModal';
import StockAdjustModal from './components/modals/StockAdjustModal';
import ConfirmModal from './components/modals/ConfirmModal';

function AppContent() {
  const {
    currentRoute,
    toasts,
    activeDocId,
    closeDoc,
    orderModal,
    setOrderModal,
    receiveModal,
    setReceiveModal,
    paymentModal,
    setPaymentModal,
    returnModal,
    setReturnModal,
    productModal,
    setProductModal,
    partyModal,
    setPartyModal,
    stockAdjustModal,
    setStockAdjustModal,
    quotePreviewId,
    setQuotePreviewId,
    confirmDialog,
    setConfirmDialog
  } = useIMS();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [mainRoute, subParam] = currentRoute.split('/');

  const renderView = () => {
    switch (mainRoute) {
      case 'dashboard':
        return <DashboardView />;
      case 'item-master':
      case 'products':
        return <ProductsView />;
      case 'inventory-stock':
        return <StockOverviewView />;
      case 'stock-summary':
        return <StockSummaryView />;
      case 'inventory-ledger':
        return <StockLedgerView />;

      case 'purchase-requests':
        return <PurchaseRequestsView />;
      case 'purchase-orders':
        return <PurchaseOrdersView />;
      case 'purchase-grn':
        return <GoodsReceiptsView />;
      case 'purchase-bills':
        return <SupplierBillsView />;
      case 'purchase-returns':
        return <PurchaseReturnsView />;
      case 'suppliers':
        return <SuppliersView />;

      case 'quotations':
        return <QuotationsView />;
      case 'sales-orders':
        return <SalesOrdersView />;
      case 'sales-deliveries':
        return <DeliveriesView />;
      case 'sales-invoices':
        return <InvoicesView />;
      case 'sales-returns':
        return <SalesReturnsView />;
      case 'customers':
        return <CustomersView />;

      case 'reports':
        return <ReportsView subType={subParam || 'sales'} />;

      default:
        return <DashboardView />;
    }
  };

  return (
    <div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="view">{renderView()}</main>
      </div>

      {/* Global Modals */}
      <OrderModal
        open={orderModal.open}
        type={orderModal.type}
        onClose={() => setOrderModal({ open: false, type: 'PO' })}
      />

      <DocumentModal docId={activeDocId} onClose={closeDoc} />

      <QuotationPreviewModal
        quoteId={quotePreviewId}
        onClose={() => setQuotePreviewId(null)}
      />

      <ReceiveGoodsModal
        open={receiveModal.open}
        poId={receiveModal.poId}
        onClose={() => setReceiveModal({ open: false, poId: null })}
      />

      <PaymentModal
        open={paymentModal.open}
        kind={paymentModal.kind}
        id={paymentModal.id}
        onClose={() => setPaymentModal({ open: false, kind: 'inv', id: null })}
      />

      <ReturnModal
        open={returnModal.open}
        kind={returnModal.kind}
        id={returnModal.id}
        onClose={() => setReturnModal({ open: false, kind: 'P', id: null })}
      />

      <ProductModal
        open={productModal.open}
        sku={productModal.sku}
        onClose={() => setProductModal({ open: false, sku: null })}
      />

      <PartyModal
        open={partyModal.open}
        type={partyModal.type}
        id={partyModal.id}
        onClose={() => setPartyModal({ open: false, type: 'sup', id: null })}
      />

      <StockAdjustModal
        open={stockAdjustModal.open}
        sku={stockAdjustModal.sku}
        onClose={() => setStockAdjustModal({ open: false, sku: null })}
      />

      <ConfirmModal
        open={confirmDialog.open}
        msg={confirmDialog.msg}
        label={confirmDialog.label}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ open: false, msg: '', onConfirm: null, label: 'Confirm' })}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <IMSProvider>
      <AppContent />
    </IMSProvider>
  );
}
