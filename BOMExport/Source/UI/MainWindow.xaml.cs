using Autodesk.Revit.DB;
using BOMExport.Core;
using BOMExport.Models;
using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace BOMExport.UI
{
    public class LevelItem : INotifyPropertyChanged
    {
        public string Name { get; set; } = "";
        private bool _isSelected = true;
        public bool IsSelected
        {
            get => _isSelected;
            set { _isSelected = value; OnPropertyChanged(nameof(IsSelected)); }
        }
        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged(string n) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(n));
    }

    public partial class MainWindow : Window
    {
        private readonly Document _doc;
        private BOMResult? _bomResult;
        private readonly ObservableCollection<LevelItem> _levelItems = new();
        private bool _levelPanelOpen  = false;
        private bool _suppressLevel   = false;
        private bool _suppressCat     = false;

        // ── Warna badge per state ────────────────────────────────────────────
        private static readonly Brush BrushSkipBg  = new SolidColorBrush(Color.FromRgb(0xF1, 0xF5, 0xF9));
        private static readonly Brush BrushSkipFg  = new SolidColorBrush(Color.FromRgb(0x94, 0xA3, 0xB8));

        public MainWindow(Document doc)
        {
            InitializeComponent();
            _doc = doc;
            TxtModelInfo.Text = $"Model: {doc.Title}";
            LevelListBox.ItemsSource = _levelItems;
            Loaded += async (_, __) => await InitializeAsync();
        }

        // ────────────────────────────────────────────────────────────────────
        //  INIT
        // ────────────────────────────────────────────────────────────────────
        private async Task InitializeAsync()
        {
            BtnExport.IsEnabled = false;
            ShowProgress("Memuat level dari model...", 10);

            var levelNames = RevitDataExtractor.GetAllLevelNames(_doc);
            _suppressLevel = true;
            foreach (var n in levelNames)
                _levelItems.Add(new LevelItem { Name = n, IsSelected = true });
            _suppressLevel = false;
            UpdateLevelSelCount();

            ShowProgress("Menghitung elemen dalam model...", 35);
            await Task.Run(() => { _bomResult = RevitDataExtractor.Extract(_doc, null); });

            HideProgress();
            BtnExport.IsEnabled = true;
            RefreshBadges();
            UpdateFooter();
        }

        // ────────────────────────────────────────────────────────────────────
        //  PRESET CHIPS
        // ────────────────────────────────────────────────────────────────────
        private void Preset_All(object sender, RoutedEventArgs e)
            => SetCategories(true, true, true, true, true, true);

        private void Preset_None(object sender, RoutedEventArgs e)
            => SetCategories(false, false, false, false, false, false);

        // Lighting + Receptacle + Cable Tray
        private void Preset_Power(object sender, RoutedEventArgs e)
            => SetCategories(true, true, true, false, false, false);

        // Hanya Lighting
        private void Preset_Lighting(object sender, RoutedEventArgs e)
            => SetCategories(true, false, false, false, false, false);

        // PA + Fire Alarm + Data
        private void Preset_LowCurrent(object sender, RoutedEventArgs e)
            => SetCategories(false, false, false, true, true, true);

        private void SetCategories(bool l, bool r, bool ct, bool pa, bool fa, bool d)
        {
            _suppressCat = true;
            ChkLighting.IsChecked   = l;
            ChkReceptacle.IsChecked = r;
            ChkCableTray.IsChecked  = ct;
            ChkPA.IsChecked         = pa;
            ChkFireAlarm.IsChecked  = fa;
            ChkData.IsChecked       = d;
            _suppressCat = false;
            OnCategoryChanged();
        }

        // ────────────────────────────────────────────────────────────────────
        //  CATEGORY EVENTS
        // ────────────────────────────────────────────────────────────────────
        private void ChkAll_Checked(object sender, RoutedEventArgs e)
            => SetCategories(true, true, true, true, true, true);

        private void ChkAll_Unchecked(object sender, RoutedEventArgs e)
            => SetCategories(false, false, false, false, false, false);

        private void Category_Changed(object sender, RoutedEventArgs e)
        {
            if (_suppressCat) return;
            OnCategoryChanged();
        }

        private void OnCategoryChanged()
        {
            ApplyCardVisuals();
            UpdateChkAllState();
            UpdateFooter();
        }

        // ── Visual dimming kartu ─────────────────────────────────────────────
        private void ApplyCardVisuals()
        {
            ApplyCard(CardLighting,   ChkLighting.IsChecked   == true,
                      TxtLightCount,  BadgeLighting,
                      "#FEF3C7", "#92400E");
            ApplyCard(CardReceptacle, ChkReceptacle.IsChecked == true,
                      TxtRecepCount,  BadgeReceptacle,
                      "#DBEAFE", "#1D4ED8");
            ApplyCard(CardCableTray,  ChkCableTray.IsChecked  == true,
                      TxtCTrayCount,  BadgeCableTray,
                      "#EDE9FE", "#4F46E5");
            ApplyCard(CardPA,         ChkPA.IsChecked         == true,
                      TxtPACount,     BadgePA,
                      "#D1FAE5", "#065F46");
            ApplyCard(CardFireAlarm,  ChkFireAlarm.IsChecked  == true,
                      TxtFACount,     BadgeFireAlarm,
                      "#FEE2E2", "#B91C1C");
            ApplyCard(CardData,       ChkData.IsChecked       == true,
                      TxtDataCount,   BadgeData,
                      "#EDE9FE", "#6D28D9");
        }

        private static void ApplyCard(Border card, bool active,
            TextBlock countTxt, Border badge,
            string activeBg, string activeFg)
        {
            if (active)
            {
                card.Opacity = 1.0;
                badge.Background = ParseBrush(activeBg);
                countTxt.Foreground = ParseBrush(activeFg);
                countTxt.Text = countTxt.Tag as string ?? countTxt.Text;
            }
            else
            {
                card.Opacity = 0.38;
                badge.Background = BrushSkipBg;
                countTxt.Foreground = BrushSkipFg;
                // Simpan teks asli di Tag, ganti dengan "Dilewati"
                if (countTxt.Text != "Dilewati")
                    countTxt.Tag = countTxt.Text;
                countTxt.Text = "Dilewati";
            }
        }

        private static Brush ParseBrush(string hex)
        {
            var c = (Color)ColorConverter.ConvertFromString(hex);
            return new SolidColorBrush(c);
        }

        private void UpdateChkAllState()
        {
            int checked_ = new[] {
                ChkLighting.IsChecked, ChkReceptacle.IsChecked, ChkCableTray.IsChecked,
                ChkPA.IsChecked, ChkFireAlarm.IsChecked, ChkData.IsChecked
            }.Count(x => x == true);

            _suppressCat = true;
            ChkAll.IsChecked = checked_ == 6 ? true : checked_ == 0 ? (bool?)false : null;
            _suppressCat = false;
        }

        // ── Refresh count badges dari data ──────────────────────────────────
        private void RefreshBadges()
        {
            if (_bomResult == null) return;

            void SetBadge(TextBlock txt, int count, bool active)
            {
                string label = $"{count} grup";
                txt.Tag  = label;  // simpan untuk restore saat re-activate
                txt.Text = active ? label : "Dilewati";
            }

            SetBadge(TxtLightCount,  _bomResult.Lighting.Count,       ChkLighting.IsChecked   == true);
            SetBadge(TxtRecepCount,  _bomResult.Receptacles.Count,     ChkReceptacle.IsChecked == true);
            SetBadge(TxtCTrayCount,  _bomResult.CableTrays.Count,      ChkCableTray.IsChecked  == true);
            SetBadge(TxtPACount,     _bomResult.PublicAddress.Count,   ChkPA.IsChecked         == true);
            SetBadge(TxtFACount,     _bomResult.FireAlarms.Count,      ChkFireAlarm.IsChecked  == true);
            SetBadge(TxtDataCount,   _bomResult.DataPoints.Count,      ChkData.IsChecked       == true);

            ApplyCardVisuals();
            UpdateFooter();
        }

        // ────────────────────────────────────────────────────────────────────
        //  LEVEL FILTER
        // ────────────────────────────────────────────────────────────────────
        private void ToggleLevels_Click(object sender, RoutedEventArgs e)
        {
            _levelPanelOpen = !_levelPanelOpen;
            PanelLevelList.Visibility = _levelPanelOpen ? Visibility.Visible : Visibility.Collapsed;
            BtnToggleLevels.Content   = _levelPanelOpen ? "▲  Sembunyikan" : "▼  Tampilkan";
        }

        private void ChkAllLevels_Checked(object sender, RoutedEventArgs e)
        {
            if (_suppressLevel) return;
            _suppressLevel = true;
            foreach (var item in _levelItems) item.IsSelected = true;
            _suppressLevel = false;
            OnLevelChanged();
        }

        private void ChkAllLevels_Unchecked(object sender, RoutedEventArgs e)
        {
            if (_suppressLevel) return;
            _suppressLevel = true;
            foreach (var item in _levelItems) item.IsSelected = false;
            _suppressLevel = false;
            OnLevelChanged();
        }

        private void LevelCheckbox_Changed(object sender, RoutedEventArgs e)
        {
            if (_suppressLevel) return;
            OnLevelChanged();
        }

        private void ResetLevels_Click(object sender, RoutedEventArgs e)
        {
            _suppressLevel = true;
            foreach (var item in _levelItems) item.IsSelected = true;
            ChkAllLevels.IsChecked = true;
            _suppressLevel = false;
            OnLevelChanged();
        }

        private void OnLevelChanged()
        {
            UpdateLevelSelCount();
            UpdateActiveLevelBadge();
            _ = RefreshWithFilterAsync();
        }

        private void UpdateLevelSelCount()
        {
            int sel = _levelItems.Count(x => x.IsSelected);
            TxtLevelSelCount.Text = $"{sel}/{_levelItems.Count} level";
            _suppressLevel = true;
            ChkAllLevels.IsChecked = sel == _levelItems.Count ? true
                                   : sel == 0               ? (bool?)false
                                   : null;
            _suppressLevel = false;
        }

        private void UpdateActiveLevelBadge()
        {
            var sel    = _levelItems.Where(x => x.IsSelected).Select(x => x.Name).ToList();
            bool allSel = sel.Count == _levelItems.Count;
            BadgeLevelActive.Visibility = allSel ? Visibility.Collapsed : Visibility.Visible;
            TxtActiveLevels.Text = allSel ? "" : $"🔍 Filter: {string.Join(" • ", sel)}";
        }

        private async Task RefreshWithFilterAsync()
        {
            if (_bomResult == null) return;
            BtnExport.IsEnabled = false;
            var lf = GetLevelFilter();
            await Task.Run(() => { _bomResult = RevitDataExtractor.Extract(_doc, lf); });
            BtnExport.IsEnabled = true;
            RefreshBadges();
        }

        private HashSet<string>? GetLevelFilter()
        {
            var sel = _levelItems.Where(x => x.IsSelected).Select(x => x.Name).ToHashSet();
            return sel.Count == _levelItems.Count ? null : sel;
        }

        // ────────────────────────────────────────────────────────────────────
        //  FOOTER INFO
        // ────────────────────────────────────────────────────────────────────
        private void UpdateFooter()
        {
            int catCount = new[] {
                ChkLighting.IsChecked, ChkReceptacle.IsChecked, ChkCableTray.IsChecked,
                ChkPA.IsChecked, ChkFireAlarm.IsChecked, ChkData.IsChecked
            }.Count(x => x == true);

            int selLev = _levelItems.Count(x => x.IsSelected);
            string levInfo = selLev == _levelItems.Count
                ? "semua level"
                : $"{selLev} level";

            int total = 0;
            if (_bomResult != null)
            {
                if (ChkLighting.IsChecked   == true) total += _bomResult.Lighting.Count;
                if (ChkReceptacle.IsChecked == true) total += _bomResult.Receptacles.Count;
                if (ChkCableTray.IsChecked  == true) total += _bomResult.CableTrays.Count;
                if (ChkPA.IsChecked         == true) total += _bomResult.PublicAddress.Count;
                if (ChkFireAlarm.IsChecked  == true) total += _bomResult.FireAlarms.Count;
                if (ChkData.IsChecked       == true) total += _bomResult.DataPoints.Count;
            }
            TxtTotalCount.Text = $"{total} grup";
            TxtCatInfo.Text    = $"{catCount}/6 kategori • {levInfo}";
        }

        // ────────────────────────────────────────────────────────────────────
        //  BROWSE + EXPORT
        // ────────────────────────────────────────────────────────────────────
        private void BrowseFile_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new SaveFileDialog
            {
                Title      = "Simpan BOM Excel",
                Filter     = "Excel Workbook (*.xlsx)|*.xlsx",
                FileName   = $"BOM_Electrical_{_doc.Title}_{DateTime.Now:yyyyMMdd}",
                DefaultExt = ".xlsx"
            };
            if (dlg.ShowDialog() == true) TxtFilePath.Text = dlg.FileName;
        }

        private async void Export_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(TxtFilePath.Text) || TxtFilePath.Text.StartsWith("Pilih"))
            {
                Warn("Pilih lokasi file terlebih dahulu."); return;
            }
            if (_bomResult == null) { Warn("Data belum dimuat, tunggu sebentar."); return; }

            bool l  = ChkLighting.IsChecked   == true;
            bool r  = ChkReceptacle.IsChecked  == true;
            bool ct = ChkCableTray.IsChecked   == true;
            bool pa = ChkPA.IsChecked          == true;
            bool fa = ChkFireAlarm.IsChecked   == true;
            bool d  = ChkData.IsChecked        == true;

            if (!l && !r && !ct && !pa && !fa && !d) { Warn("Pilih minimal satu kategori."); return; }
            if (_levelItems.Count(x => x.IsSelected) == 0) { Warn("Pilih minimal satu level."); return; }

            string filePath    = TxtFilePath.Text;
            BOMResult snapshot = _bomResult;
            BtnExport.IsEnabled = false;
            ShowProgress("Membuat file Excel...", 20);

            try
            {
                UpdateStatus("Menyusun sheet per kategori...", 50);
                await Task.Run(() => ExcelExporter.Export(snapshot, filePath, l, r, ct, pa, fa, d));
                UpdateStatus("Selesai!", 100);
                await Task.Delay(400);
                HideProgress();

                int selLev   = _levelItems.Count(x => x.IsSelected);
                string levMsg = selLev == _levelItems.Count
                    ? "Semua Level"
                    : string.Join(", ", _levelItems.Where(x => x.IsSelected).Select(x => x.Name));

                var res = MessageBox.Show(
                    $"✅  BOM berhasil diekspor!\n\n" +
                    $"File     : {System.IO.Path.GetFileName(filePath)}\n" +
                    $"Kategori : {new[] { l,r,ct,pa,fa,d }.Count(x=>x)}/6\n" +
                    $"Level    : {levMsg}\n\n" +
                    "Buka file sekarang?",
                    "Export Berhasil", MessageBoxButton.YesNo, MessageBoxImage.Information);

                if (res == MessageBoxResult.Yes)
                    System.Diagnostics.Process.Start(
                        new System.Diagnostics.ProcessStartInfo(filePath) { UseShellExecute = true });

                Close();
            }
            catch (Exception ex)
            {
                HideProgress();
                MessageBox.Show($"Gagal mengekspor:\n\n{ex.Message}",
                    "BOM Export — Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
            finally { BtnExport.IsEnabled = true; }
        }

        private void Cancel_Click(object sender, RoutedEventArgs e) => Close();

        // ── Helpers ──────────────────────────────────────────────────────────
        private static void Warn(string msg) =>
            MessageBox.Show(msg, "BOM Export", MessageBoxButton.OK, MessageBoxImage.Warning);

        private void ShowProgress(string msg, int pct)
        {
            PanelProgress.Visibility = Visibility.Visible;
            TxtStatus.Text  = msg;
            PrgBar.Value    = pct;
            TxtPercent.Text = $"{pct}%";
        }

        private void UpdateStatus(string sub, int pct) => Dispatcher.Invoke(() =>
        {
            TxtSubStatus.Text = sub;
            PrgBar.Value      = pct;
            TxtPercent.Text   = $"{pct}%";
        });

        private void HideProgress() => PanelProgress.Visibility = Visibility.Collapsed;
    }
}
