import struct
import zlib
import os
import math

def write_png(width, height, filename):
    # Wasp-Guard Theme: Hexagon Shield with a W
    # Colors
    intro_black = (20, 20, 20, 255)
    wasp_yellow = (255, 215, 0, 255) # Gold
    guard_green = (50, 205, 50, 255) # Lime Green
    
    raw_data = []
    
    # Precompute center and scale
    cx = width / 2.0
    cy = height / 2.0
    scale = min(width, height)
    
    # Anti-aliasing helper (supersampling would be better but simple logic here)
    # We will just do per-pixel center sampling
    
    for y in range(height):
        # Scanline filter byte (0)
        raw_data.append(b'\x00')
        
        for x in range(width):
            # Normalized coordinates -0.5 to 0.5
            nx = (x - cx) / scale
            ny = (y - cy) / scale
            
            # 1. Hexagon Shape Calculation
            # dist to center of hex
            # d = max(|x|, |x|*0.5 + |y|*sqrt(3)/2)
            abs_x = abs(nx)
            abs_y = abs(ny)
            hex_dist = max(abs_x, abs_x * 0.5 + abs_y * 0.866)
            
            r, g, b, a = (0, 0, 0, 0) # Transparent default
            
            if hex_dist < 0.48:
                # Inside Hexagon
                if hex_dist > 0.42:
                    # Border - Wasp Yellow
                    r, g, b, a = wasp_yellow
                else:
                    # Background - Dark Black/Grey
                    r, g, b, a = intro_black
                    
                    # 2. Draw 'W' (WASP)
                    # We define a signed distance to the W shape
                    # W points: (-0.3, -0.1), (-0.15, 0.25), (0, -0.05), (0.15, 0.25), (0.3, -0.1)
                    # Simplified: Four segments
                    
                    def dist_to_segment(px, py, x1, y1, x2, y2):
                        # Vector AB
                        dx = x2 - x1
                        dy = y2 - y1
                        if dx == 0 and dy == 0: return math.sqrt((px-x1)**2 + (py-y1)**2)
                        
                        # Project point onto line, clamped 0..1
                        t = ((px - x1) * dx + (py - y1) * dy) / (dx*dx + dy*dy)
                        t = max(0, min(1, t))
                        
                        # Nearest point
                        nx = x1 + t * dx
                        ny = y1 + t * dy
                        return math.sqrt((px - nx)**2 + (py - ny)**2)

                    # Defined W strokes
                    w_thickness = 0.04
                    
                    # Left down
                    d1 = dist_to_segment(nx, ny, -0.3, -0.15, -0.15, 0.15)
                    # Left up (middle)
                    d2 = dist_to_segment(nx, ny, -0.15, 0.15, 0.0, -0.05)
                    # Right up (middle)
                    d3 = dist_to_segment(nx, ny, 0.0, -0.05, 0.15, 0.15)
                    # Right down
                    d4 = dist_to_segment(nx, ny, 0.15, 0.15, 0.3, -0.15)
                    
                    min_w = min(d1, d2, d3, d4)
                    
                    if min_w < w_thickness:
                        r, g, b, a = wasp_yellow
                    
                    # 3. Green "Safe" dot or accent?
                    # Let's put a small green triangle or dot at the top center?
                    # Or maybe the W turns green at the bottom?
                    # Let's keep it simple: Yellow/Black is high contrast warning.
                    # Maybe the center point of W is green?
                    if d2 < w_thickness and d3 < w_thickness and ny > -0.1:
                         r, g, b, a = guard_green

            raw_data.append(struct.pack('BBBB', r, g, b, a))

    raw_bytes = b''.join(raw_data)
    
    # Compress
    compressed = zlib.compress(raw_bytes)
    
    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + 
                tag + 
                data + 
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))
    
    # PNG Structure
    png_sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    
    with open(filename, 'wb') as f:
        f.write(png_sig)
        f.write(ihdr)
        f.write(idat)
        f.write(iend)
    
    print(f"Generated {filename}")

if __name__ == '__main__':
    if not os.path.exists('icons'):
        os.makedirs('icons', exist_ok=True)
    
    # Standard sizes
    write_png(16, 16, 'icons/icon16.png')
    write_png(48, 48, 'icons/icon48.png')
    write_png(128, 128, 'icons/icon128.png')
