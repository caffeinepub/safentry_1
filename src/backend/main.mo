import Map "mo:core/Map";
import List "mo:core/List";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Migration "migration";
import Iter "mo:core/Iter";

(with migration = Migration.run)
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

  // Use persistent Map data structure for storing companies and staff lists
  let companies = Map.empty<Text, Company>();
  let staff = Map.empty<Text, List.List<Staff>>();

  func arrayToList<K, V>(map : Map.Map<K, V>) : List.List<{ key : K; value : V }> {
    let iter = map.entries();
    let result = List.empty<{ key : K; value : V }>();
    iter.forEach(
      func((k, v)) {
        result.add({ key = k; value = v });
      }
    );
    result;
  };

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
    let result = companies.values().find(
      func(c) {
        Text.equal(c.loginCode, loginCode);
      }
    );
    result;
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
        staffList.find(
          func(s) { Text.equal(s.staffId, staffId) }
        );
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
};
