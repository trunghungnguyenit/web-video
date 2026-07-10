'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';
import {
  Type, Link2, Image, File, Send, AlertCircle, Loader2,
  CheckCircle2, Bookmark, Gauge, Palette, ChevronDown, ChevronUp,
  Sliders, X, Plus,
} from 'lucide-react';
import { cn, formatCount } from '@/lib/utils';
import type { SceneGenerationResult } from '@/lib/scenes';
import type { CharacterMasterHandle } from '@/components/features/character-master';
import type { PresetInput } from '@/lib/preset-scripts';
import { getApiKey, API_KEY_IDS } from '@/lib/api-keys-store';
import { getVeoApiKey } from '@/lib/veo-models';
import { buildAnalyzePipeline, toPipelineCharacters } from '@/lib/pipeline-payload';
import { logAnalyzePipeline } from '@/lib/pipeline-debug-log';
import { useProjectSettings } from '@/contexts/project-settings-context';
import { useBulkProjects } from '@/contexts/bulk-projects-context';

// ─── Voice Speed config ───────────────────────────────────────────────────────
const SPEED_OPTIONS = [
  { value: 0.75, label: '0.75×', desc: 'Chậm' },
  { value: 1,    label: '1×',    desc: 'Bình thường' },
  { value: 1.25, label: '1.25×', desc: 'Hơi nhanh' },
  { value: 1.5,  label: '1.5×',  desc: 'Nhanh' },
  { value: 2,    label: '2×',    desc: 'Rất nhanh' },
];

