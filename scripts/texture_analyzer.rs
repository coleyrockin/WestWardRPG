use std::env;
use std::fs;
use std::path::Path;

/// Represents texture statistics
#[derive(Debug)]
struct TextureStats {
    total_pixels: usize,
    unique_colors: usize,
    dominant_color: (u8, u8, u8),
}

/// Analyze texture data from a simple text representation
/// Format: width,height,r,g,b,r,g,b,...
fn analyze_texture(data: &str) -> Result<TextureStats, String> {
    let parts: Vec<&str> = data.trim().split(',').collect();
    
    if parts.len() < 2 {
        return Err("Invalid format: missing width/height".to_string());
    }
    
    let width: usize = parts[0].parse()
        .map_err(|_| "Invalid width".to_string())?;
    let height: usize = parts[1].parse()
        .map_err(|_| "Invalid height".to_string())?;
    
    let total_pixels = width * height;
    let expected_values = 2 + total_pixels * 3; // width, height, then RGB triplets
    
    if parts.len() != expected_values {
        return Err(format!(
            "Invalid format: expected {} values, got {}",
            expected_values, parts.len()
        ));
    }
    
    let mut color_counts: std::collections::HashMap<(u8, u8, u8), usize> = 
        std::collections::HashMap::new();
    
    for pixel_idx in 0..total_pixels {
        let base = 2 + pixel_idx * 3;
        let r: u8 = parts[base].parse()
            .map_err(|_| format!("Invalid R value at pixel {}", pixel_idx))?;
        let g: u8 = parts[base + 1].parse()
            .map_err(|_| format!("Invalid G value at pixel {}", pixel_idx))?;
        let b: u8 = parts[base + 2].parse()
            .map_err(|_| format!("Invalid B value at pixel {}", pixel_idx))?;
        
        *color_counts.entry((r, g, b)).or_insert(0) += 1;
    }
    
    let dominant_color = color_counts.iter()
        .max_by_key(|(_, count)| *count)
        .map(|(color, _)| *color)
        .unwrap_or((0, 0, 0));
    
    Ok(TextureStats {
        total_pixels,
        unique_colors: color_counts.len(),
        dominant_color,
    })
}

fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <texture-data-file>", args[0]);
        std::process::exit(1);
    }
    
    let filename = &args[1];
    let path = Path::new(filename);
    
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error reading file: {}", e);
            std::process::exit(1);
        }
    };
    
    match analyze_texture(&content) {
        Ok(stats) => {
            println!("{{");
            println!("  \"total_pixels\": {},", stats.total_pixels);
            println!("  \"unique_colors\": {},", stats.unique_colors);
            println!("  \"dominant_color\": [{}, {}, {}]", 
                     stats.dominant_color.0, 
                     stats.dominant_color.1, 
                     stats.dominant_color.2);
            println!("}}");
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}
