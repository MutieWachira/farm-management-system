# Changelog

All notable changes to AgriCore are documented in this file.

The project follows Semantic Versioning:

- MAJOR: incompatible changes
- MINOR: new functionality
- PATCH: backwards-compatible fixes

# AgriCore

AgriCore is a modern farm management system designed to help farmers and farm managers manage agricultural operations, resources, finances, livestock, crops, inventory, and analytics.

## Architecture

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic



# [0.1.0] - 2026-08-27

### Added

- Initialized AgriCore repository.
- Created monorepo structure.
- Added FastAPI backend.
- Added Next.js frontend.
- Added Python virtual environment.
- Added PostgreSQL development database.
- Added SQLAlchemy.
- Added Alembic migrations.
- Created initial User model.
- Created Farm model.
- Created FarmMembership model.
- Created Field model.
- Added API health-check endpoint.
- Added initial project documentation.
- Added Git configuration.

## [0.1.1] - 2026-08-28

### Added

- Added Docker Compose PostgreSQL development environment.
- Added FarmRole enum.
- Added database health check configuration.
- Added automated API health test.
- Added database schema constraints.
- Added farm membership uniqueness constraint.
- Added database indexes for farm memberships.
- Added positive-value validation for farm and field areas.
- Added application version module.

### Changed

- Improved farm and field measurement precision.
- Improved timestamp handling.
- Updated farm membership roles to use a controlled enum.
- Standardized local PostgreSQL development around Docker.

### Security

- Kept database credentials outside source-controlled files.
- Added `.env.example` for safe environment configuration.

## [0.2.0] - 2026-08-28  15:30

### Added

- Added user registration.
- Added user login.
- Added JWT access tokens.
- Added JWT refresh tokens.
- Added authenticated `/me` endpoint.
- Added Argon2 password hashing.
- Added authentication configuration.
- Added authentication dependencies.
- Added user repository.
- Added authentication service.
- Added login and registration schemas.
- Added account activation status.
- Added authentication unit tests.

### Changed

- Updated the User model with `is_active`.
- Updated application configuration to support JWT settings.
- Updated API version configuration to `0.2.0`.

### Security

- Passwords are never stored in plaintext.
- Password hashes are never returned through API responses.
- Access tokens are short-lived.
- Authentication errors avoid unnecessarily revealing account information.
- JWT secrets are loaded from environment variables.
- Authentication endpoints validate incoming data.

## [0.2.1] - 2026-08-28

### Added

- Added server-side refresh token sessions.
- Added refresh token hashing.
- Added refresh token rotation.
- Added refresh token revocation.
- Added logout endpoint.
- Added refresh endpoint.
- Added authentication API client to Next.js.
- Added login page.
- Added registration page.
- Added authenticated dashboard.
- Added frontend authentication types.
- Added frontend environment configuration.

### Changed

- Changed refresh tokens from long-lived JWTs to server-tracked opaque tokens.
- Updated authentication service to support token rotation.
- Updated frontend architecture to communicate with the FastAPI API.

### Security

- Refresh tokens are stored as SHA-256 hashes.
- Refresh tokens can be revoked.
- Refresh tokens are rotated after use.
- Authentication secrets remain environment-based.
- Passwords continue to use Argon2 hashing.
- Frontend does not receive password hashes.

## [0.3.0] - 2026-09-21

### Added

- Added Farm domain model.
- Added Farm database migration.
- Added Farm creation API.
- Added Farm listing API.
- Added Farm retrieval API.
- Added Farm update API.
- Added Farm deletion API.
- Added Farm service layer.
- Added Farm repository.
- Added Farm request and response schemas.
- Added farm ownership authorization.
- Added frontend Farm types.
- Added frontend Farm API client.
- Added My Farms page.
- Added farm creation form.
- Added farm listing UI.
- Connected dashboard farm count to the backend.

### Security

- Farm resources are protected by authentication.
- Farm access is restricted to the authenticated farm owner.
- Users cannot access another user's farm by changing the farm ID.
- Unauthorized farm resources return a non-disclosing 404 response.
- Farm ownership is enforced server-side rather than relying on frontend restrictions.

### Testing

- Added Farm API test coverage.
- Added ownership authorization test coverage.
- Added validation tests for Farm input.
- Verified frontend production build.

## [0.4.0] - 2026-09-13

### Added

