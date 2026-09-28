import './SectionHeading.css';

export default function SectionHeading({ eyebrow, title, text, align = 'left', action, light = false }) {
  return (
    <div className={`section-heading section-heading--${align} ${light ? 'section-heading--light' : ''}`}>
      <div className="section-heading__copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2 className="section-heading__title display-title">{title}</h2>}
        {text && <p className="section-heading__text">{text}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </div>
  );
}
