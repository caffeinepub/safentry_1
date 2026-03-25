import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Int "mo:core/Int";

actor {
  type Company = {
    companyId : Text;
    loginCode : Text;
    name : Text;
    sector : Text;
    address : Text;
    authorizedPerson : Text;
    createdAt : Int;
  };

  type StaffRole = {
    #admin;
    #security;
  };

  type Staff = {
    staffId : Text;
    companyId : Text;
    name : Text;
    role : StaffRole;
    createdAt : Int;
  };

  type Visitor = {
    visitorId : Text;
    companyId : Text;
    name : Text;
    idNumber : Text;
    phone : Text;
    company : Text;
    purpose : Text;
    category : Text;
    department : Text;
    host : Text;
    arrivalTime : Int;
    departureTime : ?Int;
    status : Text;
    badgeQr : Text;
    badgeExpired : Bool;
    accessCardNumber : ?Text;
    accessCardReturned : Bool;
    notes : Text;
    createdAt : Int;
  };

  type BlacklistEntry = {
    companyId : Text;
    idNumber : Text;
    name : Text;
    reason : Text;
    category : Text;
    addedAt : Int;
    addedBy : Text;
  };

  type AppointmentStatus = {
    #pending;
    #approved;
    #cancelled;
  };

  type HostApprovalStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type Appointment = {
    id : Text;
    companyId : Text;
    visitorName : Text;
    visitorId : Text;
    hostName : Text;
    appointmentDate : Int;
    appointmentTime : Text;
    purpose : Text;
    notes : Text;
    status : AppointmentStatus;
    createdBy : Text;
    createdAt : Int;
    hostStaffId : Text;
    noShow : Bool;
    hostApprovalStatus : HostApprovalStatus;
    meetingRoomId : Text;
  };

  type Session = {
    token : Text;
    companyId : Text;
    staffId : Text;
    role : Text;
    createdAt : Int;
    lastActivity : Int;
  };

  type SessionInfo = {
    companyId : Text;
    staffId : Text;
    role : Text;
  };

  let SESSION_EXPIRY : Int = 1_800_000_000_000; // 30 minutes in nanoseconds

  let companies = Map.empty<Text, Company>();
  let staff = Map.empty<Text, List.List<Staff>>();
  let visitors = Map.empty<Text, List.List<Visitor>>();
  let blacklists = Map.empty<Text, List.List<BlacklistEntry>>();
  let appointments = Map.empty<Text, List.List<Appointment>>();
  let sessions = Map.empty<Text, Session>();

  // ── Session Management ───────────────────────────────────────────

  func generateToken(companyId : Text, staffId : Text, now : Int) : Text {
    companyId # "-" # staffId # "-" # now.toText();
  };

  public shared func createSession(companyId : Text, staffId : Text, role : Text) : async Text {
    let now = Time.now();
    let token = generateToken(companyId, staffId, now);
    let session : Session = {
      token;
      companyId;
      staffId;
      role;
      createdAt = now;
      lastActivity = now;
    };
    sessions.add(token, session);
    token;
  };

  public query func validateSession(token : Text) : async ?SessionInfo {
    switch (sessions.get(token)) {
      case (null) { null };
      case (?session) {
        let now = Time.now();
        if (now - session.lastActivity > SESSION_EXPIRY) {
          null;
        } else {
          ?{ companyId = session.companyId; staffId = session.staffId; role = session.role };
        };
      };
    };
  };

  public shared func refreshSession(token : Text) : async Bool {
    switch (sessions.get(token)) {
      case (null) { false };
      case (?session) {
        let now = Time.now();
        if (now - session.lastActivity > SESSION_EXPIRY) {
          sessions.remove(token);
          false;
        } else {
          let updated : Session = {
            token = session.token;
            companyId = session.companyId;
            staffId = session.staffId;
            role = session.role;
            createdAt = session.createdAt;
            lastActivity = now;
          };
          sessions.add(token, updated);
          true;
        };
      };
    };
  };

  public shared func deleteSession(token : Text) : async () {
    sessions.remove(token);
  };

  // ── Company Management ───────────────────────────────────────────

  public shared ({ caller }) func registerCompany(
    companyId : Text,
    loginCode : Text,
    name : Text,
    sector : Text,
    address : Text,
    authorizedPerson : Text,
  ) : async Company {
    let company : Company = {
      companyId;
      loginCode;
      name;
      sector;
      address;
      authorizedPerson;
      createdAt = Time.now();
    };
    companies.add(companyId, company);
    company;
  };

  public query ({ caller }) func loginCompany(loginCode : Text) : async ?Company {
    companies.values().find(func(c) { Text.equal(c.loginCode, loginCode) });
  };

  public shared ({ caller }) func registerStaff(
    staffId : Text,
    companyId : Text,
    name : Text,
    role : StaffRole,
  ) : async Staff {
    let staffMember : Staff = {
      staffId;
      companyId;
      name;
      role;
      createdAt = Time.now();
    };
    let existingStaff = staff.get(companyId);
    switch (existingStaff) {
      case (null) {
        let newList = List.empty<Staff>();
        newList.add(staffMember);
        staff.add(companyId, newList);
      };
      case (?list) {
        list.add(staffMember);
      };
    };
    staffMember;
  };

  public query ({ caller }) func loginStaff(staffId : Text, companyId : Text) : async ?Staff {
    switch (staff.get(companyId)) {
      case (null) { null };
      case (?staffList) {
        staffList.find(func(s) { Text.equal(s.staffId, staffId) });
      };
    };
  };

  public query ({ caller }) func getCompanyById(companyId : Text) : async ?Company {
    companies.get(companyId);
  };

  public query ({ caller }) func getStaffByCompanyId(companyId : Text) : async [Staff] {
    switch (staff.get(companyId)) {
      case (null) { [] };
      case (?staffList) { staffList.toArray() };
    };
  };

  // ── Visitor Management ──────────────────────────────────────────

  public shared ({ caller }) func saveVisitor(v : Visitor) : async () {
    let list = switch (visitors.get(v.companyId)) {
      case (null) { List.empty<Visitor>() };
      case (?l) { l };
    };
    let filtered = list.filter(func(x) { not Text.equal(x.visitorId, v.visitorId) });
    filtered.add(v);
    visitors.add(v.companyId, filtered);
  };

  public query ({ caller }) func getVisitors(companyId : Text) : async [Visitor] {
    switch (visitors.get(companyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  // ── Blacklist Management ─────────────────────────────────────────

  public shared ({ caller }) func addBlacklistEntry(entry : BlacklistEntry) : async () {
    let list = switch (blacklists.get(entry.companyId)) {
      case (null) { List.empty<BlacklistEntry>() };
      case (?l) { l };
    };
    let filtered = list.filter(func(x) { not Text.equal(x.idNumber, entry.idNumber) });
    filtered.add(entry);
    blacklists.add(entry.companyId, filtered);
  };

  public shared ({ caller }) func removeBlacklistEntry(companyId : Text, idNumber : Text) : async () {
    switch (blacklists.get(companyId)) {
      case (null) {};
      case (?list) {
        let filtered = list.filter(func(x) { not Text.equal(x.idNumber, idNumber) });
        blacklists.add(companyId, filtered);
      };
    };
  };

  public query ({ caller }) func getBlacklist(companyId : Text) : async [BlacklistEntry] {
    switch (blacklists.get(companyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  // ── Appointment Management ───────────────────────────────────────

  public shared ({ caller }) func saveAppointment(appointment : Appointment) : async () {
    let list = switch (appointments.get(appointment.companyId)) {
      case (null) { List.empty<Appointment>() };
      case (?l) { l };
    };
    let filtered = list.filter(func(x) { not Text.equal(x.id, appointment.id) });
    filtered.add(appointment);
    appointments.add(appointment.companyId, filtered);
  };

  public query ({ caller }) func getAppointments(companyId : Text) : async [Appointment] {
    switch (appointments.get(companyId)) {
      case (null) { [] };
      case (?list) { list.toArray() };
    };
  };

  public shared ({ caller }) func deleteAppointment(companyId : Text, appointmentId : Text) : async () {
    switch (appointments.get(companyId)) {
      case (null) {};
      case (?list) {
        let filtered = list.filter(func(x) { not Text.equal(x.id, appointmentId) });
        appointments.add(companyId, filtered);
      };
    };
  };
};
