"use client";

import CopyButton from "./CopyButton";

export interface JobData {
  job_title: string;
  job_description: string;
  salary: string;
  location: string;
  working_hours: string;
  holiday: string;
  visa_requirement: string;
  japanese_level: string;
  appeal_points: string[];
  company_name: string;
  employment_type: string;
  source_url: string;
}

interface JobPreviewProps {
  data: JobData;
  onReset: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100">
      <span className="text-sm font-semibold text-gray-500 sm:w-28 shrink-0">
        {label}
      </span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

export default function JobPreview({ data, onReset }: JobPreviewProps) {
  const copyText = JSON.stringify(data, null, 2);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              {data.job_title}
            </h2>
            <span className="shrink-0 px-3 py-1 bg-yolo-red text-white text-sm font-bold rounded-full">
              {data.employment_type}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{data.company_name}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-0">
          <InfoRow label="給与" value={data.salary} />
          <InfoRow label="勤務地" value={data.location} />
          <InfoRow label="勤務時間" value={data.working_hours} />
          <InfoRow label="休日" value={data.holiday} />

          {/* Highlighted fields */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-500 sm:w-28 shrink-0">
              在留資格
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 font-semibold rounded-md inline-block">
              {data.visa_requirement}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-500 sm:w-28 shrink-0">
              日本語レベル
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 font-semibold rounded-md inline-block">
              {data.japanese_level}
            </span>
          </div>

          {/* Appeal points */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-500 sm:w-28 shrink-0">
              訴求ポイント
            </span>
            <div className="flex flex-wrap gap-2">
              {data.appeal_points.map((point, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-green-100 text-green-800 font-semibold rounded-md text-sm"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="py-3">
            <span className="text-sm font-semibold text-gray-500 block mb-2">
              仕事内容
            </span>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.job_description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <CopyButton text={copyText} />
          <button
            onClick={onReset}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            別のURLを変換する
          </button>
          <button
            disabled
            className="px-6 py-2.5 bg-gray-100 text-gray-400 font-bold rounded-lg cursor-not-allowed"
          >
            YOLO WORKに直接登録（準備中）
          </button>
        </div>
      </div>
    </div>
  );
}
