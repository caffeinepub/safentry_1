import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BlacklistEntry {
    name: string;
    idNumber: string;
    addedAt: bigint;
    addedBy: string;
    category: string;
    reason: string;
    companyId: string;
}
export interface Staff {
    staffId: string;
    name: string;
    createdAt: bigint;
    role: StaffRole;
    companyId: string;
}
export interface Visitor {
    status: string;
    accessCardReturned: boolean;
    accessCardNumber?: string;
    arrivalTime: bigint;
    departureTime?: bigint;
    host: string;
    name: string;
    createdAt: bigint;
    visitorId: string;
    badgeExpired: boolean;
    company: string;
    idNumber: string;
    badgeQr: string;
    notes: string;
    category: string;
    phone: string;
    department: string;
    purpose: string;
    companyId: string;
}
export interface Appointment {
    id: string;
    status: AppointmentStatus;
    noShow: boolean;
    hostName: string;
    createdAt: bigint;
    createdBy: string;
    hostStaffId: string;
    hostApprovalStatus: HostApprovalStatus;
    appointmentDate: bigint;
    meetingRoomId: string;
    visitorId: string;
    appointmentTime: string;
    visitorName: string;
    notes: string;
    purpose: string;
    companyId: string;
}
export interface Company {
    loginCode: string;
    name: string;
    createdAt: bigint;
    sector: string;
    address: string;
    authorizedPerson: string;
    companyId: string;
}
export enum AppointmentStatus {
    cancelled = "cancelled",
    pending = "pending",
    approved = "approved"
}
export enum HostApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum StaffRole {
    admin = "admin",
    security = "security"
}
export interface backendInterface {
    addBlacklistEntry(entry: BlacklistEntry): Promise<void>;
    deleteAppointment(companyId: string, appointmentId: string): Promise<void>;
    getAppointments(companyId: string): Promise<Array<Appointment>>;
    getBlacklist(companyId: string): Promise<Array<BlacklistEntry>>;
    getCompanyById(companyId: string): Promise<Company | null>;
    getStaffByCompanyId(companyId: string): Promise<Array<Staff>>;
    getVisitors(companyId: string): Promise<Array<Visitor>>;
    loginCompany(loginCode: string): Promise<Company | null>;
    loginStaff(staffId: string, companyId: string): Promise<Staff | null>;
    registerCompany(companyId: string, loginCode: string, name: string, sector: string, address: string, authorizedPerson: string): Promise<Company>;
    registerStaff(staffId: string, companyId: string, name: string, role: StaffRole): Promise<Staff>;
    removeBlacklistEntry(companyId: string, idNumber: string): Promise<void>;
    saveAppointment(appointment: Appointment): Promise<void>;
    saveVisitor(v: Visitor): Promise<void>;
}
