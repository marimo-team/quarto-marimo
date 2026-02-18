#!/bin/bash
set -e

# Colors and formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_step() {
  echo -e "\n${BOLD}${GREEN}=== $1 ===${NC}\n"
}

print_info() {
  echo -e "${CYAN}$1${NC}"
}

print_warning() {
  echo -e "${YELLOW}WARNING: $1${NC}"
}

print_error() {
  echo -e "${RED}ERROR: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

confirm() {
  echo -e -n "${BOLD}$1 (y/N) ${NC}"
  read -r response
  [[ "$response" == "y" ]]
}

# Header
echo -e "${BOLD}${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║   quarto-marimo extension release script ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Change to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
print_info "Project root: $PROJECT_ROOT"

# Check if version type is provided
if [ -z "$1" ]; then
  echo -e "\nAvailable version types:"
  echo "  - minor (0.x.0)"
  echo "  - patch (0.0.x)"
  print_error "Please specify version type: ./scripts/release.sh <minor|patch>"
  exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(minor|patch)$ ]]; then
  print_error "Invalid version type. Use: minor or patch"
  exit 1
fi

# Check if on main branch
print_step "Checking git branch"
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  print_error "Not on main branch. Current branch: $BRANCH"
  echo "Please run: git checkout main"
  exit 1
fi
print_success "On main branch"

# Check git state
print_step "Checking git status"
if [ -n "$(git status --porcelain)" ]; then
  print_error "Git working directory is not clean"
  echo "Please commit or stash your changes first:"
  git status --short
  exit 1
fi
print_success "Working directory is clean"

# Pull latest changes
print_step "Pulling latest changes"
git pull origin main
print_success "Up to date with origin/main"

# Run tests
print_step "Running tests"
if ! make test; then
  print_error "Tests failed! Fix tests before releasing."
  exit 1
fi
print_success "All tests passed"

# Run linting
print_step "Running linting"
if ! make lint; then
  print_error "Linting failed! Fix lint errors before releasing."
  exit 1
fi
print_success "Linting passed"

# Build to verify it works
print_step "Building engine bundle"
make build
print_success "Engine bundle built successfully"

# Get current version
CURRENT_VERSION=$(grep '^version:' _extensions/marimo/_extension.yml | sed 's/.*: *//')
print_info "Current version: $CURRENT_VERSION"

# Calculate new version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

if [ "$VERSION_TYPE" == "minor" ]; then
  MINOR=$((MINOR + 1))
  PATCH=0
elif [ "$VERSION_TYPE" == "patch" ]; then
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
print_info "New version: $NEW_VERSION"

# Summary and confirmation
echo -e "\n${BOLD}Release Summary:${NC}"
echo "  • Current Version: $CURRENT_VERSION"
echo "  • New Version: $NEW_VERSION"
echo "  • Version Type: $VERSION_TYPE"
echo "  • Files to be modified:"
echo "    - _extensions/marimo/_extension.yml"
echo "    - _extensions/marimo/extract.py"
echo "    - _extensions/marimo/marimo-engine.js"

if ! confirm "Proceed with release?"; then
  print_warning "Release cancelled"
  exit 1
fi

# Update version in all files
print_step "Updating version"
sed -i.bak "s/^version: $CURRENT_VERSION/version: $NEW_VERSION/" _extensions/marimo/_extension.yml
rm -f _extensions/marimo/_extension.yml.bak
sed -i.bak "s/__version__ = \"$CURRENT_VERSION\"/__version__ = \"$NEW_VERSION\"/" _extensions/marimo/extract.py
rm -f _extensions/marimo/extract.py.bak
sed -i.bak "s/const VERSION = \"$CURRENT_VERSION\"/const VERSION = \"$NEW_VERSION\"/" _extensions/marimo/marimo-engine.js
rm -f _extensions/marimo/marimo-engine.js.bak
print_success "Version updated to $NEW_VERSION in _extension.yml, extract.py, and marimo-engine.js"

# Commit version change
print_step "Committing version change"
git add _extensions/marimo/_extension.yml _extensions/marimo/extract.py _extensions/marimo/marimo-engine.js
git commit -m "release: v$NEW_VERSION"
print_success "Version change committed"

# Push changes
if confirm "Push changes to remote?"; then
  git push origin main
  print_success "Changes pushed successfully"
else
  print_warning "Changes not pushed. Run 'git push origin main' manually."
fi

# Create and push tag
if confirm "Create and push tag v$NEW_VERSION?"; then
  git tag -a "v$NEW_VERSION" -m "release: v$NEW_VERSION"
  git push origin "v$NEW_VERSION"
  print_success "Tag v$NEW_VERSION pushed successfully"
else
  print_warning "Tag not created. Run 'git tag -a v$NEW_VERSION -m \"release: v$NEW_VERSION\" && git push origin v$NEW_VERSION' manually."
fi

# Final success message
echo -e "\n${BOLD}${GREEN}Release v$NEW_VERSION completed successfully!${NC}\n"
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Monitor the release workflow:"
echo "     https://github.com/marimo-team/quarto-marimo/actions/workflows/publish.yml"
echo ""
echo "  2. Verify the release assets:"
echo "     https://github.com/marimo-team/quarto-marimo/releases/tag/v$NEW_VERSION"
