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