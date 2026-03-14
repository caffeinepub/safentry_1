# Safentry - Full Build

## Current State
- Frontend-only app: all data (companies, staff, visitors, blacklist) stored in localStorage
- No real backend integration; backend.d.ts has empty interface
- UI has dark navy theme with teal/amber accents, 10-language support
- Core flows exist: company register/login, staff register/login, visitor entry/exit, blacklist, announcements, stats
- PDF/QR visitor document is partially stubbed (QRCode component exists)
- Roles exist in types (admin/receptionist/staff) but not enforced

## Requested Changes (Diff)

### Add
- **Motoko backend**: persistent multi-tenant data storage for companies, staff, visitors, blacklist, announcements
- **Real authentication**: company login by 12-char code, staff login by 8-digit code via backend
- **PDF visitor badge**: client-side PDF generation with QR code, visitor info, digital signature, company name
- **GDPR/KVKK auto-deletion**: backend purges visitor records older than company's dataRetentionDays
- **Role-based access control**: Admin (full access) vs Receptionist/Staff (visitor entry/exit only)
- **Visitor rating system**: staff can rate visitor experience after departure
- **Blacklist reason tracking**: reason field, added-by, date on each entry

### Modify
- **store.ts**: replace localStorage calls with backend actor calls
- **CompanyDashboard**: wire to real backend data
- **StaffDashboard**: wire to real backend data
- **Visitor form**: trigger PDF download after successful entry
- **UI/UX**: polish glassmorphism cards, gradient stats, improved typography

### Remove
- All localStorage-based data persistence (keep session/lang in localStorage)

## Implementation Plan
1. Generate Motoko backend with: registerCompany, loginCompany, registerStaff, loginStaff, addVisitor, checkoutVisitor, listVisitors, addToBlacklist, removeFromBlacklist, isBlacklisted, addAnnouncement, listAnnouncements, purgeExpiredVisitors, getCompanyStats
2. Update backend.d.ts with full typed interface
3. Replace store.ts localStorage calls with backend actor calls (keep session/lang in localStorage)
4. Add client-side PDF generation (using jsPDF + QR canvas) for visitor badge
5. Enforce role-based UI: Admins see staff management + settings; Receptionists see only visitor entry/exit
6. Add GDPR purge trigger on company login
7. UI polish pass: gradient stats cards, glassmorphism forms, improved button styles
