# UK Adjusted Net Income Calculator

A browser-based tool to calculate Adjusted Net Income (ANI) for a given tax year. You can compare different scenarios within a tax year, or compare multiple years against each other.

## Overview

This tool is designed to be self-hosted. The first user to sign up will automatically become an admin. Admins can make other users admins, reset passwords and force password resets.  

Data is saved to a SQL database.  Distribution is via compose files for Docker and Podman.

For a verbose description of the application and its componenets, see [HLD.md](docs/HLD.md)

## Disclaimer

This tool has been made using Claude. You should not rely on the accuracy of this tool without running your own validation of the outputs. It has been tested by Claude. There is no gaurantee of results provided. Use at your own risk.

## Usage

### From a release (recommended)

1. Go to the [Releases](https://github.com/alphanumeric-hue/adjusted-net-income-calculator/releases) page and download `docker-compose.yml` and `.env.example` from the latest release into an empty directory. The compose file is pre-configured to pull the matching versioned images from GHCR.
2. Copy `.env.example` to `.env` and open it — at minimum change `SESSION_SECRET` to a long random string.
3. Start the app:

```bash
docker compose up -d
# Access at http://localhost
```

### From source

```bash
# 1. Clone the repository
git clone https://github.com/alphanumeric-hue/adjusted-net-income-calculator.git
cd adjusted-net-income-calculator

# 2. Set up environment
cp .env.example .env
# Edit .env — at minimum, change SESSION_SECRET to a long random string

# 3. Build and start (tests run automatically as part of the build)
docker compose up -d --build

# Access at http://localhost
```

### Stopping the app

```bash
# Stop (data persists in pgdata volume)
docker compose down

# Stop and destroy all data
docker compose down -v
```

## Claude

The following Claude Code integrations have been used to build this application...

### Agents

- backend-developer: To make changes within `./backend`
- frontend-developer: To make changes within `./frontend`
- tax-specialist: To seek and provide up to date information from HMRC relating to ANI. It will also provide test scenarios for known inputs to validate expected outputs

### Skills

- claude-driven-test: Refers to the `tax-specialist` agent for test scenarios, then starts and accesses the application in Chrome to input the known values and checks the outputs. Results are summarised to the user at the end. This skill is dependent on the Claude Chrome integration
- restart-ani: Lazy way to restart the application