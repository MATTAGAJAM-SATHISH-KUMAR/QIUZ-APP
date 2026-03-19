// ============================================================================
// User Service — User profile management (auth is handled by SAP XSUAA)
// ============================================================================
using { quiz.app as db } from '../db/schema';

service UserService @(path: '/api/user') {

  // Get current user profile from XSUAA token + DB enrichment
  function me() returns UserProfile;

  // Update own profile
  action updateProfile(
    firstName: String,
    lastName: String,
    avatarUrl: String
  ) returns UserProfile;

  type UserProfile {
    id        : UUID;
    email     : String;
    firstName : String;
    lastName  : String;
    role      : String;
    tenantId  : UUID;
    tenantName: String;
  }
}
