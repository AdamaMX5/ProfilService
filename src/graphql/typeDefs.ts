export const typeDefs = `#graphql
  scalar JSON

  type GlobalProfile {
    id: ID!
    displayName: String!
    firstName: String!
    lastName: String!
    avatar: String!
    email: String!
    phone: String
    address: String
    matrixUsername: String
    createdAt: String!
    updatedAt: String!
  }

  input GlobalProfileInput {
    displayName: String
    firstName: String
    lastName: String
    avatar: String
    email: String
    phone: String
    address: String
    matrixUsername: String
  }

  type WorkingHours {
    from: String!
    to: String!
  }

  input WorkingHoursInput {
    from: String!
    to: String!
  }

  type VacationPeriod {
    from: String!
    to: String!
    note: String
  }

  input VacationPeriodInput {
    from: String!
    to: String!
    note: String
  }

  type VirtualOfficeProfile {
    id: ID!
    role: String!
    department: String!
    title: String
    status: OfficeStatus!
    availability: String
    workingHours: WorkingHours
    vacationPeriods: [VacationPeriod!]!
    createdAt: String!
    updatedAt: String!
  }

  enum OfficeStatus {
    ONLINE
    AWAY
    BUSY
    OFFLINE
  }

  input VirtualOfficeProfileInput {
    role: String
    department: String
    title: String
    status: OfficeStatus
    availability: String
    workingHours: WorkingHoursInput
    vacationPeriods: [VacationPeriodInput!]
  }

  type FreeSchoolProfile {
    id: ID!
    role: FreeSchoolRole!
    classes: [String!]!
    courses: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  enum FreeSchoolRole {
    TEACHER
    STUDENT
    PARENT
  }

  input FreeSchoolProfileInput {
    role: FreeSchoolRole
    classes: [String!]
    courses: [String!]
  }

  type Query {
    myGlobalProfile: GlobalProfile
    globalProfile(userId: ID!): GlobalProfile
    myVirtualOfficeProfile: VirtualOfficeProfile
    myFreeSchoolProfile: FreeSchoolProfile

    # Generic free-form profiles (privacy-enforced on foreign reads).
    profile(userId: ID!, prefix: String!): JSON
    myProfile(prefix: String!): JSON
    messangerProfile(userId: ID!): JSON
    myMessangerProfile: JSON
  }

  type Mutation {
    updateGlobalProfile(input: GlobalProfileInput!): GlobalProfile
    updateVirtualOfficeProfile(input: VirtualOfficeProfileInput!): VirtualOfficeProfile
    updateFreeSchoolProfile(input: FreeSchoolProfileInput!): FreeSchoolProfile

    # Create or update an owner-owned free-form profile (incl. its _privacy flags).
    updateProfile(prefix: String!, profile: JSON!): JSON
  }
`
