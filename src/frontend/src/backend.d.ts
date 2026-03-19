import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Staff {
    staffId: string;
    name: string;
    createdAt: bigint;
    role: StaffRole;
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
export enum StaffRole {
    admin = "admin",
    security = "security"
}
export interface backendInterface {
    getCompanyById(companyId: string): Promise<Company | null>;
    getStaffByCompanyId(companyId: string): Promise<Array<Staff>>;
    loginCompany(loginCode: string): Promise<Company | null>;
    loginStaff(staffId: string, companyId: string): Promise<Staff | null>;
    registerCompany(companyId: string, loginCode: string, name: string, sector: string, address: string, authorizedPerson: string): Promise<Company>;
    registerStaff(staffId: string, companyId: string, name: string, role: StaffRole): Promise<Staff>;
}