- Added FarmMembership domain model.
- Added FarmRole enumeration.
- Added OWNER, MANAGER, WORKER and VIEWER roles.
- Added farm membership database migration.
- Added automatic OWNER membership when creating a farm.
- Added farm member repository.
- Added farm member service.
- Added farm member API endpoints.
- Added member listing.
- Added member addition.
- Added member role management.
- Added member removal.
- Added frontend farm-member types.
- Added frontend membership API client.
- Added farm members management UI.

### Security

- Added server-side farm membership authorization.
- Restricted member management to farm owners.
- Prevented managers, workers and viewers from modifying memberships.
- Prevented removal or reassignment of the farm owner.
- Prevented duplicate farm memberships.
- Farm membership access remains protected by authentication.

### Testing

- Added farm membership authorization tests.
- Added role permission tests.
- Added duplicate membership tests.
- Added owner protection tests.
- Added frontend lint and production build checks.

## [0.5.0] - 2026-09-15

### Added

- Added Field domain model for managing individual farm fields.
- Added Field status lifecycle:
  - ACTIVE
  - FALLOW
  - INACTIVE
- Added Field-to-Farm relationship.
- Added database migration for the `fields` table.
- Added Field Pydantic schemas for creation, updates, and responses.
- Added Field repository layer.
- Added Field service layer.
- Added Field API endpoints for:
  - Creating fields
  - Listing fields
  - Retrieving a field
  - Updating fields
  - Deleting fields
- Added Field frontend types and API client.
- Added Field management page.
- Added Field creation and editing functionality.
- Added Field deletion functionality.
- Added Field status display.
- Added responsive Field management UI using Next.js and Tailwind CSS.

### Security

- Restricted Field creation, updating, and deletion to farm owners and managers.
- Allowed authorized farm members to view fields.
- Enforced farm membership before allowing Field access.
- Prevented users from accessing fields belonging to farms where they are not members.
- Added field-to-farm ownership checks for individual Field operations.
- Maintained backend authorization as the authoritative security boundary.

### Validation

- Added Field name length validation.
- Added positive `area_hectares` validation.
- Added maximum area validation.
- Added soil type length validation.
- Added description length validation.
- Added Field status validation.

### Testing

- Added Field API tests covering:
  - Owner field creation
  - Manager field creation
  - Worker creation rejection
  - Viewer creation rejection
  - Owner field listing
  - Manager field listing
  - Worker field listing
  - Viewer field listing
  - Field retrieval
  - Field updating
  - Field deletion
  - Cross-farm access protection
  - Input validation
  - Unauthenticated access

### Frontend

- Added Field management navigation from the Farm management interface.
- Added responsive Field cards and management controls.
- Added Field status badges.
- Added Field information display including:
  - Field name
  - Area
  - Soil type
  - Status
  - Description
- Added navigation from Fields to Crop management.

### Maintenance

- Completed Field management implementation across backend and frontend.
- Established the Field foundation for the Crop management module.

## [0.6.0] - 2026-09-15

### Added

- Added Crop domain model with crop lifecycle statuses:
  - PLANNED
  - PLANTED
  - GROWING
  - HARVESTED
  - FAILED
  - CANCELLED
- Added Crop database migration.
- Added Crop-to-Field relationship.
- Added Crop Pydantic schemas for creation, updates, and responses.
- Added Crop repository layer.
- Added Crop service layer.
- Added Crop API endpoints for:
  - Creating crops
  - Listing crops
  - Retrieving a crop
  - Updating crops
  - Deleting crops
- Added farm membership authorization for Crop operations.
- Added Crop frontend types and API client.
- Added Crop management page.
- Added Create Crop form.
- Added Edit Crop functionality.
- Added Delete Crop functionality.
- Added crop status display and production summaries.
- Added client-side Crop form validation.
- Added loading, error, and saving states.

### Security

- Restricted Crop creation, updating, and deletion to farm owners and managers.
- Allowed farm members with valid membership to read crops.
- Enforced field ownership through farm membership authorization.
- Prevented cross-field and cross-farm Crop access.
- Maintained backend validation as the authoritative security boundary.

### Testing

- Added Crop API tests covering:
  - Owner creation
  - Manager creation
  - Worker creation rejection
  - Viewer creation rejection
  - Owner listing
  - Manager listing
  - Worker listing
  - Viewer listing
  - Owner updating
  - Manager updating
  - Worker updating rejection
  - Viewer updating rejection
  - Owner deletion
  - Manager deletion
  - Worker deletion rejection
  - Viewer deletion rejection
  - Cross-farm access protection
  - Input validation
  - Unauthenticated access

