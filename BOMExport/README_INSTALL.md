# BOM Export Electrical — Panduan Instalasi

## Requirement
- Revit 2022 / 2023 / 2024 / 2025
- Visual Studio 2022 (untuk compile)
- .NET Framework 4.8

## Langkah Compile

1. Buka `BOMExport.csproj` di Visual Studio 2022
2. Di file `.csproj`, sesuaikan path Revit API:
   - Ganti `Revit 2024` → versi Revit yang kamu pakai
3. Klik **Build → Build Solution** (Ctrl+Shift+B)
4. DLL hasil build ada di: `bin\Debug\net48\BOMExport.dll`

## Langkah Instalasi ke Revit

1. Copy file-file berikut ke satu folder (misal `C:\RevitAddins\BOMExport\`):
   - `BOMExport.dll`
   - `ClosedXML.dll` (dari NuGet packages)
   - `DocumentFormat.OpenXml.dll`
   - Semua DLL dependency lainnya dari folder `bin\Debug\net48\`

2. Copy file `BOMExport.addin` ke:
   ```
   C:\ProgramData\Autodesk\Revit\Addins\2024\BOMExport.addin
   ```
   (Ganti 2024 dengan versi Revit kamu)

3. Di dalam file `.addin`, pastikan `<Assembly>` menunjuk ke path DLL yang benar:
   ```xml
   <Assembly>C:\RevitAddins\BOMExport\BOMExport.dll</Assembly>
   ```

4. Buka Revit → tab **Add-Ins** → panel **BOM Electrical** → klik **Export BOM**

## Cara Pakai

1. Buka model Revit yang sudah ada element electrical
2. Klik tombol **Export BOM** di Ribbon
3. Pilih lokasi simpan file Excel
4. Centang kategori yang ingin diekspor
5. Klik **Export ke Excel**
6. File Excel otomatis terbuka

## Catatan Penting

### Circuit Number & Panel
- Jika lampu/receptacle belum diassign ke circuit di Revit,
  kolom Circuit Number dan Panel akan otomatis muncul **"-"** (kosong)
- Assign circuit dulu di Revit MEP untuk hasil lengkap

### Public Address
- Add-in mendeteksi PA dari kategori **Communication Devices**
- Family name harus mengandung kata: `pa`, `speaker`, `horn`, `toa`, atau `audio`
- Jika tidak terdeteksi, rename family typenya

### Watt / Apparent Load
- Diambil dari parameter `Apparent Load` di Revit
- Pastikan family sudah diisi parameter daya
- Atau tambahkan parameter shared `Watt` / `Power` pada family

### Cable Tray
- Dikelompokkan per: Type Name + Dimensi + Level + Workset
- Total panjang dihitung otomatis dari curve length

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Add-in tidak muncul di Ribbon | Cek path di .addin file, pastikan DLL ada |
| Data 0 items | Cek kategori Revit sudah dipilih yang benar |
| Watt semua 0 | Isi parameter Apparent Load di family |
| PA tidak terdeteksi | Rename family mengandung kata "speaker" atau "PA" |
