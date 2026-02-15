#!/bin/bash
# Development automation script for WestWard RPG

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing=()
    
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    if ! command -v python3 &> /dev/null; then
        missing+=("python3")
    fi
    
    if ! command -v tsc &> /dev/null; then
        log_warning "TypeScript compiler not found (optional)"
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing[*]}"
        exit 1
    fi
    
    log_success "All required dependencies found"
}

lint_code() {
    log_info "Running linters..."
    
    cd "$PROJECT_ROOT"
    
    # Check JavaScript syntax
    if ! node --check game.js; then
        log_error "JavaScript syntax check failed"
        exit 1
    fi
    log_success "JavaScript syntax check passed"
    
    # Check TypeScript if available
    if command -v tsc &> /dev/null; then
        if ! npm run typecheck:ts; then
            log_error "TypeScript check failed"
            exit 1
        fi
        log_success "TypeScript check passed"
    fi
    
    # Check Python syntax
    if ! python3 -m py_compile scripts/state_report.py; then
        log_error "Python syntax check failed"
        exit 1
    fi
    log_success "Python syntax check passed"
}

build_assets() {
    log_info "Building assets..."
    
    cd "$PROJECT_ROOT"
    
    # Compile TypeScript to JavaScript
    if [ -f "atmosphere.ts" ]; then
        if command -v tsc &> /dev/null; then
            # Use project's tsconfig.json if available, otherwise use inline options
            if [ -f "tsconfig.json" ]; then
                tsc
            else
                tsc atmosphere.ts --outDir . --target ES2015 --module ES2015
            fi
            log_success "TypeScript compiled successfully"
        else
            log_warning "TypeScript compiler not found, skipping compilation"
        fi
    fi
}

run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    if npm test; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

clean_output() {
    log_info "Cleaning output directory..."
    
    cd "$PROJECT_ROOT"
    
    if [ -d "output" ]; then
        rm -rf output/*
        log_success "Output directory cleaned"
    else
        log_warning "Output directory does not exist"
    fi
}

show_help() {
    cat << EOF
WestWard RPG Development Automation Script

Usage: $0 [command]

Commands:
    check       Check project dependencies
    lint        Run code linters and syntax checks
    build       Build project assets
    test        Run test suite
    clean       Clean output directory
    full        Run full pipeline (check, lint, build, test)
    help        Show this help message

Examples:
    $0 check
    $0 lint
    $0 full
EOF
}

main() {
    local command="${1:-help}"
    
    case "$command" in
        check)
            check_dependencies
            ;;
        lint)
            check_dependencies
            lint_code
            ;;
        build)
            check_dependencies
            build_assets
            ;;
        test)
            check_dependencies
            run_tests
            ;;
        clean)
            clean_output
            ;;
        full)
            check_dependencies
            lint_code
            build_assets
            run_tests
            log_success "Full pipeline completed successfully"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
