import List "mo:core/List";
import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  type OldActor = {
    companies : Map.Map<Text, { companyId : Text; loginCode : Text; name : Text; sector : Text; address : Text; authorizedPerson : Text; createdAt : Int }>;
    staff : Map.Map<Text, List.List<{ staffId : Text; companyId : Text; name : Text; role : { #admin; #security }; createdAt : Int }>>;
    visitors : Map.Map<Text, List.List<{ visitorId : Text; companyId : Text; name : Text; idNumber : Text; phone : Text; company : Text; purpose : Text; category : Text; department : Text; host : Text; arrivalTime : Int; departureTime : ?Int; status : Text; badgeQr : Text; badgeExpired : Bool; accessCardNumber : ?Text; accessCardReturned : Bool; notes : Text; createdAt : Int }>>;
    blacklists : Map.Map<Text, List.List<{ companyId : Text; idNumber : Text; name : Text; reason : Text; category : Text; addedAt : Int; addedBy : Text }>>;
  };

  type NewActor = {
    companies : Map.Map<Text, { companyId : Text; loginCode : Text; name : Text; sector : Text; address : Text; authorizedPerson : Text; createdAt : Int }>;
    staff : Map.Map<Text, List.List<{ staffId : Text; companyId : Text; name : Text; role : { #admin; #security }; createdAt : Int }>>;
    visitors : Map.Map<Text, List.List<{ visitorId : Text; companyId : Text; name : Text; idNumber : Text; phone : Text; company : Text; purpose : Text; category : Text; department : Text; host : Text; arrivalTime : Int; departureTime : ?Int; status : Text; badgeQr : Text; badgeExpired : Bool; accessCardNumber : ?Text; accessCardReturned : Bool; notes : Text; createdAt : Int }>>;
    blacklists : Map.Map<Text, List.List<{ companyId : Text; idNumber : Text; name : Text; reason : Text; category : Text; addedAt : Int; addedBy : Text }>>;
    appointments : Map.Map<Text, List.List<{
      id : Text;
      companyId : Text;
      visitorName : Text;
      visitorId : Text;
      hostName : Text;
      appointmentDate : Int;
      appointmentTime : Text;
      purpose : Text;
      notes : Text;
      status : { #pending; #approved; #cancelled };
      createdBy : Text;
      createdAt : Int;
      hostStaffId : Text;
      noShow : Bool;
      hostApprovalStatus : { #pending; #approved; #rejected };
      meetingRoomId : Text;
    }>>;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate existing state and initialize appointments as empty map.
    { old with appointments = Map.empty<Text, List.List<{
      id : Text;
      companyId : Text;
      visitorName : Text;
      visitorId : Text;
      hostName : Text;
      appointmentDate : Int;
      appointmentTime : Text;
      purpose : Text;
      notes : Text;
      status : { #pending; #approved; #cancelled };
      createdBy : Text;
      createdAt : Int;
      hostStaffId : Text;
      noShow : Bool;
      hostApprovalStatus : { #pending; #approved; #rejected };
      meetingRoomId : Text;
    }>>() };
  };
};
