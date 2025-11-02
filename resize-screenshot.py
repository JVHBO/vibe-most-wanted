#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Redimensiona screenshot.jpg para aspect ratio 3:2 (1200x800px)
Requerido pelo Farcaster para Embed Valid
"""

import os

def resize_screenshot():
    try:
        from PIL import Image
    except ImportError:
        print("ERRO: Pillow nao instalado!")
        print("Instale com: pip install Pillow")
        return False

    input_path = "public/screenshot.jpg"
    output_path = "public/screenshot.jpg"
    backup_path = "public/screenshot-backup.jpg"

    # Dimensoes alvo (3:2 aspect ratio)
    target_width = 1200
    target_height = 800

    print(f"Redimensionando {input_path}...")

    # Verificar se arquivo existe
    if not os.path.exists(input_path):
        print(f"ERRO: {input_path} nao encontrado!")
        return False

    try:
        # Abrir imagem
        img = Image.open(input_path)
        original_size = img.size
        print(f"   Dimensoes originais: {original_size[0]}x{original_size[1]}")
        print(f"   Aspect ratio original: {original_size[0]/original_size[1]:.2f}:1")

        # Fazer backup
        img.save(backup_path, quality=95)
        print(f"OK - Backup salvo em: {backup_path}")

        # Redimensionar para 3:2
        # Usa LANCZOS para melhor qualidade
        img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

        # Salvar
        img_resized.save(output_path, "JPEG", quality=90, optimize=True)

        print(f"OK - Imagem redimensionada!")
        print(f"   Novas dimensoes: {target_width}x{target_height}")
        print(f"   Aspect ratio: 3:2 (1.5:1)")
        print(f"   Tamanho do arquivo: {os.path.getsize(output_path) / 1024:.1f} KB")
        print()
        print("Proximos passos:")
        print("   1. git add public/screenshot.jpg")
        print("   2. git commit -m 'fix: resize screenshot to 3:2 aspect ratio'")
        print("   3. git push")

        return True

    except Exception as e:
        print(f"ERRO ao redimensionar: {e}")
        return False

if __name__ == "__main__":
    print("Farcaster Screenshot Resizer")
    print("=" * 50)

    # Verificar se Pillow está instalado
    try:
        from PIL import Image
    except ImportError:
        print("❌ Pillow não está instalado!")
        print()
        print("Instale com:")
        print("   pip install Pillow")
        print()
        print("Ou use uma das alternativas em RESIZE-IMAGE-INSTRUCTIONS.md")
        exit(1)

    success = resize_screenshot()

    if success:
        print()
        print("✨ Sucesso! A imagem está pronta para o Farcaster!")
    else:
        print()
        print("💡 Consulte RESIZE-IMAGE-INSTRUCTIONS.md para alternativas")
