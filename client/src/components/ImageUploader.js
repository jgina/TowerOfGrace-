import { useRef, useState } from 'react';
import { UploadCloud, Trash2, Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import SmartImage from './SmartImage';
import './ImageUploader.css';

/**
 * Uploads images to Cloudinary through the API and returns { url, publicId, alt } objects.
 * - multiple=false: value is a single image object (or null)
 * - multiple=true: value is an array; the first image is the primary/cover image
 */
export default function ImageUploader({ value, onChange, folder = 'content', multiple = false, max = 10, label = 'Image', hint }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const images = multiple ? value || [] : value ? [value] : [];

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const room = multiple ? max - images.length : 1;
    if (room <= 0) {
      toast.error(`You can upload up to ${max} images`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await adminService.uploadImages(files.slice(0, room), folder, setProgress);
      const mapped = uploaded.map((img) => ({ url: img.url, publicId: img.publicId, alt: '' }));
      onChange(multiple ? [...images, ...mapped] : mapped[0]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (index) => {
    if (multiple) onChange(images.filter((_, i) => i !== index));
    else onChange(null);
  };

  const move = (index, delta) => {
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };

  const updateAlt = (index, alt) => {
    const next = images.map((img, i) => (i === index ? { ...img, alt } : img));
    onChange(multiple ? next : next[0]);
  };

  const canAdd = multiple ? images.length < max : images.length === 0;

  return (
    <div className="uploader">
      {label && <span className="field__label">{label}</span>}
      {images.length > 0 && (
        <div className={`uploader__grid ${multiple ? '' : 'uploader__grid--single'}`}>
          {images.map((img, index) => (
            <figure key={img.publicId || img.url} className="uploader__item">
              <SmartImage src={img.url} alt={img.alt} width={400} ratio="4 / 3" />
              {multiple && index === 0 && (
                <span className="uploader__cover">
                  <Star /> Cover
                </span>
              )}
              <div className="uploader__tools">
                {multiple && index > 0 && (
                  <button type="button" className="icon-btn" onClick={() => move(index, -1)} aria-label="Move left">
                    <ArrowLeft />
                  </button>
                )}
                {multiple && index < images.length - 1 && (
                  <button type="button" className="icon-btn" onClick={() => move(index, 1)} aria-label="Move right">
                    <ArrowRight />
                  </button>
                )}
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => remove(index)} aria-label="Remove image">
                  <Trash2 />
                </button>
              </div>
              <input
                className="input uploader__alt"
                placeholder="Alt text (describe the image)"
                value={img.alt || ''}
                onChange={(e) => updateAlt(index, e.target.value)}
              />
            </figure>
          ))}
        </div>
      )}

      {canAdd && (
        <button
          type="button"
          className={`uploader__drop ${dragOver ? 'is-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner" />
              <span>Uploading… {progress}%</span>
            </>
          ) : (
            <>
              <UploadCloud />
              <span>
                <strong>Click to upload</strong> or drag and drop
              </span>
              <small>{hint || 'JPG, PNG or WEBP, up to 5MB each'}</small>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
