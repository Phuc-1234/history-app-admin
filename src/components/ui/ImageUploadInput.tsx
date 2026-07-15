// src/components/ui/ImageUploadInput.tsx
import React, { useState, useRef } from 'react';
import { FieldWrapper } from './FormField';
import { Button } from './Button';
import client from '../../api/client';

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hint?: string;
}

export function ImageUploadInput({ label, value, onChange, placeholder, hint }: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploading(true);
      const res = await client.post('/api/admin/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data?.url) {
        onChange(res.data.url);
      }
    } catch (err) {
      console.error(err);
      alert('Tải lên ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <FieldWrapper label={label} hint={hint}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Đường dẫn ảnh hoặc tải lên...'}
          style={{
            flex: 1,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#0f172a',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            height: 42,
          }}
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
          style={{ whiteSpace: 'nowrap', height: 42, padding: '0 16px', borderRadius: 10 }}
        >
          Chọn ảnh
        </Button>
      </div>
    </FieldWrapper>
  );
}
