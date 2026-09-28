import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, ExternalLink, RotateCcw } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import ContentFieldEditor from '../../components/ContentFieldEditor';
import { PageLoader, ErrorState } from '../../components/Loader';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { useContent } from '../../context/ContentContext';
import { CONTENT_SECTIONS, DEFAULT_CONTENT, getPath, mergeContent, setPath } from '../../utils/contentSchema';
import { formatDateTime } from '../../utils/format';
import './AdminContentPage.css';

const PREVIEW_LINKS = {
  home: '/',
  about: '/about',
  farm: '/our-farm',
  quality: '/quality-and-hygiene',
  production: '/how-we-produce',
  contact: '/contact',
  bulk: '/bulk-orders',
  footer: '/',
  announcement: '/',
};

export default function AdminContentPage() {
  const toast = useToast();
  const { refresh } = useContent();
  const [params, setParams] = useSearchParams();
  const key = params.get('section') || CONTENT_SECTIONS[0].key;
  const section = CONTENT_SECTIONS.find((s) => s.key === key) || CONTENT_SECTIONS[0];
  const [state, setState] = useState({ loading: true, error: null, data: null, updatedAt: null });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setState({ loading: true, error: null, data: null, updatedAt: null });
    adminService
      .getContent(section.key)
      .then((res) => {
        setState({ loading: false, error: null, data: mergeContent(DEFAULT_CONTENT[section.key], res.data), updatedAt: res.updatedAt });
        setDirty(false);
      })
      .catch((err) => setState({ loading: false, error: err.message, data: null, updatedAt: null }));
  };

  useEffect(load, [section.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (nextKey) => {
    if (dirty && !window.confirm('You have unsaved changes. Leave this section without saving?')) return;
    setParams({ section: nextKey });
  };

  const change = (path, value) => {
    setState((s) => ({ ...s, data: setPath(s.data, path, value) }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminService.saveContent(section.key, state.data);
      setState((s) => ({ ...s, updatedAt: res.updatedAt }));
      setDirty(false);
      refresh();
      toast.success(`${section.label} saved and published`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!window.confirm('Replace the fields below with the default text? Nothing is saved until you click Save.')) return;
    setState((s) => ({ ...s, data: DEFAULT_CONTENT[section.key] }));
    setDirty(true);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Website"
        title="Content Management"
        subtitle="Edit the text and images on every page. Changes go live as soon as you save."
      />

      <div className="content-layout">
        <nav className="admin-card content-nav" aria-label="Content sections">
          {CONTENT_SECTIONS.map((s) => (
            <button key={s.key} type="button" className={s.key === section.key ? 'is-active' : ''} onClick={() => choose(s.key)}>
              <strong>{s.label}</strong>
              <small>{s.description}</small>
            </button>
          ))}
        </nav>

        <div className="content-editor">
          <div className="admin-card content-editor__bar">
            <div>
              <h2>{section.label}</h2>
              <small className="text-muted">
                {state.updatedAt ? `Last saved ${formatDateTime(state.updatedAt)}` : 'Showing default text — not yet customised'}
                {dirty && ' · Unsaved changes'}
              </small>
            </div>
            <div className="row row--wrap">
              <a href={PREVIEW_LINKS[section.key]} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
                <ExternalLink /> View page
              </a>
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetToDefaults} disabled={state.loading}>
                <RotateCcw /> Defaults
              </button>
              <button type="button" className="btn btn--accent" onClick={save} disabled={saving || state.loading || !dirty}>
                {saving ? <span className="spinner" /> : <Save />} Save
              </button>
            </div>
          </div>

          {state.loading ? (
            <PageLoader />
          ) : state.error ? (
            <ErrorState message={state.error} onRetry={load} />
          ) : (
            section.groups.map((group) => (
              <section key={group.title} className="admin-card">
                <div className="admin-card__head">
                  <h2>{group.title}</h2>
                </div>
                <div className="admin-card__body form-grid">
                  {group.fields.map((field) => (
                    <ContentFieldEditor key={field.name} field={field} value={getPath(state.data, field.name)} onChange={(v) => change(field.name, v)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
