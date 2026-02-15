#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require 'fileutils'
require 'digest'

# Asset bundler for WestWard RPG
# Scans project files and generates a manifest with checksums
class AssetBundler
  attr_reader :root_dir, :output_file

  def initialize(root_dir, output_file = 'asset_manifest.json')
    @root_dir = File.expand_path(root_dir)
    @output_file = File.expand_path(output_file, @root_dir)
  end

  def scan_assets
    assets = []
    # Core source and config files (excludes binary assets like images)
    patterns = ['*.js', '*.html', '*.css', '*.json', '*.ts']
    
    patterns.each do |pattern|
      Dir.glob(File.join(root_dir, pattern)).each do |file|
        next if File.directory?(file)
        next if file == output_file
        
        relative_path = file.sub(root_dir + '/', '')
        
        assets << {
          path: relative_path,
          size: File.size(file),
          checksum: calculate_checksum(file),
          modified: File.mtime(file).utc.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
      end
    end
    
    assets.sort_by { |a| a[:path] }
  end

  def calculate_checksum(file)
    Digest::SHA256.file(file).hexdigest
  end

  def generate_manifest
    assets = scan_assets
    
    manifest = {
      generated_at: Time.now.utc.strftime('%Y-%m-%dT%H:%M:%SZ'),
      asset_count: assets.length,
      total_size: assets.sum { |a| a[:size] },
      assets: assets
    }
    
    File.write(output_file, JSON.pretty_generate(manifest))
    
    puts "Asset manifest generated: #{output_file}"
    puts "  - #{manifest[:asset_count]} assets"
    puts "  - Total size: #{format_bytes(manifest[:total_size])}"
    
    manifest
  end

  def format_bytes(bytes)
    units = ['B', 'KB', 'MB', 'GB']
    unit_index = 0
    size = bytes.to_f
    
    while size >= 1024 && unit_index < units.length - 1
      size /= 1024.0
      unit_index += 1
    end
    
    "#{size.round(2)} #{units[unit_index]}"
  end

  def verify_manifest
    unless File.exist?(output_file)
      puts "Error: Manifest file not found: #{output_file}"
      return false
    end
    
    manifest = JSON.parse(File.read(output_file), symbolize_names: true)
    current_assets = scan_assets
    
    manifest_paths = manifest[:assets].map { |a| a[:path] }.sort
    current_paths = current_assets.map { |a| a[:path] }.sort
    
    missing = manifest_paths - current_paths
    added = current_paths - manifest_paths
    
    changed = []
    manifest[:assets].each do |asset|
      current = current_assets.find { |a| a[:path] == asset[:path] }
      if current && current[:checksum] != asset[:checksum]
        changed << asset[:path]
      end
    end
    
    if missing.empty? && added.empty? && changed.empty?
      puts "✓ Manifest is up to date"
      return true
    end
    
    puts "✗ Manifest is out of date:"
    puts "  Missing: #{missing.join(', ')}" unless missing.empty?
    puts "  Added: #{added.join(', ')}" unless added.empty?
    puts "  Changed: #{changed.join(', ')}" unless changed.empty?
    
    false
  end
end

# Main execution
if __FILE__ == $PROGRAM_NAME
  command = ARGV[0] || 'generate'
  root_dir = ARGV[1] || '.'
  
  bundler = AssetBundler.new(root_dir)
  
  case command
  when 'generate', 'gen', 'g'
    bundler.generate_manifest
  when 'verify', 'check', 'v'
    exit(bundler.verify_manifest ? 0 : 1)
  else
    puts "Usage: #{$PROGRAM_NAME} [generate|verify] [root_dir]"
    puts "  generate (default): Create asset manifest"
    puts "  verify: Check if manifest is up to date"
    exit 1
  end
end
