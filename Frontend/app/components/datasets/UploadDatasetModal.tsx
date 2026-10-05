"use client";

import { useState, useRef } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Database } from "lucide-react";
import { api, Dataset } from "@/lib/api";

interface UploadDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDataset: Dataset) => void;
}

export default function UploadDatasetModal({ isOpen, onClose, onSuccess }: UploadDatasetModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV (.csv) files are supported.");
      return;
    }
    if (selectedFile.size === 0) {
      setError("The selected CSV file is empty (0 bytes).");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File exceeds 50 MB limit.");
      return;
    }

    setFile(selectedFile);
    if (!name) {
      const baseName = selectedFile.name.replace(/\.csv$/i, "").replace(/[_-]/g, " ");
      setName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a CSV file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);
    if (description) formData.append("description", description);

    try {
      const created = await api.uploadDataset(formData);
      setIsUploading(false);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || "Failed to upload and ingest CSV dataset.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg p-8 bg-[#ffffff] border border-[#ececec] rounded-[24px] shadow-2xl text-[#17191c] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-6 right-6 p-2 rounded-full text-[#777b86] hover:text-[#17191c] hover:bg-[#f2f2f3] transition-colors cursor-pointer"
          title="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-2xl font-serif font-normal text-[#17191c]">Upload CSV Dataset</h3>
            <p className="text-xs text-[#777b86]">Ingest operational data into DuckDB analytical engine</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-[16px] bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 max-h-36 overflow-y-auto">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 break-words font-sans text-xs leading-relaxed">
              <span className="font-semibold text-rose-900 block mb-0.5">Upload Error</span>
              <span className="text-rose-700">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[20px] p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-[#5d2a1a] bg-[#fbe1d1]/30"
                : file
                ? "border-[#5d2a1a] bg-[#fbe1d1]/20"
                : "border-[#dcdcdc] hover:border-[#17191c] bg-[#f9f9fa] hover:bg-[#ffffff]"
            }`}
          >
            <input
              id="csv-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-[#fbe1d1] text-[#5d2a1a] flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[#5d2a1a]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#17191c] truncate max-w-xs">{file.name}</p>
                  <p className="text-[11px] text-[#777b86]">
                    {(file.size / 1024).toFixed(1)} KB • CSV Format Ready
                  </p>
                </div>
                <span className="text-[10px] text-[#5d2a1a] underline underline-offset-2">
                  Click to replace file
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-[#f2f2f3] flex items-center justify-center text-[#777b86]">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#17191c]">
                    Drag and drop your enterprise CSV here
                  </p>
                  <p className="text-[11px] text-[#777b86] mt-0.5">
                    or click to browse from your computer (Max 50 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dataset Name */}
          <div>
            <label className="block text-xs font-normal text-[#777b86] mb-1.5">Dataset Name</label>
            <input
              id="dataset-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Sales & Revenue Metrics"
              className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-normal text-[#777b86] mb-1.5">Description (Optional)</label>
            <textarea
              id="dataset-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Transactional logs including regional dimensions and customer cohorts."
              className="w-full px-3.5 py-2.5 bg-[#f2f2f3] hover:bg-[#ededee] focus:bg-[#ffffff] border border-transparent focus:border-[#17191c] rounded-[16px] text-xs text-[#17191c] placeholder:text-[#a3a6af] outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              id="submit-upload-btn"
              type="submit"
              disabled={isUploading || !file}
              className="w-full py-3 px-6 bg-[#17191c] hover:bg-black text-white font-normal rounded-full text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Parsing schema & calculating DuckDB metrics...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Ingest & Initialize Dataset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
