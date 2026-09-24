import React, { useState, useRef } from 'react';
import { Race } from '../data/races';
import { CertificatePlacements } from '../types';
import { exportRaceToExcel, importRaceFromExcel } from '../utils/exportRaceExcel';
import { DEFAULT_NGHE_AN_PLACEMENTS } from '../data/certificatePlacements';
import { testScriptConnection } from '../data/raceStorage';
import {
  Plus,
  Trophy,
  ExternalLink,
  Copy,
  Check,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Code2,
  Eye,
  Sliders,
  Sparkles,
  Link2,
  Calendar,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RaceManagerTabProps {
  races: Race[];
  activeRaceId: string;
  currentPlacements: CertificatePlacements;
  onRefreshRaces: () => Promise<void>;
  onSelectRaceForPlacements: (race: Race) => void;
  onNavigateToRace: (slug: string) => void;
}

export const RaceManagerTab: React.FC<RaceManagerTabProps> = ({
  races,
  activeRaceId,
  currentPlacements,
  onRefreshRaces,
  onSelectRaceForPlacements,
  onNavigateToRace,
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRace, setEditingRace] = useState<Race | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBgUrl, setFormBgUrl] = useState('/NA26.png');
  const [formBgDataUrl, setFormBgDataUrl] = useState<string | null>(null);
  const [formScriptUrl, setFormScriptUrl] = useState('');
  const [formDate, setFormDate] = useState('2026');
  const [formLocation, setFormLocation] = useState('');
  const [formPlacements, setFormPlacements] = useState<CertificatePlacements>(
    () => currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS
  );
  const [showPlacementsSection, setShowPlacementsSection] = useState(true);

  // Status & Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [savedRaceForExport, setSavedRaceForExport] = useState<Race | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Excel File Input Ref for Import
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  // Script Connection Testing
  const [isTestingScript, setIsTestingScript] = useState(false);
  const [scriptTestResult, setScriptTestResult] = useState<{
    success: boolean;
    count?: number;
    message: string;
  } | null>(null);

  // File input ref for certificate background upload
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Helper to slugify string
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleOpenCreateModal = () => {
    setEditingRace(null);
    setFormName('');
    setFormSlug('');
    setFormCode('');
    setFormBgUrl('/NA26.png');
    setFormBgDataUrl(null);
    setFormScriptUrl('');
    setFormDate('2026');
    setFormLocation('');
    setFormPlacements(currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS);
    setFormError(null);
    setSaveSuccessMsg(null);
    setSavedRaceForExport(null);
    setScriptTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (race: Race) => {
    setEditingRace(race);
    setFormName(race.name);
    setFormSlug(race.slug);
    setFormCode(race.code);
    setFormBgUrl(race.defaultBgUrl || '/NA26.png');
    setFormBgDataUrl(null);
    setFormScriptUrl(race.appsScriptUrl || '');
    setFormDate(race.date || '2026');
    setFormLocation(race.locationFull || '');
    setFormPlacements(race.placements || currentPlacements || DEFAULT_NGHE_AN_PLACEMENTS);
    setFormError(null);
    setSaveSuccessMsg(null);
    setSavedRaceForExport(null);
    setScriptTestResult(null);
    setIsModalOpen(true);
  };

  // Import from Excel file (.xlsx)
  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    try {
      const { raceInfo, placements: importedPlacements } = await importRaceFromExcel(file);

      setEditingRace(null);
      if (raceInfo.name) setFormName(raceInfo.name);
      if (raceInfo.slug) setFormSlug(raceInfo.slug);
      if (raceInfo.code) setFormCode(raceInfo.code);
      if (raceInfo.defaultBgUrl) setFormBgUrl(raceInfo.defaultBgUrl);
      if (raceInfo.appsScriptUrl) setFormScriptUrl(raceInfo.appsScriptUrl);
      if (raceInfo.date) setFormDate(raceInfo.date);
      if (raceInfo.locationFull) setFormLocation(raceInfo.locationFull);
      if (importedPlacements && Object.keys(importedPlacements).length > 0) {
        setFormPlacements(importedPlacements);
      }

      setFormError(null);
      setSaveSuccessMsg(
        'Đã đọc thành công thông tin giải đấu và toàn bộ toạ độ chỉnh phôi từ file Excel! Vui lòng kiểm tra lại và bấm "Lưu & Khởi Tạo Giải".'
      );
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhập file Excel');
    } finally {
      setIsImportingExcel(false);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingRace) {
      const generatedSlug = slugify(val);
      setFormSlug(generatedSlug);
      // Auto generate code from uppercase initials
      const words = val.trim().split(/\s+/);
      const codeSuggestion = words
        .map((w) => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 4) + '26';
      setFormCode(codeSuggestion || 'VM26');
    }
  };

  // Handle certificate background upload
  const handleBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormBgDataUrl(dataUrl);
      setFormBgUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Test script connection
  const handleTestScript = async () => {
    if (!formScriptUrl.trim()) {
      setScriptTestResult({
        success: false,
        message: 'Vui lòng nhập đường link Google Apps Script trước khi kiểm tra.',
      });
      return;
    }
    setIsTestingScript(true);
    setScriptTestResult(null);
    try {
      const result = await testScriptConnection(formScriptUrl);
      setScriptTestResult(result);
    } catch (err: any) {
      setScriptTestResult({
        success: false,
        message: err.message || 'Lỗi kiểm tra kết nối script',
      });
    } finally {
      setIsTestingScript(false);
    }
  };

  // Save race
  const handleSubmitRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Vui lòng nhập Tên giải đấu.');
      return;
    }
    if (!formSlug.trim()) {
      setFormError('Vui lòng nhập URL vào trang (slug).');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSaveSuccessMsg(null);

    try {
      const cleanSlug = slugify(formSlug);
      const racePayload = {
        id: editingRace?.id || cleanSlug,
        slug: cleanSlug,
        code: formCode.trim() || cleanSlug.toUpperCase().slice(0, 6),
        name: formName.trim(),
        shortName: formName.trim(),
        defaultBgUrl: formBgUrl,
        appsScriptUrl: formScriptUrl.trim(),
        date: formDate.trim() || '2026',
        locationFull: formLocation.trim() || 'Việt Nam',
        placements: editingRace?.placements || currentPlacements,
      };

      const resp = await fetch('/api/admin/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: '0966559155',
          race: racePayload,
          backgroundDataUrl: formBgDataUrl,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Lỗi khi lưu giải đấu');
      }

      await onRefreshRaces();
      setSaveSuccessMsg(`Đã lưu thành công giải "${data.race.name}"!`);
      setSavedRaceForExport(data.race);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi kết nối tới máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete race
  const handleDeleteRace = async (race: Race) => {
    if (race.id === 'nghe-an-2026') {
      alert('Không thể xoá giải đấu mặc định Nghệ An 2026.');
      return;
    }
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xoá giải "${race.name}"?`);
    if (!confirmed) return;

    try {
      const resp = await fetch(`/api/admin/races/${race.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': '0966559155' },
      });
      if (resp.ok) {
        await onRefreshRaces();
      } else {
        const d = await resp.json();
        alert(d.error || 'Lỗi xoá giải');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối');
    }
  };

  const copyUrl = (slug: string) => {
    const full = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(full);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-850 p-5 rounded-2xl border border-stone-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Quản Lý & Tạo Giải Đấu</h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-900/60 border border-teal-700 text-teal-300 text-xs font-semibold">
              {races.length} giải đấu
            </span>
          </div>
          <p className="text-stone-400 text-xs max-w-2xl leading-relaxed">
            Mỗi giải đấu có tên riêng, đường dẫn URL vào trang riêng, phôi nền Certificate chuẩn HD và Google Apps Script riêng để gọi dữ liệu VĐV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Giải Mới</span>
        </button>
      </div>

      {/* Races Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => {
          const isActive = race.id === activeRaceId;
          const pageUrl = `${window.location.origin}/${race.slug}`;

          return (
            <div
              key={race.id}
              className={`bg-stone-850 rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'border-teal-500/80 ring-2 ring-teal-500/20 shadow-lg'
                  : 'border-stone-800 hover:border-stone-700 shadow-md'
              }`}
            >
              {/* Card Header with Background Preview Banner */}
              <div className="relative h-32 bg-stone-900 overflow-hidden border-b border-stone-800 flex items-center justify-center group">
                <img
                  src={race.defaultBgUrl || '/NA26.png'}
                  alt={race.name}
                  className="w-full h-full object-cover object-top opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-stone-900/90 border border-stone-700 text-white font-mono text-[11px] font-bold">
                    {race.code || race.slug.toUpperCase()}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Đang chọn</span>
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <h3 className="text-white font-bold text-sm leading-snug line-clamp-1 drop-shadow-md">
                    {race.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-stone-300 mt-0.5">
                    {race.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{race.date}</span>
                      </span>
                    )}
                    {race.locationFull && (
                      <span className="flex items-center gap-1 line-clamp-1">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{race.locationFull}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                {/* 1. URL Path */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-teal-400" />
                      <span>URL Vào Trang:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => copyUrl(race.slug)}
                      className="text-stone-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    >
                      {copiedSlug === race.slug ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-teal-300 text-[11px] truncate select-all">
                    /{race.slug}
                  </div>
                </div>

                {/* 2. Apps Script Data */}
                <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-sky-400" />
                    <span>Script Data Riêng:</span>
                  </div>
                  <div className="font-mono text-stone-300 text-[11px] truncate">
                    {race.appsScriptUrl ? (
                      <span className="text-emerald-400">✓ Đã liên kết Apps Script</span>
                    ) : (
                      <span className="text-stone-500 italic">Dùng script mặc định hệ thống</span>
                    )}
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="pt-2 border-t border-stone-800 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* View Page */}
                    <button
                      type="button"
                      onClick={() => onNavigateToRace(race.slug)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Mở trang tra cứu của giải này"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                      <span>Vào trang</span>
                    </button>

                    {/* Placements Studio */}
                    <button
                      type="button"
                      onClick={() => onSelectRaceForPlacements(race)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/80 text-teal-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Chỉnh toạ độ và kích thước chữ trên phôi giải này"
                    >
                      <Sliders className="w-3.5 h-3.5 text-teal-400" />
                      <span>Chỉnh phôi</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Export Excel Button (Yêu cầu 2 của người dùng) */}
                    <button
                      type="button"
                      onClick={() => exportRaceToExcel(race, race.placements || currentPlacements)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-700/80 text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                      title="Xuất file cấu hình Excel (.xlsx) chứa toàn bộ thiết lập giải và toạ độ text"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Xuất Excel (.xlsx)</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(race)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                      title="Chỉnh sửa giải đấu"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete (if not default) */}
                    {race.id !== 'nghe-an-2026' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRace(race)}
                        className="p-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                        title="Xoá giải đấu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT RACE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl text-stone-100 my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingRace ? 'Chỉnh Sửa Giải Đấu' : 'Tạo Giải Đấu Mới'}
                  </h3>
                  <p className="text-stone-400 text-xs">
                    Cấu hình gồm Tên giải, URL vào trang, Phôi nền Certificate và Script data
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success message banner with Export Excel action */}
            {saveSuccessMsg && (
              <div className="mb-5 p-4 bg-emerald-950/70 border border-emerald-600 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {savedRaceForExport && (
                    <button
                      type="button"
                      onClick={() => exportRaceToExcel(savedRaceForExport, currentPlacements)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Xuất File Excel Cấu Hình (.xlsx)</span>
                    </button>
                  )}
                  {savedRaceForExport && (
                    <button
                      type="button"
                      onClick={() => onNavigateToRace(savedRaceForExport.slug)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem trang giải ngay</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {formError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRace} className="space-y-4">
              {/* 1/ Tên giải */}
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  1/ Tên Giải Đấu <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: VnExpress Marathon Ha Long 2026"
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              {/* 2/ URL ĐỂ VÀO TRANG */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-200 mb-1">
                    2/ URL Để Vào Trang (Slug) <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus-within:border-teal-500">
                    <span className="text-stone-500 font-mono select-none">/</span>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(slugify(e.target.value))}
                      placeholder="ha-long-2026"
                      className="w-full bg-transparent text-teal-300 font-mono focus:outline-none ml-0.5"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Ví dụ truy cập: <span className="font-mono text-teal-400">{window.location.origin}/{formSlug || 'ten-giai'}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Mã giải (Code)
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="HL26"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* 3/ Background cho phần Certificate */}
              <div>
                <label className="block text-xs font-bold text-stone-200 mb-1">
                  3/ Background Cho Phần Certificate (Giống ảnh NA26)
                </label>
                <div className="p-3 bg-stone-800/80 border border-stone-700 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail preview */}
                    <div className="w-16 h-24 rounded-lg bg-stone-900 border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {formBgUrl ? (
                        <img
                          src={formBgUrl}
                          alt="Certificate Background Preview"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-stone-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          ref={bgFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgFileSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bgFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh phôi mới (PNG/JPG)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormBgUrl('/NA26.png');
                            setFormBgDataUrl(null);
                          }}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 text-[11px] rounded-lg border border-stone-700 cursor-pointer"
                        >
                          Dùng phôi NA26
                        </button>
                      </div>

                      <div className="text-[11px] text-stone-400">
                        {formBgDataUrl ? (
                          <span className="text-emerald-400 font-medium">✓ Đã chọn ảnh mới từ máy (sẽ được lưu vào hệ thống)</span>
                        ) : (
                          <span>Đang dùng: <code className="text-teal-400 font-mono">{formBgUrl}</code> (Kích thước in chuẩn HD: 1469 × 3508 px)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4/ Add Script (để gọi data riêng theo giải) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-200">
                    4/ Add Script (để gọi data riêng theo giải)
                  </label>
                  <button
                    type="button"
                    onClick={handleTestScript}
                    disabled={isTestingScript || !formScriptUrl.trim()}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isTestingScript ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Kiểm tra kết nối script</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={formScriptUrl}
                  onChange={(e) => setFormScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec?key=..."
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 font-mono focus:outline-none focus:border-teal-500"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Đường link Google Apps Script triển khai dạng Web App (doGet) trả về dữ liệu vận động viên theo giải.
                </p>

                {/* Script test result badge */}
                {scriptTestResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      scriptTestResult.success
                        ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                        : 'bg-amber-950/50 border-amber-700 text-amber-300'
                    }`}
                  >
                    {scriptTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{scriptTestResult.message}</p>
                      {scriptTestResult.sample && (
                        <p className="text-[10px] text-stone-400 mt-0.5 font-mono">
                          Mẫu VĐV: {scriptTestResult.sample.bib} - {scriptTestResult.sample.name} ({scriptTestResult.sample.distance})
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Thông tin bổ sung */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Ngày diễn ra giải
                  </label>
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="26/07/2026"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Địa điểm tổ chức
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="TP. Hạ Long, Quảng Ninh"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingRace ? 'Lưu Thay Đổi' : 'Lưu & Khởi Tạo Giải'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
