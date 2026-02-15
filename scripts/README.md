# Scripts & Utilities

This directory contains various utility scripts written in different programming languages to support the WestWardRPG project.

## Overview

The scripts demonstrate language variety and provide useful functionality for development, testing, and deployment.

## Scripts by Language

### Python

#### `state_report.py`
Analyzes scenario snapshot data from game test runs.

**Usage:**
```bash
python3 scripts/state_report.py output
# or via npm
npm run report:states
```

**Purpose:** Generates statistics on test scenario states and errors.

---

### Go

#### `map_validator.go`
High-performance map data validation with structured error reporting.

**Usage:**
```bash
go run scripts/map_validator.go <map-json-file>
# Example:
go run scripts/map_validator.go test-data/sample_map.json
```

**Input Format:** JSON file with map structure
```json
{
  "width": 4,
  "height": 4,
  "tiles": [
    ["W", "W", "W", "W"],
    ["W", ".", ".", "W"],
    ["W", ".", ".", "W"],
    ["W", "W", "W", "W"]
  ]
}
```

**Output:** JSON validation result with errors (if any)

---

### Rust

#### `texture_analyzer.rs`
Efficient texture data processing and color analysis.

**Usage:**
```bash
# Compile
rustc scripts/texture_analyzer.rs -o texture_analyzer

# Run
./texture_analyzer <texture-data-file>

# Example:
./texture_analyzer test-data/sample_texture.txt
```

**Input Format:** CSV format: `width,height,r,g,b,r,g,b,...`
```
2,2,255,0,0,0,255,0,0,0,255,255,255,0
```

**Output:** JSON with texture statistics including pixel count, unique colors, and dominant color

---

### Ruby

#### `asset_bundler.rb`
Asset management, manifest generation, and integrity verification.

**Usage:**
```bash
# Generate manifest
ruby scripts/asset_bundler.rb generate
# or via npm
npm run bundle:assets

# Verify integrity
ruby scripts/asset_bundler.rb verify
# or via npm
npm run verify:assets
```

**Features:**
- Scans project assets (JS, HTML, CSS, JSON, TS)
- Generates SHA256 checksums
- Tracks file sizes and modification times
- Verifies asset integrity

**Output:** Creates `asset_manifest.json` with complete asset inventory

---

### Shell (Bash)

#### `dev_tools.sh`
Development automation and build pipeline management.

**Usage:**
```bash
# Check dependencies
bash scripts/dev_tools.sh check
# or via npm
npm run dev:check

# Run linters
bash scripts/dev_tools.sh lint
# or via npm
npm run dev:lint

# Build assets
bash scripts/dev_tools.sh build

# Run tests
bash scripts/dev_tools.sh test

# Clean output
bash scripts/dev_tools.sh clean

# Full pipeline
bash scripts/dev_tools.sh full
# or via npm
npm run dev:full
```

**Features:**
- Dependency checking (Node.js, Python, TypeScript)
- Code linting (JavaScript, TypeScript, Python)
- Asset building
- Test execution
- Output directory management

---

### Perl

#### `log_analyzer.pl`
Log analysis and statistics generation for game output data.

**Usage:**
```bash
# Text report
perl scripts/log_analyzer.pl output
# or via npm
npm run analyze:logs

# JSON output
perl scripts/log_analyzer.pl output json
```

**Features:**
- Scans output directories for state and error files
- Generates statistics by scenario
- Categorizes errors by type
- Outputs in text or JSON format

---

### PHP

#### `config_generator.php`
Web server configuration file generator for deployment.

**Usage:**
```bash
# Generate nginx config
php scripts/config_generator.php -t nginx
# or via npm
npm run config:nginx

# Generate Apache config
php scripts/config_generator.php -t apache
# or via npm
npm run config:apache

# Generate Caddy config
php scripts/config_generator.php -t caddy

# Save to file
php scripts/config_generator.php -t nginx -o nginx.conf

# Custom options
php scripts/config_generator.php -t nginx -s myserver.com -p 9000
```

**Options:**
- `-t, --type`: Server type (nginx, apache, caddy)
- `-o, --output`: Output file path
- `-s, --server`: Server name
- `-p, --port`: Port number
- `-h, --help`: Show help

**Features:**
- Generates production-ready server configurations
- Includes caching rules for static assets
- Security headers
- URL rewriting for SPA routing

---

## Language Summary

| Language   | Script                 | Purpose                          |
|------------|------------------------|----------------------------------|
| Python     | state_report.py        | Test scenario analysis           |
| Go         | map_validator.go       | Map data validation              |
| Rust       | texture_analyzer.rs    | Texture processing               |
| Ruby       | asset_bundler.rb       | Asset management                 |
| Shell      | dev_tools.sh           | Development automation           |
| Perl       | log_analyzer.pl        | Log analysis                     |
| PHP        | config_generator.php   | Server configuration generation  |

## Requirements

### Core Requirements (already installed)
- **Node.js** 16+ (for JavaScript/npm)
- **Python** 3.x (for Python scripts)
- **TypeScript** (npm dev dependency)

### Optional Requirements (for extended functionality)
- **Go** 1.16+ (for map_validator.go)
- **Rust** 1.50+ (for texture_analyzer.rs)
- **Ruby** 2.x+ (for asset_bundler.rb)
- **Perl** 5.x+ (for log_analyzer.pl)
- **PHP** 7.x+ (for config_generator.php)

Most systems come with Perl and Shell pre-installed. Ruby and PHP are commonly available. Go and Rust can be easily installed if needed.

## Testing

All scripts have been tested and include example data in the `test-data/` directory:

- `test-data/sample_map.json` - Example map for Go validator
- `test-data/sample_texture.txt` - Example texture for Rust analyzer

## Integration

Scripts are integrated into the npm workflow via `package.json`. You can run them using:

```bash
npm run <script-name>
```

See `package.json` for all available npm scripts.
