
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PHOTO_3X4 = 'PHOTO_3X4',
  PHOTO_A4 = 'PHOTO_A4',
  PRINT_MASTER = 'PRINT_MASTER',
  CONTRACT = 'CONTRACT',
  QR_PLATE = 'QR_PLATE',
  LABEL_MAKER = 'LABEL_MAKER',
  RESUME = 'RESUME',
  SIGN_MAKER = 'SIGN_MAKER',
  FINANCIAL_CONTROL = 'FINANCIAL_CONTROL',
<<<<<<< HEAD
  SALES_COST = 'SALES_COST',
  DEDICATION = 'DEDICATION'
=======
  DEDICATION = 'DEDICATION',
  RECEIPT_GENERATOR = 'RECEIPT_GENERATOR'
>>>>>>> ef4c8085eb5615c0cd2c7935443abd16e6cf8f61
}

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
  photoBase64?: string;
}

export interface ContractData {
  landlordName: string;
  landlordNationality: string;
  landlordMaritalStatus: string;
  landlordProfession: string;
  landlordRg: string;
  landlordCpf: string;
  landlordAddress: string;
  
  tenantName: string;
  tenantNationality: string;
  tenantMaritalStatus: string;
  tenantProfession: string;
  tenantRg: string;
  tenantCpf: string;
  
  propertyAddress: string;
  propertyType: 'Residencial' | 'Comercial';
  rentAmount: string;
  paymentDay: string;
  guaranteeType: 'Caução' | 'Fiador' | 'Seguro Fiança' | 'Sem Garantia';
  guaranteeValue?: string;
  durationMonths: string;
  startDate: string;
  iptuResponsibility: 'Locador' | 'Locatário';
  customClauses?: string;
}
