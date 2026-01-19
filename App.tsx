
import React, { useState } from 'react';
import { AppView } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PhotoGenerator from './components/PhotoGenerator';
import PhotoA4Generator from './components/PhotoA4Generator';
import PrintMasterPro from './components/PrintMasterPro';
import ContractGenerator from './components/ContractGenerator';
import QRCodePlateGenerator from './components/QRCodePlateGenerator';
import LabelGenerator from './components/LabelGenerator';
import ResumeGenerator from './components/ResumeGenerator';
import SignGenerator from './components/SignGenerator';
import FinancialControl from './components/FinancialControl';
import SalesCostCalculator from './components/SalesCostCalculator';
import ReceiptGenerator from './components/ReceiptGenerator';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case AppView.PHOTO_3X4:
        return <PhotoGenerator />;
      case AppView.PHOTO_A4:
        return <PhotoA4Generator />;
      case AppView.PRINT_MASTER:
        return <PrintMasterPro />;
      case AppView.CONTRACT:
        return <ContractGenerator />;
      case AppView.QR_PLATE:
        return <QRCodePlateGenerator />;
      case AppView.LABEL_MAKER:
        return <LabelGenerator />;
      case AppView.RESUME:
        return <ResumeGenerator />;
      case AppView.SIGN_MAKER:
        return <SignGenerator />;
      case AppView.FINANCIAL_CONTROL:
        return <FinancialControl />;
      case AppView.SALES_COST:
        return <SalesCostCalculator />;
      case AppView.RECEIPT_GENERATOR:
        return <ReceiptGenerator />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onBack={() => setCurrentView(AppView.DASHBOARD)}
      onNavigate={setCurrentView}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
