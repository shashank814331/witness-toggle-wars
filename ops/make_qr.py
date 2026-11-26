"""Zero-external-dependency QR code PNG generator (ISO/IEC 18004, Byte mode, ECC M) using Pillow."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

# (version, size, total_data_cw, ecc_cw_per_block, num_blocks, align_centers)
_VERSIONS = [
    (1, 21, 16, 10, 1, []),
    (2, 25, 28, 16, 1, [6, 18]),
    (3, 29, 44, 26, 1, [6, 22]),
    (4, 33, 64, 18, 2, [6, 26]),
]


def _gf_init() -> tuple[list[int], list[int]]:
    exp = [0] * 512
    log = [0] * 256
    x = 1
    for i in range(255):
        exp[i] = x
        log[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        exp[i] = exp[i - 255]
    return exp, log


_GF_EXP, _GF_LOG = _gf_init()


def _gf_mul(a: int, b: int) -> int:
    return 0 if a == 0 or b == 0 else _GF_EXP[_GF_LOG[a] + _GF_LOG[b]]


def _rs_generator(degree: int) -> list[int]:
    poly = [1]
    for i in range(degree):
        root = _GF_EXP[i]
        nxt = [0] * (len(poly) + 1)
        for j, c in enumerate(poly):
            nxt[j] ^= c
            nxt[j + 1] ^= _gf_mul(c, root)
        poly = nxt
    return poly


def _rs_remainder(data: list[int], ecc_len: int) -> list[int]:
    gen = _rs_generator(ecc_len)
    rem = [0] * ecc_len
    for byte in data:
        factor = byte ^ rem[0]
        rem = rem[1:] + [0]
        for j in range(ecc_len):
            rem[j] ^= _gf_mul(gen[j + 1], factor)
    return rem


def _encode_data(payload: bytes) -> tuple[int, list[int], list[int], int]:
    for ver, size, data_cw, ecc_cw, blocks, align in _VERSIONS:
        if len(payload) + 2 <= data_cw:
            bits = [0, 1, 0, 0]  # Byte mode
            bits.extend((len(payload) >> i) & 1 for i in range(7, -1, -1))
            for b in payload:
                bits.extend((b >> i) & 1 for i in range(7, -1, -1))
            bits.extend([0] * min(4, data_cw * 8 - len(bits)))
            while len(bits) % 8 != 0:
                bits.append(0)
            codewords = [
                sum(bits[i + k] << (7 - k) for k in range(8)) for i in range(0, len(bits), 8)
            ]
            pad = [0xEC, 0x11]
            idx = 0
            while len(codewords) < data_cw:
                codewords.append(pad[idx % 2])
                idx += 1

            block_size = data_cw // blocks
            data_blocks = [
                codewords[i * block_size : (i + 1) * block_size] for i in range(blocks)
            ]
            ecc_blocks = [_rs_remainder(blk, ecc_cw) for blk in data_blocks]
            interleaved: list[int] = []
            for j in range(block_size):
                for blk in data_blocks:
                    interleaved.append(blk[j])
            for j in range(ecc_cw):
                for blk in ecc_blocks:
                    interleaved.append(blk[j])
            return size, align, interleaved, ver
    raise ValueError("URL too long for QR Versions 1-4 (max 62 bytes).")


def _format_bits(mask: int) -> int:
    data = (0b00 << 3) | mask  # ECC Level M = 00
    d = data << 10
    for i in range(4, -1, -1):
        if (d >> (i + 10)) & 1:
            d ^= 0x537 << i
    return ((data << 10) | d) ^ 0x5412


def _build_matrix(size: int, align: list[int], codewords: list[int]) -> list[list[int]]:
    grid = [[-1] * size for _ in range(size)]
    fixed = [[False] * size for _ in range(size)]

    def set_mod(r: int, c: int, val: int) -> None:
        grid[r][c] = val
        fixed[r][c] = True

    def draw_finder(r0: int, c0: int) -> None:
        for dr in range(-1, 8):
            for dc in range(-1, 8):
                r, c = r0 + dr, c0 + dc
                if 0 <= r < size and 0 <= c < size:
                    in_outer = 0 <= dr <= 6 and 0 <= dc <= 6
                    on_border = dr in (0, 6) or dc in (0, 6)
                    in_core = 2 <= dr <= 4 and 2 <= dc <= 4
                    set_mod(r, c, 1 if (in_outer and (on_border or in_core)) else 0)

    draw_finder(0, 0)
    draw_finder(0, size - 7)
    draw_finder(size - 7, 0)

    for i in range(8, size - 8):
        set_mod(6, i, 1 if i % 2 == 0 else 0)
        set_mod(i, 6, 1 if i % 2 == 0 else 0)

    for r0 in align:
        for c0 in align:
            if fixed[r0][c0]:
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    val = 1 if max(abs(dr), abs(dc)) in (0, 2) else 0
                    set_mod(r0 + dr, c0 + dc, val)

    set_mod(size - 8, 8, 1)  # Dark module
    for i in range(9):
        if not fixed[8][i]:
            fixed[8][i] = True
        if not fixed[i][8]:
            fixed[i][8] = True
    for i in range(8):
        fixed[8][size - 1 - i] = True
        fixed[size - 1 - i][8] = True

    bit_stream = [((cw >> b) & 1) for cw in codewords for b in range(7, -1, -1)]
    bit_idx = 0
    up = True
    col = size - 1
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(size - 1, -1, -1) if up else range(size)
        for r in rows:
            for dc in (0, -1):
                c = col + dc
                if not fixed[r][c]:
                    grid[r][c] = bit_stream[bit_idx] if bit_idx < len(bit_stream) else 0
                    bit_idx += 1
        up = not up
        col -= 2

    best_grid = grid
    best_score = 10**9
    for mask in range(8):
        cand = [row[:] for row in grid]
        for r in range(size):
            for c in range(size):
                if not fixed[r][c]:
                    cond = [
                        (r + c) % 2 == 0,
                        r % 2 == 0,
                        c % 3 == 0,
                        (r + c) % 3 == 0,
                        ((r // 2) + (c // 3)) % 2 == 0,
                        (r * c) % 2 + (r * c) % 3 == 0,
                        ((r * c) % 2 + (r * c) % 3) % 2 == 0,
                        ((r + c) % 2 + (r * c) % 3) % 2 == 0,
                    ][mask]
                    if cond:
                        cand[r][c] ^= 1
        fmt = _format_bits(mask)
        coords1 = [(8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8), (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)]
        coords2 = [(size - 1 - i, 8) for i in range(7)] + [(8, size - 8 + i) for i in range(8)]
        for i in range(15):
            bit = (fmt >> (14 - i)) & 1
            r1, c1 = coords1[i]
            r2, c2 = coords2[i]
            cand[r1][c1] = bit
            cand[r2][c2] = bit
        score = sum(
            1
            for r in range(size)
            for c in range(size - 4)
            if cand[r][c] == cand[r][c + 1] == cand[r][c + 2] == cand[r][c + 3] == cand[r][c + 4]
        )
        if score < best_score:
            best_score = score
            best_grid = cand
    return best_grid


def generate_qr_png(url: str, out_path: Path, box_size: int = 10, border: int = 4) -> Path:
    """Generate a QR code PNG for the given URL and return the output path."""
    size, align, codewords, _ = _encode_data(url.encode("utf-8"))
    matrix = _build_matrix(size, align, codewords)
    dim = (size + 2 * border) * box_size
    img = Image.new("RGB", (dim, dim), "white")
    pixels = img.load()
    if pixels is None:
        raise RuntimeError("Failed to allocate image pixels")
    for r in range(size):
        for c in range(size):
            if matrix[r][c] == 1:
                x0, y0 = (c + border) * box_size, (r + border) * box_size
                for dy in range(box_size):
                    for dx in range(box_size):
                        pixels[x0 + dx, y0 + dy] = (15, 23, 42)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, format="PNG")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Witness recruitment QR code PNG")
    parser.add_argument("--url", required=True, help="Live Witness URL")
    parser.add_argument("--out", type=Path, default=Path("recruitment-qr.png"))
    args = parser.parse_args()
    out = generate_qr_png(args.url, args.out)
    print(f"Saved QR code PNG to {out}")


if __name__ == "__main__":
    main()
