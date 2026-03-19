export interface Staff {
    staffId: string;
    companyId: string;
    name: string;
    role: StaffRole;
    createdAt: bigint;
}

export interface Company {
    companyId: string;
    loginCode: string;
    name: string;
    sector: string;
    address: string;
    authorizedPerson: string;
    createdAt: bigint;
}

/** Simplified visitor record stored in backend (core fields only, all text) */
export interface BackendVisitor {
    visitorId: string;
    companyId: string;
    name: string;
    idNumber: string;
    phone: string;
    company: string;
    purpose: string;
    category: string;
    department: string;
    host: string;
    arrivalTime: bigint;
    departureTime: [] | [bigint];
    status: string;
    badgeQr: string;
    badgeExpired: boolean;
    accessCardNumber: [] | [string];
    accessCardReturned: boolean;
    notes: string;
    createdAt: bigint;
}

export interface BackendBlacklistEntry {
    companyId: string;
    idNumber: string;
    name: string;
    reason: string;
    category: string;
    addedAt: bigint;
    addedBy: string;
}

export enum StaffRole {
    admin = "admin",
    security = "security"
}

export interface backendInterface {
    registerCompany(companyId: string, loginCode: string, name: string, sector: string, address: string, authorizedPerson: string): Promise<Company>;
    loginCompany(loginCode: string): Promise<Company | null>;
    registerStaff(staffId: string, companyId: string, name: string, role: StaffRole): Promise<Staff>;
    loginStaff(staffId: string, companyId: string): Promise<Staff | null>;
    getCompanyById(companyId: string): Promise<Company | null>;
    getStaffByCompanyId(companyId: string): Promise<Array<Staff>>;
    saveVisitor(visitor: BackendVisitor): Promise<void>;
    getVisitors(companyId: string): Promise<Array<BackendVisitor>>;
    addBlacklistEntry(entry: BackendBlacklistEntry): Promise<void>;
    removeBlacklistEntry(companyId: string, idNumber: string): Promise<void>;
    getBlacklist(companyId: string): Promise<Array<BackendBlacklistEntry>>;
}
