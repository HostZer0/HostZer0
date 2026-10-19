"""Alinha em 4 bytes os dados das entradas não comprimidas de um APK (equivale ao zipalign).

O Android 11+ exige resources.arsc sem compressão e alinhado. O padding usa o campo
extra 0xD935 (o mesmo do zipalign/apksig), que o apksig preserva ao assinar.
Uso: python3 zipalign.py entrada.apk saida.apk
"""
import struct
import sys
import zipfile

ALIGN = 4
EXTRA_ID = 0xD935


def main(src, dst):
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w") as zout:
        for info in zin.infolist():
            data = zin.read(info)
            out = zipfile.ZipInfo(info.filename, date_time=info.date_time)
            out.compress_type = info.compress_type
            out.external_attr = info.external_attr
            if out.compress_type == zipfile.ZIP_STORED:
                data_start = zout.fp.tell() + 30 + len(out.filename.encode("utf-8"))
                size = 6 + (-(data_start + 6)) % ALIGN
                out.extra = struct.pack("<HHH", EXTRA_ID, size - 4, ALIGN) + b"\0" * (size - 6)
            zout.writestr(out, data)


if __name__ == "__main__":
    main(*sys.argv[1:3])
