#!/usr/bin/env python3
"""
Gerador de Ícones para Nexus
Cria ícones PNG em vários tamanhos baseados no design da aplicação
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("❌ PIL (Pillow) não encontrada. Instale com: pip install Pillow")
    exit(1)

# Cores do Nexus
TEAL = "#00D4AA"
PURPLE = "#7B3FF2"
WHITE = "#FFFFFF"
BLACK = "#000000"

def create_gradient_circle(size):
    """Cria um círculo com gradiente"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = int(size * 0.45)
    
    # Simular gradiente com múltiplos círculos
    steps = 50
    for i in range(steps):
        # Interpolação linear entre as cores
        ratio = i / steps
        r = int(0x00 * (1 - ratio) + 0x7B * ratio)
        g = int(0xD4 * (1 - ratio) + 0x3F * ratio)
        b = int(0xAA * (1 - ratio) + 0xF2 * ratio)
        
        current_radius = radius - (i * radius // steps)
        if current_radius > 0:
            # Converter para círculo
            bbox = [
                center - current_radius, center - current_radius,
                center + current_radius, center + current_radius
            ]
            draw.ellipse(bbox, fill=(r, g, b, 255))
    
    return img

def add_text_to_icon(img, size):
    """Adiciona a letra N ao ícone"""
    draw = ImageDraw.Draw(img)
    
    # Tentar carregar fonte
    font_size = int(size * 0.6)
    try:
        # Windows
        font = ImageFont.truetype("arial.ttf", font_size)
    except OSError:
        try:
            # Linux
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
        except OSError:
            try:
                # macOS
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
            except OSError:
                # Fallback para fonte padrão
                font = ImageFont.load_default()
                print(f"⚠️ Usando fonte padrão para {size}x{size}")
    
    # Calcular posição do texto
    text = "N"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - int(size * 0.02)  # Pequeno ajuste vertical
    
    # Sombra do texto
    shadow_offset = max(1, size // 128)
    draw.text((x + shadow_offset, y + shadow_offset), text, fill=(0, 0, 0, 100), font=font)
    
    # Texto principal
    draw.text((x, y), text, fill=WHITE, font=font)
    
    return img

def create_icon(size):
    """Cria um ícone completo do tamanho especificado"""
    print(f"🎨 Criando ícone {size}x{size}...")
    
    # Criar círculo com gradiente
    img = create_gradient_circle(size)
    
    # Adicionar texto
    img = add_text_to_icon(img, size)
    
    return img

def main():
    """Função principal"""
    print("🚀 Gerador de Ícones Nexus")
    print("=" * 40)
    
    # Criar diretório assets se não existir
    os.makedirs("assets", exist_ok=True)
    
    # Tamanhos necessários
    sizes = [512, 256, 128, 64, 32, 16]
    
    icons = {}
    
    for size in sizes:
        icon = create_icon(size)
        icons[size] = icon
        
        # Salvar PNG individual
        filename = f"assets/icon_{size}x{size}.png"
        icon.save(filename, "PNG")
        print(f"✅ Salvo: {filename}")
    
    # Criar ícone principal (512x512)
    icons[512].save("assets/icon.png", "PNG")
    print(f"✅ Salvo: assets/icon.png (ícone principal)")
    
    # Criar ícone @2x para high DPI
    icons[512].save("assets/icon@2x.png", "PNG")
    print(f"✅ Salvo: assets/icon@2x.png (high DPI)")
    
    print("\n🎯 Ícones criados com sucesso!")
    print("\n📋 Próximos passos:")
    print("1. Converter icon_256x256.png para ICO (Windows):")
    print("   - Use https://convertio.co/png-ico/")
    print("   - Ou ferramenta local como ImageMagick")
    print("\n2. Converter icon_512x512.png para ICNS (macOS):")
    print("   - Use https://convertio.co/png-icns/")
    print("   - Ou iconutil no macOS")
    print("\n3. Renomear arquivos:")
    print("   - icon_256x256.png → icon.ico (após conversão)")
    print("   - icon_512x512.png → icon.icns (após conversão)")
    print("   - icon.png já está pronto para Linux")

if __name__ == "__main__":
    main()