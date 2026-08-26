#!/usr/bin/env python3
"""Embute os assets no template e gera mockup/rede.html.

O painel precisa abrir offline, num clique, sem servidor: por isso fontes, logos e
retratos entram como data URI em vez de arquivo referenciado. Rode depois de editar
o template.
"""
import base64
import pathlib

RAIZ = pathlib.Path(__file__).parent
ASSETS = RAIZ / "assets"

MAPA = {
    "__SATOSHI_R__": "Satoshi-Regular.woff2",
    "__SATOSHI_B__": "Satoshi-Bold.woff2",
    "__LOGO_BEGE__": "case-logo-bege.svg",
    "__LOGO_NAVY__": "case-logo-navy.svg",
    "__F_FITTI__": "corretores/fittipaldi.jpg",
    "__F_BIRK__": "corretores/birk.jpg",
    "__F_ADRIANO__": "corretores/adriano.jpg",
    "__F_SANDRA__": "corretores/sandra.jpg",
}


def main():
    html = (RAIZ / "mockup" / "rede.template.html").read_text()
    for marcador, arquivo in MAPA.items():
        if marcador not in html:
            raise SystemExit(f"marcador ausente no template: {marcador}")
        html = html.replace(marcador, base64.b64encode((ASSETS / arquivo).read_bytes()).decode())
    saida = RAIZ / "mockup" / "rede.html"
    saida.write_text(html)
    print(f"gerado {saida.relative_to(RAIZ.parent)} — {saida.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
