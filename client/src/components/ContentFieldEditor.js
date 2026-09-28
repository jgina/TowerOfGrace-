import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import FormField from './FormField';
import ImageUploader from './ImageUploader';
import './ContentFieldEditor.css';

/** Renders one CMS field definition (text, textarea, image, boolean, select or list). */
export default function ContentFieldEditor({ field, value, onChange }) {
  switch (field.type) {
    case 'textarea':
      return (
        <FormField label={field.label} hint={field.hint} className="span-all">
          <textarea className="textarea" rows={field.rows || 3} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </FormField>
      );
    case 'image':
      return (
        <div className="span-all">
          <ImageUploader folder="content" label={field.label} value={value || null} onChange={onChange} />
        </div>
      );
    case 'boolean':
      return (
        <label className="switch span-all">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span className="switch__track" /> {field.label}
        </label>
      );
    case 'select':
      return (
        <FormField label={field.label} hint={field.hint}>
          <select className="select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {field.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </FormField>
      );
    case 'list':
      return <ListEditor field={field} value={Array.isArray(value) ? value : []} onChange={onChange} />;
    default:
      return (
        <FormField label={field.label} hint={field.hint}>
          <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </FormField>
      );
  }
}

function ListEditor({ field, value, onChange }) {
  const update = (index, key, v) => onChange(value.map((item, i) => (i === index ? { ...item, [key]: v } : item)));
  const move = (index, delta) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const add = () => onChange([...value, Object.fromEntries(field.fields.map((f) => [f.name, f.type === 'image' ? null : '']))]);

  return (
    <div className="list-editor span-all">
      <div className="list-editor__head">
        <span className="field__label">{field.label}</span>
        <button type="button" className="btn btn--outline btn--sm" onClick={add}>
          <Plus /> Add item
        </button>
      </div>
      {field.hint && <span className="field__hint">{field.hint}</span>}
      {value.length === 0 && <p className="list-editor__empty">No items yet.</p>}
      {value.map((item, index) => (
        <div key={index} className="list-editor__item">
          <div className="list-editor__tools">
            <span className="list-editor__num">{index + 1}</span>
            <button type="button" className="icon-btn" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
              <ArrowUp />
            </button>
            <button type="button" className="icon-btn" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
              <ArrowDown />
            </button>
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label="Remove item">
              <Trash2 />
            </button>
          </div>
          <div className="form-grid">
            {field.fields.map((sub) => (
              <ContentFieldEditor key={sub.name} field={sub} value={item[sub.name]} onChange={(v) => update(index, sub.name, v)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