// ─── Scene Style config ───────────────────────────────────────────────────────
const SCENE_STYLES = [
  { id: 'cinematic',       label: 'Cinematic',        emoji: '🎥', desc: 'Chân thực, điện ảnh' },
  { id: 'cartoon-finance', label: 'Cartoon',           emoji: '📊', desc: 'Nền trắng, dễ hiểu' },
  { id: '2d-explainer',   label: '2D Animation',      emoji: '🎬', desc: 'Explainer video' },
  { id: 'dark-fantasy',   label: 'Dark Fantasy',      emoji: '🌑', desc: 'Gothic, huyền bí' },
  { id: 'watercolor',     label: 'Watercolor',        emoji: '🎨', desc: 'Màu nước nhẹ nhàng' },
  { id: 'flat-design',    label: 'Flat Design',       emoji: '⬜', desc: 'Phẳng, tối giản' },
  { id: 'anime',          label: 'Anime / Manga',     emoji: '🇯🇵', desc: 'Phong cách Nhật' },
  { id: 'cyberpunk',      label: 'Cyberpunk',         emoji: '🌆', desc: 'Sci-Fi tương lai' },
  { id: 'oil-painting',   label: 'Oil Painting',      emoji: '🖌️', desc: 'Sơn dầu cổ điển' },
  { id: 'chalk-dark',     label: 'Chalk / Sketch',    emoji: '✏️', desc: 'Nền tối, phác thảo' },
  { id: 'renaissance',    label: 'Renaissance',       emoji: '🖼️', desc: 'Caravaggio style' },
  { id: 'comic',          label: 'Comic / Pop Art',   emoji: '💥', desc: 'Truyện tranh' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'text' | 'link' | 'image' | 'file';

const tabs: { id: TabId; icon: typeof Type; label: string; desc: string }[] = [
  { id: 'text',  icon: Type,  label: 'Tự nhập nội dung', desc: 'Nhập từ bàn phím' },
  { id: 'link',  icon: Link2, label: 'Từ link video',    desc: 'YouTube, TikTok...' },
  { id: 'image', icon: Image, label: 'Từ hình ảnh',      desc: 'Tải lên hình ảnh' },
  { id: 'file',  icon: File,  label: 'Từ file',          desc: 'PDF, Word, DOCX...' },
];

// ─── Validation limits ────────────────────────────────────────────────────────
const MAX_CHARS         = 5000;
const MIN_CONTENT_CHARS = 20;
const MAX_IMAGE_MB      = 10;
const MAX_IMAGES        = 12;
const MAX_FILE_MB       = 20;
const IMAGE_MIME        = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FILE_MIME         = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const FILE_EXT_HINT     = /\.(pdf|doc|docx|txt)$/i;

// Cho phép các host video phổ biến — kiểm tra để cảnh báo cụ thể
const SUPPORTED_HOSTS = ['youtube.com', 'youtu.be', 'tiktok.com', 'vimeo.com', 'facebook.com', 'fb.watch'];

// ─── Types cho form ───────────────────────────────────────────────────────────

interface FormErrors {
  content?: string;
  linkUrl?: string;
  upload?: string;
  submit?: string;
  /** Lỗi prompt theo id ảnh */
  imagePrompts?: Record<string, string>;
  /** Lỗi prompt tổng tab ảnh */
  imageMasterBrief?: string;
}

interface FormState {
  activeTab: TabId;
  content: string;
  linkUrl: string;
  dragOver: boolean;
  isSubmitting: boolean;
  submitted: boolean;
}

export interface InputSectionProps {
  presetData?: PresetInput | null;
  presetKey?: number;
  onSaveScript?: (
    content: string,
    meta: { language: string; sceneCount: string; videoType: string; voice: string; aspectRatio: string; sceneDuration: string; videoQuality: string }
  ) => void;
  /** Sidebar click "Nhập nội dung" → scroll + focus textarea */
  focusContentKey?: number;
  /** Sidebar click "Tốc độ giọng" → scroll + mở accordion */
  focusVoiceSpeedKey?: number;
  /** Sidebar click "Phong cách cảnh" → scroll + mở accordion */
  focusSceneStyleKey?: number;
  /** Sau khi phân tích xong — optional legacy callback */
  onScenesGenerated?: (result: SceneGenerationResult, projectId: string) => void | Promise<void>;
  /** ID bulk project — khóa kết quả phân tích đúng dự án */
  projectId?: string;
  /** Nội dung prompt lưu theo bulk */
  initialContent?: string;
  onContentChange?: (content: string) => void;
  /** Ref mục 1 — lấy danh sách nhân vật khi gửi Gemini */
  characterMasterRef?: RefObject<CharacterMasterHandle | null>;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateContent(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return 'Vui lòng nhập nội dung để AI có thể tạo video.';
  if (s.length < MIN_CONTENT_CHARS) {
    return `Nội dung quá ngắn — cần ít nhất ${MIN_CONTENT_CHARS} ký tự (hiện tại: ${s.length}).`;
  }
  if (s.length > MAX_CHARS) {
    return `Nội dung quá dài — tối đa ${formatCount(MAX_CHARS)} ký tự (hiện tại: ${formatCount(s.length)}).`;
  }
  return undefined;
}

function validateUrl(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return 'Vui lòng nhập URL video.';
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return 'URL không hợp lệ — cần dạng đầy đủ, ví dụ: https://www.youtube.com/watch?v=...';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return `URL phải bắt đầu bằng http:// hoặc https:// (hiện tại: ${url.protocol}).`;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const supported = SUPPORTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (!supported) {
    return `Nền tảng "${host}" chưa được hỗ trợ. Vui lòng dùng: YouTube, TikTok, Vimeo, Facebook.`;
  }
  return undefined;
}

const MIN_IMAGE_PROMPT_CHARS = 10;

interface UploadedImageItem {
  id: string;
  file: File | null;
  previewUrl: string | null;
  prompt: string;
  /** Tiêu đề cảnh — preset stickman */
  label?: string;
  /** Gợi ý lời kể TTS */
  voiceHint?: string;
}

function createImageId(): string {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function revokeImagePreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

function validateImagePrompt(raw: string, optional = false): string | undefined {
  const s = raw.trim();
  if (!s) return optional ? undefined : 'Nhập prompt mô tả cảnh muốn tạo từ ảnh này.';
  if (s.length < MIN_IMAGE_PROMPT_CHARS) {
    return `Prompt quá ngắn — cần ít nhất ${MIN_IMAGE_PROMPT_CHARS} ký tự (hiện tại: ${s.length}).`;
  }
  return undefined;
}

/** Prompt tổng — bắt buộc đủ dài nếu người dùng nhập; rỗng thì hợp lệ (dùng prompt từng ảnh) */
function validateImageMasterBrief(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  if (s.length < MIN_IMAGE_PROMPT_CHARS) {
    return `Prompt tổng quá ngắn — cần ít nhất ${MIN_IMAGE_PROMPT_CHARS} ký tự (hiện tại: ${s.length}).`;
  }
  return undefined;
}

function hasValidImageMasterBrief(raw: string): boolean {
  return raw.trim().length >= MIN_IMAGE_PROMPT_CHARS;
}

function buildImagePipelineContent(images: UploadedImageItem[], masterBrief?: string): string {
  const header = masterBrief?.trim()
    || `Tạo video từ ${images.length} hình ảnh. Mỗi ảnh tương ứng một cảnh — dùng VIDEO PROMPT làm hướng dẫn visual.`;
  const lines = [header, ''];

  images.forEach((img, i) => {
    const heading = img.label || `CẢNH ${i + 1}`;
    const fileNote = img.file ? ` (${img.file.name})` : '';
    lines.push(`## ${heading}${fileNote}`);
    lines.push('');
    lines.push('VIDEO PROMPT:');
    const scenePrompt = img.prompt.trim();
    if (scenePrompt) {
      lines.push(scenePrompt);
    } else if (masterBrief?.trim()) {
      lines.push(
        'Áp dụng PROMPT TỔNG ở đầu kịch bản cho cảnh này — phân tích ảnh đính kèm và tạo mô tả visual phù hợp, đồng nhất phong cách với các cảnh khác.',
      );
    }
    if (img.voiceHint?.trim()) {
      lines.push('');
      lines.push('VOICE (TTS):');
      lines.push(img.voiceHint.trim());
    }
    lines.push('');
  });
  return lines.join('\n').trim();
}

function validateImageFile(file: File): string | undefined {
  const sizeMB = file.size / 1024 / 1024;
  if (!IMAGE_MIME.includes(file.type) && !file.type.startsWith('image/')) {
    return `File "${file.name}" không phải hình ảnh hợp lệ. Chấp nhận: JPG, PNG, WebP, GIF.`;
  }
  if (sizeMB > MAX_IMAGE_MB) {
    return `File "${file.name}" quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_IMAGE_MB} MB.`;
  }
  return undefined;
}

function validateDocumentFile(file: File | null): string | undefined {
  if (!file) return 'Vui lòng tải lên file nội dung (PDF, DOC, DOCX hoặc TXT).';
  const sizeMB = file.size / 1024 / 1024;
  const okMime = FILE_MIME.includes(file.type);
  const okExt = FILE_EXT_HINT.test(file.name);
  if (!okMime && !okExt) {
    return `File "${file.name}" không đúng định dạng. Chấp nhận: PDF, DOC, DOCX, TXT.`;
  }
  if (sizeMB > MAX_FILE_MB) {
    return `File "${file.name}" quá lớn (${sizeMB.toFixed(1)} MB) — tối đa ${MAX_FILE_MB} MB.`;
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InputSection({
  presetData, presetKey, onSaveScript,
  focusContentKey, focusVoiceSpeedKey, focusSceneStyleKey, onScenesGenerated,
  characterMasterRef, projectId, initialContent = '', onContentChange,
}: InputSectionProps = {}) {
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const voiceSpeedRef = useRef<HTMLDivElement>(null);
  const sceneStyleRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    activeTab: 'text', content: initialContent, linkUrl: '',
    dragOver: false, isSubmitting: false, submitted: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const uploadedImagesRef = useRef<UploadedImageItem[]>([]);
  uploadedImagesRef.current = uploadedImages;
  const [imageMasterBrief, setImageMasterBrief] = useState(initialContent);
  const [pendingImageSlotId, setPendingImageSlotId] = useState<string | null>(null);
  const [justApplied, setJustApplied]   = useState(false);
  const [savedScript, setSavedScript]   = useState(false);

  const { settings, patchSettings, applyFromPreset, hasVeoKey } = useProjectSettings();
  const { startBulkAnalyze, projects } = useBulkProjects();
  const { voiceSpeed, sceneStyle } = settings;

  const bulkStatus = projects.find((p) => p.id === projectId)?.status;
  const isBulkBusy = bulkStatus === 'analyzing' || bulkStatus === 'generating';
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isBulkBusy) {
      submitLockRef.current = false;
    }
  }, [isBulkBusy]);

  const [showVoiceSpeed, setShowVoiceSpeed] = useState(false);
  const [showSceneStyle, setShowSceneStyle] = useState(false);

  // ── Preset apply ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!presetData) return;
    applyFromPreset(presetData);
    setErrors({});
    setUploadedFile(null);
    setUploadedImages((prev) => {
      prev.forEach((img) => revokeImagePreview(img.previewUrl));
      return [];
    });

    if (presetData.inputType === 'image' && presetData.imageScenes?.length) {
      setImageMasterBrief(presetData.content);
      setForm((f) => ({
        ...f,
        activeTab: 'image',
        content: presetData.content,
      }));
      setUploadedImages(
        presetData.imageScenes.map((scene) => ({
          id: createImageId(),
          file: null,
          previewUrl: null,
          prompt: scene.videoPrompt,
          label: scene.title,
          voiceHint: scene.voice,
        })),
      );
    } else {
      setImageMasterBrief('');
      setForm((f) => ({
        ...f,
        activeTab: 'text',
        content: presetData.content,
      }));
    }

    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  // ── Sidebar navigation triggers ───────────────────────────────────────────
  useEffect(() => {
    if (!focusContentKey) return;
    setForm((f) => ({ ...f, activeTab: 'text' }));
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [focusContentKey]);

  useEffect(() => {
    if (!focusVoiceSpeedKey) return;
    setShowVoiceSpeed(true);
    setTimeout(() => voiceSpeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }, [focusVoiceSpeedKey]);

  useEffect(() => {
    if (!focusSceneStyleKey) return;
    setShowSceneStyle(true);
    setTimeout(() => sceneStyleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }, [focusSceneStyleKey]);

  useEffect(() => () => {
    uploadedImagesRef.current.forEach((img) => revokeImagePreview(img.previewUrl));
  }, []);

  useEffect(() => {
    const content = form.activeTab === 'image' ? imageMasterBrief : form.content;
    const timer = setTimeout(() => onContentChange?.(content), 400);
    return () => clearTimeout(timer);
  }, [form.content, imageMasterBrief, form.activeTab, onContentChange]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const charCount   = form.content.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (form.activeTab === 'text') {
      const msg = validateContent(form.content);
      if (msg) e.content = msg;
    }
    if (form.activeTab === 'link') {
      const msg = validateUrl(form.linkUrl);
      if (msg) e.linkUrl = msg;
    }
    if (form.activeTab === 'image') {
      const masterMsg = validateImageMasterBrief(imageMasterBrief);
      if (masterMsg) e.imageMasterBrief = masterMsg;

      if (uploadedImages.length === 0) {
        e.upload = 'Vui lòng tải lên ít nhất một hình ảnh.';
      } else {
        const useMasterOnly = hasValidImageMasterBrief(imageMasterBrief);
        const promptErrors: Record<string, string> = {};
        for (const img of uploadedImages) {
          if (!img.file) {
            e.upload = `${img.label ?? 'Một cảnh'} chưa có ảnh — hãy tải hình minh họa cho cảnh này.`;
            break;
          }
          const fileMsg = validateImageFile(img.file);
          if (fileMsg) {
            e.upload = fileMsg;
            break;
          }
          const promptMsg = validateImagePrompt(img.prompt, useMasterOnly);
          if (promptMsg) promptErrors[img.id] = promptMsg;
        }
        if (!e.upload && Object.keys(promptErrors).length > 0) {
          e.imagePrompts = promptErrors;
        }
        if (
          !e.upload
          && !useMasterOnly
          && uploadedImages.every((img) => !img.prompt.trim())
          && !imageMasterBrief.trim()
        ) {
          e.imageMasterBrief = 'Nhập Prompt tổng hoặc prompt cho từng ảnh.';
        }
      }
    }
    if (form.activeTab === 'file') {
      const msg = validateDocumentFile(uploadedFile);
      if (msg) e.upload = msg;
    }
    setErrors(e);
    return e;
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || isBulkBusy) return;

    const e = validate();
    if (Object.keys(e).length > 0) {
      if (e.content) textareaRef.current?.focus();
      return;
    }

    submitLockRef.current = true;

    const geminiKey = getApiKey('gemini');
    if (!geminiKey.trim()) {
      submitLockRef.current = false;
      setErrors((p) => ({
        ...p,
        submit: 'Chưa có Gemini API Key — vào mục API Keys để nhập và lưu key.',
      }));
      return;
    }

    const veoKey = getVeoApiKey();
    if (!veoKey) {
      submitLockRef.current = false;
      setErrors((p) => ({
        ...p,
        submit: 'Chưa có Veo API Key — nhập key riêng tại mục API Keys (ô Veo) để tạo video Veo 3.',
      }));
      return;
    }
    if (!settings.veoModel?.trim()) {
      submitLockRef.current = false;
      setErrors((p) => ({
        ...p,
        submit: 'Chưa chọn model Veo — đợi danh sách model tải xong và chọn trong thanh cài đặt.',
      }));
      return;
    }

    setErrors((p) => ({ ...p, submit: undefined }));
    const submitProjectId = projectId ?? 'default';

    const contentForScenes =
      form.activeTab === 'text'
        ? form.content
        : form.activeTab === 'link'
          ? `Nội dung phân tích từ video: ${form.linkUrl.trim()}`
          : form.activeTab === 'image' && uploadedImages.length > 0
            ? buildImagePipelineContent(uploadedImages, imageMasterBrief)
            : uploadedFile
              ? `Nội dung trích xuất từ file "${uploadedFile.name}"`
              : form.content;

    const styleLabel = SCENE_STYLES.find((s) => s.id === sceneStyle)?.label ?? sceneStyle;
    const characters = toPipelineCharacters(characterMasterRef?.current?.getCharacters() ?? []);

    // Gom form → geminiInput / veoInput / ttsInput (pipeline-payload.ts)
    const pipeline = buildAnalyzePipeline({
      // ── API Keys (đọc từ localStorage, user lưu ở mục API Keys) ──
      geminiApiKey: geminiKey,              // Gemini — dùng ngay để gọi /api/gemini/analyze
      veoApiKey: veoKey,
      ttsApiKey: getApiKey(API_KEY_IDS.elevenlabs), // ElevenLabs — voiceover → audio MP3

      // ── Nội dung đầu vào (mục 2 — tab đang chọn) ──
      content: contentForScenes,            // Text / link / tên file upload
      inputType: form.activeTab,            // 'text' | 'link' | 'image' | 'file'

      // ── Cài đặt kịch bản → geminiInput ──
      language: settings.language,
      sceneCount: settings.sceneCount,
      videoType: settings.videoType,
      characters,

      aspectRatio: settings.aspectRatio,
      sceneDuration: settings.sceneDuration,
      videoQuality: settings.videoQuality,
      veoModel: settings.veoModel,
      sceneStyleLabel: styleLabel,
      sceneStyleId: sceneStyle,

      voice: settings.voice,
      voiceSpeed,
    });

    logAnalyzePipeline(
      pipeline,
      form.activeTab === 'image'
        ? {
            images: uploadedImages.map((img) => ({
              fileName: img.file?.name ?? '(chưa có file)',
              sizeMB: img.file ? (img.file.size / 1024 / 1024).toFixed(2) : '—',
              prompt: img.prompt.trim(),
            })),
          }
        : undefined,
    );

    const started = startBulkAnalyze(submitProjectId, {
      pipeline,
      sourceContent: contentForScenes,
      sceneCount: settings.sceneCount,
      videoType: settings.videoType,
      language: settings.language,
    });

    if (!started) {
      submitLockRef.current = false;
      return;
    }

    setForm((f) => ({ ...f, submitted: true }));
    setTimeout(() => setForm((f) => ({ ...f, submitted: false })), 3000);
  };

  const handleSaveScript = () => {
    const s = form.content.trim();
    if (!s) {
      setErrors((p) => ({ ...p, content: 'Cần có nội dung để lưu kịch bản.' }));
      textareaRef.current?.focus();
      return;
    }
    if (s.length < 10) {
      setErrors((p) => ({
        ...p,
        content: `Nội dung quá ngắn — cần ít nhất 10 ký tự để lưu (hiện tại: ${s.length}).`,
      }));
      textareaRef.current?.focus();
      return;
    }
    onSaveScript?.(form.content, {
      language: settings.language,
      sceneCount: settings.sceneCount,
      videoType: settings.videoType,
      voice: settings.voice,
      aspectRatio: settings.aspectRatio,
      sceneDuration: settings.sceneDuration,
      videoQuality: settings.videoQuality,
    });
    setSavedScript(true);
    setTimeout(() => setSavedScript(false), 2500);
  };

  const handleTabChange = (tab: TabId) => {
    setForm((f) => ({ ...f, activeTab: tab }));
    setErrors({});
    setUploadedFile(null);
    if (tab !== 'image') {
      setImageMasterBrief('');
      setUploadedImages((prev) => {
        prev.forEach((img) => revokeImagePreview(img.previewUrl));
        return [];
      });
    } else {
      setImageMasterBrief(initialContent);
    }
  };

  const attachImageToSlot = (slotId: string, file: File) => {
    const msg = validateImageFile(file);
    if (msg) {
      setErrors((p) => ({ ...p, upload: msg }));
      return;
    }
    setUploadedImages((prev) =>
      prev.map((img) => {
        if (img.id !== slotId) return img;
        revokeImagePreview(img.previewUrl);
        return {
          ...img,
          file,
          previewUrl: URL.createObjectURL(file),
        };
      }),
    );
    setErrors((p) => ({ ...p, upload: undefined }));
  };

  const openSlotUpload = (slotId: string) => {
    setPendingImageSlotId(slotId);
    fileInputRef.current?.click();
  };

  const addImages = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setUploadedImages((prev) => {
      const next = [...prev];
      let fileIndex = 0;
      let firstError: string | undefined;

      for (let i = 0; i < next.length && fileIndex < list.length; i++) {
        if (next[i].file) continue;
        const file = list[fileIndex];
        const msg = validateImageFile(file);
        if (msg) {
          firstError = msg;
          fileIndex++;
          continue;
        }
        revokeImagePreview(next[i].previewUrl);
        next[i] = {
          ...next[i],
          file,
          previewUrl: URL.createObjectURL(file),
        };
        fileIndex++;
      }

      const remaining = MAX_IMAGES - next.length;
      const toAdd = list.slice(fileIndex, fileIndex + Math.max(0, remaining));
      const newItems: UploadedImageItem[] = [];

      for (const file of toAdd) {
        const msg = validateImageFile(file);
        if (msg) {
          firstError = msg;
          continue;
        }
        newItems.push({
          id: createImageId(),
          file,
          previewUrl: URL.createObjectURL(file),
          prompt: '',
        });
      }

      if (fileIndex === 0 && newItems.length === 0 && firstError) {
        setErrors((p) => ({ ...p, upload: firstError }));
        return prev;
      }

      if (list.length > fileIndex + toAdd.length) {
        setErrors((p) => ({
          ...p,
          upload: `Chỉ thêm được tối đa ${MAX_IMAGES} ảnh.`,
        }));
      } else {
        setErrors((p) => ({ ...p, upload: undefined }));
      }

      return [...next, ...newItems];
    });
  };

  const removeImage = (id: string) => {
    setUploadedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) revokeImagePreview(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
    setErrors((p) => {
      const nextPrompts = p.imagePrompts ? { ...p.imagePrompts } : undefined;
      if (nextPrompts) delete nextPrompts[id];
      return {
        ...p,
        upload: undefined,
        imagePrompts: nextPrompts && Object.keys(nextPrompts).length > 0 ? nextPrompts : undefined,
      };
    });
  };

  const updateImageMasterBrief = (value: string) => {
    setImageMasterBrief(value);
    if (errors.imageMasterBrief) {
      setErrors((p) => ({ ...p, imageMasterBrief: undefined }));
    }
  };

  const updateImagePrompt = (id: string, prompt: string) => {
    setUploadedImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, prompt } : img)),
    );
    setErrors((p) => {
      if (!p.imagePrompts?.[id]) return p;
      const next = { ...p.imagePrompts };
      delete next[id];
      return {
        ...p,
        imagePrompts: Object.keys(next).length > 0 ? next : undefined,
      };
    });
  };

  const acceptFile = (file: File) => {
    const msg = validateDocumentFile(file);
    if (msg) {
      setErrors((p) => ({ ...p, upload: msg }));
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    setErrors((p) => ({ ...p, upload: undefined }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setForm((f) => ({ ...f, dragOver: false }));
    if (form.activeTab === 'image') {
      addImages(e.dataTransfer.files);
      return;
    }
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (form.activeTab === 'image') {
      const file = e.target.files?.[0];
      if (pendingImageSlotId && file) {
        attachImageToSlot(pendingImageSlotId, file);
        setPendingImageSlotId(null);
      } else if (e.target.files?.length) {
        addImages(e.target.files);
      }
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = '';
  };

  const acceptedTypes = form.activeTab === 'image'
    ? 'image/jpeg,image/png,image/webp,image/gif'
    : '.pdf,.doc,.docx,.txt';
  const isHighlighted = justApplied;

  const currentStyle = SCENE_STYLES.find((s) => s.id === sceneStyle);
  const currentSpeed = SPEED_OPTIONS.find((o) => o.value === voiceSpeed);
  const speedPercent = ((voiceSpeed - 0.75) / (2 - 0.75)) * 100;
  const imageMasterReady = hasValidImageMasterBrief(imageMasterBrief);

  return (
    <section
      aria-labelledby="section-input-heading"
      className={cn(
        'space-y-6 rounded-xl transition-all duration-300',
        isHighlighted && 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background p-4 -m-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 id="section-input-heading" className="text-xs font-bold text-primary uppercase tracking-widest">
          2. NHẬP NỘI DUNG ĐỂ AI TẠO VIDEO
        </h2>
        {justApplied && (
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />Đã điền từ kịch bản mẫu
          </span>
        )}
      </div>

      {/* Source tabs */}
      <div
        role="tablist"
        aria-label="Nguồn nội dung"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
      >
        {tabs.map((tab) => {
          const isActive = form.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'p-4 rounded-lg border transition-all text-left',
                isActive
                  ? 'bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20'
                  : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              <tab.icon className="w-5 h-5 mb-2" />
              <span className="block text-xs font-semibold leading-tight">{tab.label}</span>
              <span className="block text-xs text-muted-foreground mt-1">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Content input */}
      <div>
        {form.activeTab === 'text' && (
          <div>
            <textarea
              ref={textareaRef}
              value={form.content}
              aria-invalid={!!errors.content}
              aria-describedby={errors.content ? 'content-error' : undefined}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setForm((f) => ({ ...f, content: e.target.value }));
                  if (errors.content) setErrors((p) => ({ ...p, content: undefined }));
                }
              }}
              placeholder="Nhập nội dung để AI tạo video — ví dụ: kịch bản, chủ đề, ý tưởng..."
              className={cn(
                'w-full h-40 px-4 py-3 bg-card border rounded-lg text-foreground placeholder-muted-foreground resize-none focus:outline-none transition-colors',
                errors.content
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            <div className="flex items-center justify-between mt-1.5 gap-3">
              {errors.content ? (
                <p id="content-error" className="flex items-start gap-1 text-xs text-destructive leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{errors.content}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cần tối thiểu <span className="font-medium text-foreground">{MIN_CONTENT_CHARS}</span> ký tự.
                </p>
              )}
              <span
                className={cn(
                  'text-xs tabular-nums whitespace-nowrap',
                  charPercent > 90 ? 'text-destructive'
                  : charPercent > 70 ? 'text-yellow-400'
                  : 'text-muted-foreground',
                )}
              >
                {formatCount(charCount)} / {formatCount(MAX_CHARS)}
              </span>
            </div>
            {charPercent > 0 && (
              <div className="mt-1 h-0.5 bg-border rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    charPercent > 90 ? 'bg-destructive'
                    : charPercent > 70 ? 'bg-yellow-400'
                    : 'bg-primary',
                  )}
                  style={{ width: `${charPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {form.activeTab === 'link' && (
          <div>
            <input
              type="url"
              value={form.linkUrl}
              aria-invalid={!!errors.linkUrl}
              aria-describedby={errors.linkUrl ? 'link-error' : 'link-hint'}
              onChange={(e) => {
                setForm((f) => ({ ...f, linkUrl: e.target.value }));
                if (errors.linkUrl) setErrors((p) => ({ ...p, linkUrl: undefined }));
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={cn(
                'w-full px-4 py-3 bg-card border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none transition-colors',
                errors.linkUrl
                  ? 'border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/30'
                  : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
              )}
            />
            {errors.linkUrl ? (
              <p id="link-error" className="flex items-start gap-1 text-xs text-destructive mt-1.5 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errors.linkUrl}</span>
              </p>
            ) : (
              <p id="link-hint" className="text-xs text-muted-foreground mt-2">
                Hỗ trợ: YouTube, TikTok, Vimeo, Facebook.
              </p>
            )}
          </div>
        )}

        {form.activeTab === 'image' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="image-master-brief" className="text-xs font-semibold text-foreground">
                  Prompt tổng
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {imageMasterReady ? 'Đã đủ — có thể bỏ qua prompt từng ảnh' : 'Tuỳ chọn'}
                </span>
              </div>
              <textarea
                id="image-master-brief"
                value={imageMasterBrief}
                onChange={(e) => updateImageMasterBrief(e.target.value)}
                placeholder="Mô tả chung cho cả video: phong cách, bối cảnh, nhân vật, tone màu, lời kể... Nếu điền đủ, bạn không cần nhập prompt riêng cho từng ảnh."
                rows={4}
                className={cn(
                  'w-full resize-y min-h-[88px] px-3 py-2 text-xs rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1',
                  errors.imageMasterBrief
                    ? 'border-destructive/60 focus:ring-destructive/30'
                    : 'border-border focus:ring-primary/30',
                )}
              />
              {errors.imageMasterBrief ? (
                <p className="flex items-start gap-1 text-[11px] text-destructive leading-relaxed">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{errors.imageMasterBrief}</span>
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Dùng khi nhiều ảnh cùng một chủ đề. Prompt riêng từng ảnh vẫn có thể thêm để tinh chỉnh từng cảnh.
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadedImages.length > 0 && (
              <div className="space-y-3">
                {imageMasterBrief && uploadedImages.some((img) => img.label) && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                    Kịch bản mẫu — tải <strong className="text-foreground">1 ảnh stickman</strong> cho mỗi cảnh bên dưới. VIDEO PROMPT &amp; VOICE đã điền sẵn.
                  </p>
                )}
                {uploadedImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="flex gap-3 rounded-xl border border-border bg-card/50 p-3"
                  >
                    <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-border bg-muted">
                      {img.previewUrl && img.file ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img.previewUrl}
                          alt={img.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => openSlotUpload(img.id)}
                          className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Image className="w-7 h-7" />
                          <span className="text-[10px] font-medium px-1 text-center">Tải ảnh</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug">
                            {img.label ?? `Ảnh ${index + 1}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {img.file
                              ? `${img.file.name} · ${(img.file.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Chưa có ảnh — bấm ô trái để tải lên'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          title="Xóa cảnh"
                          className="shrink-0 w-7 h-7 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        value={img.prompt}
                        onChange={(e) => updateImagePrompt(img.id, e.target.value)}
                        placeholder={
                          imageMasterReady
                            ? 'VIDEO PROMPT riêng (tuỳ chọn) — bỏ trống để dùng Prompt tổng'
                            : 'VIDEO PROMPT — mô tả cảnh, chuyển động, góc quay...'
                        }
                        rows={3}
                        className={cn(
                          'w-full resize-y min-h-[72px] px-3 py-2 text-xs rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1',
                          errors.imagePrompts?.[img.id]
                            ? 'border-destructive/60 focus:ring-destructive/30'
                            : 'border-border focus:ring-primary/30',
                        )}
                      />

                      {img.voiceHint && (
                        <p className="text-[10px] text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-2">
                          <span className="font-semibold text-primary/90">VOICE (TTS): </span>
                          {img.voiceHint}
                        </p>
                      )}

                      {errors.imagePrompts?.[img.id] && (
                        <p className="flex items-start gap-1 text-[11px] text-destructive leading-relaxed">
                          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{errors.imagePrompts[img.id]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setForm((f) => ({ ...f, dragOver: true })); }}
              onDragLeave={() => setForm((f) => ({ ...f, dragOver: false }))}
              onDrop={handleDrop}
              onClick={() => uploadedImages.length < MAX_IMAGES && fileInputRef.current?.click()}
              className={cn(
                'w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors px-4 text-center',
                uploadedImages.length > 0 ? 'h-28' : 'h-40',
                form.dragOver ? 'border-primary bg-primary/5'
                : errors.upload ? 'border-destructive/60 bg-destructive/5 hover:border-destructive'
                : 'border-border hover:border-primary/50 hover:bg-card',
                uploadedImages.length >= MAX_IMAGES && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Plus className={cn('w-7 h-7', uploadedImages.length > 0 ? 'text-primary' : 'text-muted-foreground')} />
              <p className="text-sm text-muted-foreground">
                {uploadedImages.length > 0
                  ? `Thêm ảnh (${uploadedImages.length}/${MAX_IMAGES})`
                  : 'Kéo thả hoặc chọn nhiều hình ảnh'}
              </p>
              <p className="text-xs text-muted-foreground/70">
                JPG, PNG, WebP, GIF — tối đa {MAX_IMAGE_MB} MB/ảnh
              </p>
            </div>

            {errors.upload && (
              <p className="flex items-start gap-1 text-xs text-destructive leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errors.upload}</span>
              </p>
            )}
          </div>
        )}

        {form.activeTab === 'file' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setForm((f) => ({ ...f, dragOver: true })); }}
              onDragLeave={() => setForm((f) => ({ ...f, dragOver: false }))}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors px-4 text-center',
                form.dragOver ? 'border-primary bg-primary/5'
                : errors.upload ? 'border-destructive/60 bg-destructive/5 hover:border-destructive'
                : 'border-border hover:border-primary/50 hover:bg-card',
              )}
            >
              {uploadedFile ? (
                <>
                  <File className="w-8 h-8 text-primary" />
                  <p className="text-sm font-medium text-foreground truncate max-w-full">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB — Nhấn để thay thế
                  </p>
                </>
              ) : (
                <>
                  <File className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Kéo thả file PDF/Word vào đây, hoặc nhấn để chọn
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    PDF, DOC, DOCX, TXT — tối đa {MAX_FILE_MB} MB
                  </p>
                </>
              )}
            </div>
            {errors.upload && (
              <p className="flex items-start gap-1 text-xs text-destructive mt-1.5 leading-relaxed">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{errors.upload}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Tùy chỉnh nâng cao — nhóm Voice Speed + Scene Style ─────────── */}
      <div className="bg-card/40 border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/60 bg-background/40 flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            Tùy chỉnh nâng cao
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
            Tốc độ giọng · Phong cách cảnh
          </span>
        </div>

        {/* Tốc độ giọng (accordion) */}
        <div ref={voiceSpeedRef}>
          <button
            type="button"
            onClick={() => setShowVoiceSpeed((v) => !v)}
            aria-expanded={showVoiceSpeed}
            aria-controls="voice-speed-panel"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Gauge className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-semibold text-foreground">Tốc độ giọng đọc (TTS)</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  Hiện tại: <span className="text-primary font-medium">{voiceSpeed}×</span>
                  {' '}— {currentSpeed?.desc}
                </span>
              </div>
            </div>
            {showVoiceSpeed
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showVoiceSpeed && (
            <div id="voice-speed-panel" className="px-4 py-4 space-y-4 border-t border-border/60 bg-background/20">
              <div className="flex gap-2 flex-wrap">
                {SPEED_OPTIONS.map((opt) => {
                  const isActive = voiceSpeed === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => patchSettings({ voiceSpeed: opt.value })}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-center px-4 py-2 rounded-xl border text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary/15 border-primary/50 text-primary ring-1 ring-primary/25'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                      <span className="mt-0.5 opacity-70">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/20 rounded-lg border border-border/50">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${speedPercent}%` }} />
                </div>
                <span className="text-xs font-mono text-primary font-semibold w-10 text-right">{voiceSpeed}×</span>
              </div>
            </div>
          )}
        </div>

        {/* Phong cách cảnh (accordion) */}
        <div ref={sceneStyleRef} className="border-t border-border/60">
          <button
            type="button"
            onClick={() => setShowSceneStyle((v) => !v)}
            aria-expanded={showSceneStyle}
            aria-controls="scene-style-panel"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Palette className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-xs font-semibold text-foreground">Phong cách cảnh (Visual Style)</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5 truncate">
                  Hiện tại: <span className="text-primary font-medium">{currentStyle?.emoji} {currentStyle?.label}</span>
                  {' '}— {currentStyle?.desc}
                </span>
              </div>
            </div>
            {showSceneStyle
              ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          </button>

          {showSceneStyle && (
            <div id="scene-style-panel" className="px-4 py-4 border-t border-border/60 bg-background/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {SCENE_STYLES.map((style) => {
                  const isActive = sceneStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => patchSettings({ sceneStyle: style.id })}
                      aria-pressed={isActive}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                        isActive
                          ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/25'
                          : 'bg-background border-border hover:border-primary/30 hover:bg-muted/20',
                      )}
                    >
                      <span className="text-base leading-none">{style.emoji}</span>
                      <span className={cn('text-xs font-semibold leading-tight', isActive ? 'text-primary' : 'text-foreground')}>
                        {style.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{style.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions row */}
      {errors.submit && (
        <p className="flex items-start gap-1.5 text-xs text-destructive leading-relaxed">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{errors.submit}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBulkBusy}
          className={cn(
            'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2',
            form.submitted && !isBulkBusy
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isBulkBusy
            ? <><Loader2 className="w-4 h-4 animate-spin" />{bulkStatus === 'analyzing' ? 'Đang phân tích...' : 'Đang tạo cảnh...'}</>
            : form.submitted
              ? <>✓ Kịch bản đã được tạo</>
              : <><Send className="w-4 h-4" />Phân Tích &amp; Tạo Kịch Bản</>}
        </button>

        {onSaveScript && form.activeTab === 'text' && (
          <button
            type="button"
            onClick={handleSaveScript}
            title="Lưu lại kịch bản hiện tại để dùng sau"
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border transition-all sm:w-auto',
              savedScript
                ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-default'
                : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5',
            )}
          >
            {savedScript
              ? <><CheckCircle2 className="w-4 h-4" />Đã lưu!</>
              : <><Bookmark className="w-4 h-4" />Lưu kịch bản</>}
          </button>
        )}
      </div>
    </section>
  );
}