### Frontend

- Added responsive Crop management UI using Next.js and Tailwind CSS.
- Added reusable Create/Edit Crop form behavior.
- Added user-friendly validation and API error handling.
- Added Crop management navigation from the Field page.

### Maintenance

- Completed Crop feature implementation across backend and frontend.
- Updated project version to v0.6.0.

## [0.7.0] - 2026-10-13

# Added

- Introduced the Farm Activities feature for recording and tracking farm operations.
- Added support for the following activity types:
    - Planting
    - Irrigation
    - Fertilization
    - Spraying
    - Weeding
    - Pest control
    - Harvesting
    - Land preparation
    - Maintenance
    - Other activities
- Added activity details, including title, date, description, quantity, unit, and cost.
- Added optional associations between activities, farms, fields, and crops.
- Added backend API endpoints for creating, listing, retrieving, updating, and deleting farm activities.
- Added request and response schemas for activity data validation.
- Added repository and service layers for farm activity operations.
- Added farm membership and role-based permission checks for activity management.
- Added validation to ensure associated fields and crops belong to the correct farm.
- Added a frontend page for recording, viewing, editing, and deleting farm activities.
- Added activity history, loading states, empty states, success messages, error messages, and activity cost summaries.
- Added frontend validation for required fields, quantities, and costs.

# Security
- Restricted activity creation, updating, and deletion to authorized farm managers and owners.
- Restricted activity access to authorized farm members.
- Added farm-scoped activity retrieval to prevent access to activities belonging to another farm.
- Added validation for field and crop associations.
- Validation and Testing
- Planned API tests for permissions, farm isolation, invalid inputs, and activity CRUD operations.
- Planned frontend checks using TypeScript, linting, and a production build.

# Notes
- Activity costs represent recorded costs and are not a complete farm accounting or profit calculation.
- Automated tests, migration verification, and production-build checks must pass before this release is considered complete.

# [0.8.0] - 2026-10-15

# Added

- Added inventory item schemas for creating, updating, and returning inventory records.
- Added inventory item repository operations for creation, retrieval, filtering, searching, updating, and deactivation.
- Added inventory transaction repository for recording and retrieving stock movements.
- Added inventory service logic for stock receipts, stock usage, and positive or negative stock adjustments.
- Added stock validation to prevent transactions that would result in a negative inventory balance.
- Added database row locking for inventory updates to help prevent conflicting concurrent stock movements.
- Added farm-scoped inventory API endpoints for listing, creating, retrieving, updating, and deactivating inventory items.
- Added endpoints for recording and retrieving transactions for individual inventory items.
- Added TypeScript inventory types and request interfaces.
- Added a frontend inventory API client with authenticated requests, query filtering, and inventory transaction support.
- Started the inventory management page for stock monitoring, item creation, stock movements, and transaction history.

# Changed
- Changed inventory creation so initial stock is introduced through a transaction rather than by directly setting the stock balance.
- Organized inventory functionality into models, schemas, repositories, services, and API routes.
- Kept inventory operations scoped to the relevant farm and subject to backend authorization checks.

# Fixed
- Fixed TypeScript filter-query typing in the inventory API client by making the query builder generic.
- Verified that the inventory API routes appear in the FastAPI OpenAPI schema.
- Verified that the frontend TypeScript check passes after the query-builder correction.

# Notes
- Frontend functional testing and the production build must be completed before declaring this release production-ready.
- Database migration status and automated inventory integration-test results should be verified before release.

# v0.9.0 — 2026-10-15

# Added — Livestock Management
- Added livestock data model and database migration.
- Added livestock schemas for creating, updating, and returning livestock records.
- Added repository and service layers for livestock data access and business logic.
- Added livestock API endpoints for creating, listing, retrieving, and updating records.
- Added farm-scoped livestock access and permission checks.
- Added the livestock frontend page at frontend/src/app/user/farms/[farmId]/livestock/page.tsx.
- Added livestock registration and editing forms.
- Added livestock overview statistics and record listing.
- Added search and filtering by species and status.
- Added support for Active, Sold, Deceased, and Missing statuses.

# Validation
- Backend compilation and API route registration checks passed, if confirmed during testing.
- Frontend TypeScript checks passed, if confirmed during testing.
- Record any additional automated or manual tests completed for this release.

# Notes
- Livestock deletion and dedicated livestock transaction/history tracking are not included in this entry.
- Keep the changelog updated as additional features and fixes are implemented.